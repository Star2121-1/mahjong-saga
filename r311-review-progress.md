# R311 Integration Review — Full System & Boundary Condition Audit

**Branch:** `feat/fix-flash-and-waves` | **Date:** 2026-09-08
**Scope:** All subsystem interactions, regression scan (R310+), promise chains

---

## ✅ R322 复核结论（2026-09-26，逐条核对当前代码后）

这份报告写于 R311，代码已到 R322。**不要照单全收** —— 逐条核对结果：

| 编号 | 结论 | 说明 |
|---|---|---|
| **P0-1** | ❌ **已过时，非 bug** | `_frenzyApplied` 守卫（R159-P0）已防住每帧复利；overdrive 的 `_overdriveOrigSpeed` 存取也是对的（先存后清零）。报告基于更早的代码。 |
| **P0-2** | ❌ **已过时，非 bug** | `_completeGuide` 的 overlay 移除（149 行）确实在 `gameOver` 早退（160 行）**之前**，R310 已修。死亡时不解冻时钟是 R246 有意为之。 |
| **P0-3** | ✅ **已修** | tick 存档缺 `!_navSaving` 守卫，会与 `Navigate._goToSaveSelect` 竞态丢进度。**丢玩家进度，最高风险。** |
| **P1-1** | ✅ 已修 | 深渊商店 `_freezeClock()` 期间 overdrive 计时器与 wither 仍在跑。 |
| **P1-2** | ❌ **误报** | 报告假设「click 处理器在 rAF 回调执行期间插入」—— JS 单线程，事件处理器不可能插进正在执行的 rAF 回调。`running=false` 在下一帧生效，而下一帧开头就 `if (!this.running) return`。 |
| **P1-3** | ✅ 已修 | 赌博超时缺 `gameOver`/`_paused` 守卫（同文件 interWave 超时本来就查）。死亡后超时照样生成 Boss 并 `_beginLoop()` 把对局拉起来。 |
| **P1-4** | ✅ 已修 | 相机 snap 阈值 0.048 离 dt cap 0.05 只差 2ms → 19.2fps 就开始抖动。改 0.0495。 |
| **P1-5** | ✅ 已修 | 商店关闭未 `_cleanEnemyProjectiles()`，留下孤儿弹幕 DOM。 |
| **P1-6** | ✅ 已修 | 排行榜持久化缺 `_metaCache` 空守卫 → 静默失败。 |
| **P2-1** | ✅ 已修 | `if (oe.frozen && ...)` 的 `frozen` 判据恒真（上一行刚设 `frozen = true`），等于没判据。 |
| **P2-2** | ✅ 已修 | 深渊 combo 激活守卫链里唯独漏了 `!_paused`。 |
| **P2-3** | — 报告自判非 bug | 未动。 |
| **P2-4** | ✅ 已修 | `_showGuideStep` 只清 `_guideAutoAdvanceTimer`，漏清 `_guideCheckTimer`。 |

**净结果：3 条 P0 里 2 条是过时误报、1 条（真正会丢进度）已修；
6 条 P1 修 5 条、1 条是误报；4 条 P2 修 3 条。**

**方法论教训**（比这些修复本身更值得记）：
一份一个月前的审计报告，**近半数条目在写出来时就已经不成立了**。
所以处理这类报告的正确姿势是：先逐条核对当前代码，再决定改不改。
报告的价值在于指出「该查哪里」，不在于「该改什么」。

---

## P0 Findings

### P0-1: Abyss Frenzy Combo + Overdrive Double-Speed Stack
**File:** `js/core/GameEngine.Abyss.js:576-582` + `js/core/GameEngine.Loop.js:570-586`
**Issue:** Abyss `_abyss_frenzy` combo stores `_frenzyBaseSpeed` snapshot per-enemy, but overdrive freeze sets `oe.speed = 0` in `GameSystems.js:32`. When overdrive ends, `oe.speed = oe._overdriveOrigSpeed` which was 0 (the frozen speed), overwriting the correct frenzied speed. Additionally, the abyss frenzy combo applies `baseSpeed = Math.floor(baseSpeed * 1.4)` every frame when `_frenzyApplied` is false but the enemy has already been processed. The combo's per-frame speed application (line 579) runs regardless of overdrive state, causing compounding speed multiplication.

