# 程序员：工作栏生态系统实施方案 - Part 2-2：工作栏管理UI实现

**方案版本**: v3.0-Part2-2  
**制定日期**: 2025-10-01  
**预计时间**: 0.5天

---

## 📋 **UI实现概述**

本文档详细描述工作栏管理标签页的UI实现细节，包括工作栏卡片、列表、文档弹窗等组件。

---

## 🎨 **组件设计**

### **1. 工作栏卡片 (ColumnCard)**

#### **视觉设计**

```
┌─────────────────────────┐
│ 🏊 泳道看板              │ ← 图标 + 标题
│ ─────────────────────── │
│ v1.0.0                  │ ← 版本号
│ 作者: 程序员             │ ← 作者
│ ✅ 已上线 / ⭕ 未上线    │ ← 状态标签
│ 提供泳道式任务管理...    │ ← 描述
│ ─────────────────────── │
│ [❓]  [⬆️/⬇️]  [🗑️]    │ ← 操作按钮
└─────────────────────────┘
```

#### **实现代码**

```javascript
/**
 * 创建工作栏卡片
 * @param {Object} column - 工作栏配置对象
 * @returns {HTMLElement} 卡片DOM元素
 */
_createColumnCard(column) {
    const div = document.createElement('div');
    div.className = 'column-card';
    div.dataset.columnId = column.id;
    div.dataset.category = column.metadata?.category || 'custom';
    
    // 动态状态类
    const statusClass = column.isOnline ? 'online' : 'offline';
    const statusText = column.isOnline ? '✅ 已上线' : '⭕ 未上线';
    const actionIcon = column.isOnline ? '⬇️' : '⬆️';
    const actionClass = column.isOnline ? 'offline-btn' : 'online-btn';
    const actionTitle = column.isOnline ? '下线' : '上线';
    
    div.innerHTML = `
        <!-- 卡片头部 -->
        <div class="card-header">
            <span class="card-icon">${column.icon || '📄'}</span>
            <span class="card-title" title="${column.name}">${column.name}</span>
        </div>
        
        <!-- 卡片主体 -->
        <div class="card-body">
            <p class="card-version">版本 ${column.version}</p>
            <p class="card-author">作者 ${column.author || 'Unknown'}</p>
            <p class="card-status ${statusClass}">${statusText}</p>
            <p class="card-desc" title="${column.description || ''}">
                ${this._truncateText(column.description || '暂无描述', 60)}
            </p>
        </div>
        
        <!-- 卡片底部操作 -->
        <div class="card-footer">
            <button class="btn-icon help-btn" 
                    data-column-id="${column.id}" 
                    title="查看文档"
                    aria-label="查看 ${column.name} 的文档">
                ❓
            </button>
            <button class="btn-icon ${actionClass}" 
                    data-column-id="${column.id}"
                    title="${actionTitle}"
                    aria-label="${actionTitle} ${column.name}">
                ${actionIcon}
            </button>
            <button class="btn-icon delete-btn" 
                    data-column-id="${column.id}" 
                    title="删除"
                    aria-label="删除 ${column.name}"
                    ${column.isOnline ? 'disabled' : ''}>
                🗑️
            </button>
        </div>
    `;
    
    return div;
}

/**
 * 截断文本
 */
_truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}
```

---

### **2. 线上工作栏列表项 (OnlineItem)**

#### **视觉设计**

```
┌───────────────────────────────────────┐
│ ☰ 🏊 泳道看板    v1.0.0      [⬇️]    │ ← 拖拽手柄 + 信息 + 下线
└───────────────────────────────────────┘
```

#### **实现代码**

```javascript
/**
 * 创建线上工作栏列表项
 * @param {Object} column - 工作栏配置对象
 * @param {number} index - 列表索引
 * @returns {HTMLElement} 列表项DOM元素
 */
_createOnlineItem(column, index) {
    const div = document.createElement('div');
    div.className = 'online-item';
    div.draggable = true;
    div.dataset.columnId = column.id;
    div.dataset.index = index;
    
    div.innerHTML = `
        <!-- 拖拽手柄 -->
        <span class="drag-handle" title="拖拽排序">☰</span>
        
        <!-- 工作栏信息 -->
        <span class="item-icon">${column.icon}</span>
        <span class="item-name">${column.name}</span>
        <span class="item-version">v${column.version}</span>
        
        <!-- 下线按钮 -->
        <button class="btn-icon offline-btn" 
                data-column-id="${column.id}"
                title="下线"
                aria-label="下线 ${column.name}">
            ⬇️
        </button>
    `;
    
    // 绑定拖拽事件
    this._bindDragEvents(div);
    
    return div;
}

/**
 * 绑定拖拽事件
 */
_bindDragEvents(element) {
    element.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', element.dataset.columnId);
        element.classList.add('dragging');
    });
    
    element.addEventListener('dragend', (e) => {
        element.classList.remove('dragging');
    });
}
```

