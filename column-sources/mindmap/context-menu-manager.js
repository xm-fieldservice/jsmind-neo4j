// 节点右键菜单管理器
class ContextMenuManager {
    constructor(jm, mindmapColumn) {
        this.jm = jm;
        this.mindmapColumn = mindmapColumn;
        this.menu = null;
        this.currentNode = null;
        this.maxRecursionDepth = 50; // 限制递归深度，避免性能问题
        
        console.log('[右键菜单] 初始化管理器');
        this.init();
    }

    init() {
        // 创建菜单DOM
        this.createMenuDOM();
        
        // 绑定右键事件
        this.bindContextMenuEvent();
        
        // 绑定菜单项点击事件
        this.bindMenuItemEvents();
        
        // 绑定全局点击隐藏菜单
        this.bindGlobalClick();
        
        console.log('[右键菜单] 初始化完成');
    }

    createMenuDOM() {
        // 创建菜单容器
        const menu = document.createElement('div');
        menu.id = 'contextMenu';
        menu.className = 'context-menu';
        menu.style.display = 'none';
        
        // 菜单HTML结构
        menu.innerHTML = `
            <div class="context-menu-item" data-action="copy-title">
                <span class="context-menu-item-icon">📋</span>
                <span>拷贝节点标题到剪贴板</span>
            </div>
            <div class="context-menu-item" data-action="copy-content">
                <span class="context-menu-item-icon">📄</span>
                <span>拷贝节点和内容到剪贴板</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="copy-tree-titles">
                <span class="context-menu-item-icon">🌳</span>
                <span>拷贝节点树标题（带格式）</span>
            </div>
            <div class="context-menu-item" data-action="copy-tree-markdown">
                <span class="context-menu-item-icon">📝</span>
                <span>拷贝节点树MD格式</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="paste-content">
                <span class="context-menu-item-icon">📥</span>
                <span>粘贴到内容框尾部</span>
            </div>
        `;
        
        document.body.appendChild(menu);
        this.menu = menu;
        
        console.log('[右键菜单] DOM创建完成');
    }

