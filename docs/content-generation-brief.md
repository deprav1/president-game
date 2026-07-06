# Бриф на генерацию контента «Варония» — максимальный список

Единый стиль (добавлять к КАЖДОМУ промпту):
> **Flat vector art, pure pitch black background filling the entire frame edge-to-edge
> (no border, no frame), deadpan minimalism, gold accents, imperial decay, sarcastic
> political satire, cinematic single light source, high contrast.**

После генерации: положить PNG в `public/images/` под нужным именем →
`node scripts/webp-optimize.cjs` → закоммитить. Cache-busting (`?v=`) сам подтянет.

Размеры: портреты 1024×1024 · фоны 1920×1080 · концовки/объекты 1024×1024 · иконки 512×512.

---

## 🔴 ПРИОРИТЕТ 1 — Исправить смысловые нестыковки концовок

Текущие картинки на месте, но концепт не совпадает с названием.

### `ending_kooperativ.png` — «Кооператив "Озеро"» (захват олигархами)
Сейчас: золотые марионеточные нити (не по теме). Нужно:
> A cluster of identical opulent gold-roofed dachas behind a still black lake at night,
> reflections in the water, a high green fence, surveillance cameras on gold posts.
> Grotesque luxury, cold and empty, no people.

### `ending_bunker.png` — «Подземный бункер» (изоляция, паранойя)
Сейчас: расколотый орёл (это скорее революция). Нужно:
> A massive heavy steel bunker blast-door, slightly ajar, faint warm gold light leaking
> from inside into total darkness. Brutalist concrete frame, a single red status lamp,
> oppressive and claustrophobic, no people.

### `ending_zastoy.png` — «Великий застой» (опционально, поднять до золота)
Сейчас: каменный трон Ч/Б (приемлемо). Альтернатива в золоте:
> A giant ornate gold clock with its hands frozen, thick layers of dust on the gold,
> a single cobweb between the hands, dim museum spotlight. Time stopped, decay.

---

## 🟡 ПРИОРИТЕТ 2 — Расширить вариативность финалов (геймдизайн)

Сейчас 6 концовок. Больше финалов = выше реиграбельность. Кандидаты (новые id —
добавлю в `endings.js` по факту генерации):

- `ending_coup.png` — «Дворцовый переворот»: an empty presidential chair knocked over
  on a marble floor, a single gold epaulette lying beside it, long shadow of a general.
- `ending_default.png` — «Дефолт»: a giant cracked gold ruble coin half-sunk into red
  ground, stock-ticker arrows pointing down etched in gold.
- `ending_emigration.png` — «Эмиграция элит»: a row of private jets silhouetted on a
  dark runway, gold tail-fins, a red carpet rolled into the night.
- `ending_holy.png` — «Теократия»: a colossal gold cathedral dome swallowing a tiny
  government building, oppressive divine light.

---

## 🟡 ПРИОРИТЕТ 3 — Фоны карт по фракциям (для глубины)

Сейчас фоны есть для money / war_room / church / protest. Карты других категорий
идут без фона. Догенерить, чтобы каждая фракция имела атмосферу:

- `bg_press.png` — «СМИ/пропаганда»: a dark TV studio, rows of dead monitors glowing
  faint gold, a single teleprompter, empty anchor chair.
- `bg_west_summit.png` — «Запад/санкции»: a cold international summit hall, empty
  podium with faded flags, gold microphone, blue spotlights, no people.
- `bg_kremlin_night.png` — «Власть/общее»: silhouette of brutalist Kremlin towers at
  night under a blood-red sky, a single gold star glowing.
- `bg_oligarch_yacht.png` уже есть — переиспользовать для олигарх-карт.

---

## 🟢 ПРИОРИТЕТ 4 — Объекты для кризис-карт (визуальный акцент)

Уже сгенерированы и лежат в `public/images/` (asset_*): red_phone, briefcase_nuclear,
decree_stamp, sanction_letter, protest_sign, oil_barrel, golden_yacht, red_button.
**Задача не на генерацию, а на интеграцию** (код): показывать объект в теле кризис-карты.
Если хочется больше — догенерить в том же стиле:

- `asset_ballot_box.png` — урна для голосования с золотой пломбой, переполненная.
- `asset_handcuffs_gold.png` — золотые наручники на бархатной подушке.
- `asset_gas_valve.png` — золотой вентиль газовой трубы, утечка света.
- `asset_passport.png` — потёртый загранпаспорт с золотым орлом, надорванный.

---

## 🟢 ПРИОРИТЕТ 5 — Мета и шеринг

- `og_share.png` (1200×630) — есть; обновить под новый стиль: гербовый орёл + «ВАРОНИЯ
  · президентский симулятор» золотом на чёрном, для красивого превью в Telegram/соцсетях.
- `favicon_eagle.png` — есть; проверить, читается ли в мелком размере (32×32).
- (опц.) `loading_splash.png` — экран загрузки Mini App: орёл на чёрном с золотой
  каймой и подписью «ЗАГРУЗКА ДОСЬЕ…».

---

## 🟢 ПРИОРИТЕТ 6 — Альт-портреты советников (эмоции, для будущего)

Сейчас по 1 портрету на советника. Для «реакций» на выбор игрока можно догенерить
2-й вариант (доволен / в гневе) в том же кадре и стиле — например:

- `Gromov_Military_angry.png`, `Zubov_Finance_smug.png` и т.д.
  (тот же персонаж, та же композиция, сменить только выражение лица.)

Это опционально и большой объём — только если захочется «живых» советников.

---

## Сводная таблица приоритетов

| # | Что | Объём | Зачем |
|---|-----|-------|-------|
| 1 | Перегенерить kooperativ, bunker (+опц. zastoy) | 2–3 | Убрать смысловые нестыковки |
| 2 | 4 новых концовки | 4 | Реиграбельность |
| 3 | 3 фона фракций | 3 | Атмосфера карт |
| 4 | 4 объекта кризисов | 4 | Визуальный акцент карт |
| 5 | og_share, splash | 1–2 | Презентация/шеринг |
| 6 | Альт-эмоции советников | 8–16 | «Живые» реакции (опц.) |

Минимум для полировки сейчас: **Приоритет 1** (2–3 картинки). Остальное — рост качества.
