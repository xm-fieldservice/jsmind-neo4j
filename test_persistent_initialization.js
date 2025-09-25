/**
 * 测试持久化初始化修复效果
 */

function testPersistentInitialization() {
    console.log('🧪 开始测试持久化初始化修复效果...');
    
    const tests = [];
    
    // 测试1: 检查修复是否应用
    tests.push({
        name: '修复应用检查',
        test: () => {
            const mc = window.mindmapController;
            if (!mc) return { success: false, message: 'MindmapController不存在' };
            
            const fixes = [
                '_getDefaultDataFixed',
                '_loadMindmapFromStorageFixed', 
                '_loadInitialDataFixed',
                '_saveMindmapToStorageFixed'
            ];
            
            const applied = fixes.filter(fix => mc[fix]);
            const missing = fixes.filter(fix => !mc[fix]);
            
            if (missing.length > 0) {
                return { success: false, message: `未应用的修复: ${missing.join(', ')}` };
            }
            
            return { success: true, message: `所有修复已应用: ${applied.join(', ')}` };
        }
    });
    
    // 测试2: 检查getDefaultData行为
    tests.push({
        name: 'getDefaultData行为',
        test: () => {
            const mc = window.mindmapController;
            if (!mc || !mc.getDefaultData) {
                return { success: false, message: 'getDefaultData方法不存在' };
            }
            
            try {
                const data1 = mc.getDefaultData();
                const data2 = mc.getDefaultData();
                
                // 检查是否使用固定ID或现有数据
                if (data1.id === data2.id) {
                    return { success: true, message: `使用一致的ID: ${data1.id}` };
                } else {
                    return { success: false, message: `ID不一致: ${data1.id} vs ${data2.id}` };
                }
            } catch (error) {
                return { success: false, message: `测试失败: ${error.message}` };
            }
        }
    });
    
    // 测试3: 检查存储数据
    tests.push({
        name: '存储数据检查',
        test: () => {
            const storageKeys = [
                'mindmap_data_v1',
                '__mind_full_cache_v1'
            ];
            
            let foundData = false;
            let dataInfo = [];
            
            storageKeys.forEach(key => {
                try {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && parsed.data) {
                            foundData = true;
                            dataInfo.push(`${key}: ${parsed.data.id || 'no-id'}`);
                        }
                    }
                } catch (error) {
                    // 忽略解析错误
                }
            });
            
            if (foundData) {
                return { success: true, message: `找到存储数据: ${dataInfo.join(', ')}` };
            } else {
                return { success: false, message: '未找到任何存储数据' };
            }
        }
    });
    
    // 测试4: 测试数据加载
    tests.push({
        name: '数据加载测试',
        test: async () => {
            const mc = window.mindmapController;
            if (!mc || !mc.loadMindmapFromStorage) {
                return { success: false, message: 'loadMindmapFromStorage方法不存在' };
            }
            
            try {
                const loadedData = await mc.loadMindmapFromStorage();
                
                if (loadedData) {
                    return { success: true, message: `成功加载数据: ${loadedData.id || 'no-id'}` };
                } else {
                    return { success: false, message: '未能加载任何数据' };
                }
            } catch (error) {
                return { success: false, message: `加载失败: ${error.message}` };
            }
        }
    });
    
    // 测试5: 测试当前脑图数据
    tests.push({
        name: '当前脑图数据',
        test: () => {
            const mc = window.mindmapController;
            if (!mc) return { success: false, message: 'MindmapController不存在' };
            
            if (!mc.data) {
                return { success: false, message: '当前没有脑图数据' };
            }
            
            const hasValidId = mc.data.id && mc.data.id !== '';
            const hasValidLabel = mc.data.label || mc.data.topic;
            
            if (hasValidId && hasValidLabel) {
                return { 
                    success: true, 
                    message: `当前数据: ${mc.data.id} - ${mc.data.label || mc.data.topic}` 
                };
            } else {
                return { success: false, message: '当前数据不完整' };
            }
        }
    });
    
    // 执行测试
    async function runTests() {
        console.log('📋 执行持久化测试...');
        const results = [];
        
        for (const test of tests) {
            try {
                console.log(`🔍 测试: ${test.name}`);
                const result = await test.test();
                console.log(`${result.success ? '✅' : '❌'} ${test.name}: ${result.message}`);
                results.push({ ...test, ...result });
            } catch (error) {
                console.log(`❌ ${test.name}: 测试异常 - ${error.message}`);
                results.push({ ...test, success: false, message: '测试异常: ' + error.message });
            }
        }
        
        // 统计结果
        const passed = results.filter(r => r.success).length;
        const total = results.length;
        
        console.log(`\n📊 测试结果: ${passed}/${total} 通过`);
        
        if (passed === total) {
            console.log('🎉 所有测试通过！持久化初始化修复成功');
            showTestNotification('持久化初始化修复测试全部通过！', 'success');
        } else if (passed >= total * 0.8) {
            console.log('⚠️ 大部分测试通过，修复基本成功');
            showTestNotification(`持久化测试: ${passed}/${total} 通过`, 'warning');
        } else {
            console.log('❌ 多数测试失败，修复可能不完整');
            showTestNotification(`持久化测试: ${passed}/${total} 通过`, 'error');
        }
        
        return results;
    }
    
    return runTests();
}

function showTestNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 300px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px;
    `;
    
    const colors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// 创建测试按钮
function createPersistentTestButton() {
    const button = document.createElement('button');
    button.textContent = '🧪 测试持久化修复';
    button.style.cssText = `
        position: fixed;
        top: 260px;
        right: 20px;
        padding: 8px 12px;
        background: #059669;
        color: white;
        border: 0;
        border-radius: 6px;
        cursor: pointer;
        z-index: 10000;
        font-size: 12px;
        font-weight: 500;
    `;
    
    button.addEventListener('click', async () => {
        button.textContent = '⏳ 测试中...';
        button.disabled = true;
        
        try {
            const results = await testPersistentInitialization();
            console.log('📋 完整测试报告:', results);
        } finally {
            setTimeout(() => {
                button.textContent = '🧪 测试持久化修复';
                button.disabled = false;
            }, 2000);
        }
    });
    
    document.body.appendChild(button);
    console.log('🔘 持久化测试按钮已创建');
}

// 延迟创建测试按钮
setTimeout(() => {
    createPersistentTestButton();
    console.log('💡 点击右上角的"测试持久化修复"按钮来验证修复效果');
}, 8000);

// 导出测试函数
window.testPersistentInitialization = testPersistentInitialization;
