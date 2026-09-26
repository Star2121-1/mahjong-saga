# 麻将江湖 · 项目主文档（GAME BIBLE）

> **本文档是项目唯一常驻参考**，由全部历史文档提取整合而成（2026-08-22）。
> 原始完整文档已移入 `_archive/`，索引见文末。当前活跃设计案：`HUPAI_DESIGN.md`。

---

## 一、项目定位

麻将江湖 · Mahjong Saga —— 浏览器端麻将主题 Roguelike 生存游戏。纯 HTML/CSS/JS，无框架无构建零图片，`file://` 双击即玩。16:9 横版，480×720 基准视口 `transform: scale()` 响应式。

**核心体验一句话**：走位 + 点击攻击 + 武器自动射击 + 波次生存 + 圣物构筑；每一只怪都可能掉牌，每一次进张都让你离"胡"更近一步。

## 二、世界观与视觉基调

> 天地是一张巨大的绿色绒布麻将桌，万物由"万、筒、条、风、箭"五大元炁汇聚而成。未成牌的杂牌化为"妖牌"涌入中原，玩家扮演掌握"绝学胡牌术"的浪人——"雀"，手持纯白骨质麻将牌凑齐天命番型。

### 色板（所有新 UI 必须从此取色）

| 元素 | 颜色 | 色值 |
|------|------|------|
| 战场底色 | 雀坛极境绿 | `#133b26` |
| 牌面 | 羊脂玉象牙白 | `#fbfbf7` |
| 侧边 | 满堂祖母绿 | `#1a5336` |
| 夹层 | 市井竹骨黄 | `#dfc590` |
| 条子/常规 | 竹翠青 | `#1e6f42` |
| 暴击/万字 | 宫墙朱砂红 | `#b62929` |
| 能量/筒子 | 琉璃孔雀蓝 | `#1b4f72` |
| 金色强调 | — | `#ffd700` |
| 危险色 | — | `#ff1744` |

> ⚠️ **2026-09-26 起上表已被 `css/tokens.css` 取代**（R317）。
> 上表是历史值，且实测发现它几乎没被 CSS 真正使用：`css/` 里 `--mj-*` 令牌只出现 **1 次**，
> 真实情况是 **685 处硬编码 hex + 651 处 rgba、236 种唯一色值、15 种 border-radius**。
> 现役规则见 `design/UI_SPEC.md`（语义色契约：朱砂=威胁 / 竹青=状态 / 鎏金=价值 /
> 象牙=牌 / 墨=结构）。新代码一律从 `css/tokens.css` 取色，不要再硬编码。

### 美术工艺

- 2.5D 骨雕麻将牌：12 层 `box-shadow` 夹心模拟象牙质感；米白渐变 `linear-gradient(135deg,#fefcf6,#f5eedc)` + 绿边
- `data-hero` 驱动英雄配色（金/蓝/绿/紫），`data-suit` + `data-type` 驱动敌人牌面字符
- Boss 三级变体：常规(64×80) → 极速(80×100) → 灭世巨神(96×128)
- 零图片资产，禁止引入图片；Web Audio 程序化合成音效

## 三、页面流转与运行

```
index.html（纯落地页）→ pages/s1_save_select → s2_main_hub → s3_gameplay
```

- 本地调试：`python -m http.server 8765`
- 清空存档：删 localStorage 的 `cr_meta.json` 与 `cr_active_run.json`
- 改 JS/CSS 后 hard refresh；HTML 引用带 `?v=时间戳` 缓存戳，三页需保持一致

## 四、技术架构

### 4.1 加载铁律

- 所有 JS 以 `<script>` 按依赖顺序挂载全局 `window`，无 import/export，顺序敏感
- 新增文件必须加入对应 HTML 的 `<script>` 列表，且三个页面版本号一致
- GameEngine 已拆 14 文件，单文件 ≤400 行；基类仅构造函数+单例，子模块以 `Gp.xxx = function(){}` 追加原型
- 新逻辑先检查委托系统是否可复用：`window.SpawnSystem`(刷怪) / `CombatSystem`(飘字掉落爆炸) / `Systems`(Overdrive/突变/共鸣/震颤)

