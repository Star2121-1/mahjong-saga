(function() {

window.AudioManager = function() {
    this._ctx = null;
    this._muted = false;
    this._volume = 0.6;
    this._initialized = false;
};

var Ap = window.AudioManager.prototype;

/* 延迟初始化 AudioContext（需用户手势触发） */
Ap._ensureContext = function() {
    if (this._initialized) return;
    try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this._ctx = new AC();
        this._initialized = true;
    } catch (e) {
        this._ctx = null;
    }
};

/* 统一播放入口。sound 为音效 id，预留接口 */
Ap.play = function(sound, opts) {
    if (this._muted || !this._ctx) return;
    /* TODO: 接入音频资源后实现各音效
       常用 sound id：
       - attack      普攻
       - crit        暴击
       - hit         玩家受击
       - heal        治疗
       - pickup      拾取金币/经验
       - levelup     升级
       - reward      奖励面板
       - boss        Boss 登场
       - overdrive   Overdrive 触发
       - victory     胜利
       - gameover    死亡
    */
    void sound;
    void opts;
};

Ap.setMuted = function(muted) {
    this._muted = !!muted;
};

Ap.setVolume = function(v) {
    this._volume = Math.max(0, Math.min(1, v));
};

window.audioManager = new window.AudioManager();

})();
