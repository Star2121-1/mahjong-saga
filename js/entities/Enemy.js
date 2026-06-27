class Enemy {
    constructor(id, x, y, level, isBoss, type) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.level = level;
        this.isBoss = isBoss === true;
        this.type = type || 'Normal';
        this.el = null;

        const hpMult = Math.pow(1.1, level - 1);
        const atkMult = Math.pow(1.1, level - 1);

        this.maxHp = Math.floor(20 * hpMult);
        this.hp = this.maxHp;
        this.atk = Math.floor(5 * atkMult);
        this.speed = 40 + (level - 1) * 3;

        /* ── 无尽深渊指数暴涨 ── */
        var eng = window.gameEngine;
        var loopCount = (eng && eng.loopCount) || 0;
        if (loopCount > 0) {
            this.maxHp = Math.floor(this.maxHp * Math.pow(1.15, loopCount));
            this.hp = this.maxHp;
            this.atk = Math.floor(this.atk * Math.pow(1.15, loopCount));
            this.speed = Math.floor(this.speed * Math.pow(1.05, loopCount));
        }

        this.baseSpeed = this.speed;
        this.radius = 18;
        this.attackCooldown = 1.5;
        this.attackTimer = 0;
        this.reachedPlayer = false;
        this.hue = ((level - 1) * 47 + 17) % 360;
        this.frozen = false;
        this.frozenTimer = 0;
        this.flashTimer = 0;
        this._freezeHitDecayed = false;
        this._knockbackVelocity = 0;
        this.alive = true;
        this._totemBuffed = false;
        this._stalkerState = 'idle';
        this._stalkerTimer = 0;
        this._stalkerCooldown = 0;
        this._totemTimer = 0;
        this._bossPhase = 1;
        this._bossAbilityTimer = 0;
        this._bossWarningTimer = 0;
        this._bossWarningActive = false;
        this._bossWarningEl = null;
        this._bossEnraged = false;
        this._bossContactTimer = 0;

        if (this.type === 'Tanker') {
            this.speed = this.baseSpeed * 0.5;
            this.baseSpeed = this.speed;
            this.maxHp = Math.floor(this.maxHp * 2);
            this.hp = this.maxHp;
            this.radius = 26;
            this.hue = 40;
        } else if (this.type === 'Stalker') {
            this._stalkerState = 'idle';
            this._stalkerTimer = 0;
            this._stalkerCooldown = 0;
            this.hue = 280;
        } else if (this.type === 'Shaman') {
            this._totemTimer = 5;
            this.hue = 160;
        } else if (this.type === 'Boss_Lord') {
            this.radius = 70;
            this.maxHp = Math.floor(80 * hpMult);
            this.hp = this.maxHp;
            this.atk = Math.floor(30 * atkMult);
            this.speed = 20;
            this.baseSpeed = 20;
            this.hue = 0;
            this._bossPhase = 1;
            this._bossAbilityTimer = 1.8;
            this._bossWarningTimer = 0;
            this._bossWarningActive = false;
            this._bossWarningTargetX = 0;
            this._bossWarningTargetY = 0;
            this._bossWarningEl = null;
            this._bossEnraged = false;
            this._bossSummonTimer = 4;
            this._bossContactTimer = 0;
        }

        if (this.isBoss && this.type !== 'Boss_Lord') {
            this.radius = 45;
            this.maxHp = Math.floor(this.maxHp * 6);
            this.hp = this.maxHp;
            this.atk = Math.floor(this.atk * 2);
            this.speed *= 0.7;
            this.baseSpeed = this.speed;
            this.hue = 270;
        }
    }

    update(dt, player, engine) {
        if (!this.alive) return;
        this._freezeHitDecayed = false;
        this._knockbackVelocity = Math.max(0, this._knockbackVelocity - dt * 200);
        this.flashTimer = Math.max(0, this.flashTimer - dt);

        if (this.frozen) {
            this.frozenTimer -= dt;
            if (this.frozenTimer <= 0) {
                this.frozen = false;
                if (this.el) this.el.classList.remove('frozen-crystal');
            }
            if (this.type === 'Boss_Lord') {
                var hpPct = this.hp / this.maxHp;
                if (hpPct >= 0.7) this._bossPhase = 1;
                else if (hpPct >= 0.3) this._bossPhase = 2;
                else this._bossPhase = 3;
            }
            if (this.type === 'Stalker') this._stalkerCooldown -= dt;
            return;
        }

        if (this.type === 'Shaman') this._updateShaman(dt, player, engine);
        else if (this.type === 'Stalker') this._updateStalker(dt, player, engine);
        else if (this.type === 'Boss_Lord') this._updateBossLord(dt, player, engine);
        else this._updateNormal(dt, player, engine);
    }

    _updateNormal(dt, player, engine) {
        var dx = player.x - this.x;
        var dy = player.y - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var attackRange = 30 + this.radius;

        if (this.reachedPlayer) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.attackTimer = this.attackCooldown;
                if (dist <= attackRange + 5) {
                    this.flashTimer = 0.12;
                    var dmg = this.atk;
                    /* Epoch 14: 关卡亲和减伤 */
                    if (engine && engine._mapAffinityReduction) {
                        dmg = Math.max(1, Math.floor(dmg * (1 - engine._mapAffinityReduction)));
                    }
                    player.takeDamage(dmg, this);
                }
            }
            if (dist > attackRange + 5) this.reachedPlayer = false;
        }

        if (!this.reachedPlayer) {
            if (dist < attackRange) {
                this.reachedPlayer = true;
                this.attackTimer = this.attackCooldown;
            } else if (dist > 0.01) {
                var spd = this._totemBuffed ? this.speed * 1.3 : this.speed;
                var move = spd * dt;
                this.x += (dx / dist) * move;
                this.y += (dy / dist) * move;
                this._clampPosition(engine);
            }
        }
    }

    _updateStalker(dt, player, engine) {
        var dx = player.x - this.x;
        var dy = player.y - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var attackRange = 30 + this.radius;

        if (this._stalkerCooldown > 0) this._stalkerCooldown -= dt;

        if (dist <= 150 && this._stalkerState === 'idle' && this._stalkerCooldown <= 0) {
            this._stalkerState = 'charging';
            this._stalkerTimer = 1.5;
        }

        if (this._stalkerState === 'charging') {
            this._stalkerTimer -= dt;
            var chargeSpeed = this.baseSpeed * 2.5;
            chargeSpeed = this._totemBuffed ? chargeSpeed * 1.3 : chargeSpeed;
            if (dist > 0.01) {
                var move = chargeSpeed * dt;
                this.x += (dx / dist) * move;
                this.y += (dy / dist) * move;
                this._clampPosition(engine);
            }
            if (this.el) this.el.style.opacity = '0.4';
            if (this._stalkerTimer <= 0 || dist < attackRange) {
                this._stalkerState = 'fatigue';
                this._stalkerTimer = 3.0;
                if (this.el) this.el.style.opacity = '1';
                if (dist <= attackRange + 5) {
                    this.flashTimer = 0.12;
                    player.takeDamage(this._applyMapAffinityDmg(Math.floor(this.atk * 1.5), engine), this);
                }
            }
            return;
        }

        if (this._stalkerState === 'fatigue') {
            this._stalkerTimer -= dt;
            if (this._stalkerTimer <= 0) {
                this._stalkerState = 'idle';
                this._stalkerCooldown = 2.0;
            }
            if (this.reachedPlayer) {
                this.attackTimer -= dt;
                if (this.attackTimer <= 0) {
                    this.attackTimer = this.attackCooldown;
                    if (dist <= attackRange + 5) {
                        this.flashTimer = 0.12;
                        player.takeDamage(this._applyMapAffinityDmg(this.atk, engine), this);
                    }
                }
                if (dist > attackRange + 5) this.reachedPlayer = false;
            }
            if (!this.reachedPlayer && dist > 0.01) {
                var spd = this.baseSpeed * 0.5;
                spd = this._totemBuffed ? spd * 1.3 : spd;
                this.x += (dx / dist) * spd * dt;
                this.y += (dy / dist) * spd * dt;
                this._clampPosition(engine);
            }
            return;
        }

        if (this.reachedPlayer) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.attackTimer = this.attackCooldown;
                if (dist <= attackRange + 5) {
                    this.flashTimer = 0.12;
                    player.takeDamage(this._applyMapAffinityDmg(this.atk, engine), this);
                }
            }
            if (dist > attackRange + 5) this.reachedPlayer = false;
        }

        if (!this.reachedPlayer) {
            if (dist < attackRange) {
                this.reachedPlayer = true;
                this.attackTimer = this.attackCooldown;
            } else if (dist > 0.01) {
                var spd = this._totemBuffed ? this.speed * 1.3 : this.speed;
                this.x += (dx / dist) * spd * dt;
                this.y += (dy / dist) * spd * dt;
                this._clampPosition(engine);
            }
        }
    }

    _updateShaman(dt, player, engine) {
        var dx = player.x - this.x;
        var dy = player.y - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var attackRange = 30 + this.radius;

        this._totemTimer -= dt;
        if (this._totemTimer <= 0) {
            this._totemTimer = 5;
            if (engine) {
                var tel = document.createElement('div');
                tel.className = 'totem-pillar';
                tel.style.left = this.x + 'px';
                tel.style.top = this.y + 'px';
                engine._worldLayer.appendChild(tel);
                engine._totems.push({ x: this.x, y: this.y, radius: 100, el: tel });
            }
        }

        var retreatDist = 200;
        var advanceDist = 250;

        if (dist < retreatDist) {
            if (dist > 0.01) {
                var spd = this._totemBuffed ? this.speed * 1.3 : this.speed;
                this.x -= (dx / dist) * spd * dt;
                this.y -= (dy / dist) * spd * dt;
                this._clampPosition(engine);
            }
            return;
        }

        if (dist > advanceDist) {
            if (dist > 0.01) {
                var spd = this._totemBuffed ? this.speed * 1.3 : this.speed;
                this.x += (dx / dist) * spd * dt;
                this.y += (dy / dist) * spd * dt;
                this._clampPosition(engine);
            }
            return;
        }

        if (this.reachedPlayer) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.attackTimer = this.attackCooldown;
                if (dist <= attackRange + 5) {
                    this.flashTimer = 0.12;
                    player.takeDamage(this._applyMapAffinityDmg(this.atk, engine), this);
                }
            }
            if (dist > attackRange + 5) this.reachedPlayer = false;
        }

        if (!this.reachedPlayer && dist < attackRange) {
            this.reachedPlayer = true;
            this.attackTimer = this.attackCooldown;
        }
    }

    _updateBossLord(dt, player, engine) {
        var hpPct = this.hp / this.maxHp;
        var prevPhase = this._bossPhase;
        if (hpPct >= 0.7) this._bossPhase = 1;
        else if (hpPct >= 0.3) this._bossPhase = 2;
        else this._bossPhase = 3;

        if (prevPhase !== this._bossPhase) {
            if (this._bossPhase === 3 && !this._bossEnraged) {
                this._bossEnraged = true;
                this.speed = this.baseSpeed * 1.8;
                if (this.el) this.el.classList.add('boss-enraged');
                if (this._bossWarningActive) {
                    if (this._bossWarningEl && this._bossWarningEl.parentNode) this._bossWarningEl.remove();
                    this._bossWarningEl = null;
                    this._bossWarningActive = false;
                }
            }
            if (this._bossPhase === 2) {
                this._bossAbilityTimer = 0.5;
                if (this._bossWarningEl && this._bossWarningEl.parentNode) this._bossWarningEl.remove();
                this._bossWarningEl = null;
                this._bossWarningActive = false;
            }
        }

        this._bossContactTimer -= dt;
        this.attackTimer -= dt;

        /* ── Phase 1：弹幕压制 ── */
        if (this._bossPhase === 1) {
            this._bossAbilityTimer -= dt;
            if (this._bossAbilityTimer <= 0) {
                this._bossAbilityTimer = 1.8;
                if (engine && engine._enemyProjectiles) {
                    var spd = engine._bloodRageActive ? 120 : 100;
                    var dmg = Math.floor(this.atk);
                    for (var i = 0; i < 12; i++) {
                        var angle = (i / 12) * Math.PI * 2;
                        var p = {
                            x: this.x, y: this.y,
                            vx: Math.cos(angle) * spd,
                            vy: Math.sin(angle) * spd,
                            radius: 6, damage: dmg,
                            alive: true, lifeTime: 4, _hitPlayer: false, el: null
                        };
                        engine._enemyProjectiles.push(p);
                    }
                }
            }
            var dx = player.x - this.x;
            var dy = player.y - this.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 120 && dist > 0.01) {
                var spd = this.speed * dt;
                this.x += (dx / dist) * spd;
                this.y += (dy / dist) * spd;
                this._clampPosition(engine);
            }
            return;
        }

        /* ── Phase 2：砸地瞬移 ── */
        if (this._bossPhase === 2) {
            if (this._bossWarningActive) {
                this._bossWarningTimer -= dt;
                if (this._bossWarningTimer <= 0) {
                    this.x = this._bossWarningTargetX;
                    this.y = this._bossWarningTargetY;
                    this._clampPosition(engine);
                    var pdx = player.x - this.x;
                    var pdy = player.y - this.y;
                    if (pdx * pdx + pdy * pdy <= 120 * 120) {
                        player.takeDamage(this._applyMapAffinityDmg(Math.floor(this.atk * 2.5), engine), this);
                    }
                    if (this._bossWarningEl && this._bossWarningEl.parentNode) this._bossWarningEl.remove();
                    this._bossWarningEl = null;
                    this._bossWarningActive = false;
                    this._bossAbilityTimer = 3.0;
                }
            } else {
                this._bossAbilityTimer -= dt;
                if (this._bossAbilityTimer <= 0) {
                    this._bossWarningActive = true;
                    this._bossWarningTimer = 0.8;
                    this._bossWarningTargetX = player.x;
                    this._bossWarningTargetY = player.y;
                    var wel = document.createElement('div');
                    wel.className = 'boss-warning-zone';
                    wel.style.left = (player.x - 120) + 'px';
                    wel.style.top = (player.y - 120) + 'px';
                    engine._worldLayer.appendChild(wel);
                    this._bossWarningEl = wel;
                    var self = this;
                    setTimeout(function() {
                        if (self._bossWarningEl && self._bossWarningEl.parentNode) self._bossWarningEl.remove();
                        self._bossWarningEl = null;
                    }, 800);
                }
            }
            return;
        }

        /* ── Phase 3：狂暴血海 ── */
        if (this._bossPhase === 3) {
            var dx = player.x - this.x;
            var dy = player.y - this.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 30 && dist > 0.01) {
                var spd = this.speed * dt;
                this.x += (dx / dist) * spd;
                this.y += (dy / dist) * spd;
                this._clampPosition(engine);
            }
            this._bossSummonTimer -= dt;
            if (this._bossSummonTimer <= 0) {
                this._bossSummonTimer = 4;
                if (engine && typeof engine._spawnEnemyType === 'function') {
                    for (var si = 0; si < 4; si++) engine._spawnEnemyType('Stalker');
                    for (var ti = 0; ti < 2; ti++) engine._spawnEnemyType('Tanker');
                }
            }
        }

        /* ── 接触碰撞伤害 ── */
        var pdx = player.x - this.x;
        var pdy = player.y - this.y;
        var pDist = Math.sqrt(pdx * pdx + pdy * pdy);
        var totalR = player.radius + this.radius;
        if (pDist < totalR) {
            if (pDist > 0.01) {
                this.x -= (pdx / pDist) * 3;
                this.y -= (pdy / pDist) * 3;
                this._clampPosition(engine);
            }
            if (this._bossContactTimer <= 0) {
                this._bossContactTimer = 0.5;
                var contactDmg = this._bossEnraged ? Math.floor(this.atk * 2) : this.atk;
                player.takeDamage(this._applyMapAffinityDmg(contactDmg, engine), this);
            }
        }
    }

    _clampPosition(engine) {
        var margin = this.radius;
        this.x = Math.max(margin, Math.min(engine._mapW - margin, this.x));
        this.y = Math.max(margin, Math.min(engine._mapH - margin, this.y));
    }

    /* ── Epoch 14: 关卡亲和减伤辅助 ── */
    _applyMapAffinityDmg(dmg, engine) {
        if (engine && engine._mapAffinityReduction) {
            return Math.max(1, Math.floor(dmg * (1 - engine._mapAffinityReduction)));
        }
        return dmg;
    }

    takeDamage(dmg, source, sourceX, sourceY, _fctTypeOverride) {
        if (!this.alive) return false;
        var actualDmg = dmg;
        var isAssassinCrit = false;
        if (this.frozen) {
            actualDmg = Math.floor(dmg * 1.25);
            if (!this._freezeHitDecayed) {
                this.frozenTimer -= 0.25;
                this._freezeHitDecayed = true;
            }
            if (this.frozenTimer <= 0) {
                this.frozen = false;
                this.frozenTimer = 0;
            }
        }
        if (window.gameEngine && window.gameEngine.player && window.gameEngine.player.heroId === 'Assassin') {
            if (this.frozen || this._knockbackVelocity > 0) {
                actualDmg = Math.floor(actualDmg * 1.5);
                isAssassinCrit = true;
            }
        }
        if (this.type === 'Tanker') {
            var srcX = sourceX, srcY = sourceY;
            if ((srcX == null || srcY == null) && source && typeof source.x === 'number' && typeof source.y === 'number') {
                srcX = source.x;
                srcY = source.y;
            }
            if (srcX != null && srcY != null) {
                var toPlayerX = window.gameEngine.player.x - this.x;
                var toPlayerY = window.gameEngine.player.y - this.y;
                var toPlayerLen = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);
                if (toPlayerLen > 0.01) {
                    toPlayerX /= toPlayerLen;
                    toPlayerY /= toPlayerLen;
                }
                var fromSrcX = srcX - this.x;
                var fromSrcY = srcY - this.y;
                var fromSrcLen = Math.sqrt(fromSrcX * fromSrcX + fromSrcY * fromSrcY);
                if (fromSrcLen > 0.01) {
                    fromSrcX /= fromSrcLen;
                    fromSrcY /= fromSrcLen;
                }
                var dot = toPlayerX * fromSrcX + toPlayerY * fromSrcY;
                if (dot > 1e-10) actualDmg = Math.floor(actualDmg * 0.5);
            }
        }
        this.hp -= actualDmg;
        this.flashTimer = 0.12;

        /* ── FCT 喷射 ── */
        if (window.fxManager && actualDmg > 0) {
            var _fctType = _fctTypeOverride || 'normal';
            var _eng = window.gameEngine;
            if (isAssassinCrit) _fctType = 'crit';
            if (_eng && _eng._overdriveActive) _fctType = 'overdrive';
            if (this.frozen && _fctType === 'normal') _fctType = 'freeze';
            window.fxManager.spawnText(this.x, this.y - 10, '-' + actualDmg, _fctType);
            if (isAssassinCrit && _eng) _eng.triggerShake(2, 250);
        }
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            if (this.el) this.el.style.opacity = '1';
            var arr = window.expGems = window.expGems || [];
            var diff = 1;
            try { diff = window.levelConfig[window.gameEngine._currentLevelId].difficultyFactor || 1; } catch(e) { console.warn('diff config read error', e); }
            var _engRef = window.gameEngine;
            var _vaultBlood = _engRef && _engRef._vaultMutations && _engRef._vaultMutations.indexOf('bloodmoon') !== -1;
            var gemMul = (_engRef && _engRef._activeMutator === 'bloodmoon' || _vaultBlood) ? 2 : 1;
            if (this.isBoss) {
                var cnt = 5 + Math.floor(Math.random() * 4);
                var totalExp = 25 * gemMul;
                var avg = Math.floor(totalExp / cnt);
                var rem = totalExp - avg * cnt;
                for (var gi = 0; gi < cnt; gi++) {
                    var v = avg + (gi < rem ? 1 : 0);
                    arr.push(new window.ExpGem(this.x, this.y, v));
                }
            } else {
                var gemVal = Math.floor(1 * diff * gemMul);
                if (gemVal < 1) gemVal = 1;
                arr.push(new window.ExpGem(this.x, this.y, gemVal));
            }
            return true;
        }
        return false;
    }
}
