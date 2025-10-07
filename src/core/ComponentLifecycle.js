/**
 * 组件生命周期管理系统
 * 阶段2.3：定义组件生命周期接口，实现统一的组件管理
 * 基于阶段2.2的状态管理系统，提供组件注册、初始化、销毁等生命周期管理
 * 
 * @deprecated 此组件已废弃，请使用 ModuleManager 替代
 * @see src/core/ModuleManager.js
 * @see docs/迁移指南-模块管理组件.md
 * 
 * 废弃时间: 2025-10-07
 * 移除计划: 3个版本后 (约3个月)
 */

import { ActionTypes } from './StateManager.js';

/**
 * 组件生命周期状态枚举
 */
export const ComponentLifecycleState = {
    UNREGISTERED: 'unregistered',    // 未注册
    REGISTERED: 'registered',        // 已注册
    INITIALIZING: 'initializing',    // 初始化中
    INITIALIZED: 'initialized',      // 已初始化
    STARTING: 'starting',           // 启动中
    RUNNING: 'running',             // 运行中
    PAUSING: 'pausing',             // 暂停中
    PAUSED: 'paused',               // 已暂停
    STOPPING: 'stopping',           // 停止中
    STOPPED: 'stopped',             // 已停止
    DESTROYING: 'destroying',        // 销毁中
    DESTROYED: 'destroyed',          // 已销毁
    ERROR: 'error'                   // 错误状态
};

/**
 * 组件优先级枚举
 */
export const ComponentPriority = {
    CRITICAL: 0,    // 关键组件（存储、事件系统）
    HIGH: 1,        // 高优先级（状态管理、脑图控制器）
    NORMAL: 2,      // 普通优先级（UI组件、适配器）
    LOW: 3,         // 低优先级（辅助工具、调试组件）
    BACKGROUND: 4   // 后台组件（监控、统计）
};

/**
 * 组件类型枚举
 */
export const ComponentType = {
    CORE: 'core',           // 核心组件
    UI: 'ui',               // UI组件
    SERVICE: 'service',     // 服务组件
    ADAPTER: 'adapter',     // 适配器组件
    TOOL: 'tool',           // 工具组件
    PLUGIN: 'plugin'        // 插件组件
};

/**
 * 组件生命周期接口
 * 所有组件都应该实现这个接口
 */
export class IComponent {
    constructor(name, type = ComponentType.CORE, priority = ComponentPriority.NORMAL) {
        this.name = name;
        this.type = type;
        this.priority = priority;
        this.state = ComponentLifecycleState.UNREGISTERED;
        this.dependencies = [];
        this.dependents = [];
        this.metadata = {};
        this.error = null;
        this.startTime = null;
        this.endTime = null;
    }

    /**
     * 组件初始化
     * @param {Object} config - 配置参数
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initialize(config = {}) {
        throw new Error(`Component ${this.name} must implement initialize() method`);
    }

    /**
     * 组件启动
     * @returns {Promise<boolean>} 启动是否成功
     */
    async start() {
        throw new Error(`Component ${this.name} must implement start() method`);
    }

    /**
     * 组件停止
     * @returns {Promise<boolean>} 停止是否成功
     */
    async stop() {
        throw new Error(`Component ${this.name} must implement stop() method`);
    }

    /**
     * 组件销毁
     * @returns {Promise<boolean>} 销毁是否成功
     */
    async destroy() {
        throw new Error(`Component ${this.name} must implement destroy() method`);
    }

    /**
     * 健康检查
     * @returns {Object} 健康状态信息
     */
    healthCheck() {
        return {
            healthy: this.state === ComponentLifecycleState.RUNNING,
            state: this.state,
            error: this.error,
            uptime: this.startTime ? Date.now() - this.startTime : 0
        };
    }