**Evidence:**
```js
// Abyss.js:579 — every frame, if !_frenzyApplied
ae.baseSpeed = Math.floor(ae.baseSpeed * Balance.ABYSS_FRENZY_SPEED_MULT);
ae.speed = ae.baseSpeed;
// Overdrive sets oe.speed = 0, saves _overdriveOrigSpeed = 0
// EndOverdrive restores oe.speed = 0 (wrong! should be frenzied speed)
```

**Fix:** Store `_overdriveOrigSpeed` from `baseSpeed` (not `speed`) in both `GameSystems.js` and `GameEngine.Events.js`, or skip overdrive freeze for enemies already under abyss frenzy.

---

### P0-2: Guide `_completeGuide` Death Path — `hasSeenGuide` Saved But Panel Not Removed
**File:** `js/core/GameEngine.Guide.js:143-173`
**Issue:** When `this.gameOver` is true, `_completeGuide` saves `hasSeenGuide` to meta but returns early (line 160) BEFORE removing the guide overlay. The guide panel stays visible on the death/game-over screen. Additionally, `_unfreezeClock()` is never called on the death path, meaning any clock-freeze state from the guide persists into the game-over overlay.

**Evidence:**
```js
// Guide.js:150
this._guideDismissed = true;
// Guide.js:152-158 — saves hasSeenGuide
// Guide.js:160 — early return BEFORE cleanup
if (this.gameOver) return;
// Overlay still .active, clock still frozen
```

**Fix:** Move overlay removal above the `gameOver` check, keeping only `_beginLoop()` behind it:
```js
if (this.guideOverlay) this.guideOverlay.classList.remove('active');
if (this.gameOver) { /* persist hasSeenGuide already done */ return; }
this._unfreezeClock();
```

---

### P0-3: Auto-Save Race Between Loop Timer and `_goToSaveSelect`
**File:** `js/core/GameEngine.Loop.js:18-22` + `js/core/GameEngine.Navigate.js:43-45`
**Issue:** The 30-second auto-save in Loop.js fires without checking `_navSaving`. If the user clicks "back to hub" at exactly the auto-save moment, both `_autoSave('tick')` and `_goToSaveSelect` run in parallel. `_goToSaveSelect` awaits `_autoSave('nav')` then calls `clearActiveRun()`, but the tick-save may write a stale active-run snapshot AFTER `clearActiveRun()` has already cleared it, effectively destroying progress.

**Evidence:**
```js
// Loop.js:19 — no _navSaving guard
if (this._saveTimer >= Balance.AUTO_SAVE_INTERVAL && !this._pendingReward ...) {
    this._autoSave('tick');  // races with Navigate
}
// Navigate.js:43
await this._autoSave('nav');
await window.saveManager.clearActiveRun();
```

**Fix:** Add `&& !this._navSaving` to the auto-save condition in Loop.js line 19.

---

## P1 Findings

### P1-1: Overdrive Timer Pauses But Resonance/Wither Guards Incorrect
**File:** `js/core/GameEngine.Loop.js:518` + `543` + `551`
**Issue:** Overdrive timer pause guard (`!this._pendingReward && !this._levelUpPending && !this._activeMutator && !this._announcingWave`) does NOT include `!this._abyssPanelVisible`. During abyss shop panel open (which freezes clock via `_freezeClock()`), the overdrive timer still decrements because `_abyssShopVisible` is not checked. Similarly, resonance and wither guards also don't check `_abyssShopVisible`, causing their timers to tick during shop interaction.

**Evidence:**
```js
// Loop.js:518
if (this._overdriveActive && !this._pendingReward && !this._levelUpPending 
    && !this._activeMutator && !this._announcingWave) {
    this._overdriveTimer -= dt;  // runs during abyss shop!
}
```

**Fix:** Add `&& !this._abyssShopVisible` to the overdrive/mutator/resonance/wither guard conditions.

---

### P1-2: Fast Tab Switching — Battle Arena → Hub Leaves Engine Running
**File:** `js/core/GameEngine.Navigate.js:10` + `js/core/GameEngine.Loop.js:6`
**Issue:** `_goToSaveSelect` sets `this.running = false` immediately (line 10), but if the rAF callback is already mid-frame when navigation starts, the `if (!this.running || this.gameOver) return;` guard at Loop.js:6 won't catch it because `running` was just set to false after the guard check. The current frame continues executing, potentially accessing stale DOM elements from the old page context.

**Evidence:** No explicit fix needed at code level since `_navSaving` guard prevents re-entry, but the in-flight frame can still run to completion.

