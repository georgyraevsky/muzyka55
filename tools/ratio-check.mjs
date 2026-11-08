import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, protocolTimeout: 120000 });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' });
const r = await p.evaluate(() => [...document.querySelectorAll('#live-videos figure')].map((f, i) => {
  const v = f.querySelector('video');
  const rc = v.getBoundingClientRect();
  return { n: i + 1, box: Math.round(rc.width) + 'x' + Math.round(rc.height), ratio: (rc.width / rc.height).toFixed(2), span: f.className.includes('col-span-2') ? 'широкая' : '-' };
}));
r.forEach(x => console.log(x.n + ':', x.box, 'ratio=' + x.ratio, x.span));
await b.close();
