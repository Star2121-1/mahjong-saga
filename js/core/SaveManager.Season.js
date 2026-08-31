/**
 * SaveManager.Season — 赛季/声望/精英模式/通胀
 * 挂载到 SaveManager.prototype
 */
(function() {
    'use strict';

    /* ── Epoch 16: 声望/转生系统 ── */

    SaveManager.prototype.getPrestigeInfo = function() {
        var meta = this._metaCache || {};
        var cores = meta.bossCores || 0;
        var level = Math.floor(Math.sqrt(cores));
        var nextLevelCores = (level+1)*(level+1);
        /* R31-E-003: 补全声望UI消费方所需的fields */
        return {
            cores: cores,
            level: level,
            nextLevelCores: nextLevelCores,
            points: cores,
            potential: nextLevelCores,
            canPrestige: cores >= nextLevelCores,
            perks: []
        };
    };

    SaveManager.prototype.doPrestige = async function() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var info = self.getPrestigeInfo();
            /* R119-P0: 修正声望公式 — 原(info.level+1)^2恒大于info.cores(因level=floor(sqrt(cores)))导致守卫永远为false */
            var cost = 2 * (info.level || 0) + 1;
            if (info.cores < cost) return { ok: false, reason: '核心不足' };
            meta.bossCores = info.cores - cost;
            meta.prestigeLevel = (info.level || 0) + 1;
            meta.prestigeCoresSpent = (meta.prestigeCoresSpent || 0) + cost;
            return self.saveMeta(meta).then(function() { return { ok: true, newLevel: meta.prestigeLevel }; });
        });
    };

    SaveManager.prototype.spendMetaTokens = async function(perkId, cost) {
        var self = this;
        return this.getMeta().then(function(meta) {
            var actualCost = cost || 100;
            if ((meta.metaTokens || 0) < actualCost) return { ok: false, reason: '元代币不足' };
            meta.metaTokens -= actualCost;
            if (!meta.purchasedPerks) meta.purchasedPerks = {};
            if (!meta.purchasedPerks[perkId]) meta.purchasedPerks[perkId] = 0;
            meta.purchasedPerks[perkId]++;
            return self.saveMeta(meta).then(function() { return { ok: true }; });
        });
    };

    /* ── Epoch 22: 通胀防护 ── */

    SaveManager.prototype.getTalentCostWithInflation = function(talentId, level) {
        var meta = this._metaCache || {};
        var spent = meta.inflationGuard || {};
        var totalSpent = spent.totalMetaTokens || 0;
        var factor = 1 + Math.min(totalSpent / 5000, 1.0);
        var base = this._talentCostExponential(talentId, level);
        return Math.ceil(base * factor);
    };

    SaveManager.prototype.recordInflation = function(metaTokensSpent) {
        var meta = this._metaCache || {};
        if (!meta.inflationGuard) meta.inflationGuard = {};
        meta.inflationGuard.totalMetaTokens = (meta.inflationGuard.totalMetaTokens || 0) + (metaTokensSpent || 0);
        meta.inflationGuard.lastReset = Date.now();
    };

    SaveManager.prototype.resetInflationCounter = function() {
        var meta = this._metaCache || {};
        if (!meta.inflationGuard) meta.inflationGuard = {};
        meta.inflationGuard.totalMetaTokens = 0;
        meta.inflationGuard.lastReset = Date.now();
    };

    /* ── Epoch 22: 赛季触发 ── */

    SaveManager.prototype.checkSeasonTrigger = function() {
        var meta = this._metaCache || {};
        var season = meta.season || {};
        if (season.currentSeason > 0) return Promise.resolve({ triggered: false });
        var totalWins = meta.runStats && meta.runStats.wins || 0;
        var bestAbyss = meta.highestEndlessLoop || 0;
        if (totalWins >= 5) return this.activateSeason();
        if (bestAbyss >= 10) return this.activateSeason();
        return Promise.resolve({ triggered: false, reason: '未满足赛季激活条件（需 5 胜或深渊 10 层）' });
    };

    SaveManager.prototype.activateSeason = async function() {
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
    };

    SaveManager.prototype.getSeasonStatus = function() {
        var meta = this._metaCache || {};
        var season = meta.season || {};
        if (!season.currentSeason || season.currentSeason <= 0) return { isActive: false };
        var startDate = season.startDate || Date.now();
        var daysElapsed = Math.floor((Date.now() - startDate) / 86400000);
        return {
            isActive: true, season: season.currentSeason,
            daysElapsed: daysElapsed,
            rewardClaimed: !!(season.claimedRewards && season.claimedRewards['s' + season.currentSeason]) /* P0: 使用正确字段 */
        };
    };

    SaveManager.prototype.getSeasonReward = function(seasonNum) {
        var rewards = [
            { metaTokens: 100, bossCores: 5 },
            { metaTokens: 200, bossCores: 10 },
            { metaTokens: 400, bossCores: 20 }
        ];
        var idx = Math.min(seasonNum - 1, rewards.length - 1);
        return rewards[idx];
    };

    SaveManager.prototype.getDailyChallengeCountdown = function() {
        var meta = this._metaCache || {};
        var dc = meta.dailyChallenges || {};
        var last = dc.lastRotation || 0;
        if (last === 0) return 86400000;
        var remaining = 86400000 - (Date.now() - last);
        return Math.max(0, remaining);
    };

    SaveManager.prototype.formatCountdown = function(ms) {
        var totalSec = Math.floor(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        return h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    };

    SaveManager.prototype.claimSeasonReward = async function() {
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
    };

    /* ── Epoch 47: 赛季通行证 (Battle Pass) ── */

    SaveManager.prototype.getBattlePassData = function() {
        var meta = this._metaCache || {};
        var season = meta.season || {};
        var bp = season.battlePass || {};
        return {
            tier: bp.currentTier || 0,
            claimedTiers: bp.claimedTiers || [],
            premium: bp.premium || false,
            xp: bp.xp || 0
        };
    };

    SaveManager.prototype.addBattlePassXP = function(amount) {
        var self = this;
        return this.getMeta().then(function(meta) {
            var season = meta.season || {};
            if (!season.battlePass) season.battlePass = { currentTier: 0, claimedTiers: [], premium: false, xp: 0 };
            var bp = season.battlePass;
            bp.xp = (bp.xp || 0) + amount;
            /* 每 100 XP 升 1 级 */
            while (bp.xp >= 100 && bp.currentTier < 30) {
                bp.xp -= 100;
                bp.currentTier++;
            }
            if (bp.currentTier >= 30) bp.currentTier = 30; /* 满级 */
            meta.season = season;
            return self.saveMeta(meta).then(function() { return { tier: bp.currentTier, xp: bp.xp }; });
        });
    };

    SaveManager.prototype.claimBattlePassTier = async function(tier) {
        var self = this;
        return this.getMeta().then(function(meta) {
            var season = meta.season || {};
            if (!season.battlePass) return { ok: false, reason: '无通行证数据' };
            var bp = season.battlePass;
            if (tier <= 0 || tier > 30) return { ok: false, reason: '无效等级' };
            if (tier > (bp.currentTier || 0)) return { ok: false, reason: '等级不足' };
            if (!bp.claimedTiers) bp.claimedTiers = [];
            if (bp.claimedTiers.indexOf(tier) !== -1) return { ok: false, reason: '已领取' };
            bp.claimedTiers.push(tier);
            /* 奖励 */
            var reward = BattlePassRewards[tier - 1];
            if (reward) {
                if (reward.metaTokens) meta.metaTokens = (meta.metaTokens || 0) + reward.metaTokens;
                if (reward.bossCores) meta.bossCores = (meta.bossCores || 0) + reward.bossCores;
                if (reward.premium && !bp.premium) {
                    /* 免费玩家不能领Premium奖励 */
                    bp.claimedTiers.pop();
                    return { ok: false, reason: '需要购买高级通行证' };
                }
            }
            meta.season = season;
            return self.saveMeta(meta).then(function() { return { ok: true, reward: reward }; });
        });
    };

    SaveManager.prototype.buyBattlePassPremium = async function() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var season = meta.season || {};
            if (!season.battlePass) season.battlePass = {};
            if (season.battlePass.premium) return { ok: false, reason: '已是高级' };
            if ((meta.metaTokens || 0) < 100) return { ok: false, reason: '需要 100 元代币' };
            meta.metaTokens -= 100;
            season.battlePass.premium = true;
            meta.season = season;
            return self.saveMeta(meta).then(function() { return { ok: true }; });
        });
    };

    /* 30层通行证奖励表 */
    window.BattlePassRewards = [
        { metaTokens: 5 },                          /* Tier 1 */
        { metaTokens: 5 },                          /* Tier 2 */
        { premium: true, metaTokens: 10, bossCores: 1 }, /* Tier 3 Premium */
        { metaTokens: 10 },                         /* Tier 4 Free */
        { metaTokens: 10 },                         /* Tier 5 */
        { premium: true, metaTokens: 15, bossCores: 2 }, /* Tier 6 Premium */
        { metaTokens: 15 },                         /* Tier 7 */
        { metaTokens: 15 },                         /* Tier 8 */
        { metaTokens: 20 },                         /* Tier 9 */
        { premium: true, metaTokens: 20, bossCores: 3 }, /* Tier 10 Premium */
        { metaTokens: 20 },                         /* Tier 11 */
        { metaTokens: 20 },                         /* Tier 12 */
        { metaTokens: 25 },                         /* Tier 13 */
        { metaTokens: 25 },                         /* Tier 14 */
        { metaTokens: 30 },                         /* Tier 15 */
        { premium: true, metaTokens: 30, bossCores: 5 }, /* Tier 16 Premium */
        { metaTokens: 30 },                         /* Tier 17 */
        { metaTokens: 30 },                         /* Tier 18 */
        { metaTokens: 35 },                         /* Tier 19 */
        { metaTokens: 35 },                         /* Tier 20 */
        { premium: true, metaTokens: 40, bossCores: 8 }, /* Tier 21 Premium */
        { metaTokens: 40 },                         /* Tier 22 */
        { metaTokens: 40 },                         /* Tier 23 */
        { metaTokens: 50 },                         /* Tier 24 */
        { metaTokens: 50 },                         /* Tier 25 */
        { premium: true, metaTokens: 60, bossCores: 10 }, /* Tier 26 Premium */
        { metaTokens: 60 },                         /* Tier 27 */
        { metaTokens: 60 },                         /* Tier 28 */
        { metaTokens: 80 },                         /* Tier 29 */
        { premium: true, metaTokens: 100, bossCores: 15 }  /* Tier 30 Premium */
    ];

    /* ── Epoch 15: 精英模式 ── */

    SaveManager.prototype.enableEliteMode = async function() {
        var self = this;
        return this.getMeta().then(function(meta) {
            meta.eliteMode = true;
            return self.saveMeta(meta).then(function() { return { ok: true }; });
        });
    };

    SaveManager.prototype.disableEliteMode = async function() {
        var self = this;
        return this.getMeta().then(function(meta) {
            meta.eliteMode = false;
            return self.saveMeta(meta).then(function() { return { ok: true }; });
        });
    };

    SaveManager.prototype.isEliteMode = function() {
        var meta = this._metaCache || {};
        return !!meta.eliteMode;
    };

    /* ── Epoch 33: 声望加成应用 ── */
    SaveManager.prototype.applyPrestigeBonus = function(player) {
        var meta = this._metaCache || {};
        var level = meta.prestigeLevel || 0;
        if (level <= 0) return;
        /* P0: 直接修改实际战斗属性，而非写入死字段 atkBonus/hpBonus */
        player.atk += level * 0.5;
        var hpGain = level * 2;
        player.maxHp += hpGain;
        player.hp += hpGain;
    };

})();
