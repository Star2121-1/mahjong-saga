/* 自检：加载顺序与运行时健康度。任一项失败 → 退出码非 0。
   用法：node design/audit/verify.mjs [s1|s2|s3]   不传则三页都查 */
import { chromium } from '../../node_modules/playwright/index.mjs';

const PAGES = process.argv[2] ? [process.argv[2]] : ['s1', 's2', 's3'];
const URLS = { s1: 's1_save_select', s2: 's2_main_hub', s3: 's3_gameplay' };
const b = await chromium.launch();
let fail = 0;

for (const id of PAGES) {
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  await p.goto(`http://localhost:8765/pages/${URLS[id]}.html`);
  await p.waitForTimeout(1500);

  /* s3 无存档会跳回 s1，必须走真实流程进去，否则检查跑在错误的页面上
     （踩过：window.gameEngine 报 undefined，其实是页面被重定向了） */
  if (id === 's3' && !p.url().includes('s3_gameplay')) {
    await p.goto('http://localhost:8765/pages/s1_save_select.html');
    await p.waitForTimeout(600);
    await p.click('#btn-newgame');
    await p.waitForTimeout(1200);
    if (p.url().includes('s2')) {
      await p.click('#btn-hub-start');
      await p.waitForTimeout(3000);
    }
    if (!p.url().includes('s3_gameplay')) { console.log('\n✘ s3 进不去，先修导航'); fail++; await ctx.close(); continue; }
  }
  await p.waitForTimeout(1200);

  const r = await p.evaluate(() => ({
    fx: typeof window.fxManager,
    balance: typeof window.Balance,
    systems: typeof window.Systems,
    mutatorPanel: typeof (window.Systems || {}).showMutatorPanel,
    overdrive: typeof ((window.gameEngine || {})._endOverdrive),
    engine: typeof window.gameEngine,
    saveMgr: typeof window.saveManager,
    hasCanvas: document.querySelectorAll('canvas').length,
  }));

  /* 断言：只查「坏了有没有人知道」的那些 */
  const checks = [
    ['无 console/page 错误', errs.length === 0, errs.slice(0, 3).join(' | ')],
    ['window.Balance 存在', r.balance === 'object', r.balance],
    ['window.saveManager 存在', r.saveMgr === 'object', r.saveMgr],
  ];
  if (id === 's3') {
    checks.push(
      ['window.fxManager 已实例化（飘字系统）', r.fx === 'object', r.fx],
      ['window.Systems.showMutatorPanel 已定义（突变面板）', r.mutatorPanel === 'function', r.mutatorPanel],
      ['_endOverdrive 已绑定', r.overdrive === 'function', r.overdrive],
      ['window.gameEngine 已实例化', r.engine === 'object', r.engine],
      ['仍是纯 DOM 渲染（无 canvas）', r.hasCanvas === 0, String(r.hasCanvas)],
    );
  }

  console.log(`\n── ${id}`);
  for (const [name, ok, got] of checks) {
    if (!ok) fail++;
    console.log(`   ${ok ? '✔' : '✘'} ${name}${ok ? '' : '   → 实际: ' + got}`);
  }
  await ctx.close();
}
await b.close();
console.log(fail ? `\n✘ ${fail} 项未通过` : '\n✔ 全部通过');
process.exit(fail ? 1 : 0);
