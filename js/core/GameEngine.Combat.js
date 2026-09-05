(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

Gp._resumeAfterReward = function() {
    if (window.rewardManager) window.rewardManager.hidePanel();
    /* R104-P1: 清理天气/光环DOM，防止波次间累积 */
    if (this._dayNightEl && this._dayNightEl.parentNode) this._dayNightEl.remove();
    this._dayNightEl = null;
    if (this._abyssMistEl && this._abyssMistEl.parentNode) this._abyssMistEl.remove();
    this._abyssMistEl = null;
    if (this._bossMistEl && this._bossMistEl.parentNode) this._bossMistEl.remove();
    this._bossMistEl = null;
    if (this._flameAuraEl && this._flameAuraEl.parentNode) this._flameAuraEl.remove();
    this._flameAuraEl = null;
    if (this._iceAuraEl && this._iceAuraEl.parentNode) this._iceAuraEl.remove();
    this._iceAuraEl = null;
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
    this._pendingExpGems = [];
    this._cleanAllProjectiles();
    this._cleanEnemyProjectiles();

    /* R30-H-007: 清理雨滴粒子防止累积 */
    if (this._rainDrops) {
        for (var _rd = 0; _rd < this._rainDrops.length; _rd++) {
            if (this._rainDrops[_rd] && this._rainDrops[_rd].parentNode) this._rainDrops[_rd].remove();
        }
        this._rainDrops = [];
    }

    this._waveCount++;
    this.currentWaveSpawnedCount = 0;
    /* R201-P0: 铁拳事件暴击加成单波有效 — 若波次清空时无击杀，buff 不应泄漏到下一波 */
    this._tempCritBonus = 0;
    /* R207-P1: 临时护盾/狂暴/金币加成单波有效 — 防止跨波残留 */
    this._tempShield = 0;
    this._tempShieldEnd = 0;
    this._tempBerserkBonus = false;
    this._tempGoldMult = 1;
    /* R137-P0: 同步SpawnSystem计数器，防止波次间空刷 */
    if (window.SpawnSystem) window.SpawnSystem.currentWaveSpawnedCount = 0;
    this._mutatorTriggered = false;
    this._clearMutatorEffects();
    this._clearTotems();
    this._cleanEnemyProjectiles();

    /* R37-P0: 重置命中顿帧计时器，防止跨局泄漏 */
    this._hitStopT = 0;

    /* ── 检测 Boss Lord 波次 ── */
    this._bossLordWave = (this._waveCount >= this._getMaxWaves() - 1);
    this._bossLordSpawned = false;
    if (this._bossLord) this._bossLord = null;

    this._announceWave(this._waveCount);

    /* 启动下一波 */
    this._beginLoop();
};

Gp._resumeAfterLevelUp = function() {
    if (window.rewardManager) window.rewardManager.hidePanel();
    /* R102-P1: 清除雀魂护盾定时器，防止跨升级残留 */
    if (this._qqueenShieldTimer) { clearTimeout(this._qqueenShieldTimer); this._qqueenShieldTimer = null; }
    /* R102-P1: 清除Boss Gamble状态，防止跨升级残留 */
    this._pendingBossGamble = false;
    /* R69-P0: 清除 _pendingReward 避免波次结算状态跨升级面板残留，防止奖励面板重复弹出 */
    this._pendingReward = false;
    /* R221-P1: 清除雀魂打牌/胡牌锁定状态，防止升级后残留锁住游戏 */
    this._discardMode = false;
    this._discardSel = -1;
    this._huLock = false;
    /* M-001: 升级期间如果波次已清除，恢复以显示奖励面板 */
    if (this.enemies.length === 0 && this._activeCoins.length === 0 && this._expGems.length === 0
        && this.currentWaveSpawnedCount >= this._getWaveEnemyMax() && this._waveCount < this._getMaxWaves() - 1) {
        this._pendingReward = true;
    }
    /* R200-P0: Boss死亡期间升级 — 恢复后检查是否需结算胜利（防止波次已清除但无胜利路径的永久运行） */
    if (this.enemies.length === 0 && this._activeCoins.length === 0 && this._expGems.length === 0
        && this._waveCount >= this._getMaxWaves() - 1 && !this._pendingBossLordSettle) {
    this._tempShield = 0;
    this._tempShieldEnd = 0;
        this.running = false;
        this.gameOver = true;
        this._won = true;
        if (this._currentLevelId === 'level_3' || this.loopCount > 0) {
            this._showAbyssPanel();
        } else {
            this._showVictory();
        }
        return;
    }
    /* Epoch 2: 雀魂护盾 — 每10波触发 */
    this._checkQqueenShield();
    this._beginLoop();
};

Gp._checkQqueenShield = function() {
    var meta = window.saveManager._metaCache || {};
    var shieldLv = (meta.talents || {}).que_spirit_shield || 0;
    if (shieldLv <= 0) return;
    /* 每10波触发一次 */
    if ((this._waveCount + 1) % 10 !== 0) return;
    if (this._shieldActive) return; /* 已在冷却中 */
    this._shieldActive = true;
    this._shieldTimer = 5 + shieldLv * 2; /* 基础5秒 + 每级2秒 */
    if (this.player) this.player.invulnTimer = this._shieldTimer;
    this._spawnCausalityText('🀄 雀魂护盾激活！持续 ' + this._shieldTimer + 's');
    if (this.container) {
        this.container.style.boxShadow = '0 0 60px rgba(30,111,66,0.6)';
    }
    var self = this;
    this._qqueenShieldTimer = setTimeout(function() {
        self._shieldActive = false;
        if (self.container) self.container.style.boxShadow = '';
    }, this._shieldTimer * 1000);
};

Gp._showVictory = function() {
    /* R207-P1: 确保胜利时引导覆盖层已关闭，防止z-index冲突阻塞交互 */
    if (this.guideOverlay && this.guideOverlay.classList.contains('active')) {
        this._completeGuide();
    }
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
    /* R115-P0: 屏幕阅读器播报胜利 */
    this._announceToSR('通关！击杀 ' + this.kills + ' 个敌人');
    this._syncUI();

    /* ── Boss Gamble 结算 ── */
    if (this._gambleActive) {
        this._resolveGamble(true);
    }

    this._settleRun(tokens);
};

Gp._showAbyssPanel = function() {
    if (this._abyssPanelVisible) return; /* L-018: 防止快速点击重复添加 panel */
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
        '<div class="abyss-warning">\u602a\u7269\u5c5e\u6027\u4e58\u4ee5 ' + (Math.pow(Balance.ABYSS_LOOP_HP_ATK_MULT, this.loopCount + 1)).toFixed(2) + 'x</div>' +
        '<div class="abyss-buttons">' +
            '<button class="abyss-btn abyss-btn-retreat">\u64a4\u9000\u5927\u672c\u8425</button>' +
            '<button class="abyss-btn abyss-btn-enter">\u8e0f\u5165\u6df1\u6e0a</button>' +
        '</div>';
    this.battlefield.appendChild(panel);
    this._abyssPanelVisible = true;

    panel.querySelector('.abyss-btn-retreat').addEventListener('click', async function() {
        if (panel.parentNode) panel.remove();
        self._abyssPanelVisible = false;
        var tokens = window.saveManager.calcMetaTokens(self.kills, self._elapsed);
        await self._settleRun(tokens); /* R204-P1: 等待结算完成后再显示胜利覆盖层，确保周常/每日任务奖励已计入 */
        self._showVictoryOverlay();
    });
    panel.querySelector('.abyss-btn-enter').addEventListener('click', function() {
        if (panel.parentNode) panel.remove();
        self._abyssPanelVisible = false;
        self._enterAbyss();
    });
};

Gp._enterAbyss = function() {
    /* R30-H-017: 清理Boss Phase 3红色雾霭 */
    if (this._bossMistEl && this._bossMistEl.parentNode) this._bossMistEl.remove();
    this._bossMistEl = null;
    var bc = document.getElementById('active-buffs-container');
    if (bc) bc.remove();
    /* R138-P0: 清一色金光环在进入深渊前重置，防止视觉残留误导 */
    if (this.playerEl) this.playerEl.classList.remove('hu-qingyise');
    /* R204-P1: 重置胜利标记，防止深渊死亡被错误计入总胜场 */
    this._won = false;
    this.loopCount++;
    this._waveCount = 0;
    this.currentWaveSpawnedCount = 0;
    this._elapsed = 0;
    this.kills = 0;
    this._spawnTimer = 0;
    this._spawnInterval = this._spawnInterval; /* keep current level config */
    this._difficultyTimer = 0;
    this._bossTimer = 0;
    this._bossLord = null;
    this._bossLordWave = false;
    this._bossLordSpawned = false;
    this._gambleActive = false;
    this._discardMode = false;
    this._huLock = false;
    this._gambleType = null;
    this._gambleStaked = 0;
    this._pendingBossGamble = false;
    this._gambleAbyssBonus = false;
    this._mutatorTriggered = false;
    this._activeMutator = null;
    this._clearMutatorEffects(); /* R131-P0: 深渊进入时清理突变效果，防止bloodmoon/frenzy等跨轮回残留 */
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
    this._tempShieldEnd = 0;
    this._extraEliteCount = 0;
    /* R193-P1: 深渊轮回前结束Overdrive，防止武器伤害×2和敌人冻结跨层残留 */
    if (this._overdriveActive) this._endOverdrive();
    this._overdriveCount = 0; /* R198-P1: 深渊每轮回重置局内计数，防止跨层累积误触发成就 */
    /* P0: 应用深渊轮回属性缩放 — 基于原始基数锚点，防止跨轮复合累乘 */
    if (this._abyssLoopHpScale && this._abyssLoopHpScale > 1 && this.player) {
        var origMaxHp = this.player._baseMaxHp || this.player.maxHp;
        this.player.maxHp = Math.floor(origMaxHp * this._abyssLoopHpScale);
        this.player.hp = Math.floor(origMaxHp * this._abyssLoopHpScale);
    }
    if (this._abyssLoopAtkScale && this._abyssLoopAtkScale > 1 && this.player) {
        var origAtk = this.player._baseAtk || this.player.atk;
        this.player.atk = Math.floor(origAtk * this._abyssLoopAtkScale);
    }
    this._milestonesShown = false;
    /* R30-H-011: 清除打牌/胡牌模式状态，防止深渊轮回后游戏冻结 */
    this._discardMode = false;
    this._huLock = false;

    /* ── 深渊轮回保留保险库变异 ── */
    if (this._vaultMutations && this._vaultMutations.indexOf('gravity') !== -1 && this.player) {
        this.player.magnetRadius = 0;
    }

    for (var _el of this._enemyElements.values()) { if (_el && _el.parentNode) _el.remove(); }
    this._enemyElements.clear();
    this.enemies = [];
    this._enemyIdCounter = 0;
    this._clearTotems();
    this._cleanEnemyProjectiles();

    /* R30-H-007: 深渊轮回也清理雨滴 */
    if (this._rainDrops) {
        for (var _rd = 0; _rd < this._rainDrops.length; _rd++) {
            if (this._rainDrops[_rd] && this._rainDrops[_rd].parentNode) this._rainDrops[_rd].remove();
        }
        this._rainDrops = [];
    }
    this.gameOver = false;
    this.running = false; /* 显式确保 running=false，由 _announceWave → _beginLoop 恢复 */
    this._abyssPanelVisible = true;
    var vpW = this.battlefield.clientWidth;
    var vpH = this.battlefield.clientHeight;
    this.cameraX = Math.max(0, Math.min(this._mapW - vpW, this.player.x - vpW / 2));
    this.cameraY = Math.max(0, Math.min(this._mapH - vpH, this.player.y - vpH / 2));
    this._syncEntities();
    this._syncPlayerHP();
    this._syncUI();
    this._announceWave(0);
    /* R205-P0: 深渊战斗开始后清除面板可见标志，恢复暂停功能 */
    this._abyssPanelVisible = false;
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
    /* R115-P0: 屏幕阅读器播报胜利 */
    this._announceToSR('通关！击杀 ' + this.kills + ' 个敌人');
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
        var mult = Math.pow(Balance.ABYSS_LOOP_HP_ATK_MULT, this.loopCount + 1).toFixed(2);
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
    /* R55-P1: 防御性null guard防止非Engine上下文调用崩溃 */
    if (!this.battlefield) return;
    var el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:absolute;top:20%;left:50%;transform:translate(-50%,-50%);font-size:24px;font-weight:900;color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,0.8),0 0 40px rgba(255,215,0,0.4);z-index:200;pointer-events:none;white-space:nowrap;animation:floatUp 0.6s ease-out forwards;';
    this.battlefield.appendChild(el);
    var self = this;
    setTimeout(function() { if (el.parentNode) el.remove(); }, Balance.CAUSALITY_TIMEOUT_MS);
};

