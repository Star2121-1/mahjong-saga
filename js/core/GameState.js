(function() {

/* ══════════════════════════════════════════════════════════════════
   GameState —— 局内状态与「重置本局」的唯一真相源
   ══════════════════════════════════════════════════════════════════

   为什么存在这个文件
   ─────────────────
   R324–R327 修的 4 个 P0 里有 3 个是同一类病：同一份「本局状态重置」
   被复制了三遍（Boot 续跑 / Combat 续波 / Endgame restart），每遍清单
   各不相同 —— 谁少清一个字段，就是一次跨局泄漏或一次通关级 bug：

     · _bossLordWave  只有 Combat.js:94 会置真 → 断点续跑忘了置 → 最终波永不刷 Boss（R327-P0）
     · gameOver       三处置位 → 兜底条件误判 → 满血「假通关」（R327-P0）
     · _pendingReward 波次结算 / 升级 / 突变三处各写 → 漏清 → 结算面板重复弹出

   每一处补救都留下了 R### 注释当墓碑，标记「为什么临时补这个字段」。
   墓碑越多，说明清单越没人能维护 —— 所以问题不是「少清一个字段」，
   而是**根本没有唯一的重置入口**。

   收束方式（不是包一层 getter/setter，那只是把 30 个写入点换个写法）：
     1. 清单只此一份 —— resetRun() 的字段列表 = 三处并集
     2. 补录/新字段必须改这里 → 「漏清」物理上不再可能
     3. Boss 波次不变量集中推导（isBossWave()），供续跑/续波/结算复用
   ══════════════════════════════════════════════════════════════════ */

/* Boss 波次的唯一判定口径。
   Combat 的「续下一波」和 Loop 的「最终波胜利」都必须问同一个问题，
   否则一边认为在 Boss 波、另一边不认为，就会出现「没打 Boss 就通关」。 */
window.isBossWave = function(engine) {
    return (engine._waveCount || 0) >= (engine._getMaxWaves() - 1);
};

/* ══════════════════════════════════════════════════════════════════
   isBlocked() —— 「引擎此刻是否不接受玩家输入/不推进游戏逻辑」

   第二个病根，和「三份重置清单」同源：
   同一个问题在 Boot.js 里被手写了 4 遍，**每遍的字段清单都不一样**：

     Boot.js:1032  Space   11 个字段
     Boot.js:1041  keyup   8 个  ← 少 _gambleActive / _mutatorPanelVisible / _announcingWave
     Boot.js:1047  nav     11 个字段
     Endgame.js:12  点击    10 个（又一套）

   keyup 少那三个 = 按下时没进面板、松开时进了 → 面板打开状态下松手不掉键位，
   关闭面板后玩家「莫名其妙自己往前走」。而 R326 修 _activeMutator 时，
   就是在这堆不一致里挑几处手工改的 —— 当时已经在打补丁了。

   收束：判定表只此一份，谁需要判断就调 isBlocked()，
   也不再需要每个调用方自己拼字段清单（拼错就漏，漏就是行为不一致）。
   ══════════════════════════════════════════════════════════════════ */

/* 阻断原因的取值 → 英文键（探针/日志用）。顺序即优先级，先命中先返回。 */
window.BLOCK_REASONS = {
    NOT_RUNNING:  '_notRunning',   /* running === false：暂停/未开始/已结束 */
    GAME_OVER:    'gameOver',      /* 死亡/胜利结算中 */
    PAUSED:       '_paused',       /* 暂停菜单 */
    REWARD:       '_pendingReward',    /* 升级/波次结算奖励面板 */
    LEVEL_UP:     '_levelUpPending',   /* 升级面板 */
    DISCARD:      '_discardMode',      /* 雀魂打牌（选牌） */
    HU_LOCK:      '_huLock',       /* 胡牌演出锁定 */
    GAMBLE:       '_pendingBossGamble', /* Boss 赌局（进行中才阻塞，已结算不再阻塞） */
    MUTATOR:      '_mutatorPanelVisible', /* 突变面板（R325 专用：与 _activeMutator 语义不同）*/
    ANNOUNCING:   '_announcingWave',    /* 波次公告 1.5s */
    GUIDE:        '_guideActive'        /* 教程遮罩 */
};

/* 返回第一个命中的阻断原因；无阻断返回 null。
   opts:
     inGuide  true = 教程遮罩可见也算阻断（默认 false，因为有些场景
              教程进行中玩家仍需能操作，R325 的 guide-playable 就是这个语义）
     drop     true = 松开按键（keyup）语义：与 keydown 同一套判定，
              避免「按下时未进面板、松开时进了」导致键位悬挂。 */
window.isBlocked = function(engine, opts) {
    var o = opts || {};
    var R = window.BLOCK_REASONS;
    if (!engine.running) return R.NOT_RUNNING;
    if (engine.gameOver) return R.GAME_OVER;
    if (engine._paused) return R.PAUSED;
    if (engine._pendingReward) return R.REWARD;
    if (engine._levelUpPending) return R.LEVEL_UP;
    if (engine._discardMode) return R.DISCARD;
    if (engine._huLock) return R.HU_LOCK;
    /* R326-P0：赌局用 _pendingBossGamble 判定「还在进行中」。
       _gambleActive 语义是「赌局流程已激活」（结算后仍为真），用它判断
       阻塞会永久卡死输入 —— 这正是 R326 修的 bug，现在由本表统一承载。 */
    if (engine._pendingBossGamble) return R.GAMBLE;
    /* R325-P1：突变面板可见性用 _mutatorPanelVisible，
       不能用 _activeMutator（后者是「已生效的突变 id」，波次中途一直为真）。 */
    if (engine._mutatorPanelVisible) return R.MUTATOR;
    if (engine._announcingWave) return R.ANNOUNCING;
    if (o.inGuide && engine.guideOverlay && engine.guideOverlay.classList.contains('active')) return R.GUIDE;
    return null;
};

/* 布尔便捷式：绝大多数调用方只需要「能不能动」。 */
window.isInputBlocked = function(engine, opts) {
    return window.isBlocked(engine, opts) !== null;
};

/* 一局结束时应回到的「全零状态」。
   字段 = Boot 续跑重置 ∪ Combat 续波重置 ∪ Endgame restart 重置 的并集，
   再补上构造函数字段（防止新增字段忘了进任何重置路径）。

   ⚠ 新增局内状态字段时，这里必须同步登记。
     构造函数里登记一次（见 GameEngine.js），resetRun 再兜底一次。 */
window.RUN_STATE_FIELDS = [
    /* ── 主循环 / 终局 ── */
    'running', 'gameOver', '_won', '_elapsed', '_paused',
    /* ── 波次推进 ── */
    '_waveCount', 'currentWaveSpawnedCount', '_spawnTimer', '_difficultyTimer', '_bossTimer',
    '_interWaveEvent', '_interWaveTimer', '_interWaveTimeout', '_announcingWave',
    /* ── 奖励 / 结算门 ── */
    '_pendingReward', '_levelUpPending', '_ignoreGemCollection', '_pendingBossLordSettle',
    '_pendingExpGems', '_expGems', '_activeCoins',
    /* ── Boss 领主（本次收束的重点：原本 7+10 个散落写入点）── */
    '_bossLord', '_bossLordWave', '_bossLordSpawned', '_bossLordSavedPhase',
    '_bossLordDefeated', '_finalBossDefeatedThisRun',
    /* ── 赌局 ── */
    '_gambleActive', '_gambleType', '_gambleStaked', '_gambleTimeout',
    '_pendingBossGamble', '_gambleAbyssBonus', '_monsterSurgeDoubleDrops',
    /* ── 突变 / 系统 ── */
    '_mutatorTriggered', '_activeMutator', '_mutatorPanelVisible',
    '_abyssPanelVisible', '_overdriveActive', '_overdriveTimer', '_overdriveCount',
    '_resonanceAuraTimer', '_shieldActive', '_shieldTimer', '_witherTimer',
    '_origMagnetRadius', '_bloodRageActive', '_godModeApplied', 'loopCount',
    /* ── 雀魂锁（续跑卡死 P0 所在的两个标志）── */
    '_huLock', '_discardMode', '_discardSel', '_jokersDropped', '_formedMelds',
    '_handTiles', '_handTileDeliverTimers', '_qqueenShieldTimer', '_mainSuit',
    /* ── 局内成就计数（跨局泄漏高发区）── */
    '_totalCritsThisRun', '_totalDodgesThisRun', '_bossKillsThisRun',
    '_finalBossKillsThisRun', '_maxGoldThisRun', '_playerHitCountThisRun',
    'playerHitCountInLevel1', 'stalkersKilledInLevel2',
    /* ── 深渊（R327 门禁抓出来的：三份手写清单全都漏了这批）── */
    '_abyssActiveCombo', '_abyssComboActivated', '_abyssFrenzyLifestealSet',
    '_abyssCoins', '_abyssLoopHpScale', '_abyssLoopAtkScale', '_abyssVariantEnabled',
    '_abyssUnlockedCombos', '_abyssShopVisible', '_witherAbyssTimer',
    '_bossWarningActive', '_bossMistEl',
    /* ── 攻速临时增益（三份清单里只有 Combat 顺带清过）── */
    '_tempAspd', '_tempAspdT', '_tempCritBonus', '_trailTimer', '_handFullToastAt', '_totalWaves',
    /* ── 临时增益 / 杂项 ── */
    '_tempEnemyAtkDebuff', '_tempEnemySpeedDebuff', '_tempBerserkBonus',
    '_tempShield', '_tempShieldEnd', '_tempAtkBoost', '_tempHpBonus',
    '_doubleCoinNextWave', '_tempGoldMult', '_origCdFloor',
    '_totems', '_trailTimers', '_skillGlowEls', '_activeWeapons',
    '_projectiles', '_enemyProjectiles', '_vaultMutations'
];

/* 每个字段的复位方式（默认 false；这里只标注特例）。 */
window.RUN_STATE_DEFAULTS = {
    running: false, gameOver: false, _won: false, _paused: false,
    _elapsed: 0, _spawnTimer: 0, _difficultyTimer: 0, _bossTimer: 0,
    _spawnInterval: 1.5,
    _waveCount: 0, currentWaveSpawnedCount: 0,
    _expGems: [], _activeCoins: [], _pendingExpGems: [], _totems: [], _trailTimers: [],
    _handTiles: [], _formedMelds: {}, _handTileDeliverTimers: [], _vaultMutations: [],
    _activeWeapons: [], _projectiles: [], _enemyProjectiles: [],
    _skillGlowEls: null, _bossLord: null, _bossLordSavedPhase: null, _origCdFloor: null,
    _origMagnetRadius: null, _abyssPanelVisible: false,
    _gambleType: null, _gambleTimeout: null, _discardSel: -1, _mainSuit: 'wan',
    _interWaveEvent: null, _tempGoldMult: 1,
    _abyssLoopHpScale: 1, _abyssLoopAtkScale: 1, _abyssCoins: 0,
    _bossMistEl: null, _handFullToastAt: 0, _trailTimer: 0,
    _totalWaves: 0
};

})();