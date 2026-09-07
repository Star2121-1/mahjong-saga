(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;


Gp._spawnCoinsAt = function(x, y, isBoss, level) {
    /* Epoch 5: 委托掉落到 CombatSystem */
    if (this._combat && this._combat.spawnCoinsAt) {
        return this._combat.spawnCoinsAt(this, x, y, isBoss, level);
    }
    level = level || 1;
    var count = isBoss ? Math.floor(Balance.COIN_COUNT_BOSS_BASE + level * Balance.COIN_COUNT_BOSS_PER_LVL + Math.random() * Balance.COIN_COUNT_BOSS_RANDOM_MAX) : Math.floor(Balance.COIN_COUNT_NORMAL_BASE + level * Balance.COIN_COUNT_NORMAL_PER_LVL + Math.random() * Balance.COIN_COUNT_NORMAL_RANDOM_MAX);
    var _vaultBlood = this._vaultMutations && this._vaultMutations.indexOf('bloodmoon') !== -1;
    if (this._activeMutator === 'bloodmoon' || _vaultBlood) count *= 2;
    if (this._activeMutator === 'frenzy') count = Math.floor(count * Balance.MUTATOR_FRENZY_GOLD_MULT);
    /* R242-P0: 计算每枚金币价值用于baseGold存储 */
    var coinVal = Math.max(1, Math.floor((isBoss ? Balance.COIN_COUNT_BOSS_BASE : Balance.COIN_COUNT_NORMAL_BASE) / Math.max(1, count)));
    for (var i = 0; i < count; i++) {
        var cx = x + (Math.random() - 0.5) * Balance.COIN_SCATTER;
        var cy = y + (Math.random() - 0.5) * Balance.COIN_SCATTER;
        var el = document.createElement('div');
        el.className = 'coin-placeholder';
        el.style.left = (cx - 6) + 'px';
        el.style.top = (cy - 6) + 'px';
        this._worldLayer.appendChild(el);
        this._activeCoins.push({ x: cx, y: cy, el: el, baseGold: coinVal });
    }
};

/* ── Epoch 32: 精英怪生成 ── */

Gp._spawnEliteEnemy = function() {
    /* P1-2: 检查波次上限，防止怪物潮溢出 */
    var cap = this._getWaveEnemyMax ? this._getWaveEnemyMax() : 999;
    if (this.currentWaveSpawnedCount >= cap) return;

    var level = Math.floor(this._elapsed / 15) + 1;
    var angle = Math.random() * Math.PI * 2;
    var dist = 200 + Math.random() * 50;
    var x = this.player.x + Math.cos(angle) * dist;
    var y = this.player.y + Math.sin(angle) * dist;

    var id = ++this._enemyIdCounter;
    /* P0: 精英怪类型池与主刷怪权重表同步，避免硬编码缺失类型 */
    var weights = this._enemyTypeWeights || window.Balance.DEFAULT_ENEMY_WEIGHTS;
    var typeKeys = Object.keys(weights);
    var roll = Math.random();
    var cumulative = 0;
    var enemyType = 'Normal';
    for (var _ti = 0; _ti < typeKeys.length; _ti++) {
        cumulative += weights[typeKeys[_ti]];
        if (roll < cumulative) { enemyType = typeKeys[_ti]; break; }
    }
    var enemy = new Enemy(id, x, y, level, false, enemyType);
    /* R157-P0: 精英怪生成位置需clamp到地图边界，防止穿墙 */
    var _spM = Balance.ENEMY_SPAWN_MARGIN;
    enemy.x = Math.max(_spM, Math.min(this._mapW - _spM, enemy.x));
    enemy.y = Math.max(_spM, Math.min(this._mapH - _spM, enemy.y));
    enemy._eng = this; /* Inject engine ref */

    /* P2: 应用关卡难度系数，与_spawnEnemy保持一致 */
    var diff = 1;
    try {
        var cfg = window.levelConfig[this._currentLevelId];
        if (cfg) diff = (cfg.difficultyFactor || 1) * (window.difficultyScale || 1);
    } catch(e) {}

    /* Elite boost — 使用与精英模式一致的 ELITE_HP_MULT/ELITE_ATK_MULT 常量 (H-002) */
    enemy.maxHp = Math.floor(enemy.maxHp * diff * Balance.ELITE_HP_MULT);
    enemy.hp = enemy.maxHp;
    enemy.atk = Math.floor(enemy.atk * diff * Balance.ELITE_ATK_MULT);
    enemy.el && enemy.el.classList.add('elite-marker');

    /* R30-M-005: 精英怪也应用临时debuff */
    if (this._tempEnemyAtkDebuff > 0) {
        enemy.atk = Math.floor(enemy.atk * this._tempEnemyAtkDebuff);
    }
    if (this._tempEnemySpeedDebuff > 0) {
        enemy.speed *= this._tempEnemySpeedDebuff;
    }
    /* R152-F2: 波次间事件debuff在首次敌人生成时消费并清零，
       确保冥想(攻击-20%)/时光缓流(移速-30%)正确应用到下一波 */
    if (this._tempEnemyAtkDebuff > 0 || this._tempEnemySpeedDebuff > 0) {
        this._tempEnemyAtkDebuff = 0;
        this._tempEnemySpeedDebuff = 0;
    }

    /* R194-P1: 精英怪也应用活跃突变效果，与_spawnEnemy保持一致 */
    if (this._activeMutator) {
        var _emut = this._activeMutator;
        if (_emut === 'bloodmoon') {
            /* R202-P0: 为新刷精英敌人设置stored标志 */
            enemy._bloodmoonStored = true;
            enemy._bloodmoonOrigAtk = enemy.atk;
            enemy._bloodmoonOrigMaxHp = enemy.maxHp;
            enemy._bloodmoonOrigHp = enemy.hp;
            enemy.maxHp = Math.floor(enemy.maxHp * Balance.MUTATOR_BLOODMOON_HP_MULT);
            enemy.hp = enemy.maxHp;
            enemy.atk = Math.floor(enemy.atk * Balance.MUTATOR_BLOODMOON_ATK_MULT);
        } else if (_emut === 'frenzy') {
            /* R202-P0: 为新刷精英敌人设置stored标志 */
            enemy._frenzyStored = true;
            enemy._frenzyOrigSpeed = enemy.speed;
            enemy.speed = Math.round(enemy.speed * Balance.MUTATOR_FRENZY_SPEED_MULT);
        }
    }

    this.enemies.push(enemy);
    /* R246-P1: 精英怪创建DOM，否则永远不会渲染 */
    var eel = document.createElement('div');
    eel.className = 'enemy';
    eel.dataset.enemyType = enemyType;
    eel.dataset.suit = ({ Normal: '萬', Tanker: '條', Stalker: '筒', Shaman: '風', Barrier: '白', Bomber: '發', Splitter: '中', Archer: '索' })[enemyType] || '萬';
    if (enemy.isBoss) {
        eel.classList.add('boss');
        var maxW = this._getMaxWaves ? this._getMaxWaves() : 99;
        if (this._waveCount >= maxW - 1) eel.classList.add('final-boss');
        if (enemyType === 'Boss_Lord') eel.classList.add('boss-lord');
    }
    eel.dataset.id = id;
    eel.style.background = '#2a4a3a';
    eel.style.borderRadius = '4px';
    eel.style.boxShadow = '0 3px 0 #1a3020, 0 5px 0.5px #3a5a4a, 0 6px 8px rgba(0,0,0,0.4)';
    eel.style.display = 'flex';
    eel.style.alignItems = 'center';
    eel.style.justifyContent = 'center';
    eel.style.fontSize = '12px';
    eel.style.fontWeight = '700';
    eel.style.color = '#5a8a6a';
    var ehpBar = document.createElement('div');
    ehpBar.className = 'enemy-hp-bar';
    var ehpFill = document.createElement('div');
    ehpFill.className = 'enemy-hp-fill';
    ehpBar.appendChild(ehpFill);
    eel.appendChild(ehpBar);
    if (this._worldLayer) this._worldLayer.appendChild(eel);
    if (this._enemyElements) this._enemyElements.set(id, eel);
    enemy.el = eel;
    enemy.el.classList.add('elite-marker');
    /* P1: 直接调用GameEngine原型方法，而非通过 Systems（不存在此方法） */
    if (this._applyAbyssVariant) this._applyAbyssVariant(enemy);
    /* R30-H-010: Boss 不计入波次计数，防止提前触发奖励面板 */
    if (!enemy.isBoss) this.currentWaveSpawnedCount++;
};

/* ── Boss 装备掉落 ── */
Gp._tryDropEquipment = function(x, y, isBossLord) {
    if (!window.equipmentRegistry || !window.saveManager) return;
    var chance = Math.max(0, Math.min(1, isBossLord ? Balance.EQUIPMENT_DROPS_BOSS_LORD : Balance.EQUIPMENT_DROPS_NORMAL));
    /* Epoch 16: Abyss Gamble 3x 掉落 + 怪物潮双倍 */
    var abyssMult = this._gambleAbyssBonus ? 3 : 1;
    /* R200-P0: 深渊血月combo掉落加成 */
    if (this._abyssActiveCombo === 'abyss_bloodmoon') abyssMult *= Balance.ABYSS_BLOODMOON_DROP_MULT;
    var surgeMult = this._monsterSurgeDoubleDrops ? 2 : 1;
    var totalMult = abyssMult * surgeMult;
    if (Math.random() > chance) return;
    var roll = Math.random();
    var quality = roll < Balance.EQUIPMENT_QUALITY_LEGENDARY_CHANCE ? 'legendary' : roll < Balance.EQUIPMENT_QUALITY_EPIC_CHANCE ? 'epic' : 'rare';
    var protoIds = Object.keys(window.equipmentRegistry.equipPool);
    var protoId = protoIds[Math.floor(Math.random() * protoIds.length)];
    var item = window.equipmentRegistry.createItem(protoId, quality);
    if (!item) return;
    /* Epoch 33: 图鉴记录装备 */
    if (window.saveManager) window.saveManager.recordCompendiumEntry('equips', item.protoId);
    var meta = window.saveManager._metaCache;
    if (!meta) return;
    meta.equipments = meta.equipments || [];
    /* 限制装备仓库最近 100 件，防止无限增长 */
    if (meta.equipments.length > 100) meta.equipments = meta.equipments.slice(-100);
    /* R200-P0: 先推入再保存，避免中间态丢失掉落 + 重复toast */
    /* R262-P1: 仅在主路径（totalMult=1）保存一次；循环分支为 abyss/gamble 额外副本处理 */
    meta.equipments.push(item);
    if (meta.equipments.length > 100) meta.equipments = meta.equipments.slice(-100);
    window.saveManager._saveMetaToStorage().catch(function(e){ console.warn('[Spawn] saveMeta failed:', e); });
    var qualityLabel = { rare: '稀有', epic: '史诗', legendary: '传说' }[quality] || quality;
    this._spawnCausalityText('🎁 获得装备：' + item.name + ' (' + qualityLabel + ')');
    /* Epoch 16: Abyss Gamble + 怪物潮双倍掉落 — 额外副本 */
    for (var _di = 1; _di < totalMult; _di++) {
        var dropItem = window.equipmentRegistry.createItem(protoId, quality);
        if (dropItem) {
            meta.equipments.push(dropItem);
            if (meta.equipments.length > 100) meta.equipments = meta.equipments.slice(-100);
            window.saveManager._saveMetaToStorage().catch(function(e){ console.warn('[Spawn] saveMeta failed:', e); });
            var qLabel = { rare: '稀有', epic: '史诗', legendary: '传说' }[quality] || quality;
            this._spawnCausalityText('🎁 获得装备：' + dropItem.name + ' (' + qLabel + ' x' + (_di + 1) + ')');
        }
    }
    /* Consume Abyss Gamble bonus */
    if (this._gambleAbyssBonus) this._gambleAbyssBonus = false;
};

Gp._spawnExpGemsAt = function(x, y, isBoss, level) {
    /* Epoch 5: 委托经验石到 CombatSystem */
    if (this._combat && this._combat.spawnExpGemsAt) {
        return this._combat.spawnExpGemsAt(this, x, y, isBoss, level);
    }
    var diff = 1;
    try { diff = (window.levelConfig[this._currentLevelId].difficultyFactor || 1) * (window.difficultyScale || 1); } catch(e) { console.warn('diff config read error', e); }
    var _vaultBloodGem = this._vaultMutations && this._vaultMutations.indexOf('bloodmoon') !== -1;
    var bloodMul = (this._activeMutator === 'bloodmoon' || _vaultBloodGem) ? 2 : 1;
    var arr = this._pendingExpGems = this._pendingExpGems || [];
    if (isBoss) {
        var cnt = Balance.BOSS_MIN_GEM_COUNT + Math.floor(Math.random() * Balance.BOSS_EXTRA_GEM_COUNT);
        /* R139-P0: Boss EXP随等级/难度缩放，与Enemy.js onDeath路径保持一致 */
        var bossLevel = level || 1;
        var bossTotalExp = Math.floor(Balance.BOSS_TOTAL_EXP_GEMS * (1 + (bossLevel - 1) * 0.1) * diff * bloodMul);
        var avg = Math.floor(bossTotalExp / cnt);
        var rem = bossTotalExp - avg * cnt;
        for (var gi = 0; gi < cnt; gi++) {
            var v = avg + (gi < rem ? 1 : 0);
            var g = new window.ExpGem(x, y, v);
            g._gameBirth = this._elapsed; /* R136-P0: 用游戏时钟记录出生时间，防止overlay冻结时宝石提前过期 */
            arr.push(g);
        }
    } else {
        level = level || 1;
        var gemVal = Math.floor((Balance.NORMAL_GEM_VALUE_BASE + level * Balance.GEM_LEVEL_SCALE) * diff * bloodMul);
        if (gemVal < 1) gemVal = 1;
        var g = new window.ExpGem(x, y, gemVal);
        g._gameBirth = this._elapsed; /* R136-P0: 用游戏时钟记录出生时间 */
        arr.push(g);
    }
};

Gp._updateCoins = function(dt) {
    if (this._activeCoins.length === 0) return;
    var player = this.player;
    var collected = 0;
    for (var i = this._activeCoins.length - 1; i >= 0; i--) {
        var coin = this._activeCoins[i];
        var dx = player.x - coin.x;
        var dy = player.y - coin.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.radius + 6 || dist < (player.magnetRadius != null ? player.magnetRadius : Balance.MAGNET_RADIUS_DEFAULT)) {
            coin.el.remove();
            this._activeCoins.splice(i, 1);
            /* R266-P1: 使用baseGold而非固定+1，使coinVal计算有意义 */
            collected += (coin.baseGold || 1);
        } else {
            var speed = Math.min(Balance.PLAYER_MAX_SPEED, 400 + (player.magnetRadius || 0) * 2);
            var move = speed * dt;
            coin.x += (dx / dist) * move;
            coin.y += (dy / dist) * move;
            coin.el.style.left = (coin.x - Balance.COIN_VISUAL_OFFSET) + 'px';
            coin.el.style.top = (coin.y - Balance.COIN_VISUAL_OFFSET) + 'px';
        }
    }
    if (collected > 0) {
        /* Epoch 36: 拾取音效 */
        window.audioManager && window.audioManager.play('pickup');
        /* Epoch 32: 双倍金币诅咒 */
        if (player._doubleCoinNextWave) {
            collected *= 2;
            player._doubleCoinNextWave = false;
        }
        /* Epoch 32: 点金术临时加成 */
        if (this._tempGoldMult > 1) {
            collected *= this._tempGoldMult;
            this._tempGoldMult = 1;
        }
        /* R31-E-004: 深渊引力组合金币-50%惩罚 */
        if (this._abyssActiveCombo === 'abyss_gravity') {
            collected = Math.floor(collected * Balance.ABYSS_GRAVITY_COIN_REDUCTION);
        }
        player.addGold(collected);
        player.rage = Math.min(player.maxRage, player.rage + 2 * collected);
    }
};

