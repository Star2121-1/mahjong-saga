# Click Roguelike 项目移交文档

> 本文档面向即将接手本项目的开发者。阅读后应能独立完成环境搭建、代码定位、功能开发与 bug 修复，无需额外询问。

---

## 1. 项目概览

| 项目 | 说明 |
|------|------|
| **游戏名称** | Click Roguelike（点击肉鸽） |
| **游戏类型** | 2D 俯视角点击生存 Roguelike |
| **目标平台** | 浏览器（PC / 移动端 H5） |
| **核心玩法** | 单局内点击敌人攻击、走位拾取圣物与武器构筑 build，击败多波敌人与最终 Boss Lord；局外通过魔王核心升级天赋、解锁英雄、锻造装备、携带变异，挑战无尽深渊。 |
| **引擎** | 无引擎，纯原生 Web 技术 |
| **语言** | ES6+（Class + 箭头函数 + async/await 局部使用），无 TypeScript |
| **渲染** | 原生 DOM + CSS3（绝对定位、transform、box-shadow、gradient），无 Canvas/WebGL |
| **持久化** | localStorage |
| **网络** | 无网络模块，纯单机 |
| **音频** | 无音频系统 |
| **关键库/插件** | 无第三方库，零依赖 |

### 1.1 项目定位

这是一个**无构建工具、无框架、无外部资源**的轻量级 H5 游戏。所有代码直接以 `<script>` 标签顺序加载到 `window` 全局命名空间。图形、动画、UI 全部由 CSS 生成。

### 1.2 当前版本

**V3.1**（V3.0 核心完成，V3.1 打磨：暂停、引导、成就、新变异、装备掉落、HUD 优化、卡牌模糊修复、响应式缩放）。

---

## 2. 项目结构 & 架构

### 2.1 目录树

```
F:\Boke\Click Roguelike
├── s1_save_select.html          # 存档选择页（游戏入口）
├── s2_main_hub.html             # 大本营页（英雄/天赋/锻造/关卡/变异/成就）
├── s3_gameplay.html             # 战斗页
├── README.md                    # 项目简介
├── PROJECT_DOCS.md              # 完整技术文档
├── HANDOVER.md                  # 本文档
├── css/
│   ├── common.css               # 全局 reset、@keyframes、工具类、滚动条
│   ├── save_select.css          # 存档选择页样式
│   ├── main_hub.css             # 大本营、锻造、变异保险库、成就样式
│   └── gameplay.css             # 战斗页、HUD、FCT、Overdrive、震动、引导、暂停
└── js/
    ├── main.js                  # s3_gameplay 引导脚本
    ├── responsive.js            # 响应式缩放（三页共用）
    ├── config/
    │   ├── HeroConfig.js        # 英雄静态配置表
    │   ├── LevelConfig.js       # 关卡静态配置表
    │   └── AchievementConfig.js # 成就定义与检测条件
    │   └── LevelConfig.js       # 关卡静态配置表
    ├── entities/
    │   ├── Player.js            # 玩家实体：属性、装备聚合、英雄被动、快照
    │   ├── Enemy.js             # 敌人实体：AI、Boss Lord、受击、FCT 挂钩
    │   ├── ExpGem.js            # 经验宝石实体
    │   ├── Weapon.js            # Weapon 基类 + Projectile + 6 神兵子类
    │   ├── HeroRegistry.js      # 英雄注册表（Knight/Mage/Assassin）
    │   └── EquipmentRegistry.js # 装备原型与实例注册表
    ├── core/
    │   ├── SaveManager.js       # 存档、元进度、英雄/装备/成就/变异保险库接口
    │   ├── RewardManager.js     # 奖励/圣物/武器/置换面板（含 3D 卡牌翻转）
    │   ├── GameEngine.js        # 核心战斗引擎：主循环、刷怪、突变、Overdrive、暂停、引导、成就
    │   ├── FxManager.js         # FCT（浮动战斗文字）对象池
    │   └── AudioManager.js      # 音效管理器骨架（Web Audio API，预留 play 接口）
    └── page/
        ├── save_select.js       # 存档选择页控制器
        └── main_hub.js          # 大本营控制器（Tavern/Forge/Vault/Level select）
```

