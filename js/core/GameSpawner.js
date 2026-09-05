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
    this._spawnTimer = 0;
    this._difficultyTimer = 0;
    this._bossTimer = 0;
    this._currentLevelId = engine._currentLevelId || 'level_1';
    this._mapW = engine._mapW || 1500;
    this._mapH = engine._mapH || 1500;
    this._enemyTypeWeights = engine._enemyTypeWeights || window.Balance.DEFAULT_ENEMY_WEIGHTS;
    this._spawnInterval = engine._spawnInterval || 1.5;
    this._spawnIntervalDecay = engine._spawnIntervalDecay || 0.02;
    this._spawnIntervalMin = engine._spawnIntervalMin || 0.5;
    this._waveCount = engine._waveCount || 0;
    this.currentWaveSpawnedCount = engine.currentWaveSpawnedCount || 0; /* R81-P2: 同步引擎计数器，防止双计数器脱钩 */
    this._bossLordWave = false;
    this._bossLordSpawned = false;
    this._bossLord = null;
    this._totems = [];
    this._enemyProjectiles = [];
};

/* ── 重置 ── */

Ss.reset = function(engine) {
    this.engine = engine; /* R199-P0: 必须在reset时保存engine引用，resume路径需要 */
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
    this.currentWaveSpawnedCount = engine.currentWaveSpawnedCount || 0; /* R81-P2: 同步引擎计数器 */
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
    /* R194-P1: 同步 SpawnSystem 副本的波次计数，防止 Splitter 分裂路径绕过此副本造成不同步 */
    this.currentWaveSpawnedCount = engine.currentWaveSpawnedCount || 0;
    /* R196-P1: 同步生成间隔，防止深渊轮回后 SpawnSystem 使用过时间隔 */
    this._spawnInterval = engine._spawnInterval || this._spawnInterval;
    this._spawnIntervalMin = engine._spawnIntervalMin || this._spawnIntervalMin;
    this._spawnIntervalDecay = engine._spawnIntervalDecay || this._spawnIntervalDecay;

    this._difficultyTimer += dt;
    if (this._difficultyTimer >= 10) {
        this._difficultyTimer -= 10;
        this._spawnInterval = Math.max(this._spawnIntervalMin, this._spawnInterval - this._spawnIntervalDecay);
    }

    this._spawnTimer += dt;
    while (this._spawnTimer >= this._spawnInterval) {
        this._spawnTimer -= this._spawnInterval;
        this._spawnEnemy(engine);
    }

    this._bossTimer += dt;
    if (this._bossTimer >= Balance.BOSS_SPAWN_INTERVAL) {
        this._bossTimer = 0;
        var bossCount = 0;
        for (var bi = 0; bi < engine.enemies.length; bi++) {
            if (engine.enemies[bi].alive && engine.enemies[bi].isBoss) bossCount++;
        }
        if (bossCount < 1 && engine._bossLordWave && !engine._bossLordSpawned) this._spawnEnemy(engine, true); /* R47-P0: 仅在Boss波次生成领主 */
    }
};

/* ── 敌人类型选择 ── */

