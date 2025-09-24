/**
 * 简单的标签同步测试
 */

// 等待页面加载完成
window.addEventListener('DOMContentLoaded', function() {
    console.log('[TagSync] 开始测试标签同步...');
    
    // 延迟执行，确保所有组件都已初始化
    setTimeout(async () => {
        try {
            // 1. 测试JsonBaseQueryService
            if (window.JsonBaseQueryService) {
                console.log('[TagSync] ✅ JsonBaseQueryService已加载');
                
                // 2. 测试获取系统标签
                const systemTags = await window.JsonBaseQueryService.getSystemTags();
                if (systemTags) {
                    console.log('[TagSync] ✅ 成功获取系统标签:', systemTags);
                    
                    // 3. 测试标签面板渲染
                    const mc = window.mindmapController;
                    if (mc && typeof mc.renderTagPanelFromSource === 'function') {
                        console.log('[TagSync] ✅ MindmapController可用，开始渲染标签面板...');
                        mc.renderTagPanelFromSource({ mode: 'system', systemPack: systemTags });
                        
                        // 4. 检查渲染结果
                        setTimeout(() => {
                            const tagGroups = document.getElementById('tag-groups');
                            const tagList = document.getElementById('tag-list');
                            
                            if (tagGroups && tagList) {
                                const hasContent = tagGroups.innerHTML.trim() || tagList.innerHTML.trim();
                                if (hasContent) {
                                    console.log('[TagSync] ✅ 标签面板渲染成功！');
                                    showNotification('标签同步成功！', 'success');
                                } else {
                                    console.warn('[TagSync] ⚠️ 标签面板为空');
                                    showNotification('标签面板为空，请检查数据格式', 'warning');
                                }
                            }
                        }, 1000);
                        
                    } else {
                        console.error('[TagSync] ❌ MindmapController不可用');
                        showNotification('MindmapController不可用', 'error');
                    }
                } else {
                    console.warn('[TagSync] ⚠️ 未找到系统标签');
                    showNotification('未找到系统标签数据', 'warning');
                }
            } else {
                console.error('[TagSync] ❌ JsonBaseQueryService未加载');
                showNotification('JsonBaseQueryService未加载', 'error');
            }
        } catch (error) {
            console.error('[TagSync] ❌ 测试失败:', error);
            showNotification(`测试失败: ${error.message}`, 'error');
        }
    }, 3000);
});

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    const colors = {
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}
