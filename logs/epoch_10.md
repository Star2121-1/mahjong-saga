# Epoch 10 — 委托 Combat/Systems 集成

## 变更摘要

| 文件 | 变更 |
|------|------|
| `js/core/GameEngine.js` | +65/-37 行 — 飘字/Overdrive/突变/枯萎/共鸣委托 |
| `ENGINE_SPEC.md` | +6/-2 行 — 模块委托状态更新 |

## 委托新增

| 委托项 | 目标模块 | 状态 |
|--------|----------|------|
| 飘字 (`_spawnFloatText`) | `CombatSystem` | ✅ |
| 治疗飘字 (`_spawnHealText`) | `CombatSystem` | ✅ |
| Overdrive (`_triggerOverdrive`) | `Systems` | ✅ |
| 突变面板 (`_showMutatorPanel`) | `Systems` | ✅ |
| 突变应用 (`_applyMutator`) | `Systems` | ✅ |
| 枯萎突变 (`_activeMutator === 'wither'`) | `Systems` | ✅ |
| 套装共鸣焰痕 (`setResonanceSpeed`) | `Systems` | ✅ |
| 套装共鸣永冻 (`setResonanceIce`) | `Systems` | ⏳ 待集成 |

## 委托进度

| 模块 | 委托进度 |
|------|----------|
| SpawnSystem | 100% (刷怪 + 重置) |
| CombatSystem | 67% (飘字 ✅, 掉落/爆炸 ⏳) |
| Systems | 80% (Overdrive ✅, 突变 ✅, 共鸣 ⏳) |

## 验证

- 语法检查: OK (brace:0, paren:0)
- Doc-Sync: ENGINE_SPEC.md §4.2 已更新
