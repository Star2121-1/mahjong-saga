export const meta = {
    name: 'regression-verification-r27',
    description: '10 agents verify Phase 3 fixes',
    phases: [
        { title: 'Regression Verification' },
    ],
};

var FIXERS = [
    {
        label: 'Verify Overdrive cdTimer',
        prompt: 'Verify GameEngine.Render.js:79 — the line `w.cooldownTimer = 0` has been removed from the overdrive active check. Confirm the line now only resets atkFactor. Report PASS/FAIL.',
    },
    {
        label: 'Verify OrbitShield cd',
        prompt: 'Verify Weapon.js:126 — `this.orbitTickTimers[i] = 0.3` changed to `this.orbitTickTimers[i] = this.cd`. Also check Weapon.js:95 — atkFactor changed from 0.5 to 0.3, cd from 0.3 to 0.5. Report PASS/FAIL.',
    },
    {
        label: 'Verify Abyss scaling',
        prompt: 'Verify Enemy.js:23 — `Math.pow(1.15, loopCount)` changed to `Math.pow(1.08, loopCount)` for both HP and ATK. Report PASS/FAIL.',
    },
    {
        label: 'Verify Elite mode',
        prompt: 'Verify GameSpawner.js:135 — elite multiplier applied to spawned enemies. Verify Events.js:450 — elite multiplier applied to Boss Lord. Report PASS/FAIL.',
    },
    {
        label: 'Verify Queen shield timer',
        prompt: 'Verify GameEngine.Combat.js:68 — setTimeout stored in `this._qqueenShieldTimer`. Verify GameEngine.Navigate.js:27 — clearTimeout called in restart(). Report PASS/FAIL.',
    },
    {
        label: 'Verify revive rAF',
        prompt: 'Verify GameEngine.Boot.js:508 — `this._guardedLoop = guardedLoop` exposed. Verify GameEngine.Loop.js:263 — uses `this._guardedLoop` instead of `this._boundLoop`. Report PASS/FAIL.',
    },
    {
        label: 'Verify dead code cleanup',
        prompt: 'Verify GameCombat.js — Cs.screenShake and Cs.triggerKnightDodgeSlam removed. Verify GameSpawner.js — Ss.cleanEnemyProjectiles and Ss.updateEnemyProjectiles removed. Verify GameEngine.Events.js — _showMutatorPanel and _applyMutator fallback removed. Verify GameEngine.NewRun.js — _initHandTiles/_placeHandTile/_clearHandTile/_renderPlayerTile removed. Report PASS/FAIL.',
    },
    {
        label: 'Verify spawnCoinBurst visual',
        prompt: 'Verify GameEngine.Events.js:89-101 — _spawnCoinBurst now delegates to this._combat.spawnCoinsAt for visual feedback. Report PASS/FAIL.',
    },
    {
        label: 'Verify clock freeze exemptions',
        prompt: 'Verify gameplay-ui.css — #abyss-panel and #fct-layer added to game-clock-frozen exemption list. Verify RewardManager.js:_showFloatingText — animationPlayState set to running. Report PASS/FAIL.',
    },
    {
        label: 'Verify _isPauseAllowed guards',
        prompt: 'Verify GameEngine.Boot.js:_isPauseAllowed — checks for _announcingWave, _pendingBossGamble, and boss-gamble-panel DOM. Report PASS/FAIL.',
    },
];

var results = await parallel(FIXERS.map(function(r) {
    return function() {
        return agent(r.prompt, { label: r.label, phase: 'Regression Verification' });
    };
}));

log('Regression verification complete: ' + results.filter(Boolean).length + '/10 agents');
return results.filter(Boolean);
