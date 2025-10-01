/**
 * 节点详情工作栏 - 全屏功能模块
 * 负责全屏编辑模式、布局管理、字体缩放、预览切换
 */
class FullscreenManager {
    constructor() {
        this.isFullscreen = false;
        this.isPreviewMode = false;
        this.fontSize = 14;
        this.init();
    }
    
    init() {
        this.bindFullscreenToggle();
        this.bindFullscreenControls();
        console.log('[FullscreenManager] 全屏模块初始化完成');
    }
    
    /**
     * 绑定全屏切换
     */
    bindFullscreenToggle() {
        const btn = document.getElementById('fullscreen-btn');
        const overlay = document.getElementById('mm-fs-overlay');
        const editor = document.getElementById('detail-content-editor');
        const fsEditor = document.getElementById('mm-fs-editor');
        
        // 使用箭头函数确保this指向正确，并只绑定一次
        const toggleFullscreen = (e) => {
            // 阻止默认行为和事件冒泡
            e.preventDefault();
            e.stopPropagation();
            
            this.isFullscreen = !this.isFullscreen;
            
            console.log('[FullscreenManager] 切换全屏状态:', this.isFullscreen);
            
            if (this.isFullscreen) {
                this.enterFullscreen(editor, fsEditor, overlay);
                btn.textContent = '🔳 退出全屏';
                btn.title = '退出全屏模式';
            } else {
                this.exitFullscreen(editor, fsEditor, overlay);
                btn.textContent = '🔲 全屏';
                btn.title = '全屏编辑模式';
            }
        };
        
        // 移除可能存在的旧监听器，添加新监听器
        btn.removeEventListener('click', toggleFullscreen);
        btn.addEventListener('click', toggleFullscreen);
        
        // 保存引用供后续使用
        this.toggleFullscreenHandler = toggleFullscreen;
        
        // ESC键退出全屏
        const escHandler = (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                e.preventDefault();
                this.isFullscreen = true; // 先设为true
                toggleFullscreen({ preventDefault: () => {}, stopPropagation: () => {} });
            }
        };
        
