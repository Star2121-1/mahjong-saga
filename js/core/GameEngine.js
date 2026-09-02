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
    this._levelUpPending = false;
    this._ignoreGemCollection = false;
    this._mutatorTriggered = false;
    this._activeMutator = null;
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
    this._bossLord = null;
    this._bossLordWave = false;
    this._bossLordSpawned = false;

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
    this._paused = false;
    this.pauseOverlay = null;
    this._overdriveCount = 0;
    this._maxGoldThisRun = 0;
    this._totalCritsThisRun = 0;
    this._totalDodgesThisRun = 0;
    this._bossKillsThisRun = 0;
    this._finalBossKillsThisRun = 0;

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
};

/* R89-P1: 移除未使用的 Gp 局部变量，所有原型方法在独立模块中定义 */

/* ══════════════════════════════════════════════
   GameEngine 模块化拆分 — 方法已移至独立文件
   ══════════════════════════════════════════════ */

window.gameEngine = new GameEngine();

})();
