window.ExpGem = class {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.value = value;
        this.el = null;
        this.collected = false;
        this.birthTime = Date.now();
        this.ttl = Balance.EXP_GEM_TTL_SECONDS; /* 30秒过期 */
        this._gameBirth = undefined; /* R136-P0: 游戏内出生时间(秒)，由Spawn.js设置 */
    }
    /* R136-P0: 传入游戏时钟可避免overlay冻结时宝石提前过期 */
    isExpired(gameElapsed) {
        if (this._gameBirth !== undefined && gameElapsed !== undefined) {
            return (gameElapsed - this._gameBirth) >= this.ttl;
        }
        return (Date.now() - this.birthTime) / 1000 >= this.ttl;
    }
};
