// Конверсия и ритм: что видно в первом экране, где CTA, разнообразие сетки.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://127.0.0.1:4173/';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 90000 });

for (const [name, w, h] of [
  ['iPhone 390x844', 390, 844],
  ['MacBook 1440x900', 1440, 900],
  ['FullHD 1920x1080', 1920, 1080],
]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 900));

  const d = await page.evaluate((vh) => {
    const inFold = (el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= vh + 1 && r.width > 0;
    };
    const ctas = [...document.querySelectorAll('a[href*="wa.me"], a[href^="tel:"]')].map((a) => ({
      text: a.textContent.replace(/\s+/g, ' ').trim().slice(0, 28),
      inFold: inFold(a),
    }));
    const h1 = document.querySelector('h1');
    const h1r = h1.getBoundingClientRect();
    const heroImg = document.querySelector('#top + section img, section img');
    const imgR = heroImg?.getBoundingClientRect();

    // ритм: вертикальные отступы секций
    const paddings = [...document.querySelectorAll('main > section')].map((s) => {
      const cs = getComputedStyle(s);
      return `${cs.paddingTop}/${cs.paddingBottom}`;
    });

    // bento: разные ли размеры
    const bento = [...document.querySelectorAll('#why .grid > article')].map((a) =>
      Math.round(a.getBoundingClientRect().width)
    );

    return {
      ctasInFold: ctas.filter((c) => c.inFold).map((c) => c.text),
      ctasTotal: ctas.length,
      h1: {
        text: h1.textContent.replace(/\s+/g, ' ').trim(),
        fontSize: getComputedStyle(h1).fontSize,
        bottom: Math.round(h1r.bottom),
        fits: h1r.bottom < vh,
      },
      heroImg: imgR ? { h: Math.round(imgR.height), visible: imgR.bottom > 0 && imgR.top < vh } : 'нет',
      sectionPaddings: paddings,
      bentoWidths: bento,
      scrollHint: !!document.querySelector('.marquee-track'),
    };
  }, h);

  console.log(`\n═══ ${name} ═══`);
  console.log('  H1:', d.h1.fontSize, '| влезает в экран:', d.h1.fits, '| низ h1:', d.h1.bottom);
  console.log('  портрет:', JSON.stringify(d.heroImg));
  console.log('  CTA всего:', d.ctasTotal, '| в первом экране:', JSON.stringify(d.ctasInFold));
  console.log('  отступы секций:', d.sectionPaddings.join(' | '));
  console.log('  ширины bento-карточек:', d.bentoWidths.join(', '));

  await page.close();
}

await browser.close();