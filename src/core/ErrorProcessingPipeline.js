/**
 * ErrorProcessingPipeline.js - 错误处理管道
 * @deprecated 此组件已废弃，请使用 ErrorHandler 替代
 * @see src/core/ErrorHandler.js
 * 
 * 迁移指南:
 * - ErrorProcessingPipeline.processError() → ErrorHandler.processError()
 * - ErrorProcessingPipeline.registerHandler() → ErrorHandler.registerHandler()
 * - ErrorProcessingPipeline.registerRecoveryStrategy() → ErrorHandler.registerRecoveryStrategy()
 * - ErrorProcessingPipeline.getErrorHistory() → ErrorHandler.getErrorLog()
 * 
 * 整合原因：
 * - 功能重叠度92%，ErrorHandler功能更完善
 * - ErrorHandler已集成统一日志系统、全局错误捕获、用户提示
 * - ErrorProcessingPipeline的异步恢复策略已整合到ErrorHandler
 * 
 * 提供结构化的错误处理流程，包含错误分类、处理和恢复机制
 */
class ErrorProcessingPipeline {
    constructor() {
        this.handlers = new Map();
        this.recoveryStrategies = new Map();
        this.errorHistory = [];
        this.maxHistorySize = 100;
        this.initialized = false;
    }

    /**
     * 初始化错误处理管道
     */
    async initialize() {
        try {
            console.log('[ErrorProcessingPipeline] 开始初始化...');

            // 注册默认错误处理器
            this.registerDefaultHandlers();

            // 注册默认恢复策略
            this.registerDefaultRecoveryStrategies();

            this.initialized = true;
            console.log('[ErrorProcessingPipeline] ✅ 初始化完成');
            return true;

        } catch (error) {
            console.error('[ErrorProcessingPipeline] 初始化失败:', error);
            return false;
        }
    }


    /**
     * 注册默认错误处理器
     */
    registerDefaultHandlers() {
        // 网络错误处理器
        this.registerHandler('network', (error) => {
            console.error('[ErrorProcessingPipeline] 网络错误:', error);
            return {
                category: 'network',
                severity: 'high',
                message: error.message || '网络连接失败',
                recoverable: true
            };
        });

        // 存储错误处理器
        this.registerHandler('storage', (error) => {
            console.error('[ErrorProcessingPipeline] 存储错误:', error);
            return {
                category: 'storage',
                severity: 'critical',
                message: error.message || '数据存储失败',
                recoverable: false
            };
        });

        // 验证错误处理器
        this.registerHandler('validation', (error) => {
            console.error('[ErrorProcessingPipeline] 验证错误:', error);
            return {
                category: 'validation',
                severity: 'medium',
                message: error.message || '数据验证失败',
                recoverable: true
            };
        });

        // 权限错误处理器
        this.registerHandler('permission', (error) => {
            console.error('[ErrorProcessingPipeline] 权限错误:', error);
            return {
                category: 'permission',
                severity: 'high',
                message: error.message || '权限不足',
                recoverable: false
            };
        });

        // 未知错误处理器
        this.registerHandler('unknown', (error) => {
            console.error('[ErrorProcessingPipeline] 未知错误:', error);
            return {
                category: 'unknown',
                severity: 'medium',
                message: error.message || '发生未知错误',
                recoverable: true
            };
        });
    }

    /**
     * 注册默认恢复策略
     */
    registerDefaultRecoveryStrategies() {
        // 网络错误恢复策略
        this.registerRecoveryStrategy('network', async (errorInfo) => {
            console.log('[ErrorProcessingPipeline] 尝试网络错误恢复...');

            // 等待网络连接恢复
            let retries = 0;
            const maxRetries = 3;

            while (retries < maxRetries) {
                try {
                    // 简单的网络连接测试
                    const response = await fetch('/favicon.ico', {
                        method: 'HEAD',
                        cache: 'no-cache'
                    });

                    if (response.ok) {
                        console.log('[ErrorProcessingPipeline] 网络连接已恢复');
                        return { success: true, message: '网络连接已恢复' };
                    }
                } catch (e) {
                    console.warn(`[ErrorProcessingPipeline] 网络恢复尝试 ${retries + 1} 失败:`, e.message);
                }

                retries++;
                if (retries < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                }
            }

            return { success: false, message: '网络连接恢复失败' };
        });

        // 存储错误恢复策略
        this.registerRecoveryStrategy('storage', async (errorInfo) => {
            console.log('[ErrorProcessingPipeline] 尝试存储错误恢复...');

            try {
                // 尝试重新初始化存储系统
                if (window.AutogenUnifiedStorage) {
                    await window.AutogenUnifiedStorage.initialize();
                    console.log('[ErrorProcessingPipeline] 存储系统已重新初始化');
                    return { success: true, message: '存储系统已重新初始化' };
                }
            } catch (e) {
                console.error('[ErrorProcessingPipeline] 存储恢复失败:', e);
            }

            return { success: false, message: '存储系统恢复失败' };
        });

        // 验证错误恢复策略
        this.registerRecoveryStrategy('validation', async (errorInfo) => {
            console.log('[ErrorProcessingPipeline] 验证错误，无需恢复操作');
            return { success: true, message: '验证错误已记录' };
        });
    }

