/**
 * 程序员 ModuleActivationTest.js - Phase 6.1 模块激活功能测试
 * 
 * 职责：
 * - 测试ModuleActivation的模块注册功能
 * - 验证依赖关系建立是否正确
 * - 检查模块激活状态
 * - 生成详细的测试报告
 */

;(function(global) {
    'use strict';
    
    class ModuleActivationTest {
        constructor() {
            this.testResults = {
                total: 0,
                passed: 0,
                failed: 0,
                errors: [],
                details: []
            };
        }
        
        /**
         * 运行所有测试
         */
        async runAllTests() {
            console.log('🧪 [ModuleActivationTest] 开始运行模块激活测试...');
            
            try {
                // 等待ModuleActivation初始化
                await this._waitForModuleActivation();
                
                // 测试1: 验证ModuleActivation实例
                this._testModuleActivationInstance();
                
                // 测试2: 验证DependencyManager集成
                this._testDependencyManagerIntegration();
                
                // 测试3: 验证模块注册功能
                this._testModuleRegistration();
                
                // 测试4: 验证依赖关系图
                this._testDependencyGraph();
                
                // 测试5: 尝试激活模块
                await this._testModuleActivation();
                
                // 生成测试报告
                this._generateTestReport();
                
                return this.testResults;
                
            } catch (error) {
                console.error('🚨 [ModuleActivationTest] 测试运行失败:', error);
                this.testResults.errors.push(error);
                return this.testResults;
            }
        }
        
        /**
         * 等待ModuleActivation初始化完成
         */
        async _waitForModuleActivation() {
            return new Promise((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = 50; // 5秒超时
                
                const check = () => {
                    if (global.ModuleActivation && global.DependencyManager) {
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        reject(new Error('ModuleActivation初始化超时'));
                    } else {
                        attempts++;
                        setTimeout(check, 100);
                    }
                };
                
                check();
            });
        }
        
        /**
         * 测试1: 验证ModuleActivation实例
         */
        _testModuleActivationInstance() {
            const testName = 'ModuleActivation实例验证';
            this.testResults.total++;
            
            try {
                // 检查实例存在
                if (!global.ModuleActivation) {
                    throw new Error('ModuleActivation实例不存在');
                }
                
                // 检查必要方法
                const requiredMethods = [
                    'registerAllModules',
                    'activateAllModules', 
                    'getDependencyGraph',
                    'getActivationReport'
                ];
                
                for (const method of requiredMethods) {
                    if (typeof global.ModuleActivation[method] !== 'function') {
                        throw new Error(`缺少必要方法: ${method}`);
                    }
                }
                
                this.testResults.passed++;
                this.testResults.details.push({
                    test: testName,
                    status: 'PASS',
                    message: 'ModuleActivation实例验证通过'
                });
                
                console.log(`✅ [测试] ${testName} - 通过`);
                
            } catch (error) {
                this.testResults.failed++;
                this.testResults.errors.push(error);
                this.testResults.details.push({
                    test: testName,
                    status: 'FAIL',
                    message: error.message
                });
                
                console.error(`❌ [测试] ${testName} - 失败:`, error.message);
            }
        }
        
        /**
         * 测试2: 验证DependencyManager集成
         */
        _testDependencyManagerIntegration() {
            const testName = 'DependencyManager集成验证';
            this.testResults.total++;
            
            try {
                // 检查DependencyManager存在
                if (!global.DependencyManager) {
                    throw new Error('DependencyManager不存在');
                }
                
                // 检查ModuleActivation是否正确引用了DependencyManager
                if (global.ModuleActivation.dependencyManager !== global.DependencyManager) {
                    throw new Error('ModuleActivation未正确引用DependencyManager');
                }
                
                // 检查核心模块是否已注册
                const coreModules = ['AutogenUnifiedStorage', 'AutogenEventBus', 'Registry'];
                for (const moduleName of coreModules) {
                    const status = global.DependencyManager.getStatus(moduleName);
                    if (status.status === 'not_registered') {
                        throw new Error(`核心模块 ${moduleName} 未注册`);
                    }
                }
                
                this.testResults.passed++;
                this.testResults.details.push({
                    test: testName,
                    status: 'PASS',
                    message: 'DependencyManager集成验证通过'
                });
                
                console.log(`✅ [测试] ${testName} - 通过`);
                
            } catch (error) {
                this.testResults.failed++;
                this.testResults.errors.push(error);
                this.testResults.details.push({
                    test: testName,
                    status: 'FAIL',
                    message: error.message
                });
                
                console.error(`❌ [测试] ${testName} - 失败:`, error.message);
            }
        }
        
        /**
         * 测试3: 验证模块注册功能
         */
        _testModuleRegistration() {
            const testName = '模块注册功能验证';
            this.testResults.total++;
            
            try {
                // 获取注册前的状态
                const beforeStatus = global.ModuleActivation.getActivationReport();
                const beforeTotal = beforeStatus.total;
                
                // 执行模块注册
                const registrationResult = global.ModuleActivation.registerAllModules();
                
                if (!registrationResult) {
                    throw new Error('模块注册返回失败');
                }
                
                // 获取注册后的状态
                const afterStatus = global.ModuleActivation.getActivationReport();
                const afterTotal = afterStatus.total;
                
                // 验证模块数量增加
                if (afterTotal <= beforeTotal) {
                    throw new Error(`模块注册后数量未增加: ${beforeTotal} -> ${afterTotal}`);
                }
                
                // 验证各类别模块都有注册
                const categories = afterStatus.categories;
                const expectedCategories = ['core', 'business', 'presentation', 'data', 'integration'];
                
                for (const category of expectedCategories) {
                    if (!categories[category] || categories[category].length === 0) {
                        throw new Error(`${category} 类别模块未注册`);
                    }
                }
                
                this.testResults.passed++;
                this.testResults.details.push({
                    test: testName,
                    status: 'PASS',
                    message: `模块注册成功，总计: ${afterTotal}个模块`
                });
                
                console.log(`✅ [测试] ${testName} - 通过，注册了 ${afterTotal} 个模块`);
                
            } catch (error) {
                this.testResults.failed++;
                this.testResults.errors.push(error);
                this.testResults.details.push({
                    test: testName,
                    status: 'FAIL',
                    message: error.message
                });
                
                console.error(`❌ [测试] ${testName} - 失败:`, error.message);
            }
        }
        
        /**
         * 测试4: 验证依赖关系图
         */
        _testDependencyGraph() {
            const testName = '依赖关系图验证';
            this.testResults.total++;
            
            try {
                const dependencyGraph = global.ModuleActivation.getDependencyGraph();
                
                if (!dependencyGraph || typeof dependencyGraph !== 'object') {
                    throw new Error('依赖关系图获取失败');
                }
                
                // 验证关键模块的依赖关系
                const testCases = [
                    {
                        module: 'MindmapNodeManager',
                        expectedDeps: ['AutogenEventBus', 'AutogenUnifiedStorage']
                    },
                    {
                        module: 'MindmapRenderer',
                        expectedDeps: ['AutogenEventBus']
                    },
                    {
                        module: 'MindmapDataManager',
                        expectedDeps: ['AutogenUnifiedStorage', 'AutogenEventBus']
                    }
                ];
                
                for (const testCase of testCases) {
                    const moduleInfo = dependencyGraph[testCase.module];
                    if (!moduleInfo) {
                        throw new Error(`模块 ${testCase.module} 不在依赖图中`);
                    }
                    
                    for (const expectedDep of testCase.expectedDeps) {
                        if (!moduleInfo.dependencies.includes(expectedDep)) {
                            throw new Error(`模块 ${testCase.module} 缺少依赖: ${expectedDep}`);
                        }
                    }
                }
                
                this.testResults.passed++;
                this.testResults.details.push({
                    test: testName,
                    status: 'PASS',
                    message: `依赖关系图验证通过，包含 ${Object.keys(dependencyGraph).length} 个模块`
                });
                
                console.log(`✅ [测试] ${testName} - 通过`);
                
            } catch (error) {
                this.testResults.failed++;
                this.testResults.errors.push(error);
                this.testResults.details.push({
                    test: testName,
                    status: 'FAIL',
                    message: error.message
                });
                
                console.error(`❌ [测试] ${testName} - 失败:`, error.message);
            }
        }
        
        /**
         * 测试5: 尝试激活模块
         */
        async _testModuleActivation() {
            const testName = '模块激活功能验证';
            this.testResults.total++;
            
            try {
                console.log('🚀 [测试] 开始模块激活测试...');
                
                // 尝试激活所有模块
                const activationResults = await global.ModuleActivation.activateAllModules();
                
                if (!activationResults || typeof activationResults !== 'object') {
                    throw new Error('模块激活返回结果无效');
                }
                
                // 获取激活报告
                const report = global.ModuleActivation.getActivationReport();
                
                // 验证激活状态
                if (report.activated === 0) {
                    throw new Error('没有模块被成功激活');
                }
                
                // 计算激活成功率
                const successRate = (report.activated / report.total) * 100;
                
                if (successRate < 25) {
                    throw new Error(`模块激活成功率过低: ${successRate.toFixed(1)}%`);
                }
                
                this.testResults.passed++;
                this.testResults.details.push({
                    test: testName,
                    status: 'PASS',
                    message: `模块激活成功，成功率: ${successRate.toFixed(1)}% (${report.activated}/${report.total})`
                });
                
                console.log(`✅ [测试] ${testName} - 通过，激活成功率: ${successRate.toFixed(1)}%`);
                
            } catch (error) {
                this.testResults.failed++;
                this.testResults.errors.push(error);
                this.testResults.details.push({
                    test: testName,
                    status: 'FAIL',
                    message: error.message
                });
                
                console.error(`❌ [测试] ${testName} - 失败:`, error.message);
            }
        }
        
        /**
         * 生成测试报告
         */
        _generateTestReport() {
            const successRate = (this.testResults.passed / this.testResults.total) * 100;
            
            console.log('\n📊 [ModuleActivationTest] 测试报告');
            console.log('=====================================');
            console.log(`总测试数: ${this.testResults.total}`);
            console.log(`通过: ${this.testResults.passed}`);
            console.log(`失败: ${this.testResults.failed}`);
            console.log(`成功率: ${successRate.toFixed(1)}%`);
            
            if (this.testResults.details.length > 0) {
                console.log('\n详细结果:');
                this.testResults.details.forEach(detail => {
                    const status = detail.status === 'PASS' ? '✅' : '❌';
                    console.log(`${status} ${detail.test}: ${detail.message}`);
                });
            }
            
            if (this.testResults.errors.length > 0) {
                console.log('\n错误详情:');
                this.testResults.errors.forEach((error, index) => {
                    console.error(`${index + 1}. ${error.message}`);
                });
            }
            
            console.log('=====================================\n');
            
            // 发送测试完成事件
            this._emitTestComplete();
        }
        
        _emitTestComplete() {
            try {
                if (global.AutogenEventBus && typeof global.AutogenEventBus.emit === 'function') {
                    global.AutogenEventBus.emit('test:module_activation_complete', {
                        results: this.testResults,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.warn('[ModuleActivationTest] 发送测试完成事件失败:', error);
            }
        }
    }
    
    // 创建全局测试实例
    global.ModuleActivationTest = global.ModuleActivationTest || new ModuleActivationTest();
    
    // 自动运行测试（延迟执行，等待所有模块加载）
    setTimeout(() => {
        if (global.ModuleActivation && global.DependencyManager) {
            console.log('🧪 [ModuleActivationTest] 自动运行测试...');
            global.ModuleActivationTest.runAllTests().then(results => {
                console.log('🎯 [ModuleActivationTest] 测试完成，调用 ModuleActivationTest.runAllTests() 可重新运行');
            }).catch(error => {
                console.error('🚨 [ModuleActivationTest] 自动测试失败:', error);
            });
        } else {
            console.warn('⚠️ [ModuleActivationTest] 依赖模块未就绪，请手动运行 ModuleActivationTest.runAllTests()');
        }
    }, 2000); // 延迟2秒执行
    
})(window || this);
