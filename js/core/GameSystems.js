/* ══════════════════════════════════════════════
   麻将江湖 — 游戏系统 (Game Systems)
   Epoch 5 — GameEngine.js 解耦拆分
   修复 — spawnCausalityText 委托给 CombatSystem
   ══════════════════════════════════════════════ */

(function() {

window.Systems = {};
var Sys = window.Systems;

/* 委托 CombatSystem 用于因果文本等战斗特效 */
window.CombatSystem = window.CombatSystem || {};
var Cs = window.CombatSystem;

/* ── Overdrive ── */

Sys.triggerOverdrive = function(engine) {
    if (engine._overdriveActive) return;
    engine._overdriveActive = true;
    engine._overdriveTimer = Balance.OVERDRIVE_DURATION;
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
            oe.frozen = true; /* R268-P1: 必须同步设置frozen=true，确保Enemy.update()完整跳过AI和攻击计时器 */
            oe._overdriveFrozen = true; /* R268-P1: 与Events.js fallback路径保持一致 */
        }
    }

    /* Overdrive: 武器伤害倍增 +100% */
    for (var _wi = 0; _wi < (engine._activeWeapons || []).length; _wi++) {
        var _w = engine._activeWeapons[_wi];
        if (_w && _w._odOrigAtk === undefined) _w._odOrigAtk = _w.atkFactor;
        if (_w) _w.atkFactor = _w._odOrigAtk * 2; /* R238-P0: 移除 || _w.atkFactor 兜底，防止_odOrigAtk被清空后二次叠加 */
    }
    if (engine.container) engine.container.classList.add('overdrive-active');
    /* R232-P1: Overdrive触发时添加震屏反馈，与其他强力技能一致 */
    if (engine.triggerShake) engine.triggerShake(2, 400);

    /* Overdrive 全屏冲击波白闪 */
    var flash = document.createElement('div');
    flash.id = 'overdrive-flash';
    engine.container.appendChild(flash);
    setTimeout(function() { if (flash.parentNode) flash.remove(); }, 650); /* R182-P0: 从350ms延长至650ms，对齐CSS动画0.6s时长，防止闪白提前截断 */

    /* Visual Enhancement C: Overdrive 金色流光粒子爆发 */
    if (engine._worldLayer) {
        for (var _ob = 0; _ob < 8; _ob++) {
            var burst = document.createElement('div');
            burst.className = 'legendary-burst';
            burst.style.left = (engine.player.x + (Math.random() - 0.5) * 100) + 'px';
            burst.style.top = (engine.player.y + (Math.random() - 0.5) * 100) + 'px';
            burst.style.background = 'radial-gradient(circle, rgba(255,215,0,0.6), rgba(255,152,0,0))';
            engine._worldLayer.appendChild(burst);
            setTimeout(function(el) { if (el && el.parentNode) el.remove(); }, 800, burst);
        }
    }

    Cs.spawnCausalityText(engine, '☀☀☀ Overdrive 轰炸 ☀☀☀');

    /* 成就：Overdrive 计数 */
    engine._overdriveCount = (engine._overdriveCount || 0) + 1;
    /* R188-P1: 统一使用_inflight机制，与crit_master/dodge_king保持一致 */
    if (engine._overdriveCount >= 1) engine._checkAchievementInflight('overdrive_1', engine._overdriveCount);
    if (engine._overdriveCount >= 10) engine._checkAchievementInflight('overdrive_10', engine._overdriveCount);
    if (engine._overdriveCount >= 50) engine._checkAchievementInflight('overdrive_50', engine._overdriveCount);
};

