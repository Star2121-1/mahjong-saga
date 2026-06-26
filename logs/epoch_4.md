# Epoch 4 — 程序化关卡与深渊扩展

## 变更摘要

| 文件 | 变更 |
|------|------|
| `js/config/LevelConfig.js` | +94 行 — 4 个预设关卡 + 程序化生成器 + 难度权重 + 深渊缩放 |
| `js/core/GameEngine.js` | +31 行 — 程序化关卡应用、敌人类型权重、spawnInterval 衰减 |
| `js/page/main_hub.js` | +25 行 — 出征面板显示深渊层数、难度徽章、程序化关卡详情 |
| `css/main_hub.css` | +4 行 — 难度徽章圆点样式 |

## 新增系统

### 程序化关卡生成器
- `proceduralLevelGenerator.generate(abyssLevel)` 基于深渊层数动态生成关卡
- HP 倍率: 1.15^层数, ATK 倍率: 1.12^层数
- 刷怪数量: 1.10^层数, 间隔递减: 0.05/层
- 额外波次: +1/层

### 敌人类型权重
- 每个关卡定义 `enemyTypes: { Normal, Tanker, Stalker, Shaman }`
- 程序化关卡随深渊层数增加 Shaman/Shocker 比例
- 替代硬编码的 25/30/25 比例

### 难度分级
- `easy` (绿色) → `medium` (橙色) → `hard` (红色) → `extreme` (紫色)
- 出征面板卡片显示难度徽章

## 验证

- 语法检查: 5/5 JS 文件 OK
- 括号平衡: 全部 0
