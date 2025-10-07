/**
 * 脑图错误处理包装器
 * 统一错误处理，集成ErrorHandler恢复策略
 * 
 * @author 程序员
 * @date 2025-10-07
 * @version 1.0
 * 
 * Phase 2 - Task 2.0.3: 架构对齐 - 错误处理整合
 * 
 * 解决问题：
 * - 统一错误处理入口
 * - 集成ErrorHandler恢复策略
 * - 提供统一的错误处理接口
 */

class MindmapErrorHandler {
    constructor(errorHandler, logger) {
        this.errorHandler = errorHandler || window.ErrorHandler;
        this.logger = logger || console;
        
        // 统计信息
        this.stats = {
            totalErrors: 0,
            handledErrors: 0,
            unhandledErrors: 0
        };
    }
    
    /**
     * 处理错误
     * @param {Error} error - 错误对象
     * @param {Object} context - 上下文信息 {component, action, ...}
     * @param {Object} options - 选项 {silent, showAlert, ...}
     */
    handle(error, context = {}, options = {}) {
        this.stats.totalErrors++;
        
        try {
            // 使用ErrorHandler处理（如果可用）
            if (this.errorHandler && typeof this.errorHandler.handle === 'function') {
                this.stats.handledErrors++;
                return this.errorHandler.handle(error, context, options);
            }
            
            // 降级：使用简单错误处理
            this.stats.unhandledErrors++;
            this._fallbackHandle(error, context, options);
        } catch (handlerError) {
            // 错误处理器本身出错
            this.logger.error('[ErrorHandler] 错误处理失败:', handlerError);
            this._fallbackHandle(error, context, options);
        }
    }
    
    /**
     * 降级错误处理
     */
    _fallbackHandle(error, context, options) {
        const message = error.message || String(error);
        const component = context.component || 'Unknown';
        const action = context.action || 'Unknown';
        
        // 记录到日志
        this.logger.error(`[${component}] ${action} 失败:`, message);
        
        // 显示警告（如果不是静默模式）
        if (!options.silent && !options.showAlert === false) {
            alert(`错误: ${message}`);
        }
    }
    
    /**
     * 包装异步方法
     * @param {Function} fn - 异步函数
     * @param {Object} context - 上下文信息
     * @param {Object} options - 选项
     */
    async wrapAsync(fn, context = {}, options = {}) {
        try {
            return await fn();
        } catch (error) {
            this.handle(error, context, options);
            throw error;
        }
    }
    
    /**
     * 包装同步方法
     * @param {Function} fn - 同步函数
     * @param {Object} context - 上下文信息
     * @param {Object} options - 选项
     */
    wrapSync(fn, context = {}, options = {}) {
        try {
            return fn();
        } catch (error) {
            this.handle(error, context, options);
            throw error;
        }
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            hasErrorHandler: !!this.errorHandler,
            handledRate: this.stats.totalErrors > 0 
                ? (this.stats.handledErrors / this.stats.totalErrors * 100).toFixed(2) + '%'
                : '0%'
        };
    }
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.MindmapErrorHandler = MindmapErrorHandler;
}

// 支持模块化导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindmapErrorHandler;
}