Sys.endOverdrive = function(engine) {
    if (!engine._overdriveActive) return;
    engine._overdriveActive = false;
    engine._overdriveTimer = 0;

    if (engine.player) engine.player.cdFloor = engine._origCdFloor !== undefined ? engine._origCdFloor : Balance.DEFAULT_CD_FLOOR;
    engine._origCdFloor = null; /* P0: 清除跨局残留 */

    /* P2: 恢复武器原始伤害（triggerOverdrive 曾将其×2） */
    for (var _wi = 0; _wi < (engine._activeWeapons || []).length; _wi++) {
        var _w = engine._activeWeapons[_wi];
        if (_w && _w._odOrigAtk !== undefined) {
            _w.atkFactor = _w._odOrigAtk;
            _w._odOrigAtk = undefined;
        }
    }

    for (var oi = 0; oi < engine.enemies.length; oi++) {
        var oe = engine.enemies[oi];
        if (oe._overdriveStored) {
            oe.speed = oe._overdriveOrigSpeed !== undefined ? oe._overdriveOrigSpeed : oe.baseSpeed;
            oe._overdriveStored = false;
            oe._overdriveOrigSpeed = undefined;
            oe.frozen = false; /* R268-P1: 恢复frozen状态，防止战后敌人永久冻结 */
            oe._overdriveFrozen = false;
        }
    }
    /* R205-P0: 二次扫描清除过驱动期间新刷出敌人的残留冻结状态 — 首次迭代时不在数组中的敌人未被恢复 */
    for (var oi2 = 0; oi2 < engine.enemies.length; oi2++) {
        var oe2 = engine.enemies[oi2];
        if (oe2 && oe2._overdriveStored) {
            oe2.speed = oe2._overdriveOrigSpeed !== undefined ? oe2._overdriveOrigSpeed : oe2.baseSpeed;
            oe2._overdriveStored = false;
            oe2._overdriveOrigSpeed = undefined;
            oe2.frozen = false; /* R268-P1: 二次扫描也需恢复frozen状态 */
            oe2._overdriveFrozen = false;
        }
    }

    if (engine.container) engine.container.classList.remove('overdrive-active');
    /* R170-P1: 清除残存定时器，防止overdrive结束后状态泄漏 */
    if (engine._flameHideTimer) { clearTimeout(engine._flameHideTimer); engine._flameHideTimer = null; }
    if (engine._iceHideTimer) { clearTimeout(engine._iceHideTimer); engine._iceHideTimer = null; }
    /* R171-P1: 确保共振光环元素被隐藏，防止overdrive结束后仍可见 */
    if (engine._flameAuraEl && engine._flameAuraEl.style) engine._flameAuraEl.style.visibility = 'hidden';
    if (engine._iceAuraEl && engine._iceAuraEl.style) engine._iceAuraEl.style.visibility = 'hidden';
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
        engine.mutatorChoices.appendChild(card);
    }
    engine.mutatorOverlay.classList.add('active');
    /* R115-P0: 屏幕阅读器播报突变选择 */
    engine._announceToSR('波次突变：' + choices.map(function(c) { return c.title; }).join('，'));
};

Sys.applyMutator = function(engine, mutatorId) {
    window.audioManager && window.audioManager.play('reward'); /* R236-P0: 突变选择音频反馈 */
    engine._activeMutator = mutatorId;
    engine.mutatorOverlay.classList.remove('active');
    if (mutatorId === 'gravity') {
        engine._origMagnetRadius = engine.player.magnetRadius;
        engine.player.magnetRadius = 0;
    } else if (mutatorId === 'bloodmoon') {
        for (var i = 0; i < engine.enemies.length; i++) {
            var e = engine.enemies[i];
            if (!e.alive) continue;
            if (!e._bloodmoonStored) {
                e._bloodmoonStored = true;
                e._bloodmoonOrigAtk = e.atk;
                e._bloodmoonOrigMaxHp = e.maxHp;
                e._bloodmoonOrigHp = e.hp;
            } else {
                /* R71-P0: 已存储的敌人跳过乘算，防止跨波重复突变导致属性二次叠乘 */
                continue;
            }
            e.atk = Math.floor(e.atk * Balance.MUTATOR_BLOODMOON_ATK_MULT);
            e.maxHp = Math.floor(e.maxHp * Balance.MUTATOR_BLOODMOON_HP_MULT);
            e.hp = Math.floor(e.hp * Balance.MUTATOR_BLOODMOON_HP_MULT);
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
                e.speed = Math.round(e.speed * Balance.MUTATOR_FRENZY_SPEED_MULT);
            } else {
                /* R71-P0: 防止跨波重复狂乱突变导致速度二次叠乘 */
                continue;
            }
        }
    } else if (mutatorId === 'frailty') {
        /* L-008: 脆弱突变不再双向增益 — 玩家 +80% ATK 但受击伤害 +30% */
        /* R202-P0: 改为存储ATK倍增系数而非绝对值，解决升级期间atk变化导致恢复失真问题 */
        engine._frailtyBoost = Balance.MUTATOR_FRAILTY_PLAYER_ATK_MULT - 1;
        /* R204-P1: 存储实际APK快照，优先于_boost路径，避免_baseAtk滞后导致的恢复失真 */
        engine._frailtyOrigPlayerAtk = engine.player.atk;
        /* R143-P0: 修复脆弱突变防重入守卫 — 使用player级标志而非engine级，防止跨局重复叠乘ATK */
        if (!engine.player._frailtyStored) {
            engine.player._frailtyStored = true;
            engine.player.atk = Math.floor(engine.player.atk * Balance.MUTATOR_FRAILTY_PLAYER_ATK_MULT);
            engine.player._frailtyDebuff = true;
        }
        for (var i = 0; i < engine.enemies.length; i++) {
            var e = engine.enemies[i];
            if (!e.alive) continue;
            if (!e._frailtyStored) {
                e._frailtyStored = true;
                e._frailtyOrigAtk = e.atk;
                /* 敌人不再获得 ATK 加成 */
            }
        }
    } else if (mutatorId === 'wither') {
        engine._witherTimer = 0;
    }
    engine._beginLoop();
};

