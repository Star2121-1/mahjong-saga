/* ── 成就定义 — Epoch 3 扩展 ── */
window.achievementConfig = [
    /* ═══ 战斗类 ═══ */
    { id: 'first_kill',     name: '初尝血腥',  desc: '击杀第一个敌人',         icon: '☠️', category: 'combat', thresholds: [1] },
    { id: 'hundred_kills',  name: '百人斩',    desc: '累计击杀 100 个敌人',    icon: '⚔️', category: 'combat', thresholds: [100] },
    { id: 'thousand_kills', name: '千人屠',    desc: '累计击杀 1000 个敌人',   icon: '🗡️', category: 'combat', thresholds: [1000] },
    { id: 'ten_thousand_kills', name: '万骨枯', desc: '累计击杀 10000 个敌人',  icon: '💀', category: 'combat', thresholds: [10000] },
    { id: 'crit_master',    name: '暴击大师',  desc: '单局累计暴击 100 次',    icon: '💥', category: 'combat', thresholds: [100] },
    { id: 'dodge_king',     name: '闪避之王',  desc: '单局累计闪避 50 次',     icon: '🌀', category: 'combat', thresholds: [50] },
    { id: 'boss_slayer',    name: '领主猎手',  desc: '累计击杀 10 个 Boss',    icon: '👹', category: 'combat', thresholds: [10] },
    { id: 'final_boss_down', name: '灭世者',   desc: '累计击杀 5 个最终 Boss', icon: '🐉', category: 'combat', thresholds: [5] },

    /* ═══ 通关类 ═══ */
    { id: 'first_victory',  name: '凯旋初征',  desc: '首次通关任意关卡',       icon: '🏆', category: 'victory', thresholds: [1] },
    { id: 'victory_10',     name: '百战不殆',  desc: '累计通关 10 局',         icon: '🎖️', category: 'victory', thresholds: [10] },
    { id: 'victory_50',     name: '传奇雀士',  desc: '累计通关 50 局',         icon: '👑', category: 'victory', thresholds: [50] },
    { id: 'flawless',       name: '毫发无伤',  desc: '任一关卡全程未受击通关', icon: '✨', category: 'victory', thresholds: [1] },
    { id: 'flawless_5',     name: '完美无瑕',  desc: '累计无伤通关 5 次',      icon: '🌟', category: 'victory', thresholds: [5] },

    /* ═══ 深渊类 ═══ */
    { id: 'deep_abyss',     name: '深渊行者',  desc: '深渊轮回达到第 5 层',    icon: '🌌', category: 'abyss', thresholds: [5] },
    { id: 'deep_abyss_10',  name: '无尽深渊',  desc: '深渊轮回达到第 10 层',   icon: '🕳️', category: 'abyss', thresholds: [10] },
    { id: 'deep_abyss_20',  name: '虚空之主',  desc: '深渊轮回达到第 20 层',   icon: '🌑', category: 'abyss', thresholds: [20] },

    /* ═══ 特殊类 ═══ */
    { id: 'overdrive_1',    name: '初次暴走',  desc: '首次触发 Overdrive',     icon: '⚡', category: 'special', thresholds: [1] },
    { id: 'overdrive_10',   name: '狂暴常客',  desc: '累计触发 Overdrive 10 次', icon: '🔥', category: 'special', thresholds: [10] },
    { id: 'overdrive_50',   name: '永动机',    desc: '累计触发 Overdrive 50 次', icon: '💫', category: 'special', thresholds: [50] },
    { id: 'get_rich',       name: '腰缠万贯',  desc: '单局积累 1000 金币',     icon: '💰', category: 'special', thresholds: [1000] },
    { id: 'gold_10k',       name: '富可敌国',  desc: '单局积累 10000 金币',    icon: '🪙', category: 'special', thresholds: [10000] },
    { id: 'speed_demon',    name: '极速通关',  desc: '单局 3 分钟内通关',      icon: '⏱️', category: 'special', thresholds: [180] },
    { id: 'all_heroes',     name: '群雄汇聚',  desc: '解锁全部 3 名英雄',      icon: '🎭', category: 'special', thresholds: [3] },
    { id: 'full_set',       name: '套装共鸣',  desc: '同时激活炎痕+永冻光环',  icon: '🔥❄️', category: 'special', thresholds: [1] },
];

/* 检测条件 */
window.achievementCheck = {
    inflight: {
        overdrive_10:   function(engine, val) { return val >= 10; },
        overdrive_50:   function(engine, val) { return val >= 50; },
        get_rich:       function(engine, gold) { return gold >= 1000; },
        gold_10k:       function(engine, gold) { return gold >= 10000; },
        crit_master:    function(engine, val) { return val >= 100; },
        dodge_king:     function(engine, val) { return val >= 50; },
        speed_demon:    function(engine, elapsed) { return elapsed <= 180; }
    },
    endgame: {
        first_kill:     function(meta) { return (meta.totalKills || 0) >= 1; },
        hundred_kills:  function(meta) { return (meta.totalKills || 0) >= 100; },
        thousand_kills: function(meta) { return (meta.totalKills || 0) >= 1000; },
        ten_thousand_kills: function(meta) { return (meta.totalKills || 0) >= 10000; },
        first_victory:  function(meta) { return (meta.totalRuns || 0) >= 1; },
        victory_10:     function(meta) { return (meta.totalRuns || 0) >= 10; },
        victory_50:     function(meta) { return (meta.totalRuns || 0) >= 50; },
        flawless:       function(meta) { return (meta.flawlessRuns || 0) >= 1; },
        flawless_5:     function(meta) { return (meta.flawlessRuns || 0) >= 5; },
        deep_abyss:     function(meta) { return (meta.highestEndlessLoop || 0) >= 5; },
        deep_abyss_10:  function(meta) { return (meta.highestEndlessLoop || 0) >= 10; },
        deep_abyss_20:  function(meta) { return (meta.highestEndlessLoop || 0) >= 20; },
        overdrive_1:    function(meta) { return (meta.overdriveCount || 0) >= 1; },
        boss_slayer:    function(meta) { return (meta.bossKills || 0) >= 10; },
        final_boss_down:function(meta) { return (meta.finalBossKills || 0) >= 5; },
        all_heroes:     function(meta) { return (meta.unlockedHeroes || []).length >= 3; },
        full_set:       function(meta) { return (meta.fullSetActivated || false) === true; }
    }
};
