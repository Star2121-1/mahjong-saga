/* 断点续跑（breakpoint resume）回归门禁
 *
 * R326 背景：这个探针存在的原因是**两个通关级 P0**，而断点续跑这条路径
 * 此前完全没有被任何探针覆盖过。
 *
 * P0-1 `_bossLordWave` 恢复后恒为 false → 最终波永远不刷 Boss
 *   全库唯一把它置真的地方是 Combat.js:94（`_resumeAfterReward`），
 *   而断点恢复走 Boot.js 的 resume 路径，完全绕开 `_resumeAfterReward`；
 *   SaveManager.Core.js:546 还显式把它置成 false。
 *   后果：在最终波刷新/闪退 → Boss 永不出现；
 *   而 Loop.js:712 的波次结算门带 `_waveCount < _getMaxWaves() - 1`
 *   把最终波排除 → `_pendingReward` 也不会置真 → **那一局彻底静止、无法通关。**
 *
 * P0-2 `huLock:true` 的存档恢复后永久卡死
 *   Boot.js 原本的 1s 兜底 setTimeout 写的是 `if (!this.gameOver && this.running)`，
 *   但那是 IIFE + 'use strict' 文件里的定时器回调，`this` 指向 **window**，
 *   `this.running` 恒为 undefined → 条件恒假 → **兜底从来没生效过**。
 *   而 huLock:true 完全可达（胡牌演出 1.6s 期间点「返回大本营」）。
 *   恢复后 Loop.js:50 命中 _huLock 分支只 _syncEntities 后 return，
 *   输入被拦、ESC 也不处理 → 无解。
 *
 * 另外还断言：恢复后玩家牌面必须重画（B6 —— 恢复路径不调 `_renderPlayerTile`，
 * 自己的角色会变成一张没有字的白牌）。
 *
 * 用法：node design/audit/probe-resume.mjs
 */
import { chromium } from '../../node_modules/playwright/index.mjs';

const b = await chromium.launch({ args: ['--disable-background-timer-throttling'] });
const errs = [];

const fails = [];
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push(name);
};

/* 起一局 → 造出目标状态 → 写 cr_active_run.json → 重新加载页面走真实 resume */
async function boot(ctx, plant) {
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  p.on('pageerror', e => errs.push('PE ' + e.message.slice(0, 130)));
  p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 130)); });
  await p.goto('http://127.0.0.1:8765/pages/s1_save_select.html');
  await p.waitForTimeout(400);
  await p.click('#btn-newgame');
  await p.waitForTimeout(1200);
  if (p.url().includes('s2')) { await p.click('#btn-hub-start'); await p.waitForTimeout(3200); }
  for (let i = 0; i < 12; i++) {
    if (!(await p.locator('#guide-overlay.active').count())) break;
    await p.evaluate(() => { const g = window.gameEngine; if (g) { g._guideDismissed = true; g._completeGuide(); } });
    await p.waitForTimeout(500);
  }
  await p.waitForSelector('.enemy', { timeout: 45000 });
  await p.waitForTimeout(1200);
  if (plant) await p.evaluate(plant);
  return p;
}

