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

### 公版麻将牌面素材（assets/tiles/）

- **来源**：Wikimedia Commons，作者 Shizhao，**PD-self**（著作权人放弃著作权，可商用免署名）。
- **内容**：42 张 SVG（27 数牌 + 7 字牌 + 8 花牌），`assets/tiles/`，656KB / gzip 138KB。
- **接入方式**：`GameEngine.Spawn.js` 的 `TILE_ART` 表把牌 id 映射到文件名；
  `_addTileToHand` → `_renderHandTiles` 渲染 `<img class="tk-art">`。
- **关键约定 —— 牌面只回答「画什么」，牌体形制完全由 CSS 控制**
  （象牙面 / 厚度 / 受光 / 落影）。所以换主题时形制跟着变，artwork 不用重画。
  这是 `UI_SPEC.md §4.8`「inline SVG 是标记不是文件」的延续。
- **坑**：
  1. 路径必须 `../assets/tiles/`（游戏页在 `pages/` 下，写 `assets/tiles/` 会解析成
     `/pages/assets/...` → 整排牌 404 且**不报错**，img 失败是静默的）。
  2. 公版 SVG 自带白色牌面底 + 一圈深色描边。直接 `object-fit:contain` 塞进象牙牌体
     会变成「牌体里嵌一张带框白卡」的双层框。做法：`.tk-art { transform: scale(1.02) }`
     + `.tile-body { overflow:hidden }` 裁掉自带描边。**不要超过 1.05** ——
     1.12 会把「三萬」的「三」切掉一截。
  3. 表里写 `'0401\u6771\u98a8.svg'` 运行时没问题（浏览器会解转义），但静态自检
     比对的是源码字面量 → 报「缺文件 + 孤儿文件」。**表里一律写字面中文名。**
- **色调**：`--tile-art-filter` 变量控制，当前 `saturate(.62) contrast(1.10) brightness(.94) sepia(.10)`
  （贴合墨底丹青）。想试其他档改这一个变量即可，不用动素材。
- **癞子**：无公版图，走 CSS 紫调。
- **花牌不进手牌**（`_addTileToHand` 里 `isFlower` → `_triggerFlowerEvent` 直接 return），
  8 张花图目前只在 `design/audit/mj-preview/` 预览页使用。
- **自检**：`verify.mjs` 有一项静态断言检查映射完整性 + 孤儿文件（不依赖服务器，很快）；
  `probe-art.mjs` 做浏览器端解码与截图复核。

### s2 右栏「出征准备」常驻（UI_SPEC §7 第三栏）

- **结构**：`#hub-expedition-rail`（400px，absolute）是 `#hub-right-canvas` 的兄弟节点，
  照左轨的成熟做法做绝对定位，不重构 flex 树。画布 `right: 0` → `right: 400px`。
- **为什么要搬**：出征内容原来在中栏 `#panel-expedition` 里，切到「天赋」就整块消失 ——
  而它恰恰是玩家唯一需要反复确认的东西。常驻后切任何面板都在右手边。
- **`#panel-expedition` 的 id 保留**：所有 `getElementById` 绑定与 `refreshLevelCards()` 照常工作。
- **导航**：去掉「血战到底」这一项（9 项 → 8 项 + 返回首页），中栏默认面板改为雀坛。
- **两个坑（都踩过）**：
  1. `HubTabController._currentPanel` 初值曾写成 `'tavern'`，而 `switchTo()` 第一行是
     `if (panelId === this._currentPanel) return;` —— 初值一旦等于 `init()` 想显示的面板名，
     那次调用就被**静默早退**，面板永远不显示（当初 HTML 恰好带 `.active` 才没暴露）。
     现在初值是 `null`，表达「还没显示过任何面板」。
  2. 搬移 HTML 时多留了一个 `</div>` → 解析器提前闭合 `#main-hub-screen` 与 `#hub-right-canvas`，
     8 个 panel 全被弹到 `<body>` 下（`#hub-right-canvas` 里查不到任何 `.hub-panel`）。
     **症状是「中栏整片空白」而不是报错**。教训：改 HTML 结构后必须用浏览器查
     `element.parentElement` 链，别只信 `verify.mjs` 的「无 console 错误」。
