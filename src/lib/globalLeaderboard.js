/**
 * Клиент общей (глобальной) таблицы рекордов.
 *
 * Личная доска (leaderboard.js) живёт в localStorage/Telegram CloudStorage.
 * Здесь — обёртка над серверным endpoint'ом admin-server (`/api/leaderboard`),
 * который валидирует и хранит общий рейтинг всех игроков.
 *
 * Endpoint берётся из VITE_LEADERBOARD_ENDPOINT, а если он пуст — выводится из
 * VITE_ANALYTICS_ENDPOINT (.../api/collect → .../api/leaderboard). Если ни один
 * не задан, глобальный рейтинг выключен и все функции — no-op (игра работает
 * как раньше, с личной доской).
 *
 * Любой сбой сети НЕ должен ломать игру → всё в try/catch, возвращаем null.
 */

import { normalizeLeaderboard } from "./leaderboard.js";

const EXPLICIT_ENDPOINT = import.meta.env.VITE_LEADERBOARD_ENDPOINT || "";
const ANALYTICS_ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT || "";

const ENDPOINT = EXPLICIT_ENDPOINT
  || (ANALYTICS_ENDPOINT ? ANALYTICS_ENDPOINT.replace(/\/api\/collect\/?$/, "/api/leaderboard") : "");

const GLOBAL_LIMIT = 50;

/** Включён ли глобальный рейтинг в текущей сборке. */
export const globalLeaderboardEnabled = !!ENDPOINT;

/** Загрузить текущую глобальную таблицу. Возвращает массив или null при сбое. */
export async function fetchGlobalLeaderboard() {
  if (!ENDPOINT || typeof fetch !== "function") return null;
  try {
    const res = await fetch(ENDPOINT, { method: "GET" });
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeLeaderboard(data.leaderboard || [], GLOBAL_LIMIT);
  } catch {
    return null;
  }
}

/**
 * Отправить результат в глобальную таблицу.
 * Возвращает { leaderboard, rank, isTopN, improved, entryId } или null при сбое.
 */
export async function submitGlobalScore(entry) {
  if (!ENDPOINT || typeof fetch !== "function") return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(entry),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      leaderboard: normalizeLeaderboard(data.leaderboard || [], GLOBAL_LIMIT),
      rank: Number(data.rank) || 0,
      isTopN: !!data.isTopN,
      improved: data.improved !== false,
      entryId: data.entryId || "",
    };
  } catch {
    return null;
  }
}
