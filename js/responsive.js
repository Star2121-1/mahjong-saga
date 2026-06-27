/* ── 移动端响应式缩放 ── */
/* 将固定 1920×1080 容器等比缩放适配视口，仅缩小不放大 */
(function() {
    var containerId = null;
    var els = ['game-container','main-hub-screen','save-select-screen'];
    for (var _i = 0; _i < els.length; _i++) {
        var el = document.getElementById(els[_i]);
        if (el) { containerId = els[_i]; break; }
    }
    if (!containerId) return;

    var BASE_W = 1920, BASE_H = 1080;
    var MIN_SCALE = 0.5; /* 最低缩放到 50%，避免内容过小 */

    function fit() {
        var c = document.getElementById(containerId);
        if (!c) return;
        var sx = window.innerWidth / BASE_W;
        var sy = window.innerHeight / BASE_H;
        var s = Math.min(sx, sy, 1);
        if (s < MIN_SCALE) s = MIN_SCALE; /* 不低于 50% */
        c.style.transform = 'scale(' + s + ')';
        c.style.transformOrigin = 'center center';
    }

    fit();
    window.addEventListener('resize', fit);
    /* 初始延迟适配 (某些浏览器 resize 事件延迟) */
    setTimeout(fit, 100);
})();
