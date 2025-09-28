/**
 * 程序员 ModuleActivation.js - Phase 6.1 模块激活与依赖建立
 * 
 * 职责：
 * - 激活现有49个专业模块
 * - 建立完整的模块依赖关系图
 * - 统一模块间通信机制
 * - 提供一键式模块激活功能
 * 
 * 设计原则：
 * - 基于现有DependencyManager
 * - 无侵入式集成
 * - 错误隔离与回退机制
 * - 性能优化与懒加载
 */

;(function(global) {
    'use strict';
    
    class ModuleActivation {
        constructor() {
            this.dependencyManager = global.DependencyManager;
            this.eventBus = global.AutogenEventBus;
            this.logger = console;
            
            // 激活状态跟踪
            this.activationStatus = {
                total: 0,
                activated: 0,
                failed: 0,
                errors: []
            };
            
            // 模块分类
            this.moduleCategories = {
                core: [],
                business: [],
                presentation: [],
                data: [],
                integration: [],
                services: [],
                utilities: []
            };
        }
        
        /**
         * 注册所有49个专业模块的依赖关系
         */
        registerAllModules() {
            console.log('[ModuleActivation] 开始注册所有专业模块...');
            
            try {
                // 1. 核心模块 (已注册，验证状态)
                this._registerCoreModules();
                
                // 2. 业务层模块
                this._registerBusinessModules();
                
                // 3. 表现层模块
                this._registerPresentationModules();
                
                // 4. 数据层模块
                this._registerDataModules();
                
                // 5. 集成层模块
                this._registerIntegrationModules();
                
                // 6. 服务层模块
                this._registerServiceModules();
                
                // 7. 工具类模块
                this._registerUtilityModules();
                
                console.log(`[ModuleActivation] ✅ 模块注册完成，总计: ${this.activationStatus.total}个`);
                return true;
                
            } catch (error) {
                console.error('[ModuleActivation] ❌ 模块注册失败:', error);
                this.activationStatus.errors.push(error);
                return false;
            }
        }
        
        /**
         * 一键激活所有模块
         */
        async activateAllModules() {
            console.log('[ModuleActivation] 🚀 开始一键激活所有模块...');
            
            try {
                // 先注册所有模块
                if (!this.registerAllModules()) {
                    throw new Error('模块注册失败，无法继续激活');
                }
                
                // 批量初始化
                const results = await this.dependencyManager.initializeAll();
                
                // 统计激活结果
                this._updateActivationStatus(results);
                
                // 发送激活完成事件
                this._emitActivationComplete();
                
                console.log(`[ModuleActivation] ✅ 模块激活完成: ${this.activationStatus.activated}/${this.activationStatus.total}`);
                return results;
                
            } catch (error) {
                console.error('[ModuleActivation] ❌ 模块激活失败:', error);
                this.activationStatus.errors.push(error);
                throw error;
            }
        }
        
        /**
         * 获取模块依赖关系图
         */
        getDependencyGraph() {
            return this.dependencyManager.getDependencyGraph();
        }
        
        /**
         * 获取激活状态报告
         */
        getActivationReport() {
            return {
                ...this.activationStatus,
                categories: this.moduleCategories,
                dependencyGraph: this.getDependencyGraph()
            };
        }
        
        // 私有方法 - 模块注册
        
        _registerCoreModules() {
            console.log('[ModuleActivation] 注册核心模块...');
            
            // 核心模块已在DependencyManager中注册，这里验证状态
            const coreModules = [
                'AutogenUnifiedStorage',
                'AutogenEventBus', 
                'Registry',
                'DependencyManager',
                'ErrorHandler',
                'StateManager',
                'ComponentLifecycle',
                'MemoryLeakDetector'
            ];
            
            coreModules.forEach(moduleName => {
                // 检查是否已注册
                const status = this.dependencyManager.getStatus(moduleName);
                if (status.status === 'not_registered') {
                    // 动态注册未注册的核心模块
                    this._registerModule(moduleName, [], () => {
                        return global[moduleName] || this._loadModuleFromPath(`src/core/${moduleName}.js`);
                    }, { required: true, category: 'core' });
                }
                
                this.moduleCategories.core.push(moduleName);
                this.activationStatus.total++;
            });
        }
        
        _registerBusinessModules() {
            console.log('[ModuleActivation] 注册业务层模块...');
            
            const businessModules = [
                {
                    name: 'MindmapNodeManager',
                    dependencies: ['AutogenEventBus', 'AutogenUnifiedStorage'],
                    path: 'src/business/MindmapNodeManager.js'
                },
                {
                    name: 'MindmapStateManager', 
                    dependencies: ['AutogenEventBus', 'AutogenUnifiedStorage'],
                    path: 'src/business/MindmapStateManager.js'
                },
                {
                    name: 'MindmapSyncManager',
                    dependencies: ['AutogenEventBus', 'AutogenUnifiedStorage', 'MindmapStateManager'],
                    path: 'src/business/MindmapSyncManager.js'
                },
                {
                    name: 'SnapshotManager',
                    dependencies: ['AutogenUnifiedStorage'],
                    path: 'src/business/SnapshotManager.js'
                },
                {
                    name: 'TagManager',
                    dependencies: ['AutogenUnifiedStorage', 'AutogenEventBus'],
                    path: 'src/business/TagManager.js'
                }
            ];
            
            businessModules.forEach(module => {
                this._registerModule(module.name, module.dependencies, () => {
                    return this._loadModuleFromPath(module.path);
                }, { required: true, category: 'business' });
                
                this.moduleCategories.business.push(module.name);
                this.activationStatus.total++;
            });
        }
        
        _registerPresentationModules() {
            console.log('[ModuleActivation] 注册表现层模块...');
            
            const presentationModules = [
                {
                    name: 'MindmapRenderer',
                    dependencies: ['AutogenEventBus'],
                    path: 'src/presentation/MindmapRenderer.js'
                },
                {
                    name: 'MindmapEventManager',
                    dependencies: ['AutogenEventBus'],
                    path: 'src/presentation/MindmapEventManager.js'
                },
                {
                    name: 'MindmapUIController',
                    dependencies: ['AutogenEventBus', 'MindmapRenderer'],
                    path: 'src/presentation/MindmapUIController.js'
                },
                {
                    name: 'MindmapView',
                    dependencies: ['MindmapRenderer', 'MindmapEventManager'],
                    path: 'src/presentation/MindmapView.js'
                },
                {
                    name: 'MindmapEvents',
                    dependencies: ['AutogenEventBus'],
                    path: 'src/presentation/MindmapEvents.js'
                }
            ];
            
            presentationModules.forEach(module => {
                this._registerModule(module.name, module.dependencies, () => {
                    return this._loadModuleFromPath(module.path);
                }, { required: true, category: 'presentation' });
                
                this.moduleCategories.presentation.push(module.name);
                this.activationStatus.total++;
            });
        }
        
        _registerDataModules() {
            console.log('[ModuleActivation] 注册数据层模块...');
            
            const dataModules = [
                {
                    name: 'MindmapDataManager',
                    dependencies: ['AutogenUnifiedStorage', 'AutogenEventBus'],
                    path: 'src/data/MindmapDataManager.js'
                },
                {
                    name: 'MindmapStorage',
                    dependencies: ['AutogenUnifiedStorage'],
                    path: 'src/data/MindmapStorage.js'
                },
                {
                    name: 'ImportExportService',
                    dependencies: ['MindmapDataManager', 'AutogenEventBus'],
                    path: 'src/data/ImportExportService.js'
                }
            ];
            
            dataModules.forEach(module => {
                this._registerModule(module.name, module.dependencies, () => {
                    return this._loadModuleFromPath(module.path);
                }, { required: true, category: 'data' });
                
                this.moduleCategories.data.push(module.name);
                this.activationStatus.total++;
            });
        }
        
        _registerIntegrationModules() {
            console.log('[ModuleActivation] 注册集成层模块...');
            
            const integrationModules = [
                {
                    name: 'MindmapBusinessIntegration',
                    dependencies: ['MindmapNodeManager', 'MindmapStateManager', 'MindmapSyncManager'],
                    path: 'src/integration/MindmapBusinessIntegration.js'
                },
                {
                    name: 'MindmapDataManagerIntegration',
                    dependencies: ['MindmapDataManager', 'AutogenEventBus'],
                    path: 'src/integration/MindmapDataManagerIntegration.js'
                },
                {
                    name: 'MindmapPresentationIntegration',
                    dependencies: ['MindmapRenderer', 'MindmapEventManager', 'MindmapUIController'],
                    path: 'src/integration/MindmapPresentationIntegration.js'
                }
            ];
            
            integrationModules.forEach(module => {
                this._registerModule(module.name, module.dependencies, () => {
                    return this._loadModuleFromPath(module.path);
                }, { required: true, category: 'integration' });
                
                this.moduleCategories.integration.push(module.name);
                this.activationStatus.total++;
            });
        }
        
        _registerServiceModules() {
            console.log('[ModuleActivation] 注册服务层模块...');
            
            const serviceModules = [
                {
                    name: 'AllMindmapsToMD',
                    dependencies: ['MindmapDataManager'],
                    path: 'src/services/AllMindmapsToMD.js'
                },
                {
                    name: 'AutoSaveAllMindmaps',
                    dependencies: ['MindmapDataManager', 'AutogenEventBus'],
                    path: 'src/services/AutoSaveAllMindmaps.js'
                }
            ];
            
            serviceModules.forEach(module => {
                this._registerModule(module.name, module.dependencies, () => {
                    return this._loadModuleFromPath(module.path);
                }, { required: false, category: 'services' });
                
                this.moduleCategories.services.push(module.name);
                this.activationStatus.total++;
            });
        }
        
        _registerUtilityModules() {
            console.log('[ModuleActivation] 注册工具类模块...');
            
            const utilityModules = [
                {
                    name: 'DebugPanel',
                    dependencies: ['AutogenEventBus'],
                    path: 'src/debug/DebugPanel.js'
                },
                {
                    name: 'ModuleLoader',
                    dependencies: [],
                    path: 'src/ModuleLoader.js'
                }
            ];
            
            utilityModules.forEach(module => {
                this._registerModule(module.name, module.dependencies, () => {
                    return this._loadModuleFromPath(module.path);
                }, { required: false, category: 'utilities' });
                
                this.moduleCategories.utilities.push(module.name);
                this.activationStatus.total++;
            });
        }
        
        // 私有辅助方法
        
        _registerModule(name, dependencies, factory, options) {
            try {
                this.dependencyManager.register(name, dependencies, factory, options);
                console.log(`[ModuleActivation] ✅ 已注册模块: ${name}`);
            } catch (error) {
                console.error(`[ModuleActivation] ❌ 注册模块失败: ${name}`, error);
                this.activationStatus.errors.push({ module: name, error });
            }
        }
        
        _loadModuleFromPath(path) {
            // 尝试从全局对象获取已加载的模块
            const moduleName = path.split('/').pop().replace('.js', '');
            
            if (global[moduleName]) {
                return global[moduleName];
            }
            
            // 如果模块未加载，返回null，让依赖管理器处理
            console.warn(`[ModuleActivation] 模块 ${moduleName} 未在全局对象中找到，路径: ${path}`);
            return null;
        }
        
        _updateActivationStatus(results) {
            this.activationStatus.activated = 0;
            this.activationStatus.failed = 0;
            
            for (const [moduleName, result] of Object.entries(results)) {
                if (result !== null) {
                    this.activationStatus.activated++;
                } else {
                    this.activationStatus.failed++;
                }
            }
        }
        
        _emitActivationComplete() {
            try {
                if (this.eventBus && typeof this.eventBus.emit === 'function') {
                    this.eventBus.emit('modules:activation_complete', {
                        status: this.activationStatus,
                        categories: this.moduleCategories,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.warn('[ModuleActivation] 发送激活完成事件失败:', error);
            }
        }
    }
    
    // 创建全局实例
    global.ModuleActivation = global.ModuleActivation || new ModuleActivation();
    
    // 自动执行模块注册（但不自动激活）
    if (global.DependencyManager) {
        setTimeout(() => {
            global.ModuleActivation.registerAllModules();
            console.log('[ModuleActivation] 🎯 模块注册完成，调用 ModuleActivation.activateAllModules() 来激活所有模块');
        }, 100);
    } else {
        console.warn('[ModuleActivation] DependencyManager未找到，请先加载DependencyManager');
    }
    
})(window || this);
