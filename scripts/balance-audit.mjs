// Разовый аудит баланса: суммирует давление всех карт на каждую шкалу.
// Запуск: node scripts/balance-audit.mjs
import { CARDS, CRISIS_CARDS } from "../src/data/cards.js";
import { EXTRA_CARDS } from "../src/data/extraCards.js";
import { NARUZHU_CARDS } from "../src/data/naruzhuCards.js";
import { PANORAMA_CARDS } from "../src/data/panoramaCards.js";
import { CHRONICLE_CARDS } from "../src/data/chronicleCards.js";
import { PRECEDENT_CARDS } from "../src/data/precedentCards.js";
import { CHAINS, EXTREMUM_EVENTS } from "../src/data/chains.js";
import { scaleStatEffect } from "../src/lib/gameHelpers.js";

const KEYS = ["oligarchs", "army", "people", "west"];

function tally(cards, label) {
  const raw = { oligarchs: 0, army: 0, people: 0, west: 0 };
  const scaled = { oligarchs: 0, army: 0, people: 0, west: 0 };
  const pos = { oligarchs: 0, army: 0, people: 0, west: 0 };
  const neg = { oligarchs: 0, army: 0, people: 0, west: 0 };
  let sides = 0;
  for (const c of cards) {
    for (const side of ["left", "right"]) {
      const fx = c[side]?.fx;
      if (!fx) continue;
      sides += 1;
      for (const k of KEYS) {
        const v = fx[k] || 0;
        raw[k] += v;
        // Месяц 24: обычный темп партии без щадящего «медового месяца».
        scaled[k] += scaleStatEffect(k, v, "normal", 24);
        if (v > 0) pos[k] += v; else if (v < 0) neg[k] += v;
      }
    }
  }
  console.log(`\n=== ${label} (${cards.length} карт, ${sides} выборов) ===`);
  console.log("шкала     | сырьё сумма | масштаб (24м) | ↑всего | ↓всего | net масштаб/выбор");
  for (const k of KEYS) {
    const perChoice = (scaled[k] / sides).toFixed(2);
    console.log(
      `${k.padEnd(9)} | ${String(raw[k]).padStart(11)} | ${String(scaled[k]).padStart(13)} | ${String(pos[k]).padStart(6)} | ${String(neg[k]).padStart(6)} | ${perChoice.padStart(6)}`
    );
  }
}

tally(CARDS, "БАЗОВАЯ КОЛОДА");
tally(EXTRA_CARDS, "ДОП. КАРТЫ");
tally(NARUZHU_CARDS, "КАРТЫ «НАРУЖУ»");
tally(PANORAMA_CARDS, "ПАНОРАМА");
tally(CHRONICLE_CARDS, "ХРОНИКА");
tally(PRECEDENT_CARDS, "ПРЕЦЕДЕНТЫ");
tally(CRISIS_CARDS, "КРИЗИСЫ");
const EVENT_CARDS = [
  ...Object.values(CHAINS).map(event => event.card),
  ...Object.values(EXTREMUM_EVENTS).map(event => event.card),
];
tally(EVENT_CARDS, "ОТЛОЖЕННЫЕ СОБЫТИЯ");
tally([
  ...CARDS,
  ...EXTRA_CARDS,
  ...NARUZHU_CARDS,
  ...PANORAMA_CARDS,
  ...CHRONICLE_CARDS,
  ...PRECEDENT_CARDS,
  ...CRISIS_CARDS,
  ...EVENT_CARDS,
], "ВСЯ ПРОДАКШЕН-СИСТЕМА");
