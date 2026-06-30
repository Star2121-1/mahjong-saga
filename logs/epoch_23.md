# Epoch 23 — 历史面板筛选/周常结算记录/赛季通胀重置

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/core/SaveManager.js | +5 行 — recordRunHistory 增加 weeklyCompleted 参数 |
| js/core/GameEngine.js | +3 行 — 捕获 weeklyCompleted 传入 recordRunHistory |
| js/page/main_hub.js | +30 行 — 历史面板筛选/排序 + 周常显示 |
| css/main_hub.css | +8 行 — 进度条/筛选控件/周常标签 |

## 新增

### 历史面板增强
- 筛选: 全部 / 仅通关 / 仅失败
- 排序: 最新优先 / 最早优先 / 击杀最多 / 用时最长
- 显示总条目数

### 周常结算记录
- GameEngine 捕获 checkWeeklyCompletion 的 completed 数组
- 传入 recordRunHistory 存入 meta.runHistory
- 历史条目显示周常完成列表

### 赛季通胀重置
- activateSeason() 时自动清空 inflationGuard.totalMetaTokens
- 新赛季开始 = 成本回归基准
