class RewardManager {
    constructor() {
        this.baseRelics = [
            { id: 'sharp_edge', name: '锐利锋芒', desc: '攻击力 +3', cost: 15 },
            { id: 'golden_finger', name: '黄金右手指', desc: '暴击率 +15%', cost: 25 },
            { id: 'auto_drone', name: '自动化随从', desc: '无人机攻击最近敌人', cost: 40 },
            { id: 'thorn_armor', name: '荆棘反伤甲', desc: '最大HP+20，反伤+10%', cost: 30 },
            { id: 'wind_walker', name: '疾风步', desc: '移动速度 +12%', cost: 20 },
            { id: 'vamp_ring', name: '吮血指环', desc: '点击伤害 8% 吸血', cost: 35 },
            { id: 'explosive_core', name: '爆破核心', desc: '15% 几率 50% 范围溅射', cost: 30 },
            { id: 'frost_core', name: '冰霜核心', desc: '10% 几率冰冻 1.5s', cost: 25 },
            { id: 'gravity_core', name: '引力核心', desc: '经验吸附范围 +40px', cost: 20 },
            { id: 'weapon_amplify', name: '兵器增幅', desc: '攻击力+3，所有武器攻倍率+20%且冷却-5%', cost: 35 }
        ];

        this.legendaries = [
            { id: 'evolved_drone', name: '传说超武·歼灭者浮游炮', desc: '无人机攻速狂暴提升至0.2s，一次齐射3个目标且伤害翻倍！', cost: 0 },
            { id: 'evolved_armor', name: '传说超武·太阳神巨像铠', desc: '反伤提升至100%，且反伤完美继承暴击，震碎全场！', cost: 0 },
            { id: 'evolved_speed', name: '传说超武·凌波微步', desc: '30% 闪避率 + 永久 30% 移速加成！', cost: 0 },
            { id: 'evolved_vamp', name: '传说超武·血魔之拥', desc: '反伤伤害亦触发吸血，双重续航！', cost: 0 }
        ];

        this.weaponInfos = {
            TrackingBlade: { name: '追踪飞刃', desc: '自动追踪最近敌人，穿透+3，远程切割', color: '#ff8f00' },
            OrbitShield: { name: '环形护体', desc: '3 枚光星 120° 公转，持续摩擦伤害', color: '#2962ff' },
            ShotgunBurst: { name: '扇形散射', desc: '点击发射 5 发散弹，近距叠吃多段', color: '#ff6d00' },
            GroundSlammer: { name: '区域震荡', desc: '4s 冷却大范围震波扩散 + 击退', color: '#ffc107' },
            LaserBeam: { name: '持续线杀', desc: '300px 激光高频融化，朝鼠标方向', color: '#ff1744' },
            NovaPulse: { name: '全屏脉冲', desc: '7s 蓄力全屏清场蒸发级伤害', color: '#d50000' }
        };

        this.overlay = document.getElementById('reward-overlay');
        this.cardsContainer = this.overlay.querySelector('.reward-cards');
        this._replaceWeaponId = null;

        /* ── 牺牲选项池 ── */
        this.sacrificeOptions = [
            { id: 'sacrifice_metatoken', name: '献祭之祭坛', icon: '🔥', desc: '献祭一个圣物，获得 3 元代币', type: 'metatoken', value: 3 },
            { id: 'sacrifice_gold', name: '贪婪契约', icon: '💎', desc: '献祭一个圣物，获得当前等级 50% 的元宝', type: 'gold', value: 0.5 },
            { id: 'sacrifice_temp_atk', name: '血怒仪式', icon: '⚡', desc: '献祭一个圣物，获得 +50% 攻击力临时增益（30秒）', type: 'temp_buff', buff: 'atkBoost', duration: 30, value: 0.5 },
            { id: 'sacrifice_temp_hp', name: '铁壁祷言', icon: '🛡', desc: '献祭一个圣物，获得 +100 最大HP临时增益（30秒）', type: 'temp_buff', buff: 'tempHp', duration: 30, value: 100 },
            { id: 'sacrifice_double_coin', name: '双倍诅咒', icon: '🪙', desc: '献祭一个圣物，下一波金币收益翻倍', type: 'double_coin', value: 1 }
        ];
    }

