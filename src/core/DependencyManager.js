/**
 * 依赖管理器 - 管理模块依赖关系和初始化顺序
 * 确保系统组件按正确顺序加载和初始化
 */

;(function(global) {
    'use strict';
    
    class DependencyManager {
        constructor() {
            this.dependencies = new Map();
            this.initialized = new Set();
            this.initializing = new Set();
            this.loadOrder = [];
            this.eventBus = null;
        }
        
        /**
         * 注册模块及其依赖关系
         * @param {string} name - 模块名称
         * @param {string[]} dependencies - 依赖的模块名称数组
         * @param {Function} factory - 模块初始化工厂函数
         * @param {Object} options - 选项
         */
        register(name, dependencies = [], factory = null, options = {}) {
            if (this.dependencies.has(name)) {
                console.warn(`[DependencyManager] 模块 ${name} 已注册，将被覆盖`);
            }
            
            this.dependencies.set(name, {
                name,
                dependencies: Array.isArray(dependencies) ? dependencies : [],
                factory,
                options: {
                    timeout: 30000, // 默认30秒超时
                    required: true, // 是否必需
                    ...options
                },
                status: 'registered'
            });
            
            console.log(`[DependencyManager] 已注册模块: ${name}, 依赖: [${dependencies.join(', ')}]`);
        }
        
        /**
         * 异步初始化指定模块
         * @param {string} name - 模块名称
         * @returns {Promise<any>} 初始化结果
         */
        async initialize(name) {
            if (this.initialized.has(name)) {
                console.log(`[DependencyManager] 模块 ${name} 已初始化，跳过`);
                return this._getModuleInstance(name);
            }
            
            if (this.initializing.has(name)) {
                console.log(`[DependencyManager] 模块 ${name} 正在初始化，等待完成`);
                return this._waitForInitialization(name);
            }
            
            const module = this.dependencies.get(name);
            if (!module) {
                const error = new Error(`模块 ${name} 未注册`);
                this._emitEvent('dependency:error', { name, error });
                throw error;
            }
            
            this.initializing.add(name);
            module.status = 'initializing';
            
            try {
                // 检查循环依赖
                this._checkCircularDependency(name, new Set());
                
                // 初始化依赖
                await this._initializeDependencies(name);
                
                // 初始化模块本身
                const result = await this._initializeModule(module);
                
                this.initialized.add(name);
                this.initializing.delete(name);
                module.status = 'initialized';
                module.instance = result;
                
                this.loadOrder.push(name);
                
                console.log(`[DependencyManager] ✅ 模块 ${name} 初始化完成`);
                this._emitEvent('dependency:initialized', { name, instance: result });
                
                return result;
                
            } catch (error) {
                this.initializing.delete(name);
                module.status = 'error';
                module.error = error;
                
                console.error(`[DependencyManager] ❌ 模块 ${name} 初始化失败:`, error);
                this._emitEvent('dependency:error', { name, error });
                
                if (module.options.required) {
                    throw error;
                } else {
                    console.warn(`[DependencyManager] 非必需模块 ${name} 初始化失败，继续执行`);
                    return null;
                }
            }
        }
        
        /**
         * 批量初始化所有已注册的模块
         * @returns {Promise<Object>} 初始化结果映射
         */
        async initializeAll() {
            console.log('[DependencyManager] 开始批量初始化所有模块');
            
            const results = {};
            const modules = Array.from(this.dependencies.keys());
            
            // 按依赖顺序排序
            const sortedModules = this._topologicalSort();
            
            for (const moduleName of sortedModules) {
                try {
                    results[moduleName] = await this.initialize(moduleName);
                } catch (error) {
                    console.error(`[DependencyManager] 模块 ${moduleName} 初始化失败，跳过`);
                    results[moduleName] = null;
                }
            }
            
            console.log(`[DependencyManager] 批量初始化完成，成功: ${Object.keys(results).filter(k => results[k] !== null).length}/${modules.length}`);
            this._emitEvent('dependency:all_initialized', { results, loadOrder: this.loadOrder });
            
            return results;
        }
        
        /**
         * 检查模块状态
         * @param {string} name - 模块名称
         * @returns {Object} 状态信息
         */
        getStatus(name) {
            const module = this.dependencies.get(name);
            if (!module) {
                return { status: 'not_registered' };
            }
            
            return {
                status: module.status,
                initialized: this.initialized.has(name),
                initializing: this.initializing.has(name),
                dependencies: module.dependencies,
                error: module.error
            };
        }
        
        /**
         * 获取所有模块状态
         * @returns {Object} 状态映射
         */
        getAllStatus() {
            const status = {};
            for (const [name] of this.dependencies) {
                status[name] = this.getStatus(name);
            }
            return status;
        }
        
        /**
         * 获取依赖图
         * @returns {Object} 依赖关系图
         */
        getDependencyGraph() {
            const graph = {};
            for (const [name, module] of this.dependencies) {
                graph[name] = {
                    dependencies: module.dependencies,
                    dependents: this._getDependents(name),
                    status: module.status
                };
            }
            return graph;
        }
        
        /**
         * 设置事件总线
         * @param {Object} eventBus - 事件总线实例
         */
        setEventBus(eventBus) {
            this.eventBus = eventBus;
        }
        
        // 私有方法
        
        async _initializeDependencies(name) {
            const module = this.dependencies.get(name);
            for (const depName of module.dependencies) {
                await this.initialize(depName);
            }
        }
        
        async _initializeModule(module) {
            if (typeof module.factory === 'function') {
                const startTime = Date.now();
                
                // 设置超时
                const timeout = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`模块 ${module.name} 初始化超时`)), module.options.timeout);
                });
                
                const init = Promise.resolve(module.factory());
                
                const result = await Promise.race([init, timeout]);
                
                const duration = Date.now() - startTime;
                console.log(`[DependencyManager] 模块 ${module.name} 初始化耗时: ${duration}ms`);
                
                return result;
            } else {
                // 如果没有工厂函数，检查全局对象是否存在
                const globalInstance = this._getGlobalInstance(module.name);
                if (globalInstance) {
                    return globalInstance;
                } else {
                    throw new Error(`模块 ${module.name} 没有工厂函数且全局实例不存在`);
                }
            }
        }
        
        _getGlobalInstance(name) {
            // 尝试从全局对象获取实例
            const candidates = [
                global[name],
                global[`window.${name}`],
                global[name.charAt(0).toUpperCase() + name.slice(1)],
                global[name.toLowerCase()]
            ];
            
            return candidates.find(candidate => candidate !== undefined);
        }
        
        _getModuleInstance(name) {
            const module = this.dependencies.get(name);
            return module ? module.instance : null;
        }
        
        async _waitForInitialization(name) {
            return new Promise((resolve, reject) => {
                const checkInterval = setInterval(() => {
                    if (this.initialized.has(name)) {
                        clearInterval(checkInterval);
                        resolve(this._getModuleInstance(name));
                    } else if (!this.initializing.has(name)) {
                        clearInterval(checkInterval);
                        reject(new Error(`模块 ${name} 初始化失败`));
                    }
                }, 100);
                
                // 超时保护
                setTimeout(() => {
                    clearInterval(checkInterval);
                    reject(new Error(`等待模块 ${name} 初始化超时`));
                }, 30000);
            });
        }
        
        _checkCircularDependency(name, visiting) {
            if (visiting.has(name)) {
                const cycle = Array.from(visiting).join(' -> ') + ' -> ' + name;
                throw new Error(`检测到循环依赖: ${cycle}`);
            }
            
            visiting.add(name);
            
            const module = this.dependencies.get(name);
            if (module) {
                for (const depName of module.dependencies) {
                    this._checkCircularDependency(depName, new Set(visiting));
                }
            }
            
            visiting.delete(name);
        }
        
        _topologicalSort() {
            const visited = new Set();
            const visiting = new Set();
            const result = [];
            
            const visit = (name) => {
                if (visiting.has(name)) {
                    throw new Error(`循环依赖检测: ${name}`);
                }
                if (visited.has(name)) {
                    return;
                }
                
                visiting.add(name);
                
                const module = this.dependencies.get(name);
                if (module) {
                    for (const depName of module.dependencies) {
                        visit(depName);
                    }
                }
                
                visiting.delete(name);
                visited.add(name);
                result.push(name);
            };
            
            for (const [name] of this.dependencies) {
                visit(name);
            }
            
            return result;
        }
        
        _getDependents(name) {
            const dependents = [];
            for (const [moduleName, module] of this.dependencies) {
                if (module.dependencies.includes(name)) {
                    dependents.push(moduleName);
                }
            }
            return dependents;
        }
        
        _emitEvent(eventName, data) {
            try {
                if (this.eventBus && typeof this.eventBus.emit === 'function') {
                    this.eventBus.emit(eventName, data);
                } else if (global.AutogenEventBus && typeof global.AutogenEventBus.emit === 'function') {
                    global.AutogenEventBus.emit(eventName, data);
                }
            } catch (error) {
                console.warn(`[DependencyManager] 发送事件失败: ${eventName}`, error);
            }
        }
    }
    
    // 创建全局实例
    global.DependencyManager = global.DependencyManager || new DependencyManager();
    
    // 注册核心模块依赖关系
    const dm = global.DependencyManager;
    
    // 注册核心模块
    dm.register('AutogenUnifiedStorage', [], () => {
        return global.AutogenUnifiedStorage;
    }, { required: true });
    
    dm.register('AutogenEventBus', [], () => {
        return global.AutogenEventBus;
    }, { required: true });
    
    // dm.register('StorageMigrationTool', ['AutogenUnifiedStorage'], () => {
    //     return global.StorageMigrationTool;
    // }, { required: false }); // 迁移完成，已删除
    
    dm.register('Registry', ['AutogenUnifiedStorage', 'AutogenEventBus'], () => {
        return global.Registry;
    }, { required: true });
    
    dm.register('MindmapController', ['AutogenUnifiedStorage', 'AutogenEventBus'], () => {
        return global.mindmapController;
    }, { required: true });
    
    console.log('[DependencyManager] 已注册核心模块依赖关系');
    
})(window || this);
