import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 90000 });
const page = await browser.newPage();

const errors = [];
const failed = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('requestfailed', (r) => failed.push(r.url().split('/').pop() + ' :: ' + r.failure()?.errorText));

await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' });
await page.evaluate(() => new Promise((r) => setTimeout(r, 800)));

const r = await page.evaluate(() => ({
  sections: [...document.querySelectorAll('section[id]')].map((s) => s.id),
  videos: [...document.querySelectorAll('video')].map((v) => ({
    id: v.id || '-', src: v.getAttribute('src'), controls: v.controls,
    playsinline: v.playsInline, preload: v.preload,
  })),
  facade: !!document.getElementById('videoFacade'),
  facadeHiddenInitially: document.getElementById('videoFacade')?.classList.contains('hidden') ?? null,
  reviewСards: document.querySelectorAll('#reviews article').length,
  avitoLinks: document.querySelectorAll('#reviews a[href*="avito"]').length,
  navLinks: [...document.querySelectorAll('header nav a')].map((a) => a.getAttribute('href')).filter(Boolean),
  staveAnim: getComputedStyle(document.querySelector('.stave')).animationName,
  staveCount: document.querySelectorAll('.stave').length,
  domNodes: document.querySelectorAll('*').length,
}));

console.log(JSON.stringify(r, null, 1));
console.log('КОНСОЛЬ:', errors.length ? errors : 'чисто');
console.log('УПАВШИЕ ЗАПРОСЫ:', failed.length ? failed : 'нет');

await browser.close();