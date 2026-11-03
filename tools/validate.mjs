// Структурная валидация: каждый <article> в порядке, вложенность карточек, баланс тегов.
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://127.0.0.1:4173/';

/* ---- 1. Баланс тегов в исходнике ---- */
const html = readFileSync('index.html', 'utf8');
const voids = new Set(['meta', 'link', 'img', 'br', 'hr', 'input', 'source', 'path', 'circle', 'rect', 'use', 'stop', 'polyline', 'line', 'polygon', 'ellipse']);
const stack = [];
const problems = [];
const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g;
let m;
let lineOf = (idx) => html.slice(0, idx).split('\n').length;
while ((m = tagRe.exec(html))) {
  const [, close, name, attrs, selfClose] = m;
  const lower = name.toLowerCase();
  if (['script', 'style'].includes(lower) && !close) {
    const end = html.toLowerCase().indexOf(`</${lower}>`, tagRe.lastIndex);
    if (end === -1) problems.push(`<${lower}> без закрытия, строка ${lineOf(m.index)}`);
    tagRe.lastIndex = end + lower.length + 3;
    continue;
  }
  if (voids.has(lower) || selfClose === '/') continue;
  if (close) {
    const top = stack.pop();
    if (!top) problems.push(`лишний </${lower}> строка ${lineOf(m.index)}`);
    else if (top.name !== lower)
      problems.push(`</${lower}> на строке ${lineOf(m.index)} закрывает <${top.name}> со строки ${top.line}`);
  } else {
    stack.push({ name: lower, line: lineOf(m.index) });
  }
}
for (const s of stack) problems.push(`<${s.name}> со строки ${s.line} не закрыт`);

/* ---- 2. DOM-проверка ---- */
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 60000 });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(URL, { waitUntil: 'networkidle2' });

const dom = await page.evaluate(() => {
  const sections = [...document.querySelectorAll('main > section')].map((s) => ({
    id: s.id || '(без id)',
    articles: s.querySelectorAll('article').length,
    h2: s.querySelector('h2')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) || null,
    reveals: s.querySelectorAll('.reveal, .reveal-scale').length,
  }));

  const bento = [...document.querySelectorAll('#why article')].map((a) => ({
    h3: a.querySelector('h3')?.textContent.replace(/\s+/g, ' ').trim(),
    hasCore: !!a.querySelector('.bezel-core'),
    hasSpot: !!a.querySelector('.spot'),
    nested: a.querySelectorAll('article').length,
  }));

  const programs = [...document.querySelectorAll('#programs article')].map((a) => ({
    h3: a.querySelector('h3')?.textContent.replace(/\s+/g, ' ').trim(),
    link: !!a.querySelector('a[href*="wa.me"]'),
    img: a.querySelector('img')?.getAttribute('src'),
  }));

  const tabs = [...document.querySelectorAll('[role="tabpanel"]')].map((p) => ({
    id: p.id,
    labelledby: p.getAttribute('aria-labelledby'),
    hidden: p.hasAttribute('hidden') || p.classList.contains('hidden'),
  }));

  // пустые контейнеры / висячие div
  const suspicious = [...document.querySelectorAll('article, section, div')].filter(
    (el) => el.children.length === 0 && !el.textContent.trim() && !el.className.includes('spot') &&
      !el.className.includes('grain') && getComputedStyle(el).display !== 'none' &&
      el.getBoundingClientRect().height > 40
  ).length;

  return { sections, bento, programs, tabs, suspicious };
});

await browser.close();

console.log('═══ БАЛАНС ТЕГОВ ═══');
console.log(problems.length ? problems.join('\n') : 'всё закрыто корректно');

console.log('\n═══ СЕКЦИИ ═══');
for (const s of dom.sections) {
  console.log(`  ${s.id.padEnd(12)} статей:${String(s.articles).padStart(2)}  reveal:${String(s.reveals).padStart(2)}  «${s.h2 ?? '—'}»`);
}

console.log('\n═══ BENTO (#why) ═══');
for (const b of dom.bento) {
  console.log(`  ${b.hasCore ? '✓' : '✗'} core  ${b.hasSpot ? '✓' : '✗'} spot  вложенных:${b.nested}  ${b.h3}`);
}

console.log('\n═══ ПРОГРАММЫ ═══');
for (const p of dom.programs) {
  console.log(`  ${p.link ? '✓' : '✗'} ссылка  ${p.img ? '✓' : '✗'} фото  ${p.h3}`);
}

console.log('\n═══ ТАБЫ ═══');
for (const t of dom.tabs) console.log(`  ${t.id}  labelledby=${t.labelledby}  скрыт=${t.hidden}`);

console.log('\nпустых подозрительных блоков:', dom.suspicious);