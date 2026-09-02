(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

Gp._onClick = function(e) {
    var enemyEl = e.target.closest('.enemy');
    if (!enemyEl) return;
    /* R46-P1: 防止overlay打开时误触攻击 */
    if (!this.running || this._paused || this._levelUpPending || this._pendingReward || this._gambleActive) return;

    var id = parseInt(enemyEl.dataset.id, 10);
    var enemy = null;
    for (var _si = 0; _si < this.enemies.length; _si++) { if (this.enemies[_si].id === id) { enemy = this.enemies[_si]; break; } }
    if (!enemy || !enemy.alive) return;

    var bfRect = this.battlefield.getBoundingClientRect();
    /* R133-P0: 与 Boot.js _onClick 一致，补偿 responsive.js transform:scale() 和 zoomLevel */
    var containerEl = this.container || document.getElementById('game-container');
    var containerRect = containerEl ? containerEl.getBoundingClientRect() : null;
    var scaleX = 1, scaleY = 1;
    if (containerRect && containerRect.width > 0) {
        scaleX = 1920 / containerRect.width;
        scaleY = 1080 / containerRect.height;
    }
    var vx = (e.clientX - bfRect.left) * scaleX;
    var vy = (e.clientY - bfRect.top) * scaleY;
    /* P0: 补偿 zoomLevel 偏移，防止缩放后点击敌人位置偏差 */
    var _wz = this._zoomLevel || 1;
    if (_wz !== 1) {
        var _cw = this.battlefield.clientWidth || 960;
        var _ch = this.battlefield.clientHeight || 540;
        vx = (vx - _cw * (1 - _wz) / 2) / _wz;
        vy = (vy - _ch * (1 - _wz) / 2) / _wz;
    }
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
    var damage = isCrit ? Math.floor(p.atk * atkMult * (Balance.CRIT_BASE_MULT + (p.critDamageBonus || 0))) : Math.floor(p.atk * atkMult);
    if (damage === 0) return;

    enemy.takeDamage(damage, this.player, undefined, undefined, isCrit ? 'crit' : undefined);
    /* Epoch 36: 攻击音效 */
    if (isCrit) window.audioManager && window.audioManager.play('crit');
    else window.audioManager && window.audioManager.play('attack');
    if (!enemy.frozen && p.freezeChance > 0 && Math.random() < p.freezeChance) {
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
        var splashDmg = Math.floor(damage * Balance.SPLASH_DAMAGE_MULT);
        this._spawnExplosion(wx, wy, 50, splashDmg, enemy.id);
    }
};

Gp._spawnFloatText = function(x, y, text, isCrit, _isDamage) {
    /* R55-P0-2: 第三个参数明确是否为伤害数值文本，非伤害提示用默认色 */
    var isDamageText = (_isDamage !== undefined) ? _isDamage : isCrit;
    if (window.fxManager) {
        window.fxManager.spawnText(x, y, text, isDamageText ? 'crit' : 'normal');
        return;
    }
    var el = document.createElement('div');
    el.className = 'damage-float' + (isDamageText ? ' crit' : '');
    el.textContent = '-' + text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    /* 竹翠青普通伤害，朱砂红暴击 */
    if (isDamageText) {
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
    /* R151-P2: 清理viewport resize监听器，防止多次restart累积 */
    this._removeViewportResize();
    /* R46-P1: 清理Overdrive状态，防止重启后伤害倍率残留 */
    if (this._overdriveActive) this._endOverdrive();
    /* P0: 清理深渊变异组合状态，防止跨局残留 buff */
    if (this._abyssActiveCombo) {
        this._abyssActiveCombo = null;
        /* R32-E-002: 还原frailty原始ATK，防止永久残留 */
        if (this.player) {
            if (this.player._abyssFrailtyOrigAtk !== undefined) {
                this.player.atk = this.player._abyssFrailtyOrigAtk;
                this.player._abyssFrailtyOrigAtk = undefined;
            }
            this.player._abyssFrailtyAtk = undefined;
            this.player._abyssBloodmoonApplied = false;
            this.player._abyssBloodmoonAtkBonus = undefined;
            this.player._abyssBloodmoonOrigMaxHp = undefined; /* R146-P1: 清理血月combo原始HP，防止跨局污染 */
        }
    }
    /* R37-P1: 确保frailtyDebuff在所有重启路径下被清除 */
    if (this.player) this.player._frailtyDebuff = false;
    /* P1: 清除残留定时器，防止导航后回调在旧引擎上执行 */
    if (this._gambleTimeout) clearTimeout(this._gambleTimeout);
    if (this._interWaveTimeout) clearTimeout(this._interWaveTimeout);
    if (this._qqueenShieldTimer) clearTimeout(this._qqueenShieldTimer);
    /* R104-P1: 清理共振隐藏定时器 */
    if (this._flameHideTimer) { clearTimeout(this._flameHideTimer); this._flameHideTimer = null; }
    if (this._iceHideTimer) { clearTimeout(this._iceHideTimer); this._iceHideTimer = null; }
    /* R102-P1: 清理死亡动画定时器 */
    if (this._deathAnimTimer) { clearTimeout(this._deathAnimTimer); this._deathAnimTimer = null; }
    /* Clear guide timers to prevent stale callbacks after restart */
    if (this._highlightTimers) {
        this._highlightTimers.forEach(function(t) { clearTimeout(t); });
        this._highlightTimers = [];
    }
    if (this._guideCheckTimer) {
        clearInterval(this._guideCheckTimer);
        this._guideCheckTimer = null;
    }
    /* R101-P1: 清理引导完成定时器 */
    if (this._completeGuideTimer) { clearTimeout(this._completeGuideTimer); this._completeGuideTimer = null; }
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
    /* R116-P1: 清理雨滴粒子防止重启泄漏 */
    if (this._rainDrops) {
        for (var _rd = 0; _rd < this._rainDrops.length; _rd++) {
            if (this._rainDrops[_rd] && this._rainDrops[_rd].parentNode) this._rainDrops[_rd].remove();
        }
        this._rainDrops = [];
    }
    /* R118-P0: 清理深渊面板DOM和重置标志，防止重启后面板残留导致守卫失效 */
    var _ap = document.getElementById('abyss-panel');
    if (_ap) _ap.remove();
    this._abyssPanelVisible = false;
    /* R125-P1: 清理深渊商店面板DOM，防止restart后残留 */
    var _asp = document.getElementById('abyss-shop-panel');
    if (_asp) _asp.remove();
    this._abyssShopVisible = false;
    /* R118-P0: 清理FxManager对象池，防止飘字节点跨局泄漏 */
    if (window.fxManager) window.fxManager.cleanup();
    var bc = document.getElementById('active-buffs-container');
    if (bc) { bc.remove(); this._buffsContainerEl = null; }
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
    this._pendingBossGamble = false; /* H-017: 防止 Boss Gamble 状态永久挂起 */
    this._bossTimer = 0;
    this._waveCount = 0;
    this.currentWaveSpawnedCount = 0;
    this._bossLordSpawned = false; /* R80-P1: 防止跨局Boss领主生成标志残留 */
    this._bossLord = null; /* R135-P1: 防止restart后_bossLord残留死引用 */
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
    this._overdriveCount = 0; /* R131-P0: 重置Overdrive计数，防止跨restart积累误报成就 */
    this._extraEliteCount = 0;
    /* R134-P1: 重置奖励面板置换状态，防止跨局残留 */
    if (window.rewardManager) window.rewardManager._pendingWeapon = null;
    this._shieldActive = false;
    this._shieldTimer = 0; /* R128-P1: 重置雀魂护盾计时器防止跨局残留 */
    this._tempShield = 0;
    this._witherTimer = 0; /* P1: 重置枯萎计时器防止跨局残留 */
    /* R106-P0: 防止怪物潮双倍掉落跨局残留 */
    this._monsterSurgeDoubleDrops = false;
    /* R32-G-004: 重置引导状态，防止跨局残留（断点恢复路径也会使用restart） */
    this._guideDismissed = false;
    this._currentGuideStep = 0;
    this._guideSteps = null;
    this._guideMoveDirs = {};
    this._guideGemsPicked = 0;
    this._guideHits = 0;
    this._guidePrevGemCount = undefined;
    this._guidePrevEnemyCount = undefined;
    this._tempShieldEnd = 0;
    this._hitStopT = 0; /* R128-P1: 重置命中停顿计时器防止跨局残留 */
    /* R130-P0: 重置突变系统引擎级状态，防止跨局残留 */
    this._origMagnetRadius = null; /* R130-P0: 引力突变原始磁铁半径快照 */
    if (this.mutatorOverlay) this.mutatorOverlay.classList.remove('active');
    /* R37-P1: 重置局内增益状态，防止跨局残留 */
    this._vaultMutations = [];
    this._eliteModeActive = false;
    /* R126-P1: 重置深渊状态，防止跨局残留 */
    this._abyssActiveCombo = null;
    this._abyssFrenzyLifestealSet = false;
    this._abyssCoins = 0;
    this._abyssLoopHpScale = 1;
    this._abyssLoopAtkScale = 1;
    this._abyssVariantEnabled = false;
    this._witherAbyssTimer = 0; /* R128-P1: 重置深渊凋零计时器防止跨局残留 */
    if (this.victoryOverlay) this.victoryOverlay.classList.remove('active');
    if (this.gameOverOverlay) this.gameOverOverlay.classList.remove('active');
    /* R104-P1: 清理突变面板active class，防止重启后短暂残留 */
    if (this.mutatorOverlay) this.mutatorOverlay.classList.remove('active');
    this.gameOver = false;
    this.running = false;
    /* R136-P0: 重置胜利标记，防止跨局残留 */
    this._won = false;
    /* R46-P0: 解除clock冻结，防止重启前overlay/guide导致新游戏永久冻结 */
    if (this.container) this.container.classList.remove('game-clock-frozen');
    this._elapsed = 0;
    this.kills = 0;
    this.loopCount = 0; /* R96-P0: 防止深渊combo跨局误触发 */
    /* R102-P1: 清理残存屏幕震动状态，防止重启后惯性闪烁 */
    this._shakeTimer = 0;
    this._shakeIntensity = 0;
    var wl = this._worldLayer || document.getElementById('world-layer');
    if (wl) wl.classList.remove('shake-active');
    this._spawnTimer = 0;
    this._spawnInterval = Balance.DEFAULT_SPAWN_INTERVAL;
    this._difficultyTimer = 0;
    /* R116-P0: 重启时重置周期性存档计时器 */
    this._saveTimer = 0;
    /* R123-P0: 重置视口缓存，防止窗口缩放后相机追踪失效 */
    this._vpW = 0;
    this._vpH = 0;
    this._lastDayNightCycle = -1;
    this._lastAbyssDepth = -1;
    this._rainTimer = 0;
    this._playerHitCountThisRun = 0; /* R96-P1: 防止无伤成就被护盾吸收的伤害错误计数 */
    /* R82-P1: 清理战场深渊深度class */
    if (this._battlefield) this._battlefield.classList.remove('abyss-depth-1', 'abyss-depth-2', 'abyss-depth-3', 'abyss-depth-n');

    var heroId = this.player ? this.player.heroId : 'Hero';
    var levelId = this._currentLevelId || 'level_1';
    this._startNewRun(heroId, levelId);
};

/* ══════════════════════════════════════════════
   武器系统 — 初始化/更新/碰撞/清理
   ══════════════════════════════════════════════ */

})();
