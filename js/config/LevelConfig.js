window.levelConfig = {
    level_1: {
        id: 'level_1',
        name: '试炼森林',
        desc: '新手区域，怪物稀疏，适合热身。',
        mapW: 1500, mapH: 1500,
        maxWaves: 5,
        difficultyFactor: 1.0,
        waveEnemyMax: [20, 30, 40, 50, 1],
        /* Epoch 4: 程序化难度参数 */
        enemyTypes: { Normal: 0.45, Tanker: 0.20, Stalker: 0.25, Shaman: 0.10 },
        spawnIntervalMin: 1.5,
        spawnIntervalDecay: 0.02,
        bossThreshold: 5,
        difficultyTier: 'easy'
    },
    level_2: {
        id: 'level_2',
        name: '幽暗地窟',
        desc: '狭窄地形，潜藏着更快的敌人。',
        mapW: 1800, mapH: 1800,
        maxWaves: 7,
        difficultyFactor: 1.3,
        waveEnemyMax: [25, 35, 45, 55, 65, 75, 1],
        enemyTypes: { Normal: 0.30, Tanker: 0.25, Stalker: 0.30, Shaman: 0.15 },
        spawnIntervalMin: 1.2,
        spawnIntervalDecay: 0.03,
        bossThreshold: 7,
        difficultyTier: 'medium'
    },
    level_3: {
        id: 'level_3',
        name: '烈焰深渊',
        desc: '熔岩遍地，精英 Boss 镇守。',
        mapW: 2000, mapH: 2000,
        maxWaves: 10,
        difficultyFactor: 1.7,
        waveEnemyMax: [30, 40, 50, 60, 70, 80, 90, 100, 110, 1],
        enemyTypes: { Normal: 0.20, Tanker: 0.25, Stalker: 0.25, Shaman: 0.30 },
        spawnIntervalMin: 1.0,
        spawnIntervalDecay: 0.04,
        bossThreshold: 10,
        difficultyTier: 'hard'
    },
    /* Epoch 4: 程序化生成关卡 */
    level_procedural: {
        id: 'level_procedural',
        name: '程序裂隙',
        desc: '基于深渊层数的程序化关卡，难度无限增长。',
        mapW: 2000, mapH: 2000,
        maxWaves: 15,
        difficultyFactor: 2.0,
        waveEnemyMax: null, /* 程序化生成 */
        enemyTypes: { Normal: 0.15, Tanker: 0.25, Stalker: 0.25, Shaman: 0.35 },
        spawnIntervalMin: 0.8,
        spawnIntervalDecay: 0.05,
        bossThreshold: 15,
        difficultyTier: 'extreme',
        /* 程序化参数 */
        abyssScaling: {
            enemyHpMult: 1.15,      /* 每层敌人 HP 倍率 */
            enemyAtkMult: 1.12,     /* 每层敌人攻击倍率 */
            spawnCountMult: 1.10,   /* 每层刷怪数量倍率 */
            intervalReduce: 0.05,   /* 每层刷怪间隔减少 */
            maxWavesBonus: 1        /* 每层额外波次 */
        }
    }
};

/* Epoch 4: 难度等级颜色映射 */
window.difficultyTierColors = {
    easy: '#4caf50',
    medium: '#ff9800',
    hard: '#f44336',
    extreme: '#9c27b0'
};

/* Epoch 4: 程序化关卡生成器 */
window.proceduralLevelGenerator = {
    generate: function(abyssLevel) {
        var base = window.levelConfig.level_procedural;
        var scaling = base.abyssScaling;
        var diffMult = Math.pow(scaling.enemyHpMult, abyssLevel);
        var atkMult = Math.pow(scaling.enemyAtkMult, abyssLevel);
        var spawnMult = Math.pow(scaling.spawnCountMult, abyssLevel);
        var intervalReduction = Math.max(0.3, base.spawnIntervalMin - abyssLevel * scaling.intervalReduce);
        var effectiveWaves = base.maxWaves + Math.floor(abyssLevel * scaling.maxWavesBonus);

        /* 程序化波次敌人数量 */
        var waveEnemyMax = [];
        for (var i = 0; i < effectiveWaves; i++) {
            var baseCount = 20 + i * 10;
            var count = Math.floor(baseCount * spawnMult);
            waveEnemyMax.push(count);
        }
        /* 最后一波是 Boss */
        waveEnemyMax[effectiveWaves - 1] = 1;

        return {
            id: 'level_procedural_' + abyssLevel,
            name: '程序裂隙 · 第 ' + (abyssLevel + 1) + ' 层',
            desc: '深渊层数 x' + (abyssLevel + 1) + '，难度系数 x' + diffMult.toFixed(2),
            mapW: base.mapW,
            mapH: base.mapH,
            maxWaves: effectiveWaves,
            difficultyFactor: base.difficultyFactor * diffMult,
            waveEnemyMax: waveEnemyMax,
            enemyTypes: base.enemyTypes,
            spawnIntervalMin: intervalReduction,
            spawnIntervalDecay: base.spawnIntervalDecay + abyssLevel * 0.005,
            bossThreshold: effectiveWaves,
            difficultyTier: base.difficultyTier,
            abyssLevel: abyssLevel,
            isProcedural: true
        };
    }
};
