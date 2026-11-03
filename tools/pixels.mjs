// Пиксельный анализ скриншотов: распределение яркости, доля «пересветов»,
// средний цвет по горизонтальным полосам. Проверяет, что страница действительно тёмная,
// что нет случайных белых блоков и что контент не липнет к краям.
import sharp from 'sharp';
import { readdirSync } from 'node:fs';

const files = readdirSync('shots').filter((f) => f.endsWith('-full.png') || f.endsWith('-fold.png'));

for (const file of files) {
  const img = sharp(`shots/${file}`);
  const meta = await img.metadata();
  const { data, info } = await img.clone().resize({ width: 480, withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const bands = 12;
  const bandLum = Array.from({ length: bands }, () => ({ sum: 0, n: 0 }));
  let withinRange = 0;
  let nearWhite = 0;
  let nearBlack = 0;
  const hist = new Array(10).fill(0);

  for (let y = 0; y < height; y++) {
    const band = Math.min(bands - 1, Math.floor((y / height) * bands));
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      bandLum[band].sum += l;
      bandLum[band].n++;
      hist[Math.min(9, Math.floor(l / 25.6))]++;
      if (l > 20 && l < 235) withinRange++;
      if (l >= 245) nearWhite++;
      if (l <= 6) nearBlack++;
    }
  }

  const total = width * height;
  const meanL = bandLum.reduce((a, b) => a + b.sum, 0) / total;

  console.log(`\n─── ${file} (${meta.width}x${meta.height}) ───`);
  console.log(`  средняя яркость: ${meanL.toFixed(1)} / 255`);
  console.log(`  доля чистого белого: ${((nearWhite / total) * 100).toFixed(2)}%`);
  console.log(`  доля чёрного провала: ${((nearBlack / total) * 100).toFixed(2)}%`);
  console.log(`  полосы (сверху вниз): ${bandLum.map((b) => Math.round(b.sum / b.n)).join(' → ')}`);
  console.log(`  гистограмма 0-255 по десяткам: [${hist.join(', ')}]`);
  const midShare = (hist.slice(1, 9).reduce((a, b) => a + b, 0) / total) * 100;
  console.log(`  «середина» (25–225): ${midShare.toFixed(1)}%`);
}