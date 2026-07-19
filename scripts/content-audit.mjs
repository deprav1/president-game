/**
 * Production content audit.
 *
 * The script intentionally reads the normalized card exports, rather than the
 * compact RAW arrays in the data files. That makes the checks describe exactly
 * what the player receives at runtime.
 *
 * Run with: npm run audit:content
 */
import { CARDS, CRISIS_CARDS } from "../src/data/cards.js";
import { EXTRA_CARDS } from "../src/data/extraCards.js";
import { NARUZHU_CARDS } from "../src/data/naruzhuCards.js";
import { PANORAMA_CARDS } from "../src/data/panoramaCards.js";
import { CHRONICLE_CARDS } from "../src/data/chronicleCards.js";
import { PRECEDENT_CARDS } from "../src/data/precedentCards.js";
import { CHAINS, EXTREMUM_EVENTS } from "../src/data/chains.js";
import { ADVISORS } from "../src/data/advisors.js";

const STAT_KEYS = ["oligarchs", "army", "people", "west"];
const LIMITS = Object.freeze({ text: 200, tooltip: 90, label: 36 });
const SIDES = ["left", "right"];
const LATIN_ARTIFACT_RE = /\b(?:souls|premii)\b/giu;

const errors = [];
const warnings = [];
const seenIds = new Map();
const counts = {
  cards: 0,
  sides: 0,
  events: 0,
  missingIds: 0,
  emptyLabels: 0,
  textOverLimit: 0,
  tooltipOverLimit: 0,
  labelOverLimit: 0,
  artifacts: 0,
};

const locationFor = (source, index, id = "") => (
  `${source}[${index + 1}]${id ? ` (${id})` : ""}`
);

function report(list, location, message) {
  list.push({ location, message });
}

function error(location, message) {
  report(errors, location, message);
}

function warn(location, message) {
  report(warnings, location, message);
}

function rememberId(id, location) {
  const previous = seenIds.get(id);
  if (previous) {
    error(location, `дублирующийся id «${id}» (также: ${previous})`);
  } else {
    seenIds.set(id, location);
  }
}

function checkText(value, location, field, limit) {
  if (typeof value !== "string") return;
  const length = [...value].length;
  if (length > limit) {
    if (field === "text") counts.textOverLimit += 1;
    if (field === "tooltip") counts.tooltipOverLimit += 1;
    if (field === "label") counts.labelOverLimit += 1;
    warn(location, `${field} ${length} знаков (лимит ${limit})`);
  }
  const matches = value.match(LATIN_ARTIFACT_RE);
  if (matches) {
    counts.artifacts += matches.length;
    error(location, `латинский артефакт: ${matches.join(", ")}`);
  }
}

function checkFx(fx, location) {
  if (!fx || typeof fx !== "object" || Array.isArray(fx)) {
    error(location, "fx должен быть объектом с четырьмя шкалами");
    return;
  }

  for (const key of Object.keys(fx)) {
    if (!STAT_KEYS.includes(key)) {
      error(location, `неизвестная шкала в fx: ${key}`);
    }
  }
  for (const key of STAT_KEYS) {
    if (fx[key] == null) {
      error(location, `в fx отсутствует шкала ${key}`);
    } else if (typeof fx[key] !== "number" || !Number.isFinite(fx[key])) {
      error(location, `fx.${key} должен быть конечным числом`);
    }
  }
}

function checkSide(side, location) {
  counts.sides += 1;
  if (!side || typeof side !== "object" || Array.isArray(side)) {
    error(location, "сторона решения должна быть объектом");
    return;
  }

  if (typeof side.label !== "string" || !side.label.trim()) {
    counts.emptyLabels += 1;
    error(location, "пустой label решения");
  } else {
    checkText(side.label, `${location}.label`, "label", LIMITS.label);
  }

  // В нормализованной схеме side.text — это короткая подсказка под кнопкой.
  // Поддерживаем tooltip как алиас, чтобы аудит не пропустил новые карточки.
  const tooltip = side.tooltip ?? side.text;
  if (tooltip != null && typeof tooltip !== "string") {
    error(location, "tooltip/text должен быть строкой");
  } else if (typeof tooltip === "string") {
    checkText(tooltip, `${location}.tooltip`, "tooltip", LIMITS.tooltip);
  }
  checkFx(side.fx, `${location}.fx`);
}

