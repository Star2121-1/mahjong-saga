(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

/* ══════════════════════════════════════════════
   Epoch 47: 无尽深渊轮回扩展系统
   ══════════════════════════════════════════════ */

/* ── 深渊专属变异组合（每5层解锁新组合） ── */

Gp._abyssComboDefinitions = [
    { id: 'abyss_bloodmoon', name: '深渊血月', desc: '血月效果翻倍（HP+60%, ATK+80%）但掉落×2', unlockAt: 1, effects: { hpMult: Balance.ABYSS_BLOODMOON_HP_MULT, atkMult: Balance.ABYSS_BLOODMOON_ATK_MULT, dropMult: Balance.ABYSS_BLOODMOON_DROP_MULT } },
    { id: 'abyss_frenzy', name: '深渊狂乱', desc: '敌人攻速+100%，击杀返还50%生命', unlockAt: 5, effects: { speedMult: Balance.ABYSS_FRENZY_SPEED_MULT, lifestealOnKill: 0.5 } },
    { id: 'abyss_gravity', name: '深渊引力', desc: '经验吸附范围×3，但金币掉落-50%', unlockAt: 10, effects: { magnetMult: 3, goldPenalty: 0.5 } },
    { id: 'abyss_frailty', name: '深渊脆弱', desc: '玩家攻击+150%，受伤+50%', unlockAt: 15, effects: { playerAtkMult: Balance.ABYSS_FRAILTY_ATK_MULT, playerDamageMult: Balance.ABYSS_FRAILTY_DMG_MULT } },
    { id: 'abyss_wither', name: '深渊凋零', desc: '每秒损失2%HP但获得等量护盾', unlockAt: 20, effects: { drainPct: 0.02, shieldGen: 0.02 } }
];

/* ── 深渊专属敌人变体 ── */

Gp._abyssVariantDefinitions = [
    { id: 'abyss_tanker', name: '渊铠', type: 'Tanker', desc: '体型+50%，掉落+30%', hpMult: 1.5, dropMult: 1.3, suit: '条' },
    { id: 'abyss_stalker', name: '渊影', type: 'Stalker', desc: '速度+40%，闪现距离+2倍', speedMult: 1.4, teleportMult: 2, suit: '筒' },
    { id: 'abyss_shaman', name: '渊巫', type: 'Shaman', desc: '撤退距离+50%，治疗范围+2倍', retreatMult: 1.5, healMult: 2, suit: '风' },
    { id: 'abyss_barrier', name: '渊壁', type: 'Barrier', desc: '屏障HP×2，破碎时生成2个小屏障', hpMult: 2.0, splitCount: 2, suit: '白' },
    { id: 'abyss_bomber', name: '渊爆', type: 'Bomber', desc: '爆炸范围+50%，伤害+30%', rangeMult: 1.5, dmgMult: 1.3, suit: '发' },
    { id: 'abyss_splitter', name: '渊分', type: 'Splitter', desc: '分裂数×2（共4个），带随机类型', splitMult: 2, suit: '中' },
    { id: 'abyss_elite', name: '渊核', type: 'Normal', desc: '金色外观，全属性+100%，击杀掉落深渊币', hpMult: 2.0, atkMult: 2.0, dropAbyssCoin: true, suit: '萬' }
];

/* ── 深渊商店 ── */

Gp._abyssShopItems = [
    { id: 'abyss_revive', name: '轮回之泪', desc: '本轮额外1次复活机会', cost: 3, type: 'revive' },
    { id: 'abyss_magnet', name: '黑洞核心', desc: '永久吸附范围+50px（仅本轮）', cost: 2, type: 'magnet' },
    { id: 'abyss_cd', name: '时停碎片', desc: '所有武器CD-20%（仅本轮）', cost: 4, type: 'cdReduce' },
    { id: 'abyss_hp', name: '命牌', desc: '最大HP+50（仅本轮）', cost: 2, type: 'hpBoost' },
    { id: 'abyss_atk', name: '杀牌', desc: '攻击力+10（仅本轮）', cost: 3, type: 'atkBoost' },
    { id: 'abyss_clear', name: '清台', desc: '清除场上所有敌人', cost: 5, type: 'clear' }
];

/* ── 运行时状态 ── */

Gp._initAbyssState = function() {
    this._abyssCoins = 0;           // 深渊币
    this._abyssUnlockedCombos = [];  // 已解锁的深渊变异组合
    this._abyssActiveCombo = null;   // 当前激活的组合
    this._abyssVariantEnabled = false; // 是否启用深渊变体
    this._abyssShopVisible = false;
    this._abyssLoopHpScale = 1;      // 深渊层额外HP缩放
    this._abyssLoopAtkScale = 1;     // 深渊层额外ATK缩放
    /* R46-P1: 清除玩家身上的深渊状态字段，防止导航重启时残留 */
    if (this.player) {
        this.player._abyssFrailtyOrigAtk = undefined;
        this.player._abyssFrailtyAtk = undefined;
        this.player._abyssBloodmoonApplied = false;
        this.player._abyssBloodmoonAtkBonus = undefined;
        this.player._abyssBloodmoonOrigMaxHp = undefined; /* R147-P1: 初始化血月原始HP字段，防止跨局污染 */
        this.player._frailtyDebuff = false;
        this._abyssFrenzyLifestealSet = false; /* R147-P1: 初始化狂乱吸血标志，防止跨局污染 */
    }
};

/* ── 深渊层属性缩放 ── */

Gp._updateAbyssScaling = function() {
    var loop = this.loopCount || 0;
    if (loop <= 0) {
        this._abyssLoopHpScale = 1;
        this._abyssLoopAtkScale = 1;
        this._abyssVariantEnabled = false;
        return;
    }
    /* R46: 统一为指数公式与Enemy.js一致（1.08^loop vs 旧线性1+loop*0.05） */
    this._abyssLoopHpScale = Math.pow(Balance.ABYSS_LOOP_HP_ATK_MULT, loop);
    this._abyssLoopAtkScale = Math.pow(Balance.ABYSS_LOOP_HP_ATK_MULT, loop);
    /* 第3层起启用深渊变体 */
    this._abyssVariantEnabled = loop >= 3;
    /* 自动解锁已满足条件的组合 */
    this._unlockAbyssCombos();
};

/* ── 解锁深渊变异组合 ── */

Gp._unlockAbyssCombos = function() {
    var loop = this.loopCount || 0;
    var defs = this._abyssComboDefinitions;
    for (var i = 0; i < defs.length; i++) {
        var unlockAt = defs[i].unlockAt || (i + 1) * Balance.ABYSS_COMBO_UNLOCK_INTERVAL;
        if (loop >= unlockAt && this._abyssUnlockedCombos.indexOf(defs[i].id) === -1) {
            this._abyssUnlockedCombos.push(defs[i].id);
            this._spawnCausalityText('🌀 解锁深渊变异: ' + defs[i].name);
        }
    }
};

/* ── 应用深渊变体到敌人 ── */

Gp._applyAbyssVariant = function(enemy) {
    /* P3-NEW: 深渊变体应用于所有非 Boss_Lord 敌人 */
    if (!this._abyssVariantEnabled || !enemy || enemy.type === 'Boss_Lord') return enemy.type;
    /* 15% 概率替换为深渊变体 */
    if (Math.random() > 0.15) return enemy.type;
    var variants = this._abyssVariantDefinitions;
    var v = variants[Math.floor(Math.random() * variants.length)];
    enemy._abyssVariant = v;
    enemy._abyssVariantName = v.name;
    if (v.hpMult) {
        enemy.maxHp = Math.floor(enemy.maxHp * v.hpMult);
        enemy.hp = Math.floor(enemy.hp * v.hpMult);
    }
    if (v.atkMult) enemy.atk = Math.floor(enemy.atk * v.atkMult);
    if (v.speedMult) enemy.speed = Math.floor(enemy.speed * v.speedMult);
    /* 视觉标记 */
    if (enemy.el) {
        enemy.el.classList.add('abyss-variant');
        enemy.el.style.boxShadow = '0 0 12px rgba(156,39,176,0.8), 0 0 24px rgba(156,39,176,0.4)';
    }
    return v.id;
};

/* ── 深渊商店 ── */

Gp._showAbyssShop = function() {
    if (!this.battlefield) return;
    this.running = false; /* R214-P1: 与 mutator panel/reward overlay 一致，暂停游戏循环 */
    this._freezeClock();
    this._abyssShopVisible = true;

    var panel = document.createElement('div');
    panel.id = 'abyss-shop-panel';
    panel.className = 'abyss-shop-panel';

    var self = this;
    var items = this._abyssShopItems;
    var cardsHtml = '';
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        /* R165-P0: 不修改共享原型上的_displayCost，用本地变量避免跨局污染 */
        var displayCost = Math.floor(it.cost * Balance.ABYSS_SHOP_PRICE_MULT);
        var canAfford = this._abyssCoins >= displayCost;
        cardsHtml +=
            '<div class="abyss-shop-card">' +
                '<div class="abyss-shop-card-name">' + it.name + '</div>' +
                '<div class="abyss-shop-card-desc">' + it.desc + '</div>' +
                '<div class="abyss-shop-card-cost">' + displayCost + ' 深渊币</div>' +
                '<button class="abyss-shop-btn"' + (canAfford ? '' : ' disabled') + '>购买</button>' +
            '</div>';
    }

    panel.innerHTML =
        '<div class="abyss-shop-title">🌀 深渊商店</div>' +
        '<div class="abyss-shop-balance">深渊币: ' + this._abyssCoins + '</div>' +
        '<div class="abyss-shop-grid">' + cardsHtml + '</div>' +
        '<button class="abyss-shop-close">离开</button>';

    document.body.appendChild(panel); /* R231-P1: 深渊商店面板追加到body，避免transform:scale导致position:fixed失效 */

    /* R165-P0: displayCost now stored as closure variable — recompute in button handler */
    panel.querySelectorAll('.abyss-shop-btn').forEach(function(btn, idx) {
        btn.addEventListener('click', function() {
            var item = items[idx];
            var displayCost = Math.floor(item.cost * Balance.ABYSS_SHOP_PRICE_MULT);
            if (self._abyssCoins < displayCost) return;
            self._abyssCoins -= displayCost;
            self._buyAbyssItem(item);
            panel.querySelector('.abyss-shop-balance').textContent = '深渊币: ' + self._abyssCoins;
            /* R219-P0: 购买后恢复游戏循环，与关闭按钮保持一致 */
            self.running = true;
            self._unfreezeClock();
            self._beginLoop();
            /* 更新按钮状态 */
            panel.querySelectorAll('.abyss-shop-btn').forEach(function(b, i) {
                var ic = Math.floor(items[i].cost * Balance.ABYSS_SHOP_PRICE_MULT);
                b.disabled = self._abyssCoins < ic;
            });
        });
    });

    panel.querySelector('.abyss-shop-close').addEventListener('click', function() {
        panel.remove();
        self._abyssShopVisible = false;
        self.running = true; /* R214-P1: 恢复游戏循环 */
        self._unfreezeClock();
        self._beginLoop();
    });
};

