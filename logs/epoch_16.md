# Epoch 16 — 程序化种子系统/声望转生

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/config/LevelConfig.js | +74 行 — Mulberry32 PRNG + proceduralSeedGenerator |
| js/core/SaveManager.js | +56 行 — getPrestigeInfo/doPrestige/applyPrestigeBonus |
| js/entities/Player.js | +4 行 — 转生加成应用 |
| js/page/main_hub.js | +22 行 — 声望面板+转生按钮 |

## 新增系统

### 程序化种子系统
- Mulberry32 PRNG 实现
- 种子影响：HP浮动±5%、敌人类型偏置、波次数量扰动
- 相同种子产生可复现的关卡布局
- 种子哈希显示在关卡名称中

### 声望转生
- 声望点 = floor(总通关次数^0.6)
- 转生消耗潜力点，永久提升 ATK/HP
- 每点: ATK+0.5, HP+2
- 面板显示等级/点数/加成/转生按钮
