/**
 * 统一错误处理器 - 提供统一的错误处理和恢复机制
 * 包含错误日志、用户友好提示、自动恢复等功能
 */

;(function(global) {
    'use strict';
    
    class ErrorHandler {
        constructor() {
            this.errorLog = [];
            this.maxLogSize = 1000;
            this.eventBus = null;
            this.storage = null;
            this.recoveryStrategies = new Map();
            this.errorCounts = new Map();
            this.lastErrorTime = new Map();
            
            // 初始化全局错误监听
            this._setupGlobalErrorHandling();
            
            // 注册默认恢复策略
            this._registerDefaultRecoveryStrategies();
        }
        
        /**
         * 处理错误的主要方法
         * @param {Error|string} error - 错误对象或错误消息
         * @param {Object} context - 错误上下文信息
         * @param {Object} options - 处理选项
         */
        handle(error, context = {}, options = {}) {
            const errorInfo = this._normalizeError(error, context);
            
            // 记录错误
            this._logError(errorInfo);
            
            // 检查是否需要限流（防止错误风暴）
            if (this._shouldThrottle(errorInfo)) {
                console.warn('[ErrorHandler] 错误被限流，跳过处理');
                return;
            }
            
            // 显示用户友好的错误信息
            if (!options.silent) {
                this._showUserFriendlyError(errorInfo, options);
            }
            
            // 发送错误事件
            this._emitErrorEvent(errorInfo);
            
            // 尝试自动恢复
            if (options.autoRecover !== false) {
                this._attemptRecovery(errorInfo);
            }
            
            // 持久化错误日志
            this._persistErrorLog();
        }
        
        /**
         * 注册错误恢复策略
         * @param {string} errorType - 错误类型
         * @param {Function} strategy - 恢复策略函数
         */
        registerRecoveryStrategy(errorType, strategy) {
            this.recoveryStrategies.set(errorType, strategy);
            console.log(`[ErrorHandler] 已注册恢复策略: ${errorType}`);
        }
        
        /**
         * 获取错误日志
         * @param {Object} filters - 过滤条件
         * @returns {Array} 错误日志数组
         */
        getErrorLog(filters = {}) {
            let logs = this.errorLog.slice();
            
            if (filters.level) {
                logs = logs.filter(log => log.level === filters.level);
            }
            
            if (filters.type) {
                logs = logs.filter(log => log.type === filters.type);
            }
            
            if (filters.since) {
                const since = new Date(filters.since);
                logs = logs.filter(log => new Date(log.timestamp) >= since);
            }
            
            if (filters.limit) {
                logs = logs.slice(-filters.limit);
            }
            
            return logs;
        }
        
        /**
         * 清理错误日志
         * @param {Object} options - 清理选项
         */
        clearErrorLog(options = {}) {
            if (options.olderThan) {
                const cutoff = new Date(Date.now() - options.olderThan);
                this.errorLog = this.errorLog.filter(log => new Date(log.timestamp) >= cutoff);
            } else {
                this.errorLog = [];
            }
            
            this._persistErrorLog();
            console.log('[ErrorHandler] 错误日志已清理');
        }
        
        /**
         * 获取错误统计信息
         * @returns {Object} 统计信息
         */
        getErrorStats() {
            const stats = {
                total: this.errorLog.length,
                byLevel: {},
                byType: {},
                recent: 0,
                topErrors: []
            };
            
            const recentCutoff = Date.now() - 24 * 60 * 60 * 1000; // 24小时
            
            this.errorLog.forEach(log => {
                // 按级别统计
                stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
                
                // 按类型统计
                stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
                
                // 最近错误统计
                if (new Date(log.timestamp).getTime() > recentCutoff) {
                    stats.recent++;
                }
            });
            
            // 最常见错误
            stats.topErrors = Object.entries(stats.byType)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([type, count]) => ({ type, count }));
            
            return stats;
        }
        
        /**
         * 设置依赖
         * @param {Object} dependencies - 依赖对象
         */
        setDependencies(dependencies) {
            if (dependencies.eventBus) {
                this.eventBus = dependencies.eventBus;
            }
            if (dependencies.storage) {
                this.storage = dependencies.storage;
            }
        }
        
        // 私有方法
        
        _normalizeError(error, context) {
            const timestamp = new Date().toISOString();
            const id = `error_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            
            let errorInfo = {
                id,
                timestamp,
                level: 'error',
                type: 'unknown',
                message: '未知错误',
                stack: null,
                context: { ...context },
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
                url: typeof location !== 'undefined' ? location.href : ''
            };
            
            if (error instanceof Error) {
                errorInfo.message = error.message;
                errorInfo.stack = error.stack;
                errorInfo.type = error.name || 'Error';
                
                // 特殊错误类型识别
                if (error.message.includes('localStorage')) {
                    errorInfo.type = 'StorageError';
                } else if (error.message.includes('fetch') || error.message.includes('network')) {
                    errorInfo.type = 'NetworkError';
                } else if (error.message.includes('permission')) {
                    errorInfo.type = 'PermissionError';
                }
            } else if (typeof error === 'string') {
                errorInfo.message = error;
                errorInfo.type = 'StringError';
            } else if (typeof error === 'object' && error !== null) {
                errorInfo = { ...errorInfo, ...error };
            }
            
            // 从上下文推断错误级别
            if (context.level) {
                errorInfo.level = context.level;
            } else if (errorInfo.type === 'NetworkError') {
                errorInfo.level = 'warning';
            } else if (errorInfo.type === 'StorageError') {
                errorInfo.level = 'error';
            }
            
            return errorInfo;
        }
        
        _logError(errorInfo) {
            this.errorLog.push(errorInfo);
            
            // 限制日志大小
            if (this.errorLog.length > this.maxLogSize) {
                this.errorLog = this.errorLog.slice(-this.maxLogSize);
            }
            
            // 控制台输出
            const logMethod = errorInfo.level === 'warning' ? 'warn' : 'error';
            console[logMethod](`[ErrorHandler] ${errorInfo.type}: ${errorInfo.message}`, {
                context: errorInfo.context,
                stack: errorInfo.stack
            });
        }
        
        _shouldThrottle(errorInfo) {
            const key = `${errorInfo.type}:${errorInfo.message}`;
            const now = Date.now();
            const lastTime = this.lastErrorTime.get(key) || 0;
            const count = this.errorCounts.get(key) || 0;
            
            // 如果同样的错误在5秒内出现超过5次，则限流
            if (now - lastTime < 5000 && count >= 5) {
                return true;
            }
            
            // 更新计数和时间
            if (now - lastTime > 5000) {
                this.errorCounts.set(key, 1);
            } else {
                this.errorCounts.set(key, count + 1);
            }
            this.lastErrorTime.set(key, now);
            
            return false;
        }
        
        _showUserFriendlyError(errorInfo, options) {
            const userMessage = this._getUserFriendlyMessage(errorInfo);
            
            // 尝试使用应用的Toast系统
            if (global.mindmapController && typeof global.mindmapController.showToast === 'function') {
                const toastType = errorInfo.level === 'warning' ? 'warning' : 'error';
                global.mindmapController.showToast(userMessage, toastType);
            } else if (options.showAlert !== false) {
                // 回退到浏览器alert
                alert(`错误: ${userMessage}`);
            }
        }
        
        _getUserFriendlyMessage(errorInfo) {
            const messageMap = {
                'StorageError': '数据存储出现问题，请检查浏览器存储空间',
                'NetworkError': '网络连接出现问题，请检查网络设置',
                'PermissionError': '权限不足，请检查浏览器权限设置',
                'TypeError': '数据类型错误，请刷新页面重试',
                'ReferenceError': '系统组件加载失败，请刷新页面',
                'SyntaxError': '数据格式错误，请检查输入内容'
            };
            
            const friendlyMessage = messageMap[errorInfo.type];
            if (friendlyMessage) {
                return friendlyMessage;
            }
            
            // 根据错误消息生成友好提示
            const message = errorInfo.message.toLowerCase();
            if (message.includes('quota') || message.includes('storage')) {
                return '存储空间不足，请清理浏览器数据或联系管理员';
            } else if (message.includes('timeout')) {
                return '操作超时，请重试';
            } else if (message.includes('not found')) {
                return '请求的资源不存在';
            } else {
                return '系统出现异常，请刷新页面重试';
            }
        }
        
        _emitErrorEvent(errorInfo) {
            try {
                if (this.eventBus && typeof this.eventBus.emit === 'function') {
                    this.eventBus.emit('error:occurred', errorInfo);
                } else if (global.AutogenEventBus && typeof global.AutogenEventBus.emit === 'function') {
                    global.AutogenEventBus.emit('error:occurred', errorInfo);
                }
            } catch (error) {
                console.warn('[ErrorHandler] 发送错误事件失败:', error);
            }
        }
        
        _attemptRecovery(errorInfo) {
            const strategy = this.recoveryStrategies.get(errorInfo.type);
            if (strategy && typeof strategy === 'function') {
                try {
                    console.log(`[ErrorHandler] 尝试恢复策略: ${errorInfo.type}`);
                    strategy(errorInfo);
                } catch (recoveryError) {
                    console.error('[ErrorHandler] 恢复策略执行失败:', recoveryError);
                }
            }
        }
        
        _persistErrorLog() {
            try {
                if (this.storage && typeof this.storage.store === 'function') {
                    // 只保存最近的100条错误日志
                    const recentLogs = this.errorLog.slice(-100);
                    this.storage.store('system', 'error_log', recentLogs).catch(() => {});
                }
            } catch (error) {
                console.warn('[ErrorHandler] 持久化错误日志失败:', error);
            }
        }
        
        _setupGlobalErrorHandling() {
            // 捕获未处理的JavaScript错误
            if (typeof window !== 'undefined') {
                window.addEventListener('error', (event) => {
                    this.handle(event.error || event.message, {
                        type: 'GlobalError',
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno
                    }, { silent: true });
                });
                
                // 捕获未处理的Promise拒绝
                window.addEventListener('unhandledrejection', (event) => {
                    this.handle(event.reason, {
                        type: 'UnhandledPromiseRejection'
                    }, { silent: true });
                });
            }
        }
        
        _registerDefaultRecoveryStrategies() {
            // 存储错误恢复策略
            this.registerRecoveryStrategy('StorageError', (errorInfo) => {
                console.log('[ErrorHandler] 尝试清理存储空间');
                try {
                    // 清理过期数据
                    if (global.AutogenUnifiedStorage && typeof global.AutogenUnifiedStorage.cleanup === 'function') {
                        global.AutogenUnifiedStorage.cleanup();
                    }
                } catch (error) {
                    console.warn('[ErrorHandler] 存储清理失败:', error);
                }
            });
            
            // 网络错误恢复策略
            this.registerRecoveryStrategy('NetworkError', (errorInfo) => {
                console.log('[ErrorHandler] 网络错误，稍后重试');
                // 可以在这里实现重试逻辑
            });
            
            // 权限错误恢复策略
            this.registerRecoveryStrategy('PermissionError', (errorInfo) => {
                console.log('[ErrorHandler] 权限错误，尝试降级处理');
                // 可以在这里实现降级处理逻辑
            });
        }
    }
    
    // 创建全局实例
    global.ErrorHandler = global.ErrorHandler || new ErrorHandler();
    
    // 便捷方法
    global.handleError = function(error, context, options) {
        global.ErrorHandler.handle(error, context, options);
    };
    
    console.log('[ErrorHandler] 统一错误处理器已初始化');
    
})(window || this);
