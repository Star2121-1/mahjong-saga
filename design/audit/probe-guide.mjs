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
           active: !!document.querySelector('#guide-overlay.active'),
           突变面板: !!document.querySelector('#mutator-overlay.active') }; });

/* R323-P0 修复后「生成计数器」会自增了，于是**突变面板可能在教学期间弹出**
   （此前 mutatorTriggered 恒为 false，5 个突变全是死内容，从未在正常游玩出现过）。
   面板会 _freezeClock() 停住游戏循环 —— 探针不处理就表现为「教学卡住」的 flake。 */
const dismissMutator = async () => {
  if (!(await p.locator('#mutator-overlay.active').count())) return false;
  const o = p.locator('#mutator-overlay .mutator-option, #mutator-overlay [data-mutator], #mutator-overlay button').first();
  if (await o.count()) await o.click({ force: true }).catch(() => {});
  await p.waitForTimeout(400);
  return true;
};

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
const dl3 = Date.now() + 20000;
while (Date.now() < dl3) {
  if (await dismissMutator()) continue;
  const s = await st(); if (!s.active) break;
  await p.waitForTimeout(500);
}
if ((await st()).active) {
  const btn = await p.evaluate(() => { const n = document.getElementById('guide-next-btn');
    return n ? { 文字: n.textContent.trim(), 禁用: n.disabled, 可见: n.offsetParent !== null } : null; });
  console.log('  最后一步按钮:', JSON.stringify(btn));
  /* R324-P0：按钮在面板冻结期间是禁用的。原来只检查一次，撞上就放弃 →
     误报「教学结束? ✘ 仍开着」。改成轮询等解禁（最长 12 秒），
     期间顺手关掉可能压着的突变面板。解禁就点。 */
  let waited = 0;
  while (waited < 12000) {
    if (await p.locator('#mutator-overlay.active').count()) {
      const mo = p.locator('#mutator-overlay .mutator-option, #mutator-overlay [data-mutator], #mutator-overlay button').first();
      if (await mo.count()) await mo.click({ force: true }).catch(() => {});
      await p.waitForTimeout(400); waited += 400; continue;
    }
    const b2 = await p.evaluate(() => { const b = document.getElementById('guide-next-btn');
      return b ? { 禁用: b.disabled, 文字: b.textContent } : null; });
    if (!b2) break;
    if (!b2.禁用) { await p.click('#guide-next-btn').catch(()=>{}); await p.waitForTimeout(1500); break; }
    await p.waitForTimeout(500); waited += 500;
  }
}
/* R324-P0：教程是 5 步、靠玩家动作推进的流程，最后一步还是 autoAdvance(3s)。
   固定等 1200ms 就断言「教学结束?」偶尔会太早 → 误报「仍开着」。
   改成轮询等它关闭（最长 15 秒），期间继续处理突变面板。 */
let closed = false;
for (let w = 0; w < 30; w++) {
  if (await p.locator('#mutator-overlay.active').count()) {
    const mo = p.locator('#mutator-overlay .mutator-option, #mutator-overlay [data-mutator], #mutator-overlay button').first();
    if (await mo.count()) await mo.click({ force: true }).catch(() => {});
    await p.waitForTimeout(400); continue;
  }
  if (!(await p.locator('#guide-overlay.active').count())) { closed = true; break; }
  /* 还在引导里就把最后一步的按钮点掉 */
  const nb = await p.evaluate(() => { const b = document.getElementById('guide-next-btn');
    return b && !b.disabled; });
  if (nb) { await p.click('#guide-next-btn').catch(() => {}); await p.waitForTimeout(700); }
  else await p.waitForTimeout(500);
}
const fin = await log('最终');
console.log(`\n  教学结束? ${fin.active ? '✘ 仍开着' : '✔ 已关闭'}`);
/* R324-P0：引导结束后不能断言得太早。
   _completeGuide() 里有一个**故意的 500ms setTimeout**（解冻 + _announceWave(0)），
   而波次公告期间 running 本来就是 false（Loop.js:5 `if (!this.running) return`）。
   我原来在延迟到期前就断言「循环运行中」→ 3 次里挂 1 次的 flake。
   现在改成「轮询等它真的恢复，最长 12 秒，并确认 _elapsed 在推进」：
   真死锁仍然会红，纯粹是时序就放行。 */
let loopResumed = false, waitedMs = 0;
while (waitedMs < 12000) {
  /* 引导结束后若还压着突变面板，游戏 running=false 冻住是**正确行为**（等玩家选）。
     机器人得替玩家做这个选择，否则会误报成死锁。 */
  if (await p.locator('#mutator-overlay.active').count()) {
    const mo = p.locator('#mutator-overlay .mutator-option, #mutator-overlay [data-mutator], #mutator-overlay button').first();
    if (await mo.count()) await mo.click({ force: true }).catch(() => {});
    await p.waitForTimeout(400);
  }
  const s2 = await p.evaluate(() => ({ running: gameEngine.running, gameOver: gameEngine.gameOver }));
  if (s2.running && !s2.gameOver) { loopResumed = true; break; }
  if (s2.gameOver) break;
  await p.waitForTimeout(500); waitedMs += 500;
}
const eA = await p.evaluate(() => gameEngine._elapsed);
await p.waitForTimeout(900);
const eB = await p.evaluate(() => gameEngine._elapsed);
console.log(`  循环运行中? ${loopResumed ? '✔ 是' : '✘ 否'} (等待 ${waitedMs}ms)` +
  ` | 时间在推进? ${eB > eA ? '✔ +' + (eB - eA).toFixed(2) + 's' : '✘ 停在 ' + eA.toFixed(2) + 's'}`);
/* 失败时把现场状态打出来 —— 这个死锁只在「真的玩过教程」后出现，
   跳过教程（_completeGuide 立刻调用）6/6 都正常，不打印状态根本无从查起。 */
if (!loopResumed || eB <= eA) {
  const stuck = await p.evaluate(() => { const g = window.gameEngine; return {
    running: g.running, 公告中: g._announcingWave, 暂停: g._paused, 待奖励: g._pendingReward,
    升级挂起: g._levelUpPending, 卡牌: g._discardMode, 胡锁: g._huLock, 赌局: g._gambleActive,
    波次: g._waveCount, 面板活敌: g.enemies.filter(e => e.alive).length,
    容器类: (document.getElementById('game-container') || {}).className,
    激活遮罩: [...document.querySelectorAll('.active')].map(e => e.id).filter(Boolean),
    悬着计时器: { 完整引导: !!g._completeGuideTimer, 步骤: !!g._guideStepTimeout,
                   检查: !!g._guideCheckTimer, 自动推进: !!g._guideAutoAdvanceTimer },
    引导步: g._currentGuideStep, 引导已关: !!g._guideDismissed }; });
  console.log('  ⛔ 卡死现场: ' + JSON.stringify(stuck));
}
console.log('  错误:', errs.length, errs.slice(0,3).join(' | '));
await b.close();
/* R324-P0：退出码原来用 `fin`（"最终" 那次的快照），而那次快照常常正好撞上
   升级面板冻结时钟（running=false），于是三条更严谨的断言全过却被判失败。
   改用等待之后的真实结论。 */
process.exit(fin.active || !loopResumed || eB <= eA || errs.length ? 1 : 0);
