/**
 * 脑图工作栏核心控制器
 * 负责统一生命周期管理、协调所有子模块
 * 
 * @author 程序员
 * @date 2025-10-07
 * @version 1.0
 * 
 * Phase 2.1 - Task 2.1.4: 核心模块拆分 - 核心控制器
 */

class MindmapColumnController {
    constructor(mindmapId = 'mindmap_column_standalone') {
        this.mindmapId = mindmapId;
        this.jm = null;
        this.isFullscreen = false;
        
        // 子模块
        this.storageAdapter = null;
        this.storageCoordinator = null;
        this.eventCoordinator = null;
        this.errorHandler = null;
        this.contentEditor = null;
        this.uiManager = null;
        this.dataLoader = null;
        this.compat = null;
        this.ops = null;
        
        console.log('[Controller] 核心控制器创建完成');
    }
    
    /**
     * 初始化控制器
     */
    async init() {
        try {
            console.log('[Controller] 开始初始化...');
            
            // 1. 初始化基础架构
            await this.initArchitecture();
            
            // 2. 创建jsMind实例
            this.createJsMind();
            
            // 3. 初始化协调器
            await this.initCoordinators();
            
            // 4. 初始化业务模块
            await this.initBusinessModules();
            
            // 5. 初始化兼容层
            await this.initCompatLayer();
            
            // 6. 加载数据
            await this.loadData();
            
            // 7. 绑定事件
            this.bindEvents();
            
            // 8. 完成初始化
            this.finishInit();
            
            console.log('[Controller] ✅ 初始化完成');
        } catch (error) {
            console.error('[Controller] ❌ 初始化失败:', error);
            if (this.errorHandler) {
                this.errorHandler.handle(error, {
                    component: 'MindmapColumnController',
                    action: 'init'
                }, { silent: false });
            }
            throw error;
        }
    }
    
    /**
     * 初始化基础架构
     */
    async initArchitecture() {
        // StorageAdapter
        if (typeof window.StorageAdapter !== 'undefined') {
            try {
                this.storageAdapter = new window.StorageAdapter();
                await this.storageAdapter.initialize();
                console.log('[Controller] ✅ StorageAdapter初始化完成');
            } catch (err) {
                console.error('[Controller] ❌ StorageAdapter初始化失败:', err);
                this.storageAdapter = null;
            }
        }
        
        // 错误处理器
        if (typeof window.MindmapErrorHandler !== 'undefined') {
            this.errorHandler = new window.MindmapErrorHandler(
                window.ErrorHandler,
                console
            );
            console.log('[Controller] ✅ 错误处理器初始化完成');
        }
    }
    
    /**
     * 创建jsMind实例
     */
    createJsMind() {
        const options = {
            container: 'jsmind_container',
            editable: true,
            theme: 'primary',
            mode: 'side',
            support_html: false,
            shortcut: {
                enable: false
            },
            view: {
                hmargin: 100,
                vmargin: 50,
                line_width: 2,
                line_color: '#558'
            }
        };
        
        this.jm = new jsMind(options);
        console.log('[Controller] ✅ jsMind实例创建完成');
        
        // 创建操作API
        this.ops = new MindmapOperations(this.jm);
        console.log('[Controller] ✅ 操作API创建完成');
    }
    
    /**
     * 初始化协调器
     */
    async initCoordinators() {
        // 存储协调器
        if (typeof window.MindmapStorageCoordinator !== 'undefined' && this.storageAdapter) {
            this.storageCoordinator = new window.MindmapStorageCoordinator(
                this.storageAdapter,
                window.AutogenEventBus,
                console
            );
            console.log('[Controller] ✅ 存储协调器初始化完成');
        }
        
        // 事件协调器
        if (typeof window.MindmapEventCoordinator !== 'undefined') {
            this.eventCoordinator = new window.MindmapEventCoordinator(
                this.jm,
                window.AutogenEventBus,
                window.MindmapEventManager
            );
            this.eventCoordinator.init();
            console.log('[Controller] ✅ 事件协调器初始化完成');
        }
    }
    
