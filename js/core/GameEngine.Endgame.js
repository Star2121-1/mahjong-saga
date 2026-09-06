(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

Gp._onClick = function(e) {
    var enemyEl = e.target.closest('.enemy');
    if (!enemyEl) return;
    /* R46-P1: 防止overlay打开时误触攻击 */
    if (!this.running || this._paused || this._levelUpPending || this._pendingReward || this._gambleActive || this._announcingWave || this._discardMode || this._huLock) return;

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
        if (enemy.type === 'Boss_Lord') enemy._savedBossPhase = enemy._bossPhase; /* R261-P1: 点击冰冻也保存Boss相位，与武器弹道路径对称 */
        if (enemy.el) { enemy.el.classList.add('frozen-crystal'); enemy.el.classList.add('frozen'); }
        window.audioManager && window.audioManager.play('freeze');
        isCrit = false;
    }

    var isCrit = Math.random() < (p.critRate + (this._tempCritBonus || 0));
    /* R182-P0: 铁拳事件暴击加成不应首击后立即清零 — 整个波次期间都应有效 */
    /* Epoch 32: 临时攻击增益 */
    var atkMult = 1 + (p._tempAtkBoost || 0);
    var damage = isCrit ? Math.floor(p.atk * atkMult * (Balance.CRIT_BASE_MULT + (p.critDamageBonus || 0))) : Math.floor(p.atk * atkMult);
    if (damage === 0) return;

    enemy.takeDamage(damage, this.player, this.player.x, this.player.y, isCrit ? 'crit' : undefined);
    /* R260-P1: 点击暴击需标记_critThisHit，与武器弹道路径对称，确保tempCritBonus击杀消费一致 */
    if (isCrit) enemy._critThisHit = true;
    /* Epoch 36: 攻击音效 */
    if (isCrit) window.audioManager && window.audioManager.play('crit');
    else window.audioManager && window.audioManager.play('attack');
    /* R204-P1: freeze 音效已在上方冻结判定块内播放，移除冗余双随机检查 */

    /* Epoch 3: 暴击计数 */
    if (isCrit) {
        this._totalCritsThisRun = (this._totalCritsThisRun || 0) + 1;
        this._checkAchievementInflight('crit_master', this._totalCritsThisRun);
    }

    if (isCrit) {
        this.triggerShake(2, 300);
        /* R227-P1: C2命中顿帧系统已移除（Loop.js死代码），仅保留震动效果 */
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
    el.className = 'damage-float exp';
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
            var _sx = this.player ? this.player.x : x;
            var _sy = this.player ? this.player.y : y;
            e.takeDamage(damage, 'splash', _sx, _sy); /* R156-P0: 传递爆炸源位置，防止Barrier判定错误 */
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
    /* R262-P1: setTimeout清理需加parentNode守卫，防止快速波次切换时元素已移除导致JS警告 */
    setTimeout(function(el) { if (el && el.parentNode) el.remove(); }, Balance.EXPLOSION_EFFECT_TIMEOUT, el);
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
    /* R164-P1: 清理beforeunload监听器，防止restart后handler累积 */
    this._removeBeforeUnload();
    /* R259-P1: 清理visibilitychange监听器，防止restart后累积多份回调 */
    this._removeVisibilityPause();
    /* R206-P1: 停止所有音频，防止上一局残留oscillator在新局中播放 */
    window.audioManager && window.audioManager.stopAll();
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
    this._frailtyBoost = null; /* R202-P0: 脆弱突变ATK倍率基准在重启路径清零 */
    this._frailtyOrigPlayerAtk = undefined; /* R204-P1: 脆弱突变APK快照在重启路径清零 */
    /* P1: 清除残留定时器，防止导航后回调在旧引擎上执行 */
    if (this._gambleTimeout) { clearTimeout(this._gambleTimeout); this._gambleTimeout = null; }
    if (this._interWaveTimeout) { clearTimeout(this._interWaveTimeout); this._interWaveTimeout = null; }
    if (this._qqueenShieldTimer) clearTimeout(this._qqueenShieldTimer);
    /* R104-P1: 清理共振隐藏定时器 */
    if (this._flameHideTimer) { clearTimeout(this._flameHideTimer); this._flameHideTimer = null; }
    if (this._iceHideTimer) { clearTimeout(this._iceHideTimer); this._iceHideTimer = null; }
    /* R102-P1: 清理死亡动画定时器 */
    if (this._deathAnimTimer) { clearTimeout(this._deathAnimTimer); this._deathAnimTimer = null; }
    /* R264-P0: 重置玩家DOM显示状态，防止死亡动画后display:none残留 */
    if (this.playerEl) this.playerEl.style.display = '';
    /* Clear guide timers to prevent stale callbacks after restart */
    if (this._highlightTimers) {
        this._highlightTimers.forEach(function(t) { clearTimeout(t); });
        this._highlightTimers = [];
    }
    if (this._guideCheckTimer) {
        clearInterval(this._guideCheckTimer);
        this._guideCheckTimer = null;
    }
    /* R207-P0: 清理引导自动推进定时器，防止restart后旧定时器触发导致新游戏引导步骤错乱 */
    if (this._guideAutoAdvanceTimer) { clearTimeout(this._guideAutoAdvanceTimer); this._guideAutoAdvanceTimer = null; }
    /* R226-P0: 清理技能光效，防止restart后残留DOM */
    if (this._skillGlowEls) {
        for (var _gi = 0; _gi < this._skillGlowEls.length; _gi++) {
            if (this._skillGlowEls[_gi] && this._skillGlowEls[_gi].parentNode) this._skillGlowEls[_gi].remove();
        }
        this._skillGlowEls = [];
    }
    /* R101-P1: 清理引导完成定时器 */
    if (this._completeGuideTimer) { clearTimeout(this._completeGuideTimer); this._completeGuideTimer = null; }
    /* R154-P0: 清除引导透明度Map，防止跨局战场元素错误褪色 */
    if (this._originalOpacities) { this._originalOpacities.clear(); this._originalOpacities = null; }
    /* R30-H-017: 清理Boss Phase 3红色雾霭DOM */
    if (this._bossMistEl && this._bossMistEl.parentNode) this._bossMistEl.remove();
    this._bossMistEl = null;
    /* R232-P0: 清理Boss砸地特效DOM，防止restart后crack/ring/flash残留世界层 */
    var _slamEls = document.querySelectorAll('.ground-crack, .boss-slam-ring, .slam-flash, .knight-dodge-slam, .explosion-effect, .boss-warning-zone, .boss-decoy'); /* R240-P0: 补充爆炸特效DOM清理，防止restart后残留 */
    for (var _si = 0; _si < _slamEls.length; _si++) { if (_slamEls[_si].parentNode) _slamEls[_si].remove(); }
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
    /* R152-P0: 清理Overdrive全屏白闪DOM，防止重启后残留节点 */
    var _odf = document.getElementById('overdrive-flash');
    if (_odf && _odf.parentNode) _odf.remove();
    /* R170-P1: 清理Overdrive金色流光粒子，防止重启后DOM泄漏 */
    var _bursts = document.querySelectorAll('.legendary-burst');
    for (var _bi = 0; _bi < _bursts.length; _bi++) { if (_bursts[_bi].parentNode) _bursts[_bi].remove(); }
    /* R171-P1: 清理Boss Gamble面板DOM，防止重启后面板残留 */
    var _bgp = document.getElementById('boss-gamble-panel');
    if (_bgp && _bgp.parentNode) _bgp.remove();
    /* R226-P0: 清理胡牌演出节点，防止restart期间hu-bang残留 */
    if (this._huBangEl && this._huBangEl.parentNode) this._huBangEl.remove();
    this._huBangEl = null;
    /* R118-P0: 清理FxManager对象池，防止飘字节点跨局泄漏 */
    if (window.fxManager) window.fxManager.cleanup();
    /* R165-P0: 清理ToastSystem活跃节点，防止restart后toast DOM残留 */
    if (window.toastSystem && window.toastSystem._active) {
        for (var _ti = 0; _ti < window.toastSystem._active.length; _ti++) {
            var _tn = window.toastSystem._active[_ti];
            if (_tn && _tn._timer) clearTimeout(_tn._timer);
            if (_tn && _tn.parentNode) _tn.parentNode.removeChild(_tn);
        }
        window.toastSystem._active = [];
    }
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
    this._checkWeaponSynergies(); /* R161-P0a: 重启后重新计算协同标志，防止跨局残留 */
    /* P1: 清理雀魂手牌动画定时器，防止跨局残留触发 */
    if (this._handTileDeliverTimers) {
        this._handTileDeliverTimers.forEach(function(t) { clearTimeout(t); });
        this._handTileDeliverTimers = [];
    }
    this._pendingReward = false;
    this._pendingBossGamble = false; /* H-017: 防止 Boss Gamble 状态永久挂起 */
    /* R171-P1: 清理Boss Gamble完整状态，防止restart后残留导致误触发 */
    this._gambleActive = false;
    this._gambleType = null;
    this._gambleStaked = 0;
    this._gambleAbyssBonus = false;
    this._bossTimer = 0;
    this._waveCount = 0;
    this.currentWaveSpawnedCount = 0;
    this._announcingWave = false; /* R158-P1: 重置波次公告标志，防止跨restart阻塞 */
    this._bossLordSpawned = false; /* R80-P1: 防止跨局Boss领主生成标志残留 */
    this._pendingBossLordSettle = false; /* R226-P1: 重置Boss结算标志，防止restart后胜利状态卡死 */
    this._bossLord = null; /* R135-P1: 防止restart后_bossLord残留死引用 */
    this._bossLordSavedPhase = null; /* R260-P0: 重置冻结Boss相位快照，防止跨restart泄漏 */
    this._levelUpPending = false;
    this._ignoreGemCollection = false;
    this._mutatorTriggered = false;
    this._clearMutatorEffects();
    this._clearTotems();
    /* R240-P0: 重置共鸣计时器，防止restart后残留导致提前触发 */
    this._flameAuraTimer = 0;
    this._iceAuraTimer = 0;
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
    /* R229-P1: 重置疾风连打攻速加成，防止跨局泄漏 */
    this._tempAspd = 0;
    this._tempAspdT = 0;
    if (this.player) this.player._dodgeAspdTimer = 0; /* R230-P1: 重置刺客闪避攻速计时器防止跨局残留 */
    this._overdriveCount = 0; /* R131-P0: 重置Overdrive计数，防止跨restart积累误报成就 */
    this._abyssComboActivated = false; /* R173-P0: 重置深渊combo激活标志，防止跨局永久失效 */
    this._origCdFloor = null; /* R158-P1: 清除过驱动CD基准残留，防止跨局速度异常 */
    this._extraEliteCount = 0;
    /* R134-P1: 重置奖励面板置换状态，防止跨局残留 */
    if (window.rewardManager) window.rewardManager._pendingWeapon = null;
    this._shieldActive = false;
    this._shieldTimer = 0; /* R128-P1: 重置雀魂护盾计时器防止跨局残留 */
    this._tempShield = 0;
    this._witherTimer = 0; /* P1: 重置枯萎计时器防止跨局残留 */
    /* R239-P1: 重置圣物等级，防止restart()路径不清理遗物叠加状态 */
    if (this.player) this.player.relicLevels = {};
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
    /* R264-P1: 重置局内里程碑状态，防止restart后里程碑提示和波次横幅跨局残留 */
    this._milestonesShown = null;
    this._milestoneShown = false;
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
    if (wl) {
        wl.classList.remove('shake-active');
        /* R171-P1: 清理shake残留的CSS自定义属性，防止重启后相机位置偏移 */
        wl.style.removeProperty('--sx');
        wl.style.removeProperty('--sy');
        wl.style.transform = '';
    }
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
    /* R188-P0: _achievementFlags已移除 — 不再需要重置 */

    var heroId = this.player ? this.player.heroId : 'Hero';
    var levelId = this._currentLevelId || 'level_1';
    this._startNewRun(heroId, levelId);
    /* R208-P1: restart后重新注册键盘/摇杆监听，防止DOM节点复用导致输入失效 */
    this._initKeyboard();
    this._initJoystick();
    /* R187-P1: restart后重新注册beforeunload，防止第二次restart后自动存档失效 */
    this._initBeforeUnload();
    /* R241-P0: restart后重新绑定阶段3事件，防止按钮监听器累积 */
    this._bindStage3Events();
    /* R241-P1: 重建视口resize监听，防止窗口缩放后相机追踪失效 */
    this._initViewportResize();
};

/* ══════════════════════════════════════════════
   R185-P0: 移除重复的 _showVictory / _gameOver 定义
   Combat.js 中已有完整版本，此处仅为死代码覆盖
   ================================================================== */

/* ══════════════════════════════════════════════
   武器系统 — 初始化/更新/碰撞/清理
   ══════════════════════════════════════════════ */

})();
