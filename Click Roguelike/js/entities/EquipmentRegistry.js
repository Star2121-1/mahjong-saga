window.equipmentRegistry = {
    equipPool: {
        v2_wpn_sword: { id: 'v2_wpn_sword', name: '\u98ce\u66b4\u5927\u5251', slot: 'weapon', base: { atk_factor: 0.10 } },
        v2_amr_plate: { id: 'v2_amr_plate', name: '\u72e9\u7ea2\u91cd\u94e0', slot: 'armor', base: { hp_boost: 30 } },
        v2_talis_ring: { id: 'v2_talis_ring', name: '\u4e0d\u706d\u6307\u73af', slot: 'talisman', base: { magnet_boost: 20 } }
    },

    affixPool: {
        xp_gain:    { id: 'xp_gain',    name: '\u7ecf\u9a8c\u589e\u5e45',  min: 0.05, max: 0.15, fmt: '\u7ecf\u9a8c\u83b7\u53d6 +{val}%' },
        ice_bonus:  { id: 'ice_bonus',  name: '\u51b0\u51bb\u5f3a\u5316',  min: 0.1,  max: 0.5,  fmt: '\u51b0\u51bb\u63a7\u5236\u65f6\u95f4 +{val}s' },
        speed_pct:  { id: 'speed_pct',  name: '\u8fc5\u6377',      min: 0.05, max: 0.10, fmt: '\u79fb\u52a8\u901f\u5ea6 +{val}%' }
    },

    _affixKeys: ['xp_gain', 'ice_bonus', 'speed_pct'],

    /** 随机抽取词条类型并生成 [min, max] 内保留两位小数的值 */
    getRandomAffix: function() {
        var key = this._affixKeys[Math.floor(Math.random() * this._affixKeys.length)];
        var def = this.affixPool[key];
        var val = def.min + Math.random() * (def.max - def.min);
        val = Math.round(val * 100) / 100;
        return { id: key, name: def.name, val: val, fmt: def.fmt };
    },

    /** 创建装备实例 */
    createItem: function(protoId, quality) {
        var proto = this.equipPool[protoId];
        if (!proto) return null;
        quality = quality || 'rare';
        var affixCount = quality === 'legendary' ? 3 : quality === 'epic' ? 2 : 1;
        var affixes = [];
        for (var i = 0; i < affixCount; i++) {
            affixes.push(this.getRandomAffix());
        }
        return {
            instanceId: 'eq_' + Date.now() + '_' + Math.floor(Math.random() * 99999),
            protoId: protoId,
            slot: proto.slot,
            name: proto.name,
            quality: quality,
            base: proto.base,
            affixes: affixes
        };
    }
};
