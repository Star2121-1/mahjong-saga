#!/bin/sh
# 反向验证：逐个注入 T0 的三个 bug，确认自检会红；再恢复确认会绿。
# 「坏了没人知道」的自检等于没有自检。用法：sh design/audit/reverse.sh
set -e
cd "$(dirname "$0")/../.."
PASS=0; FAIL=0
probe() { node design/audit/verify.mjs s3 >/dev/null 2>&1 && echo 0 || echo 1; }

echo "── 注入 bug 1（Balance.js 挪回 FxManager 之后）"
cp pages/s3_gameplay.html /tmp/_s3.bak
python3 - <<'PY'
p='pages/s3_gameplay.html'; s=open(p,encoding='utf-8').read()
s=s.replace('''    <!-- 数值常量 (所有模块依赖) -->
    <script src="../js/config/Balance.js?v=20260908I"></script>
    <script src="../js/core/FxManager.js?v=20260908I"></script>''','''    <script src="../js/core/FxManager.js?v=20260908I"></script>''')
s=s.replace('<script src="../js/core/RewardManager.js?v=20260908I"></script>','<script src="../js/core/RewardManager.js?v=20260908I"></script>\n    <script src="../js/config/Balance.js?v=20260908I"></script>')
open(p,'w',encoding='utf-8').write(s)
PY
[ "$(probe)" = "1" ] && PASS=$((PASS+1)) && echo "   ✔ 自检变红" || { FAIL=$((FAIL+1)); echo "   ✘ 自检没反应（假绿灯！）"; }
cp /tmp/_s3.bak pages/s3_gameplay.html

echo "── 注入 bug 2（GameSystems 直接写 window.GameEngine.prototype）"
cp js/core/GameSystems.js /tmp/_gs.bak
python3 - <<'PY'
p='js/core/GameSystems.js'; s=open(p,encoding='utf-8').read()
s=s.replace("    if (window.GameEngine) {\n        window.GameEngine.prototype._endOverdrive = Sys.endOverdrive;\n        return;\n    }",
            "    if (true) {\n        window.GameEngine.prototype._endOverdrive = Sys.endOverdrive;\n        return;\n    }")
open(p,'w',encoding='utf-8').write(s)
PY
[ "$(probe)" = "1" ] && PASS=$((PASS+1)) && echo "   ✔ 自检变红" || { FAIL=$((FAIL+1)); echo "   ✘ 自检没反应"; }
cp /tmp/_gs.bak js/core/GameSystems.js

echo "── 注入 bug 3（去掉 cleanup 的防御式补齐）"
cp js/core/FxManager.js /tmp/_fx.bak
python3 -c "
p='js/core/FxManager.js'; s=open(p,encoding='utf-8').read()
open(p,'w',encoding='utf-8').write(s.replace('    this._freeStack = this._freeStack || [];','    /* injected */'))"
[ "$(probe)" = "1" ] && PASS=$((PASS+1)) && echo "   ✔ 自检变红" || { FAIL=$((FAIL+1)); echo "   ✘ 自检没反应"; }
cp /tmp/_fx.bak js/core/FxManager.js

echo "── 恢复后"
[ "$(probe)" = "0" ] && PASS=$((PASS+1)) && echo "   ✔ 自检变绿" || { FAIL=$((FAIL+1)); echo "   ✘ 恢复后仍红"; }
echo; echo "通过 $PASS / 失败 $FAIL"
[ "$FAIL" = "0" ]
