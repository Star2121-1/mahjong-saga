export const meta = {
    name: 'regression-verification',
    description: '10 agents verify Phase 3 fixes',
    phases: [
        { title: 'Regression Verification' },
    ],
};

var FIXERS = [
    {
        label: 'Verify HeroRegistry',
        prompt: 'Verify the fix in js/entities/HeroRegistry.js: changed `h.cdFloor || 0.2` to `h.cdFloor != null ? h.cdFloor : 0.2`. Check that Hero (0.18), Knight (0.20), Mage (0.15), Assassin (0.15) all get correct cdFloor values. Also verify the cost field change `h.unlockCost || 0` is correct. Report PASS/FAIL.',
    },
    {
        label: 'Verify Weapon.update',
        prompt: 'Verify the fix in js/entities/Weapon.js: ShotgunBurst.update now has signature `(dt, player, enemies, engine)` instead of just `(dt)`. Check that callers in GameEngine.Loop.js and GameEngine.Render.js pass all 4 args. Report PASS/FAIL.',
    },
    {
        label: 'Verify validWeapons',
        prompt: 'Verify the fix in js/core/SaveManager.Core.js: `validWeapons` now derives from `window.rewardManager.weaponInfos` instead of hardcoded array. Check that the fallback still works if rewardManager not loaded. Report PASS/FAIL.',
    },
    {
        label: 'Verify bare catch',
        prompt: 'Verify the fix in js/page/main_hub.js: All `.catch(function() {})` replaced with `.catch(function(err) { console.warn(...) })`. Check lines 199, 283, 309, 1277, 1305, 1315, 1323. Report PASS/FAIL.',
    },
    {
        label: 'Verify cloneNode',
        prompt: 'Verify the fix in js/core/RewardManager.js: `_animateSuckIn` now stores cleanup reference and handles page navigation. Check that `.suckin-clone` guard exists. Report PASS/FAIL.',
    },
    {
        label: 'Verify LevelConfig boundary',
        prompt: 'Verify the fix in js/config/LevelConfig.js: `if (effectiveWaves > 0)` guard added before `waveEnemyMax[effectiveWaves - 1] = 1` in both generate() and generateWithSeed(). Report PASS/FAIL.',
    },
    {
        label: 'Verify GameSpawner affinity',
        prompt: 'Verify the fix in js/core/GameSpawner.js: `updateEnemyProjectiles` now applies `_mapAffinityReduction` before damage. Compare with GameEngine.Events.js version for consistency. Report PASS/FAIL.',
    },
    {
        label: 'Verify GameSystems setTimeout',
        prompt: 'Verify the fix in js/core/GameSystems.js: `updateResonanceAuras` now stores setTimeout refs in `engine._flameHideTimer` and `engine._iceHideTimer`. Report PASS/FAIL.',
    },
    {
        label: 'Verify HeroConfig cleanup',
        prompt: 'Verify the fix in js/config/HeroConfig.js: All redundant `cost:` fields removed from 4 heroes. Verify `HeroRegistry.js` updated to `h.unlockCost || 0`. Report PASS/FAIL.',
    },
    {
        label: 'Verify Weapon.cdFloor',
        prompt: 'Verify the fix in js/entities/Weapon.js: `upgrade()` now uses `window.gameEngine.player.cdFloor != null` check. Report PASS/FAIL.',
    },
];

var results = await parallel(FIXERS.map(function(r) {
    return function() {
        return agent(r.prompt, { label: r.label, phase: 'Regression Verification' });
    };
}));

log('Regression verification complete: ' + results.filter(Boolean).length + '/10 agents');
return results.filter(Boolean);
