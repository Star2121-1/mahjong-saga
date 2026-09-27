/* 波次推进门验证：R323-P0 修的是「生成计数器从不自增」，
   这里直接验证**门能不能打开** —— 清掉敌人与掉落，看波次是否推进。
   不需要战斗 AI：直接走引擎自己的击杀路径（enemy.takeDamage）。
   用法：node design/audit/probe-progression.mjs [目标波数] */
import { chromium } from '../../node_modules/playwright/index.mjs';
const TARGET = parseInt(process.argv[2] || '3', 10);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const errs = [];
p.on('pageerror', e => errs.push('PE ' + e.message.slice(0, 140)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 140)); });

await p.goto('http://127.0.0.1:8765/pages/s1_save_select.html'); await p.waitForTimeout(400);
await p.click('#btn-newgame'); await p.waitForTimeout(1200);
if (p.url().includes('s2')) { await p.click('#btn-hub-start'); await p.waitForTimeout(3200); }
for (let i = 0; i < 12; i++) {
  if (!(await p.locator('#guide-overlay.active').count())) break;
  await p.evaluate(() => { const g = window.gameEngine; if (g) { g._guideDismissed = true; g._completeGuide(); } });
  await p.waitForTimeout(600);
}
await p.waitForSelector('.enemy', { timeout: 45000 });

const ok = [];
for (let round = 0; round < 60; round++) {
  const st = await p.evaluate(() => {
    const g = window.gameEngine;
    return { wave: g._waveCount, cap: g._getWaveEnemyMax(), spawned: g.currentWaveSpawnedCount,
      alive: g.enemies.filter(e => e.alive).length, gems: g._expGems.length, coins: g._activeCoins.length,
      mutatorPanel: !!document.querySelector('#mutator-overlay.active'),
      rewardPanel: !!document.querySelector('#reward-overlay.active'),
      pendingReward: g._pendingReward, running: g.running, gameOver: g.gameOver };
  });
  if (st.gameOver) { ok.push(`✘ 第 ${st.wave + 1} 波阵亡`); break; }
  if (st.wave + 1 >= TARGET) { ok.push(`✔ 推进到第 ${st.wave + 1} 波（生成 ${st.spawned}/${st.cap}）`); break; }
  if (st.mutatorPanel) {
    const o = p.locator('#mutator-overlay .mutator-option, #mutator-overlay [data-mutator], #mutator-overlay button').first();
    if (await o.count()) await o.click({ force: true }).catch(() => {});
    await p.waitForTimeout(350); continue;
  }
  if (st.rewardPanel) {
    const o = p.locator('#reward-overlay .relic-btn:not([disabled])').first();
    if (await o.count()) await o.click({ force: true }).catch(() => {});
    await p.waitForTimeout(350); continue;
  }
  if (st.pendingReward && !st.rewardPanel) { await p.waitForTimeout(400); continue; }
  /* 用引擎**真实的**击杀路径清场 —— 直接设 hp=0 不行：
     死亡处理不会跑，尸体仍留在 enemies 数组里，而波次门要求 enemies.length === 0。
     （我第一版就卡在这里，误以为波次还是推不动。）
     掉落物同理，必须走 _updateExpGems / _updateCoins 的拾取判定。 */
  await p.evaluate(() => {
    const g = window.gameEngine;
    g.enemies.slice().forEach(e => { if (e.alive) { try { e.takeDamage(999999, 'probe', e.x, e.y); } catch (err) { e.alive = false; } } });
    /* 把掉落物直接吸到玩家身上，走磁铁判定 */
    g._expGems.slice().forEach(o => { if (o.x !== undefined) { o.x = g.player.x; o.y = g.player.y; } });
    g._activeCoins.slice().forEach(o => { if (o.x !== undefined) { o.x = g.player.x; o.y = g.player.y; } });
  });
  await p.waitForTimeout(700);
}
const fin = await p.evaluate(() => { const g = window.gameEngine;
  return { 波次: g._waveCount + 1, 生成计数: g.currentWaveSpawnedCount, 残敌: g.enemies.filter(e => e.alive).length,
           等级: g.player.currentLvl, 突变: g._activeMutator, 突变触发过: g._mutatorTriggered }; });
console.log('  ' + (ok[0] || '⏱ 未推进'));
console.log('  最终 ' + JSON.stringify(fin));
console.log('  错误 ' + errs.length + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ' ✔'));
await b.close();
process.exit(errs.length || !ok.length || !ok[0].startsWith('✔') ? 1 : 0);
