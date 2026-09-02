#!/bin/bash
# R165-R167 Commit Script
# Run this when bash recovers to commit all fixes

set -e
cd "/home/gtax/Click Roguelike"

echo "=== Syntax Checking All Modified Files ==="
node -c js/core/MahjongHand.js && echo "MahjongHand.js OK" || echo "MahjongHand.js FAIL"
node -c js/core/FxManager.js && echo "FxManager.js OK" || echo "FxManager.js FAIL"
node -c js/core/AudioManager.js && echo "AudioManager.js OK" || echo "AudioManager.js FAIL"
node -c js/core/GameEngine.Endgame.js && echo "Endgame.js OK" || echo "Endgame.js FAIL"
node -c js/core/GameEngine.Render.js && echo "Render.js OK" || echo "Render.js FAIL"
node -c js/core/GameEngine.Abyss.js && echo "Abyss.js OK" || echo "Abyss.js FAIL"
node -c js/core/GameEngine.Loop.js && echo "Loop.js OK" || echo "Loop.js FAIL"
node -c js/core/GameEngine.Spawn.js && echo "Spawn.js OK" || echo "Spawn.js FAIL"
node -c js/entities/Player.js && echo "Player.js OK" || echo "Player.js FAIL"
node -c js/core/GameCombat.js && echo "Combat.js OK" || echo "Combat.js FAIL"
node -c js/core/GameEngine.Weapons.js && echo "Weapons.js OK" || echo "Weapons.js FAIL"
node -c js/core/SaveManager.Core.js && echo "SaveManager.Core.js OK" || echo "SaveManager.Core.js FAIL"

echo ""
echo "=== Checking Git Status ==="
git status --short
echo ""
git diff --stat
echo ""
echo "=== Committing ==="
git add -A
git commit -m "R165-R167: P0+P1 fixes — 15 bugs across 11 files

Fixes:
- GameEngine.Render.js:84 - LaserBeam instanceof guard
- FxManager.js:55,83,95 - Null safety + pool exhaustion fallback
- GameEngine.Abyss.js:139,163 - Shop _displayCost prototype fix
- GameEngine.Loop.js:204 - Abyss combo one-shot flag
- GameEngine.Spawn.js:773 - Weapon rawBaseCd snapshot
- MahjongHand.js:229 - Pengpenghu formula fix (P0)
- GameEngine.Endgame.js:268 - ToastSystem cleanup on restart
- AudioManager.js - Oscillator tracking
- Player.js:781 - Speed zero-fallback
- GameCombat.js:27 - Causality text null guard
- GameEngine.Weapons.js:14 - Remove dead synergy flag
- SaveManager.Core.js:501 - Restore rawBaseCd

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"

echo ""
echo "=== Commit Complete ==="
git log --oneline -3