    /* ── 波次宝箱 ── */

    showRewardPanel() {
        var pool = this._buildPool();
        var selected = pool.length > 0 ? this._pickFrom(pool) : [];
        this._renderCards(selected, false);
    }

    /* ── 升级三选一 ── */

    showLevelUpPanel() {
        if (this._panelLocked) return;
        this._panelLocked = true;
        this.overlay.classList.add('levelup-mode');
        var titleEl = this.overlay.querySelector('.reward-title');
        var originalTitle = titleEl ? titleEl.textContent : '';
        if (titleEl) titleEl.textContent = '升级奖励（免费）';
        var pool = this._buildPool();
        var selected = pool.length > 0 ? this._pickFrom(pool) : [];
        /* 牺牲选项 — 仅升级时出现 */
        var sacrificeItem = this._buildSacrificeOption();
        if (sacrificeItem) selected.push(sacrificeItem);
        this._renderCards(selected, true, titleEl, originalTitle);
    }

    hidePanel() {
        this._panelLocked = false;
        this.overlay.classList.remove('active');
        this.overlay.classList.remove('levelup-mode');
        var replaceEl = document.getElementById('replace-panel');
        if (replaceEl) replaceEl.remove();
    }

    /* ── 渲染卡牌 ── */

    _renderCards(selected, isFree, titleEl, originalTitle) {
        var self = this;
        this.cardsContainer.innerHTML = '';
        if (selected.length === 0) {
            this.cardsContainer.innerHTML = '<div style="color:#888;padding:20px;">无可用选项</div><button class="relic-btn" style="margin-top:12px;" id="relic-skip-btn">继续</button>';
            this.overlay.classList.add('active');
            var skipBtn = document.getElementById('relic-skip-btn');
            skipBtn.addEventListener('click', function() {
                if (titleEl) titleEl.textContent = originalTitle;
                if (isFree) gameEngine._resumeAfterLevelUp();
                else gameEngine._resumeAfterReward();
            }, { once: true });
            return;
        }

        var eng = window.gameEngine;
        var currentWeaponIds = {};
        if (eng && eng._activeWeapons) {
            for (var cwi = 0; cwi < eng._activeWeapons.length; cwi++) currentWeaponIds[eng._activeWeapons[cwi].id] = true;
        }

        for (var si = 0; si < selected.length; si++) {
            var item = selected[si];
            var type = item.type;
            var isWeaponNew = type === 'weapon_new';
            var isWeaponUp  = type === 'weapon_up';
            var isRelic     = type === 'relic';
            var isLegendary = isRelic && item.cardData && item.cardData.cost === 0;
            var quality = isLegendary ? 'legendary' : isWeaponNew ? 'epic' : isWeaponUp ? 'rare' : 'rare';
            var cardData = item.cardData || {};
            var color = cardData.color || (type === 'relic' ? '#ffd700' : '#4fc3f7');

            var container = document.createElement('div');
            container.className = 'reward-card-container';
            container.style.animationDelay = (si * 0.12) + 's';

            var inner = document.createElement('div');
            inner.className = 'reward-card-inner';

            /* ── 背面 ── */
            var back = document.createElement('div');
            back.className = 'card-back';
            back.innerHTML = '<div class="card-back-glyph"></div><div class="card-back-text">✦</div>';

            /* ── 正面 ── */
            var front = document.createElement('div');
            front.className = 'card-front quality-' + quality;
            if (isLegendary) front.classList.add('legendary-card');

            if (isWeaponNew) {
                front.innerHTML =
                    '<div class="relic-name" style="color:' + color + '">⚔ ' + item.name + '</div>' +
                    '<div class="relic-desc">' + item.desc + '</div>' +
                    '<div class="relic-cost" style="color:#00e676">🎁 新武器</div>' +
                    '<div class="new-weapon-banner"><span>NEW WEAPON UNLOCKED!</span></div>' +
                    '<button class="relic-btn">装备</button>';
                (function(cardItem, mgr, cardContainer) {
                    front.querySelector('.relic-btn').addEventListener('click', function() {
                        mgr._animateSuckIn(cardContainer, function() {
                            mgr._onWeaponNewClick(cardItem, isFree, titleEl, originalTitle);
                        });
                    });
                })(item, self, container);
            } else if (isWeaponUp) {
                front.innerHTML =
                    '<div class="relic-name" style="color:' + color + '">⬆ ' + item.name + '</div>' +
                    '<div class="relic-desc">' + item.desc + '</div>' +
                    '<div class="relic-cost" style="color:#69f0ae">🔧 升阶</div>' +
                    '<button class="relic-btn">升级</button>';
                (function(cardItem, mgr, cardContainer) {
                    front.querySelector('.relic-btn').addEventListener('click', function() {
                        mgr._animateSuckIn(cardContainer, function() {
                            mgr._onWeaponUpClick(cardItem, isFree, titleEl, originalTitle);
                        });
                    });
                })(item, self, container);
            } else if (type === 'sacrifice') {
                var opt = cardData;
                front.innerHTML =
                    '<div class="relic-name" style="color:#ff4444">' + opt.icon + ' ' + opt.name + '</div>' +
                    '<div class="relic-desc">' + opt.desc + '</div>' +
                    '<div class="relic-cost" style="color:#ff6600">⚠ 献祭一个圣物</div>' +
                    '<div class="sacrifice-banner"><span>RISKY TRADE</span></div>' +
                    '<button class="relic-btn" style="background:#cc2200">献祭</button>';
                (function(cardItem, mgr, cardContainer) {
                    front.querySelector('.relic-btn').addEventListener('click', function() {
                        mgr._animateSuckIn(cardContainer, function() {
                            mgr._onSacrificeClick(cardItem, titleEl, originalTitle);
                        });
                    });
                })(item, self, container);
            } else {
                var relic = cardData;
                var player = gameEngine.player;
                var currentLevel = player.relicLevels[relic.id] || 0;
                var starsStr = this._renderStars(currentLevel);
                var canAfford = relic.cost === 0 || player.gold >= relic.cost;
                var descHtml = isLegendary ? relic.desc : relic.desc + '<br>(Lv.' + currentLevel + ' → Lv.' + (currentLevel + 1) + ')';
                var costHtml = isLegendary ? '🔱 传说进化' : '💰 ' + relic.cost;
                var btnText = isLegendary ? '进化！' : '选择';
                front.innerHTML =
                    '<div class="relic-name">' + relic.name + '</div>' +
                    '<div class="relic-stars">' + starsStr + '</div>' +
                    '<div class="relic-desc">' + descHtml + '</div>' +
                    '<div class="relic-cost">' + costHtml + '</div>' +
                    '<button class="relic-btn' + (isLegendary ? ' legendary-btn' : '') + '"' + (canAfford ? '' : ' disabled') + '>' + btnText + '</button>';
                (function(cardItem, mgr, cardContainer) {
                    front.querySelector('.relic-btn').addEventListener('click', function() {
                        var r = cardItem.cardData;
                        if (r.cost > 0 && gameEngine.player.gold < r.cost) return;
                        mgr._animateSuckIn(cardContainer, function() {
                            mgr._selectReward(cardItem, isFree, titleEl, originalTitle);
                        });
                    });
                })(item, self, container);
            }

            inner.appendChild(back);
            inner.appendChild(front);
            container.appendChild(inner);
            this.cardsContainer.appendChild(container);
        }

        this.overlay.classList.add('active');

        /* ── 出场发牌动画后延时翻转 ── */
        var cards = this.cardsContainer.querySelectorAll('.reward-card-container');
        setTimeout(function() {
            for (var fi = 0; fi < cards.length; fi++) {
                (function(idx) {
                    setTimeout(function() {
                        if (cards[idx]) cards[idx].querySelector('.reward-card-inner').classList.add('flipped');
                    }, idx * 180);
                })(fi);
            }
        }, 150);
    }