/* R130-P2: Sys.clearMutatorEffects 已废弃 — 实际实现在 Gp._clearMutatorEffects (Events.js:136) */

/* ── 套装共鸣 ── */

Sys.updateResonanceAuras = function(engine, dt) {
    if (!engine.player) return;
    /* M-004: 预创建共鸣节点池，切换 visibility 而非频繁 create/remove */
    if (!engine._flameAuraEl) {
        engine._flameAuraEl = document.createElement('div');
        engine._flameAuraEl.className = 'resonance-flame';
        engine._flameAuraEl.style.visibility = 'hidden';
        engine._worldLayer.appendChild(engine._flameAuraEl);
    }
    if (!engine._iceAuraEl) {
        engine._iceAuraEl = document.createElement('div');
        engine._iceAuraEl.className = 'resonance-ice';
        engine._iceAuraEl.style.visibility = 'hidden';
        engine._worldLayer.appendChild(engine._iceAuraEl);
    }
    /* 焰痕 */
    if (engine.player.setResonanceSpeed && !engine._pendingReward) {
        engine._flameAuraTimer = (engine._flameAuraTimer || 0) + dt;
        if (engine._flameAuraTimer >= Balance.FLAME_AURA_INTERVAL) {
            engine._flameAuraTimer = 0;
            var px = engine.player.x;
            var py = engine.player.y;
            var auraR = Balance.FLAME_AURA_RADIUS;
            var dmg = Math.floor(engine.player.atk * Balance.FLAME_AURA_DAMAGE_MULT); /* H-027: 从 0.15 降至 0.10 防 DPS 过高 */
            for (var ae = 0; ae < engine.enemies.length; ae++) {
                var e = engine.enemies[ae];
                if (!e.alive) continue;
                var adx = e.x - px;
                var ady = e.y - py;
                if (adx * adx + ady * ady <= auraR * auraR) {
                    e.takeDamage(dmg, 'player', px, py);
                }
            }
            var flameEl = engine._flameAuraEl;
            flameEl.style.left = (px - auraR) + 'px';
            flameEl.style.top = (py - auraR) + 'px';
            flameEl.style.width = (auraR * 2) + 'px';
            flameEl.style.height = (auraR * 2) + 'px';
            flameEl.style.visibility = 'visible';
            /* P1: 清除前一个timer防止泄漏 */
            clearTimeout(engine._flameHideTimer);
            var _flameHideTimer = setTimeout(function() { if (flameEl) flameEl.style.visibility = 'hidden'; }, 400);
            engine._flameHideTimer = _flameHideTimer;
        }
    }
    /* 永冻 */
    if (engine.player.setResonanceIce && !engine._pendingReward) {
        engine._iceAuraTimer = (engine._iceAuraTimer || 0) + dt;
        if (engine._iceAuraTimer >= Balance.ICE_AURA_INTERVAL) {
            engine._iceAuraTimer = 0;
            var px2 = engine.player.x;
            var py2 = engine.player.y;
            var iceR = Balance.ICE_AURA_RADIUS;
            var dur = Balance.ICE_AURA_BASE_DURATION + (engine.player.iceDurationBonus || 0);
            for (var ie = 0; ie < engine.enemies.length; ie++) {
                var e2 = engine.enemies[ie];
                if (!e2.alive) continue;
                var idx = e2.x - px2;
                var idy = e2.y - py2;
                if (idx * idx + idy * idy <= iceR * iceR) {
                    e2.frozen = true;
                    e2.frozenTimer = dur;
                    if (e2.el) { e2.el.classList.add('frozen-crystal'); e2.el.classList.add('frozen'); }
                    /* Visual Enhancement C: 冰冻冰晶扩散波纹 */
                    if (engine._worldLayer) {
                        var ring = document.createElement('div');
                        ring.className = 'freeze-crystal-ring';
                        ring.style.left = e2.x + 'px';
                        ring.style.top = e2.y + 'px';
                        engine._worldLayer.appendChild(ring);
                        setTimeout(function(el) { if (el && el.parentNode) el.remove(); }, 800, ring);
                        /* 冰晶碎片 */
                        for (var _ic = 0; _ic < 4; _ic++) {
                            var crystal = document.createElement('div');
                            crystal.className = 'ice-crystal';
                            crystal.style.left = e2.x + 'px';
                            crystal.style.top = e2.y + 'px';
                            crystal.style.setProperty('--rot', (45 + _ic * 45) + 'deg');
                            engine._worldLayer.appendChild(crystal);
                            setTimeout(function(el) { if (el && el.parentNode) el.remove(); }, 600, crystal);
                        }
                    }
                }
            }
            var iceEl = engine._iceAuraEl;
            iceEl.style.left = (px2 - iceR) + 'px';
            iceEl.style.top = (py2 - iceR) + 'px';
            iceEl.style.width = (iceR * 2) + 'px';
            iceEl.style.height = (iceR * 2) + 'px';
            iceEl.style.visibility = 'visible';
            /* P1: 清除前一个timer防止泄漏 */
            clearTimeout(engine._iceHideTimer);
            var _iceHideTimer = setTimeout(function() { if (iceEl) iceEl.style.visibility = 'hidden'; }, 500);
            engine._iceHideTimer = _iceHideTimer;
        }
    }
};

