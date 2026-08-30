(function() {

window.FxManager = function() {
    this._pool = [];
    this._layer = null;
    this._poolSize = 50;
    this._returnCount = 0; /* 健康检查计数器 */
};

var Fp = window.FxManager.prototype;

Fp.init = function() {
    if (this._layer) return;
    this._layer = document.getElementById('fct-layer');
    if (!this._layer) {
        this._layer = document.createElement('div');
        this._layer.id = 'fct-layer';
        var wl = document.getElementById('world-layer');
        if (wl) wl.appendChild(this._layer);
    }
    for (var i = 0; i < this._poolSize; i++) {
        var el = document.createElement('div');
        el.className = 'fct-node';
        el.style.display = 'none';
        this._layer.appendChild(el);
        this._pool.push(el);
    }
};

Fp.spawnText = function(x, y, text, typeOrColor) {
    if (!this._layer) this.init();
    var node = this._borrowNode();
    if (!node) return;
    /* R46-P0: 边界钳制，防止文字溢出容器后永久不可见 */
    if (this._layer) {
        var w = this._layer.clientWidth || 480;
        var h = this._layer.clientHeight || 720;
        x = Math.max(0, Math.min(x, w - 40));
        y = Math.max(0, Math.min(y, h - 20));
    }
    node._lastUsed = Date.now();
    var type = (typeof typeOrColor === 'string' && typeOrColor.startsWith('#')) ? 'normal' : typeOrColor;
    var color = typeOrColor;
    if (typeof typeOrColor === 'string' && typeOrColor.startsWith('#')) color = typeOrColor;
    type = type || 'normal';
    node.textContent = text;
    node.className = 'fct-node fct-' + type;
    if (color) node.style.color = color;
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    node._fctActive = true;
    node.style.display = '';
    /* 移除旧的 animationend listener 避免重复绑定 */
    node.removeEventListener('animationend', node._fctOnEnd);
    /* 注：无需 offsetWidth reflow — CSS animation-fill-mode:forwards 保证动画从初始状态重新开始 */
    /* 注意：不清空 node.style.animation，否则会覆盖 CSS 类的 animation 属性 */
    /* 绑定清理回调 — 保存到节点上以便后续 remove */
    var self = this;
    var onEnd = function() {
        node.removeEventListener('animationend', onEnd);
        node._fctActive = false;
        self._returnNode(node);
    };
    node._fctOnEnd = onEnd;
    node.addEventListener('animationend', onEnd);
    /* fallback: 如果 animationend 事件未触发，5s 后强制回收（原10s过长） */
    node._fctTimeout = setTimeout(function() {
        node.removeEventListener('animationend', onEnd);
        node._fctActive = false;
        self._returnNode(node);
    }, 5000);
};

Fp._borrowNode = function() {
    for (var i = 0; i < this._pool.length; i++) {
        if (this._pool[i].style.display === 'none' && !this._pool[i]._fctActive) {
            return this._pool[i];
        }
    }
    if (this._pool.length < window.Balance.FCT_POOL_MAX_GROWTH) {
        var el = document.createElement('div');
        el.className = 'fct-node';
        el.style.display = 'none';
        this._layer.appendChild(el);
        this._pool.push(el);
        return el;
    }
    return null;
};

Fp._returnNode = function(node) {
    /* R46-P1: idempotent guard防止animationend和timeout双触发 */
    if (!node || !node._fctActive) return;
    node.style.display = 'none';
    node.textContent = '';
    node.className = 'fct-node';
    node._fctActive = false;
    if (node._fctTimeout) { clearTimeout(node._fctTimeout); node._fctTimeout = null; }
    /* 健康检查：每 50 次归还扫描一次，强制回收超过 5s 未归还的节点 */
    if (++this._returnCount % 50 === 0) this._healthCheck();
};

/* ── 健康检查：强制回收僵死的节点 ── */
Fp._healthCheck = function() {
    var now = Date.now();
    for (var i = 0; i < this._pool.length; i++) {
        var n = this._pool[i];
        if (n._fctActive && now - n._lastUsed > 6000) {
            /* R46-P0-fix: 超时节点放回池底（而非移出DOM），确保池容量可恢复 */
            if (n._fctTimeout) { clearTimeout(n._fctTimeout); n._fctTimeout = null; }
            n.style.display = 'none';
            n._fctActive = false;
            n._fctOnEnd = null;
            /* 节点保留在 fct-layer 的末尾，等待下次 _borrowNode 循环复用 */
        }
    }
};

/* ── 主动清理：游戏重置时回收所有活跃节点 ── */
Fp.cleanup = function() {
    for (var i = 0; i < this._pool.length; i++) {
        var n = this._pool[i];
        if (n._fctActive) {
            if (n._fctTimeout) { clearTimeout(n._fctTimeout); n._fctTimeout = null; }
            n.removeEventListener('animationend', n._fctOnEnd);
            n.style.display = 'none';
            n.textContent = '';
            n.className = 'fct-node';
            n._fctActive = false;
            n._fctOnEnd = null;
        }
    }
};

window.fxManager = new window.FxManager();

})();
