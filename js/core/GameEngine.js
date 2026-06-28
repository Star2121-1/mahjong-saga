(function() {

/* ══════════════════════════════════════════════
   Epoch 5: 模块委托代理
   ══════════════════════════════════════════════ */
if (window.SpawnSystem) window.SpawnSystem.init = window.SpawnSystem.init || function(engine) { this.engine = engine; };
if (window.CombatSystem) {}
if (window.Systems) {}

window.GameEngine = function() {
    this._currentLevelId = 'level_1';
    this._heroIds = ['hero_swordsman', 'hero_colossus', 'hero_phantom'];

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
    this._boundLoop = this._loop.bind(this);

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

Gp.init = async function() {
    if (this._initialized) return;
    this._initialized = true;
    this._cacheStage3DOM();

    /* 尽早注册音频激活监听器 — 在 await 之前 */
    var _activateAudio = function() {
        if (window.audioManager) window.audioManager._ensureContext();
        document.removeEventListener('pointerdown', _activateAudio);
        document.removeEventListener('keydown', _activateAudio);
    };
    document.addEventListener('pointerdown', _activateAudio, { once: true });
    document.addEventListener('keydown', _activateAudio, { once: true });

    this.player = new Player(this._mapW / 2, this._mapH / 2);

    await window.saveManager.init();

    var data = await window.saveManager.loadActiveRun();
        if (data && data.isRunActive === true && data.player) {
            window.saveManager.restoreRunToEngine(this, data);
            this._restoreWeapons(data.weapons);
            this._pendingReward = false;
            for (var _el of this._enemyElements.values()) { if (_el && _el.parentNode) _el.remove(); }
            this._enemyElements.clear();
            this.enemies = [];
            this._enemyIdCounter = 0;
            for (var _c = 0; _c < this._activeCoins.length; _c++) this._activeCoins[_c].el.remove();
            this._activeCoins = [];
            this._lastMoveX = 0;

            var vpW = this.battlefield.clientWidth;
            var vpH = this.battlefield.clientHeight;
            this.cameraX = Math.max(0, Math.min(this._mapW - vpW, this.player.x - vpW / 2));
            this.cameraY = Math.max(0, Math.min(this._mapH - vpH, this.player.y - vpH / 2));

            this.player.invulnTimer = 1.5;
            this.gameOver = false;

            if (window.rewardManager) window.rewardManager.hidePanel();
            this._syncEntities();
            this._syncPlayerHP();
            this._syncUI();
            this._beginLoop();
        } else if (data && data.mode === 'new') {
            this._startNewRun(data.heroId, data.levelId);
        } else {
            window.location.href = 's1_save_select.html';
            return;
        }

    this._initKeyboard();
    this._initJoystick();
    this._bindStage3Events();
    this._initBeforeUnload();

    /* Epoch 5: 初始化模块系统 */
    if (window.SpawnSystem) window.SpawnSystem.init(this);
    if (window.CombatSystem) this._combat = window.CombatSystem;
    if (window.Systems) this._systems = window.Systems;

    if (this.battlefield) {
        var self = this;
        this.battlefield.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        this.battlefield.addEventListener('pointerdown', function(e) {
            if (e.button !== 0) return;
            if (e.target.closest && e.target.closest('#joystick-container')) return;
            if (!self.running || self.gameOver || self._pendingReward) return;

            var bfRect = self.battlefield.getBoundingClientRect();
            var clickVX = e.clientX - bfRect.left;
            var clickVY = e.clientY - bfRect.top;
            var clickWX = clickVX + self.cameraX;
            var clickWY = clickVY + self.cameraY;

            /* ── 方向锁死铁律：点击即更新兵器朝向，无视目标类型 ── */
            self._lastClickAngle = Math.atan2(clickWY - self.player.y, clickWX - self.player.x);
            for (var _wi = 0; _wi < self._activeWeapons.length; _wi++) {
                if (self._activeWeapons[_wi] instanceof window.ShotgunBurst) {
                    self._activeWeapons[_wi].fireAt(clickWX, clickWY, self.player, self);
                }
            }

            var enemyEl = e.target.closest('.enemy');
            if (enemyEl) {
                e.stopPropagation();
                e.preventDefault();
                self._onClick(e);
                return;
            }

            /* ── 意图分离判定：走位中盲射不触发点击位移 ── */
            var hasKeyboard = self._pressedKeys['KeyW'] || self._pressedKeys['KeyS'] ||
                self._pressedKeys['KeyA'] || self._pressedKeys['KeyD'] ||
                self._pressedKeys['ArrowUp'] || self._pressedKeys['ArrowDown'] ||
                self._pressedKeys['ArrowLeft'] || self._pressedKeys['ArrowRight'];
            if (hasKeyboard || self._joystickActive) {
                e.preventDefault();
                return;
            }

            self._moveTo(clickWX, clickWY);
        }, { passive: false });
    }

    if (window.rewardManager) {
        window.rewardManager.onPurchase = function() { self._autoSave('relic'); };
    }
};

Gp._cacheStage3DOM = function() {
    this.battlefield = document.getElementById('battlefield');
    this.container = document.getElementById('game-container');
    this._worldLayer = document.getElementById('world-layer');
    this.playerEl = document.getElementById('player');
    this.playerHpFill = document.getElementById('player-hp-fill');
    this.playerHpText = document.getElementById('player-hp-text');
    this.goldDisplay = document.getElementById('gold-display');
    this.atkDisplay = document.getElementById('atk-display');
    this.killsDisplay = document.getElementById('kills-display');
    this.timeDisplay = document.getElementById('time-display');
    this.waveDisplay = document.getElementById('wave-display');
    this.expBarFill = document.getElementById('exp-bar-fill');
    this.expBarText = document.getElementById('exp-bar-text');
    this.gameOverOverlay = document.getElementById('game-over-overlay');
    this.resultTime = document.getElementById('result-time');
    this.resultKills = document.getElementById('result-kills');
    this.resultWave = document.getElementById('result-wave');
    this.restartBtn = document.getElementById('restart-btn');
    this.victoryOverlay = document.getElementById('victory-overlay');
    this.victoryTime = document.getElementById('victory-time');
    this.victoryKills = document.getElementById('victory-kills');
    this.victoryRelics = document.getElementById('victory-relics');
    this.victoryTokens = document.getElementById('victory-tokens');
    this.victoryRestartBtn = document.getElementById('victory-restart-btn');
    this.victoryHubBtn = document.getElementById('victory-hub-btn');
    this.victoryContinueBtn = document.getElementById('victory-continue-btn');
    this.victoryTipsEl = document.getElementById('victory-tips');
    this.waveMilestoneBanner = document.getElementById('wave-milestone-banner');
    this._joystickBase = document.getElementById('joystick-base');
    this._joystickKnob = document.getElementById('joystick-knob');
    this.hubBtn = document.getElementById('hub-btn');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.guideOverlay = document.getElementById('guide-overlay');
    this.mutatorOverlay = document.getElementById('mutator-overlay');
    this.mutatorChoices = document.getElementById('mutator-choices');
    this.mutatorBadge = document.getElementById('mutator-badge');
    this.resonancePills = document.getElementById('resonance-pills');
    this.bossHpBar = document.getElementById('boss-hp-bar');
    this.bossHpFill = document.getElementById('boss-hp-fill');
    this._weaponSlotsEl = document.getElementById('weapon-slots');
    this.rageDisplay = document.getElementById('rage-bar-fill');
    this._pauseBtn = document.getElementById('pause-btn');
    this._handTileGrid = document.getElementById('hand-tile-grid');
    this._handTileBar = document.getElementById('hand-tile-bar');
};

Gp._bindStage3Events = function() {
    if (this.restartBtn) { var s = this; this.restartBtn.addEventListener('click', function() { s.restart(); }); }
    if (this.victoryRestartBtn) { var s = this; this.victoryRestartBtn.addEventListener('click', function() { s.restart(); }); }
    if (this.victoryContinueBtn) { var s = this; this.victoryContinueBtn.addEventListener('click', function() { s._continueChallenge(); }); }
    if (this.victoryHubBtn) { var s = this; this.victoryHubBtn.addEventListener('click', function() { s._goToSaveSelect(); }); }
    if (this.hubBtn) { var s = this; this.hubBtn.addEventListener('click', function() { s._goToSaveSelect(); }); }
    if (this._pauseBtn) { var s = this; this._pauseBtn.addEventListener('click', function() { s._togglePause(); }); }
    if (this.pauseOverlay) {
        var s = this;
        var contBtn = this.pauseOverlay.querySelector('#pause-continue-btn');
        var hubBtn = this.pauseOverlay.querySelector('#pause-hub-btn');
        if (contBtn) contBtn.addEventListener('click', function() { s._togglePause(); });
        if (hubBtn) hubBtn.addEventListener('click', function() {
            s._paused = false;
            if (s.pauseOverlay) s.pauseOverlay.classList.remove('active');
            s._goToSaveSelect();
        });
    }
    if (this.guideOverlay) {
        var self = this;
        var confirmBtn = this.guideOverlay.querySelector('#guide-confirm-btn');
        var nextBtn = this.guideOverlay.querySelector('#guide-next-btn');
        var prevBtn = this.guideOverlay.querySelector('#guide-prev-btn');
        if (confirmBtn) confirmBtn.style.display = 'none'; /* hide old button, use new nav */
        if (nextBtn) nextBtn.addEventListener('click', function() {
            var currentStep = self._currentGuideStep || 0;
            var totalSteps = (self._guideSteps || []).length;
            if (currentStep < totalSteps - 1) {
                self._currentGuideStep = currentStep + 1;
                self._showGuideStep(currentStep + 1);
            } else {
                self._completeGuide();
            }
        });
        if (prevBtn) prevBtn.addEventListener('click', function() {
            var cs = self._currentGuideStep || 0;
            if (cs > 0) {
                self._currentGuideStep = cs - 1;
                self._showGuideStep(cs - 1);
            }
        });
        /* 初始显示第一步 */
        this._currentGuideStep = 0;
        this._showGuideStep(0);
    }
};

Gp._initBeforeUnload = function() {
    var self = this;
    window.addEventListener('beforeunload', function(e) {
        if (self.running) {
            var snap = window.saveManager.snapshotForRun(self);
            window.saveManager.saveActiveRun(snap);
            e.preventDefault();
            e.returnValue = '';
        }
    });
};

Gp._startNewRun = function(heroId, levelId) {
    var levelCfg = window.levelConfig[levelId] || window.levelConfig.level_1;
    /* Epoch 4: 程序化关卡生成 */
    if (levelCfg.isProcedural) {
        var meta = window.saveManager._metaCache || {};
        var abyssLevel = meta.highestEndlessLoop || 0;
        levelCfg = window.proceduralLevelGenerator.generate(abyssLevel);
    }
    this._mapW = levelCfg.mapW;
    this._mapH = levelCfg.mapH;
    this._vpW = 0;
    this._vpH = 0;
    this._currentLevelId = levelId;
    this._spawnInterval = levelCfg.spawnIntervalMin || 1.5;
    this._spawnIntervalDecay = levelCfg.spawnIntervalDecay || 0.02;
    this._enemyTypeWeights = levelCfg.enemyTypes || { Normal: 0.45, Tanker: 0.20, Stalker: 0.25, Shaman: 0.10 };

    for (var _el of this._enemyElements.values()) { if (_el && _el.parentNode) _el.remove(); }
    this._enemyElements.clear();
    this.enemies = [];
    this._enemyIdCounter = 0;
    for (var _c = 0; _c < this._activeCoins.length; _c++) this._activeCoins[_c].el.remove();
    this._activeCoins = [];

    this._pendingReward = false;
    this._waveCount = 0;
    this.currentWaveSpawnedCount = 0;
    this._elapsed = 0;
    this.kills = 0;
    this._spawnTimer = 0;
    this._spawnInterval = 1.5;
    this._difficultyTimer = 0;
    this._bossTimer = 0;
    this._lastMoveX = 0;
    this._lastClickAngle = 0;
    this._pressedKeys = {};
    this._joystickActive = false;
    this._joystickDX = 0;
    this._joystickDY = 0;
    this._expGems = [];
    this._levelUpPending = false;
    this._ignoreGemCollection = false;
    this._mutatorTriggered = false;
    this._activeMutator = null;
    this.playerHitCountInLevel1 = 0;
    this._playerHitCountThisRun = 0;
    this._recordedFlawless = false;
    this.stalkersKilledInLevel2 = 0;
    this._interWaveEvent = null;
    this._interWaveTimer = 0;
    if (this._currentLevelId === 'level_1' || !this.loopCount) this.loopCount = 0;
    this._clearTotems();
    this._cleanEnemyProjectiles();
    this._bossLord = null;
    this._bossLordWave = false;
    this._bossLordSpawned = false;

    /* ── Boss Gamble 重置 ── */
    this._gambleActive = false;
    this._gambleType = null;
    this._gambleStaked = 0;
    this._pendingBossGamble = false;
    this._gambleAbyssBonus = false;

    this._overdriveActive = false;
    this._overdriveTimer = 0;
    this._overdriveCount = 0;
    this._resonanceAuraTimer = 0;

    this.player.reset(heroId);

    /* ── 套装共鸣：开局提示 ── */
    if (this.player.setResonanceSpeed) {
        this._spawnCausalityText('◆ 套装共鸣·炎痕已激活 — 灼烧周围敌人');
    }
    if (this.player.setResonanceIce) {
        this._spawnCausalityText('◆ 套装共鸣·永冻已激活 — 冻结周围敌人');
    }
    /* Epoch 38: 初始共振指示 */
    this._updateResonancePills();

    /* ── 变异保险库：开局生效 ── */
    var _metaForVault = window.saveManager._metaCache || {};
    this._vaultMutations = (_metaForVault.activeMutations || []).slice();
    if (this._vaultMutations.indexOf('gravity') !== -1) {
        this.player.magnetRadius = 0;
    }

    var meta = window.saveManager._metaCache || {};
    var techTree = (meta && meta.techTree) || {};
    this.player.applyTechTree(techTree);

    /* ── 因果效应显化 ── */
    this._godModeApplied = false;
    this._bloodRageActive = false;
    var cf = (meta && meta.causalityFlags) || {};
    if (this._currentLevelId === 'level_2' && cf.level1NoDamage) {
        this._godModeApplied = true;
        this.player.atk = Math.floor(this.player.atk * 1.2);
        this._spawnCausalityText('\u5929\u795e\u4e0b\u51e1\uff1a\u653b\u51fb\u529b +20%');
    }
    if (this._currentLevelId === 'level_3' && cf.level2Overkill) {
        this._bloodRageActive = true;
        this._spawnCausalityText('\u8840\u6d77\u72c2\u66b4\uff1a\u9886\u4e3b\u5f3a\u5316\uff0c\u6838\u5fc3 +2');
    }

    /* Epoch 2: weapon_forge \u5929\u8d4b \u2014 \u5f00\u5c40\u53cc\u795e\u5175 */
    if (meta && meta.talents && meta.talents.weapon_forge >= 1) {
        this._spawnCausalityText('\u2694 \u53cc\u795e\u5175\u5f00\u5c40\uff1a\u98de\u5203 + \u73af\u5f62\u62a4\u4f53');
    }

    /* \u2500\u2500 Epoch 14: \u5173\u5361\u4eb2\u548c\u51cf\u4f24 \u2500\u2500 */
    if (this.player && this.player.mapAffinityLevel > 0) {
        var affinityReduction = this.player.mapAffinityLevel * 0.1;
        this._mapAffinityReduction = affinityReduction;
        this._spawnCausalityText('\ud83d\uddfa\ufe0f \u5173\u5361\u4eb2\u548c Lv.' + this.player.mapAffinityLevel + ' \u2014 \u4f24\u5bb3 -' + (affinityReduction * 100) + '%');
    }

    /* ── Epoch 15: 精英模式全局加成 ── */
    if (window.saveManager && window.saveManager.isEliteMode && window.saveManager.isEliteMode()) {
        this._eliteModeActive = true;
        this._eliteMultiplier = 1.5;
        this._spawnCausalityText('⚠️ 精英模式——所有敌人 +50% 属性，核心收益×1.5');
    }

    this.player.x = this._mapW / 2;
    this.player.y = this._mapH / 2;
    this.player.invulnTimer = 1.5;
    this.gameOver = false;

    var vpW = this.battlefield.clientWidth;
    var vpH = this.battlefield.clientHeight;
    this.cameraX = Math.max(0, Math.min(this._mapW - vpW, this.player.x - vpW / 2));
    this.cameraY = Math.max(0, Math.min(this._mapH - vpH, this.player.y - vpH / 2));

    this._resetAllWeapons();
    this._initDefaultWeapons();
    this._syncEntities();
    this._syncPlayerHP();
    this._renderWeaponSlots();
    this._syncUI();

    /* Epoch 5: 重置 SpawnSystem */
    if (window.SpawnSystem) window.SpawnSystem.reset(this);

    /* ── 渲染 2.5D 骨雕雀牌 ── */
    this._renderPlayerTile();

    /* ── 初始化 14 格天命手牌槽 ── */
    this._initHandTiles();

    this._freezeClock();
    /* ── 开场引导：首次游戏显示，否则直接播报第一波 ── */
    if (this._shouldShowGuide()) {
        this._showGuide();
    } else {
        this._announceWave(0);
    }
};

Gp._announceWave = function(waveIdx) {
    this._unfreezeClock();
    this._freezeClock();
    var wa = document.getElementById('wave-announce');
    wa.textContent = '\u7b2c ' + (waveIdx + 1) + ' \u6ce2';
    wa.classList.add('active');
    this._autoSave('wave');
    var self = this;
    setTimeout(function() {
        wa.classList.remove('active');
        self._beginLoop();
    }, 1200);
};

Gp._freezeClock = function() {
    if (this.container) this.container.classList.add('game-clock-frozen');
};
Gp._unfreezeClock = function() {
    if (this.container) this.container.classList.remove('game-clock-frozen');
};

/* ── 暂停系统 ── */

Gp._isPauseAllowed = function() {
    if (!this.player || this.gameOver) return false;
    if (this._abyssPanelVisible) return false;
    if (this.victoryOverlay && this.victoryOverlay.classList.contains('active')) return false;
    if (this.gameOverOverlay && this.gameOverOverlay.classList.contains('active')) return false;
    var ro = document.getElementById('reward-overlay');
    if (ro && ro.classList.contains('active')) return false;
    var mo = document.getElementById('mutator-overlay');
    if (mo && mo.classList.contains('active')) return false;
    if (this.guideOverlay && this.guideOverlay.classList.contains('active')) return false;
    return true;
};

Gp._togglePause = function() {
    if (!this._paused) {
        if (!this._isPauseAllowed()) return;
        this._paused = true;
        this.running = false;
        this._freezeClock();
        if (this.pauseOverlay) this.pauseOverlay.classList.add('active');
    } else {
        this._paused = false;
        if (this.pauseOverlay) this.pauseOverlay.classList.remove('active');
        this._beginLoop();
    }
};

/* ── 开场引导 ── */

Gp._shouldShowGuide = function() {
    if (this._guideDismissed) return false;
    var meta = window.saveManager && window.saveManager._metaCache;
    if (!meta) return false;
    if (meta.hasSeenGuide) return false;
    /* 仅首次游戏 + level_1 + 非深渊轮回时显示 */
    if (this._currentLevelId !== 'level_1' || this.loopCount > 0) return false;
    return true;
};

Gp._showGuide = function() {
    this._defineGuideSteps();
    if (this.guideOverlay) this.guideOverlay.classList.add('active');
    /* 高亮引导面板 */
    this._highlightElement('#guide-overlay', 6000);
    /* 注意：不在这里设置 hasSeenGuide，等 _completeGuide 时再设 */
};

Gp._beginLoop = function() {
    this._unfreezeClock();
    if (this.running) return;
    this.running = true;
    this.gameOver = false;
    this._lastTime = performance.now();
    requestAnimationFrame(this._boundLoop);
};

Gp._autoSave = function(trigger) {
    var snap = window.saveManager.snapshotForRun(this);
    window.saveManager.saveActiveRun(snap);
};

Gp._initKeyboard = function() {
    var self = this;
    document.addEventListener('keydown', function(e) {
        /* Escape 暂停/继续，任何状态下均可触发 */
        if (e.code === 'Escape') {
            self._togglePause();
            return;
        }
        if (!self.running || self.gameOver) return;
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) e.preventDefault();
        if (e.code === 'Space' && self.player && self.player.rage >= self.player.maxRage && !self._overdriveActive) {
            self._pressedKeys[e.code] = false;
            self._triggerOverdrive();
            return;
        }
        self._pressedKeys[e.code] = true;
    });
    document.addEventListener('keyup', function(e) { self._pressedKeys[e.code] = false; });
};

Gp._initJoystick = function() {
    var base = this._joystickBase;
    var knob = this._joystickKnob;
    if (!base || !knob) return;
    var self = this;

    var getOffset = function() {
        var rect = base.getBoundingClientRect();
        return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, maxR: rect.width / 2 - knob.offsetWidth / 2 };
    };

    var updateKnob = function(clientX, clientY) {
        var o = getOffset();
        var dx = clientX - o.cx;
        var dy = clientY - o.cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > o.maxR) { dx = (dx / dist) * o.maxR; dy = (dy / dist) * o.maxR; }
        knob.style.left = (50 + (dx / (base.offsetWidth / 2)) * 50) + '%';
        knob.style.top = (50 + (dy / (base.offsetHeight / 2)) * 50) + '%';
        if (dist > 6) { self._joystickDX = dx / o.maxR; self._joystickDY = dy / o.maxR; }
        else { self._joystickDX = 0; self._joystickDY = 0; }
    };

    var resetKnob = function() {
        self._joystickActive = false;
        self._joystickDX = 0;
        self._joystickDY = 0;
        knob.style.left = '50%';
        knob.style.top = '50%';
    };

    var _touchId = null;

    base.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        e.stopPropagation();
        self._joystickActive = true;
        updateKnob(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', function(e) {
        if (!self._joystickActive) return;
        updateKnob(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', function() { resetKnob(); });
    base.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        self._joystickActive = true;
        var t = e.changedTouches[0];
        _touchId = t.identifier;
        updateKnob(t.clientX, t.clientY);
    }, { passive: false });
    document.addEventListener('touchmove', function(e) {
        if (!self._joystickActive) return;
        updateKnob(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }, { passive: false });
    document.addEventListener('touchend', function(e) {
        if (_touchId !== null) {
            var found = false;
            for (var i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === _touchId) { found = true; break; } }
            if (!found) return;
            _touchId = null;
        }
        resetKnob();
    });
    document.addEventListener('touchcancel', function(e) {
        if (_touchId !== null) { _touchId = null; resetKnob(); }
    });
    document.addEventListener('mouseleave', function() { if (self._joystickActive) resetKnob(); });
};