### 2.2 核心架构模式

**自定义全局单例模式 + 面向对象实体**。没有 ECS、MVC 或组件系统。

关键交互关系：

```
页面 HTML
  │ <script> 加载顺序全局挂载
  ▼
window.SaveManager ──读写──▶ localStorage
  │
  ├── 提供 meta 数据给 main_hub.js
  │
  ├── startNewRun() 写入 active_run.json
  │
  └── GameEngine.init() 读取 active_run.json
        │
        ├── new Player()
        ├── RewardManager
        ├── FxManager
        └── requestAnimationFrame(_loop)
```

### 2.3 页面组织

三个独立 HTML 页面通过 `window.location.href` 跳转：

1. **s1_save_select.html**：创建/继续存档。
2. **s2_main_hub.html**：局外成长与出征准备。
3. **s3_gameplay.html**：实际战斗。

每个页面只加载自己需要的脚本，没有前端路由。

### 2.4 关键文件说明

| 文件 | 职责 | 代码量 |
|------|------|--------|
| `js/core/GameEngine.js` | 核心引擎，主循环、刷怪、碰撞、波次、Boss、Overdrive、暂停、引导、成就 | ~2300 行 |
| `js/core/SaveManager.js` | localStorage 读写、存档迁移、元数据、成就管理 | ~520 行 |
| `js/core/RewardManager.js` | 奖励面板、圣物池、武器池、3D 卡牌动画 | ~410 行 |
| `js/core/FxManager.js` | FCT 对象池（含治疗/经验复用） | ~80 行 |
| `js/core/AudioManager.js` | 音效骨架，Web Audio API，play(sound) 预留 | ~50 行 |
| `js/entities/Player.js` | 玩家属性、装备聚合、快照、英雄被动 | ~500+ 行 |
| `js/entities/Enemy.js` | 敌人 AI、Boss Lord 状态机、受击逻辑 | ~600+ 行 |
| `js/entities/Weapon.js` | Weapon 基类、6 神兵（震荡/脉冲以角色为中心） | ~900+ 行 |
| `js/entities/EquipmentRegistry.js` | 装备原型生成、随机词条 | ~45 行 |
| `js/config/AchievementConfig.js` | 8 项成就定义与检测条件 | ~30 行 |
| `js/page/main_hub.js` | 大本营 6 tab UI 控制器（含成就渲染） | ~680 行 |
| `js/responsive.js` | 480×720 等比缩小适配视口 | ~25 行 |
| `css/gameplay.css` | 战斗页所有样式，含 FCT/Overdrive/震动/暂停/引导 | ~1100 行 |

---

## 3. 当前进度清单

### 3.1 核心战斗

| 系统 | 状态 | 说明 |
|------|------|------|
| 玩家点击攻击 | ✅ | 点击敌人触发普攻/暴击/吸血/溅射/冰冻 |
| 玩家移动 | ✅ | WASD、方向键、虚拟摇杆、点击地面 |
| 敌人 AI | ✅ | Tanker / Stalker / Shaman 三类行为 + 图腾 |
| 刷怪与波次 | ✅ | 波次公告、难度递增、Boss Lord 波次 |
| Boss Lord | ✅ | 三阶段状态机、弹幕、砸地、狂暴召唤 |
| 碰撞检测 | ✅ | 圆形碰撞，Projectile.hitEnemies 去重 |
| 受伤/闪避/无敌 | ✅ | 闪避完全免疫，无敌帧 0.35s |
| 受击 FCT | ✅ | V3.0 新增玩家受击白色飘字 |

### 3.2 武器与圣物

