/**
 * 节点详情工作栏 - 核心逻辑模块
 * 负责基础功能：选项卡切换、预览、标签、附件、查询
 */
class DetailColumnCore {
    constructor() {
        this.currentNode = null;
        this.init();
    }
    
    init() {
        this.bindTabSwitching();
        this.bindPreviewToggle();
        this.bindPasteIcon();
        this.bindTagInteraction();
        this.bindAttachments();
        this.bindQueryActions();
        this.bindSaveAction();
        
        console.log('[DetailColumnCore] 核心模块初始化完成');
    }
    
    /**
     * 选项卡切换
     */
    bindTabSwitching() {
        const nav = document.getElementById('detail-tabs-nav');
        const content = document.getElementById('detail-tabs-content');
        
        nav.addEventListener('click', (e) => {
            const btn = e.target.closest('.tab-btn');
            if (!btn) return;
            
            const tab = btn.dataset.tab;
            
            // 切换按钮状态
            nav.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.toggle('active', b === btn);
            });
            
            // 切换面板显示
            content.querySelectorAll('.tab-pane').forEach(p => {
                p.classList.toggle('active', p.dataset.tab === tab);
            });
            
            console.log('[Tab] 切换到:', tab);
        });
    }
    
    /**
     * 预览切换
     */
    bindPreviewToggle() {
        const btn = document.getElementById('preview-toggle');
        const editor = document.getElementById('detail-content-editor');
        const preview = document.getElementById('content-preview');
        let isPreview = false;
        
        btn.addEventListener('click', () => {
            isPreview = !isPreview;
            
            if (isPreview) {
                // 显示预览
                const markdown = editor.value;
                preview.innerHTML = this.renderMarkdown(markdown);
                preview.style.display = 'block';
                editor.style.display = 'none';
                btn.textContent = '编辑';
            } else {
                // 显示编辑器
                preview.style.display = 'none';
                editor.style.display = 'block';
                btn.textContent = '预览';
            }
        });
    }
    
    /**
     * 粘贴图标功能
     */
    bindPasteIcon() {
        const btn = document.getElementById('paste-icon-btn');
        
        btn.addEventListener('click', async () => {
            try {
                // 读取剪贴板
                const text = await navigator.clipboard.readText();
                
                // 检测是否为emoji或icon
                if (this.isEmojiOrIcon(text)) {
                    const titleInput = document.getElementById('detail-title-input');
                    const currentValue = titleInput.value || '';
                    
                    // 如果标题已有图标，替换；否则添加到前面
                    if (this.hasLeadingIcon(currentValue)) {
                        titleInput.value = text + ' ' + currentValue.substring(currentValue.indexOf(' ') + 1);
                    } else {
                        titleInput.value = text + ' ' + currentValue;
                    }
                    
                    console.log('[Icon] 图标已粘贴:', text);
                    this.showToast('图标已粘贴');
                } else {
                    this.showToast('剪贴板中没有图标', 'warning');
                }
            } catch (err) {
                console.error('[Icon] 粘贴失败:', err);
                this.showToast('粘贴失败', 'error');
            }
        });
    }
    
    /**
     * 标签交互
     */
    bindTagInteraction() {
        // 详情面板标签
        document.querySelectorAll('#tag-panel .tag-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                chip.classList.toggle('active');
            });
        });
        
        // 查询面板标签
        document.querySelectorAll('#q1-tag-panel .tag-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                chip.classList.toggle('active');
            });
        });
    }
    
    /**
     * 附件管理
     */
    bindAttachments() {
        const btn = document.getElementById('add-attachment');
        const fileInput = document.getElementById('file-input-attachment');
        
        btn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                files.forEach(file => {
                    this.addAttachment(file);
                });
                this.showToast(`已添加 ${files.length} 个附件`);
            }
        });
    }
    
    /**
     * 查询功能
     */
    bindQueryActions() {
        // 查询1执行
        document.getElementById('q1-run')?.addEventListener('click', () => {
            const keyword = document.getElementById('q1-title-input').value;
            const fulltext = document.getElementById('q1-fulltext').checked;
            const selectedTags = this.getSelectedTags('q1-tag-panel');
            
            console.log('[Query1] 执行查询:', { keyword, fulltext, tags: selectedTags });
            
            // 模拟查询结果
            const result = document.getElementById('q1-result');
            result.innerHTML = `
                <div style="color:#374151;">
                    <strong>查询结果：</strong><br/>
                    关键词: ${keyword || '(无)'}<br/>
                    全文本: ${fulltext ? '是' : '否'}<br/>
                    标签: ${selectedTags.join(', ') || '(无)'}<br/><br/>
                    找到 0 个匹配节点
                </div>
            `;
            
            this.showToast('查询完成');
        });
        
        // 清空查询
        document.getElementById('q1-clear')?.addEventListener('click', () => {
            document.getElementById('q1-title-input').value = '';
            document.getElementById('q1-fulltext').checked = false;
            document.getElementById('q1-result').innerHTML = '暂无查询结果';
            
            // 清除所有选中的标签
            document.querySelectorAll('#q1-tag-panel .tag-chip').forEach(chip => {
                chip.classList.remove('active');
            });
            
            this.showToast('已清空');
        });
    }
    
    /**
     * 保存内容
     */
    bindSaveAction() {
        const btn = document.getElementById('save-content');
        btn.addEventListener('click', () => {
            const data = this.getCurrentData();
            console.log('[Save] 保存数据:', data);
            
            // TODO: 实际保存逻辑（调用存储系统）
            this.showToast('内容已保存');
        });
    }
    
    /**
     * 工具方法
     */
    isEmojiOrIcon(text) {
        // 简单检测：单个字符或emoji
        return text.length <= 5 && /[\u{1F000}-\u{1F9FF}]|[\p{Emoji}]/u.test(text);
    }
    
    hasLeadingIcon(text) {
        const firstChar = text.charAt(0);
        return this.isEmojiOrIcon(firstChar);
    }
    
    getSelectedTags(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return [];
        
        const activeTags = panel.querySelectorAll('.tag-chip.active');
        return Array.from(activeTags).map(chip => chip.textContent.trim());
    }
    
    renderMarkdown(markdown) {
        // 使用marked.js渲染，如果可用
        if (window.marked) {
            return marked.parse(markdown);
        }
        
        // 简单的Markdown渲染（回退）
        if (!markdown) return '<p style="color:#9ca3af;">无内容</p>';
        
        return markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br/>');
    }
    
    addAttachment(file) {
        const list = document.getElementById('attachments-list');
        const li = document.createElement('li');
        li.className = 'attachment-item';
        
        const icon = this.getFileIcon(file.type);
        const size = this.formatFileSize(file.size);
        
        li.innerHTML = `
            <div>
                <span class="attachment-name">${icon} ${file.name}</span>
                <div style="font-size:11px;color:#999;margin-top:2px;">${size}</div>
            </div>
            <div class="attachment-actions">
                <button class="btn btn-secondary" style="padding:4px 8px;font-size:12px;">打开</button>
                <button class="btn btn-secondary" style="padding:4px 8px;font-size:12px;" onclick="this.closest('li').remove()">删除</button>
            </div>
        `;
        
        list.appendChild(li);
    }
    
    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎬';
        if (mimeType.includes('pdf')) return '📕';
        if (mimeType.includes('word')) return '📘';
        if (mimeType.includes('excel')) return '📊';
        return '📄';
    }
    
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = 'toast' + (type !== 'success' ? ` ${type}` : '');
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    /**
     * 加载节点详情
     */
    loadNode(nodeData) {
        console.log('[DetailColumnCore] 加载节点:', nodeData);
        
        const titleInput = document.getElementById('detail-title-input');
        const nodeId = document.getElementById('detail-node-id');
        const contentEditor = document.getElementById('detail-content-editor');
        
        titleInput.value = nodeData.title || '';
        nodeId.textContent = `ID: ${nodeData.id || 'unknown'}`;
        contentEditor.value = nodeData.content || '';
        
        this.currentNode = nodeData;
        this.showToast('节点已加载');
    }
    
    /**
     * 获取当前编辑的数据
     */
    getCurrentData() {
        return {
            title: document.getElementById('detail-title-input').value,
            content: document.getElementById('detail-content-editor').value,
            tags: this.getSelectedTags('tag-panel')
        };
    }
}

// 暴露全局API
window.DetailColumnAPI = {
    loadNode: (nodeData) => {
        if (window.detailColumn) {
            window.detailColumn.loadNode(nodeData);
        }
    },
    
    getCurrentData: () => {
        if (window.detailColumn) {
            return window.detailColumn.getCurrentData();
        }
        return null;
    }
};
