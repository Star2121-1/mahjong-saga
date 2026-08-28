# 麻将江湖 · Mahjong Saga — 项目概览文档

> 本文档为项目的完整概览，涵盖游戏设计、技术架构、开发历程与当前状态。
> 最后更新：2026-08-28 | 版本：v=20260827S

---

## 一、项目简介

**麻将江湖（Mahjong Saga）** 是一款横版 16:9 麻将主题的浏览器端 Roguelike 生存游戏。

- **零依赖**：纯 HTML + CSS + JavaScript，无框架、无构建工具、零图片资产
- **双击即玩**：`file://` 协议直接打开，无需服务器（推荐 `python -m http.server 8765` 调试）
- **纯 DOM 渲染**：所有视觉用 CSS 渐变与 `box-shadow` 层叠模拟 2.5D 骨雕麻将牌质感
- **LocalStorage 持久化**：永久进度 + 断点续玩双存档机制
- **响应式缩放**：480×720 基准视口，`transform: scale()` 自适应任意屏幕

### 核心体验

> 走位 + 点击攻击 + 武器自动射击 + 波次生存 + 圣物构筑；每一只怪都可能掉牌，每一次进张都让你离"胡"更近一步。

---

## 二、世界观与视觉风格

### 世界观

> 天地是一张巨大的绿色绒布麻将桌，万物由"万、筒、条、风、箭"五大元炁汇聚而成。未成牌的杂牌化为"妖牌"涌入中原，玩家扮演掌握"绝学胡牌术"的浪人——"雀"，手持纯白骨质麻将牌凑齐天命番型。

### 色板

| 元素 | 颜色 | 色值 |
|------|------|------|
| 战场底色 | 雀坛极境绿 | #133b26 |
| 牌面 | 羊脂玉象牙白 | #fbfbf7 |
| 侧边 | 满堂祖母绿 | #1a5336 |
| 夹层 | 市井竹骨黄 | #dfc590 |
| 条子/常规 | 竹翠青 | #1e6f42 |
| 暴击/万字 | 宫墙朱砂红 | #b62929 |
| 能量/筒子 | 琉璃孔雀蓝 | #1b4f72 |
| 金色强调 | — | #ffd700 |
| 危险色 | — | #ff1744 |

### 美术工艺

- **2.5D 骨雕麻将牌**：12 层 `box-shadow` 夹心模拟象牙质感，米白渐变 + 绿边
- **英雄配色**：`data-hero` 驱动（金/蓝/绿/紫四种边框与光晕）
- **敌人牌面**：`data-suit` + `data-type` 驱动字符与颜色
- **Boss 三级变体**：常规(64×80) → 极速(80×100) → 灭世巨神(96×128)
- **零图片资产**：禁止引入图片；Web Audio 程序化合成音效

---

## 三、页面流转

```
index.html（纯落地页）
    ↓ 点击「开始游戏」
pages/s1_save_select.html（存档选择 / 设置）
    ↓ 选择存档或新建
pages/s2_main_hub.html（大本营 — 10 个面板）
    ↓ 点击「轰然出征」
pages/s3_gameplay.html（核心战斗场景）
```

### 大本营面板（s2）

| Tab | 功能 |
|-----|------|
| 雀坛招勤 | 英雄展示与切换（4英雄） |
| 牌浪洗练 | 天赋树（10+天赋，消耗核心升级） |
| 百宝牌筐 | 装备检阅 / 仓库 / 词缀祭坛 |
| 血战到底 | 关卡选择 + 出征按钮 |
| 变异保险库 | 携带变异（Boss核心掉落翻倍） |
| 武器图鉴 | 6种神兵 + 协同圣物参数 |
| 雀理坛 | 成就系统（25+） |
| 战绩统计 | 全局数据统计 |
| 历史记录 | 每局结算摘要 |

---

## 四、核心玩法

### 战斗操作

| 操作 | 方式 |
|------|------|
| 移动 | WASD / 方向键 / 虚拟摇杆 / 点击地面 |
| 攻击 | 点击敌人（触发普攻/暴击/吸血/溅射/冰冻/反伤） |
| Overdrive | 怒气满 100 时按空格 — 3秒冻结全场 + 武器无CD + 屏幕震颤 |
| 暂停 | Esc / 右上角按钮 |