Gp._buyAbyssItem = function(item) {
    var p = this.player;
    switch (item.type) {
        case 'revive':
            p._hasRevive = true;
            p._reviveCount = (p._reviveCount || 0) + 1;
            this._spawnCausalityText('💧 获得1次复活');
            break;
        case 'magnet':
            p.magnetRadius += 50;
            this._spawnCausalityText('🕳️ 吸附范围+50');
            break;
        case 'cdReduce':
            if (this._activeWeapons) {
                for (var i = 0; i < this._activeWeapons.length; i++) {
                    this._activeWeapons[i].cd = Math.max(p.cdFloor || Balance.DEFAULT_CD_FLOOR, this._activeWeapons[i].cd * 0.8);
                }
            }
            this._spawnCausalityText('⏱️ 武器CD-20%');
            break;
        case 'hpBoost':
            p.maxHp += 50;
            p.hp = Math.min(p.hp + 50, p.maxHp);
            this._spawnCausalityText('❤️ 最大HP+50');
            break;
        case 'atkBoost':
            p.atk += 10;
            this._spawnCausalityText('⚔️ 攻击力+10');
            break;
        case 'clear':
            /* 清除场上所有敌人 */
            for (var j = 0; j < this.enemies.length; j++) {
                var e = this.enemies[j];
                if (e.alive) {
                    e.takeDamage(e.maxHp, 'abyss_clear');
                }
            }
            this._spawnCausalityText('💥 清场！');
            break;
    }
    window.audioManager && window.audioManager.play('pickup');
};

