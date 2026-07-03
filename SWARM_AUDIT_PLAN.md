# Click Roguelike — 32-Agent Swarm Audit

## Phase 1: Monolithic Documentation Baseline

**COMPLETE.** 4 Explore agents produced 2.4MB of technical documentation:

### Core System Map (af62b7697abb6407d — 658KB)
- **34 files** mapped (GameEngine.js + 13 split files + 3 delegation modules + SaveManager × 6 + FxManager + AudioManager + RewardManager)
- **180+ methods** cataloged with signatures and line numbers
- **Full initialization DAG** documented (6 layers, no circular deps)
- **8 global singletons** on window
- **Method call relationship map** with cross-file delegation chains

### Entity System Map (a77962850575481f9 — 251KB)
- **6 entity classes** mapped (Player, Enemy, Weapon + 6 subclasses, ExpGem, Projectile)
- **3 inheritance chains** documented
- **2 state machines** detailed (Enemy AI: Normal/Stalker/Shaman/BossLord, Player: update/takeDamage/gainExp)
- **Damage calculation flow** fully traced (player→enemy and enemy→player paths)
- **Stat aggregation pipeline** (7 additive/multiplicative layers)
- **4 config files** cross-referenced (HeroConfig, LevelConfig, AchievementConfig, EquipmentRegistry)

### Save & Reward Map (a7a2137dd3713b50c — 537KB)
- **3 localStorage keys** documented (cr_meta.json, cr_active_run.json, cr_difficulty)
- **200+ meta fields** cataloged in _getDefaultMeta()
- **Active run snapshot schema** fully mapped
- **15 missing/broken references** identified
- **Page navigation flow** traced (3 pages, 8 hub tabs)
- **RewardManager integration** mapped (pool building, weighted selection, secret checking)

### CSS/HTML Map (a477bdf5da1983c5f — 785KB)
- **11 CSS files** mapped (common + 8 gameplay + main_hub + save_select)
- **18+ animations** cataloged with purposes
- **Complete z-index hierarchy** (z:80 → z:9999)
- **9 responsive breakpoints** across 6 files
- **Full HTML element-to-CSS selector mapping**
- **Version inconsistency** identified (20260701W/X/C)

---

## Phase 2: 32-Agent Swarm Audit

### Agent Identities & Assignments

