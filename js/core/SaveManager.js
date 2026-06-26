class SaveManager {
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
                fullSetActivated: false
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
        /* 成本曲线：线性增长 */
        const cost = (currentLevel + 1) * (talentId === 'starting_weapons' ? 5 : (talentId === 'core_resonance' ? 4 : 1));
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

    /* ── 结算代币 ── */

    calcMetaTokens(kills, elapsed) {
        return Math.floor(kills * 0.1 + elapsed * 0.05);
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
}

window.saveManager = new SaveManager();