    _animateSuckIn(cardEl, callback) {
        if (!cardEl) { if (callback) callback(); return; }
        var self = this;
        self.overlay.classList.remove('active');
        self.overlay.classList.remove('levelup-mode');
        self._panelLocked = false;
        var rect = cardEl.getBoundingClientRect();
        var slotBar = document.getElementById('weapon-slot-bar');
        var targetRect = slotBar ? slotBar.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight - 40 };

        var clone = cardEl.cloneNode(true);
        clone.className = 'reward-card-container suckin-clone';
        clone.style.cssText =
            'position:fixed;z-index:9999;pointer-events:none;' +
            'left:' + rect.left + 'px;top:' + rect.top + 'px;' +
            'width:' + rect.width + 'px;height:' + rect.height + 'px;' +
            'margin:0;padding:0;border-radius:14px;' +
            'box-shadow:0 0 40px rgba(255,215,0,0.8),0 0 80px rgba(255,215,0,0.4);' +
            'transition:all 0.45s cubic-bezier(0.25,0.46,0.45,0.94);' +
            'animation:none !important;';
        var inner = clone.querySelector('.reward-card-inner');
        if (inner) {
            inner.style.cssText = 'position:relative;width:100%;height:100%;transform-style:preserve-3d;transform:rotateY(180deg);animation:none !important;';
            var back = clone.querySelector('.card-back');
            if (back) back.style.display = 'none';
        }
        document.body.appendChild(clone);
        cardEl.style.opacity = '0';

