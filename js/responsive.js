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
    var BASE_W, BASE_H;
    if (containerId === 'save-select-screen') {
        BASE_W = 480; BASE_H = 720;
    } else {
        BASE_W = 1920; BASE_H = 1080;
    }

    /* Epoch 11: 短边填满策略。
       scale = min(vw/BASE_W, vh/BASE_H, 1)
       竖屏手机 (390x844) → scale≈0.203 → 游戏宽度填满，上下黑边
       横屏设备 (1920x1080) → scale=1 → 原尺寸
       横屏设备 (1200x1920) → scale≈0.625 → 游戏高度填满，左右黑边 */
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
        var key = s.toFixed(4) + '|' + vw + '|' + vh;
        if (key === _lastFitScale) return; /* 同参数跳过 */
        _lastFitScale = key;
        /* fixed: 脱离文档流 */
        c.style.position = 'fixed';
        /* 响应式字体基线：缩放比例驱动 --_fs */
        c.style.setProperty('--_fs', (1.5 * s).toFixed(3));
        /* 居中: 缩放后尺寸 = BASE_W*s × BASE_H*s
           视口中的偏移 = (视口 - 缩放后尺寸) / 2 */
        var scaledW = BASE_W * s;
        var scaledH = BASE_H * s;
        c.style.top = ((vh - scaledH) / 2) + 'px';
        c.style.left = ((vw - scaledW) / 2) + 'px';
        c.style.width = BASE_W + 'px';
        c.style.height = BASE_H + 'px';
        c.style.transform = 'scale(' + s + ')';
        /* transformOrigin 设为缩放起点为元素左上角，
           配合 top/left 偏移实现居中 */
        c.style.transformOrigin = 'top left';
    }

    function scheduleFit() {
        if (_fitTimer) return;
        _fitTimer = setTimeout(function() {
            _fitTimer = 0;
            fit();
        }, 80); /* 80ms throttle */
    }

    fit();
    /* 监听 visualViewport (移动端) + window.resize (桌面端) */
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleFit);
        window.visualViewport.addEventListener('scroll', scheduleFit);
    }
    window.addEventListener('resize', scheduleFit);
    /* iOS 地址栏渐近动画补偿 */
    setTimeout(scheduleFit, 300);
    setTimeout(scheduleFit, 600);
})();
