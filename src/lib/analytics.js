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
 * Counter id берётся из import.meta.env.VITE_YM_ID. Сам сниппет Metrica
 * подключается в index.html (тоже из env), здесь — только обёртка вызовов.
 */

import { telegramStorage } from "../utils/telegramStorage.js";

const YM_ID = import.meta.env.VITE_YM_ID
  ? Number(import.meta.env.VITE_YM_ID)
  : null;
const IS_DEV = import.meta.env.DEV;

// Контекст сессии — собирается один раз в initAnalytics(), мерджится в каждое событие.
let context = {};

/** Имена событий (= имена целей в Metrica). Фиксируем, чтобы не плодить опечатки. */
export const EVENTS = Object.freeze({
  APP_OPEN: "app_open",
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
  SECOND_CHANCE_VIEW: "second_chance_view",
  SECOND_CHANCE_CHOICE: "second_chance_choice",
  GAME_OVER: "game_over",
  VICTORY: "victory",
  ENDING_UNLOCKED: "ending_unlocked",
  RESTART: "restart",
  NARUZHU_CLICK: "naruzhu_click",
  CTA_VARIANT_ASSIGNED: "cta_variant_assigned",
  VPN_REVIVE: "vpn_revive",
  PROMO_COPIED: "promo_copied",
  SHARE_CLICK: "share_click",
  REFERRAL_SHARED: "referral_shared",
  HUB_OPEN: "hub_open",
  ACHIEVEMENT_UNLOCKED: "achievement_unlocked",
  ERROR: "error",
});

/** Безопасный вызов ym() — игнорирует отсутствие счётчика и любые ошибки. */
function ym(...args) {
  if (!YM_ID || typeof window === "undefined" || typeof window.ym !== "function") return;
  try {
    window.ym(YM_ID, ...args);
  } catch {
    /* Аналитика не должна влиять на игру. */
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

/**
 * Инициализация: собирает контекст один раз и прокидывает его в Metrica.
 * Вызывать как можно раньше (main.jsx), до первых track().
 */
export async function initAnalytics() {
  try {
    const tg = window.Telegram?.WebApp;
    const u = tg?.initDataUnsafe?.user;
    const sp = tg?.initDataUnsafe?.start_param || null;

    // anon_uid: хэш Telegram user id, иначе — анонимный device-id.
    const anonUid = u?.id ? `tg_${hashStr(u.id)}` : `dev_${hashStr(await resolveDeviceId())}`;

    context = {
      anon_uid: anonUid,
      session_id: crypto?.randomUUID?.() || Date.now().toString(36),
      app_version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0",
      platform: tg?.platform || "browser",
      tg_version: tg?.version || null,
      referral_src: sp,
      locale: u?.language_code || navigator?.language || null,
      is_telegram: !!tg,
    };

    ym("setUserID", anonUid);
    ym("userParams", {
      app_version: context.app_version,
      platform: context.platform,
      referral_src: context.referral_src,
      is_telegram: context.is_telegram,
    });
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
  if (IS_DEV) {
    console.debug("[analytics]", name, payload);
  }
  ym("reachGoal", name, payload);
  ym("params", { [name]: payload });
}
