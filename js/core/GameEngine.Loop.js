(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

Gp._loop = function(timestamp) {
    if (!this.running || this.gameOver) return;
    /* R113-P1: 防止玩家对象异常null时主循环崩溃 */
    if (!this.player) return;
    try {
        /* Epoch 44: 懒初始化音频上下文（首次循环时尝试） */
        if (window.audioManager && !window.audioManager._initialized) {
            window.audioManager._ensureContext();
        }
        var dt = Math.max(0, Math.min((timestamp - this._lastTime) / 1000, 0.05)); /* R134-P0: 下界保护，防止performance.now()回退导致负dt使护盾/图腾等计时器倒退 */
        var _skipToEnd = false;
        this._lastTime = timestamp;
        /* R116-P0: 周期性自动存档，每30秒保存一次以防崩溃丢失进度 */
        this._saveTimer = (this._saveTimer || 0) + dt;
        if (this._saveTimer >= Balance.AUTO_SAVE_INTERVAL && !this._pendingReward && !this._paused && this._waveCount > 0) { /* R236-P1: 移除_announcingWave守卫，公告期间也可安全保存 */
            this._saveTimer = 0;
            this._autoSave('tick');
        }
        /* R96-P1: 每帧初重置协同标志，防止跨run残留导致激光额外穿透 */
        this._synBladeLaserHit = false;
        /* C2: 命中停顿 — 顿帧期间世界时间减速至15% */
        // R226-P0: 移除_hitStopT死代码 — 从未有设置入口，C2命中顿帧系统设计但未实现
        this._elapsed += dt;

        /* R171-P0: speed_demon 成就应在通关时检查，而非运行中每帧误报 — 移至_showVictory处理 */

        /* Epoch 32: 临时增益过期检查 — 使用游戏时间而非墙钟时间，避免面板冻结导致意外过期 */
        var p = this.player;
        if (p._tempBuffTimeLeft !== undefined && p._tempBuffTimeLeft > 0) {
            p._tempBuffTimeLeft -= dt;
            if (p._tempBuffTimeLeft <= 0) {
                p._tempAtkBoost = 0;
                p._tempHpBonus = 0;
                /* R148-P1: 双币buff仅在拾取时消费，不在过期时清零，防止buff到期但金币未拾取时丢失效果 */
                p._tempBuffTimeLeft = undefined; /* R292-P1: 重置为undefined防止每帧重复进入if块做无用比较 */
            }
        }

        var input = this._getInputVector();
        this._lastMoveX = input.x;
        /* P1-7/P0-NEW 修复: 打牌/胡牌演出期间冻结逻辑，但必须维持 rAF 链（否则解锁后死锁） */
        if (this._discardMode || this._huLock) {
            this._syncEntities();
            this._syncUI();
            this._syncPlayerHP(); /* R60-P1: 确保打牌模式期间血条同步 */
            if (this.running && !this.gameOver) requestAnimationFrame(this._guardedLoop || this._boundLoop);
            return;
        }
        /* B3: 北冥图腾减速 — 移动期间临时降速，更新后还原 */
        var _spdSave = this.player.speed;
        /* R251-P0: 每次循环开始前重置冰冻标志，防止永久减速 — 之前在for循环中只设true从未设false */
        this.player._frostSlowed = false;
        for (var _tf = 0; _tf < this._totems.length; _tf++) {
            var tf = this._totems[_tf];
            if (tf.kind === 'frost') {
                var fdx = this.player.x - tf.x, fdy = this.player.y - tf.y;
                var fr = tf.radius || 100;
                if (fdx * fdx + fdy * fdy < fr * fr) { this.player._frostSlowed = true; break; }
            }
        }
        if (this.player._frostSlowed) this.player.speed = _spdSave * Balance.FROST_SLOW_MULT;
        this.player.update(dt, input.x, input.y, this._mapW, this._mapH);
        this.player.speed = _spdSave;

        /* ── Step 5: 视差背景随玩家位置微移 ── */
        if (this._battlefieldBg) {
            var px = -(this.player.x / this._mapW - 0.5) * 40;
            var py = -(this.player.y / this._mapH - 0.5) * 30;
            this._battlefieldBg.style.transform = 'translate(' + px + 'px,' + py + 'px)';
        }

        if (!this._pendingReward) {
            /* Epoch 5: 委托刷怪逻辑到 SpawnSystem */
            if (window.SpawnSystem) {
                window.SpawnSystem.update(dt, this);
            }

            if (this.player.hasDrone) {
                var interval = this.player.evolvedDrone ? Balance.EVOLVED_DRONE_INTERVAL : this.player.droneInterval;
                this.player.droneTimer += dt;
                while (this.player.droneTimer >= interval) {
                    this.player.droneTimer -= interval;
                    if (this.player.evolvedDrone) {
                        /* R187-P1: 使用O(n)选择而非O(n log n)排序取top-3 */
                        /* R195-P2: 复用数组避免per-frame allocation */
                        if (!this._droneTop3) this._droneTop3 = [];
                        this._droneTop3.length = 0;
                        var _top3 = this._droneTop3;
                        for (var _di = 0; _di < this.enemies.length; _di++) {
                            var _e = this.enemies[_di];
                            if (!_e.alive) continue;
                            var _dx = _e.x - this.player.x;
                            var _dy = _e.y - this.player.y;
                            var _dist2 = _dx * _dx + _dy * _dy;
                            /* 插入已排序的_top3数组（最多3个） */
                            var _inserted = false;
                            for (var _ti = 0; _ti < _top3.length; _ti++) {
                                if (_dist2 < _top3[_ti].d) {
                                    _top3.splice(_ti, 0, { e: _e, d: _dist2 });
                                    _inserted = true;
                                    break;
                                }
                            }
                            if (!_inserted && _top3.length < 3) {
                                _top3.push({ e: _e, d: _dist2 });
                            }
                        }
                        for (var _ti = 0; _ti < _top3.length; _ti++) _top3[_ti].e.takeDamage(Math.max(1, Math.floor(this.player.atk * Balance.DRONE_EVOLVED_SLAM_FACTOR * (1 + (this.player._tempAtkBoost || 0)))), this.player);
                    } else {
                        var nearest = null;
                        var nearestDist = Infinity;
                        for (var _nj = 0; _nj < this.enemies.length; _nj++) {
                            var _ne = this.enemies[_nj];
                            if (!_ne.alive) continue;
                            var _ndx = _ne.x - this.player.x;
                            var _ndy = _ne.y - this.player.y;
                            var _nd = _ndx * _ndx + _ndy * _ndy;
                            if (_nd < nearestDist) { nearestDist = _nd; nearest = _ne; }
                        }
                        if (nearest) nearest.takeDamage(Math.max(1, Math.floor(this.player.atk * Balance.DRONE_NORMAL_SLAM_FACTOR * (1 + (this.player._tempAtkBoost || 0)))), this.player);
                    }
                }
            }

            var prevHp = this.player.hp;

            for (var _ei = 0; _ei < this.enemies.length; _ei++) {
                if (!this.enemies[_ei]) continue;
                this.enemies[_ei].update(dt, this.player, this);
            }
            /* R177-P0: 敌人间碰撞分离 — 使用Grid空间分割将O(n²)降至O(n)，防止>50敌时帧率暴跌 */
            var _epG = {};
            var _epGS = 200; /* R237-P0: 从100增至200，确保Boss_Lord(半径84)+Boss_Lord(半径84)不会跨格漏检 */
            /* R187-P0: 每格只加入一次，避免同一敌人在多格重复计算 */
            for (var _gi = 0; _gi < this.enemies.length; _gi++) {
                var _ge = this.enemies[_gi];
                if (!_ge || !_ge.alive) continue;
                var _kg = Math.floor(_ge.x / _epGS) + ',' + Math.floor(_ge.y / _epGS);
                if (!_epG[_kg]) _epG[_kg] = [];
                _epG[_kg].push(_ge);
            }
            if (!this._collisionChecked) this._collisionChecked = new Set(); /* R195-P2: 复用Set避免per-frame allocation */
            this._collisionChecked.clear();
            var _checked = this._collisionChecked;
            for (var _ci = 0; _ci < this.enemies.length; _ci++) {
                var _a = this.enemies[_ci];
                if (!_a || !_a.alive) continue;
                var _ak = Math.floor(_a.x / _epGS) + ',' + Math.floor(_a.y / _epGS);
                for (var _dgi = -1; _dgi <= 1; _dgi++) {
                    for (var _dgj = -1; _dgj <= 1; _dgj++) {
                        var _nk = (Math.floor(_a.x / _epGS) + _dgi) + ',' + (Math.floor(_a.y / _epGS) + _dgj);
                        var _nb = _epG[_nk];
                        if (!_nb) continue;
                        /* R187-P0: 仅检查j>i避免同一格内重复比较 */
                        for (var _nj = 0; _nj < _nb.length; _nj++) {
                            var _b = _nb[_nj];
                            if (_b === _a || !_b.alive) continue;
                            var _pairKey = _a.id < _b.id ? _a.id + ',' + _b.id : _b.id + ',' + _a.id;
                            if (_checked.has(_pairKey)) continue;
                            _checked.add(_pairKey);
                            var _cdx = _b.x - _a.x, _cdy = _b.y - _a.y;
                            var _cd2 = _cdx * _cdx + _cdy * _cdy;
                            var _minD = _a.radius + _b.radius;
                            if (_cd2 < _minD * _minD && _cd2 > 0.01) {
                                var _cd = Math.sqrt(_cd2);
                                var _push = (_minD - _cd) * 0.5;
                                var _cnx = _cdx / _cd, _cny = _cdy / _cd;
                                _a.x -= _cnx * _push; _a.y -= _cny * _push;
                                _b.x += _cnx * _push; _b.y += _cny * _push;
                                _a._clampPosition(this);
                                _b._clampPosition(this);
                            }
                        }
                    }
                }
            }

            /* ── 图腾 buff 应用（Epoch 46: 网格空间分割优化） ── */
            for (var _toti = 0; _toti < this.enemies.length; _toti++) this.enemies[_toti]._totemBuffed = false;
            if (this._totems.length > 0) {
                /* B3: 图腾寿命到期清理（8s） */
                for (var _tex = this._totems.length - 1; _tex >= 0; _tex--) {
                    var _tt = this._totems[_tex];
                    if (_tt.born !== undefined && this._elapsed - _tt.born > Balance.TOTEM_LIFETIME) {
                        if (_tt.el && _tt.el.parentNode) _tt.el.remove();
                        this._totems.splice(_tex, 1);
                    }
                }
                /* Epoch 46: 构建敌人网格 */
                var GRID_SIZE = 80;
                var totemGrid = {};
                for (var _tg = 0; _tg < this.enemies.length; _tg++) {
                    var _te = this.enemies[_tg];
                    if (!_te.alive) continue;
                    var _gx = Math.floor(_te.x / GRID_SIZE);
                    var _gy = Math.floor(_te.y / GRID_SIZE);
                    var _gk = _gx + ',' + _gy;
                    if (!totemGrid[_gk]) totemGrid[_gk] = [];
                    totemGrid[_gk].push(_te);
                }
                /* 对每个图腾，只检查其所在格及周边 8 格的敌人 */
                for (var _to = 0; _to < this._totems.length; _to++) {
                    var t = this._totems[_to];
                    var tgx = Math.floor(t.x / GRID_SIZE);
                    var tgy = Math.floor(t.y / GRID_SIZE);
                    var tR2 = t.radius * t.radius;
                    /* R290-P0: 扩大Totem搜索范围 — GRID_SIZE=80但totem半径=100，±1格只能覆盖80px，需要±2格覆盖160px确保检测完整 */
                    for (var dgx = -2; dgx <= 2; dgx++) {
                        for (var dgy = -2; dgy <= 2; dgy++) {
                            var ck = (tgx + dgx) + ',' + (tgy + dgy);
                            var cell = totemGrid[ck];
                            if (!cell) continue;
                            for (var ci = 0; ci < cell.length; ci++) {
                                var te = cell[ci];
                                var tdx = te.x - t.x;
                                var tdy = te.y - t.y;
                                if (tdx * tdx + tdy * tdy < tR2) te._totemBuffed = true;
                            }
                        }
                    }
                }
            }

            /* ── 波次突变触发器（Boss Lord 波次跳过） ── */
            if (!this._bossLordWave && !this._mutatorTriggered && this._activeMutator === null && this.currentWaveSpawnedCount > 0 && !this._pendingReward && !this._levelUpPending && !this._overdriveActive && !this._announcingWave) {
                var cap = this._getWaveEnemyMax();
                if (cap > 0 && this.currentWaveSpawnedCount >= Math.ceil(cap * 0.5)) {
                    this._mutatorTriggered = true;
                    /* 委托给 Systems.showMutatorPanel — 突变触发 */
                    if (window.Systems) window.Systems.showMutatorPanel(this);
                }
            }

            /* Epoch 47: 深渊变异组合自动激活（每局仅一次） */
            /* R309-P0: 添加面板守卫，防止深渊组合在活跃面板期间误触发 */
            if (this.loopCount > 0 && this._abyssUnlockedCombos && this._abyssUnlockedCombos.length > 0 && !this._abyssActiveCombo && !this._abyssComboActivated && !this._pendingReward && !this._levelUpPending && !this._activeMutator && !this._announcingWave) {
                this._abyssComboActivated = true;
                /* R225-P0: 随机选择深渊组合，避免永远固定取第一个（最早解锁）的combo */
                var _abyssPool = this._abyssUnlockedCombos;
                var _abyssCombo = _abyssPool[Math.floor(Math.random() * _abyssPool.length)];
                this._applyAbyssCombo(_abyssCombo);
            }

            /* Buff/Debuff 计时递减统一在上方 Epoch 32 块处理（修复双重递减 bug） */
            /* 护盾过期 — 使用游戏时间而非墙钟时间，避免面板冻结导致意外过期 */
            if (this._tempShieldEnd > 0 && this._elapsed >= this._tempShieldEnd) {
                this._tempShield = 0;
                this._tempShieldEnd = 0;
            }

            if (this.player._thornCritX !== undefined) {
                if (this._combat && this._combat.spawnFloatText) {
                    this._combat.spawnFloatText(this, this.player._thornCritX, this.player._thornCritY, '暴击反伤!', true);
                } else {
                    this._spawnFloatText(this.player._thornCritX, this.player._thornCritY, '暴击反伤!', true);
                }
                this.player._thornCritX = undefined;
                this.player._thornCritY = undefined;
            }

            if (this.player._dodgeSignal) {
                if (this._combat && this._combat.spawnFloatText) {
                    this._combat.spawnFloatText(this, this.player.x, this.player.y, '闪避!', true);
                } else {
                    this._spawnFloatText(this.player.x, this.player.y, '闪避!', false, false);
                }
                this.player._dodgeSignal = false;
            }

            if (this.player._healAmount > 0) {
                if (this._combat && this._combat.spawnHealText) {
                    this._combat.spawnHealText(this, this.player.x, this.player.y, this.player._healAmount);
                } else {
                    this._spawnHealText(this.player.x, this.player.y, this.player._healAmount);
                }
                this.player._healAmount = 0;
            }

            // 统一处理所有死亡的敌人（包括boss）
            for (var _ri = this.enemies.length - 1; _ri >= 0; _ri--) {
                var _re = this.enemies[_ri];
                if (!_re.alive) {
                    var isLord = _re.type === 'Boss_Lord';
                    this._rewardKill(_re); // 掉落金币+经验石+怒气
                    this._tryDropEquipment(_re.x, _re.y, _re.type === 'Boss_Lord');
                    this._removeEnemyDOM(_re);
                    this.enemies.splice(_ri, 1);
                    if (isLord) {
                        this.triggerShake(3, 500);
                        /* R190-P2: Boss Lord死亡时播放专属音效，区分Phase 3转场音效 */
                        if (window.audioManager) window.audioManager.play('explode');
                        this._cleanEnemyProjectiles();
                        /* R30-H-016: Boss Lord死亡后清理金币/宝石，但不移除其他活敌 */
                        // 注：非Boss活敌由主死亡循环正常处理，此处仅清理掉落物和状态
                        /* R199-P0: Boss死亡时归还未拾取金币，防止丢失 */
                        /* R207-P0: 单次遍历同时处理加钱和DOM移除，防止addGold触发事件后_activeCoins未清空导致死循环 */
                        /* R225-P1: Boss死亡金币转化也应受_tempGoldMult加成，与正常拾取路径一致 */
                        /* R238-P0: 按实际金币值退款，而非固定1金/枚 — 存储baseGold防止丢失实际价值 */
                        var refundTotal = 0;
                        for (var _lci = this._activeCoins.length - 1; _lci >= 0; _lci--) {
                            refundTotal += this._activeCoins[_lci].baseGold || 1;
                            this._activeCoins[_lci].el.remove();
                        }
                        this.player.addGold(Math.max(1, Math.floor(refundTotal)));
                        /* R287-P1: Boss死亡金币退款也应受_tempGoldMult加成，与正常拾取路径一致 */
                        if (this._tempGoldMult > 1) {
                            var _goldBonus = Math.floor((this._tempGoldMult - 1) * refundTotal);
                            if (_goldBonus > 0) this.player.addGold(_goldBonus);
                            this._tempGoldMult = 1;
                        }
                        this._activeCoins = [];
                        if (this.bossHpBar) this.bossHpBar.classList.remove('active');
                        if (this.bossHpFill) this.bossHpFill.style.width = '0%';
                        /* R252-P1: 清理 Boss Lord 引用和红色雾霭 DOM，防止胜利界面残留 */
                        if (this._bossLord) this._bossLord = null;
                        /* R290-P0: 记录Boss Lord已被击败，用于极速通关成就终局检查 */
                        this._finalBossDefeatedThisRun = true;
                        if (this._bossMistEl && this._bossMistEl.parentNode) { this._bossMistEl.remove(); this._bossMistEl = null; }
                        /* R268-P1: 清理Boss P2警告圈DOM，防止快速击杀时残留 */
                        if (this._bossWarningEl && this._bossWarningEl.parentNode) { this._bossWarningEl.remove(); this._bossWarningEl = null; }
                        this._bossWarningActive = false;
                        this._pendingReward = false; /* R252-P1: 清除波次结算标志，防止奖励面板重复弹出 */
                        if (this._expGems.length > 0 || (this._pendingExpGems && this._pendingExpGems.length > 0)) {
                            this._pendingBossLordSettle = true;
                        } else {
                            /* R207-P1: 胜利结算前主动存档，防止crash/tab关闭时进度丢失（与_gameOver的autoSave('death')对称） */
                            this._autoSave('victory').catch(function(e) { console.warn('[Loop] boss lord victory save failed:', e); });
                            this.running = false;
                            this.gameOver = true;
                            this._won = true; /* R136-P0: 标记胜利，供_settleRun中flawless/speed_demon使用 */
                            if (this._currentLevelId === 'level_3' || this.loopCount > 0) {
                                this._showAbyssPanel();
                            } else {
                                this._showVictory();
                            }
                        }
                        return;
                    }
                }
            }
            // 所有非Boss敌人死亡 → 波次结束奖励
            // is handled by _pendingReward block below

            /* ── Visual Enhancement B: 昼夜循环 + 深渊变暗 ── */
        if (this.battlefield) {
            /* 昼夜循环：每 10 波切换一次（脏检查：仅在waveCount变化时更新） */
            if (this._waveCount > 0) {
                var cycleIndex = Math.floor(this._waveCount / 10) % 3; // 0=day, 1=dusk, 2=night
                var dne = this._dayNightEl;
                if (!dne) {
                    dne = document.createElement('div');
                    dne.id = 'day-night-overlay';
                    dne.className = 'day';
                    this.battlefield.appendChild(dne);
                    this._dayNightEl = dne;
                }
                if (this._lastDayNightCycle !== cycleIndex) {
                    this._lastDayNightCycle = cycleIndex;
                    dne.className = ['day', 'dusk', 'night'][cycleIndex];
                }
            }

            /* 深渊模式背景变暗（脏检查：仅在loopCount变化时更新） */
            if (this.loopCount > 0) {
                var ab = this.battlefield;
                var abyssLevel = this.loopCount <= 1 ? 1 : (this.loopCount <= 3 ? 2 : (this.loopCount <= 6 ? 3 : 'n'));
                if (this._lastAbyssDepth !== abyssLevel) {
                    this._lastAbyssDepth = abyssLevel;
                    ab.classList.remove('abyss-depth-1', 'abyss-depth-2', 'abyss-depth-3', 'abyss-depth-n');
                    if (abyssLevel === 1) ab.classList.add('abyss-depth-1');
                    else if (abyssLevel === 2) ab.classList.add('abyss-depth-2');
                    else if (abyssLevel === 3) ab.classList.add('abyss-depth-3');
                    else ab.classList.add('abyss-depth-n');
                }

                /* 红色雾霭 */
                if (!this._abyssMistEl) {
                    var mist = document.createElement('div');
                    mist.className = 'abyss-red-mist';
                    mist.style.left = Math.random() * 50 + '%';
                    mist.style.top = Math.random() * 50 + '%';
                    ab.appendChild(mist);
                    this._abyssMistEl = mist;
                }
            } else if (this._abyssMistEl) {
                if (this._abyssMistEl.parentNode) this._abyssMistEl.remove();
                this._abyssMistEl = null;
            }

            /* Weather: 雨滴粒子 (每波 5+ 触发) */
            if (this._waveCount >= Balance.WEATHER_RAIN_TRIGGER_WAVE && !this._pendingReward) {
                this._rainTimer = (this._rainTimer || 0) + dt;
                if (this._rainTimer >= Balance.WEATHER_RAIN_INTERVAL) {
                    this._rainTimer = 0;
                    if (this._rainDrops && this._rainDrops.length < 30) {
                        var drop = document.createElement('div');
                        drop.className = 'weather-rain-drop';
                        var bw = this.battlefield.clientWidth;
                        drop.style.left = Math.random() * bw + 'px';
                        drop.style.top = '-10px';
                        drop.style.height = (10 + Math.random() * 15) + 'px';
                        drop.style.setProperty('--duration', (0.4 + Math.random() * 0.3) + 's');
                        this.battlefield.appendChild(drop);
                        if (!this._rainDrops) this._rainDrops = [];
                        var _dropIdx = this._rainDrops.length;
                        this._rainDrops.push(drop);
                        var _self = this;
                        var _dur = parseFloat(drop.style.getPropertyValue('--duration')) || 0.6;
                        setTimeout(function(el, arr) {
                            if (el && el.parentNode) el.remove();
                            if (arr) { var i = arr.indexOf(el); if (i >= 0) arr.splice(i, 1); }
                        }, (_dur + 0.1) * 1000, drop, this._rainDrops);
                    }
                }
            }
        }

        if (this.player.hp < prevHp) {
                /* Epoch 32: 临时护盾吸收 */
                if (this._tempShield > 0) {
                    var absorbed = Math.min(this._tempShield, prevHp - this.player.hp);
                    this._tempShield -= absorbed;
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + absorbed);
                    if (this._tempShield <= 0) this._tempShield = 0;
                }
                var _actualDmg = prevHp - this.player.hp;
                if (_actualDmg > 0) this._playerHitCountThisRun++;
            }
        }

        this._updateCoins(dt);
        this._updateExpGems(dt);

        /* ── Epoch 43: 引导追踪 — 拾取经验石 ── */
        if (!this._guideDismissed && this._expGems.length < (this._guidePrevGemCount || 0)) {
            this._guideGemsPicked = (this._guideGemsPicked || 0) + 1;
        }
        this._guidePrevGemCount = this._expGems.length;

        /* ── Epoch 43: 引导追踪 — 首次攻击命中 ── */
        if (!this._guideDismissed && this.enemies.length < (this._guidePrevEnemyCount || 0)) {
            /* R32-G-003: 敌人减少=被击杀=有攻击（原条件>误写） */
            this._guideHits = (this._guideHits || 0) + 1;
        }
        this._guidePrevEnemyCount = this.enemies.length;

        /* ── BossLord 死亡：等待经验石吸完后再结算 ── */
        if (this._pendingBossLordSettle && (this._expGems.length > 0 || (this._pendingExpGems && this._pendingExpGems.length > 0))) {
            if (this._levelUpPending) {
                this._levelUpPending = false;
                /* R252-P0: 保留 _pendingBossLordSettle，防止升级面板恢复后胜利路径永久丢失 */
                this.running = false;
                this._freezeClock();
                this._syncUI();
                if (window.rewardManager) window.rewardManager.showLevelUpPanel();
                return;
            }
            this._pendingBossLordSettle = false;
            /* R207-P1: 胜利结算前主动存档，防止crash/tab关闭时进度丢失 */
            this._autoSave('victory').catch(function(e) { console.warn('[Loop] boss lord settle victory save failed:', e); });
            this.running = false;
            this.gameOver = true;
            this._won = true; /* R136-P0: 标记胜利，供_settleRun中flawless/speed_demon使用 */
            if (this._currentLevelId === 'level_3' || this.loopCount > 0) {
                this._showAbyssPanel();
            } else {
                this._showVictory();
            }
            return;
        }

        /* ── Visual Enhancement D: 技能施放轮廓光 ── */
        if (this._weaponJustFired && this.playerEl) {
            var glow = document.createElement('div');
            glow.className = 'player-skill-glow';
            glow.style.left = (this.player.x - 28) + 'px';
            glow.style.top = (this.player.y - 32) + 'px';
            glow.style.width = '56px';
            glow.style.height = '64px';
            var heroColor = {
                Hero: 'rgba(212,175,55,0.5)',
                Knight: 'rgba(21,101,192,0.5)',
                Mage: 'rgba(46,125,50,0.5)',
                Assassin: 'rgba(123,31,162,0.5)'
            }[this.player.heroId] || 'rgba(255,255,255,0.5)';
            glow.style.boxShadow = '0 0 20px 10px ' + heroColor;
            this._worldLayer.appendChild(glow);
            this._skillGlowEls = this._skillGlowEls || [];
            this._skillGlowEls.push(glow); /* R226-P0: 追踪技能光效引用供restart清理 */
            var _glowRef = glow; /* R140-P1: 捕获引用防止restart后回调操作已移除DOM */
            var _glowEls = this._skillGlowEls; /* R234-P1: 捕获this引用，避免setTimeout回调中this指向全局/undefined导致splice失效 */
            setTimeout(function(el) { if (el && el.parentNode) el.remove(); var arr=_glowEls; if(arr){var i=arr.indexOf(el);if(i>=0)arr.splice(i,1);} }, 600, _glowRef);
            this._weaponJustFired = false;
        }

        this._updateWeapons(dt);
        /* 检测武器是否刚刚发射 */
        for (var _wf = 0; _wf < this._activeWeapons.length; _wf++) {
            var wf = this._activeWeapons[_wf];
            if (wf._justFired) {
                this._weaponJustFired = true;
                wf._justFired = false;
                break;
            }
        }
        this._updateProjectiles(dt);
        /* R116-P1: 波次过渡期弹道应持续更新，避免幽灵悬浮+同时命中伤害峰值 */
        this._updateEnemyProjectiles(dt);

        /* ── Overdrive 计时（游戏时间） ── */
        /* 设计决策：面板打开时游戏循环暂停，Overdrive 计时随之暂停。
           面板关闭后倒计时从剩余时间继续。不按真实时间流逝。
           R38: Sys.updateOverdrive 是死代码（从未被调用），此处是唯一活跃计时器 */
        if (this._overdriveActive && !this._pendingReward && !this._levelUpPending && !this._activeMutator && !this._announcingWave) { /* R235-P1/R242-P1: 添加_mutator守卫，防止突变面板打开时overdrive计时继续流逝 */ /* R259-P1: 添加_announcingWave守卫，防止波次公告期间overdrive计时继续流逝 */
            this._overdriveTimer -= dt;
            if (this._overdriveTimer <= 0) this._endOverdrive();
        }

        /* ── 屏幕震颤计时 — 委托给 Systems ── */
        if (this._systems && this._systems.updateShake) {
            this._systems.updateShake(this, dt);
        } else if (this._shakeTimer > 0) {
            this._shakeTimer -= dt;
            if (this._shakeTimer <= 0) {
                this._shakeTimer = 0;
                var wl = this._worldLayer || document.getElementById('world-layer');
                if (wl) {
                    wl.classList.remove('shake-active');
                    wl.style.animationDuration = '';
                    wl.style.setProperty('--sx', '');
                    wl.style.setProperty('--sy', '');
                    wl.style.animation = '';
                }
            }
        }

        /* ── 套装共鸣：焰痕 + 永冻（委托给 Systems）── */
        /* R309-P0: 添加_overdriveActive守卫，防止Overdrive期间共鸣光环造成双倍伤害 */
        if ((this.player.setResonanceSpeed || this.player.setResonanceIce) && !this._pendingReward && !this._overdriveActive) {
            if (this._systems && this._systems.updateResonanceAuras) {
                this._systems.updateResonanceAuras(this, dt);
            }
        }

        /* ── 突变·枯萎：全体敌人周期性损血 ── */
        /* R309-P0: 添加_overdriveActive守卫，防止Overdrive期间枯萎DOT对冰冻敌人造成双倍伤害 */
        if (this._activeMutator === 'wither' && !this._pendingReward && !this._overdriveActive) {
            /* Epoch 5: 委托枯萎到 Systems */
            if (this._systems && this._systems.updateWither) {
                this._systems.updateWither(this, dt);
            } else {
                this._witherTimer += dt;
                if (this._witherTimer >= Balance.MUTATOR_WITHER_TICK_INTERVAL) {
                    this._witherTimer = 0;
                    for (var _wi = 0; _wi < this.enemies.length; _wi++) {
                        var _we = this.enemies[_wi];
                        if (!_we.alive) continue;
                        var dmg = Math.max(1, Math.floor(_we.maxHp * Balance.WITHER_HP_LOSS_PCT));
                        _we.takeDamage(dmg, 'wither', this.player.x, this.player.y);
                    }
                }
            }
        }

        /* Epoch 47: 深渊变异组合效果持续应用 */
        if (this._abyssActiveCombo && !this._pendingReward) {
            var _abyssCombo = this._abyssActiveCombo;
            if (_abyssCombo === 'abyss_frenzy') {
                /* R159-P0: 深渊狂乱 — 存储baseSpeed快照，防止combo关闭后baseSpeed被污染导致下次激活指数爆炸 */
                for (var _af = 0; _af < this.enemies.length; _af++) {
                    var _ae = this.enemies[_af];
                    if (_ae.alive && !_ae._frenzyApplied) {
                        _ae._frenzyApplied = true;
                        _ae._frenzyBaseSpeed = _ae.baseSpeed; /* R159-P0: 快照原始baseSpeed */
                        _ae.baseSpeed = Math.floor(_ae.baseSpeed * Balance.ABYSS_FRENZY_SPEED_MULT);
                        _ae.speed = _ae.baseSpeed;
                    }
                }
                /* R289-P0: 移除 lifestealRate < 1 守卫 — 全吸血Build下封印狂乱击杀回血功能 */
                if (!this._abyssFrenzyLifestealSet) {
                    this._abyssFrenzyLifestealSet = true; /* R46: 狂乱 combo 击杀回血 — 之前为空实现 */
                } /* R58-P0: 移除每帧回血，改为击杀时触发（见Spawn.js _rewardKill） */
            } else if (_abyssCombo === 'abyss_gravity') {
                /* 深渊引力: 吸附×3（使用基准值，避免每帧累积） */
                var _baseMag = this.player._baseMagnetRadius || Balance.MAGNET_RADIUS_DEFAULT;
                this.player.magnetRadius = _baseMag * 3;
            } else if (_abyssCombo === 'abyss_frailty') {
                /* 深渊脆弱: 玩家攻击+150%，受伤+50% */
                var _frailtyMult = Balance.ABYSS_FRAILTY_ATK_MULT;
                if (this.player._abyssFrailtyAtk !== _frailtyMult) {
                    /* R32-E-001: 备份原始ATK用于组合移除时还原 */
                    if (!this.player._abyssFrailtyOrigAtk) {
                        this.player._abyssFrailtyOrigAtk = this.player.atk;
                    }
                    this.player.atk = Math.floor(this.player._abyssFrailtyOrigAtk * _frailtyMult);
                    this.player._abyssFrailtyAtk = _frailtyMult;
                    this.player._frailtyDebuff = true;
                    /* R308-P0: 标记深渊脆弱伤害debuff，使Enemy.takeDamage可应用ABYSS_FRAILTY_DMG_MULT */
                    this.player._abyssFrailtyDmgMult = Balance.ABYSS_FRAILTY_DMG_MULT;
                }
            } else if (_abyssCombo === 'abyss_bloodmoon') {
                /* 深渊血月: HP+60%, ATK+80%, 掉落×2 */
                if (!this.player._abyssBloodmoonApplied) {
                    this.player._abyssBloodmoonApplied = true;
                    /* R46: 补全血月HP加成（之前只实现了ATK） */
                    /* R125-P1: 保存原始maxHp用于关闭combo时还原 */
                    this.player._abyssBloodmoonOrigMaxHp = this.player.maxHp;
                    var _bmOrigMaxHp = this.player._baseMaxHp || this.player.maxHp;
                    this.player.maxHp = Math.floor(_bmOrigMaxHp * Balance.ABYSS_BLOODMOON_HP_MULT);
                    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
                    this.player.atk = Math.floor(this.player.atk * Balance.ABYSS_BLOODMOON_ATK_MULT);
                    this.player._abyssBloodmoonAtkBonus = Balance.ABYSS_BLOODMOON_ATK_MULT;
                }
            } else if (_abyssCombo === 'abyss_wither') {
                /* 深渊凋零: 每秒损失2%HP但生成等量护盾 */
                this._witherAbyssTimer = (this._witherAbyssTimer || 0) + dt;
                if (this._witherAbyssTimer >= Balance.ABYSS_WITHER_TICK_INTERVAL) {
                    this._witherAbyssTimer = 0;
                    var drainPct = Balance.ABYSS_WITHER_DRAIN_HP_PCT; /* R233-P1/R242-P1: 修正常量名，该常量为深渊凋零组合使用 */
                    var maxHp = this.player.maxHp;
                    var drainDmg = Math.floor(maxHp * drainPct);
                    if (drainDmg > 0) {
                        this.player.takeDamage(drainDmg, 'wither');
                        /* Shield: heal back same amount but capped at maxHp */
                        var shieldHeal = Math.min(drainDmg, maxHp - this.player.hp);
                        if (shieldHeal > 0) {
                            this.player.hp = Math.min(maxHp, this.player.hp + shieldHeal);
                        }
                    }
                }
            }
        }

        if (this.player.hp <= 0) {
            /* Epoch 14: 复活机会 */
            if (this.player.shouldRevive && this.player.shouldRevive(this)) {
                this._spawnCausalityText('💀 复活！元气恢复 30%');
                this.triggerShake(1.5, 500);
                /* Continue loop — rAF rescheduled at end of _loop */
                _skipToEnd = true;
            }
            if (_skipToEnd) { this._syncUI(); if (this._guardedLoop) { requestAnimationFrame(this._guardedLoop); } return; }
            this._gameOver();
            return;
        }

        /* ── 升级面板优先于波次奖励面板 ── */
        if (this._levelUpPending) {
            this._levelUpPending = false;
            this.running = false;
            this._freezeClock();
            this._syncUI();
            if (window.rewardManager) window.rewardManager.showLevelUpPanel();
            return;
        }

        if (this._pendingReward && this._activeCoins.length === 0 && this._expGems.length === 0) {
            if (this._waveCount >= this._getMaxWaves() - 1) {
                /* R234-P0: 最终波次胜利前存档，防止页面关闭时进度丢失 */
                this._autoSave('victory').catch(function(e) { console.warn('[Loop] final wave save failed:', e); });
                this.running = false;
                this.gameOver = true;
                this._won = true; /* R136-P0: 标记胜利，供_settleRun中flawless/speed_demon使用 */
                /* R253-P0: 深渊模式下应显示深渊面板而非胜利界面 */
                if (this._currentLevelId === 'level_3' || this.loopCount > 0) {
                    this._showAbyssPanel();
                } else {
                    this._showVictory();
                }
            } else {
                /* Epoch 32: 波次间事件 */
                if (this._waveCount >= 1 && Math.random() < Balance.WAVE_INTER_EVENT_CHANCE) {
                    this._triggerInterWaveEvent();
                    this.running = false;
                    return;
                }
                this.running = false;
                this._freezeClock();
                this._syncUI();
                if (window.rewardManager) window.rewardManager.showRewardPanel();
            }
            return;
        }

        if (!this._pendingReward && this.enemies.length === 0 && this._activeCoins.length === 0 && this._expGems.length === 0 && !this._bossLordSpawned && this.currentWaveSpawnedCount >= this._getWaveEnemyMax() && this._waveCount < this._getMaxWaves() - 1) {
            this._pendingReward = true;
        }

        var vpW = this._vpW;
        var vpH = this._vpH;
        if (!vpW || !vpH) {
            vpW = this.battlefield.clientWidth;
            vpH = this.battlefield.clientHeight;
            this._vpW = vpW;
            this._vpH = vpH;
        }
        var targetCamX = Math.max(0, Math.min(this._mapW - vpW, this.player.x - vpW / 2));
        var targetCamY = Math.max(0, Math.min(this._mapH - vpH, this.player.y - vpH / 2));
        var lerpFactor = 1 - Math.exp(-10 * dt);
        /* R171-P0: 长时间tab暂停后dt被cap在0.05，camera严重滞后 — 超过阈值直接snap */
        if (dt >= 0.048) {
            this.cameraX = targetCamX;
            this.cameraY = targetCamY;
        } else {
            this.cameraX += (targetCamX - this.cameraX) * lerpFactor;
            this.cameraY += (targetCamY - this.cameraY) * lerpFactor;
        }

        this._syncEntities();
        this._syncPlayerHP();
        this._syncUI();
        /* R185-P1: 每帧刷新 active buff 图标，防止游戏中buff状态不更新 */
        if (this._renderActiveBuffs) this._renderActiveBuffs();

        /* Epoch 47: 每3秒检查一次里程碑 */
        this._milestoneCheckTimer = (this._milestoneCheckTimer || 0) + dt;
        if (this._milestoneCheckTimer >= Balance.MILESTONE_CHECK_INTERVAL) {
            this._milestoneCheckTimer = 0;
            if (this._checkMilestones) this._checkMilestones();
        }
    } catch (err) { console.error('Game loop error:', err); if (this.running && !this.gameOver) requestAnimationFrame(this._guardedLoop || this._boundLoop); return; }

    if (this.running && !this.gameOver) requestAnimationFrame(this._guardedLoop || this._boundLoop);
};