    /**
     * 获取组件信息
     * @returns {Object} 组件信息
     */
    getInfo() {
        return {
            name: this.name,
            type: this.type,
            priority: this.priority,
            state: this.state,
            dependencies: this.dependencies.slice(),
            dependents: this.dependents.slice(),
            metadata: { ...this.metadata },
            error: this.error,
            startTime: this.startTime,
            endTime: this.endTime,
            uptime: this.startTime ? (this.endTime || Date.now()) - this.startTime : 0
        };
    }

    /**
     * 设置依赖关系
     * @param {string[]} dependencies - 依赖的组件名称列表
     */
    setDependencies(dependencies) {
        this.dependencies = [...dependencies];
    }

    /**
     * 添加依赖
     * @param {string} componentName - 依赖的组件名称
     */
    addDependency(componentName) {
        if (!this.dependencies.includes(componentName)) {
            this.dependencies.push(componentName);
        }
    }

    /**
     * 移除依赖
     * @param {string} componentName - 要移除的依赖组件名称
     */
    removeDependency(componentName) {
        const index = this.dependencies.indexOf(componentName);
        if (index > -1) {
            this.dependencies.splice(index, 1);
        }
    }

    /**
     * 设置元数据
     * @param {Object} metadata - 元数据对象
     */
    setMetadata(metadata) {
        this.metadata = { ...this.metadata, ...metadata };
    }

    /**
     * 获取元数据
     * @param {string} key - 元数据键名
     * @returns {*} 元数据值
     */
    getMetadata(key) {
        return key ? this.metadata[key] : { ...this.metadata };
    }
}

/**
 * 组件生命周期管理器
 */
export class ComponentLifecycleManager {
    constructor(stateManager, eventBus, standardEvents) {
        console.warn('[ComponentLifecycleManager] ⚠️ 此组件已废弃，请使用 ModuleManager 替代');
        console.warn('[ComponentLifecycleManager] 详见: docs/迁移指南-模块管理组件.md');
        
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        this.events = standardEvents;
        
        // 组件注册表
        this.components = new Map();
        
        // 依赖图
        this.dependencyGraph = new Map();
        
        // 启动序列缓存
        this.startupSequence = [];
        this.shutdownSequence = [];
        
        // 管理器状态
        this.isInitialized = false;
        this.isStarting = false;
        this.isStopping = false;
        
        // 统计信息
        this.stats = {
            totalComponents: 0,
            runningComponents: 0,
            failedComponents: 0,
            startupTime: 0,
            shutdownTime: 0
        };
        
        console.log('[ComponentLifecycle] 组件生命周期管理器已创建');
        
        this._setupEventListeners();
        this._initializeStateTracking();
    }

    /**
     * 设置事件监听器
     * @private
     */
    _setupEventListeners() {
        // 监听系统事件
        this.eventBus.on(this.events.SYSTEM.SHUTDOWN, () => {
            this.shutdownAll();
        });
        
        // 监听组件错误事件
        this.eventBus.on(this.events.SYSTEM.ERROR, (payload) => {
            if (payload.component) {
                this._handleComponentError(payload.component, payload.error);
            }
        });
    }

    /**
     * 初始化状态跟踪
     * @private
     */
    _initializeStateTracking() {
        // 在状态管理器中初始化组件状态
        this.stateManager.dispatch({
            type: ActionTypes.SYSTEM.INIT_COMPONENT_LIFECYCLE,
            payload: {
                components: {},
                dependencyGraph: {},
                startupSequence: [],
                shutdownSequence: [],
                stats: this.stats
            }
        });
    }

    /**
     * 注册组件
     * @param {IComponent} component - 要注册的组件
     * @returns {boolean} 注册是否成功
     */
    register(component) {
        if (!(component instanceof IComponent)) {
            console.error('[ComponentLifecycle] 组件必须继承IComponent接口');
            return false;
        }
        
        if (this.components.has(component.name)) {
            console.warn(`[ComponentLifecycle] 组件 ${component.name} 已存在，将覆盖`);
        }
        
        // 更新组件状态
        component.state = ComponentLifecycleState.REGISTERED;
        
        // 注册到本地映射
        this.components.set(component.name, component);
        
        // 构建依赖图
        this._updateDependencyGraph(component);
        
        // 更新状态管理器
        this.stateManager.dispatch({
            type: ActionTypes.SYSTEM.REGISTER_COMPONENT,
            payload: {
                name: component.name,
                info: component.getInfo()
            }
        });
        
        // 更新统计
        this.stats.totalComponents = this.components.size;
        
        console.log(`[ComponentLifecycle] 组件 ${component.name} 已注册`);
        
        // 发布组件注册事件
        this.eventBus.emit(this.events.COMPONENT.REGISTERED, {
            component: component.name,
            type: component.type,
            priority: component.priority
        });
        
        return true;
    }

