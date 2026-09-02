(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

/* ══════════════════════════════════════════════
   Epoch 32: 波次间事件系统
   ══════════════════════════════════════════════ */

Gp._interWaveEvents = [
    { id: 'coin_rush', name: '金币雨', icon: '🪙', desc: '场上立即掉落 20 金币！', weight: 40, apply: function() { this._spawnCoinBurst(20); } },
    { id: 'meditation', name: '冥想泉源', icon: '🧘', desc: '恢复 30% HP，下波怪物 -20% 攻击力', weight: 25, apply: function() { this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.floor(this.player.maxHp * Balance.WAVE_MEDITATION_HP_RESTORE)); this._tempEnemyAtkDebuff = Balance.WAVE_MEDITATION_ATK_DEBUFF; } },
    { id: 'monster_surge', name: '怪物潮', icon: '👹', desc: '额外生成 5 个精英怪！但掉落翻倍', weight: 20, apply: function() { this._extraEliteCount = 5; this._monsterSurgeDoubleDrops = true; } },
    { id: 'time_dilation', name: '时光缓流', icon: '⏳', desc: '下波怪物移速 -30%', weight: 20, apply: function() { this._tempEnemySpeedDebuff = Balance.WAVE_TIME_DILATION_SPEED_DEBUFF; } },
    { id: 'berserk', name: '狂战士祝福', icon: '⚔', desc: '下波击杀额外 +10 怒气', weight: 15, apply: function() { this._tempBerserkBonus = true; } },
    { id: 'golden_touch', name: '点金术', icon: '✨', desc: '下波金币收益 ×3', weight: 15, apply: function() { this._tempGoldMult = 3; } },
    { id: 'iron_fist', name: '铁拳', icon: '👊', desc: '下波暴击率 +25%', weight: 20, apply: function() { this._tempCritBonus = Balance.WAVE_IRON_FIST_CRIT_BONUS; } },
    { id: 'shield_of_faith', name: '信仰护盾', icon: '🛡', desc: '获得可吸收 50 伤害的护盾（持续 15 秒）', weight: 15, apply: function() { this._tempShield = 50; this._tempShieldEnd = this._elapsed + 15; } }
];

Gp._pickInterWaveEvent = function() {
    var totalWeight = 0;
    for (var i = 0; i < this._interWaveEvents.length; i++) totalWeight += this._interWaveEvents[i].weight;
    var roll = Math.random() * totalWeight;
    var cumulative = 0;
    for (var i = 0; i < this._interWaveEvents.length; i++) {
        cumulative += this._interWaveEvents[i].weight;
        if (roll < cumulative) return this._interWaveEvents[i];
    }
    return this._interWaveEvents[0];
};

Gp._triggerInterWaveEvent = function() {
    var evt = this._pickInterWaveEvent();
    this._interWaveEvent = evt;
    this._freezeClock();

    var overlay = document.getElementById('reward-overlay');
    var titleEl = overlay.querySelector('.reward-title');
    var origTitle = titleEl ? titleEl.textContent : '';
    if (titleEl) titleEl.textContent = evt.icon + ' ' + evt.name;

    var cardsDiv = overlay.querySelector('.reward-cards');
    if (!cardsDiv) { console.error('[Events] .reward-cards not found in overlay'); this._unfreezeClock(); return; }
    cardsDiv.innerHTML =
        '<div style="text-align:center;padding:20px;">' +
        '<div style="font-size:48px;margin:10px;">' + evt.icon + '</div>' +
        '<div style="font-size:18px;font-weight:800;color:#ffd700;margin-bottom:8px;">' + evt.name + '</div>' +
        '<div style="font-size:14px;color:#ccc;margin-bottom:16px;">' + evt.desc + '</div>' +
        '<button class="relic-btn" id="interevent-accept" style="background:#cc8800;">接受恩赐</button>' +
        '</div>';

    overlay.classList.add('active');
    /* R115-P0: 屏幕阅读器播报波次间事件 */
    this._announceToSR(evt.name + '：' + evt.desc);
    var self = this;
    /* P3-NEW: 波次间事件自动超时（15秒后自动接受） */
    if (this._interWaveTimeout) clearTimeout(this._interWaveTimeout);
    this._interWaveTimeout = setTimeout(function() {
        /* P2: 死亡时防止超时触发事件 */
        if (self._interWaveEvent && !self.gameOver && self.running) {
            /* R51-P1: 先清除事件引用再应用，防止超时路径与点击路径状态交叉 */
            self._interWaveEvent = null;
            self._spawnCausalityText('⏱ 恩赐已自动接受');
            evt.apply.call(self);
            self._continueAfterInterWave();
        }
    }, 15000);
    document.getElementById('interevent-accept').addEventListener('click', function() {
        window.audioManager && window.audioManager.play('reward');
        overlay.classList.remove('active');
        overlay.classList.remove('levelup-mode');
        self._interWaveEvent = null;
        self._interWaveTimer = 0;
        if (self._interWaveTimeout) { clearTimeout(self._interWaveTimeout); self._interWaveTimeout = null; }
        evt.apply.call(self);
        self._syncUI();
        self._continueAfterInterWave();
    }, { once: true });
};

