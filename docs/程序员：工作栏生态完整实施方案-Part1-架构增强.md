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

### **2. 增强 ColumnWarehouse 功能** ⏱️ 0.5天

#### **2.1 添加文档管理功能**

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
}
```

---

### **3. 集成到主系统** ⏱️ 0.5天

#### **3.1 在 index.html 中引入**

```html
<!-- 工作栏生态系统 -->
<script src="js/core/column-registry.js"></script>
<script src="js/core/column-warehouse.js"></script>
<script src="js/core/column-warehouse-ui.js"></script>

<!-- 🆕 设置页面（待开发） -->
<script src="js/pages/settings-page.js"></script>
<link rel="stylesheet" href="css/settings-page.css">
```

#### **3.2 添加设置入口**

在顶部系统栏添加设置按钮：

```html
<!-- index.html - 系统栏 -->
<div class="system-bar">
    <!-- 现有按钮 -->
    
    <!-- 🆕 设置按钮 -->
    <button class="system-btn" onclick="window.SettingsPage.open('columns')" title="设置">
        <span>⚙️</span>
        <span>设置</span>
    </button>
</div>
```

---

## ✅ **Part 1 验收标准**

### **功能验收**
- ✅ 生命周期钩子完整实现并可正常调用
- ✅ 激活/停用时正确触发 onActivated/onDeactivated
- ✅ ColumnWarehouse 提供完整的文档管理API
- ✅ 支持按分类和搜索获取工作栏
- ✅ 设置入口已添加到系统栏

### **质量验收**
- ✅ 所有新增代码通过测试
- ✅ 无现有功能回归问题
- ✅ 控制台无错误日志
- ✅ 兼容现有工作栏（list, mindmap, detail等）

---

## 📅 **实施时间表**

| 任务 | 预计时间 | 负责人 |
|------|---------|--------|
| ColumnRegistry 生命周期增强 | 0.5天 | 程序员 |
| ColumnManager 钩子触发 | 0.25天 | 程序员 |
| ColumnWarehouse 文档管理 | 0.5天 | 程序员 |
| 系统集成和测试 | 0.25天 | 程序员 |
| **总计** | **1.5天** | |

---

## 🔄 **下一步**

完成 Part 1 后，进入：
- **Part 2: 设置页面开发** (2-3天)
- **Part 3: 工作栏开发规范** (1-2天)
- **Part 4: 泳道看板封装示例** (2天)

**程序员**
