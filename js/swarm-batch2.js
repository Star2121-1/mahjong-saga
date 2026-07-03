export const meta = {
    name: '32-agent-swarm-audit-batch2',
    description: 'Second 16 agents of 32-agent swarm audit',
    phases: [
        { title: 'Config Review' },
        { title: 'Page & UI Review' },
        { title: 'CSS Review' },
        { title: 'Cross-Cutting Review' },
    ],
};

const BATCH2_AGENTS = [
    // CONFIG AGENTS (19-21)
    {
        label: 'HeroConfig',
        phase: 'Config Review',
        prompt: 'You are a Hero Config Auditor. Review F:/Boke/Click Roguelike/js/config/HeroConfig.js, js/entities/HeroRegistry.js, and js/entities/Player.js for:\n1. Hero stat consistency (HP/ATK/SPD/Dodge across 4 heroes)\n2. cdFloor defaults (Hero 0.18, Knight 0.20, Mage 0.15, Assassin 0.15)\n3. Unlock cost validation (5/30/50/100 credits)\n4. Missing hero fallback in Player._initFromConfig (defaults to 100/10/180/0)\n5. heroRegistry.init() normalization vs raw heroConfig\n6. Passive ability definitions and their application\n\nRead: js/config/HeroConfig.js, js/entities/HeroRegistry.js, js/entities/Player.js\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },
    {
        label: 'LevelConfig',
        phase: 'Config Review',
        prompt: 'You are a Level Config Auditor. Review F:/Boke/Click Roguelike/js/config/LevelConfig.js for:\n1. Procedural level generator scaling bounds (HP x1.10^n, ATK x1.12^n, spawn x1.05^n)\n2. waveEnemyMax array indexing (levels 1-10 have different caps)\n3. difficultyFactor overflow in damage calculations\n4. proceduralSeedGenerator Mulberry32 PRNG seeding\n5. difficultyTierColors hex mapping\n6. level_procedural template completeness\n\nRead: js/config/LevelConfig.js\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },
    {
        label: 'AchievementConfig',
        phase: 'Config Review',
        prompt: 'You are an Achievement Config Auditor. Review F:/Boke/Click Roguelike/js/config/AchievementConfig.js and js/core/GameEngine.Combat.js for:\n1. 32 achievements across 4 categories (combat/victory/abyss/special)\n2. Threshold alignment between config and detection functions\n3. endgame vs inflight detection parity\n4. achievementCheck.inflight and achievementCheck.endgame completeness\n5. Duplicate trigger detection (e.g., overdrive counted in both inflight and endgame)\n6. get_rich achievement in _syncUI vs config definition\n\nRead: js/config/AchievementConfig.js, js/core/GameEngine.Combat.js\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },

    // PAGE & UI AGENTS (22-25)
    {
        label: 'MainHubPage',
        phase: 'Page & UI Review',
        prompt: 'You are a Main Hub Page Auditor. Review F:/Boke/Click Roguelike/js/page/main_hub.js for:\n1. Panel data binding (8 hub tabs: expedition/tavern/talents/forge/mutation/compendium/achievements/stats/history)\n2. Event listener deduplication (_hubListenersBound flag)\n3. Tab cleanup (_destroyPreviousPanel, rAF + intervals)\n4. Async error swallowing (multiple .catch(function(){}))\n5. onHeroMainAction directly mutates _metaCache instead of using SaveManager helpers\n6. refreshStatsPanel references undefined _settleRun\n\nRead: js/page/main_hub.js\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },
    {
        label: 'SaveSelectPage',
        phase: 'Page & UI Review',
        prompt: 'You are a Save Select Page Auditor. Review F:/Boke/Click Roguelike/js/page/save_select.js for:\n1. New game warning flow (onNewGame -> resetAllData -> redirect)\n2. Import/export error states (importSaveFile, exportSave)\n3. Pending action race conditions (continue vs new game)\n4. localStorage difficulty persistence (cr_difficulty raw float, bypasses SaveManager)\n5. Settings overlay state management\n\nRead: js/page/save_select.js\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },
    {
        label: 'RewardManager',
        phase: 'Page & UI Review',
        prompt: 'You are a Reward Manager Auditor. Review F:/Boke/Click Roguelike/js/core/RewardManager.js for:\n1. _buildPool relic availability (Lv 0-4 base relics, 4 legendary evolution conditions)\n2. _pickFrom weighted random (1-2 weapons from weighted pool, fill remainder from non-weapon)\n3. _animateSuckIn DOM cloning (460ms window where _panelLocked is released prematurely)\n4. Panel lock state management (_panelLocked race condition)\n5. Sacrifice option during level-up only (5 types: metatoken/gold/temp_atk/temp_hp/double_coin)\n6. _checkSecrets 5 secret combination evaluation\n\nRead: js/core/RewardManager.js\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },
    {
        label: 'HTMLStructure',
        phase: 'Page & UI Review',
        prompt: 'You are an HTML Structure Auditor. Review F:/Boke/Click Roguelike/index.html, s1_save_select.html, s2_main_hub.html, s3_gameplay.html, and pages/ versions for:\n1. Version number consistency (20260701W for save_select CSS, 20260701X for JS, 20260701C for hub)\n2. Element ID completeness (all JS-referenced IDs present in HTML)\n3. Script load order dependencies\n4. pointer-events on overlays blocking game input\n5. Cross-page duplication (root vs pages/ copies)\n\nRead: index.html, s1_save_select.html, s2_main_hub.html, s3_gameplay.html\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },

    // CSS AGENTS (26-28)
    {
        label: 'CSSCommon',
        phase: 'CSS Review',
        prompt: 'You are a CSS Common Styles Auditor. Review F:/Boke/Click Roguelike/css/common.css for:\n1. Global selector scope (* { margin: 0 })\n2. --_fs variable definition (hardcoded 1.4, overridden by responsive.js)\n3. Animation keyframe naming conflicts (floatUp, explosionExpand, screenShake, waveAnnounce, legendaryGlow, warningPulse)\n4. Scrollbar styling cross-browser compatibility\n5. .coin-placeholder hardcoded z-index:8 with no corresponding HTML element\n6. Duplicate --_fs definition alongside gameplay-layout.css\n\nRead: css/common.css\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },
    {
        label: 'CSSGameplay',
        phase: 'CSS Review',
        prompt: 'You are a CSS Gameplay Styles Auditor. Review F:/Boke/Click Roguelike/css/gameplay/ for:\n1. Duplicate definitions (floatUp in common.css vs gameplay-effects.css, iceShimmer in gameplay-player.css)\n2. Media query breakpoint consistency across 8 files\n3. Layout rule ordering specificity conflicts\n4. .game-clock-frozen overlay behavior (animation-play-state exceptions)\n5. Mahjong tile CSS (box-shadow sandwich) broken tiles\n6. Duplicate selectors in main_hub.css (#hero-name-display lines 203/295, #hero-status-display lines 204/296, #hero-carousel-viewport defined twice)\n\nRead: css/gameplay/gameplay-effects.css, css/gameplay/gameplay-enemy.css, css/gameplay/gameplay-layout.css, css/gameplay/gameplay-overlay.css, css/gameplay/gameplay-player.css, css/gameplay/gameplay-weapon.css, css/main_hub.css\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },
    {
        label: 'CSSResponsive',
        phase: 'CSS Review',
        prompt: 'You are a CSS Responsive Auditor. Review F:/Boke/Click Roguelike/js/responsive.js and all CSS files for:\n1. CSS variable JS/CSS sync (--_fs = Math.min(6, 1.4 / s))\n2. transform: scale() coordinate math (designW=1920, designH=1080 for hub/gameplay; 480x720 for save select)\n3. iOS visualViewport edge cases (300ms/600ms fallback timers)\n4. Responsive breakpoint coverage (9 breakpoints across 6 CSS files)\n5. Font-size compensation (--_fs capped at 6)\n6. Scale throttling (80ms)\n\nRead: js/responsive.js, css/gameplay/gameplay-responsive.css, css/gameplay/gameplay-overlay.css, css/gameplay/gameplay-player.css, css/gameplay/gameplay-enemy.css, css/gameplay/gameplay-effects.css, css/gameplay/gameplay-layout.css, css/main_hub.css\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },

    // CROSS-CUTTING AGENTS (29-32)
    {
        label: 'DOMPerformance',
        phase: 'Cross-Cutting Review',
        prompt: 'You are a DOM Performance Auditor. Review ALL js files for:\n1. setTimeout cleanup (Enemy._updateBossLord line 426-429 wel element not removed in setTimeout callback)\n2. rAF leak prevention (_boundLoop cleanup on game over)\n3. Event listener count growth (main_hub.js tab switching, _hubListenersBound dedup)\n4. cloneNode memory management (RewardManager._animateSuckIn)\n5. DOM element pooling (FxManager 50-node pool, lazy-expand to 200)\n6. Parallax background update per frame\n\nRead: All files in js/core/, js/entities/, js/page/\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },
    {
        label: 'MemoryLeaks',
        phase: 'Cross-Cutting Review',
        prompt: 'You are a Memory Leak Auditor. Review F:/Boke/Click Roguelike/js/core/FxManager.js, js/page/main_hub.js, js/core/GameEngine.Loop.js for:\n1. Particle pool exhaustion (_pool[] in FxManager, max 200 nodes, _healthCheck every 50 returns)\n2. _originalOpacities Map cleanup (GameEngine.Guide.js _restoreOpacity)\n3. _tabIntervals array leaks (main_hub.js tab switching)\n4. Set growth in enemy projectiles (_enemyProjectiles[] never cleaned except on game over)\n5. _enemyElements Map cleanup on enemy death\n6. FCT node lifecycle (borrow/return cycle)\n\nRead: js/core/FxManager.js, js/page/main_hub.js, js/core/GameEngine.Loop.js, js/core/GameEngine.Guide.js, js/core/GameEngine.Combat.js\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },
    {
        label: 'SecurityValidation',
        phase: 'Cross-Cutting Review',
        prompt: 'You are a Security Validation Auditor. Review F:/Boke/Click Roguelike/js/core/SaveManager.Core.js, js/core/RewardManager.js, js/page/main_hub.js for:\n1. innerHTML XSS vectors (RewardManager card rendering, main_hub.js panel content)\n2. eval()-adjacent patterns (any Function() or eval() calls)\n3. URL.createObjectURL revocation (importSaveFile FileReader)\n4. localStorage prototype pollution (importSaveFile type checking)\n5. _validateImportData hardcoded validWeapons array (should be dynamic)\n6. Bare catch blocks swallowing errors (.catch(function(){}))\n\nRead: js/core/SaveManager.Core.js, js/core/RewardManager.js, js/page/main_hub.js\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },
    {
        label: 'Accessibility',
        phase: 'Cross-Cutting Review',
        prompt: 'You are an Accessibility Auditor. Review ALL HTML and CSS files for:\n1. aria attributes (missing on all overlay panels)\n2. alt text (no images used, so N/A)\n3. keyboard navigation (WASD/joystick only, no keyboard overlay controls)\n4. focus management (no tabindex, no focus traps on overlays)\n5. Color contrast ratios (CSS hue values, no WCAG testing)\n6. prefers-reduced-motion support (18+ animations, no media query override)\n\nRead: index.html, s1_save_select.html, s2_main_hub.html, s3_gameplay.html, css/common.css, css/gameplay/*.css\n\nOutput format: path:line: SEVERITY: problem. fix suggestion.'
    },
];

const results = await parallel(BATCH2_AGENTS.map(function(r) {
    return function() {
        return agent(r.prompt, { label: r.label, phase: r.phase });
    };
}));

log('Batch 2 complete: ' + results.filter(Boolean).length + '/16 agents succeeded');
return results.filter(Boolean);
