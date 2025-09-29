/**
 * AutogenSystemInitializer - Autogen系统统一初始化器
 * 
 * 功能：
 * 1. 初始化AutogenUnifiedStorage统一存储系统
 * 2. 初始化AutogenEventBus统一事件总线
 * 3. 执行数据迁移
 * 4. 设置系统监控和健康检查
 * 5. 提供统一的系统状态管理
 */

// 使用全局变量替代ES6导入
// import AutogenUnifiedStorage from './storage/AutogenUnifiedStorage.js';
// import { AutogenEventBus } from './messaging/AutogenEventBus.js';
// import StorageMigrationTool from '../migration/StorageMigrationTool.js';

class AutogenSystemInitializer {
    constructor() {
        this.initializationState = {
            storage: false,
            eventBus: false,
            migration: false,
            monitoring: false,
            completed: false
        };
        
        this.systemComponents = {
            storage: null,
            eventBus: null,
            migrationTool: null
        };
        
        this.initializationLog = [];
        this.healthCheckInterval = null;
        
        console.log('[AutogenSystemInitializer] 系统初始化器创建完成');
    }
    
    /**
     * 执行完整的系统初始化
     */
    async initialize() {
        console.log('[AutogenSystemInitializer] 开始系统初始化');
        
        try {
            // 1. 初始化存储系统
            await this.initializeStorage();
            
            // 2. 初始化事件总线
            await this.initializeEventBus();
            
            // 3. 执行数据迁移
            await this.performMigration();
            
            // 4. 设置系统监控
            await this.setupMonitoring();
            
            // 5. 注册全局错误处理
            this.setupGlobalErrorHandling();
            
            // 6. 设置系统事件
            this.setupSystemEvents();
            
            this.initializationState.completed = true;
            this.logSuccess('Autogen系统初始化完成');
            
            // 发布系统就绪事件
            this.systemComponents.eventBus.emit('system:ready', {
                timestamp: Date.now(),
                components: Object.keys(this.systemComponents),
                state: this.initializationState
            });
            
            return {
                success: true,
                components: this.systemComponents,
                state: this.initializationState,
                log: this.initializationLog
            };
            
        } catch (error) {
            this.logError('系统初始化失败', error);
            
            // 清理已初始化的组件
            await this.cleanup();
            
            return {
                success: false,
                error: error.message,
                state: this.initializationState,
                log: this.initializationLog
            };
        }
    }
    
    /**
     * 初始化存储系统
     */
    async initializeStorage() {
        this.logInfo('初始化AutogenUnifiedStorage');
        
        try {
            // 检查是否已有存储实例（避免重复初始化）
            if (window.AutogenUnifiedStorage && typeof window.AutogenUnifiedStorage === 'object') {
                // 使用现有实例
                this.systemComponents.storage = window.AutogenUnifiedStorage;
                this.logInfo('使用现有AutogenUnifiedStorage实例');
            } else if (window.AutogenUnifiedStorage && typeof window.AutogenUnifiedStorage === 'function') {
                // 创建新实例
                this.systemComponents.storage = new window.AutogenUnifiedStorage();
                this.logInfo('创建新AutogenUnifiedStorage实例');
                
                // 等待存储系统初始化完成
                if (typeof this.systemComponents.storage.initialize === 'function') {
                    await this.systemComponents.storage.initialize();
                }
            } else {
                throw new Error('AutogenUnifiedStorage不可用');
            }
            
            // 验证存储系统功能
            await this.validateStorageSystem();
            
            this.initializationState.storage = true;
            this.logSuccess('存储系统初始化完成');
            
            // 将存储系统暴露到全局（如果尚未暴露）
            if (!window.AutogenStorage) {
                window.AutogenStorage = this.systemComponents.storage;
            }
            
        } catch (error) {
            this.logError('存储系统初始化失败', error);
            throw error;
        }
    }
    
    /**
     * 验证存储系统
     */
    async validateStorageSystem() {
        const testKey = 'system_test';
        const testData = { test: true, timestamp: Date.now() };
        
        // 测试存储
        const storeResult = await this.systemComponents.storage.store(
            'app_state', testKey, testData
        );
        
        if (!storeResult) {
            throw new Error('存储系统写入测试失败');
        }
        
        // 测试读取
        const retrieveResult = await this.systemComponents.storage.retrieve(
            'app_state', testKey
        );
        
        if (!retrieveResult || retrieveResult.test !== true) {
            throw new Error('存储系统读取测试失败');
        }
        
        // 测试删除
        const deleteResult = await this.systemComponents.storage.remove(
            'app_state', testKey
        );
        
        if (!deleteResult) {
            throw new Error('存储系统删除测试失败');
        }
        
        this.logInfo('存储系统功能验证通过');
    }
    
