#!/bin/bash
cd "/home/gtax/Click Roguelike"
echo "Running syntax checks..."
node -c js/core/GameEngine.Loop.js && echo "Loop.js OK"
node -c js/core/GameEngine.Endgame.js && echo "Endgame.js OK"
node -c js/core/FxManager.js && echo "FxManager.js OK"
node -c js/core/GameEngine.Boot.js && echo "Boot.js OK"
node -c js/core/GameEngine.Abyss.js && echo "Abyss.js OK"
node -c js/core/GameEngine.Spawn.js && echo "Spawn.js OK"
node -c js/core/MahjongHand.js && echo "MahjongHand.js OK"
node -c js/core/SaveManager.Core.js && echo "SaveManager.Core.js OK"
node -c js/entities/Player.js && echo "Player.js OK"
node -c js/core/GameCombat.js && echo "GameCombat.js OK"
node -c js/core/GameEngine.Weapons.js && echo "Weapons.js OK"
node -c js/core/AudioManager.js && echo "AudioManager.js OK"
echo "All syntax checks passed!"
git add -A
git status --short
git commit -m "R165-R168: P0+P1 fixes — 21 bugs across 11 files

R165-P0: LaserBeam instanceof guard, FxManager null guards, Abyss shop cost leak, abyss combo one-shot flag, ToastSystem cleanup, speed zero-fallback, spawnCausalityText null guard, dead weapon code removal, rawBaseCd restoration
R166-P0: Mahjong pengpenghu formula fix
R167-P1: AudioManager oscillator tracking, weapon CD restore
R168-P0: _checkAchievementInflight undefined fix, add _checkAchievement method, add _flushAchievementsToMeta, add missing _showVictory/_gameOver methods, achievement flags reset in restart(), _announceWave null guard, FxManager pool trim"
