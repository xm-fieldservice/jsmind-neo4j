/**
 * MindmapView.js - 脑图表现层
 * 
 * 职责：纯UI渲染和DOM操作，无业务逻辑
 * 架构层级：🌐 表现层 (Presentation Layer)
 */

class MindmapView {
    constructor() {
        this.containerId = 'mindmap-container';
        this.mind = null; // jsMind 实例
        
        // DOM元素缓存
        this.dom = {
            titleInput: document.getElementById('detail-title-input'),
            contentEditor: document.getElementById('detail-content-editor'),
            contentPreview: document.getElementById('detail-content-preview'),
            nodeIdText: document.getElementById('detail-node-id'),
            fileInput: document.getElementById('fileInputMindmap'),
            attachBtn: document.getElementById('detail-attachments-upload'),
            attachList: document.getElementById('detail-attachments-list'),
            attachInput: document.getElementById('fileInputAttachment'),
            toast: document.getElementById('mindmap-toast'),
            contextMenu: document.getElementById('mindmap-contextmenu'),
            containerEl: document.getElementById('mindmap-container'),
        };
        
        // 标签面板DOM缓存
        this.$tagGroups = document.getElementById('tag-groups');
        this.$tagList = document.getElementById('tag-list');
        this.$tagEmpty = document.getElementById('tag-panel-empty');
    }

    /**
     * 初始化jsMind实例
     */
    init() {
        try {
            // 确保 jsMind 已加载
            if (typeof jsMind === 'undefined') {
                setTimeout(() => this.init(), 100);
                return;
            }

            const options = {
                container: this.containerId,
                editable: true,
                theme: 'primary'
            };

            this.mind = new jsMind(options);
            console.log('[MindmapView] jsMind实例初始化完成');
            
        } catch (error) {
            console.error('[MindmapView] 初始化失败:', error);
        }
    }

    /**
     * 渲染脑图数据
     */
    renderMindmap(data) {
        try {
            if (!this.mind || !data) return;
            
            this.mind.show(data);
            console.log('[MindmapView] 脑图渲染完成');
            
        } catch (error) {
            console.error('[MindmapView] 渲染脑图失败:', error);
        }
    }

    /**
     * 更新节点详情显示
     */
    updateNodeDetails(nodeId, nodeData) {
        try {
            if (!nodeData) return;
            
            // 更新标题
            if (this.dom.titleInput) {
                this.dom.titleInput.value = nodeData.topic || '';
            }
            
            // 更新内容
            if (this.dom.contentEditor) {
                const content = nodeData.content || '';
                
                if (this.dom.contentEditor.tagName === 'DIV') {
                    // 富文本编辑器
                    this._renderMdPreview(this.dom.contentEditor, content);
                } else {
                    // 普通文本编辑器
                    this.dom.contentEditor.value = content;
                }
            }
            
            // 更新节点ID显示
            if (this.dom.nodeIdText) {
                this.dom.nodeIdText.textContent = nodeId || '';
            }
            
            // 渲染附件列表
            this.renderAttachmentList(nodeId, nodeData.attachments);
            
        } catch (error) {
            console.error('[MindmapView] 更新节点详情失败:', error);
        }
    }

    /**
     * 渲染附件列表
     */
    renderAttachmentList(nodeId, attachments) {
        try {
            const list = this.dom.attachList;
            if (!list) return;
            
            const items = Array.isArray(attachments) ? attachments : [];
            
            if (!items.length) {
                list.innerHTML = '<div class="att-empty">暂无附件</div>';
                return;
            }
            
            list.innerHTML = items.map((att, i) => {
                const name = (att && att.name) ? att.name : `附件${i+1}`;
                const size = att && att.size ? ` · ${att.size}` : '';
                const type = att && att.type ? ` · ${att.type}` : '';
                const ts = att && att.ts ? ` · ${att.ts}` : '';
                
                return `
                    <div class="att-item">
                        <span class="att-name" title="${name}">${name}</span>
                        <span class="att-meta">${size}${type}${ts}</span>
                        <span class="att-actions">
                            <button class="mm-btn att-view" data-action="view" data-index="${i}">查看/下载</button>
                            <button class="mm-btn att-remove" data-action="remove" data-index="${i}">删除</button>
                        </span>
                    </div>`;
            }).join('');
            
        } catch (error) {
            console.warn('[MindmapView] 渲染附件列表失败:', error);
        }
    }

    /**
     * 渲染标签面板
     */
    renderTagPanel(tagGroups, activeGroup) {
        try {
            if (!this.$tagGroups || !this.$tagList) return;
            
            // 渲染分组列表
            this._renderTagGroups(tagGroups, activeGroup);
            
            // 渲染标签列表
            this._renderTagList(tagGroups, activeGroup);
            
        } catch (error) {
            console.error('[MindmapView] 渲染标签面板失败:', error);
        }
    }

