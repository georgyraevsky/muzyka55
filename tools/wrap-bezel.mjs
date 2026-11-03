// Обернуть плоские карточки в «обойму» (Double-Bezel) без риска сломать вложенность:
// находим <article>, отслеживаем баланс <article>/</article>, вставляем bezel-core.
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'index.html';
let html = readFileSync(file, 'utf8');

// Плоские варианты открывающего тега
const FLAT = [
  '<article class="reveal card-spot group relative overflow-hidden rounded-3xl border border-cream/[0.07] bg-cream/[0.02]"',
  '<article class="reveal card-spot group relative overflow-hidden rounded-3xl border border-cream/[0.07] bg-cream/[0.02] md:col-span-2 lg:row-span-2"',
];

function findClose(from) {
  // from — позиция сразу после открывающего '>' тега article
  let depth = 1;
  const re = /<article\b|<\/article>/g;
  re.lastIndex = from;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0] === '</article>' ? -1 : 1;
    if (depth === 0) return m.index; // позиция начала '</article>'
  }
  return -1;
}

let converted = 0;

// идём с конца, чтобы позиции не съезжали
const openings = [];
for (const prefix of FLAT) {
  let idx = 0;
  while ((idx = html.indexOf(prefix, idx)) !== -1) {
    openings.push({ idx, len: prefix.length, prefix });
    idx += prefix.length;
  }
}
openings.sort((a, b) => b.idx - a.idx);

for (const { idx, len, prefix } of openings) {
  const openTagEnd = html.indexOf('>', idx + len) + 1;
  const closeStart = findClose(openTagEnd);
  if (closeStart === -1) throw new Error('не нашли закрывающий </article>');

  const inner = html.slice(openTagEnd, closeStart);

  // внутри должен быть spot; отступы сохраняем
  if (!inner.includes('class="spot absolute inset-0 z-20"')) continue;

  // 1. заменяем открывающий тег
  const newOpen = prefix
    .replace('<article class="reveal card-spot group relative overflow-hidden rounded-3xl border border-cream/[0.07] bg-cream/[0.02]', '<article class="reveal bezel card-spot group relative overflow-hidden')
    + '>';

  // 2. оборачиваем всё после spot в bezel-core
  const spotTag = '<div class="spot absolute inset-0 z-20"></div>';
  const spotIdx = inner.indexOf(spotTag);
  const afterSpot = inner.slice(spotIdx + spotTag.length);
  const beforeSpot = inner.slice(0, spotIdx);

  const wrapped =
    beforeSpot +
    spotTag +
    '\n        <div class="bezel-core overflow-hidden">' +
    afterSpot +
    '</div>\n      ';

  html = html.slice(0, idx) + newOpen + wrapped + html.slice(closeStart);
  converted++;
}

writeFileSync(file, html, 'utf8');
console.log(`обёрнуто карточек: ${converted}`);