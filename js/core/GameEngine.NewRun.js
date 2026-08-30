/**
 * GameEngine.NewRun — 天命手牌/雀牌渲染/引导定义
 */
(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

/* 以下 4 个方法已被 GameEngine.Combat.js 覆盖（后者加载顺序在后） */
/* Gp._initHandTiles / _placeHandTile / _clearHandTile / _renderPlayerTile — 保留在 NewRun.js 作为文档参考，实际使用 Combat.js 版本 */

/* DEPRECATED: _deliverHandTile / _saveHandState / _restoreHandState 已在R12移除对外调用，保留此注释防止重复添加 */
/* 手牌槽管理已由 GameEngine.Combat.js _initHandTiles / _placeHandTile 接管 */
Gp._deliverHandTile = function(tileData) {
    /* tileData: { text, cssClass, slotIndex } */
    var self = this;
    /* 找到第一个空槽位 */
    var slotIdx = -1;
    for (var i = 0; i < 14; i++) {
        if (this._handTileSlots && this._handTileSlots[i] && !this._handTileSlots[i].classList.contains('occupied')) {
            slotIdx = i;
            break;
        }
    }
    if (slotIdx === -1) return; /* 手牌槽已满 */
    /* 飞入动画 */
    var slot = this._handTileSlots[slotIdx];
    slot.classList.add('occupied', 'tile-delivering');
    var tileBody = document.createElement('div');
    tileBody.className = 'tile-body ' + (tileData.cssClass || '');
    tileBody.textContent = tileData.text;
    tileBody.style.opacity = '0';
    tileBody.style.transform = 'translate3d(0,-30px,0) scale(0.5)';
    slot.appendChild(tileBody);
    /* 交付音效反馈 */
    if (window.fxManager) {
        window.fxManager.spawnText(this.player.x, this.player.y - 40, '摸牌!', 'normal');
    }
    /* 动画过渡 */
    var animTimer = setTimeout(function() {
        tileBody.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
        tileBody.style.opacity = '1';
        tileBody.style.transform = 'translate3d(0,0,0) scale(1)';
        slot.classList.remove('tile-delivering');
        /* 自动保存手牌状态 */
        self._saveHandState();
    }, 100);
    this._handTileDeliverTimers = this._handTileDeliverTimers || [];
    this._handTileDeliverTimers.push(animTimer);
};

/* DEPRECATED: 已在R12移除，保留此注释防止重复添加 */
Gp._saveHandState = function() {
    if (!this._handTileSlots) return;
    var meta = window.saveManager._metaCache || {};
    meta.handTiles = meta.handTiles || [];
    meta.handTiles.length = 0;
    for (var i = 0; i < this._handTileSlots.length; i++) {
        var slot = this._handTileSlots[i];
        if (slot.classList.contains('occupied')) {
            var body = slot.querySelector('.tile-body');
            if (body) {
                /* 提取 tile-body 之后的所有类名 */
                var classes = '';
                for (var j = 0; j < body.classList.length; j++) {
                    if (body.classList[j] !== 'tile-body') {
                        classes += (classes ? ' ' : '') + body.classList[j];
                    }
                }
                meta.handTiles.push({
                    index: i,
                    text: body.textContent,
                    classes: classes
                });
            }
        }
    }
    window.saveManager._saveMetaToStorage();
};

/* DEPRECATED: 已在R12移除，保留此注释防止重复添加 */
Gp._restoreHandState = function() {
    if (!this._handTileSlots) return;
    var meta = window.saveManager._metaCache || {};
    var tiles = meta.handTiles || [];
    tiles.forEach(function(t) {
        if (t.index < this._handTileSlots.length) {
            var slot = this._handTileSlots[t.index];
            slot.classList.add('occupied');
            var body = document.createElement('div');
            body.className = 'tile-body ' + (t.classes || '');
            body.textContent = t.text;
            slot.appendChild(body);
        }
    }.bind(this));
};

Gp._defineGuideSteps = function() {
    var self = this;
    this._guideSteps = [
        {
            highlight: '#guide-overlay',
            dimExcept: [],
            items: [
                '<div class="guide-item">欢迎来到麻将江湖 — 雀牌冒险开始</div>',
                '<div class="guide-item">你是最后一张骨雕麻将牌——<strong>「雀」</strong></div>',
                '<div class="guide-item">准备好出征了吗？点击"开始练习" →</div>'
            ],
            interactive: false,
            autoAdvance: true
        },
        {
            highlight: '#player',
            dimExcept: ['#player'],
            items: [
                '<div class="guide-item">🏃 <strong>第一步：移动</strong></div>',
                '<div class="guide-item">按 <span class="guide-key">W</span><span class="guide-key">A</span><span class="guide-key">S</span><span class="guide-key">D</span> 或方向键移动雀士</div>',
                '<div class="guide-item">向四个方向各移动一次 → 完成！</div>'
            ],
            interactive: true,
            checkFn: function() {
                /* 检测玩家是否向四个方向都移动过 */
                var m = self._guideMoveDirs;
                return m && m.w && m.a && m.s && m.d;
            }
        },
        {
            highlight: '#exp-bar-container',
            dimExcept: ['#exp-bar-container'],
            items: [
                '<div class="guide-item">💰 <strong>第二步：拾取</strong></div>',
                '<div class="guide-item">击杀妖牌掉落铜筹码和经验石</div>',
                '<div class="guide-item">靠近它们自动吸附，拾取后升级</div>'
            ],
            interactive: true,
            checkFn: function() {
                return (self._guideGemsPicked || 0) >= 1;
            }
        },
        {
            highlight: '#hand-tile-bar',
            dimExcept: ['#hand-tile-bar'],
            items: [
                '<div class="guide-item">⚔ <strong>第三步：升级</strong></div>',
                '<div class="guide-item">升级时弹出三张天命麻将牌，选择一张</div>',
                '<div class="guide-item">底部 14 格为天命手牌槽</div>',
                '<div class="guide-item">凑齐顺子/刻子激活组合技能</div>'
            ],
            interactive: false,
            autoAdvance: true
        },
        {
            highlight: null,
            dimExcept: [],
            items: [
                '<div class="guide-item">🎯 <strong>第四步：攻击</strong></div>',
                '<div class="guide-item">鼠标点击范围内妖牌触发攻击</div>',
                '<div class="guide-item">空格键在怒气满时触发 Overdrive</div>'
            ],
            interactive: true,
            checkFn: function() {
                return (self._guideHits || 0) >= 1;
            }
        },
        {
            highlight: '#guide-overlay',
            dimExcept: [],
            items: [
                '<div class="guide-item">🀄 出征吧，雀士！</div>',
                '<div class="guide-item">击杀妖牌，升级手牌，胡牌过关</div>',
                '<div class="guide-item">祝你好运！</div>'
            ],
            interactive: false,
            autoAdvance: true
        }
    ];
};

})();
