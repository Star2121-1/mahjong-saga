/* ══════════════════════════════════════════════
   Weapon System — 基类、弹道、6 神兵
   ══════════════════════════════════════════════ */

window.Weapon = class {
    constructor(id, name, level, atkFactor, cd) {
        this.id = id;
        this.name = name;
        this.level = level || 1;
        this.atkFactor = atkFactor || 1.0;
        this.cd = cd || 1.0;
        this._baseCd = this.cd; /* P0: baseline CD for wa_cd modifier — prevents multiplicative stacking */
        this._origBaseCd = this.cd; /* R52: 不可变的原始基线CD（不含筒顺等spawn侧修改），供Render.js每帧计算cdReduction使用，防止双重压缩 */
        this._baseAtkFactor = this.atkFactor; /* P0: 存储初始伤害因子用于overdrive恢复 */
        this._rawBaseCd = this.cd; /* R146-P0: 保存构造时原始CD，防止reset时从被筒顺修改过的_baseCd反推污染_origBaseCd */
        this.cooldownTimer = 0;
        this._justFired = false; /* Visual Enhancement D: 技能发射标记 */
    }
    update(dt, player, enemies, engine) {
        /* P1: _synNovaLaserActive由Render.js统一初始化，此处不再重置 */
        /* A-030: 暗影步闪避后攻速加成 — 临时减少CD，纳入ASPDCAP保护 */
        var aspdMult = (player && player._dodgeAspdTimer > 0)
            ? Math.min(Balance.HERO_ASSASSIN_DODGE_ASPD_MULT, Balance.WEAPON_ASPD_CAP)
            : 1.0;
        this.cooldownTimer -= dt * aspdMult;
    }
    upgrade() {
        this.level++;
        this.atkFactor = Math.min(10.0, this.atkFactor + Balance.WEAPON_UPGRADE_ATK_INC);
        var playerCdFloor = (window.gameEngine && window.gameEngine.player) ? window.gameEngine.player.cdFloor : null;
        var floor = (playerCdFloor != null) ? playerCdFloor : Balance.DEFAULT_CD_FLOOR;
        this.cd = Math.max(floor, this.cd * Balance.WEAPON_UPGRADE_CD_MULT);
        this._baseCd = Math.max(floor, (this._baseCd || this.cd) * Balance.WEAPON_UPGRADE_CD_MULT); /* P0: 同步更新_baseCd */
        this._origBaseCd = Math.max(floor, (this._origBaseCd || this._baseCd) * Balance.WEAPON_UPGRADE_CD_MULT); /* R52: _origBaseCd与_baseCd同步升级（保持原始基线用于Render.js计算） */
    }
    reset() { /* P0: 清除overdrive残留状态，防止跨局伤害累积 */
        this._odOrigAtk = undefined;
        this.atkFactor = this._baseAtkFactor || 1.0; /* 从初始值恢复，而非从构造参数计算 */
        this._justFired = false;
        this.cooldownTimer = 0; /* R57-P1: 重置冷却计时器，防止跨局残留进度 */
        this._origBaseCd = this._rawBaseCd || this.cd; /* R131-P0: 重置原始基线CD — 使用构造时原始值，而非可能被筒顺修改过的_baseCd */
    }
};

/* ── 弹道实体 ── */

window.Projectile = class {
    constructor(x, y, vx, vy, radius, damage, pierceCount, lifeTime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius || 5;
        this.damage = damage;
        this.pierceCount = pierceCount == null ? 0 : pierceCount;
        this.lifeTime = lifeTime || Balance.PROJECTILE_DEFAULT_LIFETIME;
        this.alive = true;
        this.hitEnemies = new Set();
        this.el = null;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) this.alive = false;
    }
};

/* ══════════════════════════════════════════════
   Sub-agent 1: 追踪飞牌
   ══════════════════════════════════════════════ */

