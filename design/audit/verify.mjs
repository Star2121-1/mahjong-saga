/* 自检：加载顺序与运行时健康度。任一项失败 → 退出码非 0。
   用法：node design/audit/verify.mjs [s1|s2|s3]   不传则三页都查 */
import { chromium } from '../../node_modules/playwright/index.mjs';

import { readFileSync, readdirSync, existsSync } from 'node:fs';

/* ── 静态检查：牌面素材映射 ────────────────────────────────────────────
   TILE_ART 在 GameEngine.Spawn.js 的 IIFE 里，没导出，所以从源码正则取。
   比在浏览器里跑一遍再数 <img> 早得多，也不受时序影响。
   风险场景：素材被改名/误删 → 手牌整排空白且不报错（img 404 是静默的）。 */
function checkTileArt() {
  const out = { name: '牌面素材映射完整', ok: true, got: '' };
  try {
    const src = readFileSync('js/core/GameEngine.Spawn.js', 'utf8');
    const tbl = src.match(/var TILE_ART = \{([\s\S]*?)\n    \};/);
    if (!tbl) { out.ok = false; out.got = 'Spawn.js 里找不到 TILE_ART'; return out; }
    const pairs = [...tbl[1].matchAll(/(\w+)\s*:\s*'([^']+)'/g)];
    const missing = pairs.filter(([, , f]) => !existsSync('assets/tiles/' + f)).map(([, id, f]) => id + '→' + f);
    const onDisk = readdirSync('assets/tiles').filter(f => f.endsWith('.svg'));
    out.got = `${pairs.length} 映射 / ${onDisk.length} 文件` + (missing.length ? ' | 缺: ' + missing.join(', ') : '');
    out.ok = !missing.length;
    /* 反向：磁盘上多出来的孤儿文件（改了 id 但没删旧图）也要报出来 */
    const used = new Set(pairs.map(([, , f]) => f));
    const orphan = onDisk.filter(f => !used.has(f));
    if (orphan.length) { out.ok = false; out.got += ' | 孤儿: ' + orphan.join(','); }
  } catch (e) { out.ok = false; out.got = e.message; }
  return out;
}

const PAGES = process.argv[2] ? [process.argv[2]] : ['s1', 's2', 's3'];
const URLS = { s1: 's1_save_select', s2: 's2_main_hub', s3: 's3_gameplay' };
const b = await chromium.launch();
let fail = 0;

for (const id of PAGES) {
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
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

/* 静态检查不依赖服务器，任何时候都跑 */
{
  const c = checkTileArt();
  if (!c.ok) fail++;
  console.log(`\n── 静态`);
  console.log(`   ${c.ok ? '✔' : '✘'} ${c.name}${c.ok ? '   → ' + c.got : '   → ' + c.got}`);
}

console.log(fail ? `\n✘ ${fail} 项未通过` : '\n✔ 全部通过');
process.exit(fail ? 1 : 0);