/* ── 枯萎突变 ── */

Sys.updateWither = function(engine, dt) {
    if (engine._activeMutator === 'wither' && !engine._pendingReward) {
        engine._witherTimer += dt;
        if (engine._witherTimer >= Balance.MUTATOR_WITHER_TICK_INTERVAL) {
            engine._witherTimer = 0;
            for (var wi = 0; wi < engine.enemies.length; wi++) {
                var we = engine.enemies[wi];
                if (!we.alive) continue;
                var dmg = Math.max(1, Math.floor(we.maxHp * Balance.WITHER_HP_LOSS_PCT));
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
    /* 最大位移钳制：intensity 1→8px, 2→16px, 3→24px — 防止破坏视口 */
    var maxDisp = Math.min(intensity * 8, 24);
    if (engine._shakeTimer > 0 && engine._shakeIntensity >= intensity) return;

    var wl = engine._worldLayer || document.getElementById('world-layer');
    if (wl) {
        wl.style.setProperty('--sx', (maxDisp * (Math.random() > 0.5 ? 1 : -1)) + 'px');
        wl.style.setProperty('--sy', (maxDisp * (Math.random() > 0.5 ? 1 : -1)) + 'px');
        wl.style.animationDuration = Math.min(duration, 3000) + 'ms';
        wl.classList.add('shake-active');
    }
    engine._shakeTimer = duration / 1000;
    engine._shakeIntensity = intensity;
};

Sys.updateShake = function(engine, dt) {
    if (engine._shakeTimer > 0) {
        engine._shakeTimer -= dt;
        if (engine._shakeTimer <= 0) {
            engine._shakeTimer = 0;
            /* 清除 shake 样式，回归零位移 */
            var wl = engine._worldLayer || document.getElementById('world-layer');
            if (wl) {
                wl.classList.remove('shake-active');
                wl.style.animationDuration = '';
                /* R171-P1: 不清除transform，避免与camera lerp冲突造成闪屏 — 由Loop.js fallback统一处理 */
                wl.style.transform = '';
                wl.style.removeProperty('--sx');
                wl.style.removeProperty('--sy');
            }
        }
    }
};

})();
