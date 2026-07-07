import http from "node:http";
import { readFile, writeFile, appendFile, mkdir } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLeaderboardEntry, sortLeaderboard } from "../src/lib/leaderboard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.ndjson");
const OVERRIDES_FILE = path.join(DATA_DIR, "card-overrides.json");
const LEADERBOARD_FILE = path.join(DATA_DIR, "leaderboard.json");

const PORT = Number(process.env.ADMIN_PORT || process.env.PORT || 3100);
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ALLOWED_ORIGIN = process.env.ANALYTICS_ALLOWED_ORIGIN || "*";
const YANDEX_COUNTER_ID = process.env.YANDEX_COUNTER_ID || process.env.VITE_YM_ID || "109695119";
const YANDEX_TOKEN = process.env.YANDEX_METRICA_TOKEN || "";
const COLLECT_RATE_WINDOW_MS = 60_000;
const COLLECT_RATE_MAX = 120;
const SUBMIT_RATE_WINDOW_MS = 60_000;
const SUBMIT_RATE_MAX = 20;
// Сколько результатов храним/отдаём в глобальной таблице.
const GLOBAL_LEADERBOARD_MAX = 100;
const GLOBAL_LEADERBOARD_RETURN = 50;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const collectRateBuckets = new Map();
const submitRateBuckets = new Map();

const DECKS = [
  ["base", "CARDS", "../src/data/cards.js"],
  ["extra", "EXTRA_CARDS", "../src/data/extraCards.js"],
  ["naruzhu", "NARUZHU_CARDS", "../src/data/naruzhuCards.js"],
  ["panorama", "PANORAMA_CARDS", "../src/data/panoramaCards.js"],
  ["chronicle", "CHRONICLE_CARDS", "../src/data/chronicleCards.js"],
  ["precedent", "PRECEDENT_CARDS", "../src/data/precedentCards.js"],
  ["crisis", "CRISIS_CARDS", "../src/data/cards.js"],
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function hashStr(str) {
  let h = 5381;
  const s = String(str ?? "");
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function send(res, status, body, headers = {}) {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    ...headers,
  });
  res.end(data);
}

function safeObjectKey(value, maxLength = 80) {
  const key = String(value || "").trim().slice(0, maxLength);
  if (!key || FORBIDDEN_OBJECT_KEYS.has(key)) return "";
  return key;
}

function sanitizePayload(value, depth = 0) {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value.slice(0, 500);
  if (depth >= 3) return null;
  if (Array.isArray(value)) return value.slice(0, 25).map(item => sanitizePayload(item, depth + 1));
  if (typeof value !== "object") return null;

  const clean = Object.create(null);
  for (const [rawKey, rawVal] of Object.entries(value).slice(0, 60)) {
    const key = safeObjectKey(rawKey, 80);
    if (!key) continue;
    clean[key] = sanitizePayload(rawVal, depth + 1);
  }
  return clean;
}

function originAllowed(req) {
  if (!ALLOWED_ORIGIN || ALLOWED_ORIGIN === "*") return true;
  const origin = req.headers.origin || "";
  const allowed = ALLOWED_ORIGIN.split(",").map(item => item.trim()).filter(Boolean);
  return !origin || allowed.includes(origin);
}

function corsHeaders(req) {
  const origin = req.headers.origin || "";
  const allowOrigin = ALLOWED_ORIGIN === "*"
    ? "*"
    : (originAllowed(req) && origin ? origin : ALLOWED_ORIGIN.split(",")[0]?.trim() || "null");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function rateLimited(buckets, req, windowMs, max) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now - bucket.startedAt > windowMs) {
    buckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > max;
}