### 4.2 s3 完整加载顺序

```
SaveManager → Core → Season → Weekly → Compendium → RunStats
→ FxManager → AudioManager → RewardManager → Balance
→ GameSpawner → GameCombat → GameSystems
→ EquipmentRegistry → HeroConfig → HeroRegistry → LevelConfig
→ Player → Enemy → ExpGem → Weapon
→ GameEngine → Boot → NewRun → Loop → Spawn → Combat → AchievementConfig
→ Endgame → Render → Weapons → Events → Abyss → Guide → ToastSystem → Navigate
→ main.js → responsive.js
```

### 4.3 全局单例

| 对象 | 职责 |
|------|------|
| `gameEngine` | 主循环、状态机、战斗调度 |
| `saveManager` | localStorage 读写、元进度持久化 |
| `rewardManager` | 升级/圣物/武器/献祭面板 |
| `fxManager` | FCT 飘字对象池（50→200 节点，`_fctActive` 标志防误回收） |
| `audioManager` | Web Audio 音效合成 + 静音 |
| `toastSystem` | 全局 Toast（5 类型 DOM 池 20→100） |
| `heroRegistry` / `equipmentRegistry` | 英雄查找 / 装备原型+工厂 |
| `Balance` | 170+ 数值常量（新增数值必须进 Balance.js，禁止魔法数字） |

### 4.4 UI 层级（s3）

```
#game-container
  #top-bar z50 · #exp-bar z51 · #rage-bar z52
  #battlefield > #world-layer (transform: translate(-camX,-camY))
      fct-layer z10 · player z15 · enemies/coins/gems/projectiles/totems 动态
  #boss-hp-bar z55 · #wave-announce z60 · victory/game-over z60
  #weapon-slot-bar z45 · #hand-tile-bar z46 · joystick z40 · bottom-bar z30
  #reward-overlay z100 · #mutator-overlay z110 · pause/guide z200
```

### 4.5 时钟冻结

`.game-clock-frozen` 暂停容器内一切 CSS 动画；覆盖层用 `animation-play-state: running !important` 豁免。豁免名单：reward / mutator / pause / guide / victory / game-over / boss-gamble / abyss-panel / replace-panel / fct-layer / mutation-toast。**新增面板记得加豁免，否则动画不动。**

### 4.6 关键实现模式

- 相机：指数 lerp `cam += (target-cam)*(1-exp(-10*dt))`，dt 上限 0.05
- 碰撞：圆-圆；穿透弹 `hitEnemies` Set 去重
- 对象池：FCT / Toast / 敌人 / 弹道 / 金币，热路径禁止 create/remove DOM
- Grid 空间分割：图腾 buff GRID_SIZE=80 O(1) 邻域
- 状态守卫：`_paused` `_levelUpPending` `_pendingReward` `_overdriveActive` `_bossLordSpawned` `_loopRunId` 防重入；升级面板优先于波次奖励面板
- 响应式：`--_fs = 1.4/scale` 反比补偿字体缩放；断点 768/600/480/360/ultra-wide

## 五、战斗规则与六大铁律

点击攻击流程：
```
点击敌人 → takeDamage(atk × crit × frozen易伤)
→ FCT飘字 → 暴击2.5x金色 → 冰冻判定(1.25x易伤) → 溅射(50px/50%伤害)
→ 吸血(绿色飘字) → 反伤 → 闪避全额免疫(优先于一切)
```

