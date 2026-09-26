/* 敌人动作帧取证：走/攻击/受击三个 class 是否真的挂上并产生动画。
   用法：node design/audit/probe-enemy.mjs  → 截图 /tmp/opencode/enemy.png */
import { chromium } from '../../node_modules/playwright/index.mjs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
p.on('pageerror', e => errs.push('PE ' + e.message.slice(0, 140)));

await p.goto('http://localhost:8765/pages/s1_save_select.html'); await p.waitForTimeout(500);
await p.click('#btn-newgame'); await p.waitForTimeout(1200);
if (p.url().includes('s2')) { await p.click('#btn-hub-start'); await p.waitForTimeout(3000); }
for (let i = 0; i < 12; i++) {
  if (!(await p.locator('#guide-overlay.active').count())) break;
  await p.evaluate(() => { const g = window.gameEngine; if (g) { g._guideDismissed = true; g._completeGuide(); } });
  await p.waitForTimeout(700);
}
await p.waitForSelector('.enemy', { timeout: 20000 });

/* 采样一段时间，统计三个 class 各自出现过没有 */
const seen = await p.evaluate(async () => {
  const s = { moving: 0, attacking: 0, hit: 0, anim: {}, n: 0 };
  for (let i = 0; i < 90; i++) {
    const es = [...document.querySelectorAll('.enemy')];
    s.n = Math.max(s.n, es.length);
    for (const e of es) {
      if (e.classList.contains('moving')) s.moving++;
      if (e.classList.contains('attacking')) s.attacking++;
      if (e.classList.contains('hit-react')) s.hit++;
      const a = getComputedStyle(e).animationName;
      if (a && a !== 'none') s.anim[a] = (s.anim[a] || 0) + 1;
    }
    await new Promise(r => setTimeout(r, 50));
  }
  return s;
});

/* 直接调 player.takeDamage(1, 敌人实例) 验证 lunge 钩子 ——
   等敌人自然走到玩家身边要十几秒，而且各 AI 的接近行为不同（实测 dist 一直 182）。

   用 MutationObserver 而不是轮询采样：`.attacking` 只活 0.19s（animationend 自动清理），
   轮询必然是采样竞态 —— 同一份代码连跑会时绿时红。flaky 的测试比没有测试更糟，
   因为它会让人不再相信测试结果。观察 class 属性变更则没有这个竞态。 */
const lunge = await p.evaluate(async () => {
  const g = window.gameEngine;
  const en = g.enemies.find(e => e && e.el);
  if (!en) return { ok: false, why: '没有带 DOM 的敌人' };
  const seen = [];
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      const v = m.target.getAttribute('class') || '';
      if (v.includes('attacking')) seen.push(v);
    }
  });
  document.querySelectorAll('.enemy').forEach(e => mo.observe(e, { attributes: true, attributeFilter: ['class'] }));
  g.player.takeDamage(1, en);
  await new Promise(r => setTimeout(r, 700));
  mo.disconnect();
  return { ok: seen.length > 0, 触发次数: seen.length, 样例: seen[0] || null };
});

/* 受击反应由既有的 flash-hit 负责，这里只确认它没被我搞坏 */
const hitSeen = await p.evaluate(async () => {
  const e = document.querySelector('.enemy');
  if (!e) return 'no-enemy';
  const id = e.dataset.id;
  const g = window.gameEngine;
  const en = g.enemies.find(x => String(x.id) === String(id));
  if (!en) return 'no-instance';
  en.hp -= 1;
  return 'ok';
});
await p.waitForTimeout(120);
const hitNow = await p.evaluate(() => {
  const e = document.querySelector('.enemy');
  return e ? { cls: e.className, anim: getComputedStyle(e).animationName } : null;
});
await p.screenshot({ path: '/tmp/opencode/enemy.png' });
console.log(JSON.stringify({ 采样: seen, 主动扣血: hitSeen, 受击瞬间: hitNow, 攻击瞬间: lunge }, null, 1));
console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
await b.close();
const ok = seen.moving > 0 && !errs.length && lunge.ok;
process.exit(ok ? 0 : 1);
