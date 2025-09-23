/**
 * 增强版事件总线系统
 * 第二阶段重构：支持命名空间、错误处理、生命周期管理
 * 基于第一阶段验收的存储系统，实现组件间解耦通信
 */

/**
 * 事件总线类 - 应用级事件通信中心
 */
class EventBus {
    constructor() {
        // 事件监听器存储：Map<eventName, Set<listener>>
        this.listeners = new Map();
        
        // 命名空间支持：Map<namespace, EventBus>
        this.namespaces = new Map();
        
        // 事件历史记录（用于调试）
        this.eventHistory = [];
        this.maxHistorySize = 1000;
        
        // 错误处理
        this.errorHandlers = new Set();
        this.errorCount = 0;
        
        // 生命周期管理
        this.componentListeners = new Map(); // Map<componentId, Set<unsubscribeFn>>
        
        // 统计信息
        this.stats = {
            eventsEmitted: 0,
            listenersRegistered: 0,
            errorsHandled: 0,
            namespacesCreated: 0
        };
        
        // 调试模式
        this.debugMode = false;
        
        console.log('[EventBus] 增强版事件总线已初始化');
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称，支持命名空间 (namespace:event)
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 选项
     * @returns {Function} 取消订阅函数
     */
    on(event, handler, options = {}) {
        if (typeof event !== 'string' || typeof handler !== 'function') {
            throw new Error('[EventBus] on() 参数错误：event必须是字符串，handler必须是函数');
        }

        const {
            once = false,           // 是否只执行一次
            priority = 0,           // 优先级（数字越大优先级越高）
            componentId = null      // 组件ID（用于生命周期管理）
        } = options;

        // 处理命名空间
        const { namespace, eventName } = this._parseEvent(event);
        if (namespace) {
            return this._getNamespace(namespace).on(eventName, handler, options);
        }

        // 创建监听器对象
        const listener = {
            handler,
            once,
            priority,
            componentId,
            id: this._generateListenerId(),
            createdAt: Date.now()
        };

        // 注册监听器
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event).add(listener);
        this.stats.listenersRegistered++;

        // 组件生命周期管理
        if (componentId) {
            this._trackComponentListener(componentId, event, listener);
        }

        if (this.debugMode) {
            console.log(`[EventBus] 注册监听器: ${event}`, { componentId, priority, once });
        }

        // 返回取消订阅函数
        const unsubscribe = () => this._removeListener(event, listener);
        listener.unsubscribe = unsubscribe;
        
        return unsubscribe;
    }

