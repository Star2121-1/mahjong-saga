# Epoch 33 — 圣物随机词条系统

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/entities/Player.js | +100 行 — 词条滚动/应用/持久化 |
| js/core/SaveManager.js | +1 行 — 修复敌人类型ID匹配 |

## 新增

### 圣物词条 (Player)
- 圣物升至Lv3和Lv5时, 20%概率获得随机词条
- 每个圣物有专属词条池(2种):
  - 锐利锋芒: 穿透(+5atk) / 溅射(+15%爆炸)
  - 黄金右手指: 吸血(+10%) / 反伤(+10%)
  - 荆棘反伤甲: 坚韧(+30HP) / 暴击(+10%)
  - 疾风步: 闪避(+10%) / 极速(+15%移速)
  - 吮血指环: 暴击(+10%) / 强击(+5atk)
  - 爆破核心: 广域(+30吸附) / 强化(+3atk)
  - 冰霜核心: 长效(+0.5s) / 极寒(+10%冰冻)
  - 引力核心: 慧根(+15%XP) / 巨吸(+50吸附)
  - 兵器增幅: 迅捷(-10%CD) / 强化(+5atk)
- 词条去重, 存储在 player._relicAffixes
- restore时通过 _applyRelicAffixes 重新应用
- snapshot包含 _relicAffixes

### 修复
- SaveManager 敌人类型ID修正: basic/fast/ranged → Normal/Tanker/Stalker/Shaman/Boss_Lord