Gp._continueAfterInterWave = function() {
    this._pendingReward = false;
    /* Epoch 47: 深渊商店入口 */
    if (this._showAbyssShopEntrance && this._abyssShopVisible === false) {
        this._showAbyssShopEntrance();
    }
    if (this._extraEliteCount > 0) {
        /* Epoch 32: 怪物潮 — 额外精英怪 */
        for (var i = 0; i < this._extraEliteCount; i++) {
            this._spawnEliteEnemy();
        }
        this._extraEliteCount = 0;
    }
    this._monsterSurgeDoubleDrops = false;
    this._tempEnemyAtkDebuff = 0;
    this._tempEnemySpeedDebuff = 0;
    this._tempBerserkBonus = false;
    this._tempGoldMult = 1;
    this._tempCritBonus = 0;
    /* P2: 不清除仍在生效的护盾 — 只清除已过期的 */
    if (this._tempShieldEnd > 0 && this._elapsed >= this._tempShieldEnd) {
        this._tempShield = 0;
        this._tempShieldEnd = 0;
    }
        /* R30-H-025: _tempBuffEnd dead code — never assigned, removed */

    /* H-05: 统一通过 _beginLoop 启动，确保 runId guard + _announcingWave 守卫 */
    this._unfreezeClock();
    this._beginLoop();
};

Gp._spawnCoinBurst = function(count) {
    if (!this.battlefield) return;
    var px = this.player.x;
    var py = this.player.y;
    for (var i = 0; i < count; i++) {
        var angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
        var dist = 30 + Math.random() * 40;
        var cx = px + Math.cos(angle) * dist;
        var cy = py + Math.sin(angle) * dist;
        this.player.addGold(1);
    }
    /* L-022: 添加视觉反馈 — 委托给 CombatSystem */
    if (this._combat && this._combat.spawnCoinsAt) {
        this._combat.spawnCoinsAt(this, px, py, false, 1);
    }
    if (window.fxManager) window.fxManager.spawnText(px, py, '+' + count + ' 🪙', '#ffd700', 24); /* P1: 移除未使用的duration参数 */
};

/* ══════════════════════════════════════════════
   波次突变系统
   ══════════════════════════════════════════════ */

/* Gp._showMutatorPanel / _applyMutator fallback 已废弃 — 委托给 Systems */

Gp._clearMutatorEffects = function() {
    if (this._activeMutator === 'gravity' && this._origMagnetRadius != null) {
        this.player.magnetRadius = this._origMagnetRadius;
    }
    if (this._activeMutator === 'bloodmoon') {
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (e._bloodmoonStored) {
                e.atk = e._bloodmoonOrigAtk;
                e.maxHp = e._bloodmoonOrigMaxHp;
                e.hp = e._bloodmoonOrigHp;
                e._bloodmoonStored = false;
                e._bloodmoonOrigAtk = undefined;
                e._bloodmoonOrigMaxHp = undefined;
                e._bloodmoonOrigHp = undefined;
            }
            var el = this._enemyElements.get(e.id);
            if (el) el.style.transform = '';
        }
    }
    if (this._activeMutator === 'frenzy') {
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (e._frenzyStored) {
                e.speed = e._frenzyOrigSpeed || e.baseSpeed;
                e._frenzyStored = false;
                e._frenzyOrigSpeed = undefined;
            }
        }
    }
    if (this._activeMutator === 'frailty') {
        if (this._frailtyOrigPlayerAtk != null) this.player.atk = this._frailtyOrigPlayerAtk;
        this.player._frailtyDebuff = false; /* P0: 清除脆弱debuff状态 */
        this.player._frailtyStored = false; /* R143-P0: 清除防重入标志，允许新局重新应用脆弱突变 */
        for (var i = 0; i < this.enemies.length; i++) {
            var e = this.enemies[i];
            if (e._frailtyStored) {
                e.atk = e._frailtyOrigAtk;
                e._frailtyStored = false;
                e._frailtyOrigAtk = undefined;
            }
        }
    }
    this._activeMutator = null;
    this._origMagnetRadius = null;
    /* Epoch 38: 清除 Mutator 视觉反馈 */
    this._updateMutatorBadge();
};

