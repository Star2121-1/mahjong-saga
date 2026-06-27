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
                runHistory: []
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
            if (!data.runHistory) data.runHistory = [];
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
        /* Epoch 14: 指数成本曲线 base * 1.3^level */
        const cost = this._talentCostExponential(talentId, currentLevel);
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
            fullSetActivated: false
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

    /* ── Epoch 14: 元货币消费 ── */

    spendMetaTokens(itemId, cost) {
        var self = this;
        return this.getMeta().then(function(meta) {
            if ((meta.metaTokens || 0) < cost) return Promise.resolve({ ok: false, reason: '元代币不足' });

            var result = null;
            switch (itemId) {
                case 'token_revive': {
                    if (!meta.purchasedPerks) meta.purchasedPerks = {};
                    if (!meta.purchasedPerks.token_revive) meta.purchasedPerks.token_revive = 0;
                    meta.purchasedPerks.token_revive++;
                    meta.metaTokens -= cost;
                    result = self.saveMeta(meta).then(function() { return { ok: true, perk: 'revive' }; });
                    break;
                }
                case 'token_relic_start': {
                    if (!meta.purchasedPerks) meta.purchasedPerks = {};
                    if (meta.purchasedPerks.token_relic_start) return Promise.resolve({ ok: false, reason: '已购买' });
                    meta.purchasedPerks.token_relic_start = true;
                    meta.metaTokens -= cost;
                    result = self.saveMeta(meta).then(function() { return { ok: true, perk: 'relic_start' }; });
                    break;
                }
                case 'token_map_affinity_level1': {
                    if (!meta.purchasedPerks) meta.purchasedPerks = {};
                    if (meta.purchasedPerks.token_map_affinity < 1) {
                        meta.purchasedPerks.token_map_affinity = 1;
                        meta.metaTokens -= cost;
                        result = self.saveMeta(meta).then(function() { return { ok: true, perk: 'map_affinity_1' }; });
                    } else {
                        result = Promise.resolve({ ok: false, reason: '已拥有更高级别' });
                    }
                    break;
                }
                case 'token_map_affinity_level2': {
                    if (!meta.purchasedPerks) meta.purchasedPerks = {};
                    if ((meta.purchasedPerks.token_map_affinity || 0) < 2) {
                        meta.purchasedPerks.token_map_affinity = 2;
                        meta.metaTokens -= cost;
                        result = self.saveMeta(meta).then(function() { return { ok: true, perk: 'map_affinity_2' }; });
                    } else {
                        result = Promise.resolve({ ok: false, reason: '已拥有更高级别' });
                    }
                    break;
                }
                case 'token_map_affinity_level3': {
                    if (!meta.purchasedPerks) meta.purchasedPerks = {};
                    if ((meta.purchasedPerks.token_map_affinity || 0) < 3) {
                        meta.purchasedPerks.token_map_affinity = 3;
                        meta.metaTokens -= cost;
                        result = self.saveMeta(meta).then(function() { return { ok: true, perk: 'map_affinity_3' }; });
                    } else {
                        result = Promise.resolve({ ok: false, reason: '已拥有更高级别' });
                    }
                    break;
                }
                default:
                    return Promise.resolve({ ok: false, reason: '未知商品' });
            }
            return result;
        });
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

            if (lastLogin === today) {
                return { streak: streak, claimed: !!claimed[today], reward: null };
            }

            var yesterday = new Date(Date.now() - 86400000);
            var yKey = yesterday.getFullYear() + '-' + (yesterday.getMonth()+1) + '-' + yesterday.getDate();
            var isNewStreak = lastLogin === yKey || lastLogin === '';

            if (isNewStreak) {
                streak++;
            } else {
                streak = 1;
            }

            meta.loginStreak = streak;
            meta.lastLoginDate = today;

            var reward = self._getDailyReward(streak);
            claimed[today] = true;
            meta.dailyRewardsClaimed = claimed;

            return self.saveMeta(meta).then(function() {
                return { streak: streak, claimed: true, reward: reward };
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

    /* ── Epoch 15: 战局历史记录 ── */

    recordRunHistory(heroId, levelId, kills, elapsed, won, loopCount, relics) {
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
                metaTokensEarned: self.calcMetaTokens(kills, elapsed)
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

    getPrestigeInfo() {
        var meta = this._metaCache || {};
        var prestigeLevel = meta.prestigeLevel || 0;
        var prestigePoints = meta.prestigePoints || 0;
        var totalRuns = meta.totalRuns || 0;
        var potential = Math.floor(Math.pow(totalRuns, 0.6));
        return {
            level: prestigeLevel,
            points: prestigePoints,
            totalRuns: totalRuns,
            potential: potential,
            canPrestige: potential > prestigePoints
        };
    }

    doPrestige() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var currentPoints = meta.prestigePoints || 0;
            var totalRuns = meta.totalRuns || 0;
            var potential = Math.floor(Math.pow(totalRuns, 0.6));
            if (potential <= currentPoints) return Promise.resolve({ ok: false, reason: '声望点不足' });

            var gained = potential - currentPoints;
            meta.prestigePoints = potential;
            meta.prestigeLevel = (meta.prestigeLevel || 0) + 1;
            meta.prestigeHistory = meta.prestigeHistory || [];
            meta.prestigeHistory.push({
                timestamp: Date.now(),
                runsAtPrestige: totalRuns,
                pointsGained: gained
            });

            var prestigeBonus = meta.prestigeBonus || {};
            prestigeBonus.globalAtkBonus = (prestigeBonus.globalAtkBonus || 0) + gained * 0.5;
            prestigeBonus.globalHpBonus = (prestigeBonus.globalHpBonus || 0) + gained * 2;
            meta.prestigeBonus = prestigeBonus;

            return self.saveMeta(meta).then(function() {
                return { ok: true, gained: gained, level: meta.prestigeLevel };
            });
        });
    }

    applyPrestigeBonus(player) {
        var meta = this._metaCache || {};
        var bonus = meta.prestigeBonus || {};
        if (bonus.globalAtkBonus) player.atk += Math.floor(bonus.globalAtkBonus);
        if (bonus.globalHpBonus) {
            player.maxHp += Math.floor(bonus.globalHpBonus);
            player.hp = Math.max(player.hp, player.maxHp);
        }
    }

    /* ── Epoch 17: 元货币消费扩展 ── */

    spendMetaTokens(itemId, cost) {
        var self = this;
        return this.getMeta().then(function(meta) {
            if ((meta.metaTokens || 0) < cost) return Promise.resolve({ ok: false, reason: '元代币不足' });

            var result = null;
            switch (itemId) {
                case 'token_revive': {
                    if (!meta.purchasedPerks) meta.purchasedPerks = {};
                    if (!meta.purchasedPerks.token_revive) meta.purchasedPerks.token_revive = 0;
                    meta.purchasedPerks.token_revive++;
                    meta.metaTokens -= cost;
                    result = self.saveMeta(meta).then(function() { return { ok: true, perk: 'revive' }; });
                    break;
                }
                case 'token_relic_start': {
                    if (!meta.purchasedPerks) meta.purchasedPerks = {};
                    if (meta.purchasedPerks.token_relic_start) return Promise.resolve({ ok: false, reason: '已购买' });
                    meta.purchasedPerks.token_relic_start = true;
                    meta.metaTokens -= cost;
                    result = self.saveMeta(meta).then(function() { return { ok: true, perk: 'relic_start' }; });
                    break;
                }
                case 'token_map_affinity_level1': {
                    if (!meta.purchasedPerks) meta.purchasedPerks = {};
                    if ((meta.purchasedPerks.token_map_affinity || 0) < 1) {
                        meta.purchasedPerks.token_map_affinity = 1;
                        meta.metaTokens -= cost;
                        result = self.saveMeta(meta).then(function() { return { ok: true, perk: 'map_affinity_1' }; });
                    } else {
                        result = Promise.resolve({ ok: false, reason: '已拥有更高级别' });
                    }
                    break;
                }
                case 'token_map_affinity_level2': {
                    if (!meta.purchasedPerks) meta.purchasedPerks = {};
                    if ((meta.purchasedPerks.token_map_affinity || 0) < 2) {
                        meta.purchasedPerks.token_map_affinity = 2;
                        meta.metaTokens -= cost;
                        result = self.saveMeta(meta).then(function() { return { ok: true, perk: 'map_affinity_2' }; });
                    } else {
                        result = Promise.resolve({ ok: false, reason: '已拥有更高级别' });
                    }
                    break;
                }
                case 'token_map_affinity_level3': {
                    if (!meta.purchasedPerks) meta.purchasedPerks = {};
                    if ((meta.purchasedPerks.token_map_affinity || 0) < 3) {
                        meta.purchasedPerks.token_map_affinity = 3;
                        meta.metaTokens -= cost;
                        result = self.saveMeta(meta).then(function() { return { ok: true, perk: 'map_affinity_3' }; });
                    } else {
                        result = Promise.resolve({ ok: false, reason: '已拥有更高级别' });
                    }
                    break;
                }
                /* Epoch 17 新增 */
                case 'token_reset_talents': {
                    if (!meta.talents) return Promise.resolve({ ok: false, reason: '无天赋可重置' });
                    var refunded = 0;
                    for (var k in meta.talents) { if (typeof meta.talents[k] === 'number') refunded += meta.talents[k]; }
                    meta.talents = { health_boost: 0, speed_boost: 0, magnet_boost: 0, weapon_forge: 0, listening_intuition: 0, gangpai_hardiness: 0, 摸牌_speed: 0, starting_weapons: 0, core_resonance: 0, 雀魂_shield: 0 };
                    meta.bossCores = (meta.bossCores || 0) + refunded;
                    meta.metaTokens -= cost;
                    result = self.saveMeta(meta).then(function() { return { ok: true, refunded: refunded }; });
                    break;
                }
                case 'token_extra_weapon_slot': {
                    if (!meta.purchasedPerks) meta.purchasedPerks = {};
                    var extraSlots = meta.purchasedPerks.extra_weapon_slots || 0;
                    if (extraSlots >= 3) return Promise.resolve({ ok: false, reason: '已达上限' });
                    meta.purchasedPerks.extra_weapon_slots = extraSlots + 1;
                    meta.metaTokens -= cost;
                    result = self.saveMeta(meta).then(function() { return { ok: true, perk: 'extra_slot', totalSlots: 6 + extraSlots + 1 }; });
                    break;
                }
                default:
                    return Promise.resolve({ ok: false, reason: '未知商品' });
            }
            return result;
        });
    }

    /* ── Epoch 18: 每周超级挑战 ── */

    getWeeklyChallenges() {
        var self = this;
        return this.getMeta().then(function(meta) {
            if (!meta.weeklyChallenges) {
                meta.weeklyChallenges = { challenges: [], lastReset: 0 };
                return self._generateWeeklyChallenges(meta).then(function() { return meta.weeklyChallenges; });
            }
            var now = Date.now();
            var last = meta.weeklyChallenges.lastReset || 0;
            if (now - last > 7 * 24 * 60 * 60 * 1000) {
                meta.weeklyChallenges = { challenges: [], lastReset: 0 };
                return self._generateWeeklyChallenges(meta).then(function() { return meta.weeklyChallenges; });
            }
            return meta.weeklyChallenges;
        });
    }

    _generateWeeklyChallenges(meta) {
        var weeklyPool = [
            { id: 'weekly_kill_500', name: '周常·屠龙', desc: '单局击杀 500 个敌人', reward: { metaTokens: 200, bossCores: 10 }, check: function(s) { return s.kills >= 500; }, threshold: 500 },
            { id: 'weekly_survive_30min', name: '周常·坚守', desc: '单局存活 30 分钟', reward: { metaTokens: 150, bossCores: 8 }, check: function(s) { return s.elapsed >= 1800; }, threshold: 1800 },
            { id: 'weekly_abyss_20', name: '周常·深渊领主', desc: '抵达深渊第 20 层', reward: { metaTokens: 300, bossCores: 15 }, check: function(s) { return s.abyssDepth >= 20; }, threshold: 20 },
            { id: 'weekly_od_20', name: '周常·怒意沸腾', desc: '单局触发 20 次 Overdrive', reward: { metaTokens: 250, bossCores: 12 }, check: function(s) { return s.overdriveCount >= 20; }, threshold: 20 },
            { id: 'weekly_dodge_100', name: '周常·幻影千重', desc: '单局闪避 100 次', reward: { metaTokens: 180, bossCores: 8 }, check: function(s) { return s.dodges >= 100; }, threshold: 100 },
            { id: 'weekly_crit_200', name: '周常·天崩地裂', desc: '单局暴击 200 次', reward: { metaTokens: 160, bossCores: 8 }, check: function(s) { return s.crits >= 200; }, threshold: 200 }
        ];
        var now = Date.now();
        var seed = Math.floor(now / (7 * 24 * 60 * 60 * 1000));
        var indices = [];
        var h = seed;
        for (var i = 0; i < 3 && indices.length < weeklyPool.length; i++) {
            h = (h * 1103515245 + 12345) & 0x7fffffff;
            var idx = h % weeklyPool.length;
            if (indices.indexOf(idx) === -1) indices.push(idx);
        }
        meta.weeklyChallenges = {
            challenges: indices.map(function(ix) { return weeklyPool[ix]; }),
            lastReset: now
        };
        return Promise.resolve();
    }

    checkWeeklyCompletion(stats) {
        var meta = this._metaCache || {};
        var weekly = meta.weeklyChallenges;
        if (!weekly || !weekly.challenges) return { completed: [], bonusTokens: 0, bonusCores: 0 };
        var completed = [];
        var bonusTokens = 0;
        var bonusCores = 0;
        for (var i = 0; i < weekly.challenges.length; i++) {
            var ch = weekly.challenges[i];
            if (ch.check(stats)) {
                completed.push(ch.id);
                bonusTokens += (ch.reward.metaTokens || 0);
                bonusCores += (ch.reward.bossCores || 0);
            }
        }
        return { completed: completed, bonusTokens: bonusTokens, bonusCores: bonusCores };
    }
}

window.saveManager = new SaveManager();
