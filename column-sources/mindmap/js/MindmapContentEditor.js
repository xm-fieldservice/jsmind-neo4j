/**
 * 脑图内容编辑器
 * 负责节点内容的加载、编辑和保存
 * 
 * @author 程序员
 * @date 2025-10-07
 * @version 1.0
 * 
 * Phase 2.1 - Task 2.1.1: 核心模块拆分 - 内容编辑器
 */

class MindmapContentEditor {
    constructor(jm, storageCoordinator, eventCoordinator, errorHandler) {
        this.jm = jm;
        this.storage = storageCoordinator;
        this.events = eventCoordinator;
        this.errorHandler = errorHandler;
        
        this.currentNodeId = null;
        this.autoSaveTimeout = null;
        
        this.init();
    }
    
    /**
     * 初始化
     */
    init() {
        this.bindEditorEvents();
        console.log('[ContentEditor] 内容编辑器初始化完成');
    }
    
    /**
     * 绑定编辑器事件
     */
    bindEditorEvents() {
        const titleInput = document.getElementById('nodeTitleEditor');
        const editor = document.getElementById('nodeContentEditor');
        
        if (titleInput) {
            titleInput.addEventListener('blur', () => {
                this.autoSaveCurrentContent();
            });
        }
        
        if (editor) {
            editor.addEventListener('blur', () => {
                this.autoSaveCurrentContent();
            });
            
            editor.addEventListener('input', () => {
                clearTimeout(this.autoSaveTimeout);
                this.autoSaveTimeout = setTimeout(() => {
                    this.autoSaveCurrentContent();
                }, 2000);
            });
        }
    }
    
    /**
     * 节点选择处理
     */
    onNodeSelected(node) {
        try {
            // 保存当前节点
            if (this.currentNodeId && this.currentNodeId !== node.id) {
                this.autoSaveCurrentContent();
            }
            
            this.currentNodeId = node.id;
            this.loadNodeContent(node);
            
            console.log('[ContentEditor] 节点选择:', node.topic);
            
            // 发射事件
            if (this.events) {
                this.events.emit('mindmap:editor:nodeSelected', {
                    nodeId: node.id,
                    topic: node.topic
                });
            }
        } catch (error) {
            if (this.errorHandler) {
                this.errorHandler.handle(error, {
                    component: 'MindmapContentEditor',
                    action: 'onNodeSelected'
                });
            } else {
                console.error('[ContentEditor] 节点选择失败:', error);
            }
        }
    }
    
    /**
     * 加载节点内容到编辑器
     */
    loadNodeContent(node) {
        try {
            const editor = document.getElementById('nodeContentEditor');
            const titleInput = document.getElementById('nodeTitleEditor');
            
            if (!editor || !titleInput) {
                console.warn('[ContentEditor] 编辑器元素未找到');
                return;
            }
            
            // 加载标题
            titleInput.value = node.topic || '';
            
            // 加载内容（兼容多种数据结构）
            let content = '';
            if (node.data && node.data.content) {
                content = node.data.content;
            } else if (node.content) {
                content = node.content;
            }
            
            editor.value = content;
            
            console.log('[ContentEditor] 节点内容已加载:', node.id);
        } catch (error) {
            if (this.errorHandler) {
                this.errorHandler.handle(error, {
                    component: 'MindmapContentEditor',
                    action: 'loadNodeContent'
                }, { silent: true });
            } else {
                console.error('[ContentEditor] 加载节点内容失败:', error);
            }
        }
    }
    