/* ── Epoch 38: Mutator 徽章 + 共振指示 ── */

Gp._updateMutatorBadge = function() {
    if (!this.mutatorBadge) return;
    if (this._activeMutator) {
        var labels = { gravity:'引力逆转', bloodmoon:'狂暴血月', frenzy:'狂乱', frailty:'脆弱', wither:'枯萎' };
        this.mutatorBadge.textContent = labels[this._activeMutator] || this._activeMutator;
        this.mutatorBadge.className = 'mutator-badge ' + this._activeMutator;
        this.mutatorBadge.style.display = '';
        /* Screen tinting */
        var gc = this.container;
        if (gc) {
            gc.className = gc.className.replace(/mutator-\S+/g, '').trim();
            gc.classList.add('mutator-' + this._activeMutator);
        }
    } else {
        this.mutatorBadge.style.display = 'none';
        var gc = this.container;
        if (gc) gc.className = gc.className.replace(/mutator-\S+/g, '').trim();
    }
};

Gp._updateResonancePills = function() {
    if (!this.resonancePills) return;
    var p = this.player;
    var html = '';
    if (p.setResonanceSpeed) html += '<span class="resonance-pill resonance-speed">🔥 炎痕</span>';
    if (p.setResonanceIce) html += '<span class="resonance-pill resonance-ice">❄️ 永冻</span>';
    this.resonancePills.innerHTML = html;
};

Gp._clearTotems = function() {
    for (var i = 0; i < this._totems.length; i++) {
        if (this._totems[i].el && this._totems[i].el.parentNode) this._totems[i].el.remove();
    }
    this._totems = [];
};

/* ══════════════════════════════════════════════
   V3.0 Overdrive 狂暴系统
   ══════════════════════════════════════════════ */

Gp._triggerOverdrive = function() {
    window.audioManager && window.audioManager.play('overdrive');
    /* R115-P0: 屏幕阅读器播报 Overdrive 触发 */
    this._announceToSR('Overdrive 爆发！');
    /* Epoch 5: 委托 Overdrive 到 Systems */
    if (this._systems && this._systems.triggerOverdrive) {
        return this._systems.triggerOverdrive(this);
    }
    /* Fallback: Systems 不可用时直接初始化标志 */
    if (this._overdriveActive) return;
    this._overdriveActive = true;
    this._overdriveTimer = Balance.OVERDRIVE_DURATION;
    this.player.rage = 0;
    /* R117-P1: fallback 路径也递增计数，确保断点续玩时成就不丢失 */
    this._overdriveCount = (this._overdriveCount || 0) + 1;
    /* R117-P1: fallback 路径应用武器增益和敌人冻结（等效 Sys.triggerOverdrive） */
    if (this._activeWeapons) {
        for (var _w = 0; _w < this._activeWeapons.length; _w++) {
            var _wep = this._activeWeapons[_w];
            if (_wep) {
                _wep._odOrigAtk = _wep.atkFactor; /* R126-P0: 保存原始值以便_endOverdrive恢复 */
                _wep.atkFactor = (_wep.atkFactor || 1) * 2;
            }
        }
    }
    for (var _e = 0; _e < this.enemies.length; _e++) {
        var _en = this.enemies[_e];
        if (_en && _en.alive) {
            _en._overdriveStored = true; /* R137-P0: 记录状态以便_endOverdrive正确恢复 */
            _en._overdriveOrigSpeed = _en.speed;
            _en.speed = 0;
        }
    }
};