Gp._getInputVector = function() {
    var rawX = 0;
    var rawY = 0;
    if (this._pressedKeys['KeyW'] || this._pressedKeys['ArrowUp']) rawY -= 1;
    if (this._pressedKeys['KeyS'] || this._pressedKeys['ArrowDown']) rawY += 1;
    if (this._pressedKeys['KeyA'] || this._pressedKeys['ArrowLeft']) rawX -= 1;
    if (this._pressedKeys['KeyD'] || this._pressedKeys['ArrowRight']) rawX += 1;
    if (rawX === 0 && rawY === 0) {
        rawX = this._joystickDX;
        rawY = this._joystickDY;
    }
    var len = Math.sqrt(rawX * rawX + rawY * rawY);
    if (len > 1) return { x: rawX / len, y: rawY / len };
    return { x: rawX, y: rawY };
};

Gp._loop = function(timestamp) {
    if (!this.running || this.gameOver) return;
    try {
        var dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
        this._lastTime = timestamp;
        this._elapsed += dt;

        /* Epoch 32: 临时增益过期检查 */
        var p = this.player;
        if (p._tempBuffEnd && Date.now() / 1000 >= p._tempBuffEnd) {
            p._tempAtkBoost = 0;
            p._tempHpBonus = 0;
            p._doubleCoinNextWave = false;
            p._tempBuffEnd = 0;
        }

        var input = this._getInputVector();
        this._lastMoveX = input.x;
        this.player.update(dt, input.x, input.y, this._mapW, this._mapH);

        if (!this._pendingReward) {
            /* Epoch 5: 委托刷怪逻辑到 SpawnSystem */
            if (window.SpawnSystem) {
                window.SpawnSystem.update(dt, this);
            }

            if (this.player.hasDrone) {
                var interval = this.player.evolvedDrone ? 0.2 : this.player.droneInterval;
                this.player.droneTimer += dt;
                while (this.player.droneTimer >= interval) {
                    this.player.droneTimer -= interval;
                    if (this.player.evolvedDrone) {
                        var withDist = [];
                        for (var _di = 0; _di < this.enemies.length; _di++) {
                            var _e = this.enemies[_di];
                            if (!_e.alive) continue;
                            var _dx = _e.x - this.player.x;
                            var _dy = _e.y - this.player.y;
                            withDist.push({ e: _e, d: _dx * _dx + _dy * _dy });
                        }
                        withDist.sort(function(a,b) { return a.d - b.d; });
                        var targets = withDist.slice(0, 3);
                        for (var _ti = 0; _ti < targets.length; _ti++) targets[_ti].e.takeDamage(24);
                    } else {
                        var nearest = null;
                        var nearestDist = Infinity;
                        for (var _nj = 0; _nj < this.enemies.length; _nj++) {
                            var _ne = this.enemies[_nj];
                            if (!_ne.alive) continue;
                            var _ndx = _ne.x - this.player.x;
                            var _ndy = _ne.y - this.player.y;
                            var _nd = _ndx * _ndx + _ndy * _ndy;
                            if (_nd < nearestDist) { nearestDist = _nd; nearest = _ne; }
                        }
                        if (nearest) nearest.takeDamage(12);
                    }
                }
            }

            var prevHp = this.player.hp;

            for (var _ei = 0; _ei < this.enemies.length; _ei++) {
                this.enemies[_ei].update(dt, this.player, this);
            }

            /* ── 图腾 buff 应用 ── */
            for (var _toti = 0; _toti < this.enemies.length; _toti++) this.enemies[_toti]._totemBuffed = false;
            for (var _to = 0; _to < this._totems.length; _to++) {
                var t = this._totems[_to];
                for (var _tei = 0; _tei < this.enemies.length; _tei++) {
                    var te = this.enemies[_tei];
                    if (!te.alive) continue;
                    var tdx = te.x - t.x;
                    var tdy = te.y - t.y;
                    if (tdx * tdx + tdy * tdy < t.radius * t.radius) te._totemBuffed = true;
                }
            }

            /* ── 波次突变触发器（Boss Lord 波次跳过） ── */
            if (!this._bossLordWave && !this._mutatorTriggered && this._activeMutator === null && this.currentWaveSpawnedCount > 0) {
                var cap = this._getWaveEnemyMax();
                if (cap > 0 && this.currentWaveSpawnedCount >= Math.ceil(cap * 0.5)) {
                    this._mutatorTriggered = true;
                    this._showMutatorPanel();
                }
            }

            if (this.player._thornCritX !== undefined) {
                if (this._combat && this._combat.spawnFloatText) {
                    this._combat.spawnFloatText(this, this.player._thornCritX, this.player._thornCritY, '\u66b4\u51fb\u53cd\u5546!', true);
                } else {
                    this._spawnFloatText(this.player._thornCritX, this.player._thornCritY, '\u66b4\u51fb\u53cd\u5546!', true);
                }
                this.player._thornCritX = undefined;
                this.player._thornCritY = undefined;
            }

            if (this.player._dodgeSignal) {
                if (this._combat && this._combat.spawnFloatText) {
                    this._combat.spawnFloatText(this, this.player.x, this.player.y, '\u95ea\u907f!', true);
                } else {
                    this._spawnFloatText(this.player.x, this.player.y, '\u95ea\u907f!', true);
                }
                this.player._dodgeSignal = false;
            }

            if (this.player._healAmount > 0) {
                if (this._combat && this._combat.spawnHealText) {
                    this._combat.spawnHealText(this, this.player.x, this.player.y, this.player._healAmount);
                } else {
                    this._spawnHealText(this.player.x, this.player.y, this.player._healAmount);
                }
                this.player._healAmount = 0;
            }

            var bossDied = [];
            for (var _ri = this.enemies.length - 1; _ri >= 0; _ri--) {
                var _re = this.enemies[_ri];
                if (!_re.alive) {
                    if (_re.isBoss) {
                        bossDied.push(_re);
                    } else {
                        this._rewardKill(_re);
                        this._removeEnemyDOM(_re);
                        this.enemies.splice(_ri, 1);
                    }
                }
            }

            if (bossDied.length) {
                var lordDead = false;
                for (var _bdi = 0; _bdi < bossDied.length; _bdi++) {
                    var _be = bossDied[_bdi];
                    if (_be.type === 'Boss_Lord') lordDead = true;
                    this._spawnCoinsAt(_be.x, _be.y, true, _be.level);
                    this._tryDropEquipment(_be.x, _be.y, _be.type === 'Boss_Lord');
                    this.kills++;
                    this._removeEnemyDOM(_be);
                    var _idx = this.enemies.indexOf(_be);
                    if (_idx !== -1) this.enemies.splice(_idx, 1);
                }
                if (lordDead) {
                    this.triggerShake(3, 500);
                    this._cleanEnemyProjectiles();
                    for (var _ldi = this.enemies.length - 1; _ldi >= 0; _ldi--) {
                        var _le = this.enemies[_ldi];
                        if (_le.alive) { this._removeEnemyDOM(_le); this.enemies.splice(_ldi, 1); }
                    }
                    for (var _lci = 0; _lci < this._activeCoins.length; _lci++) this._activeCoins[_lci].el.remove();
                    this._activeCoins = [];
                    if (this.bossHpBar) this.bossHpBar.classList.remove('active');
                    if (this._expGems.length > 0) {
                        this._pendingBossLordSettle = true;
                    } else {
                        this.running = false;
                        this.gameOver = true;
                        if (this._currentLevelId === 'level_3' || this.loopCount > 0) {
                            this._showAbyssPanel();
                        } else {
                            this._showVictory();
                        }
                    }
                    return;
                }
                for (var _mi = this.enemies.length - 1; _mi >= 0; _mi--) {
                    var _me = this.enemies[_mi];
                    if (_me.alive) {
                        this._spawnCoinsAt(_me.x, _me.y, false, _me.level);
                        this._spawnExpGemsAt(_me.x, _me.y, false, _me.level);
                        this.kills++;
                        this._removeEnemyDOM(_me);
                        this.enemies.splice(_mi, 1);
                    }
                }
                this._pendingReward = true;
            }

            if (this.player.hp < prevHp) {
                /* Epoch 32: 临时护盾吸收 */
                if (this._tempShield > 0) {
                    var absorbed = Math.min(this._tempShield, prevHp - this.player.hp);
                    this._tempShield -= absorbed;
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + absorbed);
                    if (this._tempShield <= 0) this._tempShield = 0;
                }
                this._screenShake();
                this._playerHitCountThisRun++;
            }
        }

        this._updateCoins(dt);
        this._updateExpGems(dt);

        /* ── BossLord 死亡：等待经验石吸完后再结算 ── */
        if (this._pendingBossLordSettle && this._expGems.length === 0) {
            if (this._levelUpPending) {
                this._levelUpPending = false;
                this.running = false;
                this._freezeClock();
                this._syncUI();
                if (window.rewardManager) window.rewardManager.showLevelUpPanel();
                return;
            }
            this._pendingBossLordSettle = false;
            this.running = false;
            this.gameOver = true;
            if (this._currentLevelId === 'level_3' || this.loopCount > 0) {
                this._showAbyssPanel();
            } else {
                this._showVictory();
            }
            return;
        }

        this._updateWeapons(dt);
        this._updateProjectiles(dt);
        if (!this._pendingReward) this._updateEnemyProjectiles(dt);

        /* ── Overdrive 计时（游戏时间） ── */
        /* 设计决策：面板打开时游戏循环暂停，Overdrive 计时随之暂停。
           面板关闭后倒计时从剩余时间继续。不按真实时间流逝。 */
        if (this._overdriveActive) {
            this._overdriveTimer -= dt;
            if (this._overdriveTimer <= 0) this._endOverdrive();
        }

        /* ── 屏幕震颤计时 ── */
        if (this._shakeTimer > 0) {
            this._shakeTimer -= dt;
            if (this._shakeTimer <= 0) {
                this._shakeTimer = 0;
                if (this.container) {
                    this.container.classList.remove('screen-shake-active');
                    this.container.style.animationDuration = '';
                }
            }
        }

        /* ── 套装共鸣：焰痕 + 永冻（委托给 Systems）── */
        if ((this.player.setResonanceSpeed || this.player.setResonanceIce) && !this._pendingReward) {
            if (this._systems && this._systems.updateResonanceAuras) {
                this._systems.updateResonanceAuras(this, dt);
            }
        }

        /* ── 突变·枯萎：全体敌人周期性损血 ── */
        if (this._activeMutator === 'wither' && !this._pendingReward) {
            /* Epoch 5: 委托枯萎到 Systems */
            if (this._systems && this._systems.updateWither) {
                this._systems.updateWither(this, dt);
            } else {
                this._witherTimer += dt;
                if (this._witherTimer >= 5) {
                    this._witherTimer = 0;
                    for (var _wi = 0; _wi < this.enemies.length; _wi++) {
                        var _we = this.enemies[_wi];
                        if (!_we.alive) continue;
                        var dmg = Math.max(1, Math.floor(_we.maxHp * 0.05));
                        _we.takeDamage(dmg, 'wither');
                    }
                }
            }
        }

        if (this.player.hp <= 0) {
            /* Epoch 14: 复活机会 */
            if (this.player.shouldRevive && this.player.shouldRevive(this)) {
                this._spawnCausalityText('💀 复活！元气恢复 30%');
                this.triggerShake(1.5, 500);
                return;
            }
            this._gameOver();
            return;
        }

        if (this._levelUpPending && !this._pendingReward) {
            this._levelUpPending = false;
            this.running = false;
            this._freezeClock();
            this._syncUI();
            if (window.rewardManager) window.rewardManager.showLevelUpPanel();
            return;
        }

        if (this._pendingReward && this._activeCoins.length === 0 && this._expGems.length === 0) {
            if (this._levelUpPending) {
                this._levelUpPending = false;
                this.running = false;
                this._freezeClock();
                this._syncUI();
                if (window.rewardManager) window.rewardManager.showLevelUpPanel();
                return;
            }
            if (this._waveCount >= this._getMaxWaves() - 1) {
                this.running = false;
                this.gameOver = true;
                this._showVictory();
            } else {
                /* Epoch 32: 波次间事件 */
                if (this._waveCount >= 1 && Math.random() < 0.6) {
                    this._triggerInterWaveEvent();
                    return;
                }
                this.running = false;
                this._freezeClock();
                this._syncUI();
                if (window.rewardManager) window.rewardManager.showRewardPanel();
            }
            return;
        }

        if (!this._pendingReward && this.enemies.length === 0 && this._activeCoins.length === 0 && this._expGems.length === 0 && this.currentWaveSpawnedCount >= this._getWaveEnemyMax() && this._waveCount < this._getMaxWaves() - 1) {
            this._pendingReward = true;
        }

        var vpW = this._vpW;
        var vpH = this._vpH;
        if (!vpW || !vpH) {
            vpW = this.battlefield.clientWidth;
            vpH = this.battlefield.clientHeight;
            this._vpW = vpW;
            this._vpH = vpH;
        }
        var targetCamX = Math.max(0, Math.min(this._mapW - vpW, this.player.x - vpW / 2));
        var targetCamY = Math.max(0, Math.min(this._mapH - vpH, this.player.y - vpH / 2));
        var lerpFactor = 1 - Math.exp(-10 * dt);
        this.cameraX += (targetCamX - this.cameraX) * lerpFactor;
        this.cameraY += (targetCamY - this.cameraY) * lerpFactor;

        this._syncEntities();
        this._syncPlayerHP();
        this._syncUI();
    } catch (err) { console.error('Game loop error:', err); }

    if (this.running && !this.gameOver) requestAnimationFrame(this._boundLoop);
};

