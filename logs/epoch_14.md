# Epoch 14 — 元进度经济扩展

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/core/SaveManager.js | +150/-10 行 — 挑战系统、运行统计、元代币商城、指数天赋成本 |
| js/core/GameEngine.js | +30/-2 行 — 关卡亲和减伤、复活检查、挑战完成检查、运行统计记录 |
| js/entities/Player.js | +10/-0 行 — shouldRevive() 复活方法、mapAffinityLevel 应用 |
| js/entities/Enemy.js | +15/-8 行 — _applyMapAffinityDmg() 辅助方法，所有伤害来源应用减伤 |
| js/page/main_hub.js | +130/-5 行 — 战绩统计面板、挑战面板、元货币商城 UI、checkChallengeCompletion |
| s2_main_hub.html | +8/-0 行 — 战绩统计导航项 + 面板 HTML |
| css/main_hub.css | +60/-0 行 — stats/title/challenges/perks 样式 |
| Mahjong_Saga_GDD_v4.1.md | +25/-2 行 — 挑战系统/元代币商城/战绩统计文档 |
| ENGINE_SPEC.md | +15/-2 行 — Epoch 14 元进度经济章节 |
| mahjong_saga_evolution.md | +1/-0 行 — 追加 Epoch 14 条目 |

## 新增系统

### 挑战系统
- 15 种挑战池（击杀/Overdrive/存活/金币/无伤/深渊等）
- 每 6 小时轮换 3 个活跃挑战
- 完成后奖励额外 metaTokens 或 bossCores
- 结算时自动检测完成并发放奖励

### 元货币消费
- `metaTokens` 首次成为可消费货币
- 复活机会 (50 代币): 局内 1 次复活 (30% HP + 3s 无敌)
- 开局圣物 (30 代币): 开局自带 1 个随机圣物
- 关卡亲和 (20/40/60 代币): 关卡伤害减免 10%/20%/30%

### 天赋成本指数曲线
- 从线性 `(level+1)` 改为 `base * 1.3^level`
- 早期更便宜，后期更陡，改善中期 progression 节奏

### 战绩统计面板
- 大本营新增第 7 个 Tab "📊 战绩统计"
- 显示：总场次、胜率、平均用时、最快通关、深渊最深、无伤率
- Overdrive/闪避/暴击/Boss 击杀/波次/金币总数
- 挑战面板 + 元货币商城面板

## 架构进展

- SaveManager.js: ~470 → ~620 行 (+150)
- main_hub.js: ~770 → ~900 行 (+130)
- GameEngine.js: ~2785 → ~2815 行 (+30)
- Enemy.js: ~200 → ~215 行 (+15)
- Player.js: ~460 → ~470 行 (+10)
- 新增 CSS: +60 行
