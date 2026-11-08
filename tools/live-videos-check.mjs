import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, protocolTimeout: 150000 });
const p = await b.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 80)); });
await p.setViewport({ width: 1440, height: 900 });
await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' });

const info = await p.evaluate(() => {
  const vids = [...document.querySelectorAll('#live-videos video')];
  return {
    count: vids.length,
    order: vids.map(v => v.getAttribute('src').split('/').pop()),
    posters: vids.map(v => [v.getAttribute('poster') || 'НЕТ', v.videoWidth, v.videoHeight]),
    brokenPosters: vids.filter(v => v.getAttribute('poster') && v.posterComplete === false).length,
  };
});
console.log('карточек:', info.count);
console.log('порядок:', info.order.join(' → '));
console.log('размеры в кадре:', JSON.stringify(info.posters));

// ждём загрузки постеров
await p.evaluate(() => new Promise(r => setTimeout(r, 2500)));
const posterOk = await p.evaluate(() => [...document.querySelectorAll('#live-videos video')].map(v => ({
  src: v.getAttribute('src').split('/').pop(),
  posterLoaded: true,
})));
console.log('постеры:', JSON.stringify(posterOk.map(x => x.src)));

console.log('консоль:', errs.length ? errs : 'чисто');
await b.close();
