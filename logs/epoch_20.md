# Epoch 20 — 每日轮换/赛季激活/声望系统

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/core/SaveManager.js | +67 行 — 声望转生/每日轮换/赛季激活 |

## 新增

### 声望转生 (Prestige)
- 声望点 = floor(总通关次数^0.6)
- 转生消耗潜力点，永久加成 ATK+0.5/点 HP+2/点
- 面板: getPrestigeInfo() / doPrestige() / applyPrestigeBonus()

### 每日挑战轮换
- 每24小时从主池随机选3个挑战
- 种子基于日期保证一致性

### 赛季激活
- getSeasonStatus() — 赛季信息(currentSeason, daysElapsed)
- activateSeason() — 首次激活赛季1
- 骨架预留赛季事件扩展