/* ── 深渊币掉落 ── */

Gp._tryAbyssCoinDrop = function(enemy) {
    if (!this._abyssVariantEnabled) return false;
    /* 精英变体和 abyss_elite 类型有概率掉落 */
    if (enemy._abyssVariant && enemy._abyssVariant.dropAbyssCoin) {
        this._abyssCoins++;
        this._spawnCausalityText('🪙 获得 1 深渊币');
        return true;
    }
    /* 普通精英怪也有小概率，排除Boss */
    if (!enemy.isBoss && Math.random() < 0.05) {
        this._abyssCoins++;
        this._spawnCausalityText('🪙 获得 1 深渊币');
        return true;
    }
    return false;
};

/* ── 深渊组合效果应用 ── */

Gp._applyAbyssCombo = function(comboId) {
    var defs = this._abyssComboDefinitions;
    var combo = null;
    for (var i = 0; i < defs.length; i++) {
        if (defs[i].id === comboId) { combo = defs[i]; break; }
    }
    if (!combo) return;
    if (this._abyssActiveCombo === comboId) {
        /* 切换关闭 — 还原属性 */
        this._abyssActiveCombo = null;
        this._spawnCausalityText('关闭深渊变异: ' + combo.name);
        /* R52-P0: 关闭时还原受组合影响的玩家属性 */
        if (combo.id === 'abyss_frailty' && this.player && this.player._abyssFrailtyOrigAtk !== undefined) {
            this.player.atk = this.player._abyssFrailtyOrigAtk;
            this.player._abyssFrailtyOrigAtk = undefined;
            this.player._abyssFrailtyAtk = undefined;
            this.player._frailtyDebuff = false;
        }
        if (combo.id === 'abyss_bloodmoon' && this.player) {
            /* R125-P1: 关闭时还原原始maxHp，防止血月效果跨combo残留 */
            if (this.player._abyssBloodmoonOrigMaxHp !== undefined) {
                this.player.maxHp = this.player._abyssBloodmoonOrigMaxHp;
                this.player._abyssBloodmoonOrigMaxHp = undefined;
            }
            this.player._abyssBloodmoonApplied = false;
            this.player._abyssBloodmoonAtkBonus = undefined;
        }
        /* R137-P0: 关闭combo时清理各combo的运行时状态残留 */
        if (combo.id === 'abyss_frenzy') {
            for (var _ff = 0; _ff < this.enemies.length; _ff++) {
                var _fe = this.enemies[_ff];
                if (_fe.alive && _fe._frenzyApplied) {
                    /* R159-P0: 恢复原始baseSpeed，防止combo多次开关导致速度指数增长 */
                    if (_fe._frenzyBaseSpeed !== undefined) {
                        _fe.baseSpeed = _fe._frenzyBaseSpeed;
                        _fe._frenzyBaseSpeed = undefined;
                    }
                    _fe.speed = _fe.baseSpeed;
                    _fe._frenzyApplied = false;
                }
            }
            this._abyssFrenzyLifestealSet = false; /* R156-P0: 关闭狂乱combo时重置吸血标志 */
        } else if (combo.id === 'abyss_gravity') {
            if (this.player) this.player.magnetRadius = this.player._baseMagnetRadius || Balance.MAGNET_RADIUS_DEFAULT;
        } else if (combo.id === 'abyss_wither') {
            this._witherAbyssTimer = 0;
        }
        /* R221-P0: wither计时器应在所有combo关闭时重置，否则切换后再激活wither会导致立即触发 drain/shield 效果 */
        if (combo.id !== 'abyss_wither') {
            this._witherAbyssTimer = 0;
        }
        return;
    }
    this._abyssActiveCombo = comboId;
    this._spawnCausalityText('激活深渊变异: ' + combo.name + ' — ' + combo.desc);
};

