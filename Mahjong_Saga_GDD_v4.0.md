# 🀄 麻将江湖 (Mahjong Saga) - 横版全景游戏设计与开发全规范 v4.1

---

## 🌌 一、 世界观设定与核心意象 (GDD - The Lore)

### 1. 故事背景：乾坤雀坛，血战到底
在这个名为“雀坛”的里江湖中，天地是一张巨大的绿色绒布麻将桌[cite: 1]。世间万物皆由“万、筒、条、风、箭”五大元炁汇聚而成。
近来，雀坛边缘发生“死牌异变”，无数未成牌、流局的杂牌化为“妖牌”涌入中原[cite: 1]。玩家扮演的是江湖中最后一个掌握“绝学胡牌术”的浪人——**“雀”**，手持一张纯白骨质麻将牌[cite: 1]，要在漫天妖牌的围剿中，一边割草击杀，一边凑齐自己的“天命番型”（十三幺、大三元），逆天改命。

### 2. 视觉美学：横版国风 vs 2.5D赛博骨雕
*   **屏幕横宽定调**：由原竖版彻底全面升级为 **横版 $16:9$（固定宽高比或自适应视口）**，展现大开大合的宏大割草战场。
*   **画风与光影**：低饱和度的浓墨国风，融合现代2.5D骨雕拟物视觉[cite: 1]。光线永远斜射在麻将牌的侧切面上，在宽屏上展现出象牙白、竹骨黄与祖母绿的阶梯纵深[cite: 1]。

---

## 🎨 二、 核心色彩看板 (Color Palette Spec)

| 角色/元素 | 颜色名称 | 十六进制色值 | 纯 CSS 应用场景 |
| :--- | :--- | :--- | :--- |
| **战场底色** | 雀坛极境绿 | `#133b26` | 游戏主画布、铺了绒布的横版麻将桌质感[cite: 1] |
| **牌身正面** | 羊脂玉象牙白 | `#fbfbf7` | 麻将牌面、玩家实体、按钮高亮态[cite: 1] |
| **牌身侧边** | 满堂祖母绿 | `#1a5336` | 麻将牌的 3D 厚度阴影、高档UI边框[cite: 1] |
| **过渡夹层** | 市井竹骨黄 | `#dfc590` | 牌身 2.5D 侧面的 0.5px 夹心层[cite: 1] |
| **常规/条子** | 竹翠青 | `#1e6f42` | 条子牌、常规文本、防御系技能[cite: 1] |
| **暴击/万字** | 宫墙朱砂红 | `#b62929` | 万字牌、主角“雀”字、伤害数字、暴击特效[cite: 1] |
| **能量/筒子** | 琉璃孔雀蓝 | `#1b4f72` | 筒子牌、能量条、Overdrive 状态[cite: 1] |

---

## 🧱 三、 纯 CSS 麻将牌渲染标准 (.mj-tile)

*   **去资产化渲染**：严禁使用外部图片资产[cite: 1]。玩家“雀”牌、敌人牌身、大本营卡片，必须完全使用纯 CSS（Grid, Flexbox, box-shadow, 伪元素）搓出 2.5D 骨雕质感[cite: 1]。
*   **3D 叠层工艺**：
    *   `background: #fbfbf7` (羊脂玉牌面)[cite: 1]。
    *   利用 `::before` 伪元素构建中间 `0.5px` 的 `#dfc590`（市井竹骨黄）夹层[cite: 1]。
    *   利用多重 `box-shadow` 压出底层的 `#1a5336`（满堂祖母绿）厚度感与桌面投影[cite: 1]：`box-shadow: 0 4px 0 #1a5336, 0 8px 10px rgba(0,0,0,0.5)`。
*   **内部布局**：牌面花纹（筒、条、万）及文字一律使用 **CSS Grid / Flexbox** 居中对齐，确保在横屏及高 DPI 屏幕下绝对锐利[cite: 1]。

---

## 🏠 四、 大本营（江湖茶馆）横版重构与解耦架构

### 1. 左右分栏横向平铺 (Flex-Direction: Row)
为彻底杜绝老版本组件冲突导致的界面冻结（Frozen）顽疾，大本营采用**左右物理隔离分栏**：
*   **左侧导航栏 (Width: 15%)**：固定式垂直导航栏，外观采用暗色调竹节造型，高度 100vh 锁定，切换 Tab 时自身静止不变，极省渲染性能。
*   **右侧内容画布 (Width: 85%)**：核心功能卡片承载区。内部元素全面拥抱横向流式布局，使用 CSS Grid 自动换行：`grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`，所有卡片在宽屏上精美平铺。