Gp._updateExpGems = function(dt) {
    if (this._expGems.length === 0 && (!this._pendingExpGems || this._pendingExpGems.length === 0)) return;
    if (this._pendingExpGems && this._pendingExpGems.length > 0) {
        for (var gi = 0; gi < this._pendingExpGems.length; gi++) {
            this._expGems.push(this._pendingExpGems[gi]);
        }
        this._pendingExpGems = [];
    }
    if (this._expGems.length === 0) return;
    var player = this.player;
    var collected = [];
    for (var i = this._expGems.length - 1; i >= 0; i--) {
        var gem = this._expGems[i];
        /* Epoch 11: 过期清理，防止经验石无限堆积 */
        if (gem.isExpired(this._elapsed)) {
            if (gem.el && gem.el.parentNode) gem.el.remove();
            this._expGems.splice(i, 1);
            continue;
        }
        if (!gem.el) {
            var el = document.createElement('div');
            el.className = 'exp-gem';
            var sz = Balance.EXP_GEM_SIZE_BASE + Math.min(gem.value, Balance.EXP_GEM_SIZE_MAX_VAL);
            el.style.width = sz + 'px';
            el.style.height = sz + 'px';
            this._worldLayer.appendChild(el);
            gem.el = el;
            gem.radius = 5;
        }
        var dx = player.x - gem.x;
        var dy = player.y - gem.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.radius + gem.radius || dist < (player.magnetRadius != null ? player.magnetRadius : Balance.MAGNET_RADIUS_DEFAULT)) {
            collected.push(gem);
        } else {
            var speed = Math.min(Balance.PLAYER_MAX_SPEED, 400 + (player.magnetRadius || 0) * 2);
            var move = speed * dt;
            if (move >= dist) {
                gem.x = player.x;
                gem.y = player.y;
                collected.push(gem);
            } else {
                gem.x += (dx / dist) * move;
                gem.y += (dy / dist) * move;
            }
        }
        /* H-020: DOM 安全 — 如果 gem.el 被外部移除，跳过 */
        if (!gem.el || !gem.el.parentNode) continue;
        gem.el.style.left = (gem.x - 4) + 'px';
        gem.el.style.top = (gem.y - 4) + 'px';
    }
    var anyLeveled = false;
    for (var ci = 0; ci < collected.length; ci++) {
        var cg = collected[ci];
        if (cg.el) { cg.el.remove(); cg.el = null; }
        if (!cg.collected) {
            cg.collected = true;
            var expVal = cg.value;
            if (player.xpGainFactor && player.xpGainFactor > 1.0) {
                expVal = Math.floor(expVal * player.xpGainFactor);
            }
            var leveled = player.gainExp(expVal);
            this._spawnExpText(player.x, player.y, expVal);
            if (leveled) anyLeveled = true;
        }
        var idx = this._expGems.indexOf(cg);
        if (idx !== -1) this._expGems.splice(idx, 1);
    }
    if (anyLeveled) {
        this._levelUpPending = true;
        window.audioManager && window.audioManager.play('levelup');
        this._syncExpBar();
    }
};

