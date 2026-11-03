// Глубокий аудит: шрифты, контраст, reveal-видимость, картинки, переполнение.
// node tools/audit.mjs [url]
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.argv[2] ?? 'http://127.0.0.1:4173/';
const OUT = 'shots';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, dsf: 2 },
  { name: 'tablet', width: 768, height: 1024, dsf: 2 },
  { name: 'laptop', width: 1440, height: 900, dsf: 1 },
  { name: 'wide', width: 1920, height: 1080, dsf: 1 },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--font-render-hinting=none'],
});

const report = { url: URL, viewports: [], console: [], failedRequests: [], fonts: {}, links: {} };
const page = await browser.newPage();

page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning')
    report.console.push({ type: m.type(), text: m.text().slice(0, 300) });
});
page.on('pageerror', (e) => report.console.push({ type: 'pageerror', text: String(e).slice(0, 300) }));
page.on('requestfailed', (r) =>
  report.failedRequests.push({ url: r.url().slice(0, 160), error: r.failure()?.errorText })
);

// общий хелпер прокрутки.
// Важно: в CSS стоит scroll-behavior: smooth, поэтому программный scrollTo
// едет анимацией. На время замера отключаем плавность, иначе тест
// «не докручивает» и часть блоков ложно считается скрытой.
const scrollThrough = () =>
  page.evaluate(async () => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';

    const step = Math.round(window.innerHeight * 0.6);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 140));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 600));
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));

    html.style.scrollBehavior = prev;
  });

for (const vp of VIEWPORTS) {
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await scrollThrough();

  const m = await page.evaluate(() => {
    const de = document.documentElement;
    const vw = de.clientWidth;

    // реальное переполнение: у предка нет clip
    const clipped = (el) => {
      let p = el.parentElement;
      while (p && p !== document.documentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowX !== 'visible' || cs.overflow === 'hidden' || cs.overflow === 'clip')
          return true;
        p = p.parentElement;
      }
      return false;
    };

    const overflow = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (r.right > vw + 1.5 || r.left < -1.5) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || clipped(el)) return;
        overflow.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className || '').slice(0, 70),
          left: Math.round(r.left),
          right: Math.round(r.right),
        });
      }
    });

    const revealAll = [...document.querySelectorAll('.reveal, .reveal-scale')];
    const unrevealed = revealAll
      .filter((el) => !el.classList.contains('is-in'))
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || '').slice(0, 60),
        h: Math.round(el.getBoundingClientRect().height),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      }));

    const imgs = [...document.querySelectorAll('img')].map((i) => ({
      src: i.getAttribute('src'),
      ok: i.complete && i.naturalWidth > 0,
      nat: `${i.naturalWidth}x${i.naturalHeight}`,
      rendered: `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`,
    }));

    return {
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      docHeight: Math.round(de.scrollHeight),
      overflow: overflow.slice(0, 10),
      overflowCount: overflow.length,
      revealTotal: revealAll.length,
      unrevealed,
      imgs,
      h1Count: document.querySelectorAll('h1').length,
      pureBlackWhite: [...document.querySelectorAll('body, body *')].filter((el) => {
        const cs = getComputedStyle(el);
        return cs.backgroundColor === 'rgb(0, 0, 0)' || cs.backgroundColor === 'rgb(255, 255, 255)';
      }).length,
    };
  });

  report.viewports.push({ name: vp.name, width: vp.width, ...m });

  await page.screenshot({ path: `${OUT}/${vp.name}-full.png`, fullPage: true });
  await page.screenshot({ path: `${OUT}/${vp.name}-fold.png` });
}

// шрифты и контраст
await page.setViewport({ width: 1440, height: 900 });
await page.goto(URL, { waitUntil: 'networkidle2' });

report.fonts = await page.evaluate(async () => {
  await document.fonts.ready;
  const loaded = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`);
  const h1 = document.querySelector('h1');
  const body = document.body;
  return {
    loadedCount: loaded.length,
    statuses: [...new Set(loaded.map((l) => l.split(' ').pop()))],
    families: [...new Set(loaded.map((l) => l.split(' ').slice(0, 2).join(' ')))],
    h1Font: getComputedStyle(h1).fontFamily,
    bodyFont: getComputedStyle(body).fontFamily,
    h1Size: getComputedStyle(h1).fontSize,
  };
});

const lum = (hex) => {
  const c = hex.match(/\d+/g).map(Number).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
};

report.contrast = {
  'cream #f4eee5 on noir #0b0908': ratio('rgb(244,238,229)', 'rgb(11,9,8)'),
  'cream-dim #ded5c8 on noir': ratio('rgb(222,213,200)', 'rgb(11,9,8)'),
  'mute #a2968a on noir': ratio('rgb(162,150,138)', 'rgb(11,9,8)'),
  'brass #c7a26a on noir': ratio('rgb(199,162,106)', 'rgb(11,9,8)'),
  'noir on brass (кнопка)': ratio('rgb(11,9,8)', 'rgb(199,162,106)'),
  'mute/80 on noir': ratio('rgb(130,120,110)', 'rgb(11,9,8)'),
};

report.links = await page.evaluate(() => ({
  anchors: [...document.querySelectorAll('a[href]')].map((a) => ({
    href: a.getAttribute('href'),
    blank: a.target === '_blank',
    rel: a.getAttribute('rel'),
  })),
  imgs: [...document.querySelectorAll('img')].map((i) => ({
    src: i.getAttribute('src'),
    alt: i.getAttribute('alt'),
  })),
}));

await browser.close();
writeFileSync('shots/audit-report.json', JSON.stringify(report, null, 2), 'utf8');

console.log('=== CONSOLE ===', report.console.length ? JSON.stringify(report.console, null, 1) : 'чисто');
console.log('\n=== FAILED REQUESTS ===', report.failedRequests.length ? JSON.stringify(report.failedRequests, null, 1) : 'нет');
console.log('\n=== VIEWPORTS ===');
for (const v of report.viewports) {
  console.log(
    `${v.name.padEnd(7)} ${String(v.width).padStart(5)}  scrollW=${v.scrollWidth} clientW=${v.clientWidth} docH=${v.docHeight} overflow=${v.overflowCount} reveal=${v.revealTotal - v.unrevealed.length}/${v.revealTotal} h1=${v.h1Count} pureBW=${v.pureBlackWhite}`
  );
  if (v.overflow.length) console.log('   OVERFLOW', JSON.stringify(v.overflow, null, 1));
  if (v.unrevealed.length) console.log('   UNREVEALED', JSON.stringify(v.unrevealed, null, 1));
}
console.log('\n=== FONTS ===', JSON.stringify(report.fonts, null, 1));
console.log('\n=== CONTRAST ===', JSON.stringify(report.contrast, null, 1));
const bad = report.viewports[0].imgs.filter((i) => !i.ok);
console.log('\n=== IMAGES ===', `${report.viewports[0].imgs.length} всего, битых: ${bad.length}`);
if (bad.length) console.log(JSON.stringify(bad, null, 1));
console.log('\n=== ANCHORS ===', report.links.anchors.length);
const unsafe = report.links.anchors.filter((a) => a.blank && !(a.rel || '').includes('noopener'));
console.log('без noopener:', unsafe.length);
console.log('\n=== ALT ===', JSON.stringify(report.links.imgs.map((i) => [i.src, i.alt])));