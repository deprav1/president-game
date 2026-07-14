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

// Endpoint чекина при входе (лежит рядом с leaderboard.php).
const CHECKIN_ENDPOINT = ENDPOINT ? ENDPOINT.replace(/leaderboard(\.php)?\/?$/, "checkin$1") : "";

/**
 * Чекин при входе в игру: шлёт подписанный Telegram initData (fire-and-forget).
 * Сервер по нему бэкфиллит tgId игрока на доске и доставляет призовые
 * уведомления из очереди (см. api/checkin.php). Любой сбой игнорируется.
 */
export function checkinGlobal() {
  if (!CHECKIN_ENDPOINT || typeof fetch !== "function") return;
  try {
    const initData = (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) || "";
    if (!initData) return;
    fetch(CHECKIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ initData }),
    }).catch(() => {});
  } catch { /* чекин не должен влиять на игру */ }
}

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
    // Подписанный Telegram initData — сервер проверяет подпись токеном бота и
    // берёт uid из него (защита от подмены uid и анонимного curl-спама).
    const initData = (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) || "";
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ ...entry, initData }),
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