Gp._getMaxWaves = function() {
    var cfg = window.levelConfig[this._currentLevelId];
    return cfg ? cfg.maxWaves : 5;
};

Gp._getWaveEnemyMax = function() {
    var cfg = window.levelConfig[this._currentLevelId];
    if (!cfg || !cfg.waveEnemyMax) return 999;
    var idx = Math.min(this._waveCount, cfg.waveEnemyMax.length - 1);
    return cfg.waveEnemyMax[idx] || 999;
};

Gp._spawnEnemy = function(isBoss) {
    if (!isBoss) {
        var cap = this._getWaveEnemyMax();
        if (this.currentWaveSpawnedCount >= cap) return;
    }
    var level = Math.floor(this._elapsed / 15) + 1;
    var angle = Math.random() * Math.PI * 2;
    var dist = 200 + Math.random() * 50;
    var x = this.player.x + Math.cos(angle) * dist;
    var y = this.player.y + Math.sin(angle) * dist;
    var margin = 20;
    x = Math.max(margin, Math.min(this._mapW - margin, x));
    y = Math.max(margin, Math.min(this._mapH - margin, y));

    var id = this._enemyIdCounter++;
    var enemyType = 'Normal';
    if (!isBoss) {
        /* Epoch 4: 程序化敌人类型权重 */
        if (this._enemyTypeWeights) {
            var weights = this._enemyTypeWeights;
            var roll = Math.random();
            var cumulative = 0;
            var types = Object.keys(weights);
            for (var ti = 0; ti < types.length; ti++) {
                cumulative += weights[types[ti]];
                if (roll < cumulative) { enemyType = types[ti]; break; }
            }
        } else {
            var typeRoll = Math.random();
            if (typeRoll < 0.25) enemyType = 'Tanker';
            else if (typeRoll < 0.55) enemyType = 'Stalker';
            else if (typeRoll < 0.80) enemyType = 'Shaman';
        }
    }
    var enemy = new Enemy(id, x, y, level, isBoss === true, enemyType);
    var diff = 1;
    try { diff = window.levelConfig[this._currentLevelId].difficultyFactor || 1; } catch(e) { console.warn('diff config read error', e); }
    enemy.maxHp = Math.floor(enemy.maxHp * diff);
    enemy.hp = enemy.maxHp;
    enemy.atk = Math.floor(enemy.atk * diff);

    if (enemy.isBoss) {
        var waveIdx = this._waveCount;
        var maxWaves = this._getMaxWaves();
        if (waveIdx >= maxWaves) {
            enemy.radius = 75;
            var baseHp = Math.floor(20 * Math.pow(1.2, level - 1));
            enemy.maxHp = baseHp * 20;
            enemy.hp = enemy.maxHp;
            enemy.hue = 0;
        } else if (waveIdx === maxWaves - 1) {
            enemy.speed *= 2;
            enemy.hue = 30;
        }
    }

    this.enemies.push(enemy);
    if (!enemy.isBoss) this.currentWaveSpawnedCount++;

    /* ── 变异保险库：血月对新生敌人生效 ── */
    if (this._vaultMutations && this._vaultMutations.indexOf('bloodmoon') !== -1) {
        enemy.atk = Math.floor(enemy.atk * 1.4);
        enemy.maxHp = Math.floor(enemy.maxHp * 1.3);
        enemy.hp = Math.floor(enemy.hp * 1.3);
    }

    /* Epoch 32: 波次间事件的临时敌方debuff */
    if (this._tempEnemyAtkDebuff > 0) {
        enemy.atk = Math.floor(enemy.atk * this._tempEnemyAtkDebuff);
    }
    if (this._tempEnemySpeedDebuff > 0) {
        enemy.speed *= this._tempEnemySpeedDebuff;
    }

    var el = document.createElement('div');
    el.className = 'enemy';
    if (enemy.isBoss) {
        el.classList.add('boss');
        var maxWaves = this._getMaxWaves();
        if (this._waveCount >= maxWaves) el.classList.add('final-boss');
    }
    el.dataset.id = id;
    /* 2.5D 骨雕妖牌 */
    el.style.background = '#2a4a3a';
    el.style.borderRadius = '4px';
    el.style.boxShadow = '0 3px 0 #1a3020, 0 5px 0.5px #3a5a4a, 0 6px 8px rgba(0,0,0,0.4)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontSize = '12px';
    el.style.fontWeight = '700';
    el.style.color = '#5a8a6a';
    if (enemyType === 'Stalker') el.style.opacity = '1';
    var hpBar = document.createElement('div');
    hpBar.className = 'enemy-hp-bar';
    var hpFill = document.createElement('div');
    hpFill.className = 'enemy-hp-fill';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);
    this._worldLayer.appendChild(el);
    this._enemyElements.set(id, el);
    enemy.el = el;
};

/** Spawn a specific enemy type (for boss summons, interwave events) */
Gp._spawnEnemyType = function(type) {
    var level = Math.floor(this._elapsed / 15) + 1;
    var angle = Math.random() * Math.PI * 2;
    var dist = 200 + Math.random() * 50;
    var x = this.player.x + Math.cos(angle) * dist;
    var y = this.player.y + Math.sin(angle) * dist;
    var margin = 20;
    x = Math.max(margin, Math.min(this._mapW - margin, x));
    y = Math.max(margin, Math.min(this._mapH - margin, y));
    var id = this._enemyIdCounter++;
    var enemy = new Enemy(id, x, y, level, false, type);
    enemy.el = document.createElement('div');
    enemy.el.className = 'enemy';
    /* 2.5D 骨雕妖牌 */
    enemy.el.style.background = '#2a4a3a';
    enemy.el.style.borderRadius = '4px';
    enemy.el.style.boxShadow = '0 3px 0 #1a3020, 0 5px 0.5px #3a5a4a, 0 6px 8px rgba(0,0,0,0.4)';
    enemy.el.style.display = 'flex';
    enemy.el.style.alignItems = 'center';
    enemy.el.style.justifyContent = 'center';
    enemy.el.style.fontSize = '12px';
    enemy.el.style.fontWeight = '700';
    enemy.el.style.color = '#5a8a6a';
    /* Mahjong tile face */
    var face = document.createElement('div');
    face.style.position = 'relative';
    face.style.width = '32px';
    face.style.height = '42px';
    face.style.background = '#f5f5dc';
    face.style.border = '1px solid #bbb';
    face.style.borderRadius = '3px';
    face.style.boxShadow = 'inset 0 -2px 0 #ddd, 0 2px 4px rgba(0,0,0,0.2)';
    face.style.display = 'flex';
    face.style.alignItems = 'center';
    face.style.justifyContent = 'center';
    face.style.fontSize = '16px';
    face.style.fontWeight = 'bold';
    face.style.color = '#333';
    face.textContent = enemy.type.charAt(0);
    enemy.el.appendChild(face);
    /* HP bar */
    var hpBar = document.createElement('div');
    hpBar.className = 'enemy-hpbar';
    hpBar.style.width = '36px';
    hpBar.style.height = '4px';
    hpBar.style.background = '#333';
    hpBar.style.borderRadius = '2px';
    hpBar.style.position = 'absolute';
    hpBar.style.bottom = '-6px';
    hpBar.style.overflow = 'hidden';
    var hpFill = document.createElement('div');
    hpFill.className = 'enemy-hpbar-fill';
    hpFill.style.width = '100%';
    hpFill.style.height = '100%';
    hpFill.style.background = '#4caf50';
    hpFill.style.transition = 'width 0.15s';
    hpBar.appendChild(hpFill);
    enemy.el.appendChild(hpBar);
    this._worldLayer.appendChild(enemy.el);
    this._enemyElements.set(id, enemy.el);
    enemy.el = enemy.el;
    this.enemies.push(enemy);
};

Gp._spawnCoinsAt = function(x, y, isBoss, level) {
    /* Epoch 5: 委托掉落到 CombatSystem */
    if (this._combat && this._combat.spawnCoinsAt) {
        return this._combat.spawnCoinsAt(this, x, y, isBoss, level);
    }
    level = level || 1;
    var count = isBoss ? Math.floor(5 + level * 0.5 + Math.random() * 4) : Math.floor(3 + level * 0.3 + Math.random() * 3);
    var _vaultBlood = this._vaultMutations && this._vaultMutations.indexOf('bloodmoon') !== -1;
if (this._activeMutator === 'bloodmoon' || _vaultBlood) count *= 2;
    if (this._activeMutator === 'frenzy') count = Math.floor(count * 1.5);
    for (var i = 0; i < count; i++) {
        var cx = x + (Math.random() - 0.5) * 20;
        var cy = y + (Math.random() - 0.5) * 20;
        var el = document.createElement('div');
        el.className = 'coin-placeholder';
        el.style.left = (cx - 6) + 'px';
        el.style.top = (cy - 6) + 'px';
        this._worldLayer.appendChild(el);
        this._activeCoins.push({ x: cx, y: cy, el: el });
    }
};

/* ── Epoch 32: 精英怪生成 ── */

Gp._spawnEliteEnemy = function() {
    var level = Math.floor(this._elapsed / 15) + 1;
    var angle = Math.random() * Math.PI * 2;
    var dist = 200 + Math.random() * 50;
    var x = this.player.x + Math.cos(angle) * dist;
    var y = this.player.y + Math.sin(angle) * dist;

    var id = ++this._enemyIdCounter;
    var types = ['Tanker', 'Stalker', 'Shaman'];
    var enemyType = types[Math.floor(Math.random() * types.length)];
    var enemy = new Enemy(id, x, y, level, false, enemyType);

    /* Elite boost */
    enemy.maxHp = Math.floor(enemy.maxHp * 1.5);
    enemy.hp = enemy.maxHp;
    enemy.atk = Math.floor(enemy.atk * 1.3);
    enemy.el && enemy.el.classList.add('elite-marker');

    this.enemies.push(enemy);
    this.currentWaveSpawnedCount++;
};

/* ── Boss 装备掉落 ── */
Gp._tryDropEquipment = function(x, y, isBossLord) {
    if (!window.equipmentRegistry || !window.saveManager) return;
    var chance = isBossLord ? 1.0 : 0.25;
    if (Math.random() > chance) return;
    var roll = Math.random();
    var quality = roll < 0.1 ? 'legendary' : roll < 0.4 ? 'epic' : 'rare';
    var protoIds = Object.keys(window.equipmentRegistry.equipPool);
    var protoId = protoIds[Math.floor(Math.random() * protoIds.length)];
    var item = window.equipmentRegistry.createItem(protoId, quality);
    if (!item) return;
    /* Epoch 33: 图鉴记录装备 */
    if (window.saveManager) window.saveManager.recordCompendiumEntry('equips', item.protoId);
    var meta = window.saveManager._metaCache;
    if (!meta) return;
    meta.equipments = meta.equipments || [];
    meta.equipments.push(item);
    window.saveManager._saveMetaToStorage();
    var qualityLabel = { rare: '稀有', epic: '史诗', legendary: '传说' }[quality] || quality;
    this._spawnCausalityText('🎁 获得装备：' + item.name + ' (' + qualityLabel + ')');
};

Gp._spawnExpGemsAt = function(x, y, isBoss, level) {
    /* Epoch 5: 委托经验石到 CombatSystem */
    if (this._combat && this._combat.spawnExpGemsAt) {
        return this._combat.spawnExpGemsAt(this, x, y, isBoss, level);
    }
    var diff = 1;
    try { diff = window.levelConfig[this._currentLevelId].difficultyFactor || 1; } catch(e) { console.warn('diff config read error', e); }
    var _vaultBloodGem = this._vaultMutations && this._vaultMutations.indexOf('bloodmoon') !== -1;
    var bloodMul = (this._activeMutator === 'bloodmoon' || _vaultBloodGem) ? 2 : 1;
    var arr = window.expGems = window.expGems || [];
    if (isBoss) {
        var cnt = 5 + Math.floor(Math.random() * 4);
        var avg = Math.floor(25 * bloodMul / cnt);
        var rem = 25 * bloodMul - avg * cnt;
        for (var gi = 0; gi < cnt; gi++) {
            var v = avg + (gi < rem ? 1 : 0);
            arr.push(new window.ExpGem(x, y, v));
        }
    } else {
        level = level || 1;
        var gemVal = Math.floor((1 + level * 0.5) * diff * bloodMul);
        if (gemVal < 1) gemVal = 1;
        arr.push(new window.ExpGem(x, y, gemVal));
    }
};

Gp._updateCoins = function(dt) {
    if (this._activeCoins.length === 0) return;
    var player = this.player;
    var collected = 0;
    for (var i = this._activeCoins.length - 1; i >= 0; i--) {
        var coin = this._activeCoins[i];
        var dx = player.x - coin.x;
        var dy = player.y - coin.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.radius + 6) {
            coin.el.remove();
            this._activeCoins.splice(i, 1);
            collected++;
        } else {
            var speed = 400;
            var move = speed * dt;
            coin.x += (dx / dist) * move;
            coin.y += (dy / dist) * move;
            coin.el.style.left = (coin.x - 6) + 'px';
            coin.el.style.top = (coin.y - 6) + 'px';
        }
    }
    if (collected > 0) {
        /* Epoch 36: 拾取音效 */
        window.audioManager && window.audioManager.play('pickup');
        /* Epoch 32: 双倍金币诅咒 */
        if (player._doubleCoinNextWave) {
            collected *= 2;
            player._doubleCoinNextWave = false;
        }
        /* Epoch 32: 点金术临时加成 */
        if (this._tempGoldMult > 1) {
            collected *= this._tempGoldMult;
            this._tempGoldMult = 1;
        }
        player.addGold(collected);
        player.rage = Math.min(player.maxRage, player.rage + 2 * collected);
    }
};

Gp._updateExpGems = function(dt) {
    if (this._expGems.length === 0 && (!window.expGems || window.expGems.length === 0)) return;
    if (window.expGems && window.expGems.length > 0) {
        for (var gi = 0; gi < window.expGems.length; gi++) {
            this._expGems.push(window.expGems[gi]);
        }
        window.expGems = [];
    }
    if (this._expGems.length === 0) return;
    var player = this.player;
    var collected = [];
    for (var i = this._expGems.length - 1; i >= 0; i--) {
        var gem = this._expGems[i];
        if (!gem.el) {
            var el = document.createElement('div');
            el.className = 'exp-gem';
            var sz = 4 + Math.min(gem.value, 8);
            el.style.width = sz + 'px';
            el.style.height = sz + 'px';
            this._worldLayer.appendChild(el);
            gem.el = el;
            gem.radius = 5;
        }
        var dx = player.x - gem.x;
        var dy = player.y - gem.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.radius + gem.radius) {
            collected.push(gem);
        } else {
            var speed = 400;
            var move = speed * dt;
            if (move >= dist) {
                gem.x = player.x;
                gem.y = player.y;
                collected.push(gem);
            } else {
                gem.x += (dx / dist) * move;
                gem.y += (dy / dist) * move;
            }
        }
        gem.el.style.left = (gem.x - 4) + 'px';
        gem.el.style.top = (gem.y - 4) + 'px';
    }
    var anyLeveled = false;
    for (var ci = 0; ci < collected.length; ci++) {
        var cg = collected[ci];
        if (cg.el) { cg.el.remove(); cg.el = null; }
        if (!cg.collected) {
            cg.collected = true;
            var expVal = cg.value;
            if (player.xpGainFactor && player.xpGainFactor > 1.0) {
                expVal = Math.floor(expVal * player.xpGainFactor);
            }
            var leveled = player.gainExp(expVal);
            this._spawnExpText(player.x, player.y, cg.value);
            if (leveled) anyLeveled = true;
        }
        var idx = this._expGems.indexOf(cg);
        if (idx !== -1) this._expGems.splice(idx, 1);
    }
    if (anyLeveled) {
        this._levelUpPending = true;
        window.audioManager && window.audioManager.play('levelup');
        this._syncExpBar();
    }
};

Gp._rewardKill = function(enemy) {
    this.kills++;
    /* Epoch 32: 图鉴记录敌人类型 */
    if (window.saveManager && enemy.type) window.saveManager.recordCompendiumEntry('enemies', enemy.type);
    /* Epoch 3: Boss 击杀计数 */
    if (enemy.isBoss) {
        this._bossKillsThisRun = (this._bossKillsThisRun || 0) + 1;
        if (enemy.type === 'Boss_Lord') {
            this._finalBossKillsThisRun = (this._finalBossKillsThisRun || 0) + 1;
        }
    }
    if (enemy.type === 'Stalker' && this._currentLevelId === 'level_2') {
        this.stalkersKilledInLevel2++;
    }
    this._spawnCoinsAt(enemy.x, enemy.y, false, enemy.level);
    if (!enemy.isBoss) this._spawnExpGemsAt(enemy.x, enemy.y, false, enemy.level);
    if (this.player) {
        this.player.rage = Math.min(this.player.maxRage, this.player.rage + 5 + (this._tempBerserkBonus ? 10 : 0));
        if (this._tempBerserkBonus) this._tempBerserkBonus = false;
    }
};

Gp._resumeAfterReward = function() {
    if (window.rewardManager) window.rewardManager.hidePanel();
    for (var _el of this._enemyElements.values()) { if (_el && _el.parentNode) _el.remove(); }
    this._enemyElements.clear();
    this.enemies = [];
    for (var _c = 0; _c < this._activeCoins.length; _c++) this._activeCoins[_c].el.remove();
    this._activeCoins = [];
    this._bossTimer = 0;
    this._spawnTimer = 0;
    this._enemyIdCounter = 0;
    this._pendingReward = false;
    this._lastMoveX = 0;
    for (var _g = 0; _g < this._expGems.length; _g++) { if (this._expGems[_g].el) this._expGems[_g].el.remove(); }
    this._expGems = [];
    window.expGems = [];
    this._cleanAllProjectiles();
    this._cleanEnemyProjectiles();

    this._waveCount++;
    this.currentWaveSpawnedCount = 0;
    this._mutatorTriggered = false;
    this._clearMutatorEffects();
    this._clearTotems();
    this._cleanEnemyProjectiles();

    /* ── 检测 Boss Lord 波次 ── */
    this._bossLordWave = (this._waveCount >= this._getMaxWaves() - 1);
    this._bossLordSpawned = false;
    if (this._bossLord) this._bossLord = null;

    this._announceWave(this._waveCount);
};

