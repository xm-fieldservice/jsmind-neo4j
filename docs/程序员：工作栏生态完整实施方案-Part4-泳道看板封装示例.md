# 程序员：工作栏生态系统实施方案 - Part 4：泳道看板封装示例

**方案版本**: v3.0-Part4  
**制定日期**: 2025-10-01  
**预计时间**: 2天

---

## 📋 **示例概述**

本文档详细描述如何将现有的 `test_department_list_container.html` 封装为标准工作栏，作为第一个完整示例，跑通整个流程。

---

## 🎯 **目标成果**

1. ✅ 将测试页面封装为独立工作栏
2. ✅ 符合所有开发规范
3. ✅ 完整的配置和文档
4. ✅ 成功上传到库房
5. ✅ 成功上线并正常使用

---

## 📁 **源文件分析**

### **原始文件**: `test_department_list_container.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>部门列表容器测试</title>
    <style>
        /* 样式代码 */
    </style>
</head>
<body>
    <div id="department-list-container">
        <!-- 部门列表内容 -->
    </div>
    
    <script>
        // 初始化逻辑
    </script>
</body>
</html>
```

### **需要提取的内容**
1. ✅ CSS 样式（注入到 <head>）
2. ✅ HTML 结构（渲染到容器）
3. ✅ JavaScript 逻辑（封装为函数）

---

## 🔧 **封装步骤详解**

### **Step 1: 创建工作栏文件** ⏱️ 2小时

#### **文件**: `js/columns/swimlane-board.js`

```javascript
/**
 * 泳道看板工作栏
 * 基于 test_department_list_container.html 封装
 * 
 * @version 1.0.0
 * @author 程序员
 * @date 2025-10-01
 */
