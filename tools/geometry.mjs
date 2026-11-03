// Геометрия: карточки, обрезка текста, переносы, «сироты» в заголовках.
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://127.0.0.1:4173/';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 60000 });
const out = {};

for (const [name, w, h] of [
  ['mobile', 390, 844],
  ['tablet', 768, 1024],
  ['laptop', 1440, 900],
]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 500));

  out[name] = await page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + scrollY) };
    };

    // карточки программ
    const programCards = [...document.querySelectorAll('#programs .grid > article')].map((a) => ({
      ...rect(a),
      title: a.querySelector('h3')?.textContent.trim().slice(0, 30),
    }));

    // bento
    const bentoCards = [...document.querySelectorAll('#why .grid > article')].map((a) => ({
      ...rect(a),
      title: a.querySelector('h3')?.textContent.trim().slice(0, 26),
    }));

    // кейсы
    const caseCards = [...document.querySelectorAll('#cases .grid > article')].map((a) => rect(a));

    // обрезка текста: scrollHeight заметно больше clientHeight
    const clipped = [];
    document.querySelectorAll('h1, h2, h3, p, span, a, li, dd, dt').forEach((el) => {
      if (el.children.length > 1) return;
      if (el.scrollHeight > el.clientHeight + 3 && el.clientHeight > 0) {
        const cs = getComputedStyle(el);
        if (cs.overflow === 'visible' && cs.webkitLineClamp === 'none') {
          clipped.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 45),
            sh: el.scrollHeight,
            ch: el.clientHeight,
          });
        }
      }
    });

    // тексты, вылезающие за свой контейнер по ширине
    const wide = [];
    document.querySelectorAll('h1, h2, h3, p, a, li').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 4 && el.clientWidth > 0) {
        wide.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
          sw: el.scrollWidth,
          cw: el.clientWidth,
        });
      }
    });

    // мелкий текст (< 12px)
    const tiny = [];
    document.querySelectorAll('p, span, a, li, dd, dt').forEach((el) => {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const txt = (el.textContent || '').trim();
      if (fs < 11 && txt.length > 2 && el.children.length === 0) {
        tiny.push({ fs, text: txt.slice(0, 30) });
      }
    });

    // кликабельные зоны меньше 32px
    const smallTargets = [];
    document.querySelectorAll('a, button').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      if (r.height < 30 || r.width < 30) {
        smallTargets.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 25),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
    });

    const dl = document.querySelector('dl');
    const dlCells = dl ? [...dl.children].map((c) => rect(c)) : [];

    return {
      docHeight: Math.round(document.documentElement.scrollHeight),
      programCards,
      bentoCards,
      caseCards,
      dlCells,
      clipped: clipped.slice(0, 8),
      clippedCount: clipped.length,
      wide: wide.slice(0, 8),
      wideCount: wide.length,
      tinyCount: tiny.length,
      tiny: tiny.slice(0, 6),
      smallTargets: smallTargets.slice(0, 10),
    };
  });

  await page.close();
}

await browser.close();
writeFileSync('shots/geometry.json', JSON.stringify(out, null, 2), 'utf8');

for (const [vp, d] of Object.entries(out)) {
  console.log(`\n══════ ${vp} — docH ${d.docHeight} ══════`);
  console.log('программы:', JSON.stringify(d.programCards));
  console.log('bento:    ', JSON.stringify(d.bentoCards));
  console.log('кейсы:    ', JSON.stringify(d.caseCards));
  console.log('hero dl:  ', JSON.stringify(d.dlCells));
  console.log(`обрезка текста: ${d.clippedCount}`, d.clippedCount ? JSON.stringify(d.clipped) : '');
  console.log(`широкий текст: ${d.wideCount}`, d.wideCount ? JSON.stringify(d.wide) : '');
  console.log(`мелкий текст <11px: ${d.tinyCount}`, d.tinyCount ? JSON.stringify(d.tiny) : '');
  console.log(`мелкие цели: ${d.smallTargets.length}`, d.smallTargets.length ? JSON.stringify(d.smallTargets) : '');
}