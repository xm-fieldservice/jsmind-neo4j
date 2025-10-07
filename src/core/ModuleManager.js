/**
 * ModuleManager.js - 统一模块管理器
 * 整合了DependencyManager、ModuleLifecycleManager、ComponentLifecycle、
 * DependencyContainer、ComponentDependencyGraph的核心功能
 * 
 * 设计目标：
 * - 统一的模块注册和依赖管理
 * - 完整的生命周期管理
 * - 清晰的组件接口定义
 * - 高效的依赖解析和初始化
 */

class ModuleManager {
    constructor() {
        // 模块注册表
        this.modules = new Map();
        
        // 依赖关系图
        this.dependencies = new Map();
        
        // 生命周期状态
        this.lifecycleStates = new Map();
        
        // 依赖注入容器
        this.container = new Map();
        
        // 组件接口定义
        this.componentInterfaces = new Map();
        
        // 初始化状态
        this.initialized = false;
        
        console.log('[ModuleManager] 统一模块管理器初始化');
    }

    /**
     * 注册模块
     * @param {string} name - 模块名称
     * @param {Object} module - 模块实例或构造函数
     * @param {Array} dependencies - 依赖模块列表
     * @param {Object} options - 注册选项
     */
    async register(name, module, dependencies = [], options = {}) {
        if (this.modules.has(name)) {
            console.warn(`[ModuleManager] 模块 ${name} 已注册，跳过`);
            return false;
        }

        // 注册模块
        this.modules.set(name, {
            name,
            module,
            dependencies,
            options,
            registeredAt: Date.now()
        });

        // 记录依赖关系
        this.dependencies.set(name, dependencies);

        // 初始化生命周期状态
        this.lifecycleStates.set(name, {
            state: 'registered',
            timestamp: Date.now()
        });

        console.log(`[ModuleManager] 模块 ${name} 注册成功，依赖: [${dependencies.join(', ')}]`);
        return true;
    }

    /**
     * 注册单例服务（依赖注入）
     * @param {string} name - 服务名称
     * @param {Function} factory - 服务工厂函数
     */
    registerSingleton(name, factory) {
        if (this.container.has(name)) {
            console.warn(`[ModuleManager] 服务 ${name} 已注册`);
            return false;
        }

        this.container.set(name, {
            type: 'singleton',
            factory,
            instance: null
        });

        console.log(`[ModuleManager] 单例服务 ${name} 注册成功`);
        return true;
    }

    /**
     * 解析服务实例
     * @param {string} name - 服务名称
     */
    resolve(name) {
        const service = this.container.get(name);
        if (!service) {
            throw new Error(`[ModuleManager] 服务 ${name} 未注册`);
        }

        if (service.type === 'singleton') {
            if (!service.instance) {
                service.instance = service.factory();
            }
            return service.instance;
        }

        return service.factory();
    }

    /**
     * 初始化所有模块（按依赖顺序）
     */
    async initializeAll() {
        if (this.initialized) {
            console.warn('[ModuleManager] 模块已初始化，跳过');
            return;
        }

        console.log('[ModuleManager] 开始初始化所有模块...');

        // 拓扑排序获取初始化顺序
        const initOrder = this._topologicalSort();
        console.log(`[ModuleManager] 初始化顺序: [${initOrder.join(' → ')}]`);

        // 按顺序初始化
        for (const moduleName of initOrder) {
            await this._initializeModule(moduleName);
        }

        this.initialized = true;
        console.log('[ModuleManager] 所有模块初始化完成');
    }

    /**
     * 初始化单个模块
     * @param {string} name - 模块名称
     */
    async _initializeModule(name) {
        const moduleInfo = this.modules.get(name);
        if (!moduleInfo) {
            throw new Error(`[ModuleManager] 模块 ${name} 未注册`);
        }

        // 检查依赖是否已初始化
        for (const dep of moduleInfo.dependencies) {
            const depState = this.lifecycleStates.get(dep);
            if (!depState || depState.state !== 'initialized') {
                throw new Error(`[ModuleManager] 模块 ${name} 的依赖 ${dep} 未初始化`);
            }
        }

        // 更新状态为初始化中
        this.lifecycleStates.set(name, {
            state: 'initializing',
            timestamp: Date.now()
        });

        try {
            // 执行初始化
            const module = moduleInfo.module;
            if (typeof module.initialize === 'function') {
                await module.initialize();
            }

            // 更新状态为已初始化
            this.lifecycleStates.set(name, {
                state: 'initialized',
                timestamp: Date.now()
            });

            console.log(`[ModuleManager] 模块 ${name} 初始化成功`);
        } catch (error) {
            // 更新状态为初始化失败
            this.lifecycleStates.set(name, {
                state: 'failed',
                timestamp: Date.now(),
                error: error.message
            });

            console.error(`[ModuleManager] 模块 ${name} 初始化失败:`, error);
            throw error;
        }
    }

    /**
     * 拓扑排序（获取初始化顺序）
     */
    _topologicalSort() {
        const visited = new Set();
        const result = [];

        const visit = (name) => {
            if (visited.has(name)) return;

            const deps = this.dependencies.get(name) || [];
            for (const dep of deps) {
                visit(dep);
            }

            visited.add(name);
            result.push(name);
        };

        for (const name of this.modules.keys()) {
            visit(name);
        }

        return result;
    }

    /**
     * 检查循环依赖
     */
    checkCircularDependency() {
        const visiting = new Set();
        const visited = new Set();

        const visit = (name, path = []) => {
            if (visiting.has(name)) {
                throw new Error(`[ModuleManager] 检测到循环依赖: ${[...path, name].join(' → ')}`);
            }

            if (visited.has(name)) return;

            visiting.add(name);
            const deps = this.dependencies.get(name) || [];
            
            for (const dep of deps) {
                visit(dep, [...path, name]);
            }

            visiting.delete(name);
            visited.add(name);
        };

        for (const name of this.modules.keys()) {
            visit(name);
        }

        console.log('[ModuleManager] 循环依赖检查通过');
        return true;
    }

    /**
     * 获取模块状态
     * @param {string} name - 模块名称
     */
    getStatus(name) {
        if (!this.modules.has(name)) {
            return null;
        }

        return {
            registered: this.modules.has(name),
            state: this.lifecycleStates.get(name),
            dependencies: this.dependencies.get(name)
        };
    }

    /**
     * 获取所有模块状态
     */
    getAllStatus() {
        const status = {};
        for (const name of this.modules.keys()) {
            status[name] = this.getStatus(name);
        }
        return status;
    }

    /**
     * 获取健康状态
     */
    getHealthStatus() {
        const total = this.modules.size;
        let initialized = 0;
        let failed = 0;

        for (const state of this.lifecycleStates.values()) {
            if (state.state === 'initialized') initialized++;
            if (state.state === 'failed') failed++;
        }

        return {
            total,
            initialized,
            failed,
            pending: total - initialized - failed,
            healthy: failed === 0 && initialized === total
        };
    }

    /**
     * 检查模块是否已注册
     */
    isRegistered(name) {
        return this.modules.has(name);
    }

    /**
     * 检查模块是否已初始化
     */
    isInitialized(name) {
        const state = this.lifecycleStates.get(name);
        return state && state.state === 'initialized';
    }
}

// 导出单例
if (typeof window !== 'undefined') {
    window.ModuleManager = ModuleManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModuleManager;
}
