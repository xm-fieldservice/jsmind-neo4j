# D3.js + Neo4j 关系图可视化集成系统

## 🎯 系统概述

本系统实现了D3.js与Neo4j的完整集成，为项目管理应用提供强大的关系图可视化功能。基于AutoGen 0.7.1框架规范开发，确保代码质量和可维护性。

## ✨ 核心功能

### 🔍 已实现功能
- ✅ **D3.js集成**: 完整的D3.js v7可视化库集成
- ✅ **Neo4j连接**: 稳定的Neo4j数据库连接和操作
- ✅ **关系图渲染**: 交互式力导向关系图可视化
- ✅ **数据同步**: 前后端数据实时同步机制
- ✅ **API接口**: 完整的RESTful API接口
- ✅ **自动化启动**: 一键启动前后端服务

### 🎨 可视化特性
- 🔄 **力导向布局**: 自动优化的节点布局算法
- 🎯 **交互操作**: 节点拖拽、缩放、平移
- 🏷️ **类型着色**: 根据节点类型自动着色
- 💡 **悬停提示**: 丰富的节点信息提示
- 📊 **动态更新**: 数据变化时自动更新可视化

## 🚀 快速开始

### 1. 环境准备

确保您已安装：
- Python 3.8+
- Neo4j数据库 (Desktop版本或服务器版本)
- 现代浏览器 (支持ES6+)

### 2. 配置Neo4j连接

复制配置模板：
```bash
copy neo4j_config_template.env .env
```

编辑 `.env` 文件，配置您的Neo4j连接信息：
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=您的密码
```

### 3. 一键启动服务

运行集成服务启动器：
```bash
python start_neo4j_d3_server.py
```

启动器会自动：
- 🔍 检查Neo4j连接状态
- 📦 安装必要的Python依赖
- 🚀 启动后端API服务器 (端口8000)
- 🌐 启动前端HTTP服务器 (端口3000)
- 🧪 运行集成测试

### 4. 访问系统

- **前端界面**: http://localhost:3000
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs

## 🧪 测试和演示

### 自动化测试

运行集成测试脚本：
```bash
python test_d3_neo4j_integration.py
```

测试脚本会：
- 📝 创建示例项目数据
- 🔗 建立节点间关系
- 🧪 验证API接口
- 📜 生成前端测试脚本

### 手动测试

1. 打开浏览器访问 http://localhost:3000
2. 进入"关系管理"模块
3. 查看D3.js关系图可视化效果
4. 在浏览器控制台运行测试脚本

## 📋 API接口说明

### 核心接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/neo4j/graph-data` | GET | 获取D3.js图形数据 |
| `/api/relations` | GET | 查询节点关系 |
| `/api/relations` | POST | 创建新关系 |
| `/api/sync-mindmap` | POST | 同步脑图数据到Neo4j |
| `/health` | GET | 健康检查 |

### 图形数据格式

```json
{
  "nodes": [
    {
      "id": "node1",
      "label": "节点名称", 
      "type": "project",
      "description": "节点描述",
      "properties": {...}
    }
  ],
  "links": [
    {
      "source": "node1",
      "target": "node2", 
      "type": "contains",
      "label": "关系标签",
      "value": 1,
      "properties": {...}
    }
  ]
}
```

## 🏗️ 架构设计

### 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (D3.js)  │    │  后端 (FastAPI) │    │  Neo4j 数据库   │
│                 │    │                 │    │                 │
│ • 关系图可视化  │◄──►│ • RESTful API   │◄──►│ • 图数据存储    │
│ • 交互操作      │    │ • 数据转换      │    │ • 关系查询      │
│ • 实时更新      │    │ • 连接管理      │    │ • 事务处理      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技术栈

- **前端**: D3.js v7, HTML5, CSS3, JavaScript ES6+
- **后端**: FastAPI, Python 3.8+, Neo4j Driver
- **数据库**: Neo4j 5.9+
- **框架**: AutoGen 0.7.1

## 🔧 开发指南

### 扩展D3.js组件

D3RelationGraph组件位于 `src/visualization/D3RelationGraph.js`，支持：

```javascript
// 创建关系图实例
const graph = new D3RelationGraph('container-id', {
    width: 800,
    height: 600,
    nodeRadius: 25,
    linkDistance: 120,
    charge: -400
});

// 加载数据
graph.loadData({nodes: [...], links: [...]});

// 从API获取数据
graph.fetchAndRender();
```

### 自定义节点样式

修改 `getNodeColor()` 方法来自定义节点颜色：

```javascript
getNodeColor(type) {
    const colors = {
        'project': '#ff6b6b',    // 项目节点 - 红色
        'task': '#4ecdc4',       // 任务节点 - 青色  
        'person': '#45b7d1',     // 人员节点 - 蓝色
        'resource': '#96ceb4',   // 资源节点 - 绿色
        'milestone': '#feca57',  // 里程碑 - 黄色
        'default': '#95a5a6'     // 默认 - 灰色
    };
    return colors[type] || colors.default;
}
```

### 添加新的API接口

在 `backend/app/main.py` 中添加新接口：

```python
@app.get("/api/custom-endpoint")
async def custom_endpoint(driver = Depends(get_neo4j_driver)):
    # 您的自定义逻辑
    pass
```

## 🐛 故障排除

### 常见问题

1. **Neo4j连接失败**
   - 检查Neo4j服务是否启动
   - 验证连接配置信息
   - 确认防火墙设置

2. **D3.js不显示**
   - 检查浏览器控制台错误
   - 确认D3.js库已加载
   - 验证API数据格式

3. **端口冲突**
   - 修改启动脚本中的端口配置
   - 检查端口占用情况

### 调试模式

启用调试模式查看详细日志：
```bash
DEBUG=true python start_neo4j_d3_server.py
```

## 📈 性能优化

### 大数据集处理

- 使用分页查询限制节点数量
- 实现增量加载机制
- 优化Neo4j查询语句

### 可视化优化

- 调整力导向参数
- 使用节点聚类
- 实现层次化显示

## 🤝 贡献指南

1. Fork项目仓库
2. 创建功能分支
3. 提交代码更改
4. 发起Pull Request

## 📄 许可证

本项目基于MIT许可证开源。

## 🆘 支持

如有问题，请：
1. 查看故障排除部分
2. 检查API文档
3. 提交Issue报告

---

**🎉 恭喜！您已成功集成D3.js和Neo4j，享受强大的关系图可视化功能！**