Gp._settleRun = async function(tokens) {
    /* P0-1 修复：原布尔守卫在胜利/死亡流程下恒真导致结算死代码。
       改用局序号令牌 — 仅当 await 期间发生 restart（序号变化）才放弃写入 */
    var _seq = this._runSeq || 0;
    var meta = await window.saveManager.getMeta();
    /* 再次检查 — await 后可能已 restart */
    if ((this._runSeq || 0) !== _seq) return;
    meta.metaTokens = (meta.metaTokens || 0) + tokens;
    meta.totalRuns = (meta.totalRuns || 0) + 1;
    meta.totalKills = (meta.totalKills || 0) + this.kills;
    /* Epoch 3: 保存局内成就计数器到 meta */
    meta.overdriveCount = (meta.overdriveCount || 0) + (this._overdriveCount || 0);
    /* R212-P1: 首次Overdrive成就 — inflight检查因缺少overdrive_1条目而静默失败，此处兜底 */
    if ((meta.overdriveCount || 0) >= 1) this._checkAchievement('overdrive_1');
    meta.bossKills = (meta.bossKills || 0) + (this._bossKillsThisRun || 0);
    meta.finalBossKills = (meta.finalBossKills || 0) + (this._finalBossKillsThisRun || 0);
    meta.totalCrits = (meta.totalCrits || 0) + (this._totalCritsThisRun || 0);
    meta.totalDodges = (meta.totalDodges || 0) + (this._totalDodgesThisRun || 0);
    meta.maxGoldThisRun = Math.max(meta.maxGoldThisRun || 0, this._maxGoldThisRun || 0);
    /* R188-P0: 重置单局最高金币，防止跨局累加导致gold_10k名不副实 */
    this._maxGoldThisRun = 0;
    /* 检查套装共鸣成就 — 需同时激活炎痕+永冻番印 (R147-P1: ||→&& 对齐设计文档) */
    if (this.player && this.player.setResonanceSpeed && this.player.setResonanceIce) {
        meta.fullSetActivated = true;
    }
    var bonusCores = 1;
    if (this._bloodRageActive) bonusCores += 2;
    /* Epoch 2: 核心共鸣天赋 */
    var metaForResonance = window.saveManager._metaCache || {};
    var coreResLevel = (metaForResonance.talents || {}).he_resonance || 0;
    if (coreResLevel > 0) {
        bonusCores = Math.floor(bonusCores * (1 + coreResLevel * 0.1));
    }
    /* ── 变异保险库：每携带一个异变，核心翻倍 ── */
    if (this._vaultMutations && this._vaultMutations.length > 0) {
        bonusCores *= Math.pow(2, this._vaultMutations.length);
    }
    meta.bossCores = (meta.bossCores || 0) + bonusCores;

    /* ── Epoch 15: 精英模式核心加成 (Balance.ELITE_CORE_MULT) ── */
    if (this._eliteModeActive) {
        meta.bossCores = Math.floor(meta.bossCores * Balance.ELITE_CORE_MULT);
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
            uniqueRelics: (function(){ var p=this.player&&this.player.relicLevels||{}; return Object.keys(p).filter(function(k){return(p[k]||0)>0;}).length; }).call(this),
            bossKills: this._bossKillsThisRun || 0,
            abyssDepth: this.loopCount || 0,
            dodges: this._totalDodgesThisRun || 0,
            crits: this._totalCritsThisRun || 0,
            waves: this._waveCount || 0,
            hitsTaken: this._playerHitCountThisRun || 0,
            /* R140-P0: gameOver在胜利路径已提前置true，用_won区分胜负而非!gameOver */
            won: this._won
        };
        try {
            var vaultResult = await window.saveManager.evaluateWeeklyVault(runStats);
            if (vaultResult.evaluated && vaultResult.completed) {
                meta.metaTokens = (meta.metaTokens || 0) + (vaultResult.reward.metaTokens || 0);
                meta.bossCores = (meta.bossCores || 0) + (vaultResult.reward.bossCores || 0);
                this._spawnCausalityText('🏆 金库挑战完成: +' + (vaultResult.reward.metaTokens || 0) + '代币 +' + (vaultResult.reward.bossCores || 0) + '核心');
            }
        } catch(e) { console.warn('[WeeklyVault] evaluation failed:', e); }
    }

    await window.saveManager.saveMeta(meta).catch(function(e){ window.toastSystem && window.toastSystem.error('存档失败: ' + e.message); });
    await window.saveManager.clearActiveRun().catch(function(e){ window.toastSystem && window.toastSystem.error('清除存档失败: ' + e.message); });

    /* Epoch 47: 赛季通行证XP */
    if (typeof window.saveManager.addBattlePassXP === 'function') {
        window.saveManager.addBattlePassXP(10 + Math.floor(this.kills / 10)).catch(function(e) { console.warn('[BattlePass] XP save failed:', e); });
    }

    /* Epoch 47: Boss掉落事件 — 宝石雨 */
    if (this._bossKillRewardEffect) this._bossKillRewardEffect();
    if (this._renderActiveBuffs) this._renderActiveBuffs();
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
    /* 无伤 — 必须获胜才算（R136-P0: 用_won替代!gameOver，后者在胜利结算前已置true） */
    if (this._playerHitCountThisRun === 0 && this._won) {
        meta.flawlessRuns = (meta.flawlessRuns || 0) + 1;
    }
    if ((meta.flawlessRuns || 0) >= 1) this._checkAchievement('flawless');
    if ((meta.flawlessRuns || 0) >= 5) this._checkAchievement('flawless_5');
    /* Boss 击杀 */
    if ((meta.bossKills || 0) >= 10) this._checkAchievement('boss_slayer');
    if ((meta.finalBossKills || 0) >= 5) this._checkAchievement('final_boss_down');
    /* 英雄解锁 */
    if ((meta.unlockedHeroes || []).length >= 4) this._checkAchievement('all_heroes');
    /* 套装共鸣 */
    if (meta.fullSetActivated) this._checkAchievement('full_set');
    /* 金币 — get_rich/gold_10k 是单局实时成就，通过 _syncUI inflight 检测，此处不应使用meta跨局值 */
    /* R136-P0: speed_demon 终局兜底 — 用_won替代!gameOver防止死代码 */
    /* R188-P1: 增加_bossLordSpawned检查，防止非最终Boss关卡提前触发极速通关成就 */
    if (this._won && this._bossLordSpawned && (this._elapsed || 0) <= 180) this._checkAchievement('speed_demon');

    /* ── 变异保险库：20%概率解锁新突变 ── */
    /* R207-P0: 仅深渊轮回允许解锁突变，防止非深渊局误触发 */
    if (this.loopCount > 0 && Math.random() < Balance.VAULT_MUTATION_UNLOCK_CHANCE) {
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
            if ((this._runSeq || 0) === _seq) await window.saveManager.saveMeta(meta); /* P1-NEW-b: 序号令牌守卫 */
            var _label = _newMut === 'gravity' ? '\u5f15\u529b\u9006\u8f6c' : '\u72c2\u66b4\u8840\u6708';
            var _notif = document.createElement('div');
            _notif.className = 'mutation-unlock-notif';
            _notif.innerHTML = '\u89e3\u9501\u53d8\u5f02: ' + _label;
            document.body.appendChild(_notif);
            setTimeout(function() { if (_notif.parentNode) _notif.remove(); }, Balance.TIMEOUT_NOTIF_REMOVE_MS);
        }
    }

    /* ── Epoch 15/23: 战局历史记录 ── */
    var pR3 = this.player && this.player.relicLevels || {};
    var uniqueRelics = Object.keys(pR3).filter(function(k) { return (pR3[k] || 0) > 0; }).length;
    var _wc = [];
    try {
        if (typeof window.saveManager.recordRunHistory === 'function') {
            window.saveManager.recordRunHistory(
                this.player.heroId, this._currentLevelId, this.kills, this._elapsed,
                this._won, this.loopCount || 0, uniqueRelics, _wc
            ); /* R144-P1: 使用_won标志替代!gameOver — gameOver在结算时已置true，导致胜利也被记为败北 */
        }
    } catch(e) { window.toastSystem && window.toastSystem.error('战局记录失败: ' + e.message); }

    /* P1-NEW-b: 终末确定性落盘 — 统计/历史/成就/变异解锁一次性持久化 */
    if ((this._runSeq || 0) === _seq) {
        meta.lastSaveTimestamp = Date.now();
        await window.saveManager.saveMeta(meta).catch(function(e){ window.toastSystem && window.toastSystem.error('终末存档失败: ' + e.message); });
    }
};