Gp._endOverdrive = function() {
    if (!this._overdriveActive) return;
    this._overdriveActive = false;
    this._overdriveTimer = 0;

    if (this.player) this.player.cdFloor = this._origCdFloor || Balance.DEFAULT_CD_FLOOR;
    this._origCdFloor = null; /* P1: 清除跨局残留 */

    /* P0: 恢复武器原始伤害（Sys.endOverdrive已实现，此处补齐） */
    for (var _wi = 0; _wi < (this._activeWeapons || []).length; _wi++) {
        var _w = this._activeWeapons[_wi];
        if (_w && _w._odOrigAtk) {
            _w.atkFactor = _w._odOrigAtk;
            _w._odOrigAtk = undefined;
        }
    }

    for (var _oi = 0; _oi < this.enemies.length; _oi++) {
        var _oe = this.enemies[_oi];
        if (_oe._overdriveStored) {
            _oe.speed = _oe._overdriveOrigSpeed || _oe.baseSpeed;
            _oe._overdriveStored = false;
            _oe._overdriveOrigSpeed = undefined;
        }
    }

    if (this.container) this.container.classList.remove('overdrive-active');
};

/* ══════════════════════════════════════════════
   终局领主 Boss Lord 系统
   ══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   Boss Gamble — 决战前风险/回报选择
   ══════════════════════════════════════════════ */

Gp._showBossGamble = function() {
    if (!this.battlefield) return;
    this._freezeClock();
    this.running = false;
    this._pendingBossGamble = true;

    /* H-001: 超时机制 — 10 秒无操作自动选择 safe */
    var self = this;
    var panel; /* R96-P0: 提前声明避免setTimeout回调中ReferenceError */
    this._gambleTimeout = setTimeout(function() {
        if (self._pendingBossGamble && panel && panel.parentNode) {
            self._pendingBossGamble = false;
            self._gambleActive = false;
            self._gambleType = null;
            self._gambleStaked = 0;
            panel.remove();
            /* P0-2: 超时路径必须生成领主，与手动选择路径一致 */
            self._spawnBossLordFromGamble();
            self._unfreezeClock();
            self._beginLoop();
        }
    }, 10000);

    var meta = window.saveManager._metaCache || {};
    var tokens = meta.metaTokens || 0;
    var gold50 = Math.floor(this.player.gold * 0.5);
    var canGamble = gold50 > 0;
    var canAbyss = tokens >= 1;

    var panel = document.createElement('div');
    panel.id = 'boss-gamble-panel';
    panel.className = 'boss-gamble-panel';
    panel.innerHTML =
        '<div class="gamble-title">🎲 决战豪赌</div>' +
        '<div class="gamble-subtitle">深渊领主即将降临，是否押注？</div>' +
        '<div class="gamble-choices">' +
            '<div class="gamble-card gamble-safe">' +
                '<div class="gamble-card-icon">🛡️</div>' +
                '<div class="gamble-card-title">稳妥前进</div>' +
                '<div class="gamble-card-desc">正常迎战领主，不押注任何资源</div>' +
                '<button class="gamble-btn" data-choice="safe">安全出征</button>' +
            '</div>' +
            '<div class="gamble-card gamble-gold' + (!canGamble ? ' disabled' : '') + '">' +
                '<div class="gamble-card-icon">💰</div>' +
                '<div class="gamble-card-title">金币豪赌</div>' +
                '<div class="gamble-card-desc">押 ' + gold50 + ' 金币 · 胜: 3x 返还 · 负: 全输</div>' +
                '<button class="gamble-btn' + (!canGamble ? ' disabled' : '') + '" data-choice="gold"' + (!canGamble ? ' disabled' : '') + '>金币豪赌</button>' +
            '</div>' +
            '<div class="gamble-card gamble-abyss' + (!canAbyss ? ' disabled' : '') + '">' +
                '<div class="gamble-card-icon">🌀</div>' +
                '<div class="gamble-card-title">深渊试炼</div>' +
                '<div class="gamble-card-desc">押 1 元代币 · 领主 +50% HP · 装备掉落 3x</div>' +
                '<button class="gamble-btn' + (!canAbyss ? ' disabled' : '') + '" data-choice="abyss"' + (!canAbyss ? ' disabled' : '') + '>深渊试炼</button>' +
            '</div>' +
        '</div>';
    this.battlefield.appendChild(panel);

    var self = this;
    var btns = panel.querySelectorAll('.gamble-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', (function(choice) {
            return function() {
                if (panel.parentNode) panel.remove();
                self._resolveGambleChoice(choice);
            };
        })(btns[i].getAttribute('data-choice')), { once: true });
    }
};

