/**
 * 关系数据管理器
 * 管理关系数据的CRUD操作，集成统一存储系统
 * 支持多种数据源和缓存策略
 */

class RelationDataManager {
    constructor(unifiedStorage = null) {
        this.storage = unifiedStorage;
        this.extractor = new MindmapRelationExtractor();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
        
        this.dataSourcePriority = [
            'cache',
            'unified_storage',
            'mindmap_extraction',
            'neo4j_api',
            'mock_data'
        ];
        
        console.log('[关系数据管理器] 初始化完成');
    }
    
    /**
     * 获取节点关系数据
     * @param {string} nodeId - 节点ID
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 关系数据
     */
    async getRelationData(nodeId, options = {}) {
        const {
            forceRefresh = false,
            maxDepth = 3,
            includeSemanticRelations = true,
            dataSource = 'auto'
        } = options;
        
        console.log(`[关系数据管理器] 获取关系数据: ${nodeId}`, options);
        
        // 检查缓存
        if (!forceRefresh && this.hasValidCache(nodeId)) {
            console.log('[关系数据管理器] 使用缓存数据');
            return this.cache.get(nodeId).data;
        }
        
        let relationData = null;
        
        // 根据数据源优先级尝试获取数据
        for (const source of this.dataSourcePriority) {
            if (dataSource !== 'auto' && dataSource !== source) {
                continue;
            }
            
            try {
                relationData = await this.fetchFromSource(source, nodeId, options);
                if (relationData && relationData.nodes.length > 0) {
                    console.log(`[关系数据管理器] 从 ${source} 获取数据成功`);
                    break;
                }
            } catch (error) {
                console.warn(`[关系数据管理器] 从 ${source} 获取数据失败:`, error);
            }
        }
        
        if (!relationData) {
            console.error('[关系数据管理器] 所有数据源都失败，返回空数据');
            relationData = this.createEmptyRelationData(nodeId);
        }
        
        // 缓存数据
        this.cacheRelationData(nodeId, relationData);
        
        // 保存到统一存储系统
        if (this.storage && relationData.nodes.length > 0) {
            try {
                await this.storage.saveRelationData(nodeId, relationData);
            } catch (error) {
                console.warn('[关系数据管理器] 保存到统一存储失败:', error);
            }
        }
        
        return relationData;
    }
    
    /**
     * 从指定数据源获取数据
     */
    async fetchFromSource(source, nodeId, options) {
        switch (source) {
            case 'cache':
                return this.getFromCache(nodeId);
                
            case 'unified_storage':
                return await this.getFromUnifiedStorage(nodeId);
                
            case 'mindmap_extraction':
                return await this.getFromMindmapExtraction(nodeId, options);
                
            case 'neo4j_api':
                return await this.getFromNeo4jAPI(nodeId, options);
                
            case 'mock_data':
                return this.getFromMockData(nodeId, options);
                
            default:
                throw new Error(`未知的数据源: ${source}`);
        }
    }
    
    /**
     * 从缓存获取数据
     */
    getFromCache(nodeId) {
        if (this.hasValidCache(nodeId)) {
            return this.cache.get(nodeId).data;
        }
        return null;
    }
    
    /**
     * 从统一存储系统获取数据
     */
    async getFromUnifiedStorage(nodeId) {
        if (!this.storage) {
            return null;
        }
        
        try {
            const data = await this.storage.loadRelationData(nodeId);
            return data;
        } catch (error) {
            console.warn('[关系数据管理器] 统一存储加载失败:', error);
            return null;
        }
    }
    
    /**
     * 从脑图提取关系数据
     */
    async getFromMindmapExtraction(nodeId, options) {
        try {
            // 获取当前脑图数据
            const mindmapData = await this.getCurrentMindmapData();
            if (!mindmapData) {
                console.warn('[关系数据管理器] 无法获取脑图数据');
                return null;
            }
            
            // 使用关系提取器提取关系
            const relationData = this.extractor.extractRelations(mindmapData, nodeId);
            
            // 添加数据源标识
            relationData.metadata = {
                ...relationData.metadata,
                data_source: 'mindmap_extraction',
                extraction_options: options
            };
            
            return relationData;
            
        } catch (error) {
            console.error('[关系数据管理器] 脑图关系提取失败:', error);
            return null;
        }
    }
    
