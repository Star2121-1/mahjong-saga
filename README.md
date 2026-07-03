# 麻将江湖 · Mahjong Saga

一款横版 16:9 麻将主题的浏览器端 Roguelike 生存游戏。纯 CSS 零图片渲染 2.5D 骨雕麻将牌，零依赖双击即玩。

---

## 快速开始

### 直接游玩（推荐）

1. 在项目根目录找到 `index.html`，**双击用浏览器打开**
2. 点击「开始游戏」按钮进入存档选择
3. 按 **F11 全屏**获得最佳游戏体验（16:9 横版战场满屏展开）

> 无需安装、无需 Node.js、无需任何构建工具。纯静态 HTML/CSS/JS，`file://` 协议直接运行。

### 本地服务器（可选）

如需本地服务器模式（方便调试）：

```bash
# Python
python -m http.server 8765

# Node.js
npx serve .
```

然后访问：
- `http://localhost:8765/` — 首页入口
- `http://localhost:8765/pages/s1_save_select.html` — 存档选择
- `http://localhost:8765/pages/s2_main_hub.html` — 大本营
- `http://localhost:8765/pages/s3_gameplay.html` — 直接战斗

### 在线部署

本项目为纯静态文件，可直接部署到 GitHub Pages / Vercel / Netlify 或任何静态文件服务器。

---

## 核心玩法

- **自动战斗 + 走位**：WASD / 方向键 / 虚拟摇杆 / 点击地面移动，角色自动攻击
- **点击攻击**：点击敌人触发普攻/暴击，触发吸血、溅射、冰冻、反伤等效果
- **波次生存**：5+ 波递增敌人，每波最终 Boss 战，击败后三选一圣物/武器升级
- **Boss Lord 三阶段**：弹幕压制 → 瞬移砸地 → 绝命狂暴，每阶段不同行为模式
- **Overdrive 暴走**：怒气满按空格，3 秒冻结全场 + 武器无 CD + 屏幕震颤
- **波次突变**：战斗中随机触发环境异变（血月/枯萎/引力逆转等），3 选 1 适应策略
- **装备构筑**：20+ 装备原型，稀有/史诗/传说品质，词缀随机，套装共鸣触发光环
- **英雄切换**：四英雄（雀圣/一万/九筒/一条），出战牌面颜色与被动技能随英雄改变
- **天赋成长**：局外消耗核心解锁永久天赋，跨局累积进步
- **无尽深渊**：通关后继续挑战，敌人属性指数递增
- **成就系统**：50+ 成就，记录游戏行为与里程碑

---

## 技术栈

- **原生 HTML5 + CSS3 + ES6**：无框架、无构建工具、零图片资源
- **纯 DOM 渲染**：所有图形用 CSS 渐变、阴影、圆角生成
- **2.5D 骨雕麻将牌**：12 层 `box-shadow` 夹心工艺模拟象牙质感
- **响应式缩放**：480×720 基础视口 + `transform: scale()` 自适应任意屏幕
- **Web Audio API**：所有音效程序化合成（拾取/升级/受伤/Overdrive）
- **LocalStorage 持久化**：`cr_meta.json`（永久进度）+ `cr_active_run.json`（断点续玩）
- **模块化架构**：脚本通过 `<script>` 标签按依赖顺序加载到全局 `window`，无 `import`/`export`

---

## 文件结构