- **`refreshHeroCarousel` 的 `isExpedition` 三元已废**：右栏常驻后没有「当前面板是出征」这回事，
  改成「右栏永远刷新 + 雀坛激活时额外刷新它自己的副本」。
- **复活一个死引用**：`#level-detail-panel` 在 JS 里被 `refreshLevelDetail()` 写，
  但 HTML 里从来没这个元素 → 函数每次 early-return。已放进右栏，现在显示
  「关卡名 — 描述 (难度 xN, M波)」。同时删掉两个 `.expedition-preview-card`
  （全项目 grep 无任何 JS 填充，纯死盒子）。
- **右栏 400px 逼出来的布局**（不是审美偏好）：英雄区从「头像|文字|按钮」三栏横排改竖排
  （横排时名字被压成每行一个字）；`#level-cards` 从 flex 横排改单列列表
  （5 张卡平分 400px → 每张 72px →「试炼森林」竖成一列）。
  中文一律加 `word-break: keep-all` 防逐字断行。
- **自检**：`probe-s2.mjs` 量三栏盒子/重叠/内容填充 + 出征端到端进 s3。
  三个探针都已加 `Network.setCacheDisabled` —— 浏览器缓存让改前改后截图完全一样，栽过两次。

### 敌人动作帧（R319）

- **两个动作 + 一个刻意不做的**：
  - `.enemy.moving` → `enemyBob` 走（0.34s 一步，位移 2px）
  - `.enemy.attacking` → `enemyLunge` 攻击前冲（0.19s）
  - 受击**不做** —— `Combat.js:1191` 的 `flashTimer → .flash-hit` 已经是完整方案
    （朱砂红 `::before` 叠加 + `animationend` 自动清理）。
- **关键前提**：`.enemy` 的位置是**内联 `left`/`top`** 写的，不是 transform。
  所以 `transform` 只有 CSS 的 `translate(-50%,-50%)` 居中，完全空闲。
  **每组 keyframes 都必须带上那半个身位的居中**，否则牌子跳到格子左上角。
- **触发点的选法（比动画本身更重要）**：
  - 走路：在 `Enemy.update()` 开头对比上一帧快照。
    不散落到各个 `_update*` —— 散落的话以后新增 AI 一定会漏，而且漏了不报错，
    只是「有的敌人会动有的不会」。
  - 攻击：挂在 `Player.takeDamage(dmg, attacker)` 的 `attacker` 上。
    **第一版挂在 Enemy.update 里推断 `attackTimer` 跳变，实测从不触发** ——
    各 AI 分支重置 attackTimer 的方式不一致（置 cooldown / 继续递减 / 被外部改回 0 都有）。
    `attacker` 语义唯一确定：「这个敌人刚打中玩家」，且 5 个攻击点全部经过这一行。
  - 受击：第一版也加了 `hit-react`，被 `flashHit` 盖掉，等于纯死代码，
    而且那个类**永不移除**（累积脏状态）+ 每次受击 `void offsetWidth`
    强制回流（热路径同步布局）。已删。**受击动画不要重复造。**
- **CSS 顺序即优先级**：`.shatter-anim`（死亡碎裂）必须排在 bob/lunge **之后**，
  否则同优先级取后者 → 走/攻击动画会顶掉死亡碎裂（受击→死亡常在同一帧）。
  实际生效优先级：受击 `flashHit` > 攻击 `enemyLunge` > 走 `enemyBob` > 死亡 `enemyShatter`
  （死亡时其它 class 已被移除）。
- **临时 class 必须自动清理**：`attacking` 沿用既有 `flash-hit` 的 `animationend` 模式，
  否则永久挂着 → 以后任何 `.enemy.attacking` 的背景/描边规则都会被误触发。
