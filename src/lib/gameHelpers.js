// Чистые игровые хелперы (без React-состояния).

/** Безопасный parseInt — защита от NaN при мусорном значении в localStorage. */
export const safeInt = (raw, fallback = 0) => {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Валидирует объект сохранения из localStorage.
 * Возвращает save если структура корректна, иначе null — это предотвращает
 * краш при доступе к deck.length или rescueCard.agreeText на повреждённых данных.
 */
export const validateSave = (save) => {
  if (!save || typeof save !== "object") return null;
  if (!Array.isArray(save.deck) || save.deck.length === 0) return null;
  const s = save.stats;
  if (!s || typeof s !== "object") return null;
  const statKeys = ["oligarchs", "army", "people", "west"];
  if (statKeys.some(k => typeof s[k] !== "number" || s[k] < 0 || s[k] > 100)) return null;
  if (typeof save.months !== "number" || save.months < 1) return null;
  if (typeof save.cardIdx !== "number" || save.cardIdx < 0) return null;
  if (!Array.isArray(save.pendingEvents)) return null;
  if (save.rescueCard != null) {
    const rc = save.rescueCard;
    if (typeof rc.agreeText !== "string" || !rc.agreeText) return null;
    if (!rc.fx || typeof rc.fx !== "object") return null;
    if (!rc.targetStats || typeof rc.targetStats !== "object") return null;
    if (typeof rc.targetMonth !== "number") return null;
  }
  return save;
};

/**
 * Масштабирует эффект изменения параметра с учетом гейм-дизайнерского баланса.
 * 1. Снижает общую волатильность шкал (базовый множитель 0.95), чтобы увеличить длительность игры.
 * 2. Усложняет накопление лояльности народа (people):
 *    - рост лояльности умножается на 0.75 (народ медленно проникается доверием);
 *    - падение лояльности умножается на 1.08 (народ быстро разочаровывается).
 */
export const scaleStatEffect = (key, val) => {
  if (!val) return 0;
  if (key === "people") {
    const mult = val > 0 ? 0.75 : 1.08;
    return Math.round(val * mult);
  }
  return Math.round(val * 0.95);
};

/** Перемешивание массива (Fisher–Yates), не мутирует исходный. */
export const shuffle = a => {
  const copy = [...a];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/** Безопасная проверка версии Telegram WebApp (старые клиенты без isVersionAtLeast). */
export const telegramVersionAtLeast = (tg, version) => (
  typeof tg?.isVersionAtLeast !== "function" || tg.isVersionAtLeast(version)
);
