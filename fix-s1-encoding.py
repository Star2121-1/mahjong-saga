#!/usr/bin/env python3
"""Fix double-encoded Chinese in s1_save_select.html"""

import re

with open('/home/gtax/Click Roguelike/pages/s1_save_select.html', 'rb') as f:
    raw = f.read()

# Known correct text (as UTF-8 bytes)
CORRECT = {
    'btn-continue': '继续游戏'.encode('utf-8'),
    'btn-import': '导入本地存档'.encode('utf-8'),
    'warning-h2': '确认开始新征程'.encode('utf-8'),
    'warning-desc': '此操作将清除所有进度（科技树、英雄解锁、核心货币、当前战局），创建一个全新的独立存档。是否先导出备份当前存档？'.encode('utf-8'),
    'warning-overwrite': '确认新建（将清除现有存档）'.encode('utf-8'),
    'title': '麻将江湖 - 选档'.encode('utf-8'),
}

text = raw.decode('utf-8')

# 1. btn-continue
idx = text.find('id="btn-continue"')
if idx >= 0:
    gt = text.find('>', idx)
    lt = text.find('</button>', gt)
    text = text[:gt+1] + '继续游戏' + text[lt:]
    print("Fixed btn-continue")

# 2. btn-import
idx = text.find('id="btn-import"')
if idx >= 0:
    gt = text.find('>', idx)
    lt = text.find('</button>', gt)
    text = text[:gt+1] + '导入本地存档' + text[lt:]
    print("Fixed btn-import")

# 3. warning h2
idx = text.find('id="save-warning-overlay"')
if idx >= 0:
    h2_idx = text.find('<h2>', idx)
    if h2_idx >= 0:
        gt = text.find('>', h2_idx)
        lt = text.find('</h2>', gt)
        text = text[:gt+1] + '确认开始新征程' + text[lt:]
        print("Fixed warning h2")

# 4. warning-desc
idx = text.find('class="warning-desc"')
if idx >= 0:
    gt = text.find('>', idx)
    lt = text.find('</p>', gt)
    text = text[:gt+1] + '此操作将清除所有进度（科技树、英雄解锁、核心货币、当前战局），创建一个全新的独立存档。是否先导出备份当前存档？' + text[lt:]
    print("Fixed warning-desc")

# 5. overwrite button
idx = text.find('id="btn-warning-overwrite"')
if idx >= 0:
    gt = text.find('>', idx)
    lt = text.find('</button>', gt)
    text = text[:gt+1] + '确认新建（将清除现有存档）' + text[lt:]
    print("Fixed overwrite button")

# 6. title
text = text.replace('点击肉鸽 - 选档', '麻将江湖 - 选档')
print("Fixed title")

with open('/home/gtax/Click Roguelike/pages/s1_save_select.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("\nAll fixes applied!")
