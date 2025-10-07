/**
 * 统一模块生命周期管理器 - 解决模块初始化顺序和依赖问题
 * 
 * @deprecated 此组件已废弃，请使用 ModuleManager 替代
 * @see src/core/ModuleManager.js
 * 
 * 迁移指南:
 * - 使用 ModuleManager.register() 替代 registerModule()
 * - 使用 ModuleManager.initializeAll() 替代 initialize()
 * - 使用 ModuleManager.getStatus() 替代 getModuleState()
 * 
 * 废弃时间: 2025-10-07
 * 移除计划: 3个版本后 (约3个月)
 */

;(function(global) {
    'use strict';
    
    class ModuleLifecycleManager {
        constructor() {
            console.warn('[ModuleLifecycleManager] ⚠️ 此组件已废弃，请使用 ModuleManager 替代');
            console.warn('[ModuleLifecycleManager] 详见: docs/迁移指南-模块管理组件.md');
            
            // 模块注册表
            this.modules = new Map();
            this.moduleStates = new Map();
            this.dependencyGraph = new Map();
            
            // 初始化状态
            this.isInitialized = false;
            this.initializationPromise = null;
            
            // 生命周期阶段
            this.phases = {
                REGISTERED: 'registered',
                INITIALIZING: 'initializing', 
                INITIALIZED: 'initialized',
                READY: 'ready',
                ERROR: 'error'
            };
            
            console.log('[ModuleLifecycleManager] 模块生命周期管理器初始化');
        }
        
        /**
         * 注册模块
         */
        registerModule(name, moduleFactory, dependencies = []) {
            if (this.modules.has(name)) {
                console.warn(`[ModuleLifecycleManager] 模块 ${name} 已存在，跳过注册`);
                return;
            }
            
            this.modules.set(name, {
                name,
                factory: moduleFactory,
                dependencies,
                instance: null,
                registeredAt: Date.now()
            });
            
            this.moduleStates.set(name, this.phases.REGISTERED);
            this.dependencyGraph.set(name, dependencies);
            
            console.log(`[ModuleLifecycleManager] 模块 ${name} 注册成功`, {
                dependencies,
                totalModules: this.modules.size
            });
        }
        
        /**
         * 获取模块初始化顺序
         */
        _getInitializationOrder() {
            const visited = new Set();
            const visiting = new Set();
            const order = [];
            
            const visit = (moduleName) => {
                if (visiting.has(moduleName)) {
                    throw new Error(`[ModuleLifecycleManager] 检测到循环依赖: ${moduleName}`);
                }
                
                if (visited.has(moduleName)) {
                    return;
                }
                
                visiting.add(moduleName);
                
                const dependencies = this.dependencyGraph.get(moduleName) || [];
                for (const dep of dependencies) {
                    if (!this.modules.has(dep)) {
                        throw new Error(`[ModuleLifecycleManager] 依赖模块不存在: ${dep} (被 ${moduleName} 依赖)`);
                    }
                    visit(dep);
                }
                
                visiting.delete(moduleName);
                visited.add(moduleName);
                order.push(moduleName);
            };
            
            // 访问所有模块
            for (const moduleName of this.modules.keys()) {
                visit(moduleName);
            }
            
            return order;
        }
        
        /**
         * 初始化单个模块
         */
        async _initializeModule(name) {
            const moduleInfo = this.modules.get(name);
            if (!moduleInfo) {
                throw new Error(`[ModuleLifecycleManager] 模块不存在: ${name}`);
            }
            
            const currentState = this.moduleStates.get(name);
            if (currentState === this.phases.INITIALIZED || currentState === this.phases.READY) {
                return moduleInfo.instance;
            }
            
            try {
                this.moduleStates.set(name, this.phases.INITIALIZING);
                console.log(`[ModuleLifecycleManager] 初始化模块: ${name}`);
                
                // 检查依赖是否已初始化
                for (const dep of moduleInfo.dependencies) {
                    const depState = this.moduleStates.get(dep);
                    if (depState !== this.phases.INITIALIZED && depState !== this.phases.READY) {
                        throw new Error(`[ModuleLifecycleManager] 依赖模块 ${dep} 未初始化`);
                    }
                }
                
                // 执行模块工厂函数
                const instance = await moduleInfo.factory();
                moduleInfo.instance = instance;
                
                this.moduleStates.set(name, this.phases.INITIALIZED);
                console.log(`[ModuleLifecycleManager] 模块 ${name} 初始化完成`);
                
                return instance;
                
            } catch (error) {
                this.moduleStates.set(name, this.phases.ERROR);
                console.error(`[ModuleLifecycleManager] 模块 ${name} 初始化失败:`, error);
                throw error;
            }
        }
        
        /**
         * 初始化所有模块
         */
        async initializeAll() {
            if (this.isInitialized) {
                return this.initializationPromise;
            }
            
            this.initializationPromise = this._performInitialization();
            return this.initializationPromise;
        }
        
        async _performInitialization() {
            try {
                console.log('[ModuleLifecycleManager] 开始初始化所有模块');
                
                // 获取初始化顺序
                const initOrder = this._getInitializationOrder();
                console.log('[ModuleLifecycleManager] 模块初始化顺序:', initOrder);
                
                // 按顺序初始化模块
                for (const moduleName of initOrder) {
                    await this._initializeModule(moduleName);
                }
                
                // 标记所有模块为就绪状态
                for (const moduleName of this.modules.keys()) {
                    if (this.moduleStates.get(moduleName) === this.phases.INITIALIZED) {
                        this.moduleStates.set(moduleName, this.phases.READY);
                    }
                }
                
                this.isInitialized = true;
                console.log('[ModuleLifecycleManager] 所有模块初始化完成');
                
                // 触发初始化完成事件
                if (global.AutogenEventBus) {
                    global.AutogenEventBus.emit('system:modules:initialized', {
                        totalModules: this.modules.size,
                        initOrder
                    });
                }
                
                return true;
                
            } catch (error) {
                console.error('[ModuleLifecycleManager] 模块初始化失败:', error);
                throw error;
            }
        }
        
        /**
         * 获取模块实例
         */
        getModule(name) {
            const moduleInfo = this.modules.get(name);
            if (!moduleInfo) {
                throw new Error(`[ModuleLifecycleManager] 模块不存在: ${name}`);
            }
            
            const state = this.moduleStates.get(name);
            if (state !== this.phases.READY && state !== this.phases.INITIALIZED) {
                throw new Error(`[ModuleLifecycleManager] 模块 ${name} 未就绪，当前状态: ${state}`);
            }
            
            return moduleInfo.instance;
        }
        
        /**
         * 获取模块状态
         */
        getModuleState(name) {
            return this.moduleStates.get(name) || 'unknown';
        }
        
        /**
         * 获取所有模块状态
         */
        getAllModuleStates() {
            const states = {};
            for (const [name, state] of this.moduleStates) {
                states[name] = state;
            }
            return states;
        }
        
        /**
         * 健康检查
         */
        healthCheck() {
            const states = this.getAllModuleStates();
            const total = Object.keys(states).length;
            const ready = Object.values(states).filter(s => s === this.phases.READY).length;
            const errors = Object.values(states).filter(s => s === this.phases.ERROR).length;
            
            return {
                healthy: errors === 0 && ready === total,
                total,
                ready,
                errors,
                states,
                readyPercentage: total > 0 ? Math.round((ready / total) * 100) : 0
            };
        }
    }
    
    // 创建全局单例
    const moduleLifecycleManager = new ModuleLifecycleManager();
    
    // 全局导出
    global.ModuleLifecycleManager = moduleLifecycleManager;
    
    // 模块导出
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { ModuleLifecycleManager, moduleLifecycleManager };
    }
    
})(typeof window !== 'undefined' ? window : global);
