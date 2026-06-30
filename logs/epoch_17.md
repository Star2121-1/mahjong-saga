# Epoch 17 — 元货币消费扩展/战局历史面板

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/core/SaveManager.js | +85 行 — 天赋重置/额外武器槽购买 |
| js/page/main_hub.js | +24 行 — refreshHistoryPanel |
| s2_main_hub.html | +7 行 — 历史记录导航+面板 |
| css/main_hub.css | +15 行 — history-entry 样式 |

## 新增

### 元货币消费扩展
- `token_reset_talents` (20 代币): 重置所有天赋，返还魔王核心
- `token_extra_weapon_slot` (100 代币): 永久+1武器槽，上限3个

### 战局历史面板
- 大本营 Tab 8 "📜 历史记录"
- 显示最近20局：日期、结果、英雄、关卡、击杀、用时、深渊层数、代币奖励
- 通关绿色/失败红色区分
