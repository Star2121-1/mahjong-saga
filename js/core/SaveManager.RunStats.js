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
        this._metaCache.runStats = s; /* R148-P1: 写回_metaCache，防止赛季激活依赖stale数据需二次刷新 */
        return s;
    };

    SaveManager.prototype.getRunStats = function() {
        var meta = this._metaCache || {};
        return meta.runStats || null;
    };

    /* ── Epoch 31: 死亡奖励 ── */

    SaveManager.prototype.calcDeathReward = function(kills, gold, elapsed) {
        /* R85-P2: 使用 Balance 常量替代硬编码魔法数字 */
        var metaTokens = Math.floor(gold / Balance.DEATH_REWARD_TOKEN_RATIO);
        var bossCores = Math.floor(kills / Balance.DEATH_REWARD_CORE_RATIO);
        if (elapsed < Balance.DEATH_REWARD_FAST_TIME_THRESHOLD) {
            metaTokens = Math.floor(metaTokens * Balance.DEATH_REWARD_FAST_TOKEN_MULT);
            bossCores = 0;
        }
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

    SaveManager.prototype.updateLeaderboard = async function(stats) {
        var lb = this.getLeaderboard();
        if (stats.won) {
            if (lb.fastestClear === 0 || stats.elapsed < lb.fastestClear) lb.fastestClear = stats.elapsed;
            if (stats.bestAbyssDepth > lb.deepestAbyss) lb.deepestAbyss = stats.bestAbyssDepth;
        }
        if (stats.totalKills > lb.mostKills) lb.mostKills = stats.totalKills;
        if (stats.totalGold > lb.mostGold) lb.mostGold = stats.totalGold;
        if (stats.perfectRuns > lb.perfectRuns) lb.perfectRuns = stats.perfectRuns;
        /* R158-P0: 排行榜更新后持久化，防止页面刷新丢失 */
        /* R310-P0: 使用await而非fire-and-forget，确保排行榜数据写入完成后再返回 */
        try { await this._saveMetaToStorage(); } catch(e) { console.warn('[SaveManager] leaderboard persist failed:', e); }
        return lb;
    };

})();
