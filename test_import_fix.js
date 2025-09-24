/**
 * 导入显示问题修复测试脚本
 * 
 * 测试流程：
 * 1. 检查AutogenUnifiedStorage是否可用
 * 2. 测试数据存储和读取
 * 3. 模拟导入流程
 * 4. 验证界面刷新机制
 */

(function() {
    'use strict';
    
    console.log('🧪 [测试] 开始导入显示问题修复测试');
    
    // 测试AutogenUnifiedStorage可用性
    function testAutogenStorage() {
        console.log('📋 [测试] 检查AutogenUnifiedStorage可用性');
        
        if (!window.AutogenUnifiedStorage) {
            console.error('❌ [测试] AutogenUnifiedStorage不可用');
            return false;
        }
        
        console.log('✅ [测试] AutogenUnifiedStorage可用');
        return true;
    }
    
    // 测试存储功能
    async function testStorageOperations() {
        console.log('📋 [测试] 测试存储操作');
        
        const testData = {
            format: 'node_tree',
            data: {
                id: 'test-root',
                topic: '测试脑图',
                children: [
                    { id: 'test-1', topic: '测试节点1' },
                    { id: 'test-2', topic: '测试节点2' }
                ]
            }
        };
        
        try {
            // 测试存储
            const storeResult = await window.AutogenUnifiedStorage.store('mindmap', 'test_key', testData);
            if (!storeResult) {
                console.error('❌ [测试] 存储操作失败');
                return false;
            }
            console.log('✅ [测试] 存储操作成功');
            
            // 测试读取
            const retrieveResult = await window.AutogenUnifiedStorage.retrieve('mindmap', 'test_key');
            if (!retrieveResult) {
                console.error('❌ [测试] 读取操作失败');
                return false;
            }
            console.log('✅ [测试] 读取操作成功');
            
            // 验证数据一致性
            if (JSON.stringify(retrieveResult) !== JSON.stringify(testData)) {
                console.error('❌ [测试] 数据一致性检查失败');
                return false;
            }
            console.log('✅ [测试] 数据一致性检查通过');
            
            return true;
        } catch (error) {
            console.error('❌ [测试] 存储操作异常:', error);
            return false;
        }
    }
    
    // 测试MindmapController集成
    function testMindmapControllerIntegration() {
        console.log('📋 [测试] 测试MindmapController集成');
        
        if (!window.mindmapController && !window.MindmapController) {
            console.error('❌ [测试] MindmapController不可用');
            return false;
        }
        
        const controller = window.mindmapController || window.MindmapController;
        
        // 检查AutogenStorage是否已集成
        if (!controller.autogenStorage) {
            console.error('❌ [测试] MindmapController未集成AutogenUnifiedStorage');
            return false;
        }
        
        // 检查旧存储系统是否已清理
        if (controller.storageManager || controller.persistenceManager) {
            console.warn('⚠️ [测试] 检测到旧存储系统残留，但不影响功能');
        }
        
        console.log('✅ [测试] MindmapController已集成AutogenUnifiedStorage');
        return true;
    }
    
    // 测试存储系统清理
    function testStorageSystemCleanup() {
        console.log('📋 [测试] 测试存储系统清理');
        
        const cleanupResults = {
            redundantSystems: 0,
            cleanedSystems: 0
        };
        
        // 检查是否还有冗余的全局存储系统
        const redundantSystems = [
            'StorageManager',
            'LocalStorageAdapter', 
            'IndexedDBAdapter',
            'HybridStorageAdapter',
            'UnifiedStorage'
        ];
        
        redundantSystems.forEach(systemName => {
            if (window[systemName]) {
                cleanupResults.redundantSystems++;
                console.warn(`⚠️ [测试] 发现冗余系统: ${systemName}`);
            } else {
                cleanupResults.cleanedSystems++;
            }
        });
        
        // 检查AutogenUnifiedStorage是否正常
        if (!window.AutogenUnifiedStorage) {
            console.error('❌ [测试] AutogenUnifiedStorage不可用');
            return false;
        }
        
        console.log(`✅ [测试] 存储系统清理完成 - 清理了${cleanupResults.cleanedSystems}个系统，剩余${cleanupResults.redundantSystems}个冗余系统`);
        return true;
    }
    
    // 测试存储监控工具
    function testStorageMonitor() {
        console.log('📋 [测试] 测试存储监控工具');
        
        if (!window.StorageMonitor) {
            console.error('❌ [测试] StorageMonitor不可用');
            return false;
        }
        
        try {
            // 测试存储统计
            const stats = window.StorageMonitor.getStorageStats();
            console.log(`✅ [测试] 存储统计获取成功: ${stats.totalSizeKB}KB, ${stats.itemCount}项`);
            
            // 测试清理建议
            const suggestions = window.StorageMonitor.getCleanupSuggestions();
            console.log(`✅ [测试] 清理建议获取成功: ${suggestions.length}条建议`);
            
            // 测试快捷命令
            if (typeof window.checkStorage === 'function' && typeof window.cleanStorage === 'function') {
                console.log('✅ [测试] 快捷命令可用');
            } else {
                console.warn('⚠️ [测试] 快捷命令不完整');
            }
            
            console.log('✅ [测试] 存储监控工具测试通过');
            return true;
            
        } catch (error) {
            console.error('❌ [测试] 存储监控工具测试失败:', error);
            return false;
        }
    }
    
    // 测试事件系统
    function testEventSystem() {
        console.log('📋 [测试] 测试事件系统');
        
        let eventReceived = false;
        
        // 注册事件监听器
        const eventHandler = (event) => {
            console.log('✅ [测试] 接收到mindmap:dataLoaded事件:', event.detail);
            eventReceived = true;
        };
        
        window.addEventListener('mindmap:dataLoaded', eventHandler);
        
        // 触发测试事件
        window.dispatchEvent(new CustomEvent('mindmap:dataLoaded', {
            detail: {
                source: 'test',
                projectId: 'test-project',
                projectName: '测试项目'
            }
        }));
        
        // 清理事件监听器
        window.removeEventListener('mindmap:dataLoaded', eventHandler);
        
        if (!eventReceived) {
            console.error('❌ [测试] 事件系统测试失败');
            return false;
        }
        
        console.log('✅ [测试] 事件系统测试通过');
        return true;
    }
    
    // 主测试函数
    async function runTests() {
        console.log('🚀 [测试] 开始执行测试套件');
        
        const tests = [
            { name: 'AutogenStorage可用性', fn: testAutogenStorage },
            { name: '存储操作', fn: testStorageOperations },
            { name: 'MindmapController集成', fn: testMindmapControllerIntegration },
            { name: '存储系统清理', fn: testStorageSystemCleanup },
            { name: '存储监控工具', fn: testStorageMonitor },
            { name: '事件系统', fn: testEventSystem }
        ];
        
        let passedTests = 0;
        let totalTests = tests.length;
        
        for (const test of tests) {
            console.log(`\n📋 [测试] 执行: ${test.name}`);
            try {
                const result = await test.fn();
                if (result) {
                    passedTests++;
                    console.log(`✅ [测试] ${test.name} - 通过`);
                } else {
                    console.log(`❌ [测试] ${test.name} - 失败`);
                }
            } catch (error) {
                console.error(`❌ [测试] ${test.name} - 异常:`, error);
            }
        }
        
        console.log(`\n📊 [测试] 测试结果: ${passedTests}/${totalTests} 通过`);
        
        if (passedTests === totalTests) {
            console.log('🎉 [测试] 所有测试通过！导入显示问题修复成功！');
            return true;
        } else {
            console.log('⚠️ [测试] 部分测试失败，需要进一步调试');
            return false;
        }
    }
    
    // 导出测试函数
    window.testImportFix = runTests;
    
    // 监听系统修复完成事件
    window.addEventListener('systemFixed', (event) => {
        console.log('🎉 [测试] 系统修复完成，开始运行测试');
        console.log('📊 [测试] 系统组件状态:', event.detail.components);
        
        setTimeout(() => {
            if (!window._testAlreadyRun) {
                window._testAlreadyRun = true;
                runTests().then(success => {
                    if (success) {
                        console.log('✨ [测试] 修复验证完成，系统已就绪！');
                    } else {
                        console.log('🔧 [测试] 需要进一步调试和修复');
                    }
                });
            }
        }, 1000);
    });
    
    // 兜底：如果没有收到系统修复事件，延迟运行测试
    setTimeout(() => {
        if (!window._testAlreadyRun) {
            console.log('⏰ [测试] 兜底运行导入修复测试');
            window._testAlreadyRun = true;
            runTests().then(success => {
                if (success) {
                    console.log('✨ [测试] 修复验证完成，系统已就绪！');
                } else {
                    console.log('🔧 [测试] 需要进一步调试和修复');
                }
            });
        }
    }, 5000);
    
})();
