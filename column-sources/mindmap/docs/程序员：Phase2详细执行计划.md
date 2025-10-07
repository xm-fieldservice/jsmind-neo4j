# Phase 2 详细执行计划

**阶段**: Phase 2 - 拆分核心业务逻辑  
**制定时间**: 2025-10-07 19:45  
**制定人**: 程序员  
**预计工时**: 2-3小时  
**预计减少**: 1000行

---

## 📊 Phase 2 概述

### 目标
将`MindmapColumn`类中的核心业务逻辑拆分为5个独立模块，实现高度模块化和可维护性。

### 当前状态
- **HTML文件**: 1895行
- **MindmapColumn类**: 约1200行
- **方法数量**: 约50个

### 目标状态
- **HTML文件**: <900行
- **模块数量**: 5个独立模块
- **每个模块**: <200行

---

## 🎯 拆分策略

### 模块划分原则
1. **单一职责**: 每个模块只负责一类功能
2. **低耦合**: 模块间依赖最小化
3. **高内聚**: 相关功能集中在一个模块
4. **易测试**: 每个模块可独立测试

### 模块依赖关系
```
MindmapColumnController (核心控制器)
    ├── MindmapContentEditor (内容编辑)
    ├── MindmapShortcutHandler (快捷键)
    ├── MindmapDataLoader (数据加载)
    └── MindmapUIManager (UI管理)
```

---

## 📋 Task 2.1: 内容编辑器模块

**优先级**: 🔴 最高  
**预计工时**: 1小时  
**预计代码**: 200行  
**预计减少**: 180行

### 功能范围

#### 1. 节点选择处理
```javascript
onNodeSelected(node)
- 保存当前节点内容
- 加载新节点内容
- 更新UI状态
```

#### 2. 内容加载
```javascript
loadNodeContentToEditor(node)
- 兼容多种数据结构
- 加载标题和内容
- 处理空内容
```

#### 3. 内容保存
```javascript
saveCurrentNodeContent()
- 保存标题
- 保存内容
- 同步到jsMind
- 触发事件

autoSaveCurrentNodeContent()
- 自动保存逻辑
- 防抖处理
```

#### 4. 侧栏保存
```javascript
saveContentFromSidebar()
- 手动保存
- 显示提示

saveContentFromSidebarSilent()
- 静默保存
- 无弹窗
```

#### 5. 数据同步
```javascript
syncNodeData(exportNode)
- 同步node.data
- 递归处理子节点
```

### 类设计

```javascript
class MindmapContentEditor {
    constructor(jm, storageAdapter) {
        this.jm = jm;
        this.storageAdapter = storageAdapter;
        this.currentNodeId = null;
        this.autoSaveTimeout = null;
    }
    
    // 节点选择
    onNodeSelected(node) { }
    
    // 内容加载
    loadNodeContent(node) { }
    
    // 内容保存
    saveCurrentContent() { }
    autoSaveCurrentContent() { }
    
    // 侧栏保存
    saveFromSidebar(silent = false) { }
    
    // 数据修复
    _fixJsMindNodeData() { }
    
    // 辅助方法
    _getEditor() { }
    _getTitleInput() { }
    _updateUI(node) { }
}
```

### 提取的方法列表
1. `onNodeSelected()` - 约30行
2. `loadNodeContentToEditor()` - 约40行
3. `saveCurrentNodeContent()` - 约40行
4. `autoSaveCurrentNodeContent()` - 约20行
5. `saveContentFromSidebar()` - 约30行
6. `saveContentFromSidebarSilent()` - 约30行
7. `_fixJsMindNodeData()` - 约40行

**总计**: 约230行

### 实施步骤
1. 创建`js/MindmapContentEditor.js`
2. 定义类结构和构造函数
3. 提取7个核心方法
4. 添加辅助方法
5. 在HTML中引用
6. 在MindmapColumn中集成
7. 测试所有功能

---

## 📋 Task 2.2: 快捷键处理模块

**优先级**: 🟡 高  
**预计工时**: 0.5小时  
**预计代码**: 150行  
**预计减少**: 130行

### 功能范围

#### 1. 全局快捷键
```javascript
bindGlobalShortcuts()
- Ctrl+C: 复制
- Ctrl+X: 剪切
- Ctrl+V: 粘贴
- Delete: 删除
- Enter: 添加兄弟节点
- Tab: 添加子节点
- Ctrl+Enter: 添加子节点
```

