/**
 * 快速修复脑图消失问题
 * 立即执行，不等待测试完成
 */

console.log('🚨 [快速修复] 检测到脑图可能被测试覆盖，开始紧急修复...');

// 立即执行修复
setTimeout(() => {
    if (window.mindmapController) {
        // 检查当前数据是否是测试数据
        const currentData = window.mindmapController.data;
        
        if (!currentData || 
            currentData.id === 'mock-root' || 
            currentData.id.includes('mock') || 
            currentData.id.includes('test') ||
            currentData.topic === '模拟导入根节点') {
            
            console.log('🔄 [快速修复] 检测到测试数据，正在恢复...');
            
            // 尝试从AutogenUnifiedStorage恢复
            if (window.AutogenUnifiedStorage) {
                window.AutogenUnifiedStorage.retrieve('mindmap', 'mindmap_data_v1').then(realData => {
                    if (realData && realData.id && 
                        !realData.id.includes('mock') && 
                        !realData.id.includes('test') &&
                        realData.id !== 'mock-root') {
                        
                        console.log('✅ [快速修复] 找到真实用户数据，正在恢复:', realData.id);
                        window.mindmapController.data = realData;
                        window.mindmapController.renderMindmap();
                        return;
                    }
                    
                    // 如果没有找到，创建默认数据
                    console.log('🆕 [快速修复] 创建新的默认脑图');
                    const defaultData = window.mindmapController.getDefaultData();
                    window.mindmapController.data = defaultData;
                    window.mindmapController.renderMindmap();
                    window.mindmapController.saveMindmapToStorage();
                    
                }).catch(() => {
                    // 创建默认数据
                    console.log('🆕 [快速修复] 创建新的默认脑图（异常恢复）');
                    const defaultData = window.mindmapController.getDefaultData();
                    window.mindmapController.data = defaultData;
                    window.mindmapController.renderMindmap();
                    window.mindmapController.saveMindmapToStorage();
                });
            } else {
                // 直接创建默认数据
                console.log('🆕 [快速修复] 创建新的默认脑图（直接创建）');
                const defaultData = window.mindmapController.getDefaultData();
                window.mindmapController.data = defaultData;
                window.mindmapController.renderMindmap();
                window.mindmapController.saveMindmapToStorage();
            }
        } else {
            console.log('✅ [快速修复] 当前数据正常，无需修复');
        }
    }
}, 1000); // 1秒后执行，确保MindmapController已初始化

// 监听测试完成事件，再次检查
setTimeout(() => {
    console.log('🔍 [快速修复] 测试完成后再次检查脑图状态...');
    
    if (window.mindmapController && window.mindmapController.data) {
        const data = window.mindmapController.data;
        if (data.id === 'mock-root' || data.id.includes('mock') || data.id.includes('test')) {
            console.log('🔄 [快速修复] 测试后发现数据仍被覆盖，执行最终恢复...');
            
            // 强制恢复为默认数据
            const defaultData = window.mindmapController.getDefaultData();
            window.mindmapController.data = defaultData;
            window.mindmapController.renderMindmap();
            window.mindmapController.saveMindmapToStorage();
            
            console.log('✅ [快速修复] 脑图已恢复为默认状态');
        }
    }
}, 8000); // 8秒后执行，确保所有测试都完成
