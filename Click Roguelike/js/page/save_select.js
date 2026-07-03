(function() {
    var _pendingAction = null;

    var DOM = {};

    function $(id) { return document.getElementById(id); }

    function init() {
        DOM.btnNewGame = $('btn-newgame');
        DOM.btnContinue = $('btn-continue');
        DOM.btnImport = $('btn-import');
        DOM.btnExport = $('btn-export');
        DOM.btnSettings = $('btn-settings');
        DOM.btnSettingsClose = $('btn-settings-close');
        DOM.settingSound = $('setting-sound');
        DOM.settingDifficulty = $('setting-difficulty');
        DOM.lastSaveInfo = $('last-save-info');
        DOM.saveWarningOverlay = $('save-warning-overlay');
        DOM.btnWarningExport = $('btn-warning-export');
        DOM.btnWarningOverwrite = $('btn-warning-overwrite');
        DOM.btnWarningCancel = $('btn-warning-cancel');

        DOM.btnNewGame.addEventListener('click', onNewGame);
        DOM.btnContinue.addEventListener('click', onContinue);
        DOM.btnImport.addEventListener('click', onImport);
        DOM.btnExport.addEventListener('click', onExport);
        DOM.btnSettings.addEventListener('click', function() { toggleOverlay('settings-overlay', true); });
        DOM.btnSettingsClose.addEventListener('click', function() { toggleOverlay('settings-overlay', false); });
        DOM.settingDifficulty.addEventListener('input', function(e) {
            window.difficultyScale = parseFloat(e.target.value) || 1.0;
            try { localStorage.setItem('cr_difficulty', JSON.stringify(window.difficultyScale)); } catch(e) { console.warn('save diff error', e); }
        });
        DOM.btnWarningExport.addEventListener('click', onWarningExport);
        DOM.btnWarningOverwrite.addEventListener('click', onWarningOverwrite);
        DOM.btnWarningCancel.addEventListener('click', onWarningCancel);

        var savedDiff = localStorage.getItem('cr_difficulty');
        if (savedDiff) {
            var v = JSON.parse(savedDiff);
            window.difficultyScale = v;
            DOM.settingDifficulty.value = v;
        }

        window.saveManager.init().then(refreshScreen);
    }

    function toggleOverlay(id, show) {
        var el = $(id);
        if (el) {
            if (show) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    }

    async function refreshScreen() {
        var meta = await window.saveManager.getMeta();
        var canContinue = await window.saveManager.hasContinueData();
        DOM.btnContinue.disabled = !canContinue;
        if (DOM.lastSaveInfo) {
            if (meta.lastSaveTimestamp > 0) {
                var d = new Date(meta.lastSaveTimestamp);
                var ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
                DOM.lastSaveInfo.textContent = '\u6700\u8fd1\u5b58\u6863: ' + meta.lastHeroName + ' \u00b7 ' + meta.lastLevelName + ' \uff08' + ds + '\uff09';
            } else {
                DOM.lastSaveInfo.textContent = '\u6700\u8fd1\u5b58\u6863: \u2014';
            }
        }
    }

    function showSaveWarning() {
        if (DOM.saveWarningOverlay) {
            DOM.saveWarningOverlay.classList.remove('hidden');
            DOM.saveWarningOverlay.classList.add('active');
        }
    }

    function hideSaveWarning() {
        if (DOM.saveWarningOverlay) {
            DOM.saveWarningOverlay.classList.remove('active');
            DOM.saveWarningOverlay.classList.add('hidden');
        }
    }

    function notify(msg, color) {
        var el = document.createElement('div');
        el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:' + color + ';color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:14px;font-weight:600;box-shadow:0 0 30px rgba(0,0,0,0.4);max-width:420px;text-align:center;pointer-events:none;';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }

    async function onNewGame() {
        var hasData = await window.saveManager.hasContinueData();
        if (hasData) {
            _pendingAction = 'newgame';
            showSaveWarning();
            return;
        }
        await window.saveManager.resetAllData();
        window.location.href = 's2_main_hub.html';
    }

    async function onContinue() {
        var active = await window.saveManager.hasActiveRun();
        window.location.href = active ? 's3_gameplay.html' : 's2_main_hub.html';
    }

    async function onImport() {
        _pendingAction = 'import';
        showSaveWarning();
    }

    async function doImport() {
        var result = await window.saveManager.importSaveFile();
        if (result.success) {
            notify('\u2705 \u5b58\u6863\u5bfc\u5165\u6210\u529f\uff01', '#00e676');
            var hasActive = await window.saveManager.hasActiveRun();
            window.location.href = hasActive ? 's3_gameplay.html' : 's2_main_hub.html';
        } else if (result.error && result.error.indexOf('\u53d6\u6d88') === -1) {
            notify(result.error, '#ff1744');
        }
    }

    function onExport() {
        var result = window.saveManager.exportSave();
        if (result.success) {
            notify('\u2705 \u5b58\u6863\u5df2\u5bfc\u51fa', '#00e676');
        } else {
            notify('\u274c \u5bfc\u51fa\u5931\u8d25\uff1a' + (result.error || '\u672a\u77e5\u9519\u8bef'), '#ff1744');
        }
    }

    async function onWarningExport() {
        onExport();
        await executePendingAction();
    }

    async function onWarningOverwrite() {
        await window.saveManager.resetAllData();
        hideSaveWarning();
        await executePendingAction();
    }

    function onWarningCancel() {
        hideSaveWarning();
        _pendingAction = null;
    }

    async function executePendingAction() {
        var action = _pendingAction;
        _pendingAction = null;
        hideSaveWarning();
        if (action === 'newgame') {
            await window.saveManager.resetAllData();
            window.location.href = 's2_main_hub.html';
        } else if (action === 'import') {
            await doImport();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
