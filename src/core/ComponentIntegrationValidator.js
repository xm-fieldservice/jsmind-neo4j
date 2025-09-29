/**
 * 集成检查器 - 基于现有组件验证的轻量实现
 */

;(function(global) {
    'use strict';
    
    const IntegrationChecker = {
        // 验证核心组件
        validateCore() {
            const components = ['AutogenUnifiedStorage', 'AutogenEventBus', 'ErrorHandler', 'UnifiedLogger'];
            const results = {};
            
            components.forEach(name => {
                const component = global[name];
                results[name] = {
                    exists: !!component,
                    functional: component && typeof component.getStats === 'function',
                    stats: component?.getStats ? component.getStats() : null
                };
            });
            
            return results;
        },
        
        // 运行集成测试
        async runIntegrationTest() {
            const storage = global.AutogenUnifiedStorage;
            const eventBus = global.AutogenEventBus;
            
            if (!storage || !eventBus) return { passed: false, message: '核心组件缺失' };
            
            try {
                // 简单集成测试
                await storage.store('integration_test', 'test_key', { test: true });
                eventBus.emit('integration:test', { success: true });
                return { passed: true, message: '集成测试通过' };
            } catch (error) {
                return { passed: false, message: error.message };
            }
        }
    };
    
    global.ComponentIntegrationValidator = IntegrationChecker;
    
})(typeof window !== 'undefined' ? window : global);
