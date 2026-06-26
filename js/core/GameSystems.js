/* ══════════════════════════════════════════════
   麻将江湖 — 游戏系统 (Game Systems)
   Epoch 5 — GameEngine.js 解耦拆分
   ══════════════════════════════════════════════ */

(function() {

window.Systems = {};
var Sys = window.Systems;

/* ── Overdrive ── */

Sys.triggerOverdrive = function(engine) {
    if (engine._overdriveActive) return;
    engine._overdriveActive = true;
    engine._overdriveTimer = 3.0;
    engine.player.rage = 0;
    if (engine._syncUI) engine._syncUI();
    engine._origCdFloor = engine.player.cdFloor;
    engine.player.cdFloor = 0;

    for (var oi = 0; oi < engine.enemies.length; oi++) {
        var oe = engine.enemies[oi];
        if (oe.alive && !oe._overdriveStored) {
            oe._overdriveStored = true;
            oe._overdriveOrigSpeed = oe.speed;
            oe.speed = 0;
        }
    }

    if (engine.container) engine.container.classList.add('overdrive-active');
    engine.triggerShake(0.5, 3000);
    Sys.spawnCausalityText(engine, '☀☀☀ Overdrive 轰炸 ☀☀☀');

    /* 成就：Overdrive 计数 */
    engine._overdriveCount = (engine._overdriveCount || 0) + 1;
    if (engine._overdriveCount >= 1) engine._checkAchievement('overdrive_1');
    if (engine._overdriveCount >= 10) engine._checkAchievement('overdrive_10');
    if (engine._overdriveCount >= 50) engine._checkAchievement('overdrive_50');
};

Sys.endOverdrive = function(engine) {
    if (!engine._overdriveActive) return;
    engine._overdriveActive = false;
    engine._overdriveTimer = 0;

    if (engine.player) engine.player.cdFloor = engine._origCdFloor || 0.2;

    for (var oi = 0; oi < engine.enemies.length; oi++) {
        var oe = engine.enemies[oi];
        if (oe._overdriveStored) {
            oe.speed = oe._overdriveOrigSpeed || oe.baseSpeed;
            oe._overdriveStored = false;
            oe._overdriveOrigSpeed = undefined;
        }
    }

    if (engine.container) engine.container.classList.remove('overdrive-active');
};

/* ── 突变系统 ── */

Sys.showMutatorPanel = function(engine) {
    if (!engine.mutatorOverlay || !engine.mutatorChoices) return;
    engine.running = false;
    engine._freezeClock();
    engine.mutatorChoices.innerHTML = '';
    var self = engine;

    var choices = [
        { id: 'gravity', title: '引力逆转', desc: '经验吸附范围归零，必须肉身拾取', icon: '🧲' },
        { id: 'bloodmoon', title: '狂暴血月', desc: '怪物体型+30%，攻击+40%，掉落翻倍', icon: '🌍' },
        { id: 'frenzy', title: '狂乱', desc: '怪物移速+50%，金币掉落+50%', icon: '⚡' },
        { id: 'frailty', title: '脆弱', desc: '攻击倍率双向提升——你打得更痛，你也更容易倒下', icon: '🟡' },
        { id: 'wither', title: '枯萎', desc: '整体怪物每5秒损失5%最大HP', icon: '☠️' }
    ];

    for (var i = 0; i < choices.length; i++) {
        var c = choices[i];
        var card = document.createElement('div');
        card.className = 'mutator-card';
        card.innerHTML =
            '<div class="mutator-card-icon">' + c.icon + '</div>' +
            '<div class="mutator-card-title">' + c.title + '</div>' +
            '<div class="mutator-card-desc">' + c.desc + '</div>' +
            '<button class="mutator-btn">选择</button>';
        (function(cid) {
            card.querySelector('.mutator-btn').addEventListener('click', function() {
                Sys.applyMutator(self, cid);
            });
        })(c.id);
        this.mutatorChoices.appendChild(card);
    }
    engine.mutatorOverlay.classList.add('active');
};

Sys.applyMutator = function(engine, mutatorId) {
    engine._activeMutator = mutatorId;
    engine.mutatorOverlay.classList.remove('active');
    if (mutatorId === 'gravity') {
        engine._origMagnetRadius = engine.player.magnetRadius;
        engine.player.magnetRadius = 0;
    } else if (mutatorId === 'bloodmoon') {
        for (var i = 0; i < engine.enemies.length; i++) {
            var e = engine.enemies[i];
            if (!e.alive) continue;
            e.atk = Math.floor(e.atk * 1.4);
            e.maxHp = Math.floor(e.maxHp * 1.3);
            e.hp = Math.floor(e.hp * 1.3);
            var el = engine._enemyElements.get(e.id);
            if (el) el.style.transform = 'scale(1.3)';
        }
    } else if (mutatorId === 'frenzy') {
        for (var i = 0; i < engine.enemies.length; i++) {
            var e = engine.enemies[i];
            if (!e.alive) continue;
            if (!e._frenzyStored) {
                e._frenzyStored = true;
                e._frenzyOrigSpeed = e.speed;
                e.speed = Math.floor(e.speed * 1.5);
            }
        }
    } else if (mutatorId === 'frailty') {
        engine._frailtyOrigPlayerAtk = engine.player.atk;
        engine.player.atk = Math.floor(engine.player.atk * 1.5);
        for (var i = 0; i < engine.enemies.length; i++) {
            var e = engine.enemies[i];
            if (!e.alive) continue;
            if (!e._frailtyStored) {
                e._frailtyStored = true;
                e._frailtyOrigAtk = e.atk;
                e.atk = Math.floor(e.atk * 1.5);
            }
        }
    } else if (mutatorId === 'wither') {
        engine._witherTimer = 0;
    }
    engine._beginLoop();
};

Sys.clearMutatorEffects = function(engine) {
    if (engine._activeMutator === 'gravity' && engine._origMagnetRadius != null) {
        engine.player.magnetRadius = engine._origMagnetRadius;
    }
    if (engine._activeMutator === 'bloodmoon') {
        for (var i = 0; i < engine.enemies.length; i++) {
            var e = engine.enemies[i];
            var el = engine._enemyElements.get(e.id);
            if (el) el.style.transform = '';
        }
    }
    if (engine._activeMutator === 'frenzy') {
        for (var i = 0; i < engine.enemies.length; i++) {
            var e = engine.enemies[i];
            if (e._frenzyStored) {
                e.speed = e._frenzyOrigSpeed || e.baseSpeed;
                e._frenzyStored = false;
                e._frenzyOrigSpeed = undefined;
            }
        }
    }
    if (engine._activeMutator === 'frailty') {
        if (engine._frailtyOrigPlayerAtk != null) engine.player.atk = engine._frailtyOrigPlayerAtk;
        for (var i = 0; i < engine.enemies.length; i++) {
            var e = engine.enemies[i];
            if (e._frailtyStored) {
                e.atk = e._frailtyOrigAtk || e.baseAtk;
                e._frailtyStored = false;
                e._frailtyOrigAtk = undefined;
            }
        }
    }
    engine._activeMutator = null;
    engine._origMagnetRadius = null;
};

/* ── 套装共鸣 ── */

Sys.updateResonanceAuras = function(engine, dt) {
    if (!engine.player) return;
    /* 焰痕 */
    if (engine.player.setResonanceSpeed && !engine._pendingReward) {
        engine._flameAuraTimer = (engine._flameAuraTimer || 0) + dt;
        if (engine._flameAuraTimer >= 0.5) {
            engine._flameAuraTimer = 0;
            var px = engine.player.x;
            var py = engine.player.y;
            var auraR = 80;
            var dmg = Math.floor(engine.player.atk * 0.3);
            for (var ae = 0; ae < engine.enemies.length; ae++) {
                var e = engine.enemies[ae];
                if (!e.alive) continue;
                var adx = e.x - px;
                var ady = e.y - py;
                if (adx * adx + ady * ady <= auraR * auraR) {
                    e.takeDamage(dmg);
                }
            }
            var auraEl = document.createElement('div');
            auraEl.className = 'resonance-flame';
            auraEl.style.left = (px - auraR) + 'px';
            auraEl.style.top = (py - auraR) + 'px';
            auraEl.style.width = (auraR * 2) + 'px';
            auraEl.style.height = (auraR * 2) + 'px';
            engine._worldLayer.appendChild(auraEl);
            setTimeout(function() { if (auraEl.parentNode) auraEl.remove(); }, 400);
        }
    }
    /* 永冻 */
    if (engine.player.setResonanceIce && !engine._pendingReward) {
        engine._iceAuraTimer = (engine._iceAuraTimer || 0) + dt;
        if (engine._iceAuraTimer >= 0.8) {
            engine._iceAuraTimer = 0;
            var px2 = engine.player.x;
            var py2 = engine.player.y;
            var iceR = 60;
            var dur = 0.5 + (engine.player.iceDurationBonus || 0);
            for (var ie = 0; ie < engine.enemies.length; ie++) {
                var e2 = engine.enemies[ie];
                if (!e2.alive) continue;
                var idx = e2.x - px2;
                var idy = e2.y - py2;
                if (idx * idx + idy * idy <= iceR * iceR) {
                    e2.frozen = true;
                    e2.frozenTimer = dur;
                    if (e2.el) e2.el.classList.add('frozen-crystal');
                }
            }
            var iceEl = document.createElement('div');
            iceEl.className = 'resonance-ice';
            iceEl.style.left = (px2 - iceR) + 'px';
            iceEl.style.top = (py2 - iceR) + 'px';
            iceEl.style.width = (iceR * 2) + 'px';
            iceEl.style.height = (iceR * 2) + 'px';
            engine._worldLayer.appendChild(iceEl);
            setTimeout(function() { if (iceEl.parentNode) iceEl.remove(); }, 500);
        }
    }
};

/* ── 枯萎突变 ── */

Sys.updateWither = function(engine, dt) {
    if (engine._activeMutator === 'wither' && !engine._pendingReward) {
        engine._witherTimer += dt;
        if (engine._witherTimer >= 5) {
            engine._witherTimer = 0;
            for (var wi = 0; wi < engine.enemies.length; wi++) {
                var we = engine.enemies[wi];
                if (!we.alive) continue;
                var dmg = Math.max(1, Math.floor(we.maxHp * 0.05));
                we.takeDamage(dmg, 'wither');
            }
        }
    }
};

/* ── 震动 ── */

Sys.triggerShake = function(engine, intensity, duration) {
    if (!engine.container) return;
    intensity = intensity || 1;
    duration = duration || 200;
    if (engine._shakeTimer > 0 && engine._shakeIntensity >= intensity) return;
    engine._shakeTimer = duration / 1000;
    engine._shakeIntensity = intensity;
    engine.container.classList.add('screen-shake-active');
    if (intensity >= 2) {
        engine.container.style.animationDuration = '0.06s';
    } else {
        engine.container.style.animationDuration = '0.1s';
    }
};

Sys.updateShake = function(engine, dt) {
    if (engine._shakeTimer > 0) {
        engine._shakeTimer -= dt;
        if (engine._shakeTimer <= 0) {
            engine._shakeTimer = 0;
            if (engine.container) {
                engine.container.classList.remove('screen-shake-active');
                engine.container.style.animationDuration = '';
            }
        }
    }
};

/* ── Overdrive 计时 ── */

Sys.updateOverdrive = function(engine, dt) {
    if (engine._overdriveActive) {
        engine._overdriveTimer -= dt;
        if (engine._overdriveTimer <= 0) Sys.endOverdrive(engine);
    }
};

})();