    /**
     * 初始化事件总线
     */
    async initializeEventBus() {
        this.logInfo('初始化AutogenEventBus');
        
        try {
            // 检查是否已有事件总线实例（避免重复初始化）
            if (window.AutogenEventBus && typeof window.AutogenEventBus === 'object') {
                // 使用现有实例
                this.systemComponents.eventBus = window.AutogenEventBus;
                this.logInfo('使用现有AutogenEventBus实例');
            } else if (window.AutogenEventBus && typeof window.AutogenEventBus === 'function') {
                // 创建新实例
                this.systemComponents.eventBus = new window.AutogenEventBus();
                this.logInfo('创建新AutogenEventBus实例');
                
                // 设置调试模式（开发环境）
                if (this.isDevelopmentMode()) {
                    if (typeof this.systemComponents.eventBus.setDebugMode === 'function') {
                        this.systemComponents.eventBus.setDebugMode(true);
                    }
                }
                
                // 添加系统中间件
                this.setupEventBusMiddlewares();
                
                // 添加错误处理器
                this.setupEventBusErrorHandlers();
                
                // 将事件总线暴露到全局
                window.AutogenEventBus = this.systemComponents.eventBus;
            } else {
                throw new Error('AutogenEventBus不可用');
            }
            
            // 验证事件总线功能
            await this.validateEventBus();
            
            this.initializationState.eventBus = true;
            this.logSuccess('事件总线初始化完成');
            
        } catch (error) {
            this.logError('事件总线初始化失败', error);
            throw error;
        }
    }
    
    /**
     * 设置事件总线中间件
     */
    setupEventBusMiddlewares() {
        // 日志中间件
        this.systemComponents.eventBus.use(async (message) => {
            if (message.event.startsWith('system:')) {
                this.logInfo(`系统事件: ${message.event}`);
            }
            return message;
        });
        
        // 性能监控中间件
        this.systemComponents.eventBus.use(async (message) => {
            message.processingStartTime = Date.now();
            return message;
        });
        
        // 安全过滤中间件
        this.systemComponents.eventBus.use(async (message) => {
            // 过滤敏感信息
            if (message.data && typeof message.data === 'object') {
                const sanitized = this.sanitizeEventData(message.data);
                return { ...message, data: sanitized };
            }
            return message;
        });
    }
    
    /**
     * 设置事件总线错误处理器
     */
    setupEventBusErrorHandlers() {
        this.systemComponents.eventBus.onError((errorInfo) => {
            this.logError('事件总线错误', errorInfo.error);
            
            // 记录错误统计
            this.recordError('eventbus', errorInfo);
            
            // 严重错误时发送系统警告
            if (errorInfo.error.name === 'SystemCriticalError') {
                this.systemComponents.eventBus.emit('system:critical_error', errorInfo);
            }
        });
    }
    
    /**
     * 验证事件总线
     */
    async validateEventBus() {
        return new Promise((resolve, reject) => {
            let testPassed = false;
            
            // 设置测试监听器
            const testHandler = (data) => {
                if (data && data.test === 'validation') {
                    testPassed = true;
                    resolve();
                }
            };
            
            this.systemComponents.eventBus.once('system:test', testHandler);
            
            // 发送测试事件
            this.systemComponents.eventBus.emit('system:test', { test: 'validation' });
            
            // 超时检查
            setTimeout(() => {
                if (!testPassed) {
                    reject(new Error('事件总线验证超时'));
                }
            }, 1000);
        });
    }
    
    /**
     * 执行数据迁移
     */
    async performMigration() {
        this.logInfo('开始数据迁移检查');
        
        try {
            // 检查是否需要迁移
            const needsMigration = await this.checkMigrationNeeded();
            
            if (needsMigration) {
                this.logInfo('检测到旧数据，但迁移工具已废弃');
                
                // 发布迁移开始事件
                if (this.systemComponents.eventBus && typeof this.systemComponents.eventBus.emit === 'function') {
                    this.systemComponents.eventBus.emit('system:migration_start');
                }
                
                // 简化迁移：仅标记旧数据
                await this.markLegacyData();
                
                this.logInfo('数据迁移检查完成（简化版）');
                
                // 发布迁移完成事件
                if (this.systemComponents.eventBus && typeof this.systemComponents.eventBus.emit === 'function') {
                    this.systemComponents.eventBus.emit('system:migration_complete', {
                        success: true,
                        type: 'simplified',
                        message: '旧数据已标记，建议手动清理'
                    });
                }
            } else {
                this.logInfo('无需数据迁移');
            }
            
            this.initializationState.migration = true;
            
        } catch (error) {
            this.logError('迁移流程失败', error);
            // 不抛出错误，允许系统继续初始化
            this.initializationState.migration = true;
        }
    }
    