### 波次系统

- 递增波次敌人，每波最终 Boss 战
- 50% 刷怪进度触发**波次突变**（5选1环境异变）
- 最终波 Boss Lord 三阶段：弹幕压制 → 瞬移砸地 → 绝命狂暴
- Boss 死亡前触发**豪赌**：金币翻倍 vs 核心保底

### 波次突变

| 突变 | 效果 |
|------|------|
| 血月 | 敌人攻击×1.4 / HP×1.3 / 掉落翻倍 |
| 狂乱 | 敌人速度+50% / 金币+50% |
| 引力 | 经验石磁吸清零 |
| 脆弱 | 攻击+80% / 受伤+30% |
| 枯萎 | 敌人每5s损失5%HP |

### 圣物系统（10 基础 + 4 传说超武）

**基础圣物**（Lv.1-5，升级时三选一）：
清一色(攻+3)、抢杠(暴+15%)、暗杠浮标(无人机)、杠上开花(HP+反伤)、四风环绕(移速+12%)、自摸加番(吸血+8%)、爆牌圈(溅射+15%)、冰清玉洁(冰冻+10%)、宝牌聚宝(吸附+40)、役牌加算(攻+武器攻+冷却-)

**传说超武**（满级圣物合成解锁）：天和 / 地和 / 人和 / 人面兽心

### 武器系统（6 神兵）

| 武器 | 冷却 | 行为 |
|------|------|------|
| 飞牌切 TrackingBlade | 0.8s | 追踪最近敌人，穿透+3 |
| 三面环伺 OrbitShield | 0.5s | 3光星120°公转 |
| 七对子 ShotgunBurst | 0.4s | 7发扇形散弹 |
| 碰碰胡 GroundSlammer | 1.8s | 震波圈+击退 |
| 一气贯通 LaserBeam | 0.3s | 300px射线 |
| 大四喜 NovaPulse | 7.0s | 全屏扩张脉冲 |

### 英雄系统（4 英雄）

| 英雄 | 费用 | HP/ATK/速/闪避 | 被动 |
|------|------|---------------|------|
| 雀（Hero） | 0 | 100/10/100/5% | 攻速+15%，武器冷却-10% |
| 一万（Knight） | 30核心 | 120/8/90/5% | 闪避成功释放100px震荡波击退 |
| 九筒（Mage） | 50核心 | 80/14/110/5% | 武器槽+1，cdFloor降低 |
| 一条（Assassin） | 100核心 | 70/12/130/15% | 移速+10%，对冰冻目标×1.5 |

### 雀魂胡牌系统（进行中）

- **144张标准麻将**：数牌108 + 字牌28 + 花牌8
- **掉落管线**：普通怪6%掉落 + 精英硬锁主花色 + Boss必掉癞子（上限3）
- **14格上阵手牌**：刻子=即时爆发 / 顺子=本局永久成长
- **字牌事件**：东(击退眩晕) / 南(灼烧) / 西(减速) / 北(冰冻) / 中(全屏冲击) / 发(金币雨) / 白(清弹幕回血)
- **花牌事件**：春(回血) / 夏(攻速) / 秋(金币) / 冬(冰冻) / 梅兰竹菊(强化)
- **胡牌番种**：屁胡 / 七对子 / 碰碰胡 / 清一色 / 大三元(V2) / 十三幺(V2)
- **听牌提示**：角标 + 进展文字 + 清一色进度条

### 局外经济

- **双货币**：bossCores（结算/每日任务→英雄/天赋）+ metaTokens（挑战/成就→复活/开局圣物）
- **天赋树**：10+麻将主题天赋，局外永久解锁
- **赛季系统**：声望转生、赛季重置、每日/每周挑战
- **登录奖励**：连续登录天数递增，支持补签

---

## 五、技术架构

### 加载顺序（s3 核心页面）

```
CSS: common.css → gameplay-layout → gameplay-player → gameplay-enemy
     → gameplay-overlay → gameplay-weapon → gameplay-effects → gameplay-ui → gameplay-responsive

JS:  SaveManager → Core → Season → Weekly → Compendium → RunStats
     → FxManager → AudioManager → RewardManager → Balance
     → GameSpawner → GameCombat → GameSystems
     → EquipmentRegistry → HeroConfig → HeroRegistry → LevelConfig
     → Player → Enemy → ExpGem → Weapon
     → GameEngine → Boot → NewRun → Loop → Spawn → Combat
     → AchievementConfig → Endgame → Render → Weapons
     → Events → Abyss → Guide → ToastSystem → Navigate
     → main.js → responsive.js
```

