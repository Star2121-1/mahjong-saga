export const meta = {
    name: 'regression-verify-deadcode',
    description: 'Verify dead code cleanup',
};

var prompts = [
    'Verify GameCombat.js — Cs.screenShake and Cs.triggerKnightDodgeSlam removed (replaced with comments). Report PASS/FAIL.',
    'Verify GameSpawner.js — Ss.cleanEnemyProjectiles and Ss.updateEnemyProjectiles removed (replaced with comments). Report PASS/FAIL.',
    'Verify GameEngine.Events.js — Gp._showMutatorPanel and Gp._applyMutator fallback removed (replaced with comment). Report PASS/FAIL.',
    'Verify GameEngine.NewRun.js — Gp._initHandTiles, _placeHandTile, _clearHandTile, _renderPlayerTile removed (replaced with comment). Report PASS/FAIL.',
];

var results = [];
for (var i = 0; i < prompts.length; i++) {
    var r = await agent(prompts[i], { label: 'Verify dead code ' + (i+1), phase: 'Dead Code Verification' });
    results.push(r);
}

log('Dead code verification: ' + results.filter(function(r) { return r && r.indexOf !== -1 && r.indexOf('PASS') !== -1; }).length + '/' + results.length + ' agents');
return results;
