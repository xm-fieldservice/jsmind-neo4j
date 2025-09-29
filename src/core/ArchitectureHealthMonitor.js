/**
 * 健康监控器 - 基于现有组件getStats()的轻量实现
 */

;(function(global) {
    'use strict';
    
    const HealthMonitor = {
        async getSystemHealth() {
            const health = {};
            
            // 收集各组件统计
            if (global.AutogenUnifiedStorage) health.storage = global.AutogenUnifiedStorage.getStats();
            if (global.AutogenEventBus) health.events = global.AutogenEventBus.getStats();
            if (global.ErrorHandler) health.errors = global.ErrorHandler.getStats();
            if (global.UnifiedLogger) health.logs = global.UnifiedLogger.getStats();
            
            // 计算总体健康度
            const components = Object.values(health);
            const healthyCount = components.filter(c => c.health?.healthy !== false).length;
            health.overall = { 
                score: Math.round((healthyCount / components.length) * 100),
                healthy: healthyCount === components.length
            };
            
            return health;
        }
    };
    
    global.ArchitectureHealthMonitor = HealthMonitor;
    
})(typeof window !== 'undefined' ? window : global);