Gp._resumeAfterLevelUp = function() {
    if (window.rewardManager) window.rewardManager.hidePanel();
    /* Epoch 2: 雀魂护盾 — 每10波触发 */
    this._checkQqueenShield();
    this._beginLoop();
};

Gp._checkQqueenShield = function() {
    var meta = window.saveManager._metaCache || {};
    var shieldLv = (meta.talents || {}).雀魂_shield || 0;
    if (shieldLv <= 0) return;
    /* 每10波触发一次 */
    if ((this._waveCount + 1) % 10 !== 0) return;
    if (this._shieldActive) return; /* 已在冷却中 */
    this._shieldActive = true;
    this._shieldTimer = 5 + shieldLv * 2; /* 基础5秒 + 每级2秒 */
    this.player.invulnTimer = this._shieldTimer;
    this._spawnCausalityText('🀄 雀魂护盾激活！持续 ' + this._shieldTimer + 's');
    if (this.container) {
        this.container.style.boxShadow = '0 0 60px rgba(30,111,66,0.6)';
    }
    var self = this;
    setTimeout(function() {
        self._shieldActive = false;
        if (self.container) self.container.style.boxShadow = '';
    }, this._shieldTimer * 1000);
};

Gp._showVictory = function() {
    window.audioManager && window.audioManager.play('victory');
    this._freezeClock();
    this.victoryTime.textContent = this._formatTime(this._elapsed);
    this.victoryKills.textContent = this.kills;

    var relicNames = {
        sharp_edge: '\u9510\u5229\u950b\u76f2', golden_finger: '\u9ec4\u91d1\u53f3\u624b\u6307',
        auto_drone: '\u81ea\u52a8\u5316\u968f\u4ece', thorn_armor: '\u8346\u68d8\u53cd\u5546\u7532',
        wind_walker: '\u75be\u98ce\u6b65', vamp_ring: '\u542e\u8840\u6307\u73af',
        explosive_core: '\u7206\u7834\u6838\u5fc3', frost_core: '\u51b0\u971c\u6838\u5fc3',
        evolved_drone: '\u6d88\u706d\u8005\u6d6e\u6e38\u70ae', evolved_armor: '\u592a\u9633\u795e\u5de8\u50cf\u94e0',
        evolved_speed: '\u51cc\u6ce2\u5fae\u6b65', evolved_vamp: '\u8840\u9b54\u4e4b\u62e5'
    };
    var parts = [];
    for (var id in this.player.relicLevels) {
        var lv = this.player.relicLevels[id];
        if (lv > 0) parts.push((relicNames[id] || id) + ' \u2605' + lv);
    }
    this.victoryRelics.textContent = parts.join(' | ') || '-';

    var tokens = window.saveManager.calcMetaTokens(this.kills, this._elapsed);
    this.victoryTokens.textContent = tokens;

    /* Contextual tips */
    this._buildVictoryTips();

    /* Show continue button on final level */
    if (this._currentLevelId === 'level_3') {
        this.victoryContinueBtn.style.display = '';
    } else {
        this.victoryContinueBtn.style.display = 'none';
    }

    this.victoryOverlay.classList.add('active');
    this._syncUI();

    /* ── Boss Gamble 结算 ── */
    if (this._gambleActive) {
        this._resolveGamble(true);
    }

    this._settleRun(tokens);
};

Gp._showAbyssPanel = function() {
    this._freezeClock();
    var self = this;
    var panel = document.createElement('div');
    panel.id = 'abyss-panel';
    panel.className = 'abyss-panel';
    var loopLabel = this.loopCount > 0 ? '\u65e0\u5c3d\u88c2\u9699\u7b2c ' + this.loopCount + ' \u5c42\u2014\u2014\u701b\u706d' : '\u521d\u59cb\u901a\u5173';
    panel.innerHTML =
        '<div class="abyss-title">\u6df1\u6e0a\u4e4b\u95e8\u5df2\u542f</div>' +
        '<div class="abyss-label">' + loopLabel + '</div>' +
        '<div class="abyss-subtitle">\u662f\u5426\u732e\u796d\u5f53\u524d\u901a\u5173\u6210\u679c\uff0c\u8e0f\u5165\u65e0\u5c3d\u88c2\u9699\u7b2c ' + (this.loopCount + 1) + ' \u5c42\uff1f</div>' +
        '<div class="abyss-warning">\u602a\u7269\u5c5e\u6027\u4e58\u4ee5 ' + (Math.pow(1.15, this.loopCount + 1)).toFixed(2) + 'x</div>' +
        '<div class="abyss-buttons">' +
            '<button class="abyss-btn abyss-btn-retreat">\u64a4\u9000\u5927\u672c\u8425</button>' +
            '<button class="abyss-btn abyss-btn-enter">\u8e0f\u5165\u6df1\u6e0a</button>' +
        '</div>';
    this.battlefield.appendChild(panel);
    this._abyssPanelVisible = true;

    panel.querySelector('.abyss-btn-retreat').addEventListener('click', function() {
        if (panel.parentNode) panel.remove();
        self._abyssPanelVisible = false;
        self._settleRun(window.saveManager.calcMetaTokens(self.kills, self._elapsed));
        self._showVictoryOverlay();
    });
    panel.querySelector('.abyss-btn-enter').addEventListener('click', function() {
        if (panel.parentNode) panel.remove();
        self._abyssPanelVisible = false;
        self._enterAbyss();
    });
};

Gp._enterAbyss = function() {
    this.loopCount++;
    this._waveCount = 0;
    this.currentWaveSpawnedCount = 0;
    this._elapsed = 0;
    this.kills = 0;
    this._spawnTimer = 0;
    this._spawnInterval = 1.5;
    this._difficultyTimer = 0;
    this._bossTimer = 0;
    this._bossLord = null;
    this._bossLordWave = false;
    this._bossLordSpawned = false;
    this._gambleActive = false;
    this._gambleType = null;
    this._gambleStaked = 0;
    this._pendingBossGamble = false;
    this._gambleAbyssBonus = false;
    this._mutatorTriggered = false;
    this._activeMutator = null;
    this._pendingReward = false;
    this._levelUpPending = false;
    this.playerHitCountInLevel1 = 0;
    this.stalkersKilledInLevel2 = 0;
    this._interWaveEvent = null;
    this._interWaveTimer = 0;
    this._tempEnemyAtkDebuff = 0;
    this._tempEnemySpeedDebuff = 0;
    this._tempBerserkBonus = false;
    this._tempGoldMult = 1;
    this._tempCritBonus = 0;
    this._tempShield = 0;
    this._extraEliteCount = 0;
    this._milestoneShown = false;

    /* ── 深渊轮回保留保险库变异 ── */
    if (this._vaultMutations && this._vaultMutations.indexOf('gravity') !== -1) {
        this.player.magnetRadius = 0;
    }

    for (var _el of this._enemyElements.values()) { if (_el && _el.parentNode) _el.remove(); }
    this._enemyElements.clear();
    this.enemies = [];
    this._enemyIdCounter = 0;
    this._clearTotems();
    this._cleanEnemyProjectiles();
    this.gameOver = false;
    var vpW = this.battlefield.clientWidth;
    var vpH = this.battlefield.clientHeight;
    this.cameraX = Math.max(0, Math.min(this._mapW - vpW, this.player.x - vpW / 2));
    this.cameraY = Math.max(0, Math.min(this._mapH - vpH, this.player.y - vpH / 2));
    this._syncEntities();
    this._syncPlayerHP();
    this._syncUI();
    this._announceWave(0);
};

Gp._showVictoryOverlay = function() {
    this._freezeClock();
    this.victoryTime.textContent = this._formatTime(this._elapsed);
    this.victoryKills.textContent = this.kills;
    var tokens = window.saveManager.calcMetaTokens(this.kills, this._elapsed);
    this.victoryTokens.textContent = tokens;

    /* Contextual tips */
    this._buildVictoryTips();

    /* Show continue button on final level */
    if (this._currentLevelId === 'level_3') {
        this.victoryContinueBtn.style.display = '';
    } else {
        this.victoryContinueBtn.style.display = 'none';
    }

    this.victoryOverlay.classList.add('active');
    this._syncUI();
};

Gp._buildVictoryTips = function() {
    var self = this;
    var meta = window.saveManager._metaCache || {};
    var tokens = meta.metaTokens || 0;
    var heroes = meta.unlockedHeroes || ['Knight'];
    var parts = [];

    /* Loop-based tip */
    if (this.loopCount === 0) {
        parts.push('<span class="tip-first">🏆 首次通关！再次击败最终BOSS可进入无尽深渊轮回</span>');
    } else {
        var mult = Math.pow(1.15, this.loopCount + 1).toFixed(2);
        parts.push('<span class="tip-abyss">🌀 无尽深渊第 ' + this.loopCount + ' 层 — 怪物属性 ×' + mult + '</span>');
    }

    /* Meta token tip */
    if (tokens >= 100) {
        parts.push('<span class="tip-gold">💰 你有 ' + tokens + ' 元代币 — 可在主界面商城解锁强力perk</span>');
    }

    /* Single hero tip */
    if (heroes.length <= 1) {
        parts.push('<span class="tip-hero">🗡️ 尝试在主界面酒馆解锁其他英雄体验不同玩法</span>');
    }

    this.victoryTipsEl.innerHTML = parts.join('<br>');
};

Gp._continueChallenge = function() {
    this.victoryOverlay.classList.remove('active');
    this._enterAbyss();
};

Gp._spawnCausalityText = function(text) {
    /* Epoch 5: 委托因果文本到 CombatSystem */
    if (this._combat && this._combat.spawnCausalityText) {
        return this._combat.spawnCausalityText(this, text);
    }
    var el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:absolute;top:20%;left:50%;transform:translate(-50%,-50%);font-size:24px;font-weight:900;color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,0.8),0 0 40px rgba(255,215,0,0.4);z-index:200;pointer-events:none;white-space:nowrap;animation:floatUp 0.6s ease-out forwards;';
    this.battlefield.appendChild(el);
    var self = this;
    setTimeout(function() { if (el.parentNode) el.remove(); }, 2000);
};

Gp._settleRun = async function(tokens) {
    var meta = await window.saveManager.getMeta();
    meta.metaTokens = (meta.metaTokens || 0) + tokens;
    meta.totalRuns = (meta.totalRuns || 0) + 1;
    meta.totalKills = (meta.totalKills || 0) + this.kills;
    /* Epoch 3: 保存局内成就计数器到 meta */
    meta.overdriveCount = (meta.overdriveCount || 0) + (this._overdriveCount || 0);
    meta.bossKills = (meta.bossKills || 0) + (this._bossKillsThisRun || 0);
    meta.finalBossKills = (meta.finalBossKills || 0) + (this._finalBossKillsThisRun || 0);
    meta.totalCrits = (meta.totalCrits || 0) + (this._totalCritsThisRun || 0);
    meta.totalDodges = (meta.totalDodges || 0) + (this._totalDodgesThisRun || 0);
    meta.maxGoldThisRun = Math.max(meta.maxGoldThisRun || 0, this._maxGoldThisRun || 0);
    /* 检查套装共鸣成就 */
    if (this.player && this.player.setResonanceSpeed && this.player.setResonanceIce) {
        meta.fullSetActivated = true;
    }
    var bonusCores = 1;
    if (this._bloodRageActive) bonusCores += 2;
    /* Epoch 2: 核心共鸣天赋 */
    var metaForResonance = window.saveManager._metaCache || {};
    var coreResLevel = (metaForResonance.talents || {}).core_resonance || 0;
    if (coreResLevel > 0) {
        bonusCores = Math.floor(bonusCores * (1 + coreResLevel * 0.1));
    }
    /* ── 变异保险库：每携带一个异变，核心翻倍 ── */
    if (this._vaultMutations && this._vaultMutations.length > 0) {
        bonusCores *= Math.pow(2, this._vaultMutations.length);
    }
    meta.bossCores = (meta.bossCores || 0) + bonusCores;

    /* ── Epoch 15: 精英模式核心加成 ── */
    if (this._eliteModeActive) {
        meta.bossCores = Math.floor(meta.bossCores * 1.5);
    }

    /* ── 因果账本落盘 ── */
    if (!meta.causalityFlags) meta.causalityFlags = { level1NoDamage: false, level2Overkill: false };
    if (this._currentLevelId === 'level_1' && this.playerHitCountInLevel1 === 0) {
        meta.causalityFlags.level1NoDamage = true;
    }
    if (this._currentLevelId === 'level_2' && this.stalkersKilledInLevel2 >= 30) {
        meta.causalityFlags.level2Overkill = true;
    }

    /* ── 深渊最高记录 ── */
    if (this.loopCount > (meta.highestEndlessLoop || 0)) {
        meta.highestEndlessLoop = this.loopCount;
    }

    meta.lastSaveTimestamp = Date.now();

    /* ── Epoch 36: 每周金库结算 ── */
    if (typeof window.saveManager.evaluateWeeklyVault === 'function') {
        var runStats = {
            kills: this.kills,
            overdriveCount: this._overdriveCount || 0,
            elapsed: this._elapsed,
            maxGold: this._maxGoldThisRun || 0,
            uniqueRelics: Object.keys(this.player.relicLevels || {}).filter(function(k) { return (this.player.relicLevels[k] || 0) > 0; }).length,
            bossKills: this._bossKillsThisRun || 0,
            abyssDepth: this.loopCount || 0,
            dodges: this._totalDodgesThisRun || 0,
            crits: this._totalCritsThisRun || 0,
            waves: this._waveCount || 0,
            hitsTaken: this._playerHitCountThisRun || 0,
            won: !this.gameOver
        };
        var vaultResult = window.saveManager.evaluateWeeklyVault(runStats);
        if (vaultResult.evaluated && vaultResult.completed) {
            console.log('[Vault] 金库挑战完成:', vaultResult.reward);
        }
    }

    await window.saveManager.saveMeta(meta);
    await window.saveManager.clearActiveRun();

    /* ── 成就：局末型检测 ── */
    /* 击杀类 */
    if ((meta.totalKills || 0) >= 1)    this._checkAchievement('first_kill');
    if ((meta.totalKills || 0) >= 100)  this._checkAchievement('hundred_kills');
    if ((meta.totalKills || 0) >= 1000) this._checkAchievement('thousand_kills');
    if ((meta.totalKills || 0) >= 10000) this._checkAchievement('ten_thousand_kills');
    /* 通关类 */
    if ((meta.totalRuns || 0) >= 1)     this._checkAchievement('first_victory');
    if ((meta.totalRuns || 0) >= 10)    this._checkAchievement('victory_10');
    if ((meta.totalRuns || 0) >= 50)    this._checkAchievement('victory_50');
    /* 深渊类 */
    if ((meta.highestEndlessLoop || 0) >= 5) this._checkAchievement('deep_abyss');
    if ((meta.highestEndlessLoop || 0) >= 10) this._checkAchievement('deep_abyss_10');
    if ((meta.highestEndlessLoop || 0) >= 20) this._checkAchievement('deep_abyss_20');
    /* 无伤 */
    if (this._playerHitCountThisRun === 0) {
        meta.flawlessRuns = (meta.flawlessRuns || 0) + 1;
    }
    if ((meta.flawlessRuns || 0) >= 1) this._checkAchievement('flawless');
    if ((meta.flawlessRuns || 0) >= 5) this._checkAchievement('flawless_5');
    /* Boss 击杀 */
    if ((meta.bossKills || 0) >= 10) this._checkAchievement('boss_slayer');
    if ((meta.finalBossKills || 0) >= 5) this._checkAchievement('final_boss_down');
    /* 英雄解锁 */
    if ((meta.unlockedHeroes || []).length >= 3) this._checkAchievement('all_heroes');
    /* 套装共鸣 */
    if (meta.fullSetActivated) this._checkAchievement('full_set');
    /* 金币 */
    if ((meta.maxGoldThisRun || 0) >= 1000) this._checkAchievement('get_rich');
    if ((meta.maxGoldThisRun || 0) >= 10000) this._checkAchievement('gold_10k');

    /* ── 变异保险库：20%概率解锁新突变 ── */
    if (Math.random() < 0.2) {
        var _allMuts = ['gravity', 'bloodmoon', 'frenzy', 'frailty', 'wither'];
        var _unlocked = meta.unlockedMutations || [];
        var _avail = [];
        for (var _umi = 0; _umi < _allMuts.length; _umi++) {
            if (_unlocked.indexOf(_allMuts[_umi]) === -1) _avail.push(_allMuts[_umi]);
        }
        if (_avail.length > 0) {
            var _newMut = _avail[Math.floor(Math.random() * _avail.length)];
            _unlocked.push(_newMut);
            meta.unlockedMutations = _unlocked;
            await window.saveManager.saveMeta(meta);
            var _label = _newMut === 'gravity' ? '\u5f15\u529b\u9006\u8f6c' : '\u72c2\u66b4\u8840\u6708';
            var _notif = document.createElement('div');
            _notif.className = 'mutation-unlock-notif';
            _notif.innerHTML = '\u89e3\u9501\u53d8\u5f02: ' + _label;
            document.body.appendChild(_notif);
            setTimeout(function() { if (_notif.parentNode) _notif.remove(); }, 3000);
        }
    }

    /* ── Epoch 15/23: 战局历史记录 ── */
    var uniqueRelics = Object.keys(this.player.relicLevels || {}).filter(function(k) { return (this.player.relicLevels[k] || 0) > 0; }).length;
    var _wc = [];
    try {
        if (typeof window.saveManager.recordRunHistory === 'function') {
            window.saveManager.recordRunHistory(
                this.player.heroId, this._currentLevelId, this.kills, this._elapsed,
                !this.gameOver, this.loopCount || 0, uniqueRelics, _wc
            );
        }
    } catch(e) { console.warn('[GameEngine] error:', e); }
};

