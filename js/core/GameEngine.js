(function() {

/* ══════════════════════════════════════════════
   Epoch 5: 模块委托代理
   ══════════════════════════════════════════════ */
if (window.SpawnSystem) window.SpawnSystem.init = window.SpawnSystem.init || function(engine) { this.engine = engine; };
if (window.CombatSystem) window.CombatSystem.init = window.CombatSystem.init || function(engine) { this.engine = engine; };
if (window.Systems) window.Systems.init = window.Systems.init || function(engine) { this.engine = engine; };

window.GameEngine = function() {
    this._currentLevelId = 'level_1';
    this._heroIds = ['Hero', 'Knight', 'Mage', 'Assassin'];

    this.running = false;
    this.gameOver = false;
    this._won = false; /* R136-P0: 胜利标记 — gameOver在_settleRun前已置true，用此字段区分胜负 */
    this._elapsed = 0;
    this.kills = 0;
    this._spawnTimer = 0;
    this._spawnInterval = 1.5;
    this._difficultyTimer = 0;
    this._bossTimer = 0;

    this._mapW = 1500;
    this._mapH = 1500;

    this.player = null;
    this.enemies = [];
    this._enemyIdCounter = 0;
    this._enemyElements = new Map();

    this._activeCoins = [];
    this._pendingReward = false;
    this._waveCount = 0;
    this.currentWaveSpawnedCount = 0;
    this._interWaveEvent = null;
    this._interWaveTimer = 0;
    this._interWaveTimeout = null; /* R217-P1: 初始化波次超时令牌，防止重启路径下 clearTimeout(null) 静默失败 */

    /* 雀魂系统状态（HUPAI_DESIGN.md v2.0） */
    this._handTiles = [];        /* 上阵装备区：最多14张 */
    this._formedMelds = {};      /* 已触发面子签名（一次性增益防重） */
    this._jokersDropped = 0;     /* 癞子掉落计数（上限3） */
    this._mainSuit = 'wan';      /* 主花色（V2 由本局任务指定） */
    this._runSeq = 0;            /* P0-1: 局序号令牌 — 结算防 restart 竞态 */

    this.cameraX = 0;
    this.cameraY = 0;

    this._lastTime = 0;
    this._boundLoop = null; // bound in init() after all modules loaded

    this._pressedKeys = {};
    this._joystickDX = 0;
    this._joystickDY = 0;
    this._joystickActive = false;
    this._lastMoveX = 0;

    this._expGems = [];
    this._pendingExpGems = []; /* R266-P1: 初始化待合并经验石队列，防止跨局残留 */
    this._levelUpPending = false;
    this._ignoreGemCollection = false;
    this._mutatorTriggered = false;
    this._activeMutator = null;
    this._mutatorPanelVisible = false; /* R325-P1 */
    this._abyssPanelVisible = false;
    this.loopCount = 0;
    this._pendingBossLordSettle = false;
    this.playerHitCountInLevel1 = 0;
    this.stalkersKilledInLevel2 = 0;
    this._godModeApplied = false;
    this._bloodRageActive = false;
    this._totems = [];
    this._activeWeapons = [];
    this._projectiles = [];
    this._lastClickAngle = 0;
    this._weaponSlotsEl = null;
    this._enemyProjectiles = [];
    this._skillGlowEls = null; /* R257-P1: 显式初始化，防止lazy-init路径被绕过时undefined崩溃 */
    this._bossLord = null;
    this._bossLordWave = false;
    this._bossLordSpawned = false;
    this._bossLordSavedPhase = null; /* R234-P1: Boss相位断点续玩恢复字段初始化 */

    this._overdriveActive = false;
    this._overdriveTimer = 0;
    this._vaultMutations = [];
    this._resonanceAuraTimer = 0;
    this._shieldActive = false;
    this._shieldTimer = 0;
    this._tempShield = 0;
    this._tempShieldEnd = 0;
    this._tempAtkBoost = 0;
    this._tempHpBonus = 0;
    this._doubleCoinNextWave = false;
    this._tempGoldMult = 1;
    this._tempBerserkBonus = false;
    this._shakeTimer = 0;
    this._shakeIntensity = 0;
    this._witherTimer = 0;
    this._origMagnetRadius = null; /* R272-P1: 引力突变存储原始磁铁范围，断点续玩必须序列化 */
    this._paused = false;
    this.pauseOverlay = null;
    this._trailTimers = []; /* R278-P1: 追踪player trail setTimeout，防止game over后DOM泄漏 */
    this._overdriveCount = 0;
    this._maxGoldThisRun = 0;
    this._totalCritsThisRun = 0;
    this._totalDodgesThisRun = 0;
    this._bossKillsThisRun = 0;
    this._finalBossKillsThisRun = 0;
    this._playerHitCountThisRun = 0; /* R258-P0: 成就完美通关计数，防止undefined++导致NaN永久破坏成就 */

    this.battlefield = null;
    this.container = null;
    this._worldLayer = null;
    this.playerEl = null;
    this.playerHpFill = null;
    this.playerHpText = null;
    this.goldDisplay = null;
    this.atkDisplay = null;
    this.killsDisplay = null;
    this.timeDisplay = null;
    this.waveDisplay = null;
    this.gameOverOverlay = null;
    this.resultTime = null;
    this.resultKills = null;
    this.resultWave = null;
    this.restartBtn = null;
    this.victoryOverlay = null;
    this.victoryTime = null;
    this.victoryKills = null;
    this.victoryRelics = null;
    this.victoryTokens = null;
    this.victoryRestartBtn = null;
    this.victoryHubBtn = null;
    this.victoryContinueBtn = null;
    this.victoryTipsEl = null;
    this.waveMilestoneBanner = null;
    this._joystickBase = null;
    this._joystickKnob = null;
    this.hubBtn = null;

    /* ── Boss Gamble ── */
    this._gambleActive = false;
    this._monsterSurgeDoubleDrops = false; /* R89-P1: 防止怪物潮标志跨局残留 */
    this._gambleType = null;
    this._gambleStaked = 0;
    this._pendingBossGamble = false; /* R234-P0: 构造函数补齐初始化，与restart/startNewRun保持一致 */
    this._gambleTimeout = null; /* R234-P0: 构造函数补齐初始化，防止clearTimeout(undefined) */
};

/* ══════════════════════════════════════════════════════════════════
   resetRun() —— 「重置本局状态」的唯一入口

   R327 收束。此前 Boot 续跑 / Combat 续波 / Endgame restart 各手写一份
   清单（字段 40+，各带 R### 墓碑注释），少清一个字段就是一个跨局 P0。

   opts:
     keepWave   true = 保留 _waveCount（断点续跑用，随后再按快照覆盖）
     silent     true = 不打印（默认）
   ══════════════════════════════════════════════════════════════════ */
window.GameEngine.prototype.resetRun = function(opts) {
    var o = opts || {};
    var fields = window.RUN_STATE_FIELDS;
    var defaults = window.RUN_STATE_DEFAULTS;

    /* 先停一切计时器与循环 —— 否则重置过程中可能有个 pending 回调
       读到「半重置」的状态并触发跨局逻辑（R327 的 _guideStepTimeout
       类 bug 就是这个模式）。 */
    this.running = false;
    if (window.Guide && window.Guide._clearGuideTimers) window.Guide._clearGuideTimers(this);
    if (this._qqueenShieldTimer) { clearTimeout(this._qqueenShieldTimer); this._qqueenShieldTimer = null; }
    if (this._gambleTimeout) { clearTimeout(this._gambleTimeout); this._gambleTimeout = null; }
    if (this._interWaveTimeout) { clearTimeout(this._interWaveTimeout); this._interWaveTimeout = null; }
    if (this._handTileDeliverTimers) {
        this._handTileDeliverTimers.forEach(function(t) { clearTimeout(t); });
        this._handTileDeliverTimers = [];
    }
    if (this._trailTimers) {
        this._trailTimers.forEach(function(t) { clearTimeout(t); });
        this._trailTimers = [];
    }

    /* 实体级清理（需要方法，不在字段表里） */
    if (this._clearTotems) this._clearTotems();
    if (this._cleanEnemyProjectiles) this._cleanEnemyProjectiles();
    if (this._clearMutatorEffects) this._clearMutatorEffects();
    if (window.rewardManager) window.rewardManager.hidePanel();

    /* 字段表统一复位 */
    for (var i = 0; i < fields.length; i++) {
        var k = fields[i];
        if (k === '_waveCount' && o.keepWave) continue;
        this[k] = (k in defaults) ? defaults[k] : false;
    }

    /* Boss 波次不变量：清零后必然不是 Boss 波。真正置真只发生在
       「进入最终波」的那一刻（_beginNextWave），续跑则由调用方按快照推导。 */
    this._bossLordWave = false;

    /* 玩家 */
    if (this.player && this.player.reset && o.heroId) this.player.reset(o.heroId);
};

/* R89-P1: 移除未使用的 Gp 局部变量，所有原型方法在独立模块中定义 */

/* ══════════════════════════════════════════════
   GameEngine 模块化拆分 — 方法已移至独立文件
   ══════════════════════════════════════════════ */

window.gameEngine = new GameEngine();

})();
