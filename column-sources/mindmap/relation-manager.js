/**
 * 关系管理器
 * 负责创建、管理节点间的关系
 * 
 * @module relation-manager
 * @description 核心关系管理模块，复用Autogen框架组件
 */

import { RELATION_TYPES, DEFAULT_RELATION_TYPE, getRelationConfig, isValidRelationType } from './relation-types.js';

/**
 * 关系管理器类
 * @class RelationManager
 */
export class RelationManager {
    /**
     * 构造函数
     * @param {jsMind} jm - jsMind实例
     * @param {Object} dependencies - 依赖注入对象
     * @param {Object} options - 配置选项
     */
    constructor(jm, dependencies = {}, options = {}) {
        this.jm = jm;
        this.options = options;
        
        // 🔧 架构整改：强制使用StorageAdapter，移除直接访问window.AutogenUnifiedStorage
        this.storageAdapter = dependencies.storageAdapter;
        this.eventBus = dependencies.eventBus || window.AutogenEventBus;
        this.errorHandler = dependencies.errorHandler || window.ErrorHandler;
        
        // 强制要求StorageAdapter
        if (!this.storageAdapter) {
            throw new Error('[RelationManager] StorageAdapter是必需的依赖，请通过依赖注入提供');
        }
        
        // 验证依赖
        this._validateDependencies();
        
        console.log('[RelationManager] ✅ 初始化完成（使用StorageAdapter）');
    }
    
    /**
     * 验证依赖组件
     * @private
     */
    _validateDependencies() {
        if (!this.storageAdapter) {
            console.warn('[RelationManager] StorageAdapter未找到，数据持久化功能将不可用');
        }
        if (!this.eventBus) {
            console.warn('[RelationManager] AutogenEventBus未找到，事件通知功能将不可用');
        }
        if (!this.errorHandler) {
            console.warn('[RelationManager] ErrorHandler未找到，将使用默认错误处理');
        }
    }
    
    /**
     * 创建关系节点
     * @param {Object} sourceNode - 源节点
     * @param {Object} targetParent - 目标父节点
     * @param {string} relationType - 关系类型（默认RELATED_TO）
     * @param {Object} options - 额外选项
     * @returns {Object|null} 创建的关系节点
     */
    createRelationNode(sourceNode, targetParent, relationType = DEFAULT_RELATION_TYPE, options = {}) {
        try {
            // 1. 验证参数
            if (!sourceNode || !targetParent) {
                throw new Error('源节点和目标父节点不能为空');
            }
            
            if (!isValidRelationType(relationType)) {
                console.warn(`[RelationManager] 未知关系类型: ${relationType}，使用默认类型`);
                relationType = DEFAULT_RELATION_TYPE;
            }
            
            // 2. 生成新节点ID
            const newNodeId = jsMind.util.uuid.newid();
            
            // 3. 获取关系配置
            const relationConfig = getRelationConfig(relationType);
            
            // 4. 构建关系数据
            const relationData = this._buildRelationData(sourceNode, relationConfig);
            
            // 5. 添加关系符号到标题
            const originalTopic = this._getOriginalTopic(sourceNode);
            const newTopic = `${relationConfig.symbol} ${originalTopic}`;
            
            // 6. 使用jsMind API创建节点
            const newNode = this.jm.add_node(
                targetParent,
                newNodeId,
                newTopic,
                relationData
            );
            
            if (!newNode) {
                throw new Error('节点创建失败');
            }
            
            // 7. 设置节点颜色（使用jsMind内生API）
            this.jm.set_node_color(
                newNodeId,
                relationConfig.bgColor,
                relationConfig.fgColor
            );
            
            // 8. 递归复制子节点
            if (sourceNode.children && sourceNode.children.length > 0) {
                this._copyChildren(sourceNode, newNode, relationConfig);
            }
            
            // 9. 更新源节点计数器
            this._updateSourceNodeCounter(sourceNode, relationType);
            
            // 10. 触发事件（使用AutogenEventBus）
            this._emitRelationEvent('created', {
                sourceNodeId: sourceNode.id,
                targetNodeId: newNodeId,
                relationType: relationType,
                relationSymbol: relationConfig.symbol,
                timestamp: new Date().toISOString()
            });
            
            // 11. 自动保存（使用AutogenUnifiedStorage）
            this._saveToStorage();
            
            console.log(`[RelationManager] 关系节点创建成功: ${newNodeId} (${relationType})`);
            return newNode;
            
        } catch (err) {
            // 使用ErrorHandler统一错误处理
            this._handleError(err, 'createRelationNode', {
                sourceNodeId: sourceNode?.id,
                targetParentId: targetParent?.id,
                relationType
            });
            return null;
        }
    }
    
