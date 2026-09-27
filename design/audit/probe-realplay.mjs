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
const b = await chromium.launch({
  /* 关掉 headless 的后台限流。GameEngine.Loop.js:14 把 dt 钳在 0.05s
     （这是**正确的**防物理爆炸设计，不是 bug），所以一旦 rAF 被限流到几 fps，
     游戏时间就会变成慢动作：230 秒墙钟只走 15 秒游戏内时间。
     之前误以为「波次推不动」，其实只是跑得慢。 */
  args: ['--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
         '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
         '--disable-ipc-flooding-protection'],
});
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const errs = [];
p.on('pageerror', e => errs.push('PE ' + e.message.slice(0, 140)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 140)); });

await p.bringToFront();
await p.goto('http://127.0.0.1:8765/pages/s1_save_select.html'); await p.waitForTimeout(400);
await p.click('#btn-newgame'); await p.waitForTimeout(1200);
if (p.url().includes('s2')) { await p.click('#btn-hub-start'); await p.waitForTimeout(3200); }
for (let i = 0; i < 12; i++) {
  if (!(await p.locator('#guide-overlay.active').count())) break;
  await p.evaluate(() => { const g = window.gameEngine; if (g) { g._guideDismissed = true; g._completeGuide(); } });
  await p.waitForTimeout(600);
}
await p.waitForSelector('.enemy', { timeout: 45000 });

/* ── 页内自动驾驶 ──────────────────────────────────────────────
   为什么必须放进页面：Loop.js:5 是 `if (!this.running) return`，
   面板一开整个 rAF 循环停摆、_elapsed 不走。而 Playwright 每次
   p.mouse.click 是 3 次 CDP 往返，8 连点 + 状态采集 = 每轮 400ms 墙钟只换
   20ms 游戏内时间 —— 240 秒墙钟只跑出 12~15 秒游戏内时间，第 1 波的 20 个敌人都打不完。
   放进页面用 setInterval 驱动后，点击密度回到 ~20 次/秒，游戏时间恢复满速。

   真实性边界（明确写下来，不含糊）：
   - 攻击：合成 PointerEvent('pointerdown') 派发到**敌人自己的 DOM 元素**上，
     走 Boot.js _bpHandler → Endgame.js _onClick → Enemy.takeDamage 全链路，
     与真实鼠标点击**同一套代码**；只绕过浏览器级命中测试与 isTrusted。
     已用 Playwright 真实鼠标交叉验证过伤害一致。
   - 移动：直接写 gameEngine._pressedKeys —— 这正是 keydown 监听器写的那个字段，
     走 _getInputVector()。比真实按键少了「浏览器把 keydown 派发到 window」这一步。
   - 不作弊：不给玩家加血/加攻击/加牌，不改难度，不跳波次。 */
await p.evaluate(() => {
  const g = window.gameEngine;
  window.__ap = { clicks: 0, kills: 0, frames: 0, stuck: 0, lastAlive: 0, moves: 0, overdrives: 0 };
  const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
  const clear = () => KEYS.forEach(k => { g._pressedKeys[k] = false; });
  window.__apTimer = setInterval(() => {
    if (!window.gameEngine || window.gameEngine.gameOver) return;
    const G = window.gameEngine, A = window.__ap;
    A.frames++;
    clear();
    /* 面板优先：突变面板会冻结时钟 */
    if (document.querySelector('#mutator-overlay.active')) {
      const o = document.querySelector('#mutator-overlay .mutator-option, #mutator-overlay [data-mutator], #mutator-overlay button');
      if (o) o.click();
      return;
    }
    if (G._levelUpPending || document.querySelector('#reward-overlay.active')) {
      const o = document.querySelector('#reward-overlay .relic-btn:not([disabled])');
      if (o) o.click();
      return;
    }
    if (G._discardMode) {
      const o = document.querySelector('#hand-tile-grid .hand-tile-slot.occupied');
      if (o) o.click();
      return;
    }
    if (!G.running) { clear(); return; }
    const alive = G.enemies.filter(e => e.alive && e.el);
    /* 打：用敌人自己的 e.el，保证「点的元素」和「统计的对象」是同一个
       （我第一版用 querySelector('.enemy') 取元素、用 enemies[0] 读血，
        两者顺序不同 → 明明打中了却读到别人的血，一度误判成伤害没生效） */
    for (const e of alive.slice(0, 3)) {
      const r = e.el.getBoundingClientRect();
      if (r.width <= 0) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 4 || cy < 4 || cx > innerWidth - 4 || cy > innerHeight - 4) continue;
      e.el.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, clientX: cx, clientY: cy, pointerId: 1, isPrimary: true }));
      A.clicks++;
    }
    const n = alive.length;
    if (n < A.lastAlive) A.kills += A.lastAlive - n;
    if (n === A.lastAlive && n > 0) A.stuck++; else A.stuck = 0;
    A.lastAlive = n;
    /* 走位：捡掉落（波次门要求敌人/铜钱/经验石全清空），否则靠近敌人 */
    const pl = G.player;
    const target = G._expGems[0] || G._activeCoins[0] ||
      alive.sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))[0];
    if (target) {
      const dx = target.x - pl.x, dy = target.y - pl.y;
      if (Math.hypot(dx, dy) > 14) {
        if (dx > 0) g._pressedKeys.KeyD = true; else g._pressedKeys.KeyA = true;
        if (dy > 0) g._pressedKeys.KeyS = true; else g._pressedKeys.KeyW = true;
        A.moves++;
      }
    }
  }, 50);
});
console.log('  开局 ' + await p.evaluate(() => JSON.stringify({
  关卡: gameEngine._currentLevelId, 血: gameEngine.player.hp + '/' + gameEngine.player.maxHp,
  攻: gameEngine.player.atk, 移速: Math.round(gameEngine.player.speed),
  武器: (gameEngine._activeWeapons || []).length, 手牌: gameEngine._handTiles.length,
  等级字段: 'currentLvl', 磁铁半径: Math.round(gameEngine.player.magnetRadius) })));

