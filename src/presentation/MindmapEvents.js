/**
 * MindmapEvents.js - 脑图事件处理层
 * 
 * 职责：用户交互事件处理，无业务逻辑
 * 架构层级：🌐 表现层 (Presentation Layer)
 */

class MindmapEvents {
    constructor(mindmapView, mindmapController) {
        this.view = mindmapView;
        this.controller = mindmapController;
        this.selectedNode = null;
        this.clipboard = null;
        
        // 内容编辑脏标记
        this._contentDirty = false;
        
        // 初始化事件绑定
        this.bindEvents();
    }

    /**
     * 绑定所有事件
     */
    bindEvents() {
        this.bindDetailEvents();
        this.bindContextMenuEvents();
        this.bindTagPanelEvents();
        this.bindAttachmentEvents();
        this.bindKeyboardEvents();
        this.bindTestButtons();
    }

    /**
     * 绑定详情面板事件
     */
    bindDetailEvents() {
        try {
            const { titleInput, contentEditor } = this.view.dom;
            
            // 标题输入事件
            if (titleInput) {
                titleInput.addEventListener('input', () => {
                    this._debounceSave();
                });
                
                titleInput.addEventListener('blur', () => {
                    this.saveTitleFromDetail();
                });
            }
            
            // 内容编辑器事件
            if (contentEditor) {
                if (contentEditor.tagName === 'DIV') {
                    // 富文本编辑器
                    this._bindRichEditorEvents(contentEditor);
                } else {
                    // 普通文本编辑器
                    contentEditor.addEventListener('input', () => {
                        this._contentDirty = true;
                        this._debounceSave();
                    });
                    
                    contentEditor.addEventListener('blur', () => {
                        this.saveContentFromDetail();
                    });
                }
                
                // 粘贴事件
                contentEditor.addEventListener('paste', (e) => {
                    this._handleContentPaste(e, contentEditor);
                });
            }
            
        } catch (error) {
            console.error('[MindmapEvents] 绑定详情事件失败:', error);
        }
    }

    /**
     * 绑定富文本编辑器事件
     */
    _bindRichEditorEvents(editor) {
        if (!editor) return;
        
        try {
            // 输入事件
            editor.addEventListener('input', () => {
                const markdownContent = this._getMarkdownFromDiv(editor);
                editor.dataset.markdownContent = markdownContent;
                this._contentDirty = true;
                this._debounceSave();
            });
            
            // 粘贴事件
            editor.addEventListener('paste', (e) => {
                this._handleContentPaste(e, editor);
            });
            
        } catch (error) {
            console.warn('[MindmapEvents] 绑定富文本编辑器事件失败:', error);
        }
    }

    /**
     * 绑定右键菜单事件
     */
    bindContextMenuEvents() {
        try {
            const container = this.view.dom.containerEl;
            if (!container) return;
            
            container.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this._showContextMenu(e.clientX, e.clientY);
            });
            
