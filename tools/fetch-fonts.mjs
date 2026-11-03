// Скачивает woff2-сабсеты Cormorant Garamond и Onest с Google Fonts
// и генерирует локальный fonts.css. Только кириллица + латиница.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const UA_MODERN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FAMILIES = [
  { css: 'Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300', slug: 'cormorant' },
  { css: 'Onest:wght@300;400;500;600', slug: 'onest' },
];

const KEEP = new Set(['cyrillic', 'latin', 'cyrillic-ext']);

const OUT_FONTS = 'assets/fonts';
const OUT_CSS = 'assets/fonts/fonts.css';
mkdirSync(OUT_FONTS, { recursive: true });

let outCss = `/* Локальные шрифты — самохостинг, без внешних запросов */\n`;

for (const fam of FAMILIES) {
  const url = `https://fonts.googleapis.com/css2?family=${fam.css}&display=swap`;
  const res = await fetch(url, { headers: { 'User-Agent': UA_MODERN } });
  if (!res.ok) throw new Error(`CSS ${res.status} for ${fam.css}`);
  const css = await res.text();

  // Разбиваем на блоки "@font-face {...}" с предшествующим комментарием "/* subset */"
  const blocks = css.split('/*').slice(1);
  let count = 0;

  for (const raw of blocks) {
    const subset = raw.slice(0, raw.indexOf('*/')).trim();
    if (!KEEP.has(subset)) continue;

    const faceMatch = raw.match(/@font-face\s*\{[\s\S]*?\}/);
    if (!faceMatch) continue;
    let face = faceMatch[0];

    const weight = (face.match(/font-weight:\s*(\d+)/) || [, '400'])[1];
    const style = (face.match(/font-style:\s*(\w+)/) || [, 'normal'])[1];
    const srcUrl = (face.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
    if (!srcUrl) continue;

    const fname = `${fam.slug}-${weight}-${style}-${subset}.woff2`;
    const dest = join(OUT_FONTS, fname);

    if (!existsSync(dest)) {
      const bin = await fetch(srcUrl, { headers: { 'User-Agent': UA_MODERN } });
      if (!bin.ok) throw new Error(`font ${bin.status} ${srcUrl}`);
      writeFileSync(dest, Buffer.from(await bin.arrayBuffer()));
    }

    face = face
      .replace(/src:[^;]+;/, `src: url('./${fname}') format('woff2');`)
      .replace(/font-display:\s*swap;?/, '');

    outCss += `/* ${fam.slug} ${subset} */\n@font-face {\n${face
      .replace(/^@font-face\s*\{/, '')
      .replace(/\}$/, '')
      .split('\n')
      .map((l) => (l.trim() ? '  ' + l.trim() : l))
      .join('\n')}\n}\n\n`;
    count++;
  }
  console.log(`${fam.slug}: ${count} faces`);
}

writeFileSync(OUT_CSS, outCss, 'utf8');
console.log(`written ${OUT_CSS} (${outCss.length} bytes)`);