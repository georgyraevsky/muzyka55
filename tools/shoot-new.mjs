import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, protocolTimeout: 120000 });
const page = await browser.newPage();
for (const v of [{n:'mobile',w:390,h:844,d:2},{n:'laptop',w:1440,h:900,d:1}]) {
  await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: v.d });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' });
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); }
    window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 400));
  });
  // секция видео+живые выступления
  await page.evaluate(async () => { document.getElementById('video').scrollIntoView({block:'start'}); await new Promise(r=>setTimeout(r,700)); });
  await page.screenshot({ path: `shots/${v.n}-video.png` });
  // отзывы
  await page.evaluate(async () => { document.getElementById('reviews').scrollIntoView({block:'start'}); await new Promise(r=>setTimeout(r,700)); });
  await page.screenshot({ path: `shots/${v.n}-reviews.png` });
  await page.screenshot({ path: `shots/${v.n}-full.png`, fullPage: true });
  console.log(v.n + ' готов');
}
await browser.close();
