/**
 * 程序员 - P1.1 业务层集成器（依赖注入版）
 * 
 * 基于P0成功经验，增强依赖注入支持
 * 减少全局变量依赖，提升模块化程度
 */

class MindmapBusinessLayerIntegrator {
    constructor(controller, dependencyContainer = null) {
        this.controller = controller;
        // 优先使用ModuleManager，回退到DependencyContainer
        this.container = dependencyContainer || window.ModuleManager || window.GlobalDependencyContainer;
        this.nodeManager = null;
        this.stateManager = null;
        this.syncManager = null;
        this.initialized = false;
        
        console.log('[BusinessIntegrator] 初始化业务层集成器 (使用ModuleManager)');
    }
    
    /**
     * 初始化业务层模块
     */
    async initialize() {
        try {
            console.log('[BusinessIntegrator] 开始初始化业务层模块...');
            
            // 确保依赖容器已初始化
            if (this.container && !this.container.initialized) {
                this.container.initializeCoreServices();
            }
            
            // 使用依赖注入初始化业务模块
            try {
                this.nodeManager = this.container ? this.container.resolve('nodeManager') : null;
                if (this.nodeManager) {
                    console.log('[BusinessIntegrator] ✅ NodeManager通过依赖注入初始化成功');
                }
            } catch (error) {
                console.warn('[BusinessIntegrator] NodeManager依赖注入失败，使用传统方式:', error);
                if (window.MindmapNodeManager) {
                    this.nodeManager = new window.MindmapNodeManager({
                        eventBus: window.AutogenEventBus,
                        logger: console
                    });
                }
            }
            
            try {
                this.stateManager = this.container ? this.container.resolve('stateManager') : null;
                if (this.stateManager) {
                    console.log('[BusinessIntegrator] ✅ StateManager通过依赖注入初始化成功');
                }
            } catch (error) {
                console.warn('[BusinessIntegrator] StateManager依赖注入失败，使用传统方式:', error);
                if (window.MindmapStateManager) {
                    this.stateManager = new window.MindmapStateManager({
                        eventBus: window.AutogenEventBus,
                        logger: console
                    });
                }
            }
            
            try {
                this.syncManager = this.container ? this.container.resolve('syncManager') : null;
                if (this.syncManager) {
                    console.log('[BusinessIntegrator] ✅ SyncManager通过依赖注入初始化成功');
                }
            } catch (error) {
                console.warn('[BusinessIntegrator] SyncManager依赖注入失败，使用传统方式:', error);
                if (window.MindmapSyncManager) {
                    this.syncManager = new window.MindmapSyncManager({
                        eventBus: window.AutogenEventBus,
                        logger: console
                    });
                }
            }
            
            // 设置业务模块依赖
            this._setupBusinessModuleDependencies();
            
            // 建立业务层方法代理
            this._setupBusinessMethodProxies();
            
            this.initialized = true;
            console.log('[BusinessIntegrator] 🎉 业务层集成完成');
            
        } catch (error) {
            console.error('[BusinessIntegrator] 业务层初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 设置业务模块依赖关系
     */
    _setupBusinessModuleDependencies() {
        try {
            // 为NodeManager设置依赖
            if (this.nodeManager && this.controller.mind) {
                this.nodeManager.setDependencies(
                    this.controller.mind,
                    this.controller.dataManager
                );
            }
            
            // 为StateManager设置依赖
            if (this.stateManager && this.controller.mind) {
                this.stateManager.setDependencies(
                    this.controller.mind,
                    this.controller.dataManager
                );
            }
            
            // 为SyncManager设置依赖
            if (this.syncManager && this.controller.autogenStorage) {
                this.syncManager.setDependencies(
                    this.controller.autogenStorage,
                    this.controller.dataManager
                );
            }
            
            // 更新表现层模块依赖
            if (this.controller.renderer && typeof this.controller.renderer.setMindInstance === 'function') {
                this.controller.renderer.setMindInstance(this.controller.mind);
                console.log('[BusinessIntegrator] ✅ 渲染器Mind实例更新成功');
            }
            
        } catch (error) {
            console.error('[BusinessIntegrator] 业务层模块依赖设置失败:', error);
        }
    }
    
    /**
     * 建立业务层方法代理（组合模式，非原型链修改）
     */
    _setupBusinessMethodProxies() {
        // 将业务层方法直接挂载到控制器实例上
        if (this.nodeManager) {
            this.controller.businessAddChildNode = (parentId, nodeData = { topic: '新节点' }) => {
                return this.nodeManager.addChildNode(parentId, nodeData);
            };
            
            this.controller.businessAddSiblingNode = (nodeId, nodeData = { topic: '新节点' }) => {
                return this.nodeManager.addSiblingNode(nodeId, nodeData);
            };
            
            this.controller.businessRemoveNode = (nodeId) => {
                return this.nodeManager.removeNode(nodeId);
            };
        }
        
        if (this.stateManager) {
            this.controller.businessSaveState = () => {
                return this.stateManager.saveCurrentState();
            };
            
            this.controller.businessRestoreState = (stateId) => {
                return this.stateManager.restoreState(stateId);
            };
        }
        
        if (this.syncManager) {
            this.controller.businessSyncToStorage = (options = {}) => {
                return this.syncManager.saveMindmapToStorage(
                    this.controller.mind.get_data(),
                    options
                );
            };
        }
        
        console.log('[BusinessIntegrator] ✅ 业务层方法代理设置完成');
    }
    
    /**
     * 获取业务层模块状态
     */
    getBusinessLayerStatus() {
        return {
            initialized: this.initialized,
            nodeManager: !!this.nodeManager,
            stateManager: !!this.stateManager,
            syncManager: !!this.syncManager,
            controller: !!this.controller,
            dependencyInjection: !!this.container
        };
    }
    
    /**
     * 销毁业务层集成
     */
    destroy() {
        // 清理业务层方法代理
        if (this.controller) {
            delete this.controller.businessAddChildNode;
            delete this.controller.businessAddSiblingNode;
            delete this.controller.businessRemoveNode;
            delete this.controller.businessSaveState;
            delete this.controller.businessRestoreState;
            delete this.controller.businessSyncToStorage;
        }
        
        // 重置状态
        this.nodeManager = null;
        this.stateManager = null;
        this.syncManager = null;
        this.initialized = false;
        
        console.log('[BusinessIntegrator] 业务层集成已销毁');
    }
}

// 全局导出
window.MindmapBusinessLayerIntegrator = MindmapBusinessLayerIntegrator;

console.log('[BusinessIntegrator] 业务层集成器类已加载 (P1.1 依赖注入版)');