- **自检**：`probe-enemy.mjs` 用 `animationstart` 事件统计 + 直接调
  `player.takeDamage(1, 敌人实例)` 验证 lunge（等敌人自然走过来要十几秒且不稳定）。

### 主题层结构（R321）：单文件 → 6 个按关注点分层

`css/theme-mokudan.css`（906 行）拆成 6 个模块，**规则内容与相对顺序一字未改**：

| 文件 | 行数 | 内容 |
|---|---|---|
| `theme/01-foundation.css` | 71 | 令牌落地、圆角统一、焦点环、砍辉光、等宽数字、减弱动效 |
| `theme/02-overlay.css` | 16 | 弹层表面（全项目唯一允许的「墨玻璃」配方） |
| `theme/03-battlefield.css` | 238 | 进度条、敌人血条、飘字、状态威胁、战场底、HUD 布局 |
| `theme/04-enemy.css` | 65 | 敌人牌面 |
| `theme/05-hub.css` | 353 | s2：主 CTA、左轨、右栏常驻 |
| `theme/06-hand.css` | 187 | 天命手牌：牌面、花色、数牌拆分、公版 artwork |

- **加载顺序 = 原文件的节顺序**，所以层叠结果不变。三页各 6 个 `<link>`，版本号统一。
- **`theme-mokudan.css` 已删除** —— 保留一份能逐字节重建的副本等于留两个真理源，
  下次改完必然只改一份。

#### 等价性是怎么证明的（不能只靠「看起来没变」）

1. 脚本校验：所有片段按原始行号拼回去与原文件**逐字节相同**（34824 字节）。
2. `shoot-all.mjs` 拍 12 个固定状态（s1 + s2 八个 tab + s3 战斗 + s3 手牌），
   全部关闭动画/过渡再截。改动前后 **9 个状态逐字节相同**。
3. `s3-play` 本身就不可复现（刷怪/粒子随机）—— 先验证「同一份代码连拍两次」的结果，
   确认哪些状态能当判据、哪些不能，再谈 diff。
4. `s3-hand` 起初差 0.89%（maxd 36），但**同会话受控实验下 6 模块与单文件 0 像素差**
   → 差异来自截图前点过 8 个 tab 的会话状态，与拆分无关。

#### 切分时踩的坑（症状：规则在，却不生效，且零报错）

把某节的注释**开头行**切给了上一个文件，于是留下悬空注释文本：

```
   21. s2 右栏「出征准备」常驻（UI_SPEC §7 第三栏）
   ...
   ══════ */
#hub-right-canvas { right: 400px !important; }
```

CSS 解析器把 `21. s2 … */ #hub-right-canvas` 整段当成**一个选择器的前缀**，
于是 `right: 400px` 挂在一个不存在的元素上。表现是画布宽度差 400px（右栏没让位）。

**教训**：「无 console 错误」和「规则写在文件里」都不能证明规则生效。
定位这类问题用 `design/audit/stylediff.mjs` —— 同会话内两套 CSS 各取一次全量计算样式
再对比，直接列出「哪个元素的哪个属性被谁覆盖」。比读 900 行 CSS 快一个数量级。

### 程序化关卡 `level_procedural`（R321 修好「入口失效」+「卡重复」）

两个都是既有缺陷，只是之前没人点那张卡：

- **入口失效**：`refreshLevelDetail()` 靠 `cfg.isProcedural` 走程序化分支
  （用 `proceduralLevelGenerator.generate(abyssLevel)` 现算名字/难度/波数），
  而 `LevelConfig.level_procedural` **没设这个标记** → 永远掉进普通分支，
  显示静态 name/desc：不管深渊层数是多少，界面情报完全一样。
  现在显示「程序裂隙 · 第 1 层 — 深渊层数 x1，难度系数 x1.00 (难度 x2.00, 15波)」。
