(function() {
    var _heroIds = ['hero_swordsman', 'hero_colossus', 'hero_phantom'];
    var _currentHeroIndex = 0;
    var _currentLevelId = 'level_1';

    var DOM = {};

    function $(id) { return document.getElementById(id); }

    window.HubTabController = {
        _currentPanel: 'tavern',

        init: function() {
            var self = this;
            var tabs = document.querySelectorAll('#hub-navigation-tabs .hub-tab');
            for (var i = 0; i < tabs.length; i++) {
                tabs[i].addEventListener('click', function(e) {
                    var panelId = this.getAttribute('data-panel');
                    if (panelId) self.switchTo(panelId);
                });
            }
            this.switchTo('tavern');
        },

        switchTo: function(panelId) {
            this._currentPanel = panelId;
            var tabs = document.querySelectorAll('#hub-navigation-tabs .hub-tab');
            for (var i = 0; i < tabs.length; i++) {
                tabs[i].classList.toggle('active', tabs[i].getAttribute('data-panel') === panelId);
            }
            var panels = document.querySelectorAll('.hub-panel');
            for (var j = 0; j < panels.length; j++) {
                panels[j].style.display = panels[j].id === 'panel-' + panelId ? '' : 'none';
            }
            if (panelId === 'tavern' && window.TavernManager) {
                window.TavernManager.refreshTavernMaze();
            }
            if (panelId === 'forge' && window.ForgeManager) {
                window.ForgeManager.renderForge();
            }
            if (panelId === 'talents') {
                refreshTalentDisplay();
            }
            if (panelId === 'expedition') {
                refreshLevelCards();
            }
            if (panelId === 'mutation') {
                refreshMutationVault();
            }
            if (panelId === 'achievements') {
                refreshAchievements();
            }
        }
    };

    function refreshTalentDisplay() {
        var meta = window.saveManager._metaCache || {};
        var el = document.getElementById('talent-cores-count');
        if (el) el.textContent = meta.bossCores || 0;
        if (typeof refreshTalentNodes === 'function') refreshTalentNodes();
    }

    function refreshLevelCards() {
        var el = document.getElementById('abyss-record-value');
        if (el) {
            var meta = window.saveManager._metaCache || {};
            el.textContent = (meta.highestEndlessLoop || 0) + ' \u8f6e\u91cd\u5851';
        }
    }

    function init() {
        DOM.hubMetaTokens = $('hub-meta-tokens');
        DOM.hubTotalRuns = $('hub-total-runs');
        DOM.hubTotalKills = $('hub-total-kills');
        DOM.btnHeroPrev = $('btn-hero-prev');
        DOM.btnHeroNext = $('btn-hero-next');
        DOM.heroPortrait = $('hero-portrait');
        DOM.heroNameDisplay = $('hero-name-display');
        DOM.heroStatusDisplay = $('hero-status-display');
        DOM.btnHeroMainAction = $('btn-hero-main-action');
        DOM.btnHeroDetails = $('btn-hero-details');
        DOM.heroDetailsModal = $('hero-details-modal');
        DOM.btnDetailClose = $('btn-detail-close');
        DOM.heroDetailPortrait = $('hero-detail-portrait');
        DOM.heroDetailName = $('hero-detail-name');
        DOM.heroDetailBackstory = $('hero-detail-backstory');
        DOM.heroDetailAbility = $('hero-detail-ability');
        DOM.heroDetailStats = $('hero-detail-stats');
        DOM.techTreeNodes = $('tech-tree-nodes');
        DOM.levelCards = $('level-cards');
        DOM.levelDetailPanel = $('level-detail-panel');
        DOM.btnHubStart = $('btn-hub-start');
        DOM.talentNodes = $('talent-nodes');
        DOM.talentCoresCount = $('talent-cores-count');

        DOM.btnHeroPrev.addEventListener('click', onHeroPrev);
        DOM.btnHeroNext.addEventListener('click', onHeroNext);
        DOM.btnHeroMainAction.addEventListener('click', onHeroMainAction);
        DOM.btnHeroDetails.addEventListener('click', onHeroDetails);
        DOM.btnDetailClose.addEventListener('click', onDetailClose);
        DOM.techTreeNodes.addEventListener('click', function(e) { onTechUpgrade(e); });
        DOM.talentNodes.addEventListener('click', function(e) { onTalentUpgrade(e); });
        DOM.levelCards.addEventListener('click', function(e) { onLevelSelect(e); });
        DOM.btnHubStart.addEventListener('click', onHubStart);

        if (window.HubTabController) window.HubTabController.init();

        window.saveManager.init().then(function() {
            refreshMainHub();
            if (window.TavernManager) window.TavernManager.refreshTavernMaze();
            if (window.ForgeManager) window.ForgeManager.renderForge();
            var abyssVal = document.getElementById('abyss-record-value');
            if (abyssVal) {
                var meta = window.saveManager._metaCache || {};
                abyssVal.textContent = (meta.highestEndlessLoop || 0) + ' \u8f6e\u91cd\u5851';
            }
        });
    }

    function refreshMainHub() {
        var meta = window.saveManager._metaCache || {};
        if (DOM.hubTotalRuns) DOM.hubTotalRuns.textContent = meta.totalRuns || 0;
        if (DOM.hubTotalKills) DOM.hubTotalKills.textContent = meta.totalKills || 0;
        if (DOM.hubMetaTokens) DOM.hubMetaTokens.textContent = meta.metaTokens || 0;

        refreshHeroCarousel();
        refreshTechTree();
        refreshTalentMarket();
        buildLevelCards();
        refreshHubStartButton();
        refreshMutationVault();
    }

    function getCurrentHeroId() {
        return _heroIds[_currentHeroIndex] || 'hero_swordsman';
    }

    function refreshHeroCarousel() {
        var heroId = getCurrentHeroId();
        var cfg = window.heroConfig[heroId] || window.heroConfig.hero_swordsman;
        var meta = window.saveManager._metaCache || {};
        var unlocked = meta.unlockedHeroes || ['hero_swordsman'];
        var isUnlocked = unlocked.indexOf(heroId) !== -1;
        var isSelected = meta.currentSelectedHero === heroId;

        if (DOM.heroNameDisplay) DOM.heroNameDisplay.textContent = cfg.name;
        if (DOM.heroStatusDisplay) DOM.heroStatusDisplay.textContent = isUnlocked ? cfg.desc : '???';

        if (DOM.heroPortrait) {
            DOM.heroPortrait.className = 'hero-portrait ' + (cfg.shapeClass || 'shape-circle');
            if (!isUnlocked) DOM.heroPortrait.classList.add('locked');
        }

        if (DOM.btnHeroMainAction) {
            if (!isUnlocked) {
                var cost = cfg.unlockCost;
                DOM.btnHeroMainAction.textContent = '\u89e3\u9501: ' + cost + ' \u6838\u5fc3';
                DOM.btnHeroMainAction.disabled = (meta.metaTokens || 0) < cost;
            } else if (isSelected) {
                DOM.btnHeroMainAction.textContent = '\u5df2\u4f7f\u7528';
                DOM.btnHeroMainAction.disabled = true;
            } else {
                DOM.btnHeroMainAction.textContent = '\u4f7f\u7528\u8be5\u82f1\u96c4';
                DOM.btnHeroMainAction.disabled = false;
            }
        }

        if (DOM.btnHeroDetails) {
            DOM.btnHeroDetails.style.display = isUnlocked ? '' : 'none';
        }
    }

    function onHeroPrev() {
        _currentHeroIndex = (_currentHeroIndex - 1 + _heroIds.length) % _heroIds.length;
        refreshHeroCarousel();
    }

    function onHeroNext() {
        _currentHeroIndex = (_currentHeroIndex + 1) % _heroIds.length;
        refreshHeroCarousel();
    }

    async function onHeroMainAction() {
        var heroId = getCurrentHeroId();
        var meta = window.saveManager._metaCache || {};
        var unlocked = meta.unlockedHeroes || ['hero_swordsman'];

        if (unlocked.indexOf(heroId) === -1) {
            var cfg = window.heroConfig[heroId];
            var cost = cfg.unlockCost;
            if ((meta.metaTokens || 0) >= cost) {
                meta.metaTokens -= cost;
                if (!meta.unlockedHeroes) meta.unlockedHeroes = ['hero_swordsman'];
                if (meta.unlockedHeroes.indexOf(heroId) === -1) meta.unlockedHeroes.push(heroId);
                meta.currentSelectedHero = heroId;
                await window.saveManager.saveMeta(meta);
                refreshMainHub();
            }
        } else {
            meta.currentSelectedHero = heroId;
            await window.saveManager.saveMeta(meta);
            refreshMainHub();
        }
    }

    function onHeroDetails() {
        var heroId = getCurrentHeroId();
        var cfg = window.heroConfig[heroId] || window.heroConfig.hero_swordsman;

        if (DOM.heroDetailPortrait) {
            DOM.heroDetailPortrait.className = 'hero-portrait large ' + (cfg.shapeClass || 'shape-circle');
        }
        if (DOM.heroDetailName) DOM.heroDetailName.textContent = cfg.name;
        if (DOM.heroDetailBackstory) DOM.heroDetailBackstory.textContent = cfg.backstory || '';
        if (DOM.heroDetailAbility) DOM.heroDetailAbility.textContent = cfg.ability || '';

        if (DOM.heroDetailStats) {
            DOM.heroDetailStats.innerHTML = '<div>HP <span>' + cfg.hp + '</span></div><div>ATK <span>' + cfg.atk + '</span></div><div>SPD <span>' + cfg.speed + '</span></div><div>\u95ea\u907f <span>' + Math.round((cfg.baseDodge || 0) * 100) + '%</span></div>';
        }

        if (DOM.heroDetailsModal) DOM.heroDetailsModal.classList.remove('hidden');
    }

    function onDetailClose() {
        if (DOM.heroDetailsModal) DOM.heroDetailsModal.classList.add('hidden');
    }

    function refreshTechTree() {
        var meta = window.saveManager._metaCache || {};
        var techTree = meta.techTree || {};

        var nodes = DOM.techTreeNodes ? DOM.techTreeNodes.querySelectorAll('.tech-node') : [];
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var techId = node.dataset.tech;
            var level = techTree[techId] || 0;
            var cost = window.saveManager._techCost(techId, level);
            var levelEl = node.querySelector('.tech-level');
            var costEl = node.querySelector('.tech-cost');
            var btn = node.querySelector('.btn-tech-upgrade');

            if (levelEl) levelEl.textContent = 'Lv.' + level;
            if (costEl) costEl.textContent = '\u5347\u7ea7: ' + cost + ' \u6838\u5fc3';
            if (btn) {
                btn.disabled = (meta.metaTokens || 0) < cost;
            }
        }
    }

    async function onTechUpgrade(e) {
        var btn = e.target.closest('.btn-tech-upgrade');
        if (!btn) return;
        var node = btn.closest('.tech-node');
        if (!node) return;
        var techId = node.dataset.tech;
        if (!techId) return;

        await window.saveManager.upgradeTech(techId);
        refreshMainHub();
    }

    /* ── 天赋商城 ── */

    window.TalentTreeManager = {
        definitions: [
            { id: 'health_boost', name: '生命壁垒', desc: '初始最大HP +20/级', maxLv: 5 },
            { id: 'speed_boost', name: '迅捷之风', desc: '初始移速 +15/级', maxLv: 5 },
            { id: 'magnet_boost', name: '引力场', desc: '初始吸附半径 +30/级', maxLv: 3 },
            { id: 'weapon_forge', name: '神兵工坊', desc: '开局双神兵（飞刃+护体）', maxLv: 1 }
        ],
        costOf: function(talentId, level) {
            return talentId === 'weapon_forge' ? 3 : (level + 1);
        }
    };

    function refreshTalentMarket() {
        var meta = window.saveManager._metaCache || {};
        var talents = meta.talents || {};
        var bossCores = meta.bossCores || 0;

        if (DOM.talentCoresCount) DOM.talentCoresCount.textContent = bossCores;
        if (!DOM.talentNodes) return;

        DOM.talentNodes.innerHTML = '';
        var defs = window.TalentTreeManager.definitions;

        for (var i = 0; i < defs.length; i++) {
            var def = defs[i];
            var level = talents[def.id] || 0;
            var isMaxed = level >= def.maxLv;
            var cost = isMaxed ? 0 : window.TalentTreeManager.costOf(def.id, level);
            var canBuy = !isMaxed && bossCores >= cost;

            var node = document.createElement('div');
            node.className = 'talent-node';
            node.dataset.talent = def.id;
            node.innerHTML =
                '<span class="talent-node-name">' + def.name + '</span>' +
                '<span class="talent-node-level">' + level + ' / ' + def.maxLv + '</span>' +
                '<span class="talent-node-effect">' + def.desc + '</span>' +
                (isMaxed
                    ? '<span class="talent-node-cost">已满级</span><button class="btn-talent-upgrade" disabled>MAX</button>'
                    : '<span class="talent-node-cost">' + cost + ' 核心</span><button class="btn-talent-upgrade"' + (canBuy ? '' : ' disabled') + '>升级</button>');
            DOM.talentNodes.appendChild(node);
        }
    }

    async function onTalentUpgrade(e) {
        var btn = e.target.closest('.btn-talent-upgrade');
        if (!btn) return;
        var node = btn.closest('.talent-node');
        if (!node) return;
        var talentId = node.dataset.talent;
        if (!talentId) return;

        var result = await window.saveManager.upgradeTalent(talentId);
        if (result.ok) {
            refreshMainHub();
        } else {
            btn.textContent = result.reason;
            btn.disabled = true;
            setTimeout(function() { refreshTalentMarket(); }, 1200);
        }
    }

    function buildLevelCards() {
        if (!DOM.levelCards) return;
        DOM.levelCards.innerHTML = '';
        var levelIds = Object.keys(window.levelConfig || {});

        for (var i = 0; i < levelIds.length; i++) {
            var levelId = levelIds[i];
            var cfg = window.levelConfig[levelId];
            if (!cfg) continue;
            var card = document.createElement('div');
            card.className = 'level-card' + (levelId === _currentLevelId ? ' selected' : '');
            card.dataset.levelId = levelId;
            card.textContent = cfg.name;
            DOM.levelCards.appendChild(card);
        }

        refreshLevelDetail();
    }

    function onLevelSelect(e) {
        var card = e.target.closest('.level-card');
        if (!card) return;
        var levelId = card.dataset.levelId;
        if (!levelId) return;

        _currentLevelId = levelId;
        var allCards = DOM.levelCards.querySelectorAll('.level-card');
        for (var i = 0; i < allCards.length; i++) allCards[i].classList.remove('selected');
        card.classList.add('selected');
        refreshLevelDetail();
        refreshHubStartButton();
    }

    function refreshLevelDetail() {
        if (!DOM.levelDetailPanel) return;
        var cfg = window.levelConfig[_currentLevelId];
        if (!cfg) {
            DOM.levelDetailPanel.textContent = '\u9009\u62e9\u4e00\u4e2a\u5173\u5361';
            return;
        }
        DOM.levelDetailPanel.textContent = cfg.name + ' \u2014 ' + cfg.desc + ' (\u96be\u5ea6 x' + cfg.difficultyFactor + ', ' + cfg.maxWaves + '\u6ce2)';
    }

    function refreshHubStartButton() {
        if (DOM.btnHubStart) {
            DOM.btnHubStart.textContent = '\u8f70\u7136\u51fa\u5f81';
        }
    }

    async function onHubStart() {
        var meta = window.saveManager._metaCache || {};
        var heroId = meta.currentSelectedHero || meta.currentHero || 'Knight';
        var levelId = _currentLevelId || 'level_1';
        await window.saveManager.startNewRun(heroId, levelId);
        window.location.href = 's3_gameplay.html';
    }

    window.TavernManager = {
        refreshTavernMaze: async function() {
            var nodesEl = document.getElementById('hero-nodes');
            if (!nodesEl) return;
            var meta = window.saveManager._metaCache || {};
            var unlocked = meta.unlockedHeroes || ['Knight'];
            var currentHero = meta.currentHero || 'Knight';
            var cores = meta.bossCores || 0;
            var heroes = window.heroRegistry.getAllHeroes();
            nodesEl.innerHTML = '';
            var self = this;
            heroes.forEach(function(hero) {
                var isUnlocked = unlocked.indexOf(hero.id) !== -1;
                var isActive = hero.id === currentHero;
                var node = document.createElement('div');
                node.className = 'hero-node' + (isUnlocked ? '' : ' locked') + (isActive ? ' active' : '');
                node.innerHTML =
                    '<span class="hero-node-name">' + hero.name + '</span>' +
                    '<span class="hero-node-title">' + hero.title + '</span>' +
                    '<span class="hero-node-passive">' + hero.passiveName + ': ' + hero.passiveDesc + '</span>';
                if (isActive) {
                    node.innerHTML += '<span class="hero-node-tag deployed">已出征</span>';
                } else if (isUnlocked) {
                    var btn = document.createElement('button');
                    btn.className = 'btn-hero-deploy';
                    btn.textContent = '重装上阵';
                    btn.addEventListener('click', function() {
                        btn.disabled = true;
                        self._deployHero(hero.id);
                    });
                    node.appendChild(btn);
                } else {
                    node.innerHTML += '<span class="hero-node-cost">核心: ' + hero.cost + '</span>';
                    var btn = document.createElement('button');
                    btn.className = 'btn-hero-unlock';
                    btn.textContent = '招募';
                    btn.disabled = cores < hero.cost;
                    btn.addEventListener('click', function() {
                        btn.disabled = true;
                        self._unlockHero(hero.id, hero.cost);
                    });
                    node.appendChild(btn);
                }
                nodesEl.appendChild(node);
            });
        },

        _deployHero: async function(id) {
            var result = await window.saveManager.setCurrentHero(id);
            if (result.ok) {
                this.refreshTavernMaze();
            } else {
                this._flashReason(result.reason);
            }
        },

        _unlockHero: async function(id, cost) {
            var result = await window.saveManager.unlockHero(id, cost);
            if (result.ok) {
                this.refreshTavernMaze();
                var meta = window.saveManager._metaCache || {};
                var el = document.getElementById('talent-cores-count');
                if (el) el.textContent = meta.bossCores || 0;
            } else {
                this._flashReason(result.reason);
            }
        },

        _flashReason: function(reason) {
            var el = document.createElement('div');
            el.textContent = reason;
            el.style.cssText = 'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);background:rgba(180,40,40,0.92);color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;z-index:999;pointer-events:none;';
            document.body.appendChild(el);
            setTimeout(function() { if (el.parentNode) el.remove(); }, 1200);
        }
    };

    window.ForgeManager = {
        renderForge: function() {
            var slotsEl = document.getElementById('forge-slots');
            var invEl = document.getElementById('inventory-grid');
            var altarEl = document.getElementById('forge-altar');
            if (!slotsEl || !invEl || !altarEl) return;
            var meta = window.saveManager._metaCache || {};
            var equipped = meta.equipped || { weapon: null, armor: null, talisman: null };
            var equipments = meta.equipments || [];
            var cores = meta.bossCores || 0;
            var self = this;

            var slotLabels = { weapon: '\u6b66\u5668', armor: '\u62a4\u7532', talisman: '\u9970\u54c1' };

            /* ── 左栏：装备槽 ── */
            slotsEl.innerHTML = '';
            ['weapon','armor','talisman'].forEach(function(slot) {
                var eqId = equipped[slot];
                var item = null;
                for (var i = 0; i < equipments.length; i++) { if (equipments[i].instanceId === eqId) { item = equipments[i]; break; } }
                var div = document.createElement('div');
                div.className = 'forge-slot';
                div.innerHTML = '<span class="forge-slot-label">' + slotLabels[slot] + '</span>';
                if (item) {
                    div.innerHTML += '<span class="forge-slot-name quality-' + item.quality + '">' + item.name + ' (' + item.quality + ')</span>';
                    div.addEventListener('click', function() {
                        self.showAltar(item.instanceId);
                    });
                    div.title = '\u70b9\u51fb\u67e5\u770b\u8bcd\u6761\uff0c\u53f3\u51fb\u5378\u4e0b';
                    div.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        window.saveManager.unequipSlot(slot);
                        self.renderForge();
                    });
                } else {
                    div.innerHTML += '<span class="forge-slot-name forge-slot-empty">-- \u7a7a --</span>';
                }
                slotsEl.appendChild(div);
            });

            /* ── 左栏：仓库网格 ── */
            invEl.innerHTML = '';
            var eqMap = {};
            for (var ei = 0; ei < equipments.length; ei++) eqMap[equipments[ei].instanceId] = equipments[ei];
            var isEquipped = {};
            for (var s in equipped) { if (equipped[s]) isEquipped[equipped[s]] = true; }
            for (var ej = 0; ej < equipments.length; ej++) {
                var eqItem = equipments[ej];
                if (isEquipped[eqItem.instanceId]) continue;
                (function(item) {
                    var card = document.createElement('div');
                    card.className = 'equip-card quality-' + item.quality;
                    card.innerHTML = '<div class="equip-card-name">' + item.name + '</div><div class="equip-card-slot">' + slotLabels[item.slot] + '</div>';
                    card.addEventListener('click', function() {
                        window.saveManager.equipItem(item.instanceId);
                        self.renderForge();
                    });
                    invEl.appendChild(card);
                })(eqItem);
            }

            /* ── 右栏：洗练祭坛 ── */
            altarEl.innerHTML = '';
            altarEl.className = 'forge-altar-empty';
            altarEl.textContent = '\u9009\u62e9\u4e00\u4ef6\u88c5\u5907\u4ee5\u67e5\u770b\u8bcd\u6761';
        },

        showAltar: function(instanceId) {
            var altarEl = document.getElementById('forge-altar');
            if (!altarEl) return;
            var meta = window.saveManager._metaCache || {};
            var eqs = meta.equipments || [];
            var item = null;
            for (var i = 0; i < eqs.length; i++) { if (eqs[i].instanceId === instanceId) { item = eqs[i]; break; } }
            if (!item) return;
            var cores = meta.bossCores || 0;
            var self = this;
            altarEl.className = '';
            altarEl.innerHTML = '<div class="forge-altar-item-name quality-' + item.quality + '">' + item.name + ' [' + item.quality + ']</div>';
            for (var ai = 0; ai < item.affixes.length; ai++) {
                var affix = item.affixes[ai];
                var row = document.createElement('div');
                row.className = 'forge-affix-row';
                var valStr = affix.fmt.replace('{val}', (affix.val * (affix.id === 'xp_gain' || affix.id === 'speed_pct' ? 100 : 1)).toFixed(affix.id === 'ice_bonus' ? 1 : 0) + (affix.id === 'xp_gain' || affix.id === 'speed_pct' ? '%' : ''));
                row.innerHTML = '<span class="forge-affix-text">' + affix.name + ': ' + valStr + '</span>';
                var btn = document.createElement('button');
                btn.className = 'forge-affix-btn';
                btn.textContent = '\u6d17\u7ec3 1\u2666';
                btn.disabled = cores < 1;
                (function(idx, id, btnEl) {
                    btnEl.addEventListener('click', async function() {
                        btnEl.classList.add('rerolling');
                        btnEl.disabled = true;
                        var result = await window.saveManager.rerollAffix(id, idx, 1);
                        setTimeout(function() {
                            btnEl.classList.remove('rerolling');
                            if (result.ok) {
                                self.showAltar(id);
                                self.renderForge();
                                var cEl = document.getElementById('talent-cores-count');
                                if (cEl) cEl.textContent = (result.newItem && window.saveManager._metaCache) ? window.saveManager._metaCache.bossCores || 0 : cores - 1;
                            } else {
                                window.TavernManager._flashReason(result.reason);
                            }
                        }, 450);
                    });
                })(ai, item.instanceId, btn);
                row.appendChild(btn);
                altarEl.appendChild(row);
            }
        }
    };

    /* ── 变异保险库 ── */

    function refreshMutationVault() {
        var listEl = document.getElementById('mutation-list');
        var countEl = document.getElementById('mutation-active-count');
        var multEl = document.getElementById('mutation-multiplier');
        if (!listEl) return;
        var meta = window.saveManager._metaCache || {};
        var unlocked = meta.unlockedMutations || [];
        var active = meta.activeMutations || [];

        if (countEl) countEl.textContent = active.length;
        if (multEl) multEl.textContent = active.length > 0 ? Math.pow(2, active.length) : 1;

        var allMuts = [
            { id: 'gravity', name: '引力逆转', desc: '经验吸附范围归零，必须肉身拾取', icon: '🧲' },
            { id: 'bloodmoon', name: '狂暴血月', desc: '怪物体型+30%，攻击+40%，掉落翻倍', icon: '🌍' }
        ];

        listEl.innerHTML = '';
        for (var i = 0; i < allMuts.length; i++) {
            var m = allMuts[i];
            var isUnlocked = unlocked.indexOf(m.id) !== -1;
            var isActive = active.indexOf(m.id) !== -1;
            var card = document.createElement('div');
            card.className = 'mutation-vault-card' + (isActive ? ' active' : '') + (isUnlocked ? '' : ' locked');
            card.innerHTML =
                '<div class="mutation-vault-icon">' + m.icon + '</div>' +
                '<div class="mutation-vault-name">' + m.name + '</div>' +
                '<div class="mutation-vault-desc">' + m.desc + '</div>';
            if (!isUnlocked) {
                card.innerHTML += '<div class="mutation-vault-status">🔒 未解锁</div>';
            } else {
                var toggle = document.createElement('button');
                toggle.className = 'mutation-vault-toggle';
                toggle.textContent = isActive ? '已携带' : '携带';
                toggle.disabled = isActive;
                (function(mutId, btn) {
                    btn.addEventListener('click', async function() {
                        var meta2 = await window.saveManager.getMeta();
                        if (!meta2.activeMutations) meta2.activeMutations = [];
                        if (meta2.activeMutations.indexOf(mutId) === -1) {
                            meta2.activeMutations.push(mutId);
                        }
                        await window.saveManager.saveMeta(meta2);
                        refreshMutationVault();
                    });
                })(m.id, toggle);
                if (isActive) {
                    var removeBtn = document.createElement('button');
                    removeBtn.className = 'mutation-vault-remove';
                    removeBtn.textContent = '卸下';
                    (function(mutId, btn) {
                        btn.addEventListener('click', async function() {
                            var meta2 = await window.saveManager.getMeta();
                            var arr = meta2.activeMutations || [];
                            var idx = arr.indexOf(mutId);
                            if (idx !== -1) arr.splice(idx, 1);
                            meta2.activeMutations = arr;
                            await window.saveManager.saveMeta(meta2);
                            refreshMutationVault();
                        });
                    })(m.id, removeBtn);
                    card.appendChild(removeBtn);
                }
                card.appendChild(toggle);
            }
            listEl.appendChild(card);
        }
    }

    /* ── 成就面板渲染 ── */
    function refreshAchievements() {
        var grid = document.getElementById('achievement-grid');
        if (!grid) return;
        var meta = window.saveManager._metaCache || {};
        var achievements = meta.achievements || {};
        var cfg = window.achievementConfig;
        var html = '';
        for (var i = 0; i < cfg.length; i++) {
            var c = cfg[i];
            var unlocked = !!achievements[c.id];
            html +=
                '<div class="achievement-card' + (unlocked ? ' unlocked' : ' locked') + '">' +
                '<div class="achievement-icon">' + c.icon + '</div>' +
                '<div class="achievement-info">' +
                '<div class="achievement-name">' + c.name + '</div>' +
                '<div class="achievement-desc">' + c.desc + '</div>' +
                '</div>' +
                '</div>';
        }
        grid.innerHTML = html;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
