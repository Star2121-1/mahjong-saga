# Epoch 5 — 架构解耦：GameEngine 拆分

## 变更摘要

| 文件 | 变更 |
|------|------|
| `js/core/GameSpawner.js` | +316 行 — 敌人生成、波次管理、Boss Lord、敌人投射物 |
| `js/core/GameCombat.js` | +221 行 — 掉落、飘字、爆炸、屏幕震动、成就文本 |
| `js/core/GameSystems.js` | +297 行 — Overdrive、突变、套装共鸣、震动、 shaking |
| `s3_gameplay.html` | +3 行 — 引入新模块 |

## 架构变更

GameEngine.js (2900 行) 拆分为 4 个职责清晰的模块：

| 模块 | 行数 | 职责 |
|------|------|------|
| `GameEngine.js` | ~2900 (待缩减) | 主循环调度、状态机、生命周期 |
| `GameSpawner.js` | 316 | 刷怪逻辑、敌人类型权重、波次/难度、Boss Lord |
| `GameCombat.js` | 221 | 伤害飘字、掉落、爆炸特效、屏幕震动 |
| `GameSystems.js` | 297 | Overdrive、突变面板、套装共鸣、雀魂护盾 |

## Grand Senate 就绪状态

- 3 个新模块语法检查全部通过 (0 brace/paren diff)
- 模块间通过 `window.SpawnSystem`, `window.CombatSystem`, `window.Systems` 暴露接口
- GameEngine.js 尚未修改引用 — 下一 Epoch 完成集成

## 验证

- 语法检查: 3/3 新文件 OK
- 括号平衡: 全部 0
