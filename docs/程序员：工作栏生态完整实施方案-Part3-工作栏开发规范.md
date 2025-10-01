# 程序员：工作栏生态系统实施方案 - Part 3：工作栏开发规范

**方案版本**: v3.0-Part3  
**制定日期**: 2025-10-01  
**预计时间**: 1-2天

---

## 📋 **规范概述**

本文档定义工作栏开发的完整规范，包括接口定义、生命周期、数据格式、文档标准等。

---

## 🔌 **工作栏接口规范**

### **1. 基础配置接口**

```typescript
interface ColumnConfig {
    // === 必填字段 ===
    id: string;                    // 唯一标识符 (kebab-case)
    title: string;                 // 显示标题
    renderFn: (container: HTMLElement) => void;  // 渲染函数
    
    // === 可选字段 ===
    icon?: string;                 // 图标 (Emoji)
    position?: string;             // 位置 ('after:detail' | 'before:list')
    defaultActive?: boolean;       // 默认激活状态
    
    // === 生命周期钩子 ===
    lifecycle?: {
        onBeforeMount?: () => void;           // 挂载前
        onMounted?: (container: HTMLElement) => void;  // 挂载后
        onBeforeUnmount?: () => void;         // 卸载前
        onUnmounted?: () => void;             // 卸载后
        onActivated?: (container: HTMLElement) => void;  // 激活时
        onDeactivated?: (container: HTMLElement) => void; // 停用时
    };
    
    // === 数据接口定义 ===
    dataInterface?: {
        inputs: DataParam[];       // 输入参数
        outputs: DataParam[];      // 输出数据
        events: EventParam[];      // 触发事件
    };
    
    // === 元数据 ===
    metadata?: {
        version: string;           // 版本号 (semver)
        author: string;            // 作者
        description: string;       // 描述
        dependencies: string[];    // 依赖项
        documentUrl?: string;      // 文档URL
        category?: 'builtin' | 'custom' | 'external';  // 分类
    };
    
    // === 使用说明 ===
    usage?: {
        installation: string;      // 安装说明
        configuration: string;     // 配置说明
        examples: string[];        // 使用示例
    };
    
    // === 更新日志 ===
    changelog?: ChangelogEntry[];
}

interface DataParam {
    name: string;                  // 参数名
    type: string;                  // 类型 ('string' | 'number' | 'Array' | 'Object')
    required?: boolean;            // 是否必填
    description?: string;          // 说明
    default?: any;                 // 默认值
}

interface EventParam {
    name: string;                  // 事件名
    type: string;                  // 事件类型
    description?: string;          // 说明
    payload?: any;                 // 事件数据
}

interface ChangelogEntry {
    version: string;               // 版本号
    date: string;                  // 日期 (YYYY-MM-DD)
    changes: string;               // 变更说明
}
```

---

## 📝 **开发流程规范**

### **标准开发流程**

```
1. 线下开发
   ↓
2. 封装为工作栏
   ↓
3. 编写配置和文档
   ↓
4. 上传到库房
   ↓
5. 上线测试
   ↓
6. 正式发布
```

### **1. 线下开发**

在独立HTML文件中开发和测试：

```html
<!-- test_swimlane_board.html -->
<!DOCTYPE html>
<html>
<head>
    <title>泳道看板 - 开发测试</title>
    <style>
        /* 组件样式 */
        .swimlane-board { ... }
    </style>
</head>
<body>
    <div id="swimlane-container"></div>
    
    <script>
        // 组件逻辑
        class SwimlaneBoard {
            constructor(container) {
                this.container = container;
                this.render();
            }
            
            render() {
                // 渲染逻辑
            }
        }
        
        // 测试实例化
        new SwimlaneBoard(document.getElementById('swimlane-container'));
    </script>
</body>
</html>
```

---

### **2. 封装为工作栏**

创建工作栏文件 `swimlane-board.js`：

