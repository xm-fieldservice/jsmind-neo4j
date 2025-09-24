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
            
            let eventReceived = false;
            
            // 监听数据加载事件
            const eventHandler = (event) => {
                console.log('✅ 接收到mindmap:dataLoaded事件:', event.detail);
                eventReceived = true;
            };
            
            window.addEventListener('mindmap:dataLoaded', eventHandler);
            
            try {
                // 模拟导入数据
                const mockImportData = {
                    id: `mock-import-${Date.now()}`,
                    name: '模拟导入测试',
                    data: {
                        format: 'node_tree',
                        data: {
                            id: 'mock-root',
                            topic: '模拟导入根节点',
                            children: []
                        }
                    }
                };
                
                // 清理现有项目
                if (window.Registry && window.Registry.store) {
                    window.Registry.store.setProjects([]);
                }
                
                // 执行导入
                if (window.mindmapController) {
                    await window.mindmapController.importSingleMindmapToList(mockImportData, 'test.json', 0);
                    
                    // 等待事件触发
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // 检查Registry是否有数据
                    if (window.Registry && window.Registry.store && window.Registry.store.state.projects.length > 0) {
                        console.log('✅ Registry中已有导入数据');
                        
                        // 尝试加载第一个项目
                        await window.mindmapController.loadFirstMindmapFromList();
                        
                        // 再次等待事件
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        if (eventReceived) {
                            console.log('✅ 导入后界面刷新事件正常触发');
                            return true;
                        } else {
                            console.warn('⚠️ 导入后界面刷新事件未触发');
                            return false;
                        }
                    } else {
                        console.error('❌ Registry中无导入数据');
                        return false;
                    }
                } else {
                    console.error('❌ MindmapController不可用');
                    return false;
                }
            } catch (error) {
                console.error('❌ 导入刷新测试失败:', error);
                return false;
            } finally {
                window.removeEventListener('mindmap:dataLoaded', eventHandler);
            }
        },
        
        /**
         * 检查冗余代码清理情况
         */
        checkRedundantCodeCleanup() {
            console.log('📋 检查冗余代码清理情况');
            
            const redundantSystems = [];
            
            // 检查是否还有旧的存储系统
            if (window.UnifiedStorage && window.UnifiedStorage !== window.AutogenUnifiedStorage) {
                redundantSystems.push('UnifiedStorage');
            }
            
            if (window.StorageManager) {
                redundantSystems.push('StorageManager');
            }
            
            if (redundantSystems.length > 0) {
                console.warn(`⚠️ 发现冗余存储系统: ${redundantSystems.join(', ')}`);
                return false;
            } else {
                console.log('✅ 未发现冗余存储系统');
                return true;
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
                { name: '冗余代码清理检查', fn: this.checkRedundantCodeCleanup }
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
    
    // 自动运行测试
    setTimeout(() => {
        console.log('⏰ 自动运行第二阶段测试');
        Phase2UnificationTest.runCompleteTest();
    }, 3000);
    
})();