---

### **3. 文档弹窗 (DocumentationDialog)**

#### **视觉设计**

```
┌──────────────────────────────────────────┐
│ 📖 泳道看板 - 使用文档           [✕]    │
├──────────────────────────────────────────┤
│                                           │
│ 📋 基本信息                               │
│ ┌──────────────────────────────────────┐│
│ │ 名称    │ 泳道看板                    ││
│ │ 版本    │ v1.0.0                      ││
│ │ 作者    │ 程序员                      ││
│ │ 描述    │ 提供泳道式任务管理          ││
│ └──────────────────────────────────────┘│
│                                           │
│ 📖 使用说明                               │
│ ┌──────────────────────────────────────┐│
│ │ 安装方法:                             ││
│ │ 1. 上传到工作栏库房                   ││
│ │ 2. 点击"上线"按钮                     ││
│ │ 3. 在顶部栏点击图标激活               ││
│ └──────────────────────────────────────┘│
│                                           │
│ 🔌 数据接口                               │
│ ┌──────────────────────────────────────┐│
│ │ 输入参数 (Inputs)                     ││
│ │ ┌────────┬────────┬────────────────┐││
│ │ │ 名称   │ 类型   │ 说明           │││
│ │ ├────────┼────────┼────────────────┤││
│ │ │projects│Array   │项目数据数组    │││
│ │ └────────┴────────┴────────────────┘││
│ └──────────────────────────────────────┘│
│                                           │
│                                [关闭]     │
└──────────────────────────────────────────┘
```

#### **实现代码**

