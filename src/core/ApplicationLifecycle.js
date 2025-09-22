/**
 * 应用生命周期管理器
 * 阶段2.3：实现应用启动/关闭流程管理
 * 基于组件生命周期管理器，提供完整的应用生命周期控制
 */

import { ComponentLifecycleState, ComponentPriority, ComponentType, IComponent } from './ComponentLifecycle.js';
import { ActionTypes } from './StateManager.js';

/**
 * 应用生命周期状态
 */
export const ApplicationState = {
    UNINITIALIZED: 'uninitialized',    // 未初始化
    INITIALIZING: 'initializing',      // 初始化中
    STARTING: 'starting',              // 启动中
    RUNNING: 'running',                // 运行中
    PAUSING: 'pausing',                // 暂停中
    PAUSED: 'paused',                  // 已暂停
    RESUMING: 'resuming',              // 恢复中
    STOPPING: 'stopping',              // 停止中
    STOPPED: 'stopped',                // 已停止
    ERROR: 'error'                     // 错误状态
};

/**
 * 启动阶段枚举
 */
export const StartupPhase = {
    BOOTSTRAP: 'bootstrap',            // 引导阶段
    CORE_SERVICES: 'core_services',    // 核心服务
    STORAGE: 'storage',                // 存储系统
    EVENT_SYSTEM: 'event_system',      // 事件系统
    STATE_MANAGEMENT: 'state_management', // 状态管理
    UI_FRAMEWORK: 'ui_framework',      // UI框架
    BUSINESS_LOGIC: 'business_logic',  // 业务逻辑
    FINALIZATION: 'finalization'       // 完成阶段
};

/**
 * 应用生命周期管理器
 */
export class ApplicationLifecycleManager {
    constructor(componentLifecycleManager, stateManager, eventBus, standardEvents) {
        this.componentManager = componentLifecycleManager;
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        this.events = standardEvents;
        
        // 应用状态
        this.applicationState = ApplicationState.UNINITIALIZED;
        this.currentPhase = null;
        this.error = null;
        
        // 启动配置
        this.startupConfig = {};
        this.shutdownConfig = {};
        
        // 阶段管理
        this.phases = new Map();
        this.phaseOrder = [];
        
        // 时间统计
        this.startupStartTime = null;
        this.startupEndTime = null;
        this.shutdownStartTime = null;
        this.shutdownEndTime = null;
        
        // 统计信息
        this.stats = {
            totalStartups: 0,
            totalShutdowns: 0,
            averageStartupTime: 0,
            averageShutdownTime: 0,
            failedStartups: 0,
            failedShutdowns: 0
        };
        
        console.log('[ApplicationLifecycle] 应用生命周期管理器已创建');
        
        this._initializePhases();
        this._setupEventListeners();
    }

    /**
     * 初始化启动阶段
     * @private
     */
    _initializePhases() {
        // 定义启动阶段及其组件
        this.phases.set(StartupPhase.BOOTSTRAP, {
            name: '引导阶段',
            components: [],
            parallel: false,
            timeout: 5000,
            critical: true
        });
        
        this.phases.set(StartupPhase.CORE_SERVICES, {
            name: '核心服务',
            components: ['StorageUtils', 'GlobalEventBus'],
            parallel: false,
            timeout: 10000,
            critical: true
        });
        
        this.phases.set(StartupPhase.STORAGE, {
            name: '存储系统',
            components: ['DataManager', 'PersistenceManager'],
            parallel: true,
            timeout: 15000,
            critical: true
        });
        
        this.phases.set(StartupPhase.EVENT_SYSTEM, {
            name: '事件系统',
            components: ['ComponentEventAdapters'],
            parallel: false,
            timeout: 5000,
            critical: true
        });
        
        this.phases.set(StartupPhase.STATE_MANAGEMENT, {
            name: '状态管理',
            components: ['StateManager', 'StatePersistence', 'GlobalMigrator'],
            parallel: true,
            timeout: 10000,
            critical: true
        });
        
        this.phases.set(StartupPhase.UI_FRAMEWORK, {
            name: 'UI框架',
            components: ['MindmapController', 'RelationFrontend', 'RegistryUI'],
            parallel: true,
            timeout: 20000,
            critical: false
        });
        
        this.phases.set(StartupPhase.BUSINESS_LOGIC, {
            name: '业务逻辑',
            components: ['ProjectManager', 'TaskManager', 'SearchEngine'],
            parallel: true,
            timeout: 15000,
            critical: false
        });
        
        this.phases.set(StartupPhase.FINALIZATION, {
            name: '完成阶段',
            components: [],
            parallel: false,
            timeout: 5000,
            critical: false
        });
        
        // 设置阶段顺序
        this.phaseOrder = [
            StartupPhase.BOOTSTRAP,
            StartupPhase.CORE_SERVICES,
            StartupPhase.STORAGE,
            StartupPhase.EVENT_SYSTEM,
            StartupPhase.STATE_MANAGEMENT,
            StartupPhase.UI_FRAMEWORK,
            StartupPhase.BUSINESS_LOGIC,
            StartupPhase.FINALIZATION
        ];
        
        console.log('[ApplicationLifecycle] 启动阶段已初始化:', this.phaseOrder);
    }

