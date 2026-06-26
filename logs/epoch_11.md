# Epoch 11 — 委托掉落/爆炸/震动/因果文本

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/core/GameEngine.js | +24 行 — 6 个方法添加委托代理 |
| ENGINE_SPEC.md | +2/-2 行 — 委托进度更新为 100% |

## 新增委托

| 方法 | 目标模块 |
|------|----------|
| _spawnCoinsAt | CombatSystem.spawnCoinsAt |
| _spawnExpGemsAt | CombatSystem.spawnExpGemsAt |
| _spawnExplosion | CombatSystem.spawnExplosion |
| triggerShake | Systems.triggerShake |
| _spawnCausalityText | CombatSystem.spawnCausalityText |
| _spawnAchievementText | CombatSystem.spawnAchievementText |

## 委托总进度

| 模块 | 进度 |
|------|------|
| SpawnSystem | 100% |
| CombatSystem | 100% |
| Systems | 100% |

## 验证

- 语法检查: OK (brace:0, paren:0)
- Doc-Sync: ENGINE_SPEC.md 已更新
