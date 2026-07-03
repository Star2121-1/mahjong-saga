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
        this.cooldownTimer = 0;
    }
    update(dt, player, enemies, engine) {
        this.cooldownTimer -= dt;
    }
    upgrade() {
        this.level++;
        this.atkFactor += 0.15;
        var floor = (window.gameEngine && window.gameEngine.player) ? window.gameEngine.player.cdFloor : 0.2;
        this.cd = Math.max(floor || 0.2, this.cd * 0.9);
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
        this.lifeTime = lifeTime || 3.0;
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
   Sub-agent 1: 追踪飞刃
   ══════════════════════════════════════════════ */

window.TrackingBlade = class extends window.Weapon {
    constructor(level) {
        super('TrackingBlade', '\u8ffd\u8e2a\u98de\u5203', level || 1, 1.0, 0.8);
    }
    update(dt, player, enemies, engine) {
        this.cooldownTimer -= dt;
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
        var theta = Math.atan2(nearest.y - player.y, nearest.x - player.x);
        var speed = 300 + this.level * 20;
        var dmg = Math.floor(player.atk * this.atkFactor);
        var proj = new window.Projectile(
            player.x, player.y,
            Math.cos(theta) * speed,
            Math.sin(theta) * speed,
            4, dmg, 3, 2.0
        );
        var el = document.createElement('div');
        el.className = 'projectile tracking-blade';
        engine._worldLayer.appendChild(el);
        proj.el = el;
        engine._projectiles.push(proj);
    }
};

/* ══════════════════════════════════════════════
   Sub-agent 2: 环形护体
   ══════════════════════════════════════════════ */

window.OrbitShield = class extends window.Weapon {
    constructor(level) {
        super('OrbitShield', '\u73af\u5f62\u62a4\u4f53', level || 1, 0.5, 0.3);
        this.orbitRadius = 50;
        this.rotationSpeed = 2.0;
        this.orbAngles = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];
        this.orbitEls = [];
        this.orbitTickTimers = [0, 0, 0];
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
        var dmg = Math.floor(player.atk * this.atkFactor);
        for (var i = 0; i < 3; i++) {
            this.orbAngles[i] += this.rotationSpeed * dt;
            var ox = player.x + Math.cos(this.orbAngles[i]) * this.orbitRadius;
            var oy = player.y + Math.sin(this.orbAngles[i]) * this.orbitRadius;
            var el = this.orbitEls[i];
            el.style.left = (ox - 8) + 'px';
            el.style.top = (oy - 8) + 'px';
            this.orbitTickTimers[i] -= dt;
            if (this.orbitTickTimers[i] > 0) continue;
            this.orbitTickTimers[i] = 0.3;
            for (var j = 0; j < enemies.length; j++) {
                var e = enemies[j];
                if (!e.alive) continue;
                var dx = e.x - ox;
                var dy = e.y - oy;
                if (dx * dx + dy * dy < (e.radius + 8) * (e.radius + 8)) {
                    e.takeDamage(dmg, 'player');
                }
            }
        }
    }
    reset() {
        for (var i = 0; i < this.orbitEls.length; i++) {
            if (this.orbitEls[i].parentNode) this.orbitEls[i].remove();
        }
        this.orbitEls = [];
        this.initialized = false;
    }
};

/* ══════════════════════════════════════════════
   Sub-agent 3: 扇形散射
   ══════════════════════════════════════════════ */

window.ShotgunBurst = class extends window.Weapon {
    constructor(level) {
        super('ShotgunBurst', '\u6247\u5f62\u6563\u5c04', level || 1, 0.6, 0.4);
        this.spreadCount = 5;
        this.spreadAngle = 0.3;
    }
    fireAt(targetX, targetY, player, engine) {
        if (this.cooldownTimer > 0) return;
        this.cooldownTimer = this.cd;
        var baseAngle = Math.atan2(targetY - player.y, targetX - player.x);
        var speed = 250 + this.level * 10;
        var dmg = Math.floor(player.atk * this.atkFactor);
        var n = this.spreadCount;
        for (var i = 0; i < n; i++) {
            var offset = (i - (n - 1) / 2) * this.spreadAngle / Math.max(n - 1, 1);
            var angle = baseAngle + offset;
            var proj = new window.Projectile(
                player.x, player.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                3, dmg, 0, 0.8
            );
            var el = document.createElement('div');
            el.className = 'projectile shotgun-pellet';
            engine._worldLayer.appendChild(el);
            proj.el = el;
            engine._projectiles.push(proj);
        }
    }
};

