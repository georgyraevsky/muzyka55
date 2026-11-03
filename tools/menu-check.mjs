// Проверка мобильного меню: открытие, морф, stagger, Escape, возврат фокуса.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://127.0.0.1:4173/';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 90000 });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'networkidle2' });

const read = () =>
  page.evaluate(() => {
    const menu = document.getElementById('mobileMenu');
    const toggle = document.getElementById('navToggle');
    const links = [...menu.querySelectorAll('.menu-link')];
    const cs = getComputedStyle(menu);
    const bar1 = document.querySelector('.bar-1');
    const bar2 = document.querySelector('.bar-2');

    return {
      expanded: toggle.getAttribute('aria-expanded'),
      label: toggle.getAttribute('aria-label'),
      menuVisibility: cs.visibility,
      menuOpacity: Number(cs.opacity).toFixed(2),
      menuRect: menu.getBoundingClientRect().height,
      bodyOverflow: document.body.style.overflow,
      // видны ли ссылки (после анимации)
      linksVisible: links.map((l) => ({
        text: l.textContent.trim().slice(0, 22),
        opacity: Number(getComputedStyle(l).opacity).toFixed(2),
        ty: getComputedStyle(l).transform,
      })),
      bar1: bar1 ? getComputedStyle(bar1).transform : null,
      bar2: bar2 ? getComputedStyle(bar2).transform : null,
      focused: document.activeElement?.textContent?.trim().slice(0, 22) ?? null,
    };
  });

console.log('── закрытое состояние ──');
let s = await read();
console.log(`  expanded=${s.expanded} label="${s.label}" visibility=${s.menuVisibility} opacity=${s.menuOpacity}`);
console.log(`  ссылки opacity: ${s.linksVisible.map((l) => l.opacity).join(', ')}`);
console.log(`  bar1: ${s.bar1}  bar2: ${s.bar2}`);

// открываем
await page.click('#navToggle');
await new Promise((r) => setTimeout(r, 900));

console.log('\n── открытое состояние ──');
s = await read();
console.log(`  expanded=${s.expanded} label="${s.label}" visibility=${s.menuVisibility} opacity=${s.menuOpacity}`);
console.log(`  высота слоя: ${Math.round(s.menuRect)}px (экран 844)`);
console.log(`  body overflow: "${s.bodyOverflow}"`);
console.log(`  ссылки opacity: ${s.linksVisible.map((l) => l.opacity).join(', ')}`);
console.log(`  сдвиг ссылок: ${[...new Set(s.linksVisible.map((l) => l.ty))].join(' | ')}`);
console.log(`  bar1: ${s.bar1}`);
console.log(`  bar2: ${s.bar2}`);
console.log(`  фокус: "${s.focused}"`);

// stagger: задержки должны возрастать
const delays = await page.evaluate(() =>
  [...document.querySelectorAll('.menu-link')].map((l) => getComputedStyle(l).transitionDelay)
);
console.log(`  задержки: ${delays.join(', ')}`);

// клик по ссылке закрывает
await page.click('#mobileMenu a[href="#programs"]');
await new Promise((r) => setTimeout(r, 700));
s = await read();
console.log(`\n── после клика по ссылке ──`);

// повторно открыть и закрыть Escape
await page.click('#navToggle');
await new Promise((r) => setTimeout(r, 500));
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 600));
const afterEsc = await read();

console.log(`  expanded после Escape: ${afterEsc.expanded}`);
console.log(`  visibility: ${afterEsc.menuVisibility}`);
console.log(`  фокус вернулся на кнопку: ${await page.evaluate(() => document.activeElement?.id)}`);

// нет ли горизонтальной прокрутки при открытом меню
await page.click('#navToggle');
await new Promise((r) => setTimeout(r, 500));
const ov = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
console.log(`\n  overflow при открытом меню: scrollW=${ov.scrollW} clientW=${ov.clientW}`);

await browser.close();