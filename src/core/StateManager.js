/**
 * Redux-like状态管理器
 * 阶段2.2：实现集中式状态管理，替代分散的全局变量
 * 基于事件驱动架构，提供状态订阅/发布机制
 */

import { StateValidator, StateUtils } from './StateSchema.js';

/**
 * Action类型定义
 */
export const ActionTypes = {
    // 脑图相关Actions
    MINDMAP: {
        SET_CURRENT_PID: 'MINDMAP_SET_CURRENT_PID',
        SET_CURRENT_TITLE: 'MINDMAP_SET_CURRENT_TITLE',
        SET_NODE_COUNT: 'MINDMAP_SET_NODE_COUNT',
        SET_UNSAVED_CHANGES: 'MINDMAP_SET_UNSAVED_CHANGES',
        SET_SELECTED_NODE: 'MINDMAP_SET_SELECTED_NODE',
        SET_VIEW_MODE: 'MINDMAP_SET_VIEW_MODE',
        SET_CACHE_DATA: 'MINDMAP_SET_CACHE_DATA',
        ADD_TO_LIST: 'MINDMAP_ADD_TO_LIST',
        REMOVE_FROM_LIST: 'MINDMAP_REMOVE_FROM_LIST'
    },
    
    // UI相关Actions
    UI: {
        SET_ACTIVE_TAB: 'UI_SET_ACTIVE_TAB',
        TOGGLE_SIDEBAR: 'UI_TOGGLE_SIDEBAR',
        SET_PANEL_SIZE: 'UI_SET_PANEL_SIZE',
        SET_SEARCH_QUERY: 'UI_SET_SEARCH_QUERY',
        SET_SELECTED_TAGS: 'UI_SET_SELECTED_TAGS',
        SET_THEME: 'UI_SET_THEME',
        ADD_NOTIFICATION: 'UI_ADD_NOTIFICATION',
        REMOVE_NOTIFICATION: 'UI_REMOVE_NOTIFICATION',
        OPEN_MODAL: 'UI_OPEN_MODAL',
        CLOSE_MODAL: 'UI_CLOSE_MODAL'
    },
    
    // 注册表相关Actions
    REGISTRY: {
        SET_PROJECTS: 'REGISTRY_SET_PROJECTS',
        ADD_PROJECT: 'REGISTRY_ADD_PROJECT',
        UPDATE_PROJECT: 'REGISTRY_UPDATE_PROJECT',
        REMOVE_PROJECT: 'REGISTRY_REMOVE_PROJECT',
        SET_QUERY_RESULTS: 'REGISTRY_SET_QUERY_RESULTS',
        SET_QUERY_LOADING: 'REGISTRY_SET_QUERY_LOADING'
    },
    
    // 系统相关Actions
    SYSTEM: {
        SET_INITIALIZED: 'SYSTEM_SET_INITIALIZED',
        ADD_LOADED_MODULE: 'SYSTEM_ADD_LOADED_MODULE',
        ADD_FAILED_MODULE: 'SYSTEM_ADD_FAILED_MODULE',
        SET_STORAGE_MODE: 'SYSTEM_SET_STORAGE_MODE',
        SET_STORAGE_HEALTH: 'SYSTEM_SET_STORAGE_HEALTH',
        UPDATE_PERFORMANCE: 'SYSTEM_UPDATE_PERFORMANCE',
        ADD_ERROR: 'SYSTEM_ADD_ERROR'
    }
};

/**
 * Reducer函数集合
 */
