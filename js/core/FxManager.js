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
    this._freeStack = []; /* R140-P1: 预先初始化避免首次borrow走healthCheck路径返回null */
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
    /* R72-P1: 使用固定设计分辨率钳制，避免responsive.js scale后clientWidth偏移导致飘字截断 */
    if (this._layer) {
        var w = 1920; /* gameplay design width */
        var h = 1080; /* gameplay design height */
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
    }, window.Balance.FCT_FALLBACK_TIMEOUT_MS);
};

Fp._borrowNode = function() {
    /* R131-P0: 维护空闲节点栈替代每帧线性扫描，O(1)借出 */
    if (this._freeStack && this._freeStack.length > 0) {
        return this._freeStack.pop();
    }
    /* 池已满但未找到空闲节点，尝试健康检查回收 */
    if (++this._returnCount % 20 === 0) this._healthCheck();
    /* 动态扩容：最多到 FCT_POOL_MAX_GROWTH */
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
    /* R131-P0: 入空闲栈替代后续线性扫描 */
    if (!this._freeStack) this._freeStack = [];
    this._freeStack.push(node);
    /* 健康检查：每 50 次归还扫描一次，强制回收超过 5s 未归还的节点 */
    if (++this._returnCount % window.Balance.FCT_HEALTHCHECK_MODULO === 0) this._healthCheck();
};

/* R70-P1: 缩短健康检查阈值，减少僵死节点占用池容量的时间 */
Fp._healthCheck = function() {
    var now = Date.now();
    for (var i = 0; i < this._pool.length; i++) {
        var n = this._pool[i];
        if (n._fctActive && now - n._lastUsed > window.Balance.FCT_STALE_NODE_TIMEOUT_MS) {
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