    /**
     * 初始化业务模块
     */
    async initBusinessModules() {
        // 内容编辑器
        if (typeof window.MindmapContentEditor !== 'undefined') {
            this.contentEditor = new window.MindmapContentEditor(
                this.jm,
                this.storageCoordinator,
                this.eventCoordinator,
                this.errorHandler
            );
            console.log('[Controller] ✅ 内容编辑器初始化完成');
        }
        
        // UI管理器
        if (typeof window.MindmapUIManager !== 'undefined') {
            this.uiManager = new window.MindmapUIManager(
                this.jm,
                this.eventCoordinator
            );
            console.log('[Controller] ✅ UI管理器初始化完成');
        }
        
        // 数据加载器
        if (typeof window.MindmapDataLoader !== 'undefined') {
            this.dataLoader = new window.MindmapDataLoader(
                this.jm,
                this.storageCoordinator,
                this.uiManager,
                this.errorHandler
            );
            console.log('[Controller] ✅ 数据加载器初始化完成');
        }
    }
    
    /**
     * 初始化兼容层
     */
    async initCompatLayer() {
        if (typeof MindmapCompatLayer !== 'undefined') {
            this.compat = new MindmapCompatLayer({
                useSourceArchitecture: true,
                fallbackToStandalone: true,
                debugMode: true
            });
            
            await this.compat.initialize(this.jm, this.ops, {
                storageAdapter: this.storageAdapter
            });
            
            console.log('[Controller] ✅ 兼容层初始化完成');
        }
    }
    
    /**
     * 加载数据
     */
    async loadData() {
        if (this.dataLoader) {
            await this.dataLoader.loadInitialData();
        } else {
            console.warn('[Controller] 数据加载器未初始化，跳过数据加载');
        }
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 页面卸载前保存
        window.addEventListener('beforeunload', async (e) => {
            try {
                console.log('[Controller] 页面卸载，开始保存...');
                
                if (this.contentEditor) {
                    this.contentEditor.autoSaveCurrentContent();
                }
                
                const data = this.jm.get_data();
                DataSyncHelper.syncAllNodes(this.jm, data);
                
                if (this.storageCoordinator) {
                    await this.storageCoordinator.saveMindmap(data, true);
                }
                
                console.log('[Controller] ✅ 保存完成');
            } catch (error) {
                console.error('[Controller] ❌ 保存失败:', error);
            }
        });
    }
    
    /**
     * 完成初始化
     */
    finishInit() {
        // 隐藏加载状态
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
        
        // 选择根节点
        setTimeout(() => {
            const rootNode = this.jm.get_node('root');
            if (rootNode) {
                this.jm.select_node('root');
                if (this.contentEditor) {
                    this.contentEditor.onNodeSelected(rootNode);
                }
            }
        }, 200);
    }
    
    /**
     * 获取模块状态
     */
    getStatus() {
        return {
            initialized: true,
            modules: {
                storageAdapter: !!this.storageAdapter,
                storageCoordinator: !!this.storageCoordinator,
                eventCoordinator: !!this.eventCoordinator,
                errorHandler: !!this.errorHandler,
                contentEditor: !!this.contentEditor,
                uiManager: !!this.uiManager,
                dataLoader: !!this.dataLoader,
                compat: !!this.compat
            }
        };
    }
    
    /**
     * 销毁控制器
     */
    destroy() {
        console.log('[Controller] 开始销毁...');
        
        // 清理引用
        this.jm = null;
        this.ops = null;
        this.storageAdapter = null;
        this.storageCoordinator = null;
        this.eventCoordinator = null;
        this.errorHandler = null;
        this.contentEditor = null;
        this.uiManager = null;
        this.dataLoader = null;
        this.compat = null;
        
        console.log('[Controller] ✅ 销毁完成');
    }
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.MindmapColumnController = MindmapColumnController;
}

// 支持模块化导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindmapColumnController;
}