/* ── 在波次间事件中显示深渊商店入口 ── */

Gp._showAbyssShopEntrance = function() {
    if (this.loopCount < 3) return; /* 3层后才开放商店 */

    var overlay = document.getElementById('reward-overlay');
    if (!overlay) return;
    var cardsDiv = overlay.querySelector('.reward-cards');
    if (!cardsDiv) return;

    var shopBtn = document.createElement('button');
    shopBtn.id = 'abyss-shop-entrance-btn'; /* R140-P0: 加ID方便跨路径清理，防止DOM泄漏 */
    shopBtn.className = 'relic-btn';
    shopBtn.style.cssText = 'background:#9c27b0;margin-top:12px;width:100%;';
    shopBtn.textContent = '🌀 深渊商店 (' + this._abyssCoins + ' 币)';
    var self = this;
    shopBtn.addEventListener('click', function() {
        overlay.classList.remove('active');
        self._showAbyssShop();
    });
    cardsDiv.appendChild(shopBtn);
};

/* ── 初始化时设置深渊状态 ── */

var _origStartNewRun = Gp._startNewRun;
Gp._startNewRun = function(heroId, levelId) {
    _origStartNewRun.call(this, heroId, levelId);
    this._initAbyssState();
    this._updateAbyssScaling();
};

var _origEnterAbyss = Gp._enterAbyss;
Gp._enterAbyss = function() {
    /* 保留深渊币和已解锁组合 */
    var savedCoins = this._abyssCoins;
    var savedCombos = this._abyssUnlockedCombos.slice();
    /* R46-P1: 重置active combo，防止跨层继承上一轮状态 */
    this._abyssActiveCombo = null;
    /* R187-P0: 重置combo激活标志，允许每轮回重新激活深渊combo */
    this._abyssComboActivated = false;
    /* R205-P0: 先更新缩放倍率再调用_origEnterAbyss，确保玩家HP/ATK使用正确的深渊层数缩放 */
    this._updateAbyssScaling();
    _origEnterAbyss.call(this);
    this._abyssCoins = savedCoins;
    this._abyssUnlockedCombos = savedCombos;
    /* 移除_post-call _updateAbyssScaling()，已在前置调用 */
};

})();
