/**
 * SaveManager 聚合入口
 * 保留原始构造函数、静态属性和全局挂载
 * 功能分散在 SaveManager.Core.js / Season.js / Weekly.js / Compendium.js / RunStats.js
 */
class SaveManager {
    static CHALLENGE_POOL = [
        { id: 'kill_50', name: '初鸣', desc: '单局击杀 50 个敌人', reward: { metaTokens: 30 }, check: function(stats) { return stats.kills >= 50; } },
        { id: 'kill_100', name: '百胡斩', desc: '单局击杀 100 个敌人', reward: { metaTokens: 60 }, check: function(stats) { return stats.kills >= 100; } },
        { id: 'overdrive_3', name: '怒番沸腾', desc: '单局触发 3 次 Overdrive', reward: { bossCores: 1 }, check: function(stats) { return stats.overdriveCount >= 3; } },
        { id: 'overdrive_10', name: '狂番不息', desc: '单局触发 10 次 Overdrive', reward: { bossCores: 3 }, check: function(stats) { return stats.overdriveCount >= 10; } },
        { id: 'survive_300', name: '久战雀士', desc: '单局存活 5 分钟', reward: { metaTokens: 40 }, check: function(stats) { return stats.elapsed >= 300; } },
        { id: 'survive_600', name: '百战雀魂', desc: '单局存活 10 分钟', reward: { metaTokens: 80 }, check: function(stats) { return stats.elapsed >= 600; } },
        { id: 'gold_500', name: '财源番涨', desc: '单局获取 500 金币', reward: { metaTokens: 25 }, check: function(stats) { return stats.maxGold >= 500; } },
        { id: 'gold_1000', name: '金玉满番', desc: '单局获取 1000 金币', reward: { metaTokens: 50 }, check: function(stats) { return stats.maxGold >= 1000; } },
        { id: 'no_damage', name: '无伤胡', desc: '单局 0 受击通关', reward: { bossCores: 2 }, check: function(stats) { return stats.hitsTaken === 0 && stats.won; } },
        { id: 'relics_10', name: '百家番长', desc: '单局收集 10 种不同圣物', reward: { metaTokens: 35 }, check: function(stats) { return stats.uniqueRelics >= 10; } },
        { id: 'boss_lord_kill', name: '斩雀行动', desc: '击杀 Boss Lord', reward: { metaTokens: 20 }, check: function(stats) { return stats.bossKills >= 1; } },
        { id: 'abyss_5', name: '深渊雀行', desc: '抵达深渊第 5 层', reward: { bossCores: 2 }, check: function(stats) { return stats.abyssDepth >= 5; } },
        { id: 'dodge_20', name: '幻影自摸', desc: '单局闪避 20 次', reward: { metaTokens: 30 }, check: function(stats) { return stats.dodges >= 20; } },
        { id: 'crit_30', name: '暴击一胡', desc: '单局暴击 30 次', reward: { metaTokens: 25 }, check: function(stats) { return stats.crits >= 30; } },
        { id: 'wave_15', name: '番牌不息', desc: '单局完成 15 波', reward: { metaTokens: 45 }, check: function(stats) { return stats.waves >= 15; } }
    ];

    static DAILY_QUEST_POOL = [
        { id: 'dq_kill_30', name: '连番30', desc: '单局击杀 30 个敌人', check: function(s) { return s.kills >= 30; }, reward: { metaTokens: 20, bossCores: 1 } },
        { id: 'dq_gold_300', name: '掘金番', desc: '单局获取 300 金币', check: function(s) { return s.maxGold >= 300; }, reward: { metaTokens: 15 } },
        { id: 'dq_no_hit_1', name: '无畏胡', desc: '单局 0 受击通关', check: function(s) { return s.hitsTaken === 0 && s.won; }, reward: { metaTokens: 30, bossCores: 2 } },
        { id: 'dq_overdrive_2', name: '怒番', desc: '单局触发 2 次 Overdrive', check: function(s) { return s.overdriveCount >= 2; }, reward: { bossCores: 1 } },
        { id: 'dq_wave_10', name: '坚守番', desc: '通关 10 波', check: function(s) { return s.waves >= 10; }, reward: { metaTokens: 25 } },
        { id: 'dq_crit_15', name: '胡牌大师', desc: '单局暴击 15 次', check: function(s) { return s.crits >= 15; }, reward: { metaTokens: 20 } },
        { id: 'dq_dodge_10', name: '幻影自摸', desc: '单局闪避 10 次', check: function(s) { return s.dodges >= 10; }, reward: { metaTokens: 15 } },
        { id: 'dq_abyss_3', name: '深渊探索', desc: '抵达深渊第 3 层', check: function(s) { return s.abyssDepth >= 3; }, reward: { metaTokens: 30, bossCores: 2 } }
    ];

