import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, protocolTimeout: 120000, args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 90)); });
await p.setViewport({ width: 1440, height: 900 });
await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' });

const meta = await p.evaluate(async () => {
  const v = document.getElementById('promoVideo');
  await new Promise((res) => {
    if (v.readyState >= 1) return res();
    v.addEventListener('loadedmetadata', res, { once: true });
    setTimeout(res, 8000);
  });
  return { duration: Math.round(v.duration * 10) / 10, w: v.videoWidth, h: v.videoHeight, readyState: v.readyState, poster: v.getAttribute('poster') };
});
console.log('метаданные:', JSON.stringify(meta));

// клик по кнопке Play
await p.evaluate(async () => {
  document.documentElement.style.scrollBehavior = 'auto';
  document.getElementById('video').scrollIntoView({ block: 'center' });
  await new Promise(r => setTimeout(r, 600));
});
await p.click('#videoFacade');
await p.evaluate(() => new Promise(r => setTimeout(r, 1600)));
const playing = await p.evaluate(() => {
  const v = document.getElementById('promoVideo');
  return { paused: v.paused, t: Math.round(v.currentTime * 10) / 10, facadeHidden: document.getElementById('videoFacade').classList.contains('hidden') };
});
console.log('после клика Play:', JSON.stringify(playing));
await p.screenshot({ path: 'shots/promo-playing.png' });

// правило одного звука: запускаем второе видео
const solo = await p.evaluate(async () => {
  const vids = [...document.querySelectorAll('video')];
  const second = vids[1];
  try { await second.play(); } catch (e) { return { error: e.message.slice(0, 60) }; }
  await new Promise(r => setTimeout(r, 700));
  return { firstPaused: vids[0].paused, secondPlaying: !second.paused };
});
console.log('одно видео за раз:', JSON.stringify(solo));

console.log('ошибки консоли:', errs.length ? errs : 'чисто');
await b.close();
