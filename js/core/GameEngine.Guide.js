(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

/* ══════════════════════════════════════════════
   Epoch 1 — 引导增强：动态高亮 + 手牌交付状态机
   ══════════════════════════════════════════════ */

Gp._highlightElement = function(selector, duration) {
    var el = document.querySelector(selector);
    if (!el) return null;
    el.classList.add('context-highlight');
    var self = this;
    var timer = setTimeout(function() {
        el.classList.remove('context-highlight');
        self._highlightTimers = (self._highlightTimers || []).filter(function(t) { return t !== timer; });
    }, duration || 3000);
    if (!this._highlightTimers) this._highlightTimers = [];
    this._highlightTimers.push(timer);
    return el;
};

Gp._dimExcept = function(selectorArray) {
    var self = this;
    if (!this._originalOpacities) {
        this._originalOpacities = new Map();
    }
    var battlefield = this.battlefield;
    if (!battlefield) return;
    battlefield.querySelectorAll(':scope > *:not(#guide-overlay):not(#pause-overlay):not(#reward-overlay):not(#mutator-overlay):not(#victory-overlay):not(#game-over-overlay):not(#boss-hp-bar)').forEach(function(child) {
        var id = child.id || (child.className || "").baseVal || child.className || "";
        if (selectorArray.some(function(s) { return child.matches(s); })) {
            self._originalOpacities.set(child, child.style.opacity || '1');
            child.style.opacity = '1';
        } else {
            self._originalOpacities.set(child, child.style.opacity || '1');
            child.style.opacity = '0.15';
        }
    });
};

Gp._restoreOpacity = function() {
    if (!this._originalOpacities) return;
    this._originalOpacities.forEach(function(val, el) {
        if (el && el.parentNode) el.style.opacity = val;
    });
    this._originalOpacities.clear();
};

Gp._showGuideStep = function(stepIndex) {
    if (!this.guideOverlay) return;
    var steps = this._guideSteps || [];
    if (stepIndex >= steps.length) {
        this._completeGuide();
        return;
    }
    /* 清除上一步的 dim/highlight 效果 */
    this._restoreOpacity();
    this._clearHighlightTimers();

    var step = steps[stepIndex];
    if (step.highlight) this._highlightElement(step.highlight, 4000);
    if (step.dimExcept && step.dimExcept.length > 0) this._dimExcept(step.dimExcept);

    /* 更新引导面板内容 */
    var body = this.guideOverlay.querySelector('.guide-body');
    if (body) {
        body.innerHTML = '';
        step.items.forEach(function(item) {
            var div = document.createElement('div');
            div.className = 'guide-item';
            div.innerHTML = item;
            body.appendChild(div);
        });
    }

    /* 更新导航按钮状态 */
    var prevBtn = this.guideOverlay.querySelector('#guide-prev-btn');
    var nextBtn = this.guideOverlay.querySelector('#guide-next-btn');
    if (prevBtn) prevBtn.disabled = (stepIndex <= 0);
    if (nextBtn) {
        if (stepIndex >= steps.length - 1) {
            nextBtn.textContent = '完成出征 ✓';
        } else {
            /* 交互式步骤：检查条件 */
            if (step.interactive && step.checkFn) {
                nextBtn.textContent = '✓ 已完成，下一步 →';
                nextBtn.style.color = '#4caf50';
            } else {
                nextBtn.textContent = '下一步 →';
                nextBtn.style.color = '';
            }
        }
    }

    /* Epoch 43: 步骤点指示器 */
    var dotsContainer = this.guideOverlay.querySelector('.guide-steps-dots');
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        for (var _di = 0; _di < steps.length; _di++) {
            var dot = document.createElement('span');
            dot.className = 'guide-dot';
            if (_di === stepIndex) dot.classList.add('active');
            else if (_di < stepIndex) dot.classList.add('done');
            dotsContainer.appendChild(dot);
        }
    }

    /* Epoch 43: 交互式步骤 — 自动推进 */
    if (step.interactive && step.checkFn) {
        /* R32-G-001: 先清除旧timer，防止多timer并行 */
        if (this._guideCheckTimer) { clearInterval(this._guideCheckTimer); this._guideCheckTimer = null; }
        var self = this;
        this._guideCheckTimer = setInterval(function() {
            if (step.checkFn.call(self)) {
                clearInterval(self._guideCheckTimer);   /* R32-G-002: 用self而非this，防止this绑定为window */
                self._guideCheckTimer = null;
                /* 自动前进到下一步 */
                if (stepIndex < steps.length - 1) {
                    self._currentGuideStep = stepIndex + 1;
                    self._showGuideStep(stepIndex + 1);
                }
            }
        }, 300);
    }
    /* R160-P0: autoAdvance 步骤无需交互，3秒后自动进入下一步，防止永久卡死 */
    else if (step.autoAdvance && stepIndex < steps.length - 1) {
        var _self2 = this;
        setTimeout(function() {
            _self2._currentGuideStep = stepIndex + 1;
            _self2._showGuideStep(stepIndex + 1);
        }, 3000);
    }
};

Gp._completeGuide = function() {
    /* R46-P2: 清除检查timer，防止guide完成后interval泄漏 */
    if (this._guideCheckTimer) { clearInterval(this._guideCheckTimer); this._guideCheckTimer = null; }
    this._restoreOpacity();
    this._clearHighlightTimers();
    this.guideOverlay.classList.remove('active');
    this._guideDismissed = true;
    var meta = window.saveManager && window.saveManager._metaCache;
    if (meta) {
        meta.hasSeenGuide = true;
        if (window.saveManager) window.saveManager._saveMetaToStorage();
    }
    /* 延迟启动游戏循环 */
    var self = this;
    this._completeGuideTimer = setTimeout(function() {
        /* R117-P0: guide 关闭后恢复时钟再开始循环 */
        self._unfreezeClock();
        self._beginLoop();
    }, 500);
};

Gp._clearHighlightTimers = function() {
    if (this._highlightTimers) {
        this._highlightTimers.forEach(function(t) { clearTimeout(t); });
        this._highlightTimers = [];
    }
};

})();
