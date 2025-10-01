# JSON数据底座使用说明

## 📋 **概述**

JSON数据底座是项目管理系统的核心数据存储，采用扁平化JSON格式，完美支持Autogen AI应用。

---

## 🏗️ **架构设计**

### **数据流**

```
工作栏（前端）
    ↓
AutogenUnifiedStorage（统一存储接口）
    ↓
    ├─ 前端缓存（内存/LocalStorage/IndexedDB）
    └─ JSON数据底座（后端文件）⭐
           ↓
        data/nodes.json
```

### **核心特点**

- ✅ **扁平化结构**：所有节点在同一层级，通过ID引用关系
- ✅ **AI友好**：纯文本JSON，Autogen可直接读取处理
- ✅ **自动索引**：按标签、日期自动建立索引
- ✅ **版本控制**：Git友好，可追踪历史变更

---

## 📊 **数据结构**

### **nodes.json格式**

```json
{
  "meta": {
    "version": "2.0",
    "created_at": "2025-10-01T18:00:00.000Z",
    "updated_at": "2025-10-01T18:00:00.000Z",
    "total_nodes": 150,
    "description": "项目管理数据底座"
  },
  
  "nodes": [
    {
      "id": "node_001",
      "topic": "节点标题",
      "content": "节点内容（Markdown格式）",
      "tags": ["标签1", "标签2"],
      "parent_id": null,
      "children_ids": ["node_002"],
      "created_at": "2025-10-01T10:00:00.000Z",
      "updated_at": "2025-10-01T15:00:00.000Z"
    }
  ],
  
  "indexes": {
    "by_tag": {
      "标签1": ["node_001"]
    },
    "by_date": {
      "2025-10-01": ["node_001"]
    },
    "root_nodes": ["node_001"]
  }
}
```

---

## 🔧 **使用方法**

### **1. 保存节点**

```javascript
// 节点数据
const nodeData = {
    id: 'node_001',
    topic: '项目管理系统',
    content: '# 项目管理\n\n详细内容...',
    tags: ['项目', '重要'],
    parent_id: null,
    children_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

// 保存到AutogenUnifiedStorage（会自动同步到JSON底座）
await AutogenUnifiedStorage.store('node', 'node_001', nodeData);
```

### **2. 读取节点**

```javascript
// 读取单个节点
const node = await AutogenUnifiedStorage.retrieve('node', 'node_001');

// 读取所有节点
const allNodes = await AutogenUnifiedStorage.list('node');
```

### **3. 更新节点**

```javascript
// 读取现有节点
const node = await AutogenUnifiedStorage.retrieve('node', 'node_001');

// 更新数据
const updatedNode = {
    ...node,
    topic: '更新后的标题',
    updated_at: new Date().toISOString()
};

// 保存（会自动同步到JSON底座）
await AutogenUnifiedStorage.store('node', 'node_001', updatedNode);
```

### **4. 按标签查询**

```javascript
// 加载JSON底座
const jsonBase = await AutogenUnifiedStorage.loadJsonBase();

// 按标签查询
const tag = '重要';
const nodeIds = jsonBase.indexes.by_tag[tag] || [];

// 获取节点详情
const nodes = nodeIds.map(id => 
    jsonBase.nodes.find(n => n.id === id)
);
```

### **5. 按日期查询**

```javascript
const jsonBase = await AutogenUnifiedStorage.loadJsonBase();

// 按日期查询
const date = '2025-10-01';
const nodeIds = jsonBase.indexes.by_date[date] || [];

// 获取节点详情
const nodes = nodeIds.map(id => 
    jsonBase.nodes.find(n => n.id === id)
);
```

---

## 🚀 **后端API**

### **启动API服务**

```bash
# 启动Python API服务
python api/data-api.py
```

API服务运行在 `http://localhost:5000`

### **API接口**

**1. 获取所有数据**
```
GET /api/data
```

**2. 保存数据**
```
POST /api/data
Content-Type: application/json

{完整的JSON底座数据}
```

