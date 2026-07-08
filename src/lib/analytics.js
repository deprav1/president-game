/**
 * Единый слой аналитики поверх Yandex Metrica.
 *
 * Принципы:
 *  - Любой сбой приёмника НЕ должен ломать игру → всё в try/catch.
 *  - Все события проходят через track(name, props): один fan-out, одно место
 *    для добавления будущих приёмников (Telegram SDK, свой коллектор и т.д.).
 *  - Если VITE_YM_ID пуст (dev/тест без счётчика) — track() становится no-op,
 *    но в dev-режиме дублирует событие в console для отладки.
 *
 * Counter id берётся из import.meta.env.VITE_YM_ID. Сниппет Metrica грузится
 * из этого модуля (ensureYandexMetrica), без inline-скрипта в index.html —
 * счётчик инициализируется ПЕРВЫМ ym-вызовом, до setUserID/userParams/reachGoal.
 *
 * Атрибуция (входящие метки): initAnalytics() разбирает UTM/ref из URL,
 * Telegram start_param и referrer, сохраняет first-touch и мерджит всё это
 * в контекст — поэтому каждое событие несёт источник перехода.
 *
 * Исходящие переходы: openExternal()/trackOutbound()/appendUtm() — единая
 * точка для разметки и учёта кликов «наружу» (наружу.am, бот, share).
 */

import { telegramStorage } from "../utils/telegramStorage.js";

const YM_ID = import.meta.env.VITE_YM_ID
  ? Number(import.meta.env.VITE_YM_ID)
  : null;
const SERVER_ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT || "";
const IS_DEV = import.meta.env.DEV;
let metricaLoadStarted = false;

// Контекст сессии — собирается один раз в initAnalytics(), мерджится в каждое событие.
let context = {};

/** Имена событий (= имена целей в Metrica). Фиксируем, чтобы не плодить опечатки. */
export const EVENTS = Object.freeze({
  APP_OPEN: "app_open",
  ATTRIBUTION: "attribution",
  RUN_RESUMED: "run_resumed",
  ONBOARDING_VIEW: "onboarding_view",
  NAME_SUBMIT: "name_submit",
  PLAY_AS_OTHER: "play_as_other",
  GAME_START: "game_start",
  CARD_VIEW: "card_view",
  CARD_RATE: "card_rate",
  DECISION: "decision",
  CHAIN_TRIGGERED: "chain_triggered",
  CRISIS_SHOWN: "crisis_shown",
  EXTREMUM_EVENT: "extremum_event",
  ELECTION_VIEW: "election_view",
  ELECTION_CHOICE: "election_choice",
  ENDGAME_ENTER: "endgame_enter",
  SECOND_CHANCE_VIEW: "second_chance_view",
  SECOND_CHANCE_CHOICE: "second_chance_choice",
  GAME_OVER: "game_over",
  VICTORY: "victory",
  ENDING_UNLOCKED: "ending_unlocked",
  RESTART: "restart",
  OUTBOUND_CLICK: "outbound_click",
  NARUZHU_CLICK: "naruzhu_click",
  CTA_VARIANT_ASSIGNED: "cta_variant_assigned",
  VPN_REVIVE: "vpn_revive",
  PROMO_COPIED: "promo_copied",
  SHARE_CLICK: "share_click",
  REFERRAL_SHARED: "referral_shared",
  LEADERBOARD_ENTRY: "leaderboard_entry",
  HUB_OPEN: "hub_open",
  ADMIN_PANEL_OPEN: "admin_panel_open",
  SAFE_MODE_TOGGLE: "safe_mode_toggle",
  ACHIEVEMENT_UNLOCKED: "achievement_unlocked",
  ERROR: "error",
});

// ─── ЖИВОЙ БУФЕР СОБЫТИЙ (для внутриигровой админ-панели @deprav) ──────────────
// Кольцевой буфер последних событий + счётчики за сессию. Чисто in-memory,
// нужен, чтобы админ мог видеть трекинг «вживую» прямо на устройстве.
const MAX_BUFFER = 200;
const recentEvents = [];
const eventCounts = {};
const listeners = new Set();

function recordLocal(name, payload) {
  eventCounts[name] = (eventCounts[name] || 0) + 1;
  recentEvents.push({ name, ts: Date.now(), props: payload });
  if (recentEvents.length > MAX_BUFFER) recentEvents.shift();
  for (const fn of listeners) {
    try { fn(); } catch { /* подписчик не должен ломать трекинг */ }
  }
}

