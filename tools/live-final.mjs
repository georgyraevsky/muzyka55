import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, protocolTimeout: 150000, args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 70)); });
await p.setViewport({ width: 1440, height: 900 });
await p.goto('https://georgyraevsky.github.io/muzyka55/', { waitUntil: 'networkidle2', timeout: 90000 });
await p.evaluate(async () => { document.documentElement.style.scrollBehavior='auto'; document.getElementById('live-videos').scrollIntoView({block:'start'}); await new Promise(r=>setTimeout(r,1500)); });

// проверяем первое видео: постер + воспроизведение
const meta = await p.evaluate(async () => {
  const v = document.querySelector('#live-videos video');
  try { await v.play(); } catch(e) { return { error: e.message.slice(0,50) }; }
  await new Promise(r => setTimeout(r, 1800));
  return { paused: v.paused, t: Math.round(v.currentTime*10)/10, w: v.videoWidth, h: v.videoHeight, poster: v.getAttribute('poster').split('/').pop() };
});
console.log('LIVE live-1:', JSON.stringify(meta));

// правило одного звука
const solo = await p.evaluate(async () => {
  const vids = [...document.querySelectorAll('#live-videos video')];
  try { await vids[2].play(); } catch(e) { return { err: e.message.slice(0,40) }; }
  await new Promise(r => setTimeout(r, 900));
  return { firstPaused: vids[0].paused, thirdPlaying: !vids[2].paused };
});
console.log('одно видео за раз:', JSON.stringify(solo));
console.log('консоль:', errs.length ? errs : 'чисто');
await p.screenshot({ path: 'shots/live-final.png' });
await b.close();