Gp._gameOver = async function() {
    if (this.gameOver) return;
    window.audioManager && window.audioManager.play('gameover');
    this.gameOver = true;
    this.running = false;
    this._freezeClock();
    for (var _c = 0; _c < this._activeCoins.length; _c++) this._activeCoins[_c].el.remove();
    this._activeCoins = [];
    for (var _g = 0; _g < this._expGems.length; _g++) { if (this._expGems[_g].el) this._expGems[_g].el.remove(); }
    this._expGems = [];
    window.expGems = [];
    this._cleanAllProjectiles();
    this._cleanEnemyProjectiles();
    this._resetAllWeapons();
    this._clearTotems();
    this._mutatorTriggered = false;
    this._clearMutatorEffects();
    if (this.mutatorOverlay) this.mutatorOverlay.classList.remove('active');
    if (this.bossHpBar) this.bossHpBar.classList.remove('active');
    for (var _el of this._enemyElements.values()) { if (_el && _el.parentNode) _el.remove(); }
    this._enemyElements.clear();
    this.enemies = [];
    this._bossLord = null;
    this._bossLordWave = false;
    this._bossLordSpawned = false;

    /* ── Boss Gamble 失败结算 ── */
    if (this._gambleActive) {
        this._resolveGamble(false);
    }
    this._gambleActive = false;
    this._gambleType = null;
    this._gambleStaked = 0;
    this._pendingBossGamble = false;
    this._gambleAbyssBonus = false;

    this.resultTime.textContent = this._formatTime(this._elapsed);
    this.resultKills.textContent = this.kills;
    this.resultWave.textContent = (this._waveCount || 0) + ' / ' + (this._totalWaves || 0);
    this.gameOverOverlay.classList.add('active');

    /* 死亡提示 */
    var deathTips = document.getElementById('death-tips');
    if (deathTips) {
        var tips = [];
        if (this.kills < 10) tips.push('💡 尝试先提升攻击力，圣物选择优先锐利锋芒');
        else if (this.kills < 50) tips.push('💡 装备系统可提供额外防御，回大本营查看');
        else if (this._elapsed < 60) tips.push('💡 速度很快！尝试挑战深渊之门获取额外奖励');
        else tips.push('💡 坚持得不错！试试选择不同的英雄或升级天赋');
        deathTips.textContent = tips[0];
    }

    /* 补偿信息 — 元代币将在下方 meta 结算后显示 */

    var tokens = window.saveManager.calcMetaTokens(this.kills, this._elapsed);

    var meta = await window.saveManager.getMeta();
    meta.metaTokens = (meta.metaTokens || 0) + tokens;
    meta.totalRuns = (meta.totalRuns || 0) + 1;
    meta.totalKills = (meta.totalKills || 0) + this.kills;

    /* Epoch 14: 运行统计 */
    try {
        var ur = Object.keys(this.player.relicLevels || {}).filter(function(k) { return (this.player.relicLevels[k] || 0) > 0; }).length;
        if (typeof window.saveManager.recordRunStats === 'function') {
            window.saveManager.recordRunStats(this.kills, this._elapsed, this._maxGoldThisRun || 0, this._overdriveCount || 0, this._totalDodgesThisRun || 0, this._totalCritsThisRun || 0, this._waveCount, this._bossKillsThisRun || 0, this.loopCount || 0, false, this._playerHitCountThisRun || 0, ur);
        }
    } catch(e) { console.warn('[GameEngine] error:', e); }
    /* ── Epoch 14: 挑战完成检查 ── */
    var challengeResults = null;
    try {
        if (typeof window.mainHubCheckChallenge === 'function') {
            challengeResults = window.mainHubCheckChallenge(this);
        }
    } catch(e) { console.warn('[GameEngine] error:', e); }
    if (challengeResults && challengeResults.completed && challengeResults.completed.length > 0) {
        meta.metaTokens = (meta.metaTokens || 0) + (challengeResults.bonusTokens || 0);
        meta.bossCores = (meta.bossCores || 0) + (challengeResults.bonusCores || 0);
        var chText = '🎯 挑战完成: ' + challengeResults.completed.length + ' 项';
        if (challengeResults.bonusTokens) chText += ' +' + challengeResults.bonusTokens + ' 代币';
        if (challengeResults.bonusCores) chText += ' +' + challengeResults.bonusCores + ' 核心';
        this._spawnCausalityText(chText);
    }

    /* Epoch 18: 每周超级挑战 */
    var weeklyCompleted = [];
    try {
        var weeklyStats = { kills: this.kills, elapsed: this._elapsed, overdriveCount: this._overdriveCount || 0, maxGold: this._maxGoldThisRun || 0, hitsTaken: this._playerHitCountThisRun || 0, bossKills: this._bossKillsThisRun || 0, abyssDepth: this.loopCount || 0, dodges: this._totalDodgesThisRun || 0, crits: this._totalCritsThisRun || 0, won: false };
        if (typeof window.saveManager.checkWeeklyCompletion === 'function') {
            var wc = window.saveManager.checkWeeklyCompletion(weeklyStats);
            weeklyCompleted = wc.completed || [];
            if (wc.completed && wc.completed.length > 0) {
                meta.metaTokens = (meta.metaTokens || 0) + wc.bonusTokens;
                meta.bossCores = (meta.bossCores || 0) + wc.bonusCores;
                this._spawnCausalityText('🏆 周常完成: ' + wc.completed.length + ' 项');
            }
        }
    } catch(e) { console.warn('[GameEngine] error:', e); }

    /* Epoch 31: 每日任务完成检查 */
    try {
        var dailyStats = { kills: this.kills, elapsed: this._elapsed, overdriveCount: this._overdriveCount || 0, maxGold: this._maxGoldThisRun || 0, hitsTaken: this._playerHitCountThisRun || 0, won: !this.gameOver, waves: this._waveCount || 0, crits: this._totalCritsThisRun || 0, dodges: this._totalDodgesThisRun || 0, abyssDepth: this.loopCount || 0 };
        if (typeof window.saveManager.checkDailyQuestCompletion === 'function') {
            var completedQuests = window.saveManager.checkDailyQuestCompletion(dailyStats);
            if (completedQuests.length > 0) {
                this._spawnCausalityText('✅ 每日任务完成: ' + completedQuests.join(', '));
            }
        }
    } catch(e) { console.warn('[GameEngine] error:', e); }

    /* ── Epoch 14: 运行统计记录 ── */
    var uniqueRelics = Object.keys(this.player.relicLevels || {}).filter(function(k) { return (this.player.relicLevels[k] || 0) > 0; }).length;
    if (typeof window.saveManager.recordRunStats === 'function') {
        window.saveManager.recordRunStats(
            this.kills, this._elapsed, this._maxGoldThisRun || 0,
            this._overdriveCount || 0, this._totalDodgesThisRun || 0,
            this._totalCritsThisRun || 0, this._waveCount,
            this._bossKillsThisRun || 0, this.loopCount || 0,
            !this.gameOver, this._playerHitCountThisRun || 0, uniqueRelics
        );
    }

    meta.lastSaveTimestamp = Date.now();
    await window.saveManager.saveMeta(meta);

    /* 显示补偿信息 */
    var compEl = document.getElementById('death-compensation');
    if (compEl) {
        compEl.textContent = '💰 获得 ' + tokens + ' 元代币' + (weeklyCompleted.length > 0 ? ' | 周常+' + weeklyCompleted.length : '');
    }

    /* Epoch 19: 游戏死亡也记录历史 */
    try {
        var ur = Object.keys(this.player.relicLevels || {}).filter(function(k) { return (this.player.relicLevels[k] || 0) > 0; }).length;
        if (typeof window.saveManager.recordRunHistory === 'function') {
            window.saveManager.recordRunHistory(
                this.player.heroId, this._currentLevelId, this.kills, this._elapsed,
                false, this.loopCount || 0, ur, weeklyCompleted
            );
        }
    } catch(e) { console.warn('[GameEngine] error:', e); }

    /* Epoch 31: 死亡奖励 */
    try {
        var deathReward = window.saveManager.calcDeathReward(this.kills, this._maxGoldThisRun || 0, this._elapsed);
        if (deathReward.metaTokens > 0 || deathReward.bossCores > 0) {
            meta.metaTokens = (meta.metaTokens || 0) + deathReward.metaTokens;
            meta.bossCores = (meta.bossCores || 0) + deathReward.bossCores;
            this._spawnCausalityText('💀 死亡补偿: +' + deathReward.metaTokens + ' 代币' + (deathReward.bossCores > 0 ? ' +' + deathReward.bossCores + ' 核心' : ''));
        }
    } catch(e) { console.warn('[GameEngine] error:', e); }

    /* Epoch 31: 更新本地排行榜 */
    try {
        var lbStats = {
            won: !this.gameOver,
            elapsed: this._elapsed,
            bestAbyssDepth: this.loopCount || 0,
            totalKills: (meta.totalKills || 0) + this.kills,
            totalGold: (meta.runStats && meta.runStats.totalGold) || 0,
            perfectRuns: (meta.runStats && meta.runStats.perfectRuns) || 0
        };
        if (typeof window.saveManager.updateLeaderboard === 'function') {
            window.saveManager.updateLeaderboard(lbStats);
        }
    } catch(e) { console.warn('[GameEngine] error:', e); }

    await window.saveManager.clearActiveRun();
};

Gp._removeEnemyDOM = function(enemy) {
    var el = this._enemyElements.get(enemy.id);
    if (el && el.parentNode) el.remove();
    this._enemyElements.delete(enemy.id);
};

Gp._initHandTiles = function() {
    if (!this._handTileGrid) return;
    this._handTileGrid.innerHTML = '';
    this._handTileSlots = [];
    for (var i = 0; i < 14; i++) {
        var slot = document.createElement('div');
        slot.className = 'hand-tile-slot';
        slot.dataset.index = i;
        this._handTileGrid.appendChild(slot);
        this._handTileSlots.push(slot);
    }
    if (this._handTileBar) this._handTileBar.classList.add('active');
};

Gp._placeHandTile = function(index, tileText, tileClass) {
    if (!this._handTileSlots[index]) return;
    var slot = this._handTileSlots[index];
    slot.classList.add('occupied');
    slot.innerHTML = '<div class="tile-body ' + (tileClass || '') + '">' + tileText + '</div>';
};

Gp._clearHandTile = function(index) {
    if (!this._handTileSlots[index]) return;
    this._handTileSlots[index].classList.remove('occupied');
    this._handTileSlots[index].innerHTML = '';
};

Gp._syncPlayerHP = function() {
    var pct = (this.player.hp / this.player.maxHp) * 100;
    this.playerHpFill.style.width = Math.max(0, pct) + '%';
    this.playerHpText.textContent = Math.max(0, Math.floor(this.player.hp)) + '/' + this.player.maxHp;
};

/* ── 2.5D 骨雕雀牌渲染 ── */

Gp._renderPlayerTile = function() {
    if (!this.playerEl) return;
    /* 雀牌 — 骨雕麻将质感 */
    this.playerEl.style.width = '48px';
    this.playerEl.style.height = '64px';
    this.playerEl.style.background = '#fbfbf7';
    this.playerEl.style.borderRadius = '6px';
    this.playerEl.style.boxShadow = '0 4px 0 #1a5336, 0 6px 0.5px #dfc590, 0 8px 10px rgba(0,0,0,0.5)';
    this.playerEl.style.display = 'flex';
    this.playerEl.style.alignItems = 'center';
    this.playerEl.style.justifyContent = 'center';
    this.playerEl.style.fontSize = '24px';
    this.playerEl.style.fontWeight = '900';
    this.playerEl.style.color = '#b62929';
    this.playerEl.style.textShadow = '0 0 8px rgba(182,41,41,0.6)';
    this.playerEl.textContent = '雀';
};

Gp._syncEntities = function() {
    this._worldLayer.style.transform = 'translate(' + (-this.cameraX) + 'px, ' + (-this.cameraY) + 'px)';
    var tilt = '';
    if (Math.abs(this._lastMoveX) > 0.1) {
        var deg = this._lastMoveX < -0.1 ? -6 : 6;
        tilt = ' rotate(' + deg + 'deg)';
    }
    this.playerEl.style.left = this.player.x + 'px';
    this.playerEl.style.top = this.player.y + 'px';
    this.playerEl.style.transform = 'translate(-50%,-50%)' + tilt;
    this.playerEl.classList.toggle('invuln', this.player.invulnTimer > 0);

    /* 雀牌受击发光 */
    if (this.player.invulnTimer > 0) {
        this.playerEl.style.filter = 'drop-shadow(0 0 8px rgba(182,41,41,0.8))';
    } else {
        this.playerEl.style.filter = 'drop-shadow(0 0 6px rgba(26,83,54,0.4))';
    }

    for (var _ei = 0; _ei < this.enemies.length; _ei++) {
        var enemy = this.enemies[_ei];
        var el = this._enemyElements.get(enemy.id);
        if (!el) continue;
        el.style.left = enemy.x + 'px';
        el.style.top = enemy.y + 'px';
        var flash = enemy.flashTimer > 0;
        var isFinalBoss = enemy.isBoss && enemy.radius >= 75;
        el.classList.toggle('frozen', enemy.frozen);
        el.style.backgroundColor = flash ? '#b62929' : (enemy.isBoss ? (isFinalBoss ? '#6a1a1a' : 'hsl(' + enemy.hue + ', 40%, 30%)') : 'hsl(' + enemy.hue + ', 25%, 28%)');
        el.style.boxShadow = flash ? '0 0 18px rgba(182,41,41,0.6)' : (enemy.isBoss ? (isFinalBoss ? '0 0 60px rgba(182,41,41,0.7)' : '0 0 40px rgba(156,39,176,0.5)') : '0 0 10px hsla(' + enemy.hue + ', 25%, 28%, 0.35)');
        var fill = enemy._hpFill || el.querySelector('.enemy-hp-fill');
        if (fill) {
            if (!enemy._hpFill) enemy._hpFill = fill;
            var pct = (enemy.hp / enemy.maxHp) * 100;
            fill.style.width = Math.max(0, pct) + '%';
        }
    }
};

Gp._checkAchievement = function(id) {
    var meta = window.saveManager && window.saveManager._metaCache;
    if (!meta) return;
    meta.achievements = meta.achievements || {};
    if (meta.achievements[id]) return; /* 已解锁 */
    meta.achievements[id] = true;
    meta.achievements[id + '_at'] = Date.now();
    window.saveManager._saveMetaToStorage();
    var cfg = window.achievementConfig;
    for (var i = 0; i < cfg.length; i++) {
        if (cfg[i].id === id) {
            this._spawnAchievementText(cfg[i].icon + ' ' + cfg[i].name);
            break;
        }
    }
};

/* Epoch 3: 局内成就检测（基于运行时数值） */
Gp._checkAchievementInflight = function(id, currentValue) {
    var check = window.achievementCheck && window.achievementCheck.inflight && window.achievementCheck.inflight[id];
    if (!check) return;
    if (check(this, currentValue)) {
        this._checkAchievement(id);
    }
};

/* ── 成就弹出提示：大字体，短暂停留 ── */
Gp._spawnAchievementText = function(text) {
    /* Epoch 5: 委托成就文本到 CombatSystem */
    if (this._combat && this._combat.spawnAchievementText) {
        return this._combat.spawnAchievementText(this, text);
    }
    var el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:absolute;top:15%;left:50%;transform:translate(-50%,-50%);font-size:28px;font-weight:900;color:#ffd700;text-shadow:0 0 24px rgba(255,215,0,0.9),0 0 48px rgba(255,215,0,0.5);z-index:210;pointer-events:none;white-space:nowrap;animation:achievePop 2.5s ease-out forwards;';
    this.battlefield.appendChild(el);
    var self = this;
    setTimeout(function() { if (el.parentNode) el.remove(); }, 2600);
};

Gp._syncUI = function() {
    this.waveDisplay.textContent = '\uD83C\uDF0A \u7b2c ' + (this._waveCount + 1) + ' \u6ce2';

    /* \u2500\u2500 Wave milestone banner at 75% \u2500\u2500 */
    var maxWaves = this._getMaxWaves();
    if (this.waveMilestoneBanner && maxWaves > 0 && this._waveCount > 0) {
        var threshold75 = Math.ceil(maxWaves * 0.75);
        if (this._waveCount >= threshold75 && !this._milestoneShown) {
            this.waveMilestoneBanner.textContent = '\uD83D\uDD25 \u7EC8\u5C40\u903C\u8FD1 \u2014 \u6700\u540E ' + (maxWaves - this._waveCount) + ' \u6ce2\uFF01';
            this.waveMilestoneBanner.classList.add('visible');
            this._milestoneShown = true;
        } else if (this._waveCount < threshold75) {
            this.waveMilestoneBanner.classList.remove('visible');
            this._milestoneShown = false;
        }
    }

    this.goldDisplay.textContent = '\uD83D\uDCB0 ' + this.player.gold;
    this.atkDisplay.textContent = '\u2694\uFE0F ' + this.player.atk;
    this.killsDisplay.textContent = '\u2620\uFE0F ' + this.kills;
    this.timeDisplay.textContent = '\u23F1 ' + this._formatTime(this._elapsed);

    /* \u6210\u5C31\uFF1A\u91D1\u5E01\u68C0\u6D4B */
    if (this.player.gold > (this._maxGoldThisRun || 0)) {
        this._maxGoldThisRun = this.player.gold;
        if (this._maxGoldThisRun >= 1000) this._checkAchievement('get_rich');
    }
    this._syncExpBar();
    this._syncWeaponSlotBar();

    /* ── 怒气条同步 ── */
    if (this.rageDisplay && this.player) {
        var ragePct = this.player.maxRage > 0 ? (this.player.rage / this.player.maxRage * 100) : 0;
        this.rageDisplay.style.width = Math.min(100, Math.max(0, ragePct)) + '%';
        var rtxt = document.getElementById('rage-bar-text');
        if (rtxt) rtxt.textContent = '\u6124\u6012 ' + this.player.rage + ' / ' + this.player.maxRage;
    }

    /* ── Boss Lord 血条同步 ── */
    if (this._bossLord && this._bossLord.alive && this.bossHpFill) {
        var pct = (this._bossLord.hp / this._bossLord.maxHp) * 100;
        this.bossHpFill.style.width = Math.max(0, pct) + '%';
    }

    /* Epoch 38: 共振指示 */
    this._updateResonancePills();
};

Gp._syncExpBar = function() {
    if (!this.expBarFill || !this.expBarText || !this.player) return;
    var pct = this.player.nextLvlExp > 0 ? (this.player.currentExp / this.player.nextLvlExp * 100) : 0;
    if (pct > 100) pct = 100;
    this.expBarFill.style.width = pct + '%';
    this.expBarText.textContent = 'Lv.' + this.player.currentLvl + ' [ ' + this.player.currentExp + ' / ' + this.player.nextLvlExp + ' ]';
};

