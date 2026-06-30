(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

Gp._spawnEnemy = function(isBoss) {
    if (!isBoss) {
        var cap = this._getWaveEnemyMax();
        if (this.currentWaveSpawnedCount >= cap) return;
    }
    var level = Math.floor(this._elapsed / 15) + 1;
    var angle = Math.random() * Math.PI * 2;
    var dist = 200 + Math.random() * 50;
    var x = this.player.x + Math.cos(angle) * dist;
    var y = this.player.y + Math.sin(angle) * dist;
    var margin = 20;
    x = Math.max(margin, Math.min(this._mapW - margin, x));
    y = Math.max(margin, Math.min(this._mapH - margin, y));

    var id = this._enemyIdCounter++;
    var enemyType = 'Normal';
    if (!isBoss) {
        /* Epoch 4: 程序化敌人类型权重 */
        if (this._enemyTypeWeights) {
            var weights = this._enemyTypeWeights;
            var roll = Math.random();
            var cumulative = 0;
            var types = Object.keys(weights);
            for (var ti = 0; ti < types.length; ti++) {
                cumulative += weights[types[ti]];
                if (roll < cumulative) { enemyType = types[ti]; break; }
            }
        } else {
            var typeRoll = Math.random();
            if (typeRoll < 0.25) enemyType = 'Tanker';
            else if (typeRoll < 0.55) enemyType = 'Stalker';
            else if (typeRoll < 0.80) enemyType = 'Shaman';
        }
    }
    var enemy = new Enemy(id, x, y, level, isBoss === true, enemyType);
    var diff = 1;
    try { diff = window.levelConfig[this._currentLevelId].difficultyFactor || 1; } catch(e) { console.warn('diff config read error', e); }
    enemy.maxHp = Math.floor(enemy.maxHp * diff);
    enemy.hp = enemy.maxHp;
    enemy.atk = Math.floor(enemy.atk * diff);

    if (enemy.isBoss) {
        var waveIdx = this._waveCount;
        var maxWaves = this._getMaxWaves();
        if (waveIdx >= maxWaves) {
            enemy.radius = 75;
            var baseHp = Math.floor(20 * Math.pow(1.2, level - 1));
            enemy.maxHp = baseHp * 20;
            enemy.hp = enemy.maxHp;
            enemy.hue = 0;
        } else if (waveIdx === maxWaves - 1) {
            enemy.speed *= 2;
            enemy.hue = 30;
        }
    }

    this.enemies.push(enemy);
    if (!enemy.isBoss) this.currentWaveSpawnedCount++;

    /* ── 变异保险库：血月对新生敌人生效 ── */
    if (this._vaultMutations && this._vaultMutations.indexOf('bloodmoon') !== -1) {
        enemy.atk = Math.floor(enemy.atk * 1.4);
        enemy.maxHp = Math.floor(enemy.maxHp * 1.3);
        enemy.hp = Math.floor(enemy.hp * 1.3);
    }

    /* Epoch 32: 波次间事件的临时敌方debuff */
    if (this._tempEnemyAtkDebuff > 0) {
        enemy.atk = Math.floor(enemy.atk * this._tempEnemyAtkDebuff);
    }
    if (this._tempEnemySpeedDebuff > 0) {
        enemy.speed *= this._tempEnemySpeedDebuff;
    }

    var el = document.createElement('div');
    el.className = 'enemy';
    if (enemy.isBoss) {
        el.classList.add('boss');
        var maxWaves = this._getMaxWaves();
        if (this._waveCount >= maxWaves) el.classList.add('final-boss');
    }
    el.dataset.id = id;
    el.dataset.enemyType = enemyType;
    /* Boss 用 DOM 内嵌字符（::before 留给 aura），普通敌人用 ::before */
    if (enemy.isBoss) {
        var bossChar = (this._waveCount >= maxWaves) ? '中' : '★';
        el.innerHTML = '<span style="font-size:calc(28*1.5px);font-weight:900;color:#e65100;text-shadow:0 0 8px rgba(255,179,0,0.5);z-index:1;position:relative;">' + bossChar + '</span>';
    } else {
        /* Mahjong 牌面字符映射 — 仅普通敌人 */
        var suitMap = {
            'Normal': '萬',
            'Tanker': '條',
            'Stalker': '筒',
            'Shaman': '風'
        };
        el.setAttribute('data-suit', suitMap[enemyType] || '萬');
        el.setAttribute('data-type', enemyType === 'Normal' ? '' : enemyType.substring(0, 3));
    }
    /* 2.5D 麻将牌渲染 — CSS 负责样式，JS 仅设位置 */
    el.style.background = '';
    el.style.borderRadius = '';
    el.style.boxShadow = '';
    el.style.display = '';
    el.style.alignItems = '';
    el.style.justifyContent = '';
    el.style.fontSize = '';
    el.style.fontWeight = '';
    el.style.color = '';
    if (enemyType === 'Stalker') el.style.opacity = '0.85';
    var hpBar = document.createElement('div');
    hpBar.className = 'enemy-hp-bar';
    var hpFill = document.createElement('div');
    hpFill.className = 'enemy-hp-fill';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);
    this._worldLayer.appendChild(el);
    this._enemyElements.set(id, el);
    enemy.el = el;
};


