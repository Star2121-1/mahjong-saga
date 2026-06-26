# Epoch 6 — 文档同步与架构解耦推进

## 变更摘要

| 文件 | 变更 |
|------|------|
| `ENGINE_SPEC.md` | +33 行 — 模块划分表格 (16 个模块)、数据流准则 |
| `Mahjong_Saga_GDD_v4.1.md` | +88 行 — 全新创建，完整 GDD 文档 |
| `README.md` | +14 行 — 在线部署说明 + 仓库链接 |
| `js/core/GameEngine.js` | +7 行 — Epoch 5 模块代理代理 |

## 文档变更

- `ENGINE_SPEC.md` §4.1: 完整模块划分表格，16 个源文件职责说明
- `Mahjong_Saga_GDD_v4.1.md`: 全新 GDD v4.1，包含天赋/成就/程序化关卡完整数据
- `README.md`: 在线部署指南 + GitHub 仓库链接

## 架构进展

- Epoch 5 创建的 3 个新模块 (`GameSpawner.js`, `GameCombat.js`, `GameSystems.js`) 已通过 Doc-Sync Lock 验证
- `GameEngine.js` 添加了模块代理入口，下一 Epoch 开始实际委托迁移

## 验证

- 语法检查: 全部通过
- Doc-Sync Lock: README.md ✅, ENGINE_SPEC.md ✅, Mahjong_Saga_GDD_v4.1.md ✅