- **卡重复**：`level_procedural` 既是 `levelConfig` 的 key（循环会渲染一张），
  `buildLevelCards` 下面又追加一张带层数的专用 `procCard` → 右栏两张同名卡。
  现在循环里 `if (cfg.isProcedural) continue;` ——
  **用标记判定而不是硬编码 id**，否则以后再加程序化关卡会又漏一次。

**教训**：这两个 bug 都不会报错。「进不去」和「多一张卡」都是纯视觉/交互问题，
只能靠探针点一下看结果 —— `probe-s2.mjs` 现在会点每张卡并断言详情跟着变。

### 边界条件守卫：暂停/导航/商店必须出现在计时器守卫链里（R322）

r311 审计报告复核后的固化经验。这类 bug 的共同特征：**不报错，只是「状态悄悄变了」**。

- **自动存档 ↔ 导航**：`Navigate._goToSaveSelect` 是
  `await _autoSave('nav') → clearActiveRun()`。若 tick 存档与它并行，
  tick 可能把 active_run 又写回去、或反过来被清掉 —— **两种都是丢玩家进度**。
  修：`Loop.js` 的 tick 存档条件加 `&& !this._navSaving`。
- **深渊商店**：商店会 `_freezeClock()`，但计时器守卫链里没有 `_abyssShopVisible`
  → 玩家在商店里翻页时怒气悄悄流走、wither 继续结算。
  修：overdrive 与 wither 守卫都加 `&& !this._abyssShopVisible`。
- **Boss 赌博超时**：同文件的 interWave 超时本来就查 `gameOver` / `_paused`，
  赌博超时漏了 → 玩家在 10 秒窗口内死亡后，超时照样生成 Boss Lord
  并 `_unfreezeClock() + _beginLoop()` **把已结束的对局重新拉起来**。
  修：补两个守卫；暂停时改为 1 秒后重试而不是直接放弃。
- **相机 snap 阈值**：`dt` 被 cap 在 0.05，snap 阈值却是 0.048 —— 只差 2ms，
  等于 19.2fps 就开始 snap，玩家看到的是「持续抖动」而不是「卡顿时跳一下」。
  修：0.048 → 0.0495，只让真正撞上 cap 的帧 snap。
- **守卫链的通用形状**：任何「冻结/暂停」类状态都要同时出现在
  *存档*、*overdrive 计时*、*mutator 结算*、*深渊 combo 激活* 四处守卫里。
  漏一处的表现都是静默的。新增这类状态时按这四处一起改。

### 审计报告的正确用法（R322 方法论）

r311 报告写于一个月前，逐条核对后：**3 条 P0 里 2 条已过时、6 条 P1 里 1 条是误报**。
过时条目共同特征是「报告描述的代码在写出来时就已经不是那样了」。

所以处理审计报告的顺序是：**先逐条核对当前代码 → 再决定改不改**。
报告的价值在于指出「该查哪里」，不在于「该改什么」。
照单全收会引入「修复」——比如给 P1-2 那种基于错误并发模型的建议加代码。

### 视口架构：「@media 断点在本项目里是失效的，而且这是对的」（R322）

**先看实测数据**（`design/audit/probe-viewport.mjs`）：

| 视口 | 容器布局尺寸 | transform |
|---|---|---|
| 1920×1080 | **1920×1080** | 无 |
| 1366×768 | **1920×1080** | scale(0.711) |
| 1024×768 | **1920×1080** | scale(0.533) |
| 390×844 | **1920×1080** | scale(0.203) |

`responsive.js` 把容器 `width/height` 钉死成 `BASE_W × BASE_H`（s1=480×720，
s2/s3=1920×1080），只用 `transform: scale()` 适配。**布局永远按基准尺寸计算。**

而源 CSS 里那些 `@media` 断点是按**真实视口**判断的。视口 1366 时断点触发 →
去缩小一个马上要被整体缩到 0.711 的画布里的元素 = **双重缩小，严格更差**。

**结论：不要去「修好」这些断点。** 主题覆盖层里 15 个选择器上的 `!important`
恰好把它们压死了（副作用，但结果正确）：

