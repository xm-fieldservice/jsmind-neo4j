/**
 * 错误处理管道 - 临时占位文件
 * 防止404中断页面初始化
 */

;(function(global) {
    'use strict';
    
    // 简化的错误处理管道，避免404中断
    class ErrorProcessingPipeline {
        constructor() {
            this.handlers = [];
            console.log('[ErrorProcessingPipeline] 临时错误处理管道已加载');
        }
        
        addHandler(handler) {
            this.handlers.push(handler);
        }
        
        process(error) {
            console.error('[ErrorProcessingPipeline] 处理错误:', error);
            this.handlers.forEach(handler => {
                try {
                    handler(error);
                } catch (e) {
                    console.error('[ErrorProcessingPipeline] 处理器错误:', e);
                }
            });
        }
    }
    
    // 全局导出
    global.ErrorProcessingPipeline = new ErrorProcessingPipeline();
    
})(typeof window !== 'undefined' ? window : global);