/* ══════════════════════════════════════════════
   Sub-agent 4: 区域震荡
   ══════════════════════════════════════════════ */

window.GroundSlammer = class extends window.Weapon {
    constructor(level) {
        super('GroundSlammer', '\u533a\u57df\u9707\u8361', level || 1, 1.5, 1.8);
        this.activeShockwaves = [];
    }
    update(dt, player, enemies, engine) {
        this.cooldownTimer -= dt;
        var dmg = Math.floor(player.atk * this.atkFactor);
        for (var i = this.activeShockwaves.length - 1; i >= 0; i--) {
            var sw = this.activeShockwaves[i];
            sw.elapsed += dt;
            var progress = sw.elapsed / 0.2;
            if (progress >= 1) {
                if (sw.el.parentNode) sw.el.remove();
                this.activeShockwaves.splice(i, 1);
                continue;
            }
            var radius = 10 + progress * 70;
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
                    e.takeDamage(dmg, 'player');
                    var knockAngle = Math.atan2(swdy, swdx);
                    var force = 200;
                    e.x += Math.cos(knockAngle) * force;
                    e.y += Math.sin(knockAngle) * force;
                    e._knockbackVelocity = 200;
                    if (typeof e._clampPosition === 'function') e._clampPosition(engine);
                }
            }
        }
        if (this.cooldownTimer > 0) return;
        this.cooldownTimer = this.cd;
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
    reset() {
        for (var i = 0; i < this.activeShockwaves.length; i++) {
            if (this.activeShockwaves[i].el.parentNode) this.activeShockwaves[i].el.remove();
        }
        this.activeShockwaves = [];
    }
};

/* ══════════════════════════════════════════════
   Sub-agent 5: 持续线杀
   ══════════════════════════════════════════════ */

window.LaserBeam = class extends window.Weapon {
    constructor(level) {
        super('LaserBeam', '\u6301\u7eed\u7ebf\u6740', level || 1, 1.2, 0.3);
        this.beamLength = 300;
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
        this.cooldownTimer -= dt;
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
        var dmg = Math.floor(player.atk * this.atkFactor);
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            if (!e.alive) continue;
            var dx = e.x - player.x;
            var dy = e.y - player.y;
            var t = (dx * cosA + dy * sinA) / len;
            t = Math.max(0, Math.min(1, t));
            var cx = player.x + t * len * cosA;
            var cy = player.y + t * len * sinA;
            var dist = Math.sqrt((e.x - cx) * (e.x - cx) + (e.y - cy) * (e.y - cy));
            if (dist < e.radius + 4) {
                e.takeDamage(dmg, 'player');
            }
        }
    }
    setAngle(angle) {
        this.beamAngle = angle;
    }
    reset() {
        if (this.laserEl && this.laserEl.parentNode) this.laserEl.remove();
        this.laserEl = null;
        this.initialized = false;
    }
};

/* ══════════════════════════════════════════════
   Sub-agent 6: 全屏脉冲
   ══════════════════════════════════════════════ */

window.NovaPulse = class extends window.Weapon {
    constructor(level) {
        super('NovaPulse', '\u5168\u5c4f\u8109\u51b2', level || 1, 5.0, 7.0);
        this.activePulses = [];
    }
    update(dt, player, enemies, engine) {
        this.cooldownTimer -= dt;
        var dmg = Math.floor(player.atk * this.atkFactor);
        for (var i = this.activePulses.length - 1; i >= 0; i--) {
            var p = this.activePulses[i];
            p.elapsed += dt;
            var progress = p.elapsed / 0.5;
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
                        e.takeDamage(dmg, 'player');
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
        var viewW = engine.battlefield.clientWidth;
        var viewH = engine.battlefield.clientHeight;
        var maxR = Math.sqrt(viewW * viewW + viewH * viewH);
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
    reset() {
        for (var i = 0; i < this.activePulses.length; i++) {
            if (this.activePulses[i].el.parentNode) this.activePulses[i].el.remove();
        }
        this.activePulses = [];
    }
};
