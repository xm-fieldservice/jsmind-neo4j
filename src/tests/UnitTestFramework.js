/**
 * 简单测试运行器 - 轻量级测试框架
 */

;(function(global) {
    'use strict';
    
    const SimpleTestRunner = {
        tests: [],
        results: [],
        
        // 添加测试
        test(name, testFn) {
            this.tests.push({ name, testFn });
        },
        
        // 断言方法
        assert: {
            equal(actual, expected, message) {
                if (actual !== expected) {
                    throw new Error(message || `断言失败: ${actual} !== ${expected}`);
                }
            },
            
            truthy(value, message) {
                if (!value) {
                    throw new Error(message || `断言失败: ${value} 不为真`);
                }
            },
            
            async throws(fn, message) {
                let threw = false;
                try {
                    await fn();
                } catch (error) {
                    threw = true;
                }
                if (!threw) {
                    throw new Error(message || '断言失败: 函数未抛出异常');
                }
            }
        },
        
        // 运行所有测试
        async runAll() {
            this.results = [];
            
            for (const test of this.tests) {
                const result = { name: test.name, passed: false, error: null };
                
                try {
                    await test.testFn(this.assert);
                    result.passed = true;
                } catch (error) {
                    result.error = error.message;
                }
                
                this.results.push(result);
            }
            
            return this.generateReport();
        },
        
        // 生成报告
        generateReport() {
            const passed = this.results.filter(r => r.passed).length;
            const total = this.results.length;
            
            return {
                total,
                passed,
                failed: total - passed,
                successRate: total > 0 ? (passed / total) * 100 : 0,
                results: this.results
            };
        },
        
        // 运行组件测试
        async runComponentTests() {
            // 清空现有测试
            this.tests = [];
            
            // AutogenUnifiedStorage测试
            this.test('AutogenUnifiedStorage基本功能', async (assert) => {
                const storage = global.AutogenUnifiedStorage;
                assert.truthy(storage, 'AutogenUnifiedStorage应该存在');
                assert.truthy(typeof storage.store === 'function', '应该有store方法');
                assert.truthy(typeof storage.retrieve === 'function', '应该有retrieve方法');
                
                // 测试存储和检索
                const testKey = 'unit_test_' + Date.now();
                const testData = { test: true };
                
                const storeResult = await storage.store('test', testKey, testData);
                assert.truthy(storeResult, '存储应该成功');
                
                const retrieveResult = await storage.retrieve('test', testKey);
                assert.equal(retrieveResult.test, true, '检索的数据应该正确');
                
                await storage.remove('test', testKey);
            });
            
            // AutogenEventBus测试
            this.test('AutogenEventBus基本功能', async (assert) => {
                const eventBus = global.AutogenEventBus;
                assert.truthy(eventBus, 'AutogenEventBus应该存在');
                assert.truthy(typeof eventBus.emit === 'function', '应该有emit方法');
                assert.truthy(typeof eventBus.on === 'function', '应该有on方法');
                
                // 测试事件发送和接收
                return new Promise((resolve) => {
                    const testEvent = 'unit_test_' + Date.now();
                    const testData = { test: true };
                    
                    const handler = (data) => {
                        assert.equal(data.test, true, '事件数据应该正确');
                        resolve();
                    };
                    
                    eventBus.once(testEvent, handler);
                    eventBus.emit(testEvent, testData);
                });
            });
            
            return await this.runAll();
        }
    };
    
    global.UnitTestFramework = SimpleTestRunner;
    
})(typeof window !== 'undefined' ? window : global);
