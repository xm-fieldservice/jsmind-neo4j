/**
 * 依赖跟踪器 - 简化的组件依赖管理
 * 
 * @deprecated 此组件已废弃，请使用 ModuleManager 替代
 * @see src/core/ModuleManager.js
 * @see docs/迁移指南-模块管理组件.md
 * 
 * 废弃时间: 2025-10-07
 * 移除计划: 3个版本后 (约3个月)
 */

;(function(global) {
    'use strict';
    
    console.warn('[ComponentDependencyGraph] ⚠️ 此组件已废弃，请使用 ModuleManager 替代');
    
    const DependencyTracker = {
        // 核心组件列表
        coreComponents: [
            'AutogenUnifiedStorage',
            'AutogenEventBus', 
            'ErrorHandler',
            'UnifiedLogger'
        ],
        
        // 检查组件可用性
        checkAvailability() {
            const status = {};
            this.coreComponents.forEach(name => {
                status[name] = {
                    available: !!global[name],
                    functional: global[name] && typeof global[name].getStats === 'function'
                };
            });
            return status;
        },
        
        // 获取初始化顺序
        getInitOrder() {
            return this.coreComponents.filter(name => global[name]);
        },
        
        // 自动检测状态
        autoDetect() {
            const available = this.coreComponents.filter(name => global[name]);
            global.AutogenEventBus?.emit('dependency:status', {
                available: available.length,
                total: this.coreComponents.length,
                components: available
            });
            return available;
        }
    };
    
    global.ComponentDependencyGraph = DependencyTracker;
    
})(typeof window !== 'undefined' ? window : global);
