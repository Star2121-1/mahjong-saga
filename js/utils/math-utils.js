/**
 * 数学工具 — 碰撞检测、距离计算、随机数钳制
 * 供 core/ 和 entities/ 共享
 */
(function() {
    'use strict';

    /** 圆-圆碰撞检测 */
    function circleCircle(ax, ay, ar, bx, by, br) {
        var dx = bx - ax, dy = by - ay;
        return dx * dx + dy * dy <= (ar + br) * (ar + br);
    }

    /** 两点欧几里得距离 */
    function dist(x1, y1, x2, y2) {
        var dx = x2 - x1, dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /** 钳制值到 [min, max] */
    function clamp(v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    /** 线性插值 */
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /** 随机整数 [lo, hi] */
    function randInt(lo, hi) {
        return Math.floor(lo + Math.random() * (hi - lo + 1));
    }

    /** 随机浮点数 [lo, hi) */
    function randFloat(lo, hi) {
        return lo + Math.random() * (hi - lo);
    }

    /** 角度转弧度 */
    function deg2rad(d) { return d * Math.PI / 180; }
    /** 弧度转角度 */
    function rad2deg(r) { return r * 180 / Math.PI; }

    /** 获取从 a 到 b 的角度 (弧度) */
    function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); };

    /** Fisher-Yates 洗牌 */
    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
    }

    /** 从数组中随机取 n 个元素 */
    function sample(arr, n) {
        var copy = arr.slice();
        return shuffle(copy).slice(0, n);
    }

    window.mathUtils = {
        circleCircle: circleCircle,
        dist: dist,
        clamp: clamp,
        lerp: lerp,
        randInt: randInt,
        randFloat: randFloat,
        deg2rad: deg2rad,
        rad2deg: rad2deg,
        angleTo: angleTo,
        shuffle: shuffle,
        sample: sample
    };
})();
