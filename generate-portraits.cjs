const fs = require('fs');
const path = require('path');

// Ключ читается из окружения (НЕ хардкодить — прежний ключ утёк через публичный
// репозиторий и был отозван Google). Запуск: IMAGEN_KEY=<key> node generate-portraits.cjs
const API_KEY = process.env.IMAGEN_KEY;
if (!API_KEY) {
  console.error('Set IMAGEN_KEY env var with a valid Gemini/Imagen API key.');
  process.exit(1);
}
const MODEL = 'imagen-3.0-generate-001';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict?key=${API_KEY}`;

const baseStyle = 'Flat vector art, pure pitch black background filling entire frame edge-to-edge (no border/frame), deadpan minimalism, gold accents, imperial decay, sarcastic political satire.';

const prompts = [
  { name: 'Zubov_Finance', prompt: `exhausted corrupt finance minister, balding, dark under-eye bags, deadpan, holding a glowing solid-gold calculator. ${baseStyle}`, ratio: '1:1' },
  { name: 'Senin_Security', prompt: `older male security chief, dark suit, deadpan, massive malachite-and-gold cufflinks. ${baseStyle}`, ratio: '1:1' },
  { name: 'Patriarch_Church', prompt: `older male orthodox patriarch, grey beard, eyes in deep shadow, blindingly bright gold-and-ruby mitre. ${baseStyle}`, ratio: '1:1' },
  // ─── Новые советники (Пизулина / Борзыкин / Погожинга). Имена файлов должны
  //     совпадать с avatar в advisors.js: Pizulina_Censor_Wide / Borzykin_Investigator_Wide / Porohov_Mercenary_Wide ───
  { name: 'Pizulina_Censor', prompt: `prim severe young-ish female internet-censorship official, tight bun, buttoned high-collar blouse, deadpan, holding a glowing gold padlock over a screen. ${baseStyle}`, ratio: '1:1' },
  { name: 'Borzykin_Investigator', prompt: `stern bald male chief investigator, dark uniform with gold epaulettes, deadpan, holding a thick red case file stamped with a gold seal. ${baseStyle}`, ratio: '1:1' },
  { name: 'Porohov_Mercenary', prompt: `brutal bald male mercenary warlord, stubble, plain dark fatigues, deadpan menacing stare, gold sledgehammer resting on shoulder. ${baseStyle}`, ratio: '1:1' },
  { name: 'bg_protest', prompt: `dark empty city square at night, scattered abandoned protest signs, faint crimson glow, brutalist, oppressive, imperial decay. ${baseStyle}`, ratio: '16:9' },
  { name: 'ending_zastoy', prompt: `a frozen giant clock with gold hands stuck, covered in dust, pitch black void. ${baseStyle}`, ratio: '1:1' },
  { name: 'ending_kooperativ', prompt: `cluster of identical gold dachas behind a lake at night, opulent and cold, empty. ${baseStyle}`, ratio: '1:1' },
  { name: 'ending_bunker', prompt: `heavy steel bunker door slightly ajar, faint gold light inside, brutalist concrete. ${baseStyle}`, ratio: '1:1' },
  { name: 'ending_legenda', prompt: `colossal gold monument silhouette on a pedestal against black sky, oppressive grandeur. ${baseStyle}`, ratio: '1:1' }
];

async function generateImage(promptObj) {
  console.log(`Generating ${promptObj.name}...`);
  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: promptObj.prompt }],
        parameters: { sampleCount: 1, aspectRatio: promptObj.ratio }
      })
    });

    const data = await response.json();
    if (data.predictions && data.predictions.length > 0) {
      const base64Data = data.predictions[0].bytesBase64Encoded;
      const buffer = Buffer.from(base64Data, 'base64');
      
      const outPath = path.join('C:\\Users\\Lenovo\\Desktop\\PresidentGame_Images', `${promptObj.name}.png`);
      fs.writeFileSync(outPath, buffer);
      console.log(`Saved ${outPath}`);
    } else {
      console.error(`Failed to generate ${promptObj.name}:`, JSON.stringify(data));
    }
  } catch (err) {
    console.error(`Error generating ${promptObj.name}:`, err);
  }
}

async function main() {
  for (const p of prompts) {
    await generateImage(p);
    // delay to prevent hitting rate limits
    await new Promise(r => setTimeout(r, 6000));
  }
  console.log('All done!');
}

main();