**3. 获取单个节点**
```
GET /api/data/node/{node_id}
```

**4. 获取统计信息**
```
GET /api/data/stats
```

---

## 🧪 **测试**

### **运行测试页面**

1. 启动API服务：
   ```bash
   python api/data-api.py
   ```

2. 打开测试页面：
   ```
   tests/json-base-test.html
   ```

3. 执行测试：
   - 保存节点
   - 读取节点
   - 更新节点
   - 索引查询
   - 查看统计

---

## 🤖 **Autogen集成**

### **读取数据用于AI处理**

```python
import json

# 读取JSON数据底座
with open('data/nodes.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 提取所有节点内容
all_content = "\n\n".join([
    f"## {node['topic']}\n{node['content']}"
    for node in data['nodes']
])

# 传给Autogen Agent
agent.receive(all_content)
```

### **按标签检索内容（RAG）**

```python
def retrieve_by_tag(tag):
    with open('data/nodes.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 使用索引快速查找
    node_ids = data['indexes']['by_tag'].get(tag, [])
    
    # 获取节点内容
    nodes = [n for n in data['nodes'] if n['id'] in node_ids]
    
    return "\n\n".join([
        f"# {n['topic']}\n{n['content']}"
        for n in nodes
    ])

# 用于Autogen对话
context = retrieve_by_tag('重要')
agent.receive(f"相关内容：\n{context}\n\n请分析...")
```

---

## 📁 **文件说明**

```
data/
├── nodes.json              # 主数据文件
├── schema.json             # 数据格式定义
├── README-JSON底座.md      # 本说明文档
└── nodes_backup.json       # 备份文件（自动生成）

api/
└── data-api.py            # Python API服务

tests/
└── json-base-test.html    # 测试页面
```

---

## ⚙️ **配置**

### **AutogenUnifiedStorage配置**

在 `src/core/storage/AutogenUnifiedStorage.js` 中：

```javascript
this.jsonBaseConfig = {
    enabled: true,              // 是否启用JSON底座同步
    endpoint: '/api/data',      // API端点
    filePath: './data/nodes.json',  // JSON文件路径
    syncMode: 'auto',           // auto: 自动同步 | manual: 手动同步
    syncDelay: 1000,            // 同步延迟（毫秒，防抖）
    syncTypes: ['node']         // 需要同步的数据类型
};
```

### **启用/禁用同步**

```javascript
// 禁用JSON底座同步
AutogenUnifiedStorage.jsonBaseConfig.enabled = false;

// 启用JSON底座同步
AutogenUnifiedStorage.jsonBaseConfig.enabled = true;
```

---

## 📈 **统计信息**

```javascript
// 获取统计信息
const stats = AutogenUnifiedStorage.getStats();

console.log('JSON底座同步次数:', stats.jsonBaseSyncs);
console.log('JSON底座同步错误:', stats.jsonBaseSyncErrors);
```

---

## 🎯 **最佳实践**

### **1. 数据保存**
- ✅ 使用AutogenUnifiedStorage统一接口
- ✅ 让系统自动同步到JSON底座
- ❌ 不要直接修改nodes.json文件

### **2. 数据读取**
- ✅ 优先从AutogenUnifiedStorage读取（有缓存）
- ✅ 需要完整数据时使用loadJsonBase()
- ✅ 利用索引加速查询

### **3. Autogen集成**
- ✅ 直接读取nodes.json文件
- ✅ 使用索引快速定位相关内容
- ✅ 实现RAG（检索增强生成）

---

## ❓ **常见问题**

### **Q1: 数据没有同步到JSON底座？**
A: 检查：
1. API服务是否启动
2. jsonBaseConfig.enabled是否为true
3. 数据类型是否在syncTypes中

### **Q2: 如何备份数据？**
A: JSON文件可以直接复制备份，或使用Git版本控制

### **Q3: 如何重建索引？**
A: 调用 `AutogenUnifiedStorage.rebuildJsonBaseIndexes(jsonBaseData)`

---

**JSON数据底座已完成挂接！可以开始使用了！**