### 模块分工

| 目录 | 文件 | 职责 |
|------|------|------|
| `core/` | `GameEngine.js` (~130行) | 构造函数、状态标志、DOM引用、原型委托桩 |
| `core/` | `GameEngine.Boot.js` | 初始化、DOM绑定、键盘/摇杆/音频、冻结/解冻 |
| `core/` | `GameEngine.NewRun.js` | 新局设置、默认武器、手牌初始化 |
| `core/` | `GameEngine.Loop.js` | 主rAF循环、状态机、临时buff、无人机、图腾、突变、死亡处理、相机lerp |
| `core/` | `GameEngine.Spawn.js` | 敌人生成、击杀奖励、装备掉落、金币/宝石拾取、波次推进 |
| `core/` | `GameEngine.Combat.js` | 浮动文字(FCT)、爆炸、屏幕震颤 |
| `core/` | `GameEngine.Endgame.js` | 胜利、GAME OVER、Boss Lord结算 |
| `core/` | `GameEngine.Render.js` | 实体DOM同步、相机、武器渲染 |
| `core/` | `GameEngine.Weapons.js` | 武器更新循环、弹道管理 |
| `core/` | `GameEngine.Events.js` | 波次间事件、突变面板、Overdrive、Boss豪赌、暂停 |
| `core/` | `GameEngine.Guide.js` | 新手引导覆盖层 |
| `core/` | `GameEngine.Navigate.js` | 页面跳转、存档/读档导航 |
| `core/` | `GameSpawner.js` | 委托式敌人生成系统 |
| `core/` | `GameCombat.js` | 委托式战斗系统 |
| `core/` | `GameSystems.js` | 委托式系统（Overdrive/突变/共鸣/枯萎） |
| `core/` | `SaveManager.js` | localStorage读写、元进度持久化 |
| `core/` | `SaveManager.Core.js` | 校验和、备份回滚、导入导出、迁移 |
| `core/` | `SaveManager.Season.js` | 赛季系统、声望转生、通胀防护 |
| `core/` | `SaveManager.Weekly.js` | 周常金库挑战 |
| `core/` | `SaveManager.Compendium.js` | 武器/圣物图鉴发现跟踪 |
| `core/` | `SaveManager.RunStats.js` | 单局与累计统计 |
| `core/` | `RewardManager.js` | 升级面板、圣物/武器选择、秘密图鉴、献祭、置换面板 |
| `core/` | `FxManager.js` | FCT浮动文字对象池（50→200节点） |
| `core/` | `AudioManager.js` | Web Audio API合成音效 + 静音 |
| `core/` | `ToastSystem.js` | 全局Toast通知（5类型，DOM池） |
| `entities/` | `Player.js` | 玩家状态、装备聚合、英雄被动、圣物效果 |
| `entities/` | `Enemy.js` | 敌人AI、Boss Lord状态机、冰冻/反伤 |
| `entities/` | `ExpGem.js` | 经验宝石拾取 |
| `entities/` | `Weapon.js` | 武器基类 + 6种武器 + 弹道 |
| `config/` | `Balance.js` | 170+数值常量集中管理 |
| `config/` | `HeroConfig.js` | 4英雄定义 |
| `config/` | `LevelConfig.js` | 关卡定义 + 波次配置 |
| `config/` | `AchievementConfig.js` | 成就定义 + 检测 |
| `page/` | `main_hub.js` | 大本营控制器（10个tab） |
| `page/` | `save_select.js` | 存档选择控制器 |
| `utils/` | `dom-utils.js` | DOM辅助函数 |
| `utils/` | `format-utils.js` | 时间/字符串格式化 |
| `utils/` | `math-utils.js` | 数学工具函数 |

### 全局单例

