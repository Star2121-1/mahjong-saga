(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

Gp.restart = function() {
    for (var _el of this._enemyElements.values()) { if (_el && _el.parentNode) _el.remove(); }
    this._enemyElements.clear();
    this.enemies = [];
    this._enemyIdCounter = 0;
    for (var _c = 0; _c < this._activeCoins.length; _c++) this._activeCoins[_c].el.remove();
    this._activeCoins = [];
    for (var _g = 0; _g < this._expGems.length; _g++) { if (this._expGems[_g].el) this._expGems[_g].el.remove(); }
    this._expGems = [];
    window.expGems = [];
    this._cleanAllProjectiles();
    this._cleanEnemyProjectiles();
    this._resetAllWeapons();
    this._pendingReward = false;
    this._bossTimer = 0;
    this._waveCount = 0;
    this.currentWaveSpawnedCount = 0;
    this._levelUpPending = false;
    this._ignoreGemCollection = false;
    this._mutatorTriggered = false;
    this._clearMutatorEffects();
    this._clearTotems();
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

    var heroId = this.player ? this.player.heroId : 'Knight';
    var levelId = this._currentLevelId || 'level_1';
    this._startNewRun(heroId, levelId);
};

Gp._goToSaveSelect = function() {
    this.running = false;
    this.gameOver = false;
    this.gameOverOverlay.classList.remove('active');
    this.victoryOverlay.classList.remove('active');
    if (window.rewardManager) window.rewardManager.hidePanel();
    for (var _g = 0; _g < this._expGems.length; _g++) { if (this._expGems[_g].el) this._expGems[_g].el.remove(); }
    this._expGems = [];
    window.expGems = [];
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