1. **防溅射套娃**：溅射伤害不得再次触发暴击/吸血/溅射/冰冻，只有玩家亲自点击的主目标可作为爆炸源
2. **闪避优先级**：闪避成功全额免疫，不触发反伤/扣血/无敌帧
3. **冰冻加伤**：`frozen===true` 受所有伤害 ×1.25，受击同帧清除 `.frozen` 类名
4. **绿色吸血飘字**：所有生命回复弹 `.damage-float.heal`
5. **超武暴击反伤继承**：evolved_armor 反伤继承暴击率，2.5 倍暴击反伤
6. **Boss 上限**：每波最多 1 个 Boss

## 六、系统规格速查

### 武器（6 神兵 + 4 超武合成）

| 武器 | 冷却 | atkFactor | 行为 |
|------|------|-----------|------|
| 飞牌切 TrackingBlade | 0.8s | 1.0 | 追踪最近敌人，穿透+3 |
| 三面环伺 OrbitShield | 0.5s | 0.3 | 3 光星 120° 公转 |
| 七对子 ShotgunBurst | 0.4s | 0.6 | 7 发扇形散弹 |
| 碰碰胡 GroundSlammer | 1.8s | 1.5 | 震波圈+击退 |
| 一气贯通 LaserBeam | 0.3s | 1.2 | 300px 射线 |
| 大四喜 NovaPulse | 7.0s | 5.0 | 全屏扩张脉冲 |

超武合成（满级后进奖励池）：天和=暗杠浮标Lv5+清一色≥1 · 地和=杠上开花Lv5+抢杠≥1 · 人和=四风环绕Lv5+抢杠≥1 · 人面兽心=自摸加番Lv5+杠上开花≥3。
武器升级：`atkFactor+=0.15`（上限10）、`cd=max(cdFloor, cd*0.9)`。槽位默认 6（九筒 Mage +1），满槽触发置换面板。

### 敌人 AI

| 类型 | 概率 | 特性 |
|------|------|------|
| Normal | 45% | 直线追踪 |
| Tanker 盾甲 | 20% | 速×0.5 HP×2，正面 180° 减伤×0.5 |
| Stalker 影袭 | 25% | idle→charging(速×2.5/透明0.4/伤×1.5)→fatigue |
| Shaman 死灵萨满 | 10% | 保持 [200,250]px，每 5s 图腾（范围内敌 速×1.3 攻×1.2） |

成长曲线：`HP/ATK = BASE × pow(LEVEL_MULT, level-1) × pow(ABYSS_LOOP_MULT, loopCount)`，SPD=`40+(level-1)*SCALE`。

### Boss Lord 三阶段

- P1 (HP≥70%)：每 1.8s 十二向环形弹幕
- P2 (30–70%)：每 3s 预警圈(0.8s)→瞬移砸地 AOE
- P3 (<30%)：速度×1.8 猩红狂暴 + 每 4s 召唤 Stalker×4/Tanker×2
- 死亡前 Boss 豪赌：贪婪(金币翻倍风险全失) vs 稳健(保底核心收益减半)，10 秒超时自动稳健

### 圣物（10 基础 Lv1-5）

清一色 atk+3/级 · 抢杠 暴击+15%/级 · 暗杠浮标 无人机 · 杠上开花 maxHp+20/反伤+10%/级 · 四风环绕 移速+12%/级 · 自摸加番 吸血+8%/级 · 爆牌圈 溅射+15%/级 · 冰清玉洁 冰冻+10%/级 · 宝牌聚宝 吸附+40/级 · 役牌加算 atk+3/武器攻+20%/冷却-10%/级。
Lv3/Lv5 有 20% 概率掷随机词条（存 `player._relicAffixes`，支持 restore）。

### 其他系统要点

