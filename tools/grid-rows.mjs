import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, protocolTimeout: 120000 });
const p = await b.newPage();
for (const vp of [{n:'laptop',w:1440,h:900},{n:'wide',w:1920,h:1080},{n:'tablet',w:768,h:1024},{n:'mobile',w:390,h:844}]) {
  await p.setViewport({ width: vp.w, height: vp.h });
  await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' });
  const r = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#live-videos figure')];
    const boxes = cards.map(f => { const rc = f.getBoundingClientRect(); return { src: f.querySelector('video').getAttribute('src').split('/').pop().replace('.mp4',''), top: rc.top, left: rc.left, w: Math.round(rc.width), h: Math.round(rc.height) }; });
    // группируем по вертикальному перекрытию, а не по точному top
    const rows = [];
    boxes.forEach(bx => {
      let row = rows.find(rw => Math.abs(rw.top - bx.top) < 120);
      if (!row) { row = { top: bx.top, items: [] }; rows.push(row); }
      row.items.push(bx);
    });
    return { rows: rows.sort((a,b)=>a.top-b.top).map(r => r.items.sort((a,b)=>a.left-b.left)) };
  });
  console.log('=== ' + vp.n + ' ' + vp.w + ' ===');
  r.rows.forEach((row, i) => console.log('  ряд ' + (i+1) + ' (' + row.length + ' шт): ' + row.map(c => c.src + ' ' + c.w + 'x' + c.h).join(' | ')));
}
await b.close();
