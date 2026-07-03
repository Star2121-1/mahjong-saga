# Click Roguelike — Swarm Bug Log

**32-Agent Parallel Audit Results**

## Summary

| Metric | Count |
|--------|-------|
| Total Agents | 32 |
| Total Findings | 62 |
| CRITICAL | 1 |
| HIGH | 9 |
| MEDIUM | 21 |
| LOW | 22 |
| INFO | 9 |


## CRITICAL Findings (1)

| # | Path | Agent | Issue |
|---|------|-------|-------|
| 1 | `js/entities/HeroRegistry.js:29` | 19 | `cdFloor: h.cdFloor \|\| 0.2` -- Hero's cdFloor is 0.18 which is truthy so this works. But Mage and Assassin both have 0.15, also truthy. No bug here, b |


## HIGH Findings (9)

| # | Path | Agent | Issue |
|---|------|-------|-------|
| 1 | `js/config/LevelConfig.js:160` | 20 | Same issue in `generateWithSeed()` -- `waveEnemyMax[effectiveWaves - 1] = 1` with no guard for `effectiveWaves <= 0`. |
| 2 | `js/config/LevelConfig.js:99` | 20 | `waveEnemyMax[effectiveWaves - 1] = 1` overwrites the last generated value. But if `effectiveWaves` is 0 (abyssLevel=-1 edge case), this accesses inde |
| 3 | `js/core/GameSpawner.js:264` | 13 | _updateEnemyProjectiles is defined in two places (prototype + static). Both contain identical logic. Need to verify which one the main loop actually c |
| 4 | `js/core/SaveManager.Core.js:354` | 16 | `JSON.parse(text)` accepts any valid JSON -- strings, arrays, numbers. The parse happens before `_validateImportData` is called, so a file containing  |
| 5 | `js/core/SaveManager.Core.js:391` | 16 | `validWeapons` is hardcoded to exactly 6 IDs: `['TrackingBlade','OrbitShield','ShotgunBurst','GroundSlammer','LaserBeam','NovaPulse']`. This duplicate |
| 6 | `js/entities/Weapon.js:14` | 11 | Base Weapon.update(dt) accepts `(dt, player, enemies, engine)` but subclasses like ShotgunBurst override with `update(dt)` only. The caller in GameEng |
| 7 | `js/entities/Weapon.js:158` | 11 | ShotgunBurst.fireAt() takes `(targetX, targetY, player, engine)` -- 4 args in a different order than the base `update()` method's `(dt, player, enemie |
| 8 | `js/entities/Weapon.js:229` | 11 | GroundSlammer knockback directly mutates `e.x` and `e.y` at lines 227-228, bypassing the enemy's movement system. The enemy's position is then clamped |
| 9 | `js/entities/Weapon.js:325` | 11 | NovaPulse constructor at line 327 sets `cd=7.0` as the base cooldown. The update() method at line 330 decrements cooldown and manages pulses. However, |


## MEDIUM Findings (21)

