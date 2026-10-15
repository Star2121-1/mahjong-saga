/* 全状态视觉审计 —— 把「面板从没被截图过」这个洞补上
 *
 * 为什么单独写一个：
 *   shoot-all.mjs 只覆盖 12 个状态，**面板类状态一个都没截**
 *   （升级/赌局/暂停/突变/深渊/商店/胡牌/结算）。
 *   R325 的升级卡片被裁、R327 的引导糊脸，全都是靠**用户截图**才发现的 ——
 *   门禁能测「能不能用」，测不了「长得怎么样」，
 *   而「长得怎么样」恰恰是没有任何自动检查的那一半。
 *
 *   这个脚本把每一个会盖住玩家视线的面板都强制打开并截图，
 *   配合 stylediff.mjs 就能做「改 CSS 前后不许漂移」的门禁。
 *
 * 用法：
 *   node design/audit/shoot-states.mjs [输出目录]
 *   基线: node design/audit/shoot-states.mjs /tmp/opencode/base
 *   改动后: node design/audit/shoot-states.mjs /tmp/opencode/after
 */
import { chromium } from '../../node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || '/tmp/opencode/states';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const errs = [];
p.on('pageerror', e => errs.push('PE ' + e.message.slice(0, 120)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 120)); });

async function still() {
  await p.addStyleTag({ content: `*,*::before,*::after{
      animation-play-state: paused !important; transition: none !important; }` });
}
/* 强制显示某个遮罩（绕过所有业务前置条件，纯视觉取证） */
async function force(sel, tag) {
  const n = await p.locator(sel).count();
  if (!n) { console.log(`  ⚠ ${tag}: ${sel} 不存在`); return false; }
  await p.evaluate(s => {
    document.querySelectorAll(s).forEach(el => { el.classList.add('active'); el.style.display = ''; });
  }, sel);
  await p.waitForTimeout(350);
  await still();
  await p.screenshot({ path: `${OUT}/${tag}.png` });
  return true;
}

/* ── 进战斗页 ── */
await p.goto('http://127.0.0.1:8765/pages/s1_save_select.html');
await p.waitForTimeout(400);
await p.click('#btn-newgame'); await p.waitForTimeout(1400);
if (p.url().includes('s2')) { await p.click('#btn-hub-start'); await p.waitForTimeout(3000); }

if (!p.url().includes('s3_gameplay')) {
  console.log('⚠ 没进到战斗页，状态截图中止');
  await b.close(); process.exit(1);
}

/* 关掉教程 + 喂满手牌（否则所有面板截图都带着引导卡） */
for (let i = 0; i < 12; i++) {
  if (!(await p.locator('#guide-overlay.active').count())) break;
  await p.evaluate(() => { const g = window.gameEngine; if (g) { g._guideDismissed = true; g._completeGuide(); } });
  await p.waitForTimeout(600);
}
await p.waitForSelector('.enemy', { timeout: 25000 }).catch(() => {});
await p.evaluate(() => {
  const g = window.gameEngine;
  ['wan3','wan8','tong5','tong9','tiao2','tiao7','tiao1',
   'feng_dong','feng_xi','feng_nan','feng_bei',
   'jian_zhong','jian_fa','joker'].forEach(id => g._addTileToHand(id, id === 'joker'));
  g._showWaveBanner && g._showWaveBanner(3);
});
await p.waitForTimeout(1800);

/* ── 基准：正常战斗 ── */
await still();
await p.screenshot({ path: `${OUT}/00-battle.png` });

/* ── 面板全谱 ── */
const PANELS = [
  ['__reward__',             '01-reward'],
  ['__mutator__',            '02-mutator'],
  ['#pause-overlay',         '03-pause'],
  ['#pause-settings-panel',  '04-pause-settings'],
  ['#guide-overlay',         '05-guide'],
  ['#victory-overlay',       '06-victory'],
  ['#game-over-overlay',     '07-gameover'],
  ['#death-compensation',    '08-death-compensation'],
  ['#wave-milestone-banner', '09-milestone'],
  ['#resonance-pills',       '10-resonance'],
  ['#game-announcements',    '11-announcements'],
  ['#vol-feedback',          '12-volume'],
  /* 这三个是 JS 动态 createElement 建出来的，静态 HTML 里查不到，
     所以要调用引擎自己的开面板函数来生成，不能只加 class */
  ['__gamble__',             '13-boss-gamble'],
  ['__abyss__',              '14-abyss-panel'],
  ['__abyssshop__',          '15-abyss-shop'],
];
console.log('面板状态:');
/* ⚠ R330 教训：一开始这些面板是用「只加 .active 类」截的，结果全是空的 ——
   .reward-cards / .mutator-choices 的尺寸是 0×0，因为内容是 JS 运行时填进去的。
   更糟的是我据此差点去「修」CSS —— 实际上 align-items:center 让 .reward-title
   收缩到 131px 是**正确行为**，不是 bug。**空截图不能用来诊断布局。**
   下面一律走引擎自己的开面板接口，拿到真实填充内容后再拍。 */
