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
    }
    isExpired() {
        return (Date.now() - this.birthTime) / 1000 >= this.ttl;
    }
};
