(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

Gp._onClick = function(e) {
    var enemyEl = e.target.closest('.enemy');
    if (!enemyEl) return;

    var id = parseInt(enemyEl.dataset.id, 10);
    var enemy = null;
    for (var _si = 0; _si < this.enemies.length; _si++) { if (this.enemies[_si].id === id) { enemy = this.enemies[_si]; break; } }
    if (!enemy || !enemy.alive) return;

    var bfRect = this.battlefield.getBoundingClientRect();
    /* P1: 补偿 responsive.js transform:scale()，与 Boot.js 坐标变换一致 */
    var containerEl = this.container || document.getElementById('game-container');
    var containerRect = containerEl ? containerEl.getBoundingClientRect() : null;
    var scaleX = 1, scaleY = 1;
    if (containerRect && containerRect.width > 0) {
        scaleX = 1920 / containerRect.width;
        scaleY = 1080 / containerRect.height;
    }
    var vx = (e.clientX - bfRect.left) * scaleX;
    var vy = (e.clientY - bfRect.top) * scaleY;
    var wx = vx + this.cameraX;
    var wy = vy + this.cameraY;

    var p = this.player;

    if (p.freezeChance > 0 && Math.random() < p.freezeChance) {
        enemy.frozen = true;
        enemy.frozenTimer = Balance.FROZEN_TIMER_BONUS_BASE + (p.iceDurationBonus || 0);
        if (enemy.el) enemy.el.classList.add('frozen-crystal');
    }

    var isCrit = Math.random() < (p.critRate + (this._tempCritBonus || 0));
    if (this._tempCritBonus) this._tempCritBonus = 0;
    /* Epoch 32: 临时攻击增益 */
    var atkMult = 1 + (p._tempAtkBoost || 0);
    var damage = isCrit ? Math.floor(p.atk * atkMult * (2.5 + (p.critDamageBonus || 0))) : Math.floor(p.atk * atkMult);
    if (damage === 0) return;

    enemy.takeDamage(damage, this.player, undefined, undefined, isCrit ? 'crit' : undefined);
    /* Epoch 36: 攻击音效 */
    if (isCrit) window.audioManager && window.audioManager.play('crit');
    else window.audioManager && window.audioManager.play('attack');
    if (p.freezeChance > 0 && Math.random() < p.freezeChance) {
        window.audioManager && window.audioManager.play('freeze');
    }

    /* Epoch 3: 暴击计数 */
    if (isCrit) {
        this._totalCritsThisRun = (this._totalCritsThisRun || 0) + 1;
        this._checkAchievementInflight('crit_master', this._totalCritsThisRun);
    }

    if (isCrit) {
        this.triggerShake(2, 300);
        /* C2: 命中停顿 — 暴击顿帧，世界短暂减速 */
        this._hitStopT = 0.06;
    }

    if (p.lifestealRate > 0) {
        var heal = Math.floor(damage * p.lifestealRate);
        if (heal > 0) {
            p.hp = Math.min(p.maxHp, p.hp + heal);
            this._spawnHealText(p.x, p.y, heal);
        }
    }

    if (p.explosionChance > 0 && Math.random() < p.explosionChance) {
        window.audioManager && window.audioManager.play('explode');
        var splashDmg = Math.floor(damage * 0.5);
        this._spawnExplosion(wx, wy, 50, splashDmg, enemy.id);
    }
};

Gp._spawnFloatText = function(x, y, text, isCrit) {
    if (window.fxManager) {
        window.fxManager.spawnText(x, y, text, isCrit ? 'crit' : 'normal');
        return;
    }
    var el = document.createElement('div');
    el.className = 'damage-float' + (isCrit ? ' crit' : '');
    el.textContent = '-' + text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    /* 竹翠青普通伤害，朱砂红暴击 */
    if (isCrit) {
        el.style.color = '#b62929';
    } else {
        el.style.color = '#1e6f42';
    }
    this._worldLayer.appendChild(el);
    setTimeout(function() { el.remove(); }, 650);
};

Gp._spawnHealText = function(x, y, amount) {
    window.audioManager && window.audioManager.play('heal', { volume: 0.3 });
    if (window.fxManager) {
        window.fxManager.spawnText(x, y - 20, '+' + amount, 'heal');
        return;
    }
    var el = document.createElement('div');
    el.className = 'damage-float heal';
    el.textContent = '+' + amount;
    el.style.left = x + 'px';
    el.style.top = (y - 20) + 'px';
    this._worldLayer.appendChild(el);
    setTimeout(function() { el.remove(); }, 650);
};

Gp._spawnExpText = function(x, y, amount) {
    if (window.fxManager) {
        window.fxManager.spawnText(x - 10, y - 40, '+' + amount + 'EXP', 'exp');
        return;
    }
    var el = document.createElement('div');
    el.className = 'damage-float exp-gain';
    el.textContent = '+' + amount + 'EXP';
    el.style.left = (x - 10) + 'px';
    el.style.top = (y - 40) + 'px';
    this._worldLayer.appendChild(el);
    setTimeout(function() { el.remove(); }, 650);
};

Gp._spawnExplosion = function(x, y, radius, damage, excludeId) {
    /* Epoch 5: 委托爆炸到 CombatSystem */
    if (this._combat && this._combat.spawnExplosion) {
        return this._combat.spawnExplosion(this, x, y, radius, damage, excludeId);
    }
    for (var _ei = 0; _ei < this.enemies.length; _ei++) {
        var e = this.enemies[_ei];
        if (!e.alive) continue;
        if (e.id === excludeId) continue;
        var dx = e.x - x;
        var dy = e.y - y;
        if (dx * dx + dy * dy <= radius * radius) {
            e.takeDamage(damage, 'splash');
        }
    }
    var el = document.createElement('div');
    el.className = 'explosion-effect';
    var d = radius * 2;
    el.style.left = (x - radius) + 'px';
    el.style.top = (y - radius) + 'px';
    el.style.width = d + 'px';
    el.style.height = d + 'px';
    this._worldLayer.appendChild(el);
    setTimeout(function() { el.remove(); }, 400);
};

Gp._screenShake = function() {
    this.triggerShake(1, 200);
};

Gp.triggerShake = function(intensity, duration) {
    /* Epoch 5: 委托震动到 Systems */
    if (this._systems && this._systems.triggerShake) {
        return this._systems.triggerShake(this, intensity, duration);
    }
    /* Fallback: 直接操作 world-layer */
    var wl = this._worldLayer || document.getElementById('world-layer');
    if (!wl) return;
    intensity = intensity || 1;
    duration = duration || 200;
    var maxDisp = Math.min(intensity * 8, 24);
    wl.style.setProperty('--sx', (maxDisp * (Math.random() > 0.5 ? 1 : -1)) + 'px');
    wl.style.setProperty('--sy', (maxDisp * (Math.random() > 0.5 ? 1 : -1)) + 'px');
    wl.style.animationDuration = Math.min(duration, 3000) + 'ms';
    wl.classList.add('shake-active');
    this._shakeTimer = duration / 1000;
    this._shakeIntensity = intensity;
};

Gp.restart = function() {
    /* P0: 清理深渊变异组合状态，防止跨局残留 buff */
    if (this._abyssActiveCombo) {
        this._abyssActiveCombo = null;
        if (this.player) { this.player._abyssFrailtyAtk = undefined; this.player._abyssBloodmoonApplied = false; this.player._abyssBloodmoonAtkBonus = undefined; }
    }
    /* P1: 清除残留定时器，防止导航后回调在旧引擎上执行 */
    if (this._gambleTimeout) clearTimeout(this._gambleTimeout);
    if (this._interWaveTimeout) clearTimeout(this._interWaveTimeout);
    if (this._qqueenShieldTimer) clearTimeout(this._qqueenShieldTimer);
    /* Clear guide timers to prevent stale callbacks after restart */
    if (this._highlightTimers) {
        this._highlightTimers.forEach(function(t) { clearTimeout(t); });
        this._highlightTimers = [];
    }
    if (this._guideCheckTimer) {
        clearInterval(this._guideCheckTimer);
        this._guideCheckTimer = null;
    }
    /* R30-H-017: 清理Boss Phase 3红色雾霭DOM */
    if (this._bossMistEl && this._bossMistEl.parentNode) this._bossMistEl.remove();
    this._bossMistEl = null;
    /* R30-H-023: 清理共振光环DOM防止重启泄漏 */
    if (this._flameAuraEl && this._flameAuraEl.parentNode) this._flameAuraEl.remove();
    this._flameAuraEl = null;
    if (this._iceAuraEl && this._iceAuraEl.parentNode) this._iceAuraEl.remove();
    this._iceAuraEl = null;
    /* P3: 清理日夜叠加和深渊红雾DOM */
    if (this._dayNightEl && this._dayNightEl.parentNode) this._dayNightEl.remove();
    this._dayNightEl = null;
    if (this._abyssMistEl && this._abyssMistEl.parentNode) this._abyssMistEl.remove();
    this._abyssMistEl = null;
    var bc = document.getElementById('active-buffs-container');
    if (bc) bc.remove();
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
    /* P1: 清理雀魂手牌动画定时器，防止跨局残留触发 */
    if (this._handTileDeliverTimers) {
        this._handTileDeliverTimers.forEach(function(t) { clearTimeout(t); });
        this._handTileDeliverTimers = [];
    }
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
    /* R31-E-001: 局内成就计数器重置（修复跨重启泄漏） */
    this._totalCritsThisRun = 0;
    this._totalDodgesThisRun = 0;
    this._bossKillsThisRun = 0;
    this._finalBossKillsThisRun = 0;
    this._maxGoldThisRun = 0;
    /* R31-E-002: 临时增益字段重置（补充 restart() 缺失路径） */
    this._tempEnemyAtkDebuff = 0;
    this._tempEnemySpeedDebuff = 0;
    this._tempBerserkBonus = false;
    this._tempGoldMult = 1;
    this._tempCritBonus = 0;
    this._extraEliteCount = 0;
    this._tempShield = 0;
    this._tempShieldEnd = 0;
    this.victoryOverlay.classList.remove('active');
    this.gameOverOverlay.classList.remove('active');
    this.gameOver = false;
    this.running = false;
    this._elapsed = 0;
    this.kills = 0;
    this._spawnTimer = 0;
    this._spawnInterval = 1.5;
    this._difficultyTimer = 0;

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

/* ══════════════════════════════════════════════
   武器系统 — 初始化/更新/碰撞/清理
   ══════════════════════════════════════════════ */

})();