Gp._gameOver = async function() {
    /* P1: 防御性清除 victoryOverlay，防止叠加残留 */
    if (this.victoryOverlay) this.victoryOverlay.classList.remove('active');
    /* R69-P1: 清除奖励面板防止游戏结束画面叠加 */
    if (window.rewardManager) window.rewardManager.hidePanel();
    /* R30-H-017: 清理Boss Phase 3红色雾霭 */
    if (this._bossMistEl && this._bossMistEl.parentNode) this._bossMistEl.remove();
    this._bossMistEl = null;
    /* P2: 确保 Overdrive 结束时重置状态 */
    if (this._overdriveActive) this._endOverdrive();
    /* R138-P0: 清一色金光环在死亡时重置，防止跨局残留 */
    if (this.playerEl) this.playerEl.classList.remove('hu-qingyise');
    if (this.player) this.player.huQingyise = false; /* R140-P1: 同步重置标志防止后续逻辑依赖 */
    /* R116-P1: 防止 Boss Lord 结算状态跨局残留 */
    this._pendingBossLordSettle = false;
    /* R117-P0: 防止深渊面板双开守卫在重启后失效 */
    this._abyssPanelVisible = false;
    var _seqGO = this._runSeq || 0; /* P0-1: 局序号令牌 */
    window.audioManager && window.audioManager.play('gameover');
    /* R132-P1: 游戏结束前主动存档，防止running=false后beforeunload跳过保存 */
    this._autoSave('death');
    /* P0-1 修复: 移除恒真布尔守卫（调用方 Loop 已先行置 flags，原守卫使死亡结算永不执行） */
    this.gameOver = true;
    this.running = false;
    this._freezeClock();

    /* Epoch 46: 玩家死亡动画 — 雀牌碎裂 */
    if (this.playerEl) {
        this.playerEl.style.transition = 'transform 0.6s ease-in, opacity 0.6s ease-in';
        this.playerEl.style.transform = 'scale(0) rotate(180deg)';
        this.playerEl.style.opacity = '0';
        var self = this;
        /* R102-P1: 存储deathAnimTimer引用，防止restart时旧动画残留 */
        this._deathAnimTimer = setTimeout(function() { if (self.playerEl) self.playerEl.style.display = 'none'; }, 700);
    }
    for (var _c = 0; _c < this._activeCoins.length; _c++) this._activeCoins[_c].el.remove();
    this._activeCoins = [];
    for (var _g = 0; _g < this._expGems.length; _g++) { if (this._expGems[_g].el) this._expGems[_g].el.remove(); }
    this._expGems = [];
    this._pendingExpGems = [];
    this._cleanAllProjectiles();
    this._cleanEnemyProjectiles();
    this._resetAllWeapons();
    this._clearTotems();
    this._mutatorTriggered = false;
    this._clearMutatorEffects();
    if (this.mutatorOverlay) this.mutatorOverlay.classList.remove('active');
    if (this.bossHpBar) this.bossHpBar.classList.remove('active');
    /* Epoch 46: 死亡时清理波次横幅 */
    if (this.waveMilestoneBanner) this.waveMilestoneBanner.classList.remove('visible');
    for (var _el of this._enemyElements.values()) { if (_el && _el.parentNode) _el.remove(); }
    this._enemyElements.clear();
    this.enemies = [];
    this._bossLord = null;
    this._bossLordWave = false;
    this._bossLordSpawned = false;
    /* R30-H-007: 清理雨滴粒子防止累积 */
    if (this._rainDrops) {
        for (var _rd = 0; _rd < this._rainDrops.length; _rd++) {
            if (this._rainDrops[_rd] && this._rainDrops[_rd].parentNode) this._rainDrops[_rd].remove();
        }
        this._rainDrops = [];
    }
    /* P0: 清理日夜叠加和深渊红雾DOM，防止重开时残留 */
    if (this._dayNightEl && this._dayNightEl.parentNode) this._dayNightEl.remove();
    this._dayNightEl = null;
    if (this._abyssMistEl && this._abyssMistEl.parentNode) this._abyssMistEl.remove();
    this._abyssMistEl = null;
    /* P2: 清理 Active Buffs 容器，防止死亡后残留在战场中 */
    var _abc = document.getElementById('active-buffs-container');
    if (_abc) { _abc.remove(); this._buffsContainerEl = null; }

    /* P3-NEW: 死亡时清除 Boss Gamble 超时计时器，防止状态泄漏 */
    if (this._gambleTimeout) {
        clearTimeout(this._gambleTimeout);
        this._gambleTimeout = null;
    }
    /* P4: 死亡时清除所有残存定时器，防止回调在已终止引擎上执行 */
    if (this._interWaveTimeout) { clearTimeout(this._interWaveTimeout); this._interWaveTimeout = null; }
    if (this._qqueenShieldTimer) { clearTimeout(this._qqueenShieldTimer); this._qqueenShieldTimer = null; }
    /* R106-P0: 防止怪物潮双倍掉落跨局残留 */
    this._monsterSurgeDoubleDrops = false;
    /* ── Boss Gamble 失败结算 ── */
    if (this._gambleActive) {
        this._resolveGamble(false);
    }
    this._gambleActive = false;
    this._discardMode = false;
    this._huLock = false;
    this._gambleType = null;
    this._gambleStaked = 0;
    this._pendingBossGamble = false;
    this._gambleAbyssBonus = false;
    /* R37-P2: 确保_QQueen护盾状态在死亡时清除 */
    this._shieldActive = false;

    if (this.resultTime) this.resultTime.textContent = this._formatTime(this._elapsed);
    if (this.resultKills) this.resultKills.textContent = this.kills;
    if (this.resultWave) this.resultWave.textContent = (this._waveCount || 0) +' /' + (this._totalWaves || this._getMaxWaves() || 0);
    if (this.gameOverOverlay) this.gameOverOverlay.classList.add('active');
    /* R115-P0: 屏幕阅读器播报失败 */
    this._announceToSR('游戏结束。击杀 ' + this.kills + ' 个敌人，存活 ' + this._formatTime(this._elapsed));

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

    var meta = await window.saveManager.getMeta().catch(function(e){ window.toastSystem && window.toastSystem.error('获取存档失败: ' + e.message); return {}; });
    /* P0-1 修复：序号令牌替代恒真布尔守卫 */
    if ((this._runSeq || 0) !== _seqGO) return;
    if (!meta || typeof meta.metaTokens === 'undefined') meta = { metaTokens: 0 };
    meta.metaTokens = (meta.metaTokens || 0) + tokens;
    /* R198-P1: totalRuns仅胜利路径累加，死亡不算通关，防止通关类成就门槛被稀释 */
    if (this._won) meta.totalRuns = (meta.totalRuns || 0) + 1;
    meta.totalKills = (meta.totalKills || 0) + this.kills;
    /* R197-P0: 死亡路径补全meta累计字段，防止胜利路径独占统计 */
    meta.overdriveCount = (meta.overdriveCount || 0) + (this._overdriveCount || 0);
    meta.bossKills = (meta.bossKills || 0) + (this._bossKillsThisRun || 0);
    meta.finalBossKills = (meta.finalBossKills || 0) + (this._finalBossKillsThisRun || 0);
    meta.totalCrits = (meta.totalCrits || 0) + (this._totalCritsThisRun || 0);
    meta.totalDodges = (meta.totalDodges || 0) + (this._totalDodgesThisRun || 0);
    meta.maxGoldThisRun = Math.max(meta.maxGoldThisRun || 0, this._maxGoldThisRun || 0);
    this._maxGoldThisRun = 0;
    var challengeResults = null;
    try {
        if (typeof window.mainHubCheckChallenge === 'function') {
            challengeResults = window.mainHubCheckChallenge(this);
        }
    } catch(e) { window.toastSystem && window.toastSystem.error('结算错误: ' + e.message); }
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
        var weeklyStats = { kills: this.kills, elapsed: this._elapsed, overdriveCount: this._overdriveCount || 0, maxGold: this._maxGoldThisRun || 0, hitsTaken: this._playerHitCountThisRun || 0, bossKills: this._bossKillsThisRun || 0, abyssDepth: this.loopCount || 0, dodges: this._totalDodgesThisRun || 0, crits: this._totalCritsThisRun || 0, /* R140-P0: 用_won替代!gameOver防止胜利路径误报失败 */ won: this._won };
        if (typeof window.saveManager.checkWeeklyCompletion === 'function') {
            var wc = window.saveManager.checkWeeklyCompletion(weeklyStats);
            weeklyCompleted = wc.completed || [];
            if (wc.completed && wc.completed.length > 0) {
                meta.metaTokens = (meta.metaTokens || 0) + wc.bonusTokens;
                meta.bossCores = (meta.bossCores || 0) + wc.bonusCores;
                this._spawnCausalityText('🏆 周常完成: ' + wc.completed.length + ' 项');
            }
        }
    } catch(e) { window.toastSystem && window.toastSystem.error('结算错误: ' + e.message); }

    /* Epoch 31: 每日任务完成检查 */
    try {
        var dailyStats = { kills: this.kills, elapsed: this._elapsed, overdriveCount: this._overdriveCount || 0, maxGold: this._maxGoldThisRun || 0, hitsTaken: this._playerHitCountThisRun || 0, /* R140-P0: 用_won替代!gameOver */ won: this._won, waves: this._waveCount || 0, crits: this._totalCritsThisRun || 0, dodges: this._totalDodgesThisRun || 0, abyssDepth: this.loopCount || 0 };
        if (typeof window.saveManager.checkDailyQuestCompletion === 'function') {
            var dqr = window.saveManager.checkDailyQuestCompletion(dailyStats);
            if (dqr.ids && dqr.ids.length > 0) {
                meta.metaTokens = (meta.metaTokens || 0) + (dqr.bonusTokens || 0);
                meta.bossCores = (meta.bossCores || 0) + (dqr.bonusCores || 0);
                this._spawnCausalityText('✅ 每日任务完成: ' + dqr.ids.join(', ') + (dqr.bonusTokens ? ' +' + dqr.bonusTokens + '代币' : '') + (dqr.bonusCores ? ' +' + dqr.bonusCores + '核心' : ''));
            }
        }
    } catch(e) { window.toastSystem && window.toastSystem.error('结算错误: ' + e.message); }

    /* ── Epoch 14: 运行统计记录 ── */
    var pRelics = this.player && this.player.relicLevels || {};
    var uniqueRelics = Object.keys(pRelics).filter(function(k) { return (pRelics[k] || 0) > 0; }).length;
    if (typeof window.saveManager.recordRunStats === 'function') {
        window.saveManager.recordRunStats(
            this.kills, this._elapsed, this._maxGoldThisRun || 0,
            this._overdriveCount || 0, this._totalDodgesThisRun || 0,
            this._totalCritsThisRun || 0, this._waveCount,
            this._bossKillsThisRun || 0, this.loopCount || 0,
            this._won, this._playerHitCountThisRun || 0, uniqueRelics /* R188-P1: 使用this._won替代!this.gameOver消除歧义 */
        );
    }

    /* Epoch 31: 死亡奖励 — P1-NEW-a 修复: 移到 saveMeta 之前，否则确定性丢失 */
    try {
        var deathReward = window.saveManager.calcDeathReward(this.kills, this._maxGoldThisRun || 0, this._elapsed);
        if (deathReward.metaTokens > 0 || deathReward.bossCores > 0) {
            meta.metaTokens = (meta.metaTokens || 0) + deathReward.metaTokens;
            meta.bossCores = (meta.bossCores || 0) + deathReward.bossCores;
            this._spawnCausalityText('💀 死亡补偿: +' + deathReward.metaTokens + ' 代币' + (deathReward.bossCores > 0 ? ' +' + deathReward.bossCores + ' 核心' : ''));
        }
    } catch(e) { window.toastSystem && window.toastSystem.error('结算错误: ' + e.message); }

    meta.lastSaveTimestamp = Date.now();
    await window.saveManager.saveMeta(meta).catch(function(e){ window.toastSystem && window.toastSystem.error('存档失败: ' + e.message); });

    /* 显示补偿信息 */
    var compEl = document.getElementById('death-compensation');
    if (compEl) {
        compEl.textContent = '💰 获得 ' + tokens + ' 元代币' + (weeklyCompleted.length > 0 ? ' | 周常+' + weeklyCompleted.length : '');
    }

    /* Epoch 19: 游戏死亡也记录历史 */
    try {
        var pR2 = this.player && this.player.relicLevels || {};
        var ur = Object.keys(pR2).filter(function(k) { return (pR2[k] || 0) > 0; }).length;
        if (typeof window.saveManager.recordRunHistory === 'function') {
            window.saveManager.recordRunHistory(
                this.player.heroId, this._currentLevelId, this.kills, this._elapsed,
                false, this.loopCount || 0, ur, weeklyCompleted
            );
        }
    } catch(e) { window.toastSystem && window.toastSystem.error('结算错误: ' + e.message); }

    /* Epoch 31: 更新本地排行榜 */
    try {
        var lbStats = {
            won: this._won, /* R140-P0: 用_won替代!gameOver防止胜利路径排行榜误报失败 */
            elapsed: this._elapsed,
            bestAbyssDepth: this.loopCount || 0,
            totalKills: this.kills, /* R85-P0: 传入当前局击杀数，而非累计值 */
            totalGold: this._maxGoldThisRun || 0, /* R85-P0: 传入当前局最高金币 */
            perfectRuns: (this._won && (this._playerHitCountThisRun || 0) === 0) ? 1 : 0 /* R85-P0: 无伤通关标记 */
        };
        if (typeof window.saveManager.updateLeaderboard === 'function') {
            window.saveManager.updateLeaderboard(lbStats);
        }
    } catch(e) { window.toastSystem && window.toastSystem.error('结算错误: ' + e.message); }

    /* Epoch 47: 死亡也发放通行证XP（与胜利路径一致） */
    if (typeof window.saveManager.addBattlePassXP === 'function') {
        window.saveManager.addBattlePassXP(5 + Math.floor(this.kills / 20)).catch(function(e) { console.warn('[BattlePass] death XP save failed:', e); });
    }

    await window.saveManager.clearActiveRun().catch(function(e){ window.toastSystem && window.toastSystem.error('清除存档失败: ' + e.message); });
};

