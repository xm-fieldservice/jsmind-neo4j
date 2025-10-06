/**
 * 脑图数据转换器：将树形结构转换为关系图格式
 * 程序员
 * 
 * 输入格式：数据底座v1.2规范（树形结构）
 * 输出格式：D3关系图格式（nodes + links）
 */

class MindmapToGraphConverter {
    constructor(options = {}) {
        this.options = {
            // 是否包含根节点
            includeRoot: options.includeRoot !== false,
            // 最大深度（0表示无限制）
            maxDepth: options.maxDepth || 0,
            // 关系类型映射
            relationshipType: options.relationshipType || 'child_of',
            relationshipLabel: options.relationshipLabel || '子节点',
            ...options
        };
        
        this.nodeCount = 0;
        this.linkCount = 0;
    }

    /**
     * 转换脑图数据为关系图格式
     * @param {Object} mindmapData - 脑图数据（v1.2格式）
     * @returns {Object} - {nodes: [], links: []}
     */
    convert(mindmapData) {
        console.log('[脑图转换器] 开始转换数据');
        
        // 重置计数器
        this.nodeCount = 0;
        this.linkCount = 0;
        
        const nodes = [];
        const links = [];
        
        // 验证数据格式
        if (!mindmapData || !mindmapData.data) {
            throw new Error('无效的脑图数据格式：缺少data字段');
        }
        
        // 递归遍历树形结构
        this._traverseNode(mindmapData.data, null, nodes, links, 0);
        
        console.log('[脑图转换器] 转换完成:', {
            nodes: nodes.length,
            links: links.length
        });
        
        return { nodes, links };
    }

    /**
     * 递归遍历节点
     * @private
     */
    _traverseNode(node, parentId, nodes, links, depth) {
        // 检查深度限制
        if (this.options.maxDepth > 0 && depth > this.options.maxDepth) {
            return;
        }
        
        // 跳过根节点（如果配置要求）
        if (!this.options.includeRoot && depth === 0 && node.id === 'root') {
            // 直接处理子节点
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    this._traverseNode(child, null, nodes, links, depth);
                });
            }
            return;
        }
        
        // 创建节点
        const graphNode = this._createGraphNode(node, depth);
        nodes.push(graphNode);
        this.nodeCount++;
        
        // 创建与父节点的关系
        if (parentId !== null) {
            const link = this._createLink(parentId, node.id, depth);
            links.push(link);
            this.linkCount++;
        }
        
        // 递归处理子节点
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                this._traverseNode(child, node.id, nodes, links, depth + 1);
            });
        }
    }

    /**
     * 创建图节点
     * @private
     */
    _createGraphNode(node, depth) {
        // 基础节点信息
        const graphNode = {
            id: node.id,
            label: node.topic || node.id,
            type: this._inferNodeType(node, depth),
            description: this._createDescription(node),
            depth: depth
        };
        
        // 添加元数据
        if (node.meta) {
            graphNode.meta = {
                createdAt: node.meta.createdAt,
                updatedAt: node.meta.updatedAt,
                itemType: node.meta.itemType
            };
        }
        
        // 添加内容（如果存在且不为空）
        if (node.data && node.data.content) {
            graphNode.content = node.data.content;
            // 内容预览（前100字符）
            graphNode.contentPreview = node.data.content.substring(0, 100);
        }
        
        return graphNode;
    }

    /**
     * 创建关系链接
     * @private
     */
    _createLink(sourceId, targetId, depth) {
        return {
            source: sourceId,
            target: targetId,
            type: this.options.relationshipType,
            label: this.options.relationshipLabel,
            value: Math.max(1, 5 - depth), // 深度越深，连接强度越弱
            depth: depth
        };
    }

    /**
     * 推断节点类型
     * @private
     */
    _inferNodeType(node, depth) {
        // 优先使用meta.itemType
        if (node.meta && node.meta.itemType) {
            return node.meta.itemType;
        }
        
        // 根据topic关键词推断
        const topic = node.topic || '';
        
        // 项目类
        if (topic.includes('项目') || topic.includes('系统') || topic.includes('平台')) {
            return 'project';
        }
        
        // 任务类
        if (topic.includes('任务') || topic.includes('开发') || topic.includes('实现') || 
            topic.includes('设计') || topic.includes('测试')) {
            return 'task';
        }
        
        // 人员类
        if (topic.includes('负责人') || topic.includes('工程师') || topic.includes('经理')) {
            return 'person';
        }
        
        // 里程碑类
        if (topic.includes('里程碑') || topic.includes('版本') || topic.includes('发布')) {
            return 'milestone';
        }
        
        // 根据深度推断
        if (depth === 0) return 'project';
        if (depth === 1) return 'category';
        if (depth === 2) return 'task';
        
        return 'default';
    }

    /**
     * 创建节点描述
     * @private
     */
    _createDescription(node) {
        const parts = [];
        
        // 添加topic
        if (node.topic) {
            parts.push(node.topic);
        }
        
        // 添加内容预览
        if (node.data && node.data.content) {
            const preview = node.data.content.substring(0, 50);
            if (preview) {
                parts.push(preview + (node.data.content.length > 50 ? '...' : ''));
            }
        }
        
        // 添加子节点数量
        if (node.children && node.children.length > 0) {
            parts.push(`${node.children.length}个子节点`);
        }
        
        return parts.join(' | ');
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            nodeCount: this.nodeCount,
            linkCount: this.linkCount
        };
    }

    /**
     * 转换并过滤（高级功能）
     * @param {Object} mindmapData - 脑图数据
     * @param {Function} nodeFilter - 节点过滤函数
     * @returns {Object} - {nodes: [], links: []}
     */
    convertWithFilter(mindmapData, nodeFilter) {
        const result = this.convert(mindmapData);
        
        if (!nodeFilter) return result;
        
        // 过滤节点
        const filteredNodes = result.nodes.filter(nodeFilter);
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        
        // 过滤关系（只保留两端都存在的关系）
        const filteredLinks = result.links.filter(link => 
            nodeIds.has(link.source) && nodeIds.has(link.target)
        );
        
        console.log('[脑图转换器] 过滤后:', {
            nodes: filteredNodes.length,
            links: filteredLinks.length
        });
        
        return {
            nodes: filteredNodes,
            links: filteredLinks
        };
    }

    /**
     * 按深度转换（只转换指定深度的节点）
     * @param {Object} mindmapData - 脑图数据
     * @param {Number} maxDepth - 最大深度
     * @returns {Object} - {nodes: [], links: []}
     */
    convertByDepth(mindmapData, maxDepth) {
        const originalMaxDepth = this.options.maxDepth;
        this.options.maxDepth = maxDepth;
        
        const result = this.convert(mindmapData);
        
        this.options.maxDepth = originalMaxDepth;
        return result;
    }

    /**
     * 按类型转换（只转换指定类型的节点）
     * @param {Object} mindmapData - 脑图数据
     * @param {Array<String>} types - 节点类型列表
     * @returns {Object} - {nodes: [], links: []}
     */
    convertByType(mindmapData, types) {
        return this.convertWithFilter(mindmapData, node => 
            types.includes(node.type)
        );
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindmapToGraphConverter;
}

console.log('[脑图转换器] 模块已加载');