#### 2. 节点快捷键
```javascript
bindNodeShortcuts()
- 节点编辑快捷键
- 节点导航快捷键
```

### 类设计

```javascript
class MindmapShortcutHandler {
    constructor(jm, ops, clipboard) {
        this.jm = jm;
        this.ops = ops;
        this.clipboard = clipboard;
    }
    
    bindAll() {
        this.bindGlobalShortcuts();
        this.bindNodeShortcuts();
    }
    
    bindGlobalShortcuts() { }
    bindNodeShortcuts() { }
    
    // 快捷键处理
    handleCopy() { }
    handleCut() { }
    handlePaste() { }
    handleDelete() { }
    handleEnter() { }
    handleTab() { }
}
```

### 提取的方法列表
1. `bindGlobalShortcuts()` - 约100行
2. `bindNodeShortcuts()` - 约30行

**总计**: 约130行

---

## 📋 Task 2.3: 数据加载器模块

**优先级**: 🟡 高  
**预计工时**: 0.5小时  
**预计代码**: 150行  
**预计减少**: 130行

### 功能范围

#### 1. 初始数据加载
```javascript
loadInitialData()
- 从UnifiedStorage加载
- 从测试数据加载
- 数据验证
```

#### 2. 数据保存
```javascript
saveToUnifiedStorage(data)
- 数据同步
- 持久化保存
- 错误处理
```

#### 3. 导入导出
```javascript
exportData(format)
importData(data)
```

### 类设计

```javascript
class MindmapDataLoader {
    constructor(jm, storageAdapter, mindmapStorage) {
        this.jm = jm;
        this.storageAdapter = storageAdapter;
        this.mindmapStorage = mindmapStorage;
    }
    
    async loadInitialData() { }
    async loadFromStorage() { }
    async loadTestData() { }
    
    async saveToStorage(data) { }
    async saveToJsonBase() { }
    
    async exportData(format) { }
    async importData(data) { }
}
```

### 提取的方法列表
1. `loadInitialData()` - 约60行
2. `saveToUnifiedStorage()` - 约40行
3. `saveMindmapToDataBase()` - 约30行

**总计**: 约130行

---

## 📋 Task 2.4: UI管理器模块

**优先级**: 🟢 中  
**预计工时**: 1小时  
**预计代码**: 200行  
**预计减少**: 180行

### 功能范围

#### 1. 事件绑定
```javascript
bindEvents()
- 工具栏按钮
- 搜索框
- 编辑器
```

#### 2. UI更新
```javascript
updateNodeCount()
updateTitle()
showMessage(msg, type)
```

#### 3. 状态管理
```javascript
showLoading()
hideLoading()
toggleFullscreen()
```

### 类设计

```javascript
class MindmapUIManager {
    constructor(jm, ops) {
        this.jm = jm;
        this.ops = ops;
    }
    
    bindAll() {
        this.bindToolbarEvents();
        this.bindEditorEvents();
        this.bindSearchEvents();
    }
    
    bindToolbarEvents() { }
    bindEditorEvents() { }
    bindSearchEvents() { }
    
    updateNodeCount() { }
    updateTitle() { }
    showMessage(msg, type) { }
    
    showLoading() { }
    hideLoading() { }
    toggleFullscreen() { }
}
```

### 提取的方法列表
1. `bindEvents()` - 约100行
2. `updateNodeCount()` - 约10行
3. `showMessage()` - 约20行
4. 其他UI方法 - 约50行

**总计**: 约180行

---

## 📋 Task 2.5: 核心控制器

**优先级**: 🔴 最高  
**预计工时**: 1小时  
**预计代码**: 200行  
**预计减少**: 400行

### 功能范围

#### 1. 初始化
```javascript
async init()
- 初始化StorageAdapter
- 初始化jsMind
- 初始化各个模块
- 加载数据
```

#### 2. 模块协调
```javascript
- contentEditor
- shortcutHandler
- dataLoader
- uiManager
```

#### 3. 生命周期
```javascript
beforeUnload()
destroy()
```

### 类设计

