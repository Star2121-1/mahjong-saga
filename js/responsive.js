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

    function fit() {
        var c = document.getElementById(containerId);
        if (!c) return;
        var sx = window.innerWidth / BASE_W;
        var sy = window.innerHeight / BASE_H;
        var s = Math.min(sx, sy, 1); /* 仅缩小，不放大 */
        c.style.transform = 'scale(' + s + ')';
    }

    fit();
    window.addEventListener('resize', fit);
})();
