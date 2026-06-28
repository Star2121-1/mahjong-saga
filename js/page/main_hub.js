(function() {
    var _heroIds = ['hero_swordsman', 'hero_colossus', 'hero_phantom'];
    var _currentHeroIndex = 0;
    var _currentLevelId = 'level_1';
    var _historyFilter = 'all';
    var _historySort = 'date-desc';

    var DOM = {};
    var _tabLoopId = null; /* Tab 帧循环引用，用于清理 */
    var _tabIntervals = []; /* Tab 定时器数组，用于清理 */

    function $(id) { return document.getElementById(id); }

    window.HubTabController = {
        _currentPanel: 'tavern',
        _previousPanel: null,

        init: function() {
            var self = this;
            /* 左侧竹节导航点击 */
            var navItems = document.querySelectorAll('#hub-left-nav .nav-item');
            for (var i = 0; i < navItems.length; i++) {
                navItems[i].addEventListener('click', function(e) {
                    e.preventDefault();
                    var panelId = this.getAttribute('data-panel');
                    if (panelId) self.switchTo(panelId);
                });
            }
            this.switchTo('tavern');
        },

        switchTo: function(panelId) {
            if (panelId === this._currentPanel) return;

            this._previousPanel = this._currentPanel;
            this._currentPanel = panelId;

            /* 1. 销毁上一个 Tab 的所有定时器和帧循环 */
            this._destroyPreviousPanel();

            /* 2. 更新导航高亮 */
            var navItems = document.querySelectorAll('#hub-left-nav .nav-item');
            for (var i = 0; i < navItems.length; i++) {
                navItems[i].classList.toggle('active', navItems[i].getAttribute('data-panel') === panelId);
            }

            /* 3. 3D 翻牌动画：旧面板翻出 */
            var oldPanel = document.getElementById('panel-' + this._previousPanel);
            if (oldPanel) {
                oldPanel.classList.add('flip-out');
                oldPanel.classList.remove('active');
                var self2 = this;
                setTimeout(function() {
                    oldPanel.style.display = 'none';
                    oldPanel.classList.remove('flip-out');
                }, 300);
            }

            /* 4. 新面板翻入 */
            var newPanel = document.getElementById('panel-' + panelId);
            if (newPanel) {
                newPanel.style.display = 'flex';
                newPanel.classList.remove('flip-in');
                void newPanel.offsetWidth; /* 强制回流触发动画 */
                newPanel.classList.add('flip-in', 'active');
                var self3 = this;
                setTimeout(function() {
                    newPanel.classList.remove('flip-in');
                }, 400);
            }

            /* 5. 刷新对应面板数据 */
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
            if (panelId === 'stats') {
                refreshStatsPanel();
            }
            if (panelId === 'history') { refreshHistoryPanel(); }
            if (panelId === 'compendium') { renderWeaponCompendium(); }
        },

        _destroyPreviousPanel: function() {
            var prev = this._previousPanel;
            if (!prev) return;

            /* 销毁该 Tab 关联的帧循环 */
            if (_tabLoopId) {
                cancelAnimationFrame(_tabLoopId);
                _tabLoopId = null;
            }

            /* 销毁该 Tab 关联的所有定时器 */
            for (var i = 0; i < _tabIntervals.length; i++) {
                clearInterval(_tabIntervals[i]);
            }
            _tabIntervals = [];

            /* 清空 DOM 引用（防内存泄漏） */
            var panel = document.getElementById('panel-' + prev);
            if (panel) {
                panel.querySelectorAll('*').forEach(function(child) {
                    child.onmouseover = null;
                    child.onmouseout = null;
                });
            }

            console.log('[HubTab] Panel "' + prev + '" cleaned up — rAF + all intervals destroyed.');
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
            el.textContent = (meta.highestEndlessLoop || 0) + ' 轮重塑';
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

        /* 补签按钮 */
        var makeupBtn = $('makeup-token-btn');
        if (makeupBtn) {
            makeupBtn.addEventListener('click', function() {
                window.saveManager.claimMakeup().then(function(res) {
                    if (res.ok) {
                        makeupBtn.style.display = 'none';
                        refreshMainHub();
                    } else {
                        makeupBtn.textContent = res.reason;
                        setTimeout(function() { refreshMainHub(); }, 1200);
                    }
                }).catch(function() {});
            });
        }

        if (window.HubTabController) window.HubTabController.init();

        window.saveManager.init().then(function() {
            refreshMainHub();
            if (window.TavernManager) window.TavernManager.refreshTavernMaze();
            if (window.ForgeManager) window.ForgeManager.renderForge();
            var abyssVal = document.getElementById('abyss-record-value');
            if (abyssVal) {
                var meta = window.saveManager._metaCache || {};
                abyssVal.textContent = (meta.highestEndlessLoop || 0) + ' 轮重塑';
            }
        });
    }

    function refreshMainHub() {
        var meta = window.saveManager._metaCache || {};
        if (DOM.hubTotalRuns) DOM.hubTotalRuns.textContent = meta.totalRuns || 0;
        if (DOM.hubTotalKills) DOM.hubTotalKills.textContent = meta.totalKills || 0;
        if (DOM.hubMetaTokens) DOM.hubMetaTokens.textContent = meta.metaTokens || 0;

        /* Epoch 15: 精英模式指示器 */
        if (typeof window.saveManager.isEliteMode === 'function') {
            var eliteEl = document.getElementById('elite-mode-indicator');
            if (eliteEl) {
                if (window.saveManager.isEliteMode()) {
                    eliteEl.textContent = '⚠️ 精英模式 ON';
                    eliteEl.style.color = '#ff1744';
                } else {
                    eliteEl.textContent = '精英模式 OFF';
                    eliteEl.style.color = '#666';
                }
            }
        }

        /* Epoch 22: 登录streak + 赛季状态 */
        var streakEl = document.getElementById('login-streak-indicator');
        if (streakEl && typeof window.saveManager.checkDailyLogin === 'function') {
            window.saveManager.checkDailyLogin().then(function(streak) {
                if (streak && streak.streak > 0) {
                    streakEl.textContent = '🔥 Streak: ' + streak.streak + 'd';
                    streakEl.style.color = streak.streak >= 7 ? '#ff6f00' : '#ffd700';
                } else if (streak) {
                    streakEl.textContent = '🔥 Streak: 0d';
                    streakEl.style.color = '#ffd700';
                }
                /* 补签按钮 */
                if (streak && streak.makeupTokens > 0) {
                    var makeupEl = document.getElementById('makeup-token-btn');
                    if (makeupEl) {
                        makeupEl.style.display = '';
                        makeupEl.textContent = '💾 补签 x' + streak.makeupTokens;
                    }
                }
                /* 里程碑预览 */
                if (streak && streakEl) {
                    var s = streak.streak || 0;
                    var milestones = [
                        { day: 3, tokens: 20, cores: 1, label: '连胜' },
                        { day: 7, tokens: 50, cores: 2, label: '周冠' },
                        { day: 14, tokens: 100, cores: 3, label: '双周' },
                        { day: 30, tokens: 200, cores: 5, label: '月冠' },
                    ];
                    var nextIdx = milestones.findIndex(function(m) { return m.day > s; });
                    var nextLabel = '';
                    if (nextIdx === -1) {
                        nextLabel = '🏆 已达最高';
                    } else {
                        var m = milestones[nextIdx];
                        nextLabel = '→ ' + m.label + ' (' + m.day + '天): +' + m.tokens + '代币 +' + m.cores + '核心';
                    }
                    var badge = streakEl.parentNode.querySelector('.streak-milestone');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'streak-milestone';
                        badge.style.cssText = 'display:block;font-size:10px;color:#aaa;margin-top:1px;';
                        streakEl.parentNode.appendChild(badge);
                    }
                    badge.textContent = nextLabel;
                }
            }).catch(function() {});
        }

        var seasonEl = document.getElementById('season-indicator');
        if (seasonEl && typeof window.saveManager.getSeasonStatus === 'function') {
            var ss = window.saveManager.getSeasonStatus();
            if (ss.isActive) {
                seasonEl.textContent = '🌟 赛季' + ss.season + ' (D' + ss.daysElapsed + ')';
                seasonEl.style.color = '#7c4dff';
            } else {
                seasonEl.textContent = '赛季未激活';
                seasonEl.style.color = '#666';
            }
        }

        /* Epoch 22: 赛季触发检查 */
        if (typeof window.saveManager.checkSeasonTrigger === 'function') {
            window.saveManager.checkSeasonTrigger().then(function(res) {
                if (res.triggered && res.ok) {
                    var seasonEl = document.getElementById('season-indicator');
                    if (seasonEl) {
                        seasonEl.textContent = '🌟 新赛季激活！';
                        seasonEl.style.color = '#7c4dff';
                    }
                    refreshMainHub();
                }
            }).catch(function() {});
        }

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
                DOM.btnHeroMainAction.textContent = '解锁: ' + cost + ' 核心';
                DOM.btnHeroMainAction.disabled = (meta.metaTokens || 0) < cost;
            } else if (isSelected) {
                DOM.btnHeroMainAction.textContent = '已使用';
                DOM.btnHeroMainAction.disabled = true;
            } else {
                DOM.btnHeroMainAction.textContent = '使用该英雄';
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
            DOM.heroDetailStats.innerHTML = '<div>HP <span>' + cfg.hp + '</span></div><div>ATK <span>' + cfg.atk + '</span></div><div>SPD <span>' + cfg.speed + '</span></div><div>闪避 <span>' + Math.round((cfg.baseDodge || 0) * 100) + '%</span></div>';
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
            if (costEl) costEl.textContent = '升级: ' + cost + ' 核心';
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
            { id: 'weapon_forge', name: '神兵工坊', desc: '开局双神兵（飞刃+护体）', maxLv: 1 },
            /* Epoch 2 新增天赋 */
            { id: 'listening_intuition', name: '听牌直觉', desc: '暴击率 +2%/级', maxLv: 5 },
            { id: 'gangpai_hardiness', name: '杠牌硬气', desc: '受到伤害 -3%/级', maxLv: 5 },
            { id: '摸牌_speed', name: '摸牌速度', desc: '武器CD -5%/级', maxLv: 5 },
            { id: 'starting_weapons', name: '开局双兵', desc: '额外初始武器槽', maxLv: 1 },
            { id: 'core_resonance', name: '核心共鸣', desc: 'Boss掉落核心 +10%/级', maxLv: 5 },
            { id: '雀魂_shield', name: '雀魂护盾', desc: '每10波触发1次护盾', maxLv: 3 }
        ],
        costOf: function(talentId, level) {
            /* Epoch 14: 使用 SaveManager 的指数成本函数 */
            if (window.saveManager && typeof window.saveManager._talentCostExponential === 'function') {
                return window.saveManager._talentCostExponential(talentId, level);
            }
            /* 回退到旧线性公式 */
            if (talentId === 'starting_weapons') return 5;
            if (talentId === 'core_resonance') return (level + 1) * 4;
            return level + 1;
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

        /* Epoch 4: 添加程序化关卡卡片 */
        var meta = window.saveManager._metaCache || {};
        var abyssLevel = meta.highestEndlessLoop || 0;

        for (var i = 0; i < levelIds.length; i++) {
            var levelId = levelIds[i];
            var cfg = window.levelConfig[levelId];
            if (!cfg) continue;
            var card = document.createElement('div');
            card.className = 'level-card' + (levelId === _currentLevelId ? ' selected' : '');
            card.dataset.levelId = levelId;
            var tierColor = window.difficultyTierColors[cfg.difficultyTier] || '#888';
            card.innerHTML = cfg.name + '<span class="level-tier-badge" style="background:' + tierColor + '">●</span>';
            DOM.levelCards.appendChild(card);
        }

        /* 程序化关卡 */
        var procCard = document.createElement('div');
        procCard.className = 'level-card' + ('level_procedural' === _currentLevelId ? ' selected' : '');
        procCard.dataset.levelId = 'level_procedural';
        procCard.innerHTML = '程序裂隙 · 深渊 Lv.' + (abyssLevel + 1) + '<span class="level-tier-badge" style="background:#9c27b0">◆</span>';
        DOM.levelCards.appendChild(procCard);

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
        var levelId = _currentLevelId || 'level_1';
        var cfg = window.levelConfig[levelId];
        if (!cfg) {
            DOM.levelDetailPanel.textContent = '选择一个关卡';
            return;
        }
        /* Epoch 4: 程序化关卡特殊处理 */
        if (cfg.isProcedural) {
            var meta = window.saveManager._metaCache || {};
            var abyssLevel = meta.highestEndlessLoop || 0;
            var gen = window.proceduralLevelGenerator.generate(abyssLevel);
            DOM.levelDetailPanel.textContent = gen.name + ' — ' + gen.desc + ' (难度 x' + gen.difficultyFactor.toFixed(2) + ', ' + gen.maxWaves + '波)';
            return;
        }
        DOM.levelDetailPanel.textContent = cfg.name + ' — ' + cfg.desc + ' (难度 x' + cfg.difficultyFactor + ', ' + cfg.maxWaves + '波)';
    }

    function refreshHubStartButton() {
        if (DOM.btnHubStart) {
            DOM.btnHubStart.textContent = '轰然出征';
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

            var slotLabels = { weapon: '武器', armor: '护甲', talisman: '饰品' };

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
                    div.title = '点击查看词条，右键卸下';
                    div.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        window.saveManager.unequipSlot(slot);
                        self.renderForge();
                    });
                } else {
                    div.innerHTML += '<span class="forge-slot-name forge-slot-empty">-- 空 --</span>';
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

            /* ── 右栏：祭坛 ── */
            altarEl.innerHTML = '';
            altarEl.className = 'forge-altar-empty';
            altarEl.textContent = '选择一件装备以查看词条';
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
                btn.textContent = '洗练 1♦';
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
            { id: 'bloodmoon', name: '狂暴血月', desc: '怪物体型+30%，攻击+40%，掉落翻倍', icon: '🌍' },
            { id: 'frenzy', name: '狂乱之夜', desc: '敌人攻击速度+50%', icon: '🗡' },
            { id: 'frailty', name: '虚弱诅咒', desc: '玩家攻击力-20%', icon: '💀' },
            { id: 'wither', name: '凋零领域', desc: '每秒损失 1% 最大生命', icon: '🌑' },
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
            /* 计算进度百分比 */
            var threshold = (c.thresholds && c.thresholds[0]) || 1;
            var progress = 0;
            var currentVal = 0;
            /* 根据成就 ID 获取当前值 */
            if (c.id === 'hundred_kills' || c.id === 'thousand_kills' || c.id === 'ten_thousand_kills') {
                currentVal = meta.totalKills || 0;
            } else if (c.id === 'first_victory' || c.id === 'victory_10' || c.id === 'victory_50') {
                currentVal = (meta.runStats && meta.runStats.wins) || 0;
            } else if (c.id === 'deep_abyss' || c.id === 'deep_abyss_10' || c.id === 'deep_abyss_20') {
                currentVal = meta.highestEndlessLoop || 0;
            } else if (c.id === 'overdrive_1' || c.id === 'overdrive_10' || c.id === 'overdrive_50') {
                currentVal = meta.overdriveCount || 0;
            } else if (c.id === 'flawless' || c.id === 'flawless_5') {
                currentVal = meta.flawlessRuns || 0;
            } else if (c.id === 'get_rich' || c.id === 'gold_10k') {
                currentVal = meta.maxGoldThisRun || 0;
            } else if (c.id === 'boss_slayer') {
                currentVal = meta.bossKills || 0;
            } else if (c.id === 'final_boss_down') {
                currentVal = meta.finalBossKills || 0;
            } else if (c.id === 'all_heroes') {
                currentVal = (meta.unlockedHeroes || []).length;
            } else if (c.id === 'crit_master') {
                currentVal = meta.totalCrits || 0;
            } else if (c.id === 'dodge_king') {
                currentVal = meta.totalDodges || 0;
            } else if (c.id === 'full_set') {
                currentVal = meta.fullSetActivated ? 1 : 0;
            } else if (c.id === 'speed_demon') {
                currentVal = (meta.runStats && meta.runStats.fastestRun != null && meta.runStats.fastestRun < 9999) ? Math.round(meta.runStats.fastestRun) : 9999;
            }
            progress = Math.min(100, Math.round((currentVal / threshold) * 100));
            html +=
                '<div class="achievement-card' + (unlocked ? ' unlocked' : ' locked') + '">' +
                '<div class="achievement-icon">' + c.icon + '</div>' +
                '<div class="achievement-info">' +
                '<div class="achievement-name">' + c.name + '</div>' +
                '<div class="achievement-desc">' + c.desc + '</div>' +
                '<div class="achievement-progress"><div class="achievement-progress-bar" style="width:' + progress + '%"></div></div>' +
                '<div class="achievement-progress-text">' + currentVal + ' / ' + threshold + (unlocked ? ' ✓' : '') + '</div>' +
                '</div>' +
                '</div>';
        }
        grid.innerHTML = html;
    }

    window.mainHubCheckChallenge = checkChallengeCompletion;

    /* ── Epoch 14: 元货币商城购买 ── */
    window.mainHubPerkPurchase = onPerkPurchase;

    function refreshStatsPanel() {
        var grid = document.getElementById('stats-grid');
        if (!grid) return;
        var meta = window.saveManager._metaCache || {};
        var stats = meta.runStats || null;
        var challenges = (meta.challenges && meta.challenges.active) || [];

        /* 总体统计 */
        var totalRuns = meta.totalRuns || 0;
        var totalKills = meta.totalKills || 0;
        var bestAbyss = meta.highestEndlessLoop || 0;
        var totalCores = meta.bossCores || 0;
        var totalTokens = meta.metaTokens || 0;

        var statsHtml = '';
        if (stats) {
            var winRate = stats.totalRuns > 0 ? Math.round((stats.wins / stats.totalRuns) * 100) : 0;
            var avgTime = Math.round(stats.avgTime / 60);
            var perfectRate = stats.totalRuns > 0 ? Math.round((stats.perfectRuns / stats.totalRuns) * 100) : 0;
            statsHtml =
                '<div class="stat-row"><span class="stat-label">总场次</span><span class="stat-value">' + totalRuns + '</span></div>' +
                '<div class="stat-row"><span class="stat-label">总击杀</span><span class="stat-value">' + stats.totalKills + '</span></div>' +
                '<div class="stat-row"><span class="stat-label">胜率</span><span class="stat-value">' + winRate + '%</span></div>' +
                '<div class="stat-row"><span class="stat-label">平均用时</span><span class="stat-value">' + avgTime + ' 分钟</span></div>' +
                '<div class="stat-row"><span class="stat-label">最快通关</span><span class="stat-value">' + (stats.fastestRun < Infinity ? Math.round(stats.fastestRun / 60) : '-') + ' 分钟</span></div>' +
                '<div class="stat-row"><span class="stat-label">深渊最深</span><span class="stat-value">' + stats.bestAbyssDepth + ' 层</span></div>' +
                '<div class="stat-row"><span class="stat-label">无伤通关</span><span class="stat-value">' + stats.perfectRuns + ' (' + perfectRate + '%)</span></div>' +
                '<div class="stat-row"><span class="stat-label">总 Overdrive</span><span class="stat-value">' + stats.totalOverdrives + '</span></div>' +
                '<div class="stat-row"><span class="stat-label">总闪避</span><span class="stat-value">' + stats.totalDodges + '</span></div>' +
                '<div class="stat-row"><span class="stat-label">总暴击</span><span class="stat-value">' + stats.totalCrits + '</span></div>' +
                '<div class="stat-row"><span class="stat-label">总 Boss 击杀</span><span class="stat-value">' + stats.totalBossKills + '</span></div>' +
                '<div class="stat-row"><span class="stat-label">总波次</span><span class="stat-value">' + stats.totalWaves + '</span></div>' +
                '<div class="stat-row"><span class="stat-label">总金币</span><span class="stat-value">' + stats.totalGold.toLocaleString() + '</span></div>' +
                '<div class="stat-row"><span class="stat-label">圣物多样性</span><span class="stat-value">' + stats.relicVariety + ' 种</span></div>';
        } else {
            statsHtml = '<div class="stats-empty">暂无数据，开始一局游戏吧！</div>';

            /* Epoch 19: 成就进度 */
        var achHtml = '';
        if (typeof window.achievementConfig !== 'undefined') {
            var achMeta = meta.achievements || {};
            var totalAch = window.achievementConfig.length;
            var unlockedCount = Object.keys(achMeta).filter(function(k) { return !!achMeta[k]; }).length;
            achHtml = '<div class="stat-row"><span class="stat-label">成就解锁</span><span class="stat-value">' + unlockedCount + ' / ' + totalAch + '</span></div>';
        }
        statsHtml += achHtml;

        }

/* Epoch 16: 声望信息 */        var prestigeHtml = '';        if (typeof window.saveManager.getPrestigeInfo === 'function') {            var pi = window.saveManager.getPrestigeInfo();            prestigeHtml =                '<div class="stat-row"><span class="stat-label">声望等级</span><span class="stat-value">' + (pi.level || 0) + '</span></div>' +                '<div class="stat-row"><span class="stat-label">声望点</span><span class="stat-value">' + (pi.points || 0) + ' / ' + pi.potential + '</span></div>' +                '<div class="stat-row"><span class="stat-label">转生加成</span><span class="stat-value">ATK+' + Math.floor((pi.points||0)*0.5) + ' HP+' + Math.floor((pi.points||0)*2) + '</span></div>' +                (pi.canPrestige ? '<button class="btn-perk-buy" id="prestige-btn" style="margin-top:8px;width:100%;">转生 (' + (pi.potential - (pi.points||0)) + ' 点可获得)</button>' : '<div class="stat-row"><span class="stat-label">转生</span><span class="stat-value">已满级</span></div>');        }

        /* Epoch 32: 图鉴进度 */
        var compendiumHtml = '';
        if (typeof window.saveManager.getCompendiumProgress === 'function') {
            var prog = window.saveManager.getCompendiumProgress();
            compendiumHtml =
                '<div class="stat-row"><span class="stat-label">总进度</span><span class="stat-value">' + prog.pct + '% (' + prog.seen + '/' + prog.total + ')</span></div>' +
                '<div class="stat-row"><span class="stat-label">圣物</span><span class="stat-value">' + prog.relics + '/' + prog.relicsTotal + '</span></div>' +
                '<div class="stat-row"><span class="stat-label">武器</span><span class="stat-value">' + prog.weapons + '/' + prog.weaponsTotal + '</span></div>' +
                '<div class="stat-row"><span class="stat-label">敌人</span><span class="stat-value">' + prog.enemies + '/' + prog.enemiesTotal + '</span></div>' +
                '<div class="stat-row"><span class="stat-label">装备</span><span class="stat-value">' + prog.equips + '/' + prog.equipsTotal + '</span></div>' +
                '<div class="stat-row"><span class="stat-label">突变</span><span class="stat-value">' + prog.mutations + '/' + prog.mutationsTotal + '</span></div>';
        }

        /* 秘密发现 */
        var secretsHtml = '';
        if (typeof window.saveManager.getDiscoveredSecrets === 'function') {
            var totalSecrets = window.rewardManager && window.rewardManager.secrets ? window.rewardManager.secrets.length : 0;
            var discovered = window.saveManager.getDiscoveredSecrets();
            var foundCount = discovered.length;
            secretsHtml =
                '<div class="stat-row"><span class="stat-label">秘密发现</span><span class="stat-value">' + foundCount + ' / ' + totalSecrets + '</span></div>';
            if (totalSecrets > 0 && foundCount > 0) {
                for (var si = 0; si < discovered.length; si++) {
                    var sDef = null;
                    if (window.rewardManager && window.rewardManager.secrets) {
                        for (var sj = 0; sj < window.rewardManager.secrets.length; sj++) {
                            if (window.rewardManager.secrets[sj].id === discovered[si]) { sDef = window.rewardManager.secrets[sj]; break; }
                        }
                    }
                    if (sDef) {
                        secretsHtml += '<div class="stat-row"><span class="stat-value" style="font-size:11px;color:#da70d6;">🔮 ' + sDef.name + '</span></div>';
                    }
                }
            }
        }
        /* 挑战列表 */
        var challengesHtml = '';
        if (challenges.length > 0) {
            for (var i = 0; i < challenges.length; i++) {
                var ch = challenges[i];
                challengesHtml +=
                    '<div class="challenge-card">' +
                    '<div class="challenge-name">' + ch.name + '</div>' +
                    '<div class="challenge-desc">' + ch.desc + '</div>' +
                    '<div class="challenge-reward">' + _formatChallengeReward(ch.reward) + '</div>' +
                    '</div>';
            }
        } else {
            challengesHtml = '<div class="stats-empty">暂无活跃挑战</div>';
        }

        /* Epoch 24: 每日挑战倒计时 */
        var dailyHtml = '';
        if (typeof window.saveManager.getDailyChallengeCountdown === 'function') {
            var cd = window.saveManager.getDailyChallengeCountdown();
            var formatted = typeof window.saveManager.formatCountdown === 'function' ? window.saveManager.formatCountdown(cd) : '--:--:--';
            dailyHtml = '<div class="stat-row"><span class="stat-label">每日挑战重置</span><span class="stat-value" id="daily-countdown">' + formatted + '</span></div>';
        }

        /* Epoch 31: 每日任务 */
        var dailyQuestHtml = '';
        if (typeof window.saveManager.getDailyQuests === 'function') {
            var dq = window.saveManager.getDailyQuests();
            var pool = SaveManager.DAILY_QUEST_POOL || [];
            var poolMap = {};
            for (var qi = 0; qi < pool.length; qi++) poolMap[pool[qi].id] = pool[qi];
            var questHtml = '';
            if (dq && dq.quests) {
                for (var i = 0; i < dq.quests.length; i++) {
                    var q = dq.quests[i];
                    var def = poolMap[q.id];
                    if (!def) continue;
                    var claimBtn = (q.completed && !dq.claimed && !dq.claimed[q.id])
                        ? '<button class="btn-perk-buy" data-quest="' + q.id + '" style="margin-top:4px;width:100%;font-size:11px;">领取 (' + (def.reward.metaTokens||0) + '代币' + (def.reward.bossCores ? '|' + def.reward.bossCores + '核心' : '') + ')</button>'
                        : '';
                    questHtml += '<div class="stat-row" style="flex-direction:column;align-items:flex-start;gap:4px;">' +
                        '<span class="stat-label">' + (q.completed ? '✅ ' : '⬜ ') + def.name + '</span>' +
                        '<span class="stat-value" style="font-size:11px;color:#aaa;">' + def.desc + '</span>' +
                        claimBtn +
                        '</div>';
                }
            }
            dailyQuestHtml = questHtml;
        }

        /* Epoch 24: 赛季奖励 */
        var seasonRewardHtml = '';
        if (typeof window.saveManager.claimSeasonReward === 'function') {
            var season = meta.season || {};
            var cs = season.currentSeason || 0;
            var claimed = (season.claimedRewards && season.claimedRewards['s' + cs]) || false;
            var reward = cs > 0 ? window.saveManager.getSeasonReward(cs) : null;
            seasonRewardHtml = '<div class="stat-row"><span class="stat-label">赛季奖励</span><span class="stat-value">' + (cs > 0 ? 'S' + cs : '未激活') + '</span></div>';
            if (cs > 0 && reward && !claimed) {
                seasonRewardHtml += '<div class="stat-row"><span class="stat-label">奖励内容</span><span class="stat-value">' + reward.metaTokens + ' 代币 | ' + reward.bossCores + ' 核心</span></div>';
                seasonRewardHtml += '<button class="btn-perk-buy" id="season-reward-btn" style="margin-top:4px;width:100%;">领取赛季奖励</button>';
            } else if (claimed) {
                seasonRewardHtml += '<div class="stat-row"><span class="stat-label">赛季奖励</span><span class="stat-value">已领取 ✓</span></div>';
            }
        }


        /* Epoch 36: 每周金库 */
        var vaultHtml = '';
        if (typeof window.saveManager.openWeeklyVault === 'function') {
            var vault = window.saveManager.getWeeklyVault();
            var meta = window.saveManager._metaCache || {};
            var tokens = meta.metaTokens || 0;

            if (vault.active && vault.challenge && !vault.completed) {
                /* 活跃金库 — 展示挑战和押注 */
                var rewardParts = [];
                if (vault.challenge.reward.metaTokens) rewardParts.push(vault.challenge.reward.metaTokens + ' 代币');
                if (vault.challenge.reward.bossCores) rewardParts.push(vault.challenge.reward.bossCores + ' 核心');
                vaultHtml =
                    '<div class="vault-card active">' +
                    '<div class="vault-title">🔐 每周金库</div>' +
                    '<div class="vault-challenge"><strong>' + vault.challenge.name + '</strong><br>' + vault.challenge.desc + '</div>' +
                    '<div class="vault-bet">押注: ' + vault.bet + ' 代币 (×' + (vault.multiplier||1) + ' 倍率)</div>' +
                    '<div class="vault-reward">奖励: ' + rewardParts.join(' | ') + '</div>' +
                    '<div class="vault-status">⏳ 挑战进行中 — 通关后自动评估</div>' +
                    '<button class="btn-perk-buy" id="vault-abandon-btn" style="margin-top:8px;width:100%;background:#a33;">放弃金库 (返还 ' + vault.bet + ' 代币)</button>' +
                    '</div>';
            } else if (vault.completed && vault.reward) {
                /* 已完成待领取 */
                var rParts = [];
                if (vault.reward.metaTokens) rParts.push(vault.reward.metaTokens + ' 代币');
                if (vault.reward.bossCores) rParts.push(vault.reward.bossCores + ' 核心');
                vaultHtml =
                    '<div class="vault-card completed">' +
                    '<div class="vault-title">🔐 每周金库</div>' +
                    '<div class="vault-challenge"><strong>' + vault.challenge.name + '</strong><br>' + vault.challenge.desc + '</div>' +
                    '<div class="vault-reward">奖励: ' + rParts.join(' | ') + '</div>' +
                    '<div class="vault-status">✅ 挑战完成！等待领取</div>' +
                    '<button class="btn-perk-buy" id="vault-claim-btn" style="margin-top:8px;width:100%;">领取金库奖励</button>' +
                    '</div>';
            } else {
                /* 无活跃金库 — 展示开库选项 */
                vaultHtml =
                    '<div class="vault-card">' +
                    '<div class="vault-title">🔐 每周金库</div>' +
                    '<div class="vault-desc">押注元代币接受高倍率周挑战，完成后奖励翻倍！</div>' +
                    '<div class="vault-tiers">' +
                    '<button class="btn-perk-buy vault-tier-btn" data-bet="10" style="margin:2px;">入门押 10 (×1)</button>' +
                    '<button class="btn-perk-buy vault-tier-btn" data-bet="25" style="margin:2px;">进阶押 25 (×2)</button>' +
                    '<button class="btn-perk-buy vault-tier-btn" data-bet="50" style="margin:2px;">豪赌押 50 (×3)</button>' +
                    '</div>' +
                    '<div class="vault-meta">当前代币: ' + tokens + '</div>' +
                    '</div>';
            }
        }

        /* Epoch 18/22: 每周超级挑战 */
        var weeklyHtml = '';
        if (typeof window.saveManager.getWeeklyChallenges === 'function') {
            var weekly = window.saveManager.getWeeklyChallenges();
            if (weekly && weekly.length > 0) {
                var wHtml = '';
                for (var wi = 0; wi < weekly.length; wi++) {
                    var wc = weekly[wi];
                    var progress = 0;
                    var threshold = wc.target || 1;
                    /* 估算进度 — hub 页面无 gameEngine, 显示 0% */
                    if (window.gameEngine) {
                        var eng = window.gameEngine;
                        if (wc.type === 'kills') progress = Math.min(100, Math.round((eng.kills || 0) / threshold * 100));
                        else if (wc.type === 'wins') progress = Math.min(100, Math.round((eng.kills || 0) / threshold * 100));
                        else if (wc.type === 'overdrives') progress = Math.min(100, Math.round((eng._overdriveCount || 0) / threshold * 100));
                        else if (wc.type === 'abyss') progress = Math.min(100, Math.round((eng.loopCount || 0) / threshold * 100));
                        else if (wc.type === 'flawless') progress = Math.min(100, Math.round((eng._playerHitCountThisRun || 0) > 0 ? 0 : 100));
                        else if (wc.type === 'bossKills') progress = Math.min(100, Math.round((eng._bossKillsThisRun || 0) / threshold * 100));
                    }
                    var rewardText = '';
                    if (wc.reward) {
                        if (wc.reward.metaTokens) rewardText += '+' + wc.reward.metaTokens + '代币';
                        if (wc.reward.bossCores) rewardText += ' +' + wc.reward.bossCores + '核心';
                    }
                    wHtml += '<div class="challenge-card weekly-challenge">' +
                        '<div class="challenge-name">🏆 ' + wc.name + '</div>' +
                        '<div class="challenge-desc">' + wc.desc + '</div>' +
                        '<div class="challenge-reward">奖励: ' + rewardText + '</div>' +
                        '<div class="challenge-progress">' +
                        '<div class="progress-bar"><div class="progress-fill" style="width:' + progress + '%"></div></div>' +
                        '<span class="progress-text">' + progress + '%</span>' +
                        '</div></div>';
                }
                var weeklySection = document.getElementById('weekly-challenges-section');
                if (weeklySection) weeklySection.innerHTML = wHtml;
            }
        }

        /* 元货币消费 */
        var pi = typeof window.saveManager.getPrestigeInfo === 'function' ? window.saveManager.getPrestigeInfo() : null;
        var perks = (meta.purchasedPerks || {});
        var perksHtml =
            '<div class="perk-row">' +
            '<span class="perk-name">复活机会</span>' +
            '<span class="perk-count">x' + (perks.token_revive || 0) + '</span>' +
            '<button class="btn-perk-buy" data-perk="token_revive" data-cost="50">购买 (50 代币)</button>' +
            '</div>' +
            '<div class="perk-row">' +
            '<span class="perk-name">开局圣物</span>' +
            '<span class="perk-count">' + (perks.token_relic_start ? '已拥有' : '未购买') + '</span>' +
            '<button class="btn-perk-buy' + (perks.token_relic_start ? ' disabled' : '') + '" data-perk="token_relic_start" data-cost="30"' + (perks.token_relic_start ? ' disabled' : '') + '>购买 (30 代币)</button>' +
            '</div>' +
            '<div class="perk-row">' +
            '<span class="perk-name">关卡亲和 Lv.' + (perks.token_map_affinity || 0) + '</span>' +
            '<span class="perk-desc">' + _mapAffinityDesc(perks.token_map_affinity || 0) + '</span>' +
            '<button class="btn-perk-buy' + ((perks.token_map_affinity || 0) >= 3 ? ' disabled' : '') + '" data-perk="map_affinity"' + ((perks.token_map_affinity || 0) >= 3 ? ' disabled' : '') + '>升级 (' + _mapAffinityCost(perks.token_map_affinity || 0) + ' 代币)</button>' +
            '</div>' +
            /* Epoch 15: 精英模式 */
            '<div class="elite-toggle' + (window.saveManager && window.saveManager.isEliteMode && window.saveManager.isEliteMode() ? ' active' : '') + '">' +
            '<span class="perk-name">⚠️ 精英模式</span>' +
            '<span class="perk-desc">敌人+50%属性，通关核心×1.5</span>' +
            '<button class="elite-btn' + (!(window.saveManager && window.saveManager.isEliteMode && window.saveManager.isEliteMode()) ? ' off' : '') + '" id="elite-toggle-btn">' +
            (window.saveManager && window.saveManager.isEliteMode && window.saveManager.isEliteMode() ? '关闭' : '开启') +
            '</button></div>';

        grid.innerHTML =
            '<div class="stats-section">' +
            '<div class="stats-section-title">📊 总体战绩</div>' +
            '<div class="stats-grid">' + statsHtml + '</div>' +
            '</div>' +
            '<div class="stats-section">' +
            '<div class="stats-section-title">🎯 活跃挑战</div>' +
            '<div class="challenges-grid">' + challengesHtml + '</div>' +
'<div class="stats-section">' +            '<div class="stats-section-title">⏱ 每日挑战</div>' +            '<div class="stats-grid">' + dailyHtml + '</div>' +            '</div>' +
'<div class="stats-section">' +            '<div class="stats-section-title">📋 每日任务</div>' +            '<div class="stats-grid">' + dailyQuestHtml + '</div>' +            '</div>' +
'<div class="stats-section">' +            '<div class="stats-section-title">🏆 每周超级挑战</div>' +            '<div class="challenges-grid" id="weekly-challenges-section"><div class="stats-empty">加载中...</div></div>' +            '</div>' +
            '<div class="stats-section">' +
            '<div class="stats-section-title">🔐 每周金库</div>' +
            '<div class="vaults-grid">' + vaultHtml + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="stats-section">' +
            '<div class="stats-section-title">🛒 元代币商城</div>' +
            '<div class="perks-list">' + perksHtml + '</div>' +
            '</div>' +
'<div class="stats-section">' +            '<div class="stats-section-title">⭐ 声望转生</div>' +            '<div class="stats-grid">' + prestigeHtml + '</div>' +            '</div>' +
'<div class="stats-section">' +            '<div class="stats-section-title">📖 图鉴收集</div>' +            '<div class="stats-grid">' + compendiumHtml + '</div>' +            '</div>' +
'<div class="stats-section">' +            '<div class="stats-section-title">🔮 秘密发现</div>' +            '<div class="stats-grid">' + secretsHtml + '</div>' +            '</div>' +
'<div class="stats-section">' +            '<div class="stats-section-title">🌟 赛季奖励</div>' +            '<div class="stats-grid">' + seasonRewardHtml + '</div>' +            '</div>';

        /* 绑定购买按钮 */
        grid.querySelectorAll('.btn-perk-buy').forEach(function(btn) {
            btn.addEventListener('click', function() {
                onPerkPurchase(this);
            });
        });

        /* Epoch 24: 每日倒计时每秒更新 */
        /* Clear existing countdown interval to prevent duplicates */
        for (var _ci = 0; _ci < _tabIntervals.length; _ci++) clearInterval(_tabIntervals[_ci]);
        _tabIntervals = [];
        var countdownInterval = setInterval(function() {
            var cdEl = document.getElementById('daily-countdown');
            if (cdEl && typeof window.saveManager.getDailyChallengeCountdown === 'function') {
                var cd = window.saveManager.getDailyChallengeCountdown();
                cdEl.textContent = window.saveManager.formatCountdown(cd);
            }
        }, 1000);
        _tabIntervals.push(countdownInterval);

        /* Epoch 31: 每日任务领取按钮 */
        grid.querySelectorAll('[data-quest]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var questId = this.dataset.quest;
                window.saveManager.claimDailyQuestReward(questId).then(function(res) {
                    if (res.ok) refreshStatsPanel();
                }).catch(function() {});
            });
        });

        /* Epoch 21/16: 声望按钮 (去重) */
        var prestigeBtn = document.getElementById('prestige-btn');
        if (prestigeBtn) {
            prestigeBtn.addEventListener('click', function() {
                onPrestigeToggle(this);
            });
        }

        var eliteBtn = document.getElementById('elite-toggle-btn');
        if (eliteBtn) {
            eliteBtn.addEventListener('click', function() {
                onEliteToggle(this);
            });
        }

        /* Epoch 24: 赛季奖励按钮 */
        var seasonBtn = document.getElementById('season-reward-btn');
        if (seasonBtn) {
            seasonBtn.addEventListener('click', function() {
                window.saveManager.claimSeasonReward().then(function(res) {
                    if (res.ok) {
                        refreshStatsPanel();
                        refreshMainHub();
                    }
                }).catch(function() {});
            });
        }

        /* Epoch 36: 金库按钮 */
        var claimBtn = document.getElementById('vault-claim-btn');
        if (claimBtn) {
            claimBtn.addEventListener('click', function() {
                window.saveManager.claimWeeklyVaultReward().then(function(res) {
                    if (res.ok) refreshStatsPanel();
                }).catch(function() {});
            });
        }
        var abandonBtn = document.getElementById('vault-abandon-btn');
        if (abandonBtn) {
            abandonBtn.addEventListener('click', function() {
                window.saveManager.abandonWeeklyVault().then(function(res) {
                    if (res.ok) refreshStatsPanel();
                }).catch(function() {});
            });
        }
        document.querySelectorAll('.vault-tier-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var bet = parseInt(this.dataset.bet);
                window.saveManager.openWeeklyVault(bet).then(function(res) {
                    if (res.ok) refreshStatsPanel();
                    else alert(res.reason);
                }).catch(function() {});
            });
        });
    }

    function _formatChallengeReward(reward) {
        var parts = [];
        if (reward.metaTokens) parts.push('+' + reward.metaTokens + ' 元代币');
        if (reward.bossCores) parts.push('+' + reward.bossCores + ' 核心');
        return parts.join(' | ');
    }

    function _mapAffinityDesc(level) {
        switch (parseInt(level)) {
            case 0: return '无加成';
            case 1: return '关卡伤害 -10%';
            case 2: return '关卡伤害 -20%';
            case 3: return '关卡伤害 -30%';
            default: return '已满级';
        }
    }

    function _mapAffinityCost(current) {
        var costs = [20, 40, 60];
        return costs[current] || '已满级';
    }

    async function onPrestigeToggle(btn) {
        var result = await window.saveManager.doPrestige();
        if (result.ok) {
            refreshStatsPanel();
            refreshMainHub();
        } else {
            btn.textContent = result.reason;
            btn.disabled = true;
            setTimeout(function() { refreshStatsPanel(); }, 1200);
        }
    }

    async function onPerkPurchase(btn) {
        var perkId = btn.dataset.perk;
        var cost = parseInt(btn.dataset.cost);
        if (perkId === 'map_affinity') {
            var meta = await window.saveManager.getMeta();
            var level = (meta.purchasedPerks && meta.purchasedPerks.token_map_affinity) || 0;
            if (level >= 3) return;
            cost = _mapAffinityCost(level);
            if (level === 0) perkId = 'token_map_affinity_level1';
            else if (level === 1) perkId = 'token_map_affinity_level2';
            else perkId = 'token_map_affinity_level3';
        }
        var result = await window.saveManager.spendMetaTokens(perkId, cost);
        if (result.ok) {
            refreshStatsPanel();
            refreshMainHub();
        } else {
            btn.textContent = result.reason;
            btn.disabled = true;
            setTimeout(function() { refreshStatsPanel(); }, 1200);
        }
    }

    /* ── Epoch 15: 精英模式切换 ── */    /* ── Epoch 15: 精英模式切换 ── */
    async function onEliteToggle(btn) {
        var isOn = window.saveManager.isEliteMode();
        var result = isOn
            ? await window.saveManager.disableEliteMode()
            : await window.saveManager.enableEliteMode();
        if (result.ok) {
            refreshStatsPanel();
            refreshMainHub();
        }
    }

    function checkChallengeCompletion(engine) {
        /* Epoch 18: 结算时检查挑战完成 + 进度追踪 */
        var meta = window.saveManager._metaCache || {};
        var challenges = meta.challenges && meta.challenges.active || [];
        if (!challenges.length) return { completed: [], bonusTokens: 0, bonusCores: 0, progress: [] };

        var stats = {
            kills: engine.kills || 0,
            elapsed: engine._elapsed || 0,
            overdriveCount: engine._overdriveCount || 0,
            maxGold: engine._maxGoldThisRun || 0,
            hitsTaken: engine._playerHitCountThisRun || 0,
            won: engine.gameOver === false && engine._pendingReward === false,
            bossKills: engine._bossKillsThisRun || 0,
            abyssDepth: engine.loopCount || 0,
            dodges: engine._totalDodgesThisRun || 0,
            crits: engine._totalCritsThisRun || 0,
            waves: engine._waveCount || 0,
            uniqueRelics: Object.keys(engine.player.relicLevels || {}).filter(function(k) { return (engine.player.relicLevels[k] || 0) > 0; }).length
        };

        var completed = [];
        var bonusTokens = 0;
        var bonusCores = 0;
        var progress = [];

        for (var i = 0; i < challenges.length; i++) {
            var ch = challenges[i];
            var chProgress = ch.check(stats) ? 100 : 0;
            /* 估算进度百分比 */
            if (chProgress === 0) {
                var threshold = ch.threshold || 1;
                if (ch.id.indexOf('kill') !== -1) chProgress = Math.min(100, Math.round((stats.kills / threshold) * 100));
                else if (ch.id.indexOf('overdrive') !== -1) chProgress = Math.min(100, Math.round((stats.overdriveCount / threshold) * 100));
                else if (ch.id.indexOf('survive') !== -1) chProgress = Math.min(100, Math.round((stats.elapsed / threshold) * 100));
                else if (ch.id.indexOf('gold') !== -1) chProgress = Math.min(100, Math.round((stats.maxGold / threshold) * 100));
                else if (ch.id.indexOf('dodge') !== -1) chProgress = Math.min(100, Math.round((stats.dodges / threshold) * 100));
                else if (ch.id.indexOf('crit') !== -1) chProgress = Math.min(100, Math.round((stats.crits / threshold) * 100));
                else if (ch.id.indexOf('wave') !== -1) chProgress = Math.min(100, Math.round((stats.waves / threshold) * 100));
                else if (ch.id.indexOf('relics') !== -1) chProgress = Math.min(100, Math.round((stats.uniqueRelics / threshold) * 100));
                else if (ch.id.indexOf('abyss') !== -1) chProgress = Math.min(100, Math.round((stats.abyssDepth / threshold) * 100));
                else if (ch.id.indexOf('boss') !== -1) chProgress = stats.bossKills > 0 ? 100 : 0;
                else if (ch.id.indexOf('no_damage') !== -1) chProgress = stats.hitsTaken === 0 && stats.won ? 100 : Math.max(0, 100 - stats.hitsTaken * 10);
            }
            progress.push({ id: ch.id, name: ch.name, percent: chProgress, completed: chProgress >= 100 });
            if (chProgress >= 100) {
                completed.push(ch.id);
                if (ch.reward.metaTokens) bonusTokens += ch.reward.metaTokens;
                if (ch.reward.bossCores) bonusCores += ch.reward.bossCores;
            }
        }

        if (completed.length > 0) {
            if (!meta.challenges.completed) meta.challenges.completed = {};
            for (var j = 0; j < completed.length; j++) {
                meta.challenges.completed[completed[j]] = (meta.challenges.completed[completed[j]] || 0) + 1;
            }
        }

        return { completed: completed, bonusTokens: bonusTokens, bonusCores: bonusCores, progress: progress };
    }


    /* ── 武器图鉴 ── */

    function renderWeaponCompendium() {
        var grid = document.getElementById('weapon-compendium-grid');
        if (!grid) return;
        var weaponData = (window.rewardManager && window.rewardManager.weaponInfos) || {};
        var meta = window.saveManager._metaCache || {};
        var unlocked = meta.defaultWeapons || ['TrackingBlade'];

        var html = '';
        var weaponKeys = Object.keys(weaponData);
        for (var wi = 0; wi < weaponKeys.length; wi++) {
            var key = weaponKeys[wi];
            var w = weaponData[key];
            if (!w) continue;
            var isUnlocked = unlocked.indexOf(key) !== -1;
            var synergyNames = [];
            if (w.synergizes) {
                for (var si = 0; si < w.synergizes.length; si++) {
                    var rel = (window.rewardManager && window.rewardManager.baseRelics) || [];
                    for (var ri = 0; ri < rel.length; ri++) {
                        if (rel[ri].id === w.synergizes[si]) { synergyNames.push(rel[ri].name); break; }
                    }
                }
            }
            html +=
                '<div class="compendium-weapon-card' + (isUnlocked ? ' unlocked' : ' locked') + '">' +
                '<div class="compendium-weapon-header" style="border-top-color:' + w.color + '">' +
                '<span class="compendium-weapon-name">' + w.name + '</span>' +
                (isUnlocked ? '<span class="compendium-weapon-badge">已拥有</span>' : '<span class="compendium-weapon-badge locked-badge">未解锁</span>') +
                '</div>' +
                '<div class="compendium-weapon-cat">' + w.category + '</div>' +
                '<div class="compendium-weapon-stats">' +
                '<span>攻倍率: ' + (w.atkFactor || '?') + '</span>' +
                '<span>冷却: ' + (w.cd || '?') + 's</span>' +
                '</div>' +
                '<div class="compendium-weapon-desc">' + w.desc + '</div>' +
                (synergyNames.length ? '<div class="compendium-weapon-synergy">协同: ' + synergyNames.join('、') + '</div>' : '') +
                '</div>';
        }
        grid.innerHTML = html;
    }

    /* ── Epoch 17: 战局历史面板 ── */
    function refreshHistoryPanel() {
        var grid = document.getElementById('history-grid');
        if (!grid) return;
        if (typeof window.saveManager.getRunHistory !== 'function') return;
        var history = window.saveManager.getRunHistory(50);
        if (!history || history.length === 0) {
            grid.innerHTML = '<div class="stats-empty">暂无历史记录，开始一局游戏吧！</div>';
            return;
        }

        /* Epoch 23: 排序/筛选 (使用存储值, 元素尚未创建) */
        var filter = _historyFilter || 'all';
        var sort = _historySort || 'date-desc';

        /* 筛选 */
        var filtered = history;
        if (filter === 'won') filtered = history.filter(function(e) { return e.won; });
        else if (filter === 'lost') filtered = history.filter(function(e) { return !e.won; });

        /* 排序 */
        filtered.sort(function(a, b) {
            if (sort === 'date-desc') return (b.timestamp || 0) - (a.timestamp || 0);
            if (sort === 'date-asc') return (a.timestamp || 0) - (b.timestamp || 0);
            if (sort === 'kills-desc') return (b.kills || 0) - (a.kills || 0);
            if (sort === 'time-desc') return (b.elapsed || 0) - (a.elapsed || 0);
            return 0;
        });

        var html = '';
        /* 筛选/排序控件 */
        html += '<div class="history-controls">' +
            '<select id="history-filter" onchange="window._onHistoryFilter(this.value)">' +
            '<option value="all"' + (filter === 'all' ? ' selected' : '') + '>全部</option>' +
            '<option value="won"' + (filter === 'won' ? ' selected' : '') + '>仅通关</option>' +
            '<option value="lost"' + (filter === 'lost' ? ' selected' : '') + '>仅失败</option>' +
            '</select>' +
            '<select id="history-sort" onchange="window._onHistorySort(this.value)">' +
            '<option value="date-desc"' + (sort === 'date-desc' ? ' selected' : '') + '>最新优先</option>' +
            '<option value="date-asc"' + (sort === 'date-asc' ? ' selected' : '') + '>最早优先</option>' +
            '<option value="kills-desc"' + (sort === 'kills-desc' ? ' selected' : '') + '>击杀最多</option>' +
            '<option value="time-desc"' + (sort === 'time-desc' ? ' selected' : '') + '>用时最长</option>' +
            '</select>' +
            '<span style="color:#888;font-size:11px;">共 ' + filtered.length + ' 条</span>' +
            '</div>';

        for (var i = 0; i < filtered.length; i++) {
            var e = filtered[i];
            var ts = new Date(e.timestamp);
            var ds = ts.getFullYear()+'/'+(ts.getMonth()+1)+'/'+ts.getDate()+' '+ts.getHours()+':'+String(ts.getMinutes()).padStart(2,'0');
            var rc = e.won ? 'history-won' : 'history-lost';
            var ri = e.won ? '通关' : '失败';
            html += '<div class="history-entry '+rc+'"><div class="history-time">'+ds+'</div><div class="history-result">'+ri+'</div><div class="history-details">英雄: '+(e.heroId||'-')+' | 关卡: '+(e.levelId||'-')+' | 击杀: '+e.kills+' | 用时: '+Math.round(e.elapsed/60)+'分'+(e.loopCount?' | 深渊: '+e.loopCount+'层':'')+'</div><div class="history-reward">奖励: +'+(e.metaTokensEarned||0)+' 代币</div>'+(e.weeklyCompleted && e.weeklyCompleted.length > 0 ? '<div class="history-weekly">🏆 周常: '+e.weeklyCompleted.join(', ')+'</div>' : '')+'</div>';
        }
        grid.innerHTML = html;
    }

    /* Epoch 23: 历史面板筛选/排序回调 */
    window._onHistoryFilter = function(val) {
        _historyFilter = val;
        refreshHistoryPanel();
    };
    window._onHistorySort = function(val) {
        _historySort = val;
        refreshHistoryPanel();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
