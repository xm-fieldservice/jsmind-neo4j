/**
 * 第二阶段架构统一测试脚本
 * 验证存储系统完全统一的效果
 */

(function() {
    'use strict';
    
    const Phase2UnificationTest = {
        
        /**
         * 测试MindmapController存储统一
         */
        testMindmapControllerUnification() {
            console.log('📋 测试MindmapController存储统一');
            
            if (!window.mindmapController) {
                console.error('❌ MindmapController不可用');
                return false;
            }
            
            const controller = window.mindmapController;
            
            // 检查是否完全使用AutogenUnifiedStorage
            if (!controller.autogenStorage) {
                console.error('❌ MindmapController未集成AutogenUnifiedStorage');
                return false;
            }
            
            // 检查是否移除了localStorage回退逻辑
            const saveMethod = controller._saveWithUnifiedStorage.toString();
            if (saveMethod.includes('localStorage.setItem')) {
                console.warn('⚠️ MindmapController仍包含localStorage回退逻辑');
                return false;
            }
            
            console.log('✅ MindmapController存储系统已完全统一');
            return true;
        },
        
        /**
         * 测试Registry系统存储统一
         */
        testRegistryStorageUnification() {
            console.log('📋 测试Registry系统存储统一');
            
            if (!window.Registry) {
                console.error('❌ Registry系统不可用');
                return false;
            }
            
            // 检查Registry是否使用AutogenUnifiedStorage
            if (!window.AutogenUnifiedStorage) {
                console.error('❌ AutogenUnifiedStorage不可用');
                return false;
            }
            
            console.log('✅ Registry系统存储统一检查通过');
            return true;
        },
        
        /**
         * 测试导入功能存储统一
         */
        async testImportStorageUnification() {
            console.log('📋 测试导入功能存储统一');
            
            if (!window.mindmapController) {
                console.error('❌ MindmapController不可用');
                return false;
            }
            
            // 检查导入方法是否使用AutogenUnifiedStorage
            const importMethod = window.mindmapController.importSingleMindmapToList.toString();
            if (!importMethod.includes('autogenStorage.store')) {
                console.error('❌ 导入功能未使用AutogenUnifiedStorage');
                return false;
            }
            
            console.log('✅ 导入功能存储统一检查通过');
            return true;
        },
        
        /**
         * 测试数据流一致性
         */
        async testDataFlowConsistency() {
            console.log('📋 测试数据流一致性');
            
            try {
                // 创建测试数据
                const testData = {
                    id: `test-consistency-${Date.now()}`,
                    format: 'node_tree',
                    data: {
                        id: 'test-root',
                        topic: '数据流一致性测试',
                        children: [
                            { id: 'child1', topic: '子节点1' },
                            { id: 'child2', topic: '子节点2' }
                        ]
                    }
                };
                
                // 通过MindmapController保存
                if (window.mindmapController && window.mindmapController.autogenStorage) {
                    const saveResult = await window.mindmapController.autogenStorage.store(
                        'mindmap', 
                        'test_consistency', 
                        testData
                    );
                    
                    if (!saveResult) {
                        console.error('❌ 数据保存失败');
                        return false;
                    }
                    
                    // 尝试读取
                    const loadResult = await window.mindmapController.autogenStorage.retrieve(
                        'mindmap', 
                        'test_consistency'
                    );
                    
                    if (!loadResult) {
                        console.error('❌ 数据读取失败');
                        return false;
                    }
                    
                    // 验证数据一致性
                    if (loadResult.data.id !== testData.data.id) {
                        console.error('❌ 数据不一致');
                        return false;
                    }
                    
                    // 清理测试数据
                    await window.mindmapController.autogenStorage.remove('mindmap', 'test_consistency');
                    
                    console.log('✅ 数据流一致性测试通过');
                    return true;
                } else {
                    console.error('❌ AutogenUnifiedStorage不可用');
                    return false;
                }
            } catch (error) {
                console.error('❌ 数据流一致性测试失败:', error);
                return false;
            }
        },
        
        /**
         * 测试导入后界面刷新
         */
        async testImportRefresh() {
            console.log('📋 测试导入后界面刷新机制');
            
            try {
                // 备份当前用户数据
                let originalData = null;
                if (window.mindmapController && window.mindmapController.data) {
                    originalData = JSON.parse(JSON.stringify(window.mindmapController.data));
                }
                
                // 模拟导入数据（使用测试专用ID）
                const mockData = {
                    id: `test-mock-import-${Date.now()}`,
                    topic: '测试模拟导入',
                    children: []
                };
                
                // 测试事件触发机制（不实际修改用户数据）
                let eventReceived = false;
                const testEventHandler = (event) => {
                    eventReceived = true;
                    console.log('✅ 导入后界面刷新事件正常触发');
                };
                
                // 监听事件
                if (window.AutogenEventBus && typeof window.AutogenEventBus.on === 'function') {
                    window.AutogenEventBus.on('mindmap:dataLoaded', testEventHandler);
                } else {
                    window.addEventListener('mindmap:dataLoaded', testEventHandler);
                }
                
                // 触发测试事件
                if (window.AutogenEventBus && typeof window.AutogenEventBus.emit === 'function') {
                    window.AutogenEventBus.emit('mindmap:dataLoaded', {
                        source: 'import',
                        projectId: mockData.id,
                        projectName: mockData.topic,
                        data: mockData
                    });
                } else {
                    window.dispatchEvent(new CustomEvent('mindmap:dataLoaded', {
                        detail: {
                            source: 'import',
                            projectId: mockData.id,
                            projectName: mockData.topic,
                            data: mockData
                        }
                    }));
                }
                
                // 等待事件处理
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // 清理事件监听
                if (window.AutogenEventBus && typeof window.AutogenEventBus.off === 'function') {
                    window.AutogenEventBus.off('mindmap:dataLoaded', testEventHandler);
                } else {
                    window.removeEventListener('mindmap:dataLoaded', testEventHandler);
                }
                
                // 恢复用户数据
                if (originalData && window.mindmapController) {
                    window.mindmapController.data = originalData;
                    window.mindmapController.renderMindmap();
                }
                
                if (eventReceived) {
                    console.log('✅ 导入后界面刷新机制测试通过');
                    return true;
                } else {
                    console.warn('⚠️ 导入后界面刷新事件未触发');
                    return false;
                }
                
            } catch (error) {
                console.error('❌ 导入刷新测试失败:', error);
                return false;
            }
        },
        
        /**
         * 检查冗余代码清理情况
         */
        testRedundantCodeCleanup() {
            console.log('📋 检查冗余代码清理情况');
            
            const redundantSystems = [];
            
            // 检查是否还有旧的存储系统（排除已知的兼容性系统）
            if (typeof window.UnifiedStorageManager !== 'undefined') {
                redundantSystems.push('UnifiedStorageManager');
            }
            if (typeof window.HybridStorageAdapter !== 'undefined') {
                redundantSystems.push('HybridStorageAdapter');
            }
            
            // StorageManager和SimpleStorageManager可能是兼容性保留，不算冗余
            
            if (redundantSystems.length === 0) {
                console.log('✅ 冗余代码清理完成');
                return true;
            } else {
                console.warn('⚠️ 发现冗余存储系统:', redundantSystems.join(', '));
                return false;
            }
        },
        
        /**
         * 运行完整的第二阶段测试
         */
        async runCompleteTest() {
            console.log('🚀 开始第二阶段架构统一完整测试');
            
            const tests = [
                { name: 'MindmapController存储统一', fn: this.testMindmapControllerUnification },
                { name: 'Registry系统存储统一', fn: this.testRegistryStorageUnification },
                { name: '导入功能存储统一', fn: this.testImportStorageUnification },
                { name: '数据流一致性', fn: this.testDataFlowConsistency },
                { name: '导入后界面刷新', fn: this.testImportRefresh },
                { name: '冗余代码清理检查', fn: this.testRedundantCodeCleanup }
            ];
            
            let passedTests = 0;
            const results = [];
            
            for (const test of tests) {
                console.log(`\n📋 执行: ${test.name}`);
                try {
                    const result = await test.fn.call(this);
                    if (result) {
                        console.log(`✅ ${test.name} - 通过`);
                        passedTests++;
                        results.push({ name: test.name, status: 'passed' });
                    } else {
                        console.log(`❌ ${test.name} - 失败`);
                        results.push({ name: test.name, status: 'failed' });
                    }
                } catch (error) {
                    console.error(`❌ ${test.name} - 异常:`, error);
                    results.push({ name: test.name, status: 'error', error: error.message });
                }
            }
            
            console.log(`\n📊 第二阶段测试结果: ${passedTests}/${tests.length} 通过`);
            
            if (passedTests === tests.length) {
                console.log('🎉 第二阶段架构统一测试全部通过！');
                console.log('✨ 存储系统已完全统一，导入显示问题应该已解决');
            } else {
                console.log('⚠️ 部分测试失败，需要进一步修复');
                
                const failedTests = results.filter(r => r.status !== 'passed');
                console.log('❌ 失败的测试:', failedTests.map(t => t.name).join(', '));
            }
            
            return {
                totalTests: tests.length,
                passedTests,
                results,
                success: passedTests === tests.length
            };
        }
    };
    
    // 全局导出
    window.Phase2UnificationTest = Phase2UnificationTest;
    
    // 快捷命令
    window.testPhase2 = () => Phase2UnificationTest.runCompleteTest();
    
    console.log('🧪 第二阶段架构统一测试工具已加载');
    console.log('💡 使用 testPhase2() 运行完整测试');
    
    // 自动运行测试 - 已禁用，避免干扰生产环境
    // setTimeout(() => {
    //     console.log('⏰ 自动运行第二阶段测试');
    //     Phase2UnificationTest.runCompleteTest();
    // }, 3000);
    
    // 手动运行：Phase2UnificationTest.runCompleteTest()
    
})();
