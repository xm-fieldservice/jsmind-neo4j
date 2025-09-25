/**
 * 标签面板交互功能
 */

class TagInteraction {
    constructor() {
        this.init();
    }
    
    init() {
        this.bindTagClickEvents();
        console.log('✅ 标签交互功能已初始化');
    }
    
    bindTagClickEvents() {
        // 使用事件委托监听标签点击
        document.addEventListener('click', (event) => {
            const tagChip = event.target.closest('.tag-chip');
            if (!tagChip) return;
            
            event.preventDefault();
            event.stopPropagation();
            
            const tagName = tagChip.dataset.tag || tagChip.textContent.trim();
            this.handleTagClick(tagName);
        });
    }
    
    handleTagClick(tagName) {
        console.log('🏷️ 标签被点击:', tagName);
        
        const hasNodeFocus = this.hasSelectedNode();
        
        if (hasNodeFocus) {
            // 情况A: 有节点焦点 - 给节点添加标签
            this.addTagToSelectedNode(tagName);
        } else {
            // 情况B: 无节点焦点 - 触发列表过滤
            this.triggerListFilter(tagName);
        }
    }
    
    hasSelectedNode() {
        // 检查是否有选中的节点
        const mc = window.mindmapController;
        if (!mc || !mc.mind) return false;
        
        const selectedNode = mc.mind.get_selected_node();
        return !!selectedNode;
    }
    
    addTagToSelectedNode(tagName) {
        const mc = window.mindmapController;
        if (!mc || !mc.mind) {
            console.warn('⚠️ MindmapController不可用');
            return;
        }
        
        const selectedNode = mc.mind.get_selected_node();
        if (!selectedNode) {
            console.warn('⚠️ 没有选中的节点');
            return;
        }
        
        try {
            // 获取节点当前内容
            const nodeData = selectedNode.data || {};
            let content = nodeData.content || '';
            
            // 解析现有标签
            const { tags: existingTags, body } = this.parseTagsFromContent(content);
            
            // 检查标签是否已存在
            if (existingTags.includes(tagName)) {
                console.log('ℹ️ 标签已存在:', tagName);
                this.showNotification(`标签"${tagName}"已存在`, 'info');
                return;
            }
            
            // 添加新标签
            const newTags = [...existingTags, tagName];
            const newContent = this.buildContentWithTags(newTags, body);
            
            // 更新节点内容
            mc.mind.update_node(selectedNode.id, null, newContent);
            
            // 同步到数据结构
            mc.syncJsMindToData();
            mc.saveMindmapToStorage();
            
            console.log('✅ 标签已添加到节点:', { nodeId: selectedNode.id, tag: tagName });
            this.showNotification(`已为节点添加标签"${tagName}"`, 'success');
            
            // 刷新详情面板
            if (mc.setSelectedNode) {
                mc.setSelectedNode(selectedNode.id);
            }
            
        } catch (error) {
            console.error('❌ 添加标签失败:', error);
            this.showNotification('添加标签失败', 'error');
        }
    }
    
    triggerListFilter(tagName) {
        // 触发全局标签点击事件，供列表过滤器监听
        const event = new CustomEvent('tagClicked', {
            detail: {
                tagName: tagName,
                hasNodeFocus: false
            }
        });
        
        window.dispatchEvent(event);
        console.log('🔍 触发列表过滤:', tagName);
    }
    
    parseTagsFromContent(content) {
        if (!content) return { tags: [], body: '' };
        
        const lines = content.split('\n');
        if (lines.length === 0) return { tags: [], body: content };
        
        const firstLine = lines[0].trim();
        const tagMatch = firstLine.match(/^标签[:：]\s*(.+)$/);
        
        if (!tagMatch) {
            return { tags: [], body: content };
        }
        
        const tagsStr = tagMatch[1];
        const tags = tagsStr.split(/[，,]/).map(s => s.trim()).filter(Boolean);
        
        // 移除标签行，保留其余内容
        const bodyLines = lines.slice(1);
        // 跳过紧随其后的空行
        while (bodyLines.length > 0 && bodyLines[0].trim() === '') {
            bodyLines.shift();
        }
        
        const body = bodyLines.join('\n');
        return { tags, body };
    }
    
    buildContentWithTags(tags, body) {
        if (tags.length === 0) {
            return body;
        }
        
        const tagLine = `标签: ${tags.join(', ')}`;
        return body ? `${tagLine}\n\n${body}` : tagLine;
    }
    
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
        `;
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// 初始化标签交互
let tagInteraction = null;

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        tagInteraction = new TagInteraction();
        window.tagInteraction = tagInteraction;
    }, 1500);
});

window.TagInteraction = TagInteraction;