Gp._removeEnemyDOM = function(enemy) {
    var el = this._enemyElements.get(enemy.id);
    if (el && el.parentNode) el.remove();
    this._enemyElements.delete(enemy.id);
    enemy._hpFill = null; /* R38-P2: 清除stale DOM引用 */
    enemy.el = null; /* R176-P0: 清除敌人士兵DOM引用，防止内存泄漏 */
};

Gp._initHandTiles = function() {
    if (!this._handTileGrid) return;
    this._handTileGrid.innerHTML = '';
    this._handTileSlots = [];
    /* R69-P1: 重置手牌点击绑定标志，确保重启后雀魂手牌可正常交互 */
    this._handClicksBound = false;
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
    if (!this.player || !this.playerHpFill || !this.playerHpText) return;
    if (isNaN(this.player.hp) || isNaN(this.player.maxHp)) { this.player.hp = 0; this.player.maxHp = 1; } /* R129-P0: 防护NaN透传到DOM */
    if (!this.player.maxHp || this.player.maxHp <= 0) this.player.maxHp = 1; /* R188-P1: 防止maxHp=0导致pct=Infinity */
    var pct = (this.player.hp / this.player.maxHp) * 100;
    this.playerHpFill.style.width = Math.max(0, pct) + '%';
    this.playerHpText.textContent = Math.max(0, Math.floor(this.player.hp)) + '/' + this.player.maxHp;
    /* M-025: 受击/无敌闪烁已委托给 _syncEntities，此处不再覆盖 opacity/filter */
};

