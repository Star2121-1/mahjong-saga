# Click Roguelike 技术文档

> 本文档详尽描述 Click Roguelike 的架构、系统、数据流与实现细节。面向需要深入理解或维护项目的开发者。

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈与运行方式](#2-技术栈与运行方式)
3. [页面流转与生命周期](#3-页面流转与生命周期)
4. [文件结构与脚本加载顺序](#4-文件结构与脚本加载顺序)
5. [核心战斗规则](#5-核心战斗规则)
6. [武器系统](#6-武器系统)
7. [敌人 AI](#7-敌人-ai)
8. [Boss Lord](#8-boss-lord)
9. [战场动态突变](#9-战场动态突变)
10. [时钟冻结](#10-时钟冻结)
11. [圣物系统](#11-圣物系统)
12. [大本营天赋树](#12-大本营天赋树)
13. [英雄系统](#13-英雄系统)
14. [科技树](#14-科技树)
15. [关卡系统](#15-关卡系统)
16. [存档系统](#16-存档系统)
17. [UI 层级与相机](#17-ui-层级与相机)
18. [输入系统](#18-输入系统)
19. [装备与锻造](#19-装备与锻造)
20. [时空裂隙与无尽深渊](#20-时空裂隙与无尽深渊)
21. [V3.0 Overdrive](#21-v30-overdrive)
22. [V3.0 套装共鸣](#22-v30-套装共鸣)
23. [V3.0 变异保险库](#23-v30-变异保险库)
24. [V3.0 FCT 与屏幕震动](#24-v30-fct-与屏幕震动)
25. [主题色板与动画](#25-主题色板与动画)
26. [V3.1 暂停系统](#26-v31-暂停系统)
27. [V3.1 开场引导](#27-v31-开场引导)
28. [V3.1 成就系统](#28-v31-成就系统)
29. [V3.1 装备掉落](#29-v31-装备掉落)
30. [V3.1 音效骨架](#30-v31-音效骨架)
31. [V3.1 响应式缩放](#31-v31-响应式缩放)
32. [V3.1 HUD 优化与卡牌模糊修复](#32-v31-hud-优化与卡牌模糊修复)

---

## 1. 项目概述

Click Roguelike 是一款浏览器端点击生存 Roguelike。玩家单局内通过点击攻击、走位、拾取圣物与武器构筑 build，抵御多波敌人并击败最终 Boss Lord；局外通过魔王核心解锁英雄、升级天赋、锻造装备、选择变异，逐步挑战更深的无尽深渊。

所有图形均为 CSS 生成，无任何外部图片资源。

---

## 2. 技术栈与运行方式

- **原生 HTML5 + CSS3 + ES6 (Class)**：无框架、无构建工具。
- **渲染**：纯 DOM 绝对定位 + CSS transform 相机偏移，不使用 Canvas。圆形、渐变、阴影全部由 CSS 生成。
- **持久化**：`localStorage` 保存元进度与活跃对局。
- **模块方式**：所有脚本通过 `<script>` 标签按严格顺序加载至全局 `window` 命名空间，不存在 `import`/`export`。
- **关键全局单例**：
  - `window.gameEngine`：核心战斗引擎。
  - `window.saveManager`：存档与元进度管理。
  - `window.rewardManager`：奖励/圣物/武器面板。
  - `window.heroRegistry`：英雄注册表。
  - `window.equipmentRegistry`：装备原型与实例注册表。
  - `window.fxManager`：FCT 对象池（V3.0）。

### 2.1 如何运行

在项目根目录启动静态服务器：

```bash
python -m http.server 8765
```

浏览器访问 `http://localhost:8765/s1_save_select.html`。

---

## 3. 页面流转与生命周期

```
s1_save_select.html
  │ 点击“开启新征程”或“继续游戏”
  ▼
s2_main_hub.html
  │ 英雄酒馆 / 魔王天赋 / 皇家锻造 / 时空出征 / 变异保险库
  │ 点击“轰然出征”
  ▼
s3_gameplay.html
  │ GameEngine.init()
  │   -> 读取 active_run.json
  │   -> new Player() -> Player.reset(heroId)
  │   -> 聚合天赋 / 科技树 / 装备属性
  │   -> _startNewRun(heroId, levelId)
  │       -> 重置武器 -> 初始化默认武器
  │       -> 渲染武器栏
  │       -> 波次公告 -> _beginLoop()
  │           -> requestAnimationFrame(_loop)
  │               输入 -> 移动 -> 刷怪 -> 敌人 AI -> 弹道更新
  │               -> 碰撞 -> 波次检测 -> 相机 -> 同步 UI
  │           暂停点：波次宝箱 / 升级奖励 / 突变面板 / 领主登场
  │           终局：胜利 -> _settleRun() / 失败 -> _gameOver()
```

---

## 4. 文件结构与脚本加载顺序

### 4.1 目录树

```
Click Roguelike/
├── s1_save_select.html      # 存档选择页
├── s2_main_hub.html         # 大本营页
├── s3_gameplay.html         # 战斗页
├── style.css                # 单页版本全局样式
├── README.md                # 项目简介
├── PROJECT_DOCS.md          # 本文档
├── css/
│   ├── common.css           # reset / @keyframes / 工具类
│   ├── save_select.css
│   ├── main_hub.css         # 大本营 / 锻造 / 变异保险库
│   └── gameplay.css         # 战斗 / HUD / FCT / Overdrive / 震动
└── js/
    ├── main.js              # 单页版本入口
    ├── config/
    │   ├── HeroConfig.js    # 英雄静态数据
    │   └── LevelConfig.js   # 关卡静态数据
    ├── entities/
    │   ├── Player.js        # 玩家实体
    │   ├── Enemy.js         # 敌人实体
    │   ├── ExpGem.js        # 经验宝石
    │   └── Weapon.js        # 武器与弹道
    ├── core/
    │   ├── SaveManager.js   # 存档与元数据
    │   ├── RewardManager.js # 奖励面板
    │   ├── GameEngine.js    # 核心引擎
    │   └── FxManager.js     # FCT 对象池
    └── page/
        ├── save_select.js   # 存档页控制器
        └── main_hub.js      # 大本营控制器
```

### 4.2 脚本加载顺序

**s3_gameplay.html**：

```
SaveManager.js
HeroConfig.js
LevelConfig.js
Player.js
Enemy.js
ExpGem.js
Weapon.js
RewardManager.js
FxManager.js
GameEngine.js
```

**s2_main_hub.html**：

```
SaveManager.js
HeroConfig.js
LevelConfig.js
EquipmentRegistry.js
main_hub.js
```

---

## 5. 核心战斗规则

### 5.1 闪避判定

`Player.takeDamage(dmg, attacker)` 入口：

```javascript
if (this.dodgeRate > 0 && Math.random() < this.dodgeRate) {
    this._dodgeSignal = true;
    // Knight 触发 _triggerKnightDodgeSlam()
    return false;
}
```

闪避完全免疫伤害，不触发无敌帧、反伤、受击计数。

### 5.2 冰冻联动受击

敌人 `frozen === true` 时：

- `actualDmg = floor(dmg * 1.25)`
- `frozenTimer -= 0.25`（每帧首击去重，`_freezeHitDecayed`）

**Assassin 被动**：目标处于冰冻或击退状态时，伤害再 ×1.5（与冰冻易伤叠加为 1.875x）。

### 5.3 溅射非嵌套

`_onClick()` 中触发 `_spawnExplosion()`，通过 `excludeId` 排除主目标，爆炸内部标记伤害源为 `'splash'`，`Enemy.takeDamage` 不会再次解析为溅射源，防止次级溅射。

### 5.4 升级不跳波次

经验达到阈值后设置 `_levelUpPending = true`，下一帧 `_loop` 暂停游戏并弹出升级面板。恢复后 `_waveCount` 不变。

### 5.5 金币与经验吸附

金币创建后持续向玩家飞行，速度随距离衰减；经验宝石（V3.0 后）行为与金币一致：全图吸附，速度固定 400px/s，无距离阈值。

### 5.6 跨波次资源继承

`_activeCoins[]` 与 `_expGems[]` 中的存活资源在波次切换时不被清除。

---

## 6. 武器系统

### 6.1 类继承

```
window.Weapon (基类)
  ├── TrackingBlade   追踪飞刃
  ├── OrbitShield     环形护体
  ├── ShotgunBurst    扇形散射
  ├── GroundSlammer   区域震荡
  ├── LaserBeam       持续线杀
  └── NovaPulse       全屏脉冲
```

`window.Projectile` 为独立弹道实体。

### 6.2 武器升级

- `level++`
- `atkFactor += 0.15`
- `cd = max(cdFloor, cd * 0.9)`

### 6.3 碰撞检测

所有弹道与敌人使用圆形碰撞：

```javascript
if (dx*dx + dy*dy < (enemy.radius + projectile.radius)^2) 命中
```

穿透弹使用 `hitEnemies` Set 防止对同一目标多次判伤。

### 6.4 6 种神兵特性

| 武器 | 冷却 | atkFactor | 行为 |
|------|------|-----------|------|
| TrackingBlade | 0.8s | 1.0 | 追踪最近敌人，穿透 +3 |
| OrbitShield | 0.3s | 0.5 | 3 枚光星 120° 公转 |
| ShotgunBurst | 0.4s | 0.6 | 5 发散弹，固定角度偏移 |
| GroundSlammer | 4.0s | 1.5 | 震波圈 + 击退 |
| LaserBeam | 0.1s | 1.2 | 300px 射线，点到线段距离判定 |
| NovaPulse | 7.0s | 5.0 | 全屏扩张脉冲 |

### 6.5 武器槽位

- 默认上限 6。
- Mage 英雄上限 7。
- 满槽位获得新武器时弹出置换面板。

---

## 7. 敌人 AI

### 7.1 公共属性

```javascript
基础 HP  = floor(20 * 1.2^(level-1))
基础 ATK = floor(5 * 1.1^(level-1))
基础 SPD = 40 + (level-1) * 3
```

敌人等级 `level = floor(elapsed / 15) + 1`。

### 7.2 Tanker（盾甲）

- 概率 25%
- `speed *= 0.5`，`maxHp *= 2`，`radius = 26`
- 正面 180° 扇形受到的伤害 ×0.5

### 7.3 Stalker（影袭）

- 概率 30%
- 三段状态机：idle -> charging -> fatigue -> idle
- charging 时速度 ×2.5、透明度 0.4、伤害 ×1.5

### 7.4 Shaman（死灵萨满）

- 概率 25%
- 维护与玩家距离 [200, 250]px
- 每 5s 放置图腾，范围内敌人 speed ×1.3、atk ×1.2

---

## 8. Boss Lord

### 8.1 降临条件

`_waveCount >= maxWaves - 1` 时进入 Boss Lord 波次，地图中央 35% 高度处生成。

### 8.2 属性

```javascript
type = 'Boss_Lord'
radius = 70
maxHp = floor(200 * 1.2^(level-1))
ATK  = floor(30 * 1.1^(level-1))
speed = 20
```

### 8.3 三阶段

- **Phase 1（HP ≥ 70%）**：每 1.8s 发射 12 枚均分弹幕。
- **Phase 2（30% ≤ HP < 70%）**：每 3s 生成红色预警圈，0.8s 后瞬移砸地，范围内玩家受到 2.5x atk 伤害。
- **Phase 3（HP < 30%）**：速度 ×1.8，每 4s 召唤 Stalker ×4 + Tanker ×2。

### 8.4 终局结算

Boss Lord 死亡后清空敌方弹道、清空非 Boss 敌人、隐藏顶栏血条、展示胜利面板，并调用 `_settleRun()`。

---

## 9. 战场动态突变

### 9.1 触发条件

每波仅触发一次：

```javascript
currentWaveSpawnedCount >= ceil(waveEnemyMax[idx] * 0.5)
```

Boss Lord 波次跳过。

### 9.2 现有词条（V3.1 增至 5 种）

| ID | 名称 | 效果 |
|----|------|------|
| gravity | 引力逆转 | `player.magnetRadius = 0`，必须肉身拾取 |
| bloodmoon | 狂暴血月 | 全场敌人 `atk ×1.4`、`maxHp ×1.3`、掉落翻倍 |
| frenzy | 狂乱 | 敌人速度 +50%，金币掉落 +50% |
| frailty | 脆弱 | 攻击倍率双向 x1.5（玩家攻/敌人攻均提升） |
| wither | 枯萎 | 全体敌人每 5 秒损失 5% 最大 HP（游戏时间） |

### 9.3 流程

`_showMutatorPanel()` 暂停游戏并渲染 5 张突变卡，选择后 `_applyMutator(id)` 恢复循环。`_clearMutatorEffects()` 在波次切换时复原。

---

## 10. 时钟冻结

`_freezeClock()` 给 `#game-container` 添加 `game-clock-frozen` 类：

```css
.game-clock-frozen * {
    animation-play-state: paused !important;
    transition-property: none !important;
}
```

**V3.1 双保险修复**：`_beginLoop` 将 `_unfreezeClock` 移到 `if (this.running) return;` 之前，确保无论调用时机都移除冻结类。`_announceWave` 在 freeze 前先 unfreeze 清除残留。

奖励、暂停、引导覆盖层通过 `animation-play-state: running !important` 豁免冻结。

`_unfreezeClock()` 移除该类。`_beginLoop()` 入口处无条件调用 `_unfreezeClock()`。

触发场景：波次公告、突变面板、升级奖励、波次宝箱、胜利/失败结算。

---

## 11. 圣物系统

### 11.1 基础圣物（10 种）

| ID | 名称 | 效果 |
|----|------|------|
| sharp_edge | 锐利锋芒 | atk +5 |
| golden_finger | 黄金右手指 | critRate +15% |
| auto_drone | 自动化随从 | 无人机攻击最近敌人 |
| thorn_armor | 荆棘反伤甲 | maxHp +20，反伤率 +10% |
| wind_walker | 疾风步 | 移速加成 |
| vamp_ring | 吮血指环 | 吸血率 +8% |
| explosive_core | 爆破核心 | 溅射概率 +15% |
| frost_core | 冰霜核心 | 冰冻概率 +10%，基础 1.5s |
| gravity_core | 引力核心 | 吸附半径 +40 |
| weapon_amplify | 兵器增幅 | 攻击 +3，武器 atkFactor 与 cd 提升 |

### 11.2 传说超武（4 种）

需满足特定圣物等级组合后解锁：

| ID | 名称 | 解锁条件 |
|----|------|----------|
| evolved_drone | 歼灭者浮游炮 | auto_drone ≥ 5 + sharp_edge ≥ 1 |
| evolved_armor | 太阳神巨像铠 | thorn_armor ≥ 5 + golden_finger ≥ 1 |
| evolved_speed | 凌波微步 | wind_walker ≥ 5 + golden_finger ≥ 1 |
| evolved_vamp | 血魔之拥 | vamp_ring ≥ 5 + thorn_armor ≥ 3 |

### 11.3 奖励池

`_buildPool()` 从以下四类中构建：

1. 未满级基础圣物
2. 已解锁传说超武
3. 未拥有的武器
4. 已持有武器的升级项

`_pickFrom(pool)` 使用 Fisher-Yates 洗牌后取前 3。

---

## 12. 大本营天赋树

元数据存储于 `meta.talents`：

```json
{
    "health_boost": 0,
    "speed_boost": 0,
    "magnet_boost": 0,
    "weapon_forge": 0
}
```

| 天赋 | 满级 | 消耗公式 |
|------|------|----------|
| health_boost | 5 | 当前等级 + 1 |
| speed_boost | 5 | 当前等级 + 1 |
| magnet_boost | 3 | 当前等级 + 1 |
| weapon_forge | 1 | 固定 3 核心 |

`weapon_forge` 点满后开局自动装备 TrackingBlade 与 OrbitShield。

---

## 13. 英雄系统

英雄注册表位于 `js/entities/HeroRegistry.js`，共 3 名英雄：

| 英雄 | HP | ATK | SPD | 基础闪避 | 被动 |
|------|----|-----|-----|----------|------|
| Knight | 100 | 10 | 100 | 0% | 闪避成功时释放 100px 震荡波击退敌人 |
| Mage | 70 | 10 | 100 | 0% | 武器槽位 7，cdFloor 0.15 |
| Assassin | 100 | 10 | 130 | 5% | 对冰冻/击退目标伤害 ×1.5 |

`SaveManager._metaCache` 保存 `currentHero` 与 `unlockedHeroes`。

---

## 14. 科技树

`meta.techTree` 存储三项核心科技：

| 科技 | 效果 | 基础消耗 |
|------|------|----------|
| life_enhancement | maxHp +10 | 5 核心/级 |
| sharpening | atk +2 | 8 核心/级 |
| precision_training | critRate +3% | 10 核心/级 |

消耗公式：`baseCost * (level + 1)`，满级 20。

---

## 15. 关卡系统

| 关卡 | 地图 | 最大波次 | 难度系数 |
|------|------|----------|----------|
| 试炼森林 | 1500×1500 | 5 | 1.0 |
| 幽暗地窟 | 1800×1800 | 7 | 1.3 |
| 烈焰深渊 | 2000×2000 | 10 | 1.7 |

每 10 秒 `_spawnInterval *= 0.9`，下限 0.3s。

---

## 16. 存档系统

### 16.1 localStorage 键

| 键 | 内容 | 更新时机 |
|----|------|----------|
| `cr_meta.json` | 永久进度 | 升级、结算、保存 |
| `cr_active_run.json` | 断点续玩 | 波次、购买、页面关闭 |

### 16.2 meta.json 结构

```json
{
    "metaTokens": 0,
    "totalRuns": 0,
    "totalKills": 0,
    "unlockedHeroes": ["Knight"],
    "currentHero": "Knight",
    "techTree": { "life_enhancement": 0, "sharpening": 0, "precision_training": 0 },
    "bossCores": 0,
    "talents": { "health_boost": 0, "speed_boost": 0, "magnet_boost": 0, "weapon_forge": 0 },
    "equipments": [],
    "equipped": { "weapon": null, "armor": null, "talisman": null },
    "unlockedMutations": [],
    "activeMutations": [],
    "highestEndlessLoop": 0,
    "causalityFlags": { "level1NoDamage": false, "level2Overkill": false }
}
```

### 16.3 active_run.json 结构

```json
{
    "isRunActive": true,
    "heroId": "Knight",
    "levelId": "level_1",
    "waveCount": 0,
    "elapsed": 0,
    "kills": 0,
    "player": { /* Player.snapshot() */ },
    "weapons": []
}
```

---

## 17. UI 层级与相机

战斗页固定尺寸 480×720，水平垂直居中。

```
#game-container
  #top-bar                   z: 50
  #rage-bar-container        z: 52
  #battlefield
    #world-layer             transform: translate(-camX, -camY)
      #player
      enemies
      coins / gems
      projectiles
      totems
      auras / FCT
    #boss-hp-bar             z: 55
    #reward-overlay          z: 100
    #mutator-overlay         z: 110
    #victory-overlay         z: 60
    #game-over-overlay       z: 60
    #joystick-container      z: 40
  #weapon-slot-bar
  #bottom-bar
```

相机跟随：

```javascript
cameraX += (targetCamX - cameraX) * (1 - e^(-10 * dt))
cameraY += (targetCamY - cameraY) * (1 - e^(-10 * dt))
_worldLayer.style.transform = 'translate(' + (-cameraX) + 'px, ' + (-cameraY) + 'px)'
```

---

## 18. 输入系统

| 输入 | 实现 |
|------|------|
| 键盘 WASD / 方向键 | `keydown/keyup` 维护 `_pressedKeys` |
| 虚拟摇杆 | `joystick-base` 拖拽计算 `_joystickDX/DY` |
| 点击移动 | 点击空白战场 → `_moveTo(wx, wy)` |
| 点击攻击 | 点击 `.enemy` → `_onClick(e)` |
| 盲射压制 | 有方向输入时点击空白战场，仅刷新 `_lastClickAngle` 并触发 ShotgunBurst |
| Overdrive | 满怒时按空格触发 |

---

## 19. 装备与锻造

### 19.1 装备原型

| ID | 名称 | 部位 | 基础属性 |
|----|------|------|----------|
| v2_wpn_sword | 风暴大剑 | weapon | atk_factor +10% |
| v2_amr_plate | 猩红重铠 | armor | hp_boost +30 |
| v2_talis_ring | 不灭指环 | talisman | magnet_boost +20 |

### 19.2 随机词条

| ID | 名称 | 效果 |
|----|------|------|
| xp_gain | 经验增幅 | 经验获取 +5%~15% |
| ice_bonus | 冰冻强化 | 冰冻时间 +0.1s~0.5s |
| speed_pct | 迅捷 | 移速 +5%~10% |

### 19.3 品质与词条数

| 品质 | 词条数 |
|------|--------|
| rare | 1 |
| epic | 2 |
| legendary | 3 |

### 19.4 洗练

`rerollAffix(instanceId, affixIndex, cost)`：扣除 1 核心，重新随机指定词条。

### 19.5 局内聚合

`Player.reset()` 中累加：

- `maxHp += hp_boost`
- `atk *= (1 + atk_factor)`
- `magnetRadius += magnet_boost`
- `xpGainFactor += xp_gain`
- `iceDurationBonus += ice_bonus`
- `speed *= (1 + speed_pct)`

---

## 20. 时空裂隙与无尽深渊

### 20.1 因果继承

| 关卡 | 条件 | 效应 |
|------|------|------|
| Lv1 | 全程不受击 | Lv2 开局 atk ×1.2 |
| Lv2 | 击杀 Stalker ≥ 30 | Lv3 Boss Lord 速度与弹幕速度 ×1.2，死亡额外 +2 核心 |

### 20.2 无尽深渊

Lv3 或任意无尽层 Boss Lord 死亡后弹出裂隙面板：

- **撤退大本营**：正常结算。
- **踏入深渊**：`loopCount++`，保留武器/等级/血量/装备，重置波次。

### 20.3 属性成长

```javascript
hpMultiplier   = 1.15^loopCount
atkMultiplier  = 1.15^loopCount
speedMultiplier = 1.05^loopCount
```

---

## 21. V3.0 Overdrive

### 21.1 怒气机制

- `Player.rage` 初始 0，上限 `Player.maxRage = 100`。
- 击杀敌人 +5 怒气。
- 拾取金币 +2 怒气。
- 顶栏 HUD 实时显示“怒气 X / 100”。

### 21.2 触发条件

满怒时按空格，或在脚本中调用 `_triggerOverdrive()`。

### 21.3 效果（持续 3 秒游戏时间）

- 玩家 `rage = 0`，`_syncUI()` 立即更新。
- 所有敌人 `speed = 0`（备份原速度）。
- 所有武器 `cooldownTimer = 0` 每帧。
- `player.cdFloor = 0`。
- `#game-container` 添加 `overdrive-active` 类，全屏红/品红滤镜。
- 屏幕触发 0.5 强度、3000ms 微震。
- 顶部显示大字横幅“☀️☀️☀️ Overdrive 爆轰 ☀️☀️☀️”。
- FCT 强制使用金色 `fct-overdrive` 样式。

### 21.4 结束

`_endOverdrive()`：

- 恢复 `player.cdFloor`。
- 恢复所有敌人速度。
- 移除 `overdrive-active` 类。

注意：游戏暂停（奖励/突变面板）时 Overdrive 计时器也会暂停，面板关闭后继续倒计时。

---

## 22. V3.0 套装共鸣

### 22.1 检测

`Player.reset()` 中统计三件已装备物品（weapon / armor / talisman）的词条类型：

- 3 个 `speed_pct` → `setResonanceSpeed = true`
- 3 个 `ice_bonus` → `setResonanceIce = true`

### 22.2 焰痕（Speed ×3）

每 0.5 秒：

- 以玩家为中心 80px 半径内敌人受到 `floor(atk * 0.3)` 伤害。
- 在玩家位置生成 `.resonance-flame` 圆形光环 DOM，400ms 后移除。

### 22.3 永冻（Ice ×3）

每 0.8 秒：

- 以玩家为中心 60px 半径内敌人进入冰冻，持续 `0.5 + iceDurationBonus` 秒。
- 在玩家位置生成 `.resonance-ice` 圆形光环 DOM，500ms 后移除。

---

## 23. V3.0 变异保险库

### 23.1 数据

`SaveManager._metaCache`：

- `unlockedMutations: []`：已解锁的变异 ID。
- `activeMutations: []`：当前携带的变异 ID。

### 23.2 解锁

每次 `_settleRun()` 后有 20% 概率随机解锁一个未解锁变异。

### 23.3 大本营 UI

大本营第 5 个 tab “🧬 变异保险库”：

- 列出所有变异，显示锁定/可携带/已携带状态。
- 每个携带的变异使 Boss 核心结算翻倍：`bonusCores *= 2^activeMutations.length`。
- 可点击“携带”/“卸下”。

### 23.4 当前变异效果

| ID | 名称 | 效果 |
|----|------|------|
| gravity | 引力逆转 | 吸附半径归零，必须肉身拾取 |
| bloodmoon | 狂暴血月 | 敌人体型 +30%，攻击 +40%，掉落翻倍 |

### 23.5 局内应用

`_startNewRun()` 读取 `activeMutations` 到 `_vaultMutations`：

- gravity：开局 `player.magnetRadius = 0`。
- bloodmoon：敌人生成时 atk ×1.4、hp ×1.3；金币/经验掉落 ×2。

进入深渊时 reapply。

---

## 24. V3.0 FCT 与屏幕震动

### 24.1 FxManager 对象池

`js/core/FxManager.js`：

- 初始化时在 `#fct-layer` 中预创建 50 个 `.fct-node`。
- `spawnText(x, y, text, type)` 借用一个隐藏节点，设置文本/位置/类型动画，监听 `animationend` 后归还。
- 高并发时池耗尽可懒创建至最多 200 个节点。
- 修复了节点复用时旧 `animationend` 回调误回收新动画的 bug（使用 `_fctActive` 标志 + 先移除旧监听器）。

### 24.2 FCT 类型

| 类型 | 样式 |
|------|------|
| normal | 16px 白色，向上漂浮 |
| crit | 30px 红色 Impact 字体，黑色阴影，缩放 1.4→1.1 |
| freeze | 20px 冰蓝色，双层辉光 |
| overdrive | 26px 金色，抛物线弧线 |

### 24.3 触发点

- 玩家点击敌人：`Enemy.takeDamage()` 根据是否暴击/冰冻/Overdrive 选择类型，调用 `fxManager.spawnText()`。
- 玩家受击：`Player.takeDamage()` 显示白色 `-dmg`。
- 旧 `_spawnFloatText`（荆棘暴击、闪避文字）也优先走对象池。

### 24.4 屏幕震动

`GameEngine.triggerShake(intensity, duration)`：

- 给 `#game-container` 添加 `screen-shake-active`。
- 根据强度设置动画时长：强度 1 为 0.1s，≥2 为 0.06s。
- `_loop` 中维护 `_shakeTimer`，到期后移除类。

触发点：

| 事件 | 强度 | 时长 |
|------|------|------|
| Overdrive | 0.5 | 3000ms |
| Knight 闪避震荡 | 1 | 200ms |
| 玩家暴击 | 2 | 300ms |
| Assassin 被动暴击 | 2 | 250ms |
| Boss Lord 死亡 | 3 | 500ms |

---

## 25. 主题色板与动画

### 25.1 色板

| 色值 | 语义 |
|------|------|
| `#0a0a12` | 背景底色 |
| `#12122a` | 面板底色 |
| `#4fc3f7` | 主色（青蓝） |
| `#ffd700` | 强调色（金） |
| `#ff1744` | 危险色（红） |
| `#00e676` | 成功色（绿） |

### 25.2 关键动画

| 名称 | 用途 |
|------|------|
| floatUp | 普通飘字 |
| fct-normal / fct-crit / fct-freeze / fct-overdrive | FCT 四类动画 |
| explosionExpand | 溅射圈 |
| shakeEffect | 屏幕震动 |
| waveAnnounce | 波次公告 |
| warningPulse | Boss Lord 预警圈 |
| bossEnrageGlow | 领主狂暴 |
| flamePulse / icePulse | 套装共鸣光环 |
| overdrivePulse | Overdrive 滤镜呼吸 |
| achievePop | V3.1 成就弹出（scale-in + hold + fade-out） |
| cardDealIn / cardFlip | 3D 奖励卡牌翻转 |
| bannerBlink / laserSlice | 新武器解锁条幅 |

---

## 26. V3.1 暂停系统

**入口**：Escape 键 / 底部栏 `⏸` 按钮。

**实现**（`GameEngine.js`）：
- `_paused` 标志 + `_isPauseAllowed()` 防冲突
- `_togglePause()` → running=false + freezeClock → 显示 `#pause-overlay`
- 禁止暂停的场景：奖励/突变/胜利/死亡/引导覆盖层激活时
- "继续游戏"按钮 → `_beginLoop()`；"返回主页" → `_goToSaveSelect()`
- CSS `#pause-overlay` 豁免 `.game-clock-frozen` 冻结

## 27. V3.1 开场引导

**触发条件**：首次游玩（`meta.hasSeenGuide === false`）+ level_1 + 非深渊轮回。

**实现**（`GameEngine.js`）：
- `_showGuide()` 显示 `#guide-overlay` → 操作说明 + "明白了，出征！"按钮
- 确认后标记 `meta.hasSeenGuide = true`、关闭覆盖层、`_beginLoop()`
- CSS `#guide-overlay` 豁免 `game-clock-frozen`

## 28. V3.1 成就系统

**8 项成就**（`js/config/AchievementConfig.js`）：
- 初尝血腥 / 百人斩 / 千人屠（局末检测总击杀）
- 凯旋初征（首次通关） / 毫发无伤（关卡 0 受击）
- 狂暴常客（累计 Overdrive 10 次） / 腰缠万贯（单局 1000 金币）
- 深渊行者（深渊第 5 层）

**实现**：
- Meta 存储 `meta.achievements` + `meta.flawlessRuns`
- 局内触发：`_syncUI`（金币）、`_triggerOverdrive`（OD 次数）
- 局末触发：`_settleRun`（总击杀/通关/深渊/无伤）
- `_checkAchievement(id)` → 写 meta → `_spawnAchievementText` 弹出通知
- 大本营第 6 tab `🏆 成就` → `refreshAchievements()` 渲染卡片

## 29. V3.1 装备掉落

**在 Boss 死亡时触发**（`GameEngine._tryDropEquipment`）：
- 普通 Boss：25% 掉落率
- Boss Lord：100% 掉落率
- 品质分布：rare 60% / epic 30% / legendary 10%
- 随机原型（武器/护甲/饰品）→ `equipmentRegistry.createItem()`
- 直接写入 `meta.equipments` → `_saveMetaToStorage()`
- `_spawnCausalityText` 显示获得通知

## 30. V3.1 音效骨架

**文件**：`js/core/AudioManager.js`

**架构**：
- Web Audio API（`AudioContext`）延迟初始化（首次用户手势触发）
- `_ensureContext()` 在 pointerdown/keydown 时自动调用
- `play(sound, opts)` 预留 10 个 sound id
- `setMuted(bool)` / `setVolume(0-1)`

**后续接入**：在 `play()` 内填充音频合成或用 `<audio>` 资源加载。

## 31. V3.1 响应式缩放

**文件**：`js/responsive.js`（三页共用）

**机制**：
- 480×720 基准容器，`scale = min(viewportW/480, viewportH/720, 1)`
- 仅缩小不放大，`transform: scale()` + 居中
- `window.addEventListener('resize', fit)` 自适应

## 32. V3.1 HUD 优化与卡牌模糊修复

**HUD**（`gameplay.css`）：
- EXP/Rage 条从 6/8px 增至 16px，文字在条内垂直居中（白色带阴影）
- bottom-bar 计时器 14px/粗体/#ccc，暂停键 16px/#ddd + hover 高亮

**卡牌模糊**：
- 去掉 `backdrop-filter: blur(6px)`（与 3D perspective + preserve-3d + backface-visibility 冲突，导致 Chromium GPU 子像素渲染模糊）
- 去掉 `overflow: hidden`（3D 上下文中的渲染降质）

---

*文档版本：V3.1*
