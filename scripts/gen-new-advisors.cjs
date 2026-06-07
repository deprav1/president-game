/**
 * Генерация недостающих ПРЯМОУГОЛЬНЫХ (16:9) портретов трёх новых советников
 * в стиле существующих *_Wide.webp (полуреалистичная живописная иллюстрация,
 * чёрный фон, кьяроскуро, золото/самоцветы, тематические props в тени).
 *
 * Запуск: node scripts/gen-new-advisors.cjs
 * Результат: public/images/{Pizulina_Censor,Borzykin_Investigator,Porohov_Mercenary}_Wide.webp
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const API_KEY = process.env.IMAGEN_KEY;
if (!API_KEY) {
  console.error('Set a valid key first:  IMAGEN_KEY=<your_gemini_key> node scripts/gen-new-advisors.cjs');
  process.exit(1);
}
const MODEL = 'imagen-3.0-generate-001';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict?key=${API_KEY}`;

const STYLE = 'Semi-realistic painterly digital illustration, cinematic dramatic chiaroscuro lighting, pitch-black background filling the entire frame edge to edge, single character centered, head-and-torso framing facing the viewer, desaturated dark color palette with gold and jewel-tone accents, oppressive imperial decay, deadpan sinister political-satire mood, atmospheric thematic props dissolving into the dark background. No text, no captions.';

const TARGET = { w: 1536, h: 864 };
const OUT_DIR = path.join(__dirname, '..', 'public', 'images');

const portraits = [
  {
    file: 'Pizulina_Censor_Wide',
    prompt: `A prim severe woman in her thirties, a state internet-censorship official, hair in a tight bun, buttoned high-collar dark blouse with a small gold brooch, cold deadpan stare, one hand resting on a glowing gold padlock. Background: rows of dim television screens going black with faint red "blocked" glow. ${STYLE}`,
  },
  {
    file: 'Borzykin_Investigator_Wide',
    prompt: `A stern bald older man, chief state investigator, dark formal uniform with gold epaulettes and aiguillette, heavy brow, deadpan and menacing, hands folded over a thick red case file sealed with a red-and-gold wax seal. Background: a dark interrogation room, a single hanging lamp, stacked case folders in deep shadow. ${STYLE}`,
  },
  {
    file: 'Porohov_Mercenary_Wide',
    prompt: `A brutal bald man with heavy stubble, a mercenary warlord, plain dark military fatigues, cold menacing deadpan stare, a large iron sledgehammer resting on his shoulder. Background: dark smoke and faint orange embers, dim silhouettes of armed men, oppressive and grim. ${STYLE}`,
  },
];

async function gen(p) {
  process.stdout.write(`Generating ${p.file} ... `);
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: p.prompt }],
      parameters: { sampleCount: 1, aspectRatio: '16:9' },
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.predictions || !data.predictions[0]) {
    throw new Error(`API error: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  }
  const buf = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
  const outPath = path.join(OUT_DIR, `${p.file}.webp`);
  await sharp(buf)
    .resize(TARGET.w, TARGET.h, { fit: 'cover', position: 'top' })
    .webp({ quality: 82 })
    .toFile(outPath);
  console.log(`saved ${outPath}`);
}

(async () => {
  for (const p of portraits) {
    try { await gen(p); }
    catch (e) { console.error(`FAILED ${p.file}: ${e.message}`); }
  }
})();