/** Подписка на поток событий (admin-панель). Возвращает функцию отписки. */
export function subscribeAnalytics(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Снимок состояния для admin-панели: контекст, счётчики, последние события. */
export function getAnalyticsSnapshot() {
  return {
    context: { ...context },
    counts: { ...eventCounts },
    recent: recentEvents.slice().reverse(),
  };
}

/** Безопасный вызов ym() — игнорирует отсутствие счётчика и любые ошибки. */
function ym(...args) {
  if (!YM_ID || typeof window === "undefined" || typeof window.ym !== "function") return;
  try {
    window.ym(YM_ID, ...args);
  } catch {
    /* Аналитика не должна влиять на игру. */
  }
}

function ensureYandexMetrica() {
  if (!YM_ID || typeof document === "undefined" || typeof window === "undefined" || metricaLoadStarted) return;
  metricaLoadStarted = true;
  try {
    window.ym = window.ym || function ymQueue() {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
    window.ym.l = 1 * new Date();
    // Инициализируем счётчик ПЕРВЫМ вызовом в очереди — иначе setUserID/userParams
    // и ранние reachGoal (app_open, attribution, быстрый naruzhu_click), попавшие
    // в очередь до init, Metrica может отбросить → потеря ранних конверсий.
    ym("init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
    });
    if ([...document.scripts].some(script => script.src === "https://mc.yandex.ru/metrika/tag.js")) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js";
    document.head.appendChild(script);
  } catch {
    /* Loading analytics must never block the game. */
  }
}

function sendServerEvent(name, payload) {
  if (!SERVER_ENDPOINT || typeof fetch !== "function") return;
  try {
    fetch(SERVER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ event: name, payload, ts: new Date().toISOString() }),
    }).catch(() => {});
  } catch {
    /* Внешний collector не должен влиять на игру. */
  }
}

