class Player {
    constructor(x, y, heroId) {
        this.heroId = heroId || 'Knight';
        this.x = x;
        this.y = y;
        this._initFromConfig();

        this.radius = 20;
        this.speedMultiplier = 1.0;
        this.gold = 0;
        this.invulnTimer = 0;
        this.critRate = 0;
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
        this.cdFloor = 0.2;
        this.magnetRadius = 60;
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
        this.targetX = x;
        this.targetY = y;
        this._movingToTarget = false;
        this.currentLvl = 1;
        this.currentExp = 0;
        this.nextLvlExp = 25;
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
        const cfg = window.heroConfig[this.heroId] || window.heroConfig.hero_swordsman;
        this.maxHp = cfg.hp;
        this.hp = cfg.hp;
        this.atk = cfg.atk;
        this.baseSpeed = cfg.speed;
        this.speed = cfg.speed;
        this.hue = cfg.hue;
        this.baseDodge = cfg.baseDodge || 0;
        this.dodgeRate = this.baseDodge;
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
    }

    takeDamage(dmg, attacker) {
        if (this.invulnTimer > 0) return false;

        if (this.dodgeRate > 0 && Math.random() < this.dodgeRate) {
            this._dodgeSignal = true;
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

        this.hp -= dmg;
        this.invulnTimer = 0.35;
        if (dmg > 0 && window.gameEngine && window.gameEngine._currentLevelId === 'level_1') {
            window.gameEngine.playerHitCountInLevel1++;
        }
        if (this.hp < 0) this.hp = 0;

        /* ── 玩家受击 FCT ── */
        if (dmg > 0 && window.fxManager) {
            window.fxManager.spawnText(this.x, this.y - 20, '-' + dmg, 'normal');
        }

        if (attacker && this.thornsRate > 0 && attacker.alive) {
            let thornDmg = Math.floor(dmg * this.thornsRate);
            if (this.evolvedArmor) {
                const isCrit = Math.random() < this.critRate;
                if (isCrit) {
                    thornDmg = Math.floor(thornDmg * 2.5);
                    this._thornCritX = attacker.x;
                    this._thornCritY = attacker.y;
                }
            }
            if (this.evolvedVamp && this.lifestealRate > 0) {
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
        this.hp = Math.floor(this.maxHp * 0.3);
        this.invulnTimer = 3.0;
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
            this.nextLvlExp = 15 + this.currentLvl * 10;
            this.atk += 2;
            this.maxHp += 10;
            this.hp += 10;
            leveled = true;
        }
        return leveled;
    }

    addRelic(id) {
        this.relicLevels[id] = (this.relicLevels[id] || 0) + 1;
        const lv = this.relicLevels[id];

        /* Epoch 33: 圣物随机词条 — 3级和5级时可能获得 */
        if (lv === 3 || lv === 5) {
            this._rollRelicAffix(id, lv);
        }

        switch (id) {
            case 'sharp_edge':
                this.atk += 3;
                break;
            case 'golden_finger':
                this.critRate = Math.min(1, this.critRate + 0.15);
                break;
            case 'auto_drone': {
                const intervals = [0, 1.0, 0.8, 0.6, 0.4];
                this.hasDrone = true;
                this.droneInterval = intervals[Math.min(lv, 4)];
                this.droneTimer = 0;
                break;
            }
            case 'thorn_armor':
                this.maxHp += 20;
                this.hp += 20;
                this.thornsRate = Math.min(1, this.thornsRate + 0.1);
                break;
            case 'wind_walker':
                this.speedMultiplier = 1.0 + lv * 0.12;
                this.speed = this.baseSpeed * this.speedMultiplier;
                break;
            case 'vamp_ring':
                this.lifestealRate = Math.min(0.8, lv * 0.08);
                break;
            case 'explosive_core':
                this.explosionChance = Math.min(0.75, lv * 0.15);
                break;
            case 'frost_core':
                this.freezeChance = Math.min(0.5, lv * 0.10);
                break;
            case 'evolved_drone':
                this.evolvedDrone = true;
                break;
            case 'evolved_armor':
                this.evolvedArmor = true;
                this.thornsRate = 1.0;
                break;
            case 'evolved_speed':
                this.evolvedSpeed = true;
                this.dodgeRate = Math.min(1, this.dodgeRate + 0.3);
                this.speedMultiplier += 0.3;
                this.speed = this.baseSpeed * this.speedMultiplier;
                break;
            case 'evolved_vamp':
                this.evolvedVamp = true;
                break;
            case 'gravity_core':
                this.magnetRadius += 40;
                break;
            case 'weapon_amplify': {
                this.atk += 3;
                var eng = window.gameEngine;
                if (eng && eng._activeWeapons) {
                    for (var _wi = 0; _wi < eng._activeWeapons.length; _wi++) {
                        var w = eng._activeWeapons[_wi];
                        w.atkFactor += 0.2;
                        w.cd = Math.max(this.cdFloor || 0.2, w.cd * 0.95);
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
                { id: 'gf_thorns', name: '反伤', apply: function(p) { p.thornsRate = Math.min(1, (p.thornsRate || 0) + 0.1); } }
            ],
            thorn_armor: [
                { id: 'ta_hp', name: '坚韧', apply: function(p) { p.maxHp += 30; p.hp = Math.min(p.hp + 30, p.maxHp); } },
                { id: 'ta_crit', name: '暴击', apply: function(p) { p.critRate = Math.min(1, (p.critRate || 0) + 0.1); } }
            ],
            wind_walker: [
                { id: 'ww_dodge', name: '闪避', apply: function(p) { p.dodgeRate = Math.min(1, (p.dodgeRate || 0) + 0.1); } },
                { id: 'ww_speed', name: '极速', apply: function(p) { p.speedMultiplier = (p.speedMultiplier || 1) + 0.15; p.speed = p.baseSpeed * p.speedMultiplier; } }
            ],
            vamp_ring: [
                { id: 'vr_crit', name: '暴击', apply: function(p) { p.critRate = Math.min(1, (p.critRate || 0) + 0.1); } },
                { id: 'vr_atk', name: '强击', apply: function(p) { p.atk += 5; } }
            ],
            explosive_core: [
                { id: 'ec_range', name: '广域', apply: function(p) { p.magnetRadius = (p.magnetRadius || 60) + 30; } },
                { id: 'ec_power', name: '强化', apply: function(p) { p.atk += 3; } }
            ],
            frost_core: [
                { id: 'fc_duration', name: '长效', apply: function(p) { p.iceDurationBonus = (p.iceDurationBonus || 0) + 0.5; } },
                { id: 'fc_chance', name: '极寒', apply: function(p) { p.freezeChance = Math.min(0.8, (p.freezeChance || 0) + 0.1); } }
            ],
            gravity_core: [
                { id: 'gc_xp', name: '慧根', apply: function(p) { p.xpGainFactor = (p.xpGainFactor || 1) + 0.15; } },
                { id: 'gc_magnet', name: '巨吸', apply: function(p) { p.magnetRadius = (p.magnetRadius || 60) + 50; } }
            ],
            weapon_amplify: [
                { id: 'wa_cd', name: '迅捷', apply: function(p) { var eng = window.gameEngine; if (eng && eng._activeWeapons) { for (var i = 0; i < eng._activeWeapons.length; i++) { eng._activeWeapons[i].cd = Math.max(eng.player.cdFloor || 0.2, eng._activeWeapons[i].cd * 0.9); } } } },
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
            invulnTimer: this.invulnTimer,
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
            _relicAffixes: this._relicAffixes ? { ...this._relicAffixes } : {}
        };
    }

    restore(data) {
        this.heroId = data.heroId || 'Knight';
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
        this.invulnTimer = data.invulnTimer || 0;
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
        this.maxWeaponSlots = data.maxWeaponSlots || 6;
        this.cdFloor = data.cdFloor || 0.2;
        this.xpGainFactor = data.xpGainFactor || 1.0;
        this.iceDurationBonus = data.iceDurationBonus || 0;
        this.magnetRadius = data.magnetRadius || 60;
        this.rage = data.rage || 0;
        this.maxRage = data.maxRage || 100;
        this.damageReduction = data.damageReduction || 0;
        this._reviveCount = data._reviveCount || 0;
        this._baseMaxHp = data._baseMaxHp || this.maxHp;
        this._relicAffixes = data._relicAffixes ? { ...data._relicAffixes } : {};
        this._hasRevive = this._reviveCount > 0;
        this.setResonanceSpeed = !!data.setResonanceSpeed;
        this.setResonanceIce = !!data.setResonanceIce;
        this._thornCritX = undefined;
        this._thornCritY = undefined;
        this._healAmount = 0;
        this._dodgeSignal = false;

        /* Epoch 23: restore 后重新应用天赋/声望/装备词缀 */
        this._reapplyMetaBonuses();
    }

    /** 重新应用 meta 天赋/声望/perk 加成 (用于 restore 后) */
    _reapplyMetaBonuses() {
        var meta = (window.saveManager && window.saveManager._metaCache) || {};
        var talents = meta.talents || {};
        /* 天赋加成 */
        var hpBoost = (talents.health_boost || 0) * 20;
        var spdBoost = (talents.speed_boost || 0) * 15;
        var magBoost = (talents.magnet_boost || 0) * 30;
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
            if (item.affixes) {
                for (var ai = 0; ai < item.affixes.length; ai++) {
                    var affix = item.affixes[ai];
                    if (affix.id === 'xp_gain') this.xpGainFactor += affix.val;
                    if (affix.id === 'ice_bonus') this.iceDurationBonus += affix.val;
                    if (affix.id === 'speed_pct') this.speed *= (1 + affix.val);
                }
            }
        }
        this.baseSpeed = this.speed;
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
        this.critRate += (talents.listening_intuition || 0) * 0.02;
        this.damageReduction += (talents.gangpai_hardiness || 0) * 0.03;
        this.cdFloor = Math.max(0.05, (this.cdFloor || 0.2) - (talents['摸牌_speed'] || 0) * 0.01);
        /* perk */
        var perks = (meta.purchasedPerks || {});
        if (perks.token_revive > 0) {
            this._hasRevive = true;
            this._reviveCount = perks.token_revive;
        }
        if (perks.token_relic_start) this._startsWithRelic = true;
        this.mapAffinityLevel = perks.token_map_affinity || 0;
        /* Epoch 33: 应用圣物词条 */
        this._applyRelicAffixes();
        /* 声望 */
        if (window.saveManager && window.saveManager.applyPrestigeBonus) {
            window.saveManager.applyPrestigeBonus(this);
        }
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
            { id: 'gf_thorns', apply: function(p) { p.thornsRate = Math.min(1, (p.thornsRate || 0) + 0.1); } },
            { id: 'ta_hp', apply: function(p) { p.maxHp += 30; p.hp = Math.min(p.hp + 30, p.maxHp); } },
            { id: 'ta_crit', apply: function(p) { p.critRate = Math.min(1, (p.critRate || 0) + 0.1); } },
            { id: 'ww_dodge', apply: function(p) { p.dodgeRate = Math.min(1, (p.dodgeRate || 0) + 0.1); } },
            { id: 'ww_speed', apply: function(p) { p.speedMultiplier = (p.speedMultiplier || 1) + 0.15; p.speed = p.baseSpeed * p.speedMultiplier; } },
            { id: 'vr_crit', apply: function(p) { p.critRate = Math.min(1, (p.critRate || 0) + 0.1); } },
            { id: 'vr_atk', apply: function(p) { p.atk += 5; } },
            { id: 'ec_range', apply: function(p) { p.magnetRadius = (p.magnetRadius || 60) + 30; } },
            { id: 'ec_power', apply: function(p) { p.atk += 3; } },
            { id: 'fc_duration', apply: function(p) { p.iceDurationBonus = (p.iceDurationBonus || 0) + 0.5; } },
            { id: 'fc_chance', apply: function(p) { p.freezeChance = Math.min(0.8, (p.freezeChance || 0) + 0.1); } },
            { id: 'gc_xp', apply: function(p) { p.xpGainFactor = (p.xpGainFactor || 1) + 0.15; } },
            { id: 'gc_magnet', apply: function(p) { p.magnetRadius = (p.magnetRadius || 60) + 50; } },
            { id: 'wa_cd', apply: function(p) { var eng = window.gameEngine; if (eng && eng._activeWeapons) { for (var i = 0; i < eng._activeWeapons.length; i++) { eng._activeWeapons[i].cd = Math.max(p.cdFloor || 0.2, eng._activeWeapons[i].cd * 0.9); } } } },
            { id: 'wa_atk', apply: function(p) { p.atk += 5; } }
        ];
        var map = {};
        for (var i = 0; i < POOL.length; i++) map[POOL[i].id] = POOL[i];
        return map;
    }

    reset(heroId) {
        this.heroId = heroId || 'Knight';
        this._initFromConfig();

        /* ── 永久天赋加成 ── */
        var meta = (window.saveManager && window.saveManager._metaCache) || {};
        var talents = meta.talents || {};
        this.maxHp += (talents.health_boost || 0) * 20;
        this.hp = this.maxHp;
        this.speed += (talents.speed_boost || 0) * 15;
        this.baseSpeed = this.speed;
        this.magnetRadius += (talents.magnet_boost || 0) * 30;

        /* ── 装备属性聚合流 ── */
        this.xpGainFactor = 1.0;
        this.iceDurationBonus = 0;
        var sm = window.saveManager;
        var equipped = (sm && sm._metaCache && sm._metaCache.equipped) || { weapon: null, armor: null, talisman: null };
        var equipments = (sm && sm._metaCache && sm._metaCache.equipments) || [];
        var eqMap = {};
        for (var eqi = 0; eqi < equipments.length; eqi++) eqMap[equipments[eqi].instanceId] = equipments[eqi];
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
                    if (affix.id === 'speed_pct') this.speed *= (1 + affix.val);
                }
            }
        }
        this.baseSpeed = this.speed;

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
        this.critRate = 0;
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
        this.currentLvl = 1;
        this.currentExp = 0;
        this.nextLvlExp = 25;
        this._thornCritX = undefined;
        this._thornCritY = undefined;
        this._healAmount = 0;
        this._dodgeSignal = false;
        this._movingToTarget = false;
        this.weaponSlots = [];
        this.magnetRadius = 60;
        this.damageReduction = 0;
        this.rage = 0;
        this.maxRage = 100;

        /* Epoch 2: 新天赋开局加成（在全部重置后应用，避免被覆盖） */
        this.critRate += (talents.listening_intuition || 0) * 0.02;
        this.damageReduction += (talents.gangpai_hardiness || 0) * 0.03;
        this.cdFloor = Math.max(0.05, (this.cdFloor || 0.2) - (talents.摸牌_speed || 0) * 0.01);

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
    }
}
