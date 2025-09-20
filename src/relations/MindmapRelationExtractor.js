/**
 * 脑图关系提取器
 * 从jsMind脑图数据中提取节点关系，生成关系图数据
 * 支持层次关系、语义关系和自定义关系的提取
 */

class MindmapRelationExtractor {
    constructor() {
        this.nodeTypes = {
            ROOT: 'root',
            BRANCH: 'branch',
            LEAF: 'leaf',
            PROJECT: 'project',
            TASK: 'task',
            RESOURCE: 'resource',
            MILESTONE: 'milestone',
            NOTE: 'note'
        };
        
        this.relationTypes = {
            CONTAINS: 'contains',
            DEPENDS_ON: 'depends_on',
            RELATES_TO: 'relates_to',
            PRECEDES: 'precedes',
            USES: 'uses',
            PRODUCES: 'produces'
        };
        
        this.colorScheme = {
            [this.nodeTypes.ROOT]: '#e74c3c',
            [this.nodeTypes.PROJECT]: '#3498db',
            [this.nodeTypes.TASK]: '#2ecc71',
            [this.nodeTypes.RESOURCE]: '#f39c12',
            [this.nodeTypes.MILESTONE]: '#9b59b6',
            [this.nodeTypes.NOTE]: '#95a5a6',
            [this.nodeTypes.BRANCH]: '#34495e',
            [this.nodeTypes.LEAF]: '#7f8c8d'
        };
    }
    
    /**
     * 从脑图数据提取关系
     * @param {Object} mindmapData - jsMind格式的脑图数据
     * @param {string} focusNodeId - 焦点节点ID（可选）
     * @returns {Object} 关系数据对象
     */
    extractRelations(mindmapData, focusNodeId = null) {
        console.log('[关系提取器] 开始提取脑图关系', { focusNodeId });
        
        if (!mindmapData || !mindmapData.data) {
            console.warn('[关系提取器] 无效的脑图数据');
            return this.createEmptyRelationData();
        }
        
        const nodes = [];
        const links = [];
        const metadata = {
            source: 'mindmap_extraction',
            extracted_at: new Date().toISOString(),
            focus_node_id: focusNodeId,
            extraction_method: 'hierarchical_traversal'
        };
        
        // 递归遍历脑图节点
        this.traverseNode(mindmapData.data, null, nodes, links, 0);
        
        // 如果指定了焦点节点，过滤相关节点和关系
        let filteredNodes = nodes;
        let filteredLinks = links;
        
        if (focusNodeId) {
            const result = this.filterByFocusNode(nodes, links, focusNodeId);
            filteredNodes = result.nodes;
            filteredLinks = result.links;
        }
        
        // 添加语义关系
        const semanticLinks = this.extractSemanticRelations(filteredNodes);
        filteredLinks.push(...semanticLinks);
        
        // 计算布局提示
        const layoutHints = this.calculateLayoutHints(filteredNodes, filteredLinks);
        
        const relationData = {
            hierarchical_relations: filteredLinks.filter(link => link.type === this.relationTypes.CONTAINS),
            semantic_relations: filteredLinks.filter(link => link.type !== this.relationTypes.CONTAINS),
            computed_layout: layoutHints,
            nodes: filteredNodes,
            links: filteredLinks,
            metadata: {
                ...metadata,
                total_nodes: filteredNodes.length,
                total_links: filteredLinks.length,
                max_depth: Math.max(...filteredNodes.map(n => n.level || 0))
            }
        };
        
        console.log('[关系提取器] 关系提取完成', {
            nodes: filteredNodes.length,
            links: filteredLinks.length
        });
        
        return relationData;
    }
    
