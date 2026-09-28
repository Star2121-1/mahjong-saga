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

/* R324-P0 重写。旧实现只遍历 #battlefield 的**直接子元素**，而所有真正要高亮的东西
   （#player / #hand-tile-bar / #exp-bar-container）都在 #world-layer 或更深处 ——
   于是 `dimExcept: ['#player']` 永远匹配不到任何直接子元素，
   **整个 #world-layer 被压到 opacity 0.15**：玩家、妖牌、全部实体一起变暗。
   用户实测截图就是「一进游戏全黑，只有一张引导卡」。
   **高亮功能从来没有生效过。**

   改成两步：
   1) 把每个 dimExcept 选择器解析成实际元素，沿 parentElement 一路向上收集
      「需要保持可见」的祖先链（#player → #world-layer → #battlefield）。
   2) 遍历直接子元素时，命中这条链的保持 opacity 1，其余才压暗。
   3) needsGameplay 的步骤额外**完全不压暗战场** —— 玩家正要在这几步里真的
      操作（移动/点妖牌/捡掉落），把要操作的东西调暗是本末倒置。 */
Gp._dimExcept = function(selectorArray, opts) {
    var self = this;
    if (!this._originalOpacities) {
        this._originalOpacities = new Map();
    }
    var battlefield = this.battlefield;
    if (!battlefield) return;
    /* 1) 收集需要保持可见的祖先链 */
    var keep = new Set();
    (selectorArray || []).forEach(function(sel) {
        var el = null;
        try { el = battlefield.querySelector(sel) || document.querySelector(sel); } catch (e) { el = null; }
        while (el && el !== document.body) { keep.add(el); el = el.parentElement; }
    });
    /* 2) 遍历直接子元素 */
    battlefield.querySelectorAll(':scope > *:not(#guide-overlay):not(#pause-overlay):not(#reward-overlay):not(#mutator-overlay):not(#victory-overlay):not(#game-over-overlay):not(#boss-hp-bar)').forEach(function(child) {
        self._originalOpacities.set(child, child.style.opacity || '1');
        if (keep.has(child)) { child.style.opacity = '1'; return; }
        /* needsGameplay 步骤：战场保持全亮，别把玩家正要操作的东西调暗 */
        if (opts && opts.keepWorldBright && child.id === 'world-layer') { child.style.opacity = '1'; return; }
        /* 0.15 太狠了：压暗是「引导视线」，不是「关掉游戏」 */
        child.style.opacity = '0.42';
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
    /* R199-P1: 清除上一步残留的自动推进计时器 */
    if (this._guideAutoAdvanceTimer) { clearTimeout(this._guideAutoAdvanceTimer); this._guideAutoAdvanceTimer = null; }
    /* R322-P2: 连 _guideCheckTimer 一起清（r311 P2-4）。
       原来只在函数后半段清 checkTimer；如果 stepIndex 越界提前走 _completeGuide，
       或 interactive 步骤提前返回，checkTimer 就会漏清 —— 教程关掉后仍在轮询。 */
    if (this._guideCheckTimer) { clearInterval(this._guideCheckTimer); this._guideCheckTimer = null; }
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
    if (step.dimExcept && step.dimExcept.length > 0) this._dimExcept(step.dimExcept, { keepWorldBright: !!step.needsGameplay });

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
                var condMet = step.checkFn.call(self);
                nextBtn.textContent = condMet ? '✓ 已完成，下一步 →' : '下一步 →';
                nextBtn.style.color = condMet ? '#4caf50' : '';
                nextBtn.disabled = !condMet; /* R199-P1: 禁用按钮直到条件满足，防止跳过引导 */
            } else {
                nextBtn.textContent = '下一步 →';
                nextBtn.style.color = '';
                nextBtn.disabled = false;
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

    /* R323-P0: 需要真实玩法的步骤必须让游戏循环跑起来。
       _showGuide 冻结时钟且不启动循环，而 _guideHits / _guideGemsPicked
       只在 Loop.js 里自增 —— 引导在等一个自己关掉的东西产生的状态 = 死锁。
       实测卡死：冻结=true running=false 敌人=0，第 2 步永远无法满足。 */
    /* R324-P0: 需要真实玩法的步骤，遮罩必须**可穿透**。
       #guide-overlay 是 `position:fixed; inset:0` + `pointer-events:auto`，
       铺满全屏且吃掉所有点击 —— 而第2步恰恰在教「鼠标点击妖牌触发攻击」，
       第1步在教「按 WASD 移动」。玩家**物理上点不到/走不动**（键盘另有守卫），
       只能等 checkFn 被别的东西满足。实测用户截图：战场被压暗到近乎全黑。
       → 这类步骤给遮罩加 .guide-playable：本体 pointer-events:none + 大幅降低遮罩浓度，
         只有 .guide-panel 保留 pointer-events:auto（上一步/下一步 按钮照常可点）。 */
    if (this.guideOverlay) this.guideOverlay.classList.toggle('guide-playable', !!step.needsGameplay);
    if (step.needsGameplay) {
        this._unfreezeClock();
        /* _beginLoop 内部有 gameOver / running / announcingWave 三重守卫，
           重复调用安全（running 为 true 时直接返回）。 */
        this._beginLoop();
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

        /* R323-P0: 防死锁兜底 —— 交互式步骤最多等 60 秒。
           教学把「下一步」按钮硬禁用（防跳过引导，R199-P1），所以一旦条件
           永远无法满足，玩家就彻底动不了。引导卡死比偶尔跳过严重得多，
           所以这里必须有兜底：超时则强制推进并留下警告日志。
           只要 needsGameplay 那条修好了，这个兜底正常情况下不会触发。 */
        if (this._guideStepTimeout) { clearTimeout(this._guideStepTimeout); this._guideStepTimeout = null; }
        this._guideStepTimeout = setTimeout(function() {
            self._guideStepTimeout = null;
            if (self._currentGuideStep !== stepIndex) return;   /* 已推进 */
            console.warn('[Guide] 步骤 ' + stepIndex + ' 等待 60s 未满足条件，强制推进以避免卡死');
            clearInterval(self._guideCheckTimer); self._guideCheckTimer = null;
            if (stepIndex < steps.length - 1) {
                self._currentGuideStep = stepIndex + 1;
                self._showGuideStep(stepIndex + 1);
            } else {
                self._completeGuide();
            }
        }, 60000);
    }
    /* R160-P0: autoAdvance 步骤无需交互，3秒后自动进入下一步，防止永久卡死 */
    else if (step.autoAdvance && stepIndex < steps.length - 1) {
        var _self2 = this;
        if (this._guideAutoAdvanceTimer) { clearTimeout(this._guideAutoAdvanceTimer); this._guideAutoAdvanceTimer = null; }
        this._guideAutoAdvanceTimer = setTimeout(function() {
            _self2._guideAutoAdvanceTimer = null;
            _self2._currentGuideStep = stepIndex + 1;
            _self2._showGuideStep(stepIndex + 1);
        }, 3000);
    }
};

/* R326-P0: 统一的引导计时器清理。
   原来只有 _completeGuide 清这三个定时器，而**死亡/胜利/返回存档页/restart/新开一局
   五个入口全都只清了 _guideCheckTimer，漏掉 _guideStepTimeout（60s）和
   _guideAutoAdvanceTimer**。具体坏法：教程第 1/2 步（needsGameplay + interactive）
   期间死亡 → 死亡界面弹出 → 60s 后旧定时器触发，守卫 `self._currentGuideStep !== stepIndex`
   因为 _gameOver 并不改这个字段而**通过** → _showGuideStep(+1) 把 #guide-overlay
   （position:fixed; inset:0）重新盖在结算界面上，**吃掉全部点击**；
   新步骤又开 60s 计时 → 死亡界面最长数分钟无响应。
   restart 变体更糟：_currentGuideStep 被重置为 0，旧 stepIndex=0 的定时器匹配成功
   → _showGuideStep(1) → 新局**凭空重播一次「第 1 波」公告 + 一次自动存档**。 */
Gp._clearGuideTimers = function() {
    if (this._guideCheckTimer) { clearInterval(this._guideCheckTimer); this._guideCheckTimer = null; }
    if (this._guideAutoAdvanceTimer) { clearTimeout(this._guideAutoAdvanceTimer); this._guideAutoAdvanceTimer = null; }
    if (this._guideStepTimeout) { clearTimeout(this._guideStepTimeout); this._guideStepTimeout = null; }
    if (this._completeGuideTimer) { clearTimeout(this._completeGuideTimer); this._completeGuideTimer = null; }
};

Gp._completeGuide = function() {
    /* R46-P2: 清除检查timer，防止guide完成后interval泄漏 */
    this._clearGuideTimers();
    this._restoreOpacity();
    this._clearHighlightTimers();
    if (this.guideOverlay) this.guideOverlay.classList.remove('active');
    this._guideDismissed = true;
    /* R310-P0: 清除guide overlay和持久化hasSeenGuide，防止死亡/结算后面板残留且引导永久重播 */
    var meta = window.saveManager && window.saveManager._metaCache;
    if (meta) {
        meta.hasSeenGuide = true;
        if (window.saveManager && typeof window.saveManager._saveMetaToStorage === 'function') {
            window.saveManager._saveMetaToStorage().catch(function(e) { console.warn('[Guide] hasSeenGuide save failed:', e); });
        }
    }
    /* R246-P0: 防止死亡/结算后取消冻结，导致CSS动画异常 — 仅在此处检查是否继续循环 */
    if (this.gameOver) return;
    /* 延迟启动游戏循环 */
    var self = this;
    this._completeGuideTimer = setTimeout(function() {
        /* R117-P0: guide 关闭后恢复时钟再开始循环 */
        self._unfreezeClock();
        /* R230-P1: 引导完成后首次波次公告，与 _startNewRun 非引导路径保持一致 */
        if (!self.gameOver && !self._pendingReward && self._waveCount === 0) {
            self._announceWave(0);
        } else {
            self._beginLoop();
        }
    }, 500);
};

Gp._clearHighlightTimers = function() {
    if (this._highlightTimers) {
        this._highlightTimers.forEach(function(t) { clearTimeout(t); });
        this._highlightTimers = [];
    }
};

})();