Gp._getMaxWaves = function() {
    var cfg = window.levelConfig[this._currentLevelId];
    return cfg ? cfg.maxWaves : 5;
};

Gp._getWaveEnemyMax = function() {
    var cfg = window.levelConfig[this._currentLevelId];
    if (!cfg || !cfg.waveEnemyMax) {
        /* R142-P0: 程序化关卡fallback到有意义的上限，防止50+波敌人无限累积 */
        var maxW = cfg ? (cfg.maxWaves || 15) : 15;
        return Math.min(999, maxW * 20);
    }
    var idx = Math.min(this._waveCount, cfg.waveEnemyMax.length - 1);
    return cfg.waveEnemyMax[idx] || (this._getMaxWaves() * 20);
};

/* ══════════════════════════════════════════════
   Epoch 47: 局内Buff/Debuff显示
   ══════════════════════════════════════════════ */

Gp._renderActiveBuffs = function() {
    if (!this.battlefield) return;
    var p = this.player;
    var buffs = [];
    if (p._tempAtkBoost > 0) buffs.push({ name: '⚔ 攻击+' + Math.round(p._tempAtkBoost * 100) + '%', timer: p._tempBuffTimeLeft });
    if (p._tempHpBonus > 0) buffs.push({ name: '❤ 生命+' + Math.round(p._tempHpBonus), timer: p._tempBuffTimeLeft });
    if (this._tempGoldMult > 1) buffs.push({ name: '💰 金币×' + this._tempGoldMult, timer: 1 }); /* 单波 */
    if (this._tempBerserkBonus) buffs.push({ name: '🩸 狂战士', timer: 1 });
    if (this._tempShield > 0) buffs.push({ name: '🛡 护盾' + Math.round(this._tempShield), timer: this._tempShieldEnd - this._elapsed });
    if (this._tempCritBonus > 0) buffs.push({ name: '👊 铁拳+' + Math.round(this._tempCritBonus * 100) + '%', timer: 1 }); /* R185-P2: 显示铁拳暴击加成 */
    if (p._doubleCoinNextWave) buffs.push({ name: '🪙 双倍金币', timer: 1 });

    var container = document.getElementById('active-buffs-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'active-buffs-container';
        container.style.cssText = 'position:absolute;top:30px;right:10px;display:flex;flex-direction:column;gap:2px;z-index:50;pointer-events:none;';
        this.battlefield.appendChild(container);
    }
    /* R177-P1: 避免每帧JSON.stringify — 用哈希替代，仅含变化的字段 */
    var _bKey =
        (p._tempAtkBoost > 0 ? 'a' + Math.round(p._tempAtkBoost*100) : '') +
        (p._tempHpBonus > 0 ? 'h' + Math.round(p._tempHpBonus) : '') +
        (this._tempGoldMult > 1 ? 'g' + this._tempGoldMult : '') +
        (this._tempBerserkBonus ? 'b' : '') +
        (this._tempShield > 0 ? 's' + Math.round(this._tempShield) : '') +
        (this._tempCritBonus > 0 ? 'c' + Math.round(this._tempCritBonus*100) : '') + /* R185-P2: 铁拳buff纳入脏检查 */
        (p._doubleCoinNextWave ? 'd' : '');
    if (this._lastBuffKey === _bKey) return;
    this._lastBuffKey = _bKey;
    container.innerHTML = '';
    for (var i = 0; i < buffs.length; i++) {
        var b = buffs[i];
        var el = document.createElement('div');
        el.style.cssText = 'background:rgba(0,0,0,0.7);color:#ffd740;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;white-space:nowrap;border:1px solid rgba(255,215,0,0.3);';
        if (b.timer > 0 && b.timer < 999) {
            el.textContent = b.name + ' (' + Math.ceil(b.timer) + 's)';
        } else {
            el.textContent = b.name;
        }
        container.appendChild(el);
    }
};