**Fix:** Set `this.gameOver = true` in addition to `running = false` at the start of navigation to force immediate exit from any in-flight loop frame.

---

### P1-3: Boss Gamble Timeout Uses Wall-Clock setTimeout vs Frozen Game Clock
**File:** `js/core/GameEngine.Events.js:358-375`
**Issue:** The 10-second boss gamble timeout uses `setTimeout` (wall-clock) while the game is frozen. If the player has the mutator panel open for 20 seconds, the gamble timeout fires after only 10 real seconds regardless of freeze state. This is a design inconsistency — other timed systems (overdrive, inter-wave event) also use wall-clock `setTimeout`/`setInterval`. However, the inter-wave event timeout (line 58) correctly checks `self.gameOver || self._paused` before firing.

**Evidence:**
```js
// Events.js:58-73 — interwave timeout checks state
// Events.js:358-375 — gamble timeout does NOT check _paused
```

**Fix:** Add `_paused` and `gameOver` guards to the gamble timeout callback, consistent with inter-wave event.

---

### P1-4: Low FPS / Large dt — Camera Snap Threshold Too Aggressive
**File:** `js/core/GameEngine.Loop.js:705`
**Issue:** Camera snap when `dt >= 0.048` triggers at ~20fps. During low-FPS scenarios (many enemies, complex CSS animations), this causes the camera to snap-jump frequently instead of smoothly lerping. The threshold should be closer to the dt cap of 0.05, not 0.048, creating a near-constant snap behavior under normal conditions.

**Evidence:**
```js
// Loop.js:14 — dt capped at 0.05
var dt = Math.max(0, Math.min((timestamp - this._lastTime) / 1000, 0.05));
// Loop.js:705 — snap at 0.048, just 4ms below cap
if (dt >= 0.048) {
    this.cameraX = targetCamX;  // snaps every frame at 20fps
}
```

**Fix:** Change threshold to `dt >= 0.0495` or add a hysteresis buffer.

---

### P1-5: `_cleanEnemyProjectiles` Not Called on Abyss Shop Close
**File:** `js/core/GameEngine.Abyss.js:182-183`
**Issue:** When closing the abyss shop panel, `_unfreezeClock()` and `_beginLoop()` are called, but `_cleanEnemyProjectiles()` is not. If enemy projectiles were active during shop interaction, they persist as orphan DOM elements and continue being processed in the next loop frame without a valid owner reference.

**Fix:** Add `this._cleanEnemyProjectiles();` before `_beginLoop()` in the shop close handler (Abyss.js:193).

---

### P1-6: R310 Leaderboard Await — Synchronous `_saveMetaToStorage` Failure Not Caught
**File:** `js/core/SaveManager.RunStats.js:81`
**Issue:** `await this._saveMetaToStorage()` inside a try/catch is correct, but `_saveMetaToStorage` may itself throw a synchronous error before returning a rejected promise. The `await` would then wrap that in a rejected promise which IS caught. However, if `_metaCache` is null/undefined at the time of the call (rare edge case during concurrent operations), it could cause an unhandled rejection.

**Evidence:**
```js
// RunStats.js:81
try { await this._saveMetaToStorage(); } catch(e) { ... }
// _saveMetaToStorage reads this._metaCache — if null, JSON.stringify(null) succeeds
// but downstream write may fail silently
```

**Fix:** Add null guard: `if (!this._metaCache) return lb;` before the await.

---

## P2 Findings

### P2-1: Overdrive Freeze Does Not Save/Restore Enemy `frozenTimer` for Non-Naturally-Frozen Enemies
**File:** `js/core/GameSystems.js:40-42`
**Issue:** The `frozenTimer` save only happens when `oe.frozen` is true AND `_overdriveOrigFrozenTimer` is undefined. If an enemy was already frozen by ice/wither effects when overdrive triggers, the timer is saved. But if the enemy becomes frozen DURING overdrive (e.g., by ice weapon), the `_overdriveOrigFrozenTimer` is already set from the first freeze, so subsequent freezes are ignored. When overdrive ends, the timer is restored to the first freeze's value, not the most recent one.

**Fix:** Save/restore `frozenTimer` on every overdrive entry/exit regardless of prior state.

---

