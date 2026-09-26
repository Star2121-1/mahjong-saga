/* 视口架构不变量：容器永远是 BASE_W × BASE_H，只有 transform: scale() 在变。
   用法：node design/audit/probe-viewport.mjs

   为什么这条要守住（踩过一次）：
   源 CSS 里有大量 @media 断点，但本项目是**固定分辨率画布 + transform 缩放**架构 ——
   responsive.js 把容器钉死成 1920×1080（s1 是 480×720），布局永远按这个尺寸算，
   然后整体 scale。所以 @media 是按**真实视口**判断的，它触发时会去缩小一个
   本来就要被整体缩小的画布里的元素 = 双重缩小，严格更差。

   主题覆盖层大量 !important 恰好把这些断点压死了（副作用，但是对的）。
   如果哪天有人把 !important 去掉「修好断点」，画面会明显变小 —— 就是这个原因。

   所以这个探针反过来守：一旦容器尺寸随视口变化（有人改成流式布局），
   那些 @media 就会突然变正确也突然变关键，必须同时重新评估 15 处覆盖。
   本探针会变红，提醒重新审视。 */
import { chromium } from '../../node_modules/playwright/index.mjs';
const b = await chromium.launch();
const CASES = [
  ['pages/s2_main_hub.html', 'main-hub-screen', 1920, 1080, 's2 大本营 1920×1080'],
  ['pages/s1_save_select.html', 'save-select-screen', 480, 720, 's1 存档页 480×720'],
];
const VIEWPORTS = [[1920, 1080], [1366, 768], [1024, 768], [390, 844]];
let bad = 0;
for (const [url, id, bw, bh, label] of CASES) {
  console.log(`\n── ${label}`);
  for (const [w, h] of VIEWPORTS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await p.goto('http://localhost:8765/' + url);
    await p.waitForTimeout(1300);
    const r = await p.evaluate((el) => {
      const c = document.getElementById(el);
      if (!c) return null;
      return { off: c.offsetWidth + 'x' + c.offsetHeight, tf: getComputedStyle(c).transform };
    }, id);
    if (!r) { console.log(`   ${String(w + 'x' + h).padEnd(10)} 容器 #${id} 不存在`); bad++; continue; }
    const okLayout = r.off === `${bw}x${bh}`;
    const scaled = r.tf !== 'none';
    if (!okLayout) bad++;
    console.log(`   视口 ${String(w + 'x' + h).padEnd(10)} 布局尺寸 ${r.off.padEnd(10)} ${okLayout ? '✔' : `✘ 期望 ${bw}x${bh}`}  transform ${scaled ? '已缩放 ✔' : '未缩放 ✘'}`);
    await ctx.close();
  }
}
await b.close();
console.log(bad ? `\n✘ ${bad} 项不变量被破坏 —— 架构可能已改成流式布局，需重新评估源 CSS 的 @media 断点` : '\n✔ 固定画布 + 缩放 架构完好');
process.exit(bad ? 1 : 0);