    /**
     * 取消订阅事件
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     */
    off(event, handler) {
        const { namespace, eventName } = this._parseEvent(event);
        if (namespace) {
            return this._getNamespace(namespace).off(eventName, handler);
        }

        const listeners = this.listeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                if (listener.handler === handler) {
                    this._removeListener(event, listener);
                    break;
                }
            }
        }
    }

    /**
     * 订阅一次性事件
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     * @returns {Function} 取消订阅函数
     */
    once(event, handler, options = {}) {
        return this.on(event, handler, { ...options, once: true });
    }

    /**
     * 发布事件
     * @param {string} event - 事件名称
     * @param {*} payload - 事件数据
     * @param {Object} meta - 元数据
     */
    emit(event, payload, meta = {}) {
        if (typeof event !== 'string') {
            throw new Error('[EventBus] emit() 参数错误：event必须是字符串');
        }

        // 处理命名空间
        const { namespace, eventName } = this._parseEvent(event);
        if (namespace) {
            return this._getNamespace(namespace).emit(eventName, payload, meta);
        }

        const eventData = {
            event,
            payload,
            meta: {
                timestamp: Date.now(),
                traceId: this._generateTraceId(),
                ...meta
            }
        };

        // 记录事件历史
        this._recordEvent(eventData);
        this.stats.eventsEmitted++;

        if (this.debugMode) {
            console.log(`[EventBus] 发布事件: ${event}`, eventData);
        }

        // 获取监听器并按优先级排序
        const listeners = this.listeners.get(event);
        if (!listeners || listeners.size === 0) {
            if (this.debugMode) {
                console.warn(`[EventBus] 没有监听器订阅事件: ${event}`);
            }
            return;
        }

        const sortedListeners = Array.from(listeners).sort((a, b) => b.priority - a.priority);
        const toRemove = [];

        // 执行监听器
        for (const listener of sortedListeners) {
            try {
                listener.handler(payload, eventData.meta);
                
                // 处理一次性监听器
                if (listener.once) {
                    toRemove.push(listener);
                }
            } catch (error) {
                this._handleListenerError(error, event, listener, eventData);
            }
        }

        // 移除一次性监听器
        toRemove.forEach(listener => this._removeListener(event, listener));
    }

    /**
     * 等待事件发生
     * @param {string} event - 事件名称
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise} Promise对象
     */
    waitFor(event, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                unsubscribe();
                reject(new Error(`[EventBus] 等待事件超时: ${event}`));
            }, timeout);

            const unsubscribe = this.once(event, (payload, meta) => {
                clearTimeout(timer);
                resolve({ payload, meta });
            });
        });
    }

    /**
     * 获取命名空间
     * @param {string} namespace - 命名空间名称
     * @returns {EventBus} 命名空间事件总线
     */
    namespace(namespace) {
        return this._getNamespace(namespace);
    }

    /**
     * 注册错误处理器
     * @param {Function} handler - 错误处理函数
     */
    onError(handler) {
        if (typeof handler === 'function') {
            this.errorHandlers.add(handler);
        }
    }

    /**
     * 移除错误处理器
     * @param {Function} handler - 错误处理函数
     */
    offError(handler) {
        this.errorHandlers.delete(handler);
    }

    /**
     * 组件生命周期：注册组件
     * @param {string} componentId - 组件ID
     */
    registerComponent(componentId) {
        if (!this.componentListeners.has(componentId)) {
            this.componentListeners.set(componentId, new Set());
            if (this.debugMode) {
                console.log(`[EventBus] 注册组件: ${componentId}`);
            }
        }
    }

    /**
     * 组件生命周期：销毁组件（移除所有监听器）
     * @param {string} componentId - 组件ID
     */
    destroyComponent(componentId) {
        const unsubscribeFunctions = this.componentListeners.get(componentId);
        if (unsubscribeFunctions) {
            unsubscribeFunctions.forEach(unsubscribe => {
                try {
                    unsubscribe();
                } catch (error) {
                    console.warn(`[EventBus] 销毁组件监听器失败: ${componentId}`, error);
                }
            });
            this.componentListeners.delete(componentId);
            
            if (this.debugMode) {
                console.log(`[EventBus] 销毁组件: ${componentId}，移除 ${unsubscribeFunctions.size} 个监听器`);
            }
        }
    }

    /**
     * 开启/关闭调试模式
     * @param {boolean} enabled - 是否开启
     */
    setDebugMode(enabled) {
        this.debugMode = !!enabled;
        console.log(`[EventBus] 调试模式: ${this.debugMode ? '开启' : '关闭'}`);
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            activeListeners: Array.from(this.listeners.entries()).reduce((total, [event, listeners]) => {
                return total + listeners.size;
            }, 0),
            activeComponents: this.componentListeners.size,
            activeNamespaces: this.namespaces.size,
            errorCount: this.errorCount
        };
    }

    /**
     * 获取事件历史
     * @param {number} limit - 返回数量限制
     * @returns {Array} 事件历史
     */
    getEventHistory(limit = 100) {
        return this.eventHistory.slice(-limit);
    }

    /**
     * 清空事件历史
     */
    clearEventHistory() {
        this.eventHistory = [];
    }

    /**
     * 获取所有监听器信息
     * @returns {Object} 监听器信息
     */
    getListenersInfo() {
        const info = {};
        for (const [event, listeners] of this.listeners) {
            info[event] = Array.from(listeners).map(listener => ({
                id: listener.id,
                priority: listener.priority,
                once: listener.once,
                componentId: listener.componentId,
                createdAt: listener.createdAt
            }));
        }
        return info;
    }

    // ==================== 私有方法 ====================

    /**
     * 解析事件名称（支持命名空间）
     * @private
     */
    _parseEvent(event) {
        const parts = event.split(':');
        if (parts.length === 2) {
            return { namespace: parts[0], eventName: parts[1] };
        }
        return { namespace: null, eventName: event };
    }

    /**
     * 获取或创建命名空间
     * @private
     */
    _getNamespace(namespace) {
        if (!this.namespaces.has(namespace)) {
            const namespaceBus = new EventBus();
            namespaceBus.debugMode = this.debugMode;
            this.namespaces.set(namespace, namespaceBus);
            this.stats.namespacesCreated++;
            
            if (this.debugMode) {
                console.log(`[EventBus] 创建命名空间: ${namespace}`);
            }
        }
        return this.namespaces.get(namespace);
    }

    /**
     * 生成监听器ID
     * @private
     */
    _generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 生成追踪ID
     * @private
     */
    _generateTraceId() {
        return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 记录事件历史
     * @private
     */
    _recordEvent(eventData) {
        this.eventHistory.push(eventData);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * 移除监听器
     * @private
     */
    _removeListener(event, listener) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this.listeners.delete(event);
            }
        }

        // 从组件监听器中移除
        if (listener.componentId) {
            const componentListeners = this.componentListeners.get(listener.componentId);
            if (componentListeners) {
                componentListeners.delete(listener.unsubscribe);
            }
        }
    }

    /**
     * 跟踪组件监听器
     * @private
     */
    _trackComponentListener(componentId, event, listener) {
        if (!this.componentListeners.has(componentId)) {
            this.componentListeners.set(componentId, new Set());
        }
        this.componentListeners.get(componentId).add(listener.unsubscribe);
    }

    /**
     * 处理监听器错误
     * @private
     */
    _handleListenerError(error, event, listener, eventData) {
        this.errorCount++;
        this.stats.errorsHandled++;

        const errorInfo = {
            error,
            event,
            listener: {
                id: listener.id,
                componentId: listener.componentId,
                priority: listener.priority
            },
            eventData,
            timestamp: Date.now()
        };

        console.error(`[EventBus] 监听器执行错误: ${event}`, errorInfo);

        // 调用错误处理器
        this.errorHandlers.forEach(handler => {
            try {
                handler(errorInfo);
            } catch (handlerError) {
                console.error('[EventBus] 错误处理器执行失败', handlerError);
            }
        });

        // 发布错误事件
        setTimeout(() => {
            this.emit('system:error', errorInfo, { internal: true });
        }, 0);
    }
}

