/**
 * DOM 工具 — 快捷查询、classList 操作、元素创建
 * 供 core/ 和 page/ 共享
 */
(function() {
    'use strict';

    /** 快捷查询单个元素 */
    function $(sel, parent) {
        return (parent || document).querySelector(sel);
    }

    /** 快捷查询所有元素 */
    function $$(sel, parent) {
        return Array.from((parent || document).querySelectorAll(sel));
    }

    /** 按 ID 查询 */
    var functionById = function(id) { return document.getElementById(id); };

    /** 安全获取元素，不存在则返回 null */
    function safeById(id) {
        var el = document.getElementById(id);
        if (!el) console.warn('[DOM] Missing element:', id);
        return el;
    }

    /** 切换 class */
    function toggleClass(el, cls, force) {
        if (force === undefined) force = !el.classList.contains(cls);
        el.classList.toggle(cls, force);
        return force;
    }

    /** 添加 class */
    function addClass(el, cls) { el.classList.add(cls); }

    /** 移除 class */
    function removeClass(el, cls) { el.classList.remove(cls); }

    /** 设置/获取 CSS 变量 */
    function setCssVar(el, name, value) {
        el.style.setProperty('--' + name, value);
    }
    function getCssVar(el, name) {
        return getComputedStyle(el).getPropertyValue('--' + name).trim();
    }

    /** 创建元素 */
    function createElement(tag, className, parent) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (parent) parent.appendChild(el);
        return el;
    }

    /** 安全移除元素 */
    function removeElement(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    /** 清空子元素 */
    function emptyElement(el) {
        while (el.firstChild) el.removeChild(el.firstChild);
    }

    /** 查找最近的匹配祖先 */
    function closest(el, sel) {
        return el ? el.closest(sel) : null;
    }

    window.domUtils = {
        $: $,
        $$: $$,
        byId: safeById,
        toggleClass: toggleClass,
        addClass: addClass,
        removeClass: removeClass,
        setCssVar: setCssVar,
        getCssVar: getCssVar,
        createEl: createElement,
        removeEl: removeElement,
        empty: emptyElement,
        closest: closest
    };
})();
