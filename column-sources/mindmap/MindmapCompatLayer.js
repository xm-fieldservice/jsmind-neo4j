/**
 * MindmapCompatLayer.js - 架构兼容适配层
 * 
 * 职责：桥接 mindmap-standalone.html 与 src/ 架构
 * 目标：让 standalone 能够无缝使用 src/ 的完整功能
 * 
 * 设计原则：
 * - 保持 standalone 的简单 API 不变
 * - 内部委托给 src/ 架构模块
 * - 数据格式自动转换
 * - 渐进式迁移支持
 */

class MindmapCompatLayer {
    constructor(options = {}) {
        // 配置
        this.config = {
            useSourceArchitecture: options.useSourceArchitecture !== false, // 默认使用src/架构
            fallbackToStandalone: options.fallbackToStandalone !== false,   // 失败时回退
            enableDataMigration: options.enableDataMigration !== false,     // 启用数据迁移
            debugMode: options.debugMode || false
        };
        
        // src/ 架构组件引用
        this.srcController = null;
        this.srcDataManager = null;
        this.srcRenderer = null;
        this.srcEventManager = null;
        
        // standalone 组件引用
        this.standaloneOps = null;
        this.jm = null;
        
        // 状态
        this.initialized = false;
        this.usingSrcArchitecture = false;
        
        this._log('兼容层初始化');
    }
    
    /**
     * 初始化适配层
     */
    async initialize(jmInstance, standaloneOps) {
        try {
            this.jm = jmInstance;
            this.standaloneOps = standaloneOps;
            
            // 尝试加载 src/ 架构
            if (this.config.useSourceArchitecture) {
                await this._initializeSrcArchitecture();
            }
            
            this.initialized = true;
            this._log('兼容层初始化完成', { usingSrcArchitecture: this.usingSrcArchitecture });
            
        } catch (error) {
            this._error('兼容层初始化失败', error);
            if (!this.config.fallbackToStandalone) {
                throw error;
            }
        }
    }
    
    /**
     * 初始化 src/ 架构组件
     */
    async _initializeSrcArchitecture() {
        try {
            // 检查 src/ 架构是否可用
            if (typeof window.MindmapController === 'undefined') {
                this._warn('src/ 架构不可用，回退到 standalone');
                return;
            }
            
            // ✅ 修复1: 创建控制器（之前缺失）
            this.srcController = new window.MindmapController();
            this._log('src/控制器已加载');
            
            // ✅ 修复2: 使用正确的存储类 MindmapStorage
            if (typeof window.MindmapStorage !== 'undefined') {
                this.srcDataManager = new window.MindmapStorage();
                this._log('src/数据管理器已加载');
            }
            
            // 创建渲染器
            if (typeof window.MindmapRenderer !== 'undefined') {
                this.srcRenderer = new window.MindmapRenderer({
                    mind: this.jm,
                    eventBus: window.AutogenEventBus
                });
                this._log('src/渲染器已加载');
            }
            
            // 创建事件管理器
            if (typeof window.MindmapEventManager !== 'undefined') {
                this.srcEventManager = new window.MindmapEventManager({
                    mind: this.jm,
                    container: document.getElementById('jsmind_container'),
                    eventBus: window.AutogenEventBus
                });
                this._log('src/事件管理器已加载');
            }
            
            this.usingSrcArchitecture = true;
            this._log('src/ 架构加载成功');
            
        } catch (error) {
            this._error('src/ 架构加载失败', error);
            this.usingSrcArchitecture = false;
        }
    }
    
    // ==================== 节点操作适配 ====================
    
    /**
     * 添加子节点 - 兼容 API
     */
    addChild(parentNode = null) {
        if (this.usingSrcArchitecture && this.srcController) {
            // 使用 src/ 架构
            const parent = parentNode || this.jm.get_selected_node();
            if (!parent) return null;
            
            return this.srcController.addChildNode(parent.id, {
                label: '新节点',
                topic: '新节点'
            });
        }
        
        // 回退到 standalone
        return this.standaloneOps.addChild(parentNode);
    }
    
    /**
     * 添加兄弟节点 - 兼容 API
     */
    addBrother(selectedNode = null) {
        // ✅ 修复3: 兄弟节点直接使用 standalone 实现
        // src/ 架构的 MindmapController 没有 addBrother 方法
        // 使用 standalone 的实现更合适
        return this.standaloneOps.addBrother(selectedNode);
    }
    
    /**
     * 删除节点 - 兼容 API
     */
    removeNode(node = null) {
        if (this.usingSrcArchitecture && this.srcController) {
            const target = node || this.jm.get_selected_node();
            if (!target) return false;
            
            return this.srcController.removeNode(target.id);
        }
        
        // 回退到 standalone
        return this.standaloneOps.removeNode(node);
    }
    
    /**
     * 更新节点 - 兼容 API
     */
    updateNode(node, topic, content) {
        if (this.usingSrcArchitecture && this.srcController) {
            const target = typeof node === 'object' ? node : this.jm.get_node(node);
            if (!target) return false;
            
            if (topic) {
                this.srcController.updateNodeTitle(target.id, topic);
            }
            if (content !== undefined) {
                this.srcController.updateNodeContent(target.id, content);
            }
            return true;
        }
        
        // 回退到 standalone
        return this.standaloneOps.updateNode(node, topic, content);
    }
    