        requestAnimationFrame(function() {
            clone.style.transform = 'translate(' + (targetRect.left + targetRect.width/2 - rect.left - rect.width/2) + 'px,' + (targetRect.top - rect.top) + 'px) scale(0.15)';
            clone.style.opacity = '0.2';
            clone.style.filter = 'blur(2px) brightness(1.4)';
        });

        setTimeout(function() {
            if (clone.parentNode) clone.remove();
            if (slotBar) {
                slotBar.classList.add('slot-ripple');
                setTimeout(function() { slotBar.classList.remove('slot-ripple'); }, 500);
            }
            if (callback) callback();
        }, 460);
    }

    /* ── 点击新武器解锁卡 ── */

    _onWeaponNewClick(item, isFree, titleEl, originalTitle) {
        var eng = window.gameEngine;
        if (eng._activeWeapons.length < eng.player.maxWeaponSlots) {
            eng._addWeapon(item.id);
            /* Epoch 32: 图鉴记录武器 */
            if (window.saveManager) window.saveManager.recordCompendiumEntry('weapons', item.id);
        } else {
            this._showReplacePanel(item.id);
            return;
        }
        if (titleEl) titleEl.textContent = originalTitle;
        eng._syncUI();
        if (isFree) eng._resumeAfterLevelUp();
        else eng._resumeAfterReward();
    }

    /* ── 点击神兵进阶卡 ── */

    _onWeaponUpClick(item, isFree, titleEl, originalTitle) {
        var eng = window.gameEngine;
        for (var i = 0; i < eng._activeWeapons.length; i++) {
            if (eng._activeWeapons[i].id === item.id) {
                eng._upgradeWeapon(i);
                break;
            }
        }
        if (titleEl) titleEl.textContent = originalTitle;
        eng._syncUI();
        if (isFree) eng._resumeAfterLevelUp();
        else eng._resumeAfterReward();
    }

    /* ── 圣物选择（原版 _selectReward） ── */

    _selectReward(item, isFree, titleEl, originalTitle) {
        var player = gameEngine.player;
        var relic = item.cardData;
        if (!isFree && relic.cost > 0 && player.gold < relic.cost) return;
        if (!isFree && relic.cost > 0) player.addGold(-relic.cost);
        player.addRelic(relic.id);
        /* Epoch 32: 图鉴记录 */
        if (window.saveManager) window.saveManager.recordCompendiumEntry('relics', relic.id);
        if (titleEl) titleEl.textContent = originalTitle;
        gameEngine._syncUI();
        if (isFree) gameEngine._resumeAfterLevelUp();
        else gameEngine._resumeAfterReward();
        if (this.onPurchase) this.onPurchase();
    }

    /* ── 满载置换面板 ── */

    _showReplacePanel(newWeaponId) {
        var self = this;
        this._replaceWeaponId = newWeaponId;
        this.cardsContainer.innerHTML = '';
        var eng = window.gameEngine;

        var panel = document.createElement('div');
        panel.id = 'replace-panel';
        panel.innerHTML =
            '<div class="replace-title">⚔ 神兵槽位已满</div>' +
            '<div class="replace-subtitle">请选择一把旧武器进行熔炼置换</div>' +
            '<div class="replace-grid" id="replace-grid"></div>';

        this.cardsContainer.appendChild(panel);
        var grid = document.getElementById('replace-grid');

        for (var i = 0; i < eng._activeWeapons.length; i++) {
            var w = eng._activeWeapons[i];
            var info = this.weaponInfos[w.id] || { name: w.id, desc: '', color: '#888' };
            var itemEl = document.createElement('div');
            itemEl.className = 'replace-item';
            itemEl.dataset.index = i;
            itemEl.innerHTML =
                '<div class="replace-item-icon" style="background:' + info.color + '"></div>' +
                '<div class="replace-item-name">' + info.name + '</div>' +
                '<div class="replace-item-level">Lv.' + w.level + '</div>';
            (function(idx, mgr) {
                itemEl.addEventListener('click', function() { mgr._doReplace(idx); });
            })(i, self);
            grid.appendChild(itemEl);
        }

        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'relic-btn';
        cancelBtn.textContent = '取消';
        cancelBtn.style.marginTop = '12px';
        cancelBtn.addEventListener('click', function() { self._cancelReplace(); });
        this.cardsContainer.appendChild(cancelBtn);
    }

    _doReplace(oldIndex) {
        var eng = window.gameEngine;
        var newWeaponId = this._replaceWeaponId;
        if (!newWeaponId) return;
        eng._replaceWeapon(oldIndex, newWeaponId);
        this._replaceWeaponId = null;
        this.hidePanel();
        eng._syncUI();
        if (eng._levelUpPending) {
            eng._levelUpPending = false;
            eng._resumeAfterLevelUp();
        } else {
            eng._resumeAfterReward();
        }
    }

    _cancelReplace() {
        this._replaceWeaponId = null;
        this.hidePanel();
        if (window.gameEngine._levelUpPending) {
            window.gameEngine._levelUpPending = false;
            window.gameEngine._resumeAfterLevelUp();
        } else {
            window.gameEngine._resumeAfterReward();
        }
    }

    /* ── 工具 ── */

    _buildPool() {
        var eng = window.gameEngine;
        var p = eng.player;
        var pool = [];

        for (var ri = 0; ri < this.baseRelics.length; ri++) {
            var relic = this.baseRelics[ri];
            var lv = p.relicLevels[relic.id] || 0;
            if (lv < 5) pool.push({ type: 'relic', id: relic.id, name: relic.name, desc: relic.desc, cost: relic.cost, currentLevel: lv, maxLevel: 5, cardData: relic });
        }

        if (p.relicLevels.auto_drone >= 5 && p.relicLevels.sharp_edge >= 1 && !p.evolvedDrone)
            pool.push({ type: 'relic', id: 'evolved_drone', name: this.legendaries[0].name, desc: this.legendaries[0].desc, cost: 0, currentLevel: 0, cardData: this.legendaries[0] });
        if (p.relicLevels.thorn_armor >= 5 && p.relicLevels.golden_finger >= 1 && !p.evolvedArmor)
            pool.push({ type: 'relic', id: 'evolved_armor', name: this.legendaries[1].name, desc: this.legendaries[1].desc, cost: 0, currentLevel: 0, cardData: this.legendaries[1] });
        if (p.relicLevels.wind_walker >= 5 && p.relicLevels.golden_finger >= 1 && !p.evolvedSpeed)
            pool.push({ type: 'relic', id: 'evolved_speed', name: this.legendaries[2].name, desc: this.legendaries[2].desc, cost: 0, currentLevel: 0, cardData: this.legendaries[2] });
        if (p.relicLevels.vamp_ring >= 5 && p.relicLevels.thorn_armor >= 3 && !p.evolvedVamp)
            pool.push({ type: 'relic', id: 'evolved_vamp', name: this.legendaries[3].name, desc: this.legendaries[3].desc, cost: 0, currentLevel: 0, cardData: this.legendaries[3] });

        var currentIds = {};
        for (var ci = 0; ci < eng._activeWeapons.length; ci++) currentIds[eng._activeWeapons[ci].id] = true;

        for (var wid in this.weaponInfos) {
            if (currentIds[wid]) continue;
            var info = this.weaponInfos[wid];
            pool.push({ type: 'weapon_new', id: wid, name: info.name, desc: info.desc, cost: 0, cardData: info });
        }

        for (var ai = 0; ai < eng._activeWeapons.length; ai++) {
            var w = eng._activeWeapons[ai];
            if (w.level >= 5) continue;
            var info = this.weaponInfos[w.id];
            if (!info) continue;
            pool.push({ type: 'weapon_up', id: w.id, name: info.name, desc: 'Lv.' + w.level + ' → Lv.' + (w.level + 1) + ' 攻倍率 ' + w.atkFactor.toFixed(1) + '→' + (w.atkFactor + 0.15).toFixed(1), cost: 0, cardData: info, weaponIndex: ai, weaponLevel: w.level });
        }

        return pool;
    }

    _pickFrom(pool) {
        var shuffled = pool.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
        }
        return shuffled.slice(0, 3);
    }

    _renderStars(level) {
        return '★'.repeat(level) + '☆'.repeat(5 - level);
    }

    /* ── 牺牲选项 ── */

    _buildSacrificeOption() {
        var p = window.gameEngine.player;
        /* 至少有一个 Lv≥1 的圣物才能牺牲 */
        var sacrificeCandidates = [];
        for (var rid in p.relicLevels) {
            if ((p.relicLevels[rid] || 0) >= 1) sacrificeCandidates.push(rid);
        }
        if (sacrificeCandidates.length === 0) return null;

        /* 随机选一个牺牲类型 */
        var optIdx = Math.floor(Math.random() * this.sacrificeOptions.length);
        var opt = this.sacrificeOptions[optIdx];

        return {
            type: 'sacrifice',
            id: 'sacrifice_' + opt.id,
            name: opt.name,
            icon: opt.icon,
            desc: opt.desc,
            sacrificeType: opt.type,
            value: opt.value,
            duration: opt.duration,
            cardData: opt
        };
    }

    _onSacrificeClick(item, titleEl, originalTitle) {
        var eng = window.gameEngine;
        var p = eng.player;

        /* 找到最高等级的圣物作为牺牲目标 */
        var bestRelic = null;
        var bestLevel = 0;
        for (var rid in p.relicLevels) {
            var lv = p.relicLevels[rid] || 0;
            if (lv > bestLevel) { bestLevel = lv; bestRelic = rid; }
        }
        if (!bestRelic) return;

        /* 降一级 */
        p.relicLevels[bestRelic] = bestLevel - 1;
        if (p.relicLevels[bestRelic] <= 0) delete p.relicLevels[bestRelic];

        /* 应用奖励 */
        switch (item.sacrificeType) {
            case 'metatoken':
                saveManager.addMetaTokens(item.value);
                this._showFloatingText('+' + item.value + ' 元代币', '#ff4444');
                break;
            case 'gold':
                var goldReward = Math.floor(p.gold * item.value);
                if (goldReward < 1) goldReward = 50;
                p.addGold(goldReward);
                this._showFloatingText('+' + goldReward + ' 金', '#ffd700');
                break;
            case 'temp_buff':
                if (item.buff === 'atkBoost') {
                    p._tempAtkBoost = (p._tempAtkBoost || 0) + item.value;
                    p._tempBuffEnd = Date.now() / 1000 + item.duration;
                    this._showFloatingText('+50% 攻击 30s', '#ff8800');
                } else if (item.buff === 'tempHp') {
                    p._tempHpBonus = (p._tempHpBonus || 0) + item.value;
                    p._tempBuffEnd = Date.now() / 1000 + item.duration;
                    this._showFloatingText('+100 HP 30s', '#4488ff');
                }
                break;
            case 'double_coin':
                p._doubleCoinNextWave = true;
                this._showFloatingText('下波金币翻倍', '#ffdd00');
                break;
        }

        /* 通知主面板刷新 */
        if (this.onPurchase) this.onPurchase();

        if (titleEl) titleEl.textContent = originalTitle;
        eng._syncUI();
        eng._resumeAfterLevelUp();
    }

    _showFloatingText(text, color) {
        if (!window.fxManager) return;
        var cx = window.innerWidth / 2;
        var cy = window.innerHeight / 2;
        fxManager.spawn(cx, cy, text, color, 28, 2000);
    }
}

window.rewardManager = new RewardManager();