Ss._selectEnemyType = function(isBoss) {
    if (isBoss) return 'Boss_Lord';
    if (!this._enemyTypeWeights) {
        /* R230-P1: 使用Balance默认权重而非硬编码，避免分布差异 */
        var roll = Math.random();
        var w = Balance.DEFAULT_ENEMY_WEIGHTS;
        var cumulative = 0;
        var types = Object.keys(w);
        for (var ti = 0; ti < types.length; ti++) {
            cumulative += w[types[ti]];
            if (roll < cumulative) return types[ti];
        }
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
        var cap = engine._getWaveEnemyMax ? engine._getWaveEnemyMax() : 999;
        if (this.currentWaveSpawnedCount >= cap) return;
    }

    var level = Math.floor(this.engine._elapsed / 15) + 1;
    var angle = Math.random() * Math.PI * 2;
    var dist = Balance.ENEMY_SPAWN_RADIUS + Math.random() * Balance.ENEMY_SPAWN_RADIUS_JITTER;
    var player = engine.player;
    var x = player.x + Math.cos(angle) * dist;
    var y = player.y + Math.sin(angle) * dist;
    var margin = Balance.ENEMY_SPAWN_MARGIN;
    x = Math.max(margin, Math.min(this._mapW - margin, x));
    y = Math.max(margin, Math.min(this._mapH - margin, y));

    var id = ++engine._enemyIdCounter;
    var enemyType = this._selectEnemyType(isBoss);
    var enemy = new (window.Enemy || window.GameEngine.prototype._enemyConstructor)(id, x, y, level, isBoss === true, enemyType);
    enemy._eng = engine; /* Inject engine ref for window.gameEngine fallback */
    var diff = 1;
    try {
        var cfg = window.levelConfig[this._currentLevelId];
        if (cfg) diff = (cfg.difficultyFactor || 1) * (window.difficultyScale || 1);
    } catch(e) {}
    /* Boss Lord HP/ATK 不受难度系数影响（独立设计） */
    if (enemyType !== 'Boss_Lord') {
        enemy.maxHp = Math.floor(enemy.maxHp * diff);
        enemy.hp = enemy.maxHp;
        enemy.atk = Math.floor(enemy.atk * diff);
    }

    /* H-002: 精英模式 — 敌人获得属性加成 (Balance.ELITE_HP_MULT / ELITE_ATK_MULT) */
    if (engine._eliteModeActive && engine._eliteMultiplier) {
        enemy.maxHp = Math.floor(enemy.maxHp * engine._eliteMultiplier);
        enemy.hp = enemy.maxHp;
        enemy.atk = Math.floor(enemy.atk * engine._eliteMultiplier);
    }

    /* R141-P1: 活跃突变属性修正对新刷敌人生效，与applyMutator对存量的处理保持一致 */
    /* R228-P0: 为新刷敌人设置stored标志，确保_clearMutatorEffects能正确还原突变加成 */
    if (engine._activeMutator) {
        var _mut = engine._activeMutator;
        if (_mut === 'bloodmoon') {
            enemy._bloodmoonStored = true;
            enemy._bloodmoonOrigAtk = enemy.atk;
            enemy._bloodmoonOrigMaxHp = enemy.maxHp;
            enemy._bloodmoonOrigHp = enemy.hp;
            enemy.maxHp = Math.floor(enemy.maxHp * Balance.MUTATOR_BLOODMOON_HP_MULT);
            enemy.hp = enemy.maxHp;
            enemy.atk = Math.floor(enemy.atk * Balance.MUTATOR_BLOODMOON_ATK_MULT);
        } else if (_mut === 'frenzy') {
            enemy._frenzyStored = true;
            enemy._frenzyOrigSpeed = enemy.speed;
            enemy.speed *= Balance.MUTATOR_FRENZY_SPEED_MULT;
        }
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
        var maxWaves = engine._getMaxWaves(); /* R60-P0: 使用engine方法而非this */
        if (waveIdx >= maxWaves) {
            enemy.radius = 75;
            /* R230-P0: 深渊缩放已在Enemy构造函数中应用，此处不再覆盖HP */
            enemy.hp = enemy.maxHp;
        }
    }
    /* R194-P1: 最终波速度翻倍逻辑已移至 _spawnBossLordFromGamble，
       此处为死代码（_showBossGamble 拦截后提前 return） */

    this.engine.enemies.push(enemy);

    /* R129-P1: 超驱动期间新刷出的敌人也应冻结，防止机制遗漏 */
    if (this.engine._overdriveActive && enemy && enemy.alive) {
        enemy._overdriveStored = true;
        enemy._overdriveOrigSpeed = enemy.speed;
        enemy.speed = 0;
    }

    /* 创建 DOM */
    var el = document.createElement('div');
    el.className = 'enemy';
    /* P1-8: 类型/花色标记 — 驱动 gameplay-enemy.css 的 per-type 造型与箭妖瞄准光 */
    el.dataset.enemyType = enemyType;
    el.dataset.suit = ({ Normal: '萬', Tanker: '條', Stalker: '筒', Shaman: '風', Barrier: '白', Bomber: '發', Splitter: '中', Archer: '索' })[enemyType] || '萬';
    if (enemy.isBoss) {
        el.classList.add('boss');
        var maxW = engine._getMaxWaves();
        if (this._waveCount >= maxW - 1) el.classList.add('final-boss');
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
/* Ss.spawnBossLord 已废弃 — 使用 GameEngine.Events.js 中的 Gp._spawnBossLordFromGamble */

/* ── 图腾清理 ── */
/* Ss.clearTotems 已废弃 — 使用 GameEngine prototype 的 Gp._clearTotems */
/* Ss.cleanEnemyProjectiles 已废弃 — 使用 Gp._cleanEnemyProjectiles */
/* Ss.updateEnemyProjectiles 已废弃 — 使用 Gp._updateEnemyProjectiles */

/* ── 波次查询 ── */
/* _getMaxWaves / _getWaveEnemyMax 已迁移到 GameEngine.Loop.js (Gp 原型) */
/* 此处通过 engine 代理调用，避免重复实现 */

})();