    /**
     * 构建关系数据
     * @private
     * @param {Object} sourceNode - 源节点
     * @param {Object} relationConfig - 关系配置
     * @returns {Object} 关系数据对象
     */
    _buildRelationData(sourceNode, relationConfig) {
        return {
            // 复制源节点的所有数据
            ...sourceNode.data,
            
            // 关系元数据
            isRelationNode: true,
            sourceNodeId: sourceNode.id,
            relationType: relationConfig.neo4jType,
            relationSymbol: relationConfig.symbol,
            relationStrength: relationConfig.strength,
            relationDirection: relationConfig.direction,
            createdAt: new Date().toISOString(),
            
            // 样式数据（jsMind内生支持）
            'background-color': relationConfig.bgColor,
            'foreground-color': relationConfig.fgColor
        };
    }
    
    /**
     * 获取节点的原始标题（去除计数器和关系符号）
     * @private
     * @param {Object} node - 节点对象
     * @returns {string} 原始标题
     */
    _getOriginalTopic(node) {
        if (node.data && node.data.original_topic) {
            return node.data.original_topic;
        }
        
        // 去除计数器标记 [复制×N]
        let topic = node.topic.replace(/\s*\[复制×\d+\]\s*$/, '');
        
        // 去除关系符号前缀
        const symbols = Object.values(RELATION_TYPES).map(config => config.symbol);
        for (const symbol of symbols) {
            if (topic.startsWith(symbol + ' ')) {
                topic = topic.substring(symbol.length + 1);
                break;
            }
        }
        
        return topic;
    }
    
    /**
     * 递归复制子节点
     * @private
     * @param {Object} sourceNode - 源节点
     * @param {Object} targetNode - 目标节点
     * @param {Object} relationConfig - 关系配置
     */
    _copyChildren(sourceNode, targetNode, relationConfig) {
        if (!sourceNode.children || sourceNode.children.length === 0) {
            return;
        }
        
        sourceNode.children.forEach(child => {
            const childId = jsMind.util.uuid.newid();
            
            // 子节点继承关系标识，但不添加符号前缀
            const childData = {
                ...child.data,
                isRelationNode: true,
                sourceNodeId: child.data.sourceNodeId || sourceNode.id,
                relationType: relationConfig.neo4jType,
                'background-color': relationConfig.bgColor,
                'foreground-color': relationConfig.fgColor
            };
            
            const newChild = this.jm.add_node(
                targetNode,
                childId,
                child.topic,  // 子节点保持原标题
                childData
            );
            
            // 递归处理子节点的子节点
            if (child.children && child.children.length > 0) {
                this._copyChildren(child, newChild, relationConfig);
            }
        });
    }
    
    /**
     * 更新源节点计数器
     * @private
     * @param {Object} sourceNode - 源节点
     * @param {string} relationType - 关系类型
     */
    _updateSourceNodeCounter(sourceNode, relationType) {
        try {
            // 初始化计数器
            if (!sourceNode.data.copy_count) {
                sourceNode.data.copy_count = 0;
                sourceNode.data.original_topic = this._getOriginalTopic(sourceNode);
            }
            
            // 初始化复制记录
            if (!sourceNode.data.copied_to) {
                sourceNode.data.copied_to = [];
            }
            
            // 增加计数
            sourceNode.data.copy_count++;
            
            // 记录复制信息
            sourceNode.data.copied_to.push({
                relationType: relationType,
                timestamp: new Date().toISOString()
            });
            
            // 更新标题显示计数器
            const newTopic = `${sourceNode.data.original_topic} [复制×${sourceNode.data.copy_count}]`;
            this.jm.update_node(sourceNode.id, newTopic);
            
            console.log(`[RelationManager] 源节点计数器更新: ${sourceNode.id} -> ${sourceNode.data.copy_count}`);
            
        } catch (err) {
            console.error('[RelationManager] 更新源节点计数器失败:', err);
        }
    }
    
