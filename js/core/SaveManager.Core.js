/**
 * SaveManager.Core — 基础 meta/存档/json 读写
 * 挂载到 SaveManager.prototype / SaveManager 静态属性
 */
(function() {
    'use strict';

    /* ── 静默 localStorage 读写 ── */

    SaveManager.prototype._readJSON = function(fileName) {
        try {
            var raw = localStorage.getItem('cr_' + fileName);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn('SaveManager _readJSON error:', fileName, e);
            return null;
        }
    };

    SaveManager.prototype._writeJSON = function(fileName, data) {
        try {
            localStorage.setItem('cr_' + fileName, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('SaveManager _writeJSON error:', fileName, e);
            return false;
        }
    };

    /* ── meta.json（永久进度） ── */

    SaveManager.prototype._getDefaultMeta = function() {
        return {
            metaTokens: 0, totalRuns: 0, totalKills: 0,
            currentHero: 'Knight', unlockedHeroes: ['Knight'],
            currentSelectedHero: 'Knight', lastSaveTimestamp: 0,
            lastHeroName: '光刃行者', lastLevelName: '试炼森林',
            techTree: { life_enhancement: 0, sharpening: 0, precision_training: 0 },
            bossCores: 0,
            talents: {
                health_boost: 0, speed_boost: 0, magnet_boost: 0, weapon_forge: 0,
                listening_intuition: 0, gangpai_hardiness: 0, 摸牌_speed: 0,
                starting_weapons: 0, core_resonance: 0, 雀魂_shield: 0
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
            compendium: { relics: [], weapons: [], enemies: [], equips: [], mutations: [] },
            discoveredSecrets: [],
            /* Epoch 36 */
            weeklyVault: { active: false, challenge: null, bet: 0, completed: false, reward: null }
        };
    };

    SaveManager.prototype._migrateMeta = function(data) {
        var OLD_TO_NEW = {
            hero_swordsman: 'Knight', hero_colossus: 'Mage', hero_phantom: 'Assassin'
        };
        if (!data.unlockedHeroes) data.unlockedHeroes = ['Knight'];
        if (!data.currentHero) data.currentHero = 'Knight';
        if (data.currentSelectedHero && OLD_TO_NEW[data.currentSelectedHero]) {
            data.currentSelectedHero = OLD_TO_NEW[data.currentSelectedHero];
        }
        if (!data.currentSelectedHero) data.currentSelectedHero = data.currentHero || 'Knight';
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
        if (!data.currentHero) data.currentHero = 'Knight';
        if (!data.inflationGuard) data.inflationGuard = { totalMetaTokens: 0, lastReset: 0 };
        if (data.metaTokens == null) data.metaTokens = 0;
        if (data.totalRuns == null) data.totalRuns = 0;
        if (data.totalKills == null) data.totalKills = 0;
        if (data.lastSaveTimestamp == null) data.lastSaveTimestamp = 0;
        if (!data.lastHeroName) data.lastHeroName = '光刃行者';
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
            data.talents = { health_boost: 0, speed_boost: 0, magnet_boost: 0, weapon_forge: 0 };
        } else {
            if (data.talents.health_boost == null) data.talents.health_boost = 0;
            if (data.talents.speed_boost == null) data.talents.speed_boost = 0;
            if (data.talents.magnet_boost == null) data.talents.magnet_boost = 0;
            if (data.talents.weapon_forge == null) data.talents.weapon_forge = 0;
            if (data.talents.listening_intuition == null) data.talents.listening_intuition = 0;
            if (data.talents.gangpai_hardiness == null) data.talents.gangpai_hardiness = 0;
            if (data.talents.摸牌_speed == null) data.talents.摸牌_speed = 0;
            if (data.talents.starting_weapons == null) data.talents.starting_weapons = 0;
            if (data.talents.core_resonance == null) data.talents.core_resonance = 0;
            if (data.talents.雀魂_shield == null) data.talents.雀魂_shield = 0;
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
        if (!data.purchasedPerks) data.purchasedPerks = {};
        if (data.loginStreak == null) data.loginStreak = 0;
        if (!data.lastLoginDate) data.lastLoginDate = '';
        if (!data.dailyRewardsClaimed) data.dailyRewardsClaimed = {};
        if (data.makeupTokens == null) data.makeupTokens = 0;
        if (!data.runHistory) data.runHistory = [];
        if (!data.compendium) data.compendium = { relics: [], weapons: [], enemies: [], equips: [], mutations: [] };
        if (!data.weeklyVault) data.weeklyVault = { active: false, challenge: null, bet: 0, completed: false, reward: null };
        if (!data.discoveredSecrets) data.discoveredSecrets = [];
    };

    SaveManager.prototype.getMeta = async function() {
        if (this._metaCache) return this._metaCache;
        var data = this._readJSON('meta.json');
        if (!data) {
            this._metaCache = this._getDefaultMeta();
        } else {
            this._migrateMeta(data);
            this._metaCache = data;
        }
        return this._metaCache;
    };

    SaveManager.prototype.saveMeta = function(data) {
        this._metaCache = data;
        return this._writeJSON('meta.json', data);
    };

    SaveManager.prototype._saveMetaToStorage = async function() {
        try {
            localStorage.setItem('cr_meta.json', JSON.stringify(this._metaCache));
        } catch (e) {
            console.warn('SaveManager _saveMetaToStorage error:', e);
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
        this._writeJSON('active_run.json', snapshot);
        var meta = await this.getMeta();
        meta.lastSaveTimestamp = snapshot.timestamp || Date.now();
        meta.lastHeroName = snapshot.heroName || '光刃行者';
        meta.lastLevelName = snapshot.levelName || '试炼森林';
        await this.saveMeta(meta);
    };

    SaveManager.prototype.clearActiveRun = async function() {
        this._writeJSON('active_run.json', {
            isRunActive: false, saveName: '', timestamp: Date.now(),
            dateString: this._formatDateString(new Date()),
            waveCount: 0, heroId: '', levelId: '', player: null, kills: 0, elapsed: 0
        });
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
    };

    /* ── 快照/恢复 ── */

    SaveManager.prototype.snapshotForRun = function(engine) {
        var heroCfg = window.heroConfig[engine.player.heroId];
        var levelCfg = window.levelConfig[engine._currentLevelId];
        var now = new Date();
        return {
            saveName: 'save_' + this._formatTimestamp(now),
            timestamp: now.getTime(), dateString: this._formatDateString(now),
            heroName: heroCfg ? heroCfg.name : engine.player.heroId,
            heroId: engine.player.heroId,
            levelName: levelCfg ? levelCfg.name : engine._currentLevelId,
            levelId: engine._currentLevelId,
            waveCount: engine._waveCount, elapsed: engine._elapsed,
            kills: engine.kills, isRunActive: true,
            spawnInterval: engine._spawnInterval,
            difficultyTimer: engine._difficultyTimer,
            bossTimer: engine._bossTimer, spawnTimer: engine._spawnTimer,
            player: engine.player.snapshot()
        };
    };

    SaveManager.prototype.restoreRunToEngine = function(engine, data) {
        engine._waveCount = data.waveCount || 0;
        engine._elapsed = data.elapsed || 0;
        engine.kills = data.kills || 0;
        engine._spawnInterval = data.spawnInterval || 1.5;
        engine._difficultyTimer = data.difficultyTimer || 0;
        engine._bossTimer = data.bossTimer || 0;
        engine._spawnTimer = data.spawnTimer || 0;
        var levelId = data.levelId || 'level_1';
        engine._currentLevelId = levelId;
        var levelCfg = window.levelConfig[levelId];
        if (levelCfg) { engine._mapW = levelCfg.mapW; engine._mapH = levelCfg.mapH; }
        engine.player.restore(data.player);
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
            return { success: false, error: (e && e.message) || '未知错误' };
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
            var data = JSON.parse(text);
            if (!this._validateImportData(data)) {
                return { success: false, error: '存档格式不合法，拒绝导入' };
            }
            this._writeJSON('meta.json', data.meta);
            this._writeJSON('active_run.json', data.activeRun);
            this._metaCache = null;
            return { success: true };
        } catch (e) {
            return { success: false, error: (e && e.message) || '未知错误' };
        }
    };

    SaveManager.prototype._validateImportData = function(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
        if (!data.meta || typeof data.meta !== 'object') return false;
        if (typeof data.meta.metaTokens !== 'number' || !Number.isFinite(data.meta.metaTokens) || data.meta.metaTokens < 0) return false;
        if (!data.meta.techTree || typeof data.meta.techTree !== 'object') return false;
        if (!data.activeRun || typeof data.activeRun !== 'object') return false;
        if (typeof data.activeRun.isRunActive !== 'boolean') return false;
        var validWeapons = ['TrackingBlade','OrbitShield','ShotgunBurst','GroundSlammer','LaserBeam','NovaPulse'];
        if (data.meta.defaultWeapons) {
            if (!Array.isArray(data.meta.defaultWeapons) || data.meta.defaultWeapons.length < 1) return false;
            for (var wi = 0; wi < data.meta.defaultWeapons.length; wi++) {
                if (validWeapons.indexOf(data.meta.defaultWeapons[wi]) === -1) return false;
            }
        }
        if (data.activeRun.weapons) {
            if (!Array.isArray(data.activeRun.weapons)) return false;
            for (var awi = 0; awi < data.activeRun.weapons.length; awi++) {
                if (validWeapons.indexOf(data.activeRun.weapons[awi].id) === -1) return false;
            }
        }
        return true;
    };

    /* ── 完全重置 ── */

    SaveManager.prototype.resetAllData = async function() {
        var defaults = this._getDefaultMeta();
        this._writeJSON('meta.json', defaults);
        this._writeJSON('active_run.json', {
            isRunActive: false, saveName: '', timestamp: Date.now(),
            dateString: this._formatDateString(new Date()),
            waveCount: 0, heroId: '', levelId: '', player: null, kills: 0, elapsed: 0
        });
        this._metaCache = defaults;
    };

})();
