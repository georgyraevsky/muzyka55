// Проверка интерактива: табы, мобильное меню, форма, клавиатура, reduced-motion.
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://127.0.0.1:4173/';
mkdirSync('shots', { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  protocolTimeout: 60000,
  args: ['--hide-scrollbars', '--disable-popup-blocking'],
});

const log = [];
const errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ═════ 1. Табы ═════ */
{
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle2' });

  for (const id of ['tab-wedding', 'tab-jubilee', 'tab-corporate', 'tab-horeca']) {
    await page.click(`#${id}`);
    await wait(800);

    const s = await page.evaluate((tabId) => {
      const tab = document.getElementById(tabId);
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      const img = panel.querySelector('img');
      const shown = [...document.querySelectorAll('[role="tabpanel"]')].filter(
        (p) => getComputedStyle(p).display !== 'none'
      );
      return {
        panel: panel.id,
        selected: tab.getAttribute('aria-selected'),
        shownPanels: shown.map((p) => p.id),
        panelH: Math.round(panel.getBoundingClientRect().height),
        imgOk: img ? img.complete && img.naturalWidth > 0 : 'нет картинки',
        imgNat: img ? `${img.naturalWidth}x${img.naturalHeight}` : null,
        title: panel.querySelector('h3')?.textContent.trim(),
        ctaHref: panel.querySelector('a[href*="wa.me"]')?.getAttribute('href')?.slice(0, 60),
      };
    }, id);
    log.push({ tab: id, ...s });
  }

  /* клавиатура */
  await page.focus('#tab-wedding');
  await page.keyboard.press('ArrowDown');
  await wait(400);
  log.push({
    keyboard: await page.evaluate(() => ({
      focus: document.activeElement?.id,
      selected: [...document.querySelectorAll('[role="tab"]')]
        .filter((t) => t.getAttribute('aria-selected') === 'true')
        .map((t) => t.id),
    })),
  });

  /* видео */
  await page.evaluate(() => document.getElementById('video')?.scrollIntoView());
  await wait(500);
  const hadFacade = await page.evaluate(() => !!document.getElementById('videoFacade'));
  await page.click('#videoFacade');
  await wait(1200);
  log.push({
    video: await page.evaluate((h) => {
      const f = document.querySelector('#video iframe');
      return {
        facadeWas: h,
        iframe: !!f,
        host: f ? new URL(f.src).host : null,
        facadeGone: !document.getElementById('videoFacade'),
      };
    }, hadFacade),
  });

  /* форма: перехватываем window.open, чтобы не открывать реальные вкладки */
  await page.evaluate(() => {
    window.__opened = null;
    window.open = (u) => {
      window.__opened = u;
      return null;
    };
    document.getElementById('contacts')?.scrollIntoView();
  });
  await wait(400);
  await page.type('#fName', 'Анна');
  await page.type('#fPlace', 'Ресторан «Осип Терлеев»');
  await page.evaluate(() => {
    document.getElementById('fDate').value = '2027-06-12';
    document.getElementById('fFormat').value = 'свадьба';
  });
  await page.click('#bookingForm button[type="submit"]');
  await wait(500);

  log.push({
    form: await page.evaluate(() => {
      const u = window.__opened;
      return {
        opened: u ? u.slice(0, 120) : null,
        decoded: u ? decodeURIComponent(u.split('text=')[1] || '') : null,
        urlLength: u ? u.length : 0,
      };
    }),
  });

  /* якоря */
  const anchors = await page.evaluate(() =>
    [...new Set([...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')))]
  );
  const broken = [];
  for (const h of anchors) {
    if (h === '#') continue;
    const ok = await page.evaluate((sel) => !!document.querySelector(sel), h);
    if (!ok) broken.push(h);
  }
  log.push({ anchors, brokenAnchors: broken });

  await page.close();
}

/* ═════ 2. Мобильное меню ═════ */
{
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle2' });

  const isClosed = () => {
    const m = document.getElementById('mobileMenu');
    return m.classList.contains('invisible') && getComputedStyle(m).visibility === 'hidden';
  };

  const before = await page.evaluate(() => {
    const m = document.getElementById('mobileMenu');
    return {
      closed: m.classList.contains('invisible') && getComputedStyle(m).visibility === 'hidden',
      expanded: document.getElementById('navToggle').getAttribute('aria-expanded'),
    };
  });

  await page.click('#navToggle');
  await wait(700);
  const opened = await page.evaluate(() => {
    const m = document.getElementById('mobileMenu');
    const cs = getComputedStyle(m);
    return {
      closed: cs.visibility === 'hidden',
      expanded: document.getElementById('navToggle').getAttribute('aria-expanded'),
      h: Math.round(m.getBoundingClientRect().height),
      opacity: Number(cs.opacity),
      linksOpacity: [...m.querySelectorAll('.menu-link')].map((l) => Number(getComputedStyle(l).opacity)),
      // морф гамбургера: обе линии повёрнуты
      barRotated: [...m.parentElement.querySelectorAll('.bar')].every(
        (b) => /matrix\(0\.707/.test(getComputedStyle(b).transform)
      ),
    };
  });

  await page.click('#mobileMenu a[href="#formats"]');
  await wait(800);
  const afterNav = await page.evaluate(() => {
    const m = document.getElementById('mobileMenu');
    return {
      closed: m.classList.contains('invisible') && getComputedStyle(m).visibility === 'hidden',
      scrollY: Math.round(window.scrollY),
    };
  });

  /* Escape */
  await page.click('#navToggle');
  await wait(600);
  const escBefore = await page.evaluate(() =>
    document.getElementById('navToggle').getAttribute('aria-expanded')
  );
  await page.keyboard.press('Escape');
  await wait(600);
  const afterEsc = await page.evaluate(() => {
    const m = document.getElementById('mobileMenu');
    return {
      closed: m.classList.contains('invisible') && getComputedStyle(m).visibility === 'hidden',
      expanded: document.getElementById('navToggle').getAttribute('aria-expanded'),
    };
  });
  afterEsc['открылиПередEscape'] = escBefore;

  log.push({ mobileMenu: { before, opened, afterNav, closedByEsc: afterEsc } });
  await page.close();
}

/* ═════ 3. prefers-reduced-motion ═════ */
{
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await wait(500);
  log.push({
    reducedMotion: await page.evaluate(() => {
      const revs = [...document.querySelectorAll('.reveal, .reveal-scale')];
      return {
        total: revs.length,
        allOpacity1: revs.every((el) => getComputedStyle(el).opacity === '1'),
        marquee: getComputedStyle(document.querySelector('.marquee-track')).animationName,
        drift: getComputedStyle(document.querySelector('.hero-grid')).animationName,
      };
    }),
  });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(log, null, 1));
console.log('\nОШИБКИ:', errors.length ? errors : 'нет');
writeFileSync('shots/interaction-report.json', JSON.stringify({ log, errors }, null, 2), 'utf8');