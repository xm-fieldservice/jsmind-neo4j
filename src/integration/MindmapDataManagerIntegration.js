/**
 * MindmapDataManagerIntegration.js - 数据管理器集成脚本
 * 
 * 职责：将MindmapDataManager集成到现有的MindmapController中
 * 解决方案：通过方法重写和代理模式实现无侵入式集成
 */

(function() {
    'use strict';

    // 等待所有依赖加载完成
    function waitForDependencies() {
        return new Promise((resolve) => {
            const checkDependencies = () => {
                if (window.MindmapController && 
                    window.MindmapDataManager && 
                    window.AutogenUnifiedStorage) {
                    resolve();
                } else {
                    setTimeout(checkDependencies, 100);
                }
            };
            checkDependencies();
        });
    }

    // 集成数据管理器到控制器
    async function integrateDataManager() {
        await waitForDependencies();

        console.log('[DataManagerIntegration] 开始集成数据管理器...');

        // 扩展MindmapController原型
        const originalSaveMindmapToStorage = MindmapController.prototype.saveMindmapToStorage;
        const originalLoadMindmapFromStorage = MindmapController.prototype.loadMindmapFromStorage;
        const originalToJsMindTree = MindmapController.prototype.toJsMindTree;
        const originalFromJsMindTree = MindmapController.prototype.fromJsMindTree;

        // 重写保存方法
        MindmapController.prototype.saveMindmapToStorage = async function(immediate = false) {
            // 初始化数据管理器（如果还没有）
            if (!this.dataManager) {
                try {
                    this.dataManager = new window.MindmapDataManager({
                        storage: window.AutogenUnifiedStorage,
                        eventBus: window.AutogenEventBus
                    });
                    console.log('[DataManagerIntegration] ✅ 数据管理器初始化成功');
                } catch (error) {
                    console.error('[DataManagerIntegration] 数据管理器初始化失败:', error);
                    return originalSaveMindmapToStorage.call(this, immediate);
                }
            }

            // 使用数据管理器保存
            try {
                // 全局保存守卫
                if (typeof window !== 'undefined'){
                    if (window.__STORAGE_PAUSE || window.__REG_SYNC_SUPPRESS) return;
                    if (!this.data || !this.data.id || this.data.id === 'root') return;
                    if (window.AppLifecycle && !window.AppLifecycle.allowSave(this.data.id)) return;
                }

                const success = await this.dataManager.saveMindmapData(this.data, this.localStorageKey, immediate);
                if (success) {
                    console.log('[DataManagerIntegration] ✅ 使用数据管理器保存成功');
                    return;
                }
            } catch (error) {
                console.error('[DataManagerIntegration] 数据管理器保存失败，回退到原方法:', error);
            }

            // 回退到原方法
            return originalSaveMindmapToStorage.call(this, immediate);
        };

        // 重写加载方法
        MindmapController.prototype.loadMindmapFromStorage = async function() {
            // 初始化数据管理器（如果还没有）
            if (!this.dataManager) {
                try {
                    this.dataManager = new window.MindmapDataManager({
                        storage: window.AutogenUnifiedStorage,
                        eventBus: window.AutogenEventBus
                    });
                } catch (error) {
                    console.error('[DataManagerIntegration] 数据管理器初始化失败:', error);
                    return originalLoadMindmapFromStorage.call(this);
                }
            }

            // 使用数据管理器加载
            try {
                const data = await this.dataManager.loadMindmapData(this.localStorageKey);
                if (data) {
                    console.log('[DataManagerIntegration] ✅ 使用数据管理器加载成功');
                    return data;
                }
            } catch (error) {
                console.error('[DataManagerIntegration] 数据管理器加载失败，回退到原方法:', error);
            }

            // 回退到原方法
            return originalLoadMindmapFromStorage.call(this);
        };

        // 重写数据转换方法（使用数据管理器的实现）
        MindmapController.prototype.toJsMindTree = function(node, depth = 0) {
            if (this.dataManager) {
                try {
                    return this.dataManager.toJsMindTree(node, depth);
                } catch (error) {
                    console.error('[DataManagerIntegration] 数据管理器转换失败，回退到原方法:', error);
                }
            }
            return originalToJsMindTree.call(this, node, depth);
        };

        MindmapController.prototype.fromJsMindTree = function(jmNode) {
            if (this.dataManager) {
                try {
                    return this.dataManager.fromJsMindTree(jmNode);
                } catch (error) {
                    console.error('[DataManagerIntegration] 数据管理器转换失败，回退到原方法:', error);
                }
            }
            return originalFromJsMindTree.call(this, jmNode);
        };

        // 为现有实例添加数据管理器
        if (window.mindmapController && !window.mindmapController.dataManager) {
            try {
                window.mindmapController.dataManager = new window.MindmapDataManager({
                    storage: window.AutogenUnifiedStorage,
                    eventBus: window.AutogenEventBus
                });
                console.log('[DataManagerIntegration] ✅ 为现有控制器实例添加数据管理器');
            } catch (error) {
                console.error('[DataManagerIntegration] 为现有实例添加数据管理器失败:', error);
            }
        }

        console.log('[DataManagerIntegration] ✅ 数据管理器集成完成');

        // 触发集成完成事件
        if (window.AutogenEventBus) {
            window.AutogenEventBus.emit('mindmap:dataManagerIntegrated', {
                timestamp: new Date().toISOString(),
                methods: ['saveMindmapToStorage', 'loadMindmapFromStorage', 'toJsMindTree', 'fromJsMindTree']
            });
        }
    }

    // 启动集成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', integrateDataManager);
    } else {
        integrateDataManager();
    }

})();