    /**
     * 渲染标签分组
     */
    _renderTagGroups(groups, activeGroup) {
        if (!groups || !groups.length) {
            this.$tagGroups.innerHTML = '<div class="tag-empty">暂无标签分组</div>';
            return;
        }
        
        const groupsHtml = groups.map(group => {
            const isActive = activeGroup === group.name;
            const emoji = this._getGroupEmoji(group.name);
            const theme = group.theme || '';
            
            return `
                <div class="tag-group ${theme} ${isActive ? 'active' : ''}" 
                     data-group="${group.name}">
                    <span class="tag-group-emoji">${emoji}</span>
                    <span class="tag-group-name">${group.name}</span>
                    <span class="tag-group-count">${group.tags.length}</span>
                </div>`;
        }).join('');
        
        this.$tagGroups.innerHTML = groupsHtml;
    }

    /**
     * 渲染标签列表
     */
    _renderTagList(groups, activeGroupName) {
        let tagItems = [];
        
        if (activeGroupName) {
            // 显示特定分组的标签
            const group = groups.find(g => g.name === activeGroupName);
            if (group) {
                tagItems = group.tags.map(tag => ({
                    name: tag,
                    theme: group.theme || ''
                }));
            }
        } else {
            // 显示所有标签
            const allTags = new Set();
            groups.forEach(group => {
                group.tags.forEach(tag => allTags.add(tag));
            });
            tagItems = Array.from(allTags).map(tag => ({ name: tag, theme: '' }));
        }
        
        if (!tagItems.length) {
            this.$tagList.innerHTML = '<div class="tag-empty">暂无标签</div>';
            return;
        }
        
        const tagsHtml = tagItems.map(item => 
            `<span class="tag-chip ${item.theme}" data-tag="${item.name}">${item.name}</span>`
        ).join('');
        
        this.$tagList.innerHTML = tagsHtml;
    }

    /**
     * 高亮活跃标签
     */
    highlightActiveTags(activeTags) {
        try {
            // 清除所有高亮
            this.$tagList.querySelectorAll('.tag-chip').forEach(chip => {
                chip.classList.remove('active');
            });
            
            // 添加活跃标签高亮
            activeTags.forEach(tag => {
                const chip = this.$tagList.querySelector(`[data-tag="${tag}"]`);
                if (chip) {
                    chip.classList.add('active');
                }
            });
            
        } catch (error) {
            console.warn('[MindmapView] 高亮活跃标签失败:', error);
        }
    }

    /**
     * 显示Toast消息
     */
    showToast(message, type = 'info') {
        try {
            if (!this.dom.toast) return;
            
            this.dom.toast.textContent = message;
            this.dom.toast.className = `mindmap-toast ${type} show`;
            
            setTimeout(() => {
                this.dom.toast.classList.remove('show');
            }, 3000);
            
        } catch (error) {
            console.warn('[MindmapView] 显示Toast失败:', error);
        }
    }

    /**
     * 渲染Markdown预览
     */
    _renderMdPreview(container, content) {
        try {
            if (!container || container.tagName !== 'DIV') return;
            
            // 简单的Markdown渲染
            let html = content
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');
            
            container.innerHTML = html;
            container.dataset.markdownContent = content;
            
        } catch (error) {
            console.warn('[MindmapView] 渲染Markdown预览失败:', error);
        }
    }

    /**
     * 获取分组emoji
     */
    _getGroupEmoji(groupName) {
        const emojiMap = {
            '管理': '👑',
            '点评': '💬', 
            '状态': '📊',
            '分类': '🏷️',
            '部门': '📚',
            '操作': '📌'
        };
        return emojiMap[groupName] || '🏷️';
    }

    /**
     * 选择节点
     */
    selectNode(nodeId) {
        try {
            if (!this.mind) return;
            
            const node = this.mind.get_node(nodeId);
            if (node) {
                this.mind.select_node(node);
            }
            
        } catch (error) {
            console.error('[MindmapView] 选择节点失败:', error);
        }
    }

    /**
     * 获取jsMind实例
     */
    getMind() {
        return this.mind;
    }

    /**
     * 销毁视图
     */
    destroy() {
        try {
            if (this.mind) {
                // jsMind没有destroy方法，清空容器
                const container = document.getElementById(this.containerId);
                if (container) {
                    container.innerHTML = '';
                }
            }
            this.mind = null;
            
        } catch (error) {
            console.error('[MindmapView] 销毁视图失败:', error);
        }
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.MindmapView = MindmapView;
}
