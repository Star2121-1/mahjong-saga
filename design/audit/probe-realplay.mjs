/* 真实中后期游玩：不作弊，只用玩家能做的操作打完整局。
   与其它探针的根本区别：**不调 _addTileToHand / 不改血量 / 不跳波次**，
   手牌只能靠击杀掉落获得，升级只能靠打够经验。
   目的：验证**难度曲线、节奏、手感** —— 前面所有探针都没碰过。

   两个踩过的坑（都写在这里）：
   1. 攻击绑在 `battlefield.addEventListener('pointerdown')`（Boot.js:207），
      **不是 click**。合成 `new MouseEvent('click')` 完全无效 —— 第一版 16 秒 0 击杀，
      我一度以为是游戏坏了。
   2. 每回合多次 evaluate + 长 wait 会让探针跑到几分钟。已合并成
      「1 次 evaluate 决策 + 1 次真实鼠标点击 + 1 次按键」，并加了硬性时间上限。

   用法：node design/audit/probe-realplay.mjs [波数上限] [秒数上限]
*/
import { chromium } from '../../node_modules/playwright/index.mjs';
const WAVE_CAP = parseInt(process.argv[2] || '4', 10);
const TIME_CAP = parseInt(process.argv[3] || '150', 10);   // 秒
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
console.log('  开局 ' + await p.evaluate(() => JSON.stringify({
  关卡: gameEngine._currentLevelId, 血: gameEngine.player.hp + '/' + gameEngine.player.maxHp,
  攻: gameEngine.player.atk, 移速: Math.round(gameEngine.player.speed),
  武器: (gameEngine._activeWeapons || []).length, 手牌: gameEngine._handTiles.length,
  等级字段: 'currentLvl', 磁铁半径: Math.round(gameEngine.player.magnetRadius) })));

const t0 = Date.now();
let lastWave = -1, shots = 0, done = '';
while (Date.now() - t0 < TIME_CAP * 1000) {
  /* 一次 evaluate 拿全部状态 + 决策，省掉往返 */
  const d = await p.evaluate(() => {
    const g = window.gameEngine, pl = g.player;
    const st = { wave: g._waveCount, hp: pl.hp, level: pl.currentLvl, exp: pl.currentExp, hand: g._handTiles.length,
      alive: g.enemies.filter(e => e.alive).length, gems: g._expGems.length, coins: g._activeCoins.length,
      kills: (window.__kills = (window.__kills || 0)),
      levelup: !!document.querySelector('#reward-overlay.active'), discard: g._discardMode,
      gameOver: g.gameOver, elapsed: +(g._elapsed || 0).toFixed(1), rage: Math.round(pl.rage || 0),
      atk: Math.round(pl.atk), od: g._overdriveActive, frozen: g._pauseOrFrozen };
    /* 真实打法 —— 关键：**波次推进要求敌人/铜筹码/经验石全部清空**（Loop.js:701），
       所以玩家必须去捡掉落物。我第一版只会「远离敌人」，结果掉落物永远捡不到，
       波次在第 1 波卡了 27 秒，还以为游戏有问题。
       优先级：附近有掉落物 → 走过去捡；否则 → 风筝 + 打最近的敌人。 */
    let ax = 0, ay = 0, target = null, nd = 1e9;
    for (const e of g.enemies) {
      if (!e.alive) continue;
      const dx = pl.x - e.x, dy = pl.y - e.y, dd = Math.hypot(dx, dy) || 1;
      if (dd < nd) { nd = dd; target = e; }
      if (dd < 300) { ax += dx / dd; ay += dy / dd; }
    }
    let pick = null, pd = 1e9;
    for (const o of (g._expGems || []).concat(g._activeCoins || [])) {
      const dx = o.x - pl.x, dy = o.y - pl.y, dd = Math.hypot(dx, dy);
      if (dd < pd) { pd = dd; pick = { dx, dy }; }
    }
    if (pick && pd < 900) { ax = pick.dx; ay = pick.dy; st.去捡 = Math.round(pd); }
    const m = Math.hypot(ax, ay) || 1;
    st.wantX = pl.x + (ax / m) * 120; st.wantY = pl.y + (ay / m) * 120;
    st.dir = (st.wantX - pl.x > 45 ? 'KeyD' : st.wantX - pl.x < -45 ? 'KeyA' :
              st.wantY - pl.y > 45 ? 'KeyS' : st.wantY - pl.y < -45 ? 'KeyW' : 'KeyD');
    if (target && target.el) { const r = target.el.getBoundingClientRect();
      st.tx = r.left + r.width / 2; st.ty = r.top + r.height / 2; st.tdist = Math.round(nd); }
    return st;
  });
  if (d.gameOver) { done = `✘ 第 ${Math.round(d.elapsed)} 秒阵亡于第 ${d.wave + 1} 波`; break; }
  if (d.wave !== lastWave) {
    lastWave = d.wave;
    console.log(`  第 ${d.wave + 1} 波 → 血 ${Math.round(d.hp)} 等级 ${d.level} 攻 ${d.atk} ` +
                `手牌 ${d.hand} 同屏敌 ${d.alive} 掉落(石${d.gems}/币${d.coins}) 怒气 ${d.rage} 用时 ${d.elapsed}s`);
    if (d.wave < WAVE_CAP - 1 && shots < WAVE_CAP) { shots++; await p.screenshot({ path: `/tmp/opencode/realplay-w${d.wave + 1}.png` }); }
  }
  if (d.wave + 1 >= WAVE_CAP) { done = `✔ 抵达第 ${d.wave + 1} 波`; break; }
  if (d.mutatorPanel) {              // 选一个突变
    const opt = p.locator('#mutator-overlay .mutator-option, #mutator-overlay [data-mutator], #mutator-overlay button').first();
    if (await opt.count()) await opt.click({ force: true }).catch(() => {});
    await p.waitForTimeout(300); continue;
  }
  if (d.levelup) {
    const btn = p.locator('#reward-overlay .relic-btn:not([disabled])').first();
    if (await btn.count()) await btn.click({ force: true }).catch(() => {});
    await p.waitForTimeout(260); continue;
  }
  if (d.discard) {
    const sl = p.locator('#hand-tile-grid .hand-tile-slot.occupied').first();
    if (await sl.count()) await sl.click({ force: true }).catch(() => {});
    await p.waitForTimeout(200); continue;
  }
  if (d.rage >= 100 && !d.od) await p.keyboard.press('Space');
  await p.keyboard.down(d.dir); await p.waitForTimeout(150); await p.keyboard.up(d.dir);
  if (d.tx != null) await p.mouse.click(d.tx, d.ty).catch(() => {});
  await p.waitForTimeout(150);
}
const fin = await p.evaluate(() => { const g = gameEngine0Safe = window.gameEngine, pl = g.player;
  return { 波次: g._waveCount + 1, 等级: pl.currentLvl, 攻: Math.round(pl.atk), 手牌: g._handTiles.length,
           经验: pl.currentExp + '/' + pl.nextLvlExp, 剩余血: Math.round(pl.hp),
           游戏内用时: +(g._elapsed || 0).toFixed(0), 残留掉落: g._expGems.length + g._activeCoins.length,
           阵亡: g.gameOver }; });
console.log(`  ${done || '⏱ 到达时间上限'} | 最终 ${JSON.stringify(fin)}`);
console.log('  错误 ' + errs.length + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ' ✔'));
await b.close();