| 系统 | 状态 | 说明 |
|------|------|------|
| 6 种神兵 | ✅ | TrackingBlade / OrbitShield / ShotgunBurst / GroundSlammer / LaserBeam / NovaPulse |
| 武器升级 | ✅ | level++、atkFactor +0.15、cd 压缩 |
| 武器槽位 | ✅ | 默认 6，Mage 7，满槽置换 |
| 10 基础圣物 | ✅ | 攻击/暴击/吸血/冰冻/无人机/吸附等 |
| 4 传说超武 | ✅ | 条件解锁，效果已实现 |
| 武器栏 UI | ✅ | 图标 + 冷却条 + 等级 |

### 3.3 英雄与装备

| 系统 | 状态 | 说明 |
|------|------|------|
| 英雄系统 | ✅ | Knight / Mage / Assassin，各自被动 |
| 英雄酒馆 UI | ✅ | 解锁/切换/部署 |
| 装备原型 | ✅ | 武器/护甲/饰品三种原型 |
| 随机词条 | ✅ | xp_gain / ice_bonus / speed_pct |
| 装备品质 | ✅ | rare(1)/epic(2)/legendary(3) |
| 装备洗练 | ✅ | 消耗 1 核心重roll指定词条 |
| 装备聚合 | ✅ | Player.reset() 汇总装备属性 |
| 锻造 UI | ✅ | 装备列表、穿戴、卸下、洗练 |

### 3.4 V3.0 / V3.1 新增系统

| 系统 | 状态 | 说明 |
|------|------|------|
| Overdrive | ✅ | 怒气满 100 按空格触发，3 秒冻结敌人 + 武器无 CD + 滤镜 + 震动（面板暂停） |
| 套装共鸣 | ✅ | 3 件同词条触发火焰/冰冻光环，开局提示已激活 |
| 变异保险库 | ✅ | 解锁/携带负面变异（5 种：引力逆转/血月/狂乱/脆弱/枯萎），核心收益翻倍 |
| FCT 对象池 | ✅ | 50 节点预分配，4 种样式，治疗/经验飘字已迁移 |
| 屏幕震动 | ✅ | 暴击/Boss 死亡/闪避/Overdrive 触发 |
| 暂停系统 | ✅ | Escape 键 / ⏸ 按钮，覆盖层菜单，面板冲突保护 |
| 开场引导 | ✅ | 首次战斗显示操作提示，localStorage 标记 |
| 成就系统 | ✅ | 8 项成就（击杀/通关/无伤/Overdrive/金币/深渊），弹出提示 + 大本营 tab |
| 装备掉落 | ✅ | Boss 25%/Boss Lord 100% 掉落装备，直接入仓库 |
| 响应式缩放 | ✅ | 480×720 等比缩小适配视口，三页共用 responsive.js |
| 音效骨架 | ✅ | AudioManager 预留 play(sound) 接口，首次手势激活 AudioContext |

### 3.5 局外与存档

| 系统 | 状态 | 说明 |
|------|------|------|
| 存档选择 | ✅ | 新建/继续/导入/导出 |
| 元进度存档 | ✅ | 核心、天赋、英雄、装备、变异、成就、最高深渊层 |
| 活跃对局存档 | ✅ | 断点续玩 |
| 天赋树 | ✅ | 4 项永久天赋 |
| 科技树 | ✅ | 3 项核心科技 |
| 因果继承 | ✅ | Lv1/Lv2 条件影响下一关 |
| 无尽深渊 | ✅ | loopCount 指数成长 |
| 深渊记录板 | ✅ | 大本营显示最高层数 |

### 3.6 UI / 输入 / 其他

| 系统 | 状态 | 说明 |
|------|------|------|
| 大本营 6 tab | ✅ | 酒馆/天赋/锻造/出征/变异/成就 |
| 3D 卡牌翻转 | ✅ | 奖励面板双层面 flip 动画（去掉 backdrop-filter 消除模糊） |
| 虚拟摇杆 | ✅ | 移动端支持 |
| 键盘输入 | ✅ | WASD/方向键/空格/Escape |
| 相机跟随 | ✅ | 平滑跟随玩家 |
| HUD 布局 | ✅ | 经验条/愤怒条 16px 高文字居中，计时器/暂停键加大高亮 |
| 音频资源 | ❌ | AudioManager 骨架已就绪，音频资源未接入 |
| 多语言 | ❌ | 仅简体中文 |
| 真机适配 | 🔄 | PC 浏览器完整，移动端 responsive.js 等比缩放已生效 |

