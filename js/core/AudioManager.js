(function() {

window.AudioManager = function() {
    this._ctx = null;
    this._muted = false;
    this._volume = 0.6;
    this._initialized = false;
    this._lastRetryTime = 0; /* R54-P1: 节流重试计时器 */
    /* Epoch 47: 分类音量控制 */
    this._categoryVolumes = {
        sfx: 1.0,    /* 攻击/暴击/受击等效果音 */
        music: 0.8,  /* 背景氛围音乐 */
        feedback: 0.9  /* 胜利/失败/升级等关键UI反馈音 */
    };
    this._activeOscillators = []; /* R165-P1: 跟踪活跃振荡器，防止tryReinit时内存泄漏 */
    /* R165-P0: restore persisted category volumes from meta — write path exists but read was missing */
    try {
        var _amMeta = window.saveManager && window.saveManager._metaCache;
        if (_amMeta) {
            if (_amMeta.audioCategoryVolumes) {
                if (_amMeta.audioCategoryVolumes.sfx != null) this._categoryVolumes.sfx = _amMeta.audioCategoryVolumes.sfx;
                if (_amMeta.audioCategoryVolumes.music != null) this._categoryVolumes.music = _amMeta.audioCategoryVolumes.music;
            }
            if (_amMeta.audioVolume != null) this._volume = _amMeta.audioVolume;
            if (_amMeta.audioMuted != null) this._muted = _amMeta.audioMuted;
        }
    } catch(e) {}
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
        /* P0: 页面可见性恢复机制 — R62-P2: 添加guard防止重复监听 */
        var self = this;
        if (!this._visibilityListenerAdded) {
            this._visibilityListenerAdded = true;
            document.addEventListener('visibilitychange', function() {
                if (!document.hidden && self._ctx) {
                    /* R159-P0: 恢复对'closed'状态的处理，extended tab switch后AudioContext可能变为closed */
                    if (self._ctx.state === 'suspended' || self._ctx.state === 'closed') {
                        /* R171-P1: 清空振荡器数组，防止挂起的context中onended永不触发导致泄漏 */
                        self._activeOscillators = [];
                        self.tryReinit();
                    }
                }
            });
        }
        this._initialized = true;
        return true;
    } catch (e) {
        this._ctx = null;
        /* P1: 不标记为已尝试，允许后续重试 */
        this._initialized = false;
        return false;
    }
};

/**
 * 公开的重试方法：外部调用以尝试重新初始化 AudioContext
 * 用于 setMuted(false) 或页面恢复可见时主动触发
 */
Ap.tryReinit = function() {
    /* R54-P1: 检查ctx状态而非仅initialized标志，防止浏览器回收后永久失效 */
    if (this._ctx && (this._ctx.state === 'closed' || this._ctx.state === 'suspended')) {
        /* R165-P1: 显式断开所有active振荡器，防止Safari GC延迟导致内存累积 */
        if (this._activeOscillators) {
            for (var _ao = this._activeOscillators.length - 1; _ao >= 0; _ao--) {
                var _osc = this._activeOscillators[_ao];
                try { _osc.stop(); _osc.disconnect(); } catch(e) {}
            }
            this._activeOscillators = [];
        }
        try { this._ctx.close(); } catch(e) {} /* R165-P1: 显式释放已关闭的context */
        this._ctx = null;
    }
    this._initialized = false;
    this._ensureContext();
};

/* 统一播放入口 */
Ap.play = function(sound, opts) {
    /* R54-P1: 节流重试避免高频调用时的控制台污染 */
    if (!this._ctx) {
        var now = Date.now();
        if (now - (this._lastRetryTime || 0) < 2000) return;
        if (!this._ensureContext()) { this._lastRetryTime = now; return; }
    }
    if (this._muted) return;
    /* R125-P1: 防止页面后台暂停期间积压的音频在恢复时洪泛 */
    if (this._ctx && (this._ctx.state === 'suspended' || this._ctx.state === 'closed')) return;
    opts = opts || {};
    /* P1: 应用分类音量 */
    /* R189-P1: boss音效归入sfx类别以获得更响亮的音量 */
    /* R194-P1: gameover/levelup/victory 归入feedback类别（默认0.9），
       区别于music氛围层；overdrive保留music保持沉浸感 */
    var catKey = (sound === 'victory' || sound === 'gameover' || sound === 'levelup') ? 'feedback' : 'sfx';
    if (sound === 'overdrive') catKey = 'music';
    if (sound === 'boss') catKey = 'sfx';
    var vol = Math.min(1, (opts.volume != null ? opts.volume : 1) * this._volume * (this._categoryVolumes[catKey] || 1));
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
        default: console.warn('[AudioManager] unknown sound:', sound); break;
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
    var self = this; /* R173-P0: capture this to avoid self resolving to window.self in onended closure */
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
        /* R155-P0: 播放结束后断开节点，防止Safari GC延迟导致内存累积 */
        o.onended = function() {
            var idx = self._activeOscillators.indexOf(o);
            if (idx !== -1) self._activeOscillators.splice(idx, 1);
            try { o.disconnect(); g.disconnect(); } catch(e) {}
        };
        self._activeOscillators.push(o);
    } catch(e) { console.warn('[AudioManager] _osc error:', e); }
};

