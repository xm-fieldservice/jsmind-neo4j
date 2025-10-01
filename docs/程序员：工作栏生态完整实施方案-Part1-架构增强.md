# 程序员：工作栏生态系统实施方案 - Part 1：架构增强

**方案版本**: v3.0-Part1  
**制定日期**: 2025-10-01  

---

## 📋 **Part 1 概述**

基于已成功上线的 ColumnRegistry + ColumnWarehouse，本部分专注于**系统架构增强**，为完整的工作栏生态做好基础。

---

## 🎯 **任务清单**

### **1. 增强 ColumnRegistry 核心功能** ⏱️ 1天

#### **1.1 添加生命周期管理**

**目标**：为工作栏添加完整的生命周期钩子

**新增钩子**：
- `onBeforeMount`: 挂载前（DOM创建前）
- `onMounted`: 挂载后（DOM创建后，渲染完成）
- `onBeforeUnmount`: 卸载前
- `onUnmounted`: 卸载后
- `onActivated`: 激活时（用户点击按钮显示）
- `onDeactivated`: 停用时（用户隐藏）

**修改文件**：`js/core/column-registry.js`

**核心代码**：
```javascript
class ColumnRegistry {
    // 新增：调用生命周期钩子
    _invokeLifecycle(config, phase, ...args) {
        const hooks = config.lifecycle?.[phase];
        if (hooks) {
            try {
                hooks.call(config, ...args);
                console.log(`[ColumnRegistry] 生命周期: ${config.id}.${phase}`);
            } catch (error) {
                console.error(`[ColumnRegistry] 生命周期错误: ${config.id}.${phase}`, error);
            }
        }
    }
    
    // 增强：注册方法
    register(config) {
        // ... 验证和规范化配置 ...
        
        const normalizedConfig = {
            // ... 现有字段 ...
            
            // 🆕 生命周期钩子
            lifecycle: {
                onBeforeMount: config.lifecycle?.onBeforeMount,
                onMounted: config.lifecycle?.onMounted,
                onBeforeUnmount: config.lifecycle?.onBeforeUnmount,
                onUnmounted: config.lifecycle?.onUnmounted,
                onActivated: config.lifecycle?.onActivated,
                onDeactivated: config.lifecycle?.onDeactivated
            },
            
            // 🆕 数据接口定义
            dataInterface: config.dataInterface || {
                inputs: [],
                outputs: [],
                events: []
            },
            
            // 增强元数据
            metadata: {
                version: config.metadata?.version || '1.0.0',
                author: config.metadata?.author || 'Unknown',
                description: config.metadata?.description || '',
                dependencies: config.metadata?.dependencies || [],
                documentUrl: config.metadata?.documentUrl || '', // 🆕 文档URL
                category: config.metadata?.category || 'custom' // 🆕 分类
            }
        };
        
        // 1. 触发 onBeforeMount
        this._invokeLifecycle(normalizedConfig, 'onBeforeMount');
        
        // 2. 存储配置
        this.columns.set(config.id, normalizedConfig);
        
        // 3. 创建DOM
        this._injectColumn(normalizedConfig);
        this._injectToggleButton(normalizedConfig);
        
        // 4. 添加到管理器
        if (global.columnManager) {
            global.columnManager.addView(config.id);
        }
        
        // 5. 执行渲染
        const container = document.querySelector(`#${config.id}-column .column-content`);
        if (container) {
            normalizedConfig.renderFn(container);
            
            // 6. 触发 onMounted
            this._invokeLifecycle(normalizedConfig, 'onMounted', container);
        }
        
        return true;
    }
    
    // 增强：注销方法
    unregister(columnId) {
        const config = this.columns.get(columnId);
        if (!config) return false;
        
        // 1. 触发 onBeforeUnmount
        this._invokeLifecycle(config, 'onBeforeUnmount');
        
        // 2. 移除DOM
        this._removeDOM(columnId);
        
        // 3. 从管理器移除
        if (global.columnManager) {
            global.columnManager.removeView(columnId);
        }
        
        // 4. 触发 onUnmounted
        this._invokeLifecycle(config, 'onUnmounted');
        
        // 5. 从注册表删除
        this.columns.delete(columnId);
        
        return true;
    }
}
```

---

#### **1.2 添加激活/停用钩子触发**

**修改文件**：`script.js` (ColumnManager)

**位置**：`updateLayout` 方法

```javascript
// script.js - ColumnManager.updateLayout