| # | Agent Identity | Focus Files |
|---|---|---|
| 1 | **LoopArchitect** | GameEngine.Loop.js, Boot.js — rAF scheduling, _loopRunId guards, _announcingWave deadlocks |
| 2 | **CombatFlow** | GameEngine.Combat.js, GameCombat.js — wave progression, boss spawn timing, victory/game-over transitions |
| 3 | **SpawnSystem** | GameEngine.Spawn.js, GameSpawner.js — enemy spawn caps, DOM lifecycle, _enemyElements cleanup |
| 4 | **WeaponSystem** | GameEngine.Weapons.js, GameEngine.Render.js, Weapon.js — slot limits, projectile grid, upgrade side effects |
| 5 | **EventSystem** | GameEngine.Events.js — inter-wave events, mutator panels, overdrive triggers, boss gamble flow |
| 6 | **EndgameFlow** | GameEngine.Endgame.js — _onClick damage calc, float text spawning, explosion effects, screen shake bounds |
| 7 | **StateMachine** | All GameEngine files — running/gameOver/_paused/_pendingReward/_levelUpPending state transitions |
| 8 | **DelegateProxy** | GameEngine.js, GameSpawner.js, GameCombat.js, GameSystems.js — prototype delegation chain, _combat/_systems proxy |
| 9 | **PlayerEntity** | Player.js — _initFromConfig vs restore overlap, takeDamage thorns recursion, addRelic stat stacking |
| 10 | **EnemyEntity** | Enemy.js — AI state machines, _updateNormal/Stalker/Shaman/BossLord path coverage, frozen timer decay |
| 11 | **WeaponClasses** | Weapon.js subclasses — TrackingBlade nearest-target, OrbitShield collision, ShotgunBurst spread math |
| 12 | **ExpGemCollect** | ExpGem.js, Spawn.js — TTL expiration, magnet radius, DOM removal, window.expGems global sync |
| 13 | **ProjectileSystem** | Weapon.js Projectile, GameEngine.Render.js — grid spatial partition, hitEnemies Set cleanup, out-of-bounds |
| 14 | **SaveMigration** | SaveManager.Core.js _migrateMeta — version tracking absence, field defaults, old hero ID renaming |
| 15 | **SaveSerialization** | SaveManager.js, Core.js — JSON read/write, function serialization (weeklyVault checkFn), localStorage quota |
| 16 | **SaveImportExport** | SaveManager.Core.js importSaveFile, _validateImportData — validation gaps, prototype pollution, Blob error handling |
| 17 | **SeasonSystem** | SaveManager.Season.js — prestige cost, season trigger, inflation guard math, elite mode persistence |
| 18 | **WeeklyVault** | SaveManager.Weekly.js — vault operations, checkFn null serialization, abandonWeeklyVault token refund |
| 19 | **HeroConfig** | HeroConfig.js, HeroRegistry.js, Player.js — hero stat consistency, cdFloor defaults, unlock cost validation |
| 20 | **LevelConfig** | LevelConfig.js, Boot.js — procedural generator scaling bounds, waveEnemyMax array indexing, difficultyFactor overflow |
| 21 | **AchievementConfig** | AchievementConfig.js, GameEngine.Combat.js — threshold alignment, endgame vs inflight detection parity |
| 22 | **MainHubPage** | main_hub.js — panel data binding, event listener dedup, tab cleanup, async error swallowing |
| 23 | **SaveSelectPage** | save_select.js — new game warning flow, import/export error states, localStorage difficulty persistence |
| 24 | **RewardManager** | RewardManager.js — _buildPool relic availability, _pickFrom weighted random, _animateSuckIn DOM cloning, panel lock |
| 25 | **HTMLStructure** | All HTML files — version number consistency, element ID completeness, lang attribute, pointer-events on overlays |
| 26 | **CSSCommon** | common.css — global selector scope, --_fs variable definition, animation keyframe naming conflicts, scrollbar styling |
| 27 | **CSSGameplay** | All 8 gameplay/*.css — duplicate definitions (floatUp, iceShimmer), media query breakpoint consistency, layout ordering |
| 28 | **CSSResponsive** | responsive.js, common.css — CSS variable JS/CSS sync, transform scale coordinate math, iOS visualViewport edge cases |
| 29 | **DOMPerformance** | All JS files — setTimeout cleanup, rAF leak prevention, event listener count, cloneNode memory management |
| 30 | **MemoryLeaks** | FxManager.js, main_hub.js, GameEngine.Loop.js — particle pool exhaustion, _originalOpacities Map cleanup, _tabIntervals leaks |
| 31 | **SecurityValidation** | SaveManager.Core.js _validateImportData, RewardManager.js, main_hub.js — innerHTML XSS, eval-adjacent patterns, URL.createObjectURL revocation |
| 32 | **Accessibility** | All HTML + CSS files — aria attributes, alt text, keyboard navigation, focus management, color contrast, prefers-reduced-motion |

### Watchdog Mechanism
- Each agent has a 2-minute implicit timeout via the harness
- Hung agents are automatically terminated and retried
- All 32 agents MUST complete before Phase 3

### Execution Strategy
All 32 agents run in parallel via Workflow tool's parallel() function.
Independent agents launch simultaneously; no phase barriers needed.

### Output Format
Each agent outputs findings as:
```
path/to/file.js:LINE: SEVERITY: problem description. fix suggestion.
```
Severity: CRITICAL, HIGH, MEDIUM, LOW, INFO

---

## Phase 3: Aggregation & Sequential Remediation
- Aggregate all 32 agent results into `SWARM_BUG_LOG.md`
- Deduplicate by path:line
- Sort by severity (CRITICAL first)
- Fix ONE bug at a time
- Verify each fix with browser automation (Playwright)
- Move to next only after verification

## Phase 4: Regression Testing & Roadmap Extension
- If bugs fixed: spawn 10+ verification agents on modified areas
- If regressions detected: log and return to Phase 3
- If clean: compile `SYSTEM_INTEGRITY_REPORT.md`
- Produce comprehensive engineering proposal for game roadmap extension
