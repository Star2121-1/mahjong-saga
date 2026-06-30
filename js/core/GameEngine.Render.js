(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

/* ══════════════════════════════════════════════
   武器系统 — 初始化/更新/碰撞/清理
   ══════════════════════════════════════════════ */

Gp._initDefaultWeapons = function() {
    this._activeWeapons = [];
    this._projectiles = [];
    var meta = window.saveManager._metaCache || {};
    var weaponIds = (meta.defaultWeapons && meta.defaultWeapons.length > 0) ? meta.defaultWeapons : ['TrackingBlade'];
    var talents = meta.talents || {};
    if (talents.weapon_forge === 1) {
        weaponIds = ['TrackingBlade', 'OrbitShield'];
    }
    /* Epoch 2: 开局双兵天赋 */
    if (talents.starting_weapons > 0 && weaponIds.length < 2) {
        weaponIds.push('OrbitShield');
    }
    for (var _i = 0; _i < weaponIds.length; _i++) {
        var W = window[weaponIds[_i]];
        if (W) this._activeWeapons.push(new W(1));
    }
    this._syncWeaponSlots();
};

Gp._restoreWeapons = function(weaponData) {
    this._resetAllWeapons();
    if (!weaponData || weaponData.length === 0) {
        this._initDefaultWeapons();
        return;
    }
    for (var _i = 0; _i < weaponData.length; _i++) {
        var wd = weaponData[_i];
        var W = window[wd.id];
        if (W) {
            var w = new W(wd.level || 1);
            w.cooldownTimer = wd.cooldownTimer || 0;
            this._activeWeapons.push(w);
        }
    }
    if (this._activeWeapons.length === 0) this._initDefaultWeapons();
    this._syncWeaponSlots();
};

Gp._cleanAllProjectiles = function() {
    for (var _i = 0; _i < this._projectiles.length; _i++) {
        var p = this._projectiles[_i];
        if (p.el && p.el.parentNode) p.el.remove();
    }
    this._projectiles = [];
};

Gp._resetAllWeapons = function() {
    for (var _i = 0; _i < this._activeWeapons.length; _i++) {
        var w = this._activeWeapons[_i];
        if (typeof w.reset === 'function') w.reset();
    }
    this._activeWeapons = [];
    this._cleanAllProjectiles();
};

Gp._updateWeapons = function(dt) {
    if (this._pendingReward) return;
    for (var _i = 0; _i < this._activeWeapons.length; _i++) {
        var w = this._activeWeapons[_i];
        if (w instanceof window.LaserBeam) {
            w.setAngle(this._lastClickAngle);
        }
        /* Epoch 34: Overdrive 期间武器伤害翻倍 */
        if (this._overdriveActive) {
            if (!w._origAtkFactor) w._origAtkFactor = w.atkFactor;
            w.atkFactor = (w._origAtkFactor || 1) * 2;
        }
        w.update(dt, this.player, this.enemies, this);
        if (this._overdriveActive) w.atkFactor = w._origAtkFactor || w.atkFactor;
        if (this._overdriveActive) w.cooldownTimer = 0;
    }
};

Gp._updateProjectiles = function(dt) {
    for (var _i = this._projectiles.length - 1; _i >= 0; _i--) {
        var p = this._projectiles[_i];
        if (!p.alive) {
            if (p.el && p.el.parentNode) p.el.remove();
            this._projectiles.splice(_i, 1);
            continue;
        }
        p.update(dt);
        if (!p.alive) {
            if (p.el && p.el.parentNode) p.el.remove();
            this._projectiles.splice(_i, 1);
            continue;
        }
        for (var _j = 0; _j < this.enemies.length; _j++) {
            var e = this.enemies[_j];
            if (!e.alive) continue;
            if (p.hitEnemies.has(e.id)) continue;
            var _dx = e.x - p.x;
            var _dy = e.y - p.y;
            var _radiusSum = e.radius + p.radius;
            if (_dx * _dx + _dy * _dy < _radiusSum * _radiusSum) {
                e.takeDamage(p.damage, p);
                p.hitEnemies.add(e.id);
                if (p.pierceCount > 0) {
                    p.pierceCount--;
                    if (p.pierceCount <= 0) p.alive = false;
                } else {
                    p.alive = false;
                }
                if (!p.alive) break;
            }
        }
        if (p.el) {
            p.el.style.left = (p.x - p.radius) + 'px';
            p.el.style.top = (p.y - p.radius) + 'px';
        }
        if (p.x < -100 || p.x > this._mapW + 100 || p.y < -100 || p.y > this._mapH + 100) {
            p.alive = false;
        }
        if (!p.alive && p.el && p.el.parentNode) {
            p.el.remove();
            this._projectiles.splice(_i, 1);
        }
    }
};

})();