export const Reducers = {
    /**
     * 脑图状态Reducer
     */
    mindmap(state, action) {
        switch (action.type) {
            case ActionTypes.MINDMAP.SET_CURRENT_PID:
                return StateUtils.mergeState(state, {
                    current: { 
                        pid: action.payload,
                        lastModified: new Date().toISOString()
                    }
                });
                
            case ActionTypes.MINDMAP.SET_CURRENT_TITLE:
                return StateUtils.mergeState(state, {
                    current: { 
                        title: action.payload,
                        lastModified: new Date().toISOString()
                    }
                });
                
            case ActionTypes.MINDMAP.SET_NODE_COUNT:
                return StateUtils.mergeState(state, {
                    current: { nodeCount: action.payload }
                });
                
            case ActionTypes.MINDMAP.SET_UNSAVED_CHANGES:
                return StateUtils.mergeState(state, {
                    current: { hasUnsavedChanges: action.payload }
                });
                
            case ActionTypes.MINDMAP.SET_SELECTED_NODE:
                return StateUtils.mergeState(state, {
                    selection: { selectedNodeId: action.payload }
                });
                
            case ActionTypes.MINDMAP.SET_VIEW_MODE:
                return StateUtils.mergeState(state, {
                    view: { mode: action.payload }
                });
                
            case ActionTypes.MINDMAP.SET_CACHE_DATA:
                return StateUtils.mergeState(state, {
                    cache: {
                        fullMindData: action.payload,
                        lastCacheTime: new Date().toISOString()
                    }
                });
                
            case ActionTypes.MINDMAP.ADD_TO_LIST:
                return StateUtils.mergeState(state, {
                    list: [...state.list, action.payload]
                });
                
            case ActionTypes.MINDMAP.REMOVE_FROM_LIST:
                return StateUtils.mergeState(state, {
                    list: state.list.filter(item => item.id !== action.payload)
                });
                
            default:
                return state;
        }
    },

    /**
     * UI状态Reducer
     */
    ui(state, action) {
        switch (action.type) {
            case ActionTypes.UI.SET_ACTIVE_TAB:
                return StateUtils.mergeState(state, {
                    activeTab: action.payload
                });
                
            case ActionTypes.UI.TOGGLE_SIDEBAR:
                return StateUtils.mergeState(state, {
                    view: { sidebarCollapsed: !state.view.sidebarCollapsed }
                });
                
            case ActionTypes.UI.SET_PANEL_SIZE:
                return StateUtils.mergeState(state, {
                    view: {
                        panelSizes: {
                            ...state.view.panelSizes,
                            [action.payload.panel]: action.payload.size
                        }
                    }
                });
                
            case ActionTypes.UI.SET_SEARCH_QUERY:
                return StateUtils.mergeState(state, {
                    filters: { searchQuery: action.payload }
                });
                
            case ActionTypes.UI.SET_SELECTED_TAGS:
                return StateUtils.mergeState(state, {
                    filters: { selectedTags: action.payload }
                });
                
            case ActionTypes.UI.SET_THEME:
                return StateUtils.mergeState(state, {
                    theme: { ...state.theme, ...action.payload }
                });
                
            case ActionTypes.UI.ADD_NOTIFICATION:
                return StateUtils.mergeState(state, {
                    notifications: [...state.notifications, {
                        id: Date.now(),
                        timestamp: new Date().toISOString(),
                        ...action.payload
                    }]
                });
                
            case ActionTypes.UI.REMOVE_NOTIFICATION:
                return StateUtils.mergeState(state, {
                    notifications: state.notifications.filter(n => n.id !== action.payload)
                });
                
            case ActionTypes.UI.OPEN_MODAL:
                return StateUtils.mergeState(state, {
                    modals: {
                        ...state.modals,
                        [action.payload]: true
                    }
                });
                
            case ActionTypes.UI.CLOSE_MODAL:
                return StateUtils.mergeState(state, {
                    modals: {
                        ...state.modals,
                        [action.payload]: false
                    }
                });
                
            default:
                return state;
        }
    },

    /**
     * 注册表状态Reducer
     */
    registry(state, action) {
        switch (action.type) {
            case ActionTypes.REGISTRY.SET_PROJECTS:
                return StateUtils.mergeState(state, {
                    projects: action.payload
                });
                
            case ActionTypes.REGISTRY.ADD_PROJECT:
                return StateUtils.mergeState(state, {
                    projects: [...state.projects, action.payload]
                });
                
            case ActionTypes.REGISTRY.UPDATE_PROJECT:
                return StateUtils.mergeState(state, {
                    projects: state.projects.map(p => 
                        p.id === action.payload.id ? { ...p, ...action.payload } : p
                    )
                });
                
            case ActionTypes.REGISTRY.REMOVE_PROJECT:
                return StateUtils.mergeState(state, {
                    projects: state.projects.filter(p => p.id !== action.payload)
                });
                
            case ActionTypes.REGISTRY.SET_QUERY_RESULTS:
                return StateUtils.mergeState(state, {
                    query: {
                        results: action.payload.results,
                        totalCount: action.payload.totalCount,
                        lastQuery: action.payload.query
                    }
                });
                
            case ActionTypes.REGISTRY.SET_QUERY_LOADING:
                return StateUtils.mergeState(state, {
                    query: { isLoading: action.payload }
                });
                
            default:
                return state;
        }
    },

    /**
     * 系统状态Reducer
     */
    system(state, action) {
        switch (action.type) {
            case ActionTypes.SYSTEM.SET_INITIALIZED:
                return StateUtils.mergeState(state, {
                    initialization: {
                        isInitialized: action.payload,
                        initEndTime: action.payload ? new Date().toISOString() : null
                    }
                });
                
            case ActionTypes.SYSTEM.ADD_LOADED_MODULE:
                return StateUtils.mergeState(state, {
                    initialization: {
                        loadedModules: [...state.initialization.loadedModules, action.payload]
                    }
                });
                
            case ActionTypes.SYSTEM.ADD_FAILED_MODULE:
                return StateUtils.mergeState(state, {
                    initialization: {
                        failedModules: [...state.initialization.failedModules, action.payload]
                    }
                });
                
            case ActionTypes.SYSTEM.SET_STORAGE_MODE:
                return StateUtils.mergeState(state, {
                    storage: { mode: action.payload }
                });
                
            case ActionTypes.SYSTEM.SET_STORAGE_HEALTH:
                return StateUtils.mergeState(state, {
                    storage: { isHealthy: action.payload }
                });
                
            case ActionTypes.SYSTEM.UPDATE_PERFORMANCE:
                return StateUtils.mergeState(state, {
                    performance: { ...state.performance, ...action.payload }
                });
                
            case ActionTypes.SYSTEM.ADD_ERROR:
                return StateUtils.mergeState(state, {
                    errors: {
                        count: state.errors.count + 1,
                        lastError: action.payload,
                        errorHistory: [...state.errors.errorHistory, {
                            timestamp: new Date().toISOString(),
                            ...action.payload
                        }].slice(-50) // 只保留最近50个错误
                    }
                });
                
            default:
                return state;
        }
    }
};

