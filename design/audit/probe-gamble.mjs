/* Boss 赌局 / 突变面板 —— 输入通路回归门禁
 *
 * R325-P0 背景：这个探针存在的原因是一个**灾难级但所有探针都漏掉**的 bug。
 *
 *   `_gambleActive` 的语义是「本局已下注」，不是「面板开着」。
 *   Events.js:436-442 选「金币豪赌/深渊试炼」时先清 _pendingBossGamble、
 *   再置 _gambleActive=true；它要到 _startNextWave(Combat.js:320) 才清。
 *   而 Boot.js 的键位守卫和 Endgame.js 的点击守卫都拿它当「面板开着」用 →
 *   **整个 Boss 战期间 WASD 全死、鼠标攻击全死**，而 running=true、敌人照常动，
 *   看起来一切正常。实测：下注后按住 D 900ms 位移 0；点 Boss hp 202 → 202 零伤害。
 *   **Boss 赌局是最终波必经流程 ⇒ 那一局无法通关。**
 *
 *   为什么之前没抓到：所有探针要么根本不进赌局，要么选「保守」分支 ——
 *   而 'safe' 分支会执行 `_gambleActive = false`，恰好绕开了这条路径。
 *
 * 同类问题还有第二处：`_activeMutator` 是「本波已选中的突变 id」，
 * 选中后整波为真，却被 4 处守卫当成「突变面板开着」用，
 * 导致选中突变后整波 Overdrive 无法触发 / 怒气计时冻住 / 键盘导航被锁。
 * 修法是引入真正的面板可见标志 `_mutatorPanelVisible`。
 *
 * 用法：node design/audit/probe-gamble.mjs
 */
import { chromium } from '../../node_modules/playwright/index.mjs';

const b = await chromium.launch({ args: ['--disable-background-timer-throttling'] });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const errs = [];
p.on('pageerror', e => errs.push('PE ' + e.message.slice(0, 140)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 140)); });

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

const fails = [];
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push(name);
};

/* 精确配对：用敌人自己的 e.el 取坐标，按 id 读回血量。
   踩过的坑：用 enemies.find(alive) 前后各取一次会挑到**不同敌人**，
   于是「明明打中了却读到别人的血」，一度误判成伤害没生效。 */
const probeAttack = async () => {
  const t = await p.evaluate(() => {
    const e = gameEngine.enemies.filter(x => x.alive && x.el).sort((a, b2) => b2.maxHp - a.maxHp)[0];
    if (!e) return null;
    const r = e.el.getBoundingClientRect();
    return { id: e.id, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), hp: e.hp };
  });
  if (!t) return null;
  await p.mouse.click(t.x, t.y);
  await p.waitForTimeout(350);
  const r2 = await p.evaluate(([id, cx, cy]) => {
    const e = gameEngine.enemies.find(x => x.id === id);
    const g = gameEngine;
    const el = document.elementFromPoint(cx, cy);
    const en = el && el.closest ? el.closest('.enemy') : null;
    return { hp: e ? e.hp : 'dead',
      /* 零伤害时把 _onClick 的整条守卫链打出来，否则无从判断是哪一项拦住的 */
      guard: { running: g.running, paused: g._paused, levelUp: g._levelUpPending, reward: g._pendingReward,
        gamblePanel: g._pendingBossGamble, announce: g._announcingWave, discard: g._discardMode,
        hu: g._huLock, nav: g._navSaving, overdrive: g._overdriveActive },
      hit: el ? el.tagName + '#' + (el.id || '-') + '.' + String(el.className || '').slice(0, 24) + ' z=' + getComputedStyle(el).zIndex + ' pe=' + getComputedStyle(el).pointerEvents + ' 尺寸=' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height) : 'null',
      inEnemy: !!en, dsid: en ? en.dataset.id : '无' };
  }, [t.id, t.x, t.y]);
  return { hp0: t.hp, hp1: r2.hp, ok: r2.hp === 'dead' || r2.hp < t.hp, guard: r2.guard, hit: r2.hit, dsid: r2.dsid, inEnemy: r2.inEnemy };
};

const probeMove = async () => {
  const a = await p.evaluate(() => ({ x: gameEngine.player.x, y: gameEngine.player.y }));
  await p.keyboard.down('KeyD');
  await p.waitForTimeout(900);
  await p.keyboard.up('KeyD');
  const c = await p.evaluate(() => ({ x: gameEngine.player.x, y: gameEngine.player.y }));
  return Math.round(Math.hypot(c.x - a.x, c.y - a.y));
};

/* ── 1) 基线 ── */
const baseMove = await probeMove();
check('基线 键盘移动', baseMove >= 5, `位移 ${baseMove}px`);
const baseAtk = await probeAttack();
check('基线 点击攻击', !!baseAtk && baseAtk.ok, baseAtk ? `hp ${baseAtk.hp0} → ${baseAtk.hp1}` +
  (baseAtk.ok ? '' : ' | 守卫=' + JSON.stringify(baseAtk.guard) + ' 点中=' + baseAtk.hit + ' data-id=' + baseAtk.dsid) : '场上无目标');

/* ── 2) 选中突变：Overdrive 仍应可用（_mutatorPanelVisible 而非 _activeMutator）── */
await p.evaluate(() => { const g = window.gameEngine; window.Systems && window.Systems.applyMutator ? window.Systems.applyMutator(g, 'frenzy') : g._applyMutator('frenzy'); });
await p.waitForTimeout(900);
const mutState = await p.evaluate(() => ({
  active: gameEngine._activeMutator, panel: !!gameEngine._mutatorPanelVisible,
  running: gameEngine.running }));
