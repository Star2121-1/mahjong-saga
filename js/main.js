(function() {
    async function boot() {
        try {
            await window.saveManager.init();
            await window.gameEngine.init();
        } catch (e) {
            /* P0: boot 失败时显示错误覆盖层，防止永久白屏 */
            console.error('[Boot] initialization failed:', e);
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:#0a1d12;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;font-family:sans-serif;color:#fff;';
            overlay.innerHTML = '<div style="font-size:24px;">❌ 游戏初始化失败</div><div style="font-size:14px;color:#aaa;">数据可能已损坏，请清除存档后重试</div><button id="crash-reset-btn" style="padding:12px 24px;background:#c44;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:16px;">清除存档并重置</button><div style="font-size:12px;color:#666;margin-top:8px;">' + e.message + '</div>';
            document.body.appendChild(overlay);
            document.getElementById('crash-reset-btn').addEventListener('click', function() {
                localStorage.removeItem('cr_meta.json');
                localStorage.removeItem('cr_active_run.json');
                location.reload();
            });
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
