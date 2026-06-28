/* ══════════════════════════════════════════════
   麻将江湖 — 战斗系统 (Game Combat)
   Epoch 5 — GameEngine.js 解耦拆分
   ══════════════════════════════════════════════ */

(function() {

window.CombatSystem = {};
var Cs = window.CombatSystem;

/* ── 掉落金币 ── */

Cs.spawnCoinsAt = function(engine, x, y, isBoss, level) {
    level = level || 1;
    var count = isBoss ? Math.floor(5 + level * 0.5 + Math.random() * 4) : Math.floor(3 + level * 0.3 + Math.random() * 3);
    var _vaultBlood = engine._vaultMutations && engine._vaultMutations.indexOf('bloodmoon') !== -1;
    if (engine._activeMutator === 'bloodmoon' || _vaultBlood) count *= 2;
    if (engine._activeMutator === 'frenzy') count = Math.floor(count * 1.5);
    for (var i = 0; i < count; i++) {
        var cx = x + (Math.random() - 0.5) * 20;
        var cy = y + (Math.random() - 0.5) * 20;
        var el = document.createElement('div');
        el.className = 'coin-placeholder';
        el.style.left = (cx - 6) + 'px';
        el.style.top = (cy - 6) + 'px';
        engine._worldLayer.appendChild(el);
        engine._activeCoins.push({ x: cx, y: cy, el: el });
    }
};

/* ── 掉落经验石 ── */

Cs.spawnExpGemsAt = function(engine, x, y, isBoss, level) {
    var diff = 1;
    try {
        var cfg = window.levelConfig[engine._currentLevelId];
        if (cfg) diff = cfg.difficultyFactor || 1;
    } catch(e) {}
    var _vaultBloodGem = engine._vaultMutations && engine._vaultMutations.indexOf('bloodmoon') !== -1;
    var bloodMul = (engine._activeMutator === 'bloodmoon' || _vaultBloodGem) ? 2 : 1;
    var arr = window.expGems = window.expGems || [];
    if (isBoss) {
        var cnt = 5 + Math.floor(Math.random() * 4);
        var avg = Math.floor(25 * bloodMul / cnt);
        var rem = 25 * bloodMul - avg * cnt;
        for (var gi = 0; gi < cnt; gi++) {
            var v = avg + (gi < rem ? 1 : 0);
            arr.push(new window.ExpGem(x, y, v));
        }
    } else {
        level = level || 1;
        var gemVal = Math.floor((1 + level * 0.5) * diff * bloodMul);
        if (gemVal < 1) gemVal = 1;
        arr.push(new window.ExpGem(x, y, gemVal));
    }
};

/* ── 击杀奖励（已委托给 GameEngine._rewardKill，此函数保留作为别名） ── */

Cs.rewardKill = function(engine, enemy) {
    engine._rewardKill(enemy);
};

/* ── 装备掉落 ── */

Cs.tryDropEquipment = function(engine, x, y, isBossLord) {
    if (!window.equipmentRegistry || !window.saveManager) return;
    var chance = isBossLord ? 1.0 : 0.25;
    if (Math.random() > chance) return;
    var roll = Math.random();
    var quality = roll < 0.1 ? 'legendary' : roll < 0.4 ? 'epic' : 'rare';
    var protoIds = Object.keys(window.equipmentRegistry.equipPool);
    var protoId = protoIds[Math.floor(Math.random() * protoIds.length)];
    var item = window.equipmentRegistry.createItem(protoId, quality);
    if (!item) return;
    var meta = window.saveManager._metaCache;
    if (!meta) return;
    meta.equipments = meta.equipments || [];
    meta.equipments.push(item);
    window.saveManager._saveMetaToStorage();
    var qualityLabel = { rare: '稀有', epic: '史诗', legendary: '传说' }[quality] || quality;
    engine._spawnCausalityText('🎁 获得装备：' + item.name + ' (' + qualityLabel + ')');
};

/* ── 飘字 ── */

Cs.spawnFloatText = function(engine, x, y, text, isCrit) {
    if (window.fxManager) {
        window.fxManager.spawnText(x, y, text, isCrit ? 'crit' : 'normal');
        return;
    }
    var el = document.createElement('div');
    el.className = 'damage-float' + (isCrit ? ' crit' : '');
    el.textContent = '-' + text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (isCrit) {
        el.style.color = '#b62929';
    } else {
        el.style.color = '#1e6f42';
    }
    engine._worldLayer.appendChild(el);
    setTimeout(function() { el.remove(); }, 650);
};

Cs.spawnHealText = function(engine, x, y, amount) {
    if (window.fxManager) {
        window.fxManager.spawnText(x, y - 20, '+' + amount, 'heal');
        return;
    }
    var el = document.createElement('div');
    el.className = 'damage-float heal';
    el.textContent = '+' + amount;
    el.style.left = x + 'px';
    el.style.top = (y - 20) + 'px';
    engine._worldLayer.appendChild(el);
    setTimeout(function() { el.remove(); }, 650);
};

Cs.spawnExpText = function(engine, x, y, amount) {
    if (window.fxManager) {
        window.fxManager.spawnText(x - 10, y - 40, '+' + amount + 'EXP', 'exp');
        return;
    }
    var el = document.createElement('div');
    el.className = 'damage-float exp-gain';
    el.textContent = '+' + amount + 'EXP';
    el.style.left = (x - 10) + 'px';
    el.style.top = (y - 40) + 'px';
    engine._worldLayer.appendChild(el);
    setTimeout(function() { el.remove(); }, 650);
};

/* ── 爆炸效果 ── */

Cs.spawnExplosion = function(engine, x, y, radius, damage, excludeId) {
    for (var ei = 0; ei < engine.enemies.length; ei++) {
        var e = engine.enemies[ei];
        if (!e.alive) continue;
        if (e.id === excludeId) continue;
        var dx = e.x - x;
        var dy = e.y - y;
        if (dx * dx + dy * dy <= radius * radius) {
            e.takeDamage(damage, 'splash');
        }
    }
    var el = document.createElement('div');
    el.className = 'explosion-effect';
    var d = radius * 2;
    el.style.left = (x - radius) + 'px';
    el.style.top = (y - radius) + 'px';
    el.style.width = d + 'px';
    el.style.height = d + 'px';
    engine._worldLayer.appendChild(el);
    setTimeout(function() { el.remove(); }, 400);
};

/* ── 屏幕震动 ── */

Cs.screenShake = function(engine) {
    engine.triggerShake(1, 200);
};

/* ── 成就文本 ── */

Cs.spawnAchievementText = function(engine, text) {
    var el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:absolute;top:15%;left:50%;transform:translate(-50%,-50%);font-size:28px;font-weight:900;color:#ffd700;text-shadow:0 0 24px rgba(255,215,0,0.9),0 0 48px rgba(255,215,0,0.5);z-index:210;pointer-events:none;white-space:nowrap;animation:achievePop 2.5s ease-out forwards;';
    engine.battlefield.appendChild(el);
    var self = engine;
    setTimeout(function() { if (el.parentNode) el.remove(); }, 2600);
};

/* ── 因果文本 ── */

Cs.spawnCausalityText = function(engine, text) {
    var el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:absolute;top:20%;left:50%;transform:translate(-50%,-50%);font-size:24px;font-weight:900;color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,0.8),0 0 40px rgba(255,215,0,0.4);z-index:200;pointer-events:none;white-space:nowrap;animation:floatUp 0.6s ease-out forwards;';
    engine.battlefield.appendChild(el);
    var self = engine;
    setTimeout(function() { if (el.parentNode) el.remove(); }, 2000);
};

/* ── 骑士闪避冲撞 ── */

Cs.triggerKnightDodgeSlam = function(engine) {
    var px = engine.player.x;
    var py = engine.player.y;
    var slamRadius = 100;
    var slamEl = document.createElement('div');
    slamEl.style.cssText = 'position:absolute;left:' + (px - slamRadius) + 'px;top:' + (py - slamRadius) + 'px;width:' + (slamRadius * 2) + 'px;height:' + (slamRadius * 2) + 'px;border-radius:50%;border:2px solid rgba(255,255,255,0.6);pointer-events:none;z-index:15;';
    engine._worldLayer.appendChild(slamEl);
    engine.triggerShake(1, 200);
    setTimeout(function() { if (slamEl.parentNode) slamEl.remove(); }, 300);
    for (var i = 0; i < engine.enemies.length; i++) {
        var e = engine.enemies[i];
        if (!e.alive) continue;
        var dx = e.x - px;
        var dy = e.y - py;
        if (dx * dx + dy * dy <= slamRadius * slamRadius) {
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            var force = 200;
            e.x += (dx / dist) * force;
            e.y += (dy / dist) * force;
            e._knockbackVelocity = 200;
            if (typeof e._clampPosition === 'function') e._clampPosition(engine);
        }
    }
};

})();