// 显示活动列
this.activeViews.forEach(view => {
    const column = document.getElementById(`${view}-column`);
    if (column) {
        column.classList.add('visible');
        column.style.display = ''; // 清空内联样式
        
        // 🆕 触发激活钩子
        const config = global.ColumnRegistry?.columns.get(view);
        if (config?.lifecycle?.onActivated) {
            config.lifecycle.onActivated.call(config, column);
        }
    }
});

// 隐藏非活动列
allColumns.forEach(column => {
    const view = column.dataset.column;
    if (!this.activeViews.includes(view)) {
        column.classList.remove('visible');
        
        // 🆕 触发停用钩子
        const config = global.ColumnRegistry?.columns.get(view);
        if (config?.lifecycle?.onDeactivated) {
            config.lifecycle.onDeactivated.call(config, column);
        }
    }
});
```

---

### **2. 扩展 AutogenUnifiedStorage** ⏱️ 2小时

#### **2.1 添加新数据类型**

**目标**：支持工作栏生态的新数据类型

**新增类型**：
```javascript
// 在 AutogenUnifiedStorage.js 中添加
this.dataTypes.TASK = 'task';              // 任务/笔记（万物皆任务）
this.dataTypes.TAG_GROUP = 'tag_group';    // 标签组
this.dataTypes.TAG = 'tag';                // 标签
this.dataTypes.FILTER = 'filter';          // 过滤器
this.dataTypes.CHART_CONFIG = 'chart_config';  // 图表配置
this.dataTypes.APP_CONFIG = 'app_config';  // 应用配置
```

**工作量**：10分钟

---

#### **2.2 添加查询接口**

**目标**：支持复杂查询和过滤

**新增方法**：
```javascript
/**
 * 查询数据（支持条件过滤）
 * @param {string} type - 数据类型
 * @param {Object} criteria - 查询条件
 */
async query(type, criteria) {
    const items = await this.listByType(type);
    return items.filter(item => this.matchesCriteria(item, criteria));
}

/**
 * 匹配条件
 */
matchesCriteria(item, criteria) {
    for (const [path, condition] of Object.entries(criteria)) {
        const value = this.getValueByPath(item, path);
        
        if (typeof condition === 'object') {
            // 支持操作符: $includes, $equals, $gt, $lt
            if (condition.$includes && !value?.includes?.(condition.$includes)) {
                return false;
            }
            if (condition.$equals && value !== condition.$equals) {
                return false;
            }
        } else {
            if (value !== condition) return false;
        }
    }
    return true;
}
```

**工作量**：1.5小时

---

#### **2.3 增强数据变更事件**

**目标**：支持实时数据同步

**修改 store 方法**：
```javascript
async store(type, key, data, options = {}) {
    try {
        // ... 原有存储逻辑 ...
        
        // ✅ 存储成功后，自动触发数据变更事件
        if (global.AutogenEventBus) {
            // 通用事件
            global.AutogenEventBus.emit('storage.dataChanged', {
                type: type,
                key: key,
                action: 'update',
                timestamp: Date.now()
            });
            
            // 类型特定事件（更精确）
            global.AutogenEventBus.emit(`storage.${type}.changed`, {
                key: key,
                action: 'update',
                data: data
            });
        }
        
        return true;
    } catch (error) {
        // ... 错误处理 ...
    }
}
```

**工作量**：30分钟

---

### **3. 实现统一配置管理** ⏱️ 2.5小时

#### **3.1 创建 ConfigManager**

**目标**：统一管理所有配置（标签样式、布局、主题等）

**新增文件**：`js/core/config-manager.js`

**核心代码**：
```javascript
/**
 * 统一配置管理器
 * 复用 AutogenUnifiedStorage，零架构冲突
 */
class ConfigManager {
    constructor() {
        this.config = null;
        this.defaultConfig = this.getDefaultConfig();
    }
    
    async init() {
        await this.loadConfig();
    }
    
    async loadConfig() {
        const saved = await AutogenUnifiedStorage.retrieve('app_config', 'main');
        
        if (saved) {
            this.config = saved.data;
        } else {
            this.config = this.defaultConfig;
            await this.saveConfig();
        }
    }
    
    async saveConfig() {
        await AutogenUnifiedStorage.store('app_config', 'main', this.config, {
            metadata: { itemType: 'app_config' }
        });
        
        // 触发配置变更事件
        if (window.AutogenEventBus) {
            AutogenEventBus.emit('config.changed', {
                config: this.config
            });
        }
    }
    
