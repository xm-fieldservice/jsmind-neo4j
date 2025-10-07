/**
 * 程序员 - EnhancedUnifiedLogger.js
 * 
 * 日志系统整改 - 增强型统一日志器
 * 
 * 设计目标：
 * 1. 整合现有UnifiedLogger、LogCollector、LogPanel功能
 * 2. 实现日志级别控制和重复检测
 * 3. 支持FIFO内存管理（环形缓冲区）
 * 4. 异步持久化重要日志
 * 5. 控制台拦截和日志合并
 * 
 * 核心原则：
 * - 最小可行产品（MVP）
 * - 复用现有组件
 * - 简单实用
 * - 性能优先
 * 
 * 架构对齐：
 * - 与架构功能清单中的UnifiedLogger组件对齐
 * - 满足用户四大核心需求
 * - 实现95%无死角覆盖
 */

;(function(global) {
    'use strict';

    /**
     * 日志级别定义
     */
    const LOG_LEVELS = {
        DEBUG: { value: 0, name: 'DEBUG', color: '#666666', prefix: '🔍' },
        INFO:  { value: 1, name: 'INFO',  color: '#0066CC', prefix: 'ℹ️' },
        WARN:  { value: 2, name: 'WARN',  color: '#FFA500', prefix: '⚠️' },
        ERROR: { value: 3, name: 'ERROR', color: '#FF4444', prefix: '❌' }
    };

    /**
     * 环形缓冲区（FIFO）
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
            // 重新排序，使最旧的在前
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
     * 增强型统一日志器
     */
    class EnhancedUnifiedLogger {
        constructor(options = {}) {
            // 复用现有UnifiedLogger（如果存在）
            this.baseLogger = global.UnifiedLogger;
            
            // 环形缓冲区（FIFO内存管理）
            this.buffer = new CircularBuffer(options.bufferSize || 1000);
            
            // 存储适配器
            this.storage = global.AutogenUnifiedStorage;
            
            // 日志级别控制
            this.currentLevel = LOG_LEVELS[options.level || 'INFO'];
            
            // 重复日志检测
            this.lastLog = null;
            this.repeatCount = 0;
            this.maxRepeats = options.maxRepeats || 3;
            
            // 日志合并管理
            this.recentLogs = new Map();
            this.mergeWindow = options.mergeWindow || 5000; // 5秒合并窗口
            
            // 持久化配置
            this.persistImportant = options.persistImportant !== false;
            this.persistBatchSize = options.persistBatchSize || 10;
            this.persistQueue = [];
            
            // 统计信息
            this.stats = {
                total: 0,
                byLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0 },
                dropped: 0,
                merged: 0,
                persisted: 0
            };
            
            // 激活控制台拦截
            if (options.interceptConsole !== false) {
                this._activateConsoleInterception();
            }
            
            // 启动定期清理
            this._startPeriodicCleanup();
            
            console.log('[EnhancedUnifiedLogger] ✅ 增强型统一日志器已初始化');
        }

        /**
         * 核心日志方法
         */
        log(level, category, message, data, context = {}) {
            // 1. 级别过滤
            const levelObj = typeof level === 'string' ? LOG_LEVELS[level.toUpperCase()] : level;
            if (!levelObj || levelObj.value < this.currentLevel.value) {
                return;
            }

            // 2. 重复检测
            const logKey = `${levelObj.name}:${category}:${message}`;
            if (this._isDuplicate(logKey)) {
                this.stats.dropped++;
                return;
            }

            // 3. 内容截断
            const truncatedData = this._truncateData(data);

            // 4. 合并相似日志
            if (this._shouldMerge(category, message)) {
                this._mergeLog(levelObj, category, message, truncatedData, context);
                return;
            }

            // 5. 创建日志条目
            const entry = {
                timestamp: new Date().toISOString(),
                level: levelObj.name,
                category,
                message,
                data: truncatedData,
                context,
                stack: levelObj.value >= LOG_LEVELS.ERROR.value ? new Error().stack : null
            };

            // 6. 添加到缓冲区
            this.buffer.add(entry);
            this.stats.total++;
            this.stats.byLevel[levelObj.name]++;

            // 7. 输出到控制台（使用基础日志器或原生console）
            this._outputToConsole(levelObj, category, message, truncatedData);

            // 8. 持久化重要日志
            if (this.persistImportant && levelObj.value >= LOG_LEVELS.WARN.value) {
                this._queueForPersistence(entry);
            }

            // 9. 触发日志事件
            this._emitLogEvent(entry);
        }

        /**
         * 便捷方法
         */
        debug(category, message, data, context) {
            this.log('DEBUG', category, message, data, context);
        }

        info(category, message, data, context) {
            this.log('INFO', category, message, data, context);
        }

        warn(category, message, data, context) {
            this.log('WARN', category, message, data, context);
        }

        error(category, message, data, context) {
            this.log('ERROR', category, message, data, context);
        }

        /**
         * 设置日志级别
         */
        setLevel(level) {
            const levelObj = typeof level === 'string' ? LOG_LEVELS[level.toUpperCase()] : level;
            if (levelObj) {
                this.currentLevel = levelObj;
                console.log(`[EnhancedUnifiedLogger] 日志级别设置为: ${levelObj.name}`);
            }
        }

        /**
         * 获取日志缓冲区
         */
        getLogBuffer() {
            return this.buffer.getAll();
        }

        /**
         * 清空日志
         */
        clearLogs() {
            this.buffer.clear();
            this.recentLogs.clear();
            console.log('[EnhancedUnifiedLogger] 日志已清空');
        }

        /**
         * 获取统计信息
         */
        getStats() {
            return {
                ...this.stats,
                bufferSize: this.buffer.size,
                mergedCount: this.recentLogs.size
            };
        }

        /**
         * 重复日志检测
         */
        _isDuplicate(logKey) {
            if (this.lastLog === logKey) {
                this.repeatCount++;
                if (this.repeatCount === this.maxRepeats) {
                    console.log(`[EnhancedUnifiedLogger] 日志重复${this.maxRepeats}次，后续将被抑制`);
                }
                return this.repeatCount > this.maxRepeats;
            }
            this.lastLog = logKey;
            this.repeatCount = 0;
            return false;
        }

        /**
         * 数据截断
         */
        _truncateData(data) {
            if (!data) return data;

            if (typeof data === 'string') {
                return data.length > 100 ? 
                    data.substring(0, 100) + `... (${data.length}字符)` : 
                    data;
            }

            if (typeof data === 'object') {
                try {
                    const json = JSON.stringify(data);
                    if (json.length > 200) {
                        return `{...} (${json.length}字符)`;
                    }
                    return data;
                } catch (e) {
                    return '[无法序列化的对象]';
                }
            }

            return data;
        }

        /**
         * 判断是否应该合并日志
         */
        _shouldMerge(category, message) {
            // 合并脑图节点选择相关的日志
            if (category === 'mindmap' && 
                (message.includes('加载节点') || message.includes('触发事件') || message.includes('节点选择'))) {
                return true;
            }
            // 合并存储操作日志
            if (category === 'storage' && message.includes('保存')) {
                return true;
            }
            return false;
        }

        /**
         * 合并日志
         */
        _mergeLog(levelObj, category, message, data, context) {
            const key = `${category}:${message}`;
            const now = Date.now();

            if (!this.recentLogs.has(key)) {
                // 首次出现，正常输出
                this.recentLogs.set(key, { count: 1, lastTime: now, firstData: data });
                this._outputToConsole(levelObj, category, message, data);
                this.stats.total++;
                this.stats.byLevel[levelObj.name]++;
            } else {
                // 已存在，增加计数
                const log = this.recentLogs.get(key);
                log.count++;
                log.lastTime = now;
                this.stats.merged++;

                // 每5次合并输出一次
                if (log.count % 5 === 0) {
                    this._outputToConsole(
                        levelObj, 
                        category, 
                        `${message} (已合并${log.count}次)`,
                        log.firstData
                    );
                }
            }
        }

        /**
         * 输出到控制台
         */
        _outputToConsole(levelObj, category, message, data) {
            const prefix = levelObj.prefix;
            const color = levelObj.color;
            const timestamp = new Date().toLocaleTimeString();

            if (this.baseLogger && typeof this.baseLogger.log === 'function') {
                // 使用基础日志器
                this.baseLogger.log(levelObj.name, category, message, data);
            } else {
                // 使用原生console
                const style = `color: ${color}; font-weight: bold;`;
                console.log(
                    `%c${prefix} [${timestamp}] [${levelObj.name}] [${category}]`,
                    style,
                    message,
                    data || ''
                );
            }
        }

        /**
         * 队列持久化
         */
        _queueForPersistence(entry) {
            this.persistQueue.push(entry);

            // 达到批量大小时持久化
            if (this.persistQueue.length >= this.persistBatchSize) {
                this._persistBatch();
            }
        }

        /**
         * 批量持久化
         */
        async _persistBatch() {
            if (this.persistQueue.length === 0 || !this.storage) {
                return;
            }

            const batch = [...this.persistQueue];
            this.persistQueue = [];

            try {
                const key = `logs:${Date.now()}`;
                await this.storage.store(key, batch, { ttl: 24 * 60 * 60 * 1000 }); // 24小时TTL
                this.stats.persisted += batch.length;
            } catch (error) {
                console.error('[EnhancedUnifiedLogger] 日志持久化失败:', error);
            }
        }

        /**
         * 激活控制台拦截
         */
        _activateConsoleInterception() {
            const methods = ['log', 'warn', 'error'];
            const self = this;

            methods.forEach(method => {
                const original = console[method];
                console[method] = function(...args) {
                    // 转换为统一日志格式
                    const level = method.toUpperCase();
                    const message = args.map(arg => 
                        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                    ).join(' ');

                    self.log(level, 'console', message, { originalArgs: args });

                    // 调用原始console方法
                    original.apply(console, args);
                };
            });

            console.log('[EnhancedUnifiedLogger] 控制台拦截已激活');
        }

        /**
         * 触发日志事件
         */
        _emitLogEvent(entry) {
            if (global.AutogenEventBus && typeof global.AutogenEventBus.emit === 'function') {
                global.AutogenEventBus.emit('log:created', entry);
            }
        }

        /**
         * 定期清理
         */
        _startPeriodicCleanup() {
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
            }, this.mergeWindow);
        }
    }

    // 导出到全局
    global.EnhancedUnifiedLogger = EnhancedUnifiedLogger;
    global.CircularBuffer = CircularBuffer;

    // 如果没有UnifiedLogger，创建默认实例
    if (!global.UnifiedLogger) {
        global.UnifiedLogger = new EnhancedUnifiedLogger();
    }

})(typeof window !== 'undefined' ? window : global);