    /**
     * 递归遍历脑图节点
     */
    traverseNode(node, parentId, nodes, links, level) {
        if (!node || !node.id) {
            return;
        }
        
        // 分析节点类型
        const nodeType = this.analyzeNodeType(node, level);
        
        // 创建节点数据
        const nodeData = {
            id: node.id,
            label: node.topic || node.id,
            type: nodeType,
            level: level,
            properties: {
                expanded: node.expanded !== false,
                direction: node.direction,
                content: node.data?.content || '',
                background_color: node.data?.['background-color'],
                foreground_color: node.data?.['foreground-color'],
                font_size: node.data?.['font-size'],
                font_weight: node.data?.['font-weight']
            },
            style: {
                fill: this.colorScheme[nodeType] || '#95a5a6',
                stroke: '#2c3e50',
                strokeWidth: level === 0 ? 3 : 1
            },
            metrics: {
                child_count: node.children ? node.children.length : 0,
                text_length: (node.topic || '').length,
                has_content: !!(node.data?.content)
            }
        };
        
        nodes.push(nodeData);
        
        // 创建父子关系
        if (parentId) {
            const linkData = {
                source: parentId,
                target: node.id,
                type: this.relationTypes.CONTAINS,
                label: '包含',
                value: 1.0,
                properties: {
                    hierarchy_level: level,
                    parent_type: nodes.find(n => n.id === parentId)?.type,
                    child_type: nodeType
                },
                style: {
                    stroke: '#7f8c8d',
                    strokeWidth: Math.max(1, 4 - level),
                    strokeDasharray: level > 2 ? '5,5' : 'none'
                }
            };
            
            links.push(linkData);
        }
        
        // 递归处理子节点
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(child => {
                this.traverseNode(child, node.id, nodes, links, level + 1);
            });
        }
    }
    
    /**
     * 分析节点类型
     */
    analyzeNodeType(node, level) {
        const topic = (node.topic || '').toLowerCase();
        
        // 根节点
        if (level === 0) {
            return this.nodeTypes.ROOT;
        }
        
        // 基于关键词分析
        if (topic.includes('项目') || topic.includes('project')) {
            return this.nodeTypes.PROJECT;
        }
        
        if (topic.includes('任务') || topic.includes('task') || topic.includes('todo')) {
            return this.nodeTypes.TASK;
        }
        
        if (topic.includes('资源') || topic.includes('resource') || topic.includes('文件')) {
            return this.nodeTypes.RESOURCE;
        }
        
        if (topic.includes('里程碑') || topic.includes('milestone') || topic.includes('目标')) {
            return this.nodeTypes.MILESTONE;
        }
        
        if (topic.includes('笔记') || topic.includes('note') || topic.includes('备注')) {
            return this.nodeTypes.NOTE;
        }
        
        // 基于层级和子节点数量分析
        const childCount = node.children ? node.children.length : 0;
        
        if (childCount > 0) {
            return level <= 2 ? this.nodeTypes.BRANCH : this.nodeTypes.BRANCH;
        } else {
            return this.nodeTypes.LEAF;
        }
    }
    
    /**
     * 根据焦点节点过滤相关节点和关系
     */
    filterByFocusNode(allNodes, allLinks, focusNodeId, maxDepth = 3) {
        const relatedNodeIds = new Set([focusNodeId]);
        const nodesToProcess = [focusNodeId];
        const processedNodes = new Set();
        
        // 广度优先搜索相关节点
        let currentDepth = 0;
        while (nodesToProcess.length > 0 && currentDepth < maxDepth) {
            const currentLevelNodes = [...nodesToProcess];
            nodesToProcess.length = 0;
            
            currentLevelNodes.forEach(nodeId => {
                if (processedNodes.has(nodeId)) return;
                processedNodes.add(nodeId);
                
                // 查找所有相关的连接
                allLinks.forEach(link => {
                    if (link.source === nodeId && !relatedNodeIds.has(link.target)) {
                        relatedNodeIds.add(link.target);
                        nodesToProcess.push(link.target);
                    }
                    if (link.target === nodeId && !relatedNodeIds.has(link.source)) {
                        relatedNodeIds.add(link.source);
                        nodesToProcess.push(link.source);
                    }
                });
            });
            
            currentDepth++;
        }
        
        // 过滤节点和连接
        const filteredNodes = allNodes.filter(node => relatedNodeIds.has(node.id));
        const filteredLinks = allLinks.filter(link => 
            relatedNodeIds.has(link.source) && relatedNodeIds.has(link.target)
        );
        
        return { nodes: filteredNodes, links: filteredLinks };
    }
    
    /**
     * 提取语义关系
     */
    extractSemanticRelations(nodes) {
        const semanticLinks = [];
        
        // 基于节点内容和标题的语义分析
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const node1 = nodes[i];
                const node2 = nodes[j];
                
                // 跳过已有层次关系的节点对
                if (this.hasHierarchicalRelation(node1, node2)) {
                    continue;
                }
                
                const relation = this.analyzeSemanticRelation(node1, node2);
                if (relation) {
                    semanticLinks.push(relation);
                }
            }
        }
        
        return semanticLinks;
    }
    
    /**
     * 分析两个节点间的语义关系
     */
    analyzeSemanticRelation(node1, node2) {
        const topic1 = (node1.label || '').toLowerCase();
        const topic2 = (node2.label || '').toLowerCase();
        
        // 依赖关系检测
        if (this.detectDependency(topic1, topic2)) {
            return {
                source: node1.id,
                target: node2.id,
                type: this.relationTypes.DEPENDS_ON,
                label: '依赖',
                value: 0.7,
                properties: {
                    semantic_type: 'dependency',
                    confidence: 0.7
                },
                style: {
                    stroke: '#e67e22',
                    strokeWidth: 2,
                    strokeDasharray: '3,3'
                }
            };
        }
        
        // 相关性检测
        const similarity = this.calculateSimilarity(topic1, topic2);
        if (similarity > 0.5) {
            return {
                source: node1.id,
                target: node2.id,
                type: this.relationTypes.RELATES_TO,
                label: '相关',
                value: similarity,
                properties: {
                    semantic_type: 'similarity',
                    confidence: similarity
                },
                style: {
                    stroke: '#3498db',
                    strokeWidth: 1,
                    strokeDasharray: '2,2'
                }
            };
        }
        
        return null;
    }
    
    /**
     * 检测依赖关系
     */
    detectDependency(topic1, topic2) {
        const dependencyKeywords = [
            ['需要', '依赖', '基于', '使用'],
            ['前置', '先决', 'prerequisite', 'require'],
            ['输入', '输出', 'input', 'output']
        ];
        
        return dependencyKeywords.some(keywords => 
            keywords.some(keyword => topic1.includes(keyword)) &&
            keywords.some(keyword => topic2.includes(keyword))
        );
    }
    
    /**
     * 计算文本相似度
     */
    calculateSimilarity(text1, text2) {
        // 简单的基于共同字符的相似度计算
        const chars1 = new Set(text1.split(''));
        const chars2 = new Set(text2.split(''));
        
        const intersection = new Set([...chars1].filter(x => chars2.has(x)));
        const union = new Set([...chars1, ...chars2]);
        
        return intersection.size / union.size;
    }
    
    /**
     * 检查是否存在层次关系
     */
    hasHierarchicalRelation(node1, node2) {
        return Math.abs(node1.level - node2.level) === 1;
    }
    
    /**
     * 计算布局提示
     */
    calculateLayoutHints(nodes, links) {
        const layoutHints = {
            suggested_layout: 'hierarchical',
            center_node: null,
            node_positions: {},
            force_settings: {
                linkDistance: 100,
                charge: -300,
                gravity: 0.1
            }
        };
        
        // 找到中心节点（连接数最多的节点）
        const nodeDegrees = {};
        nodes.forEach(node => {
            nodeDegrees[node.id] = 0;
        });
        
        links.forEach(link => {
            nodeDegrees[link.source] = (nodeDegrees[link.source] || 0) + 1;
            nodeDegrees[link.target] = (nodeDegrees[link.target] || 0) + 1;
        });
        
        const centerNodeId = Object.keys(nodeDegrees).reduce((a, b) => 
            nodeDegrees[a] > nodeDegrees[b] ? a : b
        );
        
        layoutHints.center_node = centerNodeId;
        
        // 根据层级建议位置
        nodes.forEach(node => {
            const angle = (node.level * Math.PI * 2) / Math.max(1, nodes.length);
            const radius = (node.level + 1) * 80;
            
            layoutHints.node_positions[node.id] = {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                fixed: node.level === 0 // 固定根节点
            };
        });
        
        return layoutHints;
    }
    
    /**
     * 创建空的关系数据
     */
    createEmptyRelationData() {
        return {
            hierarchical_relations: [],
            semantic_relations: [],
            computed_layout: {},
            nodes: [],
            links: [],
            metadata: {
                source: 'mindmap_extraction',
                extracted_at: new Date().toISOString(),
                total_nodes: 0,
                total_links: 0,
                error: 'No valid mindmap data'
            }
        };
    }
    
    /**
     * 获取节点统计信息
     */
    getExtractionStats(relationData) {
        const stats = {
            total_nodes: relationData.nodes.length,
            total_links: relationData.links.length,
            node_types: {},
            relation_types: {},
            max_depth: 0,
            avg_children_per_node: 0
        };
        
        // 统计节点类型
        relationData.nodes.forEach(node => {
            stats.node_types[node.type] = (stats.node_types[node.type] || 0) + 1;
            stats.max_depth = Math.max(stats.max_depth, node.level || 0);
        });
        
        // 统计关系类型
        relationData.links.forEach(link => {
            stats.relation_types[link.type] = (stats.relation_types[link.type] || 0) + 1;
        });
        
        // 计算平均子节点数
        const parentNodes = relationData.nodes.filter(node => node.metrics.child_count > 0);
        if (parentNodes.length > 0) {
            stats.avg_children_per_node = parentNodes.reduce((sum, node) => 
                sum + node.metrics.child_count, 0) / parentNodes.length;
        }
        
        return stats;
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindmapRelationExtractor;
} else {
    window.MindmapRelationExtractor = MindmapRelationExtractor;
}