    /**
     * 检查是否需要迁移
     */
    async checkMigrationNeeded() {
        // 检查是否存在旧格式的数据
        const legacyPrefixes = ['mind:', 'reg:', 'mindmap_', 'relation_'];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !key.includes('_migrated')) {
                for (const prefix of legacyPrefixes) {
                    if (key.startsWith(prefix)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * 标记旧数据（简化迁移）
     */
    async markLegacyData() {
        try {
            const legacyKeys = [];
            const legacyPrefixes = ['mind:', 'reg:', 'mindmap_', 'relation_'];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && !key.includes('_migrated')) {
                    for (const prefix of legacyPrefixes) {
                        if (key.startsWith(prefix)) {
                            legacyKeys.push(key);
                            break;
                        }
                    }
                }
            }
            
            // 标记发现的旧数据
            if (legacyKeys.length > 0) {
                localStorage.setItem('legacy_data_found', JSON.stringify({
                    keys: legacyKeys,
                    timestamp: Date.now(),
                    marked: true
                }));
                
                this.logInfo(`标记了 ${legacyKeys.length} 个旧数据键`);
            }
            
        } catch (error) {
            this.logWarning('标记旧数据失败', error);
        }
    }
    
    /**
     * 设置系统监控
     */
    async setupMonitoring() {
        this.logInfo('设置系统监控');
        
        try {
            // 启动健康检查
            this.startHealthCheck();
            
            // 设置性能监控
            this.setupPerformanceMonitoring();
            
            // 设置存储监控
            this.setupStorageMonitoring();
            
            this.initializationState.monitoring = true;
            this.logSuccess('系统监控设置完成');
            
        } catch (error) {
            this.logError('监控设置失败', error);
            throw error;
        }
    }
    
    /**
     * 启动健康检查
     */
    startHealthCheck() {
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 60000); // 每分钟检查一次
        
        this.logInfo('健康检查已启动');
    }
    
    /**
     * 执行健康检查
     */
    async performHealthCheck() {
        try {
            const healthStatus = {
                timestamp: Date.now(),
                storage: await this.checkStorageHealth(),
                eventBus: this.checkEventBusHealth(),
                memory: this.checkMemoryUsage(),
                overall: 'healthy'
            };
            
            // 判断整体健康状态
            if (!healthStatus.storage.healthy || !healthStatus.eventBus.healthy) {
                healthStatus.overall = 'unhealthy';
            } else if (healthStatus.memory.usage > 80) {
                healthStatus.overall = 'warning';
            }
            
            // 发布健康状态事件
            this.systemComponents.eventBus.emit('system:health_check', healthStatus);
            
            // 记录不健康状态
            if (healthStatus.overall !== 'healthy') {
                this.logWarning(`系统健康状态: ${healthStatus.overall}`, healthStatus);
            }
            
        } catch (error) {
            this.logError('健康检查失败', error);
        }
    }
    
