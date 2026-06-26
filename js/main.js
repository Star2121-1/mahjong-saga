(function() {
    async function boot() {
        await window.saveManager.init();
        await window.gameEngine.init();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
