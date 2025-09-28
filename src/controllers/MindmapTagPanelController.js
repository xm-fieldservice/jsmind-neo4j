/**
 * 程序员 - P1.3 标签面板控制器
 * 
 * 基于P0成功经验，从主控制器拆分标签管理功能
 * 减少主控制器代码量，提升模块化程度
 */

class MindmapTagPanelController {
    constructor(mainController, dependencyContainer = null) {
        this.mainController = mainController;
        this.container = dependencyContainer || window.GlobalDependencyContainer;
        this.tagPanel = null;
        this.initialized = false;
        
        // 标签管理状态
        this.tagGroups = new Map();
        this.selectedTags = new Set();
        this.filterActive = false;
        
        console.log('[TagPanelController] 标签面板控制器初始化');
    }
    
    /**
     * 初始化标签面板
     */
    async initialize() {
        try {
            // 创建标签面板UI
            this._createTagPanelUI();
            
            // 绑定事件监听器
            this._bindEventListeners();
            
            // 从脑图解析标签
            this._parseTagsFromMind();
            
            this.initialized = true;
            console.log('[TagPanelController] ✅ 标签面板控制器初始化完成');
            
        } catch (error) {
            console.error('[TagPanelController] 初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 创建标签面板UI
     */
    _createTagPanelUI() {
        // 检查是否已存在
        let existingPanel = document.getElementById('tag-panel');
        if (existingPanel) {
            this.tagPanel = existingPanel;
            return;
        }
        
        // 创建标签面板容器
        this.tagPanel = document.createElement('div');
        this.tagPanel.id = 'tag-panel';
        this.tagPanel.className = 'tag-panel';
        this.tagPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 280px;
            max-height: 400px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            overflow: hidden;
            display: none;
        `;
        
        // 创建标题栏
        const header = document.createElement('div');
        header.className = 'tag-panel-header';
        header.style.cssText = `
            padding: 12px 16px;
            background: #f8f9fa;
            border-bottom: 1px solid #eee;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <span>标签管理</span>
            <button class="tag-panel-close" style="background: none; border: none; font-size: 18px; cursor: pointer;">&times;</button>
        `;
        
        // 创建内容区域
        const content = document.createElement('div');
        content.className = 'tag-panel-content';
        content.style.cssText = `
            padding: 16px;
            max-height: 320px;
            overflow-y: auto;
        `;
        
        this.tagPanel.appendChild(header);
        this.tagPanel.appendChild(content);
        document.body.appendChild(this.tagPanel);
        
        console.log('[TagPanelController] ✅ 标签面板UI创建完成');
    }
    
    /**
     * 绑定事件监听器
     */
    _bindEventListeners() {
        // 关闭按钮
        const closeBtn = this.tagPanel.querySelector('.tag-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        // 点击面板外部关闭
        document.addEventListener('click', (e) => {
            if (this.tagPanel && 
                this.tagPanel.style.display !== 'none' && 
                !this.tagPanel.contains(e.target) &&
                !e.target.closest('.tag-toggle-btn')) {
                this.hide();
            }
        });
        
        // 监听脑图变化
        if (this.mainController.mind) {
            // 这里可以添加脑图变化监听
        }
    }
    
    /**
     * 从脑图解析标签
     */
    _parseTagsFromMind() {
        // 安全检查：确保脑图和数据都已加载
        if (!this.mainController || !this.mainController.mind) {
            console.log('[TagPanelController] 脑图未加载，跳过标签解析');
            return;
        }
        
        try {
            // 检查脑图是否已完全初始化
            if (typeof this.mainController.mind.get_data !== 'function') {
                console.log('[TagPanelController] 脑图API未就绪，延迟解析标签');
                // 延迟重试
                setTimeout(() => this._parseTagsFromMind(), 1000);
                return;
            }
            
            const mindData = this.mainController.mind.get_data();
            if (!mindData || !mindData.data) {
                console.log('[TagPanelController] 脑图数据为空，跳过标签解析');
                return;
            }
            
            this.tagGroups.clear();
            this._parseNodeTags(mindData.data);
            this._renderTagGroups();
            
            console.log('[TagPanelController] ✅ 标签解析完成');
            
        } catch (error) {
            console.error('[TagPanelController] 解析标签失败:', error);
            // 延迟重试一次
            setTimeout(() => {
                try {
                    this._parseTagsFromMind();
                } catch (retryError) {
                    console.error('[TagPanelController] 标签解析重试失败:', retryError);
                }
            }, 2000);
        }
    }
    
    /**
     * 递归解析节点标签
     */
    _parseNodeTags(node) {
        if (!node) return;
        
        // 检查是否是标签管理节点
        const topic = node.topic || '';
        if (topic === '标签管理' || topic === '系统标签') {
            this._parseTagManagementNode(node);
            return;
        }
        
        // 解析节点中的标签引用
        this._parseNodeTagReferences(node);
        
        // 递归处理子节点
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(child => this._parseNodeTags(child));
        }
    }
    
    /**
     * 解析标签管理节点
     */
    _parseTagManagementNode(tagNode) {
        if (!tagNode.children) return;
        
        tagNode.children.forEach(groupNode => {
            const groupName = groupNode.topic || '未命名分组';
            const tags = [];
            
            if (groupNode.children) {
                groupNode.children.forEach(tagChildNode => {
                    const tagName = tagChildNode.topic || '';
                    if (tagName) {
                        tags.push({
                            name: tagName,
                            id: tagChildNode.id,
                            color: tagChildNode.background_color || '#e3f2fd'
                        });
                    }
                });
            }
            
            if (tags.length > 0) {
                this.tagGroups.set(groupName, tags);
            }
        });
    }
    
    /**
     * 解析节点标签引用
     */
    _parseNodeTagReferences(node) {
        const topic = node.topic || '';
        
        // 简单的标签引用解析 (例如: #标签名)
        const tagMatches = topic.match(/#([^\s#]+)/g);
        if (tagMatches) {
            tagMatches.forEach(match => {
                const tagName = match.substring(1);
                // 这里可以添加标签引用统计逻辑
            });
        }
    }
    
    /**
     * 渲染标签分组
     */
    _renderTagGroups() {
        const content = this.tagPanel.querySelector('.tag-panel-content');
        if (!content) return;
        
        content.innerHTML = '';
        
        if (this.tagGroups.size === 0) {
            content.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无标签</div>';
            return;
        }
        
        this.tagGroups.forEach((tags, groupName) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'tag-group';
            groupDiv.style.cssText = 'margin-bottom: 16px;';
            
            const groupTitle = document.createElement('div');
            groupTitle.className = 'tag-group-title';
            groupTitle.style.cssText = `
                font-weight: 600;
                margin-bottom: 8px;
                color: #333;
                font-size: 14px;
            `;
            groupTitle.textContent = groupName;
            
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'tags-container';
            tagsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px;';
            
            tags.forEach(tag => {
                const tagElement = this._createTagElement(tag);
                tagsContainer.appendChild(tagElement);
            });
            
            groupDiv.appendChild(groupTitle);
            groupDiv.appendChild(tagsContainer);
            content.appendChild(groupDiv);
        });
    }
    
    /**
     * 创建标签元素
     */
    _createTagElement(tag) {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag-item';
        tagEl.style.cssText = `
            display: inline-block;
            padding: 4px 8px;
            background: ${tag.color};
            border: 1px solid #ddd;
            border-radius: 12px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        `;
        tagEl.textContent = tag.name;
        
        // 点击切换选中状态
        tagEl.addEventListener('click', () => {
            this._toggleTagSelection(tag, tagEl);
        });
        
        // 悬停效果
        tagEl.addEventListener('mouseenter', () => {
            tagEl.style.transform = 'scale(1.05)';
            tagEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        
        tagEl.addEventListener('mouseleave', () => {
            tagEl.style.transform = 'scale(1)';
            tagEl.style.boxShadow = 'none';
        });
        
        return tagEl;
    }
    
    /**
     * 切换标签选中状态
     */
    _toggleTagSelection(tag, element) {
        const isSelected = this.selectedTags.has(tag.name);
        
        if (isSelected) {
            this.selectedTags.delete(tag.name);
            element.style.background = tag.color;
            element.style.fontWeight = 'normal';
        } else {
            this.selectedTags.add(tag.name);
            element.style.background = '#2196f3';
            element.style.color = 'white';
            element.style.fontWeight = '600';
        }
        
        // 触发过滤更新
        this._updateTagFilter();
    }
    
    /**
     * 更新标签过滤
     */
    _updateTagFilter() {
        if (this.selectedTags.size === 0) {
            this.filterActive = false;
            // 显示所有节点
            this._showAllNodes();
        } else {
            this.filterActive = true;
            // 根据选中标签过滤节点
            this._filterNodesByTags();
        }
    }
    
    /**
     * 显示所有节点
     */
    _showAllNodes() {
        // 这里可以调用主控制器的方法来显示所有节点
        console.log('[TagPanelController] 显示所有节点');
    }
    
    /**
     * 根据标签过滤节点
     */
    _filterNodesByTags() {
        console.log('[TagPanelController] 按标签过滤:', Array.from(this.selectedTags));
        // 这里可以实现具体的过滤逻辑
    }
    
    /**
     * 显示标签面板
     */
    show() {
        if (this.tagPanel) {
            this.tagPanel.style.display = 'block';
            this._parseTagsFromMind(); // 刷新标签数据
        }
    }
    
    /**
     * 隐藏标签面板
     */
    hide() {
        if (this.tagPanel) {
            this.tagPanel.style.display = 'none';
        }
    }
    
    /**
     * 切换标签面板显示状态
     */
    toggle() {
        if (this.tagPanel) {
            if (this.tagPanel.style.display === 'none') {
                this.show();
            } else {
                this.hide();
            }
        }
    }
    
    /**
     * 获取控制器状态
     */
    getStatus() {
        return {
            initialized: this.initialized,
            tagGroupsCount: this.tagGroups.size,
            selectedTagsCount: this.selectedTags.size,
            filterActive: this.filterActive,
            visible: this.tagPanel && this.tagPanel.style.display !== 'none'
        };
    }
    
    /**
     * 销毁控制器
     */
    destroy() {
        if (this.tagPanel) {
            this.tagPanel.remove();
            this.tagPanel = null;
        }
        
        this.tagGroups.clear();
        this.selectedTags.clear();
        this.initialized = false;
        
        console.log('[TagPanelController] 标签面板控制器已销毁');
    }
}

// 全局导出
window.MindmapTagPanelController = MindmapTagPanelController;

console.log('[TagPanelController] 标签面板控制器类已加载');