    /**
     * 设置事件监听器
     * @private
     */
    _setupEventListeners() {
        // 监听窗口关闭事件
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', (event) => {
                if (this.applicationState === ApplicationState.RUNNING) {
                    this.gracefulShutdown();
                    event.preventDefault();
                    event.returnValue = '应用正在关闭中...';
                }
            });
            
            // 监听页面隐藏事件（用于暂停）
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this.applicationState === ApplicationState.RUNNING) {
                    this.pause();
                } else if (!document.hidden && this.applicationState === ApplicationState.PAUSED) {
                    this.resume();
                }
            });
        }
        
        // 监听组件错误事件
        this.eventBus.on(this.events.COMPONENT.ERROR, (payload) => {
            this._handleComponentError(payload);
        });
        
        // 监听系统错误事件
        this.eventBus.on(this.events.SYSTEM.ERROR, (payload) => {
            this._handleSystemError(payload);
        });
    }

    /**
     * 启动应用
     * @param {Object} config - 启动配置
     * @returns {Promise<boolean>} 启动是否成功
     */
    async startup(config = {}) {
        if (this.applicationState !== ApplicationState.UNINITIALIZED && 
            this.applicationState !== ApplicationState.STOPPED) {
            console.warn('[ApplicationLifecycle] 应用已在运行或正在启动');
            return false;
        }
        
        this.startupConfig = { ...config };
        this.applicationState = ApplicationState.STARTING;
        this.startupStartTime = Date.now();
        this.stats.totalStartups++;
        
        console.log('[ApplicationLifecycle] 开始应用启动...');
        
        // 更新状态管理器
        this.stateManager.dispatch({
            type: ActionTypes.SYSTEM.SET_APPLICATION_STATE,
            payload: {
                state: this.applicationState,
                phase: null,
                startTime: this.startupStartTime
            }
        });
        
        // 发布启动开始事件
        this.eventBus.emit(this.events.SYSTEM.STARTUP_STARTED, {
            startTime: this.startupStartTime,
            config: this.startupConfig
        });
        
        try {
            // 按阶段启动
            for (const phaseId of this.phaseOrder) {
                const success = await this._executePhase(phaseId, 'startup');
                if (!success) {
                    const phase = this.phases.get(phaseId);
                    if (phase.critical) {
                        throw new Error(`关键阶段 ${phase.name} 启动失败`);
                    } else {
                        console.warn(`[ApplicationLifecycle] 非关键阶段 ${phase.name} 启动失败，继续执行`);
                    }
                }
            }
            
            // 启动成功
            this.applicationState = ApplicationState.RUNNING;
            this.startupEndTime = Date.now();
            this.currentPhase = null;
            this.error = null;
            
            const startupTime = this.startupEndTime - this.startupStartTime;
            this.stats.averageStartupTime = this._updateAverage(
                this.stats.averageStartupTime, 
                startupTime, 
                this.stats.totalStartups
            );
            
            console.log(`[ApplicationLifecycle] 应用启动成功，耗时 ${startupTime}ms`);
            
            // 更新状态管理器
            this.stateManager.dispatch({
                type: ActionTypes.SYSTEM.SET_APPLICATION_STATE,
                payload: {
                    state: this.applicationState,
                    phase: null,
                    endTime: this.startupEndTime,
                    duration: startupTime
                }
            });
            
            // 发布启动完成事件
            this.eventBus.emit(this.events.SYSTEM.STARTUP_COMPLETE, {
                startTime: this.startupStartTime,
                endTime: this.startupEndTime,
                duration: startupTime,
                stats: this.getStats()
            });
            
            return true;
            
        } catch (error) {
            // 启动失败
            this.applicationState = ApplicationState.ERROR;
            this.error = error.message;
            this.stats.failedStartups++;
            
            console.error('[ApplicationLifecycle] 应用启动失败:', error);
            
            // 更新状态管理器
            this.stateManager.dispatch({
                type: ActionTypes.SYSTEM.SET_APPLICATION_STATE,
                payload: {
                    state: this.applicationState,
                    error: this.error,
                    endTime: Date.now()
                }
            });
            
            // 发布启动失败事件
            this.eventBus.emit(this.events.SYSTEM.STARTUP_FAILED, {
                error: error.message,
                phase: this.currentPhase,
                duration: Date.now() - this.startupStartTime
            });
            
            // 尝试清理已启动的组件
            await this._emergencyCleanup();
            
            return false;
        }
    }

    /**
     * 优雅关闭应用
     * @param {Object} config - 关闭配置
     * @returns {Promise<boolean>} 关闭是否成功
     */
    async gracefulShutdown(config = {}) {
        if (this.applicationState !== ApplicationState.RUNNING && 
            this.applicationState !== ApplicationState.PAUSED) {
            console.warn('[ApplicationLifecycle] 应用未在运行状态');
            return false;
        }
        
        this.shutdownConfig = { ...config };
        this.applicationState = ApplicationState.STOPPING;
        this.shutdownStartTime = Date.now();
        this.stats.totalShutdowns++;
        
        console.log('[ApplicationLifecycle] 开始优雅关闭应用...');
        
        // 更新状态管理器
        this.stateManager.dispatch({
            type: ActionTypes.SYSTEM.SET_APPLICATION_STATE,
            payload: {
                state: this.applicationState,
                startTime: this.shutdownStartTime
            }
        });
        
        // 发布关闭开始事件
        this.eventBus.emit(this.events.SYSTEM.SHUTDOWN_STARTED, {
            startTime: this.shutdownStartTime,
            config: this.shutdownConfig
        });
        
        try {
            // 按逆序关闭阶段
            const reversePhaseOrder = [...this.phaseOrder].reverse();
            
            for (const phaseId of reversePhaseOrder) {
                const success = await this._executePhase(phaseId, 'shutdown');
                if (!success) {
                    const phase = this.phases.get(phaseId);
                    console.warn(`[ApplicationLifecycle] 阶段 ${phase.name} 关闭失败`);
                }
            }
            
            // 关闭成功
            this.applicationState = ApplicationState.STOPPED;
            this.shutdownEndTime = Date.now();
            this.currentPhase = null;
            this.error = null;
            
            const shutdownTime = this.shutdownEndTime - this.shutdownStartTime;
            this.stats.averageShutdownTime = this._updateAverage(
                this.stats.averageShutdownTime, 
                shutdownTime, 
                this.stats.totalShutdowns
            );
            
            console.log(`[ApplicationLifecycle] 应用关闭成功，耗时 ${shutdownTime}ms`);
            
            // 更新状态管理器
            this.stateManager.dispatch({
                type: ActionTypes.SYSTEM.SET_APPLICATION_STATE,
                payload: {
                    state: this.applicationState,
                    endTime: this.shutdownEndTime,
                    duration: shutdownTime
                }
            });
            
            // 发布关闭完成事件
            this.eventBus.emit(this.events.SYSTEM.SHUTDOWN_COMPLETE, {
                startTime: this.shutdownStartTime,
                endTime: this.shutdownEndTime,
                duration: shutdownTime,
                stats: this.getStats()
            });
            
            return true;
            
        } catch (error) {
            // 关闭失败
            this.applicationState = ApplicationState.ERROR;
            this.error = error.message;
            this.stats.failedShutdowns++;
            
            console.error('[ApplicationLifecycle] 应用关闭失败:', error);
            
            // 更新状态管理器
            this.stateManager.dispatch({
                type: ActionTypes.SYSTEM.SET_APPLICATION_STATE,
                payload: {
                    state: this.applicationState,
                    error: this.error,
                    endTime: Date.now()
                }
            });
            
            // 发布关闭失败事件
            this.eventBus.emit(this.events.SYSTEM.SHUTDOWN_FAILED, {
                error: error.message,
                phase: this.currentPhase,
                duration: Date.now() - this.shutdownStartTime
            });
            
            return false;
        }
    }

    /**
     * 暂停应用
     * @returns {Promise<boolean>} 暂停是否成功
     */
    async pause() {
        if (this.applicationState !== ApplicationState.RUNNING) {
            console.warn('[ApplicationLifecycle] 应用未在运行状态，无法暂停');
            return false;
        }
        
        this.applicationState = ApplicationState.PAUSING;
        
        console.log('[ApplicationLifecycle] 暂停应用...');
        
        try {
            // 暂停所有支持暂停的组件
            const runningComponents = this.componentManager.getRunningComponents();
            
            for (const componentName of runningComponents) {
                const component = this.componentManager.components.get(componentName);
                if (component && typeof component.pause === 'function') {
                    await component.pause();
                }
            }
            
            this.applicationState = ApplicationState.PAUSED;
            
            // 发布暂停事件
            this.eventBus.emit(this.events.SYSTEM.PAUSED, {
                timestamp: Date.now()
            });
            
            console.log('[ApplicationLifecycle] 应用已暂停');
            return true;
            
        } catch (error) {
            this.applicationState = ApplicationState.ERROR;
            this.error = error.message;
            
            console.error('[ApplicationLifecycle] 应用暂停失败:', error);
            return false;
        }
    }

    /**
     * 恢复应用
     * @returns {Promise<boolean>} 恢复是否成功
     */
    async resume() {
        if (this.applicationState !== ApplicationState.PAUSED) {
            console.warn('[ApplicationLifecycle] 应用未在暂停状态，无法恢复');
            return false;
        }
        
        this.applicationState = ApplicationState.RESUMING;
        
        console.log('[ApplicationLifecycle] 恢复应用...');
        
        try {
            // 恢复所有支持恢复的组件
            const pausedComponents = Array.from(this.componentManager.components.values())
                .filter(c => c.state === ComponentLifecycleState.PAUSED);
            
            for (const component of pausedComponents) {
                if (typeof component.resume === 'function') {
                    await component.resume();
                }
            }
            
            this.applicationState = ApplicationState.RUNNING;
            
            // 发布恢复事件
            this.eventBus.emit(this.events.SYSTEM.RESUMED, {
                timestamp: Date.now()
            });
            
            console.log('[ApplicationLifecycle] 应用已恢复');
            return true;
            
        } catch (error) {
            this.applicationState = ApplicationState.ERROR;
            this.error = error.message;
            
            console.error('[ApplicationLifecycle] 应用恢复失败:', error);
            return false;
        }
    }

    /**
     * 获取应用状态
     * @returns {Object} 应用状态信息
     */
    getApplicationState() {
        return {
            state: this.applicationState,
            phase: this.currentPhase,
            error: this.error,
            startupTime: this.startupStartTime,
            shutdownTime: this.shutdownStartTime,
            uptime: this.startupStartTime && this.applicationState === ApplicationState.RUNNING 
                ? Date.now() - this.startupStartTime : 0
        };
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            applicationState: this.getApplicationState(),
            componentStats: this.componentManager.getStats()
        };
    }

    /**
     * 健康检查
     * @returns {Object} 健康状态
     */
    healthCheck() {
        const componentHealth = this.componentManager.healthCheck();
        const applicationHealthy = this.applicationState === ApplicationState.RUNNING && 
                                 componentHealth.healthy;
        
        return {
            healthy: applicationHealthy,
            applicationState: this.applicationState,
            currentPhase: this.currentPhase,
            error: this.error,
            componentHealth,
            uptime: this.startupStartTime && this.applicationState === ApplicationState.RUNNING 
                ? Date.now() - this.startupStartTime : 0
        };
    }

    /**
     * 执行阶段
     * @private
     */
    async _executePhase(phaseId, operation) {
        const phase = this.phases.get(phaseId);
        if (!phase) {
            console.error(`[ApplicationLifecycle] 未知阶段: ${phaseId}`);
            return false;
        }
        
        this.currentPhase = phaseId;
        
        console.log(`[ApplicationLifecycle] 执行阶段: ${phase.name} (${operation})`);
        
        // 更新状态管理器
        this.stateManager.dispatch({
            type: ActionTypes.SYSTEM.SET_CURRENT_PHASE,
            payload: {
                phase: phaseId,
                operation,
                timestamp: Date.now()
            }
        });
        
        // 发布阶段开始事件
        this.eventBus.emit(this.events.SYSTEM.PHASE_STARTED, {
            phase: phaseId,
            name: phase.name,
            operation,
            components: phase.components
        });
        
        try {
            if (phase.components.length === 0) {
                // 空阶段，直接成功
                return true;
            }
            
            if (phase.parallel) {
                // 并行执行组件操作
                const promises = phase.components.map(componentName => 
                    this._executeComponentOperation(componentName, operation)
                );
                
                const results = await Promise.allSettled(promises);
                const failures = results.filter(r => r.status === 'rejected');
                
                if (failures.length > 0) {
                    console.warn(`[ApplicationLifecycle] 阶段 ${phase.name} 中有 ${failures.length} 个组件失败`);
                    return !phase.critical;
                }
            } else {
                // 串行执行组件操作
                for (const componentName of phase.components) {
                    const success = await this._executeComponentOperation(componentName, operation);
                    if (!success && phase.critical) {
                        return false;
                    }
                }
            }
            
            // 发布阶段完成事件
            this.eventBus.emit(this.events.SYSTEM.PHASE_COMPLETED, {
                phase: phaseId,
                name: phase.name,
                operation,
                success: true
            });
            
            return true;
            
        } catch (error) {
            console.error(`[ApplicationLifecycle] 阶段 ${phase.name} 执行失败:`, error);
            
            // 发布阶段失败事件
            this.eventBus.emit(this.events.SYSTEM.PHASE_FAILED, {
                phase: phaseId,
                name: phase.name,
                operation,
                error: error.message
            });
            
            return false;
        }
    }

    /**
     * 执行组件操作
     * @private
     */
    async _executeComponentOperation(componentName, operation) {
        try {
            switch (operation) {
                case 'startup':
                    const initSuccess = await this.componentManager.initialize(componentName);
                    if (!initSuccess) return false;
                    
                    return await this.componentManager.start(componentName);
                    
                case 'shutdown':
                    return await this.componentManager.stop(componentName);
                    
                default:
                    console.warn(`[ApplicationLifecycle] 未知操作: ${operation}`);
                    return false;
            }
        } catch (error) {
            console.error(`[ApplicationLifecycle] 组件 ${componentName} 操作 ${operation} 失败:`, error);
            return false;
        }
    }

    /**
     * 紧急清理
     * @private
     */
    async _emergencyCleanup() {
        console.log('[ApplicationLifecycle] 执行紧急清理...');
        
        try {
            // 停止所有运行中的组件
            const runningComponents = this.componentManager.getRunningComponents();
            
            for (const componentName of runningComponents) {
                try {
                    await this.componentManager.stop(componentName);
                } catch (error) {
                    console.error(`[ApplicationLifecycle] 紧急停止组件 ${componentName} 失败:`, error);
                }
            }
            
            console.log('[ApplicationLifecycle] 紧急清理完成');
        } catch (error) {
            console.error('[ApplicationLifecycle] 紧急清理失败:', error);
        }
    }

    /**
     * 处理组件错误
     * @private
     */
    _handleComponentError(payload) {
        console.error(`[ApplicationLifecycle] 组件错误: ${payload.component} - ${payload.error}`);
        
        // 如果是关键组件错误，可能需要重启应用
        const component = this.componentManager.components.get(payload.component);
        if (component && component.priority === ComponentPriority.CRITICAL) {
            console.warn('[ApplicationLifecycle] 关键组件错误，考虑重启应用');
            
            // 发布关键错误事件
            this.eventBus.emit(this.events.SYSTEM.CRITICAL_ERROR, {
                component: payload.component,
                error: payload.error,
                timestamp: Date.now()
            });
        }
    }

    /**
     * 处理系统错误
     * @private
     */
    _handleSystemError(payload) {
        console.error('[ApplicationLifecycle] 系统错误:', payload);
        
        this.applicationState = ApplicationState.ERROR;
        this.error = payload.error;
        
        // 更新状态管理器
        this.stateManager.dispatch({
            type: ActionTypes.SYSTEM.SET_APPLICATION_STATE,
            payload: {
                state: this.applicationState,
                error: this.error,
                timestamp: Date.now()
            }
        });
    }

    /**
     * 更新平均值
     * @private
     */
    _updateAverage(currentAverage, newValue, count) {
        return ((currentAverage * (count - 1)) + newValue) / count;
    }
}

// 向后兼容：暴露到全局
if (typeof window !== 'undefined') {
    window.ApplicationState = ApplicationState;
    window.StartupPhase = StartupPhase;
    window.ApplicationLifecycleManager = ApplicationLifecycleManager;
}

export default ApplicationLifecycleManager;