### 2. Tab 功能解构
*   **Tab 1：【雀坛招募】 (Hero Tavern)**：消耗局外代币“金点棒”招募并切换不同的“雀士”化身。
    *   *剑客·九莲宝灯*：初始携带“一条”飞剑，攻击为直线穿透剑气。
    *   *狂浪浪人·十三幺*：身背13把断刀，攻击为周身环绕的无死角刀气，极其适合割草。
    *   *医者·大三元*：牌面为中、发、白，每隔10秒在地面生成一个治愈法阵。
*   **Tab 2：【牌浪洗练】 (Blacksmith Forge)**：局外天赋养成（摸牌速度-减CD、听牌直觉-加暴击、杠牌硬气-加防）。
*   **Tab 3：【百宝牌箩】 (Inventory & Codex)**：查看已解锁的番型、装备的江湖秘宝。
*   **Tab 4：【血战到底】 (Stage Select)**：选择横版战斗关卡（如：【川麻血战里江湖】、【广麻推倒胡荒原】）。
*   **Tab 5：【雀理乾坤】 (Settings)**：纯静态的音频、画质调节账簿面板。

### 3. 内存回收与切换动效
*   **清理解绑**：切换 Tab 时，必须在底层数据流中彻底解绑、销毁上一个页面的帧循环（`cancelAnimationFrame`）和定时器（`clearInterval`）[cite: 1]。
*   **3D翻牌特效**：右侧当前内容执行 `transform: rotateY(-90deg)` 向后翻转隐藏。随后新页面的内容卡片按次序触发 `rotateY(0deg)` 翻转，产生一列新牌在宽屏桌面上整齐“啪啪啪”拍开的惊艳效果。

---

## ⚔️ 五、 局内战斗横版核心心流（Battle Loop）

### 1. 横版战场布局与“天命手牌槽”
*   **主战场**：锁定 `aspect-ratio: 16 / 9` 的宽阔宏大区域，玩家在中心，妖牌从四周如潮水涌入[cite: 1]。
*   **天命手牌槽（核心横版重构）**：
    *   采用 `position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); width: 80%;` 布局。
    *   14 个手牌槽位在**屏幕正下方一字排开**。利用 CSS Grid 划分为 14 列，玩家摸到的肉鸽技能牌以 2.5D 写实麻将形式整齐码放，视觉冲击力极强。
*   **状态条**：血条、怒气值、Overdrive 能量条全部横向延展，紧贴屏幕左上角。

### 2. “手牌肉鸽”数理映射
传统的割草游戏升级是选被动技能；【麻将江湖】升级是**“摸牌”**！
*   局内杀敌升级时，屏幕中央弹出 3 张牌，玩家选择一张吃进底部的 14 手牌槽。
*   *凑齐顺子*（如三、四、五筒）：激活技能 **【连环飞筒阵】**（向前方疯狂抛射弹跳的蓝色圆圈）。
*   *凑齐刻子*（如三张红中）[cite: 1]：激活大招 **【朱砂爆裂斩】**（全屏敌人发生爆炸并被刻上红中印记）[cite: 1]。
*   *完美听牌并胡牌*：进入 10 秒的 **Overdrive（役满暴走）状态**，全屏进入黑金滤镜，所有武器攻击无 CD。

### 3. 实体与粒子规范
*   **玩家实体 (Player)**：一张 2.5D “骨雕质感”麻将牌，中心刻有宫墙朱砂红汉字——**“雀”**[cite: 1]。
*   **敌人实体 (Enemy)**：四周涌入的暗淡灰绿妖牌阵（东、南、西、北、幺九牌）[cite: 1]。
*   **代币/拾取物**：敌人死后掉落**“骨质点棒”**或**“铜筹码”**，作为升级经验值。
*   **伤害飘字**：普通伤害为绿色“竹翠青”数字[cite: 1]，暴击伤害为巨大的朱砂红汉字（如：“拾伍”、“叁佰”）[cite: 1]。
*   **割草特效表现 (Agent 自由发挥区)**：开放给 Agent 结合 Canvas 粒子或纯 CSS 动画自主演进。重点在“点棒筹码震荡流”与“硬核断骨剑气流”之间进行算法微调，以追求极致的多巴胺回馈为第一指标。

---

## 🖼️ 六、 `agnes-image` 专属横版图像生成蓝图 (Prompt Guideline)

### 1. 工业结构化提示词公式标准
> **Style**: 2.5D Isometric, Modern Chinese Ink Art combined with hyper-realistic bone-carving textures, low saturation, dramatic cinematic lighting, widescreen 16:9 aspect ratio.
> **Key Elements**: Traditional Mahjong tiles (Ivory white face, emerald green back), Chinese calligraphy, ink splashes, point sticks, wooden teahouse textures.
> **Color Palette**: `#133b26` (Jade green), `#fbfbf7` (Ivory), `#b62929` (Vermilion red).
> **Quality**: Ultra-detailed, 8k, game splash art, horizontal composition.

