/* s2 三栏布局取证：左轨 / 中栏 / 右栏「出征准备」的实际盒子与内容。
   「无 console 错误」证明不了布局对 —— 右栏可能宽度 0 或里面是空的。
   用法：node design/audit/probe-s2.mjs  → 截图 /tmp/opencode/s2.png */
import { chromium } from '../../node_modules/playwright/index.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
p.on('pageerror', e => errs.push('PE ' + e.message.slice(0, 140)));
await p.goto('http://localhost:8765/pages/s2_main_hub.html');
await p.waitForTimeout(2000);

const r = await p.evaluate(() => {
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) }; };
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect();
    const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
  const rail = document.getElementById('hub-expedition-rail');
  const canvas = document.getElementById('hub-right-canvas');
  const nav = document.getElementById('hub-top-nav');
  return {
    左轨: box(nav), 中栏: box(canvas), 右栏: box(rail),
    右栏可见: vis(rail),
    重叠: canvas && rail ? Math.round(canvas.getBoundingClientRect().right - rail.getBoundingClientRect().left) : null,
    导航项: document.querySelectorAll('#hub-top-nav .nav-item').length,
    当前面板: window.HubTabController && HubTabController._currentPanel,
    中栏激活面板: (document.querySelector('#hub-right-canvas .hub-panel.active') || {}).id,
    面板显隐: [...document.querySelectorAll('#hub-right-canvas .hub-panel')]
      .map(e => e.id + '=' + (getComputedStyle(e).display) + '/' + Math.round(e.getBoundingClientRect().width)),
    tavern内联: (document.getElementById('panel-tavern') || {}).style
      ? document.getElementById('panel-tavern').getAttribute('style') : 'n/a',
    tavern类: (document.getElementById('panel-tavern') || {}).className,
    可见子元素: [...document.querySelectorAll('#panel-tavern *')]
      .filter(e => e.getBoundingClientRect().height > 0).length,
    /* 右栏内容是否真的填上了（不是空壳） */
    出征摘要: (document.getElementById('hero-name-display') || {}).textContent,
    英雄状态: (document.getElementById('hero-status-display') || {}).textContent,
    关卡卡: document.querySelectorAll('#level-cards > *').length,
    关卡卡名: [...document.querySelectorAll('#level-cards .level-card-name')].map(e => e.textContent.trim()),
    关卡详情: (document.getElementById('level-detail-panel') || {}).textContent,
    关卡卡可见: [...document.querySelectorAll('#level-cards > *')].filter(vis).length,
    出征按钮: (document.getElementById('btn-hub-start') || {}).textContent,
    出征按钮可见: vis(document.getElementById('btn-hub-start')),
    词条预览: document.querySelectorAll('#expedition-talent-previews > *, #expedition-hero-previews > *').length,
    右栏溢出: rail ? rail.scrollHeight > rail.clientHeight : null,
  };
});
/* 程序化关卡必须走自己的分支（动态层数/难度）且不与普通卡重复。
   R321 之前两处都是坏的：cfg.isProcedural 缺失导致永远进不了程序化分支，
   buildLevelCards 又把它渲染两遍。 */
const proc = [];
for (const nm of ['程序裂隙 · 深渊 Lv.1', '烈焰深渊']) {
  const ok = await p.evaluate((name) => {
    const c = [...document.querySelectorAll('#level-cards .level-card')]
      .find(x => x.querySelector('.level-card-name').textContent.trim() === name);
    if (!c) return false; c.click(); return true;
  }, nm);
  await p.waitForTimeout(450);
  const d = await p.evaluate(() => document.getElementById('level-detail-panel').textContent);
  proc.push({ 关卡: nm, 点得到: ok, 详情: d.slice(0, 60) });
}
r.程序化关卡 = proc;
await p.evaluate(() => { const c = document.querySelector('#level-cards .level-card'); if (c) c.click(); });
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/opencode/s2.png' });

/* 端到端：出征必须还能进 s3 且引擎活着。
   搬了面板 + 换了默认面板之后，出征按钮的绑定是最容易被弄坏的东西，
   而它不会报错 —— 只会「点了没反应」。 */
await p.click('#btn-hub-start');
await p.waitForTimeout(3500);
const e2e = await p.evaluate(() => ({
  url: location.pathname,
  engine: typeof window.gameEngine,
  hand: !!document.getElementById('hand-tile-grid'),
}));
r.出征进图 = e2e;
console.log(JSON.stringify(r, null, 1));
console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
await b.close();
const dup = r.关卡卡名 && new Set(r.关卡卡名).size !== r.关卡卡名.length;
const bad = !r.右栏可见 || r.右栏.w < 300 || r.重叠 > 0 || !r.关卡卡 || !r.出征按钮可见 || dup
  || errs.length || !e2e.url.includes('s3_gameplay') || e2e.engine !== 'object' || !e2e.hand;
process.exit(bad ? 1 : 0);