Gp._rewardKill = function(enemy) {
    this.kills++;
    /* R58-P0: 深渊狂乱combo击杀回血 — 从Loop每帧移到击杀时触发 */
    if (this._abyssFrenzyLifestealSet) {
        var frenzyHeal = Math.floor(this.player.atk * Balance.ABYSS_FRENZY_HEAL_PCT);
        if (frenzyHeal > 0) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + frenzyHeal);
        }
    }
    /* Epoch 32: 图鉴记录敌人类型 */
    if (window.saveManager && enemy.type) window.saveManager.recordCompendiumEntry('enemies', enemy.type);
    /* Epoch 47: 深渊币掉落 */
    if (this._tryAbyssCoinDrop) this._tryAbyssCoinDrop(enemy);
    /* Epoch 3: Boss 击杀计数 */
    if (enemy.isBoss) {
        this._bossKillsThisRun = (this._bossKillsThisRun || 0) + 1;
        if (enemy.type === 'Boss_Lord') {
            this._finalBossKillsThisRun = (this._finalBossKillsThisRun || 0) + 1;
        }
    }
    if (enemy.type === 'Stalker' && this._currentLevelId === 'level_2') {
        this.stalkersKilledInLevel2++;
    }
    /* 直接给金币（自动吸取，不创建 DOM） */
    var goldAmt = (enemy.isBoss ? Math.floor(Balance.COIN_COUNT_BOSS_BASE + (enemy.level || 1) * Balance.COIN_COUNT_BOSS_PER_LVL + Math.random() * Balance.COIN_COUNT_BOSS_RANDOM_MAX) : Math.floor(Balance.COIN_COUNT_NORMAL_BASE + (enemy.level || 1) * Balance.COIN_COUNT_NORMAL_PER_LVL + Math.random() * Balance.COIN_COUNT_NORMAL_RANDOM_MAX));
    /* R140-P1: Boss击杀金币也应受点金术等_tempGoldMult加成，与拾取路径一致 */
    if (this._tempGoldMult > 1) {
        goldAmt = Math.floor(goldAmt * this._tempGoldMult);
        this._tempGoldMult = 1;
    }
    /* R225-P1: 狂突突变金币加成应与掉落路径一致 */
    if (this._activeMutator === 'frenzy') goldAmt = Math.floor(goldAmt * Balance.MUTATOR_FRENZY_GOLD_MULT);
    /* R245-P1: 深渊引力combo减少击杀金币 */
    if (this._abyssActiveCombo === 'abyss_gravity') goldAmt = Math.floor(goldAmt * Balance.ABYSS_GRAVITY_COIN_REDUCTION);
    /* R273-P1: 深渊血月combo"掉落×2"需包含金币，与装备掉落路径(_tryDropEquipment)对齐 */
    if (this._abyssActiveCombo === 'abyss_bloodmoon') goldAmt = Math.floor(goldAmt * Balance.ABYSS_BLOODMOON_DROP_MULT);
    this.player.addGold(goldAmt);
    this.player.rage = Math.min(this.player.maxRage, this.player.rage + 5 + (this._tempBerserkBonus ? 10 : 0));
    if (this._tempBerserkBonus) this._tempBerserkBonus = false;
    /* R198-P0: 铁拳暴击加成对称消费 — 与点金术/狂战士相同模式，防止跨波累积永久DPS膨胀 */
    /* R221-P1: 仅在暴击击杀时消费加成，非暴击击杀保留下次机会 */
    if (this._tempCritBonus > 0 && enemy._critThisHit) this._tempCritBonus = 0;
    /* R38-P0: EXP仅通过gem路径给予（Enemy.js onDeath已生成gem），避免双计数 */
    /* 雀魂系统：击杀掉牌（HUPAI_DESIGN.md v2.0） */
    this._tryTileDrop(enemy);
};