```
#player-hp-text / #rage-bar-text  font-size
#hub-top-nav                     gap / padding
#hub-top-nav .nav-item           padding / font-size
#hub-expedition-rail .expedition-previews  grid-template-columns
… 共 15 处
```

**踩过的坑**：我先写了个探针断言「断点应该有效」，结果它报红，我一度以为发现了
主题层压死响应式的 bug。实际结论完全相反 —— 该断点是双重缩小。探针前提错了，
所以删掉重写成守「固定画布」这个真正的不变量：

- 一旦有人把容器改成流式布局（尺寸随视口变），那些 `@media` 会**同时**
  变成正确且关键，15 处 `!important` 就都必须重新评估。探针会变红提醒这件事。
- 一旦有人为了「修好响应式」去掉那些 `!important`，画面会明显变小。
  `css/theme/01-foundation.css` 头部写了警告注释，防止下一个人再犯。

### 新手教学死锁（R323 修复 —— 新档此前**完全玩不了**）

**症状**：新档进战斗页后卡死在引导第 2 步，「下一步」按钮永久禁用，整个游戏动不了。
玩家报「根本玩不了」。

**根因是结构矛盾，不是笔误**：
- `_showGuide()` 调 `_freezeClock()` 并且**不启动游戏循环**（`running = false`）
- 引导第 2/4 步的门控条件 `_guideHits` / `_guideGemsPicked`
  **只在 `GameEngine.Loop.js:459` / `:452` 自增**

也就是：**引导在等一个「只有游戏循环才产生的状态」，而它自己关掉了游戏循环。**
实测卡死态：`冻结=true running=false 敌人数=0 elapsed=0`。
移动那一步能过（按键处理不依赖循环），之后就永久卡住。

**修法三处**：
1. **步骤顺序**：原来第 2 步就要求「拾取宝石」（需要击杀），而「攻击」到第 4 步才教 ——
   在教攻击之前就要求靠攻击达成。已把「攻击」挪到「拾取」之前。
2. **`needsGameplay: true`**：给需要真实玩法的步骤打标记，`Guide.js` 的 `_showGuideStep`
   为这些步骤解冻并启动循环（`_beginLoop` 内有三重守卫，重复调用安全）。
3. **60 秒兜底**：交互式步骤超时强制推进。引导把「下一步」按钮硬禁用（防跳过，R199-P1），
   所以条件一旦永不满足玩家就彻底动不了 —— **教学卡死比偶尔跳过严重得多**，
   必须在代码层面留兜底。正常情况下不会触发。

**为什么所有既有门禁都没发现**：
- `verify.mjs` 只检查 `window.Balance` / `fxManager` 这类符号**存在**，不检查「能不能玩」
- `probe-playthrough.mjs` 当时也用 `_completeGuide()` **直接跳过了教学**

→ 新增 `design/audit/probe-guide.mjs`：**唯一不允许用 `_completeGuide()` 走捷径的探针**，
真的按 WASD、点敌人、走位把教学打通。教学这类「流程断了但没报错」的问题，
只有这种端到端模拟才抓得到。

**注意**：最后一步是 `autoAdvance`，但守卫是 `stepIndex < steps.length - 1`，
所以**最后一步不自动过**，设计上要玩家点「完成出征 ✓」。这是预期行为，不是 bug。

### R323：靠「用眼睛看」抓出来的三个 bug（测量全绿，肉眼才发现）

这三个都是**数值断言全过、只有看画面才暴露**的问题。教训：
**探针只能证明「某个量对不对」，证明不了「画面长什么样」。**
必须有一条「真的玩 + 截图 + 人眼过」的流程。

#### 1. 升级奖励：免费却标价格，且能死锁（P0）

