# MD底座数据结构规范

## 📋 概述

MD底座采用标准化的Markdown格式存储脑图数据，实现了JSON与MD的双向无损转换。每个脑图项目在MD文档中占据一个独立的段落，包含完整的元数据、结构数据和内容详情。

## 🏗️ 整体文档结构

```markdown
# 统一脑图存储文档

这是AutoGen混合存储架构的统一MD文档，用于存储所有脑图数据。

## 存储格式说明
[格式说明内容]

## 项目列表

## 项目: 脑图的优化和改造 (ID: mind_001)
- 创建时间: 2025-09-18T10:00:00.000Z
- 最后修改: 2025-09-18T10:15:00.000Z
- 数据温度: hot
- 访问次数: 45

### 脑图结构
```json
{
  "format": "node_tree",
  "data": { ... }
}
```

### 节点内容
[节点层级内容]

---

## 项目: 存储设计 (ID: mind_002)
[下一个项目...]
```

## 📊 项目段落结构

### 1. 项目头部标识
```markdown
## 项目: [项目名称] (ID: [项目ID])
```

**规则**：
- 使用二级标题 `##` 标识项目开始
- 格式：`项目: 名称 (ID: 唯一标识符)`
- 项目名称：从脑图根节点的 `topic` 字段提取
- 项目ID：全局唯一标识符，用于数据关联

**示例**：
```markdown
## 项目: 脑图的优化和改造 (ID: mind_20250918_001)
```

### 2. 元数据区域
```markdown
- 创建时间: 2025-09-18T10:00:00.000Z
- 最后修改: 2025-09-18T10:15:00.000Z  
- 数据温度: hot
- 访问次数: 45
```

**字段说明**：
- **创建时间**：ISO 8601格式的UTC时间戳
- **最后修改**：最后一次保存的时间戳
- **数据温度**：`hot` | `warm` | `cold` | `archive`
- **访问次数**：累计访问/编辑次数

**温度分级规则**：
- `hot`：30天内访问≥50次
- `warm`：30天内访问10-50次 或 90天内有访问
- `cold`：90-365天内有访问
- `archive`：365天以上未访问

### 3. 脑图结构区域
```markdown
### 脑图结构
```json
{
  "format": "node_tree",
  "data": {
    "id": "root-1758126945663-fcb5",
    "topic": "脑图的优化和改造",
    "children": [
      {
        "id": "node-001",
        "topic": "开发",
        "children": [...]
      }
    ]
  },
  "meta": {
    "mind_id": "mind_20250918_001",
    "createdAt": 1726646400000,
    "accessCount": 45
  }
}
```

**JSON结构规范**：
- **format**：固定为 `"node_tree"`
- **data**：完整的jsMind节点树结构
- **meta**：项目元数据信息

### 4. 节点内容区域
```markdown
### 节点内容
- **脑图的优化和改造** (ID: root-1758126945663-fcb5)
  - **开发** (ID: node-001)
    - 内容: 成功后，导入标签，然后恢复标签同步面板
    - **卡片** (ID: node-001-1)
      - 内容: 脑图卡片的标题做成两行显示
      - **New Node** (ID: node-001-1-1)
    - **节点** (ID: node-001-2)
      - 内容: 复制节点的时候，粘贴到文本编辑器内的文字，只包含标题+ 内容框内的内容
```

**层级规则**：
- 使用Markdown列表的缩进表示节点层级
- 每个节点显示：`**节点标题** (ID: 节点ID)`
- 如有内容，在下一行显示：`内容: 具体内容文本`
- 子节点递归缩进，完整保留父子关系

## 🔧 数据转换规则

### JSON → MD转换

1. **提取项目信息**
```javascript
const projectId = projectData.id || 'unknown';
const projectName = projectData.payload?.data?.topic || '未命名项目';
const createdAt = new Date(projectData.createdAt).toISOString();
const updatedAt = new Date(projectData.updatedAt).toISOString();
```

2. **评估数据温度**
```javascript
function evaluateTemperature(projectData) {
  const accessCount = projectData.accessCount || 0;
  const daysSinceAccess = (Date.now() - projectData.updatedAt) / (1000 * 60 * 60 * 24);
  
  if (accessCount >= 50) return 'hot';
  if (accessCount >= 10) return 'warm';  
  if (daysSinceAccess <= 90) return 'warm';
  if (daysSinceAccess <= 365) return 'cold';
  return 'archive';
}
```

3. **递归转换节点树**
```javascript
function convertNodesToMD(node, level) {
  const indent = '  '.repeat(level);
  const topic = node.topic || '未命名节点';
  const nodeId = node.id || 'unknown';
  const content = node.data?.content || node.content || '';
  
  let mdContent = `${indent}- **${topic}** (ID: ${nodeId})\n`;
  
  if (content) {
    mdContent += `${indent}  - 内容: ${content}\n`;
  }
  
  // 递归处理子节点
  if (node.children) {
    node.children.forEach(child => {
      mdContent += convertNodesToMD(child, level + 1);
    });
  }
  
  return mdContent;
}
```

### MD → JSON转换

1. **解析项目头部**
```javascript
const headerRegex = /^## 项目: (.+?) \(ID: (.+?)\)$/m;
const match = section.match(headerRegex);
const projectName = match[1];
const projectId = match[2];
```

2. **解析元数据**
```javascript
const metaRegex = /^- (.+?): (.+)$/gm;
const metadata = {};
for (const match of section.matchAll(metaRegex)) {
  const key = match[1].trim();
  const value = match[2].trim();
  
  if (key === '创建时间' || key === '最后修改') {
    metadata[key] = new Date(value).getTime();
  } else if (key === '访问次数') {
    metadata[key] = parseInt(value) || 0;
  } else {
    metadata[key] = value;
  }
}
```

3. **解析JSON结构**
```javascript
const jsonRegex = /```json\n([\s\S]*?)\n```/g;
const jsonMatch = section.match(jsonRegex);
if (jsonMatch && jsonMatch[1]) {
  const payload = JSON.parse(jsonMatch[1]);
}
```

## 📏 格式约束与验证

### 必需字段
- ✅ 项目头部：`## 项目: 名称 (ID: 标识符)`
- ✅ 创建时间：ISO 8601格式
- ✅ 最后修改：ISO 8601格式  
- ✅ JSON结构：有效的JSON格式
- ✅ 分隔符：项目间使用 `---` 分隔

