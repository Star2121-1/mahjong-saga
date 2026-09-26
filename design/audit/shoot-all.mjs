/* 固定机位截图 —— 用来做「改动前后像素对照」。
   改 CSS 之前先跑一次拿到基线，改完再跑一次 diff，diff 非空就是回归。
   用法：node design/audit/shoot-all.mjs <输出目录>
*/
import { chromium } from '../../node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || '/tmp/opencode/shots';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const errs = [];
p.on('pageerror', e => errs.push('PE ' + e.message.slice(0, 120)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 120)); });

/* 关掉一切会动的随机源：过场动画、随机刷怪、随机掉落 */
async function still() {
  await p.addStyleTag({ content: `*,*::before,*::after{
      animation-play-state: paused !important; transition: none !important; }` });
}

/* ── s1 存档页 ── */
await p.goto('http://localhost:8765/pages/s1_save_select.html');
await p.waitForTimeout(1200); await still();
await p.screenshot({ path: `${OUT}/s1.png` });

/* ── s2：8 个 tab 全拍一遍（必须在点出征之前拍） ── */
await p.goto('http://localhost:8765/pages/s1_save_select.html');
await p.waitForTimeout(400);
await p.click('#btn-newgame'); await p.waitForTimeout(1600);
if (p.url().includes('s2')) {
  const tabs = await p.$$eval('#hub-top-nav .nav-item[data-panel]', els => els.map(e => e.dataset.panel));
  for (const t of tabs) {
    await p.click(`#hub-top-nav .nav-item[data-panel="${t}"]`);
    await p.waitForTimeout(650);
    await still();
    await p.screenshot({ path: `${OUT}/s2-${t}.png` });
  }
}

/* ── s3：进战斗 + 喂满手牌 ── */
if (!p.url().includes('s3_gameplay')) {
  await p.goto('http://localhost:8765/pages/s1_save_select.html'); await p.waitForTimeout(400);
  await p.click('#btn-newgame'); await p.waitForTimeout(1400);
  if (p.url().includes('s2')) { await p.click('#btn-hub-start'); await p.waitForTimeout(3000); }
}
if (p.url().includes('s3_gameplay')) {
  for (let i = 0; i < 12; i++) {
    if (!(await p.locator('#guide-overlay.active').count())) break;
    await p.evaluate(() => { const g = window.gameEngine; if (g) { g._guideDismissed = true; g._completeGuide(); } });
    await p.waitForTimeout(700);
  }
  await p.waitForSelector('.enemy', { timeout: 20000 }).catch(() => {});
  await p.evaluate(() => {
    const g = window.gameEngine;
    ['wan3','wan8','tong5','tong9','tiao2','tiao7','tiao1',
     'feng_dong','feng_xi','feng_nan','feng_bei',
     'jian_zhong','jian_fa','joker'].forEach(id => g._addTileToHand(id, id === 'joker'));
  });
  await p.waitForTimeout(1600); await still();
  await p.screenshot({ path: `${OUT}/s3-play.png` });
  await p.locator('#hand-tile-grid').screenshot({ path: `${OUT}/s3-hand.png` }).catch(() => {});
}
console.log('输出目录:', OUT);
console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
await b.close();
