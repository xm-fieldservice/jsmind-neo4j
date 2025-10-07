# jsMind脑图主题和对比色板方案

## 一、jsMind默认主题

### 1.1 主题配置
```javascript
const jsMindThemes = {
    // 默认主题
    default: {
        name: 'default',
        background: '#f4f4f4',
        lineColor: '#555',
        lineWidth: 2,
        nodeColors: {
            root: '#4285f4',      // 根节点：蓝色
            level1: '#34a853',    // 一级节点：绿色
            level2: '#fbbc04',    // 二级节点：黄色
            level3: '#ea4335',    // 三级节点：红色
            default: '#666'       // 默认节点：灰色
        }
    },
    
    // 专业主题
    professional: {
        name: 'professional',
        background: '#ffffff',
        lineColor: '#333',
        lineWidth: 2,
        nodeColors: {
            root: '#2c3e50',      // 深蓝灰
            level1: '#3498db',    // 亮蓝
            level2: '#1abc9c',    // 青绿
            level3: '#9b59b6',    // 紫色
            default: '#7f8c8d'    // 灰色
        }
    },
    
    // 暗色主题
    dark: {
        name: 'dark',
        background: '#1e1e1e',
        lineColor: '#888',
        lineWidth: 2,
        nodeColors: {
            root: '#61dafb',      // 亮青色
            level1: '#98c379',    // 绿色
            level2: '#e5c07b',    // 黄色
            level3: '#e06c75',    // 红色
            default: '#abb2bf'    // 浅灰
        }
    }
};
```

## 二、推荐对比色板方案

### 2.1 方案一：现代扁平化（推荐）

**适用场景**: 项目管理、任务规划、知识图谱

```javascript
const modernFlatColors = {
    // 主色调
    primary: {
        blue: '#3498db',      // 主蓝色
        darkBlue: '#2980b9',  // 深蓝色
        lightBlue: '#5dade2'  // 浅蓝色
    },
    
    // 辅助色
    secondary: {
        green: '#2ecc71',     // 成功/完成
        yellow: '#f39c12',    // 警告/进行中
        red: '#e74c3c',       // 错误/紧急
        purple: '#9b59b6',    // 特殊/重要
        orange: '#e67e22',    // 提醒/待办
        teal: '#1abc9c'       // 信息/备注
    },
    
    // 中性色
    neutral: {
        darkGray: '#34495e',  // 深灰
        gray: '#7f8c8d',      // 中灰
        lightGray: '#bdc3c7', // 浅灰
        white: '#ecf0f1'      // 白色
    },
    
    // 节点层级配色
    levels: {
        root: '#2c3e50',      // 根节点：深蓝灰
        level1: '#3498db',    // 一级：蓝色
        level2: '#1abc9c',    // 二级：青绿
        level3: '#9b59b6',    // 三级：紫色
        level4: '#e67e22',    // 四级：橙色
        level5: '#e74c3c'     // 五级：红色
    }
};
```

**色板预览**:
```
根节点  █ #2c3e50 (深蓝灰)
一级    █ #3498db (蓝色)
二级    █ #1abc9c (青绿)
三级    █ #9b59b6 (紫色)
四级    █ #e67e22 (橙色)
五级    █ #e74c3c (红色)
```

### 2.2 方案二：Material Design

**适用场景**: 现代化应用、移动端、响应式设计

```javascript
const materialColors = {
    // 主色调
    primary: {
        main: '#1976d2',      // 主蓝色
        light: '#42a5f5',     // 浅蓝
        dark: '#1565c0'       // 深蓝
    },
    
    // 辅助色
    secondary: {
        main: '#9c27b0',      // 主紫色
        light: '#ba68c8',     // 浅紫
        dark: '#7b1fa2'       // 深紫
    },
    
    // 状态色
    status: {
        success: '#4caf50',   // 成功：绿色
        warning: '#ff9800',   // 警告：橙色
        error: '#f44336',     // 错误：红色
        info: '#2196f3'       // 信息：蓝色
    },
    
    // 节点层级配色
    levels: {
        root: '#1976d2',      // 根节点：主蓝
        level1: '#9c27b0',    // 一级：紫色
        level2: '#4caf50',    // 二级：绿色
        level3: '#ff9800',    // 三级：橙色
        level4: '#f44336',    // 四级：红色
        level5: '#00bcd4'     // 五级：青色
    }
};
```

**色板预览**:
```
根节点  █ #1976d2 (主蓝)
一级    █ #9c27b0 (紫色)
二级    █ #4caf50 (绿色)
三级    █ #ff9800 (橙色)
四级    █ #f44336 (红色)
五级    █ #00bcd4 (青色)
```

### 2.3 方案三：柔和渐变

**适用场景**: 创意设计、艺术项目、视觉展示

```javascript
const softGradientColors = {
    // 主色调（渐变起点）
    primary: {
        start: '#667eea',     // 紫蓝
        end: '#764ba2'        // 深紫
    },
    
    // 辅助色（渐变系列）
    gradients: [
        { start: '#f093fb', end: '#f5576c' },  // 粉红渐变
        { start: '#4facfe', end: '#00f2fe' },  // 蓝青渐变
        { start: '#43e97b', end: '#38f9d7' },  // 绿青渐变
        { start: '#fa709a', end: '#fee140' },  // 粉黄渐变
        { start: '#30cfd0', end: '#330867' }   // 青紫渐变
    ],
    
    // 节点层级配色
    levels: {
        root: '#667eea',      // 根节点：紫蓝
        level1: '#f093fb',    // 一级：粉红
        level2: '#4facfe',    // 二级：蓝色
        level3: '#43e97b',    // 三级：绿色
        level4: '#fa709a',    // 四级：粉色
        level5: '#30cfd0'     // 五级：青色
    }
};
```