- `_selectReward` 里判定是对的：`if (!isFree && relic.cost > 0) player.addGold(-relic.cost)` —— 免费时**不扣钱**。
- 但**卡面显示完全没看 `isFree`**：
  - `costHtml = '💰 ' + relic.cost` → 免费奖励上标着「💰 20」，和标题「升级奖励（免费）」自相矛盾
  - `canAfford = relic.cost === 0 || player.gold >= relic.cost` → **金币不够就把按钮 `disabled`**
- 后果：金币低于最便宜圣物价时按钮全禁用 → 面板点不掉 → `_levelUpPending` 卡住循环
  → **整个游戏死锁**（玩的时候真撞到了）。
- 修：免费时 `costHtml = '🎁 免费'`、按钮「免费领取」、`canAfford = isFree || …`；
  点击处理也加 `!isFree` 守卫，否则「按钮能点但点了没反应」。

#### 2. 怒气条被手牌条完全压住（P0，自己 R317 埋的）

`theme/03-battlefield.css` 把怒气条设成 `left:50%; bottom:78px; width:520px`，
而手牌条也在底部居中 —— 实测两者几何**完全包含**：

| | x | y | 尺寸 | z |
|---|---|---|---|---|
| 怒气条 | 700–1220 | 986–1002 | 520×16 | 22 |
| 手牌条 | 564–1357 | 952–1020 | 793×68 | 40 |

手牌条 z 更高 → 怒气条本身不可见，只有 `#rage-bar-fill` 的
`0 0 12px rgba(255,23,68,.55)` 亮光晕从半透明槽位里透出来，
**看起来像一条发光金带从手牌中间穿过**（截图确认）。

后果不只是难看：**玩家看不到怒气存量**，而引导却在教「怒气满时按空格放 Overdrive」。

修：移到左下 `left:40px; width:480px`（手牌条左边缘 x=564，左侧是空的；摇杆在右下）。

#### 3. 武器栏压在暂停按钮上（83px 重叠，文字互压）

R317 主题层把武器栏设成 `right:16px; bottom:16px`（右下角），但右下角已被占两处：
`#pause-btn` x1821-1904、`#joystick` x1796-1896。武器栏落在 x1753-1904，
与暂停按钮**重叠 83px**，「飞牌切 Lv.1 1s 1/6」和「⏸ 暂停」互相压字糊成一团。

修：移到左下、怒气条正上方（武器栏 y955-980 / 怒气条 y986-1002，两行不重叠）。

#### 4. 摇杆是纯白圆圈，且桌面端常驻

`rgba(255,255,255,.08)` 底 + `2px solid rgba(255,255,255,.35)` 边框，和墨底丹青不像一家人；
而且**全项目没有任何触摸检测**，桌面端（鼠标 + WASD）右下角也常驻一个手机虚拟摇杆。

修：换成墨底 + 鎏金描边；并加 `@media (hover:hover) and (pointer:fine) { display:none }`
—— 有真鼠标就隐藏（移动靠 WASD / 点击地面）。触摸笔记本 `pointer:coarse` 不成立，仍会显示。

#### 5. 三个奖励卡背面朝上 —— 那是预期的错峰翻牌，不是 bug

第一次看截图以为「2 张卡没翻开」。查 CSS 才发现方向是对的：
`.card-front` 自带 `transform: rotateY(180deg)`，
所以**未翻 = 背面、翻过 = 正面**，代码按 0/100/200ms 错峰加 `.flipped`。
截图恰好抓到中间态。**先读 CSS 再下结论，否则会把正常行为当 bug 修。**

#### 排查手法（可复用）

1. `document.elementFromPoint()` 逐槽取元素链 —— 排除「外来元素盖在上面」
2. 再扫「与该区域重叠 **且** 有 box-shadow / filter / 渐变」的所有元素 —— 这次就是靠它
   找到 `#rage-bar-container` 的
3. 量几何 + z-index，判断谁压谁

### HUD 布局回归门（`design/audit/probe-hud.mjs`）

R323 的三处 P0（怒气条被压住、武器栏压暂停按钮、免费奖励死锁）**数值断言全绿**，
只有看截图才发现。所以加了一条专门守 HUD 的门禁：

