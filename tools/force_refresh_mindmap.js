// 强制刷新脑图的JavaScript脚本
// 在浏览器控制台中运行此脚本

console.log('🔄 开始强制刷新脑图...');

// 方法1: 清除localStorage缓存并重新加载
function clearCacheAndReload() {
    try {
        // 清除所有脑图相关的localStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.includes('mindmap') || key.includes('mm:') || key.startsWith('root-')) {
                localStorage.removeItem(key);
                console.log('🗑️ 清除缓存:', key);
            }
        });
        
        console.log('✅ 缓存清除完成');
        
        // 重新加载页面
        setTimeout(() => {
            console.log('🔄 重新加载页面...');
            window.location.reload(true);
        }, 1000);
        
    } catch (e) {
        console.error('❌ 清除缓存失败:', e);
    }
}

// 方法2: 直接重新加载脑图数据
function reloadMindmapData() {
    try {
        if (window.mindmapController) {
            console.log('🔄 重新加载脑图数据...');
            
            // 强制从服务器重新加载
            window.mindmapController.loadFromStorage();
            
            // 重新渲染
            window.mindmapController.renderMindmap();
            
            console.log('✅ 脑图重新加载完成');
        } else {
            console.log('⚠️ 找不到mindmapController，尝试其他方法...');
        }
    } catch (e) {
        console.error('❌ 重新加载脑图失败:', e);
    }
}

// 方法3: 查找并展开"丢失节点"
function expandLostNode() {
    try {
        if (window.mindmapController && window.mindmapController.mind) {
            const lostNodeId = '9665e179afe29e3b'; // "丢失节点"的ID
            const newNodeId = '9666ee494a4942d2'; // "New Node"的ID
            
            // 查找丢失节点
            const lostNode = window.mindmapController.mind.get_node(lostNodeId);
            if (lostNode) {
                console.log('✅ 找到"丢失节点":', lostNode.topic);
                
                // 展开节点
                window.mindmapController.mind.expand_node(lostNode);
                console.log('📂 已展开"丢失节点"');
                
                // 查找子节点
                setTimeout(() => {
                    const newNode = window.mindmapController.mind.get_node(newNodeId);
                    if (newNode) {
                        console.log('✅ 找到恢复的节点:', newNode.topic);
                        
                        // 选中新节点
                        window.mindmapController.mind.select_node(newNode);
                        console.log('🎯 已选中恢复的节点');
                    } else {
                        console.log('❌ 未找到恢复的节点，可能需要重新加载');
                    }
                }, 500);
                
            } else {
                console.log('❌ 未找到"丢失节点"');
            }
        }
    } catch (e) {
        console.error('❌ 展开节点失败:', e);
    }
}

// 执行刷新
console.log('🎯 选择刷新方法:');
console.log('1. clearCacheAndReload() - 清除缓存并重新加载页面');
console.log('2. reloadMindmapData() - 重新加载脑图数据');
console.log('3. expandLostNode() - 查找并展开丢失节点');

// 自动尝试方法3
console.log('🚀 自动尝试展开丢失节点...');
expandLostNode();

// 如果方法3失败，提示用户手动执行
setTimeout(() => {
    console.log('💡 如果看不到节点，请在控制台执行: clearCacheAndReload()');
}, 2000);