function checkCard(card, source, index, { idOverride = null, event = false } = {}) {
  const fallbackId = `${source.toLowerCase()}_${index + 1}`;
  const baseLocation = locationFor(source, index, idOverride || card?.id || fallbackId);
  if (!card || typeof card !== "object" || Array.isArray(card)) {
    error(baseLocation, "карта должна быть объектом");
    return;
  }
  counts.cards += event ? 0 : 1;

  if (card.id != null && (typeof card.id !== "string" || !card.id.trim())) {
    error(baseLocation, "id должен быть непустой строкой");
  }
  const explicitId = typeof card.id === "string" && card.id.trim() ? card.id.trim() : null;
  const id = explicitId || idOverride || fallbackId;
  if (!explicitId) {
    counts.missingIds += 1;
    warn(baseLocation, "нет явного id; добавьте стабильный id для аналитики и сейва");
  }
  rememberId(id, baseLocation);

  if (!Number.isInteger(card.advisor) || card.advisor < 0 || card.advisor >= ADVISORS.length) {
    error(baseLocation, `advisor должен быть целым индексом 0..${ADVISORS.length - 1}`);
  }
  if (typeof card.text !== "string" || !card.text.trim()) {
    error(baseLocation, "пустой или отсутствующий текст карты");
  } else {
    checkText(card.text, `${baseLocation}.text`, "text", LIMITS.text);
  }
  for (const sideName of SIDES) {
    checkSide(card[sideName], `${baseLocation}.${sideName}`);
  }
}

function checkDeck(source, cards) {
  for (const [index, card] of cards.entries()) checkCard(card, source, index);
}

function checkEvents(source, events) {
  for (const [index, [key, event]] of events.entries()) {
    const location = `${source}.${key}`;
    counts.events += 1;
    if (!event || typeof event !== "object") {
      error(location, "событие должно быть объектом");
      continue;
    }
    if (typeof event.id !== "string" || !event.id.trim()) {
      error(location, "у события отсутствует id");
    } else {
      rememberId(event.id.trim(), location);
      if (event.id !== key) {
        warn(location, `ключ события и id не совпадают: ${key} / ${event.id}`);
      }
    }
    if (typeof event.delay !== "number" || !Number.isFinite(event.delay) || event.delay < 0) {
      error(location, "delay должен быть конечным числом >= 0");
    }
    // Event cards are intentionally not mutated by the audit. The event key is
    // a stable fallback id until an explicit card id is added to the data.
    checkCard(event.card, `${source}.${key}.card`, index, {
      idOverride: `${event.id || key}__card`,
      event: true,
    });
  }
}

const decks = [
  ["CARDS", CARDS],
  ["EXTRA_CARDS", EXTRA_CARDS],
  ["NARUZHU_CARDS", NARUZHU_CARDS],
  ["PANORAMA_CARDS", PANORAMA_CARDS],
  ["CHRONICLE_CARDS", CHRONICLE_CARDS],
  ["PRECEDENT_CARDS", PRECEDENT_CARDS],
  ["CRISIS_CARDS", CRISIS_CARDS],
];

for (const [source, cards] of decks) checkDeck(source, cards);
checkEvents("CHAINS", Object.entries(CHAINS));
checkEvents("EXTREMUM_EVENTS", Object.entries(EXTREMUM_EVENTS));

const totalCards = decks.reduce((sum, [, cards]) => sum + cards.length, 0);
const totalSides = totalCards * 2;

console.log("Контент-аудит production-карт");
console.log(`Карты: ${totalCards} · стороны: ${totalSides} · события: ${counts.events}`);
console.log(`Лимиты: text ≤ ${LIMITS.text}, tooltip ≤ ${LIMITS.tooltip}, label ≤ ${LIMITS.label}`);

if (warnings.length) {
  console.log(`\nПредупреждения (${warnings.length}):`);
  for (const item of warnings) console.log(`  ⚠ ${item.location}: ${item.message}`);
}
if (errors.length) {
  console.error(`\nОшибки (${errors.length}):`);
  for (const item of errors) console.error(`  ✖ ${item.location}: ${item.message}`);
}

console.log("\nИтоги:");
console.log(`  отсутствуют явные id: ${counts.missingIds}`);
console.log(`  пустые labels: ${counts.emptyLabels}`);
console.log(`  text выше лимита: ${counts.textOverLimit}`);
console.log(`  tooltip выше лимита: ${counts.tooltipOverLimit}`);
console.log(`  label выше лимита: ${counts.labelOverLimit}`);
console.log(`  латинские артефакты: ${counts.artifacts}`);
console.log(`  статус: ${errors.length ? "FAIL" : "OK"}`);

if (errors.length) process.exitCode = 1;
