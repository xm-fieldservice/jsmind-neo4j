/**
 * 快速修复验证脚本
 * 专门验证SimpleStorageManager构造函数问题的修复
 */

console.log('🔧 开始快速修复验证...');

// 测试存储系统导入和初始化
async function testStorageFix() {
    try {
        console.log('📦 测试存储系统修复...');
        
        // 测试动态导入
        const storageModule = await import('../src/core/storage/index.js');
        console.log('✅ 存储模块导入成功');
        
        // 测试初始化函数
        const result = await storageModule.initializeStorage({ enableFormal: false });
        
        if (result.success) {
            console.log('✅ 存储系统初始化成功');
            console.log('📊 存储系统信息:', {
                mode: result.mode,
                hasStorage: !!result.storage,
                hasValidator: !!result.validator
            });
            
            // 测试基本操作
            if (result.storage) {
                const testKey = 'quick_test';
                const testData = { test: true, timestamp: Date.now() };
                
                const saveResult = result.storage.set(testKey, testData);
                const loadResult = result.storage.get(testKey);
                
                console.log('✅ 基本存储操作测试:', {
                    save: saveResult,
                    load: loadResult && loadResult.test === true
                });
                
                // 清理
                result.storage.remove(testKey);
            }
            
            return true;
        } else {
            console.error('❌ 存储系统初始化失败:', result.error);
            return false;
        }
        
    } catch (error) {
        console.error('❌ 存储系统测试失败:', error.message);
        return false;
    }
}

// 测试StateManager修复
async function testStateManagerFix() {
    try {
        console.log('📊 测试StateManager修复...');
        
        // 测试动态导入
        const stateModule = await import('../src/core/StateManager.js');
        console.log('✅ StateManager模块导入成功');
        
        // 创建简单的事件总线
        const mockEventBus = {
            emit: () => {},
            on: () => () => {},
            getStats: () => ({ totalEvents: 0 })
        };
        
        const standardEvents = {
            SYSTEM: { READY: 'system:ready', ERROR: 'system:error' },
            STORAGE: { READY: 'storage:ready', ERROR: 'storage:error' },
            MINDMAP: { UPDATED: 'mindmap:updated', SELECTION_CHANGED: 'mindmap:selection_changed' },
            UI: { VIEW_CHANGED: 'ui:view_changed' },
            REGISTRY: { CHANGED: 'registry:changed' }
        };
        
        // 测试StateManager创建
        const stateManager = new stateModule.StateManager(mockEventBus, standardEvents);
        console.log('✅ StateManager实例创建成功');
        
        // 测试状态获取
        const currentState = stateManager.getState();
        console.log('✅ 状态获取成功:', {
            hasState: !!currentState,
            hasMindmap: !!currentState.mindmap,
            hasUI: !!currentState.ui
        });
        
        // 测试Action分发
        const testAction = {
            type: 'UI_SET_ACTIVE_TAB',
            payload: 'test_tab'
        };
        
        stateManager.dispatch(testAction);
        console.log('✅ Action分发成功');
        
        // 测试增强功能
        const stats = stateManager.getStats();
        console.log('✅ 增强统计功能:', {
            hasUptime: !!stats.uptimeFormatted,
            hasErrorRate: stats.errorRate !== undefined
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ StateManager测试失败:', error.message);
        return false;
    }
}

// 运行所有测试
async function runQuickTests() {
    console.log('🚀 开始快速修复验证...');
    
    const storageResult = await testStorageFix();
    const stateResult = await testStateManagerFix();
    
    const overallSuccess = storageResult && stateResult;
    
    console.log('\n📊 快速验证结果:');
    console.log(`存储系统: ${storageResult ? '✅ 通过' : '❌ 失败'}`);
    console.log(`状态管理: ${stateResult ? '✅ 通过' : '❌ 失败'}`);
    console.log(`总体结果: ${overallSuccess ? '✅ 修复成功' : '❌ 仍有问题'}`);
    
    if (overallSuccess) {
        console.log('\n🎉 核心问题已修复！可以继续使用系统功能。');
    } else {
        console.log('\n⚠️ 仍有问题需要进一步修复。');
    }
    
    return overallSuccess;
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.runQuickTests = runQuickTests;
    console.log('🔧 快速验证工具已加载，运行 runQuickTests() 开始测试');
}

// 自动运行
runQuickTests();