Gp._spawnCoinsAt = function(x, y, isBoss, level) {
    /* Epoch 5: 委托掉落到 CombatSystem */
    if (this._combat && this._combat.spawnCoinsAt) {
        return this._combat.spawnCoinsAt(this, x, y, isBoss, level);
    }
    level = level || 1;
    var count = isBoss ? Math.floor(5 + level * 0.5 + Math.random() * 4) : Math.floor(3 + level * 0.3 + Math.random() * 3);
    var _vaultBlood = this._vaultMutations && this._vaultMutations.indexOf('bloodmoon') !== -1;
if (this._activeMutator === 'bloodmoon' || _vaultBlood) count *= 2;
    if (this._activeMutator === 'frenzy') count = Math.floor(count * 1.5);
    for (var i = 0; i < count; i++) {
        var cx = x + (Math.random() - 0.5) * 20;
        var cy = y + (Math.random() - 0.5) * 20;
        var el = document.createElement('div');
        el.className = 'coin-placeholder';
        el.style.left = (cx - 6) + 'px';
        el.style.top = (cy - 6) + 'px';
        this._worldLayer.appendChild(el);
        this._activeCoins.push({ x: cx, y: cy, el: el });
    }
};

/* ── Epoch 32: 精英怪生成 ── */

Gp._spawnEliteEnemy = function() {
    var level = Math.floor(this._elapsed / 15) + 1;
    var angle = Math.random() * Math.PI * 2;
    var dist = 200 + Math.random() * 50;
    var x = this.player.x + Math.cos(angle) * dist;
    var y = this.player.y + Math.sin(angle) * dist;

    var id = ++this._enemyIdCounter;
    var types = ['Tanker', 'Stalker', 'Shaman'];
    var enemyType = types[Math.floor(Math.random() * types.length)];
    var enemy = new Enemy(id, x, y, level, false, enemyType);

    /* Elite boost */
    enemy.maxHp = Math.floor(enemy.maxHp * 1.5);
    enemy.hp = enemy.maxHp;
    enemy.atk = Math.floor(enemy.atk * 1.3);
    enemy.el && enemy.el.classList.add('elite-marker');

    this.enemies.push(enemy);
    this.currentWaveSpawnedCount++;
};

