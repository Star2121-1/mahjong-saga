# Epoch 7 — 模块集成：SpawnSystem/Combat/Systems 代理接入

## 变更摘要

| 文件 | 变更 |
|------|------|
| `js/core/GameEngine.js` | +8 行 — init() 中初始化 SpawnSystem/Combat/Systems，_startNewRun 中 reset SpawnSystem |

## 架构变更

- `GameEngine.init()` 中添加模块代理初始化：
  - `window.SpawnSystem.init(this)` — 绑定引擎引用
  - `this._combat = window.CombatSystem` — 战斗系统引用
  - `this._systems = window.Systems` — 游戏系统引用
- `GameEngine._startNewRun()` 中添加 `SpawnSystem.reset(this)` — 新游戏时重置生成器状态
- 所有委托调用通过 `if (window.XXX)` 守卫，向后兼容无模块环境

## 验证

- 语法检查: OK (brace:0, paren:0)
- Doc-Sync: 无架构变更，无需更新文档
