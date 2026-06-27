# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Mahjong Saga (麻将江湖)** — Browser-side roguelike survival game. 16:9 landscape, pure DOM rendering (CSS-only graphics, zero images), localStorage persistence, ES6 classes loaded via `<script>` tags into global `window` namespace. No build tools, no frameworks.

## Run Locally

```bash
python -m http.server 8765
```

Then open:
- `http://localhost:8765/s1_save_select.html` — save/select
- `http://localhost:8765/s2_main_hub.html` — main hub (talents, forge, hero tavern)
- `http://localhost:8765/s3_gameplay.html` — direct combat

## Architecture Overview

### Page Flow

```
s1_save_select.html → s2_main_hub.html → s3_gameplay.html
```

**s3_gameplay.html** is the core game. Script load order (dependencies matter):

```
SaveManager.js → HeroConfig.js → LevelConfig.js → Player.js → Enemy.js → ExpGem.js → Weapon.js → RewardManager.js → FxManager.js → GameEngine.js
```

### Module Map

| Directory | File | Responsibility |
|-----------|------|----------------|
| `core/` | `GameEngine.js` (~2800 lines) | Main loop, state machine, lifecycle, spawner/combat/systems delegation |
| `core/` | `GameSpawner.js` | Enemy spawning logic, wave management, difficulty scaling |
| `core/` | `GameCombat.js` | Floating text, drops, explosions, screen shake |
| `core/` | `GameSystems.js` | Overdrive, mutators, set resonance |
| `core/` | `SaveManager.js` | localStorage read/write, meta persistence |
| `core/` | `RewardManager.js` | Upgrade panels, relic/weapon selection |
| `core/` | `FxManager.js` | FCT floating-text object pool (50 nodes, lazy-expand to 200) |
| `core/` | `AudioManager.js` | Web Audio API skeleton |
| `entities/` | `Player.js` | Player state, equipment aggregation, hero passives |
| `entities/` | `Enemy.js` | Enemy AI, Boss Lord state machine |
| `entities/` | `ExpGem.js` | Experience gem pickup |
| `entities/` | `Weapon.js` | Base Weapon class + 6 weapons (TrackingBlade, OrbitShield, ShotgunBurst, GroundSlammer, LaserBeam, NovaPulse) |
| `entities/` | `HeroRegistry.js` | Hero static data |
| `entities/` | `EquipmentRegistry.js` | Equipment prototypes and instance factory |
| `config/` | `HeroConfig.js` | Hero definitions (Knight, Mage, Assassin) |
| `config/` | `LevelConfig.js` | Level definitions + procedural generation |
| `config/` | `AchievementConfig.js` | Achievement definitions + detection |
| `page/` | `main_hub.js` | Main hub controller |
| `page/` | `save_select.js` | Save select controller |
| Root | `responsive.js` | 480x720 viewport scaling |

### Key Global Singles

- `window.gameEngine` — core combat engine
- `window.saveManager` — saves & meta
- `window.rewardManager` — reward panels
- `window.heroRegistry`, `window.equipmentRegistry` — entity registries
- `window.fxManager` — FCT pool

### Data Persistence

Two localStorage keys:
- `cr_meta.json` — permanent progress (cores, talents, heroes, equipment, mutations, deepest abyss)
- `cr_active_run.json` — current active run (breakpoint resume)

## Key Game Mechanics

- **Click attack** on enemies triggers auto-attack with crit, lifesteal, splash, freeze
- **Movement**: WASD / arrows / virtual joystick / click ground
- **Wave system**: escalating enemy spawns, Boss Lord on final wave
- **Upgrade panels**: 3-of-N relic/weapon selection on level-up
- **Overdrive**: rage fills from kills (+5) and coin pickups (+2); full rage + Space = 3s freeze-all + weapon spam + screen shake
- **Set resonance**: 3 matching affixes across equipped items triggers passive aura
- **Mutators**: mid-wave random environmental modifiers (bloodmoon, gravity, wither, etc.)
- **Endless abyss**: post-clear option to descend deeper with exponential enemy scaling
- **Clock freeze**: overlays (reward/mutator/pause/wave-announce) add `.game-clock-frozen` to `#game-container` to pause all CSS animations

## Editing Guidelines

- **No build tools** — raw HTML/CSS/JS. Any change to script load order in HTML must propagate to all three HTML files.
- **Global namespace** — all modules attach to `window`. No `import`/`export`. Respect dependency order.
- **GameEngine.js is the big file** (~2800 lines). It delegates to SpawnSystem, CombatSystem, Systems. When touching loop/physics logic, check if it's already delegated before editing GameEngine directly.
- **CSS-only graphics** — mahjong tile appearance uses layered `box-shadow` sandwich technique. Do not introduce image assets.
- **Responsive base**: 480x720 container scaled to viewport via `transform: scale()`. All coordinate math assumes this base size.
- **Epoch tracking**: evolution work is tracked in `mahjong_saga_evolution.md` and committed per branch `feat/evolution-epoch-N`. Current branch: `feat/evolution-epoch-14`.

## Common Patterns

- **Object pools**: FCT nodes (FxManager), projectiles, enemies — reuse DOM elements, don't create/destroy in hot path.
- **Collision**: circle-circle for projectiles/enemies, circle-point for player/enemy proximity.
- **Camera**: exponential lerp `cam += (target - cam) * (1 - exp(-10*dt))` applied via `#world-layer transform`.
- **State machine**: `_paused`, `_levelUpPending`, `_overdriveActive`, `_bossLordSpawned` — guard transitions with these flags.
- **Frozen clock workaround**: overlays must use `animation-play-state: running !important` to survive `.game-clock-frozen`.