/* ════ 雀魂系统 · 掉牌与手牌管理 ════ */

Gp._tryTileDrop = function (enemy) {
    if (!window.MahjongHand) return;
    var B = window.Balance;
    if (enemy.isBoss) {
        if ((this._jokersDropped || 0) < B.HUPAI_WILDCARD_MAX) {
            this._jokersDropped++;
            this._addTileToHand('joker', true);
        }
        return;
    }
    if (Math.random() >= B.HUPAI_DROP_CHANCE) return;
    var id = window.MahjongHand.rollDrop(enemy.suitBias || this._mainSuit);
    this._addTileToHand(id, false);
};

Gp._addTileToHand = function (id, isJoker) {
    var MH = window.MahjongHand;
    /* F4 加固：非法 ID 静默丢弃（外部注入容错） */
    if (!id || typeof id !== 'string') { console.warn('Hupai: 非法牌ID已丢弃', id); return; }
    if (MH.isFlower(id)) { this._triggerFlowerEvent(id); return; }
    if (this._handTiles.length >= window.Balance.HUPAI_HAND_MAX) {
        /* 满手牌：MVP 直接提示（V2 改为地上等待+打牌模式拾取） */
        if (window.toastSystem && !this._handFullToastAt) { window.toastSystem.warning('手牌已满 14/14，点击手牌打出一张'); this._handFullToastAt = this._elapsed; }
        if (this._handFullToastAt && this._elapsed - this._handFullToastAt > 5) this._handFullToastAt = 0; /* R130-P1: 使用游戏时间防冻结期计时失效 */
        return;
    }
    this._handTiles.push(id);
    var info = MH.isJoker(id) ? { label: '癞', color: '#7c4dff' } : MH.faceInfo(id);
    if (this._spawnFloatText && info) {
        this._spawnFloatText(this.player.x, this.player.y - 30, '🀄 ' + info.label, true);
    }
    if (window.audioManager) window.audioManager.play('pickup');
    this._onHandChanged();
};

Gp._onHandChanged = function () {
    var MH = window.MahjongHand;
    if (!MH || !this.player) return;
    this._renderHandTiles();
    /* 面子一次性触发（牌保留在手=上阵装备，增益不撤） */
    var melds = MH.extractMelds(this._handTiles);
    for (var i = 0; i < melds.length; i++) {
        var m = melds[i];
        if (m.type === 'pair') continue; /* 对子只作胡牌素材，不触发 */
        var key = m.type + ':' + m.tiles.join(','); /* R218-P0: 使用完整tiles拼接防止kong/pung key碰撞 */
        if (this._formedMelds[key]) continue;
        this._formedMelds[key] = true;
        if (typeof this._triggerMeld === 'function') this._triggerMeld(m);
    }
    /* 胡牌判定（满14时）；未成番型 → 进入打牌模式（D2） */
    if (this._handTiles.length >= window.Balance.HUPAI_HAND_MAX) {
        var hu = MH.evaluateHu(this._handTiles);
        if (hu && !this._pendingReward && !this.gameOver && typeof this._triggerHu === 'function') {
            this._triggerHu(hu);
        } else if (!hu && !this._discardMode && !this.gameOver && !this._pendingReward && typeof this._enterDiscardMode === 'function') {
            this._enterDiscardMode(-1);
            if (window.toastSystem) window.toastSystem.warning('未成牌型 —— 点击一张牌打出换张');
        }
    }
};

