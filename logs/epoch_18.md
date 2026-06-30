# Epoch 18 — 挑战进度追踪/每周超级挑战

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/core/SaveManager.js | +62 行 — 每周超级挑战池/生成/检测 |
| js/page/main_hub.js | +48/-4 行 — 进度百分比估算 + 周常面板 |
| js/core/GameEngine.js | +13 行 — 周常挑战结算 |

## 新增

### 挑战进度追踪
- `checkChallengeCompletion` 返回 `progress` 数组，每个挑战显示完成百分比
- 根据挑战ID前缀智能估算进度（kill→kills, survive→elapsed, overdrive→overdriveCount等）

### 每周超级挑战
- 6 种周常池：屠龙(500杀)/坚守(30分钟)/深渊领主(20层)/怒意沸腾(20OD)/幻影千重(100闪避)/天崩地裂(200暴击)
- 每周随机3个，奖励150-300代币 + 8-15核心
- 7天自动重置
