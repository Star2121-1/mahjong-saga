/* ── 成就定义 ── */
window.achievementConfig = [
    { id: 'first_kill',    name: '初尝血腥',  desc: '击杀第一个敌人',         icon: '☠️' },
    { id: 'hundred_kills', name: '百人斩',    desc: '累计击杀 100 个敌人',    icon: '⚔️' },
    { id: 'thousand_kills',name: '千人屠',    desc: '累计击杀 1000 个敌人',   icon: '🗡️' },
    { id: 'first_victory', name: '凯旋初征',  desc: '首次通关任意关卡',       icon: '🏆' },
    { id: 'flawless',      name: '毫发无伤',  desc: '任一关卡全程未受击通关', icon: '✨' },
    { id: 'overdrive_10',  name: '狂暴常客',  desc: '累计触发 Overdrive 10 次', icon: '🔥' },
    { id: 'get_rich',      name: '腰缠万贯',  desc: '单局积累 1000 金币',      icon: '💰' },
    { id: 'deep_abyss',    name: '深渊行者',  desc: '深渊轮回达到第 5 层',    icon: '🌌' }
];

/* 检测条件——各条件由 GameEngine 在事件点推进 */
window.achievementCheck = {
    /* 局内累加型：引擎直接推进 */
    inflight: {
        overdrive_10:  function(engine, val) { return val >= 10; },
        get_rich:      function(engine, gold) { return gold >= 1000; }
    },
    /* 局末/总局型：由引擎在结算时调用 */
    endgame: {
        first_kill:     function(meta) { return (meta.totalKills || 0) >= 1; },
        hundred_kills:  function(meta) { return (meta.totalKills || 0) >= 100; },
        thousand_kills: function(meta) { return (meta.totalKills || 0) >= 1000; },
        first_victory:  function(meta) { return (meta.totalRuns || 0) >= 1; },
        flawless:       function(meta) { return (meta.flawlessRuns || 0) >= 1; },
        deep_abyss:     function(meta) { return (meta.highestEndlessLoop || 0) >= 5; }
    }
};