/**
 * 全局事件总线实例
 */
const globalEventBus = new EventBus();

/**
 * 标准事件定义
 */
const StandardEvents = {
    // 存储相关事件
    STORAGE: {
        READY: 'storage:ready',
        MODIFIED: 'storage:modified',
        MIGRATED: 'storage:migrated',
        ERROR: 'storage:error',
        HEALTH_CHANGED: 'storage:health_changed'
    },
    
    // 脑图相关事件
    MINDMAP: {
        UPDATED: 'mindmap:updated',
        LOADED: 'mindmap:loaded',
        SAVED: 'mindmap:saved',
        NODE_ADDED: 'mindmap:node_added',
        NODE_REMOVED: 'mindmap:node_removed',
        NODE_UPDATED: 'mindmap:node_updated',
        SELECTION_CHANGED: 'mindmap:selection_changed'
    },
    
    // 注册表相关事件
    REGISTRY: {
        CHANGED: 'registry:changed',
        PROJECT_ADDED: 'registry:project_added',
        PROJECT_REMOVED: 'registry:project_removed',
        PROJECT_UPDATED: 'registry:project_updated'
    },
    
    // UI相关事件
    UI: {
        TAB_CHANGED: 'ui:tab_changed',
        VIEW_CHANGED: 'ui:view_changed',
        FILTER_CHANGED: 'ui:filter_changed',
        THEME_CHANGED: 'ui:theme_changed'
    },
    
    // 系统相关事件
    SYSTEM: {
        READY: 'system:ready',
        ERROR: 'system:error',
        SHUTDOWN: 'system:shutdown'
    }
};

// 向后兼容：暴露到全局
if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
    window.GlobalEventBus = globalEventBus;
    window.StandardEvents = StandardEvents;
}