Gp._renderHandTiles = function () {
    if (!this._handTileSlots) return;
    var MH = window.MahjongHand;
    var ting = MH ? MH.tingInfo(this._handTiles) : null;
    var tingMap = {};
    if (ting) {
        for (var i = 0; i < ting.tingPung.length; i++) tingMap[ting.tingPung[i]] = 'ting-pung';
        for (var k = 0; k < ting.tingKong.length; k++) tingMap[ting.tingKong[k]] = 'ting-kong';
        /* R233-P1: 渲染顺子进度标记（tingRun），紫色标记缺1张的成序列牌 */
        if (ting.tingRun) {
            for (var r = 0; r < ting.tingRun.length; r++) tingMap[ting.tingRun[r].need] = 'ting-run';
        }
    }
    for (var s = 0; s < this._handTileSlots.length; s++) {
        var slot = this._handTileSlots[s];
        slot.classList.toggle('discard-sel', this._discardMode === true && s === this._discardSel);
        if (s < this._handTiles.length) {
            var id = this._handTiles[s];
            var info = MH.isJoker(id) ? { label: '癞', color: '#7c4dff' } : (MH.faceInfo(id) || { label: '?', color: '#b62929' });
            var cls = MH.isJoker(id) ? 'joker' : (id.replace(/[0-9]/g, '') === 'wan' ? 'wan' : id.indexOf('tong') === 0 ? 'tong' : id.indexOf('tiao') === 0 ? 'tiao' : (id.indexOf('feng_') === 0 ? 'wind' : 'arrow'));
            var marker = tingMap[id] ? '<span class="ting-mark ' + tingMap[id] + '"></span>' : '';
            slot.classList.add('occupied');
            slot.innerHTML = marker + '<div class="tile-body ' + cls + '" style="color:' + (info.color || '#b62929') + '">' + (info.label || '?') + '</div>';
        } else {
            slot.classList.remove('occupied');
            slot.innerHTML = '';
        }
    }
    /* 清一色进度竖条（手牌栏左缘） */
    if (this._handTileBar) {
        if (this._discardMode) this._handTileBar.classList.add('discarding');
        else this._handTileBar.classList.remove('discarding');
        if (ting && ting.qingyise.ratio > 0) {
            this._handTileBar.style.setProperty('--qing-ratio', ting.qingyise.ratio.toFixed(3));
            this._handTileBar.classList.toggle('qy-near', ting.qingyise.count >= 9);
        } else {
            this._handTileBar.style.setProperty('--qing-ratio', '0');
            this._handTileBar.classList.remove('qy-near');
        }
    }
};

/* ════ 雀魂系统 · 花牌拾取即触发（MVP 简化版，V2 接入 GameSystems 分发器） ════ */
Gp._triggerFlowerEvent = function (id) {
    var B = window.Balance; /* R58-P0: 补充Balance引用，防止ReferenceError */
    if (!window.MahjongHand || !this.player) return;
    var info = window.MahjongHand.faceInfo(id);
    var label = info ? info.label : '?';
    var p = this.player;
    try {
        switch (id) {
            case 'hua_chun': p.hp = Math.min(p.maxHp, p.hp + p.maxHp * Balance.HUPAI_HUA_CHUN_HEAL_PCT); break;
            case 'hua_xia': p._tempAtkBoost = Math.min(Balance.TEMP_ATK_BOOST_CAP, (p._tempAtkBoost || 0) + Balance.HUPAI_HUA_XIA_ATK_BOOST); p._tempBuffTimeLeft = Math.max(p._tempBuffTimeLeft || 0, Balance.HUPAI_HUA_XIA_BUFF_DURATION); break; /* P2-6: 5s 对齐设计表 */
            case 'hua_qiu': p.addGold(Balance.HUPAI_HUA_QIU_GOLD_PER_WAVE * Math.max(1, this._waveCount)); break;
            case 'hua_dongJ':
                for (var i = 0; i < this.enemies.length; i++) { if (this.enemies[i].alive) { this.enemies[i].frozen = true; this.enemies[i].frozenTimer = B.HUPAI_HUA_DONGJ_FREEZE_DUR + (this.player.iceDurationBonus || 0); } }
                break;
            case 'hua_mei': {
                var ws = this._activeWeapons || [];
                if (ws.length > 0) ws[Math.floor(Math.random() * ws.length)].upgrade();
                break;
            }
            case 'hua_lan': p.critRate = Math.min(1, (p.critRate || 0) + Balance.HUPAI_HUA_LAN_CRIT_INC); break;
            case 'hua_zhu':
                /* R130-P0: 竹牌 = 回15%HP + 护盾（设计文档 §4.4） */
                p.hp = Math.min(p.maxHp, p.hp + p.maxHp * Balance.HUPAI_HUA_ZHU_HEAL_PCT);
                this._tempShield = Math.floor(p.atk * B.HUPAI_HUA_ZHU_SHIELD);
                this._tempShieldEnd = this._elapsed + B.HUPAI_HUA_ZHU_SHIELD_DUR;
                break;
            case 'hua_ju':
                /* R130-P0: 菊花 = 金币 + 视觉反馈 */
                p.addGold(Balance.HUPAI_HUA_JU_GOLD_PER_WAVE * Math.max(1, this._waveCount));
                if (this._spawnFloatText) this._spawnFloatText(p.x, p.y - 70, '💰 +' + (Balance.HUPAI_HUA_JU_GOLD_PER_WAVE * Math.max(1, this._waveCount)), false);
                /* R241-P0: 补充bossCores奖励，防止功能缺失 */
                if (window.saveManager && window.saveManager._metaCache) {
                    window.saveManager._metaCache.bossCores = (window.saveManager._metaCache.bossCores || 0) + 1;
                    window.saveManager.saveMeta(window.saveManager._metaCache).catch(function(e){ console.warn('[Hupai] hua_ju bossCores save failed:', e); });
                }
                break;
        }
    } catch (e) { console.warn('flower event error:', e); }
    if (this._spawnFloatText) this._spawnFloatText(p.x, p.y - 50, '🌸 花·' + label, true);
    if (window.toastSystem) window.toastSystem.success('花牌·' + label + ' 效果触发');
};

/* ════ 雀魂系统 · 面子效果（A1 刻/杠即时爆发 · A2 顺子永久 · A3 字牌事件） ════ */