const NATIVE = {
  __reward__:  () => { const r = window.rewardManager; r._forceDemo = true;
                      r.showLevelUpPanel(); },
  __mutator__: () => { window.Systems && window.Systems.showMutatorPanel(window.gameEngine); },
};
for (const [sel, tag] of PANELS) {
  if (NATIVE[sel]) {
    await p.evaluate(f => eval(f), `(${NATIVE[sel].toString()})()`);
    await p.waitForTimeout(500); await still();
    await p.screenshot({ path: `${OUT}/${tag}.png` });
    await p.evaluate(() => { const g = window.gameEngine;
      g._pendingReward = false; g._pendingBossLordSettle = false;
      if (window.rewardManager) window.rewardManager.hidePanel();
      document.querySelectorAll('#reward-overlay,#mutator-overlay').forEach(e => e.classList.remove('active')); });
    continue;
  }
  if (sel === '__gamble__') {
    await p.evaluate(() => { const g = window.gameEngine;
      g._pendingBossLordSettle = true; g._bossLordSpawned = true;
      g._gambleType = 'gold'; g._pendingBossGamble = true;
      typeof g._showBossGamble === 'function' ? g._showBossGamble()
        : (window.Systems && window.Systems.showBossGamble && window.Systems.showBossGamble(g)); });
    await p.waitForTimeout(400); await still();
    await p.screenshot({ path: `${OUT}/${tag}.png` });
    await p.evaluate(() => { const el = document.getElementById('boss-gamble-panel'); if (el) el.remove(); });
    continue;
  }
  if (sel === '__abyss__' || sel === '__abyssshop__') {
    await p.evaluate(which => { const g = window.gameEngine;
      if (which === 'abyss') g._showAbyssPanel && g._showAbyssPanel();
      else g._showAbyssShop && g._showAbyssShop(); }, sel === '__abyss__' ? 'abyss' : 'shop');
    await p.waitForTimeout(400); await still();
    const id = sel === '__abyss__' ? 'abyss-panel' : 'abyss-shop-panel';
    await p.screenshot({ path: `${OUT}/${tag}.png` });
    await p.evaluate(i => { const el = document.getElementById(i); if (el) el.remove(); }, id);
    continue;
  }
  await force(sel, tag);
}

/* 战斗页 HUD 组件单独拍（便于局部改动时对照） */
console.log('HUD 组件:');
const HUD = [
  ['#top-bar', 'hud-topbar'],
  ['#hand-tile-bar', 'hud-hand'],
  ['#rage-bar-container', 'hud-rage'],
  ['#player-hp-wrap', 'hud-playerhp'],
  ['#weapon-slot-bar', 'hud-weapons'],
  ['#bottom-bar', 'hud-bottom'],
];
for (const [sel, tag] of HUD) {
  const n = await p.locator(sel).count();
  if (n) {
    await p.locator(sel).first().screenshot({ path: `${OUT}/${tag}.png` }).catch(() => {});
  } else console.log(`  ⚠ ${tag}: ${sel} 不存在`);
}

/* ── s2 大本营：常驻右栏（出征准备）单独拍 ── */
await p.goto('http://127.0.0.1:8765/pages/s2_main_hub.html');
await p.waitForTimeout(2000);
const rail = await p.locator('#hub-expedition-rail').count();
if (rail) {
  await still();
  await p.locator('#hub-expedition-rail').screenshot({ path: `${OUT}/20-s2-rail.png` }).catch(() => {});
  console.log('  ✔ s2-rail');
} else console.log('  ⚠ #hub-expedition-rail 不存在');

console.log('输出目录:', OUT);
console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
await b.close();
