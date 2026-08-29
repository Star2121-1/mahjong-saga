# CLAUDE.md

This project provides instructions for Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Mahjong Saga (麻将江湖)** — Browser-side roguelike survival game. 16:9 landscape, pure DOM rendering (CSS-only graphics, zero images), localStorage persistence, ES6 classes loaded via `<script>` tags into global `window` namespace. No build tools, no frameworks.

### Run Locally

```bash
python -m http.server 8765
```

Then open:
- `http://localhost:8765/pages/s1_save_select.html` — save/select
- `http://localhost:8765/pages/s2_main_hub.html` — main hub (talents, forge, hero tavern)
- `http://localhost:8765/pages/s3_gameplay.html` — direct combat

## Architecture Overview

### Page Flow

```
s1_save_select.html → s2_main_hub.html → s3_gameplay.html
```

**s3_gameplay.html** is the core game. Script load order (dependencies matter):

```
CSS: common.css → gameplay-layout → gameplay-player → gameplay-enemy → gameplay-overlay → gameplay-weapon → gameplay-effects → gameplay-ui → gameplay-responsive
JS:  SaveManager → SaveManager.Core → SaveManager.Season → SaveManager.Weekly → SaveManager.Compendium → SaveManager.RunStats → FxManager → AudioManager → RewardManager → Balance.js
     → GameSpawner → GameCombat → GameSystems
     → EquipmentRegistry → HeroConfig → HeroRegistry → LevelConfig → Player → Enemy → ExpGem → Weapon
     → GameEngine.js + 11 sub-modules (Boot/NewRun/Loop/Spawn/Combat/Endgame/Render/Weapons/Events/Guide/Navigate)
     → AchievementConfig → main.js → responsive.js
```

> **Note:** `GameEngine.Abyss.js` and `MahjongHand.js` exist on disk but are **not loaded in s3_gameplay.html**. They are WIP code for the 无尽深渊 and 雀魂 systems — add them to s3 when ready to activate.

### Module Map

| Directory | File | Responsibility |
|-----------|------|----------------|
| `core/` | `GameEngine.js` (~130 lines) | Constructor, state flags, DOM refs, prototype delegation stubs |
| `core/` | `GameEngine.Boot.js` | Initialization, DOM binding, keyboard/touch/joystick, audio button, freeze/unfreeze |
| `core/` | `GameEngine.NewRun.js` | New run setup, default weapons, hand tiles, weapon slots |
| `core/` | `GameEngine.Loop.js` | Main rAF loop, state machine, temp buff, drone, totem buff (grid), mutator trigger, death handling, camera lerp |
| `core/` | `GameEngine.Spawn.js` | Enemy spawning, kill rewards, equipment drops, coin/gem collection, wave progression, MahjongHand integration |
| `core/` | `GameEngine.Combat.js` | Floating text (FCT), explosions, screen shake, float text helpers |
| `core/` | `GameEngine.Endgame.js` | Victory, game over, Boss Lord settlement |
| `core/` | `GameEngine.Render.js` | Entity DOM sync, camera, weapon rendering |
| `core/` | `GameEngine.Weapons.js` | Weapon update loop, projectile management |
| `core/` | `GameEngine.Events.js` | Inter-wave events, mutator panel, overdrive, boss gamble, pause |
| `core/` | `GameEngine.Guide.js` | Tutorial overlay, step tracking |
| `core/` | `GameEngine.Navigate.js` | Page transitions, save/load navigation |
| `core/` | `GameEngine.Abyss.js` | 无尽深渊 system — WIP, not yet loaded in s3_gameplay.html |
| `core/` | `MahjongHand.js` | 雀魂牌库 + 牌型检测 — WIP, not yet loaded in s3_gameplay.html |
| `core/` | `ToastSystem.js` | Global toast notifications (5 types, DOM pool) — loaded in s2 only, WIP for s3 |
| `core/` | `GameSpawner.js` | Enemy spawn logic, wave management, difficulty scaling |
| `core/` | `GameCombat.js` | Floating text, drops, explosions, screen shake |
| `core/` | `GameSystems.js` | Overdrive, mutators, set resonance (flame/ice), wither |
| `core/` | `SaveManager.js` | localStorage read/write, meta persistence |
| `core/` | `SaveManager.Core.js` | Checksum, backup rollback, import/export, migration |
| `core/` | `SaveManager.Season.js` | Season system, prestige, inflation guard |
| `core/` | `SaveManager.Weekly.js` | Weekly vault challenges |
| `core/` | `SaveManager.Compendium.js` | Weapon/relic discovery tracking |
| `core/` | `SaveManager.RunStats.js` | Per-run and cumulative statistics |
| `core/` | `RewardManager.js` | Upgrade panels, relic/weapon selection, secrets, sacrifice, replace panel |
| `core/` | `FxManager.js` | FCT floating-text object pool (50→200 nodes) |
| `core/` | `AudioManager.js` | Web Audio API synthesis, mute toggle |
| `core/` | `ToastSystem.js` | Global toast notifications (5 types, DOM pool) — loaded in s2 only |
| `entities/` | `Player.js` | Player state, equipment aggregation, hero passives, relic effects |
| `entities/` | `Enemy.js` | Enemy AI, Boss Lord state machine, frozen/thorns |
| `entities/` | `ExpGem.js` | Experience gem pickup |
| `entities/` | `Weapon.js` | Base Weapon class + 6 weapons (TrackingBlade, OrbitShield, ShotgunBurst, GroundSlammer, LaserBeam, NovaPulse) |
| `entities/` | `HeroRegistry.js` | Hero static data lookup |
| `entities/` | `EquipmentRegistry.js` | Equipment prototypes and instance factory |
| `config/` | `HeroConfig.js` | Hero definitions (4 heroes: Hero/Knight/Mage/Assassin) |
| `config/` | `LevelConfig.js` | Level definitions + procedural generation |
| `config/` | `AchievementConfig.js` | Achievement definitions + detection |
| `config/` | `Balance.js` | 170+ magic number constants centralized |
| `page/` | `main_hub.js` | Main hub controller (10 tabs: tavern/talents/forge/expedition/mutation/compendium/achievements/stats/history) |
| `page/` | `save_select.js` | Save select controller |
| `utils/` | `dom-utils.js` | DOM helper functions |
| `utils/` | `format-utils.js` | Time/string formatting |
| `utils/` | `math-utils.js` | Math utility functions |
| Root | `responsive.js` | 480×720 viewport scaling |

