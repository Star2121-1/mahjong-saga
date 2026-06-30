(function() {

/* ══════════════════════════════════════════════
   Epoch 5: 模块委托代理
   ══════════════════════════════════════════════ */
if (window.SpawnSystem) window.SpawnSystem.init = window.SpawnSystem.init || function(engine) { this.engine = engine; };
if (window.CombatSystem) {}
if (window.Systems) {}

window.GameEngine = function() {
    this._currentLevelId = 'level_1';
    this._heroIds = ['Knight', 'Mage', 'Assassin'];

    this.running = false;
    this.gameOver = false;
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
    this._startElapsed = 0;
    this._recordedFlawless = false;

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
    this._gambleType = null;
    this._gambleStaked = 0;
};

var Gp = window.GameEngine.prototype;

/* ══════════════════════════════════════════════
   GameEngine 模块化拆分 — 方法已移至独立文件
   ══════════════════════════════════════════════ */

// [MOVED] → GameEngine.Boot.js// Gp.init = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._cacheStage3DOM = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._bindStage3Events = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._initBeforeUnload = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._startNewRun = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._announceWave = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._freezeClock = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._unfreezeClock = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._isPauseAllowed = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._togglePause = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._shouldShowGuide = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._showGuide = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._beginLoop = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._autoSave = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._initKeyboard = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._initJoystick = function() { ... }
// [MOVED] → GameEngine.Boot.js// Gp._getInputVector = function() { ... }
// [MOVED] → GameEngine.Loop.js// Gp._loop = function() { ... }
// [MOVED] → GameEngine.Loop.js// Gp._getMaxWaves = function() { ... }
// [MOVED] → GameEngine.Loop.js// Gp._getWaveEnemyMax = function() { ... }
// [MOVED] → GameEngine.Spawn.js// Gp._spawnEnemy = function() { ... }
// [MOVED] → GameEngine.Spawn.js// Gp._spawnCoinsAt = function() { ... }
// [MOVED] → GameEngine.Spawn.js// Gp._spawnEliteEnemy = function() { ... }
// [MOVED] → GameEngine.Spawn.js// Gp._tryDropEquipment = function() { ... }
// [MOVED] → GameEngine.Spawn.js// Gp._spawnExpGemsAt = function() { ... }
// [MOVED] → GameEngine.Spawn.js// Gp._updateCoins = function() { ... }
// [MOVED] → GameEngine.Spawn.js// Gp._updateExpGems = function() { ... }
// [MOVED] → GameEngine.Spawn.js// Gp._rewardKill = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._resumeAfterReward = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._resumeAfterLevelUp = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._checkQqueenShield = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._showVictory = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._showAbyssPanel = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._enterAbyss = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._showVictoryOverlay = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._buildVictoryTips = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._continueChallenge = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._spawnCausalityText = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._settleRun = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._gameOver = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._removeEnemyDOM = function() { ... }
// [MOVED] → GameEngine.NewRun.js// Gp._initHandTiles = function() { ... }
// [MOVED] → GameEngine.NewRun.js// Gp._placeHandTile = function() { ... }
// [MOVED] → GameEngine.NewRun.js// Gp._clearHandTile = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._syncPlayerHP = function() { ... }
// [MOVED] → GameEngine.NewRun.js// Gp._renderPlayerTile = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._syncEntities = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._checkAchievement = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._checkAchievementInflight = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._spawnAchievementText = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._syncUI = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._syncExpBar = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._moveTo = function() { ... }
// [MOVED] → GameEngine.Combat.js// Gp._triggerKnightDodgeSlam = function() { ... }
// [MOVED] → GameEngine.Endgame.js// Gp._onClick = function() { ... }
// [MOVED] → GameEngine.Endgame.js// Gp._spawnFloatText = function() { ... }
// [MOVED] → GameEngine.Endgame.js// Gp._spawnHealText = function() { ... }
// [MOVED] → GameEngine.Endgame.js// Gp._spawnExpText = function() { ... }
// [MOVED] → GameEngine.Endgame.js// Gp._spawnExplosion = function() { ... }
// [MOVED] → GameEngine.Endgame.js// Gp._screenShake = function() { ... }
// [MOVED] → GameEngine.Endgame.js// Gp.triggerShake = function() { ... }
// [MOVED] → GameEngine.Render.js// Gp._initDefaultWeapons = function() { ... }
// [MOVED] → GameEngine.Render.js// Gp._restoreWeapons = function() { ... }
// [MOVED] → GameEngine.Render.js// Gp._cleanAllProjectiles = function() { ... }
// [MOVED] → GameEngine.Render.js// Gp._resetAllWeapons = function() { ... }
// [MOVED] → GameEngine.Render.js// Gp._updateWeapons = function() { ... }
// [MOVED] → GameEngine.Render.js// Gp._updateProjectiles = function() { ... }
// [MOVED] → GameEngine.Weapons.js// Gp._renderWeaponSlots = function() { ... }
// [MOVED] → GameEngine.Weapons.js// Gp._syncWeaponSlotBar = function() { ... }
// [MOVED] → GameEngine.Weapons.js// Gp._syncWeaponSlots = function() { ... }
// [MOVED] → GameEngine.Weapons.js// Gp._addWeapon = function() { ... }
// [MOVED] → GameEngine.Weapons.js// Gp._replaceWeapon = function() { ... }
// [MOVED] → GameEngine.Weapons.js// Gp._upgradeWeapon = function() { ... }
// [MOVED] → GameEngine.NewRun.js// Gp._deliverHandTile = function() { ... }
// [MOVED] → GameEngine.NewRun.js// Gp._saveHandState = function() { ... }
// [MOVED] → GameEngine.NewRun.js// Gp._restoreHandState = function() { ... }
// [MOVED] → GameEngine.NewRun.js// Gp._defineGuideSteps = function() { ... }

window.gameEngine = new GameEngine();

})();
