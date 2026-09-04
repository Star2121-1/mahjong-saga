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
        enemyTypes: { Normal: 0.24, Tanker: 0.14, Stalker: 0.17, Archer: 0.14, Shaman: 0.09, Barrier: 0.12, Bomber: 0.10 },
        spawnIntervalMin: 1.5,
        spawnIntervalDecay: 0.02,
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
        enemyTypes: { Normal: 0.17, Tanker: 0.15, Stalker: 0.19, Archer: 0.16, Shaman: 0.11, Barrier: 0.13, Bomber: 0.09 },
        spawnIntervalMin: 1.2,
        spawnIntervalDecay: 0.03,
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
        enemyTypes: { Normal: 0.11, Tanker: 0.15, Stalker: 0.17, Archer: 0.18, Shaman: 0.13, Barrier: 0.15, Bomber: 0.11 },
        spawnIntervalMin: 1.0,
        spawnIntervalDecay: 0.04,
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
        enemyTypes: { Normal: 0.08, Tanker: 0.15, Stalker: 0.15, Archer: 0.20, Shaman: 0.14, Barrier: 0.16, Bomber: 0.12 },
        spawnIntervalMin: 0.8,
        spawnIntervalDecay: 0.05,
        difficultyTier: 'extreme',
        /* 程序化参数 */
        abyssScaling: {
            enemyHpMult: 1.10,      /* 每层敌人 HP 倍率（从 1.15 降为 1.10 防双重指数） */
            enemyAtkMult: 1.12,     /* 每层敌人攻击倍率 */
            spawnCountMult: 1.05,   /* 每层刷怪数量倍率（从 1.10 降为 1.05 防数值爆炸） */
            intervalReduce: 0.05,   /* 每层刷怪间隔减少 */
            maxWavesBonus: 1,       /* 每层额外波次 */
            maxWaveEnemyCap: 200    /* 单波敌人上限，防止 DOM 崩溃 */
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
        /* R196-P2: atkMult计算后未使用，移除死代码 */
        var spawnMult = Math.pow(scaling.spawnCountMult, abyssLevel);
        var intervalReduction = Math.max(0.3, base.spawnIntervalMin - abyssLevel * scaling.intervalReduce);
        var effectiveWaves = base.maxWaves + Math.floor(abyssLevel * scaling.maxWavesBonus);

        /* 程序化波次敌人数量 */
        var waveEnemyMax = [];
        for (var i = 0; i < effectiveWaves; i++) {
            var baseCount = 20 + i * 10;
            var count = Math.floor(baseCount * spawnMult);
            if (count > scaling.maxWaveEnemyCap) count = scaling.maxWaveEnemyCap; /* 单波硬上限 */
            waveEnemyMax.push(count);
        }
        /* 最后一波是 Boss — guard for effectiveWaves <= 0 */
        if (effectiveWaves > 0) {
            waveEnemyMax[effectiveWaves - 1] = 1;
        }

        return {
            id: 'level_procedural_' + abyssLevel,
            name: '程序裂隙 · 第 ' + (abyssLevel + 1) + ' 层',
            desc: '深渊层数 x' + (abyssLevel + 1) + '，难度系数 x' + diffMult.toFixed(2),
            mapW: base.mapW,
            mapH: base.mapH,
            maxWaves: effectiveWaves,
            waveEnemyMax: waveEnemyMax,
            enemyTypes: base.enemyTypes,
            spawnIntervalMin: intervalReduction,
            spawnIntervalDecay: base.spawnIntervalDecay + abyssLevel * 0.005,
            /* R130-P1: difficultyFactor 钳制上限，防止深渊过深时数值爆炸 */
            difficultyFactor: Math.min(5.0, base.difficultyFactor * diffMult),
            difficultyTier: base.difficultyTier,
            abyssLevel: abyssLevel,
            isProcedural: true
        };
    }
};