```javascript
/**
 * 显示工作栏文档弹窗
 * @param {string} columnId - 工作栏ID
 */
_showColumnDocumentation(columnId) {
    const doc = this.warehouse.getDocumentation(columnId);
    
    if (!doc) {
        this._showError('无法获取文档');
        return;
    }
    
    const html = `
        <div id="column-doc-dialog" class="doc-dialog">
            <div class="dialog-overlay"></div>
            
            <div class="doc-panel">
                <!-- 文档头部 -->
                <div class="doc-header">
                    <h2>📖 ${doc.name} - 使用文档</h2>
                    <button class="close-btn" 
                            title="关闭"
                            aria-label="关闭文档">✕</button>
                </div>
                
                <!-- 文档内容 -->
                <div class="doc-content">
                    ${this._renderBasicInfo(doc)}
                    ${this._renderUsageGuide(doc)}
                    ${this._renderDataInterface(doc)}
                    ${this._renderDependencies(doc)}
                    ${this._renderChangelog(doc)}
                </div>
                
                <!-- 文档底部 -->
                <div class="doc-footer">
                    <button class="btn-primary close-doc-btn">关闭</button>
                </div>
            </div>
        </div>
    `;
    
    // 注入DOM
    document.body.insertAdjacentHTML('beforeend', html);
    
    // 绑定关闭事件
    this._bindDocDialogEvents();
}

/**
 * 渲染基本信息
 */
_renderBasicInfo(doc) {
    return `
        <section class="doc-section">
            <h3>📋 基本信息</h3>
            <table class="info-table">
                <tbody>
                    <tr>
                        <td class="label">名称</td>
                        <td class="value">${doc.name}</td>
                    </tr>
                    <tr>
                        <td class="label">版本</td>
                        <td class="value">${doc.version}</td>
                    </tr>
                    <tr>
                        <td class="label">作者</td>
                        <td class="value">${doc.author}</td>
                    </tr>
                    <tr>
                        <td class="label">描述</td>
                        <td class="value">${doc.description}</td>
                    </tr>
                </tbody>
            </table>
        </section>
    `;
}

/**
 * 渲染使用说明
 */
_renderUsageGuide(doc) {
    return `
        <section class="doc-section">
            <h3>📖 使用说明</h3>
            <div class="usage-box">
                <h4>安装方法</h4>
                <pre class="code-block">${doc.usage.installation}</pre>
                
                <h4>配置说明</h4>
                <pre class="code-block">${doc.usage.configuration}</pre>
                
                ${doc.usage.examples && doc.usage.examples.length > 0 ? `
                    <h4>使用示例</h4>
                    ${doc.usage.examples.map((ex, i) => `
                        <div class="example-item">
                            <h5>示例 ${i + 1}</h5>
                            <pre class="code-block">${ex}</pre>
                        </div>
                    `).join('')}
                ` : ''}
            </div>
        </section>
    `;
}

/**
 * 渲染数据接口
 */
_renderDataInterface(doc) {
    if (!doc.interface) return '';
    
    return `
        <section class="doc-section">
            <h3>🔌 数据接口</h3>
            <div class="interface-box">
                ${this._renderInterfaceSection('输入参数', doc.interface.inputs)}
                ${this._renderInterfaceSection('输出数据', doc.interface.outputs)}
                ${this._renderInterfaceSection('事件', doc.interface.events)}
            </div>
        </section>
    `;
}

/**
 * 渲染接口区块
 */
_renderInterfaceSection(title, items) {
    if (!items || items.length === 0) return '';
    
    return `
        <div class="interface-section">
            <h4>${title}</h4>
            <table class="interface-table">
                <thead>
                    <tr>
                        <th>名称</th>
                        <th>类型</th>
                        <th>必填</th>
                        <th>说明</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td><code>${item.name}</code></td>
                            <td><code>${item.type}</code></td>
                            <td>${item.required ? '✅' : '⭕'}</td>
                            <td>${item.description || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * 渲染依赖项
 */
_renderDependencies(doc) {
    if (!doc.dependencies || doc.dependencies.length === 0) return '';
    
    return `
        <section class="doc-section">
            <h3>📦 依赖项</h3>
            <ul class="dependency-list">
                ${doc.dependencies.map(dep => `<li>${dep}</li>`).join('')}
            </ul>
        </section>
    `;
}

/**
 * 渲染更新日志
 */
_renderChangelog(doc) {
    if (!doc.changelog || doc.changelog.length === 0) return '';
    
    return `
        <section class="doc-section">
            <h3>📝 更新日志</h3>
            <div class="changelog">
                ${doc.changelog.map(log => `
                    <div class="changelog-item">
                        <div class="changelog-header">
                            <strong>${log.version}</strong>
                            <span class="changelog-date">${log.date}</span>
                        </div>
                        <p class="changelog-content">${log.changes}</p>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

/**
 * 绑定文档弹窗事件
 */
_bindDocDialogEvents() {
    const dialog = document.getElementById('column-doc-dialog');
    if (!dialog) return;
    
    const closeDialog = () => dialog.remove();
    
    dialog.querySelector('.close-btn').onclick = closeDialog;
    dialog.querySelector('.close-doc-btn').onclick = closeDialog;
    dialog.querySelector('.dialog-overlay').onclick = closeDialog;
    
    // ESC键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeDialog();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}
```

---

## 🔄 **拖拽排序实现**

### **拖拽系统设计**

```javascript
/**
 * 启用拖拽排序功能
 * @param {HTMLElement} container - 容器元素
 */
_enableDragSort(container) {
    let draggedElement = null;
    let placeholder = null;
    
    // 创建占位符
    const createPlaceholder = () => {
        const ph = document.createElement('div');
        ph.className = 'online-item-placeholder';
        return ph;
    };
    
    // 拖拽开始
    container.addEventListener('dragstart', (e) => {
        if (!e.target.classList.contains('online-item')) return;
        
        draggedElement = e.target;
        placeholder = createPlaceholder();
        
        e.target.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
    });
    
    // 拖拽经过
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        
        if (!draggedElement) return;
        
        const afterElement = this._getDragAfterElement(container, e.clientY);
        
        if (afterElement == null) {
            container.appendChild(placeholder);
        } else {
            container.insertBefore(placeholder, afterElement);
        }
    });
    
    // 拖拽进入
    container.addEventListener('dragenter', (e) => {
        e.preventDefault();
        
        if (e.target.classList.contains('online-item') && e.target !== draggedElement) {
            e.target.classList.add('drag-over');
        }
    });
    
    // 拖拽离开
    container.addEventListener('dragleave', (e) => {
        if (e.target.classList.contains('online-item')) {
            e.target.classList.remove('drag-over');
        }
    });
    
    // 放置
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        
        if (!draggedElement) return;
        
        // 替换占位符为实际元素
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.replaceChild(draggedElement, placeholder);
        }
        
        // 更新顺序
        this._updateColumnOrder(container);
        
        // 清理状态
        draggedElement.style.opacity = '';
        draggedElement = null;
        placeholder = null;
    });
    
    // 拖拽结束
    container.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('online-item')) {
            e.target.style.opacity = '';
        }
        
        // 清理占位符
        if (placeholder && placeholder.parentNode) {
            placeholder.remove();
        }
        
        // 清理高亮
        container.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        draggedElement = null;
        placeholder = null;
    });
}