- 遍历**有文字的叶子节点**，两两检测矩形交叠 > 4×4px 即报错
- 关键区块（怒气条/武器栏/手牌条/暂停/摇杆/计时）两两检测重叠
- 判定口径刻意收窄以免误报：同一父容器内的兄弟不算、祖先/后代关系不算、
  撑满的 `#time-display` 不参与区块比较

**另外**：`probe-guide` 原来用固定迭代次数等敌人，敌人冷启动慢时同一份代码时绿时红 ——
已改成截止时间驱动，连跑 3 次稳定。**flaky 的门禁比没有门禁更糟**，会让人不再相信它。

### 终局五主线验证（R323，`design/audit/probe-endgame.mjs`）

此前所有探针只覆盖「进得去、动得了」，**这五条一次都没被自动化验证过**。结论：**全部无 bug**。

| 路径 | 结论 |
|---|---|
| **胡牌判定** | 判定矩阵 8/8：七对子/清一色/碰碰胡 正例正确；普通牌型、13 张不满、空手牌 反例正确返回 null；混花七对子、字牌七对子也正确 |
| **胡牌触发** | 「胡！」砸屏 + 手牌脉冲 + `_huLock` 加锁 + 番型增益（qiduizi→闪避 0.2）全部到位 |
| **Boss 三阶段** | 血量 100%→phase1、60%→phase2、30%→phase3，class 同步切 `phase-2`/`phase-3` |
| **胜利结算** | 画面出现、统计正确、按钮齐全 |
| **失败结算** | 画面出现、`gameOver=true`、`running=false`、时钟冻结 |
| **深渊** | `loopCount` 递增、程序化生成器按层数给不同难度（第 4 层 x2.66 / 第 10 层 x4.72）、深渊中死亡结算正常 |

#### 三条容易踩的「不是 bug」

1. **胡牌后手牌被清空** —— `Spawn.js:807`「清手牌重开一轮收集」是**设计行为**。
   我第一版断言「手牌仍为 14」直接误报。
2. **s3 里没有 toast** —— `toastSystem` 刻意只在 s2 加载（CLAUDE.md 有约束），
   所以 `_triggerHu` 里的 `toastSystem.success()` 在战斗页是 **no-op**。
   胡牌反馈靠「胡！」砸屏 + 手牌脉冲 + 增益。想加 toast 属于「给 s3 接入 toastSystem」这个独立任务。
3. **首次通关没有「🌀 继续挑战」按钮** —— 文案写「再次击败最终BOSS可进入无尽深渊轮回」，
   首次通关不给入口是设计如此。
4. **胡牌给的是本局增益，不是胜利** —— `_triggerHu` 只加永久 buff；
   真正的胜利条件是打完所有波次击败 Boss Lord。

#### 探针设计教训（我在这上面浪费了三轮）

- **胡牌判定必须在喂给引擎之前测**：触发后手牌被清空，事后测只会得到 null。
- **失败结算必须独立会话测**：串在「把引擎改得面目全非」的前置步骤之后测不出来（失败），
  单独跑完全正常。**每条终局路径都该有自己的干净会话。**
- **`takeDamage` 会被无敌帧静默吃掉**：`player.invulnTimer > 0` 时伤害无效，
  前面的战斗环节很容易留下它 → 这一击被吞 → 误判成「结算坏了」。
  测试致命一击前必须 `invulnTimer = 0`。

### R324：真实游玩挖出的两个 P0（门禁全绿也照样存在）

这一轮的教训一句话：**「能进得去、能动得了」和「游戏能玩完」是两件事。**
前面十个探针全部只验证前者。

---

#### P0-1 Overdrive 一用就废掉这局

`Sys.endOverdrive = function(engine) { if (!engine._overdriveActive) return; ... }`

