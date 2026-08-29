/* ══════════════════════════════════════════════
   Balance Constants — 跨文件数值常量集中管理
   ══════════════════════════════════════════════ */

window.Balance = {
    /* ── Enemy (敌人基础属性 / 缩放) ── */
    ENEMY_LEVEL_HP_ATK_MULT: 1.15,   // 每级 HP/ATK 倍率 (Enemy.js)
    ABYSS_LOOP_HP_ATK_MULT: 1.08,   // 深渊轮回 HP/ATK 倍率 (Enemy.js)
    ABYSS_LOOP_SPEED_MULT: 1.05,    // 深渊轮回 Speed 倍率 (Enemy.js)
    ABYSS_SHOP_PRICE_MULT: 1.5,     // 深渊商店价格倍率
    ABYSS_COMBO_UNLOCK_INTERVAL: 5, // 每 N 层解锁一个新深渊变异组合
    ABYSS_ENEMY_VARIANT_MULT: 1.2,  // 深渊变体属性倍率
    ENEMY_BASE_HP: 20,               // 普通敌人基础 HP (Enemy.js)
    ENEMY_BASE_ATK: 5,               // 普通敌人基础 ATK (Enemy.js)
    ENEMY_LEVEL_SPEED_SCALE: 3,      // 每级速度增量 (Enemy.js)
    ENEMY_RADIUS: 18,                // 普通敌人碰撞半径 (Enemy.js)
    ENEMY_ATTACK_COOLDOWN: 1.5,      // 敌人攻击冷却 (Enemy.js)
    ENEMY_ATTACK_RANGE_OFFSET: 30,   // 攻击范围偏移 (Enemy.js)
    ENEMY_ATTACK_PADDING: 5,         // 攻击判定内缩 (Enemy.js)
    FLASH_DURATION: 0.12,            // 受击闪烁持续时间 (Enemy.js)

    /* ── Weapon (武器升级 / 弹道) ── */
    WEAPON_UPGRADE_ATK_INC: 0.15,    // 武器升级 ATK 因子增量 (Weapon.js)
    WEAPON_UPGRADE_CD_MULT: 0.9,     // 武器升级 CD 倍率 (Weapon.js)
    DEFAULT_CD_FLOOR: 0.2,           // 默认 CD 下限 (Weapon.js)
    WEAPON_AMPLIFY_ATK_FACTOR_INC: 0.2,  // 役牌加算 ATK 因子增量 (Player.js)
    WEAPON_ASPD_CAP: 3.0,            // 最大临时攻速叠加上限（防止无限加速）
    PROJECTILE_DEFAULT_LIFETIME: 3.0,// 弹道默认存活时间 (Weapon.js)

    /* ── Player (玩家机制) ── */
    PLAYER_INVULN_ON_HIT: 0.35,      // 受击无敌帧时长 (Player.js)
    PLAYER_HITFLASH_DURATION: 0.3,   // 受击闪烁时长 + Combat.js 归一化分母 (Player.js + Combat.js)
    HERO_SPEED_BONUS: 1.15,          // 雀灵流转移速加成 (Player.js Hero)
    HERO_ASSASSIN_SPEED_MULT: 1.10,  // 暗影步移速加成 (Player.js Assassin)
    HERO_CD_FLOOR_REDUCTION: 0.90,   // 雀灵流转CD降低 (Player.js Hero)
    HERO_CD_REDUCTION_RATE: 0.10,    // 雀灵流转武器CD减免率 (Player.js Hero)
    EVOLVED_SPEED_PER_LEVEL: 0.12,   // 极速图腾每级移速加成 (Player.js)
    EVOLVED_DODGE_BONUS: 0.3,        // 极速图腾闪避加成 (Player.js)
    RELIC_WW_SPEED_PER_LEVEL: 0.15,  // 四风环绕Lv级移速加成 (Player.js)
    RELIC_WW_DODGE_PER_LEVEL: 0.1,   // 四风环绕Lv级闪避加成 (Player.js)
    RELIC_FROST_CORE_DURATION_PER_LEVEL: 0.5,  // 冰霜核心长效词条每级冰时加成 (Player.js)
    DRONE_INTERVALS: [0, 1.0, 0.8, 0.6, 0.4], // 无人机攻击间隔（Lv0~Lv4）(Player.js)
    RELIC_GOLDEN_FINGER_CRIT_INC: 0.15, // 鬼指每级暴击加成 (Player.js)
    MAX_LIFESTEAL_RATE: 0.8,         // 吸血上限 (Player.js)
    LIFESTEAL_PER_VAMP_LEVEL: 0.08,  // 吸血戒指每级增幅 (Player.js)
    MAX_EXPLOSION_CHANCE: 0.75,      // 爆炸概率上限 (Player.js)
    EXPLOSION_PER_LEVEL: 0.15,       // 爆破核心每级增幅 (Player.js)
    MAX_FREEZE_CHANCE: 0.5,          // 冰冻概率上限 (Player.js)
    FREEZE_PER_LEVEL: 0.10,          // 冰霜核心每级增幅 (Player.js)

    /* ── Combat (战斗特效) ── */
    FLOAT_TEXT_TIMEOUT_MS: 650,      // 飘字消失延迟 (GameCombat.js)
    EXPLOSION_EFFECT_TIMEOUT: 400,   // 爆炸特效消失延迟 (GameCombat.js)
    CAUSALITY_TIMEOUT_MS: 2000,      // 因果文本消失延迟 (GameCombat.js)

    /* ── 突变系统 ── */
    MUTATOR_BLOODMOON_ATK_MULT: 1.4,
    MUTATOR_BLOODMOON_HP_MULT: 1.3,
    MUTATOR_BLOODMOON_SCALE: 1.3,
    MUTATOR_FRENZY_SPEED_MULT: 1.5,
    MUTATOR_FRENZY_GOLD_MULT: 1.5,
    MUTATOR_FRAILTY_PLAYER_ATK_MULT: 1.8,
    MUTATOR_FRAILTY_DAMAGE_TAKEN_MULT: 1.3,

    /* ── 刷怪系统 ── */
    DEFAULT_SPAWN_INTERVAL: 1.5,
    DEFAULT_SPAWN_INTERVAL_DECAY: 0.02,
    SPAWN_INTERVAL_MIN: 0.5,
    BOSS_SPAWN_INTERVAL: 30,
    ENEMY_SPAWN_RADIUS: 200,
    ENEMY_SPAWN_RADIUS_JITTER: 50,
    ENEMY_SPAWN_MARGIN: 20,
    DEFAULT_ENEMY_WEIGHTS: { Normal: 0.24, Tanker: 0.14, Stalker: 0.17, Archer: 0.14, Shaman: 0.09, Barrier: 0.12, Bomber: 0.10 },

    /* ── 玩家系统 ── */
    PLAYER_MAX_RAGE: 100,
    PLAYER_DEFAULT_MAGNET_RADIUS: 60,
    PLAYER_RADIUS: 28,
    REVIVE_HP_PERCENT: 0.3,
    REVIVE_INVULN_DURATION: 1.5,
    TEMP_HP_REGEN_PER_SEC: 2,

    /* ── FxManager ── */
    FCT_POOL_SIZE_INIT: 50,
    FCT_POOL_MAX_GROWTH: 200,
    FCT_FALLBACK_TIMEOUT_MS: 5000,
    FCT_HEALTHCHECK_MODULO: 50,
    FCT_STALE_NODE_TIMEOUT_MS: 5000,

    /* ── 成就/文本 ── */
    ACHIEVEMENT_TEXT_TIMEOUT_MS: 2600,
    ACHIEVEMENT_FONT_SIZE: 28,
    ACHIEVEMENT_Z_INDEX: 210,
    ACHIEVEMENT_ANIM_DURATION: 2.5,
    CAUSALITY_TEXT_TIMEOUT_MS: 2000,
    CAUSALITY_FONT_SIZE: 24,
    CAUSALITY_Z_INDEX: 200,
    CAUSALITY_ANIM_DURATION: 0.6,

    /* ── 雀魂护盾 ── */
    QQUEEN_SHIELD_INTERVAL: 10,
    QQUEEN_SHIELD_BASE_DURATION: 5,
    QQUEEN_SHIELD_DURATION_PER_LEVEL: 2,

    /* ── 波次 ── */
    WAVE_MILESTONE_THRESHOLD: 0.75,
    WAVE_INTER_EVENT_CHANCE: 0.6,     // 波次间事件触发概率 (GameEngine.Loop.js)
    WAVE_MEDITATION_HP_RESTORE: 0.3,   // 冥想泉源 HP 恢复比例 (Events.js)
    WAVE_MEDITATION_ATK_DEBUFF: 0.8,   // 冥想泉源怪物 ATK 减益 (Events.js)
    WAVE_TIME_DILATION_SPEED_DEBUFF: 0.7, // 时光缓流移速减益 (Events.js)
    WAVE_IRON_FIST_CRIT_BONUS: 0.25,   // 铁拳暴击加成 (Events.js)
    KNIGHT_SLAM_ATK_FACTOR: 0.5,       // 骑士闪避冲击波 ATK 系数 (Events.js)

    /* ── 图腾 ── */
    TOTEM_SPAWN_INTERVAL: 5,
    MAX_TOTEMS: 10,
    TOTEM_RADIUS: 100,
    TOTEM_BUFF_SPEED_MULT: 1.3,              // 图腾增益速度倍率 (Enemy.js)

    /* ── Stalker ── */
    STALKER_TRIGGER_DIST: 150,
    STALKER_CHARGE_SPEED_MULT: 2.5,
    STALKER_FATIGUE_DURATION: 3.0,
    STALKER_COOLDOWN: 2.0,

    /* ── Shaman ── */
    SHAMAN_RETREAT_DIST: 200,
    SHAMAN_ADVANCE_DIST: 250,

    /* ── Boss ── */
    BOSS_LORD_BASE_HP: 80,
    BOSS_LORD_BASE_ATK: 30,
    BOSS_LORD_BASE_SPEED: 20,
    BOSS_LORD_BASE_RADIUS: 70,
    BOSS_HP_MULT: 6,
    BOSS_ATK_MULT: 2,
    BOSS_SPEED_MULT: 0.7,
    BOSS_PHASE3_SPEED_MULT: 1.8,
    BOSS_PHASE1_THRESHOLD: 0.7,    // 龙王第一阶段HP阈值 (Enemy.js)
    BOSS_PHASE2_THRESHOLD: 0.3,    // 龙王第二阶段HP阈值 (Enemy.js)
    BOSS_PHASE2_ABILITY_INTERVAL: 0.5,  // 龙王二阶段技能间隔 (Enemy.js)
    EQUIPMENT_DROPS_BOSS_LORD: 1.0,  // 龙王装备掉落概率 (GameEngine.Spawn.js)
    EQUIPMENT_DROPS_NORMAL: 0.25,    // 普通怪物装备掉落概率 (GameEngine.Spawn.js)
    BARRIER_HP_MULT: 1.5,            // 屏障怪HP倍率 (Enemy.js)
    BARRIER_ATK_MULT: 0.7,           // 屏障怪ATK倍率 (Enemy.js)
    BARRIER_SPEED_MULT: 0.8,         // 屏障怪速度倍率 (Enemy.js)
    BOMBER_HP_MULT: 0.6,             // 自爆怪HP倍率 (Enemy.js)
    BOMBER_ATK_MULT: 2,              // 自爆怪ATK倍率 (Enemy.js)
    BOMBER_SPEED_MULT: 1.8,          // 自爆怪速度倍率 (Enemy.js)
    SPLITTER_HP_MULT: 1.2,           // 分身怪HP倍率 (Enemy.js)
    BOSS_NONLORD_SPEED_MULT: 0.7,    // 非龙王Boss速度倍率 (Enemy.js)
    STALKER_CHARGE_DURATION: 1.5,    // 猎杀者蓄力时长 (Enemy.js)
    STALKER_CHARGE_OPACITY: 0.4,     // 猎杀者蓄力透明度 (Enemy.js)
    ENEMY_DEAD_OPACITY: 0,           // 敌人死亡透明度 (Enemy.js)
    BOSS_PHASE1_BULLET_COUNT: 12,
    BOSS_WARNING_DURATION: 0.8,
    BOSS_PHASE3_SUMMON_INTERVAL: 4,
    BOSS_PHASE3_SUMMON_STALKER: 4,
    BOSS_PHASE3_SUMMON_TANKER: 2,
    BOSS_PROJECTILE_SPEED_NORMAL: 100,
    BOSS_PROJECTILE_SPEED_BLOOD: 120,

    /* ── 敌人 ── */
    TANKER_HP_MULT: 2,
    TANKER_SPEED_MULT: 0.5,
    TANKER_CRACK_HP_THRESHOLD: 0.5,  // 坦克龟裂纹HP阈值 (Enemy.js)
    TANKER_SIDESHOT_REDUCTION: 0.5,
    ASSASSIN_CRIT_MULT: 1.5,
    KNOCKBACK_DAMAGE_REDUCTION: 0.5,  // 屏障侧向伤害衰减 (Enemy.js)
    KNIGHT_COMBO_CHANCE: 0.15,         // 骑士万子连击触发概率 (Enemy.js)
    VAULT_MUTATION_UNLOCK_CHANCE: 0.2, // 变异保险库解锁概率 (Combat.js)
    BOSS_CONTACT_COOLDOWN: 0.5,
    FROZEN_DAMAGE_MULT: 1.25,
    FROZEN_HIT_DECAY: 0.25,
    FROZEN_TIMER_ZI_EAST: 1.0,       // 子东冰封时长 (GameEngine.Spawn.js)
    FROZEN_TIMER_FENG_XI: 0.8,       // 肃杀之风冰封时长 (GameEngine.Spawn.js)
    FROZEN_TIMER_FENG_BEI: 2.0,      // 北冥冻结时长 (GameEngine.Spawn.js)
    FROZEN_TIMER_BONUS_BASE: 1.5,    // 冰霜核心基础冰封时长 (GameEngine.Endgame.js)

    /* ── 武器 ── */
    ORBIT_SHIELD_RADIUS: 50,
    ORBIT_ORB_RADIUS: 8,
    ORBIT_ROTATION_SPEED: 2.0,
    SHOTGUN_SPREAD_COUNT: 5,
    SHOTGUN_SPREAD_ANGLE: 0.3,
    GROUND_SLAMMER_WAVE_DURATION: 0.2,
    GROUND_SLAMMER_MIN_RADIUS: 10,
    GROUND_SLAMMER_RADIUS_GROWTH: 70,
    GROUND_SLAMMER_KNOCKBACK_FORCE: 200,
    LASER_BEAM_LENGTH: 300,
    LASER_HIT_RADIUS: 4,
    TRACKING_BLADE_PROJ_LIFE: 2.0,
    SHOTGUN_PROJ_LIFE: 0.8,
    TRACKING_BLADE_RADIUS: 4,
    SHOTGUN_RADIUS: 3,
    KNIGHT_DODGE_SLAM_RADIUS: 100,
    KNIGHT_DODGE_SLAM_FORCE: 200,
    KNIGHT_DODGE_SLAM_TIMEOUT_MS: 300,

    /* ── 经验石/金币 ── */
    BOSS_MIN_GEM_COUNT: 5,
    BOSS_EXTRA_GEM_COUNT: 4,
    BOSS_TOTAL_EXP_GEMS: 25,
    NORMAL_GEM_VALUE_BASE: 1,
    COIN_COUNT_BOSS_BASE: 5,
    COIN_COUNT_BOSS_PER_LVL: 0.5,
    COIN_COUNT_NORMAL_BASE: 3,
    COIN_COUNT_NORMAL_PER_LVL: 0.3,
    COIN_SCATTER: 20,
    /* ── Coin/Gem 拾取 ── */
    COIN_VISUAL_OFFSET: 6,            // 金币视觉偏移 (GameEngine.Spawn.js)
    MAGNET_RADIUS_DEFAULT: 60,        // 默认吸附半径 (Player.js + Spawn.js)
    GEM_LEVEL_SCALE: 0.5,

    /* ── 震动 ── */
    SHAKE_INTENSITY_STEP: 8,
    SHAKE_MAX_DISPLACEMENT: 24,
    SHAKE_MAX_DURATION_MS: 3000,

    /* ── Boss 深渊阈值 ── */
    BOSS_ABYSS_TIER_1: 1,             // 龙王第一阶段深渊阈值 (Enemy.js)
    BOSS_ABYSS_TIER_2: 2,             // 龙王第二阶段深渊阈值 (Enemy.js)
    BOSS_ABYSS_TIER_3: 3,             // 龙王第三阶段深渊阈值 (Enemy.js)
    BOSS_ABYSS_SPEED_MULT: 0.85,      // 龙王深渊速度修正 (Enemy.js)
    BOSS_ABYSS_RING_COUNT: 6,         // 龙王深渊弹幕数量 (Enemy.js)
    BOSS_ABYSS_RING_ANGLE: 0.26,      // 龙王深渊弹幕角度偏移 (Enemy.js)
    BOSS_SLAM_RANGE: 120,           // 龙王 Slam 命中半径 (Enemy.js)

    /* ── Timeout/Durations ── */
    TIMEOUT_SHATTER_ANIM_MS: 500,     // 碎裂动画超时 (Enemy.js)
    TIMEOUT_DECAY_DRAIN_MS: 3000,     // 腐蚀效果超时 (Enemy.js)
    TIMEOUT_BANG_REMOVE_MS: 1600,     // 花牌移除超时 (Spawn.js)
    TIMEOUT_NOTIF_REMOVE_MS: 3000,    // 通知移除超时 (Combat.js)
    TIMEOUT_TRAIL_REMOVE_MS: 400,     // 拖尾移除超时 (Combat.js)
    TIMEOUT_FLICKER_REMOVE_MS: 2600,  // 闪烁移除超时 (Combat.js)
    TIMEOUT_SLAM_REMOVE_MS: 300,      // 冲击波移除超时 (Combat.js)
    TIMEOUT_GUIDE_BEGIN_MS: 500,      // 引导开始超时 (Guide.js)
    TIMEOUT_EVENT_SLAM_MS: 500,       // 事件冲击波超时 (Events.js)
    TIMEOUT_ENDGAME_VICTORY_MS: 650,  // 胜利动画超时 (Endgame.js)
    TIMEOUT_ENDGAME_RETREAT_MS: 400,  // 撤退动画超时 (Endgame.js)

    /* ── 工具 ── */
    MS_PER_SECOND: 1000,
    PI_OVER_3: Math.PI * 2 / 3,
    PI_OVER_4: Math.PI * 4 / 3,
    BARRIER_ANGLE_HALF_WIDTH: Math.PI / 3,  // 屏障怪正面无敌扇区半角 60° (Enemy.js)

    /* ── HUPAI / MahjongHand.js + GameEngine.Spawn.js + Player.js ── */
    HUPAI_DROP_CHANCE: 0.06,
    HUPAI_FLOWER_POOL_RATIO: 0.05,
    HUPAI_MAIN_SUIT_WEIGHT: 0.50,
    HUPAI_SIDE_SUIT_WEIGHT: 0.25,
    HUPAI_HAND_MAX: 14,
    HUPAI_WILDCARD_MAX: 3,
    HUPAI_SWAP_GUARANTEE_PER_RUN: 2,
    HUPAI_TIER_MULTS: [1.0, 1.3, 1.6],
    HUPAI_MELD_EFFECT_MULT_JOKER: 1.5,
    HUPAI_PUNG_WAN_ATK_FACTOR: 1.5,
    HUPAI_PUNG_WAN_TARGETS: 3,
    HUPAI_PUNG_TONG_PROJ_ATK: 0.6,
    HUPAI_PUNG_TIAO_ASPD: 0.15,
    HUPAI_PUNG_TIAO_DURATION: 5,
    HUPAI_KONG_MULT_VS_PUNG: 2.2,
    HUPAI_RUN_WAN_DMG_INC: 0.03,
    HUPAI_RUN_TONG_CD_INC: 0.02,
    HUPAI_RUN_TONG_CD_CAP: 0.30,
    HUPAI_RUN_TIAO_SPD_INC: 0.02,
    HUPAI_RUN_TIAO_DODGE_INC: 0.01,
    HUPAI_RUN_TIAO_CAP: 0.15,
    HU_PIHU_GOLD: 50,
    HU_QINGYISE_DMG: 0.25,
    HU_PENGPENG_ASPD: 0.25,
    HU_PENGPENG_CD: 0.20,
    HU_QIDUI_DODGE: 0.15,
    HU_QIDUI_SPD: 0.15,
    HU_QIDUI_MAGNET: 0.80,
    HUPAI_ZI_EAST_KNOCKBACK: 250,

    /* ── Archer 一索箭妖 ── */
    ENEMY_ARCHER_HP_MULT: 0.7,
    ENEMY_ARCHER_ATK_MULT: 0.9,
    ENEMY_ARCHER_SPD_MULT: 0.95,
    ENEMY_ARCHER_FIRE_INTERVAL: 2.2,
    ENEMY_ARCHER_CHARGE_TIME: 0.5,
    ENEMY_ARCHER_PROJ_SPEED: 140,
    ENEMY_ARCHER_PROJ_RANGE: 320,
    ENEMY_ARCHER_DMG_MULT: 1.0,
    ENEMY_ARCHER_KITE_MIN: 170,
    ENEMY_ARCHER_KITE_MAX: 240,
};
