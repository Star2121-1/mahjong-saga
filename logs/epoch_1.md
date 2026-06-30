# Epoch 1 — 引导增强

## 变更摘要

| 文件 | 变更 |
|------|------|
| `.gitignore` | 新建 — 排除 node_modules, dist, IDE, OS 缓存 |
| `ENGINE_SPEC.md` | 新建 — 横版游戏技术规范文档 |
| `README.md` | 重写 — 麻将江湖主题描述 + 16:9 布局说明 |
| `css/gameplay.css` | +40 行 — context-highlight 脉冲、tile-deliver-in 飞入、guide-nav 导航 |
| `js/core/GameEngine.js` | +273 行 — 引导步骤机、动态高亮/聚焦、手牌交付/存档、2.5D 雀牌渲染 |
| `s3_gameplay.html` | +4 行 — 引导步骤导航按钮 |

## 架构变更

- 新增 `HubTabController._destroyPreviousPanel()` — 严格 cancelAnimationFrame + clearInterval
- 新增 `GameEngine._highlightElement()` / `_dimExcept()` / `_restoreOpacity()` — 上下文聚焦系统
- 新增 `GameEngine._deliverHandTile()` / `_saveHandState()` / `_restoreHandState()` — 手牌交付状态机
- 新增 `GameEngine._defineGuideSteps()` — 4 步引导流程（概览→雀牌→经验→手牌）
- 玩家实体从彩色方块改为 2.5D 骨雕麻将牌「雀」（`#fbfbf7` 牌面 + `#1a5336` 侧边 + `#dfc590` 夹层）
- 敌人从圆形改为 2.5D 骨雕妖牌
- 伤害飘字使用麻将江湖配色（竹翠青/朱砂红）
- 大本营从顶部 tab 栏改为左侧 15% 竹节导航 + 右侧 85% 内容画布
- 响应式基准从 480×720 改为 1920×1080

## 验证

- 语法检查: 18/18 JS 文件 OK
- CSS 括号: 全部平衡
- HTML: 全部闭合