    /**
     * 触发关系事件
     * @private
     * @param {string} action - 动作类型
     * @param {Object} data - 事件数据
     */
    _emitRelationEvent(action, data) {
        if (this.eventBus) {
            try {
                this.eventBus.emit(`mindmap.relation.${action}`, data);
            } catch (err) {
                console.error('[RelationManager] 触发事件失败:', err);
            }
        }
    }
    
    /**
     * 保存到统一存储
     * @private
     */
    async _saveToStorage() {
        if (!this.storageAdapter) {
            return;
        }
        
        try {
            const mindmapData = this.jm.get_data();
            // 🔧 架构整改：使用StorageAdapter保存数据
            await this.storageAdapter.saveMindmap(mindmapData);
            console.log('[RelationManager] ✅ 数据已通过StorageAdapter保存');
        } catch (err) {
            console.error('[RelationManager] 保存失败:', err);
        }
    }
    
    /**
     * 错误处理
     * @private
     * @param {Error} err - 错误对象
     * @param {string} action - 动作名称
     * @param {Object} context - 上下文信息
     */
    _handleError(err, action, context = {}) {
        if (this.errorHandler) {
            this.errorHandler.handle(err, {
                component: 'RelationManager',
                action: action,
                context: context
            });
        } else {
            console.error(`[RelationManager] ${action} 失败:`, err, context);
        }
    }
    
    /**
     * 获取所有关系节点
     * @returns {Array<Object>} 关系节点数组
     */
    getAllRelationNodes() {
        const relations = [];
        const mindmapData = this.jm.get_data();
        
        const traverse = (node) => {
            if (node.data && node.data.isRelationNode) {
                relations.push({
                    id: node.id,
                    sourceNodeId: node.data.sourceNodeId,
                    relationType: node.data.relationType,
                    relationSymbol: node.data.relationSymbol,
                    topic: node.topic,
                    createdAt: node.data.createdAt
                });
            }
            
            if (node.children) {
                node.children.forEach(child => traverse(child));
            }
        };
        
        traverse(mindmapData.data);
        return relations;
    }
    
    /**
     * 统计关系信息
     * @returns {Object} 统计数据
     */
    getRelationStats() {
        const relations = this.getAllRelationNodes();
        const stats = {
            total: relations.length,
            byType: {},
            byStrength: { normal: 0, strong: 0 },
            byDirection: { both: 0, out: 0, in: 0 }
        };
        
        relations.forEach(rel => {
            // 按类型统计
            if (!stats.byType[rel.relationType]) {
                stats.byType[rel.relationType] = 0;
            }
            stats.byType[rel.relationType]++;
            
            // 按强度和方向统计
            const config = getRelationConfig(rel.relationType);
            if (config) {
                stats.byStrength[config.strength]++;
                stats.byDirection[config.direction]++;
            }
        });
        
        return stats;
    }
    
    /**
     * 删除关系节点
     * @param {string} nodeId - 节点ID
     * @returns {boolean} 是否成功
     */
    removeRelationNode(nodeId) {
        try {
            const node = this.jm.get_node(nodeId);
            if (!node || !node.data.isRelationNode) {
                console.warn('[RelationManager] 节点不是关系节点:', nodeId);
                return false;
            }
            
            // 删除节点
            this.jm.remove_node(nodeId);
            
            // 更新源节点计数器（减少）
            const sourceNode = this.jm.get_node(node.data.sourceNodeId);
            if (sourceNode && sourceNode.data.copy_count > 0) {
                sourceNode.data.copy_count--;
                const newTopic = sourceNode.data.copy_count > 0
                    ? `${sourceNode.data.original_topic} [复制×${sourceNode.data.copy_count}]`
                    : sourceNode.data.original_topic;
                this.jm.update_node(sourceNode.id, newTopic);
            }
            
            // 触发事件
            this._emitRelationEvent('removed', {
                nodeId: nodeId,
                sourceNodeId: node.data.sourceNodeId
            });
            
            // 保存
            this._saveToStorage();
            
            console.log('[RelationManager] 关系节点已删除:', nodeId);
            return true;
            
        } catch (err) {
            this._handleError(err, 'removeRelationNode', { nodeId });
            return false;
        }
    }
}

console.log('[RelationManager] 关系管理器模块已加载');
