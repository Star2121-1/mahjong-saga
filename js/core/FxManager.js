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

Fp.spawnText = function(x, y, text, typeOrColor, size, duration) {
    if (!this._layer) this.init();
    var node = this._borrowNode();
    if (!node) return;
    node._lastUsed = Date.now();
    var type = (typeof typeOrColor === 'string' && typeOrColor.startsWith('#')) ? 'normal' : typeOrColor;
    var color = typeOrColor;
    if (typeof typeOrColor === 'string' && typeOrColor.startsWith('#')) color = typeOrColor;
    type = type || 'normal';
    node.textContent = text;
    node.className = 'fct-node fct-' + type;
    if (color) node.style.color = color;
    if (size) node.style.fontSize = size + 'px';
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    node._fctActive = true;
    node.style.display = '';
    /* 移除旧的 animationend listener 避免重复绑定 */
    node.removeEventListener('animationend', node._fctOnEnd);
    /* 触发 reflow 以确保动画从初始状态重新开始 */
    void node.offsetWidth;
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
    /* fallback: 如果 animationend 未触发，5s 后强制回收 */
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
    if (this._pool.length < 200) {
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
        if (n._fctActive && now - n._lastUsed > 5000) {
            n.style.display = 'none';
            n._fctActive = false;
            if (n.parentNode) n.parentNode.removeChild(n);
            this._pool.splice(i, 1);
            i--;
        }
    }
};
};

window.fxManager = new window.FxManager();

})();