    // 获取配置值（支持路径）
    get(path) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            value = value?.[key];
            if (value === undefined) return null;
        }
        
        return value;
    }
    
    // 设置配置值
    async set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.config;
        
        for (const key of keys) {
            if (!target[key]) target[key] = {};
            target = target[key];
        }
        
        target[lastKey] = value;
        await this.saveConfig();
    }
    
    // 获取标签样式
    getTagStyle(tagName) {
        return this.get(`tagStyles.${tagName}`) || {
            color: '#6b7280',
            nodeStyle: {
                borderColor: '#d1d5db',
                borderWidth: 2
            }
        };
    }
    
    // 设置标签样式
    async setTagStyle(tagName, style) {
        await this.set(`tagStyles.${tagName}`, style);
    }
    
    getDefaultConfig() {
        return {
            // 标签样式
            tagStyles: {
                '重要': {
                    color: '#ef4444',
                    nodeStyle: {
                        borderColor: '#ef4444',
                        borderWidth: 3,
                        fontWeight: 'bold',
                        backgroundColor: '#fee2e2'
                    }
                },
                '紧急': {
                    color: '#f59e0b',
                    nodeStyle: {
                        borderColor: '#f59e0b',
                        borderWidth: 3,
                        fontWeight: 'bold',
                        backgroundColor: '#fef3c7'
                    }
                }
            },
            
            // 工作栏布局配置
            columnLayout: {
                mode: 'equal',
                columns: {}
            },
            
            // 主题配置（预留）
            theme: {
                primaryColor: '#3b82f6',
                fontSize: '14px'
            }
        };
    }
}

window.ConfigManager = new ConfigManager();
```

**工作量**：1小时

---

#### **3.2 集成布局管理**

**说明**：LayoutManager 作为 ConfigManager 的子模块

**新增文件**：`js/core/column-layout-manager.js`

```javascript
class ColumnLayoutManager {
    async init() {
        // 从 ConfigManager 读取布局配置
        this.config = window.ConfigManager.get('columnLayout') || {
            mode: 'equal',
            columns: {}
        };
        
        this.applyLayout();
        this.bindResizers();
    }
    
    async saveLayout() {
        // 保存到 ConfigManager
        await window.ConfigManager.set('columnLayout', this.config);
    }
    
    applyLayout() {
        const container = document.querySelector('.columns-container');
        container.className = `columns-container ${this.config.mode}-mode`;
        
        if (this.config.mode === 'custom') {
            const columns = container.querySelectorAll('.column');
            columns.forEach(col => {
                const config = this.config.columns[col.dataset.columnId];
                if (config) {
                    col.style.width = config.width;
                    col.style.order = config.order || 0;
                }
            });
        }
    }
    
    // ... 拖拽调整逻辑 ...
}
```

**工作量**：30分钟

---

#### **3.3 标签应用功能**

**目标**：支持跨数据类型打标签

**新增文件**：`js/columns/tag-manager.js`

```javascript
class TagManagerColumn {
    async applyTag(tagId) {
        // 获取当前焦点数据
        const currentData = this.getCurrentSelectedData();
        
        if (!currentData) {
            alert('请先选择要打标签的项目');
            return;
        }
        
        // 从数据底座获取数据
        const data = await AutogenUnifiedStorage.retrieve(
            currentData.type,
            currentData.id
        );
        
        // 添加标签到 metadata
        if (!data.metadata) data.metadata = {};
        if (!data.metadata.tags) data.metadata.tags = [];
        
        const tag = await AutogenUnifiedStorage.retrieve('tag', tagId);
        if (!data.metadata.tags.includes(tag.data.name)) {
            data.metadata.tags.push(tag.data.name);
            
            // 更新存储（自动触发同步事件）
            await AutogenUnifiedStorage.store(
                currentData.type,
                currentData.id,
                data.data,
                { metadata: data.metadata }
            );
            
            // 触发标签应用事件
            AutogenEventBus.emit('tag.applied', {
                targetType: currentData.type,
                targetId: currentData.id,
                tagName: tag.data.name
            });
        }
    }
    
