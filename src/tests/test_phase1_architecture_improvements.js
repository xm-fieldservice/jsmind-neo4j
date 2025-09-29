/**
 * Phase 1 架构改进验证测试
 * 
 * 测试目标：
 * 1. 验证EnhancedConfigurationManager分层配置管理
 * 2. 验证ErrorProcessingPipeline统一错误处理
 * 3. 验证ArchitectureHealthMonitor健康度监控
 * 4. 确保所有组件正确集成和工作
 */

;(function(global) {
    'use strict';
    
    class Phase1ArchitectureImprovementsTest {
        constructor() {
            this.testResults = [];
            this.startTime = Date.now();
            
            console.log('[Phase1Test] 开始Phase 1架构改进验证测试');
        }
        
        /**
         * 执行所有测试
         */
        async runAllTests() {
            try {
                console.log('[Phase1Test] ========== Phase 1 架构改进验证测试开始 ==========');
                
                // 等待组件初始化
                await this._waitForComponentsReady();
                
                // 1. 测试EnhancedConfigurationManager
                await this._testEnhancedConfigurationManager();
                
                // 2. 测试ErrorProcessingPipeline
                await this._testErrorProcessingPipeline();
                
                // 3. 测试ArchitectureHealthMonitor
                await this._testArchitectureHealthMonitor();
                
                // 4. 测试组件集成
                await this._testComponentIntegration();
                
                // 5. 生成测试报告
                this._generateTestReport();
                
                console.log('[Phase1Test] ========== Phase 1 架构改进验证测试完成 ==========');
                
                return this._getOverallResult();
                
            } catch (error) {
                console.error('[Phase1Test] 测试执行失败:', error);
                this._addTestResult('测试执行', false, `测试执行失败: ${error.message}`);
                return false;
            }
        }
        
        /**
         * 等待组件准备就绪
         */
        async _waitForComponentsReady() {
            const maxWait = 10000; // 最大等待10秒
            const startTime = Date.now();
            
            while (Date.now() - startTime < maxWait) {
                if (global.EnhancedConfigurationManager && 
                    global.ErrorProcessingPipeline && 
                    global.ArchitectureHealthMonitor) {
                    
                    // 等待组件初始化完成
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return;
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            throw new Error('组件初始化超时');
        }
        
        /**
         * 测试EnhancedConfigurationManager
         */
        async _testEnhancedConfigurationManager() {
            console.log('[Phase1Test] 测试EnhancedConfigurationManager...');
            
            try {
                const configManager = window.EnhancedConfigurationManager;
                
                // 1.1 测试组件存在性
                this._addTestResult(
                    'P1.1.1 EnhancedConfigurationManager存在性',
                    !!configManager,
                    configManager ? '组件已正确加载' : '组件未找到'
                );
                
                if (!configManager) return;
                
                // 1.2 测试初始化状态
                await configManager.initialize();
                const status = configManager.getStatus();
                this._addTestResult(
                    'P1.1.2 配置管理器初始化',
                    status.initialized,
                    `初始化状态: ${status.initialized}, 缓存大小: ${status.cacheSize}`
                );
                
                // 1.3 测试配置获取
                const apiEndpoints = await configManager.getConfig('api.endpoints', {});
                this._addTestResult(
                    'P1.1.3 配置获取功能',
                    typeof apiEndpoints === 'object',
                    `API端点配置: ${JSON.stringify(apiEndpoints).substring(0, 100)}...`
                );
                
                // 1.4 测试配置设置
                await configManager.setConfig('test.value', 'phase1-test', 'user');
                const testValue = await configManager.getConfig('test.value');
                this._addTestResult(
                    'P1.1.4 配置设置功能',
                    testValue === 'phase1-test',
                    `设置的测试值: ${testValue}`
                );
                
                // 1.5 测试API配置便捷方法
                const apiConfig = await configManager.getApiConfig();
                this._addTestResult(
                    'P1.1.5 API配置便捷方法',
                    apiConfig && typeof apiConfig.endpoints === 'object',
                    `API配置结构: ${Object.keys(apiConfig).join(', ')}`
                );
                
                console.log('[Phase1Test] ✅ EnhancedConfigurationManager测试完成');
                
            } catch (error) {
                console.error('[Phase1Test] EnhancedConfigurationManager测试失败:', error);
                this._addTestResult('P1.1 EnhancedConfigurationManager', false, `测试失败: ${error.message}`);
            }
        }
        
        /**
         * 测试ErrorProcessingPipeline
         */
        async _testErrorProcessingPipeline() {
            console.log('[Phase1Test] 测试ErrorProcessingPipeline...');
            
            try {
                const errorPipeline = window.ErrorProcessingPipeline;
                
                // 2.1 测试组件存在性
                this._addTestResult(
                    'P1.2.1 ErrorProcessingPipeline存在性',
                    !!errorPipeline,
                    errorPipeline ? '组件已正确加载' : '组件未找到'
                );
                
                if (!errorPipeline) return;
                
                // 2.2 测试初始化状态
                const status = errorPipeline.getStatus();
                this._addTestResult(
                    'P1.2.2 错误处理管道初始化',
                    status.initialized,
                    `初始化: ${status.initialized}, 分类器: ${status.classifiers}, 策略: ${status.strategies}`
                );
                
                // 2.3 测试错误处理功能
                const testError = new Error('Phase1 测试错误');
                const processed = await errorPipeline.processError(testError, {
                    category: 'test',
                    component: 'Phase1Test'
                });
                this._addTestResult(
                    'P1.2.3 错误处理功能',
                    typeof processed === 'boolean',
                    `错误处理结果: ${processed}`
                );
                
                // 2.4 测试全局错误处理函数
                const globalProcessError = global.processError;
                this._addTestResult(
                    'P1.2.4 全局错误处理函数',
                    typeof globalProcessError === 'function',
                    globalProcessError ? '全局函数已注册' : '全局函数未找到'
                );
                
                // 2.5 测试错误统计
                const errorStats = errorPipeline.getErrorStats();
                this._addTestResult(
                    'P1.2.5 错误统计功能',
                    typeof errorStats === 'object',
                    `统计类别数量: ${Object.keys(errorStats).length}`
                );
                
                console.log('[Phase1Test] ✅ ErrorProcessingPipeline测试完成');
                
            } catch (error) {
                console.error('[Phase1Test] ErrorProcessingPipeline测试失败:', error);
                this._addTestResult('P1.2 ErrorProcessingPipeline', false, `测试失败: ${error.message}`);
            }
        }
        
        /**
         * 测试ArchitectureHealthMonitor
         */
        async _testArchitectureHealthMonitor() {
            console.log('[Phase1Test] 测试ArchitectureHealthMonitor...');
            
            try {
                const healthMonitor = window.ArchitectureHealthMonitor;
                
                // 3.1 测试组件存在性
                this._addTestResult(
                    'P1.3.1 ArchitectureHealthMonitor存在性',
                    !!healthMonitor,
                    healthMonitor ? '组件已正确加载' : '组件未找到'
                );
                
                if (!healthMonitor) return;
                
                // 3.2 测试监控器状态
                const status = healthMonitor.getStatus();
                this._addTestResult(
                    'P1.3.2 健康监控器状态',
                    typeof status === 'object' && status.registeredChecks > 0,
                    `监控状态: ${status.isMonitoring}, 注册检查: ${status.registeredChecks}`
                );
                
                // 3.3 测试健康检查执行
                const healthResult = await healthMonitor.performHealthCheck();
                this._addTestResult(
                    'P1.3.3 健康检查执行',
                    healthResult && healthResult.summary && typeof healthResult.summary.total === 'number',
                    `检查总数: ${healthResult.summary.total}, 健康度: ${healthResult.summary.healthPercentage}%`
                );
                
                // 3.4 测试核心组件健康检查
                const coreComponents = ['AutogenUnifiedStorage', 'AutogenEventBus', 'MindmapController'];
                let coreHealthy = 0;
                
                for (const component of coreComponents) {
                    if (healthResult.components[component] && healthResult.components[component].healthy) {
                        coreHealthy++;
                    }
                }
                
                this._addTestResult(
                    'P1.3.4 核心组件健康检查',
                    coreHealthy >= 2, // 至少2个核心组件健康
                    `核心组件健康数: ${coreHealthy}/${coreComponents.length}`
                );
                
                // 3.5 测试自定义健康检查注册
                healthMonitor.registerHealthCheck('Phase1Test', async () => {
                    return { healthy: true, testValue: 'success' };
                }, { category: 'test' });
                
                // 重新执行健康检查验证注册
                const updatedResult = await healthMonitor.performHealthCheck();
                const testCheckExists = updatedResult.components['Phase1Test'];
                
                this._addTestResult(
                    'P1.3.5 自定义健康检查注册',
                    testCheckExists && testCheckExists.healthy,
                    testCheckExists ? `自定义检查结果: ${testCheckExists.testValue}` : '自定义检查未找到'
                );
                
                console.log('[Phase1Test] ✅ ArchitectureHealthMonitor测试完成');
                
            } catch (error) {
                console.error('[Phase1Test] ArchitectureHealthMonitor测试失败:', error);
                this._addTestResult('P1.3 ArchitectureHealthMonitor', false, `测试失败: ${error.message}`);
            }
        }
        
        /**
         * 测试组件集成
         */
        async _testComponentIntegration() {
            console.log('[Phase1Test] 测试组件集成...');
            
            try {
                // 4.1 测试配置管理器与错误处理管道集成
                const configManager = window.EnhancedConfigurationManager;
                const errorPipeline = window.ErrorProcessingPipeline;
                
                if (configManager && errorPipeline) {
                    // 通过配置管理器设置错误处理配置
                    await configManager.setConfig('error.processing.enabled', true, 'runtime');
                    const errorConfig = await configManager.getConfig('error.processing.enabled');
                    
                    this._addTestResult(
                        'P1.4.1 配置管理器与错误处理集成',
                        errorConfig === true,
                        `错误处理配置: ${errorConfig}`
                    );
                }
                
                // 4.2 测试健康监控器与其他组件集成
                const healthMonitor = window.ArchitectureHealthMonitor;
                
                if (healthMonitor && configManager) {
                    const healthResult = await healthMonitor.performHealthCheck();
                    const configManagerHealth = healthResult.components['EnhancedConfigurationManager'] || 
                                              healthResult.components['ConfigurationManager'];
                    
                    this._addTestResult(
                        'P1.4.2 健康监控器组件集成',
                        !!configManagerHealth,
                        configManagerHealth ? '配置管理器健康检查已集成' : '配置管理器健康检查未集成'
                    );
                }
                
                // 4.3 测试事件总线集成
                const eventBus = window.AutogenEventBus;
                
                if (eventBus) {
                    let eventReceived = false;
                    
                    // 监听配置变更事件
                    const eventHandler = () => { eventReceived = true; };
                    eventBus.on('config:changed', eventHandler);
                    
                    // 触发配置变更
                    if (configManager) {
                        await configManager.setConfig('test.integration', 'event-test', 'runtime');
                    }
                    
                    // 等待事件传播
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    eventBus.off('config:changed', eventHandler);
                    
                    this._addTestResult(
                        'P1.4.3 事件总线集成',
                        eventReceived,
                        eventReceived ? '配置变更事件已正确触发' : '配置变更事件未触发'
                    );
                }
                
                // 4.4 测试存储系统集成
                const storage = window.AutogenUnifiedStorage;
                
                if (storage && configManager) {
                    // 验证配置是否正确存储到统一存储系统
                    const storedConfig = await storage.retrieve('user-config', 'test.integration');
                    
                    this._addTestResult(
                        'P1.4.4 存储系统集成',
                        storedConfig === 'event-test',
                        `存储的配置值: ${storedConfig}`
                    );
                }
                
                console.log('[Phase1Test] ✅ 组件集成测试完成');
                
            } catch (error) {
                console.error('[Phase1Test] 组件集成测试失败:', error);
                this._addTestResult('P1.4 组件集成', false, `测试失败: ${error.message}`);
            }
        }
        
        /**
         * 添加测试结果
         */
        _addTestResult(testName, passed, details) {
            const result = {
                name: testName,
                passed,
                details,
                timestamp: Date.now()
            };
            
            this.testResults.push(result);
            
            const status = passed ? '✅ PASS' : '❌ FAIL';
            console.log(`[Phase1Test] ${status}: ${testName} - ${details}`);
        }
        
        /**
         * 生成测试报告
         */
        _generateTestReport() {
            const totalTests = this.testResults.length;
            const passedTests = this.testResults.filter(r => r.passed).length;
            const failedTests = totalTests - passedTests;
            const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
            const duration = Date.now() - this.startTime;
            
            console.log('\n[Phase1Test] ==================== 测试报告 ====================');
            console.log(`[Phase1Test] 测试总数: ${totalTests}`);
            console.log(`[Phase1Test] 通过测试: ${passedTests}`);
            console.log(`[Phase1Test] 失败测试: ${failedTests}`);
            console.log(`[Phase1Test] 成功率: ${successRate}%`);
            console.log(`[Phase1Test] 测试耗时: ${duration}ms`);
            
            if (failedTests > 0) {
                console.log('\n[Phase1Test] 失败的测试:');
                this.testResults.filter(r => !r.passed).forEach(result => {
                    console.log(`[Phase1Test] ❌ ${result.name}: ${result.details}`);
                });
            }
            
            console.log('[Phase1Test] ================================================\n');
            
            // 触发全局事件
            if (window.AutogenEventBus) {
                window.AutogenEventBus.emit('phase1:test:completed', {
                    totalTests,
                    passedTests,
                    failedTests,
                    successRate,
                    duration,
                    results: this.testResults
                });
            }
        }
        
        /**
         * 获取整体测试结果
         */
        _getOverallResult() {
            const totalTests = this.testResults.length;
            const passedTests = this.testResults.filter(r => r.passed).length;
            const successRate = totalTests > 0 ? (passedTests / totalTests) : 0;
            
            return {
                success: successRate >= 0.8, // 80%成功率视为通过
                successRate: Math.round(successRate * 100),
                totalTests,
                passedTests,
                failedTests: totalTests - passedTests,
                results: this.testResults
            };
        }
    }
    
    // 创建测试实例并导出
    const phase1Test = new Phase1ArchitectureImprovementsTest();
    
    // 全局导出
    window.Phase1ArchitectureImprovementsTest = phase1Test;
    
    // 自动执行测试（延迟执行以确保所有组件加载完成）
    if (typeof window !== 'undefined') {
        window.addEventListener('load', () => {
            setTimeout(() => {
                phase1Test.runAllTests().then(result => {
                    console.log('[Phase1Test] Phase 1架构改进验证测试完成，整体结果:', result.success ? '✅ 通过' : '❌ 失败');
                }).catch(error => {
                    console.error('[Phase1Test] Phase 1架构改进验证测试异常:', error);
                });
            }, 2000); // 延迟2秒执行
        });
    }
    
    console.log('[Phase1Test] Phase 1架构改进验证测试模块加载完成');
    
})(typeof window !== 'undefined' ? window : this);