    /**
     * 获取组件信息
     * @param {string} componentName - 组件名称
     * @returns {Object|null} 组件信息
     */
    getComponentInfo(componentName) {
        const component = this.components.get(componentName);
        return component ? component.getInfo() : null;
    }

    /**
     * 获取所有组件信息
     * @returns {Object} 所有组件信息
     */
    getAllComponents() {
        const result = {};
        for (const [name, component] of this.components) {
            result[name] = component.getInfo();
        }
        return result;
    }

    /**
     * 获取运行中的组件
     * @returns {string[]} 运行中的组件名称列表
     */
    getRunningComponents() {
        const running = [];
        for (const [name, component] of this.components) {
            if (component.state === ComponentLifecycleState.RUNNING) {
                running.push(name);
            }
        }
        return running;
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            totalComponents: this.components.size,
            runningComponents: this.getRunningComponents().length,
            isStarting: this.isStarting,
            isStopping: this.isStopping
        };
    }

    /**
     * 健康检查
     * @returns {Object} 系统健康状态
     */
    healthCheck() {
        const componentHealth = {};
        let healthyCount = 0;
        let totalCount = 0;
        
        for (const [name, component] of this.components) {
            const health = component.healthCheck();
            componentHealth[name] = health;
            
            if (health.healthy) {
                healthyCount++;
            }
            totalCount++;
        }
        
        const systemHealthy = healthyCount === totalCount && totalCount > 0;
        
        return {
            healthy: systemHealthy,
            healthyComponents: healthyCount,
            totalComponents: totalCount,
            healthRate: totalCount > 0 ? (healthyCount / totalCount * 100).toFixed(1) : 0,
            components: componentHealth,
            stats: this.getStats()
        };
    }

    /**
     * 更新依赖图
     * @private
     */
    _updateDependencyGraph(component) {
        this.dependencyGraph.set(component.name, {
            component: component,
            dependencies: [...component.dependencies],
            dependents: []
        });
        
        // 更新依赖关系
        for (const depName of component.dependencies) {
            const depNode = this.dependencyGraph.get(depName);
            if (depNode) {
                if (!depNode.dependents.includes(component.name)) {
                    depNode.dependents.push(component.name);
                }
            }
        }
    }

    /**
     * 处理组件错误
     * @private
     */
    _handleComponentError(componentName, error) {
        const component = this.components.get(componentName);
        if (component) {
            component.state = ComponentLifecycleState.ERROR;
            component.error = error;
            this.stats.failedComponents++;
            
            this._updateComponentState(component);
            
            console.error(`[ComponentLifecycle] 组件 ${componentName} 发生错误:`, error);
        }
    }

    /**
     * 更新组件状态到状态管理器
     * @private
     */
    _updateComponentState(component) {
        this.stateManager.dispatch({
            type: ActionTypes.SYSTEM.UPDATE_COMPONENT_STATE,
            payload: {
                name: component.name,
                state: component.state,
                error: component.error,
                startTime: component.startTime,
                endTime: component.endTime
            }
        });
    }
}

// 向后兼容：暴露到全局
if (typeof window !== 'undefined') {
    window.ComponentLifecycleState = ComponentLifecycleState;
    window.ComponentPriority = ComponentPriority;
    window.ComponentType = ComponentType;
    window.IComponent = IComponent;
    window.ComponentLifecycleManager = ComponentLifecycleManager;
}

export default ComponentLifecycleManager;