| 对象 | 职责 |
|------|------|
| `window.gameEngine` | 主循环、状态机、战斗调度 |
| `window.saveManager` | localStorage读写、元进度持久化 |
| `window.rewardManager` | 升级/圣物/武器面板 |
| `window.fxManager` | FCT飘字对象池 |
| `window.audioManager` | Web Audio音效合成 |
| `window.toastSystem` | 全局Toast通知 |
| `window.heroRegistry` / `equipmentRegistry` | 英雄/装备注册表 |
| `window.Balance` | 170+数值常量 |
| `window.SpawnSystem` / `CombatSystem` / `Systems` | 委托代理 |

### 数据持久化

| localStorage键 | 内容 |
|---------------|------|
| `cr_meta.json` | 永久进度：核心代币、天赋等级、英雄解锁、装备仓库、变异保险库、最高深渊层、成就进度、赛季/周常/每日、登录streak、战局历史 |
| `cr_active_run.json` | 当前活跃局：波次、HP、金币、圣物等级、英雄ID、断点续玩标志 |

---

## 六、关键技术实现

| 技术点 | 实现方式 |
|--------|---------|
| 相机跟随 | 指数lerp `cam += (target-cam)*(1-exp(-10*dt))`，dt上限0.05 |
| 碰撞检测 | 圆-圆（子弹/敌人），圆-点（玩家/敌人proximity） |
| 对象池 | FCT浮动文本50→200节点动态扩展，Toast20→100，热路径禁止DOM create/remove |
| 空间分割 | Grid GRID_SIZE=80，O(1)邻域查找替代O(n×m)遍历 |
| 状态守卫 | `_paused` / `_levelUpPending` / `_pendingReward` / `_overdriveActive` / `_bossLordSpawned` 防重入 |
| 时钟冻结 | `.game-clock-frozen` 暂停所有CSS动画；覆盖层用 `animation-play-state: running !important` 豁免 |
| 响应式缩放 | `--_fs = 1.4/scale` 反比补偿字体；断点768/600/480/360/ultra-wide |
| 存档校验 | DJB-like哈希 + 写前自动备份.bak + 失败回滚 + BOM处理 |
| 武器渲染 | `_initDefaultWeapons()` → `_syncWeaponSlots()` + `_renderWeaponSlots()`，面板关闭后重渲染 |

---

## 七、战斗铁律

1. **防溅射套娃**：溅射伤害不得再次触发暴击/吸血/溅射/冰冻，只有玩家亲自点击的主目标可作为爆炸源
2. **闪避优先级**：闪避成功全额免疫，不触发反伤/扣血/无敌帧
3. **冰冻加伤**：`frozen===true` 受所有伤害×1.25，受击同帧清除 `.frozen` 类名
4. **绿色吸血飘字**：所有生命回复弹出绿色加号浮字（`.damage-float.heal`）
5. **超武暴击反伤继承**：`evolved_armor` 反伤继承暴击率，触发2.5倍暴击反伤
6. **Boss上限控制**：每波最多1个Boss

---

## 八、关卡设计

| 关卡 | 地图尺寸 | 波次数 | 难度系数 |
|------|---------|--------|---------|
| 试炼森林 | 1200×900 | 5 | ×1.0 |
| 幽暗回廊 | 1500×1200 | 8 | ×1.3 |
| 龙王殿 | 1800×1500 | 10 | ×1.6 |
| 无尽深渊 | 动态扩大 | ∞ | ×1.0 +0.5^n 每层 |

### 敌人类型

| 类型 | 占比 | 特性 |
|------|------|------|
| Normal | 45% | 直线追踪 |
| Tanker 盾甲 | 20% | 速×0.5 HP×2，正面180°减伤×0.5 |
| Stalker 影袭 | 25% | idle→charging(速×2.5/透明0.4/伤×1.5)→fatigue |
| Shaman 死灵萨满 | 10% | 保持[200,250]px，每5s放置图腾（范围内敌速×1.3攻×1.2） |

---

## 九、开发历程

### 版本号演进

- v=20260701 → 初始版本（单文件GameEngine.js 2326行）
- v=20260822 → 架构重构（GameEngine拆分为14文件，引入委托系统）
- v=20260825-27 → UI/UX视觉大改 + 胡牌系统MVP
- v=20260827S → 当前版本（武器槽渲染修复 + BOM编码修复 + 目录精简）

### 主要里程碑

