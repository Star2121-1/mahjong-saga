# Epoch 12 — GameSpawner Enemy 引用修复

## 变更摘要

| 文件 | 变更 |
|------|------|
| js/core/GameSpawner.js | +2/-2 行 — Enemy 构造函数引用改为 window.Enemy 兼容 |

## 修复内容

- GameSpawner.js 中 `new Enemy(...)` 改为 `new (window.Enemy || ...) `
- 确保在 GameEngine 加载前 Enemy 类也可用
- 不影响任何功能行为，仅提升加载顺序鲁棒性

## 验证

- 语法检查: 4/4 模块文件 OK
- 括号平衡: 全部 0