Gp._resolveGambleChoice = function(choice) {
    clearTimeout(this._gambleTimeout);
    this._pendingBossGamble = false;
    if (choice === 'safe') {
        this._gambleActive = false;
        this._gambleType = null;
        this._gambleStaked = 0;
    } else if (choice === 'gold') {
        this._gambleActive = true;
        this._gambleType = 'gold';
        this._gambleStaked = Math.floor(this.player.gold * 0.5);
        this.player.gold -= this._gambleStaked;
        this._syncUI();
    } else if (choice === 'abyss') {
        var meta = window.saveManager._metaCache || {};
        if ((meta.metaTokens || 0) >= 1) {
            this._gambleActive = true;
            this._gambleType = 'abyss';
            this._gambleStaked = 1;
            meta.metaTokens -= 1;
            window.saveManager._metaCache = meta;
            window.saveManager._saveMetaToStorage();
        } else {
            this._gambleActive = false;
        }
    }
    /* 生成领主（无论是否赌注） */
    this._spawnBossLordFromGamble();
    this._unfreezeClock(); /* R119-P0: 手动选择路径必须解冻时钟，与超时路径一致 */
    this._beginLoop();
};

Gp._spawnBossLordFromGamble = function() {
    /* 玩家做出选择后，实际生成领主 */
    if (this._bossLordSpawned) return;
    var level = Math.floor(this._elapsed / 15) + 1;
    var x = this._mapW / 2;
    var y = Math.floor(this._mapH * 0.35);
    var margin = 100;
    x = Math.max(margin, Math.min(this._mapW - margin, x));
    y = Math.max(margin, Math.min(this._mapH - margin, y));

    var id = this._enemyIdCounter++;
    var lord = new Enemy(id, x, y, level, true, 'Boss_Lord');
    lord._eng = this; /* Inject engine ref */
    /* Boss Lord HP/ATK 不受难度系数影响（独立设计） */
    /* var diff = 1;
    try { diff = window.levelConfig[this._currentLevelId].difficultyFactor || 1; } catch(e) {}
    lord.maxHp = Math.floor(lord.maxHp * diff);
    lord.hp = lord.maxHp;
    lord.atk = Math.floor(lord.atk * diff); */

    /* H-002: 精英模式 — 领主获得属性加成 (Balance.ELITE_HP_MULT / ELITE_ATK_MULT) */
    if (this._eliteModeActive && this._eliteMultiplier) {
        lord.maxHp = Math.floor(lord.maxHp * this._eliteMultiplier);
        lord.hp = lord.maxHp;
        lord.atk = Math.floor(lord.atk * this._eliteMultiplier);
    }
    this.enemies.push(lord);
    this._bossLord = lord;
    this._bossLordSpawned = true;

    /* Gamble: 深渊试炼增加领主HP */
    if (this._gambleType === 'abyss' && this._gambleActive) {
        lord.maxHp = Math.floor(lord.maxHp * Balance.BOSS_GAMBLE_HP_MULT);
        lord.hp = lord.maxHp;
        this._spawnCausalityText('⚠️ 深渊试炼激活：领主 +50% HP');
    }

    /* ── 变异保险库：血月对Boss Lord生效 ── */
    if (this._vaultMutations && this._vaultMutations.indexOf('bloodmoon') !== -1) {
        lord.atk = Math.floor(lord.atk * Balance.VAULT_BLOODMOON_ATK_MULT);
        lord.maxHp = Math.floor(lord.maxHp * Balance.VAULT_BLOODMOON_HP_MULT);
        lord.hp = Math.floor(lord.hp * Balance.VAULT_BLOODMOON_HP_MULT);
    }

    var el = document.createElement('div');
    el.className = 'enemy boss boss-lord';
    el.dataset.id = id;
    el.dataset.enemyType = 'Boss_Lord';
    /* Boss 字符直接放入 DOM（::before 留给 aura） */
    el.innerHTML = '<span style="font-size:calc(42*1.5px);font-weight:900;color:#b71c1c;text-shadow:0 0 12px rgba(211,47,47,0.6);z-index:1;position:relative;">中</span>';
    var hpBar = document.createElement('div');
    hpBar.className = 'enemy-hp-bar';
    var hpFill = document.createElement('div');
    hpFill.className = 'enemy-hp-fill';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);
    this._worldLayer.appendChild(el);
    this._enemyElements.set(id, el);
    lord.el = el;

    if (this._bloodRageActive) {
        lord.speed = Math.floor(lord.speed * Balance.BOSS_BLOOD_RAGE_SPEED_MULT);
        lord.baseSpeed = lord.speed;
        if (lord.el) lord.el.classList.add('boss-blood-rage');
    }

    if (this.bossHpBar) this.bossHpBar.classList.add('active');
    this._screenShake();
};