### 2. 官方指定横版生成场景名录
*   **场景 1：游戏横版登录/加载界面插图 (16:9)**
    *   *Prompt*: `An epic game splash art, 16:9 widescreen, 2.5D isometric view. A lone Chinese wuxia rogue holding a glowing ivory-white mahjong tile carved with the word "雀" (Sparrow). Surrounding him are fragments of floating shattered mahjong tiles with ink splash effects. Background is a dark mysterious teahouse covered in dark green velvet fabric. Cinematic rim light, masterpiece.`
*   **场景 2：【雀坛招募】Tab 横版平铺背景图 (16:9)**
    *   *Prompt*: `A cinematic background for a martial arts tavern, 16:9 panoramic view. In the center, a dark red wooden table stretching horizontally. On the table, several sets of exquisite mahjong tiles neatly arranged. Soft warm candlelight, shadows of swordsmen in the background, stylized ink wash painting style, UI-ready.`
*   **场景 3：战斗胜利（胡牌）大横屏结算图 (16:9)**
    *   *Prompt*: `A triumphant victory screen illustration for a game, 16:9 aspect ratio. A massive golden Chinese calligraphy character "胡" bursting out from a pile of emerald-green mahjong tiles in a wide horizontal explosion. Thousands of vintage bone point-sticks and copper coins exploding into the air like fireworks. High contrast, hyper-detailed, vermilion red and gold sparks.`

---

## 🤖 七、 Claude Code (Agent) 高精密全自动重构提示词

将下方提示词直接喂给 Claude Code，启动高稳定度的全自动 Loop 开发循环：

```text
角色：资深前端架构师、游戏引擎架构专家。
任务：根据最新的横版游戏规格，将当前竖版 Demo 彻底重构为 16:9 横版布局的【麻将江湖】主题，并彻底重构大本营状态机。

请挂起 Loop 自动执行循环，严格遵守以下【运行规则】，直至触发【终止条件】，并产出【明确输出】。

============================================
⚙️ 第一部分：AGENT 运行规则 (Execution Rules)
============================================
1. 原子级分步修改：严禁一次性重构所有文件。必须按照以下顺序单步推进：
   └─ Step 1: 修改全局 CSS 容器，将主画布锁定为横版比例（aspect-ratio: 16/9），并实现左(15%)右(85%)分栏的大本营布局。
   └─ Step 2: 重构大本营 Tab 切换逻辑，加入 3D 翻牌动画，并编写手动的内存清理逻辑（严格销毁 cancelAnimationFrame 与 clearInterval）。
   └─ Step 3: 重构局内 UI，将 14 个手牌槽位改造成在屏幕底部横向一字排开的 CSS Grid 布局。
   └─ Step 4: 将玩家“雀”牌、敌人实体、伤害飘字全部改为纯 CSS 2.5D 骨雕夹心质感渲染。
2. 实时编译与容错：每修改完一个 Step，必须立即自动运行项目构建/编译命令或启动本地 Headless 浏览器检查布局。如果发现语法错误或 CSS 样式塌陷，必须立刻回滚并原地修复，禁止带着 Bug 进入下一个 Step。

============================================
🛑 第二部分：终止条件 (Termination Conditions)
============================================
当且仅当以下所有条件同时满足时，方可终止 Loop 循环：
1. 零编译错误：项目 Lint 检查与 Webpack/Vite 编译完全通过（0 Errors, 0 Warnings）。
2. 16:9 响应式断言：主画布在 1920x1080、1440x900 和 1280x720 分辨率下，均无任何 DOM 元素溢出（Overflow-x/y 均为无意外滚动条）。
3. 状态机死锁测试：连续在 5 个 Tab 之间快速高频切换 20 次以上，控制台未报任何“undefined pointer”或“canvas context lost”错误，且前一个 Tab 的帧循环计数器归零（完全被销毁，无 clock-frozen 现象）。
4. 性能指标：在 Headless 环境下模拟 200 个敌人同屏，渲染帧率平稳保持在 55-60 FPS 之间。

============================================
📦 第三部分：输出内容规范 (Expected Outputs)
============================================
在完全成功并准备结束 Loop 时，请在终端控制台打印一份结构清晰的【重构战报】，包含以下内容：
1. [修改文件清单]：列出所有被修改的 HTML、CSS、JS 文件路径。
2. [架构变更对比说明]：简述你是如何清除旧主题图片资产、如何通过代码重构彻底解决布局冻结（Frozen）顽疾的。
3. [横版布局节点数据]：提供底部 14 手牌槽、左侧导航栏、局内 16:9 画布的最终 CSS 关键核心属性代码片段。
4. [性能与稳定性断言]：声明测试结果（Tab 切换清理验证、高频同屏 FPS 压测数据）。

收到上述军令请立即启动 Loop，开始重构第一步！
```