/** Детерминированный короткий хэш строки (djb2) — для anon_uid и card_id. */
export function hashStr(str) {
  let h = 5381;
  const s = String(str ?? "");
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

/** Стабильный анонимный device-id для браузера без Telegram (fallback). */
async function resolveDeviceId() {
  try {
    let id = await telegramStorage.getItem("varon_aid");
    if (!id) {
      id =
        (crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
      telegramStorage.setItem("varon_aid", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

// Метки кампании, которые читаем из URL приземления. utm_* — стандарт,
// ref — наша короткая реферальная метка, *clid — идентификаторы рекламных систем.
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const CLICK_ID_KEYS = ["yclid", "gclid", "fbclid", "ysclid"];

/** Разбирает входящие метки из query-строки приземления. */
function parseLandingMarks() {
  const marks = {};
  try {
    const q = new URLSearchParams(window.location.search);
    for (const k of UTM_KEYS) {
      const v = q.get(k);
      if (v) marks[k] = v;
    }
    const ref = q.get("ref") || q.get("r");
    if (ref) marks.ref = ref;
    for (const k of CLICK_ID_KEYS) {
      const v = q.get(k);
      if (v) { marks.click_id = `${k}:${v}`; break; }
    }
  } catch {
    /* Без query-меток — атрибуция останется по start_param/referrer. */
  }
  return marks;
}

/**
 * Telegram start_param часто кодирует кампанию через разделители, например
 * `src-medium-campaign` или `ref_<id>`. Раскладываем в utm-совместимые поля,
 * не теряя исходное значение.
 */
function marksFromStartParam(startParam) {
  if (!startParam) return {};
  const out = { start_param: startParam };
  if (/^ref[_-]/i.test(startParam)) {
    out.ref = startParam.replace(/^ref[_-]/i, "");
    out.utm_medium ||= "referral";
    out.utm_source ||= "telegram";
  } else if (startParam.includes("-")) {
    const [source, medium, campaign] = startParam.split("-");
    if (source) out.utm_source = source;
    if (medium) out.utm_medium = medium;
    if (campaign) out.utm_campaign = campaign;
  }
  return out;
}

/**
 * Инициализация: собирает контекст один раз и прокидывает его в Metrica.
 * Вызывать как можно раньше (main.jsx), до первых track().
 */
export async function initAnalytics() {
  try {
    ensureYandexMetrica();

    const tg = window.Telegram?.WebApp;
    const u = tg?.initDataUnsafe?.user;
    const startParam = tg?.initDataUnsafe?.start_param || null;

    // anon_uid: хэш Telegram user id, иначе — анонимный device-id.
    const anonUid = u?.id ? `tg_${hashStr(u.id)}` : `dev_${hashStr(await resolveDeviceId())}`;

    // Входящие метки: URL utm/ref + раскладка Telegram start_param. URL приоритетнее.
    const lastTouch = { ...marksFromStartParam(startParam), ...parseLandingMarks() };
    const hasMarks = Object.keys(lastTouch).some((k) => k !== "start_param") || !!startParam;

    // First-touch: сохраняем первый источник навсегда, чтобы атрибутировать
    // конверсию к каналу привлечения, а не к последнему заходу.
    let firstTouch = null;
    try { firstTouch = JSON.parse((await telegramStorage.getItem("varon_attr_first")) || "null"); } catch { /* нет сохранённого */ }
    if (!firstTouch && hasMarks) {
      firstTouch = { ...lastTouch, ts: new Date().toISOString() };
      telegramStorage.setItem("varon_attr_first", JSON.stringify(firstTouch));
    }

    context = {
      anon_uid: anonUid,
      session_id: crypto?.randomUUID?.() || Date.now().toString(36),
      app_version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0",
      platform: tg?.platform || "browser",
      tg_version: tg?.version || null,
      // Атрибуция последнего касания.
      utm_source: lastTouch.utm_source || null,
      utm_medium: lastTouch.utm_medium || null,
      utm_campaign: lastTouch.utm_campaign || null,
      utm_content: lastTouch.utm_content || null,
      utm_term: lastTouch.utm_term || null,
      ref: lastTouch.ref || null,
      click_id: lastTouch.click_id || null,
      start_param: startParam,
      referral_src: startParam, // обратная совместимость с прежним полем
      referrer: (typeof document !== "undefined" && document.referrer) || null,
      landing: typeof window !== "undefined" ? window.location.pathname + window.location.search : null,
      // Атрибуция первого касания.
      ft_source: firstTouch?.utm_source || firstTouch?.ref || firstTouch?.start_param || null,
      ft_campaign: firstTouch?.utm_campaign || null,
      ft_ts: firstTouch?.ts || null,
      locale: u?.language_code || navigator?.language || null,
      is_telegram: !!tg,
    };

    ym("setUserID", anonUid);
    ym("userParams", {
      app_version: context.app_version,
      platform: context.platform,
      utm_source: context.utm_source,
      utm_medium: context.utm_medium,
      utm_campaign: context.utm_campaign,
      ref: context.ref,
      ft_source: context.ft_source,
      is_telegram: context.is_telegram,
    });

    // Отдельное событие приземления с источником — удобно для воронок по каналам.
    if (hasMarks) track(EVENTS.ATTRIBUTION, { is_first_touch: !firstTouch || firstTouch.ts === context.ft_ts });
  } catch {
    /* Контекст опционален — track() всё равно отработает с тем, что есть. */
  }
}

/** Позволяет дополнить контекст уже после init (например, anon_uid из сейва). */
export function setContext(patch) {
  context = { ...context, ...patch };
}

/**
 * Отправить событие. Мерджит контекст, шлёт reachGoal (для целей/воронок)
 * и params (для срезов по измерениям) в Metrica.
 */
export function track(name, props = {}) {
  const payload = { ...context, ...props };
  recordLocal(name, props);
  if (IS_DEV) {
    console.debug("[analytics]", name, payload);
  }
  ym("reachGoal", name, payload);
  ym("params", { [name]: payload });
  sendServerEvent(name, payload);
}

// ─── ИСХОДЯЩИЕ ССЫЛКИ ─────────────────────────────────────────────────────────

/** Дописывает query-параметры (UTM и пр.) к URL, не ломая уже существующие. */
export function appendUtm(url, params = {}) {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.href : "https://varonia.am");
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") u.searchParams.set(k, String(v));
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Открывает внешнюю ссылку правильным способом:
 *  - t.me → openTelegramLink (остаётся внутри Telegram);
 *  - прочее в мини-аппе → openLink;
 *  - вне Telegram → window.open с noopener.
 */
export function openExternal(url) {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      if (/^https?:\/\/t\.me\//i.test(url) && typeof tg.openTelegramLink === "function") {
        tg.openTelegramLink(url);
        return;
      }
      if (typeof tg.openLink === "function") {
        tg.openLink(url);
        return;
      }
    }
  } catch {
    /* Падаем в window.open ниже. */
  }
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    /* Открыть не удалось — молча, аналитика уже записана. */
  }
}

/**
 * Учитывает и открывает исходящую ссылку: единая точка для «внешних переходов».
 * Кроме семантических событий (naruzhu_click/share_click) шлёт общий
 * outbound_click с хостом — чтобы в одном месте видеть все уходы наружу.
 */
export function trackOutbound(url, props = {}) {
  let host = "";
  try {
    host = new URL(url, typeof window !== "undefined" ? window.location.href : "https://varonia.am").host;
  } catch { /* без хоста */ }
  track(EVENTS.OUTBOUND_CLICK, { url, host, ...props });
  openExternal(url);
}
