(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

Gp._loop = function(timestamp) {
    if (!this.running || this.gameOver) return;
    try {
        var dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
        var _skipToEnd = false;
        this._lastTime = timestamp;
        this._elapsed += dt;

        /* Epoch 32: 临时增益过期检查 */
        var p = this.player;
        if (p._tempBuffEnd && Date.now() / 1000 >= p._tempBuffEnd) {
            p._tempAtkBoost = 0;
            p._tempHpBonus = 0;
            p._doubleCoinNextWave = false;
            p._tempBuffEnd = 0;
        }

        var input = this._getInputVector();
        this._lastMoveX = input.x;
        this.player.update(dt, input.x, input.y, this._mapW, this._mapH);

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
                var interval = this.player.evolvedDrone ? 0.2 : this.player.droneInterval;
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
                        withDist.sort(function(a,b) { return a.d - b.d; });
                        var targets = withDist.slice(0, 3);
                        for (var _ti = 0; _ti < targets.length; _ti++) targets[_ti].e.takeDamage(24);
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
                        if (nearest) nearest.takeDamage(12);
                    }
                }
            }

            var prevHp = this.player.hp;

            for (var _ei = 0; _ei < this.enemies.length; _ei++) {
                this.enemies[_ei].update(dt, this.player, this);
            }

            /* ── 图腾 buff 应用 ── */
            for (var _toti = 0; _toti < this.enemies.length; _toti++) this.enemies[_toti]._totemBuffed = false;
            for (var _to = 0; _to < this._totems.length; _to++) {
                var t = this._totems[_to];
                for (var _tei = 0; _tei < this.enemies.length; _tei++) {
                    var te = this.enemies[_tei];
                    if (!te.alive) continue;
                    var tdx = te.x - t.x;
                    var tdy = te.y - t.y;
                    if (tdx * tdx + tdy * tdy < t.radius * t.radius) te._totemBuffed = true;
                }
            }

            /* ── 波次突变触发器（Boss Lord 波次跳过） ── */
            if (!this._bossLordWave && !this._mutatorTriggered && this._activeMutator === null && this.currentWaveSpawnedCount > 0) {
                var cap = this._getWaveEnemyMax();
                if (cap > 0 && this.currentWaveSpawnedCount >= Math.ceil(cap * 0.5)) {
                    this._mutatorTriggered = true;
                    this._showMutatorPanel();
                }
            }

            if (this.player._thornCritX !== undefined) {
                if (this._combat && this._combat.spawnFloatText) {
                    this._combat.spawnFloatText(this, this.player._thornCritX, this.player._thornCritY, '暴击反商!', true);
                } else {
                    this._spawnFloatText(this.player._thornCritX, this.player._thornCritY, '暴击反商!', true);
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

            var bossDied = [];
            for (var _ri = this.enemies.length - 1; _ri >= 0; _ri--) {
                var _re = this.enemies[_ri];
                if (!_re.alive) {
                    if (_re.isBoss) {
                        bossDied.push(_re);
                    } else {
                        this._rewardKill(_re);
                        this._removeEnemyDOM(_re);
                        this.enemies.splice(_ri, 1);
                    }
                }
            }

            if (bossDied.length) {
                var lordDead = false;
                for (var _bdi = 0; _bdi < bossDied.length; _bdi++) {
                    var _be = bossDied[_bdi];
                    if (_be.type === 'Boss_Lord') lordDead = true;
                    this._spawnCoinsAt(_be.x, _be.y, true, _be.level);
                    this._tryDropEquipment(_be.x, _be.y, _be.type === 'Boss_Lord');
                    this.kills++;
                    this._removeEnemyDOM(_be);
                    var _idx = this.enemies.indexOf(_be);
                    if (_idx !== -1) this.enemies.splice(_idx, 1);
                }
                if (lordDead) {
                    this.triggerShake(3, 500);
                    this._cleanEnemyProjectiles();
                    for (var _ldi = this.enemies.length - 1; _ldi >= 0; _ldi--) {
                        var _le = this.enemies[_ldi];
                        if (_le.alive) { this._removeEnemyDOM(_le); this.enemies.splice(_ldi, 1); }
                    }
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
                for (var _mi = this.enemies.length - 1; _mi >= 0; _mi--) {
                    var _me = this.enemies[_mi];
                    if (_me.alive) {
                        this._spawnCoinsAt(_me.x, _me.y, false, _me.level);
                        this._spawnExpGemsAt(_me.x, _me.y, false, _me.level);
                        this.kills++;
                        this._removeEnemyDOM(_me);
                        this.enemies.splice(_mi, 1);
                    }
                }
                this._pendingReward = true;
            }

            if (this.player.hp < prevHp) {
                /* Epoch 32: 临时护盾吸收 */
                if (this._tempShield > 0) {
                    var absorbed = Math.min(this._tempShield, prevHp - this.player.hp);
                    this._tempShield -= absorbed;
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + absorbed);
                    if (this._tempShield <= 0) this._tempShield = 0;
                }
                this._screenShake();
                this._playerHitCountThisRun++;
            }
        }

        this._updateCoins(dt);
        this._updateExpGems(dt);

        /* ── BossLord 死亡：等待经验石吸完后再结算 ── */
        if (this._pendingBossLordSettle && this._expGems.length === 0) {
            if (this._levelUpPending) {
                this._levelUpPending = false;
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

        this._updateWeapons(dt);
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
                    wl.style.transform = '';
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

        if (this.player.hp <= 0) {
            /* Epoch 14: 复活机会 */
            if (this.player.shouldRevive && this.player.shouldRevive(this)) {
                this._spawnCausalityText('💀 复活！元气恢复 30%');
                this.triggerShake(1.5, 500);
                /* Continue loop — rAF rescheduled at end of _loop */
                _skipToEnd = true;
            }
            if (_skipToEnd) { this._syncUI(); if (this.running && !this.gameOver) requestAnimationFrame(this._boundLoop); return; }
            this._gameOver();
            return;
        }

        if (this._levelUpPending && !this._pendingReward) {
            this._levelUpPending = false;
            this.running = false;
            this._freezeClock();
            this._syncUI();
            if (window.rewardManager) window.rewardManager.showLevelUpPanel();
            return;
        }

        if (this._pendingReward && this._activeCoins.length === 0 && this._expGems.length === 0) {
            if (this._levelUpPending) {
                this._levelUpPending = false;
                this.running = false;
                this._freezeClock();
                this._syncUI();
                if (window.rewardManager) window.rewardManager.showLevelUpPanel();
                return;
            }
            if (this._waveCount >= this._getMaxWaves() - 1) {
                this.running = false;
                this.gameOver = true;
                this._showVictory();
            } else {
                /* Epoch 32: 波次间事件 */
                if (this._waveCount >= 1 && Math.random() < 0.6) {
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
    } catch (err) { console.error('Game loop error:', err); }

    if (this.running && !this.gameOver) requestAnimationFrame(this._boundLoop);
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

})();
