/**
 * AutogenEventBus - 基于Autogen框架的统一事件总线
 * 
 * 设计原则：
 * 1. 基于autogen消息传递机制
 * 2. 统一src/core/EventBus.js和infra/event_bus.js的功能
 * 3. 支持异步事件处理和消息路由
 * 4. 集成错误处理和性能监控
 * 5. 为后续Agent集成做准备
 * 
 * 参考autogen AgentRuntime的消息机制
 */

// 防止重复定义
if (typeof window.AutogenEventBus !== 'undefined') {
    console.warn('[AutogenEventBus] 已存在，跳过重复定义');
} else {

class AutogenEventBus {
    constructor() {
        // 消息监听器存储（支持多种订阅模式）
        this.listeners = new Map();
        this.wildcardListeners = new Map();
        this.onceListeners = new Map();
        
        // 消息队列（异步处理）
        this.messageQueue = [];
        this.processing = false;
        
        // 中间件系统（参考autogen中间件）
        this.middlewares = [];
        
        // 性能统计
        this.stats = {
            messagesPublished: 0,
            messagesDelivered: 0,
            errors: 0,
            averageProcessingTime: 0,
            peakQueueSize: 0
        };
        
        // 错误处理器
        this.errorHandlers = new Set();
        
        // 调试模式
        this.debugMode = false;
        
        console.log('[AutogenEventBus] 统一事件总线初始化完成');
    }
    
    /**
     * 订阅事件（标准模式）
     * @param {string} event - 事件名称，支持通配符 (e.g., "mindmap.*", "*.updated")
     * @param {Function} handler - 事件处理器
     * @param {Object} options - 选项
     */
    on(event, handler, options = {}) {
        if (typeof handler !== 'function') {
            throw new Error('[AutogenEventBus] 事件处理器必须是函数');
        }
        
        const subscription = {
            handler,
            priority: options.priority || 0,
            once: false,
            context: options.context || null,
            filter: options.filter || null,
            id: this.generateSubscriptionId()
        };
        
        if (event.includes('*')) {
            // 通配符订阅
            if (!this.wildcardListeners.has(event)) {
                this.wildcardListeners.set(event, []);
            }
            this.wildcardListeners.get(event).push(subscription);
        } else {
            // 精确订阅
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            this.listeners.get(event).push(subscription);
        }
        
        // 按优先级排序
        this.sortListenersByPriority(event);
        
        if (this.debugMode) {
            console.log(`[AutogenEventBus] 订阅事件: ${event}, ID: ${subscription.id}`);
        }
        
        // 返回取消订阅函数
        return () => this.off(event, handler);
    }
    
    /**
     * 一次性订阅事件
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理器
     * @param {Object} options - 选项
     */
    once(event, handler, options = {}) {
        const unsubscribe = this.on(event, (...args) => {
            unsubscribe();
            handler(...args);
        }, { ...options, once: true });
        
        return unsubscribe;
    }
    
    /**
     * 取消订阅
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理器
     */
    off(event, handler) {
        const removeFromList = (list) => {
            if (!list) return false;
            const index = list.findIndex(sub => sub.handler === handler);
            if (index !== -1) {
                list.splice(index, 1);
                return true;
            }
            return false;
        };
        
        // 从精确订阅中移除
        if (this.listeners.has(event)) {
            const removed = removeFromList(this.listeners.get(event));
            if (this.listeners.get(event).length === 0) {
                this.listeners.delete(event);
            }
            if (removed && this.debugMode) {
                console.log(`[AutogenEventBus] 取消订阅: ${event}`);
            }
            return removed;
        }
        
        // 从通配符订阅中移除
        if (this.wildcardListeners.has(event)) {
            const removed = removeFromList(this.wildcardListeners.get(event));
            if (this.wildcardListeners.get(event).length === 0) {
                this.wildcardListeners.delete(event);
            }
            return removed;
        }
        
        return false;
    }
    
    /**
     * 发布事件（异步处理）
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     * @param {Object} options - 选项
     */
    async emit(event, data = null, options = {}) {
        const message = {
            event,
            data,
            timestamp: Date.now(),
            id: this.generateMessageId(),
            sender: options.sender || 'system',
            priority: options.priority || 0,
            async: options.async !== false
        };
        
        this.stats.messagesPublished++;
        
        if (this.debugMode) {
            console.log(`[AutogenEventBus] 发布事件: ${event}`, { data, options });
        }
        
        // 应用中间件
        const processedMessage = await this.applyMiddlewares(message);
        if (!processedMessage) {
            return; // 消息被中间件拦截
        }
        
        if (options.async !== false) {
            // 异步处理
            this.messageQueue.push(processedMessage);
            this.updatePeakQueueSize();
            this.processMessageQueue();
        } else {
            // 同步处理
            await this.deliverMessage(processedMessage);
        }
    }
    
    /**
     * 同步发布事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     * @param {Object} options - 选项
     */
    emitSync(event, data = null, options = {}) {
        return this.emit(event, data, { ...options, async: false });
    }
    
    /**
     * 处理消息队列
     */
    async processMessageQueue() {
        if (this.processing || this.messageQueue.length === 0) {
            return;
        }
        
        this.processing = true;
        
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            await this.deliverMessage(message);
        }
        
        this.processing = false;
    }
    
    /**
     * 投递消息到订阅者
     * @param {Object} message - 消息对象
     */
    async deliverMessage(message) {
        const startTime = Date.now();
        const { event, data } = message;
        
        try {
            const subscribers = this.getSubscribers(event);
            
            // 按优先级排序
            subscribers.sort((a, b) => b.priority - a.priority);
            
            const deliveryPromises = subscribers.map(async (subscription) => {
                try {
                    // 应用过滤器
                    if (subscription.filter && !subscription.filter(data, message)) {
                        return;
                    }
                    
                    // 调用处理器
                    if (subscription.context) {
                        await subscription.handler.call(subscription.context, data, message);
                    } else {
                        await subscription.handler(data, message);
                    }
                    
                    this.stats.messagesDelivered++;
                    
                } catch (error) {
                    this.handleSubscriptionError(error, subscription, message);
                }
            });
            
            await Promise.all(deliveryPromises);
            
        } catch (error) {
            this.handleDeliveryError(error, message);
        }
        
        // 更新性能统计
        const processingTime = Date.now() - startTime;
        this.updateAverageProcessingTime(processingTime);
    }
    
    /**
     * 获取事件的所有订阅者
     * @param {string} event - 事件名称
     */
    getSubscribers(event) {
        const subscribers = [];
        
        // 精确匹配
        if (this.listeners.has(event)) {
            subscribers.push(...this.listeners.get(event));
        }
        
        // 通配符匹配
        for (const [pattern, subs] of this.wildcardListeners.entries()) {
            if (this.matchWildcard(pattern, event)) {
                subscribers.push(...subs);
            }
        }
        
        return subscribers;
    }
    
    /**
     * 通配符匹配
     * @param {string} pattern - 通配符模式
     * @param {string} event - 事件名称
     */
    matchWildcard(pattern, event) {
        const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
        );
        return regex.test(event);
    }
    
    /**
     * 添加中间件
     * @param {Function} middleware - 中间件函数
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('[AutogenEventBus] 中间件必须是函数');
        }
        
        this.middlewares.push(middleware);
        console.log(`[AutogenEventBus] 添加中间件: ${middleware.name || 'anonymous'}`);
    }
    
    /**
     * 应用中间件
     * @param {Object} message - 消息对象
     */
    async applyMiddlewares(message) {
        let processedMessage = message;
        
        for (const middleware of this.middlewares) {
            try {
                processedMessage = await middleware(processedMessage);
                if (!processedMessage) {
                    // 中间件拦截了消息
                    if (this.debugMode) {
                        console.log(`[AutogenEventBus] 消息被中间件拦截: ${message.event}`);
                    }
                    return null;
                }
            } catch (error) {
                console.error(`[AutogenEventBus] 中间件错误:`, error);
                this.stats.errors++;
            }
        }
        
        return processedMessage;
    }
    
    /**
     * 添加错误处理器
     * @param {Function} handler - 错误处理器
     */
    onError(handler) {
        this.errorHandlers.add(handler);
        return () => this.errorHandlers.delete(handler);
    }
    
    /**
     * 处理订阅错误
     * @param {Error} error - 错误对象
     * @param {Object} subscription - 订阅信息
     * @param {Object} message - 消息对象
     */
    handleSubscriptionError(error, subscription, message) {
        this.stats.errors++;
        
        const errorInfo = {
            error,
            subscription,
            message,
            type: 'subscription_error'
        };
        
        // 调用错误处理器
        for (const handler of this.errorHandlers) {
            try {
                handler(errorInfo);
            } catch (handlerError) {
                console.error('[AutogenEventBus] 错误处理器失败:', handlerError);
            }
        }
        
        // 默认错误处理
        console.error(`[AutogenEventBus] 订阅处理错误 ${message.event}:`, error);
    }
    
    /**
     * 处理投递错误
     * @param {Error} error - 错误对象
     * @param {Object} message - 消息对象
     */
    handleDeliveryError(error, message) {
        this.stats.errors++;
        
        const errorInfo = {
            error,
            message,
            type: 'delivery_error'
        };
        
        // 调用错误处理器
        for (const handler of this.errorHandlers) {
            try {
                handler(errorInfo);
            } catch (handlerError) {
                console.error('[AutogenEventBus] 错误处理器失败:', handlerError);
            }
        }
        
        console.error(`[AutogenEventBus] 消息投递错误 ${message.event}:`, error);
    }
    
    /**
     * 按优先级排序监听器
     * @param {string} event - 事件名称
     */
    sortListenersByPriority(event) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).sort((a, b) => b.priority - a.priority);
        }
        
        if (this.wildcardListeners.has(event)) {
            this.wildcardListeners.get(event).sort((a, b) => b.priority - a.priority);
        }
    }
    
    /**
     * 生成订阅ID
     */
    generateSubscriptionId() {
        return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 生成消息ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 更新峰值队列大小
     */
    updatePeakQueueSize() {
        if (this.messageQueue.length > this.stats.peakQueueSize) {
            this.stats.peakQueueSize = this.messageQueue.length;
        }
    }
    
    /**
     * 更新平均处理时间
     * @param {number} processingTime - 处理时间（毫秒）
     */
    updateAverageProcessingTime(processingTime) {
        const currentAvg = this.stats.averageProcessingTime;
        const count = this.stats.messagesDelivered;
        
        this.stats.averageProcessingTime = 
            (currentAvg * (count - 1) + processingTime) / count;
    }
    
    /**
     * 清理所有订阅
     */
    clear() {
        this.listeners.clear();
        this.wildcardListeners.clear();
        this.onceListeners.clear();
        this.messageQueue.length = 0;
        
        console.log('[AutogenEventBus] 所有订阅已清理');
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            activeSubscriptions: {
                exact: Array.from(this.listeners.keys()).length,
                wildcard: Array.from(this.wildcardListeners.keys()).length
            },
            queueSize: this.messageQueue.length,
            middlewareCount: this.middlewares.length,
            errorHandlerCount: this.errorHandlers.size,
            health: {
                healthy: this.stats.errors < 10,
                errorRate: this.stats.messagesPublished > 0 ? 
                    (this.stats.errors / this.stats.messagesPublished) * 100 : 0
            }
        };
    }
    
    /**
     * 启用/禁用调试模式
     * @param {boolean} enabled - 是否启用
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`[AutogenEventBus] 调试模式: ${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 等待所有消息处理完成
     */
    async flush() {
        while (this.messageQueue.length > 0 || this.processing) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
    
    /**
     * 兼容旧EventBus接口
     */
    
    // 兼容SimpleEventBus接口
    addEventListener(event, handler) {
        return this.on(event, handler);
    }
    
    removeEventListener(event, handler) {
        return this.off(event, handler);
    }
    
    dispatchEvent(event, data) {
        return this.emit(event, data);
    }
    
    // 兼容GlobalEventBus接口
    subscribe(event, handler) {
        return this.on(event, handler);
    }
    
    unsubscribe(event, handler) {
        return this.off(event, handler);
    }
    
    publish(event, data) {
        return this.emit(event, data);
    }
}

// 创建全局单例
const globalEventBus = new AutogenEventBus();

// 全局导出（兼容现有代码）
window.AutogenEventBus = AutogenEventBus;
window.GlobalEventBus = globalEventBus;
window.EventBus = AutogenEventBus; // 兼容性

// 模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutogenEventBus, globalEventBus };
}

} // 结束防重复定义检查
