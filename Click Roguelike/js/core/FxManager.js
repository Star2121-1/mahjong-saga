(function() {

window.FxManager = function() {
    this._pool = [];
    this._layer = null;
    this._poolSize = 50;
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

Fp.spawnText = function(x, y, text, type) {
    if (!this._layer) this.init();
    var node = this._borrowNode();
    if (!node) return;
    type = type || 'normal';
    node.textContent = text;
    node.className = 'fct-node fct-' + type;
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    node._fctActive = true;
    node.style.display = '';
    node.style.animation = 'none';
    void node.offsetWidth;
    node.style.animation = '';
    var self = this;
    var onEnd = function() {
        node.removeEventListener('animationend', onEnd);
        if (node._fctActive) {
            node._fctActive = false;
            self._returnNode(node);
        }
    };
    node.removeEventListener('animationend', onEnd);
    node.addEventListener('animationend', onEnd);
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
};

window.fxManager = new window.FxManager();

})();