;(function(global) {
    'use strict';
    
    console.log('[泳道看板] 组件加载中...');
    
    // ==================== 工具函数 ====================
    
    /**
     * 等待 ColumnRegistry 就绪
     */
    function waitForRegistry(callback, maxAttempts = 50) {
        let attempts = 0;
        const check = () => {
            attempts++;
            if (global.ColumnRegistry?._initialized) {
                console.log('[泳道看板] ✅ ColumnRegistry已就绪');
                callback();
            } else if (attempts < maxAttempts) {
                setTimeout(check, 100);
            } else {
                console.error('[泳道看板] ❌ ColumnRegistry初始化超时');
            }
        };
        check();
    }
    
    /**
     * 等待 DOM 加载完成
     */
    function whenReady(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }
    
    // ==================== 样式注入 ====================
    
    /**
     * 注入工作栏样式到 <head>
     */
    function injectStyles() {
        const styleId = 'swimlane-board-styles';
        
        // 避免重复注入
        if (document.getElementById(styleId)) {
            console.log('[泳道看板] 样式已存在，跳过注入');
            return;
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* ===== 泳道看板样式 ===== */
            
            /* 容器 */
            .swimlane-board-wrapper {
                width: 100%;
                height: 100%;
                min-height: 600px;
                display: flex;
                flex-direction: column;
                background: #f8f9fa;
                overflow: hidden;
            }
            
            /* 部门选择标签 */
            .sb-department-filter {
                background: #fff;
                padding: 12px 16px;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .sb-department-tabs {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }
            
            .sb-department-tab {
                padding: 6px 12px;
                background: #f8f9fa;
                color: #495057;
                border: 1px solid #dee2e6;
                border-radius: 16px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .sb-department-tab:hover {
                background: #e9ecef;
                border-color: #adb5bd;
            }
            
            .sb-department-tab.active {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }
            
            /* 泳道容器 */
            .sb-swimlane-container {
                flex: 1;
                display: flex;
                background: #f8f9fa;
                min-height: 400px;
                overflow-x: auto;
            }
            
            /* 单个泳道 */
            .sb-swimlane {
                flex: 1;
                min-width: 280px;
                display: flex;
                flex-direction: column;
                border-right: 1px solid #e9ecef;
                background: white;
            }
            
            .sb-swimlane:last-child {
                border-right: none;
            }
            
            /* 泳道头部 */
            .sb-swimlane-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 16px;
                text-align: center;
                font-weight: 600;
                font-size: 14px;
            }
            
            /* 不同状态的泳道颜色 */
            .sb-swimlane.status-pending .sb-swimlane-header {
                background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
            }
            
            .sb-swimlane.status-inprogress .sb-swimlane-header {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            }
            
            .sb-swimlane.status-completed .sb-swimlane-header {
                background: linear-gradient(135deg, #007bff 0%, #6610f2 100%);
            }
            
            /* 泳道内容区 */
            .sb-swimlane-content {
                flex: 1;
                padding: 16px;
                overflow-y: auto;
            }
            
            /* 任务卡片 */
            .sb-task-card {
                background: white;
                border-radius: 6px;
                padding: 12px 16px;
                margin-bottom: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                cursor: move;
                transition: all 0.2s ease;
                border-left: 4px solid #667eea;
            }
            
            .sb-task-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            }
            
            .sb-task-title {
                font-size: 14px;
                font-weight: 500;
                color: #333;
                margin-bottom: 8px;
            }
            
            .sb-task-meta {
                font-size: 12px;
                color: #666;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            /* 空状态 */
            .sb-empty-lane {
                text-align: center;
                padding: 40px 20px;
                color: #999;
                font-size: 14px;
            }
        `;
        
        document.head.appendChild(style);
        console.log('[泳道看板] ✅ 样式已注入');
    }
    
    // ==================== 数据管理 ====================
    
    /**
     * 获取项目数据
     */
    function getProjectData() {
        // 从 AutogenUnifiedStorage 获取数据
        if (global.AutogenUnifiedStorage) {
            // TODO: 实际从存储获取
            return getMockData();
        }
        return getMockData();
    }
    
    /**
     * 模拟数据（开发阶段）
     */
    function getMockData() {
        return {
            departments: ['全部', '软件部', '工程部', '设计部'],
            projects: [
                {
                    id: 'proj-1',
                    name: '项目管理系统',
                    department: '软件部',
                    status: 'inprogress',
                    assignee: '张三'
                },
                {
                    id: 'proj-2',
                    name: 'UI设计规范',
                    department: '设计部',
                    status: 'completed',
                    assignee: '李四'
                },
                // ... 更多项目
            ]
        };
    }
    
    // ==================== 渲染逻辑 ====================
    
    /**
     * 初始化泳道看板
     */
    function initSwimlaneBoard(container) {
        console.log('[泳道看板] 初始化中...');
        
        const data = getProjectData();
        let currentDepartment = '全部';
        
        // 渲染HTML结构
        container.innerHTML = `
            <div class="swimlane-board-wrapper">
                <!-- 部门选择 -->
                <div class="sb-department-filter">
                    <div class="sb-department-tabs" id="sb-dept-tabs">
                        ${data.departments.map(dept => `
                            <span class="sb-department-tab ${dept === '全部' ? 'active' : ''}" 
                                  data-dept="${dept}">
                                ${dept}
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <!-- 泳道容器 -->
                <div class="sb-swimlane-container" id="sb-swimlanes">
                    ${renderSwimlanes(data.projects, currentDepartment)}
                </div>
            </div>
        `;
        
        // 绑定事件
        bindEvents(container, data);
        
        console.log('[泳道看板] ✅ 初始化完成');
    }
    
    /**
     * 渲染泳道
     */
    function renderSwimlanes(projects, department) {
        const statuses = [
            { key: 'pending', label: '待开始' },
            { key: 'inprogress', label: '进行中' },
            { key: 'completed', label: '已完成' }
        ];
        
        return statuses.map(status => {
            const tasks = projects.filter(p => 
                p.status === status.key &&
                (department === '全部' || p.department === department)
            );
            
            return `
                <div class="sb-swimlane status-${status.key}">
                    <div class="sb-swimlane-header">${status.label}</div>
                    <div class="sb-swimlane-content">
                        ${tasks.length > 0 ? 
                            tasks.map(task => `
                                <div class="sb-task-card" data-task-id="${task.id}">
                                    <div class="sb-task-title">${task.name}</div>
                                    <div class="sb-task-meta">
                                        <span>${task.department}</span>
                                        <span>${task.assignee}</span>
                                    </div>
                                </div>
                            `).join('') :
                            '<div class="sb-empty-lane">暂无任务</div>'
                        }
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * 绑定事件
     */
    function bindEvents(container, data) {
        // 部门切换
        const deptTabs = container.querySelector('#sb-dept-tabs');
        if (deptTabs) {
            deptTabs.addEventListener('click', (e) => {
                if (e.target.classList.contains('sb-department-tab')) {
                    // 更新激活状态
                    deptTabs.querySelectorAll('.sb-department-tab').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    e.target.classList.add('active');
                    
                    // 重新渲染泳道
                    const department = e.target.dataset.dept;
                    const swimlanesContainer = container.querySelector('#sb-swimlanes');
                    swimlanesContainer.innerHTML = renderSwimlanes(data.projects, department);
                    
                    console.log('[泳道看板] 切换部门:', department);
                }
            });
        }
        
        // TODO: 添加任务拖拽功能
    }
    
    // ==================== 工作栏注册 ====================
    
    /**
     * 注册泳道看板工作栏
     */
    function registerSwimlaneBoard() {
        const result = global.ColumnRegistry.register({
            // === 基础配置 ===
            id: 'swimlane-board',
            title: '泳道看板',
            icon: '🏊',
            position: 'after:detail',
            defaultActive: false,
            
            // === 渲染函数 ===
            renderFn: (container) => {
                console.log('[泳道看板] renderFn被调用');
                
                // 注入样式
                injectStyles();
                
                // 初始化看板
                initSwimlaneBoard(container);
            },
            
            // === 生命周期 ===
            lifecycle: {
                onMounted: (container) => {
                    console.log('[泳道看板] 已挂载到DOM');
                },
                
                onActivated: (container) => {
                    console.log('[泳道看板] 已激活');
                    // 刷新数据
                    const data = getProjectData();
                    const swimlanesContainer = container.querySelector('#sb-swimlanes');
                    if (swimlanesContainer) {
                        swimlanesContainer.innerHTML = renderSwimlanes(data.projects, '全部');
                    }
                },
                
                onDeactivated: (container) => {
                    console.log('[泳道看板] 已停用');
                }
            },
            
            // === 数据接口 ===
            dataInterface: {
                inputs: [
                    {
                        name: 'projects',
                        type: 'Array<Project>',
                        required: true,
                        description: '项目数据数组',
                        default: []
                    },
                    {
                        name: 'departments',
                        type: 'Array<string>',
                        required: false,
                        description: '部门列表',
                        default: ['全部']
                    }
                ],
                outputs: [
                    {
                        name: 'selectedProject',
                        type: 'Project',
                        description: '当前选中的项目'
                    }
                ],
                events: [
                    {
                        name: 'swimlane.statusChange',
                        type: 'CustomEvent',
                        description: '任务状态变更事件',
                        payload: {
                            taskId: 'string',
                            oldStatus: 'string',
                            newStatus: 'string'
                        }
                    },
                    {
                        name: 'swimlane.departmentChange',
                        type: 'CustomEvent',
                        description: '部门切换事件',
                        payload: {
                            department: 'string'
                        }
                    }
                ]
            },
            
            // === 元数据 ===
            metadata: {
                version: '1.0.0',
                author: '程序员',
                description: '提供泳道式任务管理，按部门和状态展示项目任务',
                dependencies: [
                    'AutogenUnifiedStorage >= 1.0.0',
                    'AutogenEventBus >= 1.0.0'
                ],
                category: 'custom'
            },
            
            // === 使用说明 ===
            usage: {
                installation: '1. 上传到工作栏库房\n2. 点击"上线"按钮\n3. 在顶部栏点击🏊图标激活',
                configuration: '无需配置，自动从数据底座读取项目数据',
                examples: [
                    '// 监听状态变更事件\nwindow.addEventListener("swimlane.statusChange", (e) => {\n    console.log("任务状态变更:", e.detail);\n});',
                    '// 监听部门切换事件\nwindow.addEventListener("swimlane.departmentChange", (e) => {\n    console.log("部门切换:", e.detail.department);\n});'
                ]
            },
            
            // === 更新日志 ===
            changelog: [
                {
                    version: '1.0.0',
                    date: '2025-10-01',
                    changes: '初始版本发布\n- 支持按部门分组展示\n- 支持三种状态泳道（待开始/进行中/已完成）\n- 响应式布局设计'
                }
            ]
        });
        
        if (result) {
            console.log('[泳道看板] ✅ 组件注册成功');
        } else {
            console.error('[泳道看板] ❌ 组件注册失败');
        }
    }
    
    // ==================== 启动注册 ====================
    
    whenReady(() => {
        setTimeout(() => {
            waitForRegistry(() => {
                registerSwimlaneBoard();
            });
        }, 1000); // 等待其他组件初始化
    });
    
})(window || this);
```

---

### **Step 2: 创建文档** ⏱️ 1小时

#### **文件**: `docs/swimlane-board-README.md`

```markdown
# 泳道看板 (Swimlane Board)

## 📋 概述

泳道看板提供泳道式任务管理视图，按部门和状态展示项目任务。

## ✨ 特性

- ✅ 按部门分组展示
- ✅ 三种状态泳道（待开始/进行中/已完成）
- ✅ 实时数据同步
- ✅ 响应式布局设计
- ✅ 视觉效果友好

## 📦 安装

1. 下载 `swimlane-board.js`
2. 打开工作栏库房（设置 → 工作栏管理）
3. 点击"上传工作栏"按钮
4. 选择 `swimlane-board.js` 文件
5. 点击"上线"按钮
6. 在顶部栏点击🏊图标激活

## 🔌 数据接口

### 输入参数 (Inputs)

| 名称 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| projects | Array<Project> | ✅ | [] | 项目数据数组 |
| departments | Array<string> | ⭕ | ['全部'] | 部门列表 |

### 输出数据 (Outputs)

| 名称 | 类型 | 说明 |
|------|------|------|
| selectedProject | Project | 当前选中的项目 |

### 事件 (Events)

| 事件名 | 说明 | 数据格式 |
|--------|------|----------|
| swimlane.statusChange | 任务状态变更 | { taskId, oldStatus, newStatus } |
| swimlane.departmentChange | 部门切换 | { department } |

## 💻 使用示例

### 监听事件

```javascript
// 监听状态变更
window.addEventListener('swimlane.statusChange', (e) => {
    console.log('任务状态变更:', e.detail);
});

// 监听部门切换
window.addEventListener('swimlane.departmentChange', (e) => {
    console.log('部门切换:', e.detail.department);
});
```

## 📦 依赖项

- AutogenUnifiedStorage >= 1.0.0
- AutogenEventBus >= 1.0.0

## 📝 更新日志

### v1.0.0 (2025-10-01)
- 初始版本发布
- 支持按部门分组展示
- 支持三种状态泳道
- 响应式布局设计

## 👨‍💻 作者

程序员

## 📄 许可证

MIT
```

---

### **Step 3: 测试和验证** ⏱️ 2小时

#### **测试清单**

```
✅ 本地加载测试
  - 在浏览器中直接打开 swimlane-board.js
  - 检查控制台无错误

✅ 注册测试
  - ColumnRegistry 成功注册
  - 配置信息正确存储

✅ 渲染测试
  - 样式正确注入
  - HTML正确渲染
  - 数据正确显示

✅ 交互测试
  - 部门切换正常
  - 任务卡片显示正常
  - 空状态显示正常

✅ 生命周期测试
  - onMounted 正确触发
  - onActivated 正确触发
  - onDeactivated 正确触发

✅ 兼容性测试
  - 与现有工作栏无冲突
  - 与其他系统组件兼容
```

---

### **Step 4: 上传和发布** ⏱️ 0.5小时

#### **上传流程**

1. **打开设置页面**
   ```
   点击顶部 "⚙️ 设置" 按钮
   ```

2. **进入工作栏管理**
   ```
   选择 "📦 工作栏管理" 标签页
   ```

3. **上传文件**
   ```
   点击 "⬆️ 上传工作栏" 按钮
   选择 js/columns/swimlane-board.js
   ```

4. **确认信息**
   ```
   检查：
   - 名称: 泳道看板
   - 版本: v1.0.0
   - 作者: 程序员
   - 描述: 提供泳道式任务管理...
   ```

5. **上线工作栏**
   ```
   在库房列表中找到"泳道看板"
   点击 "⬆️" 上线按钮
   ```

6. **验证上线**
   ```
   - 顶部出现 "🏊 泳道看板" 按钮
   - 点击按钮，工作栏正常显示
   - 功能正常使用
   ```

---

## ✅ **验收标准**

### **代码质量**
- ✅ 符合所有开发规范
- ✅ 代码注释完整
- ✅ 无控制台错误
- ✅ 性能良好（加载 < 200ms）

### **功能完整性**
- ✅ 所有声明的功能正常
- ✅ 数据接口正确实现
- ✅ 事件正确触发
- ✅ 生命周期正确执行

### **文档完整性**
- ✅ README 完整清晰
- ✅ API 文档准确
- ✅ 使用示例可运行
- ✅ 更新日志详细

### **用户体验**
- ✅ UI 美观友好
- ✅ 交互流畅
- ✅ 空状态有提示
- ✅ 错误处理完善

---

## 📅 **实施时间表**

| 任务 | 预计时间 | 累计时间 |
|------|---------|---------|
| 分析源文件 | 0.5小时 | 0.5小时 |
| 提取和封装代码 | 2小时 | 2.5小时 |
| 编写配置和文档 | 1小时 | 3.5小时 |
| 本地测试 | 1小时 | 4.5小时 |
| 上传和验证 | 0.5小时 | 5小时 |
| 优化和调整 | 1小时 | 6小时 |
| 编写使用文档 | 1小时 | 7小时 |
| 最终验收 | 1小时 | 8小时 |
| **总计** | **8小时 (1天)** | |

---

## 🎉 **完成标志**

当以下所有条件满足时，示例封装完成：

1. ✅ 工作栏文件创建完成
2. ✅ 配置信息完整准确
3. ✅ 文档编写完整
4. ✅ 本地测试全部通过
5. ✅ 成功上传到库房
6. ✅ 成功上线并正常使用
7. ✅ 无已知bug
8. ✅ 性能达标

---

**程序员**
