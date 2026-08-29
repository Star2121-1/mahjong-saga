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
    this._enemyTypeWeights = engine._enemyTypeWeights || window.Balance.DEFAULT_ENEMY_WEIGHTS;
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
    this._enemyTypeWeights = engine._enemyTypeWeights || window.Balance.DEFAULT_ENEMY_WEIGHTS;
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
    if (!engine.running || engine.gameOver || engine._pendingReward) return;

    /* P1-6: 波次同步 — 修复波次上限恒停在第一波值 */
    this._waveCount = engine._waveCount || 0;
    this._currentLevelId = engine._currentLevelId || this._currentLevelId;
    this._enemyTypeWeights = engine._enemyTypeWeights || this._enemyTypeWeights;

    this._difficultyTimer += dt;
    if (this._difficultyTimer >= 10) {
        this._difficultyTimer -= 10;
        this._spawnInterval = Math.max(0.5, this._spawnInterval - this._spawnIntervalDecay);
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
    var enemy = new (window.Enemy || window.GameEngine.prototype._enemyConstructor)(id, x, y, level, isBoss === true, enemyType);
    enemy._eng = engine; /* Inject engine ref for window.gameEngine fallback */
    var diff = 1;
    try {
        var cfg = window.levelConfig[this._currentLevelId];
        if (cfg) diff = cfg.difficultyFactor || 1;
    } catch(e) {}
    /* Boss Lord HP/ATK 不受难度系数影响（独立设计） */
    if (enemyType !== 'Boss_Lord') {
        enemy.maxHp = Math.floor(enemy.maxHp * diff);
        enemy.hp = enemy.maxHp;
        enemy.atk = Math.floor(enemy.atk * diff);
    }

    /* H-002: 精英模式 — 敌人获得 50% 属性加成 */
    if (engine._eliteModeActive && engine._eliteMultiplier) {
        enemy.maxHp = Math.floor(enemy.maxHp * engine._eliteMultiplier);
        enemy.hp = enemy.maxHp;
        enemy.atk = Math.floor(enemy.atk * engine._eliteMultiplier);
    }

    /* Boss Lord 特殊处理 */
    if (isBoss && enemyType === 'Boss_Lord') {
        /* Boss Gamble: 先显示选择面板，玩家决定后再生成领主 */
        if (this.engine._showBossGamble) {
            this.engine._showBossGamble();
        }
        /* _showBossGamble 返回后检查：如果玩家还没做出选择，提前返回 */
        if (this.engine._pendingBossGamble) return;
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
    /* P1-8: 类型/花色标记 — 驱动 gameplay-enemy.css 的 per-type 造型与箭妖瞄准光 */
    el.dataset.enemyType = enemyType;
    el.dataset.suit = ({ Normal: '萬', Tanker: '條', Stalker: '筒', Shaman: '風', Barrier: '白', Bomber: '發', Splitter: '中', Archer: '索' })[enemyType] || '萬';
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
/* Ss.spawnBossLord 已废弃 — 使用 GameEngine.Events.js 中的 _spawnBossLordFromGamble */

/* ── 图腾清理 ── */

Ss.clearTotems = function(engine) {
    for (var i = 0; i < this._totems.length; i++) {
        if (this._totems[i].el && this._totems[i].el.parentNode) this._totems[i].el.remove();
    }
    this._totems = [];
};

/* Ss.cleanEnemyProjectiles 已废弃 — 使用 Gp._cleanEnemyProjectiles */
/* Ss.updateEnemyProjectiles 已废弃 — 使用 Gp._updateEnemyProjectiles */

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
