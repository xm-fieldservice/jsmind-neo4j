# Phase 2.1 实施计划 - 详细版

**制定时间**: 2025-10-07 20:34  
**制定人**: 程序员  
**预计工时**: 4-6小时

---

## 📊 当前状态

### 已完成
- ✅ Phase 0: 紧急修复 (100%)
- ✅ Phase 1: 提取样式和工具类 (67%)
- ✅ Phase 2.0: 架构对齐前置任务 (100%)

### 当前代码
- **HTML文件**: ~2100行
- **MindmapColumn类**: ~1200行
- **方法数量**: ~50个

### 可用协调器
1. ✅ MindmapStorageCoordinator - 存储管理
2. ✅ MindmapEventCoordinator - 事件管理
3. ✅ MindmapErrorHandler - 错误处理

---

## 🎯 Task 2.1.1: 内容编辑器模块

### 代码位置分析

#### onNodeSelected() - 第895-907行
```javascript
onNodeSelected(node) {
    // 如果之前有选中的节点，先保存其内容
    if (this.currentNodeId && this.currentNodeId !== node.id) {
        this.autoSaveCurrentNodeContent();
    }
    
    this.currentNodeId = node.id;
    
    console.log('[脑图工作栏] 节点选中:', node);
    
    // 同步右侧编辑框内容
    this.loadNodeContentToEditor(node);
}
```

#### loadNodeContentToEditor() - 第1400-1452行
```javascript
loadNodeContentToEditor(node) {
    try {
        const editor = document.getElementById('nodeContentEditor');
        const titleInput = document.getElementById('nodeTitleEditor');
        
        if (!editor || !titleInput) {
            console.warn('[脑图工作栏] 编辑器元素未找到');
            return;
        }
        
        // 加载标题
        titleInput.value = node.topic || '';
        
        // 加载内容（多种数据结构兼容）
        let content = '';
        if (node.data && node.data.content) {
            content = node.data.content;
        } else if (node.content) {
            content = node.content;
        }
        
        editor.value = content;
        
        // 触发事件
        this.emitEvent('mindmap.node.selected', {
            nodeId: node.id,
            topic: node.topic,
            mindmapId: this.mindmapId,
            data: node.data
        });
    } catch (e) {
        // 错误处理
    }
}
```

#### autoSaveCurrentNodeContent() - 第1057-1100行
```javascript
autoSaveCurrentNodeContent() {
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
        
        // 同步到导出数据
        DataSyncHelper.syncNodeData(this.jm, node);
        
        // 自动保存到存储
        const data = this.jm.get_data();
        DataSyncHelper.syncAllNodes(this.jm, data);
        this.saveToUnifiedStorage(data);
        
        console.log('[脑图工作栏] 自动保存完成');
    } catch (e) {
        // 错误处理
    }
}
```

#### saveContentFromSidebar() - 第1102-1140行
```javascript
saveContentFromSidebar() {
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
        DataSyncHelper.syncNodeData(this.jm, node);
        const data = this.jm.get_data();
        DataSyncHelper.syncAllNodes(this.jm, data);
        this.saveToUnifiedStorage(data);
        
        alert('保存成功！');
    } catch (e) {
        // 错误处理
    }
}
```

### 模块设计

```javascript
/**
 * 脑图内容编辑器
 * 负责节点内容的加载、编辑和保存
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
    
    init() {
        this.bindEditorEvents();
    }
    
    // 绑定编辑器事件
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
    
    // 节点选择处理
    onNodeSelected(node) {
        // 保存当前节点
        if (this.currentNodeId && this.currentNodeId !== node.id) {
            this.autoSaveCurrentContent();
        }
        
        this.currentNodeId = node.id;
        this.loadNodeContent(node);
        
        // 发射事件
        this.events.emit('mindmap:editor:nodeSelected', {
            nodeId: node.id,
            topic: node.topic
        });
    }
    
    // 加载节点内容
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
            
            // 加载内容
            let content = '';
            if (node.data && node.data.content) {
                content = node.data.content;
            } else if (node.content) {
                content = node.content;
            }
            
            editor.value = content;
            
            console.log('[ContentEditor] 节点内容已加载:', node.id);
        } catch (error) {
            this.errorHandler.handle(error, {
                component: 'MindmapContentEditor',
                action: 'loadNodeContent'
            });
        }
    }
    
    // 自动保存当前内容
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
            
            // 同步数据
            DataSyncHelper.syncNodeData(this.jm, node);
            
            // 保存到存储
            const data = this.jm.get_data();
            DataSyncHelper.syncAllNodes(this.jm, data);
            await this.storage.saveMindmap(data, true);
            
            console.log('[ContentEditor] 自动保存完成');
            
            // 发射事件
            this.events.emit('mindmap:editor:autoSaved', {
                nodeId: this.currentNodeId
            });
        } catch (error) {
            this.errorHandler.handle(error, {
                component: 'MindmapContentEditor',
                action: 'autoSaveCurrentContent'
            }, { silent: true });
        }
    }
    
    // 手动保存（从侧栏）
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
            DataSyncHelper.syncNodeData(this.jm, node);
            const data = this.jm.get_data();
            DataSyncHelper.syncAllNodes(this.jm, data);
            await this.storage.saveMindmap(data, true);
            
            alert('保存成功！');
            
            // 发射事件
            this.events.emit('mindmap:editor:saved', {
                nodeId: this.currentNodeId
            });
        } catch (error) {
            this.errorHandler.handle(error, {
                component: 'MindmapContentEditor',
                action: 'saveFromSidebar'
            });
            alert('保存失败：' + error.message);
        }
    }
    
    // 静默保存（无提示）
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
            DataSyncHelper.syncNodeData(this.jm, node);
            const data = this.jm.get_data();
            DataSyncHelper.syncAllNodes(this.jm, data);
            await this.storage.saveMindmap(data, true);
            
            console.log('[ContentEditor] 静默保存完成');
        } catch (error) {
            this.errorHandler.handle(error, {
                component: 'MindmapContentEditor',
                action: 'saveFromSidebarSilent'
            }, { silent: true });
        }
    }
}
```

### 实施步骤

1. **创建文件**: `js/MindmapContentEditor.js`
2. **复制上述代码**
3. **在HTML中引用**: `<script src="js/MindmapContentEditor.js"></script>`
4. **在MindmapColumn中集成**:
   ```javascript
   // 初始化内容编辑器
   this.contentEditor = new MindmapContentEditor(
       this.jm,
       this.storageCoordinator,
       this.eventCoordinator,
       this.errorHandler
   );
   ```
5. **替换原有方法调用**:
   - `this.onNodeSelected(node)` → `this.contentEditor.onNodeSelected(node)`
   - `this.autoSaveCurrentNodeContent()` → `this.contentEditor.autoSaveCurrentContent()`
   - `this.saveContentFromSidebar()` → `this.contentEditor.saveFromSidebar()`
6. **删除原有方法**
7. **测试功能**
8. **生成报告**

---

## 预计成果

- **新增**: MindmapContentEditor.js (~250行)
- **HTML减少**: ~200行
- **功能**: 完全保持
- **架构**: 更清晰

---

**程序员**  
**2025-10-07 20:34**
