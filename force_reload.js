
// 强制刷新脑图 - 绕过所有缓存
console.log('🔄 开始强制刷新脑图...');

// 1. 完全清除相关缓存
function clearAllCaches() {
    // 清除全局缓存变量
    try {
        delete window.__mindFullCache;
        console.log('✅ 清除全局缓存变量');
    } catch(e) {}
    
    // 清除localStorage中的缓存
    const keysToRemove = [
        '__mind_full_cache_v1',
        'mindmap_data_v1',
        'mm:root-1758256084936-b8:data',
        'mm:root-1758256084936-b8:meta'
    ];
    
    keysToRemove.forEach(key => {
        try {
            localStorage.removeItem(key);
            console.log(`✅ 清除localStorage: ${key}`);
        } catch(e) {}
    });
    
    // 停止所有自动同步
    try {
        window.__STORAGE_PAUSE = true;
        window.__REG_SYNC_SUPPRESS = true;
        console.log('⏸️ 停止自动同步机制');
    } catch(e) {}
}

// 2. 强制重新从文件加载
function forceReloadFromFile() {
    console.log('📂 强制从文件重新加载...');
    
    // 重新初始化MindmapController
    if (window.mindmapController && typeof window.mindmapController.loadFromStorage === 'function') {
        try {
            window.mindmapController.loadFromStorage();
            console.log('✅ MindmapController重新加载');
        } catch(e) {
            console.error('❌ MindmapController重新加载失败:', e);
        }
    }
    
    // 强制刷新页面
    setTimeout(() => {
        console.log('🔄 强制刷新页面...');
        window.location.reload(true); // 强制从服务器重新加载
    }, 2000);
}

// 3. 执行强制刷新
try {
    clearAllCaches();
    forceReloadFromFile();
    
    alert('🔄 正在强制刷新脑图...\n\n页面将在2秒后自动刷新');
    
} catch(error) {
    console.error('❌ 强制刷新失败:', error);
    alert('❌ 强制刷新失败: ' + error.message);
}
