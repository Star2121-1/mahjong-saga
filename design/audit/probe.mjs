/* 共享探针 —— baseline.js 与 compare.js 必须用同一个函数测量，
   否则「前后对比」是拿量纲不一致的数字互比（已踩过这个坑）。 */
export const PAGES = { s1: 's1_save_select', s2: 's2_main_hub', s3: 's3_gameplay' };

/** s3 无存档会跳回 s1。必须走真实流程进去，否则测量跑在错误的页面上。 */
export async function enterReal(page, id) {
  if (id !== 's3') return;
  if (page.url().includes('s3_gameplay')) return;
  await page.goto('http://localhost:8765/pages/s1_save_select.html');
  await page.waitForTimeout(500);
  await page.click('#btn-newgame');
  await page.waitForTimeout(1200);
  if (page.url().includes('s2')) { await page.click('#btn-hub-start'); await page.waitForTimeout(3000); }
  /* 新存档 hasSeenGuide=false → 截图只会拍到新手指引，测不到真正的战斗 HUD。
     直接调引擎自带的 _completeGuide()（GameEngine.Guide.js:143），比模拟点击可靠。
     这个坑踩过一次：测出来的节点数/色值全是引导层的。 */
  await page.evaluate(() => {
    if (window.gameEngine && window.gameEngine._completeGuide) window.gameEngine._completeGuide();
  });
  await page.waitForTimeout(900);
  /* 走两步 + 打几下，让敌人与飘字真的出现（否则 FxManager.init 懒加载不会触发） */
  await page.keyboard.down('KeyA'); await page.waitForTimeout(500); await page.keyboard.up('KeyA');
  await page.keyboard.down('KeyD'); await page.waitForTimeout(700); await page.keyboard.up('KeyD');
  for (let i = 0; i < 5; i++) { await page.mouse.click(760 + i * 130, 540); await page.waitForTimeout(280); }
  await page.waitForTimeout(1200);
}

export const PROBE = () => {
  const all = [].slice.call(document.querySelectorAll('body *'));
  const vw = document.documentElement.clientWidth;
  const over = all.filter(e => e.getBoundingClientRect().right > vw + 2)
                 .slice(0, 5).map(e => (e.id || e.className || e.tagName).toString().slice(0, 40));
  const cols = new Set();
  for (const e of all) {
    const c = getComputedStyle(e);
    [c.color, c.backgroundColor, c.borderTopColor, c.borderColor, c.outlineColor].forEach(v => {
      const m = /rgba?\((\d+), (\d+), (\d+)/.exec(v);
      if (m && m[1] + m[2] + m[3] !== '000') cols.add(m.slice(1, 4).join(','));
    });
  }
  const radii = new Set();
  for (const e of all) { const r = getComputedStyle(e).borderTopLeftRadius; if (r && r !== '0px') radii.add(r); }
  return {
    url: location.pathname,
    nodes: all.length,
    overflowX: document.documentElement.scrollWidth > vw,
    over,
    uniqueColors: cols.size,
    radii: radii.size,
    radiusValues: [].slice.call(radii).sort().slice(0, 12),
    fx: typeof window.fxManager,
    engine: typeof window.gameEngine,
    mutator: typeof (window.Systems || {}).showMutatorPanel,
  };
};