function collectRateLimited(req) {
  return rateLimited(collectRateBuckets, req, COLLECT_RATE_WINDOW_MS, COLLECT_RATE_MAX);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 512_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function isAuthorized(req) {
  if (!ADMIN_PASSWORD) return true;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Basic ") ? header.slice(6) : "";
  const decoded = Buffer.from(token, "base64").toString("utf8");
  return decoded === `${ADMIN_USER}:${ADMIN_PASSWORD}`;
}

function requireAuth(req, res) {
  if (isAuthorized(req)) return true;
  res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Varonia Admin"' });
  res.end("Auth required");
  return false;
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(OVERRIDES_FILE)) {
    await writeFile(OVERRIDES_FILE, "{}\n", "utf8");
  }
}

async function readJsonSafe(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function loadCards() {
  const [{ ADVISORS }] = await Promise.all([
    import(`../src/data/advisors.js?admin=${Date.now()}`),
  ]);
  const decks = [];
  for (const [deck, exportName, modulePath] of DECKS) {
    const mod = await import(`${modulePath}?admin=${Date.now()}`);
    const list = mod[exportName] || [];
    list.forEach((card, index) => {
      const sourceId = card.id || `${deck}_${index + 1}`;
      const sourceKey = `${deck}:${sourceId}`;
      const advisor = ADVISORS[card.advisor] || {};
      decks.push({
        sourceKey,
        sourceId,
        deck,
        index: index + 1,
        cardId: hashStr(card.t || card.text || ""),
        advisorId: card.advisor,
        advisorName: advisor.name || `Советник ${card.advisor}`,
        advisorRole: advisor.role || "",
        advisorAvatar: advisor.avatar || "",
        text: card.text || card.t || "",
        left: card.left || {},
        right: card.right || {},
        cta: card.cta || null,
        bgImage: card.bgImage || null,
        assetImage: card.assetImage || null,
        isCrisis: deck === "crisis",
      });
    });
  }
  return decks;
}

async function readEvents() {
  try {
    const raw = await readFile(EVENTS_FILE, "utf8");
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function aggregateEvents(events) {
  const byCard = Object.create(null);
  const totals = { events: events.length, views: 0, likes: 0, dislikes: 0, decisions: 0 };
  for (const event of events) {
    const name = event.event;
    const payload = event.payload || {};
    const cardId = safeObjectKey(payload.card_id, 80);
    if (!cardId) continue;
    byCard[cardId] ||= { views: 0, likes: 0, dislikes: 0, decisions: 0, lastSeen: null };
    if (name === "card_view") {
      byCard[cardId].views += 1;
      totals.views += 1;
    }
    if (name === "card_rate") {
      if (payload.rating === "up") {
        byCard[cardId].likes += 1;
        totals.likes += 1;
      }
      if (payload.rating === "down") {
        byCard[cardId].dislikes += 1;
        totals.dislikes += 1;
      }
    }
    if (name === "decision") {
      byCard[cardId].decisions += 1;
      totals.decisions += 1;
    }
    byCard[cardId].lastSeen = event.ts || byCard[cardId].lastSeen;
  }
  return { totals, byCard };
}

async function fetchYandexSummary() {
  if (!YANDEX_TOKEN || !YANDEX_COUNTER_ID) {
    return { configured: false, counterId: YANDEX_COUNTER_ID, rows: [] };
  }
  const params = new URLSearchParams({
    ids: YANDEX_COUNTER_ID,
    date1: "30daysAgo",
    date2: "today",
    metrics: "ym:s:visits,ym:s:users,ym:s:pageviews",
  });
  const response = await fetch(`https://api-metrika.yandex.net/stat/v1/data?${params}`, {
    headers: { Authorization: `OAuth ${YANDEX_TOKEN}` },
  });
  if (!response.ok) {
    return { configured: true, counterId: YANDEX_COUNTER_ID, error: `Yandex ${response.status}` };
  }
  const json = await response.json();
  return { configured: true, counterId: YANDEX_COUNTER_ID, totals: json.totals || [] };
}

async function dashboardPayload() {
  await ensureDataDir();
  const [cards, events, overrides, yandex] = await Promise.all([
    loadCards(),
    readEvents(),
    readJsonSafe(OVERRIDES_FILE, {}),
    fetchYandexSummary().catch((error) => ({ configured: !!YANDEX_TOKEN, counterId: YANDEX_COUNTER_ID, error: error.message })),
  ]);
  const stats = aggregateEvents(events);
  const cardsWithStats = cards.map((card) => {
    const cardStats = stats.byCard[card.cardId] || { views: 0, likes: 0, dislikes: 0, decisions: 0, lastSeen: null };
    const override = overrides[card.sourceKey] || null;
    return {
      ...card,
      override,
      effectiveText: override?.text || card.text,
      effectiveLeft: override?.left || card.left,
      effectiveRight: override?.right || card.right,
      stats: {
        ...cardStats,
        score: cardStats.likes - cardStats.dislikes,
      },
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    authEnabled: !!ADMIN_PASSWORD,
    yandex,
    totals: {
      cards: cards.length,
      advisors: new Set(cards.map((card) => card.advisorId)).size,
      overrides: Object.keys(overrides).length,
      ...stats.totals,
    },
    cards: cardsWithStats,
  };
}

async function saveOverride(body) {
  const sourceKey = String(body.sourceKey || "");
  if (!sourceKey) throw new Error("sourceKey is required");
  const overrides = await readJsonSafe(OVERRIDES_FILE, {});
  overrides[sourceKey] = {
    text: String(body.text || ""),
    left: body.left || {},
    right: body.right || {},
    updatedAt: new Date().toISOString(),
  };
  await writeFile(OVERRIDES_FILE, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
  return overrides[sourceKey];
}

async function collect(req, res) {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "Method not allowed" }, cors);
  if (!originAllowed(req)) return send(res, 403, { ok: false, error: "Origin not allowed" }, cors);
  if (collectRateLimited(req)) return send(res, 429, { ok: false, error: "Too many events" }, cors);
  const body = await parseBody(req);
  const event = safeObjectKey(body.event, 80);
  if (!event) return send(res, 400, { ok: false, error: "event is required" }, cors);
  await ensureDataDir();
  await appendFile(EVENTS_FILE, `${JSON.stringify({ event, payload: sanitizePayload(body.payload || {}), ts: body.ts || new Date().toISOString() })}\n`, "utf8");
  return send(res, 200, { ok: true }, cors);
}

// ─── ГЛОБАЛЬНАЯ ТАБЛИЦА РЕКОРДОВ ──────────────────────────────────────────────
// Файловое хранилище top-100. Записи сериализуются через цепочку промисов,
// чтобы конкурентные POST не затирали друг друга (один процесс Node).
let leaderboardWriteChain = Promise.resolve();
function withLeaderboardLock(fn) {
  const run = leaderboardWriteChain.then(fn, fn);
  leaderboardWriteChain = run.then(() => {}, () => {});
  return run;
}

async function readLeaderboard() {
  const raw = await readJsonSafe(LEADERBOARD_FILE, []);
  return Array.isArray(raw) ? raw : [];
}

// Наружу uid игрока не отдаём — только публичные поля рекорда.
function publicEntry(entry) {
  if (!entry || typeof entry !== "object") return entry;
  const rest = { ...entry };
  delete rest.uid;
  return rest;
}

async function submitLeaderboardEntry(body) {
  // uid — анонимный идентификатор игрока (хэш). Если есть — храним 1 лучший
  // результат на игрока, чтобы один человек не забивал всю таблицу.
  const uid = safeObjectKey(body.uid, 64);
  // finishedAt задаём на сервере — клиентскому времени не доверяем.
  const entry = createLeaderboardEntry({
    name: body.name,
    score: body.score,
    difficulty: body.difficulty,
    outcome: body.outcome,
    endingId: body.endingId,
    endingTitle: body.endingTitle,
    reason: body.reason,
    killerKey: body.killerKey,
    finishedAt: new Date().toISOString(),
  });

  return withLeaderboardLock(async () => {
    const current = await readLeaderboard();

    if (uid) {
      const prev = current.find(item => item && item.uid === uid);
      if (prev && Number(prev.score) >= entry.score) {
        // Не улучшение — возвращаем текущее место игрока, ничего не пишем.
        const sortedExisting = sortLeaderboard(current);
        const existingRank = sortedExisting.findIndex(item => item.id === prev.id) + 1;
        return {
          leaderboard: sortedExisting.slice(0, GLOBAL_LEADERBOARD_RETURN).map(publicEntry),
          entryId: prev.id,
          rank: existingRank,
          isTopN: existingRank > 0 && existingRank <= GLOBAL_LEADERBOARD_RETURN,
          improved: false,
        };
      }
    }

    const pool = uid ? current.filter(item => !item || item.uid !== uid) : current;
    const stored = { ...entry, uid: uid || null };
    const sorted = sortLeaderboard([...pool, stored]);
    const rank = sorted.findIndex(item => item.id === stored.id) + 1;
    const trimmed = sorted.slice(0, GLOBAL_LEADERBOARD_MAX);

    await ensureDataDir();
    await writeFile(LEADERBOARD_FILE, `${JSON.stringify(trimmed)}\n`, "utf8");

    return {
      leaderboard: sorted.slice(0, GLOBAL_LEADERBOARD_RETURN).map(publicEntry),
      entryId: stored.id,
      rank,
      isTopN: rank > 0 && rank <= GLOBAL_LEADERBOARD_RETURN,
      improved: true,
    };
  });
}

async function leaderboard(req, res) {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  if (!originAllowed(req)) return send(res, 403, { ok: false, error: "Origin not allowed" }, cors);

  if (req.method === "GET") {
    const entries = sortLeaderboard(await readLeaderboard())
      .slice(0, GLOBAL_LEADERBOARD_RETURN)
      .map(publicEntry);
    return send(res, 200, { ok: true, leaderboard: entries }, cors);
  }

  if (req.method !== "POST") return send(res, 405, { ok: false, error: "Method not allowed" }, cors);
  if (rateLimited(submitRateBuckets, req, SUBMIT_RATE_WINDOW_MS, SUBMIT_RATE_MAX)) {
    return send(res, 429, { ok: false, error: "Too many submissions" }, cors);
  }
  const body = await parseBody(req);
  const result = await submitLeaderboardEntry(body);
  return send(res, 200, { ok: true, ...result }, cors);
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const file = path.resolve(PUBLIC_DIR, relative);
  if (!file.startsWith(PUBLIC_DIR) || !existsSync(file)) return false;
  const ext = path.extname(file);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  createReadStream(file).pipe(res);
  return true;
}

await ensureDataDir();

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/api/collect") return collect(req, res);
    if (url.pathname === "/api/leaderboard") return leaderboard(req, res);
    if (!requireAuth(req, res)) return;
    if (url.pathname === "/api/dashboard" && req.method === "GET") return send(res, 200, await dashboardPayload());
    if (url.pathname === "/api/cards" && req.method === "GET") return send(res, 200, { cards: await loadCards() });
    if (url.pathname === "/api/overrides" && req.method === "GET") return send(res, 200, await readJsonSafe(OVERRIDES_FILE, {}));
    if (url.pathname === "/api/overrides" && req.method === "PATCH") return send(res, 200, { ok: true, override: await saveOverride(await parseBody(req)) });
    if (serveStatic(req, res)) return;
    send(res, 404, { error: "Not found" });
  } catch (error) {
    send(res, 500, { error: error.message || "Server error" });
  }
}).listen(PORT, () => {
  console.log(`Varonia admin dashboard: http://127.0.0.1:${PORT}`);
  if (!ADMIN_PASSWORD) {
    console.warn("ADMIN_PASSWORD is empty: dashboard auth is disabled.");
  }
});
