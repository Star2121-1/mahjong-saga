window.Enemy = class Enemy {
    constructor(id, x, y, level, isBoss, type) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.level = level;
        this.isBoss = isBoss === true;
        this.type = type || 'Normal';
        this.el = null;

        const hpMult = Math.pow(Balance.ENEMY_LEVEL_HP_ATK_MULT, level - 1);
        const atkMult = Math.pow(Balance.ENEMY_LEVEL_HP_ATK_MULT, level - 1);

        this.maxHp = Math.floor(Balance.ENEMY_BASE_HP * hpMult);
        this.hp = this.maxHp;
        this.atk = Math.floor(Balance.ENEMY_BASE_ATK * atkMult);
        this.speed = 40 + (level - 1) * Balance.ENEMY_LEVEL_SPEED_SCALE;

        /* ── 无尽深渊指数暴涨 ── */
        var eng = window.gameEngine;
        var loopCount = (eng && eng.loopCount) || 0;
        if (loopCount > 0) {
            this.maxHp = Math.floor(this.maxHp * Math.pow(Balance.ABYSS_LOOP_HP_ATK_MULT, loopCount));
            this.hp = this.maxHp;
            this.atk = Math.floor(this.atk * Math.pow(Balance.ABYSS_LOOP_HP_ATK_MULT, loopCount));
            this.speed = Math.floor(this.speed * Math.pow(Balance.ABYSS_LOOP_SPEED_MULT, loopCount));
        }

        this.baseSpeed = this.speed;
        this.radius = Balance.ENEMY_RADIUS;
        this.attackCooldown = Balance.ENEMY_ATTACK_COOLDOWN;
        this.attackTimer = 0;
        this.reachedPlayer = false;
        this.hue = ((level - 1) * 47 + 17) % 360;
        this.frozen = false;
        this.frozenTimer = 0;
        /* B5: 掉牌花色倾向（雀魂系统联动） */
        this.suitBias = ({ Normal: 'wan', Stalker: 'tong', Tanker: 'tiao', Archer: 'tiao' })[this.type] || null;
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
        } else if (this.type === 'Barrier') {
            /* 屏障怪 — 正面无敌，需要绕后 */
            this.maxHp = Math.floor(this.maxHp * 1.5);
            this.hp = this.maxHp;
            this.atk = Math.floor(this.atk * 0.7);
            this.speed = this.baseSpeed * 0.8;
            this.baseSpeed = this.speed;
            this.hue = 200;
            this._barrierAngle = 0;
            this._barrierFront = true;
        } else if (this.type === 'Bomber') {
            /* 自爆怪 — 接近玩家后爆炸 */
            this.maxHp = Math.floor(this.maxHp * 0.6);
            this.hp = this.maxHp;
            this.atk = Math.floor(this.atk * 2);
            this.speed = this.baseSpeed * 1.8;
            this.baseSpeed = this.speed;
            this.hue = 30;
            this._exploded = false;
            this._explodeRadius = 60;
        } else if (this.type === 'Splitter') {
            /* 分身怪 — 死亡分裂成 2 个小怪 */
            this.maxHp = Math.floor(this.maxHp * 1.2);
            this.hp = this.maxHp;
            this.hue = 120;
            this._splitDone = false;
        } else if (this.type === 'Archer') {
            /* 一索箭妖 — 保距远程射手（B2） */
            this.maxHp = Math.floor(this.maxHp * Balance.ENEMY_ARCHER_HP_MULT);
            this.hp = this.maxHp;
            this.atk = Math.floor(this.atk * Balance.ENEMY_ARCHER_ATK_MULT);
            this.speed = this.baseSpeed * Balance.ENEMY_ARCHER_SPD_MULT;
            this.baseSpeed = this.speed;
            this.radius = 20;
            this.hue = 90;
            this._archerFireCd = 1.2 + Math.random();
            this._archerCharging = 0;
        } else if (this.type === 'Boss_Lord') {
            this.radius = 70;
            this.maxHp = Math.floor(80 * hpMult);
            this.hp = this.maxHp;
            this.atk = Math.floor(30 * atkMult);
            /* B4: 深渊变体阶梯（≥1赤鳞 / ≥2影武者 / ≥3灭世巨神） */
            var _lc = (window.gameEngine && window.gameEngine.loopCount) || 0;
            this._abyssTier = _lc >= 3 ? 3 : (_lc >= 2 ? 2 : (_lc >= 1 ? 1 : 0));
            if (this._abyssTier >= 3) this.radius = 84;
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
            /* R29-H-006: Boss_Lord 也需要应用 Abyss 倍增 */
            if (loopCount > 0) {
                this.maxHp = Math.floor(this.maxHp * Math.pow(Balance.ABYSS_LOOP_HP_ATK_MULT, loopCount));
                this.hp = this.maxHp;
                this.atk = Math.floor(this.atk * Math.pow(Balance.ABYSS_LOOP_HP_ATK_MULT, loopCount));
            }
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
                if (hpPct >= Balance.BOSS_PHASE1_THRESHOLD) this._bossPhase = 1;
                else if (hpPct >= Balance.BOSS_PHASE2_THRESHOLD) this._bossPhase = 2;
                else this._bossPhase = 3;
            }
            if (this.type === 'Stalker') this._stalkerCooldown -= dt;
            return;
        }

        /* B3: 盾甲半血裂纹演出 */
        if (this.type === 'Tanker' && this.el && !this._cracked && this.hp < this.maxHp * 0.5) {
            this._cracked = true;
            this.el.classList.add('tile-crack');
        }

        if (this.type === 'Shaman') this._updateShaman(dt, player, engine);
        else if (this.type === 'Barrier') this._updateBarrier(dt, player, engine);
        else if (this.type === 'Bomber') this._updateBomber(dt, player, engine);
        else if (this.type === 'Splitter') this._updateSplitter(dt, player, engine);
        else if (this.type === 'Stalker') this._updateStalker(dt, player, engine);
        else if (this.type === 'Archer') this._updateArcher(dt, player, engine);
        else if (this.type === 'Boss_Lord') this._updateBossLord(dt, player, engine);
        else this._updateNormal(dt, player, engine);
    }

    _updateNormal(dt, player, engine) {
        var dx = player.x - this.x;
        var dy = player.y - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var attackRange = Balance.ENEMY_ATTACK_RANGE_OFFSET + this.radius;

        if (this.reachedPlayer) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.attackTimer = this.attackCooldown;
                if (dist <= attackRange + Balance.ENEMY_ATTACK_PADDING) {
                    this.flashTimer = Balance.FLASH_DURATION;
                    var dmg = this.atk;
                    /* Epoch 14: 关卡亲和减伤 */
                    if (engine && engine._mapAffinityReduction) {
                        dmg = Math.max(1, Math.floor(dmg * (1 - engine._mapAffinityReduction)));
                    }
                    player.takeDamage(dmg, this);
                }
            }
            if (dist > attackRange + Balance.ENEMY_ATTACK_PADDING) this.reachedPlayer = false;
        }

        if (!this.reachedPlayer) {
            if (dist < attackRange) {
                this.reachedPlayer = true;
                this.attackTimer = this.attackCooldown;
            } else if (dist > 0.01) {
                var spd = this._totemBuffed ? this.speed * Balance.TOTEM_BUFF_SPEED_MULT : this.speed;
                var move = spd * dt;
                /* M-028: 限制单帧位移不超过到攻击边界的距离，防止越过攻击范围 */
                var toAttackEdge = dist - attackRange;
                if (move > toAttackEdge) move = toAttackEdge;
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
        var attackRange = Balance.ENEMY_ATTACK_RANGE_OFFSET + this.radius;

        if (this._stalkerCooldown > 0) this._stalkerCooldown -= dt;

        if (dist <= 150 && this._stalkerState === 'idle' && this._stalkerCooldown <= 0) {
            this._stalkerState = 'charging';
            this._stalkerTimer = 1.5;
            /* B3: 蓄力三重紫拖影 */
            if (this.el) this.el.classList.add('stalker-charging');
        }

        if (this._stalkerState === 'charging') {
            this._stalkerTimer -= dt;
            var chargeSpeed = this.baseSpeed * Balance.STALKER_CHARGE_SPEED_MULT;
            chargeSpeed = this._totemBuffed ? chargeSpeed * Balance.TOTEM_BUFF_SPEED_MULT : chargeSpeed;
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
                if (this.el) { this.el.style.opacity = '1'; this.el.classList.remove('stalker-charging'); }
                if (dist <= attackRange + Balance.ENEMY_ATTACK_PADDING) {
                    this.flashTimer = Balance.FLASH_DURATION;
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
                    if (dist <= attackRange + Balance.ENEMY_ATTACK_PADDING) {
                        this.flashTimer = Balance.FLASH_DURATION;
                        player.takeDamage(this._applyMapAffinityDmg(this.atk, engine), this);
                    }
                }
                if (dist > attackRange + Balance.ENEMY_ATTACK_PADDING) this.reachedPlayer = false;
            }
            if (!this.reachedPlayer && dist > 0.01) {
                var spd = this.baseSpeed * 0.5;
                spd = this._totemBuffed ? spd * Balance.TOTEM_BUFF_SPEED_MULT : spd;
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
                if (dist <= attackRange + Balance.ENEMY_ATTACK_PADDING) {
                    this.flashTimer = Balance.FLASH_DURATION;
                    player.takeDamage(this._applyMapAffinityDmg(this.atk, engine), this);
                }
            }
            if (dist > attackRange + Balance.ENEMY_ATTACK_PADDING) this.reachedPlayer = false;
        }

        if (!this.reachedPlayer) {
            if (dist < attackRange) {
                this.reachedPlayer = true;
                this.attackTimer = this.attackCooldown;
            } else if (dist > 0.01) {
                var spd = this._totemBuffed ? this.speed * Balance.TOTEM_BUFF_SPEED_MULT : this.speed;
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
        var attackRange = Balance.ENEMY_ATTACK_RANGE_OFFSET + this.radius;

        this._totemTimer -= dt;
        if (this._totemTimer <= 0) {
            this._totemTimer = 5;
            if (engine) {
                /* B3: 图腾二相化 — 风灵(增益)/北冥(减速领域)交替 */
                this._totemKind = (this._totemKind === 'frost') ? 'wind' : 'frost';
                var kind = this._totemKind;
                /* Epoch 16: 图腾上限 10，防止无限增长 */
                var existingTotems = engine._totems ? engine._totems.length : 0;
                if (existingTotems >= 10) {
                    /* 移除最早的图腾 */
                    var oldest = engine._totems.shift();
                    if (oldest && oldest.el && oldest.el.parentNode) oldest.el.remove();
                }
                var tel = document.createElement('div');
                tel.className = 'totem-pillar' + (kind === 'frost' ? ' frost' : '');
                tel.style.left = this.x + 'px';
                tel.style.top = this.y + 'px';
                engine._worldLayer.appendChild(tel);
                engine._totems.push({ x: this.x, y: this.y, radius: 100, el: tel, kind: kind, born: engine._elapsed || 0 });
            }
        }

        var retreatDist = 200;
        var advanceDist = 250;

        if (dist < retreatDist) {
            if (dist > 0.01) {
                var spd = this._totemBuffed ? this.speed * Balance.TOTEM_BUFF_SPEED_MULT : this.speed;
                this.x -= (dx / dist) * spd * dt;
                this.y -= (dy / dist) * spd * dt;
                this._clampPosition(engine);
            }
            return;
        }

        if (dist > advanceDist) {
            if (dist > 0.01) {
                var spd = this._totemBuffed ? this.speed * Balance.TOTEM_BUFF_SPEED_MULT : this.speed;
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
                if (dist <= attackRange + Balance.ENEMY_ATTACK_PADDING) {
                    this.flashTimer = Balance.FLASH_DURATION;
                    player.takeDamage(this._applyMapAffinityDmg(this.atk, engine), this);
                }
            }
            if (dist > attackRange + Balance.ENEMY_ATTACK_PADDING) this.reachedPlayer = false;
        }

        if (!this.reachedPlayer && dist < attackRange) {
            this.reachedPlayer = true;
            this.attackTimer = this.attackCooldown;
        }
    }

    /* ── Archer 一索箭妖 AI — 保距风筝 + 蓄力直线骨签（B2） ── */
    _updateArcher(dt, player, engine) {
        var B = Balance;
        /* 蓄力瞄准：站定，倒计时结束发射骨签 */
        if (this._archerCharging > 0) {
            this._archerCharging -= dt;
            if (this._archerCharging <= 0) {
                if (this.el) this.el.classList.remove('draw-aim');
                if (engine && engine._enemyProjectiles) {
                    var ang = Math.atan2(player.y - this.y, player.x - this.x);
                    var spd = B.ENEMY_ARCHER_PROJ_SPEED;
                    var p = {
                        x: this.x, y: this.y,
                        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                        radius: 5,
                        damage: Math.max(1, Math.floor(this._applyMapAffinityDmg(this.atk * B.ENEMY_ARCHER_DMG_MULT, engine))),
                        alive: true,
                        lifeTime: B.ENEMY_ARCHER_PROJ_RANGE / spd,
                        _hitPlayer: false, el: null
                    };
                    engine._enemyProjectiles.push(p);
                }
                return;
            }
            return; /* 蓄力期间不移动 */
        }
        var dx = player.x - this.x;
        var dy = player.y - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        /* 风筝走位 [KITE_MIN, KITE_MAX] */
        if (dist < B.ENEMY_ARCHER_KITE_MIN && dist > 0.01) {
            this.x -= (dx / dist) * this.speed * dt;
            this.y -= (dy / dist) * this.speed * dt;
            this._clampPosition(engine);
            return;
        }
        if (dist > B.ENEMY_ARCHER_KITE_MAX && dist > 0.01) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
            this._clampPosition(engine);
            return;
        }
        /* 射程带内：开火计时 */
        this._archerFireCd -= dt;
        if (this._archerFireCd <= 0) {
            this._archerFireCd = B.ENEMY_ARCHER_FIRE_INTERVAL;
            this._archerCharging = B.ENEMY_ARCHER_CHARGE_TIME;
            if (this.el) this.el.classList.add('draw-aim');
        }
    }

    /* ── Barrier 屏障怪 AI — 面向玩家保持无敌屏障 ── */
    _updateBarrier(dt, player, engine) {
        var dx = player.x - this.x;
        var dy = player.y - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var attackRange = Balance.ENEMY_ATTACK_RANGE_OFFSET + this.radius;

        /* 屏障朝向玩家 */
        this._barrierAngle = Math.atan2(dy, dx);

        /* 判断是否从正面（面对玩家的方向无敌） */
        var facingAngle = Math.atan2(-(player.y - this.y), -(player.x - this.x));
        var angleDiff = Math.abs(((facingAngle - this._barrierAngle) + Math.PI) % (Math.PI * 2) - Math.PI);
        this._barrierFront = angleDiff < Math.PI / 3; // 正面 60° 扇区无敌

        if (this.reachedPlayer) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.attackTimer = this.attackCooldown;
                if (dist <= attackRange + Balance.ENEMY_ATTACK_PADDING) {
                    this.flashTimer = Balance.FLASH_DURATION;
                    player.takeDamage(this._applyMapAffinityDmg(this.atk, engine), this);
                }
            }
            if (dist > attackRange + Balance.ENEMY_ATTACK_PADDING) this.reachedPlayer = false;
        }

        if (!this.reachedPlayer) {
            if (dist < attackRange) {
                this.reachedPlayer = true;
                this.attackTimer = this.attackCooldown;
            } else if (dist > 0.01) {
                var spd = this._totemBuffed ? this.speed * Balance.TOTEM_BUFF_SPEED_MULT : this.speed;
                var move = spd * dt;
                var toAttackEdge = dist - attackRange;
                if (move > toAttackEdge) move = toAttackEdge;
                this.x += (dx / dist) * move;
                this.y += (dy / dist) * move;
                this._clampPosition(engine);
            }
        }
    }

    /* ── Bomber 自爆怪 AI — 冲向玩家后爆炸 ── */
    _updateBomber(dt, player, engine) {
        var dx = player.x - this.x;
        var dy = player.y - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (this._exploded) return;

        /* 一直冲向玩家，不减速 */
        if (dist > 0.01) {
            var spd = this._totemBuffed ? this.speed * Balance.TOTEM_BUFF_SPEED_MULT : this.speed;
            this.x += (dx / dist) * spd * dt;
            this.y += (dy / dist) * spd * dt;
        }

        /* 到达爆炸半径 → 自爆 */
        if (dist <= this._explodeRadius) {
            this._exploded = true;
            this.alive = false;
            if (this.el) {
                this.el.style.opacity = '0';
                this.el.style.transform = 'scale(1.5)';
            }
            /* 爆炸伤害 */
            if (engine && engine._worldLayer) {
                var boom = document.createElement('div');
                boom.className = 'explosion-effect';
                boom.style.left = (this.x - 30) + 'px';
                boom.style.top = (this.y - 30) + 'px';
                boom.style.width = '60px';
                boom.style.height = '60px';
                engine._worldLayer.appendChild(boom);
                setTimeout(function(el) { if (el && el.parentNode) el.remove(); }, 350, boom);
            }
            /* 对范围内所有敌人造成伤害（不包括自己） */
            if (engine) {
                for (var ei = 0; ei < engine.enemies.length; ei++) {
                    var e = engine.enemies[ei];
                    if (!e.alive || e.id === this.id) continue;
                    var exdx = e.x - this.x;
                    var exdy = e.y - this.y;
                    var exdist = Math.sqrt(exdx * exdx + exdy * exdy);
                    if (exdist <= this._explodeRadius) {
                        e.takeDamage(Math.floor(this.atk * 0.5));
                    }
                }
                player.takeDamage(this.atk, this);
            }
            if (this.el && this.el.parentNode) this.el.remove();
        }
    }

    /* ── Splitter 分身怪 AI — 缓慢靠近，死亡分裂 ── */
    _updateSplitter(dt, player, engine) {
        var dx = player.x - this.x;
        var dy = player.y - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var attackRange = Balance.ENEMY_ATTACK_RANGE_OFFSET + this.radius;

        if (this.reachedPlayer) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.attackTimer = this.attackCooldown;
                if (dist <= attackRange + Balance.ENEMY_ATTACK_PADDING) {
                    this.flashTimer = Balance.FLASH_DURATION;
                    player.takeDamage(this._applyMapAffinityDmg(this.atk, engine), this);
                }
            }
            if (dist > attackRange + Balance.ENEMY_ATTACK_PADDING) this.reachedPlayer = false;
        }

        if (!this.reachedPlayer) {
            if (dist < attackRange) {
                this.reachedPlayer = true;
                this.attackTimer = this.attackCooldown;
            } else if (dist > 0.01) {
                var spd = this._totemBuffed ? this.speed * Balance.TOTEM_BUFF_SPEED_MULT : this.speed;
                this.x += (dx / dist) * spd * dt;
                this.y += (dy / dist) * spd * dt;
                this._clampPosition(engine);
            }
        }
    }

    /* ── BossLord 三阶段 ── */
    _updateBossLord(dt, player, engine) {
        var hpPct = this.hp / this.maxHp;
        var prevPhase = this._bossPhase;
        if (hpPct >= Balance.BOSS_PHASE1_THRESHOLD) this._bossPhase = 1;
        else if (hpPct >= Balance.BOSS_PHASE2_THRESHOLD) this._bossPhase = 2;
        else this._bossPhase = 3;
        /* B4: 深渊变体视觉（赤鳞 hue / 巨神尺寸） */
        if (this._abyssTier >= 1 && this.el && !this._abyssStyled) {
            this._abyssStyled = true;
            this.el.classList.add(this._abyssTier >= 3 ? 'abyss-boss-3' : (this._abyssTier === 2 ? 'abyss-boss-2' : 'abyss-boss-1'));
        }

        if (prevPhase !== this._bossPhase) {
            /* Epoch 38: Boss 阶段过渡庆祝 */
            var phaseLabels = { 1: 'Phase 1', 2: 'Phase 2 — 能力觉醒', 3: 'Phase 3 — 暴怒！' };
            var phaseColors = { 1: '#888', 2: '#ff9800', 3: '#b62929' };
            if (engine && engine._spawnCausalityText) {
                engine._spawnCausalityText('BOSS ' + phaseLabels[this._bossPhase], phaseColors[this._bossPhase]);
            }
            if (engine && engine.triggerShake) engine.triggerShake(1, 600);
            /* Visual Enhancement A: Boss 三阶段牌面颜色渐变 */
            if (this.el) {
                this.el.classList.remove('phase-1', 'phase-2', 'phase-3');
                this.el.classList.add('phase-' + this._bossPhase);
            }
            if (this._bossPhase === 3) {
                if (window.audioManager) window.audioManager.play('boss');
            }
            if (this._bossPhase === 3 && !this._bossEnraged) {
                this._bossEnraged = true;
                this.speed = this.baseSpeed * 1.8;
                if (this.el) this.el.classList.add('boss-enraged');
                /* B4: 血海沸腾 — 全场红雾 12s + Boss 血渍滴落 */
                if (engine && engine._battlefield && !engine._bossMistEl) {
                    var bMist = document.createElement('div');
                    bMist.className = 'abyss-red-mist boss-mist';
                    engine._battlefield.appendChild(bMist);
                    engine._bossMistEl = bMist;
                    setTimeout(function () {
                        if (bMist.parentNode) bMist.remove();
                        if (engine._bossMistEl === bMist) engine._bossMistEl = null;
                    }, 12000);
                }
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

        /* ── Phase 1：弹幕压制（B4: 每三轮一次蓄力齐射演出） ── */
        if (this._bossPhase === 1) {
            this._bossAbilityTimer -= dt;
            if (this._bossAbilityTimer <= 0) {
                this._bossAbilityTimer = 1.8 * (this._abyssTier >= 3 ? 0.85 : 1);
                var selfB = this;
                this._bossVolleyCount = (this._bossVolleyCount || 0) + 1;
                var spd = (engine && engine._bloodRageActive) ? 120 : 100;
                var baseDmg = Math.floor(this.atk);
                if (this._bossVolleyCount % 3 === 0) {
                    /* 蓄力 0.8s 后齐射 */
                    if (this.el) this.el.classList.add('p1-charging');
                    setTimeout(function () {
                        if (selfB.el) selfB.el.classList.remove('p1-charging');
                        if (!selfB.alive || !engine || !engine._enemyProjectiles) return;
                        selfB._fireRing(engine, 12, spd, 0, baseDmg);
                        if (selfB._abyssTier >= 1) selfB._fireRing(engine, 6, spd * 0.85, 0.26, baseDmg);
                    }, 800);
                } else {
                    this._fireRing(engine, 12, spd, 0, baseDmg);
                    if (this._abyssTier >= 1) this._fireRing(engine, 6, spd * 0.85, 0.26, baseDmg);
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
                    this._slamFx(engine); /* B4: 地裂余震 */
                    if (this._bossWarningEl && this._bossWarningEl.parentNode) this._bossWarningEl.remove();
                    this._bossWarningEl = null;
                    this._bossWarningActive = false;
                    this._bossAbilityTimer = 3.0 * (this._abyssTier >= 3 ? 0.85 : 1);
                }
            } else {
                this._bossAbilityTimer -= dt;
                if (this._bossAbilityTimer <= 0) {
                    this._bossWarningActive = true;
                    this._bossWarningTimer = 0.8;
                    this._bossWarningTargetX = player.x;
                    this._bossWarningTargetY = player.y;
                    var wz = (this._abyssTier >= 2) ? 84 : 120; /* B4: 影武者预警圈−30% */
                    var wel = document.createElement('div');
                    wel.className = 'boss-warning-zone';
                    wel.style.left = (player.x - wz) + 'px';
                    wel.style.top = (player.y - wz) + 'px';
                    if (wz !== 120) { wel.style.width = (wz * 2) + 'px'; wel.style.height = (wz * 2) + 'px'; }
                    engine._worldLayer.appendChild(wel);
                    this._bossWarningEl = wel;
                    var self = this;
                    setTimeout(function() {
                        if (self._bossWarningEl && self._bossWarningEl.parentNode) self._bossWarningEl.remove();
                        self._bossWarningEl = null;
                    }, 800);
                    /* B4: 影武者白板残影诱饵（3s 消散） */
                    if (this._abyssTier >= 2) {
                        var dec = document.createElement('div');
                        dec.className = 'boss-decoy';
                        dec.style.left = (player.x + (Math.random() > 0.5 ? 160 : -160)) + 'px';
                        dec.style.top = (player.y + (Math.random() > 0.5 ? 120 : -120)) + 'px';
                        dec.textContent = '白';
                        engine._worldLayer.appendChild(dec);
                        setTimeout(function () { if (dec.parentNode) dec.remove(); }, 3000);
                    }
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
                this._bossSummonTimer = 4 * (this._abyssTier >= 3 ? 0.85 : 1);
                if (engine && typeof engine._spawnEnemyType === 'function') {
                    for (var si = 0; si < 4; si++) engine._spawnEnemyType('Stalker');
                    for (var ti = 0; ti < 2; ti++) engine._spawnEnemyType('Tanker');
                    /* B4: 灭世巨神混编召唤 */
                    if (this._abyssTier >= 3) {
                        for (var ai = 0; ai < 2; ai++) engine._spawnEnemyType('Archer');
                        engine._spawnEnemyType('Shaman');
                    }
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
                /* M-029: 推挤与 dt 成比例，不再 FPS 依赖 */
                this.x -= (pdx / pDist) * this.speed * dt;
                this.y -= (pdy / pDist) * this.speed * dt;
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

    /* B4: 环形弹幕发射器（P1 齐射 / 深渊赤鳞双旋臂共用） */
    _fireRing(engine, count, speed, angleOffset, dmg) {
        if (!engine || !engine._enemyProjectiles) return;
        for (var i = 0; i < count; i++) {
            var angle = angleOffset + (i / count) * Math.PI * 2;
            var p = {
                x: this.x, y: this.y,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                radius: 6, damage: dmg,
                alive: true, lifeTime: 4, _hitPlayer: false, el: null
            };
            engine._enemyProjectiles.push(p);
        }
    }

    /* B4: 地裂余震（P2 落点演出：十字裂纹+红环+白闪+震屏） */
    _slamFx(engine) {
        if (!engine || !engine._worldLayer) return;
        var wl = engine._worldLayer;
        var crack = document.createElement('div');
        crack.className = 'ground-crack';
        crack.style.left = this.x + 'px';
        crack.style.top = this.y + 'px';
        wl.appendChild(crack);
        var ring = document.createElement('div');
        ring.className = 'boss-slam-ring';
        ring.style.left = this.x + 'px';
        ring.style.top = this.y + 'px';
        wl.appendChild(ring);
        var flash = document.createElement('div');
        flash.className = 'slam-flash';
        if (engine._battlefield) engine._battlefield.appendChild(flash);
        if (engine.triggerShake) engine.triggerShake(2, 300);
        setTimeout(function () {
            if (crack.parentNode) crack.remove();
            if (ring.parentNode) ring.remove();
            if (flash.parentNode) flash.remove();
        }, 800);
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
            if (srcX != null && srcY != null && window.gameEngine && window.gameEngine.player) {
                var toPlayerX = window.gameEngine.player.x - this.x;
                var toPlayerY = window.gameEngine.player.y - this.y;
                var toPlayerLen = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);
                if (toPlayerLen > 0.01) {
                    toPlayerX /= toPlayerLen;
                    toPlayerY /= toPlayerLen;
                } else {
                    /* M-010: 玩家正好在 Tanker 中心时，默认视为正面 */
                    toPlayerX = 1; toPlayerY = 0;
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
        /* K-029: 万子连击 -- 15% 几率造成额外 50% 伤害 */
        if (source === 'player' && window.gameEngine && window.gameEngine.player
            && window.gameEngine.player.heroId === 'Knight' && Math.random() < 0.15) {
            actualDmg = Math.floor(actualDmg * 1.5);
        }
        this.hp -= actualDmg;
        this.flashTimer = Balance.FLASH_DURATION;

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

            /* R30-L-006: 敌人死亡触发碎裂动画 */
            if (this.el && !this.isBoss) {
                this.el.classList.add('shatter-anim');
                /* 生成碎裂粒子 */
                var engRef2 = window.gameEngine;
                if (engRef2 && engRef2._worldLayer) {
                    for (var _sp2 = 0; _sp2 < 4; _sp2++) {
                        var shard = document.createElement('div');
                        shard.className = 'enemy-shard';
                        shard.style.left = this.x + 'px';
                        shard.style.top = this.y + 'px';
                        shard.style.setProperty('--sx', ((Math.random() - 0.5) * 60) + 'px');
                        shard.style.setProperty('--sy', ((Math.random() - 0.5) * 60) + 'px');
                        engRef2._worldLayer.appendChild(shard);
                        setTimeout(function(el) { if (el && el.parentNode) el.remove(); }, 500, shard);
                    }
                }
            }

            /* ── Splitter 分身怪: 死亡分裂成 2 个小怪 ── */
            if (this.type === 'Splitter' && !this._splitDone && window.gameEngine && window.gameEngine.enemies) {
                this._splitDone = true;
                var engRef = window.gameEngine;
                var childTypes = ['Normal', 'Normal', 'Tanker', 'Stalker'];
                for (var _sp = 0; _sp < 2; _sp++) {
                    var ct = childTypes[Math.floor(Math.random() * childTypes.length)];
                    var cid = ++engRef._enemyIdCounter;
                    var offsetX = (_sp === 0 ? -1 : 1) * 20;
                    var child = new window.Enemy(cid, this.x + offsetX, this.y + offsetX, this.level, false, ct);
                    child.maxHp = Math.floor(child.maxHp * 0.5);
                    child.hp = child.maxHp;
                    child.atk = Math.floor(child.atk * 0.5);
                    child.speed = child.baseSpeed * 1.2;
                    child.baseSpeed = child.speed;
                    engRef.enemies.push(child);
                    var cel = document.createElement('div');
                    cel.className = 'enemy';
                    cel.dataset.id = cid;
                    cel.dataset.enemyType = ct;
                    var suitMap = { 'Normal': '萬', 'Tanker': '條', 'Stalker': '筒', 'Shaman': '風' };
                    cel.setAttribute('data-suit', suitMap[ct] || '萬');
                    cel.style.opacity = '1';
                    var chpBar = document.createElement('div');
                    chpBar.className = 'enemy-hp-bar';
                    var chpFill = document.createElement('div');
                    chpFill.className = 'enemy-hp-fill';
                    chpBar.appendChild(chpFill);
                    cel.appendChild(chpBar);
                    engRef._worldLayer.appendChild(cel);
                    engRef._enemyElements.set(cid, cel);
                    child.el = cel;
                }
            }

            /* ── 掉落经验石 ── */
            var _engRef = window.gameEngine;
            var arr = _engRef._pendingExpGems = _engRef._pendingExpGems || [];
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
