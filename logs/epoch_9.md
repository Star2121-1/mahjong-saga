# Epoch 9 — _loop 刷怪逻辑委托

## 变更摘要

| 文件 | 变更 |
|------|------|
| `js/core/GameEngine.js` | +28/-22 行 — _loop 中刷怪逻辑委托给 SpawnSystem.update() |
| `ENGINE_SPEC.md` | +29 行 — 模块划分表格更新 + 委托进度 |

## 架构变更

- `_loop` 中 `if (!this._pendingReward)` 块内：
  - 新增 `if (window.SpawnSystem) { SpawnSystem.update(dt, this); }`
  - 旧逻辑放入 `else` 分支作为向后兼容
  - 委托包含: 难度衰减、刷怪定时器、Boss Lord 波次、Boss 生成
- `SpawnSystem.update()` 接收 engine 实例，直接操作 `engine.enemies`, `engine._worldLayer` 等

## 委托进度

| 委托项 | 状态 |
|--------|------|
| `_startNewRun` → `SpawnSystem.reset()` | ✅ Epoch 7 |
| `_loop` 刷怪 → `SpawnSystem.update()` | ✅ Epoch 9 |
| 飘字/掉落 → `CombatSystem` | ⏳ 待集成 |
| Overdrive/突变 → `Systems` | ⏳ 待集成 |

## 验证

- 语法检查: OK (brace:0, paren:0)
- Doc-Sync: ENGINE_SPEC.md §4.1 已更新