| 系统 | 要点 |
|------|------|
| 波次突变 | 50% 刷怪进度触发一次，Boss 波跳过：血月(敌攻×1.4血×1.3掉落翻倍)/狂乱(敌速+50%金+50%)/引力(磁吸清零)/脆弱(攻+80%受伤+30%)/枯萎(敌每5s损5%HP) |
| Overdrive | 怒气满100按空格：3s 冻结全场+武器无CD+红滤镜+震颤，期间武器伤害×2 |
| 套装共鸣 | 3 件同词条：焰痕(speed_pct)=80px 内每 0.5s atk×0.10 伤害；永冻(ice_bonus)=60px 内每 0.8s 冰冻 |
| 无尽深渊 | Boss 死后 loopCount++，属性 pow(1.08,n)，地图动态扩大，保留构筑重置波次 |
| 献祭 | 升级面板弃圣物换：元代币×3 / 金币50% / 攻+50%(30s) / maxHp+100(30s) / 下波金币翻倍 |
| 秘密图鉴 | 5 组合：龙七对(+10atk)/冰清一刀(爆伤+50%)/花缠枝(反伤吸血)/四风狂飙(移速25%闪避10%)/宝牌引力(吸附+100冷却-15%) |
| 变异保险库 | 通关 20% 解锁新变异，携带使核心掉落 ×pow(2,n) |

### 英雄（HeroConfig.js）

| 英雄 | 费用 | HP/ATK/速/闪避 | 被动 |
|------|------|---------------|------|
| 雀 Hero | 0 | 120/12/200/5% | 攻速+15%，武器冷却-10% |
| 一万 Knight | 30 | 100/10/180/0% | 闪避成功放 100px 震荡波击退 |
| 九筒 Mage | 50 | 160/6/140/0% | 反伤率 5%+等级×5%，上限 50% |
| 一条 Assassin | 100 | 75/16/220/15% | 移速+10%，对冰冻目标×1.5 |

### 关卡（LevelConfig.js）

试炼森林 1200×900/5波/×1.0 · 幽暗回廊 1500×1200/8波/×1.3 · 龙王殿 1800×1500/10波/×1.6 · 无尽深渊动态/∞/+0.5x每层。

### 局外经济

双货币：`bossCores`(结算/每日任务→英雄/天赋/科技) + `metaTokens`(挑战/成就→复活/开局圣物/关卡亲和)。天赋成本 `baseCost*pow(1.3,level)`；科技满级 20；赛季声望转生+通胀防护；登录 streak+补签(makeupTokens)；周常金库；精英模式核心×1.5。

### 装备品质

普通10%/1词条/+5-10% · 稀有40%/1-2词条/+10-20% · 史诗35%/2-3词条/+20-40% · 传说15%/3-4词条/+40-60%。锻造渲染用 `_seen` Set 按 instanceId 去重。

## 七、存档系统

| 键 | 内容 | 写入时机 |
|----|------|---------|
| `cr_meta.json` | 永久进度（核心/代币/天赋/英雄/装备/变异/成就/赛季/周常/图鉴/战局历史/streak） | 升级、结算、保存 |
| `cr_active_run.json` | 断点续玩快照（波次/HP/金币/圣物/英雄ID/isRunActive） | 每波启动、奖励选择后、终局、beforeunload |

校验：DJB-like 哈希 + 写前自动备份 `.bak` + 失败自动回滚 + BOM 处理 + `_migrateMeta()` 字段迁移。导入导出：Blob 下载 / FileReader+Schema 校验，检测活跃对局时覆写拦截弹窗。

## 八、性能约束与红线

1. 全局 window 命名空间，改前先 grep 全项目引用
2. 纯 DOM 渲染，同屏 >50 敌人性能下降——热路径必须对象池
3. localStorage ~5MB 上限
4. `file://` 协议下 File System Access 受限
5. Player/Enemy 实体内部零 DOM 操作，渲染统一走 GameEngine 同步

