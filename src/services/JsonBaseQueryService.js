/**
 * JSON底座数据查询服务
 * 提供标准化的节点数据查询、过滤和呈现功能
 */

class JsonBaseQueryService {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5001';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
    }

    /**
     * 从JSON底座加载所有脑图数据
     * @returns {Promise<Array>} 脑图数据数组
     */
    async loadAllMindmaps() {
        const cacheKey = 'all_mindmaps';
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/load-json-base`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            if (!result.success || !result.data || !result.data.mindmaps) {
                throw new Error('JSON底座数据格式错误');
            }

            const mindmaps = result.data.mindmaps;
            this.cache.set(cacheKey, {
                data: mindmaps,
                timestamp: Date.now()
            });

            console.log(`[JsonBaseQuery] 成功加载 ${mindmaps.length} 个脑图`);
            return mindmaps;
        } catch (error) {
            console.error('[JsonBaseQuery] 加载脑图数据失败:', error);
            throw error;
        }
    }

    /**
     * 查询节点数据
     * @param {Object} queryOptions 查询选项
     * @param {string} queryOptions.nodeTopicPattern - 节点主题匹配模式（支持正则）
     * @param {string} queryOptions.contentPattern - 内容匹配模式（支持正则）
     * @param {Array<string>} queryOptions.mindmapIds - 限制查询的脑图ID列表
     * @param {number} queryOptions.maxResults - 最大结果数量
     * @param {boolean} queryOptions.includeChildren - 是否包含子节点
     * @param {Function} queryOptions.customFilter - 自定义过滤函数
     * @returns {Promise<Array>} 匹配的节点数据数组
     */
    async queryNodes(queryOptions = {}) {
        const {
            nodeTopicPattern,
            contentPattern,
            mindmapIds,
            maxResults = 100,
            includeChildren = false,
            customFilter
        } = queryOptions;

        try {
            const mindmaps = await this.loadAllMindmaps();
            const results = [];

            // 过滤脑图
            const targetMindmaps = mindmapIds 
                ? mindmaps.filter(m => mindmapIds.includes(m.id))
                : mindmaps;

            for (const mindmap of targetMindmaps) {
                if (!mindmap.data || !mindmap.data.data) continue;

                const foundNodes = this._searchNodesInTree(
                    mindmap.data.data, 
                    {
                        nodeTopicPattern,
                        contentPattern,
                        includeChildren,
                        customFilter
                    },
                    mindmap
                );

                results.push(...foundNodes);

                if (results.length >= maxResults) {
                    break;
                }
            }

            return results.slice(0, maxResults);
        } catch (error) {
            console.error('[JsonBaseQuery] 查询节点失败:', error);
            throw error;
        }
    }

    /**
     * 在节点树中搜索匹配的节点
     * @private
     */
    _searchNodesInTree(node, searchOptions, mindmap, parentPath = []) {
        const results = [];
        const {
            nodeTopicPattern,
            contentPattern,
            includeChildren,
            customFilter
        } = searchOptions;

        if (!node) return results;

        // 检查当前节点是否匹配
        let isMatch = true;

        // 主题匹配
        if (nodeTopicPattern && node.topic) {
            const regex = new RegExp(nodeTopicPattern, 'i');
            isMatch = isMatch && regex.test(node.topic);
        }

        // 内容匹配
        if (contentPattern && isMatch) {
            const content = node.content || node.data?.content || '';
            const regex = new RegExp(contentPattern, 'i');
            isMatch = isMatch && regex.test(content);
        }

        // 自定义过滤
        if (customFilter && isMatch) {
            isMatch = customFilter(node, mindmap, parentPath);
        }

        // 如果匹配，添加到结果
        if (isMatch) {
            results.push({
                node: includeChildren ? node : this._cloneNodeWithoutChildren(node),
                mindmap: {
                    id: mindmap.id,
                    name: mindmap.name,
                    meta: mindmap.data?.meta
                },
                path: [...parentPath, node.topic || node.id],
                depth: parentPath.length
            });
        }

        // 递归搜索子节点
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                const childResults = this._searchNodesInTree(
                    child,
                    searchOptions,
                    mindmap,
                    [...parentPath, node.topic || node.id]
                );
                results.push(...childResults);
            }
        }

        return results;
    }

    /**
     * 克隆节点但不包含子节点
     * @private
     */
    _cloneNodeWithoutChildren(node) {
        const cloned = { ...node };
        delete cloned.children;
        return cloned;
    }

    /**
     * 查找特定主题的节点（用于系统标签等特殊用途）
     * @param {string|Array<string>} topics - 要查找的主题名称
     * @param {Object} options - 查询选项
     * @returns {Promise<Object|null>} 找到的第一个匹配节点
     */
    async findNodeByTopic(topics, options = {}) {
        const topicArray = Array.isArray(topics) ? topics : [topics];
        
        try {
            const results = await this.queryNodes({
                customFilter: (node) => {
                    return topicArray.some(topic => 
                        node.topic === topic || 
                        (node.topic && node.topic.includes(topic))
                    );
                },
                maxResults: 1,
                includeChildren: true,
                ...options
            });

            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error('[JsonBaseQuery] 查找节点失败:', error);
            return null;
        }
    }

    /**
     * 获取系统标签数据（专用方法）
     * @returns {Promise<Object|null>} 系统标签数据包
     */
    async getSystemTags() {
        try {
            const result = await this.findNodeByTopic(['系统标签', '标签管理']);
            
            if (result && result.node) {
                console.log('[JsonBaseQuery] 找到系统标签节点:', result.mindmap.name);
                return {
                    data: result.node,
                    meta: result.mindmap.meta || {},
                    source: result.mindmap
                };
            }

            console.warn('[JsonBaseQuery] 未找到系统标签节点');
            return null;
        } catch (error) {
            console.error('[JsonBaseQuery] 获取系统标签失败:', error);
            return null;
        }
    }

    /**
     * 将查询结果渲染到列表项
     * @param {Array} queryResults - 查询结果
     * @param {HTMLElement} container - 容器元素
     * @param {Object} renderOptions - 渲染选项
     */
    renderToList(queryResults, container, renderOptions = {}) {
        const {
            showPath = true,
            showMindmapName = true,
            maxContentLength = 100,
            onItemClick,
            itemClassName = 'query-result-item'
        } = renderOptions;

        if (!container) {
            console.error('[JsonBaseQuery] 容器元素不存在');
            return;
        }

        // 清空容器
        container.innerHTML = '';

        if (!queryResults || queryResults.length === 0) {
            container.innerHTML = '<div class="no-results">未找到匹配的节点</div>';
            return;
        }

        // 创建列表项
        queryResults.forEach((result, index) => {
            const item = document.createElement('div');
            item.className = `${itemClassName} depth-${result.depth}`;
            
            // 构建内容
            let content = `<div class="node-topic">${result.node.topic || '未命名节点'}</div>`;
            
            if (showPath && result.path.length > 1) {
                const pathStr = result.path.slice(0, -1).join(' > ');
                content += `<div class="node-path">${pathStr}</div>`;
            }
            
            if (showMindmapName) {
                content += `<div class="mindmap-name">来源: ${result.mindmap.name}</div>`;
            }
            
            const nodeContent = result.node.content || result.node.data?.content || '';
            if (nodeContent) {
                const truncated = nodeContent.length > maxContentLength 
                    ? nodeContent.substring(0, maxContentLength) + '...'
                    : nodeContent;
                content += `<div class="node-content">${truncated}</div>`;
            }
            
            item.innerHTML = content;
            
            // 添加点击事件
            if (onItemClick) {
                item.style.cursor = 'pointer';
                item.addEventListener('click', () => onItemClick(result, index));
            }
            
            container.appendChild(item);
        });

        console.log(`[JsonBaseQuery] 渲染了 ${queryResults.length} 个结果到列表`);
    }

    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('[JsonBaseQuery] 缓存已清除');
    }

    /**
     * 获取缓存状态
     */
    getCacheStatus() {
        const status = {};
        for (const [key, value] of this.cache.entries()) {
            status[key] = {
                timestamp: value.timestamp,
                age: Date.now() - value.timestamp,
                expired: Date.now() - value.timestamp > this.cacheTimeout
            };
        }
        return status;
    }
}

// 创建全局实例
window.JsonBaseQueryService = window.JsonBaseQueryService || new JsonBaseQueryService();

// 导出类和实例
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JsonBaseQueryService };
}

console.log('[JsonBaseQuery] JSON底座查询服务已加载');