/* Epoch 47: 局内里程碑提示 */
Gp._checkMilestones = function() {
    var shown = this._milestonesShown || new Set(); /* R187-P2: Set替代Array实现O(1)查找 */
    var milestones = [
        { id: 'kill_50', check: function() { return this.kills >= 50; }, msg: '🎯 击杀 50 — 势不可挡！' },
        { id: 'kill_100', check: function() { return this.kills >= 100; }, msg: '💀 击杀 100 — 传奇猎手！' },
        { id: 'wave_5', check: function() { return this._waveCount >= 5; }, msg: '🌊 第 5 波 — 坚持得很好！' },
        { id: 'wave_10', check: function() { return this._waveCount >= 10; }, msg: '🌊 第 10 波 — 坚不可摧！' },
        { id: 'overdrive_1', check: function() { return (this._overdriveCount || 0) >= 1; }, msg: '⚡ 首次 Overdrive — 力量觉醒！' },
        { id: 'overdrive_5', check: function() { return (this._overdriveCount || 0) >= 5; }, msg: '⚡ Overdrive ×5 — 狂怒之王！' },
        { id: 'lvl_5', check: function() { return this.player && this.player.currentLvl >= 5; }, msg: '⭐ 等级 5 — 战力飙升！' },
        { id: 'lvl_10', check: function() { return this.player && this.player.currentLvl >= 10; }, msg: '⭐ 等级 10 — 巅峰战力！' }
    ];
    for (var i = 0; i < milestones.length; i++) {
        var m = milestones[i];
        if (shown.has(m.id)) continue;
        if (m.check.call(this)) {
            shown.add(m.id);
            this._milestonesShown = shown;
            this._spawnCausalityText(m.msg);
        }
    }
};

/* R188-P0: 移除死代码 _flushAchievementsToMeta — _checkAchievement 直接写入 meta，无需额外flush */

})();
