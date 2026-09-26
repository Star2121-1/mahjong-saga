/* HUD 布局探针：检测**可见文字互相压字** + 关键 HUD 区块互相重叠。
   用法：node design/audit/probe-hud.mjs  → 截图 /tmp/opencode/hud.png

   为什么需要：HUD 重叠不会报错、不会被 getElementById 断言发现，
   数值探针全绿而画面上一团糊 —— R323 靠肉眼看截图才发现两处：
     1) 怒气条被手牌条完全压住（只剩光晕透出来，像渲染漏光）
     2) 武器栏压在暂停按钮上，83px 重叠、文字互压
   两条都是 R317 主题层改定位时埋的。

   判定口径（避免误报）：
     - 只比「有文字的叶子节点」，容器互相包含不算
     - 同一父容器内的兄弟不算（正常并排）
     - 祖先/后代关系不算
     - 交叠面积必须 > 4×4 px
*/
import { chromium } from '../../node_modules/playwright/index.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const errs = [];
p.on('pageerror', e => errs.push('PE ' + e.message.slice(0, 120)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 120)); });

await p.goto('http://127.0.0.1:8765/pages/s1_save_select.html'); await p.waitForTimeout(400);
await p.click('#btn-newgame'); await p.waitForTimeout(1200);
if (p.url().includes('s2')) { await p.click('#btn-hub-start'); await p.waitForTimeout(3200); }
for (let i = 0; i < 12; i++) {
  if (!(await p.locator('#guide-overlay.active').count())) break;
  await p.evaluate(() => { const g = window.gameEngine; if (g) { g._guideDismissed = true; g._completeGuide(); } });
  await p.waitForTimeout(600);
}
await p.waitForSelector('.enemy', { timeout: 20000 });
/* 造出有内容的 HUD：怒气 + 武器 + 冷却文字 */
await p.evaluate(() => { const g = window.gameEngine; if (g.player) g.player.rage = 72; });
await p.waitForTimeout(700);

const r = await p.evaluate(() => {
  const leaves = [];
  document.querySelectorAll('body *').forEach(e => {
    if (e.children.length) return;
    const t = (e.textContent || '').trim(); if (!t) return;
    const b = e.getBoundingClientRect(); if (!b.width || !b.height) return;
    const cs = getComputedStyle(e);
    if (cs.opacity === '0' || cs.visibility === 'hidden' || cs.display === 'none') return;
    leaves.push({ el: e.tagName + (e.id ? '#' + e.id : '') +
      (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : ''),
      t: t.slice(0, 14), r: b, anc: e.parentElement });
  });
  const ov = [];
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const A = leaves[i], B = leaves[j];
    if (A.anc === B.anc) continue;
    if (A.anc.contains(B.anc) || B.anc.contains(A.anc)) continue;
    const ix = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
    const iy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
    if (ix > 4 && iy > 4) ov.push(`${A.t}[${A.el}] ✕ ${B.t}[${B.el}] ${Math.round(ix)}x${Math.round(iy)}px`);
  }
  /* 关键 HUD 区块两两重叠 */
  const KEY = ['rage-bar-container', 'weapon-slot-bar', 'hand-tile-bar', 'pause-btn', 'joystick-container', 'time-display'];
  const boxes = KEY.map(id => { const e = document.getElementById(id); if (!e) return null;
    const b = e.getBoundingClientRect(); return { id, b }; }).filter(Boolean);
  const clash = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i].b, c = boxes[j].b;
    const ix = Math.min(a.right, c.right) - Math.max(a.left, c.left);
    const iy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
    /* time-display 是撑满的 block，它与谁「重叠」不代表视觉冲突，跳过 */
    if (boxes[i].id === 'time-display' || boxes[j].id === 'time-display') continue;
    if (ix > 2 && iy > 2) clash.push(`#${boxes[i].id} ✕ #${boxes[j].id} ${Math.round(ix)}x${Math.round(iy)}px`);
  }
  const box = id => { const e = document.getElementById(id); if (!e) return null;
    const b = e.getBoundingClientRect();
    return `x${Math.round(b.x)} y${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)}`; };
  return { 文字重叠: ov, 区块重叠: clash,
    布局: Object.fromEntries(KEY.map(id => [id, box(id)])) };
});
await p.screenshot({ path: '/tmp/opencode/hud.png' });
console.log(JSON.stringify(r, null, 1));
console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
await b.close();
const bad = r.文字重叠.length + r.区块重叠.length + errs.length;
console.log(bad ? `\n✘ ${bad} 项问题` : '\n✔ HUD 无压字、无区块重叠');
process.exit(bad ? 1 : 0);