    /**
     * 检查存储系统健康状态
     */
    async checkStorageHealth() {
        try {
            const stats = this.systemComponents.storage.getStats();
            return {
                healthy: stats.health.healthy,
                hitRate: stats.health.hitRate,
                errors: stats.errors,
                memoryCache: stats.memoryCache.size
            };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }
    
    /**
     * 检查事件总线健康状态
     */
    checkEventBusHealth() {
        try {
            const stats = this.systemComponents.eventBus.getStats();
            return {
                healthy: stats.health.healthy,
                errorRate: stats.health.errorRate,
                queueSize: stats.queueSize,
                subscriptions: stats.activeSubscriptions
            };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }
    
    /**
     * 检查内存使用情况
     */
    checkMemoryUsage() {
        try {
            if (performance.memory) {
                const memory = performance.memory;
                return {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit,
                    usage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
                };
            }
            return { usage: 0, available: false };
        } catch (error) {
            return { usage: 0, error: error.message };
        }
    }
    
    /**
     * 设置性能监控
     */
    setupPerformanceMonitoring() {
        // 监控页面性能
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 100) { // 超过100ms的操作
                            this.systemComponents.eventBus.emit('system:performance_warning', {
                                type: entry.entryType,
                                name: entry.name,
                                duration: entry.duration
                            });
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['measure', 'navigation'] });
                this.logInfo('性能监控已启动');
            } catch (error) {
                this.logWarning('性能监控启动失败', error);
            }
        }
    }
    
    /**
     * 设置存储监控
     */
    setupStorageMonitoring() {
        // 监控存储空间使用
        setInterval(() => {
            const usage = this.systemComponents.storage.getLocalStorageUsage();
            
            if (usage.percentage > 90) {
                this.systemComponents.eventBus.emit('system:storage_critical', usage);
            } else if (usage.percentage > 80) {
                this.systemComponents.eventBus.emit('system:storage_warning', usage);
            }
        }, 300000); // 每5分钟检查一次
    }
    
    /**
     * 设置全局错误处理
     */
    setupGlobalErrorHandling() {
        // 捕获未处理的错误
        window.addEventListener('error', (event) => {
            this.recordError('global', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });
        
        // 捕获未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.recordError('promise', {
                reason: event.reason,
                promise: event.promise
            });
        });
        
        this.logInfo('全局错误处理已设置');
    }
    
    /**
     * 设置系统事件
     */
    setupSystemEvents() {
        const eventBus = this.systemComponents.eventBus;
        
        // 系统关闭事件
        window.addEventListener('beforeunload', () => {
            eventBus.emit('system:shutdown');
        });
        
        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            eventBus.emit('system:visibility_change', {
                hidden: document.hidden
            });
        });
        
        // 网络状态变化
        window.addEventListener('online', () => {
            eventBus.emit('system:network_online');
        });
        
        window.addEventListener('offline', () => {
            eventBus.emit('system:network_offline');
        });
        
        this.logInfo('系统事件监听已设置');
    }
    
    /**
     * 工具方法
     */
    
    isDevelopmentMode() {
        return location.hostname === 'localhost' || 
               location.hostname === '127.0.0.1' ||
               location.search.includes('debug=true');
    }
    
    sanitizeEventData(data) {
        // 移除敏感字段
        const sensitiveKeys = ['password', 'token', 'key', 'secret'];
        const sanitized = { ...data };
        
        for (const key of sensitiveKeys) {
            if (key in sanitized) {
                sanitized[key] = '[REDACTED]';
            }
        }
        
        return sanitized;
    }
    
    recordError(category, errorInfo) {
        const errorRecord = {
            category,
            timestamp: Date.now(),
            ...errorInfo
        };
        
        // 存储错误记录
        if (this.systemComponents.storage) {
            this.systemComponents.storage.store('app_state', `error_${Date.now()}`, errorRecord);
        }
        
        // 发布错误事件
        if (this.systemComponents.eventBus) {
            this.systemComponents.eventBus.emit('system:error', errorRecord);
        }
    }
    
    /**
     * 清理系统组件
     */
    async cleanup() {
        this.logInfo('清理系统组件');
        
        // 停止健康检查
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        // 清理事件总线
        if (this.systemComponents.eventBus) {
            this.systemComponents.eventBus.clear();
        }
        
        // 重置状态
        this.initializationState = {
            storage: false,
            eventBus: false,
            migration: false,
            monitoring: false,
            completed: false
        };
        
        this.systemComponents = {
            storage: null,
            eventBus: null,
            migrationTool: null
        };
    }
    
    /**
     * 获取系统状态
     */
    getSystemStatus() {
        return {
            initialized: this.initializationState.completed,
            state: this.initializationState,
            components: Object.keys(this.systemComponents).reduce((acc, key) => {
                acc[key] = this.systemComponents[key] !== null;
                return acc;
            }, {}),
            log: this.initializationLog
        };
    }
    
    /**
     * 日志方法
     */
    
    logInfo(message) {
        const entry = {
            level: 'INFO',
            message,
            timestamp: new Date().toISOString()
        };
        this.initializationLog.push(entry);
        console.log(`[AutogenSystemInitializer] ${message}`);
    }
    
    logWarning(message, data = null) {
        const entry = {
            level: 'WARNING',
            message,
            data,
            timestamp: new Date().toISOString()
        };
        this.initializationLog.push(entry);
        console.warn(`[AutogenSystemInitializer] ${message}`, data);
    }
    
    logError(message, error = null) {
        const entry = {
            level: 'ERROR',
            message,
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        };
        this.initializationLog.push(entry);
        console.error(`[AutogenSystemInitializer] ${message}`, error);
    }
    
    logSuccess(message) {
        const entry = {
            level: 'SUCCESS',
            message,
            timestamp: new Date().toISOString()
        };
        this.initializationLog.push(entry);
        console.log(`[AutogenSystemInitializer] ✅ ${message}`);
    }
}

// 创建全局实例
const systemInitializer = new AutogenSystemInitializer();

// 导出
window.AutogenSystemInitializer = systemInitializer;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutogenSystemInitializer, systemInitializer };
}