Gp._moveTo = function(wx, wy) {
    this.player.targetX = wx;
    this.player.targetY = wy;
    this.player._movingToTarget = true;
};

Gp._triggerKnightDodgeSlam = function() {
    var px = this.player.x;
    var py = this.player.y;
    var slamRadius = 100;
    var slamEl = document.createElement('div');
    slamEl.className = 'knight-slam';
    slamEl.style.left = (px - slamRadius) + 'px';
    slamEl.style.top = (py - slamRadius) + 'px';
    slamEl.style.width = (slamRadius * 2) + 'px';
    slamEl.style.height = (slamRadius * 2) + 'px';
    slamEl.style.borderRadius = '50%';
    slamEl.style.position = 'absolute';
    slamEl.style.border = '2px solid rgba(255,255,255,0.6)';
    slamEl.style.pointerEvents = 'none';
    this._worldLayer.appendChild(slamEl);
    this.triggerShake(1, 200);
    setTimeout(function() { if (slamEl.parentNode) slamEl.remove(); }, 300);
    for (var i = 0; i < this.enemies.length; i++) {
        var e = this.enemies[i];
        if (!e.alive) continue;
        var dx = e.x - px;
        var dy = e.y - py;
        if (dx * dx + dy * dy <= slamRadius * slamRadius) {
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            var force = 200;
            e.x += (dx / dist) * force;
            e.y += (dy / dist) * force;
            e._knockbackVelocity = 200;
            if (typeof e._clampPosition === 'function') e._clampPosition(this);
        }
    }
};

Gp._onClick = function(e) {
    var enemyEl = e.target.closest('.enemy');
    if (!enemyEl) return;

    var id = parseInt(enemyEl.dataset.id, 10);
    var enemy = null;
    for (var _si = 0; _si < this.enemies.length; _si++) { if (this.enemies[_si].id === id) { enemy = this.enemies[_si]; break; } }
    if (!enemy || !enemy.alive) return;

    var bfRect = this.battlefield.getBoundingClientRect();
    var vx = e.clientX - bfRect.left;
    var vy = e.clientY - bfRect.top;
    var wx = vx + this.cameraX;
    var wy = vy + this.cameraY;

    var p = this.player;

    if (p.freezeChance > 0 && Math.random() < p.freezeChance) {
        enemy.frozen = true;
        enemy.frozenTimer = 1.5 + (p.iceDurationBonus || 0);
        if (enemy.el) enemy.el.classList.add('frozen-crystal');
    }

    var isCrit = Math.random() < (p.critRate + (this._tempCritBonus || 0));
    if (this._tempCritBonus) this._tempCritBonus = 0;
    /* Epoch 32: 临时攻击增益 */
    var atkMult = 1 + (p._tempAtkBoost || 0);
    var damage = isCrit ? Math.floor(p.atk * atkMult * 2.5) : Math.floor(p.atk * atkMult);
    if (damage === 0) return;

    enemy.takeDamage(damage, this.player, undefined, undefined, isCrit ? 'crit' : undefined);
    /* Epoch 36: 攻击音效 */
    if (isCrit) window.audioManager && window.audioManager.play('crit');
    else window.audioManager && window.audioManager.play('attack');
    if (p.freezeChance > 0 && Math.random() < p.freezeChance) {
        window.audioManager && window.audioManager.play('freeze');
    }

    /* Epoch 3: 暴击计数 */
    if (isCrit) {
        this._totalCritsThisRun = (this._totalCritsThisRun || 0) + 1;
        this._checkAchievementInflight('crit_master', this._totalCritsThisRun);
    }

    if (isCrit) this.triggerShake(2, 300);

    if (p.lifestealRate > 0) {
        var heal = Math.floor(damage * p.lifestealRate);
        if (heal > 0) {
            p.hp = Math.min(p.maxHp, p.hp + heal);
            this._spawnHealText(p.x, p.y, heal);
        }
    }

    if (p.explosionChance > 0 && Math.random() < p.explosionChance) {
        window.audioManager && window.audioManager.play('explode');
        var splashDmg = Math.floor(damage * 0.5);
        this._spawnExplosion(wx, wy, 50, splashDmg, enemy.id);
    }
};

Gp._spawnFloatText = function(x, y, text, isCrit) {
    if (window.fxManager) {
        window.fxManager.spawnText(x, y, text, isCrit ? 'crit' : 'normal');
        return;
    }
    var el = document.createElement('div');
    el.className = 'damage-float' + (isCrit ? ' crit' : '');
    el.textContent = '-' + text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    /* 竹翠青普通伤害，朱砂红暴击 */
    if (isCrit) {
        el.style.color = '#b62929';
    } else {
        el.style.color = '#1e6f42';
    }
    this._worldLayer.appendChild(el);
    setTimeout(function() { el.remove(); }, 650);
};

Gp._spawnHealText = function(x, y, amount) {
    window.audioManager && window.audioManager.play('heal', { volume: 0.3 });
    if (window.fxManager) {
        window.fxManager.spawnText(x, y - 20, '+' + amount, 'heal');
        return;
    }
    var el = document.createElement('div');
    el.className = 'damage-float heal';
    el.textContent = '+' + amount;
    el.style.left = x + 'px';
    el.style.top = (y - 20) + 'px';
    this._worldLayer.appendChild(el);
    setTimeout(function() { el.remove(); }, 650);
};

Gp._spawnExpText = function(x, y, amount) {
    if (window.fxManager) {
        window.fxManager.spawnText(x - 10, y - 40, '+' + amount + 'EXP', 'exp');
        return;
    }
    var el = document.createElement('div');
    el.className = 'damage-float exp-gain';
    el.textContent = '+' + amount + 'EXP';
    el.style.left = (x - 10) + 'px';
    el.style.top = (y - 40) + 'px';
    this._worldLayer.appendChild(el);
    setTimeout(function() { el.remove(); }, 650);
};

Gp._spawnExplosion = function(x, y, radius, damage, excludeId) {
    /* Epoch 5: 委托爆炸到 CombatSystem */
    if (this._combat && this._combat.spawnExplosion) {
        return this._combat.spawnExplosion(this, x, y, radius, damage, excludeId);
    }
    for (var _ei = 0; _ei < this.enemies.length; _ei++) {
        var e = this.enemies[_ei];
        if (!e.alive) continue;
        if (e.id === excludeId) continue;
        var dx = e.x - x;
        var dy = e.y - y;
        if (dx * dx + dy * dy <= radius * radius) {
            e.takeDamage(damage, 'splash');
        }
    }
    var el = document.createElement('div');
    el.className = 'explosion-effect';
    var d = radius * 2;
    el.style.left = (x - radius) + 'px';
    el.style.top = (y - radius) + 'px';
    el.style.width = d + 'px';
    el.style.height = d + 'px';
    this._worldLayer.appendChild(el);
    setTimeout(function() { el.remove(); }, 400);
};

Gp._screenShake = function() {
    this.triggerShake(1, 200);
};

Gp.triggerShake = function(intensity, duration) {
    /* Epoch 5: 委托震动到 Systems */
    if (this._systems && this._systems.triggerShake) {
        return this._systems.triggerShake(this, intensity, duration);
    }
    if (!this.container) return;
    intensity = intensity || 1;
    duration = duration || 200;
    if (this._shakeTimer > 0 && this._shakeIntensity >= intensity) return;
    this._shakeTimer = duration / 1000;
    this._shakeIntensity = intensity;
    this.container.classList.add('screen-shake-active');
    if (intensity >= 2) {
        this.container.style.animationDuration = '0.06s';
    } else {
        this.container.style.animationDuration = '0.1s';
    }
};

Gp.restart = function() {
    for (var _el of this._enemyElements.values()) { if (_el && _el.parentNode) _el.remove(); }
    this._enemyElements.clear();
    this.enemies = [];
    this._enemyIdCounter = 0;
    for (var _c = 0; _c < this._activeCoins.length; _c++) this._activeCoins[_c].el.remove();
    this._activeCoins = [];
    for (var _g = 0; _g < this._expGems.length; _g++) { if (this._expGems[_g].el) this._expGems[_g].el.remove(); }
    this._expGems = [];
    window.expGems = [];
    this._cleanAllProjectiles();
    this._cleanEnemyProjectiles();
    this._resetAllWeapons();
    this._pendingReward = false;
    this._bossTimer = 0;
    this._waveCount = 0;
    this.currentWaveSpawnedCount = 0;
    this._levelUpPending = false;
    this._ignoreGemCollection = false;
    this._mutatorTriggered = false;
    this._clearMutatorEffects();
    this._clearTotems();
    if (window.rewardManager) window.rewardManager.hidePanel();
    this.victoryOverlay.classList.remove('active');
    this.gameOverOverlay.classList.remove('active');
    this.gameOver = false;
    this.running = false;
    this._elapsed = 0;
    this.kills = 0;
    this._spawnTimer = 0;
    this._spawnInterval = 1.5;
    this._difficultyTimer = 0;

    var heroId = this.player ? this.player.heroId : 'hero_swordsman';
    var levelId = this._currentLevelId || 'level_1';
    this._startNewRun(heroId, levelId);
};

Gp._goToSaveSelect = function() {
    this.running = false;
    this.gameOver = false;
    this.gameOverOverlay.classList.remove('active');
    this.victoryOverlay.classList.remove('active');
    if (window.rewardManager) window.rewardManager.hidePanel();
    for (var _g = 0; _g < this._expGems.length; _g++) { if (this._expGems[_g].el) this._expGems[_g].el.remove(); }
    this._expGems = [];
    window.expGems = [];
    this._cleanAllProjectiles();
    this._cleanEnemyProjectiles();
    this._resetAllWeapons();
    this._clearTotems();
    this._clearMutatorEffects();
    if (this.bossHpBar) this.bossHpBar.classList.remove('active');
    /* Clear stale active run to prevent "继续游戏" from appearing incorrectly */
    if (window.saveManager) window.saveManager.clearActiveRun();
    window.location.href = 's2_main_hub.html';
};

Gp._formatTime = function(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

/* ══════════════════════════════════════════════
   武器系统 — 初始化/更新/碰撞/清理
   ══════════════════════════════════════════════ */

Gp._initDefaultWeapons = function() {
    this._activeWeapons = [];
    this._projectiles = [];
    var meta = window.saveManager._metaCache || {};
    var weaponIds = (meta.defaultWeapons && meta.defaultWeapons.length > 0) ? meta.defaultWeapons : ['TrackingBlade'];
    var talents = meta.talents || {};
    if (talents.weapon_forge === 1) {
        weaponIds = ['TrackingBlade', 'OrbitShield'];
    }
    /* Epoch 2: 开局双兵天赋 */
    if (talents.starting_weapons > 0 && weaponIds.length < 2) {
        weaponIds.push('OrbitShield');
    }
    for (var _i = 0; _i < weaponIds.length; _i++) {
        var W = window[weaponIds[_i]];
        if (W) this._activeWeapons.push(new W(1));
    }
    this._syncWeaponSlots();
};

Gp._restoreWeapons = function(weaponData) {
    this._resetAllWeapons();
    if (!weaponData || weaponData.length === 0) {
        this._initDefaultWeapons();
        return;
    }
    for (var _i = 0; _i < weaponData.length; _i++) {
        var wd = weaponData[_i];
        var W = window[wd.id];
        if (W) {
            var w = new W(wd.level || 1);
            w.cooldownTimer = wd.cooldownTimer || 0;
            this._activeWeapons.push(w);
        }
    }
    if (this._activeWeapons.length === 0) this._initDefaultWeapons();
    this._syncWeaponSlots();
};

Gp._cleanAllProjectiles = function() {
    for (var _i = 0; _i < this._projectiles.length; _i++) {
        var p = this._projectiles[_i];
        if (p.el && p.el.parentNode) p.el.remove();
    }
    this._projectiles = [];
};

Gp._resetAllWeapons = function() {
    for (var _i = 0; _i < this._activeWeapons.length; _i++) {
        var w = this._activeWeapons[_i];
        if (typeof w.reset === 'function') w.reset();
    }
    this._activeWeapons = [];
    this._cleanAllProjectiles();
};

Gp._updateWeapons = function(dt) {
    if (this._pendingReward) return;
    for (var _i = 0; _i < this._activeWeapons.length; _i++) {
        var w = this._activeWeapons[_i];
        if (w instanceof window.LaserBeam) {
            w.setAngle(this._lastClickAngle);
        }
        /* Epoch 34: Overdrive 期间武器伤害翻倍 */
        if (this._overdriveActive) {
            if (!w._origAtkFactor) w._origAtkFactor = w.atkFactor;
            w.atkFactor = (w._origAtkFactor || 1) * 2;
        }
        w.update(dt, this.player, this.enemies, this);
        if (this._overdriveActive) w.atkFactor = w._origAtkFactor || w.atkFactor;
        if (this._overdriveActive) w.cooldownTimer = 0;
    }
};

Gp._updateProjectiles = function(dt) {
    for (var _i = this._projectiles.length - 1; _i >= 0; _i--) {
        var p = this._projectiles[_i];
        if (!p.alive) {
            if (p.el && p.el.parentNode) p.el.remove();
            this._projectiles.splice(_i, 1);
            continue;
        }
        p.update(dt);
        if (!p.alive) {
            if (p.el && p.el.parentNode) p.el.remove();
            this._projectiles.splice(_i, 1);
            continue;
        }
        for (var _j = 0; _j < this.enemies.length; _j++) {
            var e = this.enemies[_j];
            if (!e.alive) continue;
            if (p.hitEnemies.has(e.id)) continue;
            var _dx = e.x - p.x;
            var _dy = e.y - p.y;
            var _radiusSum = e.radius + p.radius;
            if (_dx * _dx + _dy * _dy < _radiusSum * _radiusSum) {
                e.takeDamage(p.damage, p);
                p.hitEnemies.add(e.id);
                if (p.pierceCount > 0) {
                    p.pierceCount--;
                    if (p.pierceCount <= 0) p.alive = false;
                } else {
                    p.alive = false;
                }
                if (!p.alive) break;
            }
        }
        if (p.el) {
            p.el.style.left = (p.x - p.radius) + 'px';
            p.el.style.top = (p.y - p.radius) + 'px';
        }
        if (p.x < -100 || p.x > this._mapW + 100 || p.y < -100 || p.y > this._mapH + 100) {
            p.alive = false;
        }
        if (!p.alive && p.el && p.el.parentNode) {
            p.el.remove();
            this._projectiles.splice(_i, 1);
        }
    }
};

/* ══════════════════════════════════════════════
   Epoch 32: 波次间事件系统
   ══════════════════════════════════════════════ */

Gp._interWaveEvents = [
    { id: 'coin_rush', name: '金币雨', icon: '🪙', desc: '场上立即掉落 20 金币！', weight: 40, apply: function() { this.player.addGold(20); this._spawnCoinBurst(20); } },
    { id: 'meditation', name: '冥想泉源', icon: '🧘', desc: '恢复 30% HP，下波怪物 -20% 攻击力', weight: 25, apply: function() { this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.floor(this.player.maxHp * 0.3)); this._tempEnemyAtkDebuff = 0.8; } },
    { id: 'monster_surge', name: '怪物潮', icon: '👹', desc: '额外生成 5 个精英怪！但掉落翻倍', weight: 20, apply: function() { this._extraEliteCount = 5; this._monsterSurgeDoubleDrops = true; } },
    { id: 'time_dilation', name: '时光缓流', icon: '⏳', desc: '下波怪物移速 -30%', weight: 20, apply: function() { this._tempEnemySpeedDebuff = 0.7; } },
    { id: 'berserk', name: '狂战士祝福', icon: '⚔', desc: '下波击杀额外 +10 怒气', weight: 15, apply: function() { this._tempBerserkBonus = true; } },
    { id: 'golden_touch', name: '点金术', icon: '✨', desc: '下波金币收益 ×3', weight: 15, apply: function() { this._tempGoldMult = 3; } },
    { id: 'iron_fist', name: '铁拳', icon: '👊', desc: '下波暴击率 +25%', weight: 20, apply: function() { this._tempCritBonus = 0.25; } },
    { id: 'shield_of_faith', name: '信仰护盾', icon: '🛡', desc: '获得可吸收 50 伤害的护盾（持续 15 秒）', weight: 15, apply: function() { this._tempShield = 50; this._tempShieldEnd = Date.now() / 1000 + 15; } }
];

Gp._pickInterWaveEvent = function() {
    var totalWeight = 0;
    for (var i = 0; i < this._interWaveEvents.length; i++) totalWeight += this._interWaveEvents[i].weight;
    var roll = Math.random() * totalWeight;
    var cumulative = 0;
    for (var i = 0; i < this._interWaveEvents.length; i++) {
        cumulative += this._interWaveEvents[i].weight;
        if (roll < cumulative) return this._interWaveEvents[i];
    }
    return this._interWaveEvents[0];
};

Gp._triggerInterWaveEvent = function() {
    var evt = this._pickInterWaveEvent();
    this._interWaveEvent = evt;
    this._freezeClock();

    var overlay = document.getElementById('reward-overlay');
    var titleEl = overlay.querySelector('.reward-title');
    var origTitle = titleEl ? titleEl.textContent : '';
    if (titleEl) titleEl.textContent = evt.icon + ' ' + evt.name;

    var cardsDiv = overlay.querySelector('.reward-cards');
    cardsDiv.innerHTML =
        '<div style="text-align:center;padding:20px;">' +
        '<div style="font-size:48px;margin:10px;">' + evt.icon + '</div>' +
        '<div style="font-size:18px;font-weight:800;color:#ffd700;margin-bottom:8px;">' + evt.name + '</div>' +
        '<div style="font-size:14px;color:#ccc;margin-bottom:16px;">' + evt.desc + '</div>' +
        '<button class="relic-btn" id="interevent-accept" style="background:#cc8800;">接受恩赐</button>' +
        '</div>';

    overlay.classList.add('active');
    var self = this;
    document.getElementById('interevent-accept').addEventListener('click', function() {
        overlay.classList.remove('active');
        overlay.classList.remove('levelup-mode');
        self._pendingReward = false;
        self._interWaveEvent = null;
        self._interWaveTimer = 0;
        evt.apply.call(self);
        self._syncUI();
        self._continueAfterInterWave();
    }, { once: true });
};

