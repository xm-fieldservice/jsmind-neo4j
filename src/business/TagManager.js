/**
 * TagManager.js - 标签管理业务层
 * 
 * 职责：标签系统业务逻辑处理
 * 架构层级：🧠 业务层 (Business Layer)
 */

class TagManager {
    constructor(storage) {
        this.storage = storage;
        this.tagGroups = [];
        this.activeTagGroup = null;
        this.tagGroupThemes = {};
        
        // 初始化默认标签分组
        this._initDefaultTagGroups();
    }

    /**
     * 初始化默认标签分组
     */
    _initDefaultTagGroups() {
        this.tagGroups = [
            {
                name: '管理',
                theme: 'theme-blue',
                tags: ['重要', '紧急', '待办', '完成', '暂停']
            },
            {
                name: '点评',
                theme: 'theme-green', 
                tags: ['优秀', '良好', '一般', '需改进', '问题']
            },
            {
                name: '状态',
                theme: 'theme-yellow',
                tags: ['进行中', '已完成', '已取消', '待审核', '已发布']
            },
            {
                name: '分类',
                theme: 'theme-purple',
                tags: ['技术', '产品', '设计', '运营', '市场']
            },
            {
                name: '部门',
                theme: 'theme-orange',
                tags: ['研发', '产品', '设计', '运营', '销售']
            },
            {
                name: '操作',
                theme: 'theme-red',
                tags: ['新增', '修改', '删除', '查看', '审批']
            }
        ];
        
        // 建立主题映射
        this.tagGroups.forEach(group => {
            this.tagGroupThemes[group.name] = group.theme;
        });
    }

    /**
     * 从脑图数据中提取标签分组
     */
    extractTagGroupsFromMindmap(mindmapData) {
        try {
            if (!mindmapData) return this.tagGroups;
            
            const extractedGroups = [];
            const allTags = new Set();
            
            // 递归提取所有节点的标签
            const extractTags = (node) => {
                if (node.content) {
                    const tags = this._parseTagsFromContent(node.content).tags;
                    tags.forEach(tag => allTags.add(tag));
                }
                
                if (node.children) {
                    node.children.forEach(child => extractTags(child));
                }
            };
            
            extractTags(mindmapData);
            
            // 按现有分组归类标签
            this.tagGroups.forEach(group => {
                const groupTags = [];
                group.tags.forEach(tag => {
                    if (allTags.has(tag)) {
                        groupTags.push(tag);
                    }
                });
                
                if (groupTags.length > 0) {
                    extractedGroups.push({
                        name: group.name,
                        theme: group.theme,
                        tags: groupTags
                    });
                }
            });
            
            // 处理未分组的标签
            const categorizedTags = new Set();
            extractedGroups.forEach(group => {
                group.tags.forEach(tag => categorizedTags.add(tag));
            });
            
            const uncategorizedTags = Array.from(allTags).filter(tag => !categorizedTags.has(tag));
            if (uncategorizedTags.length > 0) {
                extractedGroups.push({
                    name: '其他',
                    theme: 'theme-gray',
                    tags: uncategorizedTags
                });
            }
            
            return extractedGroups.length > 0 ? extractedGroups : this.tagGroups;
            
        } catch (error) {
            console.error('[TagManager] 提取标签分组失败:', error);
            return this.tagGroups;
        }
    }

    /**
     * 从内容中解析标签
     */
    _parseTagsFromContent(content) {
        try {
            const lines = (content || '').split('\n');
            const tagLine = lines.find(line => line.trim().startsWith('标签:'));
            
            if (!tagLine) {
                return { tags: [], body: content };
            }
            
            // 提取标签
            const tagsPart = tagLine.replace(/^标签:\s*/, '');
            const tags = tagsPart.split(',').map(tag => tag.trim()).filter(Boolean);
            
            // 提取正文（去除标签行）
            const bodyLines = lines.filter(line => !line.trim().startsWith('标签:'));
            const body = bodyLines.join('\n').trim();
            
            return { tags, body };
            
        } catch (error) {
            console.warn('[TagManager] 解析标签失败:', error);
            return { tags: [], body: content };
        }
    }