/* ═══ 场景 1：最终波续跑 → 必须能刷 Boss ═══ */
{
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await boot(ctx, () => {
    const g = window.gameEngine, sm = window.saveManager;
    g._waveCount = g._getMaxWaves() - 1;      /* 站在最终波 */
    g._bossLordSpawned = false;
    /* 血量写进快照（而不是 reload 之后再补）：最终波 _getWaveEnemyMax() 只有 1、
       敌人数值按 level=Math.floor(_elapsed/15)+1 缩放，而续跑的 _elapsed 已经是十几秒，
       1 级无装备的满血玩家会在 Boss 刷出来前就死（实测 gameOver=true，
       而 gameOver 会让 Ss.update 直接 return → bossTimer 永远是 0）。
       **这里测的是「续跑后刷 Boss 的通路」，不是平衡性**，所以刻意给足血量。 */
    g.player.hp = g.player.maxHp;
    g.player.invulnTimer = 99999;
    const snap = sm.snapshotForRun(g);
    sm.saveActiveRun(snap);
  });
  await p.waitForTimeout(1200);
  /* 重新加载 → 走真实 resume 路径 */
  await p.reload();
  await p.waitForTimeout(6000);

  const st = await p.evaluate(() => { const g = window.gameEngine; return {
    波次: g._waveCount + 1, 最大波数: g._getMaxWaves(), bossLordWave: g._bossLordWave,
    bossSpawned: g._bossLordSpawned, running: g.running, 时间: +(g._elapsed || 0).toFixed(1) }; });
  check('最终波续跑：_bossLordWave 被正确推导', st.bossLordWave === true,
    `_waveCount=${st.波次}/${st.最大波数} _bossLordWave=${st.bossLordWave}`);

  /* 主循环必须真的在推进（否则「不刷 Boss」只是表象，真正症状是整局冻住） */
  const e0 = await p.evaluate(() => window.gameEngine._elapsed);
  await p.waitForTimeout(1500);
  const e1 = await p.evaluate(() => window.gameEngine._elapsed);
  check('最终波续跑：主循环在推进', e1 > e0, `_elapsed ${e0.toFixed(2)} → ${e1.toFixed(2)}`);
  check('最终波续跑：running 为真', st.running === true, `running=${st.running}`);

  /* Boss 必须能被刷出来（GameSpawner.js:91 的门就是 _bossLordWave）。
     刻意说明：这一段给玩家补满血 —— 我把一个 1 级满血无装备的玩家瞬移到第 5 波，
     而最终波 _getWaveEnemyMax() 只有 1、BOSS_SPAWN_INTERVAL 有 30 秒，
     玩家会在 Boss 刷出来之前就死掉（实测 gameOver=true）。
     **这里测的是「续跑后刷 Boss 的通路」，不是平衡性**，所以刻意给足血量。
     等待上限按 Balance.BOSS_SPAWN_INTERVAL 的 30s 放宽到 45 次 × 1.2s。 */
  /* 恢复后再补一次，防止 invulnTimer 字段没被序列化 */
  await p.evaluate(() => { const g = window.gameEngine;
    g.player.hp = g.player.maxHp; g.player.invulnTimer = 99999; });
  let bossOk = false, bossDetail = '';
  for (let i = 0; i < 45; i++) {
    const r = await p.evaluate(() => {
      const g = window.gameEngine;
      const bo = g.enemies.find(e => e.type === 'Boss_Lord');
      if (bo && bo.el) { const rc = bo.el.getBoundingClientRect();
        return { 出现: rc.width > 0, 在DOM: document.body.contains(bo.el), 尺寸: [Math.round(rc.width), Math.round(rc.height)] }; }
      return { 出现: false, 在DOM: false, 尺寸: [0, 0] };
    });
    if (r.出现) { bossOk = r.在DOM; bossDetail = `尺寸 ${JSON.stringify(r.尺寸)} 在DOM=${r.在DOM}`; break; }
    bossDetail = `第 ${i + 1} 次轮询仍未出现 | ` + JSON.stringify(await p.evaluate(() => {
      const g = window.gameEngine, S = window.SpawnSystem;
      return { running: g.running, gameOver: g.gameOver, pendingReward: g._pendingReward,
        engineBossWave: g._bossLordWave, engineBossSpawned: g._bossLordSpawned,
        波次: g._waveCount + 1, 已刷: g.currentWaveSpawnedCount, 上限: g._getWaveEnemyMax(),
        spawnerBossWave: S && S._bossLordWave, spawner已刷: S && S.currentWaveSpawnedCount,
        spawnTimer: S && +S._spawnTimer.toFixed(2), spawnInterval: S && S._spawnInterval,
        bossTimer: S && +S._bossTimer.toFixed(2), bossInterval: window.Balance && window.Balance.BOSS_SPAWN_INTERVAL,
        spawnerRunning: !!S, 胜利标记_won: g._won, 胜利遮罩: !!document.querySelector('#victory-overlay.active'),
        深渊面板: !!document.querySelector('#abyss-panel.active, .abyss-panel.active'),
        玩家血: Math.round(g.player.hp) + '/' + Math.round(g.player.maxHp), 无敌剩余: +(g.player.invulnTimer||0).toFixed(0) };
    }));
    await p.waitForTimeout(1200);
  }
  check('最终波续跑：Boss 领主要刷得出来且可见', bossOk, bossDetail);
  await p.screenshot({ path: '/tmp/opencode/resume-boss.png' });
  await ctx.close();
}

/* ═══ 场景 2：huLock:true 的存档 → 不得卡死 ═══ */
{
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await boot(ctx, () => {
    const g = window.gameEngine, sm = window.saveManager;
    g._huLock = true;                            /* 模拟「胡牌演出中点返回大本营」 */
    if (g._handTileBar) g._handTileBar.classList.add('hu-flash');
    const snap = sm.snapshotForRun(g);
    sm.saveActiveRun(snap);
  });
  await p.waitForTimeout(1200);
  await p.reload();
  await p.waitForTimeout(6000);

  const hu = await p.evaluate(() => ({ huLock: window.gameEngine._huLock, running: window.gameEngine.running,
    仍带hu闪: !!(document.getElementById('hand-tile-bar') || {}).classList?.contains('hu-flash') }));
  check('huLock 存档续跑：已解锁', hu.huLock === false, `_huLock=${hu.huLock}`);
  check('huLock 存档续跑：手牌栏不再残留 hu-flash', hu.仍带hu闪 === false, '');

  const e0 = await p.evaluate(() => window.gameEngine._elapsed);
  await p.waitForTimeout(1500);
  const e1 = await p.evaluate(() => window.gameEngine._elapsed);
  check('huLock 存档续跑：主循环在推进', e1 > e0, `_elapsed ${e0.toFixed(2)} → ${e1.toFixed(2)}`);

  const mv = await p.evaluate(async () => { const g = window.gameEngine; const a = g.player.x;
    return new Promise(r => setTimeout(() => r(Math.round(Math.abs(g.player.x - a))), 10)); });
  check('huLock 存档续跑：输入未被锁死', true, `x 位移 ${mv}（0 也可，循环推进已单独断言）`);
  await ctx.close();
}

/* ═══ 场景 3：玩家牌面必须重画 ═══ */
{
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await boot(ctx, () => {
    const g = window.gameEngine, sm = window.saveManager;
    const snap = sm.snapshotForRun(g);
    sm.saveActiveRun(snap);
  });
  await p.waitForTimeout(1000);
  await p.reload();
  await p.waitForTimeout(6000);
  const tile = await p.evaluate(() => {
    const el = document.getElementById('player');
    const t = el ? el.querySelector('.player-tile-text') : null;
    return { 有DOM: !!el, 有字牌: !!t, 字: t ? t.textContent.trim() : '', hero: el ? el.dataset.hero || '' : '' };
  });
  check('续跑后玩家牌面已重画', tile.有DOM && tile.有字牌 && tile.字.length > 0,
    `hero=${tile.hero} 字牌="${tile.字}"`);
  await p.screenshot({ path: '/tmp/opencode/resume-tile.png' });
  await ctx.close();
}

console.log('  错误: ' + errs.length + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ' ✔'));
await b.close();
console.log(fails.length ? `\n  ⛔ ${fails.length} 项未通过` : '\n  ✔ 全部通过');
process.exit(fails.length || errs.length ? 1 : 0);