```javascript
class MindmapColumnController {
    constructor() {
        this.jm = null;
        this.storageAdapter = null;
        this.mindmapStorage = null;
        
        // 模块实例
        this.contentEditor = null;
        this.shortcutHandler = null;
        this.dataLoader = null;
        this.uiManager = null;
        
        this.init();
    }
    
    async init() {
        await this.initializeArchitecture();
        await this.initializeJsMind();
        await this.initializeModules();
        await this.loadData();
        this.bindLifecycle();
    }
    
    async initializeArchitecture() { }
    async initializeJsMind() { }
    async initializeModules() {
        this.contentEditor = new MindmapContentEditor(this.jm, this.storageAdapter);
        this.shortcutHandler = new MindmapShortcutHandler(this.jm, this.ops, this.clipboard);
        this.dataLoader = new MindmapDataLoader(this.jm, this.storageAdapter, this.mindmapStorage);
        this.uiManager = new MindmapUIManager(this.jm, this.ops);
    }
    
    async loadData() { }
    bindLifecycle() { }
    
    async beforeUnload() { }
    destroy() { }
}
```

### 保留的方法
1. `init()` - 重构为模块化初始化
2. `initializeArchitecture()` - 架构组件初始化
3. `initializeJsMind()` - jsMind初始化
4. `initializeModules()` - 模块初始化
5. 其他核心方法

**总计**: 约200行

---

## 📊 预期成果

### 代码行数变化
| 模块 | 提取行数 | 新增行数 | 净变化 |
|------|---------|---------|--------|
| MindmapContentEditor | 230行 | 200行 | -30行 |
| MindmapShortcutHandler | 130行 | 150行 | +20行 |
| MindmapDataLoader | 130行 | 150行 | +20行 |
| MindmapUIManager | 180行 | 200行 | +20行 |
| MindmapColumnController | 400行 | 200行 | -200行 |
| **总计** | **1070行** | **900行** | **-170行** |

### 文件结构
```
mindmap-standalone.html          <900行  (从1895行)
├── js/
│   ├── DataSyncHelper.js        135行   (已完成)
│   ├── LogPanel.js              308行   (已完成)
│   ├── MindmapContentEditor.js  200行   (待创建)
│   ├── MindmapShortcutHandler.js 150行  (待创建)
│   ├── MindmapDataLoader.js     150行   (待创建)
│   ├── MindmapUIManager.js      200行   (待创建)
│   └── MindmapColumnController.js 200行 (待创建)
└── css/
    └── mindmap-column.css       229行   (已完成)
```

---

## 🎯 实施顺序

### 建议顺序
1. **Task 2.1**: MindmapContentEditor（最独立）
2. **Task 2.2**: MindmapShortcutHandler（依赖少）
3. **Task 2.3**: MindmapDataLoader（依赖少）
4. **Task 2.4**: MindmapUIManager（依赖中等）
5. **Task 2.5**: MindmapColumnController（整合所有）

### 每个Task的步骤
1. 创建模块文件
2. 定义类结构
3. 提取方法
4. 添加辅助方法
5. 在HTML中引用
6. 在控制器中集成
7. 测试功能
8. 生成报告
9. Git提交

---

## ⚠️ 注意事项

### 依赖管理
1. **jsMind实例**: 所有模块都需要
2. **StorageAdapter**: 数据相关模块需要
3. **MindmapOperations**: 操作相关模块需要
4. **NodeClipboard**: 快捷键模块需要

### 向后兼容
1. 保持`window.mindmapColumn`接口
2. 保持现有方法签名
3. 保持事件触发

### 测试重点
1. 节点编辑和保存
2. 快捷键功能
3. 数据加载和保存
4. UI交互
5. 模块间通信

---

## 📅 时间规划

### 建议时间分配
- **Task 2.1**: 1小时
- **Task 2.2**: 0.5小时
- **Task 2.3**: 0.5小时
- **Task 2.4**: 1小时
- **Task 2.5**: 1小时
- **测试和文档**: 0.5小时

**总计**: 4.5小时

### 分阶段执行
- **第一阶段**: Task 2.1 + Task 2.2 (1.5小时)
- **第二阶段**: Task 2.3 + Task 2.4 (1.5小时)
- **第三阶段**: Task 2.5 + 测试 (1.5小时)

---

## ✅ 验收标准

### 功能验收
- [ ] 所有现有功能正常工作
- [ ] 节点编辑和保存正常
- [ ] 快捷键功能正常
- [ ] 数据加载和保存正常
- [ ] UI交互正常

### 架构验收
- [ ] HTML文件 < 900行
- [ ] 每个模块 < 200行
- [ ] 模块职责清晰
- [ ] 依赖关系合理
- [ ] 架构合规性 ≥ 95%

### 代码质量验收
- [ ] 代码重复度 < 5%
- [ ] 每个类单一职责
- [ ] 方法命名清晰
- [ ] 注释完整
- [ ] 易于测试

---

**程序员**  
**2025-10-07 19:45**