/* ── 2.5D 骨雕雀牌渲染 ── */

Gp._renderPlayerTile = function() {
    if (!this.playerEl) return;
    var heroId = this.player ? this.player.heroId : null;
    /* 脏检查：仅在 heroId 变化时重新渲染牌面样式 */
    if (heroId === this._lastRenderedHeroId) return;
    this._lastRenderedHeroId = heroId;
    /* 设置 data-hero 属性，供 CSS 差异化样式匹配 */
    this.playerEl.setAttribute('data-hero', heroId || 'Hero');
    var heroCfg = heroId ? (window.heroConfig[heroId] || null) : null;
    /* R181-P0: 删除硬编码尺寸 — CSS #player 已定义响应式尺寸(60×80)及媒体查询断点，inline style会覆盖响应式 */
    this.playerEl.style.background = '#fbfbf7';
    this.playerEl.style.borderRadius = '7px';
    this.playerEl.style.boxShadow = '0 5px 0 #1a5336, 0 7px 0.5px #dfc590, 0 10px 12px rgba(0,0,0,0.5)';
    this.playerEl.style.display = 'flex';
    this.playerEl.style.alignItems = 'center';
    this.playerEl.style.justifyContent = 'center';
    this.playerEl.style.fontWeight = '900';
    /* ── 查找或创建文字 span，避免 textContent 覆盖子元素（如 #player-hp-wrap） ── */
    var textSpan = this.playerEl.querySelector('.player-tile-text');
    if (!textSpan) {
        textSpan = document.createElement('span');
        textSpan.className = 'player-tile-text';
        this.playerEl.appendChild(textSpan);
    }
    /* 根据英雄设定颜色 */
    if (heroId === 'Hero') {
        textSpan.style.color = '#b8860b';
        textSpan.style.textShadow = '0 0 8px rgba(212,175,55,0.6)';
        this.playerEl.style.borderColor = '#d4af37';
        this.playerEl.style.boxShadow = '0 4px 0 #b8860b, 0 6px 0.5px #dfc590, 0 8px 10px rgba(0,0,0,0.5)';
        textSpan.textContent = '雀';
    } else if (heroId === 'Knight') {
        textSpan.style.color = '#1565c0';
        textSpan.style.textShadow = '0 0 8px rgba(21,101,192,0.6)';
        textSpan.textContent = '一万';
    } else if (heroId === 'Mage') {
        textSpan.style.color = '#2e7d32';
        textSpan.style.textShadow = '0 0 8px rgba(46,125,50,0.6)';
        textSpan.textContent = '九筒';
    } else if (heroId === 'Assassin') {
        textSpan.style.color = '#7b1fa2';
        textSpan.style.textShadow = '0 0 8px rgba(123,31,162,0.6)';
        textSpan.textContent = '一条';
    }
};