    getCurrentSelectedData() {
        // 脑图栏
        if (window.mindmapController?.selectedNode) {
            return {
                type: 'mindmap',
                id: window.mindmapController.selectedNode.id
            };
        }
        
        // 列表栏
        if (window.currentSelectedListItem) {
            return {
                type: 'task',
                id: window.currentSelectedListItem
            };
        }
        
        // 详情栏
        if (window.currentDetailItemId) {
            return {
                type: 'task',
                id: window.currentDetailItemId
            };
        }
        
        return null;
    }
}
```

**工作量**：1小时

---

### **4. 增强 ColumnWarehouse 功能** ⏱️ 0.5天

#### **4.1 添加文档管理功能**

**修改文件**：`js/core/column-warehouse.js`

```javascript
class ColumnWarehouse {
    /**
     * 🆕 获取工作栏文档
     */
    getDocumentation(columnId) {
        const column = this.warehouse.get(columnId);
        if (!column) return null;
        
        return {
            // 基本信息
            id: column.id,
            name: column.name,
            version: column.version,
            author: column.author,
            description: column.description,
            documentUrl: column.documentUrl,
            
            // 使用说明
            usage: column.usage || {
                installation: '1. 上传到工作栏库房\n2. 点击"上线"按钮\n3. 在顶部栏点击图标激活',
                configuration: column.configuration || '无需配置，开箱即用',
                examples: column.examples || []
            },
            
            // 数据接口
            interface: column.dataInterface || {
                inputs: [],    // 输入参数
                outputs: [],   // 输出数据
                events: []     // 触发的事件
            },
            
            // 依赖项
            dependencies: column.dependencies || [],
            
            // 更新日志
            changelog: column.changelog || []
        };
    }
    
    /**
     * 🆕 按分类获取工作栏
     */
    getColumnsByCategory() {
        const categories = {
            builtin: [],   // 内置工作栏
            custom: [],    // 自定义工作栏
            external: []   // 外部工作栏
        };
        
        this.warehouse.forEach((column) => {
            const category = column.metadata?.category || 'custom';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(column);
        });
        
        return categories;
    }
    
    /**
     * 🆕 搜索工作栏
     */
    searchColumns(keyword) {
        const results = [];
        const lowerKeyword = keyword.toLowerCase();
        
        this.warehouse.forEach((column) => {
            if (column.name.toLowerCase().includes(lowerKeyword) ||
                column.description?.toLowerCase().includes(lowerKeyword) ||
                column.author?.toLowerCase().includes(lowerKeyword)) {
                results.push(column);
            }
        });
        
        return results;
    }
<!-- index.html - 系统栏 -->
<div class="system-bar">
    <!-- 现有按钮 -->
    
