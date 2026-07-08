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
  if (save.hasUsedVpnRevive != null && typeof save.hasUsedVpnRevive !== "boolean") return null;
  if (save.rescueCard != null) {
    const rc = save.rescueCard;
    if (typeof rc.agreeText !== "string" || !rc.agreeText) return null;
    if (!rc.fx || typeof rc.fx !== "object") return null;
    if (!rc.targetStats || typeof rc.targetStats !== "object") return null;
    if (typeof rc.targetMonth !== "number") return null;
  }
  return save;
};

/** Доступные уровни сложности (порядок = слева направо в селекторе). */
export const DIFFICULTIES = ["easy", "normal", "hardcore"];

// ─── ЭНДШПИЛЬ / ТУРНИРНЫЙ ОВЕРТАЙМ ────────────────────────────────────────────
// После двух сроков (месяц 96) игрок может «остаться у власти» и продолжить
// править. С этого момента начинается нарастающее усложнение: каждые 10 циклов
// (месяцев) ступень эскалации растёт БЕЗ ПОТОЛКА, поэтому на любой сложности игра
// со временем становится неудержимой и заканчивается неизбежным падением. Счёт в
// таблице рекордов = сколько месяцев удалось продержаться → честный турнирный
// рейтинг выживания. Кривая начинается мягко, чтобы третий срок был playable,
// но без потолка догоняет даже аккуратную стратегию.
export const OVERTIME_START_MONTH = 96;
export const OVERTIME_STEP_MONTHS = 10;

// Тюнинг кривой (можно править, не трогая логику):
const OVERTIME_NEG_PER_STEP = 0.01;    // насколько раскачивается негатив карт за ступень
const OVERTIME_POS_DECAY_PER_STEP = 0.005; // насколько гаснет позитив карт за ступень
const OVERTIME_POS_FLOOR = 0.75;       // минимальный множитель позитива (не отыграться в ноль)
const OVERTIME_PRESSURE_PW = 0.07;     // давление на народ/Запад (вниз) за ступень
const OVERTIME_PRESSURE_ARMY = 0.05;   // давление на силовиков (вверх) за ступень
const OVERTIME_PRESSURE_OLI = 0.035;   // давление на олигархов (вверх) за ступень
// Множитель давления по сложности — чтобы порядок был естественным (на easy
// продержаться дольше), но проигрыш неизбежен на всех.
const OVERTIME_DIFF_MULT = { easy: 0.45, normal: 0.75, hardcore: 0.85 };

/** Ступень эскалации овертайма (0 до месяца 96, дальше +1 каждые 10 циклов, без потолка). */
export const overtimeStep = (months = 1) => {
  if (months <= OVERTIME_START_MONTH) return 0;
  return Math.ceil((months - OVERTIME_START_MONTH) / OVERTIME_STEP_MONTHS);
};

/**
 * Пассивное давление «система против тебя» в овертайме. По мере роста ступеней
 * шкалы всё сильнее ползут к смерти: народ и Запад — вниз (усталость от вечного
 * правления, углубление изоляции), силовики и элиты — вверх (наглеют,
 * капитализируют хаос). Применяется СЫРЫМ, поверх эффектов карты, поэтому
 * удержать все четыре шкалы в коридоре 1–99 со временем физически нельзя.
 * Возвращает объект дельт или null (вне овертайма).
 */
export const overtimePressure = (months = 1, difficulty = "normal") => {
  const step = overtimeStep(months);
  if (step <= 0) return null;
  const g = OVERTIME_DIFF_MULT[difficulty] ?? 1;
  const peopleWest = Math.floor(step * OVERTIME_PRESSURE_PW * g);
  const army = Math.floor(step * OVERTIME_PRESSURE_ARMY * g);
  const oligarchs = Math.floor(step * OVERTIME_PRESSURE_OLI * g);
  return {
    people: peopleWest ? -peopleWest : 0,
    west: peopleWest ? -peopleWest : 0,
    army,
    oligarchs,
  };
};

/**
 * Масштабирует эффект изменения параметра с учетом гейм-дизайнерского баланса
 * и выбранного уровня сложности.
 *
 * Базовый множитель (как в «normal»):
 * 1. Снижает общую волатильность шкал (0.95), чтобы увеличить длительность игры.
 * 2. Усложняет накопление лояльности народа (people): рост ×0.82, падение ×1.04.
 * 3. Гасит рост силовиков (army): рост ×0.78, падение ×1.05. Колода структурно
 *    толкает армию вверх (позитивных army-эффектов вдвое больше негативных),
 *    без демпфирования переворот хунты становится почти неизбежным.
 *
 * Поверх базы накладывается модификатор сложности:
 * - easy     — волатильность в обе стороны сильно снижена (негатив ×0.40,
 *              позитив ×0.55): шкалы дрейфуют медленно и держатся у центра,
 *              ошибки почти не наказываются, проиграть очень трудно (но возможно).
 *              Важно гасить и позитив тоже — иначе шкалы монотонно перегреваются к 100.
 * - normal   — без изменений (исторический баланс).
 * - hardcore — волатильность растёт с каждым игровым годом (+8%/год, потолок +55%),
 *              причём негатив раскачивается быстрее позитива (×1.3). Партия остаётся
 *              выигрываемой, но к поздним срокам цена ошибки заметно выше.
 *
 * «Медовый месяц»: в первый игровой год (months ≤ 12) негативные эффекты
 * дополнительно смягчаются (×0.7), чтобы новички не вылетали до первого кризиса.
 *
 * Сигнатура обратносовместима: вызов scaleStatEffect(key, val) == «normal» на 1-м месяце.
 */
export const scaleStatEffect = (key, val, difficulty = "normal", months = 1) => {
  if (!val) return 0;

  let base;
  if (key === "people")     base = val > 0 ? 0.82 : 1.04;
  else if (key === "army")  base = val > 0 ? 0.78 : 1.05;
  else                      base = 0.95;

  let mult = base;
  if (difficulty === "easy") {
    mult = base * (val < 0 ? 0.40 : 0.55);
  } else if (difficulty === "hardcore") {
    const years = Math.floor((months - 1) / 12); // 0, 1, 2, ...
    const ramp  = Math.min(0.55, years * 0.08);   // +8%/год, потолок +55%
    mult = base * (1 + (val < 0 ? ramp * 1.3 : ramp));
  }

  // «Медовый месяц» — щадящий старт для новых игроков.
  if (val < 0 && months <= 12) mult *= 0.7;

  // Овертайм (эндшпиль после 2 сроков): негатив карт раскачивается всё сильнее,
  // позитив — гаснет, поэтому чинить шкалы становится всё труднее. Растёт без
  // потолка → вместе с пассивным давлением (overtimePressure) гарантирует
  // неизбежное падение на любой сложности.
  const otStep = overtimeStep(months);
  if (otStep > 0) {
    if (val < 0) mult *= 1 + otStep * OVERTIME_NEG_PER_STEP;
    else         mult *= Math.max(OVERTIME_POS_FLOOR, 1 - otStep * OVERTIME_POS_DECAY_PER_STEP);
  }

  return Math.round(val * mult);
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
