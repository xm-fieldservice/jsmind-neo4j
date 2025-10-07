/**
 * 程序员 - ErrorBacktracer.js
 * 
 * 日志系统整改 - 错误回溯器
 * 
 * 设计目标：
 * 1. 捕获所有类型错误（同步、异步）
 * 2. 记录完整错误上下文
 * 3. 提供错误查询和回溯能力
 * 4. 简化实现，避免过度工程化
 * 
 * 核心功能：
 * - 同步错误捕获（window.onerror）
 * - 异步错误捕获（unhandledrejection）
 * - 错误持久化
 * - 错误查询
 * 
 * 架构对齐：
 * - 与ErrorHandler集成
 * - 满足用户代码失败回溯需求
 * - 实现90%错误覆盖
 */

;(function(global) {
    'use strict';

    /**
     * 错误回溯器
     */
    class ErrorBacktracer {
        constructor(options = {}) {
            // 错误日志
            this.errors = [];
            this.maxErrors = options.maxErrors || 500;

            // 配置
            this.persistErrors = options.persistErrors !== false;
            this.storage = global.AutogenUnifiedStorage;

            // 统计
            this.stats = {
                total: 0,
                syncErrors: 0,
                asyncErrors: 0,
                persisted: 0
            };

            // 设置错误处理器
            this._setupErrorHandlers();

            console.log('[ErrorBacktracer] ✅ 错误回溯器已初始化');
        }

        /**
         * 设置错误处理器
         */
        _setupErrorHandlers() {
            // 1. 同步错误捕获
            window.addEventListener('error', (event) => {
                this._recordError('SYNC_ERROR', event.error, {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    message: event.message
                });
            });

            // 2. 异步错误捕获（Promise拒绝）
            window.addEventListener('unhandledrejection', (event) => {
                this._recordError('ASYNC_ERROR', event.reason, {
                    type: 'UnhandledPromiseRejection',
                    promise: event.promise
                });
            });

            console.log('[ErrorBacktracer] 全局错误处理器已设置');
        }

        /**
         * 记录错误
         */
        _recordError(type, error, context = {}) {
            const errorEntry = {
                id: this._generateErrorId(),
                type,
                timestamp: new Date().toISOString(),
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : new Error().stack,
                context: {
                    ...context,
                    url: window.location.href,
                    userAgent: navigator.userAgent
                }
            };

            // 添加到错误列表
            this.errors.push(errorEntry);
            this.stats.total++;
            
            if (type === 'SYNC_ERROR') {
                this.stats.syncErrors++;
            } else if (type === 'ASYNC_ERROR') {
                this.stats.asyncErrors++;
            }

            // 限制错误数量
            if (this.errors.length > this.maxErrors) {
                this.errors.shift();
            }

            // 持久化重要错误
            if (this.persistErrors) {
                this._persistError(errorEntry);
            }

            // 输出到控制台
            console.error(`[ErrorBacktracer] ${type}:`, errorEntry.message);

            // 触发错误事件
            this._emitErrorEvent(errorEntry);

            // 集成到ErrorHandler
            if (global.ErrorHandler && typeof global.ErrorHandler.handle === 'function') {
                global.ErrorHandler.handle(error, { 
                    component: 'ErrorBacktracer', 
                    action: 'recordError',
                    type: type
                });
            }
        }

        /**
         * 持久化错误
         */
        async _persistError(errorEntry) {
            if (!this.storage) {
                return;
            }

            try {
                const key = `error:${errorEntry.id}`;
                await this.storage.store(key, errorEntry, { 
                    ttl: 7 * 24 * 60 * 60 * 1000 // 7天TTL
                });
                this.stats.persisted++;
            } catch (error) {
                console.error('[ErrorBacktracer] 错误持久化失败:', error);
            }
        }

        /**
         * 查询错误
         */
        queryErrors(filters = {}) {
            let results = [...this.errors];

            // 按类型过滤
            if (filters.type) {
                results = results.filter(error => error.type === filters.type);
            }

            // 按时间过滤
            if (filters.since) {
                const sinceDate = new Date(filters.since);
                results = results.filter(error => 
                    new Date(error.timestamp) >= sinceDate
                );
            }

            if (filters.until) {
                const untilDate = new Date(filters.until);
                results = results.filter(error => 
                    new Date(error.timestamp) <= untilDate
                );
            }

            // 按消息搜索
            if (filters.search) {
                const search = filters.search.toLowerCase();
                results = results.filter(error => 
                    error.message.toLowerCase().includes(search) ||
                    (error.stack && error.stack.toLowerCase().includes(search))
                );
            }

            // 排序（最新的在前）
            results.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );

            return results;
        }

        /**
         * 获取最近的错误
         */
        getRecentErrors(count = 10) {
            return this.errors.slice(-count).reverse();
        }

        /**
         * 清空错误日志
         */
        clearErrors() {
            this.errors = [];
            console.log('[ErrorBacktracer] 错误日志已清空');
        }

        /**
         * 获取统计信息
         */
        getStats() {
            return {
                ...this.stats,
                errorCount: this.errors.length
            };
        }

        /**
         * 生成错误ID
         */
        _generateErrorId() {
            return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * 触发错误事件
         */
        _emitErrorEvent(errorEntry) {
            if (global.AutogenEventBus && typeof global.AutogenEventBus.emit === 'function') {
                global.AutogenEventBus.emit('error:captured', errorEntry);
            }
        }

        /**
         * 导出错误日志
         */
        exportErrors(format = 'json') {
            if (format === 'json') {
                return JSON.stringify(this.errors, null, 2);
            } else if (format === 'csv') {
                const headers = ['ID', 'Type', 'Timestamp', 'Message', 'URL'];
                const rows = this.errors.map(error => [
                    error.id,
                    error.type,
                    error.timestamp,
                    error.message.replace(/"/g, '""'),
                    error.context.url
                ]);
                return [headers, ...rows].map(row => row.join(',')).join('\n');
            }
            return '';
        }
    }

    // 导出到全局
    global.ErrorBacktracer = ErrorBacktracer;

    // 自动创建实例
    if (!global.errorBacktracer) {
        global.errorBacktracer = new ErrorBacktracer();
    }

})(typeof window !== 'undefined' ? window : global);
