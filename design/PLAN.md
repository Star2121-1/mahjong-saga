# 墨底丹青 落地计划 · PLAN

> 目标：把 `design/` 里定好的视觉系统与 SVG 美术真正装进游戏，让它不再"看起来劣质和普通"。
> 本文件是执行顺序与验收的唯一依据。进度写 `PROGRESS.md`，接手先读它。

## 为什么要干

用户对当前 UI 的评价是「乱七八糟毫无美感」「看起来很劣质和普通」。调研发现**两个独立原因**：

1. **美术是空的** —— 敌人是 CSS 几何体，牌是渐变方块，没有剪影、没有材质、没有水墨质感。
2. **三个真 bug 让界面更残废**（T0 查实，与存档数据无关，每次必现）：
   - `FxManager.js` 早于 `Balance.js` 加载且 self-instantiate → `window.fxManager === undefined`
     → **全部伤害/暴击/治疗飘字永久失效**
   - `GameSystems.js` 早于 `GameEngine.js`，求值时写 `window.GameEngine.prototype` 抛异常
     → 该文件第 145 行后整段丢失 → **突变面板 `showMutatorPanel` 消失**
   - `FxManager.cleanup()` 无条件读 `init()` 才建的 `_freeStack`，而 `Boot.initNewRun` 一开局就调它
     → `[Boot] initialization failed` → **整局 setup 中断**

第 2 类是「坏了没人知道」的静默事故：`GAME_BIBLE.md` 没登记，测试跑不到，文档全绿。
**光修这三个，观感提升就比任何美术改动都明显。**

---

## 我替领导拍的板（领导不在场，按默认值走，明确摆出来）

| 项 | 决定 | 理由 |
|---|---|---|
| 路线 | **留在 2D**，不走 WebGL | WebGL 技术验证已完成（`design/spike-webgl/README.md`）：引擎侧撑得住（200 敌 sim CPU 0.67ms、draw call 恒定 23），但 3D 只会让「敌人无美术」更刺眼，且内置 three.js = 332KB gzip = 全项目代码的 1.5 倍 |
| 美术方案 | **inline SVG**（贝塞尔剪影 + `feTurbulence` 水墨边缘） | SVG 是标记不是文件，不进仓库、不需授权、可程序化派生、能加 CSS 给不了的水墨质感。样张见 `design/foe-art.js` |
| 落地顺序 | 先修 bug → 换肤 → SVG 美术 → 组件 → 大本营 | bug 优先：飘字不修，美术做得再好也白搭（战斗反馈全靠飘字） |
| 改 DOM 结构 | **本轮一律不改** | 现有 class/id 是 762 次提交攒出来的契约。改结构 = 大范围回归。全部改动只碰 CSS，JS 只在必须时最小改动 |
| 范围边界 | 只改 `css/`、`pages/` 的 link 标签、3 个已定位的 bug 点 | 不碰 `Balance.js` 数值、不碰存档 schema、不碰 `GameEngine.Loop.js` 碰撞数学 |
| 性能红线 | s3 实体数与基线持平，`verify.mjs` 必须全绿 | 换肤绝不许换来掉帧 |
| 做不完怎么办 | 如实报告，不许降标准硬凑 | 「没做成但说清了」合格；「做了但更糟」不合格 |

---

## 执行顺序

### T0 · 前提核验与 bug 修复 ✅ 已完成
- [x] 基线取证脚本 `design/audit/baseline.js`（截图 + console 错误 + DOM 钩子清单）
- [x] 自检脚本 `design/audit/verify.mjs`（8 项断言 + 退出码）
- [x] 反向验证：注入 bug → 确认自检变红 → 恢复 → 确认变绿
- [x] 修 bug 1：`pages/s3_gameplay.html` 把 `Balance.js` 提到 `FxManager.js` 之前
- [x] 修 bug 2：`js/core/GameSystems.js:138` 延后绑定 `_endOverdrive`
- [x] 修 bug 3：`js/core/FxManager.js:166` `cleanup()` 防御式补齐 `_pool`/`_freeStack`
- [x] 三页 `verify.mjs` 全绿

