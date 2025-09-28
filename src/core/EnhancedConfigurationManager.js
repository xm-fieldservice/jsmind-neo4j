/**
 * 增强配置管理器 - 临时占位文件
 * 防止404中断页面初始化
 */

;(function(global) {
    'use strict';
    
    // 简化的配置管理器，避免404中断
    class EnhancedConfigurationManager {
        constructor() {
            this.config = {
                version: '1.0.0',
                initialized: true
            };
            console.log('[EnhancedConfigurationManager] 临时配置管理器已加载');
        }
        
        getConfig(key) {
            return this.config[key];
        }
        
        setConfig(key, value) {
            this.config[key] = value;
        }
    }
    
    // 全局导出
    global.EnhancedConfigurationManager = new EnhancedConfigurationManager();
    
})(typeof window !== 'undefined' ? window : global);