---

## 4. 待办事项（当前 Sprint）

### 4.1 高优先级

| # | 任务 | What | Why | 预期行为 |
|---|------|------|-----|----------|
| 1 | 修复 `game-clock-frozen` 残留 | 突变/奖励面板关闭后，`#game-container` 上 `game-clock-frozen` 类有时未移除。 | 会导致全局 CSS 动画暂停，视觉上部分元素不动。 | 面板关闭后容器类名应仅保留必要状态类。 |
| 2 | Overdrive 与暂停面板的交互 | Overdrive 的 3 秒计时器使用 `dt`，在奖励/突变面板打开时暂停。 | 设计争议：玩家可能觉得 Overdrive 应该“真实时间”流逝。 | 决定真实时间还是游戏时间，并统一实现。 |
| 3 | 治疗/经验飘字迁移到对象池 | `_spawnHealText` 和 `_spawnExpText` 仍使用 `document.createElement` + `setTimeout`。 | 高频时与 FCT 池不一致，且创建销毁 DOM 有开销。 | 复用 `fxManager` 或单独对象池，保持样式区分。 |
| 4 | 移动端响应式细节 | 不同分辨率下 HUD、按钮、面板可能出现错位。 | 目标平台包含移动端 H5。 | 在常见分辨率（375×667、414×896、1920×1080）下 playable。 |

### 4.2 中优先级

| # | 任务 | What | Why | 预期行为 |
|---|------|------|-----|----------|
| 5 | 增加更多变异 | ✅ 新增 3 种（狂乱/脆弱/枯萎），总计 5 种 | V3.1 完成 |
| 6 | 装备掉落与获取流程 | ✅ Boss 25%/Boss Lord 100% 掉落装备入库 | V3.1 完成 |
| 7 | 套装共鸣自动提示 | ✅ 开局 `_spawnCausalityText` 提示共鸣激活 | V3.1 完成 |
| 8 | 真机性能测试 | 🔄 待真机实测 | — |

### 4.3 低优先级 / 打磨

| # | 任务 | What | Why | 预期行为 |
|---|------|------|-----|----------|
| 9 | 添加音效 | AudioManager 骨架已就绪，play(sound) 预留接口 | 需音频资源后接入 | 可选开关，无版权问题的音频文件。 |
| 10 | 开场引导 | ✅ 首次战斗显示操作提示遮罩 | V3.1 完成 |
| 11 | 成就系统 | ✅ 8 项成就（击杀/通关/无伤/OD/金币/深渊），弹出提示+大本营 tab | V3.1 完成 |

### 4.4 已知 Bug 列表（V3.0 → V3.1 已修复）

| # | Bug | 修复 | 状态 |
|---|-----|------|------|
| 1 | `game-clock-frozen` 残留 | `_beginLoop` 先 unfreeze 再判 running；`_announceWave` 前 unfreeze | ✅ |
| 2 | Overdrive 在面板期间暂停 | 定案：游戏时间，面板暂停 Overdrive，注释文档化 | ✅ |
| 3 | 大本营”轰然出征”有时需多点 | 按钮不再异步 disabled | ✅ |
| 4 | 经验宝石旧代码残留 | 删除 `friction`/`_grounded` 等废弃字段 | ✅ |
| 5 | 单页版本 index.html 已落后 | 已删除 `index.html` 和 `style.css` | ✅ |
| 6 | 卡牌 hover 模糊 | 去掉 `backdrop-filter: blur(6px)` 和 `overflow: hidden`（3D 透视 + Chromium 子像素冲突） | ✅ |

---