Gp._continueAfterInterWave = function() {
    this._pendingReward = false;
    if (this._extraEliteCount > 0) {
        /* Epoch 32: 怪物潮 — 额外精英怪 */
        for (var i = 0; i < this._extraEliteCount; i++) {
            this._spawnEliteEnemy();
        }
        this._extraEliteCount = 0;
    }
    this._monsterSurgeDoubleDrops = false;
    this._tempEnemyAtkDebuff = 0;
    this._tempEnemySpeedDebuff = 0;
    this._tempBerserkBonus = false;
    this._tempGoldMult = 1;
    this._tempCritBonus = 0;
    this._tempShield = 0;

    this.running = true;
    this._lastTime = performance.now();
    requestAnimationFrame(this._boundLoop);
};

Gp._spawnCoinBurst = function(count) {
    if (!this.battlefield) return;
    var px = this.player.x;
    var py = this.player.y;
    for (var i = 0; i < count; i++) {
        var angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
        var dist = 30 + Math.random() * 40;
        var cx = px + Math.cos(angle) * dist;
        var cy = py + Math.sin(angle) * dist;
        this.player.addGold(1);
    }
    if (window.fxManager) window.fxManager.spawnText(px, py, '+' + count + ' 🪙', '#ffd700', 24, 1500);
};

/* ══════════════════════════════════════════════
   波次突变系统
   ══════════════════════════════════════════════ */

Gp._showMutatorPanel = function() {
    /* Epoch 5: 委托突变面板到 Systems */
    if (this._systems && this._systems.showMutatorPanel) {
        return this._systems.showMutatorPanel(this);
    }
    if (!this.mutatorOverlay || !this.mutatorChoices) return;
    this.running = false;
    this._freezeClock();
    this.mutatorChoices.innerHTML = '';
    var self = this;

    var choices = [
        { id: 'gravity', title: '\u5f15\u529b\u9006\u8f6c', desc: '\u7ecf\u9a8c\u5438\u9644\u8303\u56f4\u5f52\u96f6\uff0c\u5fc5\u987b\u8089\u8eab\u62fe\u53d6', icon: '🧲' },
        { id: 'bloodmoon', title: '\u72c2\u66b4\u8840\u6708', desc: '\u602a\u7269\u4f53\u578b+30%\uff0c\u653b\u51fb+40%\uff0c\u6389\u843d\u7ffb\u500d', icon: '🌍' },
        { id: 'frenzy', title: '\u72c2\u4e71', desc: '\u602a\u7269\u79fb\u901f+50%\uff0c\u91d1\u5e01\u6389\u843d+50%', icon: '⚡' },
        { id: 'frailty', title: '\u8106\u5f31', desc: '\u653b\u51fb\u500d\u7387\u53cc\u5411\u63d0\u5347\u2014\u2014\u4f60\u6253\u5f97\u66f4\u75db\uff0c\u4f60\u4e5f\u66f4\u5bb9\u6613\u5012\u4e0b', icon: '🟡' },
        { id: 'wither', title: '\u67af\u840e', desc: '\u5168\u4f53\u602a\u7269\u6bcf5\u79d2\u635f\u59315%\u6700\u5927HP', icon: '☠️' }
    ];

    for (var i = 0; i < choices.length; i++) {
        var c = choices[i];
        var card = document.createElement('div');
        card.className = 'mutator-card';
        card.innerHTML =
            '<div class="mutator-card-icon">' + c.icon + '</div>' +
            '<div class="mutator-card-title">' + c.title + '</div>' +
            '<div class="mutator-card-desc">' + c.desc + '</div>' +
            '<button class="mutator-btn">\u9009\u62e9</button>';
        (function(cid, mgr) {
            card.querySelector('.mutator-btn').addEventListener('click', function() { mgr._applyMutator(cid); });
        })(c.id, self);
        this.mutatorChoices.appendChild(card);
    }
    this.mutatorOverlay.classList.add('active');
};

Gp._applyMutator = function(mutatorId) {
    /* Epoch 5: 委托突变应用到 Systems */
    if (this._systems && this._systems.applyMutator) {
        return this._systems.applyMutator(this, mutatorId);
    }
    this._activeMutator = mutatorId;
    /* Epoch 38: Mutator 视觉反馈 */
    this._updateMutatorBadge();
    /* Epoch 32: 图鉴记录突变 */
    if (window.saveManager) window.saveManager.recordCompendiumEntry('mutations', mutatorId);
    this.mutatorOverlay.classList.remove('active');
    if (mutatorId === 'gravity') {
        this._origMagnetRadius = this.player.magnetRadius;
        this.player.magnetRadius = 0;
    } else if (mutatorId === 'bloodmoon') {
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (!e.alive) continue;
            e.atk = Math.floor(e.atk * 1.4);
            e.maxHp = Math.floor(e.maxHp * 1.3);
            e.hp = Math.floor(e.hp * 1.3);
            var el = this._enemyElements.get(e.id);
            if (el) el.style.transform = 'scale(1.3)';
        }
    } else if (mutatorId === 'frenzy') {
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (!e.alive) continue;
            if (!e._frenzyStored) {
                e._frenzyStored = true;
                e._frenzyOrigSpeed = e.speed;
                e.speed = Math.floor(e.speed * 1.5);
            }
        }
    } else if (mutatorId === 'frailty') {
        this._frailtyOrigPlayerAtk = this.player.atk;
        this.player.atk = Math.floor(this.player.atk * 1.5);
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (!e.alive) continue;
            if (!e._frailtyStored) {
                e._frailtyStored = true;
                e._frailtyOrigAtk = e.atk;
                e.atk = Math.floor(e.atk * 1.5);
            }
        }
    } else if (mutatorId === 'wither') {
        this._witherTimer = 0;
    }
    this._beginLoop();
};

Gp._clearMutatorEffects = function() {
    if (this._activeMutator === 'gravity' && this._origMagnetRadius != null) {
        this.player.magnetRadius = this._origMagnetRadius;
    }
    if (this._activeMutator === 'bloodmoon') {
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            var el = this._enemyElements.get(e.id);
            if (el) el.style.transform = '';
        }
    }
    if (this._activeMutator === 'frenzy') {
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (e._frenzyStored) {
                e.speed = e._frenzyOrigSpeed || e.baseSpeed;
                e._frenzyStored = false;
                e._frenzyOrigSpeed = undefined;
            }
        }
    }
    if (this._activeMutator === 'frailty') {
        if (this._frailtyOrigPlayerAtk != null) this.player.atk = this._frailtyOrigPlayerAtk;
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (e._frailtyStored) {
                e.atk = e._frailtyOrigAtk || e.baseAtk;
                e._frailtyStored = false;
                e._frailtyOrigAtk = undefined;
            }
        }
    }
    this._activeMutator = null;
    this._origMagnetRadius = null;
    /* Epoch 38: 清除 Mutator 视觉反馈 */
    this._updateMutatorBadge();
};

/* ── Epoch 38: Mutator 徽章 + 共振指示 ── */

Gp._updateMutatorBadge = function() {
    if (!this.mutatorBadge) return;
    if (this._activeMutator) {
        var labels = { gravity:'引力逆转', bloodmoon:'狂暴血月', frenzy:'狂乱', frailty:'脆弱', wither:'枯萎' };
        this.mutatorBadge.textContent = labels[this._activeMutator] || this._activeMutator;
        this.mutatorBadge.className = 'mutator-badge ' + this._activeMutator;
        this.mutatorBadge.style.display = '';
        /* Screen tinting */
        var gc = this.container;
        if (gc) {
            gc.className = gc.className.replace(/mutator-\S+/g, '').trim();
            gc.classList.add('mutator-' + this._activeMutator);
        }
    } else {
        this.mutatorBadge.style.display = 'none';
        var gc = this.container;
        if (gc) gc.className = gc.className.replace(/mutator-\S+/g, '').trim();
    }
};

Gp._updateResonancePills = function() {
    if (!this.resonancePills) return;
    var p = this.player;
    var html = '';
    if (p.setResonanceSpeed) html += '<span class="resonance-pill resonance-speed">🔥 炎痕</span>';
    if (p.setResonanceIce) html += '<span class="resonance-pill resonance-ice">❄️ 永冻</span>';
    this.resonancePills.innerHTML = html;
};

Gp._clearTotems = function() {
    for (var i = 0; i < this._totems.length; i++) {
        if (this._totems[i].el && this._totems[i].el.parentNode) this._totems[i].el.remove();
    }
    this._totems = [];
};

/* ══════════════════════════════════════════════
   V3.0 Overdrive 狂暴系统
   ══════════════════════════════════════════════ */

Gp._triggerOverdrive = function() {
    window.audioManager && window.audioManager.play('overdrive');
    /* Epoch 5: 委托 Overdrive 到 Systems */
    if (this._systems && this._systems.triggerOverdrive) {
        return this._systems.triggerOverdrive(this);
    }
    if (this._overdriveActive) return;
    this._overdriveActive = true;
    this._overdriveTimer = 3.0;
    this.player.rage = 0;
    if (this._syncUI) this._syncUI();
    this._origCdFloor = this.player.cdFloor;
    this.player.cdFloor = 0;

    for (var _oi = 0; _oi < this.enemies.length; _oi++) {
        var _oe = this.enemies[_oi];
        if (_oe.alive && !_oe._overdriveStored) {
            _oe._overdriveStored = true;
            _oe._overdriveOrigSpeed = _oe.speed;
            _oe.speed = 0;
        }
    }

    if (this.container) this.container.classList.add('overdrive-active');
    this.triggerShake(0.5, 3000);
    this._spawnCausalityText('\u2600\uFE0F\u2600\uFE0F\u2600\uFE0F Overdrive \u7206\u8f70 \u2600\uFE0F\u2600\uFE0F\u2600\uFE0F');

    /* \u6210\u5C31\uFF1AOverdrive \u8BA1\u6570 */
    this._overdriveCount = (this._overdriveCount || 0) + 1;
    if (this._overdriveCount >= 1) this._checkAchievement('overdrive_1');
    if (this._overdriveCount >= 10) this._checkAchievement('overdrive_10');
    if (this._overdriveCount >= 50) this._checkAchievement('overdrive_50');
};

Gp._endOverdrive = function() {
    if (!this._overdriveActive) return;
    this._overdriveActive = false;
    this._overdriveTimer = 0;

    if (this.player) this.player.cdFloor = this._origCdFloor || 0.2;

    for (var _oi = 0; _oi < this.enemies.length; _oi++) {
        var _oe = this.enemies[_oi];
        if (_oe._overdriveStored) {
            _oe.speed = _oe._overdriveOrigSpeed || _oe.baseSpeed;
            _oe._overdriveStored = false;
            _oe._overdriveOrigSpeed = undefined;
        }
    }

    if (this.container) this.container.classList.remove('overdrive-active');
};

/* ══════════════════════════════════════════════
   终局领主 Boss Lord 系统
   ══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   Boss Gamble — 决战前风险/回报选择
   ══════════════════════════════════════════════ */

Gp._showBossGamble = function() {
    if (!this.battlefield) return;
    this._freezeClock();
    this.running = false;
    this._pendingBossGamble = true;

    var meta = window.saveManager._metaCache || {};
    var tokens = meta.metaTokens || 0;
    var gold50 = Math.floor(this.player.gold * 0.5);
    var canGamble = gold50 > 0;
    var canAbyss = tokens >= 1;

    var panel = document.createElement('div');
    panel.id = 'boss-gamble-panel';
    panel.className = 'boss-gamble-panel';
    panel.innerHTML =
        '<div class="gamble-title">🎲 决战豪赌</div>' +
        '<div class="gamble-subtitle">深渊领主即将降临，是否押注？</div>' +
        '<div class="gamble-choices">' +
            '<div class="gamble-card gamble-safe">' +
                '<div class="gamble-card-icon">🛡️</div>' +
                '<div class="gamble-card-title">稳妥前进</div>' +
                '<div class="gamble-card-desc">正常迎战领主，不押注任何资源</div>' +
                '<button class="gamble-btn" data-choice="safe">安全出征</button>' +
            '</div>' +
            '<div class="gamble-card gamble-gold' + (!canGamble ? ' disabled' : '') + '">' +
                '<div class="gamble-card-icon">💰</div>' +
                '<div class="gamble-card-title">金币豪赌</div>' +
                '<div class="gamble-card-desc">押 ' + gold50 + ' 金币 · 胜: 3x 返还 · 负: 全输</div>' +
                '<button class="gamble-btn' + (!canGamble ? ' disabled' : '') + '" data-choice="gold"' + (!canGamble ? ' disabled' : '') + '>金币豪赌</button>' +
            '</div>' +
            '<div class="gamble-card gamble-abyss' + (!canAbyss ? ' disabled' : '') + '">' +
                '<div class="gamble-card-icon">🌀</div>' +
                '<div class="gamble-card-title">深渊试炼</div>' +
                '<div class="gamble-card-desc">押 1 元代币 · 领主 +50% HP · 装备掉落 3x</div>' +
                '<button class="gamble-btn' + (!canAbyss ? ' disabled' : '') + '" data-choice="abyss"' + (!canAbyss ? ' disabled' : '') + '>深渊试炼</button>' +
            '</div>' +
        '</div>';
    this.battlefield.appendChild(panel);

    var self = this;
    var btns = panel.querySelectorAll('.gamble-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', (function(choice) {
            return function() {
                if (panel.parentNode) panel.remove();
                self._resolveGambleChoice(choice);
            };
        })(btns[i].getAttribute('data-choice')), { once: true });
    }
};

Gp._resolveGambleChoice = function(choice) {
    this._pendingBossGamble = false;
    if (choice === 'safe') {
        this._gambleActive = false;
        this._gambleType = null;
        this._gambleStaked = 0;
    } else if (choice === 'gold') {
        this._gambleActive = true;
        this._gambleType = 'gold';
        this._gambleStaked = Math.floor(this.player.gold * 0.5);
        this.player.gold -= this._gambleStaked;
        this._syncUI();
    } else if (choice === 'abyss') {
        var meta = window.saveManager._metaCache || {};
        if ((meta.metaTokens || 0) >= 1) {
            this._gambleActive = true;
            this._gambleType = 'abyss';
            this._gambleStaked = 1;
            meta.metaTokens -= 1;
            window.saveManager._metaCache = meta;
            window.saveManager._saveMetaToStorage();
        } else {
            this._gambleActive = false;
        }
    }
    /* 生成领主（无论是否赌注） */
    this._spawnBossLordFromGamble();
    this._beginLoop();
};

Gp._spawnBossLordFromGamble = function() {
    /* 玩家做出选择后，实际生成领主 */
    if (this._bossLordSpawned) return;
    var level = Math.floor(this._elapsed / 15) + 1;
    var x = this._mapW / 2;
    var y = Math.floor(this._mapH * 0.35);
    var margin = 100;
    x = Math.max(margin, Math.min(this._mapW - margin, x));
    y = Math.max(margin, Math.min(this._mapH - margin, y));

    var id = this._enemyIdCounter++;
    var lord = new Enemy(id, x, y, level, true, 'Boss_Lord');
    var diff = 1;
    try { diff = window.levelConfig[this._currentLevelId].difficultyFactor || 1; } catch(e) {}
    lord.maxHp = Math.floor(lord.maxHp * diff);
    lord.hp = lord.maxHp;
    lord.atk = Math.floor(lord.atk * diff);
    this.enemies.push(lord);
    this._bossLord = lord;
    this._bossLordSpawned = true;

    /* Gamble: 深渊试炼增加领主HP */
    if (this._gambleType === 'abyss' && this._gambleActive) {
        lord.maxHp = Math.floor(lord.maxHp * 1.5);
        lord.hp = lord.maxHp;
        this._spawnCausalityText('⚠️ 深渊试炼激活：领主 +50% HP');
    }

    /* ── 变异保险库：血月对Boss Lord生效 ── */
    if (this._vaultMutations && this._vaultMutations.indexOf('bloodmoon') !== -1) {
        lord.atk = Math.floor(lord.atk * 1.4);
        lord.maxHp = Math.floor(lord.maxHp * 1.3);
        lord.hp = Math.floor(lord.hp * 1.3);
    }

    var el = document.createElement('div');
    el.className = 'enemy boss boss-lord';
    el.dataset.id = id;
    var hpBar = document.createElement('div');
    hpBar.className = 'enemy-hp-bar';
    var hpFill = document.createElement('div');
    hpFill.className = 'enemy-hp-fill';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);
    this._worldLayer.appendChild(el);
    this._enemyElements.set(id, el);
    lord.el = el;

    if (this._bloodRageActive) {
        lord.speed = Math.floor(lord.speed * 1.2);
        lord.baseSpeed = lord.speed;
        if (lord.el) lord.el.classList.add('boss-blood-rage');
    }

    if (this.bossHpBar) this.bossHpBar.classList.add('active');
    this._screenShake();
};

Gp._resolveGamble = function(won) {
    if (!this._gambleActive) return;
    if (this._gambleType === 'gold') {
        if (won) {
            var bonus = this._gambleStaked * 3;
            this.player.addGold(bonus);
            this._spawnCausalityText('💰 金币豪赌胜利！+' + bonus + ' 金币');
        } else {
            this._spawnCausalityText('💰 金币豪赌失败... 金币已输掉');
        }
    } else if (this._gambleType === 'abyss') {
        if (won) {
            this._gambleAbyssBonus = true;
            this._spawnCausalityText('🌀 深渊试炼胜利！下次装备掉落 3x');
        } else {
            this._spawnCausalityText('🌀 深渊试炼失败... 元代币已损失');
        }
    }
    this._gambleActive = false;
    this._gambleType = null;
    this._gambleStaked = 0;
};

