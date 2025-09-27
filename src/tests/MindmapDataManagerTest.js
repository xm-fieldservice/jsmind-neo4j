/**
 * MindmapDataManagerTest.js - 数据管理器测试脚本
 * 
 * 职责：验证MindmapDataManager的功能和集成效果
 */

(function() {
    'use strict';

    class MindmapDataManagerTest {
        constructor() {
            this.testResults = [];
            this.testCount = 0;
            this.passCount = 0;
        }

        // 运行所有测试
        async runAllTests() {
            console.log('🧪 [DataManagerTest] 开始数据管理器测试...');
            
            await this.waitForDependencies();
            
            // 基础功能测试
            await this.testDataManagerCreation();
            await this.testDataConversion();
            await this.testDataValidation();
            
            // 集成功能测试
            await this.testControllerIntegration();
            await this.testSaveLoadCycle();
            
            // 输出测试报告
            this.generateReport();
        }

        // 等待依赖加载
        async waitForDependencies() {
            return new Promise((resolve) => {
                const check = () => {
                    if (window.MindmapDataManager && 
                        window.MindmapController && 
                        window.AutogenUnifiedStorage) {
                        resolve();
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        }

        // 测试数据管理器创建
        async testDataManagerCreation() {
            this.test('数据管理器创建', () => {
                const dataManager = new window.MindmapDataManager({
                    storage: window.AutogenUnifiedStorage,
                    eventBus: window.AutogenEventBus
                });
                
                return dataManager && 
                       dataManager.storage && 
                       typeof dataManager.saveMindmapData === 'function' &&
                       typeof dataManager.loadMindmapData === 'function';
            });
        }

        // 测试数据转换
        async testDataConversion() {
            const dataManager = new window.MindmapDataManager({
                storage: window.AutogenUnifiedStorage,
                eventBus: window.AutogenEventBus
            });

            // 测试内部格式到jsMind格式转换
            this.test('内部格式→jsMind格式转换', () => {
                const internalData = {
                    id: 'test-root',
                    label: '测试根节点',
                    content: '这是测试内容',
                    children: [
                        {
                            id: 'test-child-1',
                            label: '子节点1',
                            content: '子节点内容',
                            children: []
                        }
                    ]
                };

                const jmData = dataManager.toJsMindTree(internalData);
                
                return jmData &&
                       jmData.id === 'test-root' &&
                       jmData.topic === '测试根节点' &&
                       jmData.data.content === '这是测试内容' &&
                       jmData.children &&
                       jmData.children.length === 1 &&
                       jmData.children[0].topic === '子节点1';
            });

            // 测试jsMind格式到内部格式转换
            this.test('jsMind格式→内部格式转换', () => {
                const jmData = {
                    id: 'test-root',
                    topic: '测试根节点',
                    data: {
                        content: '这是测试内容'
                    },
                    children: [
                        {
                            id: 'test-child-1',
                            topic: '子节点1',
                            data: {
                                content: '子节点内容'
                            }
                        }
                    ]
                };

                const internalData = dataManager.fromJsMindTree(jmData);
                
                return internalData &&
                       internalData.id === 'test-root' &&
                       internalData.label === '测试根节点' &&
                       internalData.content === '这是测试内容' &&
                       internalData.children &&
                       internalData.children.length === 1 &&
                       internalData.children[0].label === '子节点1';
            });
        }

        // 测试数据验证
        async testDataValidation() {
            const dataManager = new window.MindmapDataManager({
                storage: window.AutogenUnifiedStorage,
                eventBus: window.AutogenEventBus
            });

            this.test('数据验证和修复', () => {
                const invalidData = {
                    // 缺少必要字段
                    label: '测试节点'
                };

                const validData = dataManager.validateAndRepairData(invalidData);
                
                return validData &&
                       validData.id &&
                       validData.label === '测试节点' &&
                       Array.isArray(validData.children) &&
                       validData.content !== undefined &&
                       validData.created &&
                       validData.modified;
            });
        }

        // 测试控制器集成
        async testControllerIntegration() {
            // 等待集成完成
            await new Promise(resolve => setTimeout(resolve, 500));

            this.test('控制器集成检查', () => {
                return window.mindmapController &&
                       window.mindmapController.dataManager &&
                       typeof window.mindmapController.saveMindmapToStorage === 'function' &&
                       typeof window.mindmapController.loadMindmapFromStorage === 'function';
            });
        }

        // 测试保存加载循环
        async testSaveLoadCycle() {
            if (!window.mindmapController || !window.mindmapController.dataManager) {
                this.test('保存加载循环测试', () => false, '控制器或数据管理器不可用');
                return;
            }

            const testData = {
                id: 'test-save-load-' + Date.now(),
                label: '保存加载测试',
                content: '这是保存加载测试的内容',
                children: [],
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            };

            try {
                // 保存测试数据
                const saveSuccess = await window.mindmapController.dataManager.saveMindmapData(
                    testData, 
                    'test-save-load-key', 
                    true
                );

                if (!saveSuccess) {
                    this.test('保存加载循环测试', () => false, '保存失败');
                    return;
                }

                // 加载测试数据
                const loadedData = await window.mindmapController.dataManager.loadMindmapData('test-save-load-key');

                this.test('保存加载循环测试', () => {
                    return loadedData &&
                           loadedData.id === testData.id &&
                           loadedData.label === testData.label &&
                           loadedData.content === testData.content;
                });

            } catch (error) {
                this.test('保存加载循环测试', () => false, `异常: ${error.message}`);
            }
        }

        // 执行单个测试
        test(name, testFn, errorMsg = null) {
            this.testCount++;
            try {
                const result = testFn();
                if (result) {
                    this.passCount++;
                    this.testResults.push({ name, status: 'PASS', message: '✅' });
                    console.log(`✅ [DataManagerTest] ${name}: PASS`);
                } else {
                    this.testResults.push({ name, status: 'FAIL', message: errorMsg || '❌ 测试条件不满足' });
                    console.error(`❌ [DataManagerTest] ${name}: FAIL - ${errorMsg || '测试条件不满足'}`);
                }
            } catch (error) {
                this.testResults.push({ name, status: 'ERROR', message: `💥 ${error.message}` });
                console.error(`💥 [DataManagerTest] ${name}: ERROR - ${error.message}`);
            }
        }

        // 生成测试报告
        generateReport() {
            const successRate = ((this.passCount / this.testCount) * 100).toFixed(1);
            
            console.log('\n📊 [DataManagerTest] 测试报告');
            console.log('=====================================');
            console.log(`总测试数: ${this.testCount}`);
            console.log(`通过数: ${this.passCount}`);
            console.log(`失败数: ${this.testCount - this.passCount}`);
            console.log(`成功率: ${successRate}%`);
            console.log('=====================================');
            
            this.testResults.forEach(result => {
                console.log(`${result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '💥'} ${result.name}: ${result.message}`);
            });
            
            console.log('=====================================\n');

            // 触发测试完成事件
            if (window.AutogenEventBus) {
                window.AutogenEventBus.emit('mindmap:dataManagerTestCompleted', {
                    totalTests: this.testCount,
                    passedTests: this.passCount,
                    successRate: parseFloat(successRate),
                    results: this.testResults,
                    timestamp: new Date().toISOString()
                });
            }

            return {
                success: this.passCount === this.testCount,
                successRate: parseFloat(successRate),
                results: this.testResults
            };
        }
    }

    // 全局暴露测试类
    window.MindmapDataManagerTest = MindmapDataManagerTest;

    // 自动运行测试（延迟执行，确保所有组件加载完成）
    setTimeout(() => {
        const tester = new MindmapDataManagerTest();
        tester.runAllTests().then(result => {
            console.log('[DataManagerTest] 所有测试完成');
        }).catch(error => {
            console.error('[DataManagerTest] 测试执行失败:', error);
        });
    }, 2000);

})();
