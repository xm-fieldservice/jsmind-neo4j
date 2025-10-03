# Neo4j + D3.js 知识图谱演示系统

## 🎯 系统概述

这是一个完整的知识图谱可视化演示系统，展示了Neo4j图数据库和D3.js可视化库的强大组合能力。

### 核心功能

1. **📁 文档上传** - 支持JSON、Markdown、TXT格式文件自动解析
2. **✏️ 文本智能分析** - 粘贴文本自动提取实体和关系
3. **🔎 图谱查询** - 灵活的Neo4j图数据查询
4. **🎨 交互式可视化** - 基于D3.js的力导向图布局
5. **⚙️ 完整操作控制** - 缩放、拖拽、暂停、导出等功能

---

## 🚀 快速启动

### 1. 启动后端服务

```bash
# 进入项目目录
cd d:\AI-Projects\project_manager(neo4j+d3.jsECHART)

# 启动FastAPI后端（确保Neo4j已运行）
cd backend
uvicorn app.main:app --reload --port 8000
```

### 2. 启动前端服务

```bash
# 使用Python HTTP服务器
python -m http.server 8080

# 或使用PowerShell脚本
.\start_http_server.ps1
```

### 3. 访问演示页面

打开浏览器访问：
```
http://localhost:8080/neo4j-d3-demo.html
```

---

## 📋 功能详解

### 一、文档上传功能

**支持格式：**
- `.json` / `.mindmap.json` - 脑图数据文件
- `.md` - Markdown文档
- `.txt` - 纯文本文件

**操作步骤：**
1. 点击或拖拽文件到上传区域
2. 点击"📤 上传并解析"按钮
3. 系统自动提取实体和关系
4. 数据同步到Neo4j数据库
5. 图谱自动渲染显示

**示例JSON格式：**
```json
{
  "root": "root-node-id",
  "nodes": {
    "root-node-id": {
      "id": "root-node-id",
      "topic": "项目管理",
      "parent": null
    },
    "child-node-id": {
      "id": "child-node-id",
      "topic": "需求分析",
      "parent": "root-node-id"
    }
  }
}
```

### 二、文本智能分析

**功能说明：**
- 自动识别人名（基于常见姓氏）
- 提取项目/产品名称
- 识别任务/工作关键词
- 分析实体间的关系（负责、汇报、依赖）

**使用示例：**
```
张三是项目经理，负责产品开发。
李四是开发工程师，向张三汇报。
产品开发依赖于技术架构设计。
```

**自动提取结果：**
- 实体：张三、李四、产品开发、技术架构设计
- 关系：
  - 张三 --负责--> 产品开发
  - 李四 --汇报给--> 张三
  - 产品开发 --依赖于--> 技术架构设计

### 三、图谱查询功能

**查询参数：**

| 参数 | 说明 | 默认值 |
|------|------|--------|
| 节点ID | 中心节点ID，留空查询全图 | 空 |
| 关系深度 | 查询的关系层级（1-4层） | 2层 |
| 最大节点 | 返回的最大节点数量 | 100 |

**查询示例：**
1. **查询全图**：节点ID留空，查询所有数据
2. **查询特定节点**：输入节点ID，查询其周围关系网络
3. **深度控制**：调整深度参数，控制关系扩展范围

### 四、可视化交互

**节点操作：**
- 🖱️ **拖拽节点** - 改变节点位置
- 🔍 **悬停查看** - 显示节点详细信息
- 👆 **点击选中** - 高亮显示相关节点

**视图控制：**
- 🎯 **适应画布** - 自动调整视图显示全部内容
- 🔍+ **放大** - 放大视图
- 🔍- **缩小** - 缩小视图
- ⏸️ **暂停/继续** - 控制力导向布局动画
- 🔄 **重置** - 重启力导向模拟

**数据操作：**
- 💾 **导出数据** - 将当前图谱数据导出为JSON文件
- 🗑️ **清空图谱** - 清空当前显示的图谱

### 五、节点类型系统

系统支持6种预定义节点类型，使用不同颜色区分：

| 类型 | 颜色 | 说明 |
|------|------|------|
| 🔴 项目 | #ff6b6b | 项目节点 |
| 🔵 任务 | #4ecdc4 | 任务节点 |
| 🟢 人员 | #45b7d1 | 人员节点 |
| 🟡 资源 | #96ceb4 | 资源节点 |
| 🟠 里程碑 | #feca57 | 里程碑节点 |
| ⚪ 其他 | #95a5a6 | 默认节点 |

---

## 🔧 技术架构

### 前端技术栈

- **D3.js v7** - 数据可视化核心库
- **原生JavaScript** - 无框架依赖，轻量高效
- **CSS3** - 现代化UI设计
- **HTML5** - 语义化标签

### 后端技术栈

- **FastAPI** - 高性能Python Web框架
- **Neo4j** - 图数据库
- **Pydantic** - 数据验证
- **CORS中间件** - 跨域支持

### 数据流架构

```
前端上传/输入
    ↓
文本解析/实体提取
    ↓
构建图数据结构
    ↓
同步到Neo4j数据库
    ↓
Cypher查询
    ↓
返回图数据
    ↓
D3.js力导向布局渲染
```

