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

/* R323-P0 教学死锁修复 —— 根因与修法

   症状：新档进战斗页后卡死在引导第 2 步，「下一步」按钮永久禁用，整个游戏玩不了。

   根因（结构矛盾，不是笔误）：
     - `_showGuide()` 调 `_freezeClock()` 并且**不启动游戏循环**（running=false）
     - 而引导第 2/4 步的门控条件 `_guideGemsPicked` / `_guideHits`
       **只在 GameEngine.Loop.js 里自增**（:452 / :459）
   也就是：引导在等一个「只有游戏循环才会产生」的状态，而它自己关掉了游戏循环。
   实测：冻结=true、running=false、敌人=0、elapsed=0 —— 移动能过（按键不依赖循环），
   但击杀/拾取永远做不到。

   修法三处：
     1. 本文件：把「攻击」挪到「拾取」之前。
        原来第 2 步就要求靠击杀达成，而「攻击」到第 4 步才教 —— 顺序本身是错的。
     2. 给需要玩法的步骤加 `needsGameplay: true`，由 Guide.js 为这些步骤解冻并启动循环。
     3. Guide.js：交互式步骤加超时兜底强制推进 —— 教学卡死比偶尔跳过更糟。 */
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
            /* R324-P0 关键：这一步之前**漏了** needsGameplay，与 R323 修的
               第2步(攻击)/第4步(拾取)是同一个死锁的漏网之鱼。
               表现（用户实测截图）：一进 s3 就是一张引导卡，
               **战场全黑、玩家元素根本没被创建、主循环没启动**
               （running=false、_elapsed=0、player.el 为 null）——
               整个画面只有这张卡浮在黑底上，HUD/血条/手牌条全是空的。
               而第 1 步恰恰在教「按 WASD 移动雀士」——**没有任何东西可移动**。
               为什么没被发现：_guideMoveDirs 由 Boot.js:955 的 keydown 处理器写入，
               **不在主循环里**，所以按四下方向键判定就会通过、教程自动跳到第 2 步，
               而第 2 步有 needsGameplay 会把循环启动起来 —— 于是「表面能过」，
               但玩家一步都没动过。probe-guide 也没抓到，因为它一进去就发方向键，
               恰好把这条死锁路径跳过去了。
               加上后主循环在第 1 步就启动，玩家被创建、可移动，教程名副其实。 */
            needsGameplay: true,
            checkFn: function() {
                /* 检测玩家是否向四个方向都移动过 */
                var m = self._guideMoveDirs;
                return m && m.w && m.a && m.s && m.d;
            }
        },
        {
            highlight: null,
            dimExcept: [],
            items: [
                '<div class="guide-item">🎯 <strong>第二步：攻击</strong></div>',
                '<div class="guide-item">鼠标点击范围内妖牌触发攻击</div>',
                '<div class="guide-item">空格键在怒气满时触发 Overdrive</div>'
            ],
            interactive: true,
            /* R323-P0: 关键标记。_guideHits 只在 GameEngine.Loop.js:459 自增，
               而 _showGuide 会 _freezeClock() + 不启动循环 ——
               于是「等一次攻击」在等一个只有循环能产生的状态 = 死锁。
               标记后 _showGuideStep 会为这一步解冻并启动循环。 */
            needsGameplay: true,
            checkFn: function() {
                return (self._guideHits || 0) >= 1;
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
            highlight: '#exp-bar-container',
            dimExcept: ['#exp-bar-container'],
            items: [
                '<div class="guide-item">💰 <strong>第四步：拾取</strong></div>',
                '<div class="guide-item">击杀妖牌掉落铜筹码和经验石</div>',
                '<div class="guide-item">靠近它们自动吸附，拾取后升级</div>'
            ],
            interactive: true,
            /* R323-P0: 同上，_guideGemsPicked 只在 Loop.js:452 自增 */
            needsGameplay: true,
            checkFn: function() {
                return (self._guideGemsPicked || 0) >= 1;
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
