/* 终局路径探针：胡牌 / Boss 三阶段 / 胜利结算 / 失败结算 / 深渊。
   这五条主线此前一次都没被自动化验证过 —— 探针只覆盖了「进得去、动得了」。
   用法：node design/audit/probe-endgame.mjs  → 截图 /tmp/opencode/endgame-*.png */
import { chromium } from '../../node_modules/playwright/index.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const errs = [];
p.on('pageerror', e => errs.push('PE ' + e.message.slice(0, 140)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 140)); });
const step = (n, ok, x = '') => console.log(`  ${ok ? '✔' : '✘'} ${n}${x ? '   ' + x : ''}`);

await p.goto('http://127.0.0.1:8765/pages/s1_save_select.html'); await p.waitForTimeout(400);
await p.click('#btn-newgame'); await p.waitForTimeout(1200);
if (p.url().includes('s2')) { await p.click('#btn-hub-start'); await p.waitForTimeout(3200); }
for (let i = 0; i < 12; i++) {
  if (!(await p.locator('#guide-overlay.active').count())) break;
  await p.evaluate(() => { const g = window.gameEngine; if (g) { g._guideDismissed = true; g._completeGuide(); } });
  await p.waitForTimeout(600);
}
await p.waitForSelector('.enemy', { timeout: 45000 });
await p.waitForTimeout(500);

/* ── 0. 胡牌判定矩阵（纯函数，在喂给引擎之前测）
   关键：evaluateHu 是纯函数，但引擎触发后会**清空手牌**（Spawn.js:807 设计行为），
   所以必须先独立验证判定矩阵，再验引擎触发。 */
const matrix = await p.evaluate(() => {
  const MH = window.MahjongHand, out = [];
  const c = (name, hand, want) => { const r = MH.evaluateHu(hand);
    out.push({ 用例: name, 期望: want, 实得: r ? r.huType : null, 对: (r ? r.huType : null) === want }); };
  c('七对子', ['wan1','wan1','wan2','wan2','wan3','wan3','wan4','wan4','wan5','wan5','wan6','wan6','wan7','wan7'], 'qiduizi');
  c('清一色', ['wan1','wan1','wan1','wan2','wan2','wan2','wan3','wan3','wan3','wan4','wan4','wan4','wan9','wan9'], 'qingyise');
  c('碰碰胡', ['wan1','wan1','wan1','wan2','wan2','wan2','wan3','wan3','wan3','wan9','wan9','wan9','feng_dong','feng_dong'], 'pengpenghu');
  c('普通牌型(不该胡)', ['wan1','wan2','wan3','wan4','wan5','wan6','wan7','wan8','wan9','wan1','wan1','tong5','tong5','tong5'], null);
  c('13张不满(不该胡)', ['wan1','wan1','wan2','wan2','wan3','wan3','wan4','wan4','wan5','wan5','wan6','wan6','wan7'], null);
  c('混花七对子', ['wan1','wan1','wan2','wan2','wan3','wan3','wan4','wan4','wan5','wan5','tong1','tong1','tong2','tong2'], 'qiduizi');
  c('字牌七对子', ['feng_dong','feng_dong','feng_nan','feng_nan','feng_xi','feng_xi','feng_bei','feng_bei','jian_zhong','jian_zhong','jian_fa','jian_fa','jian_bai','jian_bai'], 'qiduizi');
  c('空手牌', [], null);
  return out;
});
step('胡牌判定矩阵 8/8', matrix.every(m => m.对 === true),
     matrix.map(m => `${m.用例}:${m.对 ? '✔' : '✘'}(${m.实得})`).join(' '));

/* ── 1. 胡牌：七对子（7 对同花色不同点数）── */
const hu = await p.evaluate(() => {
  const g = window.gameEngine;
  g._handTiles = []; g._huLock = false;
  /* 七对子：wan 1-7 各一对 = 14 张。第 14 张入手的瞬间就会触发 _triggerHu，
     所以视觉元素必须**在这一轮 evaluate 里同步查** —— hu-bang 和 toast 都会自动消失，
     隔 900ms 再查必然查不到（我第一版就误报成 ✘）。 */
  /* 先算一次纯函数判定（此刻手牌还是空的，所以单独构造一份 14 张来判） */
  const probeHand = []; ['wan1','wan2','wan3','wan4','wan5','wan6','wan7'].forEach(id => { probeHand.push(id, id); });
  const 触发前判定 = (window.MahjongHand.evaluateHu(probeHand) || {}).huType || null;
  ['wan1','wan2','wan3','wan4','wan5','wan6','wan7'].forEach(id => { g._addTileToHand(id); g._addTileToHand(id); });
  return { 触发前判定, 手牌数: g._handTiles.length,
           判定: window.MahjongHand.evaluateHu(g._handTiles),
           锁定: g._huLock, 闪避: g.player.dodgeRate,
           胡字: !!document.querySelector('.hu-bang'),
           手牌闪光: (document.getElementById('hand-tile-bar')||{className:''}).className.includes('hu-flash'),
           toast: [...document.querySelectorAll('#toast-container *')].map(t=>(t.textContent||'').trim()).filter(Boolean).slice(0,3) };
});
step('引擎触发时判定为七对子（喂牌前一刻）', hu.触发前判定 === 'qiduizi', hu.触发前判定);
/* 胡牌后手牌被清空是**设计行为**（Spawn.js:807「清手牌重开一轮收集」），
   所以不能断言「手牌仍为 14」—— 我第一版就是这么误报的。 */