Gp._triggerMeld = function (meld) {
    var B = window.Balance, MH = window.MahjongHand, p = this.player;
    if (!MH || !p) return;
    var first = meld.tiles[0];
    /* A3: 字牌刻子 → 事件分发 */
    if (MH.isHonor(first)) { this._triggerHonorMeld(meld); return; }
    var info = MH.faceInfo(first);
    var suit = info ? info.suit : 'wan';
    var hasJoker = meld.tiles.indexOf('joker') > -1;
    var mult = meld.tierMult *
        (meld.type === 'kong' ? B.HUPAI_KONG_MULT_VS_PUNG : 1) *
        (hasJoker ? B.HUPAI_MELD_EFFECT_MULT_JOKER : 1);

    /* A2: 顺子 = 本局永久叠加 */
    if (meld.type === 'run') { this._applyRunBonus(suit, meld.tierMult); return; }

    /* A1: 刻子/杠 = 即时爆发 */
    var isKong = meld.type === 'kong';
    if (suit === 'wan') {
        /* 万箭齐发：随机 N 敌各受 atk×1.5×mult */
        var dmg = Math.floor(p.atk * B.HUPAI_PUNG_WAN_ATK_FACTOR * mult);
        var pool = [];
        for (var i = 0; i < this.enemies.length; i++) if (this.enemies[i].alive) pool.push(this.enemies[i]);
        for (var n = 0; n < B.HUPAI_PUNG_WAN_TARGETS && pool.length > 0; n++) {
            var e = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
            e.takeDamage(dmg, 'player');
            if (this._spawnFloatText) this._spawnFloatText(e.x, e.y, '万' + dmg, true);
        }
        this._meldFx('🀄 万箭齐发' + (isKong ? '·杠！' : ''), isKong);
    } else if (suit === 'tong') {
        /* 九筒连环：9 向环形弹幕，每发 atk×0.6×mult */
        var pdmg = Math.floor(p.atk * B.HUPAI_PUNG_TONG_PROJ_ATK * mult);
        for (var a = 0; a < 9; a++) {
            var ang = (Math.PI * 2 / 9) * a;
            var proj = new window.Projectile(p.x, p.y, Math.cos(ang) * Balance.HUPAI_PUNG_TONG_PROJ_SPEED, Math.sin(ang) * Balance.HUPAI_PUNG_TONG_PROJ_SPEED, Balance.HUPAI_PUNG_TONG_PROJ_RADIUS, pdmg, 1, 1.2);
            var el = document.createElement('div');
            el.className = 'projectile tong-ring-pellet';
            if (this._worldLayer) this._worldLayer.appendChild(el);
            proj.el = el;
            if (this._projectiles) this._projectiles.push(proj);
        }
        this._meldFx('🔵 九筒连环' + (isKong ? '·杠！' : ''), isKong);
    } else if (suit === 'tiao') {
        /* 疾风连打：临时攻速提升（Render._updateWeapons 消耗 _tempAspd） */
        this._tempAspd = Math.min((this._tempAspd || 0) + B.HUPAI_PUNG_TIAO_ASPD * mult, B.WEAPON_ASPD_CAP);
        this._tempAspdT = B.HUPAI_PUNG_TIAO_DURATION;
        this._meldFx('🌿 疾风连打' + (isKong ? '·杠！' : ''), isKong);
    }
};

Gp._meldFx = function (label, big) {
    if (this._spawnFloatText && this.player) this._spawnFloatText(this.player.x, this.player.y - 60, label, false, false);
    if (this.triggerShake) this.triggerShake(big ? 2 : 1, big ? 300 : 150);
    if (window.audioManager) window.audioManager.play(big ? 'overdrive' : 'pickup');
};

/* A2: 顺子永久叠加（万=攻 / 筒=冷却 / 条=闪避；数值锚定 Balance） */
Gp._applyRunBonus = function (suit, tierMult) {
    var B = window.Balance, p = this.player;
    if (!p) return;
    var tierIdx = B.HUPAI_TIER_MULTS.indexOf(tierMult);
    if (tierIdx < 0) tierIdx = 1;
    if (suit === 'wan') {
        var inc = tierIdx + 1;
        p.atk += inc;
        if (this._spawnFloatText) this._spawnFloatText(p.x, p.y - 40, '万顺 攻+' + inc, false);
    } else if (suit === 'tong') {
        var floor = p.cdFloor || Balance.DEFAULT_CD_FLOOR;
        var red = B.HUPAI_RUN_TONG_CD_INC * (tierIdx + 1);
        for (var i = 0; i < this._activeWeapons.length; i++) {
            var w = this._activeWeapons[i];
            /* P1-3: 改 _baseCd 记账，避免被 Render 每帧 _weaponCdReduction 强写回滚 */
            if (!w._baseCd) w._baseCd = w.cd;
            /* R38-P0: 累计筒顺减CD上限 HUPAI_RUN_TONG_CD_CAP，防止复利累积超限 */
            if (!w._tongCdReduction) w._tongCdReduction = 0;
            var newReduction = Math.min(B.HUPAI_RUN_TONG_CD_CAP, w._tongCdReduction + red);
            w._tongCdReduction = newReduction;
            w._baseCd = Math.max(floor, w._origBaseCd * (1 - newReduction)); /* R231-P1: 从_origBaseCd计算避免多次筒顺叠加时_compound压缩 */
            w.cd = w._baseCd;
            /* R138-P0: 保持_origBaseCd不变，使Render.js cdReduction逻辑能正确以_baseCd为基准计算，
               避免筒顺减CD与_hero_weaponCdReduction双重压缩导致实际CD比预期更低 */
        }
        if (this._spawnFloatText) this._spawnFloatText(p.x, p.y - 40, '筒顺 冷却−', false);
    } else if (suit === 'tiao') {
        var dodgeInc = B.HUPAI_RUN_TIAO_DODGE_INC * (tierIdx + 1);
        p.dodgeRate = Math.min(Balance.MAX_DODGE_RATE, (p.dodgeRate || 0) + dodgeInc);
        /* R266-P0: 条顺速度改为加法叠加（与qiduizi模式一致），防止乘法复合超限 */
        var _tiaoSpdInc = Math.min(B.HUPAI_RUN_TIAO_CAP, B.HUPAI_RUN_TIAO_SPD_INC * (tierIdx + 1));
        p._tiaoSpdBonus = Math.min(B.HUPAI_RUN_TIAO_CAP, (p._tiaoSpdBonus || 0) + _tiaoSpdInc);
        var _baseSpd = p.baseSpeed || B.PLAYER_MAX_SPEED;
        p.speed = Math.min(B.PLAYER_MAX_SPEED, _baseSpd * (1 + (p._tiaoSpdBonus || 0) + (p._qiduiSpdBonus || 0)));
        if (this._spawnFloatText) this._spawnFloatText(p.x, p.y - 40, '条顺 敏捷↑', false);
    }
};