## 5. 设计文档

### 5.1 游戏规则（GDD 摘要）

#### 5.1.1 单局目标

- 存活并击败最终 Boss Lord。
- 收集金币与经验，升级圣物/武器，构建强力 build。
- 通关后可选择撤退结算或进入无尽深渊继续挑战。

#### 5.1.2 数值框架

```javascript
// 敌人基础属性
基础 HP  = floor(20 * 1.2^(level-1))
基础 ATK = floor(5 * 1.1^(level-1))
基础 SPD = 40 + (level-1) * 3
level    = floor(elapsed / 15) + 1

// Boss Lord
maxHp = floor(200 * 1.2^(level-1))
ATK   = floor(30 * 1.1^(level-1))
speed = 20

// 玩家
Player.maxHp  起始 100（因英雄/天赋/装备变化）
Player.atk    起始 10
Player.speed  起始 100
Player.critRate 起始 5%
Player.dodgeRate 起始 0%

// 暴击
critDmg = floor(atk * 2.5)

// 深渊成长
hpMultiplier   = 1.15^loopCount
atkMultiplier  = 1.15^loopCount
speedMultiplier = 1.05^loopCount

// 怒气
kill  +5 rage
gold  +2 rage
maxRage = 100
Overdrive duration = 3s
```

#### 5.1.3 关卡设计

| 关卡 | 地图 | 波次 | 难度系数 | 分布 |
|------|------|------|----------|------|
| 试炼森林 | 1500×1500 | 5 | 1.0 | [20,30,40,50,1] |
| 幽暗地窟 | 1800×1800 | 7 | 1.3 | [25,35,45,55,65,75,1] |
| 烈焰深渊 | 2000×2000 | 10 | 1.7 | [30,40,50,60,70,80,90,100,110,1] |

每波最后 1 个为 Boss（最后一波为 Boss Lord）。

### 5.2 UI 布局

#### 5.2.1 战斗页（s3_gameplay.html）

```
┌────────────────────────────┐
│  怒气条 | 波次 | 金币 | 击杀  │  ← #top-bar + #rage-bar-container
├────────────────────────────┤
│                            │
│      #battlefield          │  ← 实际游戏画面
│      (480×586 视口)        │
│                            │
├────────────────────────────┤
│  [武器槽位栏]              │  ← #weapon-slot-bar
├────────────────────────────┤
│  [底部信息/攻击/移动]      │  ← #bottom-bar
└────────────────────────────┘
```

#### 5.2.2 大本营页（s2_main_hub.html）

顶部 5 个 tab：

1. 🍺 酒馆备战 — 英雄选择与切换
2. 👑 魔王天赋 — 永久天赋树
3. ⚒ 皇家锻造 — 装备锻造/穿戴/洗练
4. ⚔ 时空出征 — 关卡选择
5. 🧬 变异保险库 — 携带负面变异

#### 5.2.3 奖励面板

3D 卡牌形式，每张卡背面统一，正面显示圣物/武器/升级信息，点击后翻转并吸入武器槽。

### 5.3 数据流图

```
玩家操作
  │
  ▼
GameEngine._loop()
  ├── 输入系统 ──▶ Player.updatePosition()
  ├── 刷怪系统 ──▶ Enemy 实例
  ├── 武器系统 ──▶ Projectile 实例
  ├── 碰撞检测 ──▶ Enemy.takeDamage()
  ├── 金币/经验 ──▶ Coin / ExpGem
  ├── 突变检测 ──▶ RewardManager._showMutatorPanel()
  ├── 升级检测 ──▶ RewardManager._showLevelUpPanel()
  ├── 波次检测 ──▶ _announceWave() / _spawnBossLord()
  ├── 终局检测 ──▶ _showVictory() / _gameOver()
  └── _syncUI()
        │
        ▼
SaveManager.snapshotForRun() ──▶ localStorage: cr_active_run.json

局外流程：
main_hub.js ──▶ SaveManager.upgradeTalent/unlockHero/equipItem/rerollAffix
                │
                ▼
         localStorage: cr_meta.json
```