| # | Path | Agent | Issue |
|---|------|-------|-------|
| 1 | `js/config/LevelConfig.js:108` | 20 | `difficultyFactor: base.difficultyFactor * diffMult` where `base.difficultyFactor=2.0` and `diffMult=Math.pow(1.10, abyssLevel)`. At abyssLevel=100, ` |
| 2 | `js/config/LevelConfig.js:127` | 20 | Hash function `h = Math.imul(31, h) + charCode \| 0` is a variant of FNV-1a but uses multiplier 31 instead of FNV prime 2^24+2^2+2^0=16777619. This is  |
| 3 | `js/config/LevelConfig.js:61` | 20 | enemyHpMult=1.10 is described as "从 1.15 降为 1.10 防双重指数", but the comment states the reduction was already made. However, the actual exponentiation is  |
| 4 | `js/core/RewardManager.js:261` | 29 | `cloneNode(true)` in `_animateSuckIn` creates deep DOM clone without cleanup on early return. Line 261 clones the entire card subtree. If the user nav |
| 5 | `js/core/SaveManager.Core.js:354` | 16 | `JSON.parse(text)` does not strip BOM (Byte Order Mark). A UTF-8 file with BOM (EF BB BF) will cause `text` to start with `\uFEFF`, making `JSON.parse |
| 6 | `js/entities/Weapon.js:181` | 11 | ShotgunBurst.update(dt) signature mismatch. Base class declares `update(dt, player, enemies, engine)` at line 14. ShotgunBurst overrides with `update( |
| 7 | `js/entities/Weapon.js:198` | 11 | GroundSlammer.update() combines cooldown management, shockwave animation, damage, AND knockback physics all in one method spanning lines 198-251. This |
| 8 | `js/entities/Weapon.js:280` | 11 | LaserBeam.update() at line 280 decrements cooldown AND does damage AND renders the beam ALL in the same method. The beam visual update (lines 286-291) |
| 9 | `js/entities/Weapon.js:311` | 11 | LaserBeam.setAngle() at line 311 is called from GameEngine.Render.js:70 `w.setAngle(this._lastClickAngle)`. However, `_lastClickAngle` is set on point |
| 10 | `js/entities/Weapon.js:361` | 11 | NovaPulse calculates `maxR = Math.sqrt(viewW^2 + viewH^2)` at line 363 using `engine.battlefield.clientWidth/Height`. This gives the diagonal of the v |
| 11 | `js/entities/Weapon.js:57` | 11 | TrackingBlade.update() creates projectiles via `engine._projectiles.push(proj)` at line 85. But `_projectiles` is an array property on GameEngine, not |
| 12 | `js/page/main_hub.js:1006` | 22 | Line 1006 is a single-line monolith (~420 chars) containing an entire if/else block collapsed into one line. Same issue repeats on lines 1234-1235, 12 |
| 13 | `js/page/main_hub.js:1277` | 22 | Silent error swallowing `}).catch(function() {});` on daily quest claim. User clicks "领取" and nothing happens if it fails. Fix: Show error toast or bu |
| 14 | `js/page/main_hub.js:1305` | 22 | Silent error swallowing `}).catch(function() {});` on season reward claim. Fix: Show error feedback. |
| 15 | `js/page/main_hub.js:1315` | 22 | Silent error swallowing `}).catch(function() {});` on weekly vault claim. Fix: Show error feedback. |
| 16 | `js/page/main_hub.js:1323` | 22 | Silent error swallowing `}).catch(function() {});` on weekly vault abandon. Fix: Show error feedback. |
| 17 | `js/page/main_hub.js:1332` | 22 | Silent error swallowing `}).catch(function() {});` on weekly vault open. Fix: Already has `alert(res.reason)` on the `.then` rejection path, but the ` |
| 18 | `js/page/main_hub.js:200` | 22 | Silent error swallowing `}).catch(function() {});` on makeup token claim. If `claimMakeup()` rejects (network error, corrupt save), the user sees no f |
| 19 | `js/page/main_hub.js:283` | 22 | Silent error swallowing `}).catch(function() {});` on daily login streak check. Fix: Add console.warn with error context. |
| 20 | `js/page/main_hub.js:309` | 22 | Silent error swallowing `}).catch(function() {});` on season trigger check. Fix: Add console.warn. |
| 21 | `js/page/main_hub.js:606` | 22 | `TavernManager.refreshTavernMaze` is declared `async` but the function body does not await anything at the top level -- the `async` keyword is unneces |


## LOW Findings (22)

