(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

Gp._loop = function(timestamp) {
    if (!this.running || this.gameOver) return;
    try {
        /* Epoch 44: 懒初始化音频上下文（首次循环时尝试） */
        if (window.audioManager && !window.audioManager._initialized) {
            window.audioManager._ensureContext();
        }
        var dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
        var _skipToEnd = false;
        this._lastTime = timestamp;
        /* C2: 命中停顿 — 顿帧期间世界时间减速至15% */
        if (this._hitStopT > 0) {
            this._hitStopT -= dt;
            dt *= 0.15;
        }
        this._elapsed += dt;

        /* R29-H-005: speed_demon 成就 — 3分钟内通关 */
        this._checkAchievementInflight('speed_demon', this._elapsed);

        /* Epoch 32: 临时增益过期检查 — 使用游戏时间而非墙钟时间，避免面板冻结导致意外过期 */
        var p = this.player;
        if (p._tempBuffTimeLeft !== undefined && p._tempBuffTimeLeft > 0) {
            p._tempBuffTimeLeft -= dt;
            if (p._tempBuffTimeLeft <= 0) {
                p._tempAtkBoost = 0;
                p._tempHpBonus = 0;
                p._doubleCoinNextWave = false;
                p._tempBuffTimeLeft = 0;
            }
        }

        var input = this._getInputVector();
        this._lastMoveX = input.x;
        /* P1-7/P0-NEW 修复: 打牌/胡牌演出期间冻结逻辑，但必须维持 rAF 链（否则解锁后死锁） */
        if (this._discardMode || this._huLock) {
            this._syncEntities();
            this._syncUI();
            if (this.running && !this.gameOver) requestAnimationFrame(this._guardedLoop || this._boundLoop);
            return;
        }
        /* B3: 北冥图腾减速 — 移动期间临时降速，更新后还原 */
        var _spdSave = this.player.speed;
        if (this.player._frostSlowed) this.player.speed = _spdSave * 0.75;
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
                var interval = this.player.evolvedDrone ? 0.35 : this.player.droneInterval;
                this.player.droneTimer += dt;
                while (this.player.droneTimer >= interval) {
                    this.player.droneTimer -= interval;
                    if (this.player.evolvedDrone) {
                        var withDist = [];
                        for (var _di = 0; _di < this.enemies.length; _di++) {
                            var _e = this.enemies[_di];
                            if (!_e.alive) continue;
                            var _dx = _e.x - this.player.x;
                            var _dy = _e.y - this.player.y;
                            withDist.push({ e: _e, d: _dx * _dx + _dy * _dy });
                        }
                        withDist.sort(function(a,b) { if (a.d !== b.d) return a.d - b.d; return a.e.id - b.e.id; });
                        var targets = withDist.slice(0, 3);
                        for (var _ti = 0; _ti < targets.length; _ti++) targets[_ti].e.takeDamage(Math.max(1, Math.floor(this.player.atk * 0.6 * (1 + (this.player._tempAtkBoost || 0)))));
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
                        if (nearest) nearest.takeDamage(Math.max(1, Math.floor(this.player.atk * 0.4 * (1 + (this.player._tempAtkBoost || 0)))));
                    }
                }
            }

            var prevHp = this.player.hp;

            for (var _ei = 0; _ei < this.enemies.length; _ei++) {
                this.enemies[_ei].update(dt, this.player, this);
            }
            /* R30-H-015: 敌人间碰撞分离 — 防止堆叠穿模 */
            for (var _ci = 0; _ci < this.enemies.length; _ci++) {
                var _a = this.enemies[_ci];
                if (!_a.alive) continue;
                for (var _cj = _ci + 1; _cj < this.enemies.length; _cj++) {
                    var _b = this.enemies[_cj];
                    if (!_b.alive) continue;
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

            /* ── 图腾 buff 应用（Epoch 46: 网格空间分割优化） ── */
            for (var _toti = 0; _toti < this.enemies.length; _toti++) this.enemies[_toti]._totemBuffed = false;
            /* P2-7 真修: 复位移到 totems 分支外 — 防末图腾消失后减速标志永久残留 */
            this.player._frostSlowed = false;
            if (this._totems.length > 0) {
                /* B3: 图腾寿命到期清理（8s） */
                for (var _tex = this._totems.length - 1; _tex >= 0; _tex--) {
                    var _tt = this._totems[_tex];
                    if (_tt.born !== undefined && this._elapsed - _tt.born > 8) {
                        if (_tt.el && _tt.el.parentNode) _tt.el.remove();
                        this._totems.splice(_tex, 1);
                    }
                }
                /* B3: 北冥图腾减速领域（玩家进入 r100 内移速-25%） */
                for (var _tf = 0; _tf < this._totems.length; _tf++) {
                    var tf = this._totems[_tf];
                    if (tf.kind === 'frost') {
                        var fdx = this.player.x - tf.x, fdy = this.player.y - tf.y;
                        var fr = tf.radius || 100;
                        if (fdx * fdx + fdy * fdy < fr * fr) { this.player._frostSlowed = true; break; }
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
                    for (var dgx = -1; dgx <= 1; dgx++) {
                        for (var dgy = -1; dgy <= 1; dgy++) {
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
            if (!this._bossLordWave && !this._mutatorTriggered && this._activeMutator === null && this.currentWaveSpawnedCount > 0 && !this._pendingReward && !this._levelUpPending) {
                var cap = this._getWaveEnemyMax();
                if (cap > 0 && this.currentWaveSpawnedCount >= Math.ceil(cap * 0.5)) {
                    this._mutatorTriggered = true;
                    /* 委托给 Systems.showMutatorPanel — 突变触发 */
                    if (window.Systems) window.Systems.showMutatorPanel(this);
                }
            }

            /* Epoch 47: 深渊变异组合自动激活 */
            if (this.loopCount > 0 && this._abyssUnlockedCombos && this._abyssUnlockedCombos.length > 0 && !this._abyssActiveCombo) {
                /* 自动激活第一个未激活的组合 */
                var firstCombo = this._abyssUnlockedCombos[0];
                this._abyssActiveCombo = firstCombo;
                var comboName = '';
                for (var _ci = 0; _ci < this._abyssComboDefinitions.length; _ci++) {
                    if (this._abyssComboDefinitions[_ci].id === firstCombo) { comboName = this._abyssComboDefinitions[_ci].name; break; }
                }
                if (comboName) this._spawnCausalityText('🌀 自动激活深渊变异: ' + comboName);
            }

            /* Buff/Debuff 计时递减统一在上方 Epoch 32 块处理（修复双重递减 bug） */
            /* 护盾过期 — 使用游戏时间而非墙钟时间，避免面板冻结导致意外过期 */
            if (this._tempShieldEnd > 0 && this._elapsed > this._tempShieldEnd) {
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
                    this._spawnFloatText(this.player.x, this.player.y, '闪避!', true);
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
                        this._cleanEnemyProjectiles();
                        /* R30-H-016: Boss Lord死亡后清理金币/宝石，但不移除其他活敌 */
                        // 注：非Boss活敌由主死亡循环正常处理，此处仅清理掉落物和状态
                        for (var _lci = 0; _lci < this._activeCoins.length; _lci++) this._activeCoins[_lci].el.remove();
                        this._activeCoins = [];
                        if (this.bossHpBar) this.bossHpBar.classList.remove('active');
                        if (this._expGems.length > 0) {
                            this._pendingBossLordSettle = true;
                        } else {
                            this.running = false;
                            this.gameOver = true;
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
            if (this._waveCount >= 5 && !this._pendingReward) {
                this._rainTimer = (this._rainTimer || 0) + dt;
                if (this._rainTimer >= 0.05) {
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
                        this._rainDrops.push(drop);
                        setTimeout(function(el) { if (el && el.parentNode) el.remove(); }, 800, drop);
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
                this._playerHitCountThisRun++;
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
        if (!this._guideDismissed && this.enemies.length > (this._guidePrevEnemyCount || 0)) {
            /* 敌人减少了 = 被击杀了 = 有攻击 */
            this._guideHits = (this._guideHits || 0) + 1;
        }
        this._guidePrevEnemyCount = this.enemies.length;

        /* ── BossLord 死亡：等待经验石吸完后再结算 ── */
        if (this._pendingBossLordSettle && this._expGems.length === 0) {
            if (this._levelUpPending) {
                this._levelUpPending = false;
                this._pendingBossLordSettle = false; /* R30-H-012: 防止状态标志残留 */
                this.running = false;
                this._freezeClock();
                this._syncUI();
                if (window.rewardManager) window.rewardManager.showLevelUpPanel();
                return;
            }
            this._pendingBossLordSettle = false;
            this.running = false;
            this.gameOver = true;
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
            setTimeout(function(el) { if (el && el.parentNode) el.remove(); }, 600, glow);
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
        if (!this._pendingReward) this._updateEnemyProjectiles(dt);

        /* ── Overdrive 计时（游戏时间） ── */
        /* 设计决策：面板打开时游戏循环暂停，Overdrive 计时随之暂停。
           面板关闭后倒计时从剩余时间继续。不按真实时间流逝。 */
        if (this._overdriveActive) {
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
                }
            }
        }

        /* ── 套装共鸣：焰痕 + 永冻（委托给 Systems）── */
        if ((this.player.setResonanceSpeed || this.player.setResonanceIce) && !this._pendingReward) {
            if (this._systems && this._systems.updateResonanceAuras) {
                this._systems.updateResonanceAuras(this, dt);
            }
        }

        /* ── 突变·枯萎：全体敌人周期性损血 ── */
        if (this._activeMutator === 'wither' && !this._pendingReward) {
            /* Epoch 5: 委托枯萎到 Systems */
            if (this._systems && this._systems.updateWither) {
                this._systems.updateWither(this, dt);
            } else {
                this._witherTimer += dt;
                if (this._witherTimer >= 5) {
                    this._witherTimer = 0;
                    for (var _wi = 0; _wi < this.enemies.length; _wi++) {
                        var _we = this.enemies[_wi];
                        if (!_we.alive) continue;
                        var dmg = Math.max(1, Math.floor(_we.maxHp * 0.05));
                        _we.takeDamage(dmg, 'wither');
                    }
                }
            }
        }

        /* Epoch 47: 深渊变异组合效果持续应用 */
        if (this._abyssActiveCombo && !this._pendingReward) {
            var _abyssCombo = this._abyssActiveCombo;
            if (_abyssCombo === 'abyss_frenzy') {
                /* 深渊狂乱: 敌人攻速+100%（P1-5 修复：基于 baseSpeed 一次性派生，杜绝逐帧×2指数爆炸） */
                for (var _af = 0; _af < this.enemies.length; _af++) {
                    var _ae = this.enemies[_af];
                    if (_ae.alive && !_ae._frenzyApplied) {
                        _ae._frenzyApplied = true;
                        _ae.speed = Math.floor(_ae.baseSpeed * 2.0);
                    }
                }
                if (this.player.lifestealRate < 1) {
                    /* 击杀回血通过 _rewardKill 中的额外逻辑处理 */
                }
            } else if (_abyssCombo === 'abyss_gravity') {
                /* 深渊引力: 吸附×3（使用基准值，避免每帧累积） */
                var _baseMag = this.player._baseMagnetRadius || Balance.MAGNET_RADIUS_DEFAULT;
                this.player.magnetRadius = _baseMag * 3;
            } else if (_abyssCombo === 'abyss_frailty') {
                /* 深渊脆弱: 玩家攻击+150%，受伤+50% */
                if (this.player._abyssFrailtyAtk !== 2.5) {
                    /* R32-E-001: 备份原始ATK用于组合移除时还原 */
                    if (!this.player._abyssFrailtyOrigAtk) {
                        this.player._abyssFrailtyOrigAtk = this.player.atk;
                    }
                    this.player.atk = Math.floor(this.player._abyssFrailtyOrigAtk * 2.5);
                    this.player._abyssFrailtyAtk = 2.5;
                    this.player._frailtyDebuff = true;
                }
            } else if (_abyssCombo === 'abyss_bloodmoon') {
                /* 深渊血月: HP+60%, ATK+80%, 掉落×2 */
                if (!this.player._abyssBloodmoonApplied) {
                    this.player._abyssBloodmoonApplied = true;
                    /* Atk boost applied via _abyssLoopAtkScale in constructor already; additive here for clarity */
                    this.player.atk = Math.floor(this.player.atk * 1.8); /* Additional 80% atk on top of base scaling */
                    this.player._abyssBloodmoonAtkBonus = 1.8;
                }
            } else if (_abyssCombo === 'abyss_wither') {
                /* 深渊凋零: 每秒损失2%HP但生成等量护盾 */
                this._witherAbyssTimer = (this._witherAbyssTimer || 0) + dt;
                if (this._witherAbyssTimer >= 1) {
                    this._witherAbyssTimer = 0;
                    var drainPct = 0.02;
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
                this.running = false;
                this.gameOver = true;
                this._showVictory();
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

        if (!this._pendingReward && this.enemies.length === 0 && this._activeCoins.length === 0 && this._expGems.length === 0 && this.currentWaveSpawnedCount >= this._getWaveEnemyMax() && this._waveCount < this._getMaxWaves() - 1) {
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
        this.cameraX += (targetCamX - this.cameraX) * lerpFactor;
        this.cameraY += (targetCamY - this.cameraY) * lerpFactor;

        this._syncEntities();
        this._syncPlayerHP();
        this._syncUI();

        /* Epoch 47: 每3秒检查一次里程碑 */
        this._milestoneCheckTimer = (this._milestoneCheckTimer || 0) + dt;
        if (this._milestoneCheckTimer >= 3) {
            this._milestoneCheckTimer = 0;
            if (this._checkMilestones) this._checkMilestones();
        }
    } catch (err) { console.error('Game loop error:', err); }

    if (this.running && !this.gameOver) requestAnimationFrame(this._guardedLoop || this._boundLoop);
};

Gp._getMaxWaves = function() {
    var cfg = window.levelConfig[this._currentLevelId];
    return cfg ? cfg.maxWaves : 5;
};

Gp._getWaveEnemyMax = function() {
    var cfg = window.levelConfig[this._currentLevelId];
    if (!cfg || !cfg.waveEnemyMax) return 999;
    var idx = Math.min(this._waveCount, cfg.waveEnemyMax.length - 1);
    return cfg.waveEnemyMax[idx] || 999;
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
    if (p._doubleCoinNextWave) buffs.push({ name: '🪙 双倍金币', timer: 1 });

    var container = document.getElementById('active-buffs-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'active-buffs-container';
        container.style.cssText = 'position:absolute;top:30px;right:10px;display:flex;flex-direction:column;gap:2px;z-index:50;pointer-events:none;';
        this.battlefield.appendChild(container);
    }
    /* P1: 脏检查 — 仅在buff内容变化时重建DOM，避免每帧innerHTML全量重建 */
    var buffStr = JSON.stringify(buffs);
    if (this._lastBuffStr === buffStr) return;
    this._lastBuffStr = buffStr;
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
    var shown = this._milestonesShown || [];
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
        if (shown.indexOf(m.id) !== -1) continue;
        if (m.check.call(this)) {
            shown.push(m.id);
            this._milestonesShown = shown;
            this._spawnCausalityText(m.msg);
        }
    }
};

})();