Gp._resolveGamble = function(won) {
    if (!this._gambleActive) return;
    if (this._gambleType === 'gold') {
        if (won) {
            var bonus = this._gambleStaked * 3;
            this.player.addGold(bonus);
            this._spawnCausalityText('💰 金币豪赌胜利！+' + bonus + ' 金币');
        } else {
            this._spawnCausalityText('💰 金币豪赌失败... 金币已输掉');
        }
    } else if (this._gambleType === 'abyss') {
        if (won) {
            this._gambleAbyssBonus = true;
            this._spawnCausalityText('🌀 深渊试炼胜利！下次装备掉落 3x');
        } else {
            this._spawnCausalityText('🌀 深渊试炼失败... 元代币已损失');
        }
    }
    this._gambleActive = false;
    this._gambleType = null;
    this._gambleStaked = 0;
};

/* DEPRECATED: Gp._spawnBossLord 已在RXX移除，使用 _spawnBossLordFromGamble 替代；保留此注释防止重复添加 */

Gp._spawnEnemyType = function(type) {
    var angle = Math.random() * Math.PI * 2;
    var margin = 30;
    var vpW = this.battlefield.clientWidth;
    var vpH = this.battlefield.clientHeight;
    var viewR = Math.sqrt(vpW * vpW + vpH * vpH) * 0.5;
    var spawnRadius = viewR + 50;
    var cx = this.player.x + Math.cos(angle) * spawnRadius;
    var cy = this.player.y + Math.sin(angle) * spawnRadius;
    cx = Math.max(margin, Math.min(this._mapW - margin, cx));
    cy = Math.max(margin, Math.min(this._mapH - margin, cy));

    var level = Math.floor(this._elapsed / 15) + 1;
    var id = this._enemyIdCounter++;
    var enemy = new Enemy(id, cx, cy, level, false, type);
    enemy._eng = this; /* Inject engine ref */
    /* Apply level difficulty factor (consistent with SpawnSystem) */
    var diff = 1;
    try { diff = (window.levelConfig[this._currentLevelId].difficultyFactor || 1) * (window.difficultyScale || 1); } catch(e) {}
    enemy.maxHp = Math.floor(enemy.maxHp * diff);
    enemy.hp = enemy.maxHp;
    enemy.atk = Math.floor(enemy.atk * diff);
    this.enemies.push(enemy);
    /* R37-P0: 深渊变体 — 与 _spawnEliteEnemy 保持一致 */
    if (this._applyAbyssVariant) this._applyAbyssVariant(enemy);

    var el = document.createElement('div');
    el.className = 'enemy';
    el.dataset.id = id;
    /* P1-8: 类型/花色标记（Boss 召唤路径同样驱动 per-type 造型） */
    el.dataset.enemyType = enemy.type || 'Normal';
    el.dataset.suit = ({ Normal: '萬', Tanker: '條', Stalker: '筒', Shaman: '風', Barrier: '白', Bomber: '發', Splitter: '中', Archer: '索' })[enemy.type] || '萬';
    var hpBar = document.createElement('div');
    hpBar.className = 'enemy-hp-bar';
    var hpFill = document.createElement('div');
    hpFill.className = 'enemy-hp-fill';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);
    this._worldLayer.appendChild(el);
    this._enemyElements.set(id, el);
    enemy.el = el;
    return enemy;
};

