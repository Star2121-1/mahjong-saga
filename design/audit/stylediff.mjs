/* 样式层叠定位器 —— 「规则看起来在，但没生效」这类问题的专用工具。
   症状：CSS 里明明写了，某处却不生效，且没有任何报错。
   原因：同优先级规则被后面的覆盖了（拆分/调整加载顺序时最常见）。
   做法：同一浏览器会话内分别用两套 CSS 各取一次全量计算样式再对比，
   直接列出「哪个元素的哪个属性、由谁改成谁」——比读 900 行 CSS 快得多。
   实测靠它抓到：切分 theme-mokudan.css 时把某节的注释开头行切给了上一个文件，
   CSS 解析器把 "21. s2 … */ #hub-right-canvas" 整段当成选择器前缀，
   于是 right:400px 挂在不存在的元素上，右栏让位失效（画面差 400px）。
   用法：node design/audit/stylediff.mjs  （需同时存在旧版与新版 CSS） */
/* 找出「单文件 vs 6 模块」之间到底哪些计算样式变了 —— 层叠顺序问题的定位工具。
   同一浏览器会话内切换，避免其它变量。 */
import { chromium } from '../../node_modules/playwright/index.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await p.goto('http://localhost:8765/pages/s1_save_select.html'); await p.waitForTimeout(400);
await p.click('#btn-newgame'); await p.waitForTimeout(1200);
if (p.url().includes('s2')) { await p.click('#btn-hub-start'); await p.waitForTimeout(3000); }
for (let i=0;i<12;i++){ if(!await p.locator('#guide-overlay.active').count()) break;
  await p.evaluate(()=>{const g=window.gameEngine; if(g){g._guideDismissed=true;g._completeGuide();}}); await p.waitForTimeout(700); }
await p.waitForSelector('#hand-tile-grid .hand-tile-slot',{timeout:20000});
await p.evaluate(() => {
  const g = window.gameEngine;
  ['wan3','wan8','tong5','tong9','tiao2','tiao7','tiao1',
   'feng_dong','feng_xi','feng_nan','feng_bei',
   'jian_zhong','jian_fa','joker'].forEach(id => g._addTileToHand(id, id === 'joker'));
});
await p.waitForTimeout(1500);

const snap = () => p.evaluate(() => {
  const props = ['backgroundColor','color','borderRadius','boxShadow','border','padding','margin',
                 'fontSize','fontFamily','textShadow','opacity','transform','boxSizing','width','height','display','flexDirection','gap','alignItems','justifyContent','overflow','borderLeft','borderTop','letterSpacing','lineHeight','minHeight','textAlign','whiteSpace','overflowY'];
  const out = {};
  for (const el of document.querySelectorAll('#hand-tile-grid *, #hand-tile-bar *')) {
    const cs = getComputedStyle(el);
    const rec = {};
    for (const k of props) rec[k] = cs[k];
    const key = el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '')
      + '>' + (el.parentElement ? (el.parentElement.id ? '#' + el.parentElement.id : el.parentElement.tagName) : '');
    out[key] = rec;
  }
  return out;
});

const withModules = await snap();
await p.evaluate(() => {
  for (const l of document.querySelectorAll('link[href*="/css/theme/"]')) l.remove();
  const a = document.createElement('link');
  a.rel = 'stylesheet'; a.href = '/css/theme-mokudan.css?probe=1';
  document.head.appendChild(a);
});
await p.waitForTimeout(1200);
const withSingle = await snap();

const diffs = [];
for (const k of Object.keys(withSingle)) {
  const a = withSingle[k], c = withModules[k];
  if (!c) continue;
  for (const prop of Object.keys(a)) if (a[prop] !== c[prop]) diffs.push({ el: k, prop, 单文件: a[prop], 六模块: c[prop] });
}
console.log('样式差异条数:', diffs.length);
const seen = new Set();
for (const d of diffs.slice(0, 400)) {
  const sig = d.el.split('>')[0] + '|' + d.prop;
  if (seen.has(sig)) continue;
  seen.add(sig);
  console.log(' ', d.el.slice(0, 70), '|', d.prop, '\n     单:', String(d.单文件).slice(0, 70), '\n     模:', String(d.六模块).slice(0, 70));
  if (seen.size >= 12) break;
}
await b.close();
