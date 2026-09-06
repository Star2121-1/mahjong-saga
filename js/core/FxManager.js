(function() {

window.FxManager = function() {
    this._pool = [];
    this._layer = null;
    this._poolSize = window.Balance.FCT_POOL_SIZE_INIT || 50; /* R226-P1: 使用Balance常量而非硬编码 */
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
        this._freeStack.push(el); /* R248-P2: 初始化时将节点同时加入_freeStack，避免首次borrow时不必要地创建溢出节点 */
    }
};

Fp.spawnText = function(x, y, text, typeOrColor) {
    if (!this._layer) this.init();
    var node = this._borrowNode();
    if (!node) return;
    /* R72-P1: 使用固定设计分辨率钳制，避免responsive.js scale后clientWidth偏移导致飘字截断 */
    /* R252-P1: 优先使用_layer实际尺寸，兼容大地图（level_3/4 高度可达2000） */
    if (this._layer) {
        var w = this._layer.clientWidth || 1920;
        var h = this._layer.clientHeight || 1080;
        x = Math.max(0, Math.min(x, w - 40));
        y = Math.max(0, Math.min(y, h - 20));
    }
    node._lastUsed = performance.now(); /* R171-P1: 使用monotonic clock防止系统时间调整导致假阳性的stale检测 */
    if (!this._freeStack) this._freeStack = [];
    var type = (typeof typeOrColor === 'string' && typeOrColor.startsWith('#')) ? 'normal' : typeOrColor;
    var color = typeOrColor;
    if (typeof typeOrColor === 'string' && typeOrColor.startsWith('#')) color = typeOrColor;
    type = type || 'normal';
    node.textContent = text;
    node.className = 'fct-node fct-' + type;
    if (typeof color === 'string' && color.startsWith('#')) node.style.color = color; /* R226-P0: 仅hex颜色设inline color，避免'normal'等字符串被当作CSS颜色 */
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    node._fctActive = true;
    node.style.display = '';
    /* 移除旧的 animationend listener 避免重复绑定 */
    /* R165-P0: 防御性null检查 — _fctOnEnd可能未初始化（首次borrow前） */
    if (node._fctOnEnd) node.removeEventListener('animationend', node._fctOnEnd);
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
    return node; /* R198-P1: 返回节点引用，供调用方设置animationPlayState等 */
};

Fp._borrowNode = function() {
    /* R131-P0: 维护空闲节点栈替代每帧线性扫描，O(1)借出 */
    if (this._freeStack && this._freeStack.length > 0) {
        return this._freeStack.pop();
    }
    /* 池已满但未找到空闲节点，尝试健康检查回收 */
    if (++this._returnCount % window.Balance.FCT_HEALTHCHECK_MODULO === 0) this._healthCheck();
    /* 动态扩容：最多到 FCT_POOL_MAX_GROWTH */
    /* R165-P0: 池耗尽时创建临时DOM节点，防止飘字完全消失 */
    if (this._pool.length < window.Balance.FCT_POOL_MAX_GROWTH) {
        var el = document.createElement('div');
        el.className = 'fct-node';
        el.style.display = 'none';
        if (this._layer && this._layer.parentNode) {
            this._layer.appendChild(el);
        }
        this._pool.push(el);
        return el;
    }
    /* R187-P0: 池已满(≥MAX_GROWTH)，创建不受池管理的临时节点保底 */
    var el = document.createElement('div');
    el.className = 'fct-node';
    el.style.display = '';
    el.style.left = '0px'; el.style.top = '0px';
    /* R187-P0: 标记为已激活并绑定清理回调，防止健康检查误扫和动画结束后内存泄漏 */
    el._fctActive = true;
    el._lastUsed = performance.now(); /* R198-P0: overflow节点同步记录使用时间，防止stale检测误扫 */
    el._fctOnEnd = function() {
        if (!el || !el._fctActive) return;
        el.style.display = 'none';
        el.textContent = '';
        el.className = 'fct-node';
        el._fctActive = false;
        if (el._fctTimeout) { clearTimeout(el._fctTimeout); el._fctTimeout = null; }
        self._returnNode(el); /* R226-P0: overflow节点animationend中this=el(DOM), 需用self捕获FxManager引用 */
    };
    el.addEventListener('animationend', el._fctOnEnd);
    if (this._layer && this._layer.parentNode) {
        this._layer.appendChild(el);
    }
    this._pool.push(el);
    return el;
};

Fp._returnNode = function(node) {
    /* R46-P1: idempotent guard防止animationend和timeout双触发 */
    if (!node || !node._fctActive) return;
    node.style.display = 'none';
    node.textContent = '';
    node.className = 'fct-node';
    node._fctActive = false;
    if (node._fctTimeout) { clearTimeout(node._fctTimeout); node._fctTimeout = null; }
    /* R194-P1: 移除animationend监听器，防止临时节点复用后双重触发 */
    if (node._fctOnEnd) { node.removeEventListener('animationend', node._fctOnEnd); node._fctOnEnd = null; }
    /* R131-P0: 入空闲栈替代后续线性扫描 */
    if (!this._freeStack) this._freeStack = [];
    this._freeStack.push(node);
    /* R236-P0: 从_pool中移除overflow节点，防止pool无限增长超出FCT_POOL_MAX_GROWTH */
    var poolIdx = this._pool.indexOf(node);
    if (poolIdx !== -1) {
        this._pool.splice(poolIdx, 1);
    } else {
        /* R248-P1: 溢出节点在_freeStack中但不在_pool里，重新加入_pool以便cleanup能正确删除DOM */
        this._pool.push(node);
    }
    /* 健康检查：每 50 次归还扫描一次，强制回收超过 5s 未归还的节点 */
    if (++this._returnCount % window.Balance.FCT_HEALTHCHECK_MODULO === 0) this._healthCheck();
};

/* R70-P1: 缩短健康检查阈值，减少僵死节点占用池容量的时间 */
Fp._healthCheck = function() {
    var now = performance.now(); /* R177-P0: 统一时钟源为performance.now()，防止系统时间调整导致假阳性stale检测 */
    for (var i = 0; i < this._pool.length; i++) {
        var n = this._pool[i];
        if (n._fctActive && now - n._lastUsed > window.Balance.FCT_STALE_NODE_TIMEOUT_MS) {
            /* R46-P0-fix: 超时节点放回池底（而非移出DOM），确保池容量可恢复 */
            if (n._fctTimeout) { clearTimeout(n._fctTimeout); n._fctTimeout = null; }
            n.removeEventListener('animationend', n._fctOnEnd);
            n.style.display = 'none';
            n._fctActive = false;
            n._fctOnEnd = null;
            if (!this._freeStack) this._freeStack = [];
            this._freeStack.push(n); /* R141-P1: 健康检查回收节点应入栈复用，防止池容量隐性萎缩 */
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
            /* R159-P0: 清理后将节点放回空闲栈，防止下次borrow时池空返回null */
            if (!this._freeStack) this._freeStack = [];
            this._freeStack.push(n);
        }
    }
    /* R168-P0: 收缩池中膨胀的应急节点，防止重启后DOM泄漏 */
    while (this._pool.length > this._poolSize) {
        var excess = this._pool.pop();
        if (excess && excess.parentNode) excess.parentNode.removeChild(excess);
    }
    /* R201-P0: 重建空闲栈，只保留仍在池中的节点，防止清理后_freeStack指向已移除DOM的孤儿节点 */
    this._freeStack = this._pool.slice();
};

window.fxManager = new window.FxManager();

})();