check('选中突变后 标志分离', mutState.active === 'frenzy' && mutState.panel === false,
  `_activeMutator=${mutState.active} _mutatorPanelVisible=${mutState.panel}`);
const mutMove = await probeMove();
check('选中突变后 键盘移动', mutMove >= 5, `位移 ${mutMove}px`);
const mutAtk = await probeAttack();
check('选中突变后 点击攻击', !!mutAtk && mutAtk.ok, mutAtk ? `hp ${mutAtk.hp0} → ${mutAtk.hp1}` +
  (mutAtk.ok ? '' : ' | 守卫=' + JSON.stringify(mutAtk.guard) + ' 点中=' + mutAtk.hit + ' data-id=' + mutAtk.dsid) : '场上无目标');
/* Overdrive 的 Space 触发守卫里原本有 !this._activeMutator —— 选中突变后整波无法触发 */
const odGuard = await p.evaluate(() => {
  const g = window.gameEngine;
  g.player.rage = g.player.maxRage;
  const before = g._overdriveActive;
  return { before, rage: g.player.rage };
});
await p.keyboard.press('Space');
await p.waitForTimeout(500);
const odAfter = await p.evaluate(() => ({ active: gameEngine._overdriveActive, rage: Math.round(gameEngine.player.rage) }));
check('选中突变后 Overdrive 仍可触发', odAfter.active === true && odAfter.rage < 60,
  `active ${odAfter.active}，怒气 ${odAfter.rage}（触发前 ${odGuard.rage}）`);
await p.waitForTimeout(4500);

/* ── 3) Boss 赌局选「金币豪赌」：输入通路必须仍然活着 ── */
await p.evaluate(() => { window.gameEngine._resolveGambleChoice('gold'); });
await p.waitForTimeout(2500);
const g = await p.evaluate(() => ({
  staked: gameEngine._gambleActive, pending: gameEngine._pendingBossGamble,
  running: gameEngine.running, panel: !!document.querySelector('.gamble-overlay.active, #boss-gamble-overlay.active') }));
check('赌局已下注且面板已关', g.staked === true && g.pending === false,
  `_gambleActive=${g.staked} _pendingBossGamble=${g.pending} running=${g.running}`);
const postMove = await probeMove();
check('下注后 键盘移动（R325-P0 回归点）', postMove >= 5, `位移 ${postMove}px`);
const postAtk = await probeAttack();
check('下注后 点击攻击（R325-P0 回归点）', !!postAtk && postAtk.ok,
  postAtk ? `hp ${postAtk.hp0} → ${postAtk.hp1}` + (postAtk.ok ? '' :
    ' | 守卫=' + JSON.stringify(postAtk.guard) + ' 点中=' + postAtk.hit + ' data-id=' + postAtk.dsid) : '场上无目标');

/* ── 3.5) 敌人 id 唯一性 + Boss 元素必须挂在 DOM 里且可点 ──
   R325-P0：Events.js 曾把 `++_enemyIdCounter` 写成 `_enemyIdCounter++`，
   与另外 3 处前置递增混用 → 必然撞号 → Boss 元素被别的敌人的死亡清理摘掉，
   **Boss 隐形且点不到，但血条照常显示、武器照常打它**。
   这里同时断言「id 不重复」和「Boss 元素在 DOM 里且该点命中敌人」。 */
const idUniq = await p.evaluate(() => {
  const ids = gameEngine.enemies.map(e => e.id);
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  const domIds = [...document.querySelectorAll('.enemy')].map(e => e.dataset.id);
  const domDup = domIds.filter((v, i) => domIds.indexOf(v) !== i);
  const boss = gameEngine.enemies.find(e => e.type === 'Boss_Lord' && e.alive);
  let bossHit = null;
  if (boss && boss.el) {
    const r = boss.el.getBoundingClientRect();
    if (r.width > 0) {
      const el = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
      bossHit = { size: [Math.round(r.width), Math.round(r.height)],
        inDom: document.body.contains(boss.el), hits: !!(el && el.closest && el.closest('.enemy')) };
    } else bossHit = { size: [0, 0], inDom: document.body.contains(boss.el), hits: false };
  }
  return { dup, domDup, boss: bossHit, total: ids.length };
});
check('敌人 id 无重复', idUniq.dup.length === 0, idUniq.dup.length ? '重复: ' + JSON.stringify(idUniq.dup) : `${idUniq.total} 个敌人`);
check('DOM 里 data-id 无重复', idUniq.domDup.length === 0, idUniq.domDup.length ? '重复: ' + JSON.stringify(idUniq.domDup) : '');
check('Boss 元素在 DOM 且可点（R325-P0 回归点）', !!idUniq.boss && idUniq.boss.inDom && idUniq.boss.hits && idUniq.boss.size[0] > 0,
  idUniq.boss ? `尺寸 ${JSON.stringify(idUniq.boss.size)} 在DOM=${idUniq.boss.inDom} 该点命中敌人=${idUniq.boss.hits}` : '场上无 Boss');

/* ── 4) 赌局超时/恢复路径：_pendingBossGamble 必须真的能关掉面板 ── */
const closeOk = await p.evaluate(() => { const e = window.gameEngine; return e._tryCloseOverlay(); });
check('_tryCloseOverlay 在赌局面板打开时返回 false', closeOk === false, `返回 ${closeOk}`);

console.log('  错误: ' + errs.length + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ' ✔'));
await b.close();
console.log(fails.length ? `\n  ⛔ ${fails.length} 项未通过` : '\n  ✔ 全部通过');
process.exit(fails.length || errs.length ? 1 : 0);