window.TrackingBlade = class extends window.Weapon {
    constructor(level) {
        super('TrackingBlade', '\u8ffd\u8e2a\u98de\u724c', level || 1, 1.0, Balance.TRACKING_BLADE_CD);
    }
    update(dt, player, enemies, engine) {
        /* P0: 应用刺客被动攻击速度修正，与基类Weapon.update()保持一致 */
        var aspdMult = (player && player._dodgeAspdTimer > 0)
            ? Math.min(Balance.HERO_ASSASSIN_DODGE_ASPD_MULT, Balance.WEAPON_ASPD_CAP)
            : 1.0;
        this.cooldownTimer -= dt * aspdMult;
        if (this.cooldownTimer > 0) return;
        this.cooldownTimer = this.cd;
        var nearest = null;
        var minDistSq = Infinity;
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            if (!e.alive) continue;
            var dx = e.x - player.x;
            var dy = e.y - player.y;
            var dsq = dx * dx + dy * dy;
            if (dsq < minDistSq) { minDistSq = dsq; nearest = e; }
        }
        if (!nearest) return;
        this._justFired = true;
        var theta = Math.atan2(nearest.y - player.y, nearest.x - player.x);
        var speed = 300 + this.level * 20;
        /* Syn-BladeOrbit: tracking range +50% */
        if (engine && engine._synBladeOrbit) {
            speed = Math.floor(speed * 1.5);
        }
        var atkMult = 1 + (player && player._tempAtkBoost || 0);
        var dmg = Math.floor(player.atk * this.atkFactor * atkMult);
        /* Syn-BladeLaser: tracking blade hit triggers laser beam extra penetration */
        if (engine._synBladeLaser) {
            engine._synBladeLaserHit = true;
        }
        var proj = new window.Projectile(
            player.x, player.y,
            Math.cos(theta) * speed,
            Math.sin(theta) * speed,
            4, dmg, 3, Balance.TRACKING_BLADE_PROJ_LIFE
        );
        var el = document.createElement('div');
        el.className = 'projectile tracking-blade';
        engine._worldLayer.appendChild(el);
        proj.el = el;
        engine._projectiles.push(proj);
    }
};

/* ══════════════════════════════════════════════
   Sub-agent 2: 三面环伺
   ══════════════════════════════════════════════ */

window.OrbitShield = class extends window.Weapon {
    constructor(level) {
        super('OrbitShield', '\u73af\u5f62\u62a4\u4f53', level || 1, 0.3, 0.5);
        this.orbitRadius = Balance.ORBIT_SHIELD_RADIUS;
        this.orbRadius = Balance.ORBIT_ORB_RADIUS;
        this.rotationSpeed = Balance.ORBIT_ROTATION_SPEED;
        this.orbAngles = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];
        this.orbitEls = [];
        this.orbitTickTimers = [0, 0.165, 0.33]; /* R30-H-013: 错开3 orb冷却，轮流攻击；硬编码初始偏移，避免this.cd未初始化时为NaN */
        this.orbitHitSets = [new Set(), new Set(), new Set()]; /* M-016: 每个orb独立去重集合，防止同tick重复伤害 */
        this.initialized = false;
    }
    _init(engine) {
        if (this.initialized) return;
        for (var i = 0; i < 3; i++) {
            var el = document.createElement('div');
            el.className = 'orbit-shield-orb';
            engine._worldLayer.appendChild(el);
            this.orbitEls.push(el);
        }
        this.initialized = true;
    }
    update(dt, player, enemies, engine) {
        this._init(engine);
        /* A-030: 暗影步闪避后攻速加成 */
        var aspdMult = (player && player._dodgeAspdTimer > 0)
            ? Math.min(Balance.HERO_ASSASSIN_DODGE_ASPD_MULT, Balance.WEAPON_ASPD_CAP)
            : 1.0;
        if (!player) return; /* R146-P1: null guard — 防止init过渡期player为null时崩溃 */
        var atkMult = 1 + (player._tempAtkBoost || 0);
        var dmg = Math.floor(player.atk * this.atkFactor * atkMult);
        for (var i = 0; i < 3; i++) {
            this.orbAngles[i] = this.orbAngles[i] % (Math.PI * 2); /* R46-P1: 防止长会话浮点漂移 */
            this.orbAngles[i] += this.rotationSpeed * dt;
            var ox = player.x + Math.cos(this.orbAngles[i]) * this.orbitRadius;
            var oy = player.y + Math.sin(this.orbAngles[i]) * this.orbitRadius;
            var el = this.orbitEls[i];
            el.style.left = (ox - 8) + 'px';
            el.style.top = (oy - 8) + 'px';
            this.orbitTickTimers[i] -= dt * aspdMult;
            if (this.orbitTickTimers[i] > 0) continue;
            this.orbitTickTimers[i] = this.cd;
            this.orbitHitSets[i].clear(); /* R30-H-014: 每tick清空去重集合，防止run中永久跳过敌人 */
            for (var j = 0; j < enemies.length; j++) {
                var e = enemies[j];
                if (!e.alive) continue;
                var dx = e.x - ox;
                var dy = e.y - oy;
                /* M-015: 碰撞半径使用配置常量 */
                if (dx * dx + dy * dy < (e.radius + this.orbRadius) * (e.radius + this.orbRadius)) {
                    /* M-016: 每个orb独立去重，防止同一tick内重复命中 */
                    if (!this.orbitHitSets[i].has(e.id)) {
                        this.orbitHitSets[i].add(e.id);
                        /* Syn-NovaOrbit: orbit damage x2 when nova pulse active */
                        var finalDmg = dmg;
                        if (engine && engine._synNovaOrbit && engine._synNovaLaserActive) {
                            finalDmg = Math.floor(dmg * 2);
                        }
                        e.takeDamage(finalDmg, 'player', player.x, player.y);
                    }
                }
            }
        }
    }
    reset() { super.reset();
        for (var i = 0; i < this.orbitEls.length; i++) {
            if (this.orbitEls[i].parentNode) this.orbitEls[i].remove();
        }
        this.orbitEls = [];
        this.orbitHitSets = [new Set(), new Set(), new Set()];
        this.initialized = false;
        this.cooldownTimer = 0; /* R131-P1: 补全OrbitShield重置，防止跨波冷却残留 */
    }
};