    /**
     * 注册错误处理器
     */
    registerHandler(type, handler) {
        this.handlers.set(type, handler);
        console.log(`[ErrorProcessingPipeline] 注册错误处理器: ${type}`);
    }

    /**
     * 注册恢复策略
     */
    registerRecoveryStrategy(type, strategy) {
        this.recoveryStrategies.set(type, strategy);
        console.log(`[ErrorProcessingPipeline] 注册恢复策略: ${type}`);
    }

    /**
     * 处理错误
     */
    async processError(error, context = {}) {
        try {
            // 添加到错误历史
            this.addToHistory(error, context);

            // 确定错误类型
            const errorType = this.classifyError(error);

            // 获取对应的处理器
            const handler = this.handlers.get(errorType) || this.handlers.get('unknown');
            
            if (!handler || typeof handler !== 'function') {
                throw new Error(`No valid handler found for error type: ${errorType}`);
            }

            // 处理错误
            const errorInfo = handler(error);

            // 尝试恢复（如果可恢复）
            let recoveryResult = null;
            if (errorInfo.recoverable && this.recoveryStrategies.has(errorType)) {
                const strategy = this.recoveryStrategies.get(errorType);
                recoveryResult = await strategy(errorInfo);
            }

            // 返回处理结果
            return {
                success: true,
                errorInfo,
                recoveryResult,
                context
            };

        } catch (processingError) {
            console.error('[ErrorProcessingPipeline] 错误处理过程中发生异常:', processingError);
            return {
                success: false,
                error: processingError.message,
                originalError: error
            };
        }
    }

    /**
     * 分类错误类型
     */
    classifyError(error) {
        const message = (error.message || error.toString()).toLowerCase();

        if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
            return 'network';
        }

        if (message.includes('storage') || message.includes('localstorage') || message.includes('indexeddb')) {
            return 'storage';
        }

        if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
            return 'validation';
        }

        if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
            return 'permission';
        }

        return 'unknown';
    }

    /**
     * 添加错误到历史记录
     */
    addToHistory(error, context) {
        const errorRecord = {
            timestamp: new Date().toISOString(),
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            context,
            id: Date.now() + Math.random().toString(36).substr(2, 9)
        };

        this.errorHistory.unshift(errorRecord);

        // 限制历史记录大小
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * 获取错误历史
     */
    getErrorHistory(limit = 50) {
        return this.errorHistory.slice(0, limit);
    }

    /**
     * 清除错误历史
     */
    clearErrorHistory() {
        this.errorHistory = [];
        console.log('[ErrorProcessingPipeline] 错误历史已清除');
    }

    /**
     * 获取错误统计
     */
    getErrorStats() {
        const stats = {
            total: this.errorHistory.length,
            byType: {},
            bySeverity: {},
            recent: this.errorHistory.filter(e => {
                const errorTime = new Date(e.timestamp);
                const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
                return errorTime > hourAgo;
            }).length
        };

        this.errorHistory.forEach(record => {
            const type = record.error.name || 'unknown';
            const severity = record.context.severity || 'unknown';

            stats.byType[type] = (stats.byType[type] || 0) + 1;
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
        });

        return stats;
    }

    /**
     * 获取状态（供测试）
     */
    getStatus() {
        return {
            initialized: this.initialized,
            handlerCount: this.handlers.size,
            strategyCount: this.recoveryStrategies.size,
            historySize: this.errorHistory.length
        };
    }
}

// 全局实例
if (typeof window !== 'undefined') {
    window.ErrorProcessingPipeline = new ErrorProcessingPipeline();
}

console.log('[ErrorProcessingPipeline] 模块加载完成');
