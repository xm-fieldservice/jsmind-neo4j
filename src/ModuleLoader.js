/**
 * ModuleLoader.js - 模块加载器
 * 
 * 职责：按正确顺序加载和初始化所有拆分的模块
 * 确保依赖关系正确，避免多重实例冲突
 */

(function() {
    'use strict';
    
    class ModuleLoader {
        constructor() {
            this.loadedModules = new Set();
            this.loadingPromises = new Map();
            this.initializationOrder = [
                // 数据层 - 基础存储
                'AutogenUnifiedStorage',
                'MindmapStorage',
                'ImportExportService',
                
                // 业务层 - 核心逻辑
                'TagManager',
                'SnapshotManager',
                
                // 表现层 - UI组件
                'MindmapView',
                'MindmapEvents',
                
                // 控制层 - 协调器
                'MindmapController'
            ];
        }

        /**
         * 初始化所有模块
         */
        async initializeAll() {
            try {
                console.log('[ModuleLoader] 开始初始化模块...');
                
                // 检查必要的依赖
                await this._checkDependencies();
                
                // 按顺序初始化模块
                for (const moduleName of this.initializationOrder) {
                    await this._initializeModule(moduleName);
                }
                
                // 验证初始化结果
                this._validateInitialization();
                
                console.log('[ModuleLoader] ✅ 所有模块初始化完成');
                return true;
                
            } catch (error) {
                console.error('[ModuleLoader] ❌ 模块初始化失败:', error);
                return false;
            }
        }

        /**
         * 检查必要的依赖
         */
        async _checkDependencies() {
            const requiredDependencies = [
                'jsMind',
                'AutogenUnifiedStorage',
                'AutogenEventBus'
            ];
            
            for (const dep of requiredDependencies) {
                if (typeof window[dep] === 'undefined') {
                    // 尝试等待依赖加载
                    await this._waitForDependency(dep, 5000);
                    
                    if (typeof window[dep] === 'undefined') {
                        throw new Error(`必要依赖未加载: ${dep}`);
                    }
                }
            }
            
            console.log('[ModuleLoader] ✅ 依赖检查通过');
        }

        /**
         * 等待依赖加载
         */
        async _waitForDependency(depName, timeout = 5000) {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                
                const checkDependency = () => {
                    if (typeof window[depName] !== 'undefined') {
                        resolve();
                        return;
                    }
                    
                    if (Date.now() - startTime > timeout) {
                        reject(new Error(`依赖加载超时: ${depName}`));
                        return;
                    }
                    
                    setTimeout(checkDependency, 100);
                };
                
                checkDependency();
            });
        }

        /**
         * 初始化单个模块
         */
        async _initializeModule(moduleName) {
            try {
                if (this.loadedModules.has(moduleName)) {
                    console.log(`[ModuleLoader] ${moduleName} 已初始化，跳过`);
                    return;
                }
                
                // 检查模块是否存在
                if (typeof window[moduleName] === 'undefined') {
                    console.warn(`[ModuleLoader] 模块不存在: ${moduleName}`);
                    return;
                }
                
                // 特殊处理不同类型的模块
                await this._handleModuleInitialization(moduleName);
                
                this.loadedModules.add(moduleName);
                console.log(`[ModuleLoader] ✅ ${moduleName} 初始化完成`);
                
            } catch (error) {
                console.error(`[ModuleLoader] ❌ ${moduleName} 初始化失败:`, error);
                throw error;
            }
        }

        /**
         * 处理模块初始化
         */
        async _handleModuleInitialization(moduleName) {
            switch (moduleName) {
                case 'AutogenUnifiedStorage':
                    // AutogenUnifiedStorage 通常已经初始化
                    if (!window.AutogenUnifiedStorage) {
                        throw new Error('AutogenUnifiedStorage 未正确加载');
                    }
                    break;
                    
                case 'MindmapController':
                    // 防止重复创建 MindmapController 实例
                    if (!window.mindmapController) {
                        // 确保所有依赖模块都已加载
                        this._validateControllerDependencies();
                        
                        // 创建单例实例
                        window.mindmapController = new window.MindmapController();
                        console.log('[ModuleLoader] MindmapController 单例已创建');
                    } else {
                        console.log('[ModuleLoader] MindmapController 实例已存在');
                    }
                    break;
                    
                default:
                    // 其他模块通常是类定义，不需要特殊处理
                    break;
            }
        }

        /**
         * 验证控制器依赖
         */
        _validateControllerDependencies() {
            const requiredClasses = [
                'MindmapStorage',
                'ImportExportService', 
                'TagManager',
                'SnapshotManager',
                'MindmapView',
                'MindmapEvents'
            ];
            
            for (const className of requiredClasses) {
                if (typeof window[className] === 'undefined') {
                    throw new Error(`MindmapController 依赖缺失: ${className}`);
                }
            }
        }

        /**
         * 验证初始化结果
         */
        _validateInitialization() {
            const validationChecks = [
                {
                    name: 'MindmapController实例',
                    check: () => window.mindmapController instanceof window.MindmapController,
                    error: 'MindmapController 实例无效'
                },
                {
                    name: 'jsMind可用性',
                    check: () => typeof jsMind !== 'undefined',
                    error: 'jsMind 未正确加载'
                },
                {
                    name: 'AutogenUnifiedStorage可用性',
                    check: () => window.AutogenUnifiedStorage && typeof window.AutogenUnifiedStorage.store === 'function',
                    error: 'AutogenUnifiedStorage 功能不完整'
                },
                {
                    name: '模块类定义',
                    check: () => {
                        const requiredClasses = ['MindmapView', 'MindmapEvents', 'TagManager', 'SnapshotManager'];
                        return requiredClasses.every(cls => typeof window[cls] === 'function');
                    },
                    error: '部分模块类未正确定义'
                }
            ];
            
            const failures = [];
            
            for (const check of validationChecks) {
                try {
                    if (!check.check()) {
                        failures.push(check.error);
                    }
                } catch (error) {
                    failures.push(`${check.name} 检查失败: ${error.message}`);
                }
            }
            
            if (failures.length > 0) {
                throw new Error(`初始化验证失败:\n${failures.join('\n')}`);
            }
            
            console.log('[ModuleLoader] ✅ 初始化验证通过');
        }

        /**
         * 获取模块加载状态
         */
        getLoadStatus() {
            return {
                totalModules: this.initializationOrder.length,
                loadedModules: this.loadedModules.size,
                loadedList: Array.from(this.loadedModules),
                pendingList: this.initializationOrder.filter(m => !this.loadedModules.has(m))
            };
        }

        /**
         * 重新初始化特定模块
         */
        async reinitializeModule(moduleName) {
            try {
                this.loadedModules.delete(moduleName);
                await this._initializeModule(moduleName);
                console.log(`[ModuleLoader] ${moduleName} 重新初始化完成`);
                return true;
            } catch (error) {
                console.error(`[ModuleLoader] ${moduleName} 重新初始化失败:`, error);
                return false;
            }
        }

        /**
         * 清理所有模块
         */
        cleanup() {
            try {
                // 销毁 MindmapController 实例
                if (window.mindmapController && typeof window.mindmapController.destroy === 'function') {
                    window.mindmapController.destroy();
                    window.mindmapController = null;
                }
                
                // 清理加载状态
                this.loadedModules.clear();
                this.loadingPromises.clear();
                
                console.log('[ModuleLoader] 模块清理完成');
                
            } catch (error) {
                console.error('[ModuleLoader] 模块清理失败:', error);
            }
        }
    }

    // 创建全局模块加载器实例
    window.ModuleLoader = ModuleLoader;
    
    // 自动初始化（如果DOM已准备好）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            const loader = new ModuleLoader();
            await loader.initializeAll();
        });
    } else {
        // DOM已准备好，立即初始化
        setTimeout(async () => {
            const loader = new ModuleLoader();
            await loader.initializeAll();
        }, 100);
    }
    
})();
