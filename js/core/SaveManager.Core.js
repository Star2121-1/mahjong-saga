/**
 * SaveManager.Core — 基础 meta/存档/json 读写
 * 挂载到 SaveManager.prototype / SaveManager 静态属性
 */
(function() {
    'use strict';

    /* ── 简易校验和 ── */

    SaveManager.prototype._computeChecksum = function(data) {
        /* P0 修复: 排除 _checksum 自身再序列化 — 原实现写入端不含该字段、
           读取端含该字段，哈希必然不一致 → 每次读档都误判损坏并回滚旧档 */
        var copy = {};
        for (var k in data) { if (Object.prototype.hasOwnProperty.call(data, k) && k !== '_checksum') copy[k] = data[k]; }
        var str = JSON.stringify(copy);
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var ch = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + ch;
            hash |= 0;
        }
        return 'c' + (hash >>> 0).toString(16);
    };

    /* ── 静默 localStorage 读写 ── */

    SaveManager.prototype._readJSON = function(fileName) {
        try {
            var raw = localStorage.getItem('cr_' + fileName);
            if (!raw) return null;
            /* 尝试解析 */
            var data = JSON.parse(raw);
            /* 校验和验证 */
            if (data && data._checksum) {
                var expected = this._computeChecksum(data);
                if (data._checksum !== expected) {
                    /* 校验和不匹配 → 数据可能损坏 */
                    if (window.toastSystem) window.toastSystem.warning('存档 "' + fileName + '" 校验失败，尝试恢复备份');
                    /* 尝试回滚 */
                    return this._rollbackBackup(fileName) || null;
                }
            }
            return data;
        } catch (e) {
            console.warn('SaveManager _readJSON error:', fileName, e);
            /* 解析失败 → 尝试恢复备份 */
            if (window.toastSystem) window.toastSystem.warning('存档 "' + fileName + '" 损坏，正在恢复...');
            return this._rollbackBackup(fileName) || null;
        }
    };

    /* 回滚备份：尝试 cr_<fileName>.bak */
    SaveManager.prototype._rollbackBackup = function(fileName) {
        try {
            var bak = localStorage.getItem('cr_' + fileName + '.bak');
            if (bak) {
                var data = JSON.parse(bak);
                if (data) {
                    /* P0: 验证备份checksum，防止回滚到损坏数据 */
                    var expected = this._computeChecksum(data);
                    if (data._checksum && data._checksum !== expected) {
                        console.warn('SaveManager backup checksum mismatch for', fileName, 'skipping rollback');
                        /* R164-P0: notify user when backup is also corrupt */
                        if (window.toastSystem) window.toastSystem.error('备份存档 "' + fileName + '" 也损坏，无法恢复');
                        return null;
                    }
                    /* 恢复备份到主文件 */
                    localStorage.setItem('cr_' + fileName, JSON.stringify(data));
                    if (window.toastSystem) window.toastSystem.success('已从备份恢复存档 "' + fileName + '"');
                    return data;
                }
            }
        } catch(e) { /* 备份也损坏，放弃 */ }
        return null;
    };

    SaveManager.prototype._writeJSON = function(fileName, data) {
        try {
            /* 备份当前文件（如果存在） */
            var current = localStorage.getItem('cr_' + fileName);
            if (current) {
                try {
                    var parsed = JSON.parse(current);
                    localStorage.setItem('cr_' + fileName + '.bak', current);
                } catch(e) { /* 当前文件已损坏，跳过备份 */ }
            }
            /* 写入校验和 — 浅拷贝避免污染传入的引用（如 _metaCache） */
            var payload = {};
            for (var _k in data) { if (Object.prototype.hasOwnProperty.call(data, _k)) payload[_k] = data[_k]; }
            payload._checksum = this._computeChecksum(payload);
            localStorage.setItem('cr_' + fileName, JSON.stringify(payload));
            return true;
        } catch (e) {
            /* Epoch 45: localStorage 满/写入失败 → Toast 警告 */
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                if (window.toastSystem) window.toastSystem.error('存储空间不足，存档失败！请清理浏览器数据。');
            } else {
                if (window.toastSystem) window.toastSystem.warning('存档异常: ' + e.message);
            }
            console.warn('SaveManager _writeJSON error:', fileName, e);
            return false;
        }
    };

    /* ── meta.json（永久进度） ── */

    SaveManager.prototype._getDefaultMeta = function() {
        return {
            metaTokens: 0, totalRuns: 0, totalKills: 0,
            currentHero: 'Hero', unlockedHeroes: ['Hero'],
            currentSelectedHero: 'Hero', lastSaveTimestamp: 0,
            lastHeroName: '雀（雀圣本尊）', lastLevelName: '试炼森林',
            techTree: { life_enhancement: 0, sharpening: 0, precision_training: 0 },
            bossCores: 0,
            talents: {
                hu_patro: 0, zimo_speed: 0, lian_magnet: 0, que_forge: 0,
                ting_intuition: 0, gang_hardiness: 0, mo_pa_cd: 0,
                kaiju_weapons: 0, he_resonance: 0, que_spirit_shield: 0
            },
            defaultWeapons: ['TrackingBlade'], equipments: [],
            equipped: { weapon: null, armor: null, talisman: null },
            highestEndlessLoop: 0,
            causalityFlags: { level1NoDamage: false, level2Overkill: false },
            unlockedMutations: [], activeMutations: [], hasSeenGuide: false,
            achievements: {}, flawlessRuns: 0,
            /* Epoch 3 */
            overdriveCount: 0, bossKills: 0, finalBossKills: 0,
            totalCrits: 0, totalDodges: 0, fullSetActivated: false,
            /* Epoch 14 */
            challenges: { active: [], completed: {}, lastRotation: 0 },
            runStats: null, purchasedPerks: {},
            /* Epoch 15 */
            loginStreak: 0, lastLoginDate: '', dailyRewardsClaimed: {},
            makeupTokens: 0, runHistory: [],
            /* Epoch 32 */
            compendium: { relics: [], weapons: [], enemies: [], equips: [], mutations: [], hupai: [] },
            discoveredSecrets: [],
            /* Epoch 36 */
            weeklyVault: { active: false, challenge: null, bet: 0, completed: false, reward: null, multiplier: 1 },
            /* Epoch 37: 赛季/声望/每日挑战默认值 */
            prestigeLevel: 0, prestigeCoresSpent: 0,
            season: { currentSeason: 0, startDate: 0, day: 1, claimedRewards: {} },
            dailyChallenges: { active: [], lastRotation: 0, completed: {} }
        };
    };

    SaveManager.prototype._migrateMeta = function(data) {
        var OLD_TO_NEW = {
            hero_swordsman: 'Knight', hero_colossus: 'Mage', hero_phantom: 'Assassin'
        };
        if (!data.unlockedHeroes) data.unlockedHeroes = ['Hero'];
        if (!data.currentHero) data.currentHero = 'Hero';
        if (data.currentSelectedHero && OLD_TO_NEW[data.currentSelectedHero]) {
            data.currentSelectedHero = OLD_TO_NEW[data.currentSelectedHero];
        }
        if (!data.currentSelectedHero) data.currentSelectedHero = data.currentHero || 'Hero';
        if (data.unlockedHeroes) {
            for (var _otn = 0; _otn < data.unlockedHeroes.length; _otn++) {
                if (OLD_TO_NEW[data.unlockedHeroes[_otn]]) {
                    data.unlockedHeroes[_otn] = OLD_TO_NEW[data.unlockedHeroes[_otn]];
                }
            }
        }
        if (data.currentHero && OLD_TO_NEW[data.currentHero]) {
            data.currentHero = OLD_TO_NEW[data.currentHero];
        }
        if (!data.currentHero) data.currentHero = 'Hero';
        if (!data.inflationGuard) data.inflationGuard = { totalMetaTokens: 0, lastReset: 0 };
        else {
            if (data.inflationGuard.totalMetaTokens == null) data.inflationGuard.totalMetaTokens = 0;
            if (data.inflationGuard.lastReset == null) data.inflationGuard.lastReset = 0;
        }
        if (data.metaTokens == null) data.metaTokens = 0;
        if (data.totalRuns == null) data.totalRuns = 0;
        if (data.totalKills == null) data.totalKills = 0;
        if (data.lastSaveTimestamp == null) data.lastSaveTimestamp = 0;
        if (!data.lastHeroName) data.lastHeroName = '雀（雀圣本尊）';
        if (!data.lastLevelName) data.lastLevelName = '试炼森林';
        if (!data.techTree) {
            data.techTree = { life_enhancement: 0, sharpening: 0, precision_training: 0 };
        } else {
            if (data.techTree.life_enhancement == null) data.techTree.life_enhancement = 0;
            if (data.techTree.sharpening == null) data.techTree.sharpening = 0;
            if (data.techTree.precision_training == null) data.techTree.precision_training = 0;
        }
        if (data.bossCores == null) data.bossCores = 0;
        if (!data.talents) {
            data.talents = {
                hu_patro: 0, zimo_speed: 0, lian_magnet: 0, que_forge: 0,
                ting_intuition: 0, gang_hardiness: 0, mo_pa_cd: 0,
                kaiju_weapons: 0, he_resonance: 0, que_spirit_shield: 0
            };
            /* Epoch 47: 天赋分支路径 */
            if (!data.talentBranchPaths) data.talentBranchPaths = {};
        } else {
            /* 旧天赋 ID → 新 ID 迁移映射 */
            var OLD_TO_NEW_TALENT = {
                health_boost: 'hu_patro',
                speed_boost: 'zimo_speed',
                magnet_boost: 'lian_magnet',
                weapon_forge: 'que_forge',
                listening_intuition: 'ting_intuition',
                gangpai_hardiness: 'gang_hardiness',
                '摸牌_speed': 'mo_pa_cd',
                starting_weapons: 'kaiju_weapons',
                core_resonance: 'he_resonance',
                '雀魂_shield': 'que_spirit_shield'
            };
            for (var oldKey in OLD_TO_NEW_TALENT) {
                var newKey = OLD_TO_NEW_TALENT[oldKey];
                if (data.talents[oldKey] != null && data.talents[newKey] == null) {
                    data.talents[newKey] = data.talents[oldKey];
                }
                delete data.talents[oldKey];
            }
            /* 确保所有新键存在 */
            if (data.talents.hu_patro == null) data.talents.hu_patro = 0;
            if (data.talents.zimo_speed == null) data.talents.zimo_speed = 0;
            if (data.talents.lian_magnet == null) data.talents.lian_magnet = 0;
            if (data.talents.que_forge == null) data.talents.que_forge = 0;
            if (data.talents.ting_intuition == null) data.talents.ting_intuition = 0;
            if (data.talents.gang_hardiness == null) data.talents.gang_hardiness = 0;
            if (data.talents.mo_pa_cd == null) data.talents.mo_pa_cd = 0;
            if (data.talents.kaiju_weapons == null) data.talents.kaiju_weapons = 0;
            if (data.talents.he_resonance == null) data.talents.he_resonance = 0;
            if (data.talents.que_spirit_shield == null) data.talents.que_spirit_shield = 0;
            /* Epoch 47: 天赋分支路径迁移 */
            if (!data.talentBranchPaths) data.talentBranchPaths = {};
        }
        if (!data.defaultWeapons) data.defaultWeapons = ['TrackingBlade'];
        if (!data.equipments) {
            data.equipments = [];
            var reg = window.equipmentRegistry;
            if (reg && typeof reg.createItem === 'function') {
                data.equipments.push(reg.createItem('v2_wpn_sword', 'rare'));
            }
        }
        if (!data.equipped) data.equipped = { weapon: null, armor: null, talisman: null };
        if (data.highestEndlessLoop == null) data.highestEndlessLoop = 0;
        if (!data.causalityFlags) data.causalityFlags = { level1NoDamage: false, level2Overkill: false };
        if (!data.unlockedMutations) data.unlockedMutations = [];
        if (!data.activeMutations) data.activeMutations = [];
        if (data.hasSeenGuide == null) data.hasSeenGuide = false;
        if (!data.achievements) data.achievements = {};
        if (data.flawlessRuns == null) data.flawlessRuns = 0;
        if (data.overdriveCount == null) data.overdriveCount = 0;
        if (data.bossKills == null) data.bossKills = 0;
        if (data.finalBossKills == null) data.finalBossKills = 0;
        if (data.totalCrits == null) data.totalCrits = 0;
        if (data.totalDodges == null) data.totalDodges = 0;
        if (data.fullSetActivated == null) data.fullSetActivated = false;
        if (!data.challenges) data.challenges = { active: [], completed: {}, lastRotation: 0 };
        if (data.challenges.active == null) data.challenges.active = [];
        if (data.challenges.completed == null) data.challenges.completed = {};
        if (data.challenges.lastRotation == null) data.challenges.lastRotation = 0;
        if (!data.purchasedPerks) data.purchasedPerks = {};
        if (data.loginStreak == null) data.loginStreak = 0;
        if (!data.lastLoginDate) data.lastLoginDate = '';
        if (!data.dailyRewardsClaimed) data.dailyRewardsClaimed = {};
        if (data.makeupTokens == null) data.makeupTokens = 0;
        if (!data.runHistory) data.runHistory = [];
        if (!data.compendium) data.compendium = { relics: [], weapons: [], enemies: [], equips: [], mutations: [], hupai: [] };
        if (!data.weeklyVault) data.weeklyVault = { active: false, challenge: null, bet: 0, completed: false, reward: null, multiplier: 1 };
        if (!data.discoveredSecrets) data.discoveredSecrets = [];
        /* Epoch 37: 赛季/声望/每日挑战迁移 */
        if (data.prestigeLevel == null) data.prestigeLevel = 0;
        if (data.prestigeCoresSpent == null) data.prestigeCoresSpent = 0;
        if (!data.season) data.season = { currentSeason: 0, startDate: 0, day: 1, claimedRewards: {} };
        else {
            if (data.season.currentSeason == null) data.season.currentSeason = 0;
            if (data.season.startDate == null) data.season.startDate = 0;
            if (data.season.day == null) data.season.day = 1;
            if (data.season.claimedRewards == null) data.season.claimedRewards = {};
        }
        if (!data.dailyChallenges) data.dailyChallenges = { active: [], lastRotation: 0, completed: {} };
        else {
            if (data.dailyChallenges.active == null) data.dailyChallenges.active = [];
            if (data.dailyChallenges.lastRotation == null) data.dailyChallenges.lastRotation = 0;
            if (data.dailyChallenges.completed == null) data.dailyChallenges.completed = {};
        }
    };

    SaveManager.prototype.getMeta = async function() {
        if (this._metaCache) return this._metaCache;
        var data = this._readJSON('meta.json');
        if (!data) {
            this._metaCache = this._getDefaultMeta();
        } else {
            this._migrateMeta(data);
            this._metaCache = data;
            /* Epoch 46: 成功加载 meta 后清理旧备份 */
            try { localStorage.removeItem('cr_meta.json.bak'); } catch(e) {}
            try { localStorage.removeItem('cr_active_run.json.bak'); } catch(e) {}
        }
        return this._metaCache;
    };

    SaveManager.prototype.saveMeta = function(data) {
        var self = this;
        this._metaCache = data;
        return new Promise(function(resolve) {
            var ok = self._writeJSON('meta.json', data);
            /* H-002: 写入失败时通知调用方 */
            if (!ok) {
                console.warn('SaveManager saveMeta failed — localStorage full or error');
                if (window.toastSystem) window.toastSystem.warning('存档保存失败，请检查存储空间');
            }
            resolve(ok);
        });
    };

    SaveManager.prototype._saveMetaToStorage = async function(metaOverride) {
        try {
            /* R152-P0: 传入meta快照，禁止并发竞态读写共享_metaCache */
            var payload = metaOverride !== undefined ? metaOverride : this._metaCache;
            if (!payload) return false;
            var ok = this._writeJSON('meta.json', payload);
            if (!ok) {
                console.warn('SaveManager _saveMetaToStorage via _writeJSON failed');
            }
            return ok;
        } catch (e) {
            console.warn('SaveManager _saveMetaToStorage error:', e);
            return false;
        }
    };

    /* ── active_run.json ── */

    SaveManager.prototype.hasActiveRun = async function() {
        var data = this._readJSON('active_run.json');
        return data && data.isRunActive === true;
    };

    SaveManager.prototype.loadActiveRun = async function() {
        return this._readJSON('active_run.json');
    };

    SaveManager.prototype.saveActiveRun = async function(snapshot) {
        snapshot.isRunActive = true;
        var ok = this._writeJSON('active_run.json', snapshot);
        if (!ok) { console.warn('SaveManager: saveActiveRun write failed (quota?)'); return false; }
        /* R165-P1: Only update meta timestamp on successful write — prevent phantom "last saved" after quota failure */
        var meta = await this.getMeta();
        meta.lastSaveTimestamp = snapshot.timestamp || Date.now();
        meta.lastHeroName = snapshot.heroName || '雀（雀圣本尊）';
        meta.lastLevelName = snapshot.levelName || '试炼森林';
        await this.saveMeta(meta);
    };

    SaveManager.prototype.clearActiveRun = async function() {
        this._writeJSON('active_run.json', {
            isRunActive: false, saveName: '', timestamp: Date.now(),
            dateString: this._formatDateString(new Date()),
            waveCount: 0, heroId: '', levelId: '', player: null, kills: 0, elapsed: 0
        });
        /* R187-P1: 更新lastSaveTimestamp，防止存档选择器显示过期时间 */
        var meta = await this.getMeta();
        meta.lastSaveTimestamp = Date.now();
        await this.saveMeta(meta);
    };

    SaveManager.prototype.hasContinueData = async function() {
        var active = await this.hasActiveRun();
        if (active) return true;
        var meta = await this.getMeta();
        return meta.totalRuns > 0 || meta.totalKills > 0 || meta.metaTokens > 0;
    };

    SaveManager.prototype.startNewRun = async function(heroId, levelId) {
        this._writeJSON('active_run.json', {
            isRunActive: true, timestamp: Date.now(),
            heroId: heroId, levelId: levelId, mode: 'new',
            player: null, kills: 0, elapsed: 0
        });
        /* R188-P1: 更新lastSaveTimestamp，防止存档选择器显示过期时间 */
        var meta = await this.getMeta();
        meta.lastSaveTimestamp = Date.now();
        await this.saveMeta(meta);
    };

    /* ── 快照/恢复 ── */

    SaveManager.prototype.snapshotForRun = function(engine) {
        /* R183-P0: 防御性null检查 — engine.player可能尚未初始化 */
        var heroId = (engine && engine.player) ? engine.player.heroId : null;
        var heroCfg = window.heroConfig[heroId];
        var levelCfg = window.levelConfig[engine ? engine._currentLevelId : ''];
        var now = new Date();
        return {
            saveName: 'save_' + this._formatTimestamp(now),
            timestamp: now.getTime(), dateString: this._formatDateString(now),
            heroName: heroCfg ? heroCfg.name : heroId,
            heroId: heroId,
            levelName: levelCfg ? levelCfg.name : engine._currentLevelId,
            levelId: engine._currentLevelId,
            waveCount: engine._waveCount, elapsed: engine._elapsed,
            kills: engine.kills, isRunActive: true,
            spawnInterval: engine._spawnInterval,
            difficultyTimer: engine._difficultyTimer,
            bossTimer: engine._bossTimer, spawnTimer: engine._spawnTimer,
            loopCount: engine.loopCount || 0,
            totalCritsThisRun: engine._totalCritsThisRun || 0,
            totalDodgesThisRun: engine._totalDodgesThisRun || 0,
            bossKillsThisRun: engine._bossKillsThisRun || 0,
            finalBossKillsThisRun: engine._finalBossKillsThisRun || 0,
            maxGoldThisRun: engine._maxGoldThisRun || 0,
            playerHitCountThisRun: engine._playerHitCountThisRun || 0,
            overdriveCount: engine._overdriveCount || 0,
            vaultMutations: engine._vaultMutations || [],
            gambleActive: engine._gambleActive || false,
            gambleType: engine._gambleType || null,
            gambleStaked: engine._gambleStaked || 0,
            shieldActive: engine._shieldActive || false,
            shieldTimer: engine._shieldTimer || 0,
            eliteModeActive: engine._eliteModeActive || false,
            eliteMultiplier: engine._eliteMultiplier || null,
            activeMutator: engine._activeMutator || null,
            tempEnemyAtkDebuff: engine._tempEnemyAtkDebuff !== undefined ? engine._tempEnemyAtkDebuff : null,
            tempEnemySpeedDebuff: engine._tempEnemySpeedDebuff !== undefined ? engine._tempEnemySpeedDebuff : null,
            godModeApplied: engine._godModeApplied || false,
            bloodRageActive: engine._bloodRageActive || false,
            currentWaveSpawnedCount: engine.currentWaveSpawnedCount || 0,
            abyssCoins: engine._abyssCoins || 0,
            abyssUnlockedCombos: engine._abyssUnlockedCombos || [],
            abyssActiveCombo: engine._abyssActiveCombo || null,
            handTiles: (engine._handTiles && engine._handTiles.length > 0) ? engine._handTiles.slice() : [],
            formedMelds: (engine._formedMelds && Object.keys(engine._formedMelds).length > 0) ? engine._formedMelds : {},
            jokersDropped: engine._jokersDropped || 0,
            mainSuit: engine._mainSuit || 'wan',
            player: engine.player.snapshot()
            /* R171-P1: 保存武器状态到快照，防止断点恢复后武器重置为默认 */
            , weapons: engine._activeWeapons ? engine._activeWeapons.map(function(w) {
                return {
                    id: w.id,
                    level: w.level,
                    cooldownTimer: w.cooldownTimer,
                    atkFactor: w.atkFactor,
                    baseCd: w._baseCd,
                    origBaseCd: w._origBaseCd,
                    cd: w.cd,
                    rawBaseCd: w._rawBaseCd
                };
            }) : []
        };
    };

    SaveManager.prototype.restoreRunToEngine = function(engine, data) {
        /* R164-P0: helper to reject negative values (|| 0 only guards falsy, not negatives) */
        function _posOrZero(v, def) { return (v != null && typeof v === 'number' && isFinite(v) && v >= 0) ? v : (def || 0); }
        engine._waveCount = _posOrZero(data.waveCount, 0);
        engine._elapsed = _posOrZero(data.elapsed, 0);
        engine.kills = _posOrZero(data.kills, 0);
        engine._spawnInterval = data.spawnInterval || 1.5;
        engine._difficultyTimer = data.difficultyTimer || 0;
        engine._bossTimer = data.bossTimer || 0;
        engine._spawnTimer = data.spawnTimer || 0;
        engine.loopCount = _posOrZero(data.loopCount, 0);
        engine._totalCritsThisRun = _posOrZero(data.totalCritsThisRun, 0);
        engine._totalDodgesThisRun = _posOrZero(data.totalDodgesThisRun, 0);
        engine._bossKillsThisRun = _posOrZero(data.bossKillsThisRun, 0);
        engine._finalBossKillsThisRun = _posOrZero(data.finalBossKillsThisRun, 0);
        engine._maxGoldThisRun = _posOrZero(data.maxGoldThisRun, 0);
        engine._playerHitCountThisRun = _posOrZero(data.playerHitCountThisRun, 0);
        engine._overdriveCount = _posOrZero(data.overdriveCount, 0);
        engine._vaultMutations = data.vaultMutations || [];
        engine._abyssCoins = _posOrZero(data.abyssCoins, 0);
        engine._abyssUnlockedCombos = data.abyssUnlockedCombos || [];
        engine._abyssActiveCombo = data.abyssActiveCombo || null;
        engine._gambleActive = data.gambleActive || false;
        engine._gambleType = data.gambleType || null;
        engine._gambleStaked = _posOrZero(data.gambleStaked, 0);
        engine._shieldActive = data.shieldActive || false;
        engine._shieldTimer = data.shieldTimer || 0;
        engine._eliteModeActive = data.eliteModeActive || false;
        engine._eliteMultiplier = data.eliteMultiplier || null;
        engine._activeMutator = data.activeMutator || null;
        engine._tempEnemyAtkDebuff = data.tempEnemyAtkDebuff !== null && data.tempEnemyAtkDebuff !== undefined ? data.tempEnemyAtkDebuff : 0;
        engine._tempEnemySpeedDebuff = data.tempEnemySpeedDebuff !== null && data.tempEnemySpeedDebuff !== undefined ? data.tempEnemySpeedDebuff : 0;
        engine._godModeApplied = data.godModeApplied || false;
        engine._bloodRageActive = data.bloodRageActive || false;
        engine.currentWaveSpawnedCount = _posOrZero(data.currentWaveSpawnedCount, 0);
        engine._handTiles = data.handTiles ? data.handTiles.slice() : [];
        engine._formedMelds = data.formedMelds || {};
        engine._jokersDropped = _posOrZero(data.jokersDropped, 0);
        engine._mainSuit = data.mainSuit || 'wan';
        var levelId = data.levelId || 'level_1';
        engine._currentLevelId = levelId;
        var levelCfg = window.levelConfig[levelId];
        if (levelCfg) { engine._mapW = levelCfg.mapW; engine._mapH = levelCfg.mapH; }
        /* R164-P0: reset engine fields not covered by snapshot to prevent stale state on resume */
        engine._overdriveActive = false;
        engine._overdriveTimer = 0;
        engine._totems = [];
        engine._bossLord = null;
        engine._bossLordWave = false;
        engine._bossLordSpawned = false;
        engine._monsterSurgeDoubleDrops = false;
        engine._pendingBossGamble = false;
        engine._gambleAbyssBonus = false;
        engine._witherTimer = 0;
        engine.player.restore(data.player);
        /* R30-H-022: 武器断点恢复（含降级保护，避免旧存档或加载顺序导致崩溃） */
        try {
            var _wData = data.weapons;
            if (_wData && _wData.length > 0) {
                engine._resetAllWeapons();
                var _wValidIds = (window.rewardManager && window.rewardManager.weaponInfos) ? Object.keys(window.rewardManager.weaponInfos) : ['TrackingBlade','OrbitShield','ShotgunBurst','GroundSlammer','LaserBeam','NovaPulse'];
                for (var _wi = 0; _wi < _wData.length; _wi++) {
                    var _wd = _wData[_wi];
                    if (!_wd || typeof _wd.id !== 'string') continue;
                    if (_wValidIds.indexOf(_wd.id) === -1) continue;
                    var _WCtor = window[_wd.id];
                    if (!_WCtor) continue;
                    var _wInst = new _WCtor(_wd.level || 1);
                    _wInst.cooldownTimer = _wd.cooldownTimer || 0;
                    if (_wd.atkFactor != null) _wInst.atkFactor = _wd.atkFactor;
                    if (_wd.baseCd != null) _wInst._baseCd = _wd.baseCd;
                    else if (_wInst._baseCd == null) _wInst._baseCd = _wInst.cd;
                    if (_wd.origBaseCd != null) _wInst._origBaseCd = _wd.origBaseCd;
                    else if (_wInst._origBaseCd == null) _wInst._origBaseCd = _wInst._baseCd || _wInst.cd;
                    if (_wd.cd != null) _wInst.cd = _wd.cd;
                    else if (_wInst.cd == null) _wInst.cd = _wInst._baseCd || _wInst.cd;
                    if (_wd.rawBaseCd != null) _wInst._rawBaseCd = _wd.rawBaseCd; /* R167-P0: 恢复原始基线CD，防止reset时回退到错误值 */
                    else if (_wInst._rawBaseCd == null) _wInst._rawBaseCd = _wInst._baseCd || _wInst.cd; /* R171-P1: 缺少rawBaseCd时初始化，防止undefined导致CD计算NaN */
                    engine._activeWeapons.push(_wInst);
                }
                if (engine._activeWeapons.length === 0) {
                    engine._resetAllWeapons();
                    if (typeof engine._initDefaultWeapons === 'function') engine._initDefaultWeapons();
                } else {
                    if (typeof engine._syncWeaponSlots === 'function') engine._syncWeaponSlots();
                    if (typeof engine._renderWeaponSlots === 'function') engine._renderWeaponSlots();
                    if (typeof engine._checkWeaponSynergies === 'function') engine._checkWeaponSynergies();
                }
            }
        } catch (_wErr) {
            console.warn('[Save] 武器断点恢复失败:', _wErr);
        }
    };

    /* ── 格式化 ── */

    SaveManager.prototype._formatTimestamp = function(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        var h = String(date.getHours()).padStart(2, '0');
        var mi = String(date.getMinutes()).padStart(2, '0');
        var s = String(date.getSeconds()).padStart(2, '0');
        return y + m + d + '_' + h + mi + s;
    };

    SaveManager.prototype._formatDateString = function(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        var h = String(date.getHours()).padStart(2, '0');
        var mi = String(date.getMinutes()).padStart(2, '0');
        var s = String(date.getSeconds()).padStart(2, '0');
        return y + '-' + m + '-' + d + ' ' + h + ':' + mi + ':' + s;
    };

    /* ── 导出/导入存档 ── */

    SaveManager.prototype.exportSave = function() {
        try {
            var metaData = this._readJSON('meta.json');
            var activeRunData = this._readJSON('active_run.json');
            var blob = new Blob([JSON.stringify({ meta: metaData, activeRun: activeRunData }, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = 'click_roguelike_save.json';
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
            return { success: true };
        } catch (e) {
            return { success: false, error: (e && (e.message || String(e))) || '未知错误' };
        }
    };

    SaveManager.prototype.importSaveFile = async function() {
        try {
            var text = await new Promise(function(resolve, reject) {
                var input = document.createElement('input');
                input.type = 'file'; input.accept = '.json';
                input.addEventListener('change', function() {
                    var file = input.files[0];
                    if (!file) { reject(new Error('未选择文件')); return; }
                    var reader = new FileReader();
                    reader.onload = function() { resolve(reader.result); };
                    reader.onerror = function() { reject(new Error('文件读取失败')); };
                    reader.readAsText(file);
                });
                input.click();
            });
            text = text.replace(/^﻿/, '');
            var data = JSON.parse(text);
            if (!this._validateImportData(data)) {
                return { success: false, error: '存档格式不合法，拒绝导入' };
            }
            /* R183-P0: 移除重复写入 — 第一次写入后直接检查返回值，不再第二次写入 */
            var metaWriteOk = this._writeJSON('meta.json', data.meta);
            var metaOk = this._writeJSON('active_run.json', data.activeRun);
            this._metaCache = null;
            /* R30-H-003: 导入成功后清除 .bak 防止回滚到旧数据 */
            try { localStorage.removeItem('cr_meta.json.bak'); } catch(e) {}
            try { localStorage.removeItem('cr_active_run.json.bak'); } catch(e) {}
            return { success: metaWriteOk && metaOk }; /* R136-P0: 传播_writeJSON返回值 */
        } catch (e) {
            return { success: false, error: (e && (e.message || String(e))) || '未知错误' };
        }
    };

    SaveManager.prototype._validateImportData = function(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
        /* null 不是 object — typeof null === 'object' 是 JS 陷阱 */
        if (data.meta === null || typeof data.meta !== 'object' || Array.isArray(data.meta)) return false;
        var _mt = data.meta.metaTokens;
        if (_mt == null) _mt = 0; /* R135-P0: 兼容无metaTokens字段的旧存档，防止typeof undefined==='undefined'拒绝导入 */
        if (typeof _mt !== 'number' || !Number.isFinite(_mt) || _mt < 0) return false;
        /* R117-P0: 校验所有核心数值字段防止Infinity注入 */
        var _numFields = ['totalRuns','totalKills','bossCores','prestigeLevel','prestigeCoresSpent',
            'flawlessRuns','overdriveCount','bossKills','finalBossKills','totalCrits','totalDodges',
            'highestEndlessLoop'];
        for (var _nf = 0; _nf < _numFields.length; _nf++) {
            var _nv = data.meta[_numFields[_nf]];
            if (_nv != null && (typeof _nv !== 'number' || !Number.isFinite(_nv) || _nv < 0)) return false;
        }
        if (!data.meta.techTree || typeof data.meta.techTree !== 'object') return false;
        /* H-034: 深度验证 talents 子字段防止 Infinity/超大数组注入 */
        if (data.meta.talents) {
            if (typeof data.meta.talents !== 'object' || Array.isArray(data.meta.talents)) return false;
            var talentKeys = Object.keys(data.meta.talents);
            if (talentKeys.length > 50) return false; /* 防数组膨胀 */
            for (var tk = 0; tk < talentKeys.length; tk++) {
                var tv = data.meta.talents[talentKeys[tk]];
                if (typeof tv !== 'number' || !Number.isFinite(tv) || tv < 0) return false;
                if (tv > 1000) return false; /* 防异常大值 */
            }
        }
        /* 深度验证 equipments 防止原型链污染/超大数组 */
        if (data.meta.equipments) {
            if (!Array.isArray(data.meta.equipments)) return false;
            if (data.meta.equipments.length > 500) return false;
            /* R32-E-003: 单条装备结构验证，防止损坏数据导致UI崩溃 */
            var _validQ = ['rare', 'epic', 'legendary'];
            var _validS = ['weapon', 'armor', 'talisman'];
            for (var _eqi = 0; _eqi < data.meta.equipments.length; _eqi++) {
                var _eq = data.meta.equipments[_eqi];
                if (typeof _eq !== 'object' || Array.isArray(_eq)) return false;
                if (typeof _eq.instanceId !== 'string' || !_eq.instanceId) return false;
                if (!_eq.protoId) return false;
                if (_validQ.indexOf(_eq.quality) === -1) return false;
                if (_validS.indexOf(_eq.slot) === -1) return false;
                if (_eq.affixes && !Array.isArray(_eq.affixes)) return false;
                /* R117-P0: 校验装备词条防止畸形数据注入 */
                if (_eq.affixes) {
                    if (_eq.affixes.length > 20) return false;
                    for (var _afi = 0; _afi < _eq.affixes.length; _afi++) {
                        var _a = _eq.affixes[_afi];
                        if (typeof _a !== 'object' || _a === null || Array.isArray(_a)) return false;
                        if (typeof _a.name !== 'string' || !_a.name) return false;
                        if (typeof _a.val !== 'number' || !Number.isFinite(_a.val)) return false;
                    }
                }
            }
        }
        if (data.activeRun === null || typeof data.activeRun !== 'object' || Array.isArray(data.activeRun)) return false;
        if (typeof data.activeRun.isRunActive !== 'boolean') return false;
        var validWeapons = (window.rewardManager && window.rewardManager.weaponInfos) ? Object.keys(window.rewardManager.weaponInfos) : ['TrackingBlade','OrbitShield','ShotgunBurst','GroundSlammer','LaserBeam','NovaPulse'];
        if (data.meta.defaultWeapons) {
            if (!Array.isArray(data.meta.defaultWeapons) || data.meta.defaultWeapons.length < 1) return false;
            if (data.meta.defaultWeapons.length > 10) return false;
            for (var wi = 0; wi < data.meta.defaultWeapons.length; wi++) {
                if (validWeapons.indexOf(data.meta.defaultWeapons[wi]) === -1) return false;
            }
        }
        if (data.activeRun.weapons) {
            if (!Array.isArray(data.activeRun.weapons)) return false;
            if (data.activeRun.weapons.length > 20) return false;
            for (var awi = 0; awi < data.activeRun.weapons.length; awi++) {
                if (typeof data.activeRun.weapons[awi] !== 'object' || !data.activeRun.weapons[awi].id) return false;
                if (validWeapons.indexOf(data.activeRun.weapons[awi].id) === -1) return false;
            }
        }
        /* R164-P0: validate activeRun.player numeric fields to prevent crafted imports from setting negative HP / Infinity ATK */
        if (data.activeRun.player) {
            var _p = data.activeRun.player;
            var _pNumFields = ['hp','maxHp','atk','speed','baseSpeed','gold','critRate',
                'dodgeRate','lifestealRate','explosionChance','freezeChance','thornsRate',
                'rage','maxRage','cdFloor','xpGainFactor','speedMultiplier','damageReduction'];
            for (var _pn = 0; _pn < _pNumFields.length; _pn++) {
                var _pv = _p[_pNumFields[_pn]];
                if (_pv != null && (typeof _pv !== 'number' || !Number.isFinite(_pv))) return false;
            }
            if (_p.hp != null && _p.hp < 0) return false;
            if (_p.maxHp != null && _p.maxHp <= 0) return false;
            if (_p.atk != null && _p.atk < 0) return false;
        }
        return true;
    };

    /* ── 完全重置 ── */

    SaveManager.prototype.resetAllData = async function() {
        var defaults = this._getDefaultMeta();
        var ok = this._writeJSON('meta.json', defaults);
        this._writeJSON('active_run.json', {
            isRunActive: false, saveName: '', timestamp: Date.now(),
            dateString: this._formatDateString(new Date()),
            waveCount: 0, heroId: '', levelId: '', player: null, kills: 0, elapsed: 0
        });
        if (!ok) return false; /* R136-P0: localStorage写入失败时返回false，防止调用方静默继续 */
        this._metaCache = defaults;
        /* R128-P0: 清理 .bak 防止重置后旧备份回滚覆盖新数据 */
        try { localStorage.removeItem('cr_meta.json.bak'); } catch(e) {}
        try { localStorage.removeItem('cr_active_run.json.bak'); } catch(e) {}
    };

})();
