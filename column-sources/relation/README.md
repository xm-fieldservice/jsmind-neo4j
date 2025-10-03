# 关系管理工作栏 (Relation Column)

## 📋 功能概述

关系管理工作栏用于可视化和管理Neo4j图数据库中的节点关系。

### 核心功能
- ✅ Neo4j关系图谱可视化（基于D3.js）
- ✅ 关系列表展示
- ✅ 关系类型分类
- ✅ 实时数据刷新
- ✅ 关系数据导出

---

## 🚀 快速启动

### 方式1：通过HTTP服务器
```bash
# 在项目根目录
python -m http.server 8000

# 访问
http://localhost:8000/column-sources/relation/relation-column-layout.html
```

### 方式2：集成到主程序
```javascript
// 在ColumnRegistry中注册
ColumnRegistry.register({
    id: 'relation',
    name: '关系管理',
    icon: '🔗',
    component: RelationColumn
});
```

---

## 📁 文件结构

```
relation/
├─ relation-column-layout.html    布局HTML
├─ relation-column-styles.css     样式CSS（待拆分）
├─ relation-column-core.js        核心逻辑（待拆分）
└─ README.md                      本说明文件
```

---

## 🎯 支持的关系类型

| 类型 | 说明 | 图标 | 颜色 |
|------|------|------|------|
| contains | 包含关系 | 📦 | 蓝色 |
| depends_on | 依赖关系 | ⏭️ | 黄色 |
| assigned_to | 分配关系 | 👤 | 绿色 |
| manages | 管理关系 | 👔 | 粉色 |
| uses | 使用关系 | 🔧 | 紫色 |
| leads_to | 通向关系 | 🎯 | 粉色 |

---

## 🔌 API接口

### 获取关系数据
```
GET /api/neo4j/relations
```

**响应格式**:
```json
{
  "nodes": [
    { "id": "node1", "label": "节点1", "type": "project" }
  ],
  "links": [
    { "source": "node1", "target": "node2", "type": "contains", "label": "包含" }
  ]
}
```

---

## 📝 开发状态

**当前版本**: v1.0  
**状态**: ✅ 原料页面开发完成  
**下一步**: 拆分CSS和JS，封装为relation-column.js

---

## 🔧 技术栈

- **可视化**: D3.js v7
- **图谱组件**: D3RelationGraph
- **数据源**: Neo4j图数据库
- **降级方案**: 演示数据

---

**维护者**: 程序员  
**创建日期**: 2025-10-03
