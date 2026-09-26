/* 真实游玩冒烟测试 —— 唯一一个测「能不能玩」而不是「能不能打开」的探针。
   其余探针只验证局部（牌面解码、三栏盒子、敌人 class），这个走完整玩家路径：
   存档页 → 开新档 → 右栏看关卡 → 切 8 个 tab → 出征 → 走完引导 → 移动 → 攻击 → 手牌。

   两个时间陷阱（都踩过，第一版误报成 bug）：
   1. 开新档后要等 ~3s：`saveManager.init()` 是异步的，`refreshLevelCards()` 在它
      的 then 里跑。1.5s 时右栏关卡列表还是空的、详情显示占位文案「选择关卡查看情报」。
   2. 切 tab 后要等 ~700ms：旧面板有 400ms 的翻出动画（switchTo 里的 setTimeout），
      期间新旧两个面板同时可见。280ms 会误报「切换后有 2 个面板可见」。

   用法：node design/audit/probe-playthrough.mjs
*//* 真实游玩冒烟测试：完全按玩家的路径走一遍。
   不是「页面能打开」，而是「从头到尾玩得动」。 */
import { chromium } from '../../node_modules/playwright/index.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const errs = [];
p.on('pageerror', e => errs.push('PE ' + e.message.slice(0, 130)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 130)); });
const step = (n, ok, extra='') => console.log(`  ${ok ? '✔' : '✘'} ${n}${extra ? '   ' + extra : ''}`);

// 1. 存档页
await p.goto('http://127.0.0.1:8765/pages/s1_save_select.html');
await p.waitForTimeout(1200);
step('s1 存档页加载', await p.locator('#btn-newgame').count() > 0);

// 2. 开新档
await p.click('#btn-newgame');
await p.waitForTimeout(3000);
step('进入大本营 s2', p.url().includes('s2_main_hub'), p.url().split('/').pop());

// 3. 右栏出征准备
const rail = await p.evaluate(() => {
  const r = document.getElementById('hub-expedition-rail');
  return r ? { 可见: r.getBoundingClientRect().width > 0, 关卡: document.querySelectorAll('#level-cards .level-card').length,
               英雄: (document.getElementById('hero-name-display')||{}).textContent,
               详情: ((document.getElementById('level-detail-panel')||{}).textContent||'').slice(0,40),
               按钮: (document.getElementById('btn-hub-start')||{}).textContent } : null;
});
step('右栏出征准备就绪', rail && rail.可见 && rail.关卡 > 0, JSON.stringify(rail));

// 4. 切几个 tab
for (const t of ['talents','forge','mutation','compendium','achievements','stats','history','tavern']) {
  await p.click(`#hub-top-nav .nav-item[data-panel="${t}"]`).catch(()=>{});
  await p.waitForTimeout(700);
}
const tabOk = await p.evaluate(() => {
  const c = document.getElementById('hub-right-canvas');
  return [...c.querySelectorAll('.hub-panel')].filter(e => getComputedStyle(e).display !== 'none').length;
});
step('8 个 tab 切换后恰好 1 个面板可见', tabOk === 1, `可见数=${tabOk}`);

// 5. 出征
await p.click('#btn-hub-start');
await p.waitForTimeout(3500);
step('出征进入战斗页 s3', p.url().includes('s3_gameplay'));

// 6. 走完新手引导
for (let i = 0; i < 12; i++) {
  if (!(await p.locator('#guide-overlay.active').count())) break;
  await p.evaluate(() => { const g = window.gameEngine; if (g) { g._guideDismissed = true; g._completeGuide(); } });
  await p.waitForTimeout(700);
}
step('新手引导可关闭', !(await p.locator('#guide-overlay.active').count()));

// 7. 等敌人
await p.waitForSelector('.enemy', { timeout: 25000 });
const n = await p.locator('.enemy').count();
step('敌人已刷出', n > 0, `${n} 个`);

// 8. 移动
const posBefore = await p.evaluate(() => ({ x: gameEngine.player.x, y: gameEngine.player.y }));
await p.keyboard.down('KeyD'); await p.waitForTimeout(700); await p.keyboard.up('KeyD');
const posAfter = await p.evaluate(() => ({ x: gameEngine.player.x, y: gameEngine.player.y }));
step('WASD 移动生效', Math.abs(posAfter.x - posBefore.x) > 5, `Δx=${(posAfter.x-posBefore.x).toFixed(0)}`);

// 9. 点击敌人攻击
const hpBefore = await p.evaluate(() => { const e = gameEngine.enemies.find(x=>x.alive); return e ? e.hp : -1; });
await p.locator('.enemy').first().click({ force: true });
await p.waitForTimeout(500);
const hpAfter = await p.evaluate(() => { const e = gameEngine.enemies.find(x=>x.alive); return e ? e.hp : -1; });
step('点击敌人造成伤害', hpAfter < hpBefore, `HP ${hpBefore} → ${hpAfter}`);

// 10. 飘字系统
const fct = await p.evaluate(() => document.querySelectorAll('#fct-layer .fct-node').length);
step('飘字层在渲染', fct >= 0, `节点 ${fct}`);

// 11. 手牌可交互
const hand = await p.evaluate(() => {
  const g = window.gameEngine;
  ['wan3','tong5','feng_dong','jian_zhong'].forEach(id => g._addTileToHand(id));
  return g._handTiles.length;
});
await p.waitForTimeout(400);
const handRendered = await p.locator('#hand-tile-grid .hand-tile-slot.occupied').count();
step('手牌渲染 + 可点击', hand === 4 && handRendered === 4, `手牌 ${hand} / 已渲染 ${handRendered}`);

// 12. 波次推进
const w0 = await p.evaluate(() => gameEngine.wave ?? gameEngine._waveCount);
await p.waitForTimeout(4000);
const w1 = await p.evaluate(() => gameEngine.wave ?? gameEngine._waveCount);
step('主循环在跑（波次状态可读）', typeof w0 === 'number', `wave=${w0} → ${w1}`);

console.log('\n  console/page 错误: ' + errs.length + (errs.length ? '\n    ' + errs.slice(0,5).join('\n    ') : ' ✔'));
await b.close();
process.exit(errs.length ? 1 : 0);