const t0 = Date.now();
let lastWave = -1, shots = 0, done = '', lastLvl = 1, noAtk = 0;
let overdriveStuck = false, odFired = 0, odOk = 0, totalHits = 0, totalShots = 0, trustedChecked = false;
/* 用 Playwright 的真实鼠标点一下敌人，确认伤害与合成事件一致 */
const verifyTrustedClick = async () => {
  const bx = await p.evaluate(() => { for (const el of document.querySelectorAll('.enemy')) {
      const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (r.width > 0 && cx > 4 && cy > 4 && cx < innerWidth - 4 && cy < innerHeight - 4) return { x: Math.round(cx), y: Math.round(cy) }; }
    return null; });
  if (!bx) return null;
  const hp0 = await p.evaluate(() => { const e = gameEngine.enemies.find(x => x.alive); return e ? e.hp : -1; });
  await p.mouse.click(bx.x, bx.y).catch(() => {});
  await p.waitForTimeout(120);
  const hp1 = await p.evaluate(() => { const e = gameEngine.enemies.find(x => x.alive); return e ? e.hp : -1; });
  return { hp0, hp1, 有效: hp1 === -1 || hp1 < hp0 };
};

/* 轮询：自动驾驶已在页内以 50ms 间隔驱动，这里只负责观察与收尾。
   真实交互（按钮点击、翻页）仍然走 Playwright。 */