### T1 · 接入设计令牌，全局换肤
> **计划已按 T0 实测结果修正。** 原以为 CSS 走 `--mj-*` 令牌层，实测：
> 4000 行 CSS 里 `--mj-*` 只出现 **1 次**；真实情况是 **685 处硬编码 hex + 651 处 rgba、
> 236 种唯一色值、15 种 border-radius**。令牌层是摆设，这才是"乱"的根源。

因此**不改那 4000 行**，改为新增一个**可回滚的覆盖层** `css/theme-mokudan.css`，
在三页最后一个加载，用新令牌重定义高影响表面的取值。删掉一个文件即完全回滚 ——
无人值守时这是唯一安全做法。

- [ ] `css/tokens.css`：从 `design/tokens.css` 复制
- [ ] `css/theme-mokudan.css`：按 §1 覆盖层策略重定义取值
- [ ] 三页在最后一个 `<link>` 后加这两个文件，`?v=20260926A`
- [ ] 圆角统一到 3 档（0 / 2px 弹层 / 3px 牌）
- [ ] **验收**：`node design/audit/verify.mjs` 全绿 + `node design/audit/compare.js` 三页无横向溢出、无对比度回归

### T2 · SVG 敌人美术落地 s3
- [ ] `design/foe-art.js` 的 8 型 + Boss 搬进 `js/entities/` 或 `js/core/`
- [ ] **强制分档**（`UI_SPEC.md` §4.8）：杂兵不加滤镜 / 精英 `numOctaves=1` / Boss 全滤镜
- [ ] **对象池**：复用 DOM 节点，禁止每次生成新 SVG
- [ ] 面纹 + 受光面 + 落影三件套，与 §4.5 单主光方向一致
- [ ] **验收**：`verify.mjs` 全绿 + 200 实体时 `fct-layer` 同级实体数 ≤ 基线 × 1.2

### T3 · s3 组件重做
- [ ] 按钮四态 / 三条（HP·经验·怒气）/ 牌面 / 徽章 / 三选一面板
- [ ] 三选一卡片加「`0 → 新值`」数值预览
- [ ] **验收**：`verify.mjs` 全绿 + 逐屏截图人工比对

### T4 · s2 大本营 + s1 存档页
- [ ] s2 三区（左轨 / 中栏 / 右栏 / 底栏唯一主 CTA）
- [ ] s1 单列竖版，一个主 CTA
- [ ] **验收**：`verify.mjs` 全绿 + 逐屏截图

### T5 · 收口
- [ ] `node design/audit/baseline.js` 重取基线，与 T0 基线对比
- [ ] `PROGRESS.md` 写清做了什么、遗留什么
- [ ] `GAME_BIBLE.md` 补登记这 3 个 bug 与视觉系统路径

---

## 硬约束（违反即不合格）

1. **不许改存档 schema**（`cr_meta.json` / `cr_active_run.json` 结构）
2. **不许改 `Balance.js` 的数值**（战斗手感已调好，改了要重做平衡）
3. **不许改 `GameEngine.Loop.js` 的碰撞数学**（`GRID_SIZE=80` 网格优化已验证正确，sim CPU 只用 0.67ms）
4. **不许引入外部资源**：无 CDN、无字体下载、无图片文件、无 npm 包
5. **不许加 `.skip` / 放宽断言 / `|| true` 来让检查变绿**
6. **三页 `verify.mjs` 必须 0 失败**，且退出码为 0
7. 每完成一个 T，就在 `PROGRESS.md` 追加 ≤5 行

## 命令（全部已亲手跑过）

```bash
python3 -m http.server 8765 &          # 起服务（已在跑）
node design/audit/verify.mjs            # 自检，退出码 0/1
node design/audit/verify.mjs s3         # 只查 s3
node design/audit/baseline.js           # 重取基线（退出码 2 = 有 console 错误）
node design/audit/compare.js            # 与基线对比
```

## 完成条件

- `node design/audit/verify.mjs` 三页全绿、退出码 0
- 三个 P0 bug 有 `GAME_BIBLE.md` 登记条目
- s3 战斗页 200 实体下实体数不超过基线 1.2 倍
- `PROGRESS.md` 如实记录遗留项