---

## 6. 开发环境

### 6.1 运行要求

- 任意现代浏览器（Chrome / Edge / Firefox / Safari）。
- 本地静态服务器（因为部分脚本加载与 localStorage 在 file:// 协议下可能受限）。

### 6.2 推荐工具

| 用途 | 工具 |
|------|------|
| 代码编辑 | VS Code、任意文本编辑器 |
| 浏览器调试 | Chrome DevTools |
| 自动化测试 | agent-browser（已安装） |
| 本地服务器 | Python `http.server` |

### 6.3 构建 & 运行命令

```bash
# 进入项目根目录
cd "F:\Boke\Click Roguelike"

# 启动静态服务器
python -m http.server 8765

# 浏览器访问
http://localhost:8765/s1_save_select.html
```

### 6.4 调试技巧

- 在 DevTools Console 中可直接访问 `gameEngine`、`saveManager`、`rewardManager`、`fxManager`。
- 常用调试命令：
  ```javascript
  gameEngine.player.rage = 100;
  gameEngine._triggerOverdrive();
  gameEngine.triggerShake(2, 300);
  saveManager._metaCache.bossCores += 100;
  ```
- 清空存档：DevTools Application -> Local Storage -> `http://localhost:8765` -> 删除 `cr_meta.json` 和 `cr_active_run.json`。

### 6.5 无构建配置

项目没有 webpack/vite/babel。直接修改 JS/CSS 后刷新浏览器即可生效。注意浏览器缓存：建议用 `?v=时间戳` 或 DevTools Network -> Disable cache。

---

## 7. 资产清单

### 7.1 图形资源

| 类型 | 来源 | 状态 |
|------|------|------|
| 玩家图形 | CSS（蓝色方块 + glow） | 最终 |
| 敌人图形 | CSS（圆角 + 渐变 + hue） | 最终 |
| Boss Lord | CSS（红色方块 + 阴影） | 最终 |
| 武器弹道 | CSS（div + 渐变 + box-shadow） | 最终 |
| UI 面板 | CSS（背景色 + 边框 + 阴影） | 最终 |
| 圣物图标 | Unicode emoji + CSS | 最终 |
| 武器图标 | CSS 彩色圆点 | 最终 |

**没有外部图片、精灵图、SVG 资源。** 所有视觉元素均为代码生成。

### 7.2 音频资源

| 类型 | 状态 |
|------|------|
| 背景音乐 | ❌ 未实现 |
| 音效 | ❌ 未实现 |

### 7.3 动画资源

| 动画 | 位置 | 说明 |
|------|------|------|
| floatUp / fct-* | css/gameplay.css | FCT 飘字 |
| explosionExpand | css/common.css | 溅射圈 |
| shakeEffect | css/gameplay.css | 屏幕震动 |
| waveAnnounce | css/common.css | 波次公告 |
| cardDealIn / cardFlip | css/gameplay.css | 3D 卡牌 |
| overdrivePulse | css/gameplay.css | Overdrive 滤镜 |
| flamePulse / icePulse | css/gameplay.css | 套装共鸣光环 |

---

## 8. 关键上下文

### 8.1 关键决策与取舍

#### 决策 1：纯 DOM + CSS，不用 Canvas/WebGL

- **原因**：降低学习成本与构建复杂度，便于快速迭代；所有图形可代码生成，零资源依赖。
- **代价**：大量 DOM 节点时性能不如 Canvas，尤其是同屏敌人 >50 个或 FCT 高并发时。目前通过对象池和 DOM 复用缓解。

#### 决策 2：无模块系统，全部挂载到 window

- **原因**：项目早期快速原型，无需构建工具；直接 `<script>` 标签顺序加载。
- **代价**：全局命名空间污染、依赖顺序敏感、难以单元测试。新增文件必须在正确位置引入。

#### 决策 3：localStorage 持久化，无后端

