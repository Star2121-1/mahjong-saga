/**
 * GameEngine.NewRun — 天命手牌/雀牌渲染/引导定义
 */
(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

Gp._initHandTiles = function() {
    if (!this._handTileGrid) return;
    this._handTileGrid.innerHTML = '';
    this._handTileSlots = [];
    for (var i = 0; i < 14; i++) {
        var slot = document.createElement('div');
        slot.className = 'hand-tile-slot';
        slot.dataset.index = i;
        this._handTileGrid.appendChild(slot);
        this._handTileSlots.push(slot);
    }
    if (this._handTileBar) this._handTileBar.classList.add('active');
};

Gp._placeHandTile = function(index, tileText, tileClass) {
    if (!this._handTileSlots[index]) return;
    var slot = this._handTileSlots[index];
    slot.classList.add('occupied');
    slot.innerHTML = '<div class="tile-body ' + (tileClass || '') + '">' + tileText + '</div>';
};

Gp._clearHandTile = function(index) {
    if (!this._handTileSlots[index]) return;
    this._handTileSlots[index].classList.remove('occupied');
    this._handTileSlots[index].innerHTML = '';
};

Gp._renderPlayerTile = function() {
    if (!this.playerEl) return;
    /* 雀牌 — 骨雕麻将质感 */
    this.playerEl.style.width = '48px';
    this.playerEl.style.height = '64px';
    this.playerEl.style.background = '#fbfbf7';
    this.playerEl.style.borderRadius = '6px';
    this.playerEl.style.boxShadow = '0 4px 0 #1a5336, 0 6px 0.5px #dfc590, 0 8px 10px rgba(0,0,0,0.5)';
    this.playerEl.style.display = 'flex';
    this.playerEl.style.alignItems = 'center';
    this.playerEl.style.justifyContent = 'center';
    this.playerEl.style.fontSize = '24px';
    this.playerEl.style.fontWeight = '900';
    this.playerEl.style.color = '#b62929';
    this.playerEl.style.textShadow = '0 0 8px rgba(182,41,41,0.6)';
    /* 不要用 textContent 覆盖子元素 — 用 ::before 伪元素显示"雀"字 */
    this.playerEl.style.setProperty('--tile-char', '"雀"');
};

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
    this._guideSteps = [
        {
            highlight: '#guide-overlay',
            dimExcept: ['#guide-overlay'],
            items: [
                '<div class="guide-item"><span class="guide-key">WASD</span> / 方向键 移动雀士</div>',
                '<div class="guide-item"><span class="guide-key">鼠标点击</span> 攻击范围内妖牌</div>',
                '<div class="guide-item"><span class="guide-key">空格</span> 怒气满时触发 Overdrive 役满暴走</div>',
                '<div class="guide-item"><span class="guide-key">Esc</span> / 暂停 暂停游戏</div>',
                '<div class="guide-item">击杀妖牌掉落 <strong>铜筹码</strong> 和 <strong>经验石</strong></div>',
                '<div class="guide-item">升级时弹出三张天命麻将牌，选择一张收入底部手牌槽</div>',
                '<div class="guide-item">凑齐顺子/刻子激活强力技能，胡牌进入 Overdrive</div>'
            ]
        },
        {
            highlight: '#player',
            dimExcept: ['#player'],
            items: [
                '<div class="guide-item">你是最后一张骨雕麻将牌——<strong>「雀」</strong></div>',
                '<div class="guide-item">羊脂玉牌面，祖母绿侧边厚度，竹骨黄夹层</div>',
                '<div class="guide-item">朱砂红「雀」字在牌面正中闪烁</div>',
                '<div class="guide-item">移动躲避妖牌，点击攻击消灭它们</div>'
            ]
        },
        {
            highlight: '#exp-bar-container',
            dimExcept: ['#exp-bar-container'],
            items: [
                '<div class="guide-item">拾取铜筹码和经验石提升等级</div>',
                '<div class="guide-item">经验条满后弹出三张天命牌</div>',
                '<div class="guide-item">选择一张收入底部 14 格手牌槽</div>'
            ]
        },
        {
            highlight: '#hand-tile-bar',
            dimExcept: ['#hand-tile-bar'],
            items: [
                '<div class="guide-item">底部 14 格为天命手牌槽</div>',
                '<div class="guide-item">筒子牌（孔雀蓝）：弹跳飞环</div>',
                '<div class="guide-item">条子牌（竹翠青）：直线剑气</div>',
                '<div class="guide-item">万字牌（朱砂红）：范围爆裂</div>',
                '<div class="guide-item">凑齐顺子 / 刻子激活组合技能</div>'
            ]
        }
    ];
};

})();