/* ── Boss 装备掉落 ── */
Gp._tryDropEquipment = function(x, y, isBossLord) {
    if (!window.equipmentRegistry || !window.saveManager) return;
    var chance = isBossLord ? 1.0 : 0.25;
    /* Epoch 16: Abyss Gamble 3x 掉落 + 怪物潮双倍 */
    var abyssMult = this._gambleAbyssBonus ? 3 : 1;
    var surgeMult = this._monsterSurgeDoubleDrops ? 2 : 1;
    var totalMult = abyssMult * surgeMult;
    if (Math.random() > chance) return;
    var roll = Math.random();
    var quality = roll < 0.1 ? 'legendary' : roll < 0.4 ? 'epic' : 'rare';
    var protoIds = Object.keys(window.equipmentRegistry.equipPool);
    var protoId = protoIds[Math.floor(Math.random() * protoIds.length)];
    var item = window.equipmentRegistry.createItem(protoId, quality);
    if (!item) return;
    /* Epoch 33: 图鉴记录装备 */
    if (window.saveManager) window.saveManager.recordCompendiumEntry('equips', item.protoId);
    var meta = window.saveManager._metaCache;
    if (!meta) return;
    meta.equipments = meta.equipments || [];
    meta.equipments.push(item);
    window.saveManager._saveMetaToStorage();
    var qualityLabel = { rare: '稀有', epic: '史诗', legendary: '传说' }[quality] || quality;
    this._spawnCausalityText('🎁 获得装备：' + item.name + ' (' + qualityLabel + ')');
    /* Epoch 16: Abyss Gamble + 怪物潮双倍掉落 */
    for (var _di = 0; _di < totalMult; _di++) {
        var dropItem = (_di === 0) ? item : window.equipmentRegistry.createItem(protoId, quality);
        if (dropItem) {
            meta.equipments.push(dropItem);
            window.saveManager._saveMetaToStorage();
            var qLabel = { rare: '稀有', epic: '史诗', legendary: '传说' }[quality] || quality;
            this._spawnCausalityText('🎁 获得装备：' + dropItem.name + ' (' + qLabel + ')' + (_di > 0 ? ' x' + (_di + 1) : ''));
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
    try { diff = window.levelConfig[this._currentLevelId].difficultyFactor || 1; } catch(e) { console.warn('diff config read error', e); }
    var _vaultBloodGem = this._vaultMutations && this._vaultMutations.indexOf('bloodmoon') !== -1;
    var bloodMul = (this._activeMutator === 'bloodmoon' || _vaultBloodGem) ? 2 : 1;
    var arr = window.expGems = window.expGems || [];
    if (isBoss) {
        var cnt = 5 + Math.floor(Math.random() * 4);
        var avg = Math.floor(25 * bloodMul / cnt);
        var rem = 25 * bloodMul - avg * cnt;
        for (var gi = 0; gi < cnt; gi++) {
            var v = avg + (gi < rem ? 1 : 0);
            arr.push(new window.ExpGem(x, y, v));
        }
    } else {
        level = level || 1;
        var gemVal = Math.floor((1 + level * 0.5) * diff * bloodMul);
        if (gemVal < 1) gemVal = 1;
        arr.push(new window.ExpGem(x, y, gemVal));
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
        if (dist < player.radius + 6 || dist < (player.magnetRadius || 60)) {
            coin.el.remove();
            this._activeCoins.splice(i, 1);
            collected++;
        } else {
            var speed = 400 + (player.magnetRadius || 0) * 2;
            var move = speed * dt;
            coin.x += (dx / dist) * move;
            coin.y += (dy / dist) * move;
            coin.el.style.left = (coin.x - 6) + 'px';
            coin.el.style.top = (coin.y - 6) + 'px';
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
        player.addGold(collected);
        player.rage = Math.min(player.maxRage, player.rage + 2 * collected);
    }
};

Gp._updateExpGems = function(dt) {
    if (this._expGems.length === 0 && (!window.expGems || window.expGems.length === 0)) return;
    if (window.expGems && window.expGems.length > 0) {
        for (var gi = 0; gi < window.expGems.length; gi++) {
            this._expGems.push(window.expGems[gi]);
        }
        window.expGems = [];
    }
    if (this._expGems.length === 0) return;
    var player = this.player;
    var collected = [];
    for (var i = this._expGems.length - 1; i >= 0; i--) {
        var gem = this._expGems[i];
        /* Epoch 11: 过期清理，防止经验石无限堆积 */
        if (gem.isExpired) {
            if (gem.el && gem.el.parentNode) gem.el.remove();
            this._expGems.splice(i, 1);
            continue;
        }
        if (!gem.el) {
            var el = document.createElement('div');
            el.className = 'exp-gem';
            var sz = 4 + Math.min(gem.value, 8);
            el.style.width = sz + 'px';
            el.style.height = sz + 'px';
            this._worldLayer.appendChild(el);
            gem.el = el;
            gem.radius = 5;
        }
        var dx = player.x - gem.x;
        var dy = player.y - gem.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.radius + gem.radius || dist < (player.magnetRadius || 60)) {
            collected.push(gem);
        } else {
            var speed = 400 + (player.magnetRadius || 0) * 2;
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
            this._spawnExpText(player.x, player.y, cg.value);
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
    /* Epoch 32: 图鉴记录敌人类型 */
    if (window.saveManager && enemy.type) window.saveManager.recordCompendiumEntry('enemies', enemy.type);
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
    this._spawnCoinsAt(enemy.x, enemy.y, false, enemy.level);
    if (!enemy.isBoss) this._spawnExpGemsAt(enemy.x, enemy.y, false, enemy.level);
    if (this.player) {
        this.player.rage = Math.min(this.player.maxRage, this.player.rage + 5 + (this._tempBerserkBonus ? 10 : 0));
        if (this._tempBerserkBonus) this._tempBerserkBonus = false;
    }
};

})();
