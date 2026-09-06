(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

Gp._goToSaveSelect = async function() {
    /* R263-P0: 导航守卫防止快速双击导致重复存档/清除竞态 */
    if (this._navSaving) return;
    this._navSaving = true;
    try {
    this.running = false;
    this.gameOver = false;
    this._announcingWave = false; /* R128-P2: 防止导航后标志残留影响后续逻辑 */
    /* R240-P0: 清除game-clock-frozen防止面板状态跨页面残留 */
    if (this.container) this.container.classList.remove('game-clock-frozen');
    if (this.gameOverOverlay) this.gameOverOverlay.classList.remove('active');
    if (this.victoryOverlay) this.victoryOverlay.classList.remove('active');
    if (window.rewardManager) window.rewardManager.hidePanel();
    /* P2: 清除所有残存定时器，防止导航后回调在旧引擎上执行 */
    if (this._gambleTimeout) { clearTimeout(this._gambleTimeout); this._gambleTimeout = null; }
    if (this._interWaveTimeout) { clearTimeout(this._interWaveTimeout); this._interWaveTimeout = null; }
    if (this._qqueenShieldTimer) { clearTimeout(this._qqueenShieldTimer); this._qqueenShieldTimer = null; }
    /* R234-P0: 清理引导/手牌相关定时器，防止导航到s2后旧实例回调访问已移除DOM */
    if (this._highlightTimers) { this._highlightTimers.forEach(function(t) { clearTimeout(t); }); this._highlightTimers = []; }
    if (this._guideCheckTimer) { clearInterval(this._guideCheckTimer); this._guideCheckTimer = null; }
    if (this._guideAutoAdvanceTimer) { clearTimeout(this._guideAutoAdvanceTimer); this._guideAutoAdvanceTimer = null; }
    if (this._completeGuideTimer) { clearTimeout(this._completeGuideTimer); this._completeGuideTimer = null; }
    if (this._handTileDeliverTimers) { this._handTileDeliverTimers.forEach(function(t) { clearTimeout(t); }); this._handTileDeliverTimers = []; }
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
    /* R205-P1: 导航前确保当前局已存档，防止30s间隔内跳转丢失进度 */
    if (window.saveManager && this._autoSave) await this._autoSave('nav'); /* R226-P0: await防止clearActiveRun抢先写入导致数据丢失 */
    /* R137-P0: await确保存档写入完成后再跳转，防止竞态导致"继续游戏"误判 */
    if (window.saveManager) await window.saveManager.clearActiveRun();
    window.location.href = 's2_main_hub.html';
    } catch(e) { console.warn('[Navigate] _goToSaveSelect error:', e); }
    finally { this._navSaving = false; }
};

Gp._formatTime = function(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

})();