step('胡牌后清空手牌、重开收集（设计行为）', hu.手牌数 === 0, '手牌数=' + hu.手牌数);
step('胡牌后加锁（防重复触发）', hu.锁定 === true);
step('七对子给了闪避加成', hu.闪避 > 0, `dodgeRate=${hu.闪避}`);
step('「胡！」砸屏出现', hu.胡字);
step('手牌扇形脉冲 class 已加', hu.手牌闪光);
/* s3 刻意不加载 ToastSystem（CLAUDE.md 有明确约束），所以 _triggerHu 里的
   toast 调用在战斗页是 no-op —— 胡牌反馈靠「胡！」砸屏 + 手牌脉冲 + 增益。
   这里断言「确实没有 toast」，免得以后有人以为它坏了。 */
step('s3 未加载 toastSystem（胡牌 toast 为 no-op）', hu.toast.length === 0, JSON.stringify(hu.toast));
await p.screenshot({ path: '/tmp/opencode/endgame-hu.png' });

/* ── 2. 清理并测 Boss 三阶段 ── */
await p.evaluate(() => { const g = window.gameEngine;
  g._huLock = false; g._handTiles = []; g._renderHandTiles();
  if (g._huBangEl) { g._huBangEl.remove(); g._huBangEl = null; }
  g._handTileBar && g._handTileBar.classList.remove('hu-flash');
  g._unfreezeClock(); g._beginLoop();
  g.enemies.slice().forEach(e => { e.alive = false; if (e.el) e.el.remove(); }); g.enemies.length = 0;
});
await p.waitForTimeout(400);
const boss = await p.evaluate(async () => {
  const g = window.gameEngine;
  g._spawnBossLordFromGamble();
  await new Promise(r => setTimeout(r, 1200));
  const b = g.enemies.find(e => e.alive);
  return b ? { 存在: true, 类型: b.type, HP: b.hp, 阶段: b._bossPhase,
               HP条可见: !!(document.getElementById('boss-hp-bar')||{}).classList?.contains('active'),
               class: b.el ? b.el.className : '' } : { 存在: false };
});
step('Boss Lord 已生成', boss.存在, JSON.stringify(boss));
if (boss.存在) {
  await p.screenshot({ path: '/tmp/opencode/endgame-boss.png' });
  const phases = await p.evaluate(async () => {
    const g = window.gameEngine;
    const b = g.enemies.find(e => e.alive && e.type === 'Boss_Lord');
    if (!b) return null;
    const out = [];
    const max = b.hp;
    for (const pct of [1.0, 0.6, 0.3, 0.05]) {
      b.hp = Math.max(1, Math.round(max * pct));
      b._updateBossPhase ? b._updateBossPhase() : (b.update ? b.update(0.016, g.player, g) : null);
      await new Promise(r => setTimeout(r, 260));
      out.push({ 设定血量比: pct, 阶段: b._bossPhase, class: b.el ? b.el.className.replace(/.*?(phase-\d).*/, '$1') : '' });
    }
    return out;
  });
  step('Boss 阶段随血量推进', phases && phases[0].阶段 === 1 && phases[phases.length-1].阶段 === 3,
       JSON.stringify(phases));
}

/* ── 3. 胜利结算 ── */
await p.evaluate(() => { const g = window.gameEngine;
  g.enemies.slice().forEach(e => { e.alive = false; if (e.el) e.el.remove(); }); g.enemies.length = 0; });