/* Epoch 16: 程序化种子系统 */
window.proceduralSeedGenerator = {
    /* 简单 mulberry32 PRNG */
    createSeed: function(seedStr) {
        var h = 0;
        for (var i = 0; i < (seedStr || '').length; i++) {
            h = Math.imul(31, h) + (seedStr.charCodeAt(i) | 0) | 0;
        }
        return function() {
            h |= 0; h = h + 0x6D2B79F5 | 0;
            var t = Math.imul(h ^ h >>> 15, 1 | h);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    },

    generateWithSeed: function(abyssLevel, seed) {
        var rng = this.createSeed(seed);
        var base = window.levelConfig.level_procedural;
        var scaling = base.abyssScaling;
        var diffMult = Math.pow(scaling.enemyHpMult, abyssLevel);
        var atkMult = Math.pow(scaling.enemyAtkMult, abyssLevel);
        var spawnMult = Math.pow(scaling.spawnCountMult, abyssLevel);
        var intervalReduction = Math.max(0.3, base.spawnIntervalMin - abyssLevel * scaling.intervalReduce);
        var effectiveWaves = base.maxWaves + Math.floor(abyssLevel * scaling.maxWavesBonus);

        /* 种子影响的随机偏移 */
        var hpOffset = 1 + (rng() - 0.5) * 0.1;  /* ±5% HP 浮动 */
        var atkOffset = 1 + (rng() - 0.5) * 0.1;  /* ±5% ATK 浮动 */
        var typeBias = rng();  /* 决定哪类敌人偏多 */

        var waveEnemyMax = [];
        for (var i = 0; i < effectiveWaves; i++) {
            var baseCount = 20 + i * 10;
            var count = Math.floor(baseCount * spawnMult * (1 + (rng() - 0.5) * 0.15));
            /* H-033: 种子关卡也需要 maxWaveEnemyCap 上限保护 */
            if (count > scaling.maxWaveEnemyCap) count = scaling.maxWaveEnemyCap;
            waveEnemyMax.push(count);
        }
        if (effectiveWaves > 0) {
            waveEnemyMax[effectiveWaves - 1] = 1;
        }

        /* 根据种子调整敌人类型权重 — 钳制下限防负值破坏概率分布 */
        var enemyTypes = { Normal: 0.08, Tanker: 0.15, Stalker: 0.15, Archer: 0.20, Shaman: 0.14, Barrier: 0.16, Bomber: 0.12 };
        if (typeBias < 0.33) { enemyTypes.Stalker += 0.1; enemyTypes.Normal = Math.max(0, enemyTypes.Normal - 0.1); }
        else if (typeBias < 0.66) { enemyTypes.Shaman += 0.1; enemyTypes.Tanker = Math.max(0, enemyTypes.Tanker - 0.1); }
        else { enemyTypes.Tanker += 0.1; enemyTypes.Shaman = Math.max(0, enemyTypes.Shaman - 0.1); }
        /* R193-P1: 权重调整后归一化，防止weight和超过1.0导致概率分布偏移 */
        var _wtSum = 0; for (var _wk in enemyTypes) _wtSum += enemyTypes[_wk];
        if (_wtSum > 0 && Math.abs(_wtSum - 1.0) > 0.001) { for (var _wk2 in enemyTypes) enemyTypes[_wk2] /= _wtSum; }

        var seedHash = '';
        var hv = 0;
        for (var ci = 0; ci < (seed || '').length; ci++) hv = ((hv << 5) - hv) + seed.charCodeAt(ci) | 0;
        seedHash = 's' + Math.abs(hv).toString(36);

        return {
            id: 'level_seeded_' + seedHash + '_' + abyssLevel,
            name: '程序裂隙 · 第 ' + (abyssLevel + 1) + ' 层 [' + seedHash + ']',
            desc: '深渊层数 x' + (abyssLevel + 1) + '，种子 ' + seedHash + '，HP±' + (hpOffset * 100).toFixed(0) + '%',
            mapW: base.mapW,
            mapH: base.mapH,
            maxWaves: effectiveWaves,
            difficultyFactor: Math.min(5.0, base.difficultyFactor * diffMult * hpOffset),
            waveEnemyMax: waveEnemyMax,
            enemyTypes: enemyTypes,
            spawnIntervalMin: intervalReduction,
            spawnIntervalDecay: base.spawnIntervalDecay + abyssLevel * 0.005,
            /* R130-P1: difficultyFactor 钳制上限，防止深渊过深时数值爆炸 */
            difficultyTier: base.difficultyTier,
            abyssLevel: abyssLevel,
            isProcedural: true,
            isSeeded: true,
            seed: seedHash,
            hpMultiplier: hpOffset,
            atkMultiplier: atkOffset
        };
    }
};
