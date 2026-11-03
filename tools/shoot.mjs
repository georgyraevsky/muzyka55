// Финальные скриншоты для визуальной сверки
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 120000 });
const page = await browser.newPage();

const views = [
  { name: 'mobile', width: 390, height: 844, dsf: 2 },
  { name: 'tablet', width: 768, height: 1024, dsf: 2 },
  { name: 'laptop', width: 1440, height: 900, dsf: 1 },
  { name: 'wide', width: 1920, height: 1080, dsf: 1 },
];

for (const v of views) {
  await page.setViewport({ width: v.width, height: v.height, deviceScaleFactor: v.dsf });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' });

  // прогреваем все reveal
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    const step = Math.round(window.innerHeight * 0.5);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 500));
  });

  await page.screenshot({ path: `shots/${v.name}-fold.png` });
  await page.screenshot({ path: `shots/${v.name}-full.png`, fullPage: true });
  console.log(`${v.name} готов`);
}

// отдельно: открытое мобильное меню
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' });
await page.click('#navToggle');
await wait(1100);
await page.screenshot({ path: 'shots/mobile-menu.png' });
console.log('меню готово');

await browser.close();