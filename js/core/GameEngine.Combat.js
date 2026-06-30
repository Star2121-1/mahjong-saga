(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

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

    /* 启动下一波 */
    this._beginLoop();
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
    this._spawnInterval = this._spawnInterval; /* keep current level config */
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
            uniqueRelics: (function(){ var p=this.player&&this.player.relicLevels||{}; return Object.keys(p).filter(function(k){return(p[k]||0)>0;}).length; }).call(this),
            bossKills: this._bossKillsThisRun || 0,
            abyssDepth: this.loopCount || 0,
            dodges: this._totalDodgesThisRun || 0,
            crits: this._totalCritsThisRun || 0,
            waves: this._waveCount || 0,
            hitsTaken: this._playerHitCountThisRun || 0,
            won: true
        };
        var vaultResult = window.saveManager.evaluateWeeklyVault(runStats);
        if (vaultResult.evaluated && vaultResult.completed) {
            console.log('[Vault] 金库挑战完成:', vaultResult.reward);
        }
    }

    await window.saveManager.saveMeta(meta);
    await window.saveManager.clearActiveRun();

    /* Epoch 14: 运行统计记录 */
    try {
        var pR = this.player && this.player.relicLevels || {};
        var ur = Object.keys(pR).filter(function(k) { return (pR[k] || 0) > 0; }).length;
        if (typeof window.saveManager.recordRunStats === 'function') {
            window.saveManager.recordRunStats(this.kills, this._elapsed, this._maxGoldThisRun || 0, this._overdriveCount || 0, this._totalDodgesThisRun || 0, this._totalCritsThisRun || 0, this._waveCount, this._bossKillsThisRun || 0, this.loopCount || 0, true, this._playerHitCountThisRun || 0, ur);
        }
    } catch(e) { console.warn('[GameEngine] error:', e); }

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
    var pR3 = this.player && this.player.relicLevels || {};
    var uniqueRelics = Object.keys(pR3).filter(function(k) { return (pR3[k] || 0) > 0; }).length;
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
    var pRelics = this.player && this.player.relicLevels || {};
    var uniqueRelics = Object.keys(pRelics).filter(function(k) { return (pRelics[k] || 0) > 0; }).length;
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
        var pR2 = this.player && this.player.relicLevels || {};
        var ur = Object.keys(pR2).filter(function(k) { return (pR2[k] || 0) > 0; }).length;
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
    /* 不要用 textContent 覆盖子元素 — 用 ::before 伪元素显示"雀"字 */
    this.playerEl.style.setProperty('--tile-char', '"雀"');
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

    /* ── Step A: 受击平滑闪烁 — 指数衰减曲线替代硬 toggle ── */
    if (this.player.invulnTimer > 0) {
        /* 总持续时间上限 300ms，alpha 从 0.4 指数衰减到 0 */
        var t = 1 - Math.min(this.player.invulnTimer / 0.3, 1); /* 0→1 进度 */
        var alpha = 0.4 * Math.exp(-t * 4); /* 指数衰减 */
        this.playerEl.style.opacity = (1 - alpha).toFixed(3);
        this.playerEl.style.filter = 'drop-shadow(0 0 ' + (8 * (1 - alpha)).toFixed(1) + 'px rgba(182,41,41,0.8))';
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
        /* 受击闪烁效果 */
        if (flash) {
            el.classList.add('flash-hit');
            setTimeout(function(e){ setTimeout(function(){ e.classList.remove('flash-hit'); }, 100); }, 0, el);
        } else {
            el.classList.remove('flash-hit');
        }
        /* 冰冻 */
        el.classList.toggle('frozen-crystal', enemy.frozen);
        /* Boss 暴怒 */
        if (enemy._bossEnraged) el.classList.add('boss-enraged');
        else el.classList.remove('boss-enraged');
        /* HP 条更新 */
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


})();
