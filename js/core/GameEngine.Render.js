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
    if (talents.que_forge === 1) {
        weaponIds = ['TrackingBlade', 'OrbitShield'];
    }
    /* Epoch 2: 开局双牌天赋 */
    if (talents.kaiju_weapons > 0 && weaponIds.length < 2) {
        weaponIds.push('OrbitShield');
    }
    for (var _i = 0; _i < weaponIds.length; _i++) {
        var W = window[weaponIds[_i]];
        if (W) this._activeWeapons.push(new W(1));
    }
    this._syncWeaponSlots();
    this._renderWeaponSlots();
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
            if (wd.atkFactor != null) w.atkFactor = wd.atkFactor; /* P0: 恢复升级后的攻击力因子 */
            if (wd.baseCd != null) w._baseCd = wd.baseCd; /* P0: 恢复基准CD */
            if (wd.cd != null) w.cd = wd.cd; /* P0: 恢复当前CD */
            this._activeWeapons.push(w);
        }
    }
    if (this._activeWeapons.length === 0) this._initDefaultWeapons();
    this._syncWeaponSlots();
    this._renderWeaponSlots();
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
    /* P1: 统一初始化协同标志，避免帧顺序依赖 */
    this._synNovaLaserActive = false;
    if (this._pendingReward) return;
    /* 雀魂·疾风连打：临时攻速（只加速冷却流转，到期衰减） */
    if (this._tempAspdT > 0) {
        this._tempAspdT -= dt;
        if (this._tempAspdT <= 0) { this._tempAspd = 0; this._tempAspdT = 0; }
    }
    var wdt = dt * (1 + (this._tempAspd || 0));
    var cdReduction = (this.player && this.player._weaponCdReduction) || 0;
    for (var _i = 0; _i < this._activeWeapons.length; _i++) {
        var w = this._activeWeapons[_i];
        if (w instanceof window.LaserBeam) {
            w.setAngle(this._lastClickAngle);
        }
        /* Epoch 34: Overdrive 期间武器伤害翻倍
           注意：伤害倍增由 GameSystems.triggerOverdrive 统一处理（设置 _odOrigAtk），
           此处仅做 CD 相关调整，不再重复翻倍以纠正 Round7 发现的 4x 伤害 Bug */
        /* R29-C-003: 秘密宝牌引力武器冷却减免
           R52: 使用 _origBaseCd 而非 _baseCd 计算，防止与 Spawn.js 筒顺减CD双重压缩 */
        if (cdReduction > 0) {
            w.cd = w._origBaseCd || w._baseCd || w.cd;
            if (!w._origBaseCd) w._origBaseCd = w._baseCd || w.cd;
            w.cd = Math.max(this.player.cdFloor || Balance.DEFAULT_CD_FLOOR, w._origBaseCd * (1 - cdReduction));
        }
        w.update(wdt, this.player, this.enemies, this);
    }
};

Gp._updateProjectiles = function(dt) {
    /* M-009: Grid 空间分割 — 每 80px 一格，减少 O(n*m) 碰撞检测 */
    var GRID_SIZE = 80;
    var grid = {};
    for (var _gi = 0; _gi < this.enemies.length; _gi++) {
        var ge = this.enemies[_gi];
        if (!ge.alive) continue;
        var gx = Math.floor(ge.x / GRID_SIZE);
        var gy = Math.floor(ge.y / GRID_SIZE);
        var key = gx + ',' + gy;
        if (!grid[key]) grid[key] = [];
        grid[key].push(ge);
        /* M-031: 加入所有 8 个相邻格，防止跨格漏检（原代码只加了右下格） */
        /* P1: 使用Set-based去重替代indexOf O(N)查找 */
        var geId = ge.id;
        for (var dgx = -1; dgx <= 1; dgx++) {
            for (var dgy = -1; dgy <= 1; dgy++) {
                if (dgx === 0 && dgy === 0) continue;
                var ngx = gx + dgx; var ngy = gy + dgy;
                var nkey = ngx + ',' + ngy;
                if (!grid[nkey]) grid[nkey] = [];
                if (grid[nkey]._seenIds && grid[nkey]._seenIds[geId]) continue;
                grid[nkey].push(ge);
                if (!grid[nkey]._seenIds) grid[nkey]._seenIds = {};
                grid[nkey]._seenIds[geId] = true;
            }
        }
    }

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
        /* 只检测 projectile 所在格及相邻格的敌人 */
        var pgx = Math.floor(p.x / GRID_SIZE);
        var pgy = Math.floor(p.y / GRID_SIZE);
        var candidates = [];
        for (var dgx = -1; dgx <= 1; dgx++) {
            for (var dgy = -1; dgy <= 1; dgy++) {
                var ck = (pgx + dgx) + ',' + (pgy + dgy);
                if (grid[ck]) {
                    for (var ci = 0; ci < grid[ck].length; ci++) {
                        var ce = grid[ck][ci];
                        if (ce.alive && !p.hitEnemies.has(ce.id) && candidates.indexOf(ce) === -1) {
                            candidates.push(ce);
                        }
                    }
                }
            }
        }
        for (var _cj = 0; _cj < candidates.length; _cj++) {
            var e = candidates[_cj];
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