        document.removeEventListener('keydown', escHandler);
        document.addEventListener('keydown', escHandler);
    }
    
    /**
     * 绑定全屏内的控制按钮
     */
    bindFullscreenControls() {
        // 退出按钮 - 直接调用退出逻辑，不触发主按钮
        document.getElementById('fs-exit').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.isFullscreen) {
                const btn = document.getElementById('fullscreen-btn');
                const editor = document.getElementById('detail-content-editor');
                const fsEditor = document.getElementById('mm-fs-editor');
                const overlay = document.getElementById('mm-fs-overlay');
                
                this.exitFullscreen(editor, fsEditor, overlay);
                this.isFullscreen = false;
                btn.textContent = '🔲 全屏';
                btn.title = '全屏编辑模式';
            }
        });
        
        // 保存按钮
        document.getElementById('fs-save').addEventListener('click', () => {
            this.saveContent();
        });
        
        // 预览切换
        document.getElementById('fs-preview').addEventListener('click', () => {
            this.togglePreview();
        });
        
        // 字体缩放
        document.getElementById('fs-zoom-in').addEventListener('click', () => {
            this.zoomFont(+1);
        });
        
        document.getElementById('fs-zoom-out').addEventListener('click', () => {
            this.zoomFont(-1);
        });
        
        document.getElementById('fs-zoom-reset').addEventListener('click', () => {
            this.zoomFont(0);
        });
        
        // 会话管理按钮
        document.getElementById('mm-sel-all-cb').addEventListener('change', (e) => {
            window.sessionManager.selectAll(e.target.checked);
        });
        
        document.getElementById('add-session').addEventListener('click', () => {
            window.sessionManager.addSession();
        });
        
        document.getElementById('copy-selected').addEventListener('click', () => {
            window.sessionManager.copySelectedSessions();
        });
    }
    
    /**
     * 进入全屏模式
     */
    enterFullscreen(editor, fsEditor, overlay) {
        // 复制内容到全屏编辑器
        fsEditor.value = editor.value;
        
        // 显示覆盖层
        overlay.classList.add('active');
        
        // 计算布局
        this.calculateLayout();
        
        // 设置编辑器引用
        window.sessionManager.setEditor(fsEditor);
        
        // 解析并渲染会话列表
        window.sessionManager.parseSessions(fsEditor.value);
        window.sessionManager.renderSessionList();
        
        // 监听编辑器输入，实时更新会话列表
        fsEditor.addEventListener('input', this.onEditorInput.bind(this));
        
        // 应用当前字体大小
        fsEditor.style.fontSize = this.fontSize + 'px';
        
        fsEditor.focus();
        
        console.log('[FullscreenManager] 进入全屏模式');
    }
    
    /**
     * 退出全屏模式
     */
    exitFullscreen(editor, fsEditor, overlay) {
        // 同步内容回主编辑器
        editor.value = fsEditor.value;
        
        // 隐藏覆盖层
        overlay.classList.remove('active');
        
        // 清空会话选择
        window.sessionManager.clearSelection();
        
        // 重置预览状态
        if (this.isPreviewMode) {
            this.isPreviewMode = false;
            const preview = document.getElementById('mm-fs-preview');
            preview.classList.remove('active');
            fsEditor.style.display = 'block';
        }
        
        console.log('[FullscreenManager] 退出全屏模式');
    }
    
    /**
     * 计算全屏布局
     */
    calculateLayout() {
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        const gap = 20;
        
        // 编辑器面板（左侧，占60%宽度）
        const editorWidth = Math.floor(winWidth * 0.6);
        const editorLeft = gap;
        const editorTop = gap;
        const editorHeight = winHeight - gap * 2;
        
        // 会话列表面板（右侧，占35%宽度）
        const sessionsWidth = Math.floor(winWidth * 0.35);
        const sessionsLeft = editorLeft + editorWidth + gap;
        const sessionsTop = gap;
        const sessionsHeight = winHeight - gap * 2;
        
        const pane = document.getElementById('mm-fs-pane');
        const sessions = document.getElementById('mm-fs-sessions');
        
        pane.style.left = editorLeft + 'px';
        pane.style.top = editorTop + 'px';
        pane.style.width = editorWidth + 'px';
        pane.style.height = editorHeight + 'px';
        
        sessions.style.left = sessionsLeft + 'px';
        sessions.style.top = sessionsTop + 'px';
        sessions.style.width = sessionsWidth + 'px';
        sessions.style.height = sessionsHeight + 'px';
        
        console.log('[FullscreenManager] 布局计算完成:', {
            editor: { width: editorWidth, height: editorHeight },
            sessions: { width: sessionsWidth, height: sessionsHeight }
        });
    }
    
    /**
     * 编辑器输入事件（实时更新会话列表）
     */
    onEditorInput(e) {
        const editor = e.target;
        window.sessionManager.parseSessions(editor.value);
        window.sessionManager.renderSessionList();
    }
    
    /**
     * 保存内容
     */
    saveContent() {
        const fsEditor = document.getElementById('mm-fs-editor');
        const editor = document.getElementById('detail-content-editor');
        
        editor.value = fsEditor.value;
        
        if (window.detailColumn) {
            window.detailColumn.showToast('内容已保存');
        }
        
        console.log('[FullscreenManager] 内容已保存');
    }
    
    /**
     * 切换预览模式
     */
    togglePreview() {
        this.isPreviewMode = !this.isPreviewMode;
        
        const fsEditor = document.getElementById('mm-fs-editor');
        const preview = document.getElementById('mm-fs-preview');
        const btn = document.getElementById('fs-preview');
        
        if (this.isPreviewMode) {
            // 显示预览
            const markdown = fsEditor.value;
            preview.innerHTML = this.renderMarkdown(markdown);
            preview.classList.add('active');
            fsEditor.style.display = 'none';
            btn.textContent = '✏️ 编辑';
        } else {
            // 显示编辑器
            preview.classList.remove('active');
            fsEditor.style.display = 'block';
            btn.textContent = '👁️ 预览';
        }
        
        console.log('[FullscreenManager] 预览模式:', this.isPreviewMode);
    }
    
    /**
     * 字体缩放
     */
    zoomFont(delta) {
        const fsEditor = document.getElementById('mm-fs-editor');
        
        if (delta === 0) {
            // 重置
            this.fontSize = 14;
        } else {
            // 增减
            this.fontSize = Math.max(10, Math.min(24, this.fontSize + delta));
        }
        
        fsEditor.style.fontSize = this.fontSize + 'px';
        
        console.log('[FullscreenManager] 字体大小:', this.fontSize);
    }
    
    /**
     * 渲染Markdown
     */
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
}

// 创建全局实例
window.fullscreenManager = new FullscreenManager();