- **原因**：纯单机 H5 游戏，无需服务器成本。
- **代价**：存档可被玩家手动修改；无法跨设备同步。

#### 决策 4：装备系统与战斗循环弱耦合

- **原因**：装备在局外锻造，局内只读聚合，避免运行时复杂的状态同步。
- **代价**：局内无法临时更换装备，装备获取流程未设计。

#### 决策 5：FCT 使用对象池而非 Canvas 文字

- **原因**：与现有 DOM 渲染体系一致，便于 CSS 动画与样式控制。
- **代价**：DOM 节点上限受浏览器性能影响，当前池大小 50，溢出可懒创建至 200。

### 8.2 卡住过的问题及解决方案

#### 问题 1：浏览器缓存导致 JS 不刷新

- **现象**：修改 Player.js 后浏览器仍加载旧版本，`player.rage` 为 null。
- **解决**：使用 URL 时间戳参数 `?v=Date.now()` 或 DevTools 禁用缓存；新 session 测试。

#### 问题 2：3D 卡牌翻转时看不到正面

- **现象**：奖励面板卡牌翻转后空白。
- **原因**：`.game-clock-frozen` 全局暂停了所有 CSS 动画，包括卡牌翻转。
- **解决**：在 CSS 中为 `#reward-overlay` 及其子元素添加 `animation-play-state: running !important` 例外。

#### 问题 3：`_animateSuckIn` 闭包 bug

- **现象**：三张奖励卡点击时全部选中同一张。
- **原因**：循环中闭包共享了同一个 `cardContainer` 变量。
- **解决**：改为 IIFE 传入参数。

#### 问题 4：经验宝石行为不一致

- **现象**：经验宝石有时不吸附或吸附速度异常。
- **原因**：旧代码有 `_grounded`、摩擦衰减、距离阈值等复杂逻辑。
- **解决**：重写为与金币一致：全图恒定速度吸附，无距离阈值，无弹跳。

#### 问题 5：FCT 对象池节点复用 bug

- **现象**：节点动画被提前回收，导致新飘字消失。
- **原因**：旧 `animationend` 监听器在节点被复用后仍触发。
- **解决**：新增 `_fctActive` 标志，并在设置新动画前移除旧监听器。

### 8.3 下一步最复杂/最不确定的技术挑战

1. **音频接入**：AudioManager 骨架已就绪（Web Audio API），需要音频资源。可选项：程序化合成（振荡器/噪声）或 `<audio>` 资源文件。
2. **性能优化**：随着 loopCount 增加，DOM 节点数量可能成为瓶颈。对策：远离视口的敌人停止更新、或 Canvas 重写渲染层。
3. **移动端真机适配**：responsive.js 已实现等比缩放，需在不同设备上实测。

### 8.4 遗留技术债务

| 债务 | 影响 | 建议处理 |
|------|------|----------|
| 全局 window 依赖 | 测试困难 | 逐步引入简单模块加载器 |
| 无单元测试 | 回归风险高 | 为核心工具函数（伤害计算、碰撞）添加纯函数测试 |
| CSS 分散在多个文件 | 样式冲突风险 | 统一变量或 BEM 命名规范 |

### 8.5 给接手者的建议

1. **先跑起来**：用 `python -m http.server 8765` 打开 `s1_save_select.html`，玩一局熟悉流程。
2. **读代码顺序**：`SaveManager.js` → `Player.js` → `Enemy.js` → `GameEngine.js` → `RewardManager.js`。
3. **改前搜索**：由于全局命名空间，修改变量前先用 grep 查全项目引用。
4. **注意脚本顺序**：新增文件必须在对应 HTML 的 `<script>` 列表中按依赖顺序引入。
5. **浏览器缓存**：改 JS/CSS 后 hard refresh，测试时用时间戳参数。
6. **不要重构没坏的东西**：项目处于 V3.0 收尾，优先补完内容和修复 bug，而非大型重构。

---

*文档版本：V3.1*
*最后更新：2026-06-18*