### P2-2: Abyss Combo Activation Guard Missing `_paused` Check
**File:** `js/core/GameEngine.Loop.js:240`
**Issue:** Abyss combo auto-activation check (`!this._pendingReward && !this._levelUpPending && !this._activeMutator && !this._announcingWave`) does not check `!this._paused`. If the game is paused (e.g., via Escape key), the combo could still activate if all other guards pass, causing unexpected state changes during pause.

**Fix:** Add `&& !this._paused` to the abyss combo activation condition.

---

### P2-3: `_tempShieldEnd` Zero Check in Loop vs Events
**File:** `js/core/GameEngine.Loop.js:250-253` + `js/core/GameEngine.Events.js:113-116`
**Issue:** Both Loop.js and Events.js independently check and clear `_tempShieldEnd`. Loop.js line 250 clears it when elapsed expires; Events.js line 113 clears it in `_continueAfterInterWave`. If the shield expires between the two checks (e.g., during a reward panel), the Events.js check may see `_tempShieldEnd > 0` but `_elapsed >= _tempShieldEnd`, clearing the shield. This is correct but creates a subtle race where the shield UI could show expired state briefly.

**Verdict:** Not a bug — correct behavior, just a minor visual glitch window. Mark P2.

---

### P2-4: Guide Auto-Advance Timer Not Cleared on `_showGuideStep` Re-entry
**File:** `js/core/GameEngine.Guide.js:53`
**Issue:** When `_showGuideStep` is called, it clears `_guideAutoAdvanceTimer` (line 53) and `_guideCheckTimer` (line 117). However, if `step.autoAdvance` is true AND `step.interactive` is also true (malformed step config), both timers could be set in the same call, causing double-advance behavior. The `else if` at line 132 prevents this in normal code, but a malformed step configuration could bypass the guard.

**Fix:** Add explicit reset of both timers at the start of `_showGuideStep` regardless of step type.

---

## FP (False Positives) — Already Fixed or Intentional

### FP-1: Overdrive × Mutator Guard — Already Correct
**Lines:** Loop.js:229, 518, 543, 551
**Assessment:** The mutator/overdrive interaction guards are comprehensive. `!this._activeMutator` in the mutator trigger condition (line 229) prevents new mutators from triggering during overdrive. Overdrive timer correctly pauses during mutator panels via `!this._activeMutator` guard (line 518).

### FP-2: Guide × Pause — Already Handled
**Lines:** Guide.js:143-173
**Assessment:** The guide overlay has its own clock-freeze integration. When guide is active, `_freezeClock()` is called by the overlay system. Resume paths correctly call `_unfreezeClock()`.

### FP-3: Zero Enemies Loop Behavior — Already Correct
**Lines:** Loop.js:689-691
**Assessment:** The zero-enemy condition includes guards for `_pendingReward`, `_bossLordSpawned`, and wave count. It correctly transitions to the next wave or victory path. No infinite loop risk.

### FP-4: Rapid Clicks Attack Trigger — Already Correct
**Lines:** GameEngine.Combat.js:9
**Assessment:** The `_onClick` handler has comprehensive state guards: `!this.running || this._paused || this._levelUpPending || this._pendingReward || this._gambleActive || this._announcingWave || this._discardMode || this._huLock || this._navSaving`. Fast clicks are naturally throttled by the state machine.

### FP-5: R310 R311 Regression — No New Regressions
**Assessment:** R310 fixes (Events.js endOverdrive补全, Guide死亡清理, leaderboard await) are intact. No regressions introduced by the fixes themselves. The P0-2 finding about guide overlay not being removed on death path is a pre-existing issue that R310 partially addressed but didn't fully resolve.

---

## Summary

| Priority | Count | Files Affected |
|----------|-------|----------------|
| P0       | 3     | Abyss.js, Guide.js, Loop.js, Navigate.js |
| P1       | 6     | Loop.js, Abyss.js, Events.js, RunStats.js |
| P2       | 4     | GameSystems.js, Loop.js, Guide.js |
| FP       | 5     | — |

**Highest Risk:** P0-3 (auto-save race condition) — data loss potential. P0-1 (abyss frenzy + overdrive speed stack) — gameplay balance break. P0-2 (guide overlay on death) — UX bug affecting new players.

**Recommendation:** Apply P0-1, P0-2, P0-3 fixes before next review cycle. P1-1 (abyss shop overdrive timer) and P1-4 (camera snap) are good stability improvements. P1-5 (projectile cleanup on shop close) prevents DOM leaks.
