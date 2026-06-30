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
        return { cores: cores, level: level, nextLevelCores: (level+1)*(level+1), perks: [] };
    };

    SaveManager.prototype.doPrestige = async function() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var info = self.getPrestigeInfo();
            if (info.cores < (info.level+1)*(info.level+1)) return { ok: false, reason: '核心不足' };
            meta.bossCores = info.cores - (info.level+1)*(info.level+1);
            meta.prestigeLevel = (info.level || 0) + 1;
            meta.prestigeCoresSpent = (meta.prestigeCoresSpent || 0) + (info.level+1)*(info.level+1);
            return self.saveMeta(meta).then(function() { return { ok: true, newLevel: meta.prestigeLevel }; });
        });
    };

    SaveManager.prototype.spendMetaTokens = async function(perkId) {
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
            rewardClaimed: !!season.lastRewardClaimed
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

})();