### Key Global Singles

- `window.gameEngine` — core combat engine
- `window.saveManager` — saves & meta
- `window.rewardManager` — reward panels
- `window.heroRegistry`, `window.equipmentRegistry` — entity registries
- `window.fxManager` — FCT pool
- `window.audioManager` — Web Audio synthesis
- `window.toastSystem` — toast notifications (s2 hub only; not yet active in s3)
- `window.SpawnSystem`, `window.CombatSystem`, `window.Systems` — delegation proxies
- `window.MahjongHand` — 雀魂牌库+检测（WIP: loaded only if MahjongHand.js added to s3 HTML）

### Data Persistence

Two localStorage keys:
- `cr_meta.json` — permanent progress (cores, talents, heroes, equipment, mutations, deepest abyss, achievements, season/weekly/daily, run history)
- `cr_active_run.json` — current active run (breakpoint resume)

### Key Game Mechanics

- **Click attack** on enemies triggers auto-attack with crit, lifesteal, splash, freeze
- **Movement**: WASD / arrows / virtual joystick / click ground
- **Wave system**: escalating enemy spawns, Boss Lord on final wave
- **Upgrade panels**: 3-of-N relic/weapon/sacrifice selection on level-up
- **Overdrive**: rage fills from kills (+5) and coin pickups (+2); full rage + Space = 3s freeze-all + weapon spam + screen shake
- **Set resonance**: 3 matching affixes across equipped items triggers flame (speed) or ice (freeze) aura
- **Mutators**: mid-wave random environmental modifiers (bloodmoon, frenzy, gravity, frailty, wither), triggered at 50% wave spawn
- **Boss Gamble**: Boss Lord death triggers risk/reward choice (gold vs cores multiplier)
- **Endless abyss**: post-clear option to descend deeper with exponential enemy scaling
- **Clock freeze**: overlays (reward/mutator/pause/wave-announce/guide) add `.game-clock-frozen` to `#game-container` to pause all CSS animations; overlays exempt via `animation-play-state: running !important`
- **Hero passives**: 4 heroes with unique abilities (Hero: atkSpeed+weaponCd, Knight: dodge slam, Mage: thorns recalc, Assassin: spdBonus+dodge)
- **Secrets**: 5 hidden combinations trigger bonus effects when relic thresholds met
- **Sacrifice**: trade a relic level for various benefits (metaToken, gold buff, temp buff, double coins)

### Editing Guidelines

- **No build tools** — raw HTML/CSS/JS. Any change to script load order in HTML must propagate to all three HTML files.
- **Global namespace** — all modules attach to `window`. No `import`/`export`. Respect dependency order.
- **GameEngine is split into 12 files** — never edit the monolith. The base file is only ~130 lines of constructor + delegation stubs.
- **Balance.js** — all magic numbers must go through `window.Balance.*`. Do not add new hardcoded numbers.
- **CSS-only graphics** — mahjong tile appearance uses layered `box-shadow` sandwich technique. Do not introduce image assets.
- **Responsive base**: 480×720 container scaled via `transform: scale()`. All coordinate math assumes this base size. `--_fs` CSS variable compensates for scale.
- **Primary doc**: `GAME_BIBLE.md` is the single consolidated reference (architecture, data tables, iron laws, known issues, active workstream). Historical docs are archived in `_archive/` when they exist.
- **Epoch tracking**: history in `_archive/docs/mahjong_saga_evolution.md` (read-only). Current branch: `feat/fix-flash-and-waves`.
- **Active design**: 胡牌系统 spec lives in `HUPAI_DESIGN.md` — read before touching collection/reward systems. The 雀魂 system (MahjongHand.js) is WIP and not yet wired into s3_gameplay.html.

### Common Patterns

- **Object pools**: FCT nodes (FxManager), toast nodes (ToastSystem) — reuse DOM elements, don't create/destroy in hot path.
- **Collision**: circle-circle for projectiles/enemies, circle-point for player/enemy proximity.
- **Camera**: exponential lerp `cam += (target - cam) * (1 - exp(-10*dt))` applied via `#world-layer transform`.
- **State machine**: `_paused`, `_levelUpPending`, `_overdriveActive`, `_bossLordSpawned`, `_pendingReward` — guard transitions with these flags.
- **Grid spatial partitioning**: totem buff check uses GRID_SIZE=80 cells for O(1) neighbor lookup instead of O(n×m).
- **Clock freeze**: `.game-clock-frozen` pauses all CSS animations. Overlays whitelist via `animation-play-state: running !important`.
- **ToastSystem**: Currently loaded in s2 only. Do NOT add to s3 until explicitly intended — it's gated behind a s3 activation task.

### Version Numbering

All HTML `<script>` and `<link>` tags use `?v=TIMESTAMP` cache busting. Format: `v=20260701X` where X is iteration letter. All three pages should use consistent versions.