    static _vaultMultipliers = [
        { bet: 10,  multiplier: 1, label: '入门 (押注 10)' },
        { bet: 25,  multiplier: 2, label: '进阶 (押注 25)' },
        { bet: 50,  multiplier: 3, label: '豪赌 (押注 50)' }
    ];

    constructor() {
        this._metaCache = null;
        /* M-005: 监听跨页面 localStorage 变更，使缓存失效 */
        var self = this;
        window.addEventListener('storage', function(e) {
            if (e && (e.key === 'cr_meta.json' || e.key === 'cr_active_run.json')) {
                self._metaCache = null;
            }
            /* R116-P1: 同时监听 active_run 变更，防止跨 Tab 状态下缓存不一致 */
            /* R128-P2: _activeRunCache 为死代码（从未赋值），仅保留注释 */
        });
    }

    async init() {
        if (this._metaCache) return;
        await this.getMeta();
    }

    /* ── 科技树 ── */

    getTechTree() {
        var meta = this._metaCache || {};
        return meta.techTree || { life_enhancement: 0, sharpening: 0, precision_training: 0 };
    }

    async upgradeTech(techId) {
        var meta = await this.getMeta();
        if (!meta.techTree) meta.techTree = { life_enhancement: 0, sharpening: 0, precision_training: 0 };
        var currentLevel = meta.techTree[techId] || 0;
        if (currentLevel >= 20) return false;
        var cost = this._techCost(techId, currentLevel);
        if ((meta.metaTokens || 0) >= cost) {
            meta.metaTokens -= cost;
            meta.techTree[techId] = currentLevel + 1;
            await this.saveMeta(meta);
            return true;
        }
        return false;
    }

    _techCost(techId, level) {
        var costs = { life_enhancement: 5, sharpening: 8, precision_training: 10 };
        return (costs[techId] || 5) * (level + 1);
    }

    /* ── 天赋树 ── */

    getBossCores() { return (this._metaCache && this._metaCache.bossCores) || 0; }

    getTalents() {
        var meta = this._metaCache || {};
        return meta.talents || {
            hu_patro: 0,           // 糊牌护盾 — 初始HP
            zimo_speed: 0,         // 自摸疾行 — 移速
            lian_magnet: 0,        // 连营聚宝 — 吸附
            que_forge: 0,          // 雀坛铸牌 — 开局双兵
            ting_intuition: 0,     // 听牌直觉 — 暴击
            gang_hardiness: 0,     // 杠上硬气 — 减伤
            mo_pa_cd: 0,           // 摸牌快手 — CD缩减
            kaiju_weapons: 0,      // 开局双牌 — 额外武器槽
            he_resonance: 0,       // 和牌共鸣 — Boss掉落
            que_spirit_shield: 0   // 雀魂护体 — 周期护盾
        };
    }

    _talentCostExponential(talentId, level) {
        var bases = {
            hu_patro: 1, zimo_speed: 1, lian_magnet: 1, que_forge: 1,
            ting_intuition: 1, gang_hardiness: 1, mo_pa_cd: 1,
            kaiju_weapons: 5, he_resonance: 4, que_spirit_shield: 2
        };
        var base = bases[talentId] || 1;
        return Math.floor(base * Math.pow(1.6, level));
    }

    async upgradeTalent(talentId) {
        var meta = await this.getMeta();
        if (!meta.talents) meta.talents = {
            hu_patro: 0, zimo_speed: 0, lian_magnet: 0, que_forge: 0,
            ting_intuition: 0, gang_hardiness: 0, mo_pa_cd: 0,
            kaiju_weapons: 0, he_resonance: 0, que_spirit_shield: 0
        };
        var currentLevel = meta.talents[talentId] || 0;
        var maxLevels = {
            hu_patro: 5, zimo_speed: 5, lian_magnet: 3, que_forge: 1,
            ting_intuition: 5, gang_hardiness: 5, mo_pa_cd: 5,
            kaiju_weapons: 1, he_resonance: 5, que_spirit_shield: 3
        };
        var maxLevel = maxLevels[talentId] || 5;
        if (currentLevel >= maxLevel) return { ok: false, reason: '已达满级' };
        var cost = this._talentCostExponential(talentId, currentLevel);
        if (meta.inflationGuard) {
            var factor = 1 + Math.min((meta.inflationGuard.totalMetaTokens || 0) / 5000, 1.0);
            cost = Math.ceil(cost * factor);
        }
        if ((meta.bossCores || 0) < cost) return { ok: false, reason: '魔王核心不足' };
        meta.bossCores -= cost;
        /* R113-P0: 记录通胀，防止无限刷元代币满级天赋 */
        if (typeof this.recordInflation === 'function') this.recordInflation(cost);
        meta.talents[talentId] = currentLevel + 1;
        await this.saveMeta(meta);
        return { ok: true };
    }