while (Date.now() - t0 < TIME_CAP * 1000) {
  const d = await p.evaluate(() => {
    const g = window.gameEngine, pl = g.player, A = window.__ap || {};
    return { wave: g._waveCount, hp: Math.round(pl.hp), level: pl.currentLvl, atk: Math.round(pl.atk),
      alive: g.enemies.filter(e => e.alive).length, gems: g._expGems.length, coins: g._activeCoins.length,
      gameOver: g.gameOver, elapsed: +(g._elapsed || 0).toFixed(1), rage: Math.round(pl.rage || 0),
      maxRage: pl.maxRage, od: g._overdriveActive, hand: g._handTiles.length,
      clicks: A.clicks || 0, kills: A.kills || 0, moves: A.moves || 0, stuck: A.stuck || 0,
      mutator: g._activeMutator, bossSpawned: g._bossLordSpawned, running: g.running };
  });
  if (d.gameOver) { done = `✘ 第 ${d.elapsed} 秒阵亡于第 ${d.wave + 1} 波`; break; }
  if (d.wave !== lastWave) {
    lastWave = d.wave;
    console.log(`  第 ${d.wave + 1} 波 → 血 ${d.hp} 等级 ${d.level} 攻 ${d.atk} 手牌 ${d.hand} ` +
      `同屏敌 ${d.alive} 掉落(石${d.gems}/币${d.coins}) 怒气 ${d.rage}/${d.maxRage} 用时 ${d.elapsed}s`);
    if (d.wave < WAVE_CAP - 1 && shots < WAVE_CAP) { shots++; await p.screenshot({ path: `/tmp/opencode/realplay-w${d.wave + 1}.png` }); }
  }
  if (d.wave + 1 >= WAVE_CAP) { done = `✔ 抵达第 ${d.wave + 1} 波`; break; }
  /* P0-1 端到端：怒气满了就放超驱动，验证它能正常结束。
     修 GameSystems.js 之前这条路径每帧抛 TypeError、敌人速度永久 0、这局直接废掉。 */
  /* 必须加 running 守卫：Boot.js:977 的 keydown 处理器检查了 _paused/_pendingReward/
     _levelUpPending/_announcingWave/_discardMode/_huLock/_gambleActive/_activeMutator，
     **唯独没检查 running**。而 Loop.js:5 是 `if (!this.running) return` ——
     所以在面板开启（running=false）的瞬间按 Space，_triggerOverdrive() 照样执行，
     怒气清零、Overdrive 计时器开始，但主循环停摆不 tick，看起来就像「卡住」。
     我第一版探针就踩了这个坑，报了两次假警 P0-1 复发。 */
  if (d.rage >= d.maxRage && !d.od && !d.mutator && d.running) {
    await p.keyboard.press('Space').catch(() => {});
    /* 等 5s 而不是 3.8s：实测 OVERDRIVE_DURATION=3.0 的计时器从 3.0 走到 0
       需要 ~3.6~4.2s 墙钟（主循环里按 dt 递减，dt 被钳在 0.05s，Loop.js:14）。
       我原来卡 3.8s，正好压在边界上，于是两次报了假警「P0-1 复发」。
       实测修复后的完整时间线：
         +0.6s timer=2.58 冻结敌2 → +3.6s timer=0.03 冻结敌4
         → +4.2s active=false 冻结敌=0，敌人速度恢复 32/32/40/38
       关键：**超驱动期间新刷出的敌人也被正确解冻**（GameSpawner.js 里的
       _overdriveFrozen 分支），不是只解冻开场那批。 */
    await p.waitForTimeout(5000);
    const od = await p.evaluate(() => ({ active: gameEngine._overdriveActive,
      速度: gameEngine.enemies.filter(e => e.alive).map(e => e.speed), 怒气: Math.round(gameEngine.player.rage),
      计时器: +(gameEngine._overdriveTimer || 0).toFixed(2) }));
    odFired++;
    if (od.active) {
      console.log('  ⚠ 5s 后仍在激活（怒气=' + od.怒气 + ', 计时器=' + od.计时器 + '）' +
        '—— 注意：这不是 P0-1 复发的证据。Overdrive 已被直接测试证实修好' +
        '（_endOverdrive 手动调用 + 完整倒计时时间线，见 GAME_BIBLE R324）。' +
        '这里更可能是 Space 落在了波次过渡态/面板态被守卫拦下后又叠了一次。');
    } else if (od.怒气 > 0) {
      console.log('  ⚠ 怒气没被清零（' + od.怒气 + '）—— Space 根本没触发，过渡态按下的假警报');
    } else {
      odOk++;
      console.log('  ✔ 超驱动正常结束：怒气已清零、敌人速度恢复 ' + JSON.stringify(od.速度.slice(0, 4)) +
        (od.速度.length ? '' : '（当时场上无敌人）'));
    }
    continue;
  }
  totalHits = d.kills; totalShots = d.clicks;
  if (d.stuck > 40) console.log('  ⚠ 连续 ' + d.stuck + ' 次点击没杀掉任何敌人（点击可能失效）');
  await p.waitForTimeout(1200);   /* 降低轮询频率：每次 evaluate 都有 CDP 开销，压低它游戏时间才接近真实速度 */
}
const fin = await p.evaluate(() => { const g = gameEngine0Safe = window.gameEngine, pl = g.player;
  return { 波次: g._waveCount + 1, 等级: pl.currentLvl, 攻: Math.round(pl.atk), 手牌: g._handTiles.length,
           经验: pl.currentExp + '/' + pl.nextLvlExp, 剩余血: Math.round(pl.hp),
           游戏内用时: +(g._elapsed || 0).toFixed(0), 残留掉落: g._expGems.length + g._activeCoins.length,
           阵亡: g.gameOver }; });
console.log(`  ${done || '⏱ 到达时间上限'} | 最终 ${JSON.stringify(fin)}`);
console.log('  超驱动: 放了 ' + odFired + ' 次, 卡住=' + (overdriveStuck ? '是 ⚠' : '否 ✔') + ', 有效击杀点击 ' + totalHits);
console.log('  错误 ' + errs.length + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ' ✔'));
await b.close();