/**
 * Redux-like状态管理器
 */
export class StateManager {
    constructor(eventBus, standardEvents, initialState = null) {
        this.eventBus = eventBus;
        this.events = standardEvents;
        
        // 状态验证器
        this.validator = new StateValidator();
        
        // 初始化状态
        this.state = initialState || this.validator.createDefaultState();
        
        // 订阅者列表
        this.subscribers = new Set();
        
        // 中间件列表
        this.middlewares = [];
        
        // 历史记录
        this.history = [];
        this.maxHistorySize = 50;
        
        // 性能监控
        this.stats = {
            dispatches: 0,
            subscriptions: 0,
            errors: 0,
            startTime: Date.now()
        };
        
        // 调试模式
        this.debugMode = false;
        
        console.log('[StateManager] Redux-like状态管理器已创建');
        
        // 注册事件监听器
        this._registerEventListeners();
    }

    /**
     * 获取当前状态
     * @param {string} path - 状态路径（可选）
     * @returns {*} 状态值
     */
    getState(path = null) {
        if (!path) {
            return StateUtils.deepClone(this.state);
        }
        
        // 获取嵌套状态
        const value = path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, this.state);
        
        return StateUtils.deepClone(value);
    }

    /**
     * 分发Action
     * @param {Object} action - Action对象
     * @returns {Object} 新状态
     */
    dispatch(action) {
        if (!action || typeof action !== 'object' || !action.type) {
            throw new Error('[StateManager] Action必须是包含type属性的对象');
        }
        
        try {
            this.stats.dispatches++;
            
            if (this.debugMode) {
                console.log(`[StateManager] 分发Action: ${action.type}`, action);
            }
            
            // 记录历史
            this._recordHistory(action);
            
            // 执行中间件
            let processedAction = action;
            for (const middleware of this.middlewares) {
                processedAction = middleware(processedAction, this.state, this);
                if (!processedAction) break;
            }
            
            if (!processedAction) return this.state;
            
            // 计算新状态
            const newState = this._reduce(this.state, processedAction);
            
            // 验证新状态
            const validation = this.validator.validate(newState);
            if (!validation.isValid) {
                console.error('[StateManager] 状态验证失败:', validation.errors);
                this.stats.errors++;
                return this.state;
            }
            
            // 检查状态是否真的发生了变化
            const hasChanged = JSON.stringify(this.state) !== JSON.stringify(newState);
            
            if (hasChanged) {
                const oldState = this.state;
                this.state = newState;
                
                // 更新元数据
                this.state.meta.lastUpdated = new Date().toISOString();
                this.state.meta.stateSize = StateUtils.getStateSize(this.state);
                
                // 通知订阅者
                this._notifySubscribers(oldState, newState, processedAction);
                
                // 发布状态变更事件
                this._publishStateChangeEvent(oldState, newState, processedAction);
            }
            
            return this.state;
            
        } catch (error) {
            console.error('[StateManager] 分发Action失败:', error);
            this.stats.errors++;
            
            // 发布错误事件
            this.eventBus.emit(this.events.SYSTEM.ERROR, {
                source: 'StateManager',
                operation: 'dispatch',
                action: action.type,
                error: error.message
            });
            
            return this.state;
        }
    }

    /**
     * 订阅状态变化
     * @param {Function} callback - 回调函数
     * @param {string} path - 监听的状态路径（可选）
     * @returns {Function} 取消订阅函数
     */
    subscribe(callback, path = null) {
        if (typeof callback !== 'function') {
            throw new Error('[StateManager] 订阅回调必须是函数');
        }
        
        const subscription = {
            id: Date.now() + Math.random(),
            callback,
            path,
            createdAt: new Date().toISOString()
        };
        
        this.subscribers.add(subscription);
        this.stats.subscriptions++;
        
        if (this.debugMode) {
            console.log(`[StateManager] 新增订阅: ${path || 'root'}`, subscription.id);
        }
        
        // 返回取消订阅函数
        return () => {
            this.subscribers.delete(subscription);
            if (this.debugMode) {
                console.log(`[StateManager] 取消订阅: ${subscription.id}`);
            }
        };
    }

    /**
     * 添加中间件
     * @param {Function} middleware - 中间件函数
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('[StateManager] 中间件必须是函数');
        }
        
        this.middlewares.push(middleware);
        
        if (this.debugMode) {
            console.log('[StateManager] 添加中间件:', middleware.name || 'anonymous');
        }
    }

    /**
     * 开启/关闭调试模式
     * @param {boolean} enabled - 是否开启
     */
    setDebugMode(enabled) {
        this.debugMode = !!enabled;
        console.log(`[StateManager] 调试模式: ${this.debugMode ? '开启' : '关闭'}`);
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            subscribers: this.subscribers.size,
            middlewares: this.middlewares.length,
            historySize: this.history.length,
            stateSize: StateUtils.getStateSize(this.state),
            uptime: Date.now() - this.stats.startTime
        };
    }

    /**
     * 获取历史记录
     * @param {number} limit - 返回数量限制
     * @returns {Array} 历史记录
     */
    getHistory(limit = 20) {
        return this.history.slice(-limit);
    }

    /**
     * 清空历史记录
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * 重置状态
     */
    reset() {
        const oldState = this.state;
        this.state = this.validator.createDefaultState();
        
        // 通知订阅者
        this._notifySubscribers(oldState, this.state, { type: 'RESET' });
        
        // 发布重置事件
        this.eventBus.emit(this.events.SYSTEM.READY, {
            component: 'StateManager',
            action: 'reset',
            timestamp: Date.now()
        });
        
        console.log('[StateManager] 状态已重置');
    }

    // ==================== 私有方法 ====================

    /**
     * 执行Reducer
     * @private
     */
    _reduce(state, action) {
        const newState = StateUtils.deepClone(state);
        
        // 根据Action类型确定要更新的状态分支
        if (action.type.startsWith('MINDMAP_')) {
            newState.mindmap = Reducers.mindmap(newState.mindmap, action);
        } else if (action.type.startsWith('UI_')) {
            newState.ui = Reducers.ui(newState.ui, action);
        } else if (action.type.startsWith('REGISTRY_')) {
            newState.registry = Reducers.registry(newState.registry, action);
        } else if (action.type.startsWith('SYSTEM_')) {
            newState.system = Reducers.system(newState.system, action);
        }
        
        return newState;
    }

    /**
     * 通知订阅者
     * @private
     */
    _notifySubscribers(oldState, newState, action) {
        for (const subscription of this.subscribers) {
            try {
                if (subscription.path) {
                    // 检查指定路径的状态是否发生变化
                    const oldValue = this._getStateByPath(oldState, subscription.path);
                    const newValue = this._getStateByPath(newState, subscription.path);
                    
                    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                        subscription.callback(newValue, oldValue, action);
                    }
                } else {
                    // 全局状态订阅
                    subscription.callback(newState, oldState, action);
                }
            } catch (error) {
                console.error('[StateManager] 订阅者回调执行失败:', error);
                this.stats.errors++;
            }
        }
    }

    /**
     * 发布状态变更事件
     * @private
     */
    _publishStateChangeEvent(oldState, newState, action) {
        // 计算状态差异
        const changes = StateUtils.diffState(oldState, newState);
        
        // 发布通用状态变更事件
        this.eventBus.emit('state:changed', {
            action: action.type,
            changes,
            timestamp: Date.now()
        });
        
        // 发布特定的状态变更事件
        if (action.type.startsWith('MINDMAP_')) {
            this.eventBus.emit(this.events.MINDMAP.UPDATED, {
                action: action.type,
                state: newState.mindmap,
                changes: changes.filter(c => c.path.startsWith('mindmap'))
            });
        } else if (action.type.startsWith('UI_')) {
            this.eventBus.emit(this.events.UI.VIEW_CHANGED, {
                action: action.type,
                state: newState.ui,
                changes: changes.filter(c => c.path.startsWith('ui'))
            });
        } else if (action.type.startsWith('REGISTRY_')) {
            this.eventBus.emit(this.events.REGISTRY.CHANGED, {
                action: action.type,
                state: newState.registry,
                changes: changes.filter(c => c.path.startsWith('registry'))
            });
        }
    }

    /**
     * 根据路径获取状态
     * @private
     */
    _getStateByPath(state, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, state);
    }

    /**
     * 记录历史
     * @private
     */
    _recordHistory(action) {
        this.history.push({
            action,
            timestamp: new Date().toISOString(),
            stateSnapshot: this.debugMode ? StateUtils.deepClone(this.state) : null
        });
        
        // 限制历史记录大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * 注册事件监听器
     * @private
     */
    _registerEventListeners() {
        // 监听存储系统事件，自动更新系统状态
        this.eventBus.on(this.events.STORAGE.READY, (payload) => {
            this.dispatch({
                type: ActionTypes.SYSTEM.SET_STORAGE_MODE,
                payload: payload.mode
            });
        });
        
        // 监听存储错误事件
        this.eventBus.on(this.events.STORAGE.ERROR, (payload) => {
            this.dispatch({
                type: ActionTypes.SYSTEM.ADD_ERROR,
                payload: {
                    source: 'Storage',
                    error: payload.error,
                    phase: payload.phase
                }
            });
        });
        
        // 监听脑图事件
        this.eventBus.on(this.events.MINDMAP.SELECTION_CHANGED, (payload) => {
            this.dispatch({
                type: ActionTypes.MINDMAP.SET_SELECTED_NODE,
                payload: payload.selectedNodeId
            });
        });
    }
}

// 向后兼容：暴露到全局
if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
    window.ActionTypes = ActionTypes;
    window.Reducers = Reducers;
}

export default StateManager;
