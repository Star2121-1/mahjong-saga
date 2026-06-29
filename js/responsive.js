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

    /* Epoch 16: 防抖 throttle 避免 iOS 地址栏动画期间重复 reflow */
    var _fitTimer = 0;
    var _lastFitScale = '';

    function fit() {
        var c = document.getElementById(containerId);
        if (!c) return;
        /* 使用 visualViewport 避免 iOS 地址栏跳动 */
        var vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
        var vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        var sx = vw / BASE_W;
        var sy = vh / BASE_H;
        var s = Math.min(sx, sy, 1);
        if (s < MIN_SCALE) s = MIN_SCALE;
        var key = s + '|' + vw + '|' + vh;
        if (key === _lastFitScale) return; /* 同参数跳过 */
        _lastFitScale = key;
        c.style.transform = 'scale(' + s + ')';
        c.style.transformOrigin = 'center center';
    }

    function scheduleFit() {
        if (_fitTimer) return;
        _fitTimer = setTimeout(function() {
            _fitTimer = 0;
            fit();
        }, 80); /* 80ms throttle */
    }

    fit();
    /* 只监听 visualViewport，window.resize 会重复触发 */
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleFit);
        window.visualViewport.addEventListener('scroll', scheduleFit);
    }
    /* iOS 地址栏渐近动画补偿 */
    setTimeout(scheduleFit, 300);
    setTimeout(scheduleFit, 600);
})();
