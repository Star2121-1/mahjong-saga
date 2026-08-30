(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

Gp.restart = function() {
    /* P0: 确保Overdrive状态在所有路径都正确清理，防止伤害残留 */
    if (this._overdriveActive) this._endOverdrive();
    /* P0: 清理深渊变异组合状态，防止跨局残留 buff */
    if (this._abyssActiveCombo) {
        this._abyssActiveCombo = null;
        this.player._abyssFrailtyAtk = undefined;
        this.player._abyssBloodmoonApplied = false;
        this.player._abyssBloodmoonAtkBonus = undefined;
    }
    /* P1-1: 清除残留定时器，防止导航后回调在旧引擎上执行 */
    if (this._gambleTimeout) { clearTimeout(this._gambleTimeout); this._gambleTimeout = null; }
    if (this._interWaveTimeout) { clearTimeout(this._interWaveTimeout); this._interWaveTimeout = null; }
    if (this._qqueenShieldTimer) { clearTimeout(this._qqueenShieldTimer); this._qqueenShieldTimer = null; }
    for (var _el of this._enemyElements.values()) { if (_el && _el.parentNode) _el.remove(); }
    this._enemyElements.clear();
    this.enemies = [];
    this._enemyIdCounter = 0;
    for (var _c = 0; _c < this._activeCoins.length; _c++) this._activeCoins[_c].el.remove();
    this._activeCoins = [];
    for (var _g = 0; _g < this._expGems.length; _g++) { if (this._expGems[_g].el) this._expGems[_g].el.remove(); }
    this._expGems = [];
    this._pendingExpGems = [];
    this._cleanAllProjectiles();
    this._cleanEnemyProjectiles();
    this._resetAllWeapons();
    this._pendingReward = false;
    this._pendingBossGamble = false; /* H-017: 防止 Boss Gamble 状态永久挂起 */
    this._bossTimer = 0;
    this._waveCount = 0;
    this.currentWaveSpawnedCount = 0;
    this._levelUpPending = false;
    this._ignoreGemCollection = false;
    this._mutatorTriggered = false;
    this._clearMutatorEffects();
    this._clearTotems();
    /* 雀魂系统重置 */
    this._handTiles = [];
    this._formedMelds = {};
    this._jokersDropped = 0;
    if (this._handTileSlots) this._renderHandTiles();
    if (this._qqueenShieldTimer) { clearTimeout(this._qqueenShieldTimer); this._qqueenShieldTimer = null; }
    this._shieldActive = false;
    this._tempShield = 0; /* P0: 重置跨局护盾状态 */
    this._tempShieldEnd = 0; /* P0: 重置护盾过期时间 */
    this._witherTimer = 0; /* P1: 重置枯萎计时器防止跨局残留 */
    /* P1: 清理雀魂手牌动画定时器，防止跨局残留触发 */
    if (this._handTileDeliverTimers) {
        this._handTileDeliverTimers.forEach(function(t) { clearTimeout(t); });
        this._handTileDeliverTimers = [];
    }
    if (window.rewardManager) window.rewardManager.hidePanel();
    this.victoryOverlay.classList.remove('active');
    this.gameOverOverlay.classList.remove('active');
    this.gameOver = false;
    this.running = false;
    this._elapsed = 0;
    this.kills = 0;
    this._spawnTimer = 0;
    this._spawnInterval = 1.5;
    this._difficultyTimer = 0;

    /* Visual Enhancement B: 清理天气粒子 */
    if (this._rainDrops) {
        for (var _rd = 0; _rd < this._rainDrops.length; _rd++) {
            if (this._rainDrops[_rd] && this._rainDrops[_rd].parentNode) this._rainDrops[_rd].remove();
        }
        this._rainDrops = [];
    }
    if (this._dayNightEl && this._dayNightEl.parentNode) this._dayNightEl.remove();
    this._dayNightEl = null;
    if (this._abyssMistEl && this._abyssMistEl.parentNode) this._abyssMistEl.remove();
    this._abyssMistEl = null;
    if (this._battlefield) this._battlefield.classList.remove('abyss-depth-1', 'abyss-depth-2', 'abyss-depth-3', 'abyss-depth-n');

    var heroId = this.player ? this.player.heroId : 'Hero';
    var levelId = this._currentLevelId || 'level_1';
    this._startNewRun(heroId, levelId);
};

Gp._goToSaveSelect = function() {
    this.running = false;
    this.gameOver = false;
    this.gameOverOverlay.classList.remove('active');
    this.victoryOverlay.classList.remove('active');
    if (window.rewardManager) window.rewardManager.hidePanel();
    /* P2: 清除所有残存定时器，防止导航后回调在旧引擎上执行 */
    if (this._gambleTimeout) { clearTimeout(this._gambleTimeout); this._gambleTimeout = null; }
    if (this._interWaveTimeout) { clearTimeout(this._interWaveTimeout); this._interWaveTimeout = null; }
    if (this._qqueenShieldTimer) { clearTimeout(this._qqueenShieldTimer); this._qqueenShieldTimer = null; }
    this._pendingBossGamble = false; /* H-017: 离开页面时重置 Boss Gamble 状态 */
    for (var _g = 0; _g < this._expGems.length; _g++) { if (this._expGems[_g].el) this._expGems[_g].el.remove(); }
    this._expGems = [];
    this._pendingExpGems = [];
    this._cleanAllProjectiles();
    this._cleanEnemyProjectiles();
    this._resetAllWeapons();
    this._clearTotems();
    this._clearMutatorEffects();
    if (this.bossHpBar) this.bossHpBar.classList.remove('active');
    /* Clear stale active run to prevent "继续游戏" from appearing incorrectly */
    if (window.saveManager) window.saveManager.clearActiveRun();
    window.location.href = 's2_main_hub.html';
};

Gp._formatTime = function(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

})();
