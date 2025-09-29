/**
 * 错误处理管道 - 基于ErrorHandler+UnifiedLogger的轻量实现
 */

;(function(global) {
    'use strict';
    
    const ErrorProcessor = {
        async processError(error, context) {
            global.UnifiedLogger.error(error.message, { error, context });
            return await global.ErrorHandler.handle(error, context);
        }
    };
    
    global.ErrorProcessingPipeline = ErrorProcessor;
    
})(typeof window !== 'undefined' ? window : global);
