# Epoch 2 — 天赋扩展与局外成长深化

## 变更摘要

| 文件 | 变更 |
|------|------|
| `js/core/SaveManager.js` | +49 行 — 6 新天赋定义、迁移逻辑、升级成本曲线、resetAllData 补全 |
| `js/page/main_hub.js` | +13 行 — TalentTreeManager 扩展 6 新天赋定义 + 成本函数 |
| `js/entities/Player.js` | +12 行 — applyTechTree 清理死代码、takeDamage 加杠牌硬气减伤、reset 后应用天赋 |
| `js/core/GameEngine.js` | +35 行 — 开局双兵天赋、核心共鸣Boss掉落、雀魂护盾波次触发 |

## 新增天赋

| 天赋 ID | 名称 | 效果 | 成本 | 满级 |
|---------|------|------|------|------|
| `listening_intuition` | 听牌直觉 | 暴击率 +2%/级 | 1/2/3/4/5 核心 | 5 |
| `gangpai_hardiness` | 杠牌硬气 | 受到伤害 -3%/级 | 1/2/3/4/5 核心 | 5 |
| `摸牌_speed` | 摸牌速度 | 武器CD -5%/级 | 1/2/3/4/5 核心 | 5 |
| `starting_weapons` | 开局双兵 | 额外初始武器槽 | 5 核心 | 1 |
| `core_resonance` | 核心共鸣 | Boss掉落核心 +10%/级 | 4/8/12/16/20 核心 | 5 |
| `雀魂_shield` | 雀魂护盾 | 每10波触发无敌护盾 | 1/2/3/4/5 核心 | 3 |

## 架构修复

- 修复 `Player.reset()` 中天赋加成被 `critRate = 0` 覆盖的问题
- 清理 `applyTechTree()` 中永不执行的 `tech.talents` 死代码块
- 补全 `resetAllData()` 中缺失的 Epoch 2 天赋键
- `雀魂护盾` 实现：每10波触发，基础5秒 + 每级2秒无敌

## 验证

- 语法检查: 4/4 JS 文件 OK
- 零编译错误