/**
 * 获取拖拽后的位置
 * @param {HTMLElement} container - 容器元素
 * @param {number} y - 鼠标Y坐标
 * @returns {HTMLElement|null} 目标元素
 */
_getDragAfterElement(container, y) {
    const draggableElements = [
        ...container.querySelectorAll('.online-item:not(.dragging):not(.online-item-placeholder)')
    ];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * 更新工作栏顺序
 * @param {HTMLElement} container - 容器元素
 */
_updateColumnOrder(container) {
    // 获取新顺序
    const newOrder = [...container.querySelectorAll('.online-item')]
        .map(item => item.dataset.columnId)
        .filter(id => id); // 过滤掉undefined
    
    // 保存到warehouse
    this.warehouse.onlineColumns = newOrder;
    this.warehouse._saveWarehouse();
    
    console.log('[ColumnManagerTab] 工作栏顺序已更新:', newOrder);
    
    // 触发事件
    if (global.AutogenEventBus) {
        global.AutogenEventBus.emit('column.reorder', { order: newOrder });
    }
}
```

---

## 🔍 **搜索和过滤实现**

### **搜索逻辑**

```javascript
/**
 * 获取过滤后的工作栏列表
 * @returns {Array} 过滤后的工作栏数组
 */
_getFilteredColumns() {
    const searchInput = document.getElementById('column-search');
    const categoryFilter = document.getElementById('category-filter');
    
    // 获取过滤条件
    this.filterKeyword = searchInput?.value.toLowerCase() || '';
    this.filterCategory = categoryFilter?.value || 'all';
    
    // 获取所有工作栏
    let columns = Array.from(this.warehouse.warehouse.values());
    
    // 1. 关键词搜索
    if (this.filterKeyword) {
        columns = columns.filter(col => {
            const nameMatch = col.name.toLowerCase().includes(this.filterKeyword);
            const descMatch = col.description?.toLowerCase().includes(this.filterKeyword);
            const authorMatch = col.author?.toLowerCase().includes(this.filterKeyword);
            
            return nameMatch || descMatch || authorMatch;
        });
    }
    
    // 2. 分类过滤
    if (this.filterCategory !== 'all') {
        columns = columns.filter(col => {
            const category = col.metadata?.category || 'custom';
            return category === this.filterCategory;
        });
    }
    
    return columns;
}

/**
 * 高亮搜索关键词
 * @param {string} text - 原文本
 * @param {string} keyword - 关键词
 * @returns {string} 高亮后的HTML
 */
_highlightKeyword(text, keyword) {
    if (!keyword || !text) return text;
    
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}
```

---

## ✅ **UI实现验收标准**

### **视觉效果**
- ✅ 工作栏卡片布局统一美观
- ✅ 列表项对齐整齐
- ✅ 文档弹窗排版清晰
- ✅ 拖拽有视觉反馈（半透明、占位符）
- ✅ 按钮悬停有状态变化

### **交互体验**
- ✅ 搜索实时响应（< 50ms）
- ✅ 拖拽流畅（60fps）
- ✅ 按钮点击反馈及时
- ✅ 文档弹窗滚动流畅
- ✅ 空状态有友好提示

### **无障碍访问**
- ✅ 所有按钮有 aria-label
- ✅ 支持键盘导航（Tab）
- ✅ 支持 ESC 关闭弹窗
- ✅ 表单元素有正确的语义

---

## 📅 **实施时间表**

| 任务 | 预计时间 |
|------|---------|
| 工作栏卡片实现 | 1.5小时 |
| 线上列表实现 | 1小时 |
| 文档弹窗实现 | 2小时 |
| 拖拽排序实现 | 1.5小时 |
| 搜索过滤实现 | 1小时 |
| 测试和优化 | 1小时 |
| **总计** | **0.5天** |

---

**程序员**
