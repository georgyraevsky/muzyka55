import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, protocolTimeout: 90000 });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' });

// прокручиваем к карточке, чтобы она была в кадре и раскрылась
await page.evaluate(async () => {
  document.documentElement.style.scrollBehavior = 'auto';
  const c = document.querySelector('#programs .bellows');
  c.scrollIntoView({ block: 'center' });
  await new Promise((r) => setTimeout(r, 900));
});

const before = await page.evaluate(() => getComputedStyle(document.querySelector('#programs .bellows')).transform);
const box = await page.evaluate(() => {
  const r = document.querySelector('#programs .bellows').getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), inView: r.y > 0 && r.y < 900 };
});

await page.mouse.move(box.x, box.y);
await page.evaluate(() => new Promise((r) => setTimeout(r, 900)));
const after = await page.evaluate(() => getComputedStyle(document.querySelector('#programs .bellows')).transform);

console.log('позиция карточки:', JSON.stringify(box));
console.log('до наведения :', before);
console.log('после        :', after);
console.log('эффект работает:', before !== after ? 'ДА' : 'НЕТ');

await browser.close();