Gp._spawnBossLord = function() {
    window.audioManager && window.audioManager.play('boss');
    var level = Math.floor(this._elapsed / 15) + 1;
    var x = this._mapW / 2;
    var y = Math.floor(this._mapH * 0.35);
    var margin = 100;
    x = Math.max(margin, Math.min(this._mapW - margin, x));
    y = Math.max(margin, Math.min(this._mapH - margin, y));

    var id = this._enemyIdCounter++;
    var lord = new Enemy(id, x, y, level, true, 'Boss_Lord');
    var diff = 1;
    try { diff = window.levelConfig[this._currentLevelId].difficultyFactor || 1; } catch(e) { console.warn('diff config read error', e); }
    lord.maxHp = Math.floor(lord.maxHp * diff);
    lord.hp = lord.maxHp;
    lord.atk = Math.floor(lord.atk * diff);
    this.enemies.push(lord);
    this._bossLord = lord;

    /* ── 变异保险库：血月对Boss Lord生效 ── */
    if (this._vaultMutations && this._vaultMutations.indexOf('bloodmoon') !== -1) {
        lord.atk = Math.floor(lord.atk * 1.4);
        lord.maxHp = Math.floor(lord.maxHp * 1.3);
        lord.hp = Math.floor(lord.hp * 1.3);
    }

    var el = document.createElement('div');
    el.className = 'enemy boss boss-lord';
    el.dataset.id = id;
    var hpBar = document.createElement('div');
    hpBar.className = 'enemy-hp-bar';
    var hpFill = document.createElement('div');
    hpFill.className = 'enemy-hp-fill';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);
    this._worldLayer.appendChild(el);
    this._enemyElements.set(id, el);
    lord.el = el;

    if (this._bloodRageActive) {
        lord.speed = Math.floor(lord.speed * 1.2);
        lord.baseSpeed = lord.speed;
        if (lord.el) lord.el.classList.add('boss-blood-rage');
        this._spawnCausalityText('\u8840\u6d77\u72c2\u66b4\uff1a\u9886\u4e3b\u901f\u5ea6 +20%');
    }

    if (this.bossHpBar) this.bossHpBar.classList.add('active');
    this._screenShake();
    return lord;
};

Gp._spawnEnemyType = function(type) {
    var angle = Math.random() * Math.PI * 2;
    var margin = 30;
    var vpW = this.battlefield.clientWidth;
    var vpH = this.battlefield.clientHeight;
    var viewR = Math.sqrt(vpW * vpW + vpH * vpH) * 0.5;
    var spawnRadius = viewR + 50;
    var cx = this.player.x + Math.cos(angle) * spawnRadius;
    var cy = this.player.y + Math.sin(angle) * spawnRadius;
    cx = Math.max(margin, Math.min(this._mapW - margin, cx));
    cy = Math.max(margin, Math.min(this._mapH - margin, cy));

    var level = Math.floor(this._elapsed / 15) + 1;
    var id = this._enemyIdCounter++;
    var enemy = new Enemy(id, cx, cy, level, false, type);
    this.enemies.push(enemy);

    var el = document.createElement('div');
    el.className = 'enemy';
    el.dataset.id = id;
    var hpBar = document.createElement('div');
    hpBar.className = 'enemy-hp-bar';
    var hpFill = document.createElement('div');
    hpFill.className = 'enemy-hp-fill';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);
    this._worldLayer.appendChild(el);
    this._enemyElements.set(id, el);
    enemy.el = el;
    return enemy;
};

Gp._updateEnemyProjectiles = function(dt) {
    for (var i = this._enemyProjectiles.length - 1; i >= 0; i--) {
        var p = this._enemyProjectiles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.lifeTime -= dt;
        if (p.lifeTime <= 0) p.alive = false;

        if (!p.el) {
            var pel = document.createElement('div');
            pel.className = 'enemy-projectile';
            var d = p.radius * 2;
            pel.style.width = d + 'px';
            pel.style.height = d + 'px';
            this._worldLayer.appendChild(pel);
            p.el = pel;
        }
        p.el.style.left = (p.x - p.radius) + 'px';
        p.el.style.top = (p.y - p.radius) + 'px';

        if (p.x < -100 || p.x > this._mapW + 100 || p.y < -100 || p.y > this._mapH + 100) {
            p.alive = false;
        }

        if (p.alive && this.player) {
            var dx = this.player.x - p.x;
            var dy = this.player.y - p.y;
            if (dx * dx + dy * dy < (this.player.radius + p.radius) * (this.player.radius + p.radius)) {
                if (!p._hitPlayer) {
                    p._hitPlayer = true;
                    var dmg = p.damage;
                    /* Epoch 14: 关卡亲和减伤 */
                    if (this._mapAffinityReduction) {
                        dmg = Math.max(1, Math.floor(dmg * (1 - this._mapAffinityReduction)));
                    }
                    this.player.takeDamage(dmg, this._bossLord || this);
                }
                p.alive = false;
            }
        }

        if (!p.alive) {
            if (p.el && p.el.parentNode) p.el.remove();
            this._enemyProjectiles.splice(i, 1);
        }
    }
};

Gp._cleanEnemyProjectiles = function() {
    for (var i = 0; i < this._enemyProjectiles.length; i++) {
        if (this._enemyProjectiles[i].el && this._enemyProjectiles[i].el.parentNode) {
            this._enemyProjectiles[i].el.remove();
        }
    }
    this._enemyProjectiles = [];
};

/* ══════════════════════════════════════════════
   神兵装备栏 UI 渲染与同步
   ══════════════════════════════════════════════ */

Gp._renderWeaponSlots = function() {
    if (!this._weaponSlotsEl) return;
    this._weaponSlotsEl.innerHTML = '';
    var maxSlots = this.player.maxWeaponSlots || 6;
    for (var i = 0; i < this._activeWeapons.length; i++) {
        var w = this._activeWeapons[i];
        var info = window.rewardManager && window.rewardManager.weaponInfos[w.id] ? window.rewardManager.weaponInfos[w.id] : { name: w.id, color: '#888' };
        var pct = w.cd > 0 ? Math.max(0, Math.min(100, (1 - w.cooldownTimer / w.cd) * 100)) : 100;
        var slot = document.createElement('div');
        slot.className = 'weapon-slot';
        slot.dataset.widx = i;
        slot.innerHTML =
            '<div class="ws-icon" style="background:' + info.color + ';color:' + info.color + '"></div>' +
            '<div class="ws-name">' + info.name + '</div>' +
            '<div class="ws-cd-track"><div class="ws-cd-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="ws-level">Lv.' + w.level + '</div>' +
            '<div class="ws-cd-text"></div>';
        this._weaponSlotsEl.appendChild(slot);
    }
    // Slot limit indicator
    var limitEl = this._weaponSlotsEl.querySelector('.ws-limit');
    if (!limitEl) {
        limitEl = document.createElement('span');
        limitEl.className = 'ws-limit';
        this._weaponSlotsEl.appendChild(limitEl);
    }
    limitEl.textContent = this._activeWeapons.length + '/' + maxSlots;
};

Gp._syncWeaponSlotBar = function() {
    if (!this._weaponSlotsEl) return;
    var slots = this._weaponSlotsEl.children;
    for (var i = 0; i < this._activeWeapons.length && i < slots.length; i++) {
        var w = this._activeWeapons[i];
        var slot = slots[i];
        var fill = slot.querySelector('.ws-cd-fill');
        if (fill) {
            var pct = w.cd > 0 ? Math.max(0, Math.min(100, (1 - w.cooldownTimer / w.cd) * 100)) : 100;
            fill.style.width = pct + '%';
            if (w.cooldownTimer > 0) {
                slot.classList.add('on-cd');
                var cdText = slot.querySelector('.ws-cd-text');
                if (cdText) cdText.textContent = Math.ceil(w.cooldownTimer) + 's';
            } else {
                slot.classList.remove('on-cd');
                var cdText2 = slot.querySelector('.ws-cd-text');
                if (cdText2) cdText2.textContent = '';
            }
        }
        var lvEl = slot.querySelector('.ws-level');
        if (lvEl) lvEl.textContent = 'Lv.' + w.level;
    }
};

/* ── 武器槽位管理 ── */

Gp._syncWeaponSlots = function() {
    if (!this.player) return;
    this.player.weaponSlots = this._activeWeapons.map(function(w) { return { id: w.id, level: w.level }; });
};

Gp._addWeapon = function(weaponId) {
    if (this._activeWeapons.length >= this.player.maxWeaponSlots) return null;
    var W = window[weaponId];
    if (!W) return null;
    var w = new W(1);
    this._activeWeapons.push(w);
    this._syncWeaponSlots();
    this._renderWeaponSlots();
    return w;
};

Gp._replaceWeapon = function(oldIndex, newWeaponId) {
    if (oldIndex < 0 || oldIndex >= this._activeWeapons.length) return null;
    var old = this._activeWeapons[oldIndex];
    if (typeof old.reset === 'function') old.reset();
    var W = window[newWeaponId];
    if (!W) return null;
    var w = new W(1);
    this._activeWeapons[oldIndex] = w;
    this._syncWeaponSlots();
    this._renderWeaponSlots();
    return w;
};

Gp._upgradeWeapon = function(index) {
    if (index < 0 || index >= this._activeWeapons.length) return false;
    this._activeWeapons[index].upgrade();
    this._syncWeaponSlots();
    this._renderWeaponSlots();
    return true;
};

/* ── 在快照中包含武器数据 ── */

var _origSnapshot = window.saveManager.snapshotForRun;
window.saveManager.snapshotForRun = function(engine) {
    var snap = _origSnapshot.call(this, engine);
    snap.weapons = engine._activeWeapons.map(function(w) { return { id: w.id, level: w.level, cooldownTimer: w.cooldownTimer }; });
    return snap;
};

/* ══════════════════════════════════════════════
   Epoch 1 — 引导增强：动态高亮 + 手牌交付状态机
   ══════════════════════════════════════════════ */

Gp._highlightElement = function(selector, duration) {
    var el = document.querySelector(selector);
    if (!el) return null;
    el.classList.add('context-highlight');
    var self = this;
    var timer = setTimeout(function() {
        el.classList.remove('context-highlight');
        self._highlightTimers = (self._highlightTimers || []).filter(function(t) { return t !== timer; });
    }, duration || 3000);
    if (!this._highlightTimers) this._highlightTimers = [];
    this._highlightTimers.push(timer);
    return el;
};

Gp._dimExcept = function(selectorArray) {
    var self = this;
    if (!this._originalOpacities) {
        this._originalOpacities = new Map();
    }
    var battlefield = this.battlefield;
    if (!battlefield) return;
    battlefield.querySelectorAll(':scope > *:not(#guide-overlay):not(#pause-overlay):not(#reward-overlay):not(#mutator-overlay):not(#victory-overlay):not(#game-over-overlay):not(#boss-hp-bar)').forEach(function(child) {
        var id = child.id || child.className.baseVal;
        if (selectorArray.some(function(s) { return child.matches(s); })) {
            self._originalOpacities.set(child, child.style.opacity || '1');
            child.style.opacity = '1';
        } else {
            self._originalOpacities.set(child, child.style.opacity || '1');
            child.style.opacity = '0.15';
        }
    });
};

Gp._restoreOpacity = function() {
    if (!this._originalOpacities) return;
    this._originalOpacities.forEach(function(val, el) {
        if (el && el.parentNode) el.style.opacity = val;
    });
    this._originalOpacities.clear();
};

Gp._showGuideStep = function(stepIndex) {
    if (!this.guideOverlay) return;
    var steps = this._guideSteps || [];
    if (stepIndex >= steps.length) {
        this._completeGuide();
        return;
    }
    /* 清除上一步的 dim/highlight 效果 */
    this._restoreOpacity();
    this._clearHighlightTimers();

    var step = steps[stepIndex];
    if (step.highlight) this._highlightElement(step.highlight, 4000);
    if (step.dimExcept) this._dimExcept(step.dimExcept);
    /* 更新引导面板内容 */
    var body = this.guideOverlay.querySelector('.guide-body');
    if (body) {
        body.innerHTML = '';
        step.items.forEach(function(item) {
            var div = document.createElement('div');
            div.className = 'guide-item';
            div.innerHTML = item;
            body.appendChild(div);
        });
    }
    /* 更新导航按钮状态 */
    var prevBtn = this.guideOverlay.querySelector('#guide-prev-btn');
    var nextBtn = this.guideOverlay.querySelector('#guide-next-btn');
    if (prevBtn) prevBtn.disabled = (stepIndex <= 0);
    if (nextBtn) {
        if (stepIndex >= steps.length - 1) {
            nextBtn.textContent = '完成出征 ✓';
        } else {
            nextBtn.textContent = '下一步 →';
        }
    }
};

Gp._completeGuide = function() {
    this._restoreOpacity();
    this._clearHighlightTimers();
    this.guideOverlay.classList.remove('active');
    this._guideDismissed = true;
    var meta = window.saveManager && window.saveManager._metaCache;
    if (meta) {
        meta.hasSeenGuide = true;
        if (window.saveManager) window.saveManager._saveMetaToStorage();
    }
    /* 延迟启动游戏循环 */
    var self = this;
    setTimeout(function() { self._beginLoop(); }, 500);
};

Gp._clearHighlightTimers = function() {
    if (this._highlightTimers) {
        this._highlightTimers.forEach(function(t) { clearTimeout(t); });
        this._highlightTimers = [];
    }
};

Gp._deliverHandTile = function(tileData) {
    /* tileData: { text, cssClass, slotIndex } */
    var self = this;
    /* 找到第一个空槽位 */
    var slotIdx = -1;
    for (var i = 0; i < 14; i++) {
        if (this._handTileSlots && this._handTileSlots[i] && !this._handTileSlots[i].classList.contains('occupied')) {
            slotIdx = i;
            break;
        }
    }
    if (slotIdx === -1) return; /* 手牌槽已满 */
    /* 飞入动画 */
    var slot = this._handTileSlots[slotIdx];
    slot.classList.add('occupied', 'tile-delivering');
    var tileBody = document.createElement('div');
    tileBody.className = 'tile-body ' + (tileData.cssClass || '');
    tileBody.textContent = tileData.text;
    tileBody.style.opacity = '0';
    tileBody.style.transform = 'translate3d(0,-30px,0) scale(0.5)';
    slot.appendChild(tileBody);
    /* 交付音效反馈 */
    if (window.fxManager) {
        window.fxManager.spawnText(this.player.x, this.player.y - 40, '摸牌!', 'normal');
    }
    /* 动画过渡 */
    var animTimer = setTimeout(function() {
        tileBody.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
        tileBody.style.opacity = '1';
        tileBody.style.transform = 'translate3d(0,0,0) scale(1)';
        slot.classList.remove('tile-delivering');
        /* 自动保存手牌状态 */
        self._saveHandState();
    }, 100);
    this._handTileDeliverTimers = this._handTileDeliverTimers || [];
    this._handTileDeliverTimers.push(animTimer);
};

Gp._saveHandState = function() {
    if (!this._handTileSlots) return;
    var meta = window.saveManager._metaCache || {};
    meta.handTiles = meta.handTiles || [];
    meta.handTiles.length = 0;
    for (var i = 0; i < this._handTileSlots.length; i++) {
        var slot = this._handTileSlots[i];
        if (slot.classList.contains('occupied')) {
            var body = slot.querySelector('.tile-body');
            if (body) {
                /* 提取 tile-body 之后的所有类名 */
                var classes = '';
                for (var j = 0; j < body.classList.length; j++) {
                    if (body.classList[j] !== 'tile-body') {
                        classes += (classes ? ' ' : '') + body.classList[j];
                    }
                }
                meta.handTiles.push({
                    index: i,
                    text: body.textContent,
                    classes: classes
                });
            }
        }
    }
    window.saveManager._saveMetaToStorage();
};

Gp._restoreHandState = function() {
    if (!this._handTileSlots) return;
    var meta = window.saveManager._metaCache || {};
    var tiles = meta.handTiles || [];
    tiles.forEach(function(t) {
        if (t.index < this._handTileSlots.length) {
            var slot = this._handTileSlots[t.index];
            slot.classList.add('occupied');
            var body = document.createElement('div');
            body.className = 'tile-body ' + (t.classes || '');
            body.textContent = t.text;
            slot.appendChild(body);
        }
    }.bind(this));
};

/* 引导步骤定义 */
Gp._defineGuideSteps = function() {
    this._guideSteps = [
        {
            highlight: '#guide-overlay',
            dimExcept: ['#guide-overlay'],
            items: [
                '<div class="guide-item"><span class="guide-key">WASD</span> / 方向键 移动雀士</div>',
                '<div class="guide-item"><span class="guide-key">鼠标点击</span> 攻击范围内妖牌</div>',
                '<div class="guide-item"><span class="guide-key">空格</span> 怒气满时触发 Overdrive 役满暴走</div>',
                '<div class="guide-item"><span class="guide-key">Esc</span> / ⏸ 暂停游戏</div>',
                '<div class="guide-item">击杀妖牌掉落 <strong>铜筹码</strong> 和 <strong>经验石</strong></div>',
                '<div class="guide-item">升级时弹出三张天命麻将牌，选择一张收入底部手牌槽</div>',
                '<div class="guide-item">凑齐顺子/刻子激活强力技能，胡牌进入 Overdrive</div>'
            ]
        },
        {
            highlight: '#player',
            dimExcept: ['#player'],
            items: [
                '<div class="guide-item">你是最后一张骨雕麻将牌——<strong>「雀」</strong></div>',
                '<div class="guide-item">羊脂玉牌面，祖母绿侧边厚度，竹骨黄夹层</div>',
                '<div class="guide-item">朱砂红「雀」字在牌面正中闪烁</div>',
                '<div class="guide-item">移动躲避妖牌，点击攻击消灭它们</div>'
            ]
        },
        {
            highlight: '#exp-bar-container',
            dimExcept: ['#exp-bar-container'],
            items: [
                '<div class="guide-item">拾取铜筹码和经验石提升等级</div>',
                '<div class="guide-item">经验条满后弹出三张天命牌</div>',
                '<div class="guide-item">选择一张收入底部 14 格手牌槽</div>'
            ]
        },
        {
            highlight: '#hand-tile-bar',
            dimExcept: ['#hand-tile-bar'],
            items: [
                '<div class="guide-item">底部 14 格为天命手牌槽</div>',
                '<div class="guide-item">筒子牌（孔雀蓝）：弹跳飞环</div>',
                '<div class="guide-item">条子牌（竹翠青）：直线剑气</div>',
                '<div class="guide-item">万字牌（朱砂红）：范围爆裂</div>',
                '<div class="guide-item">凑齐顺子 / 刻子激活组合技能</div>'
            ]
        }
    ];
};

window.gameEngine = new window.GameEngine();
})();
