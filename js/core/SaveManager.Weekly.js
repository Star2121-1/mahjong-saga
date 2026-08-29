/**
 * SaveManager.Weekly — 周常挑战/每日任务/登录奖励/运行历史
 * 挂载到 SaveManager.prototype
 */
(function() {
    'use strict';

    /* ── Epoch 14: 挑战系统 ── */

    SaveManager.prototype._initChallenges = function() {
        var self = this;
        return this.getMeta().then(function(meta) {
            if (!meta.challenges) {
                meta.challenges = { active: [], completed: {}, lastRotation: 0 };
                return self._rotateChallenges(meta).then(function() { return meta.challenges; });
            }
            return meta.challenges;
        });
    };

    SaveManager.prototype._rotateChallenges = async function(meta) {
        var now = Date.now();
        var last = meta.challenges && meta.challenges.lastRotation ? meta.challenges.lastRotation : 0;
        if (now - last < 6 * 60 * 60 * 1000) return false;
        var rng = Math.floor(now / 1000) % SaveManager.CHALLENGE_POOL.length;
        var active = [];
        for (var i = 0; i < 3; i++) {
            var idx = (rng + i) % SaveManager.CHALLENGE_POOL.length;
            active.push(SaveManager.CHALLENGE_POOL[idx]);
        }
        meta.challenges.active = active;
        meta.challenges.lastRotation = now;
        await this.saveMeta(meta);
        return true;
    };

    /* ── Epoch 15: 每周金库 ── */

    SaveManager.prototype.getWeeklyVault = function() {
        var meta = this._metaCache || {};
        return meta.weeklyVault || { active: false, challenge: null, bet: 0, completed: false, reward: null };
    };

    SaveManager.prototype.openWeeklyVault = async function(betTier) {
        var self = this;
        return this.getMeta().then(function(meta) {
            var vault = meta.weeklyVault || {};
            if (vault.active && !vault.completed) return { ok: false, reason: '已有活跃金库挑战' };
            if (vault.active && vault.completed) return { ok: false, reason: '已完成，请领取奖励' };
            var tier = null;
            for (var i = 0; i < SaveManager._vaultMultipliers.length; i++) {
                if (SaveManager._vaultMultipliers[i].bet === betTier) { tier = SaveManager._vaultMultipliers[i]; break; }
            }
            if (!tier) return { ok: false, reason: '无效押注档位' };
            if ((meta.metaTokens || 0) < tier.bet) return { ok: false, reason: '元代币不足' };
            meta.metaTokens -= tier.bet;
            var pool = SaveManager.CHALLENGE_POOL;
            var idx = Math.floor(Math.random() * pool.length);
            var challenge = pool[idx];
            var doubledReward = {};
            if (challenge.reward.metaTokens) doubledReward.metaTokens = challenge.reward.metaTokens * tier.multiplier;
            if (challenge.reward.bossCores) doubledReward.bossCores = challenge.reward.bossCores * tier.multiplier;
            vault.active = true;
            vault.challenge = { id: challenge.id, name: challenge.name, desc: challenge.desc, reward: doubledReward };
            vault.bet = tier.bet;
            vault.multiplier = tier.multiplier;
            vault.completed = false;
            vault.reward = null;
            meta.weeklyVault = vault;
            return self.saveMeta(meta).then(function() {
                return { ok: true, challenge: vault.challenge, bet: tier.bet };
            });
        });
    };

    SaveManager.prototype.abandonWeeklyVault = async function() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var vault = meta.weeklyVault || {};
            if (!vault.active) return { ok: false, reason: '没有活跃金库' };
            if (vault.completed) return { ok: false, reason: '已完成的金库不能放弃' };
            meta.metaTokens = (meta.metaTokens || 0) + vault.bet;
            vault.active = false; vault.challenge = null; vault.bet = 0;
            vault.completed = false; vault.reward = null;
            meta.weeklyVault = vault;
            return self.saveMeta(meta).then(function() { return { ok: true }; });
        });
    };

    SaveManager.prototype.evaluateWeeklyVault = function(runStats) {
        var self = this;
        var meta = this._metaCache || {};
        var vault = meta.weeklyVault || {};
        if (!vault.active || !vault.challenge || vault.completed) return { evaluated: false };
        var checkFn = vault.challenge ? (SaveManager.CHALLENGE_POOL.find(function(c) { return c.id === vault.challenge.id; }) || {}).check : null;
        if (checkFn && checkFn(runStats)) {
            vault.completed = true;
            vault.reward = vault.challenge.reward;
            meta.weeklyVault = vault;
            this._metaCache = meta;
            /* 持久化完成状态 */
            self._saveMetaToStorage();
            return { evaluated: true, completed: true, reward: vault.reward };
        }
        return { evaluated: true, completed: false };
    };

    SaveManager.prototype.claimWeeklyVaultReward = async function() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var vault = meta.weeklyVault || {};
            if (!vault.completed) return { ok: false, reason: '未完成金库挑战' };
            if (vault.reward) {
                meta.metaTokens = (meta.metaTokens || 0) + (vault.reward.metaTokens || 0);
                meta.bossCores = (meta.bossCores || 0) + (vault.reward.bossCores || 0);
            }
            vault.active = false; vault.challenge = null; vault.bet = 0;
            vault.completed = false; vault.reward = null;
            meta.weeklyVault = vault;
            return self.saveMeta(meta).then(function() { return { ok: true }; });
        });
    };

    /* ── Epoch 15: 每日登录奖励 ── */

    SaveManager.prototype._todayKey = function() {
        var d = new Date();
        return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
    };

    SaveManager.prototype.checkDailyLogin = async function() {
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
            if (isNewStreak) { streak++; }
            else {
                if (makeup > 0) { meta.makeupTokens = makeup - 1; }
                else { streak = 1; }
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
    };

    SaveManager.prototype.claimDailyReward = async function() {
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
    };

    SaveManager.prototype._getDailyReward = function(streak) {
        if (streak >= 30) return { metaTokens: 200, bossCores: 5, label: '月冠' };
        if (streak >= 14) return { metaTokens: 100, bossCores: 3, label: '双周' };
        if (streak >= 7)  return { metaTokens: 50, bossCores: 2, label: '周冠' };
        if (streak >= 3)  return { metaTokens: 20, bossCores: 1, label: '连胜' };
        return { metaTokens: 5, bossCores: 0, label: '日常' };
    };

    SaveManager.prototype.claimMakeup = async function() {
        var self = this;
        return this.getMeta().then(function(meta) {
            var makeup = meta.makeupTokens || 0;
            if (makeup <= 0) return { ok: false, reason: '没有补签 token' };
            if (meta.lastLoginDate === self._todayKey()) return { ok: false, reason: '今日已登录' };
            var yesterday = new Date(Date.now() - 86400000);
            var yKey = yesterday.getFullYear() + '-' + (yesterday.getMonth()+1) + '-' + yesterday.getDate();
            if (meta.lastLoginDate !== yKey && meta.lastLoginDate !== '') {
                return { ok: false, reason: '无法补签' };
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
    };

    /* ── 每日任务 ── */

    SaveManager.prototype.getDailyQuests = function() {
        var meta = this._metaCache || {};
        if (!meta.dailyQuests) meta.dailyQuests = { quests: [], lastDate: 0 };
        var today = this._todayKey();
        if (meta.dailyQuests.lastDate !== today) {
            var pool = SaveManager.DAILY_QUEST_POOL;
            var seed = today.charCodeAt(today.length - 1) + today.charCodeAt(0);
            var indices = []; var h = seed;
            for (var i = 0; i < 3 && indices.length < pool.length; i++) {
                h = (h * 1103515245 + 12345) & 0x7fffffff;
                var idx = h % pool.length;
                if (indices.indexOf(idx) === -1) indices.push(idx);
            }
            meta.dailyQuests = {
                quests: indices.map(function(ix) { return { id: pool[ix].id, completed: false }; }),
                lastDate: today, claimed: {}
            };
        }
        return meta.dailyQuests;
    };

    SaveManager.prototype.checkDailyQuestCompletion = function(stats) {
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
    };

    SaveManager.prototype.claimDailyQuestReward = async function(questId) {
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
    };

    /* ── Epoch 15: 运行历史 ── */

    SaveManager.prototype.recordRunHistory = async function(heroId, levelId, kills, elapsed, won, loopCount, relics, weeklyCompleted) {
        var self = this;
        return this.getMeta().then(function(meta) {
            if (!meta.runHistory) meta.runHistory = [];
            var entry = {
                timestamp: Date.now(), heroId: heroId, levelId: levelId,
                kills: kills, elapsed: elapsed, won: won, loopCount: loopCount,
                relics: relics,
                metaTokensEarned: self.calcMetaTokens(kills, elapsed),
                weeklyCompleted: weeklyCompleted || []
            };
            meta.runHistory.unshift(entry);
            if (meta.runHistory.length > 50) meta.runHistory = meta.runHistory.slice(0, 50);
            return self.saveMeta(meta).then(function() { return entry; });
        });
    };

    SaveManager.prototype.getRunHistory = function(limit) {
        limit = limit || 20;
        var meta = this._metaCache || {};
        var history = meta.runHistory || [];
        return history.slice(0, limit);
    };

    /* ── 周常挑战 ── */

    SaveManager.prototype.getWeeklyChallenges = function() {
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
        /* Deterministic shuffle using weekKey as seed (Linear Congruential Generator) */
        var seed = 0;
        for (var _ci = 0; _ci < (weekKey || '').length; _ci++) seed = ((seed << 5) - seed + (weekKey || '').charCodeAt(_ci)) | 0;
        var shuffled = allChallenges.slice();
        for (var _i = shuffled.length - 1; _i > 0; _i--) {
            seed = (seed * 1103515245 + 12345) | 0;
            var _j = Math.abs(seed) % (_i + 1);
            var _t = shuffled[_i]; shuffled[_i] = shuffled[_j]; shuffled[_j] = _t;
        }
        var picked = shuffled.slice(0, 4);
        for (var i = 0; i < picked.length; i++) { picked[i].progress = 0; picked[i].completed = false; }
        meta.currentWeek = weekKey || ('W' + Math.floor((Date.now() - Date.UTC(2025, 0, 1)) / (7 * 24 * 60 * 60 * 1000)));
        meta.weeklyChallenges = { week: meta.currentWeek, challenges: picked };
        this.saveMeta(meta);
        return picked;
    };

    SaveManager.prototype.checkWeeklyCompletion = function(stats) {
        var meta = this._metaCache || {};
        if (!meta.weeklyChallenges) return { completed: [], bonusTokens: 0, bonusCores: 0 };
        var chs = meta.weeklyChallenges.challenges || [];
        var completed = [];
        var bonusTokens = 0, bonusCores = 0;
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
    };

})();
