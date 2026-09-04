/* ══════════════════════════════════════════════
   Game Combat — 战斗辅助系统
   Epoch 5 — GameEngine.js 解耦拆分
   ══════════════════════════════════════════════ */

(function() {

window.CombatSystem = window.CombatSystem || {};
var Cs = window.CombatSystem;

/* ── 已迁移：以下功能均有 Gp.* 独立实现在 GameEngine.*.js 中，
       Cs.* 函数通过 this._combat 委托链调用，但运行时未被实际调用。
       保留注释说明用途，供后续参考：

       Cs.spawnCoinsAt    → Gp._spawnCoinsAt  (GameEngine.Spawn.js)
       Cs.spawnExpGemsAt  → Gp._spawnExpGemsAt (GameEngine.Spawn.js)
       Cs.spawnFloatText  → Gp._spawnFloatText (GameEngine.Endgame.js)
       Cs.spawnHealText   → Gp._spawnHealText  (GameEngine.Endgame.js)
       Cs.spawnExpText    → Gp._spawnExpText   (GameEngine.Endgame.js)
       Cs.spawnExplosion  → Gp._spawnExplosion (GameEngine.Endgame.js)
       Cs.spawnAchievementText → Gp._spawnAchievementText (GameEngine.Combat.js)
   ─────────────────────────────────────────────────────────── */

/* ── 因果文本 ── */
/* 唯一存活的 Cs 函数，被 GameSystems.js:63 直接调用（不经过 this._combat） */

Cs.spawnCausalityText = function(engine, text) {
    if (!engine || !engine.battlefield) return;
    /* R171-P1: 防止并发成就解锁时DOM叠加，500ms内只允许一个因果文本 */
    var now = Date.now();
    if (engine._lastCausalityTime && now - engine._lastCausalityTime < 500) return;
    engine._lastCausalityTime = now;
    var el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:absolute;top:20%;left:50%;transform:translate(-50%,-50%);font-size:24px;font-weight:900;color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,0.8),0 0 40px rgba(255,215,0,0.4);z-index:200;pointer-events:none;white-space:nowrap;animation:floatUp 0.6s ease-out forwards;';
    engine.battlefield.appendChild(el);
    var self = engine;
    setTimeout(function() { if (el.parentNode) el.remove(); }, Balance.CAUSALITY_TIMEOUT_MS);
};

})();
