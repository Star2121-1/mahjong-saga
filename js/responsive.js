/* ── 移动端响应式缩放 ── */
/* 不同页面有不同的设计分辨率 */
(function() {
    var containerId = null;
    var els = ['game-container','main-hub-screen','save-select-screen'];
    for (var _i = 0; _i < els.length; _i++) {
        var el = document.getElementById(els[_i]);
        if (el) { containerId = els[_i]; break; }
    }
    if (!containerId) return;

    /* 设计分辨率 */
    var BASE_W, BASE_H, MIN_SCALE;
    if (containerId === 'save-select-screen') {
        BASE_W = 480; BASE_H = 720; MIN_SCALE = 0.6;
    } else {
        BASE_W = 1920; BASE_H = 1080; MIN_SCALE = 0.5;
    }

    function fit() {
        var c = document.getElementById(containerId);
        if (!c) return;
        var sx = window.innerWidth / BASE_W;
        var sy = window.innerHeight / BASE_H;
        var s = Math.min(sx, sy, 1);
        if (s < MIN_SCALE) s = MIN_SCALE;
        c.style.transform = 'scale(' + s + ')';
        c.style.transformOrigin = 'center center';
    }

    fit();
    window.addEventListener('resize', fit);
    setTimeout(fit, 100);
})();
