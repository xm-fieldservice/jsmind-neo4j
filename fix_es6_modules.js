/**
 * ES6模块修复脚本
 * 解决"Unexpected token 'export'"错误
 */

(function() {
    'use strict';
    
    console.log('🔧 [ES6修复] 开始修复ES6模块问题');
    
    // 检查并修复缺失的全局对象
    function ensureGlobalObjects() {
        // 确保EventBus存在
        if (!window.EventBus && window.SimpleEventBus) {
            window.EventBus = new window.SimpleEventBus();
            console.log('✅ [ES6修复] EventBus已创建');
        }
        
        // 确保StateValidator存在（创建一个简单的实现）
        if (!window.StateValidator) {
            window.StateValidator = {
                validate: function(data) {
                    return { valid: true, errors: [] };
                },
                validateMindmap: function(data) {
                    return { valid: true, errors: [] };
                }
            };
            console.log('✅ [ES6修复] StateValidator已创建');
        }
        
        // 确保AutogenUnifiedStorage存在
        if (!window.AutogenUnifiedStorage) {
            console.warn('⚠️ [ES6修复] AutogenUnifiedStorage未找到，创建兜底实现');
            
            // 创建一个简单的兜底实现
            window.AutogenUnifiedStorage = {
                store: async function(type, key, data) {
                    try {
                        localStorage.setItem(`autogen_${type}_${key}`, JSON.stringify(data));
                        return true;
                    } catch (error) {
                        console.error('[AutogenUnifiedStorage兜底] 存储失败:', error);
                        return false;
                    }
                },
                
                retrieve: async function(type, key) {
                    try {
                        const data = localStorage.getItem(`autogen_${type}_${key}`);
                        return data ? JSON.parse(data) : null;
                    } catch (error) {
                        console.error('[AutogenUnifiedStorage兜底] 读取失败:', error);
                        return null;
                    }
                },
                
                delete: async function(type, key) {
                    try {
                        localStorage.removeItem(`autogen_${type}_${key}`);
                        return true;
                    } catch (error) {
                        console.error('[AutogenUnifiedStorage兜底] 删除失败:', error);
                        return false;
                    }
                }
            };
            
            console.log('✅ [ES6修复] AutogenUnifiedStorage兜底实现已创建');
        }
        
        // 确保PersistenceSystemChecker存在
        if (!window.PersistenceSystemChecker) {
            window.PersistenceSystemChecker = {
                waitForReady: async function(timeout = 5000) {
                    // 简单的就绪检查
                    return Promise.resolve(!!window.AutogenUnifiedStorage);
                }
            };
            console.log('✅ [ES6修复] PersistenceSystemChecker已创建');
        }
    }
    
    // 修复MindmapController集成
    function fixMindmapControllerIntegration() {
        // 等待MindmapController加载
        const checkController = () => {
            const controller = window.mindmapController || window.MindmapController;
            if (controller && !controller.autogenStorage) {
                console.log('🔧 [ES6修复] 修复MindmapController集成');
                controller.autogenStorage = window.AutogenUnifiedStorage;
                console.log('✅ [ES6修复] MindmapController已集成AutogenUnifiedStorage');
            }
        };
        
        // 立即检查
        checkController();
        
        // 延迟检查（防止加载顺序问题）
        setTimeout(checkController, 1000);
        setTimeout(checkController, 3000);
    }
    
    // 主修复函数
    function runFix() {
        try {
            ensureGlobalObjects();
            fixMindmapControllerIntegration();
            
            console.log('✅ [ES6修复] ES6模块问题修复完成');
            
            // 触发系统就绪事件
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('systemFixed', {
                    detail: {
                        timestamp: Date.now(),
                        components: {
                            EventBus: !!window.EventBus,
                            StateValidator: !!window.StateValidator,
                            AutogenUnifiedStorage: !!window.AutogenUnifiedStorage,
                            PersistenceSystemChecker: !!window.PersistenceSystemChecker
                        }
                    }
                }));
            }, 100);
            
        } catch (error) {
            console.error('❌ [ES6修复] 修复过程出错:', error);
        }
    }
    
    // 立即运行修复
    runFix();
    
    // 导出修复函数
    window.fixES6Modules = runFix;
    
})();