```
Click Roguelike/
├── index.html                  # 首页入口（点击跳转到游戏）
├── pages/
│   ├── s1_save_select.html     # 存档选择 / 设置
│   ├── s2_main_hub.html        # 大本营（英雄/天赋/锻造/关卡/变异保险库）
│   └── s3_gameplay.html        # 核心战斗场景
├── css/
│   ├── common.css              # 全局 reset / 动画 / 工具类
│   ├── save_select.css         # 存档页样式
│   ├── main_hub.css            # 大本营样式
│   └── gameplay/
│       ├── gameplay-layout.css      # 战场布局
│       ├── gameplay-player.css      # 玩家角色 / 麻将牌渲染
│       ├── gameplay-enemy.css       # 敌人麻将牌 / Boss / 精英
│       ├── gameplay-overlay.css     # 覆盖层面板
│       ├── gameplay-weapon.css      # 武器槽 / 天命手牌
│       ├── gameplay-effects.css     # 浮动文本 / 爆炸 / 震颤
│       ├── gameplay-ui.css          # HUD 状态栏 / 经验条 / 怒气条
│       └── gameplay-responsive.css  # 响应式断点
├── js/
│   ├── config/
│   │   ├── HeroConfig.js       # 英雄定义（雀/一万/九筒/一条）
│   │   ├── LevelConfig.js      # 关卡定义 + 波次配置
│   │   └── AchievementConfig.js # 成就定义
│   ├── entities/
│   │   ├── Player.js           # 玩家实体、装备聚合、英雄被动
│   │   ├── Enemy.js            # 敌人 AI、Boss Lord 三阶段
│   │   ├── ExpGem.js           # 经验宝石
│   │   ├── Weapon.js           # 6 种神兵 + 弹道
│   │   ├── HeroRegistry.js     # 英雄注册表
│   │   └── EquipmentRegistry.js # 装备原型 + 工厂
│   ├── core/
│   │   ├── GameEngine.js       # 引擎入口（~200 行）
│   │   ├── GameEngine.Boot.js      # 初始化 / DOM 绑定
│   │   ├── GameEngine.NewRun.js    # 新游开始 / 难度选择
│   │   ├── GameEngine.Loop.js      # 主循环 rAF / 状态机
│   │   ├── GameEngine.Spawn.js     # 敌人生成 / 掉落 / 击杀结算
│   │   ├── GameEngine.Combat.js    # 浮动文本 / 爆炸 / 震颤
│   │   ├── GameEngine.Endgame.js   # 胜利 / GAME OVER
│   │   ├── GameEngine.Render.js    # 实体 DOM 同步 / 相机
│   │   ├── GameEngine.Weapons.js   # 武器系统
│   │   ├── GameEngine.Events.js    # 输入处理 / 键盘 / 触摸
│   │   ├── GameEngine.Guide.js     # 新手指引
│   │   ├── GameEngine.Navigate.js  # 页面跳转
│   │   ├── GameSpawner.js        # 委托式敌人生成系统
│   │   ├── GameCombat.js         # 委托式战斗系统
│   │   ├── GameSystems.js        # 委托式系统（Overdrive/突变/共鸣）
│   │   ├── SaveManager.js        # 存档管理器入口
│   │   ├── SaveManager.Core.js       # 核心存档逻辑
│   │   ├── SaveManager.Season.js     # 赛季系统
│   │   ├── SaveManager.Weekly.js     # 周常系统
│   │   ├── SaveManager.Compendium.js # 图鉴系统
│   │   ├── SaveManager.RunStats.js   # 运行统计
│   │   ├── RewardManager.js      # 奖励/圣物/武器面板
│   │   ├── FxManager.js          # 浮动文本对象池（50→200 节点）
│   │   └── AudioManager.js       # Web Audio 音效合成
│   ├── page/
│   │   ├── save_select.js      # 存档页控制器
│   │   └── main_hub.js         # 大本营控制器
│   ├── utils/
│   │   ├── dom-utils.js        # DOM 工具函数
│   │   ├── format-utils.js     # 格式化工具
│   │   └── math-utils.js       # 数学工具
│   └── responsive.js           # 响应式缩放（480×720 → 任意视口）
└── logs/                       # 迭代 epoch 日志
```

---

## 游戏架构

### 页面流程

```
index.html → pages/s1_save_select.html → pages/s2_main_hub.html → pages/s3_gameplay.html
（首页）        （存档选择 / 继续游戏）             （大本营）               （战斗）
```

### 核心全局对象

| 对象 | 文件 | 职责 |
|------|------|------|
| `window.gameEngine` | `GameEngine.js` + 13 子模块 | 主循环、状态机、战斗调度 |
| `window.saveManager` | `SaveManager.js` + 5 子模块 | LocalStorage 读写、元进度持久化 |
| `window.rewardManager` | `RewardManager.js` | 升级/圣物/武器面板 |
| `window.fxManager` | `FxManager.js` | 浮动伤害/治疗/经验文字对象池 |
| `window.audioManager` | `AudioManager.js` | Web Audio 音效合成 |
| `window.heroRegistry` | `HeroRegistry.js` | 英雄定义与切换 |
| `window.equipmentRegistry` | `EquipmentRegistry.js` | 装备原型与实例工厂 |

### 数据持久化

| localStorage 键 | 内容 |
|----------------|------|
| `cr_meta.json` | 永久进度：核心代币、天赋等级、英雄解锁、装备仓库、变异保险库、最高深渊层数、成就进度 |
| `cr_active_run.json` | 当前活跃局：波次、HP、金币、圣物等级、英雄 ID、断点续玩标志 |

### 关键技术实现

- **相机跟随**：指数 lerp `cam += (target - cam) * (1 - exp(-10*dt))`，`#world-layer` 整体 `transform: translate()` 硬件加速
- **碰撞检测**：圆-圆碰撞（子弹/敌人），圆-点 proximity（拾取判定）
- **对象池**：FCT 浮动文本 50 节点起步，动态扩展到 200，避免频繁 create/remove DOM
- **状态机守卫**：`_paused` / `_levelUpPending` / `_overdriveActive` / `_bossLordSpawned` 等标志控制流转
- **时钟冻结**：覆盖层打开时给 `#game-container` 加 `.game-clock-frozen` 暂停所有 CSS 动画，面板内用 `animation-play-state: running !important` 恢复

---

## 核心战斗铁律

1. **防溅射套娃**：溅射伤害禁止再次触发暴击/吸血/溅射/冰冻，只有玩家亲自点击的主目标能作为爆炸源
2. **闪避优先级**：敌人伤害玩家时优先判定 `dodgeRate`，闪避成功全额免疫且不触发反伤/扣血
3. **冰冻加伤**：冰冻敌人受所有伤害 ×1.25，受击后同帧清除 DOM `.frozen` 类名
4. **绿色吸血飘字**：所有生命回复弹出绿色加号浮字（`.damage-float.heal`）
5. **超武暴击反伤继承**：`evolved_armor` 反伤时继承暴击率，触发 2.5 倍暴击反伤
6. **Boss 上限控制**：每波最多 1 个 Boss，防止难度失控

---

## 许可证

仅供学习与交流使用。
