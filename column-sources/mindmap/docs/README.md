# 脑图工作栏 (Mindmap Column)

## 📋 功能定位

**极简版jsMind脑图工作栏** - 专注于思维导图的核心功能。

## 🎯 核心功能

### ✅ 已实现功能
1. **脑图可视化** - 基于jsMind渲染思维导图
2. **节点CRUD** - 添加、删除、修改节点
3. **节点属性编辑** ⭐ - 编辑meta字段（itemType, status, priority, assignee, tags）
4. **节点搜索** ⭐ - 实时搜索和定位节点
5. **展开/折叠** ⭐ - 全部展开/折叠功能
6. **节点选择** - 点击节点，广播选中事件
7. **基础交互** - 缩放、平移、全屏
8. **数据持久化** ⭐ - 保存到localStorage（模拟AutogenUnifiedStorage）
9. **事件系统** ⭐ - 模拟AutogenEventBus事件发射
10. **v1.2数据规范** ⭐ - 符合数据底座规范v1.2（data层+meta层+relations）

### 🔄 待集成功能
- AutogenUnifiedStorage集成（当前为模拟）
- AutogenEventBus集成（当前为模拟）
- StateManager集成
- Neo4j同步（规划中）
- 知识提取（规划中）

### ❌ 不包含功能
- 项目管理（迁移到工作区栏）
- 附件管理（迁移到详情栏）
- 配置管理（移到设置页面）

## 📁 文件结构

```
mindmap/
├── README.md                        # 本文件
├── mindmap-column-core.js           # 核心逻辑（~200行）
├── mindmap-column-layout.html       # 布局结构
├── mindmap-column-styles.css        # 样式
├── mindmap-interface-definition.js  # 接口定义
├── test-data.json                   # 测试数据
└── test.bat                         # 测试启动脚本
```

## 🚀 快速开始

### 启动测试服务器（推荐）
```bash
# 方式1：双击test.bat
cd column-sources/mindmap
test.bat

# 方式2：直接运行Python
python start_test.py
```

**自动完成**：
- 启动HTTP服务器（端口8888）
- 打开浏览器访问测试页面
- 避免CORS跨域问题

## 📊 数据格式

### 输入格式
```javascript
{
  type: 'mindmap',
  id: 'mindmap_001',
  data: {
    meta: { name: '我的脑图', version: '1.0' },
    format: 'node_tree',
    data: {
      id: 'root',
      topic: '中心主题',
      children: [...]
    }
  }
}
```

### 输出事件
```javascript
// 节点选中
AutogenEventBus.emit('mindmap.node.selected', {
  nodeId: 'node_001',
  topic: '选中的节点',
  mindmapId: 'mindmap_001'
});
```

## 🔌 接口定义

遵循 `UniversalColumnInterface` 标准：
- `init()` - 初始化
- `loadData(data)` - 加载数据
- `getData()` - 获取当前数据
- `destroy()` - 销毁
- `show()` / `hide()` - 显示/隐藏

## 📝 开发说明

### 代码统计
- **单页面测试版**: ~500行（HTML + CSS + JS）
- **核心逻辑**: ~300行 JavaScript
- **测试数据**: 符合v1.2规范，包含完整meta和relations示例

### 核心依赖
- jsMind (已有) - 脑图渲染
- AutogenUnifiedStorage (待集成) - 数据存储
- AutogenEventBus (待集成) - 事件通信
- StateManager (待集成) - 状态管理

### 架构对齐
完全符合以下架构文档：
- ✅ 架构师：工作栏职责定义完整版.md
- ✅ 审查员：项目管理应用架构功能清单.md
- ✅ 架构师：数据底座规范v1.2-关系表达(meta)增强.md
