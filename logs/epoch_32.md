# Epoch 32 — 牺牲选项/波次间事件/图鉴系统

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/core/RewardManager.js | +55 行 — 牺牲选项(4th card) + 5种牺牲类型 |
| js/core/GameEngine.js | +100 行 — 波次间事件系统(8事件) + 临时增益/护盾 |
| js/core/SaveManager.js | +35 行 — compendium追踪 + getCompendiumProgress |
| js/entities/Player.js | +15 行 — _baseMaxHp/_tempAtkBoost/temp buff支持 |
| js/page/main_hub.js | +10 行 — 图鉴进度显示在stats面板 |
| css/gameplay.css | +6 行 — .sacrifice-banner样式 |

## 新增

### 牺牲选项 (RewardManager)
- 升级时第4张卡："献祭一个圣物"换取强力回报
- 5种随机牺牲类型：
  - 🔥 献祭之祭坛: +3元代币
  - 💎 贪婪契约: +50%当前金币
  - ⚡ 血怒仪式: +50%攻击临时30s
  - 🛡 铁壁祷言: +100最大HP临时30s
  - 🪙 双倍诅咒: 下波金币翻倍
- 红色危险风格卡片，带RISKY TRADE横幅

### 波次间事件 (GameEngine)
- 60%概率在波次间触发随机事件
- 8种事件，加权随机：
  - 🪙 金币雨(40): 立即+20金币
  - 🧘 冥想泉源(25): +30%HP，下波怪物-20%攻击
  - 👹 怪物潮(20): +5精英怪，掉落翻倍
  - ⏳ 时光缓流(20): 下波怪物-30%移速
  - ⚔ 狂战士祝福(15): 下波击杀+10怒气
  - ✨ 点金术(15): 下波金币×3
  - 👊 铁拳(20): 下波暴击+25%
  - 🛡 信仰护盾(15): 50伤害护盾15s
- 事件面板：icon + 描述 + 接受按钮

### 临时增益系统 (Player + GameEngine)
- _tempAtkBoost, _tempHpBonus, _tempShield, _doubleCoinNextWave
- _tempBuffEnd过期自动清除
- _baseMaxHp保存永久maxHp用于恢复
- 所有临时增益跨面板传递并正确应用

### 图鉴系统 (SaveManager)
- compendium: { relics[], weapons[], enemies[], mutations[] }
- recordCompendiumEntry: 自动去重写入
- getCompendiumProgress: 返回各分类进度+百分比
- 追踪点：圣物选择/武器解锁/敌人击杀/突变触发
- Hub stats面板显示总进度和各分类

### 修复
- _tempCritBonus 应用于点击暴击判定
- _tempGoldMult 应用于金币收集
- _tempEnemyAtkDebuff/_tempEnemySpeedDebuff 应用于新生成敌人
- _tempShield 在玩家受伤时吸收伤害
- _tempBerserkBonus 在击杀时追加+10怒气
