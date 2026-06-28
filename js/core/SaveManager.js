class SaveManager {
    static CHALLENGE_POOL = [
        { id: 'kill_50', name: '初露锋芒', desc: '单局击杀 50 个敌人', reward: { metaTokens: 30 }, check: function(stats) { return stats.kills >= 50; } },
        { id: 'kill_100', name: '百人斩', desc: '单局击杀 100 个敌人', reward: { metaTokens: 60 }, check: function(stats) { return stats.kills >= 100; } },
        { id: 'overdrive_3', name: '怒意沸腾', desc: '单局触发 3 次 Overdrive', reward: { bossCores: 1 }, check: function(stats) { return stats.overdriveCount >= 3; } },
        { id: 'overdrive_10', name: '狂怒不息', desc: '单局触发 10 次 Overdrive', reward: { bossCores: 3 }, check: function(stats) { return stats.overdriveCount >= 10; } },
        { id: 'survive_300', name: '久经沙场', desc: '单局存活 5 分钟', reward: { metaTokens: 40 }, check: function(stats) { return stats.elapsed >= 300; } },
        { id: 'survive_600', name: '百战不殆', desc: '单局存活 10 分钟', reward: { metaTokens: 80 }, check: function(stats) { return stats.elapsed >= 600; } },
        { id: 'gold_500', name: '财源广进', desc: '单局获取 500 金币', reward: { metaTokens: 25 }, check: function(stats) { return stats.maxGold >= 500; } },
        { id: 'gold_1000', name: '金玉满堂', desc: '单局获取 1000 金币', reward: { metaTokens: 50 }, check: function(stats) { return stats.maxGold >= 1000; } },
        { id: 'no_damage', name: '毫发无伤', desc: '单局 0 受击通关', reward: { bossCores: 2 }, check: function(stats) { return stats.hitsTaken === 0 && stats.won; } },
        { id: 'relics_10', name: '博采众长', desc: '单局收集 10 种不同圣物', reward: { metaTokens: 35 }, check: function(stats) { return stats.uniqueRelics >= 10; } },
        { id: 'boss_lord_kill', name: '斩首行动', desc: '击杀 Boss Lord', reward: { metaTokens: 20 }, check: function(stats) { return stats.bossKills >= 1; } },
        { id: 'abyss_5', name: '深渊行者', desc: '抵达深渊第 5 层', reward: { bossCores: 2 }, check: function(stats) { return stats.abyssDepth >= 5; } },
        { id: 'dodge_20', name: '幻影身法', desc: '单局闪避 20 次', reward: { metaTokens: 30 }, check: function(stats) { return stats.dodges >= 20; } },
        { id: 'crit_30', name: '致命一击', desc: '单局暴击 30 次', reward: { metaTokens: 25 }, check: function(stats) { return stats.crits >= 30; } },
        { id: 'wave_15', name: 'waves 不息', desc: '单局完成 15 波', reward: { metaTokens: 45 }, check: function(stats) { return stats.waves >= 15; } }
    ];

    constructor() {
        this._metaCache = null;
    }

    async init() {
        if (this._metaCache) return;
        await this.getMeta();
    }

    /* ── 静默 localStorage 读写 ── */

    _readJSON(fileName) {
        try {
            const raw = localStorage.getItem('cr_' + fileName);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn('SaveManager _readJSON error:', fileName, e);
            return null;
        }
    }

    _writeJSON(fileName, data) {
        try {
            localStorage.setItem('cr_' + fileName, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('SaveManager _writeJSON error:', fileName, e);
            return false;
        }
    }

    /* ── meta.json（永久进度） ── */

    async getMeta() {
        if (this._metaCache) return this._metaCache;
        const data = this._readJSON('meta.json');
        if (!data) {
            this._metaCache = {
                metaTokens: 0,
                totalRuns: 0,
                totalKills: 0,
                currentHero: 'Knight',
                unlockedHeroes: ['Knight'],
                currentSelectedHero: 'Knight',
                lastSaveTimestamp: 0,
                lastHeroName: '光刃行者',
                lastLevelName: '试炼森林',
                techTree: {
                    life_enhancement: 0,
                    sharpening: 0,
                    precision_training: 0
                },
                bossCores: 0,
                talents: {
                    health_boost: 0,
                    speed_boost: 0,
                    magnet_boost: 0,
                    weapon_forge: 0,
                    /* Epoch 2 新增天赋 */
                    listening_intuition: 0,
                    gangpai_hardiness: 0,
                   摸牌_speed: 0,
                    starting_weapons: 0,
                    core_resonance: 0,
                   雀魂_shield: 0
                },
                defaultWeapons: ['TrackingBlade'],
                equipments: [],
                equipped: { weapon: null, armor: null, talisman: null },
                highestEndlessLoop: 0,
                causalityFlags: { level1NoDamage: false, level2Overkill: false },
                unlockedMutations: [],
                activeMutations: [],
                hasSeenGuide: false,
                achievements: {},
                flawlessRuns: 0,
                /* Epoch 3 成就追踪 */
                overdriveCount: 0,
                bossKills: 0,
                finalBossKills: 0,
                totalCrits: 0,
                totalDodges: 0,
                fullSetActivated: false,
                /* Epoch 14: 挑战系统 + 运行统计 + 元货币消费 */
                challenges: { active: [], completed: {}, lastRotation: 0 },
                runStats: null,
                purchasedPerks: {},
                /* Epoch 15: 每日登录 */
                loginStreak: 0,
                lastLoginDate: '',
                dailyRewardsClaimed: {},
                makeupTokens: 0,
                runHistory: [],
                /* Epoch 32: 图鉴系统 */
                compendium: { relics: [], weapons: [], enemies: [], equips: [], mutations: [] },
                /* 秘密发现 */
                discoveredSecrets: [],
                /* Epoch 36: 每周金库 */
                weeklyVault: { active: false, challenge: null, bet: 0, completed: false, reward: null }
            };
        } else {
            if (!data.unlockedHeroes) data.unlockedHeroes = ['Knight'];
            if (!data.currentHero) data.currentHero = 'Knight';
            var OLD_TO_NEW = { hero_swordsman: 'Knight', hero_colossus: 'Mage', hero_phantom: 'Assassin' };
            if (!data.currentSelectedHero || OLD_TO_NEW[data.currentSelectedHero]) {
                data.currentSelectedHero = data.currentHero || 'Knight';
            }
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
                /* Epoch 2 新天赋迁移 */
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
            /* Epoch 3 成就迁移 */
            if (data.overdriveCount == null) data.overdriveCount = 0;
            if (data.bossKills == null) data.bossKills = 0;
            if (data.finalBossKills == null) data.finalBossKills = 0;
            if (data.totalCrits == null) data.totalCrits = 0;
            if (data.totalDodges == null) data.totalDodges = 0;
            if (data.fullSetActivated == null) data.fullSetActivated = false;
            /* Epoch 14 迁移 */
            if (!data.challenges) data.challenges = { active: [], completed: {}, lastRotation: 0 };
            if (data.runStats == null) data.runStats = null;
            if (!data.purchasedPerks) data.purchasedPerks = {};
            /* Epoch 15 迁移 */
            if (data.loginStreak == null) data.loginStreak = 0;
            if (!data.lastLoginDate) data.lastLoginDate = '';
            if (!data.dailyRewardsClaimed) data.dailyRewardsClaimed = {};
            if (data.makeupTokens == null) data.makeupTokens = 0;
            if (!data.runHistory) data.runHistory = [];
            if (!data.compendium) data.compendium = { relics: [], weapons: [], enemies: [], equips: [], mutations: [] };
            /* Epoch 36: 每周金库迁移 */
            if (!data.weeklyVault) data.weeklyVault = { active: false, challenge: null, bet: 0, completed: false, reward: null };
            /* 秘密发现迁移 */
            if (!data.discoveredSecrets) data.discoveredSecrets = [];
            this._metaCache = data;
        }
        return this._metaCache;
    }

    async saveMeta(data) {
        this._metaCache = data;
        return this._writeJSON('meta.json', data);
    }

    getTechTree() {
        const meta = this._metaCache || {};
        return meta.techTree || { life_enhancement: 0, sharpening: 0, precision_training: 0 };
    }

    async upgradeTech(techId) {
        const meta = await this.getMeta();
        if (!meta.techTree) meta.techTree = { life_enhancement: 0, sharpening: 0, precision_training: 0 };
        const currentLevel = meta.techTree[techId] || 0;
        if (currentLevel >= 20) return false;
        const cost = this._techCost(techId, currentLevel);
        if ((meta.metaTokens || 0) >= cost) {
            meta.metaTokens -= cost;
            meta.techTree[techId] = currentLevel + 1;
            await this.saveMeta(meta);
            return true;
        }
        return false;
    }

    _techCost(techId, level) {
        const costs = { life_enhancement: 5, sharpening: 8, precision_training: 10 };
        return (costs[techId] || 5) * (level + 1);
    }

    /* ── 天赋树（魔王核心商城） ── */

    async saveToStorage() {
        if (this._metaCache) await this.saveMeta(this._metaCache);
    }

    getBossCores() {
        return (this._metaCache && this._metaCache.bossCores) || 0;
    }

    getTalents() {
        const meta = this._metaCache || {};
        return meta.talents || {
            health_boost: 0, speed_boost: 0, magnet_boost: 0, weapon_forge: 0,
            listening_intuition: 0, gangpai_hardiness: 0, 摸牌_speed: 0,
            starting_weapons: 0, core_resonance: 0, 雀魂_shield: 0
        };
    }

    async upgradeTalent(talentId) {
        const meta = await this.getMeta();
        if (!meta.talents) meta.talents = {
            health_boost: 0, speed_boost: 0, magnet_boost: 0, weapon_forge: 0,
            listening_intuition: 0, gangpai_hardiness: 0, 摸牌_speed: 0,
            starting_weapons: 0, core_resonance: 0, 雀魂_shield: 0
        };
        const currentLevel = meta.talents[talentId] || 0;
        /* Epoch 2: 新天赋等级上限和成本 */
        const maxLevels = {
            health_boost: 5, speed_boost: 5, magnet_boost: 3, weapon_forge: 1,
            listening_intuition: 5, gangpai_hardiness: 5, 摸牌_speed: 5,
            starting_weapons: 1, core_resonance: 5, 雀魂_shield: 3
        };
        const maxLevel = maxLevels[talentId] || 5;
        if (currentLevel >= maxLevel) return { ok: false, reason: '已达满级' };
        /* Epoch 14: 指数成本 base * 1.3^level；Epoch 22: 通胀调整 */
        var cost = this._talentCostExponential(talentId, currentLevel);
        if (meta.inflationGuard) {
            var factor = 1 + Math.min((meta.inflationGuard.totalMetaTokens || 0) / 5000, 1.0);
            cost = Math.ceil(cost * factor);
        }
        if ((meta.bossCores || 0) < cost) return { ok: false, reason: '魔王核心不足' };
        meta.bossCores -= cost;
        meta.talents[talentId] = currentLevel + 1;
        await this.saveMeta(meta);
        return { ok: true };
    }

    /* ── active_run.json（断点续玩） ── */

    async hasActiveRun() {
        const data = this._readJSON('active_run.json');
        return data && data.isRunActive === true;
    }

    async loadActiveRun() {
        return this._readJSON('active_run.json');
    }

    async saveActiveRun(snapshot) {
        snapshot.isRunActive = true;
        this._writeJSON('active_run.json', snapshot);
        const meta = await this.getMeta();
        meta.lastSaveTimestamp = snapshot.timestamp || Date.now();
        meta.lastHeroName = snapshot.heroName || '光刃行者';
        meta.lastLevelName = snapshot.levelName || '试炼森林';
        await this.saveMeta(meta);
    }

    async clearActiveRun() {
        this._writeJSON('active_run.json', {
            isRunActive: false,
            saveName: '',
            timestamp: Date.now(),
            dateString: this._formatDateString(new Date()),
            waveCount: 0,
            heroId: '',
            levelId: '',
            player: null,
            kills: 0,
            elapsed: 0
        });
    }

    async hasContinueData() {
        var active = await this.hasActiveRun();
        if (active) return true;
        var meta = await this.getMeta();
        return meta.totalRuns > 0 || meta.totalKills > 0 || meta.metaTokens > 0;
    }

    /* ── 新建战局 ── */

    async startNewRun(heroId, levelId) {
        const data = {
            isRunActive: true,
            timestamp: Date.now(),
            heroId: heroId,
            levelId: levelId,
            mode: 'new',
            player: null,
            kills: 0,
            elapsed: 0
        };
        this._writeJSON('active_run.json', data);
    }

    /* ── 快照 ── */

    snapshotForRun(engine) {
        const heroCfg = window.heroConfig[engine.player.heroId];
        const levelCfg = window.levelConfig[engine._currentLevelId];
        const now = new Date();
        return {
            saveName: 'save_' + this._formatTimestamp(now),
            timestamp: now.getTime(),
            dateString: this._formatDateString(now),
            heroName: heroCfg ? heroCfg.name : engine.player.heroId,
            heroId: engine.player.heroId,
            levelName: levelCfg ? levelCfg.name : engine._currentLevelId,
            levelId: engine._currentLevelId,
            waveCount: engine._waveCount,
            elapsed: engine._elapsed,
            kills: engine.kills,
            isRunActive: true,
            spawnInterval: engine._spawnInterval,
            difficultyTimer: engine._difficultyTimer,
            bossTimer: engine._bossTimer,
            spawnTimer: engine._spawnTimer,
            player: engine.player.snapshot()
        };
    }

    restoreRunToEngine(engine, data) {
        engine._waveCount = data.waveCount || 0;
        engine._elapsed = data.elapsed || 0;
        engine.kills = data.kills || 0;
        engine._spawnInterval = data.spawnInterval || 1.5;
        engine._difficultyTimer = data.difficultyTimer || 0;
        engine._bossTimer = data.bossTimer || 0;
        engine._spawnTimer = data.spawnTimer || 0;
        const levelId = data.levelId || 'level_1';
        engine._currentLevelId = levelId;
        const levelCfg = window.levelConfig[levelId];
        if (levelCfg) {
            engine._mapW = levelCfg.mapW;
            engine._mapH = levelCfg.mapH;
        }
        engine.player.restore(data.player);
    }

    _formatTimestamp(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return `${y}${m}${d}_${h}${min}${s}`;
    }

    _formatDateString(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return `${y}-${m}-${d} ${h}:${min}:${s}`;
    }

    /* ── 导出存档 ── */

    exportSave() {
        try {
            const metaData = this._readJSON('meta.json');
            const activeRunData = this._readJSON('active_run.json');
            const payload = { meta: metaData, activeRun: activeRunData };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'click_roguelike_save.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return { success: true };
        } catch (e) {
            const msg = (e && typeof e.message === 'string') ? e.message : '未知错误';
            return { success: false, error: msg };
        }
    }

    /* ── 导入存档 ── */

    async importSaveFile() {
        try {
            const text = await new Promise((resolve, reject) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.addEventListener('change', () => {
                    const file = input.files[0];
                    if (!file) {
                        reject(new Error('未选择文件'));
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('文件读取失败'));
                    reader.readAsText(file);
                });
                input.click();
            });
            const data = JSON.parse(text);
            if (!this._validateImportData(data)) {
                return { success: false, error: '存档格式不合法，拒绝导入' };
            }
            this._writeJSON('meta.json', data.meta);
            this._writeJSON('active_run.json', data.activeRun);
            this._metaCache = null;
            return { success: true };
        } catch (e) {
            const msg = (e && typeof e.message === 'string') ? e.message : '未知错误';
            return { success: false, error: msg };
        }
    }

    _validateImportData(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
        if (!data.meta || typeof data.meta !== 'object') return false;
        if (typeof data.meta.metaTokens !== 'number' || !Number.isFinite(data.meta.metaTokens) || data.meta.metaTokens < 0) return false;
        if (!data.meta.techTree || typeof data.meta.techTree !== 'object') return false;
        if (!data.activeRun || typeof data.activeRun !== 'object') return false;
        if (typeof data.activeRun.isRunActive !== 'boolean') return false;
        var validWeapons = ['TrackingBlade','OrbitShield','ShotgunBurst','GroundSlammer','LaserBeam','NovaPulse'];
        if (data.meta.defaultWeapons) {
            if (!Array.isArray(data.meta.defaultWeapons) || data.meta.defaultWeapons.length < 1) return false;
            for (var wi = 0; wi < data.meta.defaultWeapons.length; wi++) { if (!validWeapons.includes(data.meta.defaultWeapons[wi])) return false; }
        }
        if (data.activeRun.weapons) {
            if (!Array.isArray(data.activeRun.weapons)) return false;
            for (var awi = 0; awi < data.activeRun.weapons.length; awi++) {
                if (!validWeapons.includes(data.activeRun.weapons[awi].id)) return false;
            }
        }
        return true;
    }

    /* ── 完全重置（新存档） ── */

    async resetAllData() {
        const defaults = {
            metaTokens: 0,
            totalRuns: 0,
            totalKills: 0,
            unlockedHeroes: ['Knight'],
            currentHero: 'Knight',
            currentSelectedHero: 'Knight',
            lastSaveTimestamp: 0,
            lastHeroName: '光刃行者',
            lastLevelName: '试炼森林',
            techTree: {
                life_enhancement: 0,
                sharpening: 0,
                precision_training: 0
            },
            bossCores: 0,
            talents: {
                health_boost: 0,
                speed_boost: 0,
                magnet_boost: 0,
                weapon_forge: 0,
                /* Epoch 2 */
                listening_intuition: 0,
                gangpai_hardiness: 0,
               摸牌_speed: 0,
                starting_weapons: 0,
                core_resonance: 0,
               雀魂_shield: 0
            },
            defaultWeapons: ['TrackingBlade'],
            equipments: [],
            equipped: { weapon: null, armor: null, talisman: null },
            highestEndlessLoop: 0,
            causalityFlags: { level1NoDamage: false, level2Overkill: false },
            /* Epoch 3 */
            overdriveCount: 0,
            bossKills: 0,
            finalBossKills: 0,
            totalCrits: 0,
            totalDodges: 0,
            fullSetActivated: false,
            /* Epoch 14+: 元进度系统 */
            challenges: { active: [], completed: {}, lastRotation: 0 },
            runStats: null,
            purchasedPerks: {},
            /* Epoch 15+: 每日登录 */
            loginStreak: 0,
            lastLoginDate: '',
            dailyRewardsClaimed: {},
            makeupTokens: 0,
            runHistory: [],
            /* Epoch 32+: 图鉴 */
            compendium: { relics: [], weapons: [], enemies: [], equips: [], mutations: [] },
            discoveredSecrets: [],
            /* Epoch 41: 每周金库 */
            weeklyVault: { active: false, challenge: null, bet: 0, completed: false, reward: null }
        };
        this._writeJSON('meta.json', defaults);
        this._writeJSON('active_run.json', {
            isRunActive: false,
            saveName: '',
            timestamp: Date.now(),
            dateString: this._formatDateString(new Date()),
            waveCount: 0,
            heroId: '',
            levelId: '',
            player: null,
            kills: 0,
            elapsed: 0
        });
        this._metaCache = defaults;
    }

    /* ── Epoch 14: 挑战系统 ── */

    _initChallenges() {
        var self = this;
        return this.getMeta().then(function(meta) {
            if (!meta.challenges) {
                meta.challenges = {
                    active: [],
                    completed: {},
                    lastRotation: 0
                };
                return self._rotateChallenges(meta).then(function() { return meta.challenges; });
            }
            return meta.challenges;
        });
    }

    _rotateChallenges(meta) {
        var now = Date.now();
        var last = meta.challenges && meta.challenges.lastRotation ? meta.challenges.lastRotation : 0;
        /* 每 6 小时轮换一次 */
        if (now - last < 6 * 60 * 60 * 1000) return Promise.resolve(false);

        var rng = Math.floor(now / 1000) % SaveManager.CHALLENGE_POOL.length;
        var active = [];
        for (var i = 0; i < 3; i++) {
            var idx = (rng + i) % SaveManager.CHALLENGE_POOL.length;
            active.push(SaveManager.CHALLENGE_POOL[idx]);
        }
        meta.challenges.active = active;
        meta.challenges.lastRotation = now;
        return this.saveMeta(meta).then(function() { return true; });
    }

    /* ── Epoch 14: 运行统计 ── */

    recordRunStats(kills, elapsed, gold, overdriveCount, dodges, crits, waves, bossKills, abyssDepth, won, hitsTaken, uniqueRelics) {
        var meta = this._metaCache || {};
        if (!meta.runStats) meta.runStats = {
            totalRuns: 0, totalKills: 0, totalElapsed: 0,
            wins: 0, losses: 0, bestAbyssDepth: 0,
            avgTime: 0, fastestRun: Infinity, slowestRun: 0,
            totalGold: 0, totalDodges: 0, totalCrits: 0, totalBossKills: 0,
            totalOverdrives: 0, totalWaves: 0, totalHitsTaken: 0,
            perfectRuns: 0, relicVariety: 0
        };
        var s = meta.runStats;
        s.totalRuns++;
        s.totalKills += kills;
        s.totalElapsed += elapsed;
        s.avgTime = s.totalElapsed / s.totalRuns;
        if (won) {
            s.wins++;
        } else {
            s.losses++;
        }
        if (elapsed < s.fastestRun) s.fastestRun = elapsed;
        if (elapsed > s.slowestRun) s.slowestRun = elapsed;
        if (abyssDepth > s.bestAbyssDepth) s.bestAbyssDepth = abyssDepth;
        s.totalGold += gold;
        s.totalDodges += dodges;
        s.totalCrits += crits;
        s.totalBossKills += bossKills;
        s.totalOverdrives += overdriveCount;
        s.totalWaves += waves;
        s.totalHitsTaken += hitsTaken;
        if (hitsTaken === 0 && won) s.perfectRuns++;
        if (uniqueRelics > s.relicVariety) s.relicVariety = uniqueRelics;
        return s;
    }

    getRunStats() {
        var meta = this._metaCache || {};
        return meta.runStats || null;
    }


    /* ── Epoch 14: 天赋成本指数曲线 ── */

    _talentCostExponential(talentId, level) {
        /* base * (1.3 ^ level)，替代原来的线性 (level + 1) */
        var bases = {
            health_boost: 1, speed_boost: 1, magnet_boost: 1, weapon_forge: 1,
            listening_intuition: 1, gangpai_hardiness: 1, '摸牌_speed': 1,
            starting_weapons: 5, core_resonance: 4, '雀魂_shield': 2
        };
        var base = bases[talentId] || 1;
        return Math.floor(base * Math.pow(1.3, level));
    }

    /* ── 结算代币 ── */

    calcMetaTokens(kills, elapsed) {
        return Math.floor(kills * 0.1 + elapsed * 0.05);
    }

    /* ── Epoch 15: 每日登录奖励 ── */

    _todayKey() {
        var d = new Date();
        return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
    }

    checkDailyLogin() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var today = self._todayKey();
            var lastLogin = meta.lastLoginDate || '';
            var streak = meta.loginStreak || 0;
            var claimed = meta.dailyRewardsClaimed || {};
            var makeup = meta.makeupTokens || 0;

            if (lastLogin === today) {
                return { streak: streak, claimed: !!claimed[today], reward: null, makeupTokens: makeup };
            }

            var yesterday = new Date(Date.now() - 86400000);
            var yKey = yesterday.getFullYear() + '-' + (yesterday.getMonth()+1) + '-' + yesterday.getDate();
            var isNewStreak = lastLogin === yKey || lastLogin === '';

            if (isNewStreak) {
                streak++;
            } else {
                /* 断签：尝试消耗补签 token */
                if (makeup > 0) {
                    meta.makeupTokens = makeup - 1;
                    /* 保持原 streak 不变（相当于没断） */
                } else {
                    streak = 1;
                }
            }

            meta.loginStreak = streak;
            meta.lastLoginDate = today;

            var reward = self._getDailyReward(streak);
            claimed[today] = true;
            meta.dailyRewardsClaimed = claimed;

            return self.saveMeta(meta).then(function() {
                return { streak: streak, claimed: true, reward: reward, makeupTokens: meta.makeupTokens || 0 };
            });
        });
    }

    claimDailyReward() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var today = self._todayKey();
            var claimed = meta.dailyRewardsClaimed || {};
            if (claimed[today]) return Promise.resolve({ ok: false, reason: '今日已领取' });

            var streak = meta.loginStreak || 1;
            var reward = self._getDailyReward(streak);
            claimed[today] = true;
            meta.dailyRewardsClaimed = claimed;
            return self.saveMeta(meta).then(function() {
                return { ok: true, reward: reward, streak: streak };
            });
        });
    }

    _getDailyReward(streak) {
        if (streak >= 30) return { metaTokens: 200, bossCores: 5, label: '月冠' };
        if (streak >= 14) return { metaTokens: 100, bossCores: 3, label: '双周' };
        if (streak >= 7)  return { metaTokens: 50, bossCores: 2, label: '周冠' };
        if (streak >= 3)  return { metaTokens: 20, bossCores: 1, label: '连胜' };
        return { metaTokens: 5, bossCores: 0, label: '日常' };
    }

    /** 补签：消耗 1 个补签 token 恢复断签前的 streak */
    claimMakeup() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var makeup = meta.makeupTokens || 0;
            if (makeup <= 0) return Promise.resolve({ ok: false, reason: '没有补签 token' });
            if (meta.lastLoginDate === self._todayKey()) return Promise.resolve({ ok: false, reason: '今日已登录' });

            var yesterday = new Date(Date.now() - 86400000);
            var yKey = yesterday.getFullYear() + '-' + (yesterday.getMonth()+1) + '-' + yesterday.getDate();
            /* 只能补昨天 */
            if (meta.lastLoginDate !== yKey && meta.lastLoginDate !== '') {
                return Promise.resolve({ ok: false, reason: '无法补签' });
            }

            meta.makeupTokens = makeup - 1;
            meta.loginStreak = (meta.loginStreak || 0) + 1;
            meta.lastLoginDate = self._todayKey();
            var claimed = meta.dailyRewardsClaimed || {};
            claimed[self._todayKey()] = true;
            meta.dailyRewardsClaimed = claimed;

            var reward = self._getDailyReward(meta.loginStreak);
            return self.saveMeta(meta).then(function() {
                return { ok: true, streak: meta.loginStreak, reward: reward, makeupTokens: meta.makeupTokens };
            });
        });
    }

    /* ── Epoch 15: 声望/周常/每日 ── */

    /** 声望系统骨架 */
    getPrestigeInfo() {
        var meta = this._metaCache || {};
        var cores = meta.bossCores || 0;
        var level = Math.floor(Math.sqrt(cores));
        return { cores: cores, level: level, nextLevelCores: (level+1)*(level+1), perks: [] };
    }

    doPrestige() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var info = self.getPrestigeInfo();
            if (info.cores < (info.level+1)*(info.level+1)) return { ok: false, reason: '核心不足' };
            meta.bossCores = info.cores - (info.level+1)*(info.level+1);
            meta.prestigeLevel = (info.level || 0) + 1;
            meta.prestigeCoresSpent = (meta.prestigeCoresSpent || 0) + (info.level+1)*(info.level+1);
            return self.saveMeta(meta).then(function() {
                return { ok: true, newLevel: meta.prestigeLevel };
            });
        });
    }

    spendMetaTokens(perkId) {
        var self = this;
        return this.getMeta().then(function(meta) {
            var cost = 100;
            if ((meta.metaTokens || 0) < cost) return { ok: false, reason: '元代币不足' };
            meta.metaTokens -= cost;
            if (!meta.purchasedPerks) meta.purchasedPerks = {};
            if (!meta.purchasedPerks[perkId]) meta.purchasedPerks[perkId] = 0;
            meta.purchasedPerks[perkId]++;
            return self.saveMeta(meta).then(function() { return { ok: true }; });
        });
    }

    /** 周常挑战生成 */
    getWeeklyChallenges() {
        var meta = this._metaCache || {};
        var weekKey = meta.currentWeek || '';
        if (meta.weeklyChallenges && meta.weeklyChallenges.week === weekKey) {
            return meta.weeklyChallenges.challenges || [];
        }
        var allChallenges = [
            { id: 'kill_50', type: 'kills', target: 50, reward: { metaTokens: 20, bossCores: 1 } },
            { id: 'kill_200', type: 'kills', target: 200, reward: { metaTokens: 50, bossCores: 3 } },
            { id: 'win_3', type: 'wins', target: 3, reward: { metaTokens: 30, bossCores: 2 } },
            { id: 'win_10', type: 'wins', target: 10, reward: { metaTokens: 80, bossCores: 5 } },
            { id: 'overdrive_5', type: 'overdrives', target: 5, reward: { metaTokens: 25, bossCores: 1 } },
            { id: 'abyss_2', type: 'abyss', target: 2, reward: { metaTokens: 40, bossCores: 2 } },
            { id: 'no_hit', type: 'flawless', target: 1, reward: { metaTokens: 60, bossCores: 4 } },
            { id: 'boss_5', type: 'bossKills', target: 5, reward: { metaTokens: 35, bossCores: 2 } },
        ];
        var shuffled = allChallenges.slice().sort(function() { return Math.random() - 0.5; });
        var picked = shuffled.slice(0, 4);
        picked.forEach(function(c) { c.progress = 0; c.completed = false; });
        meta.currentWeek = weekKey || this._weekKey();
        meta.weeklyChallenges = { week: meta.currentWeek, challenges: picked };
        this.saveMeta(meta);
        return picked;
    }

    checkWeeklyCompletion(stats) {
        var meta = this._metaCache || {};
        if (!meta.weeklyChallenges) return { completed: [], bonusTokens: 0, bonusCores: 0 };
        var chs = meta.weeklyChallenges.challenges || [];
        var completed = [];
        var bonusTokens = 0;
        var bonusCores = 0;
        for (var i = 0; i < chs.length; i++) {
            var c = chs[i];
            var val = stats && stats[c.type] || 0;
            if (val >= c.target && !c.completed) {
                c.completed = true;
                completed.push(c.id);
                bonusTokens += (c.reward && c.reward.metaTokens) || 0;
                bonusCores += (c.reward && c.reward.bossCores) || 0;
            }
        }
        if (completed.length > 0) {
            meta.weeklyChallenges.challenges = chs;
            this.saveMeta(meta);
        }
        return { completed: completed, bonusTokens: bonusTokens, bonusCores: bonusCores };
    }

    /* ── Epoch 15: 战局历史记录 ── */

    recordRunHistory(heroId, levelId, kills, elapsed, won, loopCount, relics, weeklyCompleted) {
        var self = this;
        return this.getMeta().then(function(meta) {
            if (!meta.runHistory) meta.runHistory = [];
            var entry = {
                timestamp: Date.now(),
                heroId: heroId,
                levelId: levelId,
                kills: kills,
                elapsed: elapsed,
                won: won,
                loopCount: loopCount,
                relics: relics,
                metaTokensEarned: self.calcMetaTokens(kills, elapsed),
                weeklyCompleted: weeklyCompleted || []
            };
            meta.runHistory.unshift(entry);
            if (meta.runHistory.length > 50) meta.runHistory = meta.runHistory.slice(0, 50);
            return self.saveMeta(meta).then(function() { return entry; });
        });
    }

    getRunHistory(limit) {
        limit = limit || 20;
        var meta = this._metaCache || {};
        var history = meta.runHistory || [];
        return history.slice(0, limit);
    }

    /* ── Epoch 15: 精英模式 ── */

    enableEliteMode() {
        var self = this;
        return this.getMeta().then(function(meta) {
            meta.eliteMode = true;
            return self.saveMeta(meta).then(function() { return { ok: true }; });
        });
    }

    disableEliteMode() {
        var self = this;
        return this.getMeta().then(function(meta) {
            meta.eliteMode = false;
            return self.saveMeta(meta).then(function() { return { ok: true }; });
        });
    }

    isEliteMode() {
        var meta = this._metaCache || {};
        return !!meta.eliteMode;
    }

    getCurrentHero() {
        return (this._metaCache && this._metaCache.currentHero) || 'Knight';
    }

    async setCurrentHero(id) {
        if (!this._metaCache) return { ok: false, reason: '\u5b58\u6863\u672a\u521d\u59cb\u5316' };
        var reg = window.heroRegistry;
        if (!reg || !reg.getHero(id)) return { ok: false, reason: '\u82f1\u96c4\u4e0d\u5b58\u5728' };
        var unlocked = this._metaCache.unlockedHeroes || [];
        if (unlocked.indexOf(id) === -1) return { ok: false, reason: '\u82f1\u96c4\u672a\u89e3\u9501' };
        this._metaCache.currentHero = id;
        this._metaCache.currentSelectedHero = id;
        await this._saveMetaToStorage();
        return { ok: true };
    }

    async unlockHero(id, cost) {
        if (!this._metaCache) return { ok: false, reason: '\u5b58\u6863\u672a\u521d\u59cb\u5316' };
        var reg = window.heroRegistry;
        var hero = reg && reg.getHero(id);
        if (!hero) return { ok: false, reason: '\u82f1\u96c4\u4e0d\u5b58\u5728' };
        var unlocked = this._metaCache.unlockedHeroes = this._metaCache.unlockedHeroes || [];
        if (unlocked.indexOf(id) !== -1) return { ok: false, reason: '\u5df2\u89e3\u9501' };
        var cores = this._metaCache.bossCores || 0;
        if (cores < cost) return { ok: false, reason: '\u6838\u5fc3\u4e0d\u8db3\uff08\u9700 ' + cost + ' \u679a\uff09' };
        this._metaCache.bossCores = cores - cost;
        unlocked.push(id);
        await this._saveMetaToStorage();
        return { ok: true };
    }

    async _saveMetaToStorage() {
        var data = JSON.stringify(this._metaCache);
        localStorage.setItem('cr_meta.json', data);
    }

    /* ── Epoch 45: 元代币辅助 ── */

    addMetaTokens(amount) {
        var meta = this._metaCache || {};
        meta.metaTokens = (meta.metaTokens || 0) + amount;
        this._metaCache = meta;
        this._saveMetaToStorage();
    }

    /* ── Epoch 32: 图鉴系统 ── */

    recordCompendiumEntry(category, id) {
        if (!this._metaCache) return;
        var arr = this._metaCache.compendium[category];
        if (!arr) return;
        if (arr.indexOf(id) === -1) {
            arr.push(id);
            this._saveMetaToStorage();
        }
    }

    /* ── 秘密发现记录 ── */

    recordDiscoveredSecret(secretId) {
        var self = this;
        return this.getMeta().then(function(meta) {
            if (!meta.discoveredSecrets) meta.discoveredSecrets = [];
            if (meta.discoveredSecrets.indexOf(secretId) === -1) {
                meta.discoveredSecrets.push(secretId);
                return self.saveMeta(meta);
            }
            return meta;
        });
    }

    getDiscoveredSecrets() {
        var meta = this._metaCache || {};
        return meta.discoveredSecrets || [];
    }

    getCompendiumProgress() {
        if (!this._metaCache) return { relics: 0, weapons: 0, enemies: 0, mutations: 0, total: 0, seen: 0 };
        var c = this._metaCache.compendium;
        var total = 0, seen = 0;
        /* 已知总数 */
        var relicIds = ['sharp_edge','golden_finger','auto_drone','thorn_armor','wind_walker','vamp_ring','explosive_core','frost_core','gravity_core','weapon_amplify'];
        var weaponIds = Object.keys(window.rewardManager && window.rewardManager.weaponInfos || {});
        var enemyIds = ['Normal','Tanker','Stalker','Shaman','Boss_Lord'];
        var equipIds = Object.keys(window.equipmentRegistry && window.equipmentRegistry.equipPool || {});
        total += relicIds.length;
        total += weaponIds.length;
        total += enemyIds.length;
        total += equipIds.length;
        /* mutations: count from game engine active mutators */
        var mutatorIds = ['gravity','bloodmoon','frenzy','frailty','wither'];
        total += mutatorIds.length;
        seen += (c.relics || []).length;
        seen += (c.weapons || []).length;
        seen += (c.enemies || []).length;
        seen += (c.equips || []).length;
        seen += (c.mutations || []).length;
        return {
            relics: (c.relics || []).length,
            relicsTotal: relicIds.length,
            weapons: (c.weapons || []).length,
            weaponsTotal: weaponIds.length,
            enemies: (c.enemies || []).length,
            enemiesTotal: enemyIds.length,
            equips: (c.equips || []).length,
            equipsTotal: equipIds.length,
            mutations: (c.mutations || []).length,
            mutationsTotal: mutatorIds.length,
            total: total,
            seen: seen,
            pct: total > 0 ? Math.round(seen / total * 100) : 0
        };
    }

    equipItem(instanceId) {
        if (!this._metaCache) return { ok: false, reason: '\u5b58\u6863\u672a\u521d\u59cb\u5316' };
        var eqs = this._metaCache.equipments || [];
        var item = null;
        for (var i = 0; i < eqs.length; i++) { if (eqs[i].instanceId === instanceId) { item = eqs[i]; break; } }
        if (!item) return { ok: false, reason: '\u88c5\u5907\u4e0d\u5b58\u5728' };
        var slot = item.slot;
        if (!slot) return { ok: false, reason: '\u90e8\u4f4d\u4e0d\u660e' };
        var equipped = this._metaCache.equipped = this._metaCache.equipped || { weapon: null, armor: null, talisman: null };
        equipped[slot] = instanceId;
        this._saveMetaToStorage();
        return { ok: true };
    }

    unequipSlot(slot) {
        if (!this._metaCache) return { ok: false, reason: '\u5b58\u6863\u672a\u521d\u59cb\u5316' };
        var equipped = this._metaCache.equipped = this._metaCache.equipped || { weapon: null, armor: null, talisman: null };
        equipped[slot] = null;
        this._saveMetaToStorage();
        return { ok: true };
    }

    async rerollAffix(instanceId, affixIndex, cost) {
        if (!this._metaCache) return { ok: false, reason: '\u5b58\u6863\u672a\u521d\u59cb\u5316' };
        var eqs = this._metaCache.equipments || [];
        var item = null;
        for (var i = 0; i < eqs.length; i++) { if (eqs[i].instanceId === instanceId) { item = eqs[i]; break; } }
        if (!item) return { ok: false, reason: '\u88c5\u5907\u4e0d\u5b58\u5728' };
        if (!item.affixes || affixIndex < 0 || affixIndex >= item.affixes.length) return { ok: false, reason: '\u8bcd\u6761\u7d22\u5f15\u65e0\u6548' };
        var cores = this._metaCache.bossCores || 0;
        if (cores < cost) return { ok: false, reason: '\u6838\u5fc3\u4e0d\u8db3\uff08\u9700 ' + cost + ' \u679a\uff09' };
        this._metaCache.bossCores = cores - cost;
        var reg = window.equipmentRegistry;
        if (reg && typeof reg.getRandomAffix === 'function') {
            item.affixes[affixIndex] = reg.getRandomAffix();
        }
        await this._saveMetaToStorage();
        return { ok: true, newItem: item };
    }

    /* ── Epoch 16: 声望/转生系统 ── */

    /* ── Epoch 22: 通胀防护 ── */

    /** 返回 talent 实际成本（含通胀系数） */
    getTalentCostWithInflation(talentId, level) {
        var meta = this._metaCache || {};
        var spent = meta.inflationGuard || {};
        var totalSpent = spent.totalMetaTokens || 0;
        var factor = 1 + Math.min(totalSpent / 5000, 1.0); // 最多 +100%
        var base = this._talentCostExponential(talentId, level);
        return Math.ceil(base * factor);
    }

    /** 记录通胀计量 */
    recordInflation(metaTokensSpent) {
        var meta = this._metaCache || {};
        if (!meta.inflationGuard) meta.inflationGuard = {};
        meta.inflationGuard.totalMetaTokens = (meta.inflationGuard.totalMetaTokens || 0) + (metaTokensSpent || 0);
        meta.inflationGuard.lastReset = Date.now();
    }

    /** 重置通胀计数器（赛季开始时） */
    resetInflationCounter() {
        var meta = this._metaCache || {};
        if (!meta.inflationGuard) meta.inflationGuard = {};
        meta.inflationGuard.totalMetaTokens = 0;
        meta.inflationGuard.lastReset = Date.now();
    }

    /* ── Epoch 22: 赛季触发 ── */

    /** 检查并触发赛季激活条件 */
    checkSeasonTrigger() {
        var meta = this._metaCache || {};
        var season = meta.season || {};
        if (season.currentSeason > 0) return { triggered: false };
        var totalRuns = meta.totalRuns || 0;
        var bestAbyss = meta.highestEndlessLoop || 0;
        var totalWins = meta.runStats && meta.runStats.wins || 0;
        if (totalWins >= 5) return this.activateSeason();
        if (bestAbyss >= 10) return this.activateSeason();
        return { triggered: false, reason: '未满足赛季激活条件（需 5 胜或深渊 10 层）' };
    }

    /** 激活赛季 */
    activateSeason() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var season = meta.season || {};
            season.currentSeason = (season.currentSeason || 0) + 1;
            season.startDate = Date.now();
            season.day = 1;
            meta.season = season;
            return self.saveMeta(meta).then(function() {
                return { triggered: true, season: season.currentSeason };
            });
        });
    }

    /** Epoch 35: 获取当前赛季状态 */
    getSeasonStatus() {
        var meta = this._metaCache || {};
        var season = meta.season || {};
        if (!season.currentSeason || season.currentSeason <= 0) return { isActive: false };
        var startDate = season.startDate || Date.now();
        var daysElapsed = Math.floor((Date.now() - startDate) / 86400000);
        return {
            isActive: true,
            season: season.currentSeason,
            daysElapsed: daysElapsed,
            rewardClaimed: !!season.lastRewardClaimed
        };
    }

    /** 获取赛季奖励 */
    getSeasonReward(seasonNum) {
        var rewards = [
            { metaTokens: 100, bossCores: 5 },
            { metaTokens: 200, bossCores: 10 },
            { metaTokens: 400, bossCores: 20 }
        ];
        var idx = Math.min(seasonNum - 1, rewards.length - 1);
        return rewards[idx];
    }

    /** 每日挑战剩余时间(毫秒) */
    getDailyChallengeCountdown() {
        var meta = this._metaCache || {};
        var dc = meta.dailyChallenges || {};
        var last = dc.lastRotation || 0;
        if (last === 0) return 86400000;
        var remaining = 86400000 - (Date.now() - last);
        return Math.max(0, remaining);
    }

    /** 格式化倒计时 HH:MM:SS */
    formatCountdown(ms) {
        var totalSec = Math.floor(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        return h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    }

    /** 领取赛季奖励 */
    claimSeasonReward() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var season = meta.season || {};
            var cs = season.currentSeason || 0;
            if (cs < 1) return Promise.resolve({ ok: false, reason: '赛季未激活' });
            var claimed = season.claimedRewards || {};
            var reward = self.getSeasonReward(cs);
            if (claimed['s' + cs]) return Promise.resolve({ ok: false, reason: '已领取' });
            if (!meta.purchasedPerks) meta.purchasedPerks = {};
            meta.purchasedPerks['season_reward_s' + cs] = true;
            claimed['s' + cs] = true;
            meta.season = meta.season || {};
            meta.season.claimedRewards = claimed;
            meta.metaTokens = (meta.metaTokens || 0) + (reward.metaTokens || 0);
            meta.bossCores = (meta.bossCores || 0) + (reward.bossCores || 0);
            return self.saveMeta(meta).then(function() {
                return { ok: true, reward: reward };
            });
        });
    }

    /* ── Epoch 31: 每日任务 ── */
    static DAILY_QUEST_POOL = [
        { id: 'dq_kill_30', name: '连斩30', desc: '单局击杀 30 个敌人', check: function(s) { return s.kills >= 30; }, reward: { metaTokens: 20, bossCores: 1 } },
        { id: 'dq_gold_300', name: '掘金', desc: '单局获取 300 金币', check: function(s) { return s.maxGold >= 300; }, reward: { metaTokens: 15 } },
        { id: 'dq_no_hit_1', name: '无畏', desc: '单局 0 受击通关', check: function(s) { return s.hitsTaken === 0 && s.won; }, reward: { metaTokens: 30, bossCores: 2 } },
        { id: 'dq_overdrive_2', name: '怒意', desc: '单局触发 2 次 Overdrive', check: function(s) { return s.overdriveCount >= 2; }, reward: { bossCores: 1 } },
        { id: 'dq_wave_10', name: '坚守', desc: '通关 10 波', check: function(s) { return s.waves >= 10; }, reward: { metaTokens: 25 } },
        { id: 'dq_crit_15', name: '暴击大师', desc: '单局暴击 15 次', check: function(s) { return s.crits >= 15; }, reward: { metaTokens: 20 } },
        { id: 'dq_dodge_10', name: '幻影', desc: '单局闪避 10 次', check: function(s) { return s.dodges >= 10; }, reward: { metaTokens: 15 } },
        { id: 'dq_abyss_3', name: '深渊探索', desc: '抵达深渊第 3 层', check: function(s) { return s.abyssDepth >= 3; }, reward: { metaTokens: 30, bossCores: 2 } }
    ];

    /** 获取/刷新每日任务 */
    getDailyQuests() {
        var meta = this._metaCache || {};
        if (!meta.dailyQuests) meta.dailyQuests = { quests: [], lastDate: 0 };
        var today = this._todayKey();
        if (meta.dailyQuests.lastDate !== today) {
            /* 新的一天 — 随机选3个任务 */
            var pool = SaveManager.DAILY_QUEST_POOL;
            var seed = today.charCodeAt(today.length - 1) + today.charCodeAt(0);
            var indices = [];
            var h = seed;
            for (var i = 0; i < 3 && indices.length < pool.length; i++) {
                h = (h * 1103515245 + 12345) & 0x7fffffff;
                var idx = h % pool.length;
                if (indices.indexOf(idx) === -1) indices.push(idx);
            }
            meta.dailyQuests = {
                quests: indices.map(function(ix) { return { id: pool[ix].id, completed: false }; }),
                lastDate: today,
                claimed: {}
            };
        }
        return meta.dailyQuests;
    }

    /** 检查每日任务完成 */
    checkDailyQuestCompletion(stats) {
        var dq = this.getDailyQuests();
        var pool = SaveManager.DAILY_QUEST_POOL;
        var poolMap = {};
        for (var i = 0; i < pool.length; i++) poolMap[pool[i].id] = pool[i];
        var completed = [];
        for (var i = 0; i < dq.quests.length; i++) {
            var q = dq.quests[i];
            if (q.completed) continue;
            var def = poolMap[q.id];
            if (def && def.check(stats)) {
                dq.quests[i].completed = true;
                completed.push(q.id);
            }
        }
        return completed;
    }

    /** 领取每日任务奖励 */
    claimDailyQuestReward(questId) {
        var self = this;
        return this.getMeta().then(function(meta) {
            var dq = meta.dailyQuests || {};
            var claimed = dq.claimed || {};
            if (claimed[questId]) return Promise.resolve({ ok: false, reason: '已领取' });
            var pool = SaveManager.DAILY_QUEST_POOL;
            var def = null;
            for (var i = 0; i < pool.length; i++) { if (pool[i].id === questId) { def = pool[i]; break; } }
            if (!def) return Promise.resolve({ ok: false, reason: '未知任务' });
            var quest = dq.quests && dq.quests.find(function(q) { return q.id === questId; });
            if (!quest || !quest.completed) return Promise.resolve({ ok: false, reason: '未完成' });
            claimed[questId] = true;
            dq.claimed = claimed;
            meta.dailyQuests = dq;
            meta.metaTokens = (meta.metaTokens || 0) + (def.reward.metaTokens || 0);
            meta.bossCores = (meta.bossCores || 0) + (def.reward.bossCores || 0);
            return self.saveMeta(meta).then(function() { return { ok: true, reward: def.reward }; });
        });
    }

    /* ── Epoch 31: 死亡奖励 ── */
    calcDeathReward(kills, gold, elapsed) {
        /* 死亡时获得部分奖励: 10%金币 + 每50击杀1核心 */
        var metaTokens = Math.floor(gold / 10);
        var bossCores = Math.floor(kills / 50);
        if (elapsed < 60) { metaTokens = Math.floor(metaTokens * 0.5); bossCores = 0; } /* 过早死亡减半 */
        return { metaTokens: metaTokens, bossCores: bossCores };
    }

    /* ── Epoch 31: 本地排行榜 ── */
    getLeaderboard() {
        var meta = this._metaCache || {};
        if (!meta.leaderboard) meta.leaderboard = { fastestClear: 0, deepestAbyss: 0, mostKills: 0, mostGold: 0, perfectRuns: 0 };
        return meta.leaderboard;
    }

    updateLeaderboard(stats) {
        var lb = this.getLeaderboard();
        if (stats.won) {
            if (lb.fastestClear === 0 || stats.elapsed < lb.fastestClear) lb.fastestClear = stats.elapsed;
            if (stats.bestAbyssDepth > lb.deepestAbyss) lb.deepestAbyss = stats.bestAbyssDepth;
        }
        if (stats.totalKills > lb.mostKills) lb.mostKills = stats.totalKills;
        if (stats.totalGold > lb.mostGold) lb.mostGold = stats.totalGold;
        if (stats.perfectRuns > lb.perfectRuns) lb.perfectRuns = stats.perfectRuns;
        return lb;
    }

    /* ── Epoch 36: 每周金库 ── */
    static _vaultMultipliers = [
        { bet: 10,  multiplier: 1, label: '入门 (押注 10)' },
        { bet: 25,  multiplier: 2, label: '进阶 (押注 25)' },
        { bet: 50,  multiplier: 3, label: '豪赌 (押注 50)' }
    ];

    /** 获取金库状态 */
    getWeeklyVault() {
        var meta = this._metaCache || {};
        return meta.weeklyVault || { active: false, challenge: null, bet: 0, completed: false, reward: null };
    }

    /** 打开金库 — 从挑战池随机选一个挑战，奖励翻倍 */
    openWeeklyVault(betTier) {
        var self = this;
        return this.getMeta().then(function(meta) {
            var vault = meta.weeklyVault || {};
            if (vault.active && !vault.completed) return Promise.resolve({ ok: false, reason: '已有活跃金库挑战' });
            if (vault.active && vault.completed) return Promise.resolve({ ok: false, reason: '已完成，请领取奖励' });

            /* 找倍率档位 */
            var tier = null;
            for (var i = 0; i < SaveManager._vaultMultipliers.length; i++) {
                if (SaveManager._vaultMultipliers[i].bet === betTier) { tier = SaveManager._vaultMultipliers[i]; break; }
            }
            if (!tier) return Promise.resolve({ ok: false, reason: '无效押注档位' });

            /* 扣除押注 */
            if ((meta.metaTokens || 0) < tier.bet) return Promise.resolve({ ok: false, reason: '元代币不足' });
            meta.metaTokens -= tier.bet;

            /* 随机选挑战，奖励翻倍 */
            var pool = SaveManager.CHALLENGE_POOL;
            var idx = Math.floor(Math.random() * pool.length);
            var challenge = pool[idx];
            var doubledReward = {};
            if (challenge.reward.metaTokens) doubledReward.metaTokens = challenge.reward.metaTokens * tier.multiplier;
            if (challenge.reward.bossCores) doubledReward.bossCores = challenge.reward.bossCores * tier.multiplier;

            vault.active = true;
            vault.challenge = { id: challenge.id, name: challenge.name, desc: challenge.desc, reward: doubledReward, checkFn: challenge.check };
            vault.bet = tier.bet;
            vault.multiplier = tier.multiplier;
            vault.completed = false;
            vault.reward = null;
            meta.weeklyVault = vault;

            return self.saveMeta(meta).then(function() {
                return { ok: true, challenge: vault.challenge, bet: tier.bet };
            });
        });
    }

    /** 放弃金库 — 返还押注 */
    abandonWeeklyVault() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var vault = meta.weeklyVault || {};
            if (!vault.active) return Promise.resolve({ ok: false, reason: '没有活跃金库' });
            if (vault.completed) return Promise.resolve({ ok: false, reason: '已完成的金库不能放弃' });

            meta.metaTokens = (meta.metaTokens || 0) + vault.bet;
            vault.active = false;
            vault.challenge = null;
            vault.bet = 0;
            vault.completed = false;
            vault.reward = null;
            meta.weeklyVault = vault;
            return self.saveMeta(meta).then(function() {
                return { ok: true };
            });
        });
    }

    /** 评估金库挑战是否完成 — 在 run 结算时调用 */
    evaluateWeeklyVault(runStats) {
        var meta = this._metaCache || {};
        var vault = meta.weeklyVault || {};
        if (!vault.active || !vault.challenge || vault.completed) return { evaluated: false };

        var checkFn = vault.challenge.checkFn;
        if (checkFn && checkFn(runStats)) {
            vault.completed = true;
            vault.reward = vault.challenge.reward;
            meta.weeklyVault = vault;
            this._metaCache = meta;
            return { evaluated: true, completed: true, reward: vault.reward };
        }
        return { evaluated: true, completed: false };
    }

    /** 领取金库奖励 */
    claimWeeklyVaultReward() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var vault = meta.weeklyVault || {};
            if (!vault.completed) return Promise.resolve({ ok: false, reason: '未完成金库挑战' });
            if (vault.reward) {
                meta.metaTokens = (meta.metaTokens || 0) + (vault.reward.metaTokens || 0);
                meta.bossCores = (meta.bossCores || 0) + (vault.reward.bossCores || 0);
            }
            vault.active = false;
            vault.challenge = null;
            vault.bet = 0;
            vault.completed = false;
            vault.reward = null;
            meta.weeklyVault = vault;
            return self.saveMeta(meta).then(function() {
                return { ok: true };
            });
        });
    }
}

window.saveManager = new SaveManager();