/* ══════════════════════════════════════════════
   Sub-agent 3: 七对散牌
   ══════════════════════════════════════════════ */

window.ShotgunBurst = class extends window.Weapon {
    constructor(level) {
        super('ShotgunBurst', '\u4e03\u5bf9\u6563\u724c', level || 1, 0.6, Balance.SHOTGUN_BURST_CD);
        this.spreadCount = Balance.SHOTGUN_SPREAD_COUNT;
        this.spreadAngle = Balance.SHOTGUN_SPREAD_ANGLE;
    }
    fireAt(targetX, targetY, player, engine) {
        if (this.cooldownTimer > 0) return;
        this.cooldownTimer = this.cd;
        this._justFired = true;
        var baseAngle = Math.atan2(targetY - player.y, targetX - player.x);
        var speed = 250 + this.level * 10;
        var atkMult = 1 + (player._tempAtkBoost || 0);
        var dmg = Math.floor(player.atk * this.atkFactor * atkMult);
        var n = this.spreadCount;
        /* Syn-NovaShotgun: +4 pellets when nova pulse is active */
        if (engine && engine._synNovaShotgun && engine._synNovaLaserActive) {
            n += 4;
        }
        for (var i = 0; i < n; i++) {
            var offset = (i - (n - 1) / 2) * this.spreadAngle / Math.max(n - 1, 1);
            var angle = baseAngle + offset;
            var proj = new window.Projectile(
                player.x, player.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                3, dmg, 0, Balance.SHOTGUN_PROJ_LIFE
            );
            var el = document.createElement('div');
            el.className = 'projectile shotgun-pellet';
            engine._worldLayer.appendChild(el);
            proj.el = el;
            engine._projectiles.push(proj);
        }
    }
    update(dt, player, enemies, engine) {
        var aspdMult = (player && player._dodgeAspdTimer > 0)
            ? Math.min(Balance.HERO_ASSASSIN_DODGE_ASPD_MULT, Balance.WEAPON_ASPD_CAP)
            : 1.0;
        this.cooldownTimer -= dt * aspdMult;
    }
    reset() { super.reset();
        /* No resources to clean */
    }
};

/* ══════════════════════════════════════════════
   Sub-agent 4: 碰牌震波
   ══════════════════════════════════════════════ */