Gp._syncEntities = function() {
    /* D2/P1-2: 战场缩放 — 焦点=视口中心（玩家），公式两端与点击反变换严格互逆 */
    if (!this._worldLayer || !this.player) return; /* R131-P0: null guard防止DOM缺失时崩溃 */
    var _z = this._zoomLevel || 1;
    if (_z !== 1) {
        /* R205-P1: 使用缓存视口尺寸替代每帧同步layout read，防止缩放模式rAF jank */
        var _vw = (this._vpW || (this.battlefield ? this.battlefield.clientWidth : 960)) || 960;
        var _vh = (this._vpH || (this.battlefield ? this.battlefield.clientHeight : 540)) || 540;
        var _tx = _vw * (1 - _z) / 2 - _z * this.cameraX;
        var _ty = _vh * (1 - _z) / 2 - _z * this.cameraY;
        this._worldLayer.style.transformOrigin = '0 0';
        this._worldLayer.style.transform = 'translate(' + _tx + 'px, ' + _ty + 'px) scale(' + _z + ')';
    } else {
        this._worldLayer.style.transformOrigin = '0 0';
        this._worldLayer.style.transform = 'translate(' + (-this.cameraX) + 'px, ' + (-this.cameraY) + 'px)';
    }
    var tilt = '';
    if (Math.abs(this._lastMoveX) > 0.1) {
        var deg = this._lastMoveX < -0.1 ? -6 : 6;
        tilt = ' rotate(' + deg + 'deg)';
    }
    if (this.playerEl) {
        this.playerEl.style.left = this.player.x + 'px';
        this.playerEl.style.top = this.player.y + 'px';
        this.playerEl.style.transform = 'translate(-50%,-50%)' + tilt;
    }

    /* Visual Enhancement D: 英雄移动轨迹拖尾 */
    if (this.player && Math.abs(this._lastMoveX) > 0.1 && this.player.speed > 0) {
        this._trailTimer = (this._trailTimer || 0) + (this._lastDt || 0.016);
        if (this._trailTimer >= 0.08) {
            this._trailTimer = 0;
            var trail = document.createElement('div');
            var heroId = this.player.heroId || 'Hero';
            trail.className = 'player-trail ' + heroId.toLowerCase() + '-trail';
            trail.style.left = this.player.x + 'px';
            trail.style.top = this.player.y + 'px';
            if (this._worldLayer) this._worldLayer.appendChild(trail); /* R61-P1: null guard防止渲染失败 */
            var self = this;
            setTimeout(function() { if (trail.parentNode) trail.remove(); }, Balance.TIMEOUT_TRAIL_REMOVE_MS);
        }
    }
    this._lastDt = this._lastDt || 0.016;

    /* ── Step A: 受击平滑闪烁 — 使用独立 hitFlashTimer，不依赖 invulnTimer ── */
    if (this.player.hitFlashTimer > 0) {
        var t = 1 - Math.min(this.player.hitFlashTimer / Balance.PLAYER_HITFLASH_DURATION, 1);
        var alpha = 0.4 * Math.exp(-t * 4);
        this.playerEl.style.opacity = (1 - alpha).toFixed(3);
        this.playerEl.style.filter = 'drop-shadow(0 0 ' + (8 * (1 - alpha)).toFixed(1) + 'px rgba(182,41,41,0.8))';
    } else if (this.player.invulnTimer > 0) {
        /* 无敌帧：轻微半透明 */
        this.playerEl.style.opacity = '0.85';
        this.playerEl.style.filter = '';
    } else {
        this.playerEl.style.opacity = '1';
        this.playerEl.style.filter = 'drop-shadow(0 0 6px rgba(26,83,54,0.4))';
    }

    for (var _ei = 0; _ei < this.enemies.length; _ei++) {
        var enemy = this.enemies[_ei];
        var el = this._enemyElements.get(enemy.id);
        if (!el) continue;
        el.style.left = enemy.x + 'px';
        el.style.top = enemy.y + 'px';
        var flash = enemy.flashTimer > 0;
        /* 受击闪烁效果 — H-014/M-008: 改用 CSS animation + animationend，元素移除时自动清理 */
        if (flash) {
            if (!el.classList.contains('flash-hit')) {
                el.classList.add('flash-hit');
                if (!el._flashHandler) {
                    el._flashHandler = function() {
                        el.classList.remove('flash-hit');
                        el.removeEventListener('animationend', el._flashHandler);
                        el._flashHandler = null;
                    };
                    el.addEventListener('animationend', el._flashHandler);
                }
            }
        } else {
            el.classList.remove('flash-hit');
            if (el._flashHandler) {
                el.removeEventListener('animationend', el._flashHandler);
                el._flashHandler = null;
            }
        }
        /* 冰冻 - 只在状态变化时操作classList，避免每帧无意义写入 */
        if (enemy.frozen) {
            if (!el.classList.contains('frozen-crystal')) { el.classList.add('frozen-crystal'); el.classList.add('frozen'); }
        } else {
            if (el.classList.contains('frozen-crystal')) { el.classList.remove('frozen-crystal'); el.classList.remove('frozen'); }
        }
        /* M-024: Stalker 冰冻时恢复完全不透明 */
        if (enemy.type === 'Stalker') {
            el.style.opacity = enemy.frozen ? '1' : '0.85';
        }
        /* Boss 暴怒 */
        if (enemy._bossEnraged) el.classList.add('boss-enraged');
        else el.classList.remove('boss-enraged');
        /* HP 条更新 */
        var fill = enemy._hpFill || el.querySelector('.enemy-hp-fill');
        if (fill) {
            if (!enemy._hpFill) enemy._hpFill = fill;
            /* R38-P2: 防止stale指针 — 检测el是否仍包含该节点 */
            if (fill.parentNode !== el) enemy._hpFill = null;
            var pct = (enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0) * 100;
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
    /* R188-P0: _achievementFlags已移除 — _checkAchievement直接写meta并持久化 */
    /* R30-M-010: _saveMetaToStorage 现在是 async，加 catch 防止静默失败 */
    window.saveManager._saveMetaToStorage().catch(function(e) {
        console.warn('[Achievement] saveMetaToStorage failed:', e);
    });
    var cfg = window.achievementConfig;
    /* R102-P1: null guard防止config未加载时崩溃 */
    if (!cfg || !cfg.length) return;
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
    /* R102-P1: 移除无效委托 — CombatSystem无spawnAchievementText方法 */
    if (this._combat && this._combat.spawnAchievementText) {
        return this._combat.spawnAchievementText(this, text);
    }
    var el = document.createElement('div');
    el.textContent = text;
    if (this.battlefield) { /* R219-P1: null guard 防止 battlefield 不存在时崩溃 */
        el.style.cssText = 'position:absolute;top:15%;left:50%;transform:translate(-50%,-50%);font-size:28px;font-weight:900;color:#ffd700;text-shadow:0 0 24px rgba(255,215,0,0.9),0 0 48px rgba(255,215,0,0.5);z-index:210;pointer-events:none;white-space:nowrap;animation:achievePop 2.5s ease-out forwards;';
        this.battlefield.appendChild(el);
        var self = this;
        setTimeout(function() { if (el.parentNode) el.remove(); }, Balance.TIMEOUT_FLICKER_REMOVE_MS);
    }
};

Gp._syncUI = function() {
    /* R38-P1: null guard \u9632\u6B62HUD\u5143\u7D20\u7F3A\u5931\u65F6\u62A5\u9519 */
    if (this.waveDisplay) this.waveDisplay.textContent = '\uD83C\uDF0A \u7b2c ' + (this._waveCount + 1) + ' \u6ce2';

    /* Epoch 46: \u6b7b\u4ea1\u65f6\u6e05\u7406\u6ce2\u6b21\u6a2a\u5e45 */
    if (this.waveMilestoneBanner) this.waveMilestoneBanner.classList.remove('visible');
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

    if (this.goldDisplay && this.player) this.goldDisplay.textContent = '\uD83D\uDCB0 ' + this.player.gold;
    if (this.atkDisplay && this.player) this.atkDisplay.textContent = '\u2694\uFE0F ' + this.player.atk;
    if (this.killsDisplay) this.killsDisplay.textContent = '\u2620\uFE0F ' + this.kills;
    if (this.timeDisplay) this.timeDisplay.textContent = '\u23F1 ' + this._formatTime(this._elapsed);

    /* \u6210\u5C31\uFF1A\u91D1\u5E01\u68C0\u6D4B */
    if (this.player && this.player.gold > (this._maxGoldThisRun || 0)) {
        this._maxGoldThisRun = this.player.gold;
        if (this._maxGoldThisRun >= 1000) this._checkAchievement('get_rich');
        if (this._maxGoldThisRun >= 10000) this._checkAchievement('gold_10k');
    }
    this._syncExpBar();
    this._syncWeaponSlotBar();

    /* ── 怒气条同步 ── */
    if (this.rageDisplay && this.player) {
        var ragePct = this.player.maxRage > 0 ? (this.player.rage / this.player.maxRage * 100) : 0;
        this.rageDisplay.style.width = Math.min(100, Math.max(0, ragePct)) + '%';
        /* 怒气全满 → 呼吸金光提示可触发 Overdrive（纯视觉 class 钩子，不影响逻辑） */
        if (this.rageContainer) this.rageContainer.classList.toggle('rage-full', ragePct >= 100);
        if (this.rageText) {
            /* R183-P0: Overdrive期间显示剩余时间而非怒气值 */
            if (this._overdriveActive) {
                this.rageText.textContent = 'Overdrive ' + this._overdriveTimer.toFixed(1) + 's';
            } else {
                this.rageText.textContent = '怒气 ' + this.player.rage + ' / ' + this.player.maxRage;
            }
        }
    }

    /* ── Boss Lord 血条同步 ── */
    if (this._bossLord && this._bossLord.alive && this.bossHpFill) {
        /* R183-P1: NaN防护 — maxHp为0或NaN时避免显示- Infinity% */
        var _maxHp = this._bossLord.maxHp || 1;
        var pct = Math.max(0, Math.min(100, (this._bossLord.hp / _maxHp) * 100));
        this.bossHpFill.style.width = pct + '%';
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


})();
