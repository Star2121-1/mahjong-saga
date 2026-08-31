(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

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
