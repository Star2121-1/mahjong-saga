/* ══════════════════════════════════════════════
   Game Combat — 战斗辅助系统
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
    var arr = engine._pendingExpGems = engine._pendingExpGems || [];
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

/* ── 击杀奖励已委托给 GameEngine._rewardKill ── */

/* ── 装备掉落 ── (已迁移至 GameEngine._tryDropEquipment) */
/* Cs.tryDropEquipment 已废弃，保留此注释防止重复添加 */

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
    setTimeout(function() { el.remove(); }, Balance.FLOAT_TEXT_TIMEOUT_MS);
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
    setTimeout(function() { el.remove(); }, Balance.FLOAT_TEXT_TIMEOUT_MS);
};

/* Cs.spawnExpText 已废弃 — Gp._spawnExpText 在 Endgame.js 中作为独立方法使用，此版本从未被外部调用 */
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
    setTimeout(function() { el.remove(); }, Balance.FLOAT_TEXT_TIMEOUT_MS);
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
    setTimeout(function() { el.remove(); }, Balance.EXPLOSION_EFFECT_TIMEOUT);
};

/* Cs.screenShake 已废弃 — 使用 Gp._screenShake */

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
    setTimeout(function() { if (el.parentNode) el.remove(); }, Balance.CAUSALITY_TIMEOUT_MS);
};

/* Cs.triggerKnightDodgeSlam 已废弃 — 使用 Gp._triggerKnightDodgeSlam */

})();
