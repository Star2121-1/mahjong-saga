---
name: 30-agent-swarm-audit
description: 30 specialized agents audit the entire Click Roguelike codebase from different perspectives
metadata:
  type: project
---

# 30-Agent Swarm Audit Plan

## Architecture

32 specialized sub-agents, each with unique focus area, no overlap.

## Agent Identities

### Core Engine (8 agents)
1. **LoopArchitect** - GameEngine.Loop.js, rAF scheduling, _loopRunId guards, _announcingWave deadlocks
2. **CombatFlow** - GameEngine.Combat.js, wave progression, boss spawn timing, victory/game-over transitions
3. **SpawnSystem** - GameEngine.Spawn.js, GameSpawner.js, enemy spawn caps, DOM lifecycle, _enemyElements cleanup
4. **WeaponSystem** - GameEngine.Weapons.js, GameEngine.Render.js, Weapon.js, slot limits, projectile grid
5. **EventSystem** - GameEngine.Events.js, inter-wave events, mutator panels, overdrive, boss gamble
6. **EndgameFlow** - GameEngine.Endgame.js, _onClick damage calc, float text, explosions
7. **StateMachine** - All GameEngine files, running/gameOver/_paused/_pendingReward consistency
8. **DelegateProxy** - GameEngine.js, SpawnSystem/CombatSystem/Systems delegation chain

### Entity System (5 agents)
9. **PlayerEntity** - Player.js, _initFromConfig vs restore overlap, takeDamage thorns recursion, addRelic stacking
10. **EnemyEntity** - Enemy.js, AI state machines, _updateNormal/Stalker/Shaman/BossLord path coverage
11. **WeaponClasses** - Weapon.js subclasses, TrackingBlade nearest-target, OrbitShield collision, ShotgunBurst spread
12. **ExpGemCollect** - ExpGem.js, gem collection, TTL expiration, magnet radius, window.expGems global sync
13. **ProjectileSystem** - Projectile.js, grid spatial partition, hitEnemies Set cleanup, out-of-bounds removal

### Save System (5 agents)
14. **SaveMigration** - SaveManager.Core.js _migrateMeta, version tracking, field defaults
15. **SaveSerialization** - SaveManager.js/Core.js JSON read/write, function serialization (checkFn)
16. **SaveImportExport** - SaveManager.Core.js importSaveFile, _validateImportData, prototype pollution
17. **SeasonSystem** - SaveManager.Season.js, prestige cost, season trigger, inflation guard
18. **WeeklyVault** - SaveManager.Weekly.js, vault operations, checkFn null serialization

### Config & Registry (3 agents)
19. **HeroConfig** - HeroConfig.js, HeroRegistry.js, Player.js config lookup, stat consistency
20. **LevelConfig** - LevelConfig.js, procedural generator scaling bounds, waveEnemyMax indexing
21. **AchievementConfig** - AchievementConfig.js, threshold alignment, endgame vs inflight parity

### Page & UI (4 agents)
22. **MainHubPage** - main_hub.js, panel data binding, event listener dedup, tab cleanup
23. **SaveSelectPage** - save_select.js, new game warning, import/export errors, localStorage difficulty
24. **RewardManager** - RewardManager.js, _buildPool relic availability, _pickFrom weighted random, panel lock
25. **HTMLStructure** - All HTML files, version consistency, element ID completeness

### CSS (3 agents)
26. **CSSCommon** - common.css, global selectors, --_fs variable, animation keyframe conflicts
27. **CSSGameplay** - All 8 gameplay/*.css, duplicate definitions, media query consistency
28. **CSSResponsive** - responsive.js, CSS variable sync, transform scale coordinate math

### Cross-Cutting (7 agents)
29. **DOMPerformance** - All JS files, setTimeout cleanup, rAF leak prevention, cloneNode memory
30. **MemoryLeaks** - FxManager.js, main_hub.js, particle pool exhaustion, _originalOpacities cleanup
31. **SecurityValidation** - SaveManager.Core.js _validateImportData, innerHTML assignments, XSS vectors
32. **Accessibility** - All HTML/CSS files, aria attributes, keyboard navigation, prefers-reduced-motion

## Execution Strategy

All 32 agents run in parallel via Workflow tool's parallel() function.
Each agent gets a 2-minute implicit timeout via the harness.
Results aggregated into SWARM_BUG_LOG.md.

## Output Format

Each agent outputs findings as:
```
path/to/file.js:LINE: SEVERITY: problem description. fix suggestion.
```

Severity: CRITICAL, HIGH, MEDIUM, LOW, INFO

## Watchdog

The harness automatically terminates hung agents. If an agent produces no output for 2 minutes, it's considered timed out and will be retried.
