/* ══════════════════════════════════════════════
   ToastSystem — 全局通知系统
   轻量级 DOM 浮动通知，3 秒自动消失
   ══════════════════════════════════════════════ */

window.toastSystem = {
    _pool: [],
    _active: [],
    _container: null,

    init: function() {
        if (this._container) return;
        var c = document.createElement('div');
        c.id = 'toast-container';
        c.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:10000;pointer-events:none;display:flex;flex-direction:column;gap:8px;align-items:center;';
        document.body.appendChild(c);
        this._container = c;
    },

    _getNode: function() {
        for (var i = 0; i < this._pool.length; i++) {
            if (!this._pool[i].used) {
                this._pool[i].used = true;
                return this._pool[i];
            }
        }
    /* R158-P0: 限制pool最大容量，防止跨局累计无限增长 */
    if (this._pool.length > 10) {
        var toRemove = this._pool.length - 10;
        for (var i = 0; i < toRemove && this._pool.length > 10; i++) {
            var extra = this._pool.pop();
            if (extra.parentNode) extra.parentNode.removeChild(extra);
        }
    }
    },

    _releaseNode: function(node) {
        node.used = false;
        node.style.opacity = '0';
        node.style.transform = 'translateY(-20px)';
        if (node.parentNode) node.parentNode.removeChild(node);
        var idx = this._active.indexOf(node);
        if (idx !== -1) this._active.splice(idx, 1);
    },

    _show: function(message, type, duration) {
        this.init();
        duration = duration || 3000;

        var colors = {
            info: '#4caf50',
            success: '#66bb6a',
            warning: '#ffa726',
            error: '#ef5350',
            danger: '#b71c1c'
        };
        var icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            danger: '💀'
        };
        var color = colors[type] || colors.info;
        var icon = icons[type] || icons.info;

        var node = this._getNode();
        /* R88-P1: 限制活跃toast数量，防止rapid调用时pool/active无界增长 */
        this._prune(5);
        node.className = 'toast-node';
        node.style.cssText =
            'background:rgba(20,30,20,0.92);' +
            'color:#e8e8e0;' +
            'padding:8px 20px;' +
            'border-radius:8px;' +
            'border:1px solid ' + color + ';' +
            'font-size:14px;' +
            'font-weight:600;' +
            'pointer-events:none;' +
            'white-space:nowrap;' +
            'max-width:90vw;' +
            'overflow:hidden;' +
            'text-overflow:ellipsis;' +
            'box-shadow:0 4px 20px rgba(0,0,0,0.4);' +
            'opacity:1;' +
            'transform:translateY(0);' +
            'display:flex;align-items:center;gap:8px;';
        node.innerHTML = '<span>' + icon + '</span><span>' + message + '</span>';
        this._container.appendChild(node);
        this._active.push(node);

        var self = this;
        var timer = setTimeout(function() {
            self._fadeOut(node);
        }, duration);

        node._timer = timer;
    },

    _fadeOut: function(node) {
        var self = this;
        node.classList.add('toast-exit');
        setTimeout(function() {
            node.classList.remove('toast-exit');
            self._releaseNode(node);
        }, 300);
    },

    /* ── 快捷方法 ── */

    show: function(message, type, duration) {
        this._show(message, type || 'info', duration);
    },

    success: function(msg, dur) { return this._show(msg, 'success', dur); },
    warning: function(msg, dur) { return this._show(msg, 'warning', dur); },
    error: function(msg, dur) { return this._show(msg, 'error', dur); },
    info: function(msg, dur) { return this._show(msg, 'info', dur); },

    /* 通知数量过多时清理最老的 */
    _prune: function(max) {
        max = max || 5;
        while (this._active.length > max) {
            var oldest = this._active.shift();
            if (oldest && oldest._timer) clearTimeout(oldest._timer);
            this._releaseNode(oldest);
        }
    }
};

/* 自动初始化 */
window.toastSystem.init();
