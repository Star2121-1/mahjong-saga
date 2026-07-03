window.heroRegistry = {
    definitions: {
        Knight: {
            id: 'Knight',
            name: '\u524d\u950b\u76fe\u536b',
            title: '\u9632\u5fa1\u578b',
            hp: 100,
            atk: 10,
            speed: 100,
            baseDodge: 0,
            hue: 200,
            passiveName: '\u95ea\u907f\u9707\u8361',
            passiveDesc: '\u6210\u529f\u95ea\u907f\u65f6\uff0c\u91ca\u653e\u534a\u5f84 100px \u51b2\u51fb\u6ce2\u51fb\u9000\u5468\u56f4\u654c\u4eba',
            cost: 0
        },
        Mage: {
            id: 'Mage',
            name: '\u79d8\u672f\u6cd5\u5e08',
            title: '\u6cd5\u672f\u578b',
            hp: 70,
            atk: 10,
            speed: 100,
            baseDodge: 0,
            hue: 40,
            passiveName: '\u795e\u5175\u62d3\u5c55',
            passiveDesc: '\u6b66\u5668\u69fd\u4f4d +1\uff08\u6700\u5927 7\uff09\uff0c\u51b7\u5374\u4e0b\u9650\u964d\u81f3 0.15s',
            cost: 3,
            weaponSlots: 7,
            cdFloor: 0.15
        },
        Assassin: {
            id: 'Assassin',
            name: '\u5f71\u88ad\u523a\u5ba2',
            title: '\u654f\u6377\u578b',
            hp: 100,
            atk: 10,
            speed: 130,
            baseDodge: 0.05,
            hue: 120,
            passiveName: '\u4f24\u5bb3\u5171\u9e23',
            passiveDesc: '\u5bf9\u51bb\u7ed3\u6216\u51fb\u9000\u4e2d\u7684\u654c\u4eba\u989d\u5916\u4e58\u4ee5 1.5 \u500d\u7206\u51fb\u4fee\u6b63',
            cost: 5
        }
    },

    getHero: function(id) {
        return this.definitions[id] || null;
    },

    getAllHeroes: function() {
        var self = this;
        return Object.keys(this.definitions).map(function(k) { return self.definitions[k]; });
    }
};