**色板预览**:
```
根节点  █ #667eea (紫蓝)
一级    █ #f093fb (粉红)
二级    █ #4facfe (蓝色)
三级    █ #43e97b (绿色)
四级    █ #fa709a (粉色)
五级    █ #30cfd0 (青色)
```

### 2.4 方案四：商务专业

**适用场景**: 企业应用、商务报告、专业演示

```javascript
const businessColors = {
    // 主色调
    primary: {
        navy: '#003366',      // 海军蓝
        blue: '#0066cc',      // 商务蓝
        lightBlue: '#3399ff'  // 浅蓝
    },
    
    // 辅助色
    secondary: {
        gold: '#d4af37',      // 金色
        silver: '#c0c0c0',    // 银色
        bronze: '#cd7f32'     // 铜色
    },
    
    // 状态色
    status: {
        success: '#28a745',   // 成功：深绿
        warning: '#ffc107',   // 警告：金黄
        danger: '#dc3545',    // 危险：深红
        info: '#17a2b8'       // 信息：青色
    },
    
    // 节点层级配色
    levels: {
        root: '#003366',      // 根节点：海军蓝
        level1: '#0066cc',    // 一级：商务蓝
        level2: '#28a745',    // 二级：深绿
        level3: '#d4af37',    // 三级：金色
        level4: '#dc3545',    // 四级：深红
        level5: '#17a2b8'     // 五级：青色
    }
};
```

**色板预览**:
```
根节点  █ #003366 (海军蓝)
一级    █ #0066cc (商务蓝)
二级    █ #28a745 (深绿)
三级    █ #d4af37 (金色)
四级    █ #dc3545 (深红)
五级    █ #17a2b8 (青色)
```

## 三、实际应用示例

### 3.1 在jsMind中应用主题

```javascript
// 方法1: 通过CSS自定义节点样式
const customTheme = {
    'jmnode': {
        'background-color': '#3498db',
        'color': '#fff',
        'border-radius': '5px',
        'padding': '10px 15px',
        'font-size': '14px'
    },
    'jmnode.root': {
        'background-color': '#2c3e50',
        'font-size': '18px',
        'font-weight': 'bold'
    },
    'jmnode.level1': {
        'background-color': '#3498db'
    },
    'jmnode.level2': {
        'background-color': '#1abc9c'
    }
};

// 方法2: 通过data属性动态设置颜色
function addNodeWithColor(parent, topic, level) {
    const colors = modernFlatColors.levels;
    const nodeId = 'node_' + Date.now();
    
    jm.add_node(parent, nodeId, topic, {
        'background-color': colors[`level${level}`],
        'color': '#fff'
    });
}
```

### 3.2 根据节点类型设置颜色

```javascript
// 任务状态配色
const taskColors = {
    'pending': '#f39c12',    // 待办：黄色
    'inProgress': '#3498db', // 进行中：蓝色
    'completed': '#2ecc71',  // 已完成：绿色
    'blocked': '#e74c3c',    // 阻塞：红色
    'cancelled': '#95a5a6'   // 取消：灰色
};

// 优先级配色
const priorityColors = {
    'high': '#e74c3c',       // 高优先级：红色
    'medium': '#f39c12',     // 中优先级：橙色
    'low': '#3498db'         // 低优先级：蓝色
};

// 应用示例
function setNodeColor(nodeId, status, priority) {
    const node = jm.get_node(nodeId);
    if (node) {
        node.data['background-color'] = taskColors[status];
        node.data['border-color'] = priorityColors[priority];
        node.data['border-width'] = '3px';
        jm.update_node(nodeId, node.topic);
    }
}
```

## 四、色彩搭配原则

### 4.1 对比度要求
- **文字与背景对比度**: 至少4.5:1（WCAG AA标准）
- **重要信息对比度**: 至少7:1（WCAG AAA标准）

### 4.2 色彩层级
```
根节点（最深色）
  ├── 一级节点（深色）
  ├── 二级节点（中等色）
  ├── 三级节点（浅色）
  └── 四级节点（更浅色）
```

### 4.3 色彩心理学
- **蓝色**: 信任、专业、稳定
- **绿色**: 成功、成长、和谐
- **黄色**: 警告、注意、活力
- **红色**: 紧急、重要、危险
- **紫色**: 创意、智慧、神秘
- **橙色**: 热情、友好、积极

## 五、推荐使用方案

### 5.1 项目管理应用
**推荐**: 方案一（现代扁平化）
- 清晰的层级区分
- 良好的视觉对比
- 符合现代设计趋势

### 5.2 企业商务应用
**推荐**: 方案四（商务专业）
- 专业稳重的配色
- 符合企业形象
- 适合正式场合

### 5.3 创意设计应用
**推荐**: 方案三（柔和渐变）
- 视觉冲击力强
- 富有创意感
- 适合展示演示

### 5.4 通用应用
**推荐**: 方案二（Material Design）
- 成熟的设计体系
- 广泛的适用性
- 良好的用户体验

## 六、实施建议

1. **选择基础色板**: 根据应用场景选择合适的色板方案
2. **定义CSS变量**: 使用CSS变量方便主题切换
3. **测试对比度**: 确保文字可读性
4. **用户自定义**: 允许用户选择或自定义主题
5. **暗色模式**: 提供暗色主题选项

---
**文档创建时间**: 2025-10-07  
**适用版本**: jsMind 0.4.6+