    /**
     * 构建标签行
     */
    _buildTagsLine(tags) {
        const uniqueTags = Array.from(new Set(tags.filter(Boolean)));
        return uniqueTags.length ? `标签: ${uniqueTags.join(', ')}` : '';
    }

    /**
     * 为节点切换标签
     */
    toggleTagForNode(nodeData, tag) {
        try {
            if (!nodeData || !tag) return nodeData;
            
            const currentContent = nodeData.content || '';
            const { tags, body } = this._parseTagsFromContent(currentContent);
            
            // 切换标签
            const tagSet = new Set(tags);
            if (tagSet.has(tag)) {
                tagSet.delete(tag);
            } else {
                tagSet.add(tag);
            }
            
            // 重新构建内容
            const newTagsLine = this._buildTagsLine(Array.from(tagSet));
            const newContent = newTagsLine 
                ? `${newTagsLine}\n\n${body}`.replace(/\n\n\n+/g, '\n\n')
                : body;
            
            // 更新节点数据
            const updatedNode = { ...nodeData, content: newContent };
            
            // 应用操作emoji到标题
            this._applyOperationEmojisToTitle(updatedNode);
            
            return updatedNode;
            
        } catch (error) {
            console.error('[TagManager] 切换标签失败:', error);
            return nodeData;
        }
    }

    /**
     * 获取节点的标签列表
     */
    getTagsFromNode(nodeData) {
        try {
            if (!nodeData || !nodeData.content) return [];
            return this._parseTagsFromContent(nodeData.content).tags;
        } catch (error) {
            console.warn('[TagManager] 获取节点标签失败:', error);
            return [];
        }
    }

    /**
     * 应用操作emoji到标题
     */
    _applyOperationEmojisToTitle(nodeData) {
        try {
            if (!nodeData) return;
            
            const tags = this.getTagsFromNode(nodeData);
            const operationTags = tags.filter(tag => 
                ['新增', '修改', '删除', '查看', '审批'].includes(tag)
            );
            
            if (operationTags.length === 0) return;
            
            // 清理现有emoji
            let title = (nodeData.topic || nodeData.label || '').replace(/[📝✏️🗑️👀✅]\s*$/, '');
            
            // 添加对应emoji
            const emojiMap = {
                '新增': '📝',
                '修改': '✏️', 
                '删除': '🗑️',
                '查看': '👀',
                '审批': '✅'
            };
            
            const emojis = operationTags.map(tag => emojiMap[tag]).filter(Boolean);
            if (emojis.length > 0) {
                title = `${title} ${emojis.join('')}`;
            }
            
            // 更新标题
            if (nodeData.topic !== undefined) {
                nodeData.topic = title;
            }
            if (nodeData.label !== undefined) {
                nodeData.label = title;
            }
            
        } catch (error) {
            console.warn('[TagManager] 应用操作emoji失败:', error);
        }
    }

    /**
     * 按标签过滤节点
     */
    filterNodesByTags(mindmapData, filterTags) {
        try {
            if (!mindmapData || !filterTags || filterTags.length === 0) {
                return mindmapData;
            }
            
            const filterSet = new Set(filterTags);
            
            const filterNode = (node) => {
                const nodeTags = this.getTagsFromNode(node);
                const hasMatchingTag = nodeTags.some(tag => filterSet.has(tag));
                
                let filteredChildren = [];
                if (node.children) {
                    filteredChildren = node.children
                        .map(child => filterNode(child))
                        .filter(Boolean);
                }
                
                // 如果节点本身匹配或有匹配的子节点，则保留
                if (hasMatchingTag || filteredChildren.length > 0) {
                    return {
                        ...node,
                        children: filteredChildren
                    };
                }
                
                return null;
            };
            
            return filterNode(mindmapData);
            
        } catch (error) {
            console.error('[TagManager] 按标签过滤失败:', error);
            return mindmapData;
        }
    }

    /**
     * 获取标签统计信息
     */
    getTagStatistics(mindmapData) {
        try {
            const tagCounts = new Map();
            
            const countTags = (node) => {
                const tags = this.getTagsFromNode(node);
                tags.forEach(tag => {
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                });
                
                if (node.children) {
                    node.children.forEach(child => countTags(child));
                }
            };
            
            if (mindmapData) {
                countTags(mindmapData);
            }
            
            // 转换为数组并排序
            const statistics = Array.from(tagCounts.entries())
                .map(([tag, count]) => ({ tag, count }))
                .sort((a, b) => b.count - a.count);
            
            return statistics;
            
        } catch (error) {
            console.error('[TagManager] 获取标签统计失败:', error);
            return [];
        }
    }

