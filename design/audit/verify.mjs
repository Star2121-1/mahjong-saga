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

  /* R327: 局内状态字段登记表与实际代码的一致性。
     R324–R327 的 4 个 P0 里有 3 个同源 —— 「本局状态重置」被复制了三遍，
     少清一个字段就是一个跨局泄漏/通关 bug。这里把 R### 墓碑换成本门禁：
     新增一个 this._xxx 局内字段却没登记进 RUN_STATE_FIELDS，门禁立刻红。 */
  const fs2 = await import('node:fs');
  const st = fs2.readFileSync('js/core/GameState.js', 'utf8');
  const listBody = st.match(/RUN_STATE_FIELDS = \[([\s\S]*?)\]/);
  const registered = new Set((listBody ? listBody[1].matchAll(/'([^']+)'/g) : []).map(m => m[1]));

  /* 扫描引擎各模块，找出「疑似局内状态」的 this._xxx 字段 */
  const SUSPECT = /^(?:_pending|_boss|_gamble|_mutator|_overdrive|_bossLord|_huLock|_discard|_temp[A-Z]|_shield|_wither|_resonance|_trail|_hand[A-Z]|_skillGlow|_announcing|_interWave|_abyss|_monsterSurge|_total|_maxGold|_playerHit|_origCd|_finalBoss|_levelUp|_ignoreGem|_vaultMut|_formedMeld|_jokers|_mainSuit|loopCount$|gameOver$|running$|_won$|_elapsed$|_paused$|_waveCount$|currentWaveSpawnedCount$|playerHitCountInLevel1$|stalkersKilledInLevel2$)/;
  const found = new Set();
  for (const f of fs2.readdirSync('js/core')) {
    if (!/^GameEngine.*\.js$|^GameSpawner\.js$|^GameSystems\.js$/.test(f)) continue;
    const txt = fs2.readFileSync('js/core/' + f, 'utf8');
    for (const m of txt.matchAll(/(?:this|engine|self)\.(_?[A-Za-z_$][\w$]*)\s*=[^=]/g)) {
      if (SUSPECT.test(m[1])) found.add(m[1]);
    }
  }
  /* SpawnSystem/Systems 有自己的副本字段，不要求进登记表 */
  const OWN_COPY = /^(?:_spawnTimer|_difficultyTimer|_bossTimer|_currentWaveSpawnedCount|_spawnInterval|_spawnIntervalDecay|_spawnIntervalMin|_enemyTypeWeights|_currentLevelId|_mapW|_mapH|_waveCount|_totems|_enemyProjectiles|_bossLordWave|_bossLordSpawned|_bossLord|_difficultyTimer)$/;
  /* DOM 元素引用与监听器绑定：由各自模块管理（重置时删掉 DOM 再重新查询），
     塞进字段表反而会毁掉引用。新增 DOM 引用字段时一并加进这里。 */
  const DOM_REF = /^(?:_abyssMistEl|_bossWarningEl|_handClicksBound|_handTileBar|_handTileClickListener|_handTileGrid|_handTileSlots)$/;
  const missing = [...found].filter(x => !registered.has(x) && !OWN_COPY.test(x) && !DOM_REF.test(x)).sort();

  /* R328: 「引擎是否阻断」的手写守卫禁令。
     原来同一判断在 4 处手写，清单各不相同（keyup 比 keydown 少 3 个条件
     → 按下时没进面板、松开时进了 → 键位悬挂，关闭面板后玩家自己往前走）。
     现在判定表在 GameState.isBlocked()，此处禁止再有人手拼字段清单。 */
  const GUARD_HINT = /(?:running|gameOver|_paused|_pendingReward|_levelUpPending|_discardMode|_huLock|_pendingBossGamble|_gambleActive|_mutatorPanelVisible|_announcingWave)/;
  const handWritten = [];
  for (const f of fs2.readdirSync('js/core')) {
    if (!/^GameEngine.*\.js$/.test(f)) continue;
    const txt = fs2.readFileSync('js/core/' + f, 'utf8');
    txt.split('\n').forEach((ln, i) => {
      if (/\/\*|\/\//.test(ln)) return;                    /* 注释行不算 */
      if (ln.includes('isInputBlocked') || ln.includes('isBlocked')) return;  /* 已收束 */
      /* 只抓「|| 串联 3 个以上阻断字段」的判断行 */
      const ors = ln.split('||').filter(x => GUARD_HINT.test(x)).length;
      if (ors >= 3) handWritten.push(`${f}:${i + 1}`);
    });
  }
  const gOk = handWritten.length === 0;
  if (!gOk) fail++;
  console.log(`   ${gOk ? '✔' : '✘'} 阻断判定已统一走 GameState.isBlocked()`);
  if (!gOk) console.log(`      仍有手写守卫: ${handWritten.join(', ')}\n      → 改用 window.isInputBlocked(engine)，避免同一判断多份清单互相不一致`);

  /* R328-3: 「同一语义两个变量」的误用禁令。
     `_activeMutator` = 已生效的突变 id（有值且波次中途一直为真）
     `_mutatorPanelVisible` = 突变面板是否可见（阻断输入）
     两者极易混用：R326 我手工改了 4 处，Loop.js:252 那处直到 R328 才被发现 ——
     它的注释写着「防止在活跃面板期间误触发」，实际查的却是 _activeMutator，
     导致突变激活过后深渊 combo **永久无法自动激活**。

     规则：涉及面板可见 / 阻断 / 输入的语境，不得用 _activeMutator
     （`_activeMutator === null` 当「没突变」是合法的，不在此列）。 */
  const MUT_ID = /_activeMutator(?![\w$])/;
  const CTX_BAD = /(?:PanelVisible|isInputBlocked|isBlocked|blocked|_paused|_pendingReward|_levelUpPending|_announcingWave|input|keydown|keyup|nav|freeze|Space)/i;
  const misuse = [];
  for (const f of fs2.readdirSync('js/core')) {
    if (!/\.js$/.test(f)) continue;
    /* 逐行扫描，但跟踪块注释状态 —— 块注释的中间行不含 '/*'，
       只按「本行含注释符」过滤会漏掉它们（Boot.js:1028 就是这种）。 */
    const txt = fs2.readFileSync('js/core/' + f, 'utf8');
    let inBlock = false;
    txt.split('\n').forEach((ln, i) => {
      const opens = ln.indexOf('/*') >= 0, closes = ln.indexOf('*/') >= 0;
      if (inBlock) { if (closes) inBlock = false; return; }
      if (ln.includes('//')) return;
      if (opens && !closes) { inBlock = true; return; }
      if (/^\s*['"]/.test(ln)) return;                    /* 字段登记表不算 */
      if (/^\s*[A-Z_]+:/.test(ln)) return;                /* 枚举定义不算 */
      if (MUT_ID.test(ln) && /=\s*(null|false|true|'|\d)/.test(ln)) return;  /* 赋值不算 */
      if (/=== '\w+'|_activeMutator === '|hasMutator|applyMutator/.test(ln)) return; /* 突变效果语境合法 */
      if (!MUT_ID.test(ln)) return;
      if (ln.includes('=== null') || ln.includes('!== null')) return;  /* 「没有突变」语义合法 */
      if (!CTX_BAD.test(ln)) return;                                    /* 突变效果语境合法 */
      misuse.push(`${f}:${i + 1}`);
    });
  }
  /* R330: 圆角纪律。
     css/tokens.css 写着「默认全直角，只有 2 个受控例外（牌 3px / 弹层 2px），
     除此之外不许出现圆角」—— 但 gameplay-overlay.css 一个文件里就混着
     11 种圆角（6/10/16/8/14/50/4/3/12px）。
     「有规范」和「守规范」是两件事，所以把它变成门禁。 */
  const ALLOWED_RADIUS = new Set(['0px', '3px', '2px', '50%']);
  const radiusHavoc = [];
  /* 范围：只扫战斗页（s3）与共享层。
     s2 大本营（css/main_hub.css + theme/05-hub.css）另有 60+ 处历史圆角，
     它们是另一套视觉语言、另一次重排的范围 —— 一次性把 93 处全判红只会
     让门禁变成没人看的噪音（这正是 CLAUDE.md 里「不要为了让响应式好看而
     去掉 !important」警告过的失败模式：规则一旦大到没人执行，就等于没有）。
     → 逐步收紧：本轮只管 s3，s2 另立一轮再纳入。 */
  const SCAN = ['common.css', 'tokens.css',
    ...fs2.readdirSync('css/gameplay').map(x => 'gameplay/' + x),
    ...fs2.readdirSync('css/theme').filter(x => /0[1346]-/.test(x)).map(x => 'theme/' + x)];
  for (const f of SCAN) {
    const full = 'css/' + f;
    let txt; try { txt = fs2.readFileSync(full, 'utf8'); } catch { continue; }
    txt.split('\n').forEach((ln, i) => {
      if (/\/\*|\/\//.test(ln)) return;
      const m = ln.match(/border-radius:\s*([^;]+);/);
      if (!m) return;
      const v = m[1].trim();
      /* var(--r-*) / calc() / inherit 直接放行 —— 它们不是「新值」 */
      if (/^var\(|^calc\(|^inherit$/.test(v)) return;
      /* 先剥掉 !important，否则 '0px !important' 会被切成 ['0px','!important'] */
      const bare = v.replace(/\s*!important\s*$/, '').trim();
      for (const part of bare.split(/\s+/)) {
        if (!part || ALLOWED_RADIUS.has(part)) continue;
        /* 圆形：999px / 50% 都表示「正圆」，归一化后放行 */
        if (parseFloat(part) >= 999) continue;
        radiusHavoc.push(`${f}:${i + 1} ${part}`);
      }
    });
  }
  const rOk = radiusHavoc.length === 0;
  if (!rOk) fail++;
  console.log(`   ${rOk ? '✔' : '✘'} 圆角纪律 · 战斗页（只允许 0/2/3px 与 50%）`);
  if (!rOk) console.log(`      违规 ${radiusHavoc.length} 处: ${radiusHavoc.slice(0, 8).join(', ')}${radiusHavoc.length > 8 ? ' …' : ''}\n      → 用 var(--panel-radius) 或收进 tokens.css 的受控例外
      注：s2 大本营（main_hub.css / theme/05-hub.css）本轮不在范围内`);

  const mOk = misuse.length === 0;
  if (!mOk) fail++;
  console.log(`   ${mOk ? '✔' : '✘'} 面板语境未误用 _activeMutator（应改用 _mutatorPanelVisible）`);
  if (!mOk) console.log(`      误用: ${misuse.join(', ')}`);
  const ok = missing.length === 0;
  if (!ok) fail++;
  console.log(`   ${ok ? '✔' : '✘'} 局内状态字段已登记入 RUN_STATE_FIELDS${ok ? `   → ${registered.size} 个字段，0 漏登` : ''}`);
  if (!ok) console.log(`      漏登: ${missing.join(', ')}\n      → 加进 js/core/GameState.js 的 RUN_STATE_FIELDS，否则三处重置会漏清它`);
}

console.log(fail ? `\n✘ ${fail} 项未通过` : '\n✔ 全部通过');
process.exit(fail ? 1 : 0);
