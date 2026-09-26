/* 手牌 artwork 取证：确认 42 张公版牌面真的加载并显示。
   必须走真实进图流程 —— 无存档直接开 s3 会被重定向回 s1（见 verify.mjs 注释）。
   用法：node design/audit/probe-art.mjs   → 截图 /tmp/opencode/hand-art.png */
import { chromium } from '../../node_modules/playwright/index.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
p.on('requestfailed', r => errs.push('FAILED ' + r.url().split('/').pop()));

await p.goto('http://localhost:8765/pages/s1_save_select.html');
await p.waitForTimeout(500);
await p.click('#btn-newgame');
await p.waitForTimeout(1200);
if (p.url().includes('s2')) { await p.click('#btn-hub-start'); await p.waitForTimeout(3000); }
if (!p.url().includes('s3_gameplay')) { console.log('✘ 进不了 s3：' + p.url()); process.exit(1); }
/* 新档会弹新手指引，且是「动作门控」的（#guide-next-btn 初始 disabled，
   要玩家先真的走一步/打一下才放行），因此测试环境直接调 _completeGuide() 跳过。
   两个坑（都踩过）：
     1. Boot.js:341 主动隐藏了旧的 #guide-confirm-btn（'hide old button, use new nav'），
        点它必然 timeout —— 教程早已改成分步导航；
     2. _completeGuide() 内部是 setTimeout 才 _unfreezeClock()，且 Boot 可能重跑
        再次 _showGuideStep(0) 把 overlay 点亮 → 必须循环到 .active 真正消失。 */
for (let i = 0; i < 12; i++) {
  if (!(await p.locator('#guide-overlay.active').count())) break;
  await p.evaluate(() => {
    const g = window.gameEngine;
    if (g) { g._guideDismissed = true; g._completeGuide(); }
  });
  await p.waitForTimeout(700);
}
if (await p.locator('#guide-overlay.active').count()) {
  console.log('✘ 指引关不掉'); process.exit(1);
}
/* 天命手牌不是开局发牌（Spawn.js:434 _addHandTile，升级三选一时才进手），
   所以要走真实获得路径把牌喂满，顺便覆盖全部花色/字牌/癞子。 */
/* 花牌按设计不进手牌（Spawn.js:432 isFlower → _triggerFlowerEvent 直接 return），
   所以手牌只喂 13 张公版图 + 1 张癞子，正好覆盖万/筒/条/风/箭/癞子。 */
const FEED = ['wan3','wan8','tong5','tong9','tiao2','tiao7','tiao1',
              'feng_dong','feng_xi','feng_nan','feng_bei',
              'jian_zhong','jian_fa','joker'];
await p.evaluate((ids) => {
  const g = window.gameEngine;
  ids.forEach(id => g._addTileToHand(id, id === 'joker'));
}, FEED);
await p.waitForSelector('#hand-tile-grid .hand-tile-slot.occupied', { timeout: 15000 });
await p.waitForTimeout(1800);   /* 等 42 个 SVG 全部解码 */

const r = await p.evaluate(() => {
  const s = [...document.querySelectorAll('#hand-tile-grid .hand-tile-slot.occupied')];
  const imgs = s.map(x => x.querySelector('img.tk-art'));
  const bb = imgs[0] && imgs[0].getBoundingClientRect();
  return {
    tiles: s.length,
    imgs: imgs.filter(Boolean).length,
    decoded: imgs.filter(i => i && i.complete && i.naturalWidth > 0).length,
    broken: imgs.filter(i => i && i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src').split('/').pop()),
    sample: imgs[0] ? { nw: imgs[0].naturalWidth, nh: imgs[0].naturalHeight, w: +bb.width.toFixed(1), h: +bb.height.toFixed(1) } : null,
    ids: s.map(x => x.dataset.id).join(' '),
    handLen: (window.gameEngine._handTiles || []).length,
    frozen: document.getElementById('game-container').className,
  };
});
await p.locator('#hand-tile-grid').screenshot({ path: '/tmp/opencode/hand-art.png' });
console.log(JSON.stringify(r, null, 1));
console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
await b.close();
process.exit(r.broken.length || errs.length || !r.decoded ? 1 : 0);
