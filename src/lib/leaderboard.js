export const MAX_LEADERBOARD_ENTRIES = 10;
export const MAX_LEADERBOARD_STORAGE_CHARS = 24000;
export const MAX_LEADERBOARD_SCORE = 999;
const MAX_ENTRY_ID_LENGTH = 64;

const DIFFICULTY_RANK = {
  easy: 1,
  normal: 2,
  hardcore: 3,
};

const DIFFICULTY_LABELS = {
  easy: "Лёгкий",
  normal: "Обычный",
  hardcore: "Хардкор",
};

const OUTCOME_LABELS = {
  victory: "Победа",
  defeat: "Падение",
  legacy: "Архив",
};

const cleanName = (name) => {
  const trimmed = String(name || "").trim();
  return (trimmed || "Президент").slice(0, 24);
};

export const normalizeLeaderboardScore = (score) => {
  const n = Number.parseInt(score, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_LEADERBOARD_SCORE);
};

const cleanId = (id) => {
  const raw = String(id || "").trim();
  if (!raw) return makeEntryId();
  return raw.slice(0, MAX_ENTRY_ID_LENGTH);
};

const cleanFinishedAt = (value) => {
  const date = new Date(value || Date.now());
  const time = date.getTime();
  if (!Number.isFinite(time)) return new Date().toISOString();
  const maxFutureDrift = Date.now() + 2 * 24 * 60 * 60 * 1000;
  if (time > maxFutureDrift) return new Date().toISOString();
  return date.toISOString();
};

const cleanDifficulty = (difficulty) => (
  DIFFICULTY_RANK[difficulty] ? difficulty : "normal"
);

const cleanOutcome = (outcome) => (
  OUTCOME_LABELS[outcome] ? outcome : "defeat"
);

const makeEntryId = () => (
  globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
);

export function createLeaderboardEntry({
  id,
  name,
  score,
  difficulty,
  outcome,
  endingId = null,
  endingTitle = "",
  reason = "",
  killerKey = "",
  finishedAt = new Date().toISOString(),
} = {}) {
  return {
    id: cleanId(id),
    name: cleanName(name),
    score: normalizeLeaderboardScore(score),
    difficulty: cleanDifficulty(difficulty),
    outcome: cleanOutcome(outcome),
    endingId: endingId || null,
    endingTitle: String(endingTitle || "").slice(0, 80),
    reason: String(reason || "").slice(0, 80),
    killerKey: String(killerKey || "").slice(0, 40),
    finishedAt: cleanFinishedAt(finishedAt),
  };
}

export function sortLeaderboard(entries) {
  return [...entries].sort((a, b) => {
    const scoreDiff = normalizeLeaderboardScore(b.score) - normalizeLeaderboardScore(a.score);
    if (scoreDiff) return scoreDiff;

    const difficultyDiff = (DIFFICULTY_RANK[b.difficulty] || 0) - (DIFFICULTY_RANK[a.difficulty] || 0);
    if (difficultyDiff) return difficultyDiff;

    const aTime = Date.parse(a.finishedAt || "") || 0;
    const bTime = Date.parse(b.finishedAt || "") || 0;
    return aTime - bTime;
  });
}

export function parseStoredLeaderboard(raw) {
  if (!raw || typeof raw !== "string") return [];
  if (raw.length > MAX_LEADERBOARD_STORAGE_CHARS) return [];
  try {
    return normalizeLeaderboard(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function normalizeLeaderboard(raw, limit = MAX_LEADERBOARD_ENTRIES) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const entries = raw
    .filter(item => item && typeof item === "object")
    .map(item => createLeaderboardEntry(item))
    .filter(item => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  const sorted = sortLeaderboard(entries);
  const max = Number.isFinite(limit) && limit > 0 ? limit : MAX_LEADERBOARD_ENTRIES;
  return sorted.slice(0, max);
}

export function addLeaderboardEntry(entries, entry) {
  const cleanEntry = createLeaderboardEntry(entry);
  const seen = new Set();
  const fullLeaderboard = sortLeaderboard([...entries, cleanEntry]
    .filter(item => item && typeof item === "object")
    .map(item => createLeaderboardEntry(item))
    .filter(item => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }));
  const rank = fullLeaderboard.findIndex(item => item.id === cleanEntry.id) + 1;
  const leaderboard = fullLeaderboard.slice(0, MAX_LEADERBOARD_ENTRIES);
  return {
    leaderboard,
    entry: fullLeaderboard[rank - 1] || cleanEntry,
    rank,
    isTopTen: rank > 0 && rank <= MAX_LEADERBOARD_ENTRIES,
  };
}

export function difficultyLabel(difficulty) {
  return DIFFICULTY_LABELS[difficulty] || DIFFICULTY_LABELS.normal;
}

export function outcomeLabel(entry) {
  if (entry?.outcome === "victory" && entry.endingTitle) return entry.endingTitle;
  return OUTCOME_LABELS[entry?.outcome] || OUTCOME_LABELS.defeat;
}

export function formatLeaderboardDate(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