    /**
     * 设置活跃标签分组
     */
    setActiveTagGroup(groupName) {
        this.activeTagGroup = groupName;
    }

    /**
     * 获取活跃标签分组
     */
    getActiveTagGroup() {
        return this.activeTagGroup;
    }

    /**
     * 获取所有标签分组
     */
    getTagGroups() {
        return this.tagGroups;
    }

    /**
     * 添加自定义标签分组
     */
    addTagGroup(name, theme, tags) {
        try {
            // 检查是否已存在
            const existingIndex = this.tagGroups.findIndex(g => g.name === name);
            
            const newGroup = { name, theme, tags: tags || [] };
            
            if (existingIndex >= 0) {
                // 更新现有分组
                this.tagGroups[existingIndex] = newGroup;
            } else {
                // 添加新分组
                this.tagGroups.push(newGroup);
            }
            
            // 更新主题映射
            this.tagGroupThemes[name] = theme;
            
            // 保存到存储
            this._saveTagGroups();
            
            return true;
            
        } catch (error) {
            console.error('[TagManager] 添加标签分组失败:', error);
            return false;
        }
    }

    /**
     * 删除标签分组
     */
    removeTagGroup(name) {
        try {
            const index = this.tagGroups.findIndex(g => g.name === name);
            if (index >= 0) {
                this.tagGroups.splice(index, 1);
                delete this.tagGroupThemes[name];
                
                // 如果删除的是活跃分组，清除活跃状态
                if (this.activeTagGroup === name) {
                    this.activeTagGroup = null;
                }
                
                // 保存到存储
                this._saveTagGroups();
                return true;
            }
            return false;
            
        } catch (error) {
            console.error('[TagManager] 删除标签分组失败:', error);
            return false;
        }
    }

    /**
     * 保存标签分组到存储
     */
    async _saveTagGroups() {
        try {
            if (this.storage) {
                await this.storage.store('tag_groups', 'user_tag_groups', {
                    groups: this.tagGroups,
                    themes: this.tagGroupThemes,
                    activeGroup: this.activeTagGroup
                });
            }
        } catch (error) {
            console.warn('[TagManager] 保存标签分组失败:', error);
        }
    }

    /**
     * 从存储加载标签分组
     */
    async loadTagGroups() {
        try {
            if (this.storage) {
                const data = await this.storage.retrieve('tag_groups', 'user_tag_groups');
                if (data) {
                    this.tagGroups = data.groups || this.tagGroups;
                    this.tagGroupThemes = data.themes || this.tagGroupThemes;
                    this.activeTagGroup = data.activeGroup || null;
                }
            }
        } catch (error) {
            console.warn('[TagManager] 加载标签分组失败:', error);
        }
    }

    /**
     * 重置为默认标签分组
     */
    resetToDefault() {
        this._initDefaultTagGroups();
        this.activeTagGroup = null;
        this._saveTagGroups();
    }

    /**
     * 导出标签配置
     */
    exportTagConfig() {
        return {
            groups: this.tagGroups,
            themes: this.tagGroupThemes,
            activeGroup: this.activeTagGroup,
            version: '1.0',
            exportTime: new Date().toISOString()
        };
    }

    /**
     * 导入标签配置
     */
    importTagConfig(config) {
        try {
            if (!config || !config.groups) {
                throw new Error('无效的标签配置');
            }
            
            this.tagGroups = config.groups;
            this.tagGroupThemes = config.themes || {};
            this.activeTagGroup = config.activeGroup || null;
            
            // 保存到存储
            this._saveTagGroups();
            
            return true;
            
        } catch (error) {
            console.error('[TagManager] 导入标签配置失败:', error);
            return false;
        }
    }

    /**
     * 销毁标签管理器
     */
    destroy() {
        this.tagGroups = [];
        this.activeTagGroup = null;
        this.tagGroupThemes = {};
        this.storage = null;
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.TagManager = TagManager;
}
