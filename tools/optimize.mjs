// Оптимизация: PNG/JPEG -> WebP, чтобы страница не тянула мегабайты.
// node tools/optimize.mjs
import sharp from 'sharp';
import { statSync, existsSync } from 'node:fs';

const jobs = [
  { src: 'assets/images/hero-bg.png', out: 'assets/images/hero-bg.webp', w: 1080, q: 80 },
  { src: 'assets/images/video-cover.jpg', out: 'assets/images/video-cover.webp', w: 1600, q: 78 },
  { src: 'assets/images/program-russian.png', out: 'assets/images/program-russian.webp', w: 672, q: 80 },
  { src: 'assets/images/about-1.jpg', out: 'assets/images/about-1.webp', w: 1214, q: 80 },
  { src: 'assets/images/about-2.jpg', out: 'assets/images/about-2.webp', w: 1214, q: 80 },
  { src: 'assets/images/about-3.jpg', out: 'assets/images/about-3.webp', w: 1214, q: 80 },
  { src: 'assets/images/portfolio-1.jpg', out: 'assets/images/portfolio-1.webp', w: 1082, q: 80 },
  { src: 'assets/images/portfolio-2.jpg', out: 'assets/images/portfolio-2.webp', w: 837, q: 80 },
  { src: 'assets/images/portfolio-3.jpg', out: 'assets/images/portfolio-3.webp', w: 864, q: 80 },
];

for (const job of jobs) {
  if (!existsSync(job.src)) {
    console.log(`пропуск (нет файла): ${job.src}`);
    continue;
  }
  const before = statSync(job.src).size;
  await sharp(job.src)
    .resize({ width: job.w, withoutEnlargement: true })
    .webp({ quality: job.q, effort: 6 })
    .toFile(job.out);
  const after = statSync(job.out).size;
  console.log(
    `${job.out.padEnd(40)} ${(before / 1024).toFixed(0).padStart(5)} KB -> ${(after / 1024).toFixed(0).padStart(4)} KB  (-${(100 - (after / before) * 100).toFixed(0)}%)`
  );
}