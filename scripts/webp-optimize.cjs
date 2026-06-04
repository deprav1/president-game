// Одноразовый скрипт оптимизации: PNG -> WebP с ресайзом под назначение.
// Запуск: node scripts/webp-optimize.cjs
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMG_DIR = path.join(__dirname, '..', 'public', 'images');

// Размер (по большей стороне) и качество по типу картинки.
function targetFor(name) {
  if (/^(Gromov|Hartley|Patriarch|Senin|Streltsova|Usmanov|Vlasova|Zubov)_/.test(name)) return { w: 512, q: 80 };
  if (/^bg_/.test(name)) return { w: 1024, q: 72 };
  if (/^ending_/.test(name)) return { w: 640, q: 78 };
  if (/^imperial_/.test(name)) return { w: 1024, q: 74 };
  if (/^asset_/.test(name)) return { w: 640, q: 80 };
  if (name === 'game_background.png') return { w: 1080, q: 70 };
  if (/^(onboarding_dossier|palace_ruined|election_booth)\.png$/.test(name)) return { w: 768, q: 78 };
  return { w: 768, q: 78 };
}

// Эти PNG не трогаем (нужны как PNG для favicon/og в index.html).
const KEEP_PNG = new Set(['favicon_eagle.png', 'og_share.png']);
// Явный мусор-итерации — удалить без конвертации.
const JUNK = /_(v[2-9])\.png$/;

(async () => {
  const files = fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.png'));
  let converted = 0, savedBytes = 0, deletedJunk = 0;
  for (const f of files) {
    const src = path.join(IMG_DIR, f);
    if (KEEP_PNG.has(f)) { console.log('keep png:', f); continue; }
    if (JUNK.test(f)) { fs.unlinkSync(src); deletedJunk++; console.log('junk del:', f); continue; }
    const { w, q } = targetFor(f);
    const out = path.join(IMG_DIR, f.replace(/\.png$/, '.webp'));
    const before = fs.statSync(src).size;
    const meta = await sharp(src).metadata();
    let pipe = sharp(src);
    if (meta.width > w) pipe = pipe.resize({ width: w, withoutEnlargement: true });
    await pipe.webp({ quality: q, effort: 6 }).toFile(out);
    const after = fs.statSync(out).size;
    savedBytes += before - after;
    converted++;
    fs.unlinkSync(src); // удаляем исходный PNG
    console.log(`${f} -> .webp  ${(before/1024).toFixed(0)}KB -> ${(after/1024).toFixed(0)}KB`);
  }
  console.log(`\nГотово: конвертировано ${converted}, мусора удалено ${deletedJunk}, экономия ~${(savedBytes/1048576).toFixed(1)} MB`);
})();