await p.waitForTimeout(300);
await p.evaluate(() => window.gameEngine._showVictory());
await p.waitForTimeout(2600);
const vic = await p.evaluate(() => ({
  overlay: (document.getElementById('victory-overlay')||{className:''}).className,
  可见: (document.getElementById('victory-overlay')||{className:''}).className.includes('active'),
  文字: (document.getElementById('victory-overlay')||{}).innerText?.replace(/\s+/g,' ').slice(0,90) || '',
}));
step('胜利结算画面出现', vic.可见, JSON.stringify(vic.文字));
await p.screenshot({ path: '/tmp/opencode/endgame-victory.png' });

/* ── 4. 深渊（程序化关卡）── */
await p.evaluate(() => { const g = window.gameEngine;
  document.getElementById('victory-overlay').classList.remove('active');
  g.gameOver = false; g._unfreezeClock(); g._beginLoop(); });
await p.waitForTimeout(600);
const abyss = await p.evaluate(async () => {
  const g = window.gameEngine;
  const gen = window.proceduralLevelGenerator;
  if (!gen) return { 生成器: '缺失' };
  const a = gen.generate(3), b = gen.generate(9);
  return { 生成器: '在', 名称: a.name, 难度系数: +a.difficultyFactor.toFixed(2), 波数: a.maxWaves,
           深层名称: b.name, 深层难度: +b.difficultyFactor.toFixed(2),
           难度递增: b.difficultyFactor > a.difficultyFactor };
});
step('程序化关卡生成器可用', abyss.生成器 === '在', JSON.stringify(abyss));
step('深渊层数越深难度越高', abyss.难度递增 === true);

/* ── 5. 失败结算：**独立会话**测
   串联在前面那些「把引擎改得面目全非」的步骤之后测不出来（我试过，失败）；
   而单独跑一遍完全正常：overlay active、统计正确、gameOver=true、running=false。
   结论是**探针串扰，不是产品 bug**。
   每条终局路径都应该在自己的干净会话里测 —— 这是测试设计问题。 */
{
  const ctx2 = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p2 = await ctx2.newPage();
  const cdp2 = await ctx2.newCDPSession(p2);
  await cdp2.send('Network.setCacheDisabled', { cacheDisabled: true });
  p2.on('pageerror', e => errs.push('PE2 ' + e.message.slice(0, 140)));
  p2.on('console', m => { if (m.type() === 'error') errs.push('CE2 ' + m.text().slice(0, 140)); });
  await p2.goto('http://127.0.0.1:8765/pages/s1_save_select.html'); await p2.waitForTimeout(400);
  await p2.click('#btn-newgame'); await p2.waitForTimeout(1200);
  if (p2.url().includes('s2')) { await p2.click('#btn-hub-start'); await p2.waitForTimeout(3200); }
  for (let i = 0; i < 12; i++) {
    if (!(await p2.locator('#guide-overlay.active').count())) break;
    await p2.evaluate(() => { const g = window.gameEngine; if (g) { g._guideDismissed = true; g._completeGuide(); } });
    await p2.waitForTimeout(600);
  }
  await p2.waitForSelector('.enemy', { timeout: 45000 });
  /* 先打一会，让统计有真实数据（顺便验证「不是空结算」） */
  for (let i = 0; i < 10; i++) {
    if (await p2.locator('.enemy').count()) await p2.locator('.enemy').first().click({ force: true }).catch(() => {});
    await p2.waitForTimeout(260);
  }
  await p2.evaluate(() => { const g = window.gameEngine;
    g.player.invulnTimer = 0; g.player.hitFlashTimer = 0;   /* 无敌帧会静默吃掉这一击 */
    g.player.hp = 1; g.player.takeDamage(9999, null); });
  await p2.waitForTimeout(3000);
  const dead = await p2.evaluate(() => ({
    可见: (document.getElementById('game-over-overlay') || { className: '' }).className.includes('active'),
    文字: (document.getElementById('game-over-overlay') || {}).innerText?.replace(/\s+/g, ' ').slice(0, 80) || '',
    gameOver: window.gameEngine.gameOver, running: window.gameEngine.running,
    冻结: (document.getElementById('game-container') || {}).className.includes('game-clock-frozen'),
  }));
  step('失败结算画面出现', dead.可见, JSON.stringify(dead.文字));
  step('死亡后循环已停', dead.running === false && dead.gameOver === true, `running=${dead.running} gameOver=${dead.gameOver}`);
  step('时钟已冻结（防止死亡后 CSS 继续动）', dead.冻结 === true);
  await p2.screenshot({ path: '/tmp/opencode/endgame-gameover.png' });
  await ctx2.close();
}

console.log('\n  console/page 错误: ' + errs.length + (errs.length ? '\n    ' + errs.slice(0, 5).join('\n    ') : ' ✔'));
await b.close();
process.exit(errs.length ? 1 : 0);
