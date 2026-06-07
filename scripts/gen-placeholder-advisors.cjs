/**
 * Заглушки-портреты (16:9, 1536x864 webp) для трёх новых советников в палитре
 * игры: чёрный фон, кьяроскуро-вижнетка, тёмный силуэт-бюст, золото/самоцвет
 * как акцент, лёгкие тематические props в тени. Текста нет — имя/роль рисует UI.
 *
 * Это ВРЕМЕННАЯ замена AI-портретам (стиль *_Wide.webp). Когда будет рабочий
 * ключ — заменить через scripts/gen-new-advisors.cjs.
 *
 * Запуск: node scripts/gen-placeholder-advisors.cjs
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const W = 1536, H = 864;
const OUT_DIR = path.join(__dirname, '..', 'public', 'images');

// Силуэт-бюст по центру (голова + шея + торс), общий для всех.
const figure = (rim) => `
  <g>
    <path fill="url(#fig)" stroke="${rim}" stroke-width="2.5" stroke-opacity="0.55" d="
      M 768 156
      C 690 156 632 214 632 300
      C 632 360 660 405 700 430
      L 690 470
      C 560 500 470 600 452 864
      L 1084 864
      C 1066 600 976 500 846 470
      L 836 430
      C 876 405 904 360 904 300
      C 904 214 846 156 768 156 Z"/>
  </g>`;

// Маленькая «драгоценная» брошь-акцент на воротнике (золото + самоцвет).
const brooch = (gem) => `
  <g>
    <circle cx="768" cy="512" r="17" fill="#0a0a0a" stroke="#d4af37" stroke-width="3"/>
    <circle cx="768" cy="512" r="8" fill="${gem}"/>
  </g>`;

const advisors = [
  {
    file: 'Pizulina_Censor_Wide',
    accent: '#b3322e', gem: '#b3322e', rim: '#5a6a7a',
    // тусклые «экраны» по бокам с красными точками
    props: `
      <g opacity="0.5">
        <rect x="70" y="300" width="200" height="150" rx="8" fill="#0c0c10" stroke="#23232a"/>
        <circle cx="250" cy="320" r="5" fill="#b3322e"/>
        <rect x="70" y="480" width="200" height="150" rx="8" fill="#0c0c10" stroke="#23232a"/>
        <circle cx="250" cy="500" r="5" fill="#b3322e"/>
        <rect x="1266" y="300" width="200" height="150" rx="8" fill="#0c0c10" stroke="#23232a"/>
        <circle cx="1446" cy="320" r="5" fill="#b3322e"/>
        <rect x="1266" y="480" width="200" height="150" rx="8" fill="#0c0c10" stroke="#23232a"/>
        <circle cx="1446" cy="500" r="5" fill="#b3322e"/>
      </g>`,
  },
  {
    file: 'Borzykin_Investigator_Wide',
    accent: '#d4af37', gem: '#7a1f1c', rim: '#6a6048',
    // подвесная лампа сверху + папки внизу + красная сургучная печать
    props: `
      <g opacity="0.6">
        <line x1="768" y1="0" x2="768" y2="70" stroke="#3a3320" stroke-width="3"/>
        <ellipse cx="768" cy="92" rx="60" ry="26" fill="#2a2410"/>
        <ellipse cx="768" cy="150" rx="220" ry="60" fill="#d4af37" opacity="0.10"/>
        <rect x="150" y="760" width="240" height="90" rx="6" fill="#15110a" stroke="#2c2516"/>
        <rect x="1146" y="760" width="240" height="90" rx="6" fill="#15110a" stroke="#2c2516"/>
        <circle cx="768" cy="700" r="14" fill="#7a1f1c" stroke="#d4af37" stroke-width="2"/>
      </g>`,
  },
  {
    file: 'Porohov_Mercenary_Wide',
    accent: '#c0562a', gem: '#c0562a', rim: '#6a4a38',
    // кувалда на плече + угли/искры в дыму
    props: `
      <g opacity="0.7">
        <rect x="980" y="300" width="26" height="240" rx="6" fill="#1a1410" transform="rotate(28 993 420)"/>
        <rect x="1010" y="280" width="120" height="64" rx="8" fill="#15110d" stroke="#2a2018" transform="rotate(28 1070 312)"/>
        <circle cx="300" cy="780" r="4" fill="#c0562a"/>
        <circle cx="360" cy="730" r="3" fill="#e07a3a"/>
        <circle cx="240" cy="700" r="3" fill="#c0562a"/>
        <circle cx="1230" cy="760" r="4" fill="#e07a3a"/>
        <circle cx="1180" cy="710" r="3" fill="#c0562a"/>
      </g>`,
  },
];

const svgFor = (a) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="34%" r="62%">
      <stop offset="0%" stop-color="${a.accent}" stop-opacity="0.22"/>
      <stop offset="45%" stop-color="${a.accent}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="50%" cy="46%" r="75%">
      <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.92"/>
    </radialGradient>
    <linearGradient id="fig" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#26262b"/>
      <stop offset="55%" stop-color="#141417"/>
      <stop offset="100%" stop-color="#070708"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#050506"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${a.props}
  ${figure(a.rim)}
  ${brooch(a.gem)}
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`;

(async () => {
  for (const a of advisors) {
    const out = path.join(OUT_DIR, `${a.file}.webp`);
    await sharp(Buffer.from(svgFor(a))).webp({ quality: 84 }).toFile(out);
    console.log(`saved ${out}`);
  }
})();
