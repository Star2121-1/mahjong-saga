/* ── 成就定义 — 麻将主题 ── */
window.achievementConfig = [
    /* ═══ 战斗类 ═══ */
    { id: 'first_kill',     name: '初鸣',  desc: '击溃第一张牌敌',         icon: '🀄', category: 'combat', thresholds: [1] },
    { id: 'hundred_kills',  name: '百胡斩',    desc: '累计击溃 100 张牌敌',    icon: '⚔️', category: 'combat', thresholds: [100] },
    { id: 'thousand_kills', name: '千番屠',    desc: '累计击溃 1000 张牌敌',   icon: '🗡️', category: 'combat', thresholds: [1000] },
    { id: 'ten_thousand_kills', name: '万骨胡', desc: '累计击溃 10000 张牌敌',  icon: '💀', category: 'combat', thresholds: [10000] },
    { id: 'crit_master',    name: '胡牌大师',  desc: '单局累计暴击 100 次',    icon: '💥', category: 'combat', thresholds: [100] },
    { id: 'dodge_king',     name: '闪避自摸',  desc: '单局累计闪避 50 次',     icon: '🌀', category: 'combat', thresholds: [50] },
    { id: 'boss_slayer',    name: '雀坛猎手',  desc: '累计击溃 10 个 Boss 牌',    icon: '👹', category: 'combat', thresholds: [10] },
    { id: 'final_boss_down', name: '清台者',   desc: '累计击溃 5 个最终 Boss 牌', icon: '🐉', category: 'combat', thresholds: [5] },

    /* ═══ 通关类 ═══ */
    { id: 'first_victory',  name: '小胡初成',  desc: '首次胡牌通关',       icon: '🏆', category: 'victory', thresholds: [1] },
    { id: 'victory_10',     name: '大胡连连',  desc: '累计胡牌 10 次（含尝试）', icon: '🎖️', category: 'victory', thresholds: [10] },
    { id: 'victory_50',     name: '传奇雀圣',  desc: '累计胡牌 50 次（含尝试）', icon: '👑', category: 'victory', thresholds: [50] },
    { id: 'flawless',       name: '无伤胡',  desc: '任一关卡全程未受击胡牌', icon: '✨', category: 'victory', thresholds: [1] },
    { id: 'flawless_5',     name: '完美无瑕',  desc: '累计无伤胡牌 5 次',      icon: '🌟', category: 'victory', thresholds: [5] },

    /* ═══ 深渊类 ═══ */
    { id: 'deep_abyss',     name: '深渊雀行',  desc: '深渊轮回达到第 5 层',    icon: '🌌', category: 'abyss', thresholds: [5] },
    { id: 'deep_abyss_10',  name: '无尽番牌',  desc: '深渊轮回达到第 10 层',   icon: '🕳️', category: 'abyss', thresholds: [10] },
    { id: 'deep_abyss_20',  name: '虚空雀主',  desc: '深渊轮回达到第 20 层',   icon: '🌑', category: 'abyss', thresholds: [20] },

    /* ═══ 特殊类 ═══ */
    { id: 'overdrive_1',    name: '初次暴番',  desc: '首次触发 Overdrive（超胡）',     icon: '⚡', category: 'special', thresholds: [1] },
    { id: 'overdrive_10',   name: '狂番常客',  desc: '累计触发 Overdrive 10 次', icon: '🔥', category: 'special', thresholds: [10] },
    { id: 'overdrive_50',   name: '永动机',    desc: '累计触发 Overdrive 50 次', icon: '💫', category: 'special', thresholds: [50] },
    { id: 'get_rich',       name: '财源番涨',  desc: '单局积累 1000 金币',     icon: '💰', category: 'special', thresholds: [1000] },
    { id: 'gold_10k',       name: '富可敌国',  desc: '单局积累 10000 金币',    icon: '🪙', category: 'special', thresholds: [10000] },
    { id: 'speed_demon',    name: '极速通关',  desc: '单局 3 分钟内胡牌通关',      icon: '⏱️', category: 'special', thresholds: [180] },
    { id: 'all_heroes',     name: '群雄汇聚',  desc: '解锁全部 4 名雀士',         icon: '🎭', category: 'special', thresholds: [4] },
    { id: 'full_set',       name: '番牌共鸣',  desc: '同时激活炎痕+永冻番印',  icon: '🔥❄️', category: 'special', thresholds: [1] },
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
        speed_demon:    function(engine, val) { return val <= 180; }
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
        all_heroes:     function(meta) { return (meta.unlockedHeroes || []).length >= 4; },
        full_set:       function(meta) { return (meta.fullSetActivated || false) === true; }
    }
};