/* A3: 字牌刻子事件表（HUPAI_DESIGN.md §4.3） */
Gp._triggerHonorMeld = function (meld) {
    var B = window.Balance, MH = window.MahjongHand, p = this.player;
    if (!p) return;
    var id = meld.tiles[0];
    var isKong = meld.type === 'kong';
    var kongMult = isKong ? B.HUPAI_KONG_MULT_VS_PUNG : 1;
    try {
        switch (id) {
            case 'feng_dong': /* 东风破阵：全场击退250px+冰封1s */
                for (var i = 0; i < this.enemies.length; i++) {
                    var e1 = this.enemies[i];
                    if (!e1.alive) continue;
                    var dx = e1.x - p.x, dy = e1.y - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
                    e1.x += (dx / d) * B.HUPAI_ZI_EAST_KNOCKBACK;
                    e1.y += (dy / d) * B.HUPAI_ZI_EAST_KNOCKBACK;
                    /* R192-P1: 击退后边界钳制，防止敌人推出地图 */
                    if (e1._clampPosition) e1._clampPosition(this);
                    e1.frozen = true; e1.frozenTimer = B.FROZEN_TIMER_ZI_EAST + (this.player.iceDurationBonus || 0);
                }
                break;
            case 'feng_nan': /* 离火燎原：全场灼烧（MVP 即时 8%×kongMult maxHp） */
                for (var j = 0; j < this.enemies.length; j++) {
                    var e2 = this.enemies[j];
                    if (e2.alive) e2.takeDamage(Math.floor(e2.maxHp * Balance.HUPAI_FENG_NAN_HP_DMG_PCT * kongMult), 'player');
                }
                break;
            case 'feng_xi': /* 肃杀之风：全场迟滞（MVP 冰封0.8s代理） */
                for (var k = 0; k < this.enemies.length; k++) {
                    if (this.enemies[k].alive) { this.enemies[k].frozen = true; this.enemies[k].frozenTimer = B.FROZEN_TIMER_FENG_XI + (this.player.iceDurationBonus || 0); }
                }
                break;
            case 'feng_bei': /* 北冥冻结：全场冰冻2s */
                for (var m = 0; m < this.enemies.length; m++) {
                    if (this.enemies[m].alive) { this.enemies[m].frozen = true; this.enemies[m].frozenTimer = B.FROZEN_TIMER_FENG_BEI + (this.player.iceDurationBonus || 0); }
                }
                break;
            case 'jian_zhong': /* 红中贯日：全屏冲击波 atk×4×kongMult + 怒气+30 */
                var zdmg = Math.floor(p.atk * 4 * kongMult);
                for (var z = 0; z < this.enemies.length; z++) {
                    if (this.enemies[z].alive) this.enemies[z].takeDamage(zdmg, 'player');
                }
                p.rage = Math.min(p.maxRage, p.rage + 30);
                if (this.triggerShake) this.triggerShake(3, 400);
                break;
            case 'jian_fa': /* 招财进宝：金币雨 15×波次×kongMult */
                p.addGold(Math.floor(15 * Math.max(1, this._waveCount) * kongMult));
                break;
            case 'jian_bai': /* 白板归真：清敌方弹幕+图腾+回20%HP */
                if (this._enemyProjectiles) {
                    for (var q = this._enemyProjectiles.length - 1; q >= 0; q--) {
                        if (this._enemyProjectiles[q].el && this._enemyProjectiles[q].el.parentNode) this._enemyProjectiles[q].el.remove();
                    }
                    this._enemyProjectiles.length = 0;
                }
                if (this._clearTotems) this._clearTotems();
                p.hp = Math.min(p.maxHp, p.hp + p.maxHp * Balance.HUPAI_JIAN_BAI_HP_RESTORE_PCT);
                break;
        }
    } catch (err) { console.warn('honor meld error:', err); }
    var info = MH.faceInfo(id);
    this._meldFx('✦ ' + (info ? info.label : '字') + '·刻成！', isKong);
};

/* ════ 雀魂系统 · A4 胡牌演出（HUPAI_DESIGN.md §六） ════ */
Gp._triggerHu = function (hu) {
    var self = this; /* R287-P0: 声明self引用，供setTimeout闭包使用 — 缺失导致ReferenceError软锁 */
    var B = window.Balance, p = this.player;
    if (!p || this._huLock || this.gameOver) return;
    this._huLock = true;
    var names = { qiduizi: '七对子', pengpenghu: '碰碰胡', qingyise: '清一色' }; /* R188-P1: 移除死代码pihu */
    var name = names[hu.huType] || '胡牌';
    /* R115-P0: 屏幕阅读器播报胡牌 */
    this._announceToSR(name + '！');
    /* R272-P1: 胡牌音效需在freeze前播放，否则AudioContext已suspended导致音效丢失 */
    if (window.audioManager) window.audioManager.play('reward'); /* R231-P1: 胡牌音效应使用reward而非overdrive */
    if (window.toastSystem) window.toastSystem.success('—— ' + name + ' ——');

    /* 全场时间冻结 */
    this._freezeClock();

    /* 「胡！」书法砸屏 */
    if (this.battlefield) {
        var bang = document.createElement('div');
        bang.className = 'hu-bang';
        bang.textContent = '胡！';
        this.battlefield.appendChild(bang);
        this._huBangEl = bang; /* R226-P0: 存储引用供restart/gameover清理 */
        var _bangRef = bang;
        setTimeout(function(el) { if (el && el.parentNode) el.remove(); }, Balance.TIMEOUT_BANG_REMOVE_MS, _bangRef);
    }
    /* 手牌扇形脉冲（MVP 简化，V2 做飞牌展扇） */
    if (this._handTileBar) this._handTileBar.classList.add('hu-flash');

    /* 番型增益（圣物Lv3-4锚定，本局生效） */
    try {
        switch (hu.huType) {
            case 'qingyise':
                p.atk += Math.ceil(p.atk * B.HU_QINGYISE_DMG);
                p.atk = Math.min(p.atk, B.ATK_MAX_CAP); /* R56-P1: 单色攻击上限保护，防止无限叠加 */
                p.huQingyise = true;
                if (this.playerEl) this.playerEl.classList.add('hu-qingyise');
                break;
            case 'pengpenghu':
                p._weaponCdReduction = Math.min(0.6, (p._weaponCdReduction || 0) + B.HU_PENGPENG_CD);
                this._tempAspd = Math.min((this._tempAspd || 0) + B.HU_PENGPENG_ASPD, B.WEAPON_ASPD_CAP);
                this._tempAspdT = 9999;
                break;
            case 'qiduizi':
                p.dodgeRate = Math.min(Balance.MAX_DODGE_RATE, (p.dodgeRate || 0) + B.HU_QIDUI_DODGE);
                /* R149-P0: 速度加成改为加法叠加，防止多次七对子乘法复合 */
                p._qiduiSpdBonus = (p._qiduiSpdBonus || 0) + B.HU_QIDUI_SPD;
                var _baseSpd = p.baseSpeed || B.PLAYER_MAX_SPEED;
                p.speed = Math.min(B.PLAYER_MAX_SPEED, _baseSpd * (1 + p._qiduiSpdBonus));
                if (p.magnetRadius > 0) {
                    /* R149-P0: 磁铁加成改为加法叠加，防止多次七对子乘法复合 */
                    p._qiduiMagBonus = (p._qiduiMagBonus || 0) + B.HU_QIDUI_MAGNET;
                    var _baseMag = p._baseMagnetRadius || B.MAGNET_RADIUS_DEFAULT;
                    p.magnetRadius = Math.min(B.MAX_MAGNET_RADIUS, _baseMag * (1 + p._qiduiMagBonus));
                }
                break;
        }
        /* 图鉴记录 */
        if (window.saveManager && window.saveManager.recordCompendiumEntry) {
            window.saveManager.recordCompendiumEntry('hupai', hu.huType);
        }
        /* 结算统计 */
        this._huCountThisRun = (this._huCountThisRun || 0) + 1;
    } catch (e) { console.warn('hu buff error:', e); }

    if (this.triggerShake) this.triggerShake(3, 500);

    /* 清手牌重开一轮收集 */
    this._handTiles = [];
    this._formedMelds = {};
    this._discardMode = false; /* R133-P1: 胡牌後重置打牌模式狀態，防止滿手牌無法自動進入 */
    this._discardSel = -1;
    this._renderHandTiles();

    setTimeout(function () {
        if (self.gameOver || !self.running) return; /* R226-P0: 防止restart/gameover后状态泄漏 */
        self._unfreezeClock();
        self._huLock = false;
        if (self._handTileBar) self._handTileBar.classList.remove('hu-flash');
    }, Balance.TIMEOUT_BANG_REMOVE_MS); /* R70-P2: 使用统一常量1600ms，与hu-bang动画时长1.6s对齐 */
};

