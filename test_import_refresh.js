/**
 * 测试"读"功能的完整流程：读入 + 界面刷新
 */

(function() {
    'use strict';
    
    console.log('🧪 开始测试"读"功能完整流程');
    
    // 测试Registry系统是否可用
    function testRegistrySystem() {
        console.log('📋 测试Registry系统');
        
        if (!window.Registry) {
            console.error('❌ Registry系统不可用');
            return false;
        }
        
        if (!window.Registry.store || !window.Registry.cmd || !window.Registry.view) {
            console.error('❌ Registry系统组件不完整');
            return false;
        }
        
        console.log('✅ Registry系统可用');
        return true;
    }
    
    // 测试MindmapController的导入方法
    function testImportMethods() {
        console.log('📋 测试MindmapController导入方法');
        
        if (!window.mindmapController) {
            console.error('❌ MindmapController不可用');
            return false;
        }
        
        const controller = window.mindmapController;
        
        // 检查关键方法
        const requiredMethods = [
            'importMindmapFromFile',
            'loadFirstMindmapFromList',
            'importSingleMindmapToList',
            'renderMindmap'
        ];
        
        for (const method of requiredMethods) {
            if (typeof controller[method] !== 'function') {
                console.error(`❌ 缺少方法: ${method}`);
                return false;
            }
        }
        
        console.log('✅ MindmapController导入方法完整');
        return true;
    }
    
    // 测试界面刷新机制
    function testRefreshMechanism() {
        console.log('📋 测试界面刷新机制');
        
        let eventReceived = false;
        
        // 监听数据加载事件
        const eventHandler = (event) => {
            console.log('✅ 接收到mindmap:dataLoaded事件:', event.detail);
            eventReceived = true;
        };
        
        window.addEventListener('mindmap:dataLoaded', eventHandler);
        
        // 模拟触发事件
        try {
            window.dispatchEvent(new CustomEvent('mindmap:dataLoaded', {
                detail: {
                    source: 'test',
                    projectId: 'test-project',
                    projectName: '测试项目',
                    data: { id: 'test', topic: '测试节点' }
                }
            }));
            
            setTimeout(() => {
                window.removeEventListener('mindmap:dataLoaded', eventHandler);
                
                if (eventReceived) {
                    console.log('✅ 界面刷新事件机制正常');
                } else {
                    console.error('❌ 界面刷新事件机制异常');
                }
            }, 100);
            
            return true;
        } catch (error) {
            console.error('❌ 界面刷新事件测试失败:', error);
            return false;
        }
    }
    
    // 测试存储系统集成
    function testStorageIntegration() {
        console.log('📋 测试存储系统集成');
        
        if (!window.mindmapController) {
            console.error('❌ MindmapController不可用');
            return false;
        }
        
        const controller = window.mindmapController;
        
        // 检查存储系统集成
        if (!controller.autogenStorage) {
            console.error('❌ AutogenUnifiedStorage未集成');
            return false;
        }
        
        // 检查关键属性
        if (!controller.localStorageKey) {
            console.error('❌ localStorageKey未设置');
            return false;
        }
        
        console.log('✅ 存储系统集成正常');
        return true;
    }
    
    // 模拟导入测试
    async function simulateImportTest() {
        console.log('📋 模拟导入测试');
        
        if (!window.mindmapController || !window.Registry) {
            console.error('❌ 必需组件不可用');
            return false;
        }
        
        try {
            // 创建模拟数据
            const mockMindmapData = {
                id: `test-import-${Date.now()}`,
                name: '测试导入脑图',
                data: {
                    format: 'node_tree',
                    data: {
                        id: 'root-test',
                        topic: '测试导入根节点',
                        children: [
                            { id: 'child1', topic: '子节点1' },
                            { id: 'child2', topic: '子节点2' }
                        ]
                    }
                }
            };
            
            // 清理现有项目
            if (window.Registry.store && window.Registry.store.state) {
                window.Registry.store.state.projects = [];
            }
            
            // 模拟导入单个脑图到列表
            await window.mindmapController.importSingleMindmapToList(mockMindmapData, 'test.json', 0);
            
            // 检查是否成功添加到Registry
            if (window.Registry.store && window.Registry.store.state && window.Registry.store.state.projects.length > 0) {
                console.log('✅ 数据成功添加到Registry');
                
                // 模拟加载第一个脑图
                await window.mindmapController.loadFirstMindmapFromList();
                
                // 检查界面是否更新
                if (window.mindmapController.data && window.mindmapController.data.id) {
                    console.log('✅ 界面数据已更新');
                    return true;
                } else {
                    console.error('❌ 界面数据未更新');
                    return false;
                }
            } else {
                console.error('❌ 数据未成功添加到Registry');
                return false;
            }
            
        } catch (error) {
            console.error('❌ 模拟导入测试失败:', error);
            return false;
        }
    }
    
    // 主测试函数
    async function runImportRefreshTest() {
        console.log('🚀 开始"读"功能完整流程测试');
        
        const tests = [
            { name: 'Registry系统', fn: testRegistrySystem },
            { name: 'MindmapController导入方法', fn: testImportMethods },
            { name: '界面刷新机制', fn: testRefreshMechanism },
            { name: '存储系统集成', fn: testStorageIntegration },
            { name: '模拟导入测试', fn: simulateImportTest }
        ];
        
        let passedTests = 0;
        
        for (const test of tests) {
            console.log(`\n📋 执行: ${test.name}`);
            try {
                const result = await test.fn();
                if (result) {
                    console.log(`✅ ${test.name} - 通过`);
                    passedTests++;
                } else {
                    console.log(`❌ ${test.name} - 失败`);
                }
            } catch (error) {
                console.error(`❌ ${test.name} - 异常:`, error);
            }
        }
        
        console.log(`\n📊 测试结果: ${passedTests}/${tests.length} 通过`);
        
        if (passedTests === tests.length) {
            console.log('🎉 "读"功能完整流程测试全部通过！');
            console.log('💡 现在可以测试实际的文件导入功能');
        } else {
            console.log('⚠️ 部分测试失败，需要进一步修复');
            
            // 提供修复建议
            if (passedTests < 2) {
                console.log('🔧 建议：检查Registry系统和MindmapController的加载');
            } else if (passedTests < 4) {
                console.log('🔧 建议：检查事件系统和存储系统的集成');
            } else {
                console.log('🔧 建议：检查数据流和界面更新逻辑');
            }
        }
        
        return passedTests === tests.length;
    }
    
    // 导出测试函数
    window.testImportRefresh = runImportRefreshTest;
    
    // 自动运行测试
    setTimeout(() => {
        console.log('⏰ 自动运行"读"功能测试');
        runImportRefreshTest();
    }, 3000);
    
})();