window.GroundSlammer = class extends window.Weapon {
    constructor(level) {
        super('GroundSlammer', '\u78b0\u724c\u9707\u6ce2', level || 1, 1.5, 1.8);
        this.activeShockwaves = [];
    }
    update(dt, player, enemies, engine) {
        /* A-030: 暗影步闪避后攻速加成 */
        var aspdMult = (player && player._dodgeAspdTimer > 0)
            ? Math.min(Balance.HERO_ASSASSIN_DODGE_ASPD_MULT, Balance.WEAPON_ASPD_CAP)
            : 1.0;
        this.cooldownTimer -= dt * aspdMult;
        var atkMult = 1 + (player._tempAtkBoost || 0);
        var dmg = Math.floor(player.atk * this.atkFactor * atkMult);
        for (var i = this.activeShockwaves.length - 1; i >= 0; i--) {
            var sw = this.activeShockwaves[i];
            sw.elapsed += dt;
            var progress = sw.elapsed / Balance.GROUND_SLAMMER_WAVE_DURATION;
            if (progress >= 1) {
                if (sw.el.parentNode) sw.el.remove();
                this.activeShockwaves.splice(i, 1);
                continue;
            }
            /* R32-W-001: 使用Balance常量替代硬编码值 */
            var radius = Balance.GROUND_SLAMMER_MIN_RADIUS + progress * Balance.GROUND_SLAMMER_RADIUS_GROWTH;
            sw.el.style.width = (radius * 2) + 'px';
            sw.el.style.height = (radius * 2) + 'px';
            sw.el.style.left = (sw.x - radius) + 'px';
            sw.el.style.top = (sw.y - radius) + 'px';
            for (var j = 0; j < enemies.length; j++) {
                var e = enemies[j];
                if (!e.alive) continue;
                if (sw.hitEnemies.has(e.id)) continue;
                var swdx = e.x - sw.x;
                var swdy = e.y - sw.y;
                var swdist = Math.sqrt(swdx * swdx + swdy * swdy);
                if (swdist < e.radius + radius) {
                    sw.hitEnemies.add(e.id);
                    e.takeDamage(dmg, 'player', sw.x, sw.y);
                    var knockAngle = Math.atan2(swdy, swdx);
                    var force = Balance.GROUND_SLAMMER_KNOCKBACK_FORCE;
                    e.x += Math.cos(knockAngle) * force;
                    e.y += Math.sin(knockAngle) * force;
                    e._knockbackVelocity = Balance.KNOCKBACK_DECAY_RATE;
                    if (typeof e._clampPosition === 'function') e._clampPosition(engine);
                }
            }
        }
        if (this.cooldownTimer > 0) return;
        this.cooldownTimer = this.cd;
        this._justFired = true;
        var tx = player.x;
        var ty = player.y;
        var el = document.createElement('div');
        el.className = 'shockwave';
        el.style.left = (tx - 10) + 'px';
        el.style.top = (ty - 10) + 'px';
        el.style.width = '20px';
        el.style.height = '20px';
        engine._worldLayer.appendChild(el);
        this.activeShockwaves.push({
            x: tx, y: ty,
            elapsed: 0,
            el: el,
            hitEnemies: new Set()
        });
    }
    reset() { super.reset();
        for (var i = 0; i < this.activeShockwaves.length; i++) {
            if (this.activeShockwaves[i].el.parentNode) this.activeShockwaves[i].el.remove();
        }
        this.activeShockwaves = [];
    }
};

/* ══════════════════════════════════════════════
   Sub-agent 5: 一气贯通
   ══════════════════════════════════════════════ */

window.LaserBeam = class extends window.Weapon {
    constructor(level) {
        super('LaserBeam', '\u4e00\u6c14\u8d2f\u901a', level || 1, 1.2, 0.3);
        this.beamLength = Balance.LASER_BEAM_LENGTH;
        this.beamAngle = 0;
        this.laserEl = null;
        this.initialized = false;
    }
    _init(engine) {
        if (this.initialized) return;
        var el = document.createElement('div');
        el.className = 'laser-beam';
        engine._worldLayer.appendChild(el);
        this.laserEl = el;
        this.initialized = true;
    }
    update(dt, player, enemies, engine) {
        this._init(engine);
        /* A-030: 暗影步闪避后攻速加成 */
        var aspdMult = (player && player._dodgeAspdTimer > 0)
            ? Math.min(Balance.HERO_ASSASSIN_DODGE_ASPD_MULT, Balance.WEAPON_ASPD_CAP)
            : 1.0;
        this.cooldownTimer -= dt * aspdMult;
        var cosA = Math.cos(this.beamAngle);
        var sinA = Math.sin(this.beamAngle);
        var len = this.beamLength;
        this.laserEl.style.left = player.x + 'px';
        this.laserEl.style.top = (player.y - 2) + 'px';
        this.laserEl.style.width = len + 'px';
        var deg = this.beamAngle * 180 / Math.PI;
        this.laserEl.style.transform = 'rotate(' + deg + 'deg)';
        this.laserEl.style.transformOrigin = 'left center';
        if (this.cooldownTimer > 0) return;
        this.cooldownTimer = this.cd;
        this._justFired = true;
        var atkMult = 1 + (player._tempAtkBoost || 0);
        var dmg = Math.floor(player.atk * this.atkFactor * atkMult);
        /* Syn-NovaLaser: Nova pulse active doubles laser damage */
        if (engine && engine._synNovaLaserActive) {
            dmg = Math.floor(dmg * 2);
        }
        var extraPen = engine._synBladeLaserHit ? 1 : 0; /* R46-P0: 使用per-shot触发标志，而非永久协同标志 */
        var hitCount = 0;
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            if (!e.alive) continue;
            var dx = e.x - player.x;
            var dy = e.y - player.y;
            /* M-016: 使用 this.beamLength 而非局部变量 len，语义清晰 */
            var t = (dx * cosA + dy * sinA) / this.beamLength;
            t = Math.max(0, Math.min(1, t));
            var cx = player.x + t * len * cosA;
            var cy = player.y + t * len * sinA;
            var dist = Math.sqrt((e.x - cx) * (e.x - cx) + (e.y - cy) * (e.y - cy));
            if (dist < e.radius + Balance.LASER_HIT_RADIUS) {
                e.takeDamage(dmg, 'player', player.x, player.y);
                hitCount++;
                if (hitCount >= Balance.LASER_BEAM_MAX_HITS + extraPen) break;
            }
        }
        /* Reset synBladeLaser flag after one laser fire */
        if (engine._synBladeLaserHit) {
            engine._synBladeLaserHit = false;
        }
    }
    setAngle(angle) {
        this.beamAngle = angle;
    }
    reset() { super.reset();
        if (this.laserEl && this.laserEl.parentNode) this.laserEl.remove();
        this.laserEl = null;
        this.initialized = false;
    }
};

