window.equipmentRegistry = {
    equipPool: {
        v2_wpn_sword: { id: 'v2_wpn_sword', name: '\u98ce\u88c1\u98de\u724c', slot: 'weapon', base: { atk_factor: 0.10 } },
        v2_amr_plate: { id: 'v2_amr_plate', name: '\u8d64\u57a3\u94c1\u58c1', slot: 'armor', base: { hp_boost: 30 } },
        v2_talis_ring: { id: 'v2_talis_ring', name: '\u4e0d\u706d\u5b9d\u724c\u6212', slot: 'talisman', base: { magnet_boost: 20 } }
    },

    affixPool: {
        xp_gain:    { id: 'xp_gain',    name: '\u7ecf\u9a8c\u756a',  min: 0.05, max: 0.15, fmt: '\u7ecf\u9a8c\u83b7\u53d6 +{val}' },
        ice_bonus:  { id: 'ice_bonus',  name: '\u51b0\u51bb\u756a',  min: 0.1,  max: 0.5,  fmt: '\u51b0\u51bb\u63a7\u5236\u65f6\u95f4 +{val}s' },
        speed_pct:  { id: 'speed_pct',  name: '\u81ea\u6478\u901f',  min: 0.05, max: 0.10, fmt: '\u79fb\u52a8\u901f\u5ea6 +{val}' }
    },

    _affixKeys: ['xp_gain', 'ice_bonus', 'speed_pct'],

    /** 随机抽取词条类型并生成 [min, max] 内保留两位小数的值 */
    getRandomAffix: function() {
        var key = this._affixKeys[Math.floor(Math.random() * this._affixKeys.length)];
        var def = this.affixPool[key];
        var val = def.min + Math.random() * (def.max - def.min);
        /* R65-P1: 钳制到[min, max]范围，防止超出设计阈值 */
        val = Math.max(def.min, Math.min(def.max, val));
        val = Math.round(val * 100) / 100;
        return { id: key, name: def.name, val: val, fmt: def.fmt };
    },

    /** 创建装备实例 */
    createItem: function(protoId, quality) {
        this._instanceCounter = (this._instanceCounter || 0) + 1;
        var proto = this.equipPool[protoId];
        if (!proto) return null;
        quality = quality || 'rare';
        var affixCount = quality === 'legendary' ? 3 : quality === 'epic' ? 2 : 1;
        var affixes = [];
        var usedAffixIds = {}; /* R124-P0: 防止同件装备出现重复词条 */
        for (var i = 0; i < affixCount; i++) {
            var affix;
            var attempts = 0;
            do {
                affix = this.getRandomAffix();
                attempts++;
            } while (usedAffixIds[affix.id] && attempts < 10);
            if (!usedAffixIds[affix.id]) { /* R226-P0: 跳过已达上限的重复词条，防止传奇装备出现同名affix */
                usedAffixIds[affix.id] = true;
                affixes.push(affix);
            } else { i--; /* 重试该槽位 */ }
        }
        /* R65-P1: 深拷贝base属性，防止多实例共享同一引用导致污染 */
        return {
            instanceId: 'eq_' + (this._instanceCounter || 0) + '_' + Math.floor(Math.random() * 99999),
            protoId: protoId,
            slot: proto.slot,
            name: proto.name,
            quality: quality,
            base: Object.assign({}, proto.base),
            affixes: affixes
        };
    }
};
