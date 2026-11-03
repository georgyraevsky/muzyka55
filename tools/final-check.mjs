// Финальная проверка: ленивые картинки, бесшовность бегущей строки,
// типографика-запреты, доступность, вес страницы.
import puppeteer from 'puppeteer-core';
import { statSync, readFileSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://127.0.0.1:4173/';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 90000 });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const transferred = [];
page.on('response', async (r) => {
  try {
    const h = r.headers();
    const len = Number(h['content-length'] || 0);
    if (len) transferred.push({ url: r.url().replace(URL, '/'), len, type: h['content-type'] || '' });
  } catch {}
});

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });

// проходим всю страницу, чтобы догрузились lazy-картинки
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 70));
  }
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise((r) => setTimeout(r, 1200));
});
await page.waitForNetworkIdle({ idleTime: 800, timeout: 20000 }).catch(() => {});

const result = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].map((i) => ({
    src: i.getAttribute('src'),
    ok: i.complete && i.naturalWidth > 0,
    nat: `${i.naturalWidth}x${i.naturalHeight}`,
    loading: i.getAttribute('loading') || 'eager',
  }));

  // бегущая строка: половины должны быть равны
  const track = document.querySelector('.marquee-track');
  const halves = track ? [...track.children].map((c) => Math.round(c.getBoundingClientRect().width)) : [];
  const trackW = track ? Math.round(track.getBoundingClientRect().width) : 0;

  // запрещённые шрифты
  const bannedFonts = ['Inter', 'Roboto', 'Arial', 'Open Sans', 'Helvetica', 'Ubuntu', 'Montserrat'];
  const usedFonts = new Set();
  document.querySelectorAll('body *').forEach((el) => {
    const ff = getComputedStyle(el).fontFamily;
    if (ff) usedFonts.add(ff.split(',')[0].replace(/["']/g, '').trim());
  });

  // доступность
  const imgsNoAlt = [...document.querySelectorAll('img')].filter((i) => i.getAttribute('alt') === null).length;
  const linksNoText = [...document.querySelectorAll('a')].filter(
    (a) => !a.textContent.trim() && !a.getAttribute('aria-label')
  ).length;
  const btnsNoLabel = [...document.querySelectorAll('button')].filter(
    (b) => !b.textContent.trim() && !b.getAttribute('aria-label')
  ).length;
  const inputsNoLabel = [...document.querySelectorAll('input, select')].filter(
    (i) => !i.id || !document.querySelector(`label[for="${i.id}"]`)
  ).length;

  // порядок заголовков
  const headings = [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName);

  // контраст-независимая проверка: ни один текст не меньше 11px
  const tooSmall = [...document.querySelectorAll('p,span,a,li,dd,dt,button')].filter((el) => {
    if (el.children.length) return false;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    return el.textContent.trim().length > 1 && fs < 11;
  }).length;

  return {
    imgs,
    imgsTotal: imgs.length,
    imgsBroken: imgs.filter((i) => !i.ok),
    marquee: { trackW, halves, seamless: halves.length === 2 && halves[0] === halves[1] },
    usedFonts: [...usedFonts],
    bannedFontsUsed: [...usedFonts].filter((f) => bannedFonts.some((b) => f.toLowerCase() === b.toLowerCase())),
    a11y: { imgsNoAlt, linksNoText, btnsNoLabel, inputsNoLabel },
    headings,
    tooSmall,
    domNodes: document.querySelectorAll('*').length,
  };
});

// вес
const byType = {};
for (const t of transferred) {
  const k = t.type.split(';')[0];
  byType[k] = (byType[k] || 0) + t.len;
}
const total = Object.values(byType).reduce((a, b) => a + b, 0);

await browser.close();

console.log('═══ КАРТИНКИ ═══');
console.log(`${result.imgsTotal} тегов, битых: ${result.imgsBroken.length}`);
if (result.imgsBroken.length) console.log(JSON.stringify(result.imgsBroken, null, 1));
console.log('lazy:', result.imgs.filter((i) => i.loading === 'lazy').length, '| eager:', result.imgs.filter((i) => i.loading === 'eager').length);

console.log('\n═══ БЕГУЩАЯ СТРОКА ═══');
console.log(JSON.stringify(result.marquee));

console.log('\n═══ ШРИФТЫ ═══');
console.log('используются:', result.usedFonts);
console.log('запрещённые:', result.bannedFontsUsed.length ? result.bannedFontsUsed : 'нет');

console.log('\n═══ ДОСТУПНОСТЬ ═══');
console.log(JSON.stringify(result.a11y));
console.log('заголовки:', result.headings.join(' '));
console.log('текст < 11px:', result.tooSmall);
console.log('DOM-узлов:', result.domNodes);

console.log('\n═══ ВЕС ═══');
for (const [t, len] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${t.padEnd(28)} ${(len / 1024).toFixed(0).padStart(6)} KB`);
}
console.log(`  ИТОГО ${(total / 1024).toFixed(0)} KB`);
const heavy = transferred.filter((t) => t.len > 40000).sort((a, b) => b.len - a.len);
console.log('  крупные файлы:', heavy.map((h) => `${h.url} ${(h.len / 1024).toFixed(0)}KB`).join(', ') || 'нет');

console.log('\n═══ ФАЙЛЫ ПРОЕКТА ═══');
for (const f of ['index.html', 'assets/css/main.css', 'assets/js/main.js', 'assets/fonts/fonts.css']) {
  console.log(`  ${f.padEnd(28)} ${(statSync(f).size / 1024).toFixed(1)} KB`);
}