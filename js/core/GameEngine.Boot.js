/**
 * GameEngine.Boot — 初始化/DOM缓存/事件绑定/输入/暂停/引导启动
 */
(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;
    var designW = 1920, designH = 1080;

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
            /* 排除 overlay 区域 — 防止拦截 modal 点击 */
            if (e.target.closest && (e.target.closest('#reward-overlay, #victory-overlay, #game-over-overlay, #pause-overlay, #guide-overlay, #mutator-overlay, #boss-gamble-panel'))) return;
            if (!self.running || self.gameOver || self._pendingReward) return;

            /* ── ScreenToGameCoordinate 工具：处理 responsive.js 的 transform:scale() ── */
            var bfRect = self.battlefield.getBoundingClientRect();
            var containerEl = self.container || document.getElementById('game-container');
            var containerRect = containerEl ? containerEl.getBoundingClientRect() : null;
            /* scale = 设计尺寸 / 实际渲染尺寸 */
            var designW = 1920;
            var designH = 1080;
            var scaleX = 1, scaleY = 1;
            if (containerRect && containerRect.width > 0) {
                scaleX = designW / containerRect.width;
                scaleY = designH / containerRect.height;
            }
            var clickVX = (e.clientX - bfRect.left) * scaleX;
            var clickVY = (e.clientY - bfRect.top) * scaleY;
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
    this._battlefieldBg = document.getElementById('battlefield');
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
    this._totalWaves = levelCfg.maxWaves || 5;
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
    this._spawnInterval = levelCfg.spawnIntervalMin || 1.5;
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
        this._spawnCausalityText('天神下凡：攻击力 +20%');
    }
    if (this._currentLevelId === 'level_3' && cf.level2Overkill) {
        this._bloodRageActive = true;
        this._spawnCausalityText('血海狂暴：领主强化，核心 +2');
    }

    /* Epoch 2: weapon_forge 天赋 — 开局双神兵 */
    if (meta && meta.talents && meta.talents.weapon_forge >= 1) {
        this._spawnCausalityText('⚔ 双神兵开局：飞刃 + 环形护体');
    }

    /* ── Epoch 14: 关卡亲和减伤 ── */
    if (this.player && this.player.mapAffinityLevel > 0) {
        var affinityReduction = this.player.mapAffinityLevel * 0.1;
        this._mapAffinityReduction = affinityReduction;
        this._spawnCausalityText('🗺️ 关卡亲和 Lv.' + this.player.mapAffinityLevel + ' — 伤害 -' + (affinityReduction * 100) + '%');
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
    var wa = document.getElementById('wave-announce');
    wa.textContent = '第 ' + (waveIdx + 1) + ' 波';
    wa.classList.add('active');
    this._autoSave('wave');
    var self = this;
    setTimeout(function() {
        wa.classList.remove('active');
        self._freezeClock();
        setTimeout(function() {
            self._unfreezeClock();
            self._beginLoop();
        }, 300);
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
    this._elapsed = 0;
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

})();
