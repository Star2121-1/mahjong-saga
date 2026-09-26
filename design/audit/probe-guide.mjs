/* 新手教学完整通关测试 —— **唯一不允许用 _completeGuide() 走捷径的探针**。

   R323 之前，这个游戏新档进去是**完全玩不了**的，而所有既有门禁全绿：
   verify.mjs 只检查 window.Balance / fxManager 之类是否存在，不检查「能不能玩」；
   probe-playthrough.mjs 当时也用 _completeGuide() 直接跳过了教学。

   死锁根因（结构矛盾，不是笔误）：
     - _showGuide() 调 _freezeClock() 且不启动循环（running = false）
     - 引导第 2/4 步的门控 _guideHits / _guideGemsPicked
       **只在 GameEngine.Loop.js:459 / :452 自增**
   引导在等一个「只有游戏循环才产生的状态」，而它自己关掉了游戏循环。
   实测卡死态：冻结=true running=false 敌人=0 elapsed=0。
   移动那步能过（按键处理不依赖循环），之后永久卡住，「下一步」按钮被硬禁用。

   用法：node design/audit/probe-guide.mjs
*//* 模拟真实玩家把新手教学走完 —— 不用任何 _completeGuide 捷径。
   R323 之前这个测试根本过不去：卡死在第 2 步。 */
import { chromium } from '../../node_modules/playwright/index.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const errs = []; p.on('pageerror', e => errs.push('PE ' + e.message.slice(0,120)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0,120)); });

await p.goto('http://127.0.0.1:8765/pages/s1_save_select.html'); await p.waitForTimeout(400);
await p.click('#btn-newgame'); await p.waitForTimeout(1200);
if (p.url().includes('s2')) { await p.click('#btn-hub-start'); await p.waitForTimeout(3500); }

const st = () => p.evaluate(() => { const g = window.gameEngine;
  return { step: g._currentGuideStep, running: g.running,
           frozen: (document.getElementById('game-container')||{}).classList.contains('game-clock-frozen'),
           enemies: g.enemies.filter(e=>e.alive).length, hits: g._guideHits, gems: g._guideGemsPicked,
           active: !!document.querySelector('#guide-overlay.active') }; });
const log = async (t) => { const s = await st(); console.log(`  ${t.padEnd(26)} 步=${s.step} running=${s.running?'✔':'✘'} 冻结=${s.frozen?'是':'否'} 敌=${s.enemies} 命中=${s.hits} 拾取=${s.gems} 面板=${s.active?'开':'关'}`); return s; };

await log('刚进战斗页');
await p.waitForTimeout(2600); await log('第0步 autoAdvance 后');

// 第 1 步：四方向移动
for (const k of ['KeyW','KeyA','KeyS','KeyD']) { await p.keyboard.down(k); await p.waitForTimeout(420); await p.keyboard.up(k); await p.waitForTimeout(120); }
await p.waitForTimeout(900); await log('按完 WASD');

// 第 2 步（攻击）：等敌人出现后点击
for (let i = 0; i < 30; i++) {
  const s = await st(); if (s.step >= 3) break;
  const has = await p.locator('.enemy').count();
  if (has) { await p.locator('.enemy').first().click({ force: true }).catch(()=>{}); }
  await p.waitForTimeout(500);
}
await log('点击敌人后');

// 第 3/4 步（升级/拾取）：继续打 + 走动吸宝石
for (let i = 0; i < 50; i++) {
  const s = await st(); if (s.step >= 5) break;
  const has = await p.locator('.enemy').count();
  if (has) await p.locator('.enemy').first().click({ force: true }).catch(()=>{});
  for (const k of ['KeyA','KeyD']) { await p.keyboard.down(k); await p.waitForTimeout(180); await p.keyboard.up(k); }
  await p.waitForTimeout(300);
}
await log('战斗+走位后');

// 最后一步不 autoAdvance（守卫 stepIndex < steps.length-1），设计上要玩家点「完成出征 ✓」
for (let i = 0; i < 30; i++) { const s = await st(); if (!s.active) break; await p.waitForTimeout(500); }
if ((await st()).active) {
  const btn = await p.evaluate(() => { const n = document.getElementById('guide-next-btn');
    return n ? { 文字: n.textContent.trim(), 禁用: n.disabled, 可见: n.offsetParent !== null } : null; });
  console.log('  最后一步按钮:', JSON.stringify(btn));
  if (btn && !btn.禁用) { await p.click('#guide-next-btn').catch(()=>{}); await p.waitForTimeout(1500); }
}
await p.waitForTimeout(1200);
const fin = await log('最终');
console.log(`\n  教学结束? ${fin.active ? '✘ 仍开着' : '✔ 已关闭'}`);
console.log(`  循环运行中? ${fin.running ? '✔ 是（可以正常游戏）' : '✘ 否'}`);
console.log('  错误:', errs.length, errs.slice(0,3).join(' | '));
await b.close();
process.exit(fin.active || !fin.running || errs.length ? 1 : 0);
