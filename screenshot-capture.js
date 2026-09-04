const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8765';
const PAGES = [
  { name: 's1_save_select', url: BASE_URL + '/pages/s1_save_select.html' },
  { name: 's2_main_hub', url: BASE_URL + '/pages/s2_main_hub.html' },
  { name: 's3_gameplay', url: BASE_URL + '/pages/s3_gameplay.html' },
];
const RESOLUTIONS = [
  { label: '1280x720', w: 1280, h: 720 },
  { label: '1920x1080', w: 1920, h: 1080 },
  { label: '480x720', w: 480, h: 720 },
];

const OUT_DIR = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  let total = 0;

  for (const pageDef of PAGES) {
    for (const res of RESOLUTIONS) {
      const context = await browser.newContext({
        viewport: { width: res.w, height: res.h },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      page.on('pageerror', err =>
        console.error(`[PAGEERROR] ${res.label} ${pageDef.name}:`, err.message)
      );
      try {
        await page.goto(pageDef.url, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(800); // let animations settle
        const fname = `${pageDef.name}_${res.label}.png`;
        await page.screenshot({ path: path.join(OUT_DIR, fname), fullPage: false });
        total++;
        console.log(`✅ ${fname}`);
      } catch (e) {
        console.error(`❌ ${pageDef.name} @ ${res.label}: ${e.message}`);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
  console.log(`\nDone: ${total}/9 screenshots saved to ${OUT_DIR}/`);
}

run().catch(e => { console.error(e); process.exit(1); });
