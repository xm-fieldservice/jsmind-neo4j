# Phase 2.1 剩余模块代码框架

**生成时间**: 2025-10-07 21:39  
**用途**: 下次工作时直接使用

---

## Task 2.1.2: UI管理器模块

### 文件名
`js/MindmapUIManager.js`

### 代码框架
```javascript
/**
 * 脑图UI管理器
 * 负责工具栏事件绑定、UI更新、消息显示
 */
class MindmapUIManager {
    constructor(jm, eventCoordinator, renderer) {
        this.jm = jm;
        this.events = eventCoordinator;
        this.renderer = renderer;
        
        this.init();
    }
    
    init() {
        this.bindToolbarEvents();
        console.log('[UIManager] UI管理器初始化完成');
    }
    
    bindToolbarEvents() {
        // 工具栏按钮
        const buttons = [
            { id: 'addNodeBtn', action: 'addNode' },
            { id: 'editNodeBtn', action: 'editNode' },
            { id: 'deleteNodeBtn', action: 'deleteNode' },
            { id: 'saveBtn', action: 'save' }
        ];
        
        if (this.events) {
            this.events.bindToolbarButtons(buttons);
        }
    }
    
    updateNodeCount() {
        const count = this.countNodes(this.jm.get_data().data);
        const element = document.getElementById('nodeCount');
        if (element) {
            element.textContent = count;
        }
    }
    
    countNodes(node) {
        if (!node) return 0;
        let count = 1;
        if (node.children) {
            node.children.forEach(child => {
                count += this.countNodes(child);
            });
        }
        return count;
    }
    
    showMessage(message, type = 'info') {
        console.log(`[UIManager] ${type.toUpperCase()}: ${message}`);
        if (window.LogPanel) {
            if (type === 'error') {
                window.LogPanel.error(message);
            } else {
                window.LogPanel.log(message);
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.MindmapUIManager = MindmapUIManager;
}
```

---

## Task 2.1.3: 数据加载器模块

### 文件名
`js/MindmapDataLoader.js`

### 代码框架
```javascript
/**
 * 脑图数据加载器
 * 负责初始数据加载、数据保存
 */
class MindmapDataLoader {
    constructor(jm, storageCoordinator, errorHandler) {
        this.jm = jm;
        this.storage = storageCoordinator;
        this.errorHandler = errorHandler;
    }
    
    async loadInitialData() {
        try {
            if (this.storage) {
                const stored = await this.storage.loadMindmap('current');
                
                const hasRealData = stored && stored.data && (
                    (stored.data.children && stored.data.children.length > 0) ||
                    (stored.meta && stored.meta.name && stored.meta.name !== 'default_mindmap')
                );
                
                if (hasRealData) {
                    this.jm.show(stored);
                    console.log('[DataLoader] ✅ 已从存储加载数据');
                    return true;
                }
            }
            
            // 加载测试数据
            await this.loadTestData();
            return false;
        } catch (error) {
            if (this.errorHandler) {
                this.errorHandler.handle(error, {
                    component: 'MindmapDataLoader',
                    action: 'loadInitialData'
                });
            }
            throw error;
        }
    }
    
    async loadTestData() {
        const testData = {
            meta: { name: "测试脑图", author: "test", version: "1.0" },
            format: "node_tree",
            data: {
                id: "root",
                topic: "中心主题",
                expanded: true,
                children: [
                    {
                        id: "sub1",
                        topic: "子主题1",
                        direction: "right",
                        expanded: true,
                        children: [
                            { id: "sub11", topic: "子主题1-1", direction: "right" },
                            { id: "sub12", topic: "子主题1-2", direction: "right" }
                        ]
                    }
                ]
            }
        };
        
        this.jm.show(testData);
        console.log('[DataLoader] ✅ 已加载测试数据');
    }
}

if (typeof window !== 'undefined') {
    window.MindmapDataLoader = MindmapDataLoader;
}
```

---

## 集成步骤

### 1. 在HTML中引用
```html
<!-- Phase 2.1: 业务模块 -->
<script src="js/MindmapUIManager.js"></script>
<script src="js/MindmapDataLoader.js"></script>
```

### 2. 在MindmapColumn中初始化
```javascript
// 初始化UI管理器
this.uiManager = new window.MindmapUIManager(
    this.jm,
    this.eventCoordinator,
    window.MindmapRenderer
);

// 初始化数据加载器
this.dataLoader = new window.MindmapDataLoader(
    this.jm,
    this.storageCoordinator,
    this.errorHandler
);
```

### 3. 替换方法调用
- `this.updateNodeCount()` → `this.uiManager.updateNodeCount()`
- `this.showMessage()` → `this.uiManager.showMessage()`
- `this.loadInitialData()` → `this.dataLoader.loadInitialData()`

---

**程序员**  
**2025-10-07 21:39**
