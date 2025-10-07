/**
 * 程序员 - P1.1 依赖注入容器
 * 
 * 基于P0成功经验，创建轻量级依赖注入系统
 * 减少全局变量依赖，提升模块化程度
 * 
 * @deprecated 此组件已废弃，请使用 ModuleManager 替代
 * @see src/core/ModuleManager.js
 * @see docs/迁移指南-模块管理组件.md
 * 
 * 废弃时间: 2025-10-07
 * 移除计划: 3个版本后 (约3个月)
 */

class DependencyContainer {
    constructor() {
        console.warn('[DependencyContainer] ⚠️ 此组件已废弃，请使用 ModuleManager 替代');
        console.warn('[DependencyContainer] 详见: docs/迁移指南-模块管理组件.md');
        
        this.services = new Map();
        this.singletons = new Map();
        this.factories = new Map();
        this.initialized = false;
        
        console.log('[DependencyContainer] 依赖注入容器初始化');
    }
    
    /**
     * 注册单例服务
     */
    registerSingleton(name, factory) {
        this.factories.set(name, {
            type: 'singleton',
            factory: factory,
            instance: null
        });
        return this;
    }
    
    /**
     * 注册瞬态服务
     */
    registerTransient(name, factory) {
        this.factories.set(name, {
            type: 'transient',
            factory: factory
        });
        return this;
    }
    
    /**
     * 注册实例
     */
    registerInstance(name, instance) {
        this.services.set(name, instance);
        return this;
    }
    
    /**
     * 解析服务
     */
    resolve(name) {
        // 1. 检查已注册的实例
        if (this.services.has(name)) {
            return this.services.get(name);
        }
        
        // 2. 检查工厂注册
        if (this.factories.has(name)) {
            const registration = this.factories.get(name);
            
            if (registration.type === 'singleton') {
                if (!registration.instance) {
                    registration.instance = registration.factory(this);
                }
                return registration.instance;
            } else {
                return registration.factory(this);
            }
        }
        
        // 3. 尝试从全局对象解析（向后兼容）
        if (typeof window !== 'undefined' && window[name]) {
            console.warn(`[DependencyContainer] 从全局对象解析 ${name}，建议注册到容器中`);
            return window[name];
        }
        
        throw new Error(`[DependencyContainer] 无法解析依赖: ${name}`);
    }
    
    /**
     * 检查服务是否已注册
     */
    has(name) {
        return this.services.has(name) || this.factories.has(name) || (typeof window !== 'undefined' && !!window[name]);
    }
    
    /**
     * 初始化核心服务
     */
    initializeCoreServices() {
        try {
            // 注册统一存储服务
            this.registerSingleton('storage', (container) => {
                if (window.UnifiedStorageService) {
                    const service = new window.UnifiedStorageService(container);
                    return service;
                }
                // 回退到原始存储
                if (window.AutogenUnifiedStorage) {
                    return window.AutogenUnifiedStorage;
                }
                throw new Error('存储服务不可用');
            });
            
            // 注册事件总线
            this.registerSingleton('eventBus', (container) => {
                if (window.AutogenEventBus) {
                    return window.AutogenEventBus;
                }
                throw new Error('AutogenEventBus not available');
            });
            
            // 注册日志服务
            this.registerSingleton('logger', (container) => {
                return {
                    log: (...args) => console.log('[App]', ...args),
                    warn: (...args) => console.warn('[App]', ...args),
                    error: (...args) => console.error('[App]', ...args),
                    info: (...args) => console.info('[App]', ...args)
                };
            });
            
            // 注册业务模块工厂
            this.registerTransient('nodeManager', (container) => {
                if (window.MindmapNodeManager) {
                    return new window.MindmapNodeManager({
                        eventBus: container.resolve('eventBus'),
                        logger: container.resolve('logger')
                    });
                }
                return null;
            });
            
            this.registerTransient('stateManager', (container) => {
                if (window.MindmapStateManager) {
                    return new window.MindmapStateManager({
                        eventBus: container.resolve('eventBus'),
                        logger: container.resolve('logger')
                    });
                }
                return null;
            });
            
            this.registerTransient('syncManager', (container) => {
                if (window.MindmapSyncManager) {
                    return new window.MindmapSyncManager({
                        eventBus: container.resolve('eventBus'),
                        logger: container.resolve('logger')
                    });
                }
                return null;
            });
            
            this.initialized = true;
            console.log('[DependencyContainer] ✅ 核心服务注册完成');
            
        } catch (error) {
            console.error('[DependencyContainer] 核心服务初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 创建服务作用域
     */
    createScope() {
        const scope = new DependencyContainer();
        
        // 继承父容器的注册
        for (const [name, registration] of this.factories) {
            scope.factories.set(name, registration);
        }
        
        for (const [name, instance] of this.services) {
            scope.services.set(name, instance);
        }
        
        return scope;
    }
    
    /**
     * 获取容器状态
     */
    getStatus() {
        return {
            initialized: this.initialized,
            servicesCount: this.services.size,
            factoriesCount: this.factories.size,
            registeredServices: Array.from(this.services.keys()),
            registeredFactories: Array.from(this.factories.keys())
        };
    }
    
    /**
     * 销毁容器
     */
    dispose() {
        // 销毁单例实例
        for (const registration of this.factories.values()) {
            if (registration.type === 'singleton' && registration.instance) {
                if (typeof registration.instance.dispose === 'function') {
                    registration.instance.dispose();
                }
            }
        }
        
        this.services.clear();
        this.factories.clear();
        this.initialized = false;
        
        console.log('[DependencyContainer] 容器已销毁');
    }
}

// 创建全局容器实例
const globalContainer = new DependencyContainer();

// 全局导出
window.DependencyContainer = DependencyContainer;
window.GlobalDependencyContainer = globalContainer;

console.log('[DependencyContainer] 依赖注入容器类已加载');
