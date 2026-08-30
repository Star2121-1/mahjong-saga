(function() {

window.AudioManager = function() {
    this._ctx = null;
    this._muted = false;
    this._volume = 0.6;
    this._initialized = false;
    /* Epoch 47: 分类音量控制 */
    this._categoryVolumes = {
        sfx: 1.0,    /* 攻击/暴击/受击等效果音 */
        music: 0.8   /* 胜利/失败/升级等氛围音 */
    };
};

var Ap = window.AudioManager.prototype;

/* 延迟初始化 AudioContext（需用户手势触发） */
Ap._ensureContext = function() {
    if (this._initialized) return true;
    try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { this._initialized = true; return false; }
        this._ctx = new AC();
        /* Epoch 16: iOS 12.2+ 需要 resume() 才能播放 */
        if (this._ctx.state === 'suspended') {
            this._ctx.resume().catch(function(e) { console.warn('[Audio] resume failed:', e); });
        }
        /* P0: 页面可见性恢复机制 */
        var self = this;
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden && self._ctx && self._ctx.state === 'suspended') {
                self._ctx.resume().catch(function(e) { console.warn('[Audio] visibility resume failed:', e); });
            }
        });
        this._initialized = true;
        return true;
    } catch (e) {
        this._ctx = null;
        /* P1: 不标记为已尝试，允许后续重试 */
        this._initialized = false;
        return false;
    }
};

/* 统一播放入口 */
Ap.play = function(sound, opts) {
    if (this._muted || !this._ctx) return;
    opts = opts || {};
    /* P1: 应用分类音量 */
    var catKey = (sound === 'victory' || sound === 'gameover' || sound === 'levelup') ? 'music' : 'sfx';
    var vol = (opts.volume != null ? opts.volume : 1) * this._volume * (this._categoryVolumes[catKey] || 1);
    switch (sound) {
        case 'attack': this._sine(300, 0.06, vol, -0.3); break;
        case 'crit':   this._sine(600, 0.12, vol, -0.5); break;
        case 'hit':    this._noise(0.1, vol * 0.7); break;
        case 'heal':   this._sine(500, 0.15, vol * 0.5, 0.3); break;
        case 'pickup': this._sweep(800, 1200, 0.08, vol * 0.5); break;
        case 'levelup':this._chord([440,554,659], 0.25, vol * 0.6); break;
        case 'reward': this._sine(400, 0.1, vol * 0.4, 0.2); break;
        case 'boss':   this._saw(100, 0.3, vol * 0.5); break;
        case 'overdrive': this._wall(vol * 0.7); break;
        case 'victory':  this._chord([523,659,784,1047], 0.5, vol * 0.6); break;
        case 'gameover': this._sine(300, 0.4, vol * 0.5, -0.8); break;
        case 'freeze':   this._sine(1000, 0.1, vol * 0.3, 0.1); break;
        case 'explode':  this._noise(0.2, vol * 0.6); break;
    }
};

/* Epoch 47: 分类音量设置 */
Ap.setCategoryVolume = function(category, vol) {
    this._categoryVolumes[category] = Math.max(0, Math.min(1, vol));
    /* P1: 持久化分类音量到 meta */
    try {
        var m = window.saveManager && window.saveManager._metaCache;
        if (m) {
            if (!m.audioCategoryVolumes) m.audioCategoryVolumes = {};
            m.audioCategoryVolumes[category] = this._categoryVolumes[category];
            window.saveManager._saveMetaToStorage().catch(function(e) { console.warn('[Audio] category volume save failed:', e); });
        }
    } catch(e) {}
};

Ap.getCategoryVolume = function(category) {
    return this._categoryVolumes[category] || 1;
};

/* ── 合成原语 ── */

Ap._osc = function(type, freq, startTime, duration, vol, rampEndFreq) {
    try {
        var o = this._ctx.createOscillator();
        var g = this._ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, startTime);
        if (rampEndFreq != null) o.frequency.exponentialRampToValueAtTime(Math.max(rampEndFreq, 1), startTime + duration);
        g.gain.setValueAtTime(vol, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        o.connect(g);
        g.connect(this._ctx.destination);
        o.start(startTime);
        o.stop(startTime + duration + 0.01);
    } catch(e) { console.warn('[AudioManager] _osc error:', e); }
};

Ap._sine = function(freq, dur, vol, rampEndFreq) {
    this._osc('sine', freq, this._ctx.currentTime, dur, vol, rampEndFreq);
};
Ap._saw = function(freq, dur, vol) {
    this._osc('sawtooth', freq, this._ctx.currentTime, dur, vol);
};
Ap._noise = function(dur, vol) {
    try {
        var bufSize = this._ctx.sampleRate * dur;
        var buf = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        var src = this._ctx.createBufferSource();
        src.buffer = buf;
        var filt = this._ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 1000;
        filt.Q.value = 0.5;
        var g = this._ctx.createGain();
        var t = this._ctx.currentTime;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(filt);
        filt.connect(g);
        g.connect(this._ctx.destination);
        src.start(t);
        src.stop(t + dur + 0.01);
    } catch(e) { console.warn('[AudioManager] _osc error:', e); }
};
Ap._sweep = function(from, to, dur, vol) {
    try {
        var o = this._ctx.createOscillator();
        var g = this._ctx.createGain();
        var t = this._ctx.currentTime;
        o.type = 'sine';
        o.frequency.setValueAtTime(from, t);
        o.frequency.exponentialRampToValueAtTime(to, t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g);
        g.connect(this._ctx.destination);
        o.start(t);
        o.stop(t + dur + 0.01);
    } catch(e) { console.warn('[AudioManager] _osc error:', e); }
};
Ap._chord = function(freqs, dur, vol) {
    var self = this;
    for (var i = 0; i < freqs.length; i++) self._sine(freqs[i], dur, vol / freqs.length, null);
};
Ap._wall = function(vol) {
    var t = this._ctx.currentTime;
    /* 三层锯齿叠加制造密集感 */
    this._saw(80, 0.3, vol * 0.3);
    this._saw(120, 0.25, vol * 0.25);
    this._saw(200, 0.2, vol * 0.2);
    this._noise(0.3, vol * 0.3);
};

Ap.setMuted = function(muted) {
    this._muted = !!muted;
};

Ap.setVolume = function(v) {
    this._volume = Math.max(0, Math.min(1, v));
    /* P1: 持久化音量到 meta，刷新后恢复 */
    try {
        var m = window.saveManager && window.saveManager._metaCache;
        if (m) { m.audioVolume = this._volume; window.saveManager._saveMetaToStorage().catch(function(e) { console.warn('[Audio] volume save failed:', e); }); }
    } catch(e) {}
};

window.audioManager = new window.AudioManager();

})();
