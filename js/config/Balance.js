/* ══════════════════════════════════════════════
   Balance Constants — 跨文件数值常量集中管理
   ══════════════════════════════════════════════ */

window.Balance = {
    /* ── Enemy (敌人基础属性 / 缩放) ── */
    ENEMY_LEVEL_HP_ATK_MULT: 1.15,   // 每级 HP/ATK 倍率 (Enemy.js)
    ABYSS_LOOP_HP_ATK_MULT: 1.08,   // 深渊轮回 HP/ATK 倍率 (Enemy.js)
    // ABYSS_SCALE_BASE removed: use ABYSS_LOOP_HP_ATK_MULT (1.08) as single source of truth
    ABYSS_LOOP_SPEED_MULT: 1.05,    // 深渊轮回 Speed 倍率 (Enemy.js)
    ABYSS_SHOP_PRICE_MULT: 1.0,     // R181-P0: 从1.5降至1.0，避免深渊经济崩溃（精英怪掉率低+高价商品=永远买不起）
    ABYSS_COMBO_UNLOCK_INTERVAL: 5, // 每 N 层解锁一个新深渊变异组合
    ABYSS_BLOODMOON_HP_MULT: 1.6,   // 深渊血月HP加成 (Loop.js _abyssCombo bloodmoon路径)
    ABYSS_BLOODMOON_ATK_MULT: 1.8,  // 深渊血月ATK加成 (Loop.js _abyssCombo bloodmoon路径)
    ABYSS_BLOODMOON_DROP_MULT: 2,   // 深渊血月掉落加成 (Loop.js Spawn.js)
    ABYSS_FRENZY_SPEED_MULT: 2.0,   // 深渊狂乱速度加成 (Loop.js)
    ABYSS_FRAILTY_ATK_MULT: 2.5,    // 深渊脆弱玩家攻击加成 (Loop.js _abyssCombo frailty路径)
    ABYSS_FRAILTY_DMG_MULT: 1.5,    // 深渊脆弱受伤加成 (Loop.js)
    TOTEM_LIFETIME: 8,              // 图腾生存时长(s) (Loop.js _totems清理)
    ENEMY_BASE_HP: 20,               // 普通敌人基础 HP (Enemy.js)
    ENEMY_BASE_ATK: 5,
    MAP_AFFINITY_REDUCTION_PER_LEVEL: 0.1,   // 每级关卡亲和减伤比例 (Boot.js)
    MAP_AFFINITY_MAX_LEVEL: 3,                // 关卡亲和最高等级
    ENEMY_LEVEL_SPEED_SCALE: 3,      // 每级速度增量 (Enemy.js)
    ENEMY_RADIUS: 18,                // 普通敌人碰撞半径 (Enemy.js)
    ENEMY_ATTACK_COOLDOWN: 1.5,      // 敌人攻击冷却 (Enemy.js)
    ENEMY_ATTACK_RANGE_OFFSET: 30,   // 攻击范围偏移 (Enemy.js)
    ENEMY_ATTACK_PADDING: 5,         // 攻击判定内缩 (Enemy.js)
    FLASH_DURATION: 0.18,            // 受击闪烁持续时间 (Enemy.js) — 与CSS flashHit动画0.18s对齐

    /* ── Weapon (武器升级 / 弹道) ── */
    WEAPON_UPGRADE_ATK_INC: 0.15,    // 武器升级 ATK 因子增量 (Weapon.js)
    WEAPON_UPGRADE_CD_MULT: 0.9,     // 武器升级 CD 倍率 (Weapon.js)
    DEFAULT_CD_FLOOR: 0.2,           // 默认 CD 下限 (Weapon.js)
    WEAPON_AMPLIFY_ATK_FACTOR_INC: 0.2,  // 役牌加算 ATK 因子增量 (Player.js)
    ATK_FACTOR_MAX_CAP: 10.0,            // 武器atkFactor全局上限 (Player.js weapon_amplify + Weapon.js upgrade)
    WEAPON_ASPD_CAP: 3.0,            // 最大临时攻速叠加上限（防止无限加速）
    PROJECTILE_DEFAULT_LIFETIME: 3.0,// 弹道默认存活时间 (Weapon.js)

    /* ── Player (玩家机制) ── */
    PLAYER_INVULN_ON_HIT: 0.35,      // 受击无敌帧时长 (Player.js)
    PLAYER_HITFLASH_DURATION: 0.3,   // 受击闪烁时长 + Combat.js 归一化分母 (Player.js + Combat.js)
    HERO_ASPD_BONUS: 0.15,           // 雀灵流转攻击速度加成 (Player.js Hero) — 实际增加_weaponCdReduction而非移速
    HERO_ASSASSIN_SPEED_MULT: 1.10,  // 暗影步移速加成 (Player.js Assassin)
    HERO_ASSASSIN_DODGE_ASPD_MULT: 1.20,  // 暗影步闪避后攻速加成 (Player.js Assassin)
    HERO_ASSASSIN_DODGE_ASPD_DURATION: 5.0,  // 闪避后攻速加成持续时间 (Player.js)
    HERO_CD_FLOOR_REDUCTION: 0.90,   // 雀灵流转CD降低 (Player.js Hero)
    MAX_WEAPON_CD_REDUCTION: 0.60,   // 武器CD缩减上限(防接近零CD) (RewardManager.js gravity_mastery)
    EVOLVED_DODGE_BONUS: 0.3,        // 极速图腾闪避加成 (Player.js)
    RELIC_WW_SPEED_PER_LEVEL: 0.15,  // 四风环绕Lv级移速加成 (Player.js)
    RELIC_WW_DODGE_PER_LEVEL: 0.1,   // 四风环绕Lv级闪避加成 (Player.js)
    RELIC_FROST_CORE_DURATION_PER_LEVEL: 0.5,  // 冰霜核心长效词条每级冰时加成 (Player.js)
    DRONE_INTERVALS: [0, 1.0, 0.8, 0.6, 0.4], // 无人机攻击间隔（Lv0~Lv4）(Player.js)
    RELIC_GOLDEN_FINGER_CRIT_INC: 0.15, // 鬼指每级暴击加成 (Player.js)
    MAX_LIFESTEAL_RATE: 0.8,         // 吸血上限 (Player.js)
    MAX_DODGE_RATE: 0.8,             // 闪避率上限 (RewardManager secret 四风狂飙)
    CORE_RES_PER_LEVEL: 0.1,         // R235-P1: 核心共振每级加成 (Combat.js + SaveManager.Core.js)
    MAX_XP_GAIN_FACTOR: 2.0,         // EXP获取倍率上限 (Player.js relic gc_xp)
    MAX_FREEZE_DURATION_BONUS: 5.0,  // ice_bonus词条累计冻结时长上限(s) (Player.js)
    MAX_SPEED_BONUS_PCT: 0.30,       // speed_pct词条累计移速加成上限(相对baseSpeed) (Player.js)
    MAX_MAGNET_RADIUS: 200,          // 磁铁半径上限 (Player.js)
    MAX_EQUIP_HP_BOOST: 500,         // 装备hp_boost累计上限 (Player.js _reapplyMetaBonuses/reset)
    MAX_EQUIP_ATK_FACTOR: 3.0,       // 装备atk_factor单项钳制上限(每项独立min cap, 累计乘法叠加) (Player.js _reapplyMetaBonuses/reset)
    PLAYER_MAX_SPEED: 500,           // 玩家速度上限 (Spawn.js 条顺攻速保护)
    LIFESTEAL_PER_VAMP_LEVEL: 0.08,  // 吸血戒指每级增幅 (Player.js)
    MAX_EXPLOSION_CHANCE: 0.75,      // 爆炸概率上限 (Player.js)
    EXPLOSION_PER_LEVEL: 0.15,       // 爆破核心每级增幅 (Player.js)
    MAX_FREEZE_CHANCE: 0.5,          // 冰冻概率上限 (Player.js)
    FREEZE_PER_LEVEL: 0.10,          // 冰霜核心每级增幅 (Player.js)

    /* ── Combat (战斗特效) ── */
    FLOAT_TEXT_TIMEOUT_MS: 650,      // 飘字消失延迟 (GameCombat.js)
    EXPLOSION_EFFECT_TIMEOUT: 400,   // 爆炸特效消失延迟 (GameCombat.js)
    CAUSALITY_TIMEOUT_MS: 2000,      // 因果文本消失延迟 (GameCombat.js)
    SPLASH_DAMAGE_MULT: 0.5,         // 爆炸溅射伤害系数 (Endgame.js + Enemy.js)

    /* ── 突变系统 ── */
    MUTATOR_BLOODMOON_ATK_MULT: 1.4,
    MUTATOR_BLOODMOON_HP_MULT: 1.3,
    MUTATOR_FRENZY_SPEED_MULT: 1.5,
    MUTATOR_FRENZY_GOLD_MULT: 1.5,
    MUTATOR_FRAILTY_PLAYER_ATK_MULT: 1.8,
    MUTATOR_FRAILTY_DAMAGE_TAKEN_MULT: 1.3,
    BOSS_P3_CONTACT_DMG_MULT: 2.5,      // P3接触伤害倍率 (Enemy.js)
    BOSS_P2_SLAM_DMG_MULT: 2.0,         // P2砸地伤害倍率 (Enemy.js)

    /* ── 刷怪系统 ── */
    DEFAULT_SPAWN_INTERVAL: 1.5,
    DEFAULT_SPAWN_INTERVAL_DECAY: 0.02,
    SPAWN_INTERVAL_MIN: 0.5,
    BOSS_SPAWN_INTERVAL: 30,
    ENEMY_SPAWN_RADIUS: 200,
    ENEMY_SPAWN_RADIUS_JITTER: 50,
    ENEMY_SPAWN_MARGIN: 20,
    DEFAULT_ENEMY_WEIGHTS: { Normal: 0.20, Tanker: 0.14, Stalker: 0.17, Archer: 0.14, Shaman: 0.09, Barrier: 0.12, Bomber: 0.10, Splitter: 0.04 },

    /* ── 玩家系统 ── */
    PLAYER_MAX_RAGE: 100,

    /* R118-P1: 新增平衡常量 */
    EVOLVED_ARMOR_THORNS_BASE: 0.5,       // 太阳神巨像基础反伤率 (Player.js addRelic)
    EVOLVED_ARMOR_THORNS_CAP: 1.0,        // 太阳神巨像反伤率上限 (Player.js _recalcThornsRate)
    DEFAULT_THORNS_CAP: 0.5,              // 普通反伤率上限 (Player.js _recalcThornsRate)
    AUTO_SAVE_INTERVAL: 30,               // 周期性自动存档间隔(s) (Loop.js _autoSave)
    FROST_SLOW_MULT: 0.75,                // 北冥图腾减速乘数 (Loop.js player.speed)
    EVOLVED_DRONE_INTERVAL: 0.35,         // 进化无人机攻击间隔(s) (Loop.js drone)
    BOSS_P3_RAD_DMG_MULT: 0.6,            // Boss P3辐射伤害倍率 (Enemy.js)
    FLAME_AURA_DAMAGE_MULT: 0.10,         // 焰痕套装共鸣每0.5s伤害倍率 (GameSystems.js)
    FLAME_AURA_INTERVAL: 0.5,              // 焰痕套装共鸣触发间隔(s) (GameSystems.js)
    FLAME_AURA_RADIUS: 80,                  // 焰痕套装共鸣半径(px) (GameSystems.js)
    ICE_AURA_INTERVAL: 0.8,                 // 永冻套装共鸣触发间隔(s) (GameSystems.js)
    ICE_AURA_RADIUS: 60,                    // 永冻套装共鸣半径(px) (GameSystems.js)
    ICE_AURA_BASE_DURATION: 0.5,            // 永冻套装共鸣基础持续时间(s) (GameSystems.js)
    WITHER_HP_LOSS_PCT: 0.05,               // 枯萎突变每秒HP损失比例 (GameSystems.js)
    THORN_PER_LEVEL: 0.05,                  // 太阳神巨像每级反伤率增量 (Player.js)
    PLAYER_RADIUS: 28,
    REVIVE_HP_PERCENT: 0.3,
    REVIVE_INVULN_DURATION: 1.5,
    /* QUEN_SHIELD_BASE_DURATION / QUEN_SHIELD_DURATION_PER_LEVEL: 已废弃 — 无代码引用 */
    REVIVE_INVULN_RESTORE_DURATION: 3.0,  // 复活恢复无敌时长 (Player.js shouldRevive)
    TEMP_HP_REGEN_PER_SEC: 2,

    /* ── FxManager ── */
    FCT_POOL_SIZE_INIT: 50,
    FCT_POOL_MAX_GROWTH: 200,
    FCT_FALLBACK_TIMEOUT_MS: 2000, /* R226-P1: 降低至2s，避免节点空闲占用池容量过久 */
    FCT_HEALTHCHECK_MODULO: 500, /* R187-P1: 从50提升到500，减少激烈战斗中的全池扫描频率 */
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

    /* ── 波次 ── */
    WAVE_INTER_EVENT_CHANCE: 0.6,     // 波次间事件触发概率 (GameEngine.Loop.js)
    WAVE_MEDITATION_HP_RESTORE: 0.3,   // 冥想泉源 HP 恢复比例 (Events.js)
    WAVE_MEDITATION_ATK_DEBUFF: 0.8,   // 冥想泉源怪物 ATK 减益 (Events.js)
    WAVE_TIME_DILATION_SPEED_DEBUFF: 0.7, // 时光缓流移速减益 (Events.js)
    WAVE_IRON_FIST_CRIT_BONUS: 0.25,   // 铁拳暴击加成 (Events.js)
    KNIGHT_SLAM_ATK_FACTOR: 0.5,       // 骑士闪避冲击波 ATK 系数 (Events.js)
    DRONE_EVOLVED_SLAM_FACTOR: 0.6,    // 进化无人机撞击伤害系数 (Loop.js)
    DRONE_NORMAL_SLAM_FACTOR: 0.4,     // 普通无人机撞击伤害系数 (Loop.js)

    /* ── 图腾 ── */
    TOTEM_SPAWN_INTERVAL: 5,
    TOTEM_BUFF_SPEED_MULT: 1.3,              // 图腾增益速度倍率 (Enemy.js)
    TOTEM_BUFF_ATK_MULT: 1.2,                // 图腾增益攻击倍率 (Enemy.js) — GAME_BIBLE 写明"攻×1.2"

    /* ── Stalker ── */
    STALKER_ATTACK_MULT: 1.5,            // 猎杀者蓄力攻击加成 (Enemy.js)
    THORN_CRIT_MULT: 1.8,                // 刺藤甲暴击加成 (Player.js)
    STALKER_TRIGGER_DIST: 150,
    STALKER_CHARGE_SPEED_MULT: 2.5,
    STALKER_FATIGUE_DURATION: 3.0,
    STALKER_COOLDOWN: 2.0,

    /* ── Shaman ── */
    SHAMAN_RETREAT_DIST: 30,    // R236-P0: 从50降至30，确保撤退距离<攻击范围(48px)，让Shaman可正常攻击
    SHAMAN_ADVANCE_DIST: 80,    // R177-P0: 从250降至80，确保Shaman能在攻击范围内触发前进

    /* ── Boss ── */
    BOSS_LORD_BASE_HP: 250,
    BOSS_LORD_BASE_ATK: 50,
    BOSS_LORD_BASE_SPEED: 20,
    BOSS_PHASE3_SPEED_MULT: 1.8,
    BOSS_GAMBLE_HP_MULT: 1.5,            // 深渊试炼Boss HP加成 (GameEngine.Events.js)
    VAULT_BLOODMOON_ATK_MULT: 1.4,         // 变异保险库血月Boss ATK加成 (GameEngine.Events.js)
    VAULT_BLOODMOON_HP_MULT: 1.3,          // 变异保险库血月Boss HP加成 (GameEngine.Events.js)
    BOSS_BLOOD_RAGE_SPEED_MULT: 1.2,       // 龙王狂暴速度加成 (GameEngine.Events.js)
    BOSS_PHASE1_THRESHOLD: 0.7,    // 龙王第一阶段HP阈值 (Enemy.js)
    BOSS_PHASE1_ABILITY_INTERVAL: 1.8,  // 龙王P1技能间隔 (Enemy.js)
    BOSS_P1_MIN_DIST: 200,          // 龙王P1保持最小距离(px) (Enemy.js)
    BOSS_PHASE2_THRESHOLD: 0.3,    // 龙王第二阶段HP阈值 (Enemy.js)
    BOSS_PHASE2_ABILITY_INTERVAL: 2.0,  // 龙王二阶段技能间隔 (Enemy.js)
    EQUIPMENT_DROPS_BOSS_LORD: 1.0,  // 龙王装备掉落概率 (GameEngine.Spawn.js)
    EQUIPMENT_DROPS_NORMAL: 0.25,    // 普通怪物装备掉落概率 (GameEngine.Spawn.js)
    EQUIPMENT_QUALITY_LEGENDARY_CHANCE: 0.15,  // 传说品质阈值 (roll < 0.15) (Spawn.js _tryDropEquipment)
    EQUIPMENT_QUALITY_EPIC_CHANCE: 0.50,       // 史诗品质阈值 (roll < 0.50) (Spawn.js _tryDropEquipment)
    BARRIER_HP_MULT: 1.5,            // 屏障怪HP倍率 (Enemy.js)
    BARRIER_ATK_MULT: 0.7,           // 屏障怪ATK倍率 (Enemy.js)
    BARRIER_SPEED_MULT: 0.8,         // 屏障怪速度倍率 (Enemy.js)
    BARRIER_FRONT_DAMAGE_MULT: 0.0,  // 屏障正面伤害倍率 (Enemy.js)
    BARRIER_FRONT_COS_ANGLE: 0.866,  // cos(30°) — 屏障正面判定阈值 (60°扇区)
    BOMBER_HP_MULT: 0.6,             // 自爆怪HP倍率 (Enemy.js)
    BOMBER_ATK_MULT: 2,              // 自爆怪ATK倍率 (Enemy.js)
    BOMBER_SPEED_MULT: 1.8,          // 自爆怪速度倍率 (Enemy.js)
    BOMBER_EXPLODE_RADIUS: 60,       // 自爆怪爆炸半径 (Enemy.js)
    BOMBER_EXPLODE_DAMAGE_MULT: 0.5, // 自爆怪爆炸伤害倍率 (Enemy.js)
    SPLITTER_HP_MULT: 1.2,           // 分身怪HP倍率 (Enemy.js)
    SPLITTER_CHILD_HP_MULT: 0.5,     // 分身怪子体HP倍率 (Enemy.js)
    SPLITTER_CHILD_ATK_MULT: 0.5,    // 分身怪子体ATK倍率 (Enemy.js)
    SPLITTER_CHILD_SPEED_MULT: 1.2,  // 分身怪子体速度倍率 (Enemy.js)
    BOSS_NONLORD_SPEED_MULT: 0.7,    // 非龙王Boss速度倍率 (Enemy.js)
    BOSS_NONLORD_ATK_MULT: 3,        // 非龙王Boss攻击倍率 (Enemy.js) — 替代BOMBER_ATK_MULT
    BOSS_NONLORD_HP_MULT: 6,          // R159-P1: 非龙王Boss HP倍率（原硬编码6）
    STALKER_CHARGE_DURATION: 1.5,    // 猎杀者蓄力时长 (Enemy.js)
    STALKER_CHARGE_OPACITY: 0.4,     // 猎杀者蓄力透明度 (Enemy.js)
    ENEMY_DEAD_OPACITY: 0,           // 敌人死亡透明度 (Enemy.js)
    BOSS_WARNING_DURATION: 0.8,
    BOSS_PHASE3_SUMMON_INTERVAL: 4,
    BOSS_P3_RADIATION_COUNT: 6,     // P3辐射弹幕数量 (Enemy.js)
    BOSS_P3_RADIATION_SPEED: 80,    // P3辐射弹幕速度 (Enemy.js)
    BOSS_P3_RADIATION_LIFE: 3,      // P3辐射弹幕生命(s) (Enemy.js)
    BOSS_RING_PROJ_LIFE: 4,         // P1/P2环形弹幕生命(s) (Enemy.js _fireRing)
    BOSS_P3_RADIATION_INTERVAL: 1.5, // P3辐射弹幕间隔(s) (Enemy.js)
    BOSS_PHASE3_SUMMON_STALKER: 4,
    BOSS_PHASE3_SUMMON_TANKER: 2,
    BOSS_PHASE3_SUMMON_MAX: 10,          // P3单次召唤上限 (Enemy.js)
    ELITE_HP_MULT: 1.5,                  // 精英模式HP倍率 (GameSpawner.js / Events.js)
    ELITE_ATK_MULT: 1.5,                 // 精英模式ATK倍率 (GameSpawner.js / Events.js)
    ELITE_CORE_MULT: 1.5,                // 精英模式核心收益倍率 (Boot.js)
    /* R144-P0: 删除ELITE_ENEMY_HP/ATK_MULT死代码 — 从未被任何JS引用，且ATK值(1.3)与ELITE_ATK_MULT(1.5)不一致易误导 */

    /* ── 敌人 ── */
    TANKER_HP_MULT: 2,
    TANKER_SPEED_MULT: 0.5,
    TANKER_CRACK_HP_THRESHOLD: 0.5,  // 坦克龟裂纹HP阈值 (Enemy.js)
    TANKER_SIDESHOT_REDUCTION: 0.5,
    TANKER_SIDE_THRESHOLD: 0.7,     // Tanker侧面减伤cos阈值 (Enemy.js)
    ASSASSIN_CRIT_MULT: 1.5,
    KNOCKBACK_DAMAGE_REDUCTION: 0.5,  // 屏障侧向伤害衰减 (Enemy.js)
    KNIGHT_COMBO_CHANCE: 0.15,         // 骑士万子连击触发概率 (Enemy.js)
    KNIGHT_COMBO_COOLDOWN: 2.0,        // 骑士万子连击单目标冷却 (秒) (Enemy.js)
    KNIGHT_COMBO_DAMAGE_MULT: 1.5,     // 骑士万子连击伤害倍率 (Enemy.js)
    CRIT_BASE_MULT: 2.5,               // 暴击基础倍率 (Enemy.js + Endgame.js)
    CRIT_DAMAGE_BONUS_MAX: 2.0,        // R262-P1: 暴击伤害加成的全局上限 (from secrets like frost_blade)
    THORNS_DAMAGE_CAP_MULT: 2,         // 荆棘伤害上限倍数（玩家ATK×N）(Player.js)
    VAULT_MUTATION_UNLOCK_CHANCE: 0.2, // 变异保险库解锁概率 (Combat.js)
    BOSS_CONTACT_COOLDOWN: 1.0,  // 龙王接触伤害CD (Enemy.js) — 从0.5提升到1.0防止P3瞬杀
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
    GROUND_SLAMMER_WAVE_DURATION: 2.0, /* R231-P0: 扩大震波持续时间从0.2s→2s，确保视觉效果和伤害窗口匹配 */
    GROUND_SLAMMER_MIN_RADIUS: 10,
    GROUND_SLAMMER_RADIUS_GROWTH: 70,
    GROUND_SLAMMER_KNOCKBACK_FORCE: 200,
    KNOCKBACK_DECAY_RATE: 200,     // 击退速度衰减速率 px/s (Enemy.js)
    LASER_BEAM_LENGTH: 300,
    LASER_BEAM_MAX_HITS: 1,
    LASER_HIT_RADIUS: 30, /* R231-P1: 增大激光命中半径从4→30，使LaserBeam实际可用 */
    TRACKING_BLADE_PROJ_LIFE: 2.0,
    TRACKING_BLADE_CD: 0.8, /* GAME_BIBLE: TrackingBlade CD=0.8s | R152-P1: 修正从0.5→0.8对齐设计文档 */
    ORBIT_SHIELD_CD: 0.5,   // 环形护体CD (Weapon.js)
    SHOTGUN_BURST_CD: 0.4,    // 七对散牌CD (Weapon.js)
    GROUND_SLAMMER_CD: 1.8,   // 碰牌震波CD (Weapon.js)
    LASER_BEAM_CD: 0.3,       // 一气贯通CD (Weapon.js)
    SHOTGUN_PROJ_LIFE: 0.8,
    TRACKING_BLADE_RADIUS: 4,
    SHOTGUN_RADIUS: 3,
    KNIGHT_DODGE_SLAM_RADIUS: 100,
    KNIGHT_DODGE_SLAM_FORCE: 200,
    KNIGHT_DODGE_SLAM_TIMEOUT_MS: 3000,
    NOVA_PULSE_MAX_RADIUS: 350,      // NovaPulse清一色最大半径(px) (Weapon.js)
    NOVA_PULSE_EXPAND_DURATION: 0.5,  // NovaPulse扩展时长(s) (Weapon.js)
    NOVA_PULSE_CD: 7.0,             // 大四喜CD (Weapon.js) — GAME_BIBLE: 7.0s
    NOVA_PULSE_ATK_FACTOR: 5.0,      // 大四喜atkFactor (Weapon.js) — GAME_BIBLE: 5.0
    NOVA_ORBIT_SPEED_MULT: 1.5,       // 大四喜+三面 旋转加速倍率 (Weapon.js OrbitShield)

    /* ── 经验石/金币 ── */
    BOSS_MIN_GEM_COUNT: 5,
    BOSS_EXTRA_GEM_COUNT: 4,
    BOSS_TOTAL_EXP_GEMS: 25,
    NORMAL_GEM_VALUE_BASE: 1,
    COIN_COUNT_BOSS_BASE: 5,
    COIN_COUNT_BOSS_PER_LVL: 0.5,
    COIN_COUNT_BOSS_RANDOM_MAX: 4,        // Boss金币随机范围上限 (Spawn.js _spawnCoinsAt / _rewardKill)
    COIN_COUNT_NORMAL_BASE: 3,
    COIN_COUNT_NORMAL_PER_LVL: 0.3,
    COIN_COUNT_NORMAL_RANDOM_MAX: 3,       // 普通金币随机范围上限 (Spawn.js _spawnCoinsAt / _rewardKill)
    COIN_SCATTER: 20,
    COIN_BURST_SCATTER: 60,          // 金币雨散开距离 (Events.js _spawnCoinBurst)
    COIN_BURST_VALUE: 1,             // 金币雨单枚金币基础价值 (Events.js)
    INTERWAVE_SHIELD_DURATION: 15,   // 信仰护盾持续时间(s) (Events.js shield_of_faith)
    BOSS_SPAWN_Y_RATIO: 0.35,        // Boss生成Y位置占地图高度比例 (Events.js)
    TEMP_ATK_BOOST_CAP: 3.0,         // 临时攻击加成上限(防无限叠加) (Spawn.js + RewardManager.js)
    /* ── Coin/Gem 拾取 ── */
    COIN_VISUAL_OFFSET: 6,            // 金币视觉偏移 (GameEngine.Spawn.js)
    MAGNET_RADIUS_DEFAULT: 60,        // 默认吸附半径 (Player.js + Spawn.js)
    GEM_LEVEL_SCALE: 0.5,

    /* ── 震动 ── */
    // SHAKE_* constants removed (R206-P2): GameSystems.js hardcodes intensity*8 and min(duration,3000) inline

    /* ── Boss 深渊阈值 ── */
    BOSS_ABYSS_TIER_1: 1,             // 龙王第一阶段深渊阈值 (Enemy.js)
    BOSS_ABYSS_TIER_2: 2,             // 龙王第二阶段深渊阈值 (Enemy.js)
    BOSS_ABYSS_TIER_3: 3,             // 龙王第三阶段深渊阈值 (Enemy.js)
    BOSS_ABYSS_SPEED_MULT: 0.85,      // 龙王深渊速度修正 (Enemy.js)
    BOSS_ABYSS_RING_COUNT: 6,         // 龙王深渊弹幕数量 (Enemy.js)
    BOSS_ABYSS_RING_ANGLE: 0.26,      // 龙王深渊弹幕角度偏移 (Enemy.js)
    BOSS_SLAM_RANGE: 120,           // 龙王 Slam 命中半径 (Enemy.js)
    OVERDRIVE_DURATION: 3.0,         // 超驱动持续时间 (Events.js)
    EXP_GEM_TTL_SECONDS: 30,         // 经验石过期时间 (ExpGem.js)
    LEVEL_EXP_BASE: 25,               // 初始升级所需EXP (Player.js)
    LEVEL_EXP_SCALE: 10,              // 每级EXP增量 (Player.js)
    LEVEL_EXP_OFFSET: 15,             // EXP公式偏移量 (Player.js)

    /* ── 死亡补偿 ── */
    DEATH_REWARD_TOKEN_RATIO: 10,       // 金币转代币比例 (SaveManager.RunStats.js)
    DEATH_REWARD_CORE_RATIO: 50,        // 击杀转核心比例 (SaveManager.RunStats.js)
    DEATH_REWARD_FAST_TIME_THRESHOLD: 60, // 快速死亡阈值秒 (SaveManager.RunStats.js)
    DEATH_REWARD_FAST_TOKEN_MULT: 0.5,  // 快速死亡代币减半倍数 (SaveManager.RunStats.js)

    /* ── 深渊组合惩罚 ── */
    ABYSS_GRAVITY_COIN_REDUCTION: 0.5, // 深渊引力金币-50%惩罚 (Spawn.js _updateCoins)
    ABYSS_WITHER_DRAIN_HP_PCT: 0.02,      // 深渊凋零每秒HP损失比例 (Loop.js abyss_wither combo)

    /* ── 深渊狂乱 ── */
    ABYSS_FRENZY_HEAL_PCT: 0.10,       // 深渊狂乱击杀回血比例（玩家ATK×此值）(Spawn.js _rewardKill)

    /* ── Timeout/Durations ── */
    TIMEOUT_DECAY_DRAIN_MS: 3000,     // 腐蚀效果超时 (Enemy.js)
    TIMEOUT_BANG_REMOVE_MS: 1600,     // 花牌移除超时 (Spawn.js)
    TIMEOUT_NOTIF_REMOVE_MS: 3000,    // 通知移除超时 (Combat.js)
    TIMEOUT_TRAIL_REMOVE_MS: 400,     // 拖尾移除超时 (Combat.js)
    TIMEOUT_FLICKER_REMOVE_MS: 2600,  // 闪烁移除超时 (Combat.js)

    /* ── 天气/环境 ── */
    WEATHER_RAIN_TRIGGER_WAVE: 5,       // 雨滴天气触发波次门槛 (Loop.js)
    WEATHER_RAIN_INTERVAL: 0.05,        // 雨滴生成间隔(s) (Loop.js _rainTimer)
    /* ── 突变 ── */
    MUTATOR_WITHER_TICK_INTERVAL: 5,    // 枯萎突变伤害间隔(s) (Loop.js _witherTimer)
    ABYSS_WITHER_TICK_INTERVAL: 1,      // 深渊凋零伤害间隔(s) (Loop.js _witherAbyssTimer)
    /* ── 里程碑 ── */
    MILESTONE_CHECK_INTERVAL: 3,        // 里程碑检查间隔(s) (Loop.js _milestoneCheckTimer)

    /* ── 工具 ── */

    /* ── HUPAI / MahjongHand.js + GameEngine.Spawn.js + Player.js ── */
    HUPAI_DROP_CHANCE: 0.06,
    HUPAI_FLOWER_POOL_RATIO: 0.03, /* R188-P1: 从0.05降至0.03，对齐设计文档要求 */
    HUPAI_MAIN_SUIT_WEIGHT: 0.50,
    HUPAI_HAND_MAX: 14,
    HUPAI_WILDCARD_MAX: 3,
    HUPAI_TIER_MULTS: [1.0, 1.3, 1.6],
    HUPAI_MELD_EFFECT_MULT_JOKER: 1.5,
    HUPAI_PUNG_WAN_ATK_FACTOR: 1.5,
    HUPAI_PUNG_WAN_TARGETS: 3,
    HUPAI_PUNG_TONG_PROJ_ATK: 0.6,
    HUPAI_PUNG_TIAO_ASPD: 0.15,
    HUPAI_PUNG_TIAO_DURATION: 5,
    HUPAI_KONG_MULT_VS_PUNG: 2.2,
    HUPAI_RUN_TONG_CD_INC: 0.02,
    HUPAI_RUN_TONG_CD_CAP: 0.30,
    HUPAI_RUN_TIAO_SPD_INC: 0.02,
    HUPAI_RUN_TIAO_DODGE_INC: 0.01,
    HUPAI_RUN_TIAO_CAP: 0.15,
    HU_QINGYISE_DMG: 0.25,
    HU_PENGPENG_ASPD: 0.25,
    HU_PENGPENG_CD: 0.20,
    HU_QIDUI_DODGE: 0.15,
    HU_QIDUI_SPD: 0.15,
    /* R133-P2: 刪除重複定義（原 0.20 為草稿，最終值 0.80 在第329行） */
    /* R130-P0: 竹牌花牌护盾常量 — 护盾值 = 玩家 ATK × 此倍率 (Spawn.js:439) */
    HUPAI_HUA_ZHU_SHIELD: 0.30,
    HUPAI_HUA_ZHU_SHIELD_DUR: 8,    /* 护盾持续秒数 */
    HU_QIDUI_MAGNET: 0.80,
    ATK_MAX_CAP: 9999, /* R56-P1: 玩家攻击力上限保护，防止胡牌增益无限叠加 */
    HUPAI_ZI_EAST_KNOCKBACK: 250,

    /* ── 花牌效果数值（Spawn.js _triggerFlowerEvent）── */
    HUPAI_HUA_CHUN_HEAL_PCT: 0.30,        // 花春回复HP比例 (Spawn.js hua_chun)
    HUPAI_HUA_XIA_ATK_BOOST: 0.30,        // 花夏攻击临时加成 (Spawn.js hua_xia)
    HUPAI_HUA_XIA_BUFF_DURATION: 5,       // 花夏增益持续时间(s) (Spawn.js hua_xia)
    HUPAI_HUA_LAN_CRIT_INC: 0.10,         // 花兰暴击率加成 (Spawn.js hua_lan)
    HUPAI_HUA_ZHU_HEAL_PCT: 0.15,         // 花竹回复HP比例 (Spawn.js hua_zhu)
    HUPAI_HUA_QIU_GOLD_PER_WAVE: 20,      // 花秋金币奖励 per wave (Spawn.js hua_qiu)
    HUPAI_HUA_JU_GOLD_PER_WAVE: 10,       // 菊花金币奖励 per wave (Spawn.js hua_ju)
    HUPAI_HUA_DONGJ_FREEZE_DUR: 1.5,      // 花冬（冻J）冰封时长基准 (Spawn.js hua_dongJ)
    /* ── 字牌刻子效果（Spawn.js _triggerHonorMeld）── */
    HUPAI_FENG_NAN_HP_DMG_PCT: 0.08,      // 南火燎原伤害比例 maxHp×此值 (Spawn.js feng_nan)
    HUPAI_JIAN_BAI_HP_RESTORE_PCT: 0.20,  // 白板归真回血比例 (Spawn.js jian_bai)
    /* ── 九筒连环弹幕（Spawn.js _triggerMeld）── */
    HUPAI_PUNG_TONG_PROJ_SPEED: 280,      // 九筒连环投射物速度 px/s (Spawn.js)
    HUPAI_PUNG_TONG_PROJ_RADIUS: 4,       // 九筒连环投射物碰撞半径 px (Spawn.js)
    /* ── 经验宝石视觉（Spawn.js _updateExpGems）── */
    EXP_GEM_SIZE_BASE: 4,                 // 经验宝石基础尺寸 px (Spawn.js sz=4+min(gem.value,8))
    EXP_GEM_SIZE_MAX_VAL: 8,              // 经验宝石尺寸上限参数 min(gem.value, N) (Spawn.js)

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
