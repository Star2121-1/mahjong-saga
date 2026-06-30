/**
 * 格式化工具 — 时间、数字
 */
(function() {
    'use strict';

    /** 格式化秒数为 mm:ss */
    function formatSeconds(sec) {
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    /** 格式化毫秒为 mm:ss.ms */
    function formatMs(ms) {
        var totalSec = ms / 1000;
        return formatSeconds(totalSec);
    }

    /** 格式化大数字（1000→1K, 1000000→1M） */
    function formatNum(n) {
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
        return String(n);
    }

    /** 截断字符串到最大长度 */
    function truncate(str, maxLen) {
        if (!str) return '';
        return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
    }

    window.formatUtils = {
        formatSeconds: formatSeconds,
        formatMs: formatMs,
        formatNum: formatNum,
        truncate: truncate
    };
})();
