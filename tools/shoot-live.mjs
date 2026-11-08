import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, protocolTimeout: 120000 });
const p = await b.newPage();
for (const v of [{n:'laptop',w:1440,h:900,d:1},{n:'mobile',w:390,h:844,d:2}]) {
  await p.setViewport({ width: v.w, height: v.h, deviceScaleFactor: v.d });
  await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' });
  await p.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    document.getElementById('live-videos').scrollIntoView({ block: 'start' });
    await new Promise(r => setTimeout(r, 900));
  });
  await p.screenshot({ path: `shots/${v.n}-live-videos.png` });
  console.log(v.n + ' готов');
}
await b.close();