Gp._updateEnemyProjectiles = function(dt) {
    for (var i = this._enemyProjectiles.length - 1; i >= 0; i--) {
        var p = this._enemyProjectiles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.lifeTime -= dt;
        if (p.lifeTime <= 0) p.alive = false;

        if (!p.el) {
            var pel = document.createElement('div');
            pel.className = 'enemy-projectile';
            var d = p.radius * 2;
            pel.style.width = d + 'px';
            pel.style.height = d + 'px';
            this._worldLayer.appendChild(pel);
            p.el = pel;
        }
        p.el.style.left = (p.x - p.radius) + 'px';
        p.el.style.top = (p.y - p.radius) + 'px';

        if (p.x < -100 || p.x > this._mapW + 100 || p.y < -100 || p.y > this._mapH + 100) {
            p.alive = false;
        }

        if (p.alive && this.player) {
            var dx = this.player.x - p.x;
            var dy = this.player.y - p.y;
            if (dx * dx + dy * dy < (this.player.radius + p.radius) * (this.player.radius + p.radius)) {
                if (!p._hitPlayer) {
                    p._hitPlayer = true;
                    var dmg = p.damage;
                    /* Epoch 14: 关卡亲和减伤 */
                    if (this._mapAffinityReduction) {
                        dmg = Math.max(1, Math.floor(dmg * (1 - this._mapAffinityReduction)));
                    }
                    this.player.takeDamage(dmg, this._bossLord || this);
                }
                p.alive = false;
            }
        }

        /* R37-P1: 弹道穿敌检测 — 击中其他敌人则销毁 */
        if (p.alive && this.enemies) {
            for (var _pj = 0; _pj < this.enemies.length; _pj++) {
                var _pe = this.enemies[_pj];
                if (!_pe.alive || _pe.id === p._ownerId) continue;
                var edx = _pe.x - p.x;
                var edy = _pe.y - p.y;
                if (edx * edx + edy * edy < (_pe.radius + p.radius) * (_pe.radius + p.radius)) {
                    if (!p._hitEnemy) {
                        p._hitEnemy = true;
                        var projDmg = p.damage;
                        /* R129-P0: 敌方弹道击中敌人时也应用关卡亲和减伤 */
                        if (this._mapAffinityReduction) {
                            projDmg = Math.max(1, Math.floor(projDmg * (1 - this._mapAffinityReduction)));
                        }
                        if (_pe.takeDamage) _pe.takeDamage(projDmg, p._owner || this);
                    }
                    p.alive = false;
                    break;
                }
            }
        }

        if (!p.alive) {
            if (p.el && p.el.parentNode) p.el.remove();
            this._enemyProjectiles.splice(i, 1);
        }
    }
};

Gp._cleanEnemyProjectiles = function() {
    for (var i = 0; i < this._enemyProjectiles.length; i++) {
        if (this._enemyProjectiles[i].el && this._enemyProjectiles[i].el.parentNode) {
            this._enemyProjectiles[i].el.remove();
        }
    }
    this._enemyProjectiles = [];
};

/* ══════════════════════════════════════════════
   Epoch 42: 骑士闪避震荡 — 100px 冲击波
   ══════════════════════════════════════════════ */

Gp._triggerKnightDodgeSlam = function() {
    var radius = Balance.KNIGHT_DODGE_SLAM_RADIUS;
    var dmg = Math.floor(this.player.atk * Balance.KNIGHT_SLAM_ATK_FACTOR);
    var px = this.player.x;
    var py = this.player.y;
    /* 视觉：冲击波 DOM */
    var slamEl = document.createElement('div');
    slamEl.className = 'knight-dodge-slam';
    slamEl.style.left = (px - radius) + 'px';
    slamEl.style.top = (py - radius) + 'px';
    slamEl.style.width = (radius * 2) + 'px';
    slamEl.style.height = (radius * 2) + 'px';
    this._worldLayer.appendChild(slamEl);
    var self = this;
    setTimeout(function() { if (slamEl.parentNode) slamEl.remove(); }, 500);
    /* 伤害范围内敌人 */
    for (var i = 0; i < this.enemies.length; i++) {
        var e = this.enemies[i];
        if (!e.alive) continue;
        var dx = e.x - px;
        var dy = e.y - py;
        if (dx * dx + dy * dy < radius * radius) {
            e.takeDamage(dmg, 'knight_slam', px, py);
        }
    }
    /* 击退 */
    for (var j = 0; j < this.enemies.length; j++) {
        var se = this.enemies[j];
        if (!se.alive) continue;
        var sx = se.x - px;
        var sy = se.y - py;
        var dist = Math.sqrt(sx * sx + sy * sy);
        if (dist < radius && dist > 0) {
            var force = Balance.KNIGHT_DODGE_SLAM_FORCE;
            se.x += (sx / dist) * force;
            se.y += (sy / dist) * force;
            se._knockbackVelocity = force;
            if (typeof se._clampPosition === 'function') se._clampPosition(this);
        }
    }
    /* FCT 飘字 */
    if (window.fxManager) window.fxManager.spawnText(px, py - 30, '闪避震荡!', '#4caf50', 18); /* P1: 移除未使用的duration参数 */
};

})();