    // ==================== 数据管理适配 ====================
    
    /**
     * 保存数据 - 兼容 API
     */
    async saveData(mindmapId, data, immediate = false) {
        if (this.usingSrcArchitecture && this.srcDataManager) {
            // ✅ 修复4: 使用 MindmapStorage 的正确方法
            return await this.srcDataManager.saveMindmapData(data, immediate);
        }
        
        // 回退到 standalone 的 AutogenUnifiedStorage
        if (typeof AutogenUnifiedStorage !== 'undefined') {
            const jmData = {
                meta: { name: 'Mindmap', author: 'local', version: '1.0' },
                format: 'node_tree',
                data: this._convertToJsMindFormat(data)
            };
            return await AutogenUnifiedStorage.store('mindmap', mindmapId, jmData);
        }
        
        return false;
    }
    
    /**
     * 加载数据 - 兼容 API
     */
    async loadData(mindmapId) {
        if (this.usingSrcArchitecture && this.srcDataManager) {
            // ✅ 修复5: 使用 MindmapStorage 的正确方法
            return await this.srcDataManager.loadMindmapData();
        }
        
        // 回退到 standalone 的 AutogenUnifiedStorage
        if (typeof AutogenUnifiedStorage !== 'undefined') {
            const stored = await AutogenUnifiedStorage.retrieve('mindmap', mindmapId);
            if (stored && stored.data) {
                return this._convertFromJsMindFormat(stored.data);
            }
        }
        
        return null;
    }
    
    // ==================== 渲染适配 ====================
    
    /**
     * 渲染脑图 - 兼容 API
     */
    async renderMindmap(data, options = {}) {
        if (this.usingSrcArchitecture && this.srcRenderer) {
            // 使用 src/ 渲染器
            return await this.srcRenderer.renderMindmap(data, options);
        }
        
        // 回退到 standalone 的直接渲染
        const jmData = {
            meta: { name: 'Mindmap', author: 'local', version: '1.0' },
            format: 'node_tree',
            data: this._convertToJsMindFormat(data)
        };
        this.jm.show(jmData);
        return true;
    }
    
    // ==================== 数据格式转换 ====================
    
    /**
     * 转换为 jsMind 格式
     */
    _convertToJsMindFormat(node) {
        if (!node) return null;
        
        const jmNode = {
            id: node.id,
            topic: node.label || node.topic || '未命名',
            expanded: node.expanded !== false
        };
        
        if (node.children && node.children.length > 0) {
            jmNode.children = node.children.map(child => this._convertToJsMindFormat(child));
        }
        
        return jmNode;
    }
    
    /**
     * 从 jsMind 格式转换
     */
    _convertFromJsMindFormat(jmNode) {
        if (!jmNode) return null;
        
        const node = {
            id: jmNode.id,
            label: jmNode.topic,
            topic: jmNode.topic,
            content: (jmNode.data && jmNode.data.content) || '',
            children: []
        };
        
        if (jmNode.children && jmNode.children.length > 0) {
            node.children = jmNode.children.map(child => this._convertFromJsMindFormat(child));
        }
        
        return node;
    }
    
    // ==================== 工具方法 ====================
    
    /**
     * 查找父节点
     */
    _findParentNode(node) {
        if (!node || !this.jm) return null;
        
        const allNodes = this.jm.get_data().data;
        return this._findParentRecursive(allNodes, node.id);
    }
    
    _findParentRecursive(currentNode, targetId) {
        if (!currentNode || !currentNode.children) return null;
        
        for (const child of currentNode.children) {
            if (child.id === targetId) {
                return currentNode;
            }
            const found = this._findParentRecursive(child, targetId);
            if (found) return found;
        }
        
        return null;
    }
    
    /**
     * 获取架构状态
     */
    getArchitectureStatus() {
        return {
            initialized: this.initialized,
            usingSrcArchitecture: this.usingSrcArchitecture,
            components: {
                srcController: !!this.srcController,
                srcDataManager: !!this.srcDataManager,
                srcRenderer: !!this.srcRenderer,
                srcEventManager: !!this.srcEventManager
            },
            config: this.config
        };
    }
    
    // ==================== 日志工具 ====================
    
    _log(message, data = null) {
        if (this.config.debugMode || Math.random() < 0.1) {
            console.log(`[兼容层] ${message}`, data || '');
        }
    }
    
    _warn(message, data = null) {
        console.warn(`[兼容层] ${message}`, data || '');
    }
    
    _error(message, error) {
        console.error(`[兼容层] ${message}`, error);
    }
    
    /**
     * 销毁适配层
     */
    destroy() {
        if (this.srcRenderer) this.srcRenderer.destroy();
        if (this.srcEventManager) this.srcEventManager.destroy();
        
        this.srcController = null;
        this.srcDataManager = null;
        this.srcRenderer = null;
        this.srcEventManager = null;
        this.standaloneOps = null;
        this.jm = null;
        
        this._log('兼容层已销毁');
    }
}

// 全局注册
if (typeof window !== 'undefined') {
    window.MindmapCompatLayer = MindmapCompatLayer;
}