/* ════ 雀魂系统 · A5 打牌模式（满14未胡：冻结+点选打出） ════ */
Gp._enterDiscardMode = function (slotIndex) {
    if (this._discardMode || this.gameOver || this._pendingReward || this._huLock) return;
    if (this._handTiles.length < window.Balance.HUPAI_HAND_MAX) return;
    this._discardMode = true;
    /* R233-P1: slotIndex=-1时自动选择第一个牌，避免玩家必须手动点选才能进入有效状态 */
    this._discardSel = (slotIndex >= 0 && slotIndex < this._handTiles.length) ? slotIndex : 0;
    this._freezeClock();
    if (this.battlefield) this.battlefield.classList.add('discard-mode');
    this._renderHandTiles();
    if (window.toastSystem) window.toastSystem.info('打牌模式：再点一次打出选中牌，点空白处取消');
};

Gp._exitDiscardMode = function () {
    if (!this._discardMode) return;
    this._discardMode = false;
    this._discardSel = -1;
    this._unfreezeClock();
    if (this.battlefield) this.battlefield.classList.remove('discard-mode');
    this._renderHandTiles();
};

Gp._confirmDiscard = function () {
    if (!this._discardMode || this._discardSel < 0 || this._discardSel >= this._handTiles.length) return;
    var discarded = this._handTiles.splice(this._discardSel, 1)[0];
    this._discardMode = false;
    this._discardSel = -1;
    this._unfreezeClock();
    if (this.battlefield) this.battlefield.classList.remove('discard-mode');
    /* 增益不撤（roguelike 标准）：已触发面子签名保留 */
    var info = window.MahjongHand.faceInfo(discarded);
    if (this._spawnFloatText && this.player) {
        this._spawnFloatText(this.player.x, this.player.y - 40, '打出 ' + (info ? info.label : ''), false);
    }
    this._onHandChanged();
};

Gp._bindHandTileClicks = function () {
    if (!this._handTileGrid) return;
    /* R185-P0: 移除旧监听器防止restart后累积 */
    if (this._handTileClickListener) {
        this._handTileGrid.removeEventListener('click', this._handTileClickListener);
        this._handTileClickListener = null;
    }
    this._handClicksBound = true;
    var self = this;
    var handler = function (e) {
        if (!self.running || self.gameOver || self._pendingReward) return;
        var slot = e.target.closest('.hand-tile-slot');
        if (!slot) { if (self._discardMode) self._exitDiscardMode(); return; }
        var idx = Array.prototype.indexOf.call(self._handTileSlots, slot);
        if (idx < 0 || idx >= self._handTiles.length) {
            /* R70-P1: 手牌满14张时点击空槽不退出弃牌模式，防止玩家误触导致打牌流程中断 */
            if (self._discardMode && self._handTiles.length >= window.Balance.HUPAI_HAND_MAX) return;
            if (self._discardMode) self._exitDiscardMode();
            return;
        }
        if (!self._discardMode) {
            if (self._handTiles.length >= window.Balance.HUPAI_HAND_MAX) self._enterDiscardMode(idx);
            return;
        }
        if (idx === self._discardSel) self._confirmDiscard();
        else { self._discardSel = idx; self._renderHandTiles(); }
    };
    this._handTileClickListener = handler;
    this._handTileGrid.addEventListener('click', handler);
};

/* ════ A6: 手牌状态进断点续玩快照 ════ */
if (window.saveManager) {
    var _prevHupaiSnap = window.saveManager.snapshotForRun;
    window.saveManager.snapshotForRun = function (engine) {
        var snap = _prevHupaiSnap ? _prevHupaiSnap.call(this, engine) : {};
        snap.handTiles = engine._handTiles ? engine._handTiles.slice() : [];
        snap.formedMelds = engine._formedMelds || {};
        snap.jokersDropped = engine._jokersDropped || 0;
        snap.mainSuit = engine._mainSuit || 'wan';
        /* R221-P1: 保存打牌模式/胡牌锁定状态，防止断点恢复后状态残留 */
        snap.discardMode = engine._discardMode || false;
        snap.discardSel = engine._discardSel !== undefined ? engine._discardSel : -1;
        snap.huLock = engine._huLock || false;
        /* R30-H-021: 武器状态纳入断点续玩快照，恢复时由 _restoreWeapons 重建 */
        if (engine._activeWeapons && engine._activeWeapons.length > 0) {
            snap.weapons = engine._activeWeapons.map(function(w) {
                return { id: w.id, level: w.level, cooldownTimer: w.cooldownTimer, baseCd: w._baseCd, origBaseCd: w._origBaseCd, rawBaseCd: w._rawBaseCd, cd: w.cd, atkFactor: w.atkFactor, tongCdReduction: w._tongCdReduction || 0 }; /* R224-P0: 恢复筒顺CD减免，防止断点续玩后丢失 */
            });
        }
        return snap;
    };
}

})();