```javascript
/**
 * 泳道看板工作栏
 * @version 1.0.0
 * @author 程序员
 */
;(function(global) {
    'use strict';
    
    // 等待ColumnRegistry就绪
    function waitForRegistry(callback) {
        if (global.ColumnRegistry?._initialized) {
            callback();
        } else {
            setTimeout(() => waitForRegistry(callback), 100);
        }
    }
    
    // 注册工作栏
    function registerSwimlaneBoard() {
        global.ColumnRegistry.register({
            // === 基础配置 ===
            id: 'swimlane-board',
            title: '泳道看板',
            icon: '🏊',
            position: 'after:detail',
            defaultActive: false,
            
            // === 渲染函数 ===
            renderFn: (container) => {
                // 注入样式
                injectStyles();
                
                // 渲染内容
                container.innerHTML = `
                    <div class="swimlane-board">
                        <!-- 组件HTML -->
                    </div>
                `;
                
                // 初始化逻辑
                initSwimlaneBoard(container);
            },
            
            // === 生命周期 ===
            lifecycle: {
                onMounted: (container) => {
                    console.log('[泳道看板] 已挂载');
                },
                onActivated: (container) => {
                    console.log('[泳道看板] 已激活');
                    // 刷新数据
                    refreshData();
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
                        description: '项目数据数组'
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
                        payload: { taskId: 'string', oldStatus: 'string', newStatus: 'string' }
                    }
                ]
            },
            
            // === 元数据 ===
            metadata: {
                version: '1.0.0',
                author: '程序员',
                description: '提供泳道式任务管理，按部门和状态展示项目',
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
                    '// 监听状态变更事件\nwindow.addEventListener("swimlane.statusChange", (e) => {\n    console.log("任务状态变更:", e.detail);\n});'
                ]
            },
            
            // === 更新日志 ===
            changelog: [
                {
                    version: '1.0.0',
                    date: '2025-10-01',
                    changes: '初始版本发布，支持泳道式任务展示'
                }
            ]
        });
    }
    
    // 注入样式
    function injectStyles() {
        const styleId = 'swimlane-board-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* 泳道看板样式 */
            .swimlane-board { ... }
        `;
        document.head.appendChild(style);
    }
    
    // 初始化逻辑
    function initSwimlaneBoard(container) {
        // 初始化代码
    }
    
    // 刷新数据
    function refreshData() {
        // 刷新逻辑
    }
    
    // 启动注册
    whenReady(() => {
        waitForRegistry(() => {
            registerSwimlaneBoard();
        });
    });
    
})(window || this);
```

---

## 📖 **文档编写规范**

### **必须包含的文档内容**

1. **README.md** - 基础说明
2. **API.md** - 接口文档
3. **CHANGELOG.md** - 更新日志

### **README.md 模板**

```markdown
# 泳道看板 (Swimlane Board)

提供泳道式任务管理，按部门和状态展示项目。

## 特性

- ✅ 按部门分组展示
- ✅ 支持拖拽调整任务状态
- ✅ 实时数据同步
- ✅ 响应式设计

## 安装

1. 下载 `swimlane-board.js`
2. 在工作栏库房中上传
3. 点击"上线"按钮
4. 在顶部栏点击🏊图标激活

## 配置

无需配置，自动从数据底座读取项目数据。

## 数据接口

### 输入 (Inputs)

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| projects | Array<Project> | ✅ | 项目数据数组 |
| departments | Array<string> | ⭕ | 部门列表 |

### 输出 (Outputs)

| 名称 | 类型 | 说明 |
|------|------|------|
| selectedProject | Project | 当前选中的项目 |

### 事件 (Events)

| 事件名 | 说明 | 数据 |
|--------|------|------|
| swimlane.statusChange | 任务状态变更 | { taskId, oldStatus, newStatus } |

## 使用示例

```javascript
// 监听状态变更事件
window.addEventListener('swimlane.statusChange', (e) => {
    console.log('任务状态变更:', e.detail);
});
```

## 依赖项

- AutogenUnifiedStorage >= 1.0.0
- AutogenEventBus >= 1.0.0

## 更新日志

### v1.0.0 (2025-10-01)
- 初始版本发布
```

---

## ✅ **规范验收清单**

### **代码规范**
- ✅ 使用IIFE包裹，避免全局污染
- ✅ 严格模式 'use strict'
- ✅ 等待依赖就绪再注册
- ✅ 样式注入到 <head>
- ✅ 生命周期钩子完整

### **配置规范**
- ✅ id 使用 kebab-case
- ✅ version 遵循 semver
- ✅ dataInterface 完整定义
- ✅ metadata 信息完整

### **文档规范**
- ✅ README.md 完整
- ✅ API 文档清晰
- ✅ 使用示例完整
- ✅ 更新日志详细

---

## 📅 **实施时间**

| 任务 | 预计时间 |
|------|---------|
| 规范文档编写 | 4小时 |
| 示例模板创建 | 2小时 |
| 开发工具脚本 | 2小时 |
| **总计** | **1天** |

---

**程序员**