**所有调用点都是 `this._endOverdrive()`**（Loop.js:532 / Combat.js:363,749 /
Endgame.js:208 / SaveManager.Core.js:541）—— 也就是把 `this` 当第一个参数传，
而签名要的是 `engine`。于是 `engine` 恒为 `undefined`，第 2 行直接抛 TypeError，
错误被主循环 try/catch 吞成「Game loop error」**每帧刷屏**。

后果比报错严重：抛在 `engine._overdriveActive = false` **之前**，所以
**Overdrive 永远不会结束** —— 敌人速度永久停在 0、特效永不消失、
`_overdriveTimer` 归零后每帧重试。实测：3 秒的 Overdrive，4.5 秒后
`active` 仍为 true、敌人速度仍为 0；真实游玩 45 秒刷出 **256 条**同款错误。
**用过一次 Overdrive，这一局就废了。**

**为什么绑定的是坏版本**：`GameSystems.js` 是 s3 第 12 个脚本、`GameEngine.js` 是第 22 个，
所以 `window.GameEngine` 当时不存在 → 走**延后绑定**（`DOMContentLoaded`）→
把 `Sys.endOverdrive` 写回原型，**覆盖掉 `Events.js` 里正确的 `Gp._endOverdrive`**。
这和 R317 修的三个加载顺序 bug 是同一类，我修了三个漏了这个。

**为什么所有门禁都没抓到**：
- `verify.mjs` 只断言 `typeof _endOverdrive === 'function'` —— 坏函数也是 function
- 只有怒气真正攒满、Overdrive 真正触发才会走到这条路径 —— 之前的探针从没打到

修法：`engine = engine || this`，同时接受两种调用约定。

#### P0-2 生成计数器从不自增 → 敌人无限刷 + 波次永不推进 + 游戏无法通关

`Ss._spawnEnemy`（`GameSpawner.js:124`，真正的刷怪路径）**从头到尾没有自增任何计数器**。
那句 `if (!enemy.isBoss) this.currentWaveSpawnedCount++;` 还留在**一个没人调用的旧
`spawn()`** 里（第 249 行）—— 刷怪路径迁移时落下了。

**一个根因，三个后果**：
1. `GameSpawner.js:126` 的 cap 守卫读的就是这个计数器 → 永不触发
   → **敌人无限刷新**（实测同屏敌 6→12→持续增长，从不清空）
2. `GameEngine.Loop.js:701` 的波次推进门要求
   `currentWaveSpawnedCount >= _getWaveEnemyMax()`（level_1 = 20），而引擎那份也是 0
   → **波次永不推进 → Boss 不出现 → 游戏无法通关**
3. `Loop.js:233` 的突变触发条件是 `currentWaveSpawnedCount > 0` → 恒为 false
   → **血月/狂乱/引力/脆弱/枯萎 5 个突变在正常游玩中从未出现过，是死内容**

修法：在 `_spawnEnemy` 里同时自增两份计数（spawner 那份给 cap 守卫，
engine 那份给波次门与突变触发）。修复后实测：计数正常爬升并在 cap 处停住、
同屏敌稳定、突变首次能触发、第 1 波能推进到第 2 波。

#### 连带影响：两个探针需要跟着改

- `probe-guide` 变 flaky：突变以前从不触发，修复后会在教学期间弹面板并冻结时钟。
  已加 `dismissMutator()`，连跑 3 次稳定。
- `probe-realplay` 也要处理突变面板，否则表现为「游戏时间不走」。

#### 还没做到的

`probe-realplay` 想让机器人**从第 1 波打到第 3 波**，但我写的战斗 AI
打不中移动中的敌人（点过去时坐标已失效），45 秒才攒到 2 点经验。
`probe-progression` 改用引擎的击杀路径清场，能推进到第 2 波，
但 `enemy.takeDamage()` 在脚本注入的大伤害下没走完整死亡流程，尸体仍留在数组里。

**所以「连续多波的真实节奏」目前仍未被自动化验证** —— 这是测试工具的限制，
不是已知的产品缺陷。**需要你实际玩一下确认波次能正常推进到 Boss。**