Ap._sine = function(freq, dur, vol, rampEndFreq) {
    this._osc('sine', freq, this._ctx.currentTime, dur, vol, rampEndFreq);
};
Ap._saw = function(freq, dur, vol) {
    this._osc('sawtooth', freq, this._ctx.currentTime, dur, vol);
};
Ap._noise = function(dur, vol) {
    var self = this; /* R173-P0: capture this to avoid self resolving to window.self in onended closure */
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
        /* R157-P0: 播放结束后断开节点，防止Safari GC延迟导致内存累积 */
        src.onended = function() {
            var idx = self._activeOscillators.indexOf(src);
            if (idx !== -1) self._activeOscillators.splice(idx, 1);
            try { src.disconnect(); filt.disconnect(); g.disconnect(); } catch(e) {}
        };
        self._activeOscillators.push(src);
    } catch(e) { console.warn('[AudioManager] _noise error:', e); }
};
Ap._sweep = function(from, to, dur, vol) {
    var self = this; /* R173-P0: capture this to avoid self resolving to window.self in onended closure */
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
        /* R155-P0: 播放结束后断开节点 */
        o.onended = function() {
            var idx = self._activeOscillators.indexOf(o);
            if (idx !== -1) self._activeOscillators.splice(idx, 1);
            try { o.disconnect(); g.disconnect(); } catch(e) {}
        };
        self._activeOscillators.push(o);
    } catch(e) { console.warn('[AudioManager] _sweep error:', e); }
};
Ap._chord = function(freqs, dur, vol) {
    var self = this;
    for (var i = 0; i < freqs.length; i++) self._sine(freqs[i], dur, vol / freqs.length, null);
};
Ap._wall = function(vol) {
    var t = this._ctx.currentTime;
    /* 三层锯齿叠加制造密集感 — R165-P0: 加入90%头部空间防止4层叠加超Unity增益导致削波失真 */
    var v = vol * 0.9;
    this._saw(80, 0.3, v * 0.28);
    this._saw(120, 0.25, v * 0.24);
    this._saw(200, 0.2, v * 0.2);
    this._noise(0.3, v * 0.28);
};

Ap.setMuted = function(muted) {
    this._muted = !!muted;
    /* R171-P1: 静音时立即停止所有在途振荡器，防止静音后仍有声音 */
    if (this._muted) this.stopAll();
    else this.tryReinit();
    /* P1: 持久化静音状态到 meta */
    try {
        var m = window.saveManager && window.saveManager._metaCache;
        if (m) { m.audioMuted = this._muted; window.saveManager._saveMetaToStorage().catch(function(e) { console.warn('[Audio] muted save failed:', e); }); }
    } catch(e) {}
};

/* R171-P1: 停止所有活跃振荡器，用于静音时强制静默 */
Ap.stopAll = function() {
    for (var i = this._activeOscillators.length - 1; i >= 0; i--) {
        var o = this._activeOscillators[i];
        if (o && o.stop) { try { o.stop(); } catch(e) {}
            try { o.disconnect(); } catch(e) {}
        }
    }
    this._activeOscillators = [];
};

Ap.setVolume = function(v) {
    this._volume = Math.max(0.02, Math.min(1, v)); /* R165-P1: 2%下限防止误触静音 */
    /* P1: 持久化音量到 meta，刷新后恢复 */
    try {
        var m = window.saveManager && window.saveManager._metaCache;
        if (m) { m.audioVolume = this._volume; window.saveManager._saveMetaToStorage().catch(function(e) { console.warn('[Audio] volume save failed:', e); }); }
    } catch(e) {}
};

window.audioManager = new window.AudioManager();

})();