| 日期 | 里程碑 |
|------|--------|
| 2026-07-01 | 初始原型（单文件，基础战斗循环） |
| 2026-08-22 | 架构重构（14文件拆分，委托系统，Game Bible定稿） |
| 2026-08-24 | 胡牌系统「雀魂」MVP交付（独立评审8.5/10） |
| 2026-08-27 | s2大本营视觉大改（竹简导航+宣纸卡片+红色封条出征） |
| 2026-08-28 | 目录精简 + 武器槽渲染修复 + 完成版整理 |

### 已修复的关键Bug

| # | 问题 | 修复方案 |
|---|------|---------|
| 1 | 存档校验和不对称（每次读档静默回滚旧档） | 修复 `_computeChecksum()` 逻辑 |
| 2 | file://双击直玩断链 | index.html 增加跳转逻辑 |
| 3 | 武器同名重复追加 | `_addWeapon()` 改为升级已有武器 |
| 4 | 战场宽度0px（flex+transform已知问题） | 显式设置 `#battlefield width:100%` |
| 5 | 武器槽初始化时为空 | `_initDefaultWeapons()` 补充 `_renderWeaponSlots()` |
| 6 | 奖励面板关闭后武器槽被覆盖 | `RewardManager.hidePanel()` 增加重渲染 |
| 7 | HP文字在低视口过小（9px） | 媒体查询改为 `calc(11*var(--_fs)*1px)` |
| 8 | HTML文件UTF-8 BOM导致file://加载失败 | 移除BOM，统一编码 |

---

## 十、当前状态

### 版本信息

- **当前版本**：v=20260827S
- **文件总数**：86个项目文件（不含.git/.claude）
- **总大小**：约 29 MB
- **活跃分支**：`feat/fix-flash-and-waves`

### 项目结构

```
Click Roguelike/
├── index.html              # 首页入口（麻将主题 Landing）
├── pages/                  # 3个HTML页面
│   ├── s1_save_select.html
│   ├── s2_main_hub.html
│   └── s3_gameplay.html
├── css/                    # 11个样式文件
│   ├── common.css
│   ├── main_hub.css
│   ├── save_select.css
│   └── gameplay/           # 7个模块化战斗样式
├── js/                     # 44个JS模块
│   ├── core/               # 引擎核心（GameEngine拆分14文件）
│   ├── entities/           # 实体（Player/Enemy/Weapon等）
│   ├── config/             # 配置（Balance/Hero/Level等）
│   ├── page/               # 页面控制器
│   └── utils/              # 工具函数
├── 参考素材/               # 22个设计参考文件
├── GAME_BIBLE.md           # 项目主文档（架构/规则/数据表）
├── HUPAI_DESIGN.md         # 胡牌系统策划案
├── CLAUDE.md               # AI协作规范
└── README.md               # 快速上手
```

### 运行方式

```bash
# 本地服务器（推荐调试）
python -m http.server 8765

# 然后访问
http://localhost:8765/              # 首页
http://localhost:8765/pages/s1_save_select.html   # 存档选择
http://localhost:8765/pages/s2_main_hub.html      # 大本营
http://localhost:8765/pages/s3_gameplay.html      # 直接战斗

# 或直接双击 index.html（file:// 协议）
```

### 待办事项

| 优先级 | 事项 | 说明 |
|--------|------|------|
| P0 | 换牌卡系统 | 保底2次/局的换牌机制（已备常量，待实装） |
| P1 | 花牌事件完整实现 | 春/夏/秋/冬/梅/兰/竹/菊（8种事件） |
| P1 | 大三元/十三幺 | V2番种（已设计，待实现） |
| P2 | 关卡主题视觉 | 4关卡差异化呢绒色调+边框纹样+环境粒子 |
| P2 | 美术素材接入 | OpenGameArt麻将图集 + TextureCan呢绒CC0 |
| P3 | 性能优化 | 200敌DOM墙已知限制，待WebGPU/Canvas迁移 |

---

## 十一、设计文档索引

| 文档 | 用途 |
|------|------|
| `GAME_BIBLE.md` | 项目主文档（架构/铁律/数据表/已知问题） |
| `HUPAI_DESIGN.md` | 胡牌系统策划案 v2.1 |
| `CLAUDE.md` | AI协作规范（模块地图/加载顺序/编辑指南） |
| `README.md` | 快速上手指南 |

---

*本文档由 AI 助手自动生成，基于项目代码与历史文档提取整合。*
