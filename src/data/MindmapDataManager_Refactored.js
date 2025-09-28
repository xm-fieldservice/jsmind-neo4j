/**
 * 脑图数据管理器 - 重构版本
 * 职责：专注数据处理、验证、转换和业务逻辑
 * 存储操作委托给MindmapStorage
 */
class MindmapDataManager {
    constructor(options = {}) {
        this.storage = options.storage; // MindmapStorage实例
        this.eventBus = options.eventBus;
        this.logger = options.logger || console;
        
        // 数据缓存和状态管理
        this._dataCache = new Map();
        this._lastJsonBaseHash = null;
        this._saveDebounceTimer = null;
        
        // 当前脑图状态
        this.currentMindId = null;
        this.currentStorageKey = null;
        
        console.log('[MindmapDataManager] ✅ 数据层管理器初始化完成（重构版）');
    }

    /**
     * 准备数据供存储（委托给MindmapStorage）
     */
    async prepareMindmapDataForStorage(data, storageKey, immediate = false) {
        try {
            // 数据验证和预处理
            const processedData = this.validateAndProcessData(data);
            if (!processedData) {
                console.warn('[MindmapDataManager] 数据验证失败，跳过保存');
                return false;
            }
            
            // 委托给MindmapStorage进行存储
            if (this.storage && typeof this.storage.saveMindmapData === 'function') {
                return await this.storage.saveMindmapData(processedData, storageKey, immediate);
            }
            
            console.warn('[MindmapDataManager] MindmapStorage不可用，无法保存数据');
            return false;
        } catch (error) {
            console.error('[MindmapDataManager] 数据准备失败:', error);
            return false;
        }
    }
    
    /**
     * 验证和处理数据
     */
    validateAndProcessData(data) {
        try {
            // 数据验证
            if (!data || !data.id) {
                console.warn('[MindmapDataManager] 无效数据');
                return null;
            }

            // 转换为jsMind格式
            const jmData = {
                meta: { 
                    name: data.label || 'Project Mindmap', 
                    author: 'local', 
                    version: '1.0' 
                },
                format: 'node_tree',
                data: this.toJsMindTree(data)
            };

            return jmData;
        } catch (error) {
            console.error('[MindmapDataManager] 数据验证失败:', error);
            return null;
        }
    }

    /**
     * 加载脑图数据（委托给MindmapStorage）
     */
    async loadMindmapData(storageKey) {
        try {
            // 委托给MindmapStorage加载数据
            if (this.storage && typeof this.storage.loadMindmapData === 'function') {
                const rawData = await this.storage.loadMindmapData(storageKey);
                if (rawData) {
                    // 数据后处理和验证
                    return this.processLoadedData(rawData);
                }
            }
            
            console.warn('[MindmapDataManager] MindmapStorage不可用或无数据');
            return null;
        } catch (error) {
            console.error('[MindmapDataManager] 数据加载失败:', error);
            return null;
        }
    }
    
    /**
     * 处理加载的数据（数据转换和验证）
     */
    processLoadedData(rawData) {
        try {
            if (rawData.format === 'node_tree' && rawData.data) {
                // 转换为内部数据格式
                const internalData = this.fromJsMindTree(rawData.data);
                
                // 缓存数据
                if (internalData && internalData.id) {
                    this._dataCache.set(internalData.id, internalData);
                }
                
                return internalData;
            } else if (rawData.data) {
                // 直接返回数据
                return rawData.data;
            }
            
            console.warn('[MindmapDataManager] 无效的数据格式');
            return null;
        } catch (error) {
            console.error('[MindmapDataManager] 数据处理失败:', error);
            return null;
        }
    }

    /**
     * 计算数据哈希值（使用框架工具）
     */
    calculateDataHash(data) {
        // 使用框架的DataUtils工具
        if (typeof window !== 'undefined' && window.DataUtils) {
            return window.DataUtils.calculateDataHash(data);
        }
        
        // 回退逻辑：简单哈希计算
        try {
            const str = JSON.stringify(data);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // 转换为32位整数
            }
            return hash.toString();
        } catch (error) {
            console.error('[MindmapDataManager] 哈希计算失败:', error);
            return Date.now().toString();
        }
    }

    /**
     * 获取当前脑图ID（从控制器迁移）
     */
    getCurrentMindId(mind, data) {
        try {
            const rootId = (mind && mind.get_root && mind.get_root().id) || 
                          (data && data.id);
            return rootId ? String(rootId) : 'root';
        } catch (error) {
            console.error('[MindmapDataManager] 获取脑图ID失败:', error);
            return 'root';
        }
    }

    /**
     * 获取存储系统状态
     */
    getStorageSystemStatus() {
        return {
            storage: {
                available: !!this.storage,
                type: 'MindmapStorage'
            },
            cache: {
                size: this._dataCache.size,
                keys: Array.from(this._dataCache.keys())
            },
            eventBus: {
                available: !!this.eventBus
            }
        };
    }

    /**
     * 异步加载初始数据（委托给MindmapStorage）
     */
    async loadInitialData(storageKey) {
        try {
            const loadedData = await this.loadMindmapData(storageKey);
            const data = loadedData || this.getDefaultData();
            
            // 设置当前上下文
            this.currentStorageKey = storageKey;
            if (data && data.id) {
                this.currentMindId = data.id;
            }
            
            return data;
        } catch (error) {
            console.error('[MindmapDataManager] 初始数据加载失败:', error);
            return this.getDefaultData();
        }
    }

    /**
     * 获取默认数据
     */
    getDefaultData() {
        return {
            id: 'root',
            label: '未命名项目',
            children: []
        };
    }

    /**
     * 转换为jsMind树格式
     */
    toJsMindTree(node) {
        if (!node) return null;
        
        const jmNode = {
            id: node.id,
            topic: node.label || node.topic || '',
            direction: node.direction || 'right'
        };
        
        // 添加数据属性
        if (node.content) {
            jmNode.data = jmNode.data || {};
            jmNode.data.content = node.content;
        }
        
        // 递归处理子节点
        if (node.children && node.children.length > 0) {
            jmNode.children = node.children.map(child => this.toJsMindTree(child));
        }
        
        return jmNode;
    }

    /**
     * 从jsMind树格式转换
     */
    fromJsMindTree(jmNode) {
        if (!jmNode) return null;
        
        const node = {
            id: jmNode.id,
            label: jmNode.topic || '',
            direction: jmNode.direction || 'right',
            children: []
        };
        
        // 提取数据属性
        if (jmNode.data && jmNode.data.content) {
            node.content = jmNode.data.content;
        }
        
        // 递归处理子节点
        if (jmNode.children && jmNode.children.length > 0) {
            node.children = jmNode.children.map(child => this.fromJsMindTree(child));
        }
        
        return node;
    }

    /**
     * 清理资源
     */
    dispose() {
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
            this._saveDebounceTimer = null;
        }
        
        this._dataCache.clear();
        console.log('[MindmapDataManager] 资源已清理');
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindmapDataManager;
} else if (typeof window !== 'undefined') {
    window.MindmapDataManager_Refactored = MindmapDataManager;
}
