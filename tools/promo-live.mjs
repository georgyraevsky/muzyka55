import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, protocolTimeout: 150000, args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto('https://georgyraevsky.github.io/muzyka55/', { waitUntil: 'networkidle2', timeout: 90000 });
const m = await p.evaluate(async () => {
  const v = document.getElementById('promoVideo');
  await new Promise(res => { if (v.readyState >= 1) return res(); v.addEventListener('loadedmetadata', res, {once:true}); setTimeout(res, 20000); });
  return { duration: Math.round(v.duration*10)/10, h: v.videoHeight, poster: v.poster.split('/').pop().slice(-22) };
});
console.log('LIVE метаданные:', JSON.stringify(m));
await p.evaluate(async () => { document.documentElement.style.scrollBehavior='auto'; document.getElementById('video').scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,700)); });
await p.click('#videoFacade');
await p.evaluate(() => new Promise(r => setTimeout(r, 2000)));
const s = await p.evaluate(() => { const v=document.getElementById('promoVideo'); return { paused:v.paused, t:Math.round(v.currentTime*10)/10 }; });
console.log('LIVE играет:', JSON.stringify(s));
await p.screenshot({ path: 'shots/live-promo.png' });
await b.close();
