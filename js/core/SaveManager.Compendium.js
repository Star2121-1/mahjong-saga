/**
 * SaveManager.Compendium — 图鉴/成就/秘密追踪
 * 挂载到 SaveManager.prototype
 */
(function() {
    'use strict';

    /* R124-P1: 节流定时器，延迟合并多次 recordCompendiumEntry 调用 */
    var _compSaveTimer = null;
    SaveManager.prototype.recordCompendiumEntry = function(category, id) {
        if (!this._metaCache) return;
        var arr = this._metaCache.compendium[category];
        if (!arr) return;
        if (arr.indexOf(id) === -1) {
            arr.push(id);
            if (!_compSaveTimer) {
                _compSaveTimer = setTimeout(function() {
                    _compSaveTimer = null;
                    this._saveMetaToStorage().catch(function(e) { console.warn('[Compendium] save failed:', e); });
                }.bind(this), 200);
            }
        }
    };

    SaveManager.prototype.recordDiscoveredSecret = async function(secretId) {
        var self = this;
        return this.getMeta().then(function(meta) {
            if (!meta.discoveredSecrets) meta.discoveredSecrets = [];
            if (meta.discoveredSecrets.indexOf(secretId) === -1) {
                meta.discoveredSecrets.push(secretId);
                return self.saveMeta(meta);
            }
            return meta;
        });
    };

    SaveManager.prototype.getDiscoveredSecrets = function() {
        var meta = this._metaCache || {};
        return meta.discoveredSecrets || [];
    };

    SaveManager.prototype.getCompendiumProgress = function() {
        if (!this._metaCache) return { relics: 0, weapons: 0, enemies: 0, mutations: 0, total: 0, seen: 0 };
        var c = this._metaCache.compendium;
        var total = 0, seen = 0;
        var relicIds = ['sharp_edge','golden_finger','auto_drone','thorn_armor','wind_walker','vamp_ring','explosive_core','frost_core','gravity_core','weapon_amplify'];
        var weaponIds = Object.keys(window.rewardManager && window.rewardManager.weaponInfos || {});
        var enemyIds = ['Normal','Tanker','Stalker','Shaman','Boss_Lord'];
        var equipIds = Object.keys(window.equipmentRegistry && window.equipmentRegistry.equipPool || {});
        total += relicIds.length; total += weaponIds.length;
        total += enemyIds.length; total += equipIds.length;
        var mutatorIds = ['gravity','bloodmoon','frenzy','frailty','wither'];
        total += mutatorIds.length;
        // hupai compendium: huTypes recorded via game enginespawn (see Spawn.js:625)
        total += 8; /* 胡牌类型数: 平糊/清一色/碰碰/七对/全带幺/混一色/断幺/对对胡 */
        seen += (c.relics || []).length;
        seen += (c.weapons || []).length;
        seen += (c.enemies || []).length;
        seen += (c.equips || []).length;
        seen += (c.mutations || []).length;
        seen += (c.hupai || []).length;
        return {
            relics: (c.relics || []).length, relicsTotal: relicIds.length,
            weapons: (c.weapons || []).length, weaponsTotal: weaponIds.length,
            enemies: (c.enemies || []).length, enemiesTotal: enemyIds.length,
            equips: (c.equips || []).length, equipsTotal: equipIds.length,
            mutations: (c.mutations || []).length, mutationsTotal: mutatorIds.length,
            total: total, seen: seen,
            pct: total > 0 ? Math.round(seen / total * 100) : 0
        };
    };

})();