    /**
     * 自动保存当前内容
     */
    async autoSaveCurrentContent() {
        try {
            if (!this.currentNodeId) return;
            
            const node = this.jm.get_node(this.currentNodeId);
            if (!node) return;
            
            const editor = document.getElementById('nodeContentEditor');
            const titleInput = document.getElementById('nodeTitleEditor');
            
            if (!editor || !titleInput) return;
            
            // 保存标题
            const newTopic = titleInput.value.trim();
            if (newTopic && newTopic !== node.topic) {
                this.jm.update_node(node.id, newTopic);
            }
            
            // 保存内容
            const newContent = editor.value;
            if (!node.data) {
                node.data = {};
            }
            node.data.content = newContent;
            
            // 使用DataSyncHelper同步数据
            if (window.DataSyncHelper) {
                window.DataSyncHelper.syncNodeData(this.jm, node);
            }
            
            // 保存到存储
            if (this.storage) {
                const data = this.jm.get_data();
                if (window.DataSyncHelper) {
                    window.DataSyncHelper.syncAllNodes(this.jm, data);
                }
                await this.storage.saveMindmap(data, true);
            }
            
            console.log('[ContentEditor] 自动保存完成');
            
            // 发射事件
            if (this.events) {
                this.events.emit('mindmap:editor:autoSaved', {
                    nodeId: this.currentNodeId
                });
            }
        } catch (error) {
            if (this.errorHandler) {
                this.errorHandler.handle(error, {
                    component: 'MindmapContentEditor',
                    action: 'autoSaveCurrentContent'
                }, { silent: true });
            } else {
                console.error('[ContentEditor] 自动保存失败:', error);
            }
        }
    }
    
    /**
     * 手动保存（从侧栏）
     */
    async saveFromSidebar() {
        try {
            if (!this.currentNodeId) {
                alert('请先选择一个节点');
                return;
            }
            
            const node = this.jm.get_node(this.currentNodeId);
            if (!node) {
                alert('节点不存在');
                return;
            }
            
            const editor = document.getElementById('nodeContentEditor');
            const titleInput = document.getElementById('nodeTitleEditor');
            
            // 保存标题
            const newTopic = titleInput.value.trim();
            if (newTopic) {
                this.jm.update_node(node.id, newTopic);
            }
            
            // 保存内容
            const newContent = editor.value;
            if (!node.data) {
                node.data = {};
            }
            node.data.content = newContent;
            
            // 同步并保存
            if (window.DataSyncHelper) {
                window.DataSyncHelper.syncNodeData(this.jm, node);
            }
            
            const data = this.jm.get_data();
            if (window.DataSyncHelper) {
                window.DataSyncHelper.syncAllNodes(this.jm, data);
            }
            
            if (this.storage) {
                await this.storage.saveMindmap(data, true);
            }
            
            alert('保存成功！');
            
            // 发射事件
            if (this.events) {
                this.events.emit('mindmap:editor:saved', {
                    nodeId: this.currentNodeId
                });
            }
        } catch (error) {
            if (this.errorHandler) {
                this.errorHandler.handle(error, {
                    component: 'MindmapContentEditor',
                    action: 'saveFromSidebar'
                });
            }
            alert('保存失败：' + error.message);
        }
    }
    
    /**
     * 静默保存（无提示）
     */
    async saveFromSidebarSilent() {
        try {
            if (!this.currentNodeId) return;
            
            const node = this.jm.get_node(this.currentNodeId);
            if (!node) return;
            
            const editor = document.getElementById('nodeContentEditor');
            const titleInput = document.getElementById('nodeTitleEditor');
            
            // 保存标题
            const newTopic = titleInput.value.trim();
            if (newTopic) {
                this.jm.update_node(node.id, newTopic);
            }
            
            // 保存内容
            const newContent = editor.value;
            if (!node.data) {
                node.data = {};
            }
            node.data.content = newContent;
            
            // 同步并保存
            if (window.DataSyncHelper) {
                window.DataSyncHelper.syncNodeData(this.jm, node);
            }
            
            const data = this.jm.get_data();
            if (window.DataSyncHelper) {
                window.DataSyncHelper.syncAllNodes(this.jm, data);
            }
            
            if (this.storage) {
                await this.storage.saveMindmap(data, true);
            }
            
            console.log('[ContentEditor] 静默保存完成');
        } catch (error) {
            if (this.errorHandler) {
                this.errorHandler.handle(error, {
                    component: 'MindmapContentEditor',
                    action: 'saveFromSidebarSilent'
                }, { silent: true });
            } else {
                console.error('[ContentEditor] 静默保存失败:', error);
            }
        }
    }
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.MindmapContentEditor = MindmapContentEditor;
}

// 支持模块化导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindmapContentEditor;
}
