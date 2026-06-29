window.heroConfig = {
    Knight: {
        id: 'Knight',
        name: '光刃行者',
        desc: '均衡型战士，擅长正面肉搏。',
        backstory: '曾是光之帝国的精英卫兵，在黑暗降临后失去了所有同伴。如今他挥舞着残存的光刃，誓要杀出一条血路。',
        ability: '【光刃连击】每次攻击有 15% 几率触发连击，造成额外 50% 伤害。',
        baseDodge: 0,
        hp: 100, atk: 10, speed: 180,
        hue: 200,
        unlockCost: 0,
        shapeClass: 'shape-circle',
        /* Epoch 16: 兼容 HeroRegistry 被动字段 */
        passiveName: '闪避震荡',
        passiveDesc: '成功闪避时，释放半径 100px 冲击波击退周围敌人',
        cost: 0
    },
    Mage: {
        id: 'Mage',
        name: '不灭巨像',
        desc: '高血量坦克，容错率极高。',
        backstory: '远古泰坦的最后的子嗣，身躯由活体岩石构成。他坚不可摧，但行动迟缓。',
        ability: '【花岗岩皮肤】每升一级荆棘反伤甲额外提供 5% 反伤率。',
        baseDodge: 0,
        hp: 160, atk: 6, speed: 140,
        hue: 120,
        unlockCost: 50,
        shapeClass: 'shape-square',
        passiveName: null,
        passiveDesc: null,
        cost: 50,
        weaponSlots: 6,
        cdFloor: 0.2
    },
    Assassin: {
        id: 'Assassin',
        name: '幽灵刺客',
        desc: '脆皮高爆发，极致的移速与杀戮。',
        backstory: '来自影界的无名杀手，没人见过她的真面目。她为杀戮而生，也随时准备为杀戮而死。',
        ability: '【暗影步】自带 15% 基础闪避率，移动速度提升 10%。',
        baseDodge: 0.15,
        hp: 75, atk: 16, speed: 220,
        hue: 290,
        unlockCost: 100,
        shapeClass: 'shape-triangle',
        passiveName: null,
        passiveDesc: null,
        cost: 100,
        weaponSlots: 6,
        cdFloor: 0.2
    }
};