    <!--  设置按钮 -->
    <button class="system-btn" onclick="openSettings()" title="设置">
        <span>⚙️</span>
        <span>设置</span>
    </button>
</div>

<script>
function openSettings() {
    if (global.SettingsPage) {
        global.SettingsPage.open();
    }
}
</script>

---

### **6. 实现工作栏自动持久化** ⏱️ 2小时

#### **6.1 背景说明**

**问题**：工作栏是临时上传的，页面刷新后数据丢失  
**需求**：自动保存和恢复工作栏的状态数据  
**现状**：✅ 系统已完全支持！无需修改底层架构

**现有基础**：
- ✅ AutogenUnifiedStorage（三级存储：内存→LocalStorage→IndexedDB）
- ✅ AutogenEventBus（事件驱动机制）
- ✅ 完整的存储和事件API

---

#### **6.2 创建 ColumnAutoPersistence 管理器**

**目标**：自动保存和恢复工作栏数据

**新增文件**：`js/core/column-auto-persistence.js`

**核心代码**：
```javascript
/**
 * 工作栏自动持久化管理器
 * 负责工作栏数据的自动保存和恢复
 */
class ColumnAutoPersistence {
    constructor() {
        this.storage = window.AutogenUnifiedStorage;
        this.eventBus = window.AutogenEventBus;
        this.debounceTimers = new Map();
        this.columnDataCache = new Map();
    }
    
    /**
     * 初始化自动持久化
     */
    init() {
        // 监听工作栏注册事件
        this.eventBus.on('column.registered', (data) => {
            this.setupColumnPersistence(data.columnId);
        });
        
        // 监听工作栏数据变化事件
        this.eventBus.on('column.dataChanged', (data) => {
            this.saveColumnData(data.columnId, data.data);
        });
        
        // 监听工作栏卸载事件
        this.eventBus.on('column.unloaded', (data) => {
            this.finalSave(data.columnId);
        });
        
        console.log('[ColumnAutoPersistence] 自动持久化已启动');
    }
    
    /**
     * 为工作栏设置持久化
     */
    setupColumnPersistence(columnId) {
        // 尝试恢复之前保存的数据
        this.restoreColumnData(columnId);
        
        // 设置自动保存间隔（5秒）
        setInterval(() => {
            this.syncColumnData(columnId);
        }, 5000);
        
        console.log(`[ColumnAutoPersistence] ${columnId} 已设置自动持久化`);
    }
    
    /**
     * 保存工作栏数据（防抖）
     */
    saveColumnData(columnId, data) {
        // 更新缓存
        this.columnDataCache.set(columnId, {
            data: data,
            timestamp: Date.now(),
            dirty: true
        });
        
        // 防抖保存（1秒）
        clearTimeout(this.debounceTimers.get(columnId));
        this.debounceTimers.set(columnId, setTimeout(() => {
            this.syncColumnData(columnId);
        }, 1000));
    }
    
    /**
     * 同步数据到存储
     */
    async syncColumnData(columnId) {
        const cached = this.columnDataCache.get(columnId);
        
        if (!cached || !cached.dirty) {
            return; // 数据未变化，无需保存
        }
        
        try {
            await this.storage.store('column_data', columnId, cached.data, {
                metadata: {
                    itemType: 'column_state',
                    lastSaved: Date.now(),
                    columnId: columnId
                }
            });
            
            // 标记为已保存
            cached.dirty = false;
            
            console.log(`[ColumnAutoPersistence] ${columnId} 数据已保存`);
            
            // 触发保存成功事件
            this.eventBus.emit('column.dataSaved', {
                columnId: columnId,
                timestamp: Date.now()
            });
            
        } catch (err) {
            console.error(`[ColumnAutoPersistence] ${columnId} 保存失败:`, err);
            
            // 触发保存失败事件
            this.eventBus.emit('column.saveFailed', {
                columnId: columnId,
                error: err.message
            });
        }
    }
    
    /**
     * 恢复工作栏数据
     */
    async restoreColumnData(columnId) {
        try {
            const result = await this.storage.retrieve('column_data', columnId);
            
            if (result) {
                console.log(`[ColumnAutoPersistence] ${columnId} 数据已恢复`);
                
                // 触发数据恢复事件
                this.eventBus.emit('column.dataRestored', {
                    columnId: columnId,
                    data: result.data
                });
                
                return result.data;
            }
        } catch (err) {
            console.warn(`[ColumnAutoPersistence] ${columnId} 恢复失败:`, err);
        }
        
        return null;
    }
    
    /**
     * 最终保存（工作栏卸载时）
     */
    async finalSave(columnId) {
        clearTimeout(this.debounceTimers.get(columnId));
        await this.syncColumnData(columnId);
        
        this.columnDataCache.delete(columnId);
        this.debounceTimers.delete(columnId);
        
        console.log(`[ColumnAutoPersistence] ${columnId} 已卸载并保存`);
    }
}

// 全局实例
window.ColumnAutoPersistence = new ColumnAutoPersistence();
```

**工作量**：1.5小时

---

#### **6.3 工作栏接入示例**

**目标**：工作栏只需10行代码即可接入自动持久化

**示例代码**（详情页工作栏）：
```javascript
class DetailColumn {
    constructor() {
        this.columnId = 'detail-column';
        this.data = {
            title: '',
            content: '',
            tags: [],
            attachments: []
        };
    }
    
    init() {
        // ✅ 监听数据恢复事件（5行代码）
        window.AutogenEventBus.on('column.dataRestored', (event) => {
            if (event.columnId === this.columnId) {
                this.loadData(event.data);
            }
        });
        
        // ✅ 绑定自动保存
        this.bindAutoSave();
    }
    
    /**
     * 绑定自动保存（5行代码）
     */
    bindAutoSave() {
        const titleInput = document.getElementById('detail-title-input');
        const contentEditor = document.getElementById('detail-content-editor');
        
        // 输入时触发保存
        titleInput.addEventListener('input', () => {
            this.data.title = titleInput.value;
            this.notifyDataChanged(); // ← 触发保存
        });
        
        contentEditor.addEventListener('input', () => {
            this.data.content = contentEditor.value;
            this.notifyDataChanged(); // ← 触发保存
        });
    }
    
    /**
     * 通知数据变化（1行代码）
     */
    notifyDataChanged() {
        window.AutogenEventBus.emit('column.dataChanged', {
            columnId: this.columnId,
            data: this.data
        });
    }
    
    /**
     * 加载恢复的数据
     */
    loadData(data) {
        this.data = data;
        
        // 填充到UI
        document.getElementById('detail-title-input').value = data.title || '';
        document.getElementById('detail-content-editor').value = data.content || '';
        
        console.log('[DetailColumn] 数据已恢复');
    }
}
```

**工作量**：每个工作栏10行代码，5分钟

---

#### **6.4 自动持久化流程**

```
用户编辑内容
  ↓
触发input事件
  ↓
工作栏调用: notifyDataChanged()
  ↓
触发事件: column.dataChanged
  ↓
ColumnAutoPersistence监听到
  ↓
防抖1秒后
  ↓
调用AutogenUnifiedStorage.store()
  ↓
保存到分层存储:
  ├─ 内存缓存（立即）
  ├─ LocalStorage（小数据）
  └─ IndexedDB（大数据）
  ↓
触发事件: column.dataSaved
  ↓
✅ 持久化完成

页面刷新后:
  ↓
ColumnAutoPersistence.restoreColumnData()
  ↓
从存储读取数据
  ↓
触发事件: column.dataRestored
  ↓
工作栏接收事件并恢复UI
  ↓
✅ 数据完整恢复
```

---

#### **6.5 集成到系统**

**修改文件**：`index.html`

**添加脚本引用**：
```html
<!-- 自动持久化管理器 -->
<script src="js/core/column-auto-persistence.js"></script>

<script>
// 系统初始化时启动自动持久化
document.addEventListener('DOMContentLoaded', () => {
    if (window.ColumnAutoPersistence) {
        window.ColumnAutoPersistence.init();
    }
});
</script>
```

---

#### **6.6 优势总结**

✅ **零架构冲突**：
- 完全复用 AutogenUnifiedStorage
- 完全复用 AutogenEventBus
- 无需修改底层架构

✅ **极简接入**：
- 工作栏只需10行代码
- 两个事件：`column.dataChanged`、`column.dataRestored`
- 5分钟完成接入

✅ **智能保存**：
- 防抖机制（1秒）避免频繁写入
- 定时同步（5秒）确保数据安全
- 卸载时最终保存

✅ **自动分层**：
- 小数据 → LocalStorage
- 大数据 → IndexedDB
- 热数据 → 内存缓存

---

## ✅ **Part 1 验收标准**

### **功能验收**
- ✅ 生命周期钩子完整实现并可正常调用
- ✅ 激活/停用时正确触发 onActivated/onDeactivated
- ✅ AutogenUnifiedStorage 支持新数据类型和查询接口
- ✅ ConfigManager 统一配置管理可用
- ✅ 实时数据同步机制工作正常
- ✅ 标签应用功能可用
- ✅ ColumnWarehouse 提供完整的文档管理API
- ✅ 支持按分类和搜索获取工作栏
- ✅ 设置入口已添加到系统栏
- ✅ **ColumnAutoPersistence 自动持久化可用**
- ✅ **工作栏数据自动保存和恢复**
- ✅ **刷新页面后数据完整恢复**

### **质量验收**
- ✅ 所有新增代码通过测试
- ✅ 无现有功能回归问题
- ✅ 控制台无错误日志
- ✅ 兼容现有工作栏（list, mindmap, detail等）
- ✅ ConfigManager 零架构冲突
- ✅ **自动持久化零架构冲突**
- ✅ **防抖和定时保存机制正常工作**

---

## 📅 **实施时间表**

| 任务 | 预计时间 | 负责人 |
|------|---------|--------|
| ColumnRegistry 生命周期增强 | 0.5天 | 程序员 |
| AutogenUnifiedStorage 扩展 | 2小时 | 程序员 |
| ConfigManager 实现 | 2.5小时 | 程序员 |
| 标签应用功能 | 1小时 | 程序员 |
| ColumnWarehouse 文档管理 | 0.5天 | 程序员 |
| **ColumnAutoPersistence 实现** | **2小时** | **程序员** |
| 系统集成和测试 | 0.5天 | 程序员 |
| **总计** | **2.25天** | |

---

## 🔄 **下一步**

完成 Part 1 后，进入：
- **Part 2: 设置页面开发** (2-3天)
- **Part 3: 工作栏开发规范** (1-2天)
- **Part 4: 泳道看板封装示例** (2天)

**程序员**