    /* ── 元货币 ── */

    /* R152-P0: 改为async，传入meta快照防竞态 */
    async addMetaTokens(amount) {
        var meta = this._metaCache || {};
        meta.metaTokens = (meta.metaTokens || 0) + amount;
        this._metaCache = meta;
        return this._saveMetaToStorage(meta);
    }

    calcMetaTokens(kills, elapsed) { return Math.floor(kills * 0.1 + elapsed * 0.05); }

    /* ── 英雄管理 ── */

    getCurrentHero() { return (this._metaCache && this._metaCache.currentHero) || 'Hero'; }

    async setCurrentHero(id) {
        if (!this._metaCache) return { ok: false, reason: '存档未初始化' };
        var reg = window.heroRegistry;
        if (!reg || !reg.getHero(id)) return { ok: false, reason: '英雄不存在' };
        var unlocked = this._metaCache.unlockedHeroes || [];
        if (unlocked.indexOf(id) === -1) return { ok: false, reason: '英雄未解锁' };
        this._metaCache.currentHero = id;
        this._metaCache.currentSelectedHero = id;
        await this._saveMetaToStorage();
        return { ok: true };
    }

    async unlockHero(id, cost) {
        if (!this._metaCache) return { ok: false, reason: '存档未初始化' };
        var reg = window.heroRegistry;
        var hero = reg && reg.getHero(id);
        if (!hero) return { ok: false, reason: '英雄不存在' };
        var unlocked = this._metaCache.unlockedHeroes = this._metaCache.unlockedHeroes || [];
        if (unlocked.indexOf(id) !== -1) return { ok: false, reason: '已解锁' };
        var cores = this._metaCache.bossCores || 0;
        if (cores < cost) return { ok: false, reason: '核心不足（需 ' + cost + ' 枚）' };
        this._metaCache.bossCores = cores - cost;
        unlocked.push(id);
        await this._saveMetaToStorage();
        return { ok: true };
    }

    /* ── 装备管理 ── */

    /* R152-P0: 改为async，传入meta快照防竞态 */
    async equipItem(instanceId) {
        if (!this._metaCache) return { ok: false, reason: '存档未初始化' };
        var eqs = this._metaCache.equipments || [];
        var item = null;
        for (var i = 0; i < eqs.length; i++) { if (eqs[i].instanceId === instanceId) { item = eqs[i]; break; } }
        if (!item) return { ok: false, reason: '装备不存在' };
        var slot = item.slot;
        if (!slot) return { ok: false, reason: '部位不明' };
        var equipped = this._metaCache.equipped = this._metaCache.equipped || { weapon: null, armor: null, talisman: null };
        /* R65-P0: 只更新装备槽引用，不删除背包条目 */
        equipped[slot] = instanceId;
        return this._saveMetaToStorage(this._metaCache);
    }

    /* R152-P0: 改为async，传入meta快照防竞态 */
    async unequipSlot(slot) {
        if (!this._metaCache) return { ok: false, reason: '存档未初始化' };
        var equipped = this._metaCache.equipped = this._metaCache.equipped || { weapon: null, armor: null, talisman: null };
        equipped[slot] = null;
        return this._saveMetaToStorage(this._metaCache);
    }

    async rerollAffix(instanceId, affixIndex, cost) {
        if (!this._metaCache) return { ok: false, reason: '存档未初始化' };
        var eqs = this._metaCache.equipments || [];
        var item = null;
        for (var i = 0; i < eqs.length; i++) { if (eqs[i].instanceId === instanceId) { item = eqs[i]; break; } }
        if (!item) return { ok: false, reason: '装备不存在' };
        if (!item.affixes || affixIndex < 0 || affixIndex >= item.affixes.length) return { ok: false, reason: '词条索引无效' };
        var cores = this._metaCache.bossCores || 0;
        if (cores < cost) return { ok: false, reason: '核心不足（需 ' + cost + ' 枚）' };
        this._metaCache.bossCores = cores - cost;
        var reg = window.equipmentRegistry;
        if (reg && typeof reg.getRandomAffix === 'function') {
            item.affixes[affixIndex] = reg.getRandomAffix();
        }
        await this._saveMetaToStorage();
        return { ok: true, newItem: item };
    }

    /* ── 存档保存 ── */

    async saveToStorage() {
        if (this._metaCache) await this.saveMeta(this._metaCache);
    }
}

window.saveManager = new SaveManager();