    /**
     * 从Neo4j API获取数据
     */
    async getFromNeo4jAPI(nodeId, options) {
        try {
            const response = await fetch(`/api/neo4j/graph-data?node_id=${encodeURIComponent(nodeId)}&max_depth=${options.maxDepth || 3}`);
            
            if (!response.ok) {
                throw new Error(`Neo4j API响应错误: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 转换为标准格式
            return {
                hierarchical_relations: [],
                semantic_relations: data.links || [],
                computed_layout: data.layout || {},
                nodes: data.nodes || [],
                links: data.links || [],
                metadata: {
                    source: 'neo4j_api',
                    fetched_at: new Date().toISOString(),
                    node_id: nodeId,
                    total_nodes: (data.nodes || []).length,
                    total_links: (data.links || []).length
                }
            };
            
        } catch (error) {
            console.warn('[关系数据管理器] Neo4j API获取失败:', error);
            return null;
        }
    }
    
    /**
     * 生成模拟数据
     */
    getFromMockData(nodeId, options) {
        console.log('[关系数据管理器] 生成模拟关系数据');
        
        const mockNodes = [
            { 
                id: nodeId, 
                label: '当前节点', 
                type: 'current',
                level: 0,
                style: { fill: '#e74c3c', stroke: '#c0392b', strokeWidth: 2 }
            },
            { 
                id: `${nodeId}_child_1`, 
                label: '子节点1', 
                type: 'task',
                level: 1,
                style: { fill: '#2ecc71', stroke: '#27ae60', strokeWidth: 1 }
            },
            { 
                id: `${nodeId}_child_2`, 
                label: '子节点2', 
                type: 'resource',
                level: 1,
                style: { fill: '#f39c12', stroke: '#e67e22', strokeWidth: 1 }
            },
            { 
                id: `${nodeId}_related_1`, 
                label: '相关节点1', 
                type: 'milestone',
                level: 1,
                style: { fill: '#9b59b6', stroke: '#8e44ad', strokeWidth: 1 }
            },
            { 
                id: `${nodeId}_grandchild_1`, 
                label: '孙节点1', 
                type: 'note',
                level: 2,
                style: { fill: '#95a5a6', stroke: '#7f8c8d', strokeWidth: 1 }
            }
        ];
        
        const mockLinks = [
            { 
                source: nodeId, 
                target: `${nodeId}_child_1`, 
                type: 'contains', 
                label: '包含', 
                value: 1.0,
                style: { stroke: '#7f8c8d', strokeWidth: 2 }
            },
            { 
                source: nodeId, 
                target: `${nodeId}_child_2`, 
                type: 'contains', 
                label: '包含', 
                value: 1.0,
                style: { stroke: '#7f8c8d', strokeWidth: 2 }
            },
            { 
                source: `${nodeId}_child_1`, 
                target: `${nodeId}_related_1`, 
                type: 'depends_on', 
                label: '依赖', 
                value: 0.8,
                style: { stroke: '#e67e22', strokeWidth: 1, strokeDasharray: '3,3' }
            },
            { 
                source: `${nodeId}_child_1`, 
                target: `${nodeId}_grandchild_1`, 
                type: 'contains', 
                label: '包含', 
                value: 1.0,
                style: { stroke: '#7f8c8d', strokeWidth: 1 }
            }
        ];
        
        return {
            hierarchical_relations: mockLinks.filter(link => link.type === 'contains'),
            semantic_relations: mockLinks.filter(link => link.type !== 'contains'),
            computed_layout: {
                suggested_layout: 'force_directed',
                center_node: nodeId,
                force_settings: {
                    linkDistance: 80,
                    charge: -200,
                    gravity: 0.1
                }
            },
            nodes: mockNodes,
            links: mockLinks,
            metadata: {
                source: 'mock_data',
                generated_at: new Date().toISOString(),
                node_id: nodeId,
                total_nodes: mockNodes.length,
                total_links: mockLinks.length,
                is_mock: true
            }
        };
    }
    
    /**
     * 保存关系数据
     */
    async saveRelationData(nodeId, relationData) {
        console.log(`[关系数据管理器] 保存关系数据: ${nodeId}`);
        
        // 更新缓存
        this.cacheRelationData(nodeId, relationData);
        
        // 保存到统一存储系统
        if (this.storage) {
            try {
                await this.storage.saveRelationData(nodeId, relationData);
                console.log('[关系数据管理器] 数据已保存到统一存储');
            } catch (error) {
                console.error('[关系数据管理器] 保存到统一存储失败:', error);
                throw error;
            }
        }
        
        return true;
    }
    
    /**
     * 删除关系数据
     */
    async deleteRelationData(nodeId) {
        console.log(`[关系数据管理器] 删除关系数据: ${nodeId}`);
        
        // 从缓存删除
        this.cache.delete(nodeId);
        
        // 从统一存储系统删除
        if (this.storage) {
            // 注意：这里需要统一存储系统支持删除操作
            console.log('[关系数据管理器] 从统一存储删除数据（功能待实现）');
        }
        
        return true;
    }
    
    /**
     * 刷新关系数据
     */
    async refreshRelationData(nodeId, options = {}) {
        console.log(`[关系数据管理器] 刷新关系数据: ${nodeId}`);
        
        return await this.getRelationData(nodeId, { 
            ...options, 
            forceRefresh: true 
        });
    }
    
    /**
     * 获取当前脑图数据
     */
    async getCurrentMindmapData() {
        try {
            // 尝试从jsMind获取
            if (window.jm && window.jm.get_data) {
                const data = window.jm.get_data();
                if (data && data.data) {
                    return data;
                }
            }
            
            // 尝试从统一存储获取
            if (this.storage) {
                // 这里需要知道当前活动的脑图ID
                // 可以从应用状态中获取
                const appState = this.storage.loadAppState('mindmap_editor');
                if (appState.last_edited_mindmap) {
                    return await this.storage.loadMindmap(appState.last_edited_mindmap);
                }
            }
            
            return null;
        } catch (error) {
            console.error('[关系数据管理器] 获取脑图数据失败:', error);
            return null;
        }
    }
    
    /**
     * 缓存关系数据
     */
    cacheRelationData(nodeId, relationData) {
        this.cache.set(nodeId, {
            data: relationData,
            timestamp: Date.now()
        });
        
        // 清理过期缓存
        this.cleanExpiredCache();
    }
    
    /**
     * 检查缓存是否有效
     */
    hasValidCache(nodeId) {
        if (!this.cache.has(nodeId)) {
            return false;
        }
        
        const cached = this.cache.get(nodeId);
        return Date.now() - cached.timestamp < this.cacheTimeout;
    }
    
    /**
     * 清理过期缓存
     */
    cleanExpiredCache() {
        const now = Date.now();
        for (const [nodeId, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.cacheTimeout) {
                this.cache.delete(nodeId);
            }
        }
    }
    
    /**
     * 创建空的关系数据
     */
    createEmptyRelationData(nodeId) {
        return {
            hierarchical_relations: [],
            semantic_relations: [],
            computed_layout: {},
            nodes: [],
            links: [],
            metadata: {
                source: 'empty',
                created_at: new Date().toISOString(),
                node_id: nodeId,
                total_nodes: 0,
                total_links: 0,
                error: 'No data available from any source'
            }
        };
    }
    
    /**
     * 获取缓存统计信息
     */
    getCacheStats() {
        const stats = {
            total_cached: this.cache.size,
            cache_timeout: this.cacheTimeout,
            cached_nodes: Array.from(this.cache.keys()),
            memory_usage: 0
        };
        
        // 估算内存使用量
        for (const cached of this.cache.values()) {
            stats.memory_usage += JSON.stringify(cached.data).length;
        }
        
        return stats;
    }
    
    /**
     * 清空所有缓存
     */
    clearCache() {
        console.log('[关系数据管理器] 清空所有缓存');
        this.cache.clear();
    }
    
    /**
     * 设置数据源优先级
     */
    setDataSourcePriority(priority) {
        if (Array.isArray(priority)) {
            this.dataSourcePriority = priority;
            console.log('[关系数据管理器] 数据源优先级已更新:', priority);
        }
    }
    
    /**
     * 批量获取多个节点的关系数据
     */
    async getBatchRelationData(nodeIds, options = {}) {
        console.log(`[关系数据管理器] 批量获取关系数据: ${nodeIds.length} 个节点`);
        
        const results = {};
        const promises = nodeIds.map(async nodeId => {
            try {
                const data = await this.getRelationData(nodeId, options);
                results[nodeId] = data;
            } catch (error) {
                console.error(`[关系数据管理器] 获取节点 ${nodeId} 关系失败:`, error);
                results[nodeId] = this.createEmptyRelationData(nodeId);
            }
        });
        
        await Promise.all(promises);
        return results;
    }
}

if (typeof window !== 'undefined') {
  window.RelationDataManager = RelationDataManager;
}
