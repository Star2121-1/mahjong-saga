/* ══════════════════════════════════════════════
   麻将江湖 — 敌人生成系统 (Game Spawner)
   Epoch 5 — GameEngine.js 解耦拆分
   ══════════════════════════════════════════════ */

(function() {

window.SpawnSystem = {};
var Ss = window.SpawnSystem;

/* ── 初始化 ── */

Ss.init = function(engine) {
    this.engine = engine;
    this._enemyIdCounter = 0;
    this._spawnTimer = 0;
    this._difficultyTimer = 0;
    this._bossTimer = 0;
    this._currentLevelId = engine._currentLevelId || 'level_1';
    this._mapW = engine._mapW || 1500;
    this._mapH = engine._mapH || 1500;
    this._enemyTypeWeights = engine._enemyTypeWeights || { Normal: 0.45, Tanker: 0.20, Stalker: 0.25, Shaman: 0.10 };
    this._spawnInterval = engine._spawnInterval || 1.5;
    this._spawnIntervalDecay = engine._spawnIntervalDecay || 0.02;
    this._waveCount = engine._waveCount || 0;
    this.currentWaveSpawnedCount = 0;
    this._bossLordWave = false;
    this._bossLordSpawned = false;
    this._bossLord = null;
    this._totems = [];
    this._enemyProjectiles = [];
};

/* ── 重置 ── */

Ss.reset = function(engine) {
    this._enemyIdCounter = 0;
    this._spawnTimer = 0;
    this._difficultyTimer = 0;
    this._bossTimer = 0;
    this._currentLevelId = engine._currentLevelId || 'level_1';
    this._mapW = engine._mapW || 1500;
    this._mapH = engine._mapH || 1500;
    this._enemyTypeWeights = engine._enemyTypeWeights || { Normal: 0.45, Tanker: 0.20, Stalker: 0.25, Shaman: 0.10 };
    this._spawnInterval = engine._spawnInterval || 1.5;
    this._spawnIntervalDecay = engine._spawnIntervalDecay || 0.02;
    this._waveCount = engine._waveCount || 0;
    this.currentWaveSpawnedCount = 0;
    this._bossLordWave = false;
    this._bossLordSpawned = false;
    this._bossLord = null;
    this._totems = [];
    this._enemyProjectiles = [];
};

/* ── 主循环更新 ── */

Ss.update = function(dt, engine) {
    if (!engine.running || engine.gameOver || engine._pendingReward || engine._bossLordWave) return;

    this._difficultyTimer += dt;
    if (this._difficultyTimer >= 10) {
        this._difficultyTimer -= 10;
        this._spawnInterval = Math.max(0.3, this._spawnInterval - this._spawnIntervalDecay);
    }

    this._spawnTimer += dt;
    while (this._spawnTimer >= this._spawnInterval) {
        this._spawnTimer -= this._spawnInterval;
        this._spawnEnemy(engine);
    }

    this._bossTimer += dt;
    if (this._bossTimer >= 30) {
        this._bossTimer = 0;
        var bossCount = 0;
        for (var bi = 0; bi < engine.enemies.length; bi++) {
            if (engine.enemies[bi].alive && engine.enemies[bi].isBoss) bossCount++;
        }
        if (bossCount < 1) this._spawnEnemy(engine, true);
    }
};

/* ── 敌人类型选择 ── */

Ss._selectEnemyType = function(isBoss) {
    if (isBoss) return 'Boss_Lord';
    if (!this._enemyTypeWeights) {
        var roll = Math.random();
        if (roll < 0.25) return 'Tanker';
        if (roll < 0.55) return 'Stalker';
        if (roll < 0.80) return 'Shaman';
        return 'Normal';
    }
    var weights = this._enemyTypeWeights;
    var roll = Math.random();
    var cumulative = 0;
    var types = Object.keys(weights);
    for (var ti = 0; ti < types.length; ti++) {
        cumulative += weights[types[ti]];
        if (roll < cumulative) return types[ti];
    }
    return 'Normal';
};

/* ── 生成敌人 ── */

Ss._spawnEnemy = function(engine, isBoss) {
    if (!isBoss) {
        var cap = this._getWaveEnemyMax();
        if (this.currentWaveSpawnedCount >= cap) return;
    }

    var level = Math.floor(this.engine._elapsed / 15) + 1;
    var angle = Math.random() * Math.PI * 2;
    var dist = 200 + Math.random() * 50;
    var player = engine.player;
    var x = player.x + Math.cos(angle) * dist;
    var y = player.y + Math.sin(angle) * dist;
    var margin = 20;
    x = Math.max(margin, Math.min(this._mapW - margin, x));
    y = Math.max(margin, Math.min(this._mapH - margin, y));

    var id = this._enemyIdCounter++;
    var enemyType = this._selectEnemyType(isBoss);
    var enemy = new Enemy(id, x, y, level, isBoss === true, enemyType);
    var diff = 1;
    try {
        var cfg = window.levelConfig[this._currentLevelId];
        if (cfg) diff = cfg.difficultyFactor || 1;
    } catch(e) {}
    enemy.maxHp = Math.floor(enemy.maxHp * diff);
    enemy.hp = enemy.maxHp;
    enemy.atk = Math.floor(enemy.atk * diff);

    /* Boss Lord 特殊处理 */
    if (isBoss && enemyType === 'Boss_Lord') {
        var waveIdx = this._waveCount;
        var maxWaves = this._getMaxWaves();
        if (waveIdx >= maxWaves) {
            enemy.radius = 75;
            var baseHp = Math.floor(20 * Math.pow(1.2, level - 1));
            enemy.maxHp = baseHp * 20;
            enemy.hp = enemy.maxHp;
        } else if (waveIdx === maxWaves - 1) {
            enemy.speed *= 2;
            enemy.hue = 30;
        }
    }

    this.engine.enemies.push(enemy);

    /* 创建 DOM */
    var el = document.createElement('div');
    el.className = 'enemy';
    if (enemy.isBoss) {
        el.classList.add('boss');
        var maxW = this._getMaxWaves();
        if (this._waveCount >= maxW) el.classList.add('final-boss');
        if (enemyType === 'Boss_Lord') el.classList.add('boss-lord');
    }
    el.dataset.id = id;
    /* 2.5D 骨雕妖牌 */
    el.style.background = '#2a4a3a';
    el.style.borderRadius = '4px';
    el.style.boxShadow = '0 3px 0 #1a3020, 0 5px 0.5px #3a5a4a, 0 6px 8px rgba(0,0,0,0.4)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontSize = '12px';
    el.style.fontWeight = '700';
    el.style.color = '#5a8a6a';
    if (enemyType === 'Stalker') el.style.opacity = '1';

    var hpBar = document.createElement('div');
    hpBar.className = 'enemy-hp-bar';
    var hpFill = document.createElement('div');
    hpFill.className = 'enemy-hp-fill';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);
    this.engine._worldLayer.appendChild(el);
    this.engine._enemyElements.set(id, el);
    enemy.el = el;

    if (!enemy.isBoss) this.currentWaveSpawnedCount++;
};

/* ── Boss Lord 生成 ── */

Ss.spawnBossLord = function(engine) {
    var level = Math.floor(engine._elapsed / 15) + 1;
    var x = this._mapW / 2;
    var y = Math.floor(this._mapH * 0.35);
    var margin = 100;
    x = Math.max(margin, Math.min(this._mapW - margin, x));
    y = Math.max(margin, Math.min(this._mapH - margin, y));

    var id = this._enemyIdCounter++;
    var lord = new Enemy(id, x, y, level, true, 'Boss_Lord');
    var diff = 1;
    try {
        var cfg = window.levelConfig[this._currentLevelId];
        if (cfg) diff = cfg.difficultyFactor || 1;
    } catch(e) {}
    lord.maxHp = Math.floor(lord.maxHp * diff);
    lord.hp = lord.maxHp;
    lord.atk = Math.floor(lord.atk * diff);

    this.engine.enemies.push(lord);
    this._bossLord = lord;

    var el = document.createElement('div');
    el.className = 'enemy boss boss-lord';
    el.dataset.id = id;
    var hpBar = document.createElement('div');
    hpBar.className = 'enemy-hp-bar';
    var hpFill = document.createElement('div');
    hpFill.className = 'enemy-hp-fill';
    hpBar.appendChild(hpFill);
    el.appendChild(hpBar);
    this.engine._worldLayer.appendChild(el);
    this.engine._enemyElements.set(id, el);
    lord.el = el;

    if (this.engine._bloodRageActive) {
        lord.speed = Math.floor(lord.speed * 1.2);
        lord.baseSpeed = lord.speed;
        if (lord.el) lord.el.classList.add('boss-blood-rage');
    }

    if (this.engine.bossHpBar) this.engine.bossHpBar.classList.add('active');
    this.engine.triggerShake(1, 200);
    return lord;
};

/* ── 图腾清理 ── */

Ss.clearTotems = function(engine) {
    for (var i = 0; i < this._totems.length; i++) {
        if (this._totems[i].el && this._totems[i].el.parentNode) this._totems[i].el.remove();
    }
    this._totems = [];
};

/* ── 敌人投射物清理 ── */

Ss.cleanEnemyProjectiles = function(engine) {
    for (var i = 0; i < this._enemyProjectiles.length; i++) {
        if (this._enemyProjectiles[i].el && this._enemyProjectiles[i].el.parentNode) {
            this._enemyProjectiles[i].el.remove();
        }
    }
    this._enemyProjectiles = [];
};

/* ── 敌人投射物更新 ── */

Ss.updateEnemyProjectiles = function(dt, engine) {
    if (engine._pendingReward) return;
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
            engine._worldLayer.appendChild(pel);
            p.el = pel;
        }
        p.el.style.left = (p.x - p.radius) + 'px';
        p.el.style.top = (p.y - p.radius) + 'px';

        if (p.x < -100 || p.x > this._mapW + 100 || p.y < -100 || p.y > this._mapH + 100) {
            p.alive = false;
        }

        if (p.alive && engine.player) {
            var dx = engine.player.x - p.x;
            var dy = engine.player.y - p.y;
            if (dx * dx + dy * dy < (engine.player.radius + p.radius) * (engine.player.radius + p.radius)) {
                if (!p._hitPlayer) {
                    p._hitPlayer = true;
                    engine.player.takeDamage(p.damage, this._bossLord || engine);
                }
                p.alive = false;
            }
        }

        if (!p.alive) {
            if (p.el && p.el.parentNode) p.el.remove();
            this._enemyProjectiles.splice(i, 1);
        }
    }
};

/* ── 波次查询 ── */

Ss._getMaxWaves = function() {
    var cfg = window.levelConfig[this._currentLevelId];
    return cfg ? cfg.maxWaves : 5;
};

Ss._getWaveEnemyMax = function() {
    var cfg = window.levelConfig[this._currentLevelId];
    if (!cfg || !cfg.waveEnemyMax) return 999;
    var idx = Math.min(this._waveCount, cfg.waveEnemyMax.length - 1);
    return cfg.waveEnemyMax[idx] || 999;
};

})();
