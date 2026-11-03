import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, protocolTimeout: 90000 });
const p = await b.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 80)); });
await p.setViewport({ width: 1440, height: 900 });
await p.goto('https://georgyraevsky.github.io/muzyka55/', { waitUntil: 'networkidle2', timeout: 60000 });
const r = await p.evaluate(() => ({
  title: document.title,
  h1: document.querySelector('h1')?.textContent.trim().slice(0, 50),
  sections: [...document.querySelectorAll('section[id]')].map(s => s.id),
  cssLoaded: getComputedStyle(document.body).backgroundColor,
  font: getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0],
  videos: document.querySelectorAll('video').length,
  imgBroken: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src')),
}));
console.log(JSON.stringify(r, null, 1));
console.log('ошибки:', errs.filter(e => !e.includes('404')).length ? errs : 'только 404 видео');
await b.close();
