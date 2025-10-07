/**
 * 程序员 - P2.2 统一日志系统
 * 
 * 基于现有ErrorHandler扩展，解决审核员指出的"错误处理机制碎片化"问题
 * 统一全系统的日志记录、错误分级和处理策略
 */

;(function(global) {
    'use strict';

    /**
     * 日志级别定义
     */
    const LOG_LEVELS = {
        FATAL: { value: 0, name: 'FATAL', color: '#FF0000', prefix: '💀' },
        ERROR: { value: 1, name: 'ERROR', color: '#FF4444', prefix: '❌' },
        WARN:  { value: 2, name: 'WARN',  color: '#FFA500', prefix: '⚠️' },
        INFO:  { value: 3, name: 'INFO',  color: '#0066CC', prefix: 'ℹ️' },
        DEBUG: { value: 4, name: 'DEBUG', color: '#666666', prefix: '🔍' },
        TRACE: { value: 5, name: 'TRACE', color: '#999999', prefix: '📍' }
    };

    /**
     * 日志分类定义
     */
    const LOG_CATEGORIES = {
        SYSTEM: 'system',           // 系统级日志
        BUSINESS: 'business',       // 业务逻辑日志
        UI: 'ui',                   // 用户界面日志
        DATA: 'data',               // 数据操作日志
        NETWORK: 'network',         // 网络请求日志
        PERFORMANCE: 'performance', // 性能监控日志
        SECURITY: 'security',       // 安全相关日志
        TEST: 'test'                // 测试日志
    };

    /**
     * 环形缓冲区（FIFO）- 从EnhancedUnifiedLogger移植
     */
    class CircularBuffer {
        constructor(maxSize = 1000) {
            this.maxSize = maxSize;
            this.buffer = [];
            this.head = 0;
        }

        add(item) {
            if (this.buffer.length < this.maxSize) {
                this.buffer.push(item);
            } else {
                this.buffer[this.head] = item;
                this.head = (this.head + 1) % this.maxSize;
            }
        }

        getAll() {
            if (this.buffer.length < this.maxSize) {
                return [...this.buffer];
            }
            return [
                ...this.buffer.slice(this.head),
                ...this.buffer.slice(0, this.head)
            ];
        }

        clear() {
            this.buffer = [];
            this.head = 0;
        }

        get size() {
            return this.buffer.length;
        }
    }

    /**
     * 统一日志器（整合版）
     */
    class UnifiedLogger {
        constructor() {
            this.currentLevel = LOG_LEVELS.INFO;
            this.enabledCategories = new Set(Object.values(LOG_CATEGORIES));
            
            // 🆕 使用环形缓冲区替代数组
            this.logBuffer = new CircularBuffer(2000);
            this.errorHandler = null;
            this.eventBus = null;
            
            // 🆕 页面标识
            this.pageId = this._detectPageId();
            this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // 🆕 重复日志检测
            this.lastLog = null;
            this.repeatCount = 0;
            this.maxRepeats = 3;
            
            // 🆕 日志合并管理
            this.recentLogs = new Map();
            this.mergeWindow = 5000; // 5秒合并窗口
            
            // 🆕 持久化配置
            this.storage = null;
            this.persistEnabled = true;
            this.persistBatchSize = 10;
            this.persistQueue = [];
            
            // 🆕 本地文件导出配置
            this.autoExportEnabled = false;
            this.autoExportInterval = 5 * 60 * 1000; // 5分钟自动导出
            this.lastExportTime = Date.now();
            
            // 统计信息
            this.stats = {
                total: 0,
                byLevel: {},
                byCategory: {},
                errors: 0,
                warnings: 0,
                dropped: 0,
                merged: 0,
                persisted: 0
            };
            
            // 初始化统计
            Object.values(LOG_LEVELS).forEach(level => {
                this.stats.byLevel[level.name] = 0;
            });
            Object.values(LOG_CATEGORIES).forEach(category => {
                this.stats.byCategory[category] = 0;
            });
            
            // 🆕 初始化存储适配器
            this._initializeStorage();
            
            // 自动清理定时器
            this._setupAutoCleanup();
            
            console.log(`[UnifiedLogger] ✅ 统一日志系统已初始化（整合版） - 页面: ${this.pageId}`);
        }

        /**
         * 设置日志级别
         */
        setLevel(level) {
            if (typeof level === 'string') {
                const levelObj = Object.values(LOG_LEVELS).find(l => l.name === level.toUpperCase());
                if (levelObj) {
                    this.currentLevel = levelObj;
                    console.log(`[UnifiedLogger] 日志级别设置为: ${level.toUpperCase()}`);
                }
            } else if (level && typeof level.value === 'number') {
                this.currentLevel = level;
            }
        }

        /**
         * 启用/禁用日志分类
         */
        enableCategory(category, enabled = true) {
            if (enabled) {
                this.enabledCategories.add(category);
            } else {
                this.enabledCategories.delete(category);
            }
        }

        /**
         * 核心日志方法（增强版）
         */
        log(level, category, message, data = null, context = {}) {
            // 检查日志级别
            if (level.value > this.currentLevel.value) {
                return;
            }

            // 检查分类是否启用
            if (!this.enabledCategories.has(category)) {
                return;
            }

            // 🆕 重复检测
            const logKey = `${level.name}:${category}:${message}`;
            if (this._isDuplicate(logKey)) {
                this.stats.dropped++;
                return;
            }

            // 🆕 日志合并
            if (this._shouldMerge(category, message)) {
                this._mergeLog(level, category, message, data, context);
                return;
            }

            const logEntry = this._createLogEntry(level, category, message, data, context);
            
            // 添加到缓冲区
            this._addToBuffer(logEntry);
            
            // 输出到控制台
            this._outputToConsole(logEntry);
            
            // 触发事件
            this._emitLogEvent(logEntry);
            
            // 更新统计
            this._updateStats(level, category);
            
            // 🆕 持久化重要日志
            if (this.persistEnabled && level.value <= LOG_LEVELS.WARN.value) {
                this._queueForPersistence(logEntry);
            }
            
            // 特殊处理错误级别
            if (level.value <= LOG_LEVELS.ERROR.value) {
                this._handleErrorLevel(logEntry);
            }
        }

        /**
         * 便捷方法
         */
        fatal(category, message, data, context) {
            this.log(LOG_LEVELS.FATAL, category, message, data, context);
        }

        error(category, message, data, context) {
            this.log(LOG_LEVELS.ERROR, category, message, data, context);
        }

        warn(category, message, data, context) {
            this.log(LOG_LEVELS.WARN, category, message, data, context);
        }

        info(category, message, data, context) {
            this.log(LOG_LEVELS.INFO, category, message, data, context);
        }

        debug(category, message, data, context) {
            this.log(LOG_LEVELS.DEBUG, category, message, data, context);
        }

        trace(category, message, data, context) {
            this.log(LOG_LEVELS.TRACE, category, message, data, context);
        }

        /**
         * 创建日志条目
         */
        _createLogEntry(level, category, message, data, context) {
            return {
                id: this._generateId(),
                timestamp: new Date().toISOString(),
                level: level.name,
                category: category,
                message: message,
                data: data,
                pageId: this.pageId,        // 🆕 页面标识
                sessionId: this.sessionId,  // 🆕 会话标识
                context: {
                    url: window.location?.href,
                    userAgent: navigator?.userAgent,
                    stack: new Error().stack,
                    ...context
                },
                formatted: this._formatMessage(level, category, message)
            };
        }

        /**
         * 格式化消息
         */
        _formatMessage(level, category, message) {
            const timestamp = new Date().toLocaleTimeString();
            return `${level.prefix} [${timestamp}] [${category.toUpperCase()}] ${message}`;
        }

        /**
         * 输出到控制台
         */
        _outputToConsole(logEntry) {
            const style = `color: ${LOG_LEVELS[logEntry.level].color}; font-weight: bold;`;
            
            switch (logEntry.level) {
                case 'FATAL':
                case 'ERROR':
                    console.error(`%c${logEntry.formatted}`, style, logEntry.data || '');
                    break;
                case 'WARN':
                    console.warn(`%c${logEntry.formatted}`, style, logEntry.data || '');
                    break;
                case 'INFO':
                    console.info(`%c${logEntry.formatted}`, style, logEntry.data || '');
                    break;
                case 'DEBUG':
                case 'TRACE':
                    console.log(`%c${logEntry.formatted}`, style, logEntry.data || '');
                    break;
            }
        }

        /**
         * 添加到缓冲区（使用环形缓冲）
         */
        _addToBuffer(logEntry) {
            this.logBuffer.add(logEntry);
        }

        /**
         * 触发日志事件
         */
        _emitLogEvent(logEntry) {
            if (this.eventBus && typeof this.eventBus.emit === 'function') {
                this.eventBus.emit('system:logging:entry', {
                    entry: logEntry,
                    stats: this.getStats()
                });
            }
        }

        /**
         * 更新统计信息
         */
        _updateStats(level, category) {
            this.stats.total++;
            this.stats.byLevel[level.name]++;
            this.stats.byCategory[category]++;
            
            if (level.value <= LOG_LEVELS.ERROR.value) {
                this.stats.errors++;
            } else if (level.value === LOG_LEVELS.WARN.value) {
                this.stats.warnings++;
            }
        }

        /**
         * 处理错误级别日志
         */
        _handleErrorLevel(logEntry) {
            // 集成现有ErrorHandler
            if (this.errorHandler && typeof this.errorHandler.handle === 'function') {
                const error = new Error(logEntry.message);
                error.logEntry = logEntry;
                this.errorHandler.handle(error, logEntry.context, { 
                    category: logEntry.category,
                    level: logEntry.level 
                });
            }
        }

        /**
         * 🆕 检测页面标识
         */
        _detectPageId() {
            if (typeof window === 'undefined') return 'server';
            
            const path = window.location.pathname;
            const filename = path.split('/').pop() || 'index.html';
            
            // 识别特定页面
            if (filename.includes('mindmap')) return 'mindmap';
            if (filename.includes('index')) return 'main';
            if (filename.includes('test')) return 'test';
            
            return filename.replace('.html', '') || 'unknown';
        }

        /**
         * 🆕 初始化存储适配器
         */
        _initializeStorage() {
            if (typeof window !== 'undefined' && window.AutogenUnifiedStorage) {
                this.storage = window.AutogenUnifiedStorage;
                console.log('[UnifiedLogger] 存储适配器已连接');
            }
        }

        /**
         * 🆕 重复日志检测
         */
        _isDuplicate(logKey) {
            if (this.lastLog === logKey) {
                this.repeatCount++;
                if (this.repeatCount === this.maxRepeats) {
                    console.log(`[UnifiedLogger] 日志重复${this.maxRepeats}次，后续将被抑制`);
                }
                return this.repeatCount > this.maxRepeats;
            }
            this.lastLog = logKey;
            this.repeatCount = 0;
            return false;
        }

        /**
         * 🆕 判断是否应该合并日志
         */
        _shouldMerge(category, message) {
            // 合并脑图节点选择相关的日志
            if (category === 'ui' && message.includes('节点选择')) {
                return true;
            }
            // 合并存储操作日志
            if (category === 'data' && message.includes('保存')) {
                return true;
            }
            return false;
        }

        /**
         * 🆕 合并日志
         */
        _mergeLog(level, category, message, data, context) {
            const key = `${category}:${message}`;
            const now = Date.now();

            if (!this.recentLogs.has(key)) {
                // 首次出现，正常输出
                this.recentLogs.set(key, { count: 1, lastTime: now });
                const logEntry = this._createLogEntry(level, category, message, data, context);
                this._addToBuffer(logEntry);
                this._outputToConsole(logEntry);
                this.stats.total++;
                this.stats.byLevel[level.name]++;
                this.stats.byCategory[category]++;
            } else {
                // 已存在，增加计数
                const log = this.recentLogs.get(key);
                log.count++;
                log.lastTime = now;
                this.stats.merged++;

                // 每10次合并输出一次
                if (log.count % 10 === 0) {
                    const logEntry = this._createLogEntry(
                        level, 
                        category, 
                        `${message} (已合并${log.count}次)`,
                        data,
                        context
                    );
                    this._outputToConsole(logEntry);
                }
            }
        }

        /**
         * 🆕 队列持久化
         */
        _queueForPersistence(entry) {
            this.persistQueue.push(entry);

            // 达到批量大小时持久化
            if (this.persistQueue.length >= this.persistBatchSize) {
                this._persistBatch();
            }
        }

        /**
         * 🆕 批量持久化
         */
        async _persistBatch() {
            if (this.persistQueue.length === 0 || !this.storage) {
                return;
            }

            const batch = [...this.persistQueue];
            this.persistQueue = [];

            try {
                const key = `logs_${Date.now()}`;
                await this.storage.store('logs', key, batch, { 
                    ttl: 7 * 24 * 60 * 60 * 1000  // 7天TTL
                });
                this.stats.persisted += batch.length;
            } catch (error) {
                console.error('[UnifiedLogger] 日志持久化失败:', error);
            }
        }

        /**
         * 设置自动清理
         */
        _setupAutoCleanup() {
            setInterval(() => {
                const now = Date.now();
                
                // 清理过期的合并日志
                for (const [key, log] of this.recentLogs.entries()) {
                    if (now - log.lastTime > this.mergeWindow) {
                        this.recentLogs.delete(key);
                    }
                }

                // 持久化剩余日志
                if (this.persistQueue.length > 0) {
                    this._persistBatch();
                }
            }, 60 * 1000); // 每分钟清理一次
        }

        /**
         * 生成唯一ID
         */
        _generateId() {
            return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * 获取统计信息
         */
        getStats() {
            return {
                ...this.stats,
                bufferSize: this.logBuffer.size,
                currentLevel: this.currentLevel.name,
                enabledCategories: Array.from(this.enabledCategories),
                mergedCount: this.recentLogs.size
            };
        }

        /**
         * 获取日志历史
         */
        getHistory(filters = {}) {
            let filtered = this.logBuffer.getAll();

            if (filters.level) {
                filtered = filtered.filter(entry => entry.level === filters.level);
            }

            if (filters.category) {
                filtered = filtered.filter(entry => entry.category === filters.category);
            }

            if (filters.since) {
                const since = new Date(filters.since);
                filtered = filtered.filter(entry => new Date(entry.timestamp) >= since);
            }

            if (filters.search) {
                const search = filters.search.toLowerCase();
                filtered = filtered.filter(entry => 
                    entry.message.toLowerCase().includes(search) ||
                    (entry.data && JSON.stringify(entry.data).toLowerCase().includes(search))
                );
            }

            return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        /**
         * 清空日志缓冲区
         */
        clear() {
            this.logBuffer.clear();
            this.recentLogs.clear();
            this.persistQueue = [];
            this.stats = {
                total: 0,
                byLevel: {},
                byCategory: {},
                errors: 0,
                warnings: 0
            };
            
            // 重新初始化统计
            Object.values(LOG_LEVELS).forEach(level => {
                this.stats.byLevel[level.name] = 0;
            });
            Object.values(LOG_CATEGORIES).forEach(category => {
                this.stats.byCategory[category] = 0;
            });
            
            console.log('[UnifiedLogger] 日志缓冲区已清空');
        }

        /**
         * 导出日志
         */
        export(format = 'json') {
            const data = {
                exportTime: new Date().toISOString(),
                pageId: this.pageId,
                sessionId: this.sessionId,
                stats: this.getStats(),
                logs: this.logBuffer.getAll()
            };

            if (format === 'json') {
                return JSON.stringify(data, null, 2);
            } else if (format === 'csv') {
                return this._exportToCsv(data.logs);
            }

            return data;
        }

        /**
         * 🆕 导出到本地文件
         */
        async exportToFile(format = 'json') {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `logs_${this.pageId}_${timestamp}.${format}`;
            
            const content = this.export(format);
            const blob = new Blob([content], { 
                type: format === 'json' ? 'application/json' : 'text/csv' 
            });
            
            // 使用File System Access API（如果支持）
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: format === 'json' ? 'JSON日志文件' : 'CSV日志文件',
                            accept: {
                                [format === 'json' ? 'application/json' : 'text/csv']: [`.${format}`]
                            }
                        }]
                    });
                    
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    
                    console.log(`[UnifiedLogger] ✅ 日志已导出到文件: ${filename}`);
                    return { success: true, filename };
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('[UnifiedLogger] 文件导出失败:', error);
                    }
                    return { success: false, error };
                }
            } else {
                // 降级：使用下载链接
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                
                console.log(`[UnifiedLogger] ✅ 日志已下载: ${filename}`);
                return { success: true, filename };
            }
        }

        /**
         * 🆕 启用自动导出
         */
        enableAutoExport(interval = 5 * 60 * 1000) {
            this.autoExportEnabled = true;
            this.autoExportInterval = interval;
            
            setInterval(() => {
                if (this.autoExportEnabled && this.logBuffer.size > 0) {
                    const timeSinceLastExport = Date.now() - this.lastExportTime;
                    if (timeSinceLastExport >= this.autoExportInterval) {
                        this.exportToFile('json').then(() => {
                            this.lastExportTime = Date.now();
                        });
                    }
                }
            }, 60 * 1000); // 每分钟检查一次
            
            console.log(`[UnifiedLogger] 自动导出已启用，间隔: ${interval/1000}秒`);
        }

        /**
         * 🆕 禁用自动导出
         */
        disableAutoExport() {
            this.autoExportEnabled = false;
            console.log('[UnifiedLogger] 自动导出已禁用');
        }

        /**
         * 导出为CSV格式
         */
        _exportToCsv(logs) {
            const headers = ['timestamp', 'level', 'category', 'message', 'data'];
            const rows = logs.map(log => [
                log.timestamp,
                log.level,
                log.category,
                log.message,
                log.data ? JSON.stringify(log.data) : ''
            ]);

            return [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');
        }
    }

    /**
     * 日志迁移工具 - 替换现有的console调用
     */
    class LoggerMigrationTool {
        constructor(logger) {
            this.logger = logger;
            this.originalConsole = {
                log: console.log,
                info: console.info,
                warn: console.warn,
                error: console.error,
                debug: console.debug
            };
        }

        /**
         * 启用控制台拦截
         */
        enableConsoleInterception() {
            console.log = (...args) => {
                this.logger.info(LOG_CATEGORIES.SYSTEM, this._formatArgs(args));
                this.originalConsole.log(...args);
            };

            console.info = (...args) => {
                this.logger.info(LOG_CATEGORIES.SYSTEM, this._formatArgs(args));
                this.originalConsole.info(...args);
            };

            console.warn = (...args) => {
                this.logger.warn(LOG_CATEGORIES.SYSTEM, this._formatArgs(args));
                this.originalConsole.warn(...args);
            };

            console.error = (...args) => {
                this.logger.error(LOG_CATEGORIES.SYSTEM, this._formatArgs(args));
                this.originalConsole.error(...args);
            };

            console.debug = (...args) => {
                this.logger.debug(LOG_CATEGORIES.SYSTEM, this._formatArgs(args));
                this.originalConsole.debug(...args);
            };

            console.log('[LoggerMigrationTool] ✅ 控制台拦截已启用');
        }

        /**
         * 禁用控制台拦截
         */
        disableConsoleInterception() {
            Object.assign(console, this.originalConsole);
            console.log('[LoggerMigrationTool] 控制台拦截已禁用');
        }

        /**
         * 格式化参数
         */
        _formatArgs(args) {
            return args.map(arg => {
                if (typeof arg === 'object') {
                    return JSON.stringify(arg);
                }
                return String(arg);
            }).join(' ');
        }
    }

    // 创建全局单例
    const globalLogger = new UnifiedLogger();
    const migrationTool = new LoggerMigrationTool(globalLogger);

    // 全局导出
    global.UnifiedLogger = globalLogger;
    global.LoggerMigrationTool = migrationTool;
    global.LOG_LEVELS = LOG_LEVELS;
    global.LOG_CATEGORIES = LOG_CATEGORIES;

    // 兼容性导出
    global.Logger = globalLogger;

    console.log('[UnifiedLogger] ✅ 统一日志系统已加载');

})(typeof window !== 'undefined' ? window : global);
