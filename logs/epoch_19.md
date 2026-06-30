# Epoch 19 — 死亡记录历史/成就进度/赛季骨架

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/core/GameEngine.js | +12 行 — _gameOver 也调用 recordRunHistory |
| js/core/SaveManager.js | +34 行 — 赛季骨架/个人最佳追踪 |
| js/page/main_hub.js | +11 行 — 成就进度显示 |

## 新增

### 死亡历史
- `_gameOver` 现在也调用 `recordRunHistory(heroId, levelId, kills, elapsed, won=false, ...)`
- 历史面板同时显示通关和失败记录

### 成就进度
- 战绩统计面板显示 "成就解锁 X / Y"
- 基于 `meta.achievements` 计数

### 赛季事件骨架
- `getSeasonInfo()` — 赛季元数据 (currentSeason, seasonStart, bestRuns)
- `recordPersonalBest(levelId, metric, value)` — 记录各关卡个人最佳
- `getPersonalBests(levelId?)` — 查询个人最佳
