# Epoch 24 — 每日倒计时/赛季奖励/成就修正

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/core/SaveManager.js | +40 行 — 倒计时/赛季奖励领取 |
| js/page/main_hub.js | +55 行 — 倒计时UI/赛季奖励/成就修正 |

## 新增

### 每日挑战倒计时
- `getDailyChallengeCountdown()` — 返回距下次旋转剩余毫秒
- `formatCountdown(ms)` — 格式化 HH:MM:SS
- stats 面板每秒更新显示

### 赛季奖励领取
- `claimSeasonReward()` — 领取当前赛季奖励
- 3 档奖励表: S1(100代币+5核心) / S2(200+10) / S3(400+20)
- 已领取标记防重复

### 成就进度修正
- 通关类成就 (first_victory/victory_10/victory_50) 使用 runStats.wins 而非 totalRuns
- 更准确反映玩家真实通关次数

### Bug 修复
- 修复 stats/history panel 切换时的 if 嵌套错误