## 九、已知问题与技术债（2026-08-22 排查 · 同日修复见下表）

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| 1 | 临时 buff 双重递减（过期速度×2） | GameEngine.Loop.js L20-30 与 L147-56 各减一次 dt | ✅ 已修复（删除重复的 Epoch 47 块） |
| 2 | 同名方法靠加载顺序覆盖：restart/_goToSaveSelect/_formatTime(Endgame vs Navigate)、_startNewRun(Boot vs Abyss)、_enterAbyss(Combat vs Abyss)、_triggerKnightDodgeSlam(Combat vs Events) | 多处 | 待收敛 |
| 3 | 错别字 `'暴击反商!'` | Loop.js L165 | ✅ 已修复→`'暴击反伤!'` |
| 4 | 视觉体检发现的错位/粗糙特效 | 见下方"视觉修复记录" | ✅ 第一轮已完成 |
| 5 | main_hub.js 过长(~90KB)、CSS 断点分散 5+ 文件 | — | 低优 |
| 7 | **脚本加载顺序导致 `window.fxManager` 为 undefined → 全部伤害飘字永久失效** | `pages/s3_gameplay.html`：`FxManager.js` 第 7 个脚本、`Balance.js` 第 10 个，而 FxManager 求值时 self-instantiate 并读 `window.Balance` | ✅ 已修复（R317：把 `Balance.js` 提前） |
| 8 | **脚本加载顺序抛异常导致 `GameSystems.js` 145 行后整段丢失 → 突变面板 `showMutatorPanel` 消失** | 同上：该文件第 12 个脚本在求值时写 `window.GameEngine.prototype`，而 `GameEngine.js` 是第 22 个 | ✅ 已修复（R317：延后绑定到 `DOMContentLoaded`。**不能调脚本顺序** —— `GameEngine.js:6-8` 用 `if (window.SpawnSystem)` 守卫，反过来会打断委托链） |
| 9 | **`FxManager.cleanup()` 读未初始化字段 → `[Boot] initialization failed` → 整局 setup 中断** | `js/core/FxManager.js:166`：`_freeStack` 在 `init()` 里初始化，而 `Boot.initNewRun` 开局就调 `cleanup()` | ✅ 已修复（R317：防御式补齐 `_pool` / `_freeStack`） |
| 6 | 无单元测试 | — | 低优 |

### 视觉修复记录（2026-08-22 第一轮，全部截图验证）

| 页面 | 修复内容 |
|------|---------|
| s1 存档页 | 标题 "Click Roguelike"→「麻将江湖」；蓝紫主题→雀坛绿金；新增中發白迷你麻将牌装饰；设置/警告弹窗同步主题化 |
| index.html | 背景统一深绿；同款迷你牌装饰与鎏金标题 |
| common.css | body 背景 #1a1a2e→#081109 |
| s2 统计栏 | 删除重复分隔符；flex 重构+毛玻璃药丸样式（"乱码"实为 11px 小字被缩放糊化） |
| s2 远征面板 | 关卡小药丸→大号骨雕麻将牌网格（4:5 竖版）；选择器垂直居中消除中部空白；详情面板卡片化金边 |
| s3 引导 | `.guide-item` flex→block 修复破折号断行/「雀」漂移；dimExcept=[] 时不再压暗全场（Guide.js）；背板 0.6→0.45；欢迎/结业步骤不压暗；面板金边+玉白文字 |
| s3 手牌栏 | 空槽 ivory 底+金色虚线+内阴影牌背质感 |
| s3 战场 | 暗角 vignette+呢面纹理+中心微光 |

> ⚠️ 调试备忘：http-server 默认缓存会导致改 CSS 不生效（transferSize:0），开发时用 `npx http-server -p 8765 -c-1 --silent` 启动。

## 十、当前工作流

（历史工作流记录见下方保留内容）

---

<details><summary>历史记录</summary>

## 十、当前工作流

### ✅ 2026-08-24 大版本交付：雀魂胡牌系统 + 敌人升级 + 打击感（独立评审 8.5/10 准予交付）

