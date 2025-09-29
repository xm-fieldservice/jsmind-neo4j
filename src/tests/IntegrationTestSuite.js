/**
 * 轻量测试套件 - 基于现有组件的集成测试
 */

;(function(global) {
    'use strict';
    
    const LightTestSuite = {
        // 运行存储-事件集成测试
        async testStorageEventIntegration() {
            const storage = global.AutogenUnifiedStorage;
            const eventBus = global.AutogenEventBus;
            
            if (!storage || !eventBus) {
                return { passed: false, message: '核心组件缺失' };
            }
            
            try {
                let eventReceived = false;
                
                // 监听存储事件
                const handler = () => { eventReceived = true; };
                eventBus.on('storage:operation', handler);
                
                // 执行存储操作
                await storage.store('integration_test', 'test_key', { test: true });
                
                // 等待事件
                await new Promise(resolve => setTimeout(resolve, 100));
                
                eventBus.off('storage:operation', handler);
                
                return {
                    passed: eventReceived,
                    message: eventReceived ? '存储-事件集成正常' : '存储事件未触发'
                };
            } catch (error) {
                return { passed: false, message: error.message };
            }
        },
        
        // 运行错误处理集成测试
        async testErrorHandlingIntegration() {
            const errorHandler = global.ErrorHandler;
            const logger = global.UnifiedLogger;
            
            if (!errorHandler) {
                return { passed: false, message: 'ErrorHandler不可用' };
            }
            
            try {
                const testError = new Error('集成测试错误');
                await errorHandler.handle(testError, 'integration_test');
                
                return { passed: true, message: '错误处理集成正常' };
            } catch (error) {
                return { passed: false, message: error.message };
            }
        },
        
        // 运行配置-存储集成测试
        async testConfigStorageIntegration() {
            const config = global.EnhancedConfigurationManager;
            const storage = global.AutogenUnifiedStorage;
            
            if (!config || !storage) {
                return { passed: false, message: '配置或存储组件缺失' };
            }
            
            try {
                const testKey = 'integration.test.' + Date.now();
                const testValue = 'test_value_' + Date.now();
                
                await config.set(testKey, testValue);
                const retrievedValue = await config.get(testKey);
                
                return {
                    passed: retrievedValue === testValue,
                    message: retrievedValue === testValue ? '配置-存储集成正常' : '配置值不一致'
                };
            } catch (error) {
                return { passed: false, message: error.message };
            }
        },
        
        // 运行健康监控集成测试
        async testHealthMonitorIntegration() {
            const monitor = global.ArchitectureHealthMonitor;
            
            if (!monitor) {
                return { passed: false, message: 'ArchitectureHealthMonitor不可用' };
            }
            
            try {
                const health = await monitor.getSystemHealth();
                
                return {
                    passed: health && typeof health === 'object',
                    message: health ? '健康监控集成正常' : '健康监控数据异常'
                };
            } catch (error) {
                return { passed: false, message: error.message };
            }
        },
        
        // 运行性能基准测试
        async runPerformanceBenchmark() {
            const storage = global.AutogenUnifiedStorage;
            const eventBus = global.AutogenEventBus;
            
            if (!storage || !eventBus) {
                return { passed: false, message: '核心组件缺失' };
            }
            
            const startTime = performance.now();
            
            try {
                // 并发操作测试
                const promises = [];
                for (let i = 0; i < 10; i++) {
                    promises.push(storage.store('perf_test', `key_${i}`, { value: i }));
                    promises.push(new Promise(resolve => {
                        eventBus.emit('perf_test_event', { index: i });
                        resolve();
                    }));
                }
                
                await Promise.all(promises);
                
                const totalTime = performance.now() - startTime;
                
                // 清理测试数据
                for (let i = 0; i < 10; i++) {
                    await storage.remove('perf_test', `key_${i}`);
                }
                
                return {
                    passed: totalTime < 1000,
                    message: `性能测试完成，耗时: ${totalTime.toFixed(2)}ms`,
                    benchmark: {
                        operations: 20,
                        totalTime,
                        avgTime: totalTime / 20,
                        acceptable: totalTime < 1000
                    }
                };
            } catch (error) {
                return { passed: false, message: error.message };
            }
        },
        
        // 运行完整测试套件
        async runFullSuite() {
            const tests = [
                { name: '存储-事件集成', test: () => this.testStorageEventIntegration() },
                { name: '错误处理集成', test: () => this.testErrorHandlingIntegration() },
                { name: '配置-存储集成', test: () => this.testConfigStorageIntegration() },
                { name: '健康监控集成', test: () => this.testHealthMonitorIntegration() },
                { name: '性能基准测试', test: () => this.runPerformanceBenchmark() }
            ];
            
            const results = [];
            
            for (const { name, test } of tests) {
                try {
                    const result = await test();
                    results.push({ name, ...result });
                } catch (error) {
                    results.push({ name, passed: false, message: error.message });
                }
            }
            
            const passed = results.filter(r => r.passed).length;
            const total = results.length;
            
            return {
                timestamp: Date.now(),
                summary: {
                    total,
                    passed,
                    failed: total - passed,
                    successRate: (passed / total) * 100
                },
                results
            };
        }
    };
    
    global.IntegrationTestSuite = LightTestSuite;
    
})(typeof window !== 'undefined' ? window : global);