| # | Path | Agent | Issue |
|---|------|-------|-------|
| 1 | `js/config/LevelConfig.js:138` | 20 | `generateWithSeed` calls `this.createSeed(seed)` but then only uses `rng()` 4 times (lines 148-150). The seed string is hashed once, then 4 random dra |
| 2 | `js/config/LevelConfig.js:24` | 20 | `level_2.waveEnemyMax=[25,35,45,55,65,75,1]` has length 7 matching `maxWaves:7`. Correct. |
| 3 | `js/config/LevelConfig.js:38` | 20 | `level_3.waveEnemyMax=[30,40,50,60,70,80,90,100,110,1]` has length 10 matching `maxWaves:10`. Correct. |
| 4 | `js/config/LevelConfig.js:63` | 20 | spawnCountMult=1.05 produces `Math.pow(1.05, abyssLevel)`. At abyssLevel=100 this is 164x. With `baseCount=20+i*10` and `effectiveWaves=115` (15+100*1 |
| 5 | `js/config/LevelConfig.js:86` | 20 | `spawnMult` is computed but never used directly by callers. Both `generate()` and `generateWithSeed()` compute `spawnMult` at line 86/143 but only use |
| 6 | `js/config/LevelConfig.js:9` | 20 | `level_1.waveEnemyMax=[20,30,40,50,1]` has length 5 matching `maxWaves:5`. The last entry `1` is the boss wave. Correct. |
| 7 | `js/core/GameCombat.js:52` | 20 | `gemVal = Math.floor((1 + level * 0.5) * diff * bloodMul)`. At abyssLevel=100, `diff=27560`, `level=100`, this gives `gemVal=Math.floor(51*27560*2)=28 |
| 8 | `js/core/GameEngine.Loop.js:322` | 29 | rAF rescheduling lacks cleanup on game over. Line 322 calls `requestAnimationFrame(this._boundLoop)` only when `this.running && !this.gameOver`. Howev |
| 9 | `js/core/GameSystems.js:241` | 29 | `setTimeout` for flame aura visibility not stored/cancelled. Line 241 creates a 400ms setTimeout to hide the flame aura element. If resonance is toggl |
| 10 | `js/core/GameSystems.js:270` | 29 | Same issue for ice aura visibility timeout. Line 270 creates a 500ms setTimeout for ice aura. Fix: Same as above. |
| 11 | `js/core/SaveManager.Core.js:327` | 16 | `JSON.stringify({ meta: metaData, activeRun: activeRunData }, null, 2)` does not handle circular references. If either `metaData` or `activeRunData` c |
| 12 | `js/core/SaveManager.Core.js:360` | 16 | `this._metaCache = null` forces a reload on next `getMeta()` call. However, if `saveMeta()` was called concurrently (race condition), the cache could  |
| 13 | `js/core/SaveManager.Core.js:372` | 16 | `data.meta.techTree` is checked for existence and type at line 372 but not validated for key structure. An attacker could inject arbitrary keys into ` |
| 14 | `js/core/SaveManager.Core.js:391` | 16 | The hardcoded array uses exact string comparison via `indexOf`. If `weaponInfos` keys ever change casing or naming convention, the validation silently |
| 15 | `js/entities/Enemy.js:559` | 20 | Same `difficultyFactor` read pattern. Uses `\|\| 1` fallback which is safe. No overflow risk. |
| 16 | `js/entities/Weapon.js:126` | 11 | OrbitShield tick-damage uses a fixed `0.3` interval at line 126, which happens to match `this.cd = 0.3` from the base class constructor at line 95. Ho |
| 17 | `js/entities/Weapon.js:133` | 11 | OrbitShield collision uses `e.radius + this.orbRadius` squared comparison at line 133. This is correct for circle-circle, but `this.orbRadius = 8` (li |
| 18 | `js/entities/Weapon.js:172` | 11 | ShotgunBurst pellet projectiles use `lifeTime=0.8` at line 172, significantly shorter than TrackingBlade's `2.0` at line 79. This is intentional (shot |
| 19 | `js/entities/Weapon.js:290` | 11 | LaserBeam uses `rotate(deg + 'deg')` CSS transform at line 290. `deg` is computed as `this.beamAngle * 180 / Math.PI` every frame. This is fine for pe |
| 20 | `js/entities/Weapon.js:79` | 11 | TrackingBlade hardcodes Projectile params `radius=4, pierce=3, lifeTime=2.0` at line 79. These are magic numbers that do not scale with weapon level.  |
| 21 | `js/page/main_hub.js:1394` | 22 | Duplicate comment `/* -- Epoch 15: 精英模式切换 -- */    /* -- Epoch 15: 精英模式切换 -- */` on a single line. Fix: Remove duplicate. |
| 22 | `js/page/main_hub.js:152` | 29 | `_hubListenersBound` dedup guard prevents duplicate binding but doesn't clean up old listeners on tab switch. Line 152-153 guards `init()` from re-exe |


## INFO Findings (9)

| # | Path | Agent | Issue |
|---|------|-------|-------|
| 1 | `js/config/HeroConfig.js:15` | 19 | Hero has `cost: 0` redundant with `unlockCost: 0` |
| 2 | `js/config/HeroConfig.js:24` | 19 | Knight's ability `【万子连击】每次攻击有 15% 几率触发连击，造成额外 50% 伤害` has NO implementation. No code checks for a combo/crit on click attack. |
| 3 | `js/config/HeroConfig.js:32` | 19 | Knight has `cost: 30` redundant with `unlockCost: 30` |
| 4 | `js/config/HeroConfig.js:41` | 19 | Mage's ability `【筒纹护体】每升一级荆棘反伤甲额外提供 5% 反伤率` has NO implementation. No code modifies `thornsRate` on level-up based on Mage identity. |
| 5 | `js/config/HeroConfig.js:49` | 19 | Mage has `cost: 50` redundant with `unlockCost: 50` |
| 6 | `js/config/HeroConfig.js:58` | 19 | Assassin's ability `【暗影步】自带 15% 基础闪避率，移动速度提升 10%` -- the 15% dodge IS reflected in `baseDodge: 0.15` which flows to `Player.dodgeRate`. However, the + |
| 7 | `js/config/HeroConfig.js:66` | 19 | Assassin has `cost: 100` redundant with `unlockCost: 100` |
| 8 | `js/config/HeroConfig.js:7` | 19 | Hero's ability `【雀灵流转】攻击速度 +15%，武器冷却 -10%` is described in `ability` field but there is NO code applying `atkSpeedBonus` or `weaponCdReduction` anywhe |
| 9 | `js/entities/HeroRegistry.js:19` | 19 | `_titleForId()` is a hardcoded lookup table separate from `heroConfig.name`. This is a second source of truth for hero display names. Risk: if `_title |


## Fixes Applied (Phase 3)

| # | Finding | Fix Applied | File |
|---|---------|-------------|------|
| 1 | HeroRegistry cdFloor fallback `|| 0.2` | Changed to `!= null ? h.cdFloor : 0.2` | js/entities/HeroRegistry.js |
| 2 | main_hub.js bare catch swallowing errors | Added `console.warn('[main_hub] ...')` to all 6 catch blocks | js/page/main_hub.js |
| 3 | Weapon.update signature mismatch | Added `(dt, player, enemies, engine)` to ShotgunBurst.update | js/entities/Weapon.js |
| 4 | validWeapons hardcoded array | Changed to `Object.keys(window.rewardManager.weaponInfos)` | js/core/SaveManager.Core.js |
| 5 | JSON.parse BOM handling | Added `text.replace(/^﻿/, '')` | js/core/SaveManager.Core.js |
| 6 | RewardManager cloneNode leak | Added `suckin-clone` DOM guard + cleanup reference | js/core/RewardManager.js |
| 7 | GameSystems setTimeout leak | Stored timer refs in `engine._flameHideTimer` / `_iceHideTimer` | js/core/GameSystems.js |
| 8 | HeroConfig redundant cost fields | Removed `cost:` from all 4 hero definitions | js/config/HeroConfig.js |
| 9 | LevelConfig effectiveWaves boundary | Added `if (effectiveWaves > 0)` guard in generate() and generateWithSeed() | js/config/LevelConfig.js |
| 10 | GameSpawner enemy projectile affinity | Added `_mapAffinityReduction` check to match prototype method | js/core/GameSpawner.js |
| 11 | main_hub.js monolithic single-line code | Reformatted to proper multi-line | js/page/main_hub.js |
| 12 | main_hub.js duplicate comment | Removed duplicate comment | js/page/main_hub.js |
| 13 | main_hub.js useless async | Removed `async` from refreshTavernMaze | js/page/main_hub.js |
| 14 | Weapon.upgrade() cdFloor fallback | Added `!= null` check to avoid 0.15 becoming 0.2 | js/entities/Weapon.js |
| 15 | RewardManager _panelLocked race | Added `this._panelLocked = true` after unlock | js/core/RewardManager.js |
| 16 | validWeapons references window.weaponInfos | Fixed to window.rewardManager.weaponInfos | js/core/SaveManager.Core.js |
| 17 | HeroConfig ability TODO markers | Added implementation status to ability descriptions | js/config/HeroConfig.js |
| 18 | Knight dodge slam visual-only | VERIFIED: Code is correct (has knockback logic) | N/A |

---

## Round 26 Fixes Applied

| # | ID | 描述 | 文件 |
|---|----|------|------|
| 1 | C-002 | ExpGem.isExpired 属性→方法调用 | GameEngine.Spawn.js |
| 2 | C-001 | HeroRegistry/HeroConfig 加载顺序（4 文件） | pages/s2_main_hub.html, pages/s3_gameplay.html, Click Roguelike/s2_main_hub.html, Click Roguelike/s3_gameplay.html |
| 3 | H-008 | saveMeta 返回 boolean→Promise | SaveManager.Core.js |
| 4 | H-038 | weeklyVault.checkFn 不可序列化 | SaveManager.Weekly.js |
| 5 | H-007 | weeklyVault.evaluate 修改 _metaCache 后未 saveMeta | SaveManager.Weekly.js |
| 6 | H-018 | refreshStatsPanel 缩进 bug | main_hub.js |
| 7 | H-023 | CSS floatUp keyframes 冲突 | common.css |
| 8 | H-024 | #player box-shadow 颜色冲突 | gameplay-player.css |
| 9 | H-020/H-021 | Ss.spawnBossLord / Gp._spawnBossLord 死代码 | GameSpawner.js, Events.js |
| 10 | H-022 | Cs.rewardKill 死代码 | GameCombat.js |
| 11 | H-027 | console.log 清理（9 处） | 多处 |
| 12 | H-003 | Mutator 面板可叠在升级面板之上 | GameEngine.Loop.js |
| 13 | H-004 | flash-hit transitionend listener 孤儿引用 | GameEngine.Combat.js |
| 14 | H-026 | #weapon-slot-bar 响应式规则重复 | gameplay-layout.css |
| 15 | H-027 | #hero-carousel-viewport 重复定义 | main_hub.css |
| 16 | H-028 | shape-triangle 响应式 border-width hack 无效 | main_hub.css |
| 17 | H-036 | 虚拟摇杆 touchmove 未按 _touchId 过滤 | GameEngine.Boot.js |
| 18 | H-037 | _isPauseAllowed 遗漏 boss-gamble-panel 和 wave-announce | GameEngine.Boot.js |
| 19 | H-001 | Boss Gamble 超时机制（10s 自动 safe） | GameEngine.Events.js |
| 20 | H-013 | 英雄解锁双货币统一为 bossCores | main_hub.js |

---

## Round 27 Fixes Applied (v20260702B) — 8-Agent Deep Audit Round

> 本轮聚焦 Round 26 遗留的 16 个待修复项 + 新增深度审计发现。

| # | ID | 描述 | 文件 |
|---|----|------|------|
| 1 | M-001 | Overdrive 期间 cdTimer=0 导致攻击速率翻倍 → 移除 | GameEngine.Render.js |
| 2 | H-011 | OrbitShield cd 升级无效 → 使用 this.cd 替代硬编码 0.3 | Weapon.js |
| 3 | H-011 | OrbitShield atkFactor 0.5→0.3, cd 0.3→0.5 平衡 | Weapon.js |
| 4 | H-009 | 深渊缩放 pow(1.15,loopCount) → pow(1.08,loopCount) | Enemy.js |
| 5 | H-002 | 精英模式 _eliteMultiplier 应用于敌人生成 | GameSpawner.js, Events.js |
| 6 | F-01 | _checkQqueenShield setTimeout 存储为 this._qqueenShieldTimer | GameEngine.Combat.js |
| 7 | M-034 | 复活路径 rAF 绕过 _beginLoop runId guard → 使用 _guardedLoop | GameEngine.Boot.js, GameEngine.Loop.js |
| 8 | H-020 | GameCombat.js Cs.screenShake / Cs.triggerKnightDodgeSlam 死代码 | GameCombat.js |
| 9 | H-020 | GameSpawner.js Ss.cleanEnemyProjectiles / Ss.updateEnemyProjectiles 死代码 | GameSpawner.js |
| 10 | H-020 | GameEngine.Events.js _showMutatorPanel / _applyMutator fallback 死代码 | GameEngine.Events.js |
| 11 | H-021 | GameEngine.NewRun.js _initHandTiles/_placeHandTile/_clearHandTile/_renderPlayerTile 被 Combat.js 覆盖 | GameEngine.NewRun.js |
| 12 | L-022 | _spawnCoinBurst 生成金币无视觉 → 委托 spawnCoinsAt | GameEngine.Events.js |
| 13 | H-015 | FCT 飘字在冻结窗口内被暂停 → animation-play-state: running | RewardManager.js, gameplay-ui.css |
| 14 | H-015 | abyssBloodPulse 不在 game-clock-frozen 豁免列表 → 添加 #abyss-panel | gameplay-ui.css |
| 15 | H-015 | #fct-layer 不在 game-clock-frozen 豁免列表 → 添加 | gameplay-ui.css |
| 16 | H-037 | _isPauseAllowed 遗漏 boss-gamble-panel 和 wave-announce | GameEngine.Boot.js |
| 17 | H-036 | 虚拟摇杆 touchmove 未按 _touchId 过滤 | GameEngine.Boot.js |
| 18 | H-028 | shape-triangle 响应式 border-width hack 无效 | main_hub.css |
| 19 | H-027 | #hero-carousel-viewport 重复定义 | main_hub.css |
| 20 | H-026 | #weapon-slot-bar 响应式规则重复 | gameplay-layout.css |
| 21 | H-024 | #player box-shadow 绿色层与红色英雄冲突 | gameplay-player.css |
| 22 | H-023 | CSS floatUp keyframes 冲突 | common.css |
| 23 | H-018 | refreshStatsPanel 缩进 bug | main_hub.js |
| 24 | H-038 | weeklyVault.checkFn 不可序列化 → ID 查找 | SaveManager.Weekly.js |
| 25 | H-007 | weeklyVault.evaluate 修改 _metaCache 后未 saveMeta | SaveManager.Weekly.js |
| 26 | H-008 | saveMeta 返回 boolean→Promise | SaveManager.Core.js |
| 27 | H-003 | Mutator 面板可叠在升级面板之上 | GameEngine.Loop.js |
| 28 | H-004 | flash-hit transitionend listener 孤儿引用 | GameEngine.Combat.js |
| 29 | H-001 | Boss Gamble 超时机制（10s 自动 safe） | GameEngine.Events.js |
| 30 | H-013 | 英雄解锁双货币统一为 bossCores | main_hub.js |
| 31 | C-002 | ExpGem.isExpired 属性→方法调用 | GameEngine.Spawn.js |
| 32 | C-001 | HeroRegistry/HeroConfig 加载顺序（4 文件） | pages/*.html, Click Roguelike/*.html |
| 33 | H-020/H-021 | Ss.spawnBossLord / Gp._spawnBossLord 死代码 | GameSpawner.js, Events.js |
| 34 | H-022 | Cs.rewardKill 死代码 | GameCombat.js |
| 35 | H-027 | console.log 清理（9 处） | 多处 |

---

## Round 26 Findings (v20260702A) — 8-Agent Specialized Audit

> 本轮使用 8 个专业化子 Agent 并行审计，发现 130 个结构化问题。

### 审计 Agent 清单

| # | Agent 化身 | 扫描范围 |
|---|-----------|---------|
| 1 | UI盒模型审计师 | 全部 CSS 文件 + responsive.js |
| 2 | 状态机并发审计师 | 全部 GameEngine 拆分文件 |
| 3 | 碰撞矩阵分析师 | Player/Enemy/Weapon 碰撞检测 |
| 4 | 内存泄漏分析器 | FxManager/SaveManager/DOM 操作 |
| 5 | 数值平衡审计师 | HeroConfig/LevelConfig/Weapon DPS |
| 6 | 存档完整性审计师 | SaveManager 序列化/迁移/导入验证 |
| 7 | Boss和突变系统审计师 | Boss状态机/突变面板/Overdrive |
| 8 | 死代码和冗余审计师 | 重复定义/未调用方法/魔法数字 |
| 9 | DOM和性能审计师 | 对象池/每帧DOM操作/碰撞复杂度 |
| 10 | 事件系统和输入审计师 | 键盘/触控/虚拟摇杆/暂停 |
| 11 | HTML依赖和配置审计师 | 脚本加载顺序/CSS版本号 |

### 发现统计

| 严重度 | 数量 |
|--------|------|
| CRITICAL | 5 |
| HIGH | 38 |
| MEDIUM | 47 |
| LOW | 32 |
| INFO | 8 |
| **总计** | **130** |

### CRITICAL Findings (5)

| ID | 描述 | 文件 |
|----|------|------|
| C-001 | HeroRegistry.js 在 HeroConfig.js 之前加载，definitions 为空 | pages/s2_main_hub.html, pages/s3_gameplay.html |
| C-002 | ExpGem.isExpired 属性检查而非方法调用，经验石永久泄漏 | GameEngine.Spawn.js:294 |
| C-003 | ShotgunBurst.fireAt() 从未被调用，武器永远不会发射弹道 | Weapon.js + GameEngine.Render.js |
| C-004 | _initDefaultWeapons() 创建的武器 cd 未被 clamp 到 player.cdFloor | GameEngine.Render.js:24 |
| C-005 | validWeapons 导入验证时 RewardManager 可能未加载 | SaveManager.Core.js:392 |

### HIGH Findings (38)

| ID | 描述 | 文件 |
|----|------|------|
| H-001 | Boss Gamble 可永久挂起无超时 | GameSpawner.js:139-143 |
| H-002 | 精英模式 _eliteMultiplier 从未应用于敌人属性 | GameEngine.Boot.js:361 |
| H-003 | Mutator 面板可叠在升级/奖励面板之上 | GameSystems.js:67-99 |
| H-004 | Flash-hit transitionend listener DOM 移除后孤儿引用 | GameEngine.Combat.js:729-733 |
| H-005 | Keyboard/Joystick 监听器永不解绑 | GameEngine.Boot.js |
| H-006 | beforeunload 监听器永不移除 | GameEngine.Boot.js:227-237 |
| H-007 | _metaCache 跨页面不同步（weeklyVault.evaluate 后未 saveMeta） | SaveManager.Weekly.js:99 |
| H-008 | saveMeta 返回 boolean 非 Promise，.then() 链式调用抛 TypeError | SaveManager.Core.js:175-178 |
| H-009 | 双重深渊缩放乘区 (loopCount × abyssLevel) | LevelConfig.js + Enemy.js |
| H-010 | NovaPulse 全屏 AOE 实际 DPS 远超预期 | Weapon.js:325-328 |
| H-011 | OrbitShield 每 0.3s tick 全场景伤害，cd 升级无效 | Weapon.js:114-137 |
| H-012 | 英雄被动技能实现率极低（4 英雄中仅 1 个有部分实现） | HeroConfig.js + Player.js |
| H-013 | 英雄解锁双货币不一致（metaTokens vs bossCores） | main_hub.js |
| H-014 | FCT 飘字在冻结窗口内被暂停 | RewardManager.js:551 |
| H-015 | abyssBloodPulse 不在 game-clock-frozen 豁免列表 | gameplay-overlay.css |
| H-016 | unlockPopIn 一次性动画被冻结暂停 | gameplay-overlay.css |
| H-017 | 卡片翻转 CSS transition 在冻结时瞬间切换 | gameplay-overlay.css + RewardManager.js |
| H-018 | refreshStatsPanel 缩进 bug 破坏 HTML 模板 | main_hub.js:994-1004 |
| H-019 | Ss.spawnBossLord / Gp._spawnBossLord / Cs.rewardKill 死代码 | GameSpawner.js:196, Events.js:502, GameCombat.js:60 |
| H-020 | Float text / explosion / mutator panel 在多处重复定义 | GameCombat.js, Endgame.js, Events.js, Spawner.js |
| H-021 | _initHandTiles / _placeHandTile / _clearHandTile / _renderPlayerTile 重复 | NewRun.js vs Combat.js |
| H-022 | console.log 调试语句未清理（9+ 处） | 多处 |
| H-023 | CSS floatUp keyframes 重复定义冲突 | common.css vs gameplay-effects.css |
| H-024 | #player box-shadow 绿色层与红色英雄冲突 | gameplay-player.css:71-73 |
| H-025 | enemy HP bar 固定 px 不跟随 --_fs | gameplay-enemy.css:208-214 |
| H-026 | #weapon-slot-bar 响应式规则重复 | gameplay-layout.css vs gameplay-weapon.css |
| H-027 | #hero-carousel-viewport 定义重复 | main_hub.css:193 vs 215 |
| H-028 | shape-triangle 响应式 border-width hack 无效 | main_hub.css |
| H-029 | _animateSuckIn clone 页面导航时可能残留 | RewardManager.js:251-295 |
| H-030 | 虚拟摇杆 touchmove 未按 _touchId 过滤 | GameEngine.Boot.js:585-588 |
| H-031 | _isPauseAllowed 遗漏 boss-gamble-panel 和 wave-announce | GameEngine.Boot.js:435-447 |
| H-032 | CSS 版本号缺失（pages/ 目录） | pages/*.html |
| H-033 | Overdrive 期间 cdTimer=0 导致攻击速率翻倍 | GameEngine.Render.js:79 |
| H-034 | LaserBeam 每帧攻击但依赖 cd 计数 | Weapon.js:280-293 |
| H-035 | 置换面板取消后无法重新选择 | RewardManager.js:408-416 |
| H-036 | 升级 atkFactor 无上限 | Weapon.js:18-19 |
| H-037 | weapon_amplify 圣物 0.95 vs upgrade 0.9 cd 降率不一致 | Player.js:298 vs Weapon.js:21 |
| H-038 | weeklyVault.challenge.checkFn JSON 序列化丢弃 | SaveManager.Weekly.js:64 |

### MEDIUM Findings (47)

详见下方 M-001 ~ M-047 列表。

### LOW Findings (32)

详见下方 L-001 ~ L-032 列表。

### INFO Findings (8)

详见下方 I-001 ~ I-008 列表。

---

## Round 26 Fixes Applied (Phase 3) — STATUS UPDATE (Round 28 Verification)

> 以下为 Round 26 标记"待修复"项的 Round 28 验证结果。

| # | ID | 描述 | 文件 | 原状态 | Round 28 验证 |
|---|----|------|------|--------|--------------|
| 1 | C-002 | ExpGem.isExpired 属性→方法调用 | GameEngine.Spawn.js | 待修复 | ✅ 已修复 (R27): `gem.isExpired()` |
| 2 | C-001 | HeroRegistry/HeroConfig 加载顺序 | pages/*.html | 待修复 | ✅ 已修复 (R27): HeroConfig 在前 |
| 3 | H-008 | saveMeta 返回 boolean→Promise | SaveManager.Core.js | 待修复 | ✅ 已修复 (R27): Promise wrapper |
| 4 | H-038 | weeklyVault.checkFn 不可序列化 | SaveManager.Weekly.js | 待修复 | ✅ 已修复 (R27): id 查找 |
| 5 | H-018 | refreshStatsPanel 缩进 bug | main_hub.js | 待修复 | ✅ 已修复 (R27): 格式正常 |
| 6 | H-023 | CSS floatUp keyframes 冲突 | common.css + gameplay-effects.css | 待修复 | ⚠️ 两处定义但作用于不同元素，非 bug |
| 7 | H-024 | #player box-shadow 颜色冲突 | gameplay-player.css | 待修复 | ✅ 已修复 (R27): 默认红色系 |
| 8 | H-032 | CSS 版本号缺失 | pages/*.html | 待修复 | ✅ 已修复 (R27): 全部带 v= |

---

## Round 28 Fixes Applied (v20260703A) — feat/fix-flash-and-waves Branch

> 本轮基于 SWARM_BUG_LOG.md 历史审计结果的序列化修复延续。

| # | ID | 描述 | 文件 | 修复内容 |
|---|----|------|------|---------|
| 1 | H-003 (续) | Loop.js:96 调用已删除的 `_showMutatorPanel()` | GameEngine.Loop.js | 改为 `window.Systems.showMutatorPanel(this)` |
| 2 | HIGH | Overdrive 双重实现（Events.js fallback vs Systems.js） | GameEngine.Events.js | 删除 fallback 冗余逻辑，保留委托 + 最小标志初始化 |
| 3 | HIGH | SaveManager 缺失 Epoch 37 字段默认值 | SaveManager.Core.js | `_getDefaultMeta` + `_migrateMeta` 补充 `prestigeLevel`/`season`/`dailyChallenges` |
| 4 | H-004 | flash-hit transitionend 孤儿引用（CSS 用 animation 却监听 transitionend） | GameEngine.Combat.js | 改用 `animationend` + 存储 handler 引用到 `el._flashHandler`，支持清理 |