**雀魂系统**：MahjongHand.js（144张标准麻将+牌型检测16断言全过）｜击杀6%掉牌+花牌拾取事件｜14格上阵手牌+听牌角标+清一色进度条｜刻/杠/顺三系增益（万箭齐发/九筒连环9发/疾风连打，杠2.2倍，癞子补顺1.5x）｜字牌7事件｜胡牌演出（冻结+「胡！」书法+清一色/七对/碰碰三番型增益）｜打牌模式（满14未成番型冻结换张，屁胡按D2移除）｜断点续玩快照含手牌
**敌人**：激活无字碑/發财爆竹｜新增一索箭妖（风筝+蓄力骨签）｜盾甲裂纹/影袭拖影/萨满双相图腾(风灵/北冥减速+8s寿命)｜Boss特效包（蓄力齐射/地裂余震/血海沸腾）+深渊三阶变体（赤鳞双旋臂/影武者诱饵/灭世巨神）｜花色掉落倾向
**打击感/布局**：暴击顿帧0.06s｜特效去金化（朱砂飞刃/孔雀蓝电弧/玉白震环）｜玩家放大60×80｜滚轮缩放1.0-1.5x（点击反变换互逆）｜_fs上限3.5修竖屏溢出
**审查修复的重大预存bug**：三处结算恒真守卫（_settleRun/_gameOver/变异解锁）致局外成长整体死代码→序号令牌机制修复并实测落盘｜死亡补偿丢失｜断点恢复手牌UI软锁｜狂乱速度指数爆炸｜波次上限恒停首波｜打牌模式战场输入冻结
**测试**：F1冒烟/F2三分辨率截图/F3模拟操控（WASD/点击/滚轮/Overdrive）/F4攻击测试（1万次注入0错、双胡防重、中途重开、200敌压力=已知DOM墙）/F5独立Agent三轮评审 5.0→6.0→8.5 通过
**遗留**：换牌卡+软加权常量已备未实装(V2)、大三元/十三幺(V2)、纹理贴图接入（采购清单已备：OGA麻将图集CC-BY+TextureCan呢绒CC0）、200敌性能优化（已知DOM墙）

1. **胡牌系统「雀魂」**（进行中）：策划案见 `HUPAI_DESIGN.md`，决策已定稿——掉落+换牌卡 / 手动打牌换张 / 仅本局生效。下一步 MVP 实现。
2. **打击感全面改造**（排队中）：用户确认现状"全都弱"——命中反馈、击杀反馈、震屏、飘字层级、音效层次全部需要加强；胡牌演出将复用同一套冻结/震颤管线。升级面板 "NEW WEAPON UNLOCKED!" 横幅与卡片文字重叠问题在此轮一并处理。
3. **UI 美术精致化**（第一轮已完成 2026-08-22，见第九节修复记录）：s1/index/s2/s3 四页主题统一为雀坛绿金；下一轮候选：s3 HUD 经验/怒气条文字排版、引导面板步骤指示器美化、大本营其余 8 个面板的视觉体检。

### 🔧 2026-08-29 flash/waves 问题排查 + 11领域Agent审查修复（feat/fix-flash-and-waves）

**第一轮（自主排查）发现的 Bug**：
1. **R30-H-010: 波次计数错误** — Spawn.js:57 Boss 被计入 `currentWaveSpawnedCount`，导致提前触发奖励面板。已修复。
2. **H-030: 玩家受击闪烁参数不一致** — Player.js `hitFlashTimer=0.35` 但 Combat.js 归一化分母用 `0.3`。已修复。

