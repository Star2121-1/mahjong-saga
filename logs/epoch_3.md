# Epoch 3 — 成就系统扩展与终局挑战

## 变更摘要

| 文件 | 变更 |
|------|------|
| `js/config/AchievementConfig.js` | +67 行 — 25 成就定义（战斗/通关/深渊/特殊四类），inflight+endgame 检测 |
| `js/core/SaveManager.js` | +25 行 — 6 新计数器字段 + 迁移 + resetAllData |
| `js/core/GameEngine.js` | +75 行 — 成就计数器初始化、inflight 检测、boss 击杀追踪、settleRun 全覆盖、overdriveCount 泄漏修复 |
| `js/page/main_hub.js` | +35 行 — 成就进度条计算（12 分支）、进度条 CSS 渲染 |
| `js/entities/Player.js` | +5 行 — 闪避计数追踪 |
| `css/main_hub.css` | +11 行 — 成就进度条 + 进度文本样式 |

## 新增成就（25 个）

| 类别 | 数量 | 示例 |
|------|------|------|
| 战斗 | 7 | 初尝血腥→万骨枯、暴击大师、闪避之王、领主猎手、灭世者 |
| 通关 | 4 | 凯旋初征→百战不殆→传奇雀士、毫发无伤→完美无瑕 |
| 深渊 | 3 | 深渊行者→无尽深渊→虚空之主 |
| 特殊 | 11 | 初次暴走→永动机、腰缠万贯→富可敌国、极速通关、群雄汇聚、套装共鸣 |

## 架构修复

- 修复 `_overdriveCount` 跨局泄漏（`_startNewRun` 中重置）
- 修复 `_recordedFlawless` 一次性门限（移除，改用 `meta.flawlessRuns` 累积）
- 修复 `flawless` 双重计数（统一为 `_playerHitCountThisRun` 路径）
- 补全 `dodge_king` 计数器（Player.takeDamage 中递增）
- 补全 `_settleRun` 中所有 25 个成就的 `_checkAchievement` 调用
- 补全 `refreshAchievements` 进度条计算（12 个成就分支）
- `maxGoldThisRun` 持久化到 meta

## 验证

- 语法检查: 5/5 JS 文件 OK
- CSS 括号: 171/171 平衡
