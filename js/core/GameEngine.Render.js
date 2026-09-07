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
    this._checkWeaponSynergies(); /* R250-P1: 初始化后重新计算协同标志，防止新游戏协同失效 */
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
            if (wd.atkFactor != null) w.atkFactor = Math.min(10.0, wd.atkFactor); /* R131-P2: 存档恢复时钳制上限，防止历史bug导致的超额因子叠加 */
            if (wd.baseCd != null) w._baseCd = wd.baseCd; /* P0: 恢复基准CD */
            if (wd.origBaseCd != null) w._origBaseCd = wd.origBaseCd; /* R141-P1: 恢复原始基线CD，防止筒顺修改跨局丢失 */
            if (wd.cd != null) w.cd = wd.cd; /* P0: 恢复当前CD */
            this._activeWeapons.push(w);
        }
    }
    if (this._activeWeapons.length === 0) this._initDefaultWeapons();
    this._syncWeaponSlots();
    this._renderWeaponSlots();
    this._checkWeaponSynergies(); /* R250-P1: 恢复后重新计算协同标志，防止存档读取后协同失效 */
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
    /* R188-P0: 预扫描NovaPulse确保协同标志在武器更新前正确设置，避免帧内时序依赖 */
    this._synNovaLaserActive = false;
    for (var _ni = 0; _ni < this._activeWeapons.length; _ni++) {
        var _nw = this._activeWeapons[_ni];
        if (_nw instanceof window.NovaPulse && _nw.activePulses && _nw.activePulses.length > 0) {
            this._synNovaLaserActive = true;
            break;
        }
    }
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
        /* R165-P0: 防御性检查 — LaserBeam类未定义时跳过setAngle，避免Strict模式下instanceof崩溃 */
        if (window.LaserBeam && w instanceof window.LaserBeam) {
            w.setAngle(this._lastClickAngle);
        }
        /* Epoch 34: Overdrive 期间武器伤害翻倍
           注意：伤害倍增由 GameSystems.triggerOverdrive 统一处理（设置 _odOrigAtk），
           此处仅做 CD 相关调整，不再重复翻倍以纠正 Round7 发现的 4x 伤害 Bug */
        /* R29-C-003: 秘密宝牌引力武器冷却减免
           R52: 使用 _origBaseCd 而非 _baseCd 计算，防止与 Spawn.js 筒顺减CD双重压缩 */
        if (cdReduction > 0) {
            /* R287-P1: 优先使用 _origBaseCd 而非 _baseCd，防止与 Spawn.js 筒顺减CD双重压缩 */
            var cdBase = w._origBaseCd || w._baseCd || w.cd;
            w.cd = Math.max(this.player.cdFloor || Balance.DEFAULT_CD_FLOOR, cdBase * (1 - cdReduction));
        } else {
            /* R176-P0: 确保cd不会被重置为低于floor的值 */
            var floor = this.player.cdFloor || Balance.DEFAULT_CD_FLOOR;
            /* R199-P0: 恢复_baseCd为_origBaseCd（已含筒顺修改），避免除法恢复导致数值膨胀 */
            /* R204-P0: _tongCdReduction非零时需保留筒顺降幅，直接恢复_origBaseCd会清掉筒顺记录 */
            if (w._tongCdReduction > 0) {
                w._baseCd = Math.max(floor, w._origBaseCd * (1 - w._tongCdReduction));
            } else {
                w._baseCd = w._origBaseCd;
            }
            w.cd = Math.max(floor, w._baseCd || w._origBaseCd || w.cd);
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
        if (!ge || !ge.alive) continue;
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
        var candidatesSeen = {};
        for (var dgx = -1; dgx <= 1; dgx++) {
            for (var dgy = -1; dgy <= 1; dgy++) {
                var ck = (pgx + dgx) + ',' + (pgy + dgy);
                if (grid[ck]) {
                    for (var ci = 0; ci < grid[ck].length; ci++) {
                        var ce = grid[ck][ci];
                        if (ce.alive && !p.hitEnemies.has(ce.id) && !candidatesSeen[ce.id]) {
                            candidates.push(ce);
                            candidatesSeen[ce.id] = true;
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
            if (_dx * _dx + _dy * _dy <= _radiusSum * _radiusSum) {
                e.takeDamage(p.damage, 'player', p.x, p.y); /* R260-P0: 武器弹道伤害源传'player'确保暴击/冰冻/吸血/爆炸等玩家被动正常触发 */
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

/* ══════════════════════════════════════════════
   敌方弹道管理 — 权威实现在 GameEngine.Events.js
   ══════════════════════════════════════════════ */

})();