---

## 📊 应用场景演示

### 场景1：项目管理

**输入文本：**
```
项目管理系统包含需求分析、架构设计、开发实现三个阶段。
张三担任项目经理，负责整体协调。
李四是架构师，负责架构设计。
王五是开发工程师，负责开发实现。
开发实现依赖于架构设计，架构设计依赖于需求分析。
```

**生成图谱：**
- 9个节点（1个项目，3个任务，3个人员）
- 8条关系（包含、负责、依赖）

### 场景2：知识管理

**上传Markdown文档：**
```markdown
# 技术栈选型

## 前端技术
- React框架用于UI开发
- Redux管理状态
- Webpack打包工具

## 后端技术
- Node.js运行环境
- Express框架
- MongoDB数据库

前端依赖后端API，后端依赖数据库。
```

**生成图谱：**
自动提取技术栈实体及依赖关系

### 场景3：脑图同步

**上传脑图JSON：**
- 自动解析所有节点
- 提取层次关系（父子关系）
- 提取引用关系（节点间引用）
- 同步到Neo4j
- 可视化展示完整知识结构

---

## 🎨 UI特性

### 渐变色设计
- 紫色渐变主题（#667eea → #764ba2）
- 现代化玻璃态效果
- 柔和阴影和圆角

### 响应式布局
- 桌面端：左右分栏布局
- 平板/移动端：上下堆叠布局
- 自适应画布大小

### 交互反馈
- 按钮悬停效果
- 拖拽区域高亮
- 状态指示动画
- 加载提示

---

## 🔌 API接口

### 1. 健康检查
```http
GET /health
```

### 2. 图谱数据查询
```http
GET /api/neo4j/graph-data?node_id={id}&depth={n}&limit={m}
```

**参数：**
- `node_id` - 可选，中心节点ID
- `depth` - 关系深度，默认2
- `limit` - 最大节点数，默认100

**返回：**
```json
{
  "nodes": [
    {
      "id": "node1",
      "label": "节点名称",
      "type": "project",
      "description": "描述信息"
    }
  ],
  "links": [
    {
      "source": "node1",
      "target": "node2",
      "type": "contains",
      "label": "包含",
      "value": 1
    }
  ]
}
```

### 3. 脑图数据同步
```http
POST /api/sync-mindmap
Content-Type: application/json

{
  "root": "root-id",
  "nodes": { ... }
}
```

**返回：**
```json
{
  "status": "success",
  "message": "脑图数据同步成功",
  "stats": {
    "nodes_created": 10,
    "relations_created": 15
  }
}
```

---

## 🛠️ 扩展开发

### 添加自定义节点类型

在 `D3RelationGraph.js` 中修改：

```javascript
getNodeColor(type) {
    const colors = {
        'project': '#ff6b6b',
        'task': '#4ecdc4',
        'custom_type': '#YOUR_COLOR', // 添加自定义类型
        'default': '#95a5a6'
    };
    return colors[type] || colors.default;
}
```

### 增强实体识别

在 `neo4j-d3-demo.js` 中扩展：

```javascript
function extractEntities(text) {
    // 添加更多实体识别规则
    const customPattern = /您的正则表达式/g;
    const customEntities = text.match(customPattern) || [];
    entities.push(...customEntities);
    return entities;
}
```

### 自定义关系类型

修改关系提取逻辑：

```javascript
function extractRelationships(text, entities) {
    // 添加自定义关系检测
    for (let i = 0; i < entities.length; i++) {
        for (let j = 0; j < entities.length; j++) {
            const pattern = new RegExp(`${entities[i]}.*?关键词.*?${entities[j]}`);
            if (pattern.test(text)) {
                relationships.push({
                    source: i,
                    target: j,
                    type: 'custom_relation',
                    label: '自定义关系'
                });
            }
        }
    }
    return relationships;
}
```

---

## 📝 使用注意事项

### Neo4j连接
- 确保Neo4j数据库已启动（默认端口7687）
- 检查 `.env` 文件中的连接配置
- 首次启动可能需要创建数据库

### 性能优化
- 大规模数据建议限制节点数量（<200）
- 关系深度不宜超过3层
- 可以暂停力导向布局减少CPU占用

### 浏览器兼容性
- 推荐使用Chrome/Edge/Firefox最新版本
- 需要支持ES6+和D3.js v7
- SVG渲染能力要求较高

---

## 🎓 学习价值

通过这个演示系统，您可以学习到：

1. **图数据库应用** - Neo4j的实际使用场景
2. **数据可视化** - D3.js力导向图实现原理
3. **前后端集成** - RESTful API设计与调用
4. **实体关系提取** - 简单的NLP应用
5. **交互设计** - 拖拽、缩放等用户交互实现

---

## 🔗 相关资源

- [Neo4j官方文档](https://neo4j.com/docs/)
- [D3.js官方文档](https://d3js.org/)
- [FastAPI文档](https://fastapi.tiangolo.com/)
- [项目架构文档](./审查员：项目管理应用架构功能清单.md)

---

## 📞 技术支持

如有问题，请查看：
- 控制台日志输出
- 后端服务器日志
- Neo4j数据库连接状态

**程序员**