    bindContextMenuEvent() {
        // 使用jsMind的view.e_panel来绑定右键事件
        const panel = this.jm.view.e_panel;
        
        panel.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // 获取点击的元素
            const element = e.target;
            
            // 使用jsMind的API获取节点ID
            const nodeId = this.jm.view.get_binded_nodeid(element);
            
            // 检查是否点击在节点上
            if (nodeId && this.jm.view.is_node(element)) {
                const node = this.jm.get_node(nodeId);
                if (node) {
                    this.showMenu(e.clientX, e.clientY, node);
                    console.log('[右键菜单] 显示菜单，节点:', node.topic);
                }
            }
        });
        
        console.log('[右键菜单] 右键事件绑定完成');
    }

    bindMenuItemEvents() {
        const items = this.menu.querySelectorAll('.context-menu-item');
        
        items.forEach(item => {
            item.addEventListener('click', async (e) => {
                const action = item.getAttribute('data-action');
                console.log('[右键菜单] 执行操作:', action);
                
                try {
                    switch (action) {
                        case 'copy-title':
                            await this.handleCopyTitle();
                            break;
                        case 'copy-content':
                            await this.handleCopyContent();
                            break;
                        case 'copy-tree-titles':
                            await this.handleCopyTreeTitles();
                            break;
                        case 'copy-tree-markdown':
                            await this.handleCopyTreeMarkdown();
                            break;
                        case 'paste-content':
                            await this.handlePasteContent();
                            break;
                    }
                } catch (err) {
                    console.error('[右键菜单] 操作失败:', err);
                    if (window.ErrorHandler) {
                        window.ErrorHandler.handle(err, {
                            component: 'ContextMenuManager',
                            action: action
                        });
                    }
                    alert('操作失败: ' + err.message);
                }
                
                this.hideMenu();
            });
        });
        
        console.log('[右键菜单] 菜单项事件绑定完成');
    }

    bindGlobalClick() {
        document.addEventListener('click', (e) => {
            // 点击菜单外部时隐藏菜单
            if (this.menu && !this.menu.contains(e.target)) {
                this.hideMenu();
            }
        });
    }

    showMenu(x, y, node) {
        this.currentNode = node;
        
        // 智能定位，避免超出屏幕
        const menuRect = this.menu.getBoundingClientRect();
        const menuWidth = menuRect.width || 280; // 默认宽度
        const menuHeight = menuRect.height || 200; // 默认高度
        
        const maxX = window.innerWidth - menuWidth;
        const maxY = window.innerHeight - menuHeight;
        
        const finalX = Math.min(x, maxX);
        const finalY = Math.min(y, maxY);
        
        this.menu.style.left = finalX + 'px';
        this.menu.style.top = finalY + 'px';
        this.menu.style.display = 'block';
        
        console.log('[右键菜单] 菜单已显示，位置:', finalX, finalY);
    }

    hideMenu() {
        if (this.menu) {
            this.menu.style.display = 'none';
            this.currentNode = null;
            console.log('[右键菜单] 菜单已隐藏');
        }
    }

    // ========== 功能1: 拷贝节点标题 ==========
    async handleCopyTitle() {
        if (!this.currentNode) return;
        
        const title = this.currentNode.topic;
        await this.copyToClipboard(title);
        
        console.log('[右键菜单] 已复制标题:', title);
        this.showSuccessMessage('标题已复制到剪贴板');
    }

    // ========== 功能2: 拷贝节点和内容 ==========
    async handleCopyContent() {
        if (!this.currentNode) return;
        
        const title = this.currentNode.topic;
        const content = this.currentNode.data?.content || '';
        
        const text = content 
            ? `${title}\n\n${content}`
            : title;
        
        await this.copyToClipboard(text);
        
        console.log('[右键菜单] 已复制节点和内容');
        this.showSuccessMessage('节点和内容已复制到剪贴板');
    }

    // ========== 功能3: 拷贝节点树标题（带格式） ==========
    async handleCopyTreeTitles() {
        if (!this.currentNode) return;
        
        const text = this.collectNodeTreeTitles(this.currentNode, 0, 0);
        await this.copyToClipboard(text);
        
        console.log('[右键菜单] 已复制节点树标题');
        this.showSuccessMessage('节点树标题已复制到剪贴板（带缩进格式）');
    }

    collectNodeTreeTitles(node, depth, currentDepth) {
        // 限制递归深度
        if (currentDepth >= this.maxRecursionDepth) {
            console.warn('[右键菜单] 达到最大递归深度，停止遍历');
            return '';
        }
        
        const indent = '  '.repeat(depth);
        let result = `${indent}- ${node.topic}\n`;
        
        // 递归处理子节点
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                result += this.collectNodeTreeTitles(child, depth + 1, currentDepth + 1);
            });
        }
        
        return result;
    }

    // ========== 功能4: 拷贝节点树MD格式 ==========
    async handleCopyTreeMarkdown() {
        if (!this.currentNode) return;
        
        const markdown = this.collectNodeTreeMarkdown(this.currentNode, 1, 0);
        await this.copyToClipboard(markdown);
        
        console.log('[右键菜单] 已复制节点树Markdown');
        this.showSuccessMessage('节点树Markdown已复制到剪贴板');
    }

    collectNodeTreeMarkdown(node, depth, currentDepth) {
        // 限制递归深度
        if (currentDepth >= this.maxRecursionDepth) {
            console.warn('[右键菜单] 达到最大递归深度，停止遍历');
            return '';
        }
        
        // Markdown最多支持6级标题
        const heading = '#'.repeat(Math.min(depth, 6));
        let result = `${heading} ${node.topic}\n\n`;
        
        // 添加节点内容
        if (node.data && node.data.content) {
            result += `${node.data.content}\n\n`;
        }
        
        // 递归处理子节点
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                result += this.collectNodeTreeMarkdown(child, depth + 1, currentDepth + 1);
            });
        }
        
        return result;
    }

    // ========== 功能5: 粘贴到内容框尾部 ==========
    async handlePasteContent() {
        if (!this.currentNode) return;
        
        try {
            // 读取剪贴板内容
            const clipboardText = await navigator.clipboard.readText();
            
            if (!clipboardText || clipboardText.trim() === '') {
                alert('剪贴板为空');
                return;
            }
            
            // 获取当前内容
            const currentContent = this.currentNode.data?.content || '';
            
            // 构建新内容（使用分隔符）
            const separator = '\n\n---\n\n';
            const newContent = currentContent 
                ? `${currentContent}${separator}${clipboardText}`
                : clipboardText;
            
            // 更新节点内容
            if (!this.currentNode.data) {
                this.currentNode.data = {};
            }
            this.currentNode.data.content = newContent;
            
            // 更新编辑框显示（如果当前节点是选中节点）
            const selectedNode = this.jm.get_selected_node();
            if (selectedNode && selectedNode.id === this.currentNode.id) {
                const editor = document.getElementById('nodeContentEditor');
                if (editor) {
                    editor.value = newContent;
                }
            }
            
            // 触发保存
            if (this.mindmapColumn && typeof this.mindmapColumn.autoSave === 'function') {
                await this.mindmapColumn.autoSave();
            }
            
            console.log('[右键菜单] 已粘贴内容到尾部');
            this.showSuccessMessage('内容已粘贴到节点内容尾部');
            
            // 触发事件
            if (window.AutogenEventBus) {
                window.AutogenEventBus.emit('mindmap.node.content.pasted', {
                    nodeId: this.currentNode.id,
                    topic: this.currentNode.topic
                });
            }
        } catch (err) {
            console.error('[右键菜单] 粘贴失败:', err);
            
            // 如果是权限错误，提供降级方案提示
            if (err.name === 'NotAllowedError') {
                alert('无法访问剪贴板，请检查浏览器权限设置');
            } else {
                throw err;
            }
        }
    }

    // ========== 工具方法 ==========

    async copyToClipboard(text) {
        try {
            // 使用现代剪贴板API
            await navigator.clipboard.writeText(text);
            console.log('[右键菜单] 复制成功，长度:', text.length);
        } catch (err) {
            console.warn('[右键菜单] 现代API失败，尝试降级方案:', err);
            
            // 降级方案：使用document.execCommand
            this.fallbackCopyToClipboard(text);
        }
    }

    fallbackCopyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                console.log('[右键菜单] 降级复制成功');
            } else {
                throw new Error('execCommand复制失败');
            }
        } catch (err) {
            console.error('[右键菜单] 降级复制失败:', err);
            alert('复制失败，请手动复制');
        } finally {
            document.body.removeChild(textarea);
        }
    }

    showSuccessMessage(message) {
        // 简单的成功提示（可以后续优化为toast通知）
        console.log('[右键菜单] 成功:', message);
        
        // 临时使用alert，后续可以改为更优雅的提示
        // alert(message);
        
        // 或者使用LogPanel显示
        if (window.LogPanel) {
            window.LogPanel.log(message);
        }
    }
}

// 导出到全局
window.ContextMenuManager = ContextMenuManager;