**第二轮（11个独立Agent审查）发现并修复的 Bug**：
3. **BUG-9 [P0死锁]**: `_enterAbyss` 未清除 `_discardMode`/`_huLock`，打牌模式进入深渊后游戏永久冻结 → 已修复
4. **BUG-5 [P0高]**: `_tempShieldEnd` 使用墙钟时间 `Date.now()`，面板冻结时护盾意外消失 → 已改为 `this._elapsed`
5. **CSS P0**: `common.css` 断裂的 `@media prefers-reduced-motion` 块 → 已修复
6. **A11y P0**: s3 页面缺失 `aria-live` 区域 → 已添加
7. **CSS P0**: `gameplay-responsive.css` 重复覆盖敌人尺寸 + font-size 裸像素 → 已删除重复定义，改用 `calc(var(--_fs))`
8. **CSS P0**: `.boss-enraged` 双重定义（第525行死代码） → 已删除
9. **Weapon [P1]**: OrbitShield 3 orb 同时冷却无法轮流攻击 → 已错开初始化 `[0, cd/3, cd*2/3]`
10. **A11y [P1]**: `_handleKeyNav` Tab导航 bug（`code==='Tab'`恒为true） → 已修复
11. **Weapon [P1]**: `_tempAspd` 无累积上限可无限加速 → 已添加 `WEAPON_ASPD_CAP: 3.0`
12. **Gameplay [P1]**: `_pendingBossLordSettle` 在升级路径未重置 → 已修复

**Agent审查验证通过（非Bug）**：
- SaveManager.Core.js `_validateImportData` 代码结构正确，审计误报
- Overdrive 计时器双重递减说法有误 — `Sys.updateOverdrive` 从未被Loop调用
- `_renderActiveBuffs` 实际被 Combat.js L387 调用，非死代码
- GameSpawner.js/GameCombat.js 仍加载但有守卫保护，暂不清理

**版本**：v=20260829A（三页HTML同步）

## 十一、文档索引

**根目录常驻**：本文件、`README.md`（快速上手）、`CLAUDE.md`（AI 协作规范）、`HUPAI_DESIGN.md`（胡牌策划案）

**`_archive/` 归档**（历史完整版，需要细节时查阅）：
ENGINE_SPEC.md（引擎规格）· PROJECT_DOCS.md（35章技术文档·最详尽）· HANDOVER.md（移交文档）· SYSTEM_INTEGRITY_REPORT.md（49轮审计终报）· SWARM_AUDIT_PLAN/SWARM_BUG_LOG.md（蜂群审计62条明细）· Mahjong_Saga_GDD_v5.0.md（设计文档）· mahjong_saga_evolution.md（Epoch 1-49 总表）· logs/（各 epoch 迭代日志）· 作品说明.md（比赛提交稿）· 作者的话.txt · Prompt汇总.docx · audit-scripts/（蜂群审计遗留脚本）· legacy-snapshot/（重构期旧代码快照）

---

## 附：2026-09-26 视觉重设计落地（R317）

计划 `design/PLAN.md`，进度 `design/PROGRESS.md`，规范 `design/UI_SPEC.md`。
新增 `css/tokens.css`（令牌）+ `css/theme-mokudan.css`（可回滚覆盖层，三页最后加载）。
自检 `node design/audit/verify.mjs`（8 项断言，退出码 0/1），取证 `design/audit/`。

**做法**：不改那 4082 行既有 CSS，改用最后加载的覆盖层重定义取值 —— 删掉一个文件即 100% 回滚。

**已落地**：战场底改墨底（原 `#2a7348` 明度约 45% 的高饱和绿占屏 90%）；
HUD 改四角锚点（两条横贯 1920px 全屏的进度条改定宽、手牌盒缩到实际牌宽）；
敌人牌面厚度 8 层 `box-shadow` → 2 层并去掉 `data-type` 小字标签；
s2 主 CTA 由「全屏红条」改「限宽鎏金」（红色在语义契约里是「威胁」，用在主行动上是反的）。

**未完成**：敌人动作帧（行走/攻击/受击）仍是静态牌；s2 中部在部分 Tab 下有大片空白
（属 `main_hub.js` 的面板切分逻辑，不是 CSS 能解决的）；`design/spike-webgl/` 的
WebGL 技术验证结论见该目录 README（结论：不采用，瓶颈在美术不在引擎）。
