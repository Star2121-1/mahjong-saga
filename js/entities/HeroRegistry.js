/* ══════════════════════════════════════════════
   HeroRegistry — Epoch 16: 统一自 HeroConfig，消除三套 ID 体系
   ══════════════════════════════════════════════ */

window.heroRegistry = {
    definitions: null,

    init: function() {
        if (this.definitions) return;
        this.definitions = {};
        var cfg = window.heroConfig || {};
        var ids = ['Hero', 'Knight', 'Mage', 'Assassin'];
        for (var i = 0; i < ids.length; i++) {
            var h = cfg[ids[i]];
            if (!h) continue;
            this.definitions[ids[i]] = {
                id: h.id || ids[i],
                name: h.name,
                title: this._titleForId(ids[i]),
                hp: h.hp,
                atk: h.atk,
                speed: h.speed,
                baseDodge: h.baseDodge || 0,
                hue: h.hue,
                passiveName: h.passiveName || null,
                passiveDesc: h.passiveDesc || null,
                cost: h.unlockCost || 0,
                weaponSlots: h.weaponSlots || 6,
                cdFloor: h.cdFloor != null ? h.cdFloor : Balance.DEFAULT_CD_FLOOR,
                shapeClass: h.shapeClass || 'shape-circle'
            };
        }
    },

    _titleForId: function(id) {
        if (id === 'Hero') return '雀圣·天命';
        if (id === 'Knight') return '万子·坚盾';
        if (id === 'Mage') return '筒子·金刚';
        if (id === 'Assassin') return '索子·暗影';
        return '';
    },

    getHero: function(id) {
        if (!this.definitions) this.init();
        return this.definitions[id] || null;
    },

    getAllHeroes: function() {
        if (!this.definitions) this.init();
        var self = this;
        return Object.keys(this.definitions).map(function(k) { return self.definitions[k]; });
    }
};

/* 自动初始化 */
window.heroRegistry.init();
