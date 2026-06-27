# Epoch 26 — 战场响应式/面板可读性

## 变更摘要

| 文件 | 变更 |
|------|------|
| css/gameplay.css | +70 行 — 3档响应式断点 |
| css/main_hub.css | +48/-47 行 — 面板间距/字体全面优化 |

## 新增

### 战场响应式 (gameplay.css)
- ≤768px: 角色 48→40px, 敌人 36→30px, HP条缩小
- ≤600px: 角色 40→32px, 敌人 30→24px, 飘字缩小
- ≤480px: 角色 32→28px, 敌人 24→20px, 顶部栏 36→24px
- 超宽屏: 战场居中 max-width 1600px

### Hub 面板可读性 (main_hub.css)
- 英雄节点 padding 6×10→8×12, 字体 12→13px
- 天赋树 padding 8×12→10×14, 字体 12→13px
- 装备卡片 72→78px, 字体 9→10px
- 成就图标 24→26px, 名称 13→14px
- 变异卡片 padding/font/icon 全面加大
- 商城 perk-row 间距加大, 字体 12→13px
- 精英模式 toggle 加大
