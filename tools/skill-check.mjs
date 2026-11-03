// Прогон чек-листа скилла high-end-visual-design по факту, а не по памяти.
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const input = readFileSync('assets/css/input.css', 'utf8');
const css = readFileSync('assets/css/main.css', 'utf8');
// Всегда глобальный поиск, иначе match() вернёт только первое совпадение
const count = (s, re) => (s.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')) || []).length;
const mark = (ok) => (ok ? 'OK  ' : 'НЕТ ');

const rows = [];

// §2 Запрещённые шрифты
const banned = ['Inter', 'Roboto', 'Arial', 'Open Sans', 'Helvetica'];
const fontHits = banned.filter((f) => new RegExp(`"${f}"|'${f}'`, 'i').test(input + html));
rows.push([mark(fontHits.length === 0), '§2 запрещённые шрифты', fontHits.join(', ') || 'чисто']);

// §2 Запрещённые тени
const mdShadows = count(html, /shadow-(md|lg|xl|2xl)\b/);
const hardShadow = count(html, /rgba\(0,\s*0,\s*0,\s*0?\.3\)/);
rows.push([mark(mdShadows === 0 && hardShadow === 0), '§2 запрещённые тени', `shadow-md+ : ${mdShadows}, rgba(.3): ${hardShadow}`]);

// §2 Запрещённые иконки (внешние библиотеки)
const iconLibs = count(html, /lucide|fontawesome|material-icons|heroicons|feather/i);
rows.push([mark(iconLibs === 0), '§2 запрещённые иконки', `внешних наборов: ${iconLibs}`]);

// §2 Запрещённые переходы
const linearCss = count(css, /transition[^;}]*linear/);
const eioHtml = count(html, /ease-in-out/);
rows.push([mark(eioHtml === 0), '§2 ease-in-out в разметке', `${eioHtml}`]);

// §2 Навбар не edge-to-edge
const navPill = /rounded-full border border-cream/.test(html);
rows.push([mark(navPill), '§2 навбар-пилюля (не впритык к краю)', navPill ? 'да' : 'нет']);

// §3 Мобильный фолбэк использует min-h-[100dvh], не h-screen
const hScreen = count(html, /h-screen/);
const dvh = count(html, /100svh|100dvh/);
rows.push([mark(hScreen === 0 && dvh > 0), '§3 min-h 100dvh вместо h-screen', `h-screen: ${hScreen}, dvh/svh: ${dvh}`]);

// §4 Double-Bezel на всех крупных карточках
const flatCards = count(html, /<article[^>]*rounded-3xl border border-cream/);
const bezelCards = count(html, /<article[^>]*class="[^"]*bezel/);
rows.push([mark(flatCards === 0), '§4 Double-Bezel на всех карточках', `с обоймой: ${bezelCards}, плоских: ${flatCards}`]);

// §4 Кнопка-в-кнопке
const btnInBtn = count(html, /rounded-full bg-noir\/1[02]/);
rows.push([mark(btnInBtn > 0), '§4 иконка в кружке внутри CTA', `${btnInBtn}`]);

// §4 Отступы секций >= py-24
const smallPad = count(html, /py-(1[0-9]|2[0-3])\b/);
rows.push([mark(count(html, /py-24/) > 0), '§4 секции от py-24', `py-24: ${count(html, /py-24/)}`]);

// §5 Кастомные кривые
const expo = count(input, /cubic-bezier/);
rows.push([mark(expo >= 2), '§5 кастомные cubic-bezier', `${expo} объявлений`]);

// §5 Физика нажатия (CSS или утилиты в разметке)
const activeScale = count(html, /active:scale/) + count(input, /:active[\s\S]{0,80}scale/);
rows.push([mark(activeScale > 0), '§5 active:scale (нажатие)', `${activeScale}`]);

// §5 Гамбургер морфится в X (ищем поворот на 45° в CSS или классы в разметке)
const burgerMorph = /rotate\(45deg\)/.test(input) && /rotate\(-45deg\)/.test(input);
const burgerMorphUtil = /rotate-45/.test(html) && /-rotate-45/.test(html);
rows.push([mark(burgerMorph || burgerMorphUtil), '§5 гамбургер → крестик', burgerMorph ? 'морф в CSS' : burgerMorphUtil ? 'утилиты' : 'нет морфа']);

// §5 Меню — полноэкранный слой
const mobileMenuTag = html.match(/<div id="mobileMenu"[^>]*>/)?.[0] ?? '';
const overlay = /fixed/.test(mobileMenuTag) && /inset-0/.test(mobileMenuTag);
rows.push([mark(overlay), '§5 меню как полноэкранный оверлей', overlay ? 'fixed inset-0' : 'выпадашка под навбаром']);

// §5 Ступенчатое появление ссылок меню
const stagger = count(html, /--i:\s*\d/) > 0 && /\.menu-link/.test(input) && /calc\(var\(--i/.test(input);
rows.push([mark(stagger), '§5 stagger-задержки в меню', stagger ? '--i + calc()' : 'нет']);

// §5 Появление с расфокусом
const blurReveal = /filter:\s*blur\(\d+px\)/.test(input) && /\.reveal\.is-in[\s\S]{0,120}filter:\s*blur\(0\)/.test(input);
rows.push([mark(blurReveal), '§5 reveal с blur → 0', blurReveal ? 'да' : 'только opacity+translate']);

// §6 Blur только на fixed/sticky
const blurs = (html.match(/[^\n]*backdrop-blur[^\n]*/g) || []).filter((l) => !/nav|mobileMenu/.test(l));
rows.push([mark(blurs.length === 0), '§6 backdrop-blur только на fixed', `лишних: ${blurs.length}`]);

// §6 Анимация transform/opacity
const layoutAnim = count(input, /transition:[^}]*\b(top|left|width|height)\b/);
rows.push([mark(layoutAnim === 0), '§6 анимируются только transform/opacity', `нарушений: ${layoutAnim}`]);

// §6 Зерно на неподвижном слое
const grain = /grain::after/.test(input);
rows.push([mark(grain), '§6 зерно плёнки', grain ? 'да' : 'нет']);

const width = Math.max(...rows.map((r) => r[1].length));
console.log('ЧЕК-ЛИСТ high-end-visual-design\n');
for (const [status, name, detail] of rows) {
  console.log(`  ${status} ${name.padEnd(width)}  ${detail}`);
}
const missed = rows.filter((r) => r[0] !== 'OK  ');
console.log(`\nвыполнено ${rows.length - missed.length} из ${rows.length}`);