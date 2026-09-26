/* 统一取证：探测 + 截图 + 落盘。baseline / compare 都调它。
   用法：node design/audit/shoot.mjs <输出子目录名> */
import { chromium } from '../../node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { PAGES, enterReal, PROBE } from './probe.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const tag = process.argv[2] || 'snap';
const OUT = path.join(DIR, tag);
fs.mkdirSync(OUT, { recursive: true });

const rep = { at: new Date().toISOString(), tag, pages: {} };
const b = await chromium.launch();
for (const id of ['s1', 's2', 's3']) {
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  await p.goto(`http://localhost:8765/pages/${PAGES[id]}.html`);
  await p.waitForTimeout(1500);
  await enterReal(p, id);
  await p.waitForTimeout(1800);
  const probe = await p.evaluate(PROBE);
  await p.screenshot({ path: path.join(OUT, `${id}.png`) });
  rep.pages[id] = { ...probe, consoleErrors: errs };
  await ctx.close();
}
await b.close();
fs.writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify(rep, null, 2));
console.log(`✔ 取证 → design/audit/${tag}/`);
for (const id of ['s1','s2','s3']) {
  const r = rep.pages[id];
  console.log(`   ${id}  错误 ${r.consoleErrors.length}  节点 ${r.nodes}  色值 ${r.uniqueColors}  圆角 ${r.radii}  溢出 ${r.overflowX}`);
}