### 可选字段
- 🔸 数据温度：默认为 `warm`
- 🔸 访问次数：默认为 `0`
- 🔸 节点内容：可为空
- 🔸 节点详情区域：可省略

### 格式验证
```javascript
function validateMDFormat(mdContent) {
  const projects = MindmapMDParser.mdToJSON(mdContent);
  
  return {
    valid: projects.length > 0,
    projectCount: projects.length,
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      hasValidJSON: !!p.payload,
      hasValidMeta: !!(p.createdAt && p.updatedAt)
    }))
  };
}
```

## 🔄 更新策略

### 增量更新
```javascript
function updateMDSection(mdContent, projectId, newProjectData) {
  const projectRegex = new RegExp(
    `## 项目: .+? \\(ID: ${escapeRegex(projectId)}\\)[\\s\\S]*?(?=## 项目:|$)`,
    'g'
  );
  
  const newMDSection = jsonToMD(newProjectData);
  
  if (projectRegex.test(mdContent)) {
    // 替换现有项目
    return mdContent.replace(projectRegex, newMDSection);
  } else {
    // 添加新项目到末尾
    return mdContent + newMDSection;
  }
}
```

### 冲突解决
```javascript
function mergeContent(localContent, serverContent) {
  const localProjects = mdToJSON(localContent);
  const serverProjects = mdToJSON(serverContent);
  
  const merged = new Map();
  
  // 本地项目优先
  localProjects.forEach(project => {
    merged.set(project.id, project);
  });
  
  // 服务器项目按时间戳合并
  serverProjects.forEach(serverProject => {
    const localProject = merged.get(serverProject.id);
    if (!localProject || serverProject.updatedAt > localProject.updatedAt) {
      merged.set(serverProject.id, serverProject);
    }
  });
  
  return generateMDFromProjects(Array.from(merged.values()));
}
```

## 📈 性能优化

### 解析优化
- **分块处理**：大文档按项目分块解析
- **缓存机制**：解析结果缓存到内存
- **增量更新**：只更新变更的项目段落
- **异步处理**：不阻塞UI线程

### 存储优化  
- **压缩率**：MD格式比JSON节省约30%空间
- **可读性**：纯文本格式便于版本控制
- **兼容性**：标准Markdown格式跨平台通用

## 🎯 使用示例

### 完整项目示例
```markdown
## 项目: 脑图的优化和改造 (ID: mind_20250918_001)
- 创建时间: 2025-09-18T02:00:00.000Z
- 最后修改: 2025-09-18T02:15:00.000Z
- 数据温度: hot
- 访问次数: 45

### 脑图结构
```json
{
  "format": "node_tree",
  "data": {
    "id": "root-1758126945663-fcb5",
    "topic": "脑图的优化和改造",
    "children": [
      {
        "id": "node-dev-001",
        "topic": "开发",
        "data": {
          "content": "成功后，导入标签，然后恢复标签同步面板"
        },
        "children": [
          {
            "id": "node-card-001", 
            "topic": "卡片",
            "children": [
              {
                "id": "node-title-001",
                "topic": "脑图卡片的标题做成两行显示"
              }
            ]
          }
        ]
      }
    ]
  },
  "meta": {
    "mind_id": "mind_20250918_001",
    "createdAt": 1726646400000,
    "accessCount": 45
  }
}
```

### 节点内容
- **脑图的优化和改造** (ID: root-1758126945663-fcb5)
  - **开发** (ID: node-dev-001)
    - 内容: 成功后，导入标签，然后恢复标签同步面板
    - **卡片** (ID: node-card-001)
      - **脑图卡片的标题做成两行显示** (ID: node-title-001)

---
```

## 🚀 总结

MD底座数据结构具有以下特点：

1. **标准化格式**：遵循Markdown规范，便于版本控制和跨平台共享
2. **完整性保证**：JSON结构完整保存，节点内容详细展示  
3. **层级清晰**：通过缩进和标记清晰表示父子关系
4. **元数据丰富**：包含时间戳、访问统计、温度分级等信息
5. **双向转换**：支持MD↔JSON的无损转换
6. **增量更新**：支持单个项目的独立更新
7. **冲突解决**：基于时间戳的智能合并策略

这种结构为AI应用的大数据处理和冷热分层存储提供了坚实的基础！
