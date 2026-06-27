# Epoch 22 — 周常进度条/通胀防护/赛季触发

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/core/SaveManager.js | +65 行 — 通胀防护/赛季触发 |
| js/page/main_hub.js | +35/-27 行 — 周常进度条/去重/赛季触发 |
| css/main_hub.css | +5 行 — 进度条样式 |
| s2_main_hub.html | +1 行 — 赛季指示器 |

## 新增

### 通胀防护
- `getTalentCostWithInflation()` — 按累计代币花费计算实际成本
- `recordInflation()` — 每次 spendMetaTokens 记录花费
- `resetInflationCounter()` — 赛季重置计数器
- 天赋升级时自动应用通胀系数 (1x ~ 2x)

### 赛季触发
- `checkSeasonTrigger()` — 5胜或深渊10层自动激活赛季1
- `getSeasonReward()` — 赛季奖励表 (3档)

### 周常进度条
- 每周挑战卡片显示实时进度百分比
- CSS 进度条动画

### 清理
- 修复重复的 onPrestigeToggle 绑定 (之前 Epoch 21 + Epoch 16 各加了一次)
