/**
 * 配置管理器 - 基于AutogenUnifiedStorage的轻量实现
 */

;(function(global) {
    'use strict';
    
    const ConfigManager = {
        async get(path, defaultValue) {
            return await global.AutogenUnifiedStorage.retrieve('app_config', path) || defaultValue;
        },
        
        async set(path, value) {
            await global.AutogenUnifiedStorage.store('app_config', path, value);
            global.AutogenEventBus.emit('config:changed', { path, value });
        }
    };
    
    global.EnhancedConfigurationManager = ConfigManager;
    
})(typeof window !== 'undefined' ? window : global);