/* ══════════════════════════════════════════════
   Sub-agent 6: 清一色
   ══════════════════════════════════════════════ */

window.NovaPulse = class extends window.Weapon {
    constructor(level) {
        super('NovaPulse', '\u6e05\u4e00\u8272', level || 1, Balance.NOVA_PULSE_ATK_FACTOR, Balance.NOVA_PULSE_CD);
        this.activePulses = [];
    }
    update(dt, player, enemies, engine) {
        /* A-030: 暗影步闪避后攻速加成 */
        var aspdMult = (player && player._dodgeAspdTimer > 0)
            ? Math.min(Balance.HERO_ASSASSIN_DODGE_ASPD_MULT, Balance.WEAPON_ASPD_CAP)
            : 1.0;
        this.cooldownTimer -= dt * aspdMult;
        var atkMult = 1 + (player._tempAtkBoost || 0);
        var dmg = Math.floor(player.atk * this.atkFactor * atkMult);
        /* R125-P1: 协同标志必须在伤害循环前设置，确保同帧其他武器能读取 */
        if (engine && engine._synNovaLaser) {
            engine._synNovaLaserActive = true;
        }
        for (var i = this.activePulses.length - 1; i >= 0; i--) {
            var p = this.activePulses[i];
            p.elapsed += dt;
            var progress = p.elapsed / Balance.NOVA_PULSE_EXPAND_DURATION;
            var radius = progress * p.maxRadius;
            p.el.style.width = (radius * 2) + 'px';
            p.el.style.height = (radius * 2) + 'px';
            p.el.style.left = (p.x - radius) + 'px';
            p.el.style.top = (p.y - radius) + 'px';
            for (var j = 0; j < enemies.length; j++) {
                var e = enemies[j];
                if (!e.alive) continue;
                var dx = e.x - p.x;
                var dy = e.y - p.y;
                if (dx * dx + dy * dy < (e.radius + radius) * (e.radius + radius)) {
                    if (!p.hitEnemies.has(e.id)) {
                        p.hitEnemies.add(e.id);
                        e.takeDamage(dmg, 'player', p.x, p.y);
                    }
                }
            }
            if (progress >= 1) {
                if (p.el.parentNode) p.el.remove();
                this.activePulses.splice(i, 1);
            }
        }
        if (this.cooldownTimer > 0) return;
        this.cooldownTimer = this.cd;
        this._justFired = true;
        var maxR = Balance.NOVA_PULSE_MAX_RADIUS;
        var el = document.createElement('div');
        el.className = 'nova-pulse';
        el.style.left = player.x + 'px';
        el.style.top = player.y + 'px';
        el.style.width = '0px';
        el.style.height = '0px';
        engine._worldLayer.appendChild(el);
        this.activePulses.push({
            x: player.x, y: player.y,
            elapsed: 0,
            maxRadius: maxR,
            el: el,
            hitEnemies: new Set()
        });
    }
    reset() { super.reset();
        for (var i = 0; i < this.activePulses.length; i++) {
            if (this.activePulses[i].el.parentNode) this.activePulses[i].el.remove();
        }
        this.activePulses = [];
    }
};