            // 点击其他地方隐藏菜单
            document.addEventListener('click', () => {
                this._hideContextMenu();
            });
            
        } catch (error) {
            console.error('[MindmapEvents] 绑定右键菜单事件失败:', error);
        }
    }

    /**
     * 绑定标签面板事件
     */
    bindTagPanelEvents() {
        try {
            // 标签分组点击事件
            if (this.view.$tagGroups) {
                this.view.$tagGroups.addEventListener('click', (e) => {
                    const groupEl = e.target.closest('.tag-group');
                    if (groupEl) {
                        const groupName = groupEl.dataset.group;
                        this.controller.setActiveTagGroup(groupName);
                    }
                });
            }
            
            // 标签点击事件
            if (this.view.$tagList) {
                this.view.$tagList.addEventListener('click', (e) => {
                    const tagChip = e.target.closest('.tag-chip');
                    if (tagChip) {
                        const tagName = tagChip.dataset.tag;
                        this.controller.toggleTagForSelectedNode(tagName);
                    }
                });
            }
            
        } catch (error) {
            console.error('[MindmapEvents] 绑定标签面板事件失败:', error);
        }
    }

    /**
     * 绑定附件事件
     */
    bindAttachmentEvents() {
        try {
            const { attachBtn, attachInput, attachList } = this.view.dom;
            
            // 附件上传按钮
            if (attachBtn) {
                attachBtn.addEventListener('click', () => {
                    if (attachInput) attachInput.click();
                });
            }
            
            // 附件文件选择
            if (attachInput) {
                attachInput.addEventListener('change', (e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                        this.controller.handleAttachmentUpload(files[0]);
                    }
                });
            }
            
            // 附件列表操作
            if (attachList) {
                attachList.addEventListener('click', (e) => {
                    const action = e.target.dataset.action;
                    const index = parseInt(e.target.dataset.index);
                    
                    if (action === 'view') {
                        this.controller.viewAttachment(index);
                    } else if (action === 'remove') {
                        this.controller.removeAttachment(index);
                    }
                });
            }
            
        } catch (error) {
            console.error('[MindmapEvents] 绑定附件事件失败:', error);
        }
    }

    /**
     * 绑定键盘事件
     */
    bindKeyboardEvents() {
        try {
            document.addEventListener('keydown', (e) => {
                // Ctrl+S 保存
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    this.controller.saveMindmapToStorage(true);
                }
                
                // Ctrl+C 复制节点
                if (e.ctrlKey && e.key === 'c' && this.selectedNode) {
                    this._copyNode();
                }
                
                // Ctrl+V 粘贴节点
                if (e.ctrlKey && e.key === 'v' && this.clipboard) {
                    this._pasteNode();
                }
                
                // Delete 删除节点
                if (e.key === 'Delete' && this.selectedNode) {
                    this.controller.removeNode(this.selectedNode);
                }
                
                // F11 全屏编辑
                if (e.key === 'F11') {
                    e.preventDefault();
                    this.controller.enterFullscreenEditor();
                }
            });
            
        } catch (error) {
            console.error('[MindmapEvents] 绑定键盘事件失败:', error);
        }
    }

    /**
     * 绑定测试按钮
     */
    bindTestButtons() {
        try {
            // 测试按钮事件绑定
            const testButtons = document.querySelectorAll('[data-test-action]');
            testButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.target.dataset.testAction;
                    this._handleTestAction(action);
                });
            });
            
        } catch (error) {
            console.error('[MindmapEvents] 绑定测试按钮失败:', error);
        }
    }

    /**
     * 处理内容粘贴
     */
    _handleContentPaste(e, editor) {
        try {
            const items = e.clipboardData?.items;
            if (!items) return;
            
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    this._handleImagePaste(file, editor);
                    break;
                }
            }
            
        } catch (error) {
            console.warn('[MindmapEvents] 处理粘贴失败:', error);
        }
    }

    /**
     * 处理图片粘贴
     */
    _handleImagePaste(file, editor) {
        try {
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                const filename = `粘贴图片_${Date.now()}.png`;
                
                if (editor.tagName === 'DIV') {
                    // 富文本编辑器
                    this._createImageContainer(editor, base64, filename);
                } else {
                    // 普通编辑器，插入Markdown格式
                    const markdownImg = `![${filename}](${base64})`;
                    const cursorPos = editor.selectionStart;
                    const value = editor.value;
                    editor.value = value.slice(0, cursorPos) + markdownImg + value.slice(cursorPos);
                }
                
                this._contentDirty = true;
                this._debounceSave();
            };
            
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.warn('[MindmapEvents] 处理图片粘贴失败:', error);
        }
    }

    /**
     * 显示右键菜单
     */
    _showContextMenu(x, y) {
        try {
            const menu = this.view.dom.contextMenu;
            if (!menu) return;
            
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            menu.style.display = 'block';
            
        } catch (error) {
            console.warn('[MindmapEvents] 显示右键菜单失败:', error);
        }
    }

    /**
     * 隐藏右键菜单
     */
    _hideContextMenu() {
        try {
            const menu = this.view.dom.contextMenu;
            if (menu) {
                menu.style.display = 'none';
            }
        } catch (error) {
            console.warn('[MindmapEvents] 隐藏右键菜单失败:', error);
        }
    }

    /**
     * 复制节点
     */
    _copyNode() {
        try {
            if (!this.selectedNode) return;
            
            const node = this.controller.findNode(this.selectedNode);
            if (node) {
                this.clipboard = JSON.parse(JSON.stringify(node));
                this.view.showToast('节点已复制');
            }
            
        } catch (error) {
            console.warn('[MindmapEvents] 复制节点失败:', error);
        }
    }

    /**
     * 粘贴节点
     */
    _pasteNode() {
        try {
            if (!this.clipboard || !this.selectedNode) return;
            
            this.controller.addChildNode(this.selectedNode, this.clipboard);
            this.view.showToast('节点已粘贴');
            
        } catch (error) {
            console.warn('[MindmapEvents] 粘贴节点失败:', error);
        }
    }

    /**
     * 处理测试操作
     */
    _handleTestAction(action) {
        try {
            switch (action) {
                case 'create-snapshot':
                    this.controller.createSnapshot();
                    break;
                case 'load-snapshot':
                    this.controller.loadLatestSnapshot();
                    break;
                case 'export-json':
                    this.controller.exportToJSON();
                    break;
                case 'import-json':
                    this.controller.importFromJSON();
                    break;
                default:
                    console.warn('[MindmapEvents] 未知测试操作:', action);
            }
        } catch (error) {
            console.error('[MindmapEvents] 处理测试操作失败:', error);
        }
    }

    /**
     * 保存标题
     */
    saveTitleFromDetail() {
        try {
            if (!this.selectedNode || !this.view.dom.titleInput) return;
            
            const newTitle = this.view.dom.titleInput.value.trim();
            this.controller.updateNodeTitle(this.selectedNode, newTitle);
            
        } catch (error) {
            console.error('[MindmapEvents] 保存标题失败:', error);
        }
    }

    /**
     * 保存内容
     */
    saveContentFromDetail() {
        try {
            if (!this.selectedNode || !this.view.dom.contentEditor) return;
            
            let content = '';
            const editor = this.view.dom.contentEditor;
            
            if (editor.tagName === 'DIV') {
                // 富文本编辑器
                content = this._getMarkdownFromDiv(editor);
            } else {
                // 普通编辑器
                content = editor.value;
            }
            
            this.controller.updateNodeContent(this.selectedNode, content);
            this._contentDirty = false;
            
        } catch (error) {
            console.error('[MindmapEvents] 保存内容失败:', error);
        }
    }

    /**
     * 防抖保存
     */
    _debounceSave() {
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            this.saveContentFromDetail();
            this.controller.saveMindmapToStorage();
        }, 800);
    }

    /**
     * 从富文本编辑器获取Markdown内容
     */
    _getMarkdownFromDiv(editor) {
        if (!editor || editor.tagName !== 'DIV') return '';
        
        try {
            let html = editor.innerHTML;
            let textContent = editor.textContent || '';
            
            // HTML转Markdown
            let markdown = html
                .replace(/<img[^>]+alt="([^"]*)"[^>]+src="([^"]+)"[^>]*>/g, '![$1]($2)')
                .replace(/<h([1-6])>(.*?)<\/h[1-6]>/g, (m, level, text) => '#'.repeat(parseInt(level)) + ' ' + text)
                .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
                .replace(/<em>(.*?)<\/em>/g, '*$1*')
                .replace(/<br\s*\/?>/g, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/\n\n+/g, '\n\n')
                .trim();
            
            return markdown;
            
        } catch (error) {
            console.warn('[MindmapEvents] 获取Markdown内容失败:', error);
            return editor.textContent || '';
        }
    }

    /**
     * 创建图片容器
     */
    _createImageContainer(editor, base64, filename) {
        try {
            // 查找或创建图片显示区域
            let imageArea = editor.parentElement.querySelector('.content-images-area');
            
            if (!imageArea) {
                imageArea = document.createElement('div');
                imageArea.className = 'content-images-area';
                imageArea.style.cssText = `
                    margin-top: 10px;
                    padding: 10px;
                    border: 1px dashed #ddd;
                    border-radius: 4px;
                    background: #fafafa;
                `;
                editor.parentElement.appendChild(imageArea);
            }
            
            // 创建图片容器
            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-container';
            imgContainer.style.cssText = `
                position: relative;
                display: inline-block;
                margin: 5px;
                border: 1px solid #ddd;
                border-radius: 4px;
                overflow: hidden;
            `;
            
            // 创建图片元素
            const img = document.createElement('img');
            img.src = base64;
            img.alt = filename;
            img.style.cssText = `
                display: block;
                max-width: 200px;
                max-height: 200px;
                object-fit: cover;
            `;
            
            // 创建文件名标签
            const label = document.createElement('div');
            label.textContent = filename;
            label.style.cssText = `
                padding: 4px 8px;
                background: rgba(0,0,0,0.7);
                color: white;
                font-size: 12px;
                text-align: center;
            `;
            
            // 创建删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                width: 20px;
                height: 20px;
                border: none;
                border-radius: 50%;
                background: rgba(255,0,0,0.8);
                color: white;
                cursor: pointer;
                font-size: 12px;
                line-height: 1;
            `;
            
            deleteBtn.addEventListener('click', () => {
                imgContainer.remove();
                this._contentDirty = true;
                this._debounceSave();
                this.view.showToast('图片已删除');
            });
            
            // 组装元素
            imgContainer.appendChild(img);
            imgContainer.appendChild(label);
            imgContainer.appendChild(deleteBtn);
            imageArea.appendChild(imgContainer);
            
            // 显示图片区域
            imageArea.style.display = 'block';
            
        } catch (error) {
            console.warn('[MindmapEvents] 创建图片容器失败:', error);
        }
    }

    /**
     * 设置选中节点
     */
    setSelectedNode(nodeId) {
        this.selectedNode = nodeId;
    }

    /**
     * 销毁事件处理器
     */
    destroy() {
        // 清理定时器
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
        }
        
        // 清理引用
        this.view = null;
        this.controller = null;
        this.selectedNode = null;
        this.clipboard = null;
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.MindmapEvents = MindmapEvents;
}
