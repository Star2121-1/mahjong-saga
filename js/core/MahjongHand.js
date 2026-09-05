/* ══════════════════════════════════════════════
   麻将江湖 · 雀魂系统 — 牌库与牌型检测（HUPAI_DESIGN.md v2.0）
   纯函数模块，无 DOM 依赖；全局挂载 window.MahjongHand
   牌 ID 规则：wan1..wan9 / tong1..tong9 / tiao1..tiao9
              feng_dong,feng_nan,feng_xi,feng_bei / jian_zhong,jian_fa,jian_bai
              hua_chun,hua_xia,hua_qiu,hua_dongJ,hua_mei,hua_lan,hua_zhu,hua_ju
              joker = 癞子（百搭）
   ══════════════════════════════════════════════ */
(function () {
    'use strict';

    var B = window.Balance;

    /* ── 34 常规牌面 + 8 花牌定义（每面 4 张，花牌各 1 → 共 144）── */
    var FACES = [];
    (function () {
        var suits = [['wan', '万', '#b62929'], ['tong', '筒', '#1b4f72'], ['tiao', '条', '#1e6f42']];
        for (var si = 0; si < 3; si++) {
            for (var v = 1; v <= 9; v++) {
                FACES.push({ id: suits[si][0] + v, suit: suits[si][0], value: v, label: v + suits[si][1], color: suits[si][2] });
            }
        }
        var winds = [['dong', '东'], ['nan', '南'], ['xi', '西'], ['bei', '北']];
        for (var wi = 0; wi < 4; wi++) {
            FACES.push({ id: 'feng_' + winds[wi][0], suit: 'zi', value: 10 + wi, label: winds[wi][1], color: '#0d3020' });
        }
        var dragons = [['zhong', '中'], ['fa', '發'], ['bai', '白']];
        for (var di = 0; di < 3; di++) {
            FACES.push({ id: 'jian_' + dragons[di][0], suit: 'zi', value: 20 + di, label: dragons[di][1], color: di === 0 ? '#b62929' : (di === 1 ? '#00897b' : '#9e9e9e') });
        }
    })();
    var FLOWERS = [
        { id: 'hua_chun', label: '春', color: '#66bb6a' }, { id: 'hua_xia', label: '夏', color: '#ef5350' },
        { id: 'hua_qiu', label: '秋', color: '#ffa726' }, { id: 'hua_dongJ', label: '冬', color: '#70d6ff' },
        { id: 'hua_mei', label: '梅', color: '#f06292' }, { id: 'hua_lan', label: '兰', color: '#4dd0e1' },
        { id: 'hua_zhu', label: '竹', color: '#9ccc65' }, { id: 'hua_ju', label: '菊', color: '#ffd54f' }
    ];

    var FACE_MAP = {};
    for (var i = 0; i < FACES.length; i++) FACE_MAP[FACES[i].id] = FACES[i];
    for (var j = 0; j < FLOWERS.length; j++) FACE_MAP[FLOWERS[j].id] = FLOWERS[j];

    /* ── 基础查询 ── */
    function faceInfo(id) { return FACE_MAP[id] || null; }
    function isFlower(id) { return id && id.indexOf('hua_') === 0; }
    function isJoker(id) { return id === 'joker'; }
    function isHonor(id) { return id && (id.indexOf('feng_') === 0 || id.indexOf('jian_') === 0); }
    function isSuitTile(id) { return id && !isFlower(id) && !isJoker(id) && !isHonor(id); }
    /* 数字档：1-3→0，4-6→1，7-9→2（字牌恒为增强档2；未知牌面容错回2） */
    function tierIndex(id) {
        if (isSuitTile(id)) {
            var f = FACE_MAP[id];
            if (!f) return 2;
            var v = f.value;
            return v <= 3 ? 0 : (v <= 6 ? 1 : 2);
        }
        return 2;
    }
    function tierMult(id) { return B.HUPAI_TIER_MULTS[tierIndex(id)]; }

    /* ── 掉落抽取（供 Spawn.js 调用）──
       mainSuit: 'wan'|'tong'|'tiao' 主花色软加权 */
    function rollDrop(mainSuit, rng) {
        rng = rng || Math.random;
        if (rng() < B.HUPAI_FLOWER_POOL_RATIO) {
            return FLOWERS[Math.floor(rng() * FLOWERS.length)].id;
        }
        var r = rng();
        var suit;
        if (mainSuit && r < B.HUPAI_MAIN_SUIT_WEIGHT) suit = mainSuit;
        else {
            var others = ['wan', 'tong', 'tiao'].filter(function (s) { return s !== mainSuit; });
            suit = others[Math.floor(rng() * others.length)];
        }
        return suit + (1 + Math.floor(rng() * 9));
    }

    /* ── 手牌统计 ──
       hand: [id,...]，joker 计独立。返回 {count:{id:n}, total, flowers:[...]} */
    function tally(hand) {
        var count = {}, total = 0, flowers = [], jokers = 0;
        for (var i = 0; i < hand.length; i++) {
            var id = hand[i];
            if (isFlower(id)) { flowers.push(id); continue; }
            if (isJoker(id)) { jokers++; continue; }
            count[id] = (count[id] || 0) + 1;
            total++;
        }
        return { count: count, total: total, flowers: flowers, jokers: jokers };
    }

    /* ── 面子提取（消耗制玩法：贪心成组，杠优先于刻子优先于顺子）──
       返回 melds:[{type:'kong'|'pung'|'run'|'pair', tiles:[id...], tierMult}]，
       usedTiles 为被消耗的牌；剩余 singles 不返回 */
    function extractMelds(hand) {
        var t = tally(hand);
        var pool = {};
        for (var k in t.count) pool[k] = t.count[k];
        var melds = [];
        /* 杠：count==4 */
        for (var k2 in pool) {
            while (pool[k2] >= 4) {
                pool[k2] -= 4;
                melds.push({ type: 'kong', tiles: [k2, k2, k2, k2], tierMult: tierMult(k2) });
            }
        }
        /* 刻子：count==3 */
        for (var k3 in pool) {
            while (pool[k3] >= 3) {
                pool[k3] -= 3;
                melds.push({ type: 'pung', tiles: [k3, k3, k3], tierMult: tierMult(k3) });
            }
        }
        /* 顺子：同花色三连（仅数牌），含癞子补位 */
        var suited = Object.keys(pool).filter(isSuitTile).sort();
        for (var si = 0; si < suited.length; si++) {
            var base = suited[si], suit = base.replace(/\d$/, '');
            var need = function (v) { return suit + v; };
            for (var v = 1; v <= 7; v++) {
                var a = need(v), b = need(v + 1), c = need(v + 2);
                var ca = pool[a] || 0, cb = pool[b] || 0, cc = pool[c] || 0;
                var jok = t.jokers;
                /* 三张齐 → 顺子 */
                if (ca > 0 && cb > 0 && cc > 0) {
                    pool[a]--; pool[b]--; pool[c]--;
                    melds.push({ type: 'run', tiles: [a, b, c], tierMult: Math.max(tierMult(a), tierMult(b), tierMult(c)) });
                } else if (jok > 0) {
                    /* 一张缺口 → 癞子补（每次消耗一个癞子） */
                    var miss = [];
                    if (ca === 0) miss.push(a);
                    if (cb === 0) miss.push(b);
                    if (cc === 0) miss.push(c);
                    if (miss.length === 1 && jok > 0 && (ca + cb + cc) === 2) {
                        pool[a] -= (ca > 0 ? 1 : 0); pool[b] -= (cb > 0 ? 1 : 0); pool[c] -= (cc > 0 ? 1 : 0);
                        t.jokers--; /* R163-P0: 同步消耗癞子，防止同一癞子被多顺子重复使用 */
                        var maxTier = Math.max(tierMult(a), tierMult(b), tierMult(c));
                        melds.push({ type: 'run', tiles: [a, b, c, 'joker'], tierMult: maxTier * B.HUPAI_MELD_EFFECT_MULT_JOKER });
                    }
                }
            }
        }
        /* 对子：count>=2（不成面的余牌） */
        for (var k4 in pool) {
            while (pool[k4] >= 2) {
                pool[k4] -= 2;
                melds.push({ type: 'pair', tiles: [k4, k4], tierMult: tierMult(k4) });
            }
        }
        return melds;
    }

    /* ── 听牌信息（供手牌栏 UI 角标）──
       tingPung: 差1张成刻的面 ; tingKong: 差1张成杠的面 ;
       tingRun: [{need:'wan5',kind:'run'}...] 差1张成顺 ;
       suitProgress: {suit:张数} ; nearHu: 距最近番型的缺口描述 */
    function tingInfo(hand) {
        var t = tally(hand), out = { tingPung: [], tingKong: [], tingRun: [], pairReady: [], suitProgress: {} };
        var suitsN = { wan: 0, tong: 0, tiao: 0 };
        for (var id in t.count) {
            var n = t.count[id];
            if (isSuitTile(id)) { var _fi = FACE_MAP[id]; suitsN[_fi ? _fi.suit : 'wan'] += n; }
            if (n === 2) { out.tingPung.push(id); out.pairReady.push(id); }
            else if (n === 3) { out.tingKong.push(id); }
        }
        /* 差1成顺：对每个三连窗口，缺且仅缺一种、其余各持≤1（P2-1: 对子不再幻报假听） */
        for (var s in suitsN) {
            for (var v = 1; v <= 7; v++) {
                var ids = [s + v, s + (v + 1), s + (v + 2)];
                var have = ids.map(function (x) { return Math.min(1, t.count[x] || 0); });
                var sum = have[0] + have[1] + have[2];
                var zeroIdx = have.indexOf(0);
                if (sum === 2 && zeroIdx > -1) {
                    out.tingRun.push({ need: ids[zeroIdx], kind: 'run' });
                }
            }
        }
        out.suitProgress = suitsN;
        /* 清一色进度：最大花色占比（含癞子） */
        var maxS = 'wan', maxN = 0;
        for (var s2 in suitsN) { if (suitsN[s2] > maxN) { maxN = suitsN[s2]; maxS = s2; } }
        out.qingyise = { suit: maxS, count: maxN + t.jokers, ratio: maxN === 0 ? 0 : (maxN + t.jokers) / Math.max(1, t.total + t.jokers) };
        /* 碰碰胡进度：刻+杠组数（含差1） */
        var pungs = 0;
        for (var id2 in t.count) { if (t.count[id2] >= 3) pungs++; }
        out.pengpeng = { ready: pungs, tingCount: out.tingPung.length };
        /* 七对进度 */
        out.qidui = { pairs: out.pairReady.length };
        return out;
    }

    /* ── 胡牌判定（满14张时调用；P2-2: 全程防呆）──
       返回 {huType:'qingyise'|'pengpenghu'|'qiduizi'} 或 null（未满14/未成番型）*/
    function evaluateHu(hand) {
        try {
            return evaluateHuInner(hand);
        } catch (e) {
            console.warn('MahjongHand evaluateHu error:', e);
            return null;
        }
    }
    function evaluateHuInner(hand) {
        var t = tally(hand);
        var effective = t.total + t.jokers;
        if (effective < B.HUPAI_HAND_MAX) return null;
        /* R199-P0: pre-consume jokers used by extractMelds so Pengpenghu doesn't double-count them */
        var consumed = extractMelds(hand);
        var jokersAfterMelds = t.jokers;
        for (var ci = 0; ci < consumed.length; ci++) {
            /* R219-P0: 只扣除实际使用了癞子的meld，kong(4张相同)不消耗癞子 */
            if (consumed[ci].tiles.indexOf('joker') > -1) jokersAfterMelds--;
        }
        /* 清一色：非癞子全部同花色（癞子视为该花色任意），字牌不计入花色 */
        var suitsPresent = {};
        var hasHonor = false; /* R188-P0: 追踪字牌存在性，防止字牌+单花色误判清一色 */
        for (var id in t.count) {
            var fi = FACE_MAP[id];
            if (!fi) continue; /* R46-P1: 防御非法ID防止空指针 */
            var suit = fi.suit;
            if (isHonor(id)) { hasHonor = true; continue; } /* R188-P0: 显式追踪字牌 */
            if (suit !== 'zi') suitsPresent[suit] = true; /* P0: 排除字牌，避免纯字牌+癞子误判为清一色 */
        }
        var suitKeys = Object.keys(suitsPresent);
        /* R188-P0: 增加 !hasHonor 约束，防止字牌+单花色被误判为清一色 */
        if (suitKeys.length > 0 && !hasHonor && (t.jokers > 0 ? suitKeys.length <= 1 : suitKeys.length === 1)) {
            return { huType: 'qingyise', suit: suitKeys[0] };
        }
        /* 七对子：凑齐 7 对（14 张），每癞子可补 1 个缺口 */
        var pairs = 0;
        for (var id2 in t.count) { pairs += Math.floor(t.count[id2] / 2); }
        /* R140-P0: 修正七对子判定 — 用maxPossiblePairs防止多刻+多对+多癞子误判 */
        var maxPossiblePairs = pairs + Math.min(jokersAfterMelds, t.total - pairs * 2);
        if (maxPossiblePairs >= 7) {
            return { huType: 'qiduizi' };
        }
        /* 碰碰胡：刻/杠组 ≥4 — 直接计数 extractMelds 已消耗癞子后的真实刻/杠组数，避免近似公式高估 */
        var pengpenghu = 0;
        for (var pi = 0; pi < consumed.length; pi++) {
            if (consumed[pi].type === 'pung' || consumed[pi].type === 'kong') pengpenghu++;
        }
        if (pengpenghu >= 4) {
            return { huType: 'pengpenghu' };
        }
        /* D2 决策（v2.1 修正）：未成番型不自动屁胡 —— 返回 null，由 Spawn 进入打牌模式换张 */
        return null;
    }

    window.MahjongHand = {
        SUIT_NAMES: { wan: '万', tong: '筒', tiao: '条', zi: '字' },
        FACES: FACES,
        FLOWERS: FLOWERS,
        FACE_MAP: FACE_MAP,
        faceInfo: faceInfo,
        isFlower: isFlower,
        isJoker: isJoker,
        isHonor: isHonor,
        isSuitTile: isSuitTile,
        tierIndex: tierIndex,
        tierMult: tierMult,
        rollDrop: rollDrop,
        tally: tally,
        extractMelds: extractMeldsSafe,
        tingInfo: tingInfo,
        evaluateHu: evaluateHu
    };

    /* 防呆包装：任何异常不致崩主循环（真实现为上方 extractMelds） */
    function extractMeldsSafe(hand) {
        try { return extractMelds(hand); } catch (e) { console.warn('MahjongHand extractMelds error:', e); return []; }
    }
})();
