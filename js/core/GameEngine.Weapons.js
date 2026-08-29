(function() {
    'use strict';
    var Gp = window.GameEngine.prototype;

/* ── 武器协同检测 ── */

Gp._checkWeaponSynergies = function() {
    /* 重置所有协同标记 */
    this._synBladeLaser = false;
    this._synBladeShotgun = false;
    this._synBladeOrbit = false;
    this._synOrbitSlammer = false;
    this._synNovaLaser = false;
    this._synNovaShotgun = false;
    this._synSlammerLaser = false;
    this._synNovaOrbit = false;

    /* 收集已装备武器ID */
    var ids = {};
    for (var _si = 0; _si < this._activeWeapons.length; _si++) {
        ids[this._activeWeapons[_si].id] = true;
    }

    /* 检查每种协同 */
    if (window.rewardManager && window.rewardManager.weaponSynergies) {
        var syms = window.rewardManager.weaponSynergies;
        for (var _sm = 0; _sm < syms.length; _sm++) {
            var sym = syms[_sm];
            var hasAll = true;
            for (var _sw = 0; _sw < sym.weapons.length; _sw++) {
                if (!ids[sym.weapons[_sw]]) { hasAll = false; break; }
            }
            if (hasAll && sym.apply) {
                sym.apply(this);
            }
        }
    }
};

/* ══════════════════════════════════════════════
   神兵装备栏 UI 渲染与同步
   ══════════════════════════════════════════════ */

Gp._renderWeaponSlots = function() {
    if (!this._weaponSlotsEl) return;
    this._weaponSlotsEl.innerHTML = '';
    var maxSlots = this.player.maxWeaponSlots || 6;
    for (var i = 0; i < this._activeWeapons.length; i++) {
        var w = this._activeWeapons[i];
        var info = window.rewardManager && window.rewardManager.weaponInfos[w.id] ? window.rewardManager.weaponInfos[w.id] : { name: w.id, color: '#888' };
        var pct = w.cd > 0 ? Math.max(0, Math.min(100, (1 - w.cooldownTimer / w.cd) * 100)) : 100;
        var slot = document.createElement('div');
        slot.className = 'weapon-slot';
        slot.dataset.widx = i;
        slot.innerHTML =
            '<div class="ws-icon" style="background:' + info.color + ';color:' + info.color + '"></div>' +
            '<div class="ws-name">' + info.name + '</div>' +
            '<div class="ws-cd-track"><div class="ws-cd-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="ws-level">Lv.' + w.level + '</div>' +
            '<div class="ws-cd-text"></div>';
        this._weaponSlotsEl.appendChild(slot);
    }
    // Slot limit indicator
    var limitEl = this._weaponSlotsEl.querySelector('.ws-limit');
    if (!limitEl) {
        limitEl = document.createElement('span');
        limitEl.className = 'ws-limit';
        this._weaponSlotsEl.appendChild(limitEl);
    }
    limitEl.textContent = this._activeWeapons.length + '/' + maxSlots;
};

Gp._syncWeaponSlotBar = function() {
    if (!this._weaponSlotsEl) return;
    var slots = this._weaponSlotsEl.children;
    for (var i = 0; i < this._activeWeapons.length && i < slots.length; i++) {
        var w = this._activeWeapons[i];
        var slot = slots[i];
        var fill = slot.querySelector('.ws-cd-fill');
        if (fill) {
            var pct = w.cd > 0 ? Math.max(0, Math.min(100, (1 - w.cooldownTimer / w.cd) * 100)) : 100;
            fill.style.width = pct + '%';
            if (w.cooldownTimer > 0) {
                slot.classList.add('on-cd');
                var cdText = slot.querySelector('.ws-cd-text');
                if (cdText) cdText.textContent = Math.ceil(w.cooldownTimer) + 's';
            } else {
                slot.classList.remove('on-cd');
                var cdText2 = slot.querySelector('.ws-cd-text');
                if (cdText2) cdText2.textContent = '';
            }
        }
        var lvEl = slot.querySelector('.ws-level');
        if (lvEl) lvEl.textContent = 'Lv.' + w.level;
    }
};

/* ── 武器槽位管理 ── */

Gp._syncWeaponSlots = function() {
    if (!this.player) return;
    this.player.weaponSlots = this._activeWeapons.map(function(w) { return { id: w.id, level: w.level }; });
};

Gp._addWeapon = function(weaponId) {
    if (this._activeWeapons.length >= this.player.maxWeaponSlots) return null;
    var W = window[weaponId];
    if (!W) return null;
    /* X8 修复: 同名武器已存在时升级为已有武器而非重复添加 */
    for (var i = 0; i < this._activeWeapons.length; i++) {
        if (this._activeWeapons[i].id === weaponId) {
            this._upgradeWeapon(i);
            return this._activeWeapons[i];
        }
    }
    var w = new W(1);
    this._activeWeapons.push(w);
    this._syncWeaponSlots();
    this._renderWeaponSlots();
    /* 武器协同检测 */
    this._checkWeaponSynergies();
    return w;
};

Gp._replaceWeapon = function(oldIndex, newWeaponId) {
    if (oldIndex < 0 || oldIndex >= this._activeWeapons.length) return null;
    var old = this._activeWeapons[oldIndex];
    if (typeof old.reset === 'function') old.reset();
    var W = window[newWeaponId];
    if (!W) return null;
    var w = new W(1);
    this._activeWeapons[oldIndex] = w;
    this._syncWeaponSlots();
    this._renderWeaponSlots();
    /* 武器协同检测 */
    this._checkWeaponSynergies();
    return w;
};

Gp._upgradeWeapon = function(index) {
    if (index < 0 || index >= this._activeWeapons.length) return false;
    this._activeWeapons[index].upgrade();
    this._syncWeaponSlots();
    this._renderWeaponSlots();
    /* 武器协同检测 */
    this._checkWeaponSynergies();
    return true;
};

/* ── 在快照中包含武器数据 ── */

var _origSnapshot = window.saveManager.snapshotForRun;
window.saveManager.snapshotForRun = function(engine) {
    var snap = _origSnapshot.call(this, engine);
    snap.weapons = engine._activeWeapons.map(function(w) { return { id: w.id, level: w.level, cooldownTimer: w.cooldownTimer, baseCd: w._baseCd, cd: w.cd, atkFactor: w.atkFactor }; });
    return snap;
};

})();
