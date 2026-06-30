/**
 * SaveManager.RunStats — 运行统计/击杀统计/死亡补偿/排行榜
 * 挂载到 SaveManager.prototype
 */
(function() {
    'use strict';

    /* ── Epoch 14: 运行统计 ── */

    SaveManager.prototype.recordRunStats = function(kills, elapsed, gold, overdriveCount, dodges, crits, waves, bossKills, abyssDepth, won, hitsTaken, uniqueRelics) {
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
        if (won) { s.wins++; } else { s.losses++; }
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
    };

    SaveManager.prototype.getRunStats = function() {
        var meta = this._metaCache || {};
        return meta.runStats || null;
    };

    /* ── Epoch 31: 死亡奖励 ── */

    SaveManager.prototype.calcDeathReward = function(kills, gold, elapsed) {
        var metaTokens = Math.floor(gold / 10);
        var bossCores = Math.floor(kills / 50);
        if (elapsed < 60) { metaTokens = Math.floor(metaTokens * 0.5); bossCores = 0; }
        return { metaTokens: metaTokens, bossCores: bossCores };
    };

    /* ── Epoch 31: 排行榜 ── */

    SaveManager.prototype.getLeaderboard = function() {
        var meta = this._metaCache || {};
        if (!meta.leaderboard) meta.leaderboard = {
            fastestClear: 0, deepestAbyss: 0, mostKills: 0, mostGold: 0, perfectRuns: 0
        };
        return meta.leaderboard;
    };

    SaveManager.prototype.updateLeaderboard = function(stats) {
        var lb = this.getLeaderboard();
        if (stats.won) {
            if (lb.fastestClear === 0 || stats.elapsed < lb.fastestClear) lb.fastestClear = stats.elapsed;
            if (stats.bestAbyssDepth > lb.deepestAbyss) lb.deepestAbyss = stats.bestAbyssDepth;
        }
        if (stats.totalKills > lb.mostKills) lb.mostKills = stats.totalKills;
        if (stats.totalGold > lb.mostGold) lb.mostGold = stats.totalGold;
        if (stats.perfectRuns > lb.perfectRuns) lb.perfectRuns = stats.perfectRuns;
        return lb;
    };

})();
