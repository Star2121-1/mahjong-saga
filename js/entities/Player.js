class Player {
    constructor(x, y, heroId) {
        this.heroId = heroId || 'Hero';
        this.x = x;
        this.y = y;
        this._initFromConfig();

        this.radius = Balance.PLAYER_RADIUS; // M-023: 匹配 CSS 48x64px 视觉边界
        this.speedMultiplier = 1.0;
        this.gold = 0;
        this.invulnTimer = 0;
        this.hitFlashTimer = 0; /* 独立受击闪烁计时器，与无敌帧分离 */
        this.critRate = 0;
        this._weaponCdReduction = 0; /* P1-3: 跨局冷却缩减清零 */
        this._tempBuffTimeLeft = undefined;
        this._tempAtkBoost = 0;
        this._tempHpBonus = 0;
        this._doubleCoinNextWave = false;
        this.hasDrone = false;
        this.droneTimer = 0;
        this.droneInterval = 0;
        this.thornsRate = 0;
        this.lifestealRate = 0;
        this.explosionChance = 0;
        this.freezeChance = 0;
        this.dodgeRate = 0;
        this.evolvedDrone = false;
        this.evolvedArmor = false;
        this.evolvedSpeed = false;
        this.evolvedVamp = false;
        this.maxWeaponSlots = 6;
        this.cdFloor = Balance.DEFAULT_CD_FLOOR;
        this.magnetRadius = Balance.MAGNET_RADIUS_DEFAULT;
        this._baseMagnetRadius = this.magnetRadius; /* P1: 保存基准值用于深渊引力combo */
        this.xpGainFactor = 1.0;
        this.iceDurationBonus = 0;
        this.rage = 0;
        this.maxRage = 100;
        this.setResonanceSpeed = false;
        this.setResonanceIce = false;
        this._thornCritX = undefined;
        this._thornCritY = undefined;
        this._healAmount = 0;
        this._dodgeSignal = false;
        this._dodgeAspdTimer = 0; /* A-030: 暗影步闪避后攻速加成计时 */
        this._thornsAffixBonus = 0;
        this.targetX = x;
        this.targetY = y;
        this._movingToTarget = false;
        this.currentLvl = 1;
        this.currentExp = 0;
        this.nextLvlExp = Balance.LEVEL_EXP_BASE;
        this.weaponSlots = [];
        this.relicLevels = {
            sharp_edge: 0,
            golden_finger: 0,
            auto_drone: 0,
            thorn_armor: 0,
            wind_walker: 0,
            vamp_ring: 0,
            explosive_core: 0,
            frost_core: 0,
            evolved_drone: 0,
            evolved_armor: 0,
            evolved_speed: 0,
            evolved_vamp: 0
        };
    }

    _initFromConfig() {
        const cfg = window.heroConfig[this.heroId];
        if (!cfg) {
            console.warn('[Player] 英雄配置缺失:', this.heroId, '— 使用默认值');
            this.maxHp = 100; this.hp = 100; this.atk = 10;
            this.baseSpeed = 180; this.speed = 180;
            this.hue = 0; this.baseDodge = 0; this.dodgeRate = 0;
            return;
        }
        this.maxHp = cfg.hp;
        this.hp = cfg.hp;
        this.atk = cfg.atk;
        this.baseSpeed = cfg.speed;
        this.speed = cfg.speed;
        this.hue = cfg.hue;
        this.baseDodge = cfg.baseDodge || 0;
        this.dodgeRate = this.baseDodge;
        /* 从 HeroConfig 读取英雄特有参数 */
        if (cfg.weaponSlots != null) this.maxWeaponSlots = cfg.weaponSlots;
        if (cfg.cdFloor != null) this.cdFloor = cfg.cdFloor;
        /* H-029: 雀灵流转 -- 攻击速度 +15% */
        if (this.heroId === 'Hero') {
            this.speed = this.baseSpeed * Balance.HERO_SPEED_BONUS;
        }
        /* Epoch 42: 雀灵流转 -- 武器CD -10% */
        if (this.heroId === 'Hero') {
            this.cdFloor = Math.max(0.05, this.cdFloor * Balance.HERO_CD_FLOOR_REDUCTION);
        }
        /* A-029: 暗影步 -- 10% 移速加成 */
        if (this.heroId === 'Assassin') {
            this.speedMultiplier += Balance.HERO_ASSASSIN_SPEED_MULT - 1;
            this.speed = this.baseSpeed * this.speedMultiplier;
        }
    }

    applyTechTree(techTree) {
        const tech = techTree || {};
        this.maxHp += (tech.life_enhancement || 0) * 10;
        this.hp = this.maxHp;
        this.atk += (tech.sharpening || 0) * 2;
        this.critRate += (tech.precision_training || 0) * 0.03;
    }

    update(dt, moveX, moveY, mapW, mapH) {
        /* Epoch 32: 临时HP增益 */
        var tempHpBonus = this._tempHpBonus || 0;
        if (tempHpBonus > 0) {
            this.maxHp = (this._baseMaxHp || this.maxHp) + tempHpBonus;
            this.hp = Math.min(this.hp + dt * 2, this.maxHp); /* 每秒回2HP */
        } else {
            this.maxHp = this._baseMaxHp || this.maxHp;
        }
        if (this.invulnTimer > 0) {
            this.invulnTimer -= dt;
            if (this.invulnTimer < 0) this.invulnTimer = 0;
        }
        /* H-030: hitFlashTimer 独立递减，与 invulnTimer 分离 */
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
            if (this.hitFlashTimer < 0) this.hitFlashTimer = 0;
        }

        if (moveX !== 0 || moveY !== 0) {
            this._movingToTarget = false;
            this.x += moveX * this.speed * dt;
            this.y += moveY * this.speed * dt;
        } else if (this._movingToTarget) {
            var dx = this.targetX - this.x;
            var dy = this.targetY - this.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 5) {
                this._movingToTarget = false;
            } else {
                var spd = this.speed * dt;
                this.x += (dx / dist) * spd;
                this.y += (dy / dist) * spd;
            }
        }

        this.x = Math.max(this.radius, Math.min(mapW - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(mapH - this.radius, this.y));

        /* A-030: 暗影步闪避后攻速加成计时 */
        if (this._dodgeAspdTimer > 0) {
            this._dodgeAspdTimer -= dt;
            if (this._dodgeAspdTimer < 0) this._dodgeAspdTimer = 0;
        }
    }

    takeDamage(dmg, attacker) {
        if (this.invulnTimer > 0) return false;

        if (this.dodgeRate > 0 && Math.random() < this.dodgeRate) {
            this._dodgeSignal = true;
            /* A-030: 暗影步 — 闪避后5秒内攻速+20% */
            if (this.heroId === 'Assassin') {
                this._dodgeAspdTimer = Balance.HERO_ASSASSIN_DODGE_ASPD_DURATION;
            }
            if (this.heroId === 'Knight' && window.gameEngine && typeof window.gameEngine._triggerKnightDodgeSlam === 'function') {
                window.gameEngine._triggerKnightDodgeSlam();
            }
            /* Epoch 3: 闪避计数 */
            if (window.gameEngine) {
                window.gameEngine._totalDodgesThisRun = (window.gameEngine._totalDodgesThisRun || 0) + 1;
                window.gameEngine._checkAchievementInflight('dodge_king', window.gameEngine._totalDodgesThisRun);
            }
            return false;
        }

        /* Epoch 2: 杠牌硬气减伤 */
        if (this.damageReduction > 0) {
            dmg = Math.max(1, Math.floor(dmg * (1 - this.damageReduction)));
        }

        /* L-008: 脆弱突变 — 受击伤害 +30% */
        if (this._frailtyDebuff) {
            dmg = Math.floor(dmg * Balance.MUTATOR_FRAILTY_DAMAGE_TAKEN_MULT);
        }

        if (dmg > 0 && window.audioManager) window.audioManager.play('hit');
        this.hp -= dmg;
        this.invulnTimer = Balance.PLAYER_INVULN_ON_HIT;
        this.hitFlashTimer = Balance.PLAYER_HITFLASH_DURATION; /* H-030: 与 Combat.js 归一化分母一致 */
        if (dmg > 0 && window.gameEngine && window.gameEngine._currentLevelId === 'level_1') {
            window.gameEngine.playerHitCountInLevel1++;
        }
        if (this.hp < 0) this.hp = 0;

        /* ── 玩家受击 FCT ── */
        if (dmg > 0 && window.fxManager) {
            window.fxManager.spawnText(this.x, this.y - 20, '-' + dmg, 'normal');
        }

        /* Epoch 46: 玩家受击屏幕震动 */
        if (dmg > 0 && window.gameEngine && typeof window.gameEngine.triggerShake === 'function') {
            window.gameEngine.triggerShake(1, 200);
        }

        /* Visual Enhancement D: 英雄受击抖动差异 */
        if (dmg > 0 && window.gameEngine && window.gameEngine.playerEl) {
            var ppe = window.gameEngine.playerEl;
            ppe.classList.remove('take-damage');
            void ppe.offsetWidth;
            ppe.classList.add('take-damage');
            setTimeout(function(el) { if (el) el.classList.remove('take-damage'); }, 200, ppe);
        }

        if (attacker && this.thornsRate > 0 && attacker.alive) {
            let thornDmg = Math.floor(dmg * this.thornsRate);
            if (this.evolvedArmor) {
                const isCrit = Math.random() < this.critRate;
                if (isCrit) {
                    thornDmg = Math.floor(thornDmg * Balance.THORN_CRIT_MULT);
                    this._thornCritX = attacker.x;
                    this._thornCritY = attacker.y;
                }
                /* 反伤伤害上限：不超过玩家 ATK 的 2 倍 */
                const thornCap = Math.floor(this.atk * Balance.THORNS_DAMAGE_CAP_MULT);
                if (thornDmg > thornCap) thornDmg = thornCap;
            }
            if ((this.evolvedVamp || this.thornsLifesteal) && this.lifestealRate > 0) {
                const heal = Math.floor(thornDmg * this.lifestealRate);
                if (heal > 0) {
                    this.hp = Math.min(this.maxHp, this.hp + heal);
                    this._healAmount += heal;
                }
            }
            attacker.takeDamage(thornDmg);
        }

        return this.hp <= 0;
    }

    /* ── Epoch 14: 复活检查 ── */
    shouldRevive(engine) {
        if (!this._hasRevive || !this._reviveCount || this._reviveCount <= 0) return false;
        this._reviveCount--;
        /* H-031: 使用 _baseMaxHp 计算复活血量，避免临时增益膨胀 */
        var baseHp = this._baseMaxHp || this.maxHp;
        this.hp = Math.floor(baseHp * Balance.REVIVE_HP_PERCENT);
        this.invulnTimer = Balance.REVIVE_INVULN_RESTORE_DURATION;
        if (this._reviveCount <= 0) this._hasRevive = false;
        return true;
    }

    addGold(amount) {
        this.gold += amount;
        if (this.gold < 0) this.gold = 0;
    }

    gainExp(amount) {
        this.currentExp += amount;
        var leveled = false;
        while (this.currentExp >= this.nextLvlExp) {
            this.currentExp -= this.nextLvlExp;
            this.currentLvl++;
            this.nextLvlExp = Balance.LEVEL_EXP_OFFSET + this.currentLvl * Balance.LEVEL_EXP_SCALE;
            this.atk += 2;
            this.maxHp += 10;
            this.hp += 10;
            /* H-031: _baseMaxHp 随升级同步增长，防止临时增益过期后 HP 丢失 */
            if (this._baseMaxHp) this._baseMaxHp += 10;
            leveled = true;
        }
        if (leveled && this.heroId === 'Mage') this._recalcThornsRate();
        return leveled;
    }

    _recalcThornsRate() {
        if (this.heroId !== 'Mage') return;
        /* Epoch 42: 九筒筒纹护体 — 基础反伤率 = 5% + 等级 * 5% */
        var lv = this.relicLevels.thorn_armor || 0;
        /* Mage 被动：即使没有 thorn_armor 也有 5% 基础反伤 */
        /* R30-H-019: evolvedArmor(太阳神巨像)时上限从50%提升至100% */
        var _thornCap = this.evolvedArmor ? 1.0 : 0.5;
        this.thornsRate = Math.min(_thornCap, 0.05 + lv * 0.05 + (this._thornsAffixBonus || 0));
    }

    addRelic(id) {
        this.relicLevels[id] = (this.relicLevels[id] || 0) + 1;
        const lv = Math.min(5, this.relicLevels[id]); /* P1: 圣物等级上限5级，防止无限叠加 */
        this.relicLevels[id] = lv;

        /* Epoch 33: 圣物随机词条 — 3级和5级时可能获得 */
        if (lv === 3 || lv === 5) {
            this._rollRelicAffix(id, lv);
        }

        switch (id) {
            case 'sharp_edge':
                this.atk += 3;
                break;
            case 'golden_finger':
                this.critRate = Math.min(1, this.critRate + Balance.RELIC_GOLDEN_FINGER_CRIT_INC);
                break;
            case 'auto_drone': {
                const intervals = Balance.DRONE_INTERVALS;
                this.hasDrone = true;
                this.droneInterval = intervals[Math.min(lv, 4)];
                this.droneTimer = 0;
                break;
            }
            case 'thorn_armor':
                this.maxHp += 20;
                this.hp += 20;
                this._recalcThornsRate();
                break;
            case 'wind_walker':
                this.speedMultiplier = 1.0 + lv * Balance.EVOLVED_SPEED_PER_LEVEL;
                this.speed = this.baseSpeed * this.speedMultiplier;
                break;
            case 'vamp_ring':
                this.lifestealRate = Math.min(Balance.MAX_LIFESTEAL_RATE, lv * Balance.LIFESTEAL_PER_VAMP_LEVEL);
                break;
            case 'explosive_core':
                this.explosionChance = Math.min(Balance.MAX_EXPLOSION_CHANCE, lv * Balance.EXPLOSION_PER_LEVEL);
                break;
            case 'frost_core':
                this.freezeChance = Math.min(Balance.MAX_FREEZE_CHANCE, lv * Balance.FREEZE_PER_LEVEL);
                break;
            case 'evolved_drone':
                this.evolvedDrone = true;
                break;
            case 'evolved_armor':
                this.evolvedArmor = true;
                /* P2: 太阳神巨像提供50%固定反伤，Mage被动在此基础上叠加 */
                var _baseThorns = 0.50;
                if (this.heroId === 'Mage') {
                    /* Mage被动在基础反伤之上增加，R38-P0: 包含affix加成防止丢失 */
                    this.thornsRate = Math.min(1.0, _baseThorns + (this.relicLevels.thorn_armor || 0) * 0.05 + (this._thornsAffixBonus || 0));
                } else {
                    this.thornsRate = _baseThorns;
                }
                break;
            case 'evolved_speed':
                this.evolvedSpeed = true;
                this.dodgeRate = Math.min(1, this.dodgeRate + Balance.EVOLVED_DODGE_BONUS);
                this.speedMultiplier += Balance.EVOLVED_DODGE_BONUS;
                this.speed = this.baseSpeed * this.speedMultiplier;
                break;
            case 'evolved_vamp':
                this.evolvedVamp = true;
                break;
            case 'gravity_core':
                this.magnetRadius = Math.min(Balance.MAX_MAGNET_RADIUS, (this.magnetRadius || Balance.MAGNET_RADIUS_DEFAULT) + 40);
                break;
            case 'weapon_amplify': {
                this.atk += 3;
                var eng = window.gameEngine;
                if (eng && eng._activeWeapons) {
                    for (var _wi = 0; _wi < eng._activeWeapons.length; _wi++) {
                        var w = eng._activeWeapons[_wi];
                        w.atkFactor += Balance.WEAPON_AMPLIFY_ATK_FACTOR_INC;
                        w.cd = Math.max(this.cdFloor || Balance.DEFAULT_CD_FLOOR, (w._baseCd || w.cd) * 0.9);
                    }
                }
                break;
            }
        }
    }

    /* ── Epoch 33: 圣物随机词条 ── */

    _rollRelicAffix(relicId, level) {
        var affixes = this._getRelicAffixPool(relicId);
        if (affixes.length === 0) return;
        var affix = affixes[Math.floor(Math.random() * affixes.length)];
        /* 存储词条到 player */
        this._relicAffixes = this._relicAffixes || {};
        this._relicAffixes[relicId] = this._relicAffixes[relicId] || [];
        if (this._relicAffixes[relicId].indexOf(affix.id) === -1) {
            this._relicAffixes[relicId].push(affix.id);
            affix.apply(this);
        }
    }

    _getRelicAffixPool(relicId) {
        /* 每个圣物有专属词条池 */
        var POOL = {
            sharp_edge: [
                { id: 'se_pierce', name: '穿透', apply: function(p) { p.atk += 5; } },
                { id: 'se_splash', name: '溅射', apply: function(p) { p.explosionChance = Math.min(1, (p.explosionChance || 0) + 0.15); } }
            ],
            golden_finger: [
                { id: 'gf_lifesteal', name: '吸血', apply: function(p) { p.lifestealRate = Math.min(0.8, (p.lifestealRate || 0) + 0.1); } },
                { id: 'gf_thorns', name: '反伤', apply: function(p) { p._thornsAffixBonus = (p._thornsAffixBonus || 0) + 0.1; p._recalcThornsRate(); } }
            ],
            thorn_armor: [
                { id: 'ta_hp', name: '坚韧', apply: function(p) { p.maxHp += 30; p.hp = Math.min(p.hp + 30, p.maxHp); } },
                { id: 'ta_crit', name: '暴击', apply: function(p) { p.critRate = Math.min(1, (p.critRate || 0) + 0.1); } }
            ],
            wind_walker: [
                { id: 'ww_dodge', name: '闪避', apply: function(p) { p.dodgeRate = Math.min(1, (p.dodgeRate || 0) + Balance.RELIC_WW_DODGE_PER_LEVEL); } },
                { id: 'ww_speed', name: '极速', apply: function(p) { p.speedMultiplier = (p.speedMultiplier || 1) + Balance.RELIC_WW_SPEED_PER_LEVEL; p.speed = p.baseSpeed * p.speedMultiplier; } }
            ],
            vamp_ring: [
                { id: 'vr_crit', name: '暴击', apply: function(p) { p.critRate = Math.min(1, (p.critRate || 0) + 0.1); } },
                { id: 'vr_atk', name: '强击', apply: function(p) { p.atk += 5; } }
            ],
            explosive_core: [
                { id: 'ec_range', name: '广域', apply: function(p) { p.magnetRadius = Math.min(Balance.MAX_MAGNET_RADIUS, (p.magnetRadius || Balance.MAGNET_RADIUS_DEFAULT) + 30); } },
                { id: 'ec_power', name: '强化', apply: function(p) { p.atk += 3; } }
            ],
            frost_core: [
                { id: 'fc_duration', name: '长效', apply: function(p) { p.iceDurationBonus = (p.iceDurationBonus || 0) + Balance.RELIC_FROST_CORE_DURATION_PER_LEVEL; } },
                { id: 'fc_chance', name: '极寒', apply: function(p) { p.freezeChance = Math.min(0.8, (p.freezeChance || 0) + 0.1); } }
            ],
            gravity_core: [
                { id: 'gc_xp', name: '慧根', apply: function(p) { p.xpGainFactor = Math.min(Balance.MAX_XP_GAIN_FACTOR, (p.xpGainFactor || 1) + 0.15); } },
                { id: 'gc_magnet', name: '巨吸', apply: function(p) { p.magnetRadius = Math.min(Balance.MAX_MAGNET_RADIUS, (p.magnetRadius || Balance.MAGNET_RADIUS_DEFAULT) + 50); } }
            ],
            weapon_amplify: [
                { id: 'wa_cd', name: '迅捷', apply: function(p) { var eng = window.gameEngine; if (eng && eng._activeWeapons) { for (var i = 0; i < eng._activeWeapons.length; i++) { eng._activeWeapons[i].cd = Math.max(eng.player.cdFloor || Balance.DEFAULT_CD_FLOOR, (eng._activeWeapons[i]._baseCd || eng._activeWeapons[i].cd) * 0.9); } } } },
                { id: 'wa_atk', name: '强化', apply: function(p) { p.atk += 5; } }
            ]
        };
        return POOL[relicId] || [];
    }

    snapshot() {
        return {
            heroId: this.heroId,
            x: this.x, y: this.y,
            hp: this.hp, maxHp: this.maxHp,
            atk: this.atk, gold: this.gold, hue: this.hue,
            critRate: this.critRate,
            dodgeRate: this.dodgeRate,
            baseDodge: this.baseDodge,
            speed: this.speed, baseSpeed: this.baseSpeed, speedMultiplier: this.speedMultiplier,
            lifestealRate: this.lifestealRate,
            explosionChance: this.explosionChance,
            freezeChance: this.freezeChance,
            thornsRate: this.thornsRate,
            hasDrone: this.hasDrone,
            droneTimer: this.droneTimer, droneInterval: this.droneInterval,
            evolvedDrone: this.evolvedDrone,
            evolvedArmor: this.evolvedArmor,
            evolvedSpeed: this.evolvedSpeed,
            evolvedVamp: this.evolvedVamp,
            thornsLifesteal: !!this.thornsLifesteal,
            invulnTimer: this.invulnTimer,
            hitFlashTimer: this.hitFlashTimer,
            currentLvl: this.currentLvl,
            currentExp: this.currentExp,
            nextLvlExp: this.nextLvlExp,
            relicLevels: { ...this.relicLevels },
            weaponSlots: this.weaponSlots.map(function(w) { return { id: w.id, level: w.level }; }),
            maxWeaponSlots: this.maxWeaponSlots,
            cdFloor: this.cdFloor,
            xpGainFactor: this.xpGainFactor,
            iceDurationBonus: this.iceDurationBonus,
            magnetRadius: this.magnetRadius,
            rage: this.rage,
            maxRage: this.maxRage,
            setResonanceSpeed: this.setResonanceSpeed,
            setResonanceIce: this.setResonanceIce,
            damageReduction: this.damageReduction,
            _reviveCount: this._reviveCount || 0,
            _baseMaxHp: this._baseMaxHp || this.maxHp,
            _relicAffixes: this._relicAffixes ? { ...this._relicAffixes } : {},
            _startsWithRelic: !!this._startsWithRelic,
            /* R51-P0: 补充缺失的持久化字段 — 避免断点续玩后暴击/复活/秘密丢失 */
            critDamageBonus: this.critDamageBonus || 0,
            _hasRevive: !!this._hasRevive,
            _discoveredSecrets: this._discoveredSecrets ? [...this._discoveredSecrets] : [],
            _tempBuffTimeLeft: this._tempBuffTimeLeft || 0,
            mapAffinityLevel: this.mapAffinityLevel || 0
        };
    }

    restore(data) {
        this.heroId = data.heroId || 'Hero';
        this._initFromConfig();
        this.x = data.x || 0; this.y = data.y || 0;
        this.gold = data.gold || 0;
        this.critRate = data.critRate || 0;
        this.baseDodge = data.baseDodge || 0;
        this.dodgeRate = data.dodgeRate || 0;
        this.speedMultiplier = data.speedMultiplier || 1.0;
        this.lifestealRate = data.lifestealRate || 0;
        this.explosionChance = data.explosionChance || 0;
        this.freezeChance = data.freezeChance || 0;
        this.thornsRate = data.thornsRate || 0;
        this.hasDrone = !!data.hasDrone;
        this.droneTimer = data.droneTimer || 0; this.droneInterval = data.droneInterval || 0;
        this.evolvedDrone = !!data.evolvedDrone;
        this.evolvedArmor = !!data.evolvedArmor;
        this.evolvedSpeed = !!data.evolvedSpeed;
        this.evolvedVamp = !!data.evolvedVamp;
        this.thornsLifesteal = !!data.thornsLifesteal;
        this.invulnTimer = data.invulnTimer || 0;
        this.hitFlashTimer = data.hitFlashTimer || 0;
        this.currentLvl = data.currentLvl || 1;
        this.currentExp = data.currentExp || 0;
        this.nextLvlExp = data.nextLvlExp || 15;

        this.hue = data.hue ?? this.hue;
        this.hp = data.hp ?? this.maxHp;
        this.maxHp = data.maxHp ?? this.maxHp;
        this.atk = data.atk ?? this.atk;
        this.speed = data.speed ?? this.speed;

        this.relicLevels = data.relicLevels ? { ...data.relicLevels } : {};
        this.weaponSlots = data.weaponSlots ? data.weaponSlots.map(function(w) { return { id: w.id, level: w.level }; }) : [];
        /* 从 HeroConfig 恢复英雄特有参数 */
        const cfg = window.heroConfig[this.heroId];
        if (cfg) {
            if (cfg.weaponSlots != null) this.maxWeaponSlots = cfg.weaponSlots;
            if (cfg.cdFloor != null) this.cdFloor = cfg.cdFloor;
        }
        this.maxWeaponSlots = data.maxWeaponSlots || this.maxWeaponSlots;
        this.cdFloor = data.cdFloor || this.cdFloor;
        this.xpGainFactor = data.xpGainFactor || 1.0;
        this.iceDurationBonus = data.iceDurationBonus || 0;
        this.magnetRadius = data.magnetRadius || Balance.MAGNET_RADIUS_DEFAULT;
        this.rage = data.rage || 0;
        this.maxRage = data.maxRage || 100;
        this.damageReduction = data.damageReduction || 0;
        this._reviveCount = data._reviveCount || 0;
        this._baseMaxHp = data._baseMaxHp || this.maxHp;
        this._relicAffixes = data._relicAffixes ? { ...data._relicAffixes } : {};
        this._startsWithRelic = !!data._startsWithRelic;
        this._hasRevive = this._reviveCount > 0;
        /* R51-P0: 恢复缺失的持久化字段 */
        this.critDamageBonus = data.critDamageBonus || 0;
        this._discoveredSecrets = data._discoveredSecrets ? [...data._discoveredSecrets] : [];
        this._tempBuffTimeLeft = data._tempBuffTimeLeft || 0;
        /* _hasRevive 由 meta perks 在 _reapplyMetaBonuses 中重新设置，此处仅初始化快照值 */
        if (!data._hasRevive && this._reviveCount <= 0) this._hasRevive = false;
        this.setResonanceSpeed = !!data.setResonanceSpeed;
        this.setResonanceIce = !!data.setResonanceIce;
        this.mapAffinityLevel = data.mapAffinityLevel || 0;
        this._thornCritX = undefined;
        this._thornCritY = undefined;
        this._healAmount = 0;
        this._dodgeSignal = false;
        this._dodgeAspdTimer = 0; /* A-030: 暗影步闪避后攻速加成计时 */
        this._thornsAffixBonus = 0;

        /* Epoch 23: restore 后重新应用天赋/声望/装备词缀 */
        this._skipRelicAffixes = true; /* P0: snapshot已含最终词条值，避免二次应用导致数值翻倍 */
        this._reapplyMetaBonuses(true); /* R51-P0: skip equip affixes — snapshot已含最终值 */
        this._skipRelicAffixes = false;
        if (this.heroId === 'Mage') this._recalcThornsRate();
    }

    /** 重新应用 meta 天赋/声望/perk 加成 (用于 restore 后) */
    _reapplyMetaBonuses(_skipEquipAffixes) {
        var meta = (window.saveManager && window.saveManager._metaCache) || {};
        var talents = meta.talents || {};
        /* 天赋加成 */
        var hpBoost = (talents.hu_patro || 0) * 20;
        var spdBoost = (talents.zimo_speed || 0) * 15;
        var magBoost = (talents.lian_magnet || 0) * 30;
        this.maxHp += hpBoost;
        this.hp = Math.min(this.hp + hpBoost, this.maxHp);
        this.speed += spdBoost;
        this.baseSpeed = this.speed;
        this.magnetRadius += magBoost;
        /* 装备词缀 */
        var sm = window.saveManager;
        var equipped = (sm && sm._metaCache && sm._metaCache.equipped) || { weapon: null, armor: null, talisman: null };
        var equipments = (sm && sm._metaCache && sm._metaCache.equipments) || [];
        var eqMap = {};
        for (var eqi = 0; eqi < equipments.length; eqi++) eqMap[equipments[eqi].instanceId] = equipments[eqi];
        var _eqBaseSpeed = this.baseSpeed; /* 保存基础速度，用于speed_pct上限钳制 */
        for (var slot in equipped) {
            var instanceId = equipped[slot];
            if (!instanceId) continue;
            var item = eqMap[instanceId];
            if (!item) continue;
            var base = item.base || {};
            this.maxHp += base.hp_boost || 0;
            this.hp = Math.min(this.hp, this.maxHp);
            this.magnetRadius += base.magnet_boost || 0;
            if (base.atk_factor) this.atk = Math.floor(this.atk * (1 + base.atk_factor));
            if (!_skipEquipAffixes && item.affixes) {
                for (var ai = 0; ai < item.affixes.length; ai++) {
                    var affix = item.affixes[ai];
                    if (affix.id === 'xp_gain') this.xpGainFactor += affix.val;
                    if (affix.id === 'ice_bonus') this.iceDurationBonus += affix.val;
                    if (affix.id === 'speed_pct') this.speed += _eqBaseSpeed * affix.val;
                }
            }
        }
        this.baseSpeed = this.speed;
        /* 装备词条汇总上限校验 */
        this.xpGainFactor = 1.0 + Math.min(Balance.MAX_XP_GAIN_PCT, this.xpGainFactor - 1.0);
        this.iceDurationBonus = Math.min(Balance.MAX_FREEZE_DURATION_BONUS, this.iceDurationBonus);
        this.speed = _eqBaseSpeed * Math.min(1 + Balance.MAX_SPEED_BONUS_PCT, this.speed / _eqBaseSpeed);
        /* 套装共鸣 */
        var affixCounts = {};
        for (var _asi = 0; _asi < equipments.length; _asi++) {
            var _aitem = eqMap[equipments[_asi].instanceId];
            if (!_aitem || !_aitem.affixes) continue;
            var _instId = equipments[_asi].instanceId;
            if (_instId !== equipped.weapon && _instId !== equipped.armor && _instId !== equipped.talisman) continue;
            for (var _aai = 0; _aai < _aitem.affixes.length; _aai++) {
                var _aff = _aitem.affixes[_aai];
                affixCounts[_aff.id] = (affixCounts[_aff.id] || 0) + 1;
            }
        }
        this.setResonanceSpeed = (affixCounts.speed_pct || 0) >= 3;
        this.setResonanceIce = (affixCounts.ice_bonus || 0) >= 3;
        /* 天赋额外加成 */
        this.critRate += (talents.ting_intuition || 0) * 0.02;
        this.damageReduction += (talents.gang_hardiness || 0) * 0.03;
        this.cdFloor = Math.max(0.05, (this.cdFloor || Balance.DEFAULT_CD_FLOOR) - (talents.mo_pa_cd || 0) * 0.01);
        /* perk */
        var perks = (meta.purchasedPerks || {});
        if (perks.token_revive > 0) {
            this._hasRevive = true;
            this._reviveCount = perks.token_revive;
        }
        if (perks.token_relic_start) this._startsWithRelic = true;
        this.mapAffinityLevel = perks.token_map_affinity || 0;
        /* Epoch 33: 应用圣物词条 — restore时跳过，snapshot已含最终值 */
        if (!this._skipRelicAffixes) this._applyRelicAffixes();
        /* R32-E-001: restore路径中跳过声望 — snapshot已含最终聚合值，避免双重应用 */
        /* 声望仅在reset()新游戏中应用，restore时by design不重复加 */
        // if (window.saveManager && window.saveManager.applyPrestigeBonus) {
        //     window.saveManager.applyPrestigeBonus(this);
        // }
    }

    /* ── Epoch 33: 应用圣物词条 ── */

    _applyRelicAffixes() {
        if (!this._relicAffixes) return;
        var affixDefs = this._getAllRelicAffixDefs();
        for (var relicId in this._relicAffixes) {
            var ids = this._relicAffixes[relicId];
            for (var i = 0; i < ids.length; i++) {
                var def = affixDefs[ids[i]];
                if (def) def.apply(this);
            }
        }
    }

    _getAllRelicAffixDefs() {
        var POOL = [
            { id: 'se_pierce', apply: function(p) { p.atk += 5; } },
            { id: 'se_splash', apply: function(p) { p.explosionChance = Math.min(1, (p.explosionChance || 0) + 0.15); } },
            { id: 'gf_lifesteal', apply: function(p) { p.lifestealRate = Math.min(0.8, (p.lifestealRate || 0) + 0.1); } },
            { id: 'gf_thorns', apply: function(p) { p._thornsAffixBonus = (p._thornsAffixBonus || 0) + 0.1; p._recalcThornsRate(); } },
            { id: 'ta_hp', apply: function(p) { p.maxHp += 30; p.hp = Math.min(p.hp + 30, p.maxHp); } },
            { id: 'ta_crit', apply: function(p) { p.critRate = Math.min(1, (p.critRate || 0) + 0.1); } },
            { id: 'ww_dodge', apply: function(p) { p.dodgeRate = Math.min(1, (p.dodgeRate || 0) + Balance.RELIC_WW_DODGE_PER_LEVEL); } },
            { id: 'ww_speed', apply: function(p) { p.speedMultiplier = (p.speedMultiplier || 1) + Balance.RELIC_WW_SPEED_PER_LEVEL; p.speed = p.baseSpeed * p.speedMultiplier; } },
            { id: 'vr_crit', apply: function(p) { p.critRate = Math.min(1, (p.critRate || 0) + 0.1); } },
            { id: 'vr_atk', apply: function(p) { p.atk += 5; } },
            { id: 'ec_range', apply: function(p) { p.magnetRadius = Math.min(Balance.MAX_MAGNET_RADIUS, (p.magnetRadius || Balance.MAGNET_RADIUS_DEFAULT) + 30); } },
            { id: 'ec_power', apply: function(p) { p.atk += 3; } },
            { id: 'fc_duration', apply: function(p) { p.iceDurationBonus = (p.iceDurationBonus || 0) + Balance.RELIC_FROST_CORE_DURATION_PER_LEVEL; } },
            { id: 'fc_chance', apply: function(p) { p.freezeChance = Math.min(0.8, (p.freezeChance || 0) + 0.1); } },
            { id: 'gc_xp', apply: function(p) { p.xpGainFactor = (p.xpGainFactor || 1) + 0.15; } },
            { id: 'gc_magnet', apply: function(p) { p.magnetRadius = Math.min(Balance.MAX_MAGNET_RADIUS, (p.magnetRadius || Balance.MAGNET_RADIUS_DEFAULT) + 50); } },
            { id: 'wa_cd', apply: function(p) { var eng = window.gameEngine; if (eng && eng._activeWeapons) { for (var i = 0; i < eng._activeWeapons.length; i++) { eng._activeWeapons[i].cd = Math.max(p.cdFloor || Balance.DEFAULT_CD_FLOOR, (eng._activeWeapons[i]._baseCd || eng._activeWeapons[i].cd) * 0.9); } } } },
            { id: 'wa_atk', apply: function(p) { p.atk += 5; } }
        ];
        var map = {};
        for (var i = 0; i < POOL.length; i++) map[POOL[i].id] = POOL[i];
        return map;
    }

    reset(heroId) {
        this.heroId = heroId || 'Hero';
        this._initFromConfig();

        /* ── 永久天赋加成 ── */
        var meta = (window.saveManager && window.saveManager._metaCache) || {};
        var talents = meta.talents || {};
        this.maxHp += (talents.hu_patro || 0) * 20;
        this.hp = this.maxHp;
        this.speed += (talents.zimo_speed || 0) * 15;
        this.baseSpeed = this.speed;
        this.magnetRadius += (talents.lian_magnet || 0) * 30;

        /* ── 装备属性聚合流 ── */
        this.xpGainFactor = 1.0;
        this.iceDurationBonus = 0;
        var sm = window.saveManager;
        var equipped = (sm && sm._metaCache && sm._metaCache.equipped) || { weapon: null, armor: null, talisman: null };
        var equipments = (sm && sm._metaCache && sm._metaCache.equipments) || [];
        var eqMap = {};
        for (var eqi = 0; eqi < equipments.length; eqi++) eqMap[equipments[eqi].instanceId] = equipments[eqi];
        var _eqBaseSpeed = this.baseSpeed; /* 保存基础速度，用于speed_pct上限钳制 */
        for (var slot in equipped) {
            var instanceId = equipped[slot];
            if (!instanceId) continue;
            var item = eqMap[instanceId];
            if (!item) continue;
            var base = item.base || {};
            this.maxHp += base.hp_boost || 0;
            this.hp = this.maxHp;
            this.magnetRadius += base.magnet_boost || 0;
            if (base.atk_factor) this.atk = Math.floor(this.atk * (1 + base.atk_factor));
            if (item.affixes) {
                for (var ai = 0; ai < item.affixes.length; ai++) {
                    var affix = item.affixes[ai];
                    if (affix.id === 'xp_gain') this.xpGainFactor += affix.val;
                    if (affix.id === 'ice_bonus') this.iceDurationBonus += affix.val;
                    if (affix.id === 'speed_pct') this.speed += _eqBaseSpeed * affix.val;
                }
            }
        }
        this.baseSpeed = this.speed;
        /* 装备词条汇总上限校验 */
        this.xpGainFactor = 1.0 + Math.min(Balance.MAX_XP_GAIN_PCT, this.xpGainFactor - 1.0);
        this.iceDurationBonus = Math.min(Balance.MAX_FREEZE_DURATION_BONUS, this.iceDurationBonus);
        this.speed = _eqBaseSpeed * Math.min(1 + Balance.MAX_SPEED_BONUS_PCT, this.speed / _eqBaseSpeed);

        /* 保存基础maxHp用于临时增益恢复（装备聚合完成后） */
        this._baseMaxHp = this.maxHp;
        this.baseSpeed = this.speed;

        /* ── 套装共鸣检测 ── */
        var affixCounts = {};
        for (var _asi = 0; _asi < equipments.length; _asi++) {
            var _aitem = eqMap[equipments[_asi].instanceId];
            if (!_aitem || !_aitem.affixes) continue;
            var _instId = equipments[_asi].instanceId;
            if (_instId !== equipped.weapon && _instId !== equipped.armor && _instId !== equipped.talisman) continue;
            for (var _aai = 0; _aai < _aitem.affixes.length; _aai++) {
                var _aff = _aitem.affixes[_aai];
                affixCounts[_aff.id] = (affixCounts[_aff.id] || 0) + 1;
            }
        }
        this.setResonanceSpeed = (affixCounts.speed_pct || 0) >= 3;
        this.setResonanceIce = (affixCounts.ice_bonus || 0) >= 3;

        this.gold = 0;
        this.invulnTimer = 0;
        this.hitFlashTimer = 0; /* 独立受击闪烁计时器，与无敌帧分离 */
        this.critRate = 0;
        this._weaponCdReduction = 0; /* P1-3: 跨局冷却缩减清零 */
        this._tempBuffTimeLeft = undefined;
        this._tempAtkBoost = 0;
        this._tempHpBonus = 0;
        this._doubleCoinNextWave = false;
        this.hasDrone = false;
        this.droneTimer = 0;
        this.droneInterval = 0;
        this.thornsRate = 0;
        this.lifestealRate = 0;
        this.explosionChance = 0;
        this.freezeChance = 0;
        this.evolvedDrone = false;
        this.evolvedArmor = false;
        this.evolvedSpeed = false;
        this.evolvedVamp = false;
        this.speedMultiplier = 1.0;
        this.speed = this.baseSpeed;
        /* H-029: 雀灵流转 -- reset 中恢复速度 */
        if (this.heroId === 'Hero') {
            this.speed = this.baseSpeed * Balance.HERO_SPEED_BONUS;
        }
        /* Epoch 42: 雀灵流转 -- reset 中恢复CD缩减 */
        if (this.heroId === 'Hero') {
            this.cdFloor = Math.max(0.05, this.cdFloor * Balance.HERO_CD_FLOOR_REDUCTION);
        }
        /* A-029: 暗影步 -- reset 中恢复速度 */
        if (this.heroId === 'Assassin') {
            this.speedMultiplier += Balance.HERO_ASSASSIN_SPEED_MULT - 1;
            this.speed = this.baseSpeed * this.speedMultiplier;
        }
        this.currentLvl = 1;
        this.currentExp = 0;
        this.nextLvlExp = Balance.LEVEL_EXP_BASE;
        this._thornCritX = undefined;
        this._thornCritY = undefined;
        this._healAmount = 0;
        this._dodgeSignal = false;
        this._dodgeAspdTimer = 0; /* A-030: 暗影步闪避后攻速加成计时 */
        this._thornsAffixBonus = 0;
        this._movingToTarget = false;
        this.weaponSlots = [];
        this.magnetRadius = Balance.MAGNET_RADIUS_DEFAULT;
        this._baseMagnetRadius = this.magnetRadius; /* P1: 保存基准值用于深渊引力combo */
        this.damageReduction = 0;
        this.rage = 0;
        this.maxRage = 100;

        /* Epoch 2: 新天赋开局加成（在全部重置后应用，避免被覆盖） */
        this.critRate += (talents.ting_intuition || 0) * 0.02;
        this.damageReduction += (talents.gang_hardiness || 0) * 0.03;
        this.cdFloor = Math.max(0.05, (this.cdFloor || Balance.DEFAULT_CD_FLOOR) - (talents.mo_pa_cd || 0) * 0.01);

        /* Epoch 14: 元货币购买加成 */
        var perks = (meta.purchasedPerks || {});
        if (perks.token_revive > 0) {
            this._hasRevive = true;
            this._reviveCount = perks.token_revive;
        }
        if (perks.token_relic_start) {
            this._startsWithRelic = true;
        }
        var mapAffinity = perks.token_map_affinity || 0;
        /* Epoch 16: 转生加成 */
        if (window.saveManager && window.saveManager.applyPrestigeBonus) {
            window.saveManager.applyPrestigeBonus(this);
        }
        this.mapAffinityLevel = mapAffinity;

        this.relicLevels = {
            sharp_edge: 0,
            golden_finger: 0,
            auto_drone: 0,
            thorn_armor: 0,
            wind_walker: 0,
            vamp_ring: 0,
            explosive_core: 0,
            frost_core: 0,
            evolved_drone: 0,
            evolved_armor: 0,
            evolved_speed: 0,
            evolved_vamp: 0
        };
        this._relicAffixes = {}; /* P3: 跨局清除词条残留 */
        this.critDamageBonus = 0; /* C2: 暴击伤害加成初始化为0 */
        if (this.heroId === 'Mage') this._recalcThornsRate();
        /* 从 HeroConfig 重置英雄特有参数 */
        const cfg = window.heroConfig[this.heroId];
        if (cfg) {
            if (cfg.weaponSlots != null) this.maxWeaponSlots = cfg.weaponSlots;
            if (cfg.cdFloor != null) this.cdFloor = cfg.cdFloor;
        }
    }
}
