# NodeMind 节点数据标准规范完整文档

## 📋 **文档概述**

本文档整合了NodeMind项目中所有关于节点数据描述细节、标准、规范的内容，包括：
- 当前数据结构标准 (Schema 2.0)
- 万能数据架构设计 (第三次重构)
- MD格式规范和六要素模板
- 脑图开发计划中的节点标准
- 历史发展和演进过程

## 🎯 **核心设计理念**

### **万物皆任务的统一思想**
- **基本原理**: 所有数据类型（节点、标签、模板、项目、团队等）都可视为不同类型的"任务"
- **统一载体**: 全部使用MD格式作为数据载体，便于AI处理和人工阅读
- **笔记块模型**: 每个节点本质上是一个"笔记块"，有唯一ID，对应一个广义任务或通用任务节点
- **六要素方法论**: 六要素是认知层面的方法论和底层设计依据，解释了为什么能实现"万物皆统一数据结构"，而非具象的显性数据模型

### **六要素方法论说明**

**六要素不是数据字段，而是设计思维框架：**

- **认知层面**: 用于理解和分析不同数据类型的本质特征
- **设计依据**: 指导万能数据架构的设计，而不是强制要求每个笔记块都显性填写六要素
- **灵活应用**: 根据实际需要，在MD内容中自然体现相关要素，避免教条化
- **智能推断**: 系统可以基于六要素方法论智能分析笔记块的任务类型和特征，但不强制显性标记

**示例对比：**
```
❌ 教条化方式（过于僵化）：
**谁:** 开发者
**时间:** 2024年
**地点:** 开发环境
...

✅ 自然化方式（灵活实用）：
## 会话1：需求分析
开发者需要在2024年项目周期内...

## 会话2：技术实现
在开发环境中使用React技术栈...
```

## 📊 **当前数据结构标准 (Schema 2.0)**

### **笔记块核心概念**

每个节点本质上是一个**"笔记块"**：
- **唯一标识**: 每个笔记块有唯一的ID
- **广义任务**: 每个笔记块对应一个广义任务或通用任务节点
- **标题即节点**: 笔记块的标题就是节点在UI界面上显示的标题
- **内容构成**: UI界面上的"内容框"、"标题框"、时间戳、标签、关系描述等都构成"笔记块的内容"

### **会话结构设计**

每个笔记块通过MD标准语法可以分成若干个**"会话"**：
- **会话分隔**: 使用MD标准的`## 会话标题`语法分隔不同会话
- **会话列表**: 多个会话构成"会话列表"
- **会话定位**: 点选会话列表内的会话项，可以定位到该会话
- **MD语法扩展**: 支持其他任何能够实现新功能的符合MD语法的新结构

### **统一节点数据结构**

```javascript
// 完整的笔记块数据结构定义 (Schema 2.0)
const UNIFIED_NOTE_BLOCK_STRUCTURE = {
    // 笔记块基础标识
    id: \"note_block_id\",                // 笔记块唯一标识
    title: \"笔记块标题\",                 // 笔记块标题（对应节点标题）
    topic: \"笔记块标题\",                 // jsMind兼容字段，与title保持同步
    
    // 笔记块内容（完整MD格式）
    content: `# 笔记块标题
    
## 会话1：初始想法
这里是第一个会话的内容...

## 会话2：深入思考  
这里是第二个会话的内容...

## 会话3：最终方案
这里是第三个会话的内容...

#标签1 #标签2 ^父节点ID ←依赖ID`,    // 完整MD内容，包含所有会话
    
    // 会话解析结果（从content解析得出）
    sessions: [
        {
            id: \"session_1\",
            title: \"初始想法\",
            content: \"这里是第一个会话的内容...\",
            startLine: 3,                  // 在content中的起始行
            endLine: 5                     // 在content中的结束行
        },
        {
            id: \"session_2\", 
            title: \"深入思考\",
            content: \"这里是第二个会话的内容...\",
            startLine: 7,
            endLine: 9
        }
        // ... 更多会话
    ],
    
    // 标签系统（从content解析得出）
    tags: {
        status: [\"项目\", \"进行中\"],      // 状态标签
        categories: [\"重要\"],            // 分类标签  
        technical: [\"前端\"],             // 技术标签
        custom: [],                       // 自定义标签
        future: []                        // 未来规划标签
    },
    
    // 时间信息
    time: {
        created: \"2024-01-01T00:00:00.000Z\",   // 创建时间 ISO字符串
        modified: \"2024-01-01T00:00:00.000Z\"   // 修改时间 ISO字符串
    },
    
    // 作者信息
    author: \"NodeMind\",                 // 作者名称
    
    // 关系信息（从content解析得出）
    relations: {
        parent: null,                     // 父节点ID（从^符号解析）
        children: [],                     // 子节点ID数组
        dependencies: [],                 // 依赖关系（从←符号解析）
        references: []                    // 引用关系（从→符号解析）
    },
    
    // 元数据
    metadata: {
        schemaVersion: \"2.0\",           // 数据结构版本
        source: \"nodemind\",             // 数据来源
        lastUnified: \"2024-01-01T00:00:00.000Z\",  // 最后统一时间
        sessionCount: 3,                  // 会话数量
        lastSessionModified: \"2024-01-01T00:00:00.000Z\"  // 最后会话修改时间
    }
}
```

### **脑图开发计划中的节点标准**

基于附件`脑图开发计划.json`的实际节点结构：

```javascript
// 脑图JSON中的节点结构
const JSMIND_NODE_STRUCTURE = {
    id: \"757ec59b0fb95687\",              // 节点唯一ID
    topic: \"形式节点\",                   // 节点显示内容  
    expanded: false,                      // 是否展开
    direction: \"right\",                 // 方向（可选）
    
    // 自定义数据（核心扩展）
    customData: {
        content: \"\",                    // 节点详细内容
        tags: {                          // 标签分类系统
            categories: [],              // 分类标签
            technical: [],               // 技术标签
            status: [],                  // 状态标签
            custom: [],                  // 自定义标签
            future: []                   // 未来标签
        },
        metadata: {},                    // 元数据
        author: \"用户\"                  // 作者信息
    },
    
    // 子节点（递归结构）
    children: [
        // 子节点使用相同结构
    ]
}
```

## 🚀 **万能数据架构 (第三次重构)**

### **统一数据模型设计**

```javascript
// 万物皆任务的统一笔记块结构
const UNIVERSAL_NOTE_BLOCK = {
    // 基础标识
    id: '',                    // 唯一标识
    type: '',                  // 任务类型：task|note|template|tag|team|project|user|role
    title: '',                 // 显示标题
    
    // MD内容（核心数据载体）
    content: '',               // 完整MD格式内容，包含所有会话和标记
    
    // 会话结构（从content解析得出）
    sessions: [],              // 会话列表，支持会话定位和导航
    
    // 关系数据（从content的符号标记解析得出）
    relations: {
        parent: '',            // 父节点ID（^符号）
        children: [],          // 子节点ID列表
        dependencies: [],      // 依赖节点ID列表（←符号）
        references: [],        // 引用节点ID列表（→符号）
        associations: []       // 关联节点ID列表（↔符号）
    },
    
    // 标签数据（从content的#标签解析得出）
    tags: {
        status: [],           // 状态标签
        categories: [],       // 分类标签
        technical: [],        // 技术标签
        custom: [],          // 自定义标签
        future: []           // 未来规划标签
    },
    
    // 元数据
    metadata: {
        schemaVersion: '2.0', // 数据结构版本
        taskType: '',         // 基于六要素方法论推断的任务本质类型
        createdAt: '',        // 创建时间
        modifiedAt: ''        // 修改时间
    }
}
```

### **三层智能标记架构**

```
第一层：隐性解析
├── 从MD内容智能推断节点类型和特征
├── 自动识别关系信息
└── 基于六要素方法论理解数据本质

第二层：显性标记  
├── 辅助标签系统(#任务 #高优先级)
├── 关系符号(^父节点 ←依赖 →引用)
├── 会话分隔符(## 会话标题)
└── 其他符合MD语法的功能性结构

第三层：智能解读
├── 综合判断最终数据结构
├── 处理冲突和优先级
└── 生成统一输出格式
```

## 📝 **MD格式规范**

### **基础笔记块MD模板**

```markdown
# 笔记块标题

## 会话1：初始想法
这里记录最初的想法和需求...

## 会话2：详细分析
深入分析相关的技术细节和实现方案...

## 会话3：最终结论
总结最终的解决方案和行动计划...

## 相关信息
- 关键信息点1
- 关键信息点2  
- 关键信息点3

^父节点ID ←依赖节点ID →引用节点ID #标签1 #标签2 #状态标签
```

### **会话结构说明**

- **会话分隔**: 使用`## 会话标题`分隔不同的思考和工作阶段
- **会话定位**: 点击会话列表可以跳转到对应的`##`标题位置
- **灵活组织**: 会话数量和内容完全根据实际需要灵活组织
- **MD兼容**: 完全符合标准MD语法，便于各种MD工具处理

### **不同类型任务的MD格式**

#### **1. 标签类任务**
```markdown
# 前端开发标签

## 会话1：标签定义
这是一个用于标注前端开发相关内容的技术标签。

## 会话2：使用场景
适用于所有与前端开发相关的任务、笔记和项目节点。

## 标签属性
- 颜色: #3498db
- 分类: 技术类
- 使用频率: 高
- 相关技术: React, Vue, JavaScript

#标签 #技术类 #前端
```

#### **2. 模板类任务**
```markdown
# React组件生成模板

## 会话1：模板说明
这是一个用于快速生成标准化React组件的提示词模板。

## 会话2：使用方法
将此模板提供给AI助手，即可生成符合项目规范的React组件代码。

## 会话3：模板内容
```jsx
// 基础函数组件模板
import React from 'react';
import './{{ComponentName}}.css';

const {{ComponentName}} = ({ ...props }) => {
  return (
    <div className="{{component-name}}">
      {/* 组件内容 */}
    </div>
  );
};

export default {{ComponentName}};
```

#模板 #代码生成 #React
```

#### **3. 项目类任务**
```markdown
# NodeMind脑图系统

## 会话1：项目背景
构建一个智能脑图管理系统，支持MD格式的笔记块管理和万能数据架构。

## 会话2：技术架构
- 前端：React + jsMind
- 数据：统一笔记块结构
- 特色：万物皆任务的设计理念

## 会话3：开发进展
- 项目状态：进行中
- 完成度：75%
- 当前阶段：第三次重构实施

## 主要功能
- 智能脑图编辑
- 标签系统管理  
- MD格式支持
- 会话结构管理
- 关系符号解析

#项目 #进行中 #脑图系统
```

#### **4. 权限类任务**
```markdown
# 用户张三

## 会话1：用户基本信息
- 用户名: zhangsan
- 邮箱: zhang@company.com  
- 角色: 开发者
- 入职时间: 2024-01-15

## 会话2：权限配置
开发者角色拥有以下权限：
- 代码读取: #read:code
- 代码编写: #write:code
- 测试部署: #deploy:test

## 会话3：工作记录
记录日常工作内容和权限使用情况...

^开发团队节点ID #用户 #权限管理 #开发者
```

## 🏷️ **标签系统规范**

### **标签分类体系**

```javascript
const TAG_CATEGORIES = {
    // 状态类标签
    status: [\"项目\", \"完成\", \"进行中\", \"计划\", \"暂停\", \"取消\"],
    
    // 分类标签  
    categories: [\"重要\", \"紧急\", \"日常\", \"临时\", \"长期\"],
    
    // 技术标签
    technical: [\"前端\", \"后端\", \"数据库\", \"AI\", \"设计\", \"测试\"],
    
    // 自定义标签
    custom: [\"个人\", \"团队\", \"客户\", \"内部\"],
    
    // 未来规划标签
    future: [\"待定\", \"考虑中\", \"长远计划\"]
}
```

### **标签染色规则**

```javascript
const COLORING_RULES = {
    status: {
        '项目': { backgroundColor: '#e3f2fd', color: '#000', fontWeight: 'bold', priority: 10 },
        '完成': { backgroundColor: '#e8f5e8', color: '#000', fontWeight: 'normal', priority: 9 },
        '进行中': { backgroundColor: '#ffebee', color: '#000', fontWeight: 'normal', priority: 8 },
        '计划': { backgroundColor: '#fff3e0', color: '#000', fontWeight: 'normal', priority: 7 }
    },
    categories: {
        '重要': { backgroundColor: '#fffde7', color: '#333', fontWeight: 'bold', priority: 6 },
        '紧急': { backgroundColor: '#fce4ec', color: '#333', fontWeight: 'bold', priority: 6 }
    }
}
```

## 🔗 **关系符号系统**

### **关系类型定义**

```javascript
const RELATIONSHIP_SYMBOLS = {
    // 父子关系
    parent: \"^\",           // ^父节点ID - 设置父子关系
    
    // 依赖关系
    dependency: \"←\",       // ←依赖ID - 依赖关系（紫色虚线）
    
    // 引用关系  
    reference: \"→\",        // →引用ID - 引用关系（橙色虚线）
    
    // 双向关联
    association: \"↔\",      // ↔关联ID - 关联关系
    
    // 冲突关系
    conflict: \"✗\",         // ✗冲突ID - 冲突关系
    
    // 阻塞关系
    blocking: \"⊗\"          // ⊗阻塞ID - 阻塞关系
}
```

### **关系使用示例**

```markdown
# 前端开发任务

**谁:** 前端团队
**时间:** 本周内
**地点:** 开发环境
**用什么:** React技术栈
**给谁:** 产品用户
**干什么:** 实现用户界面功能

**依赖关系:**
- 需要完成: ←UI设计任务ID
- 需要等待: ←后端API接口ID

**引用关系:**  
- 参考文档: →技术规范文档ID
- 设计稿: →UI设计稿ID

^项目主任务ID #前端 #进行中
```

## 📱 **节点添加模板**

### **基础节点模板**
```
编号：{#N新编号}
标题：节点标题
时间：2025-01-17 | 2025-01-17
作者：作者名

节点内容描述...

主要功能：
- 功能点1
- 功能点2
- 功能点3

---
【标记族】
分类标签：@分类.子分类.具体标签
技术标签：@技术.语言.框架
状态标签：@状态
```

### **子节点模板（有父节点）**
```
编号：{#N新编号}
标题：子节点标题
时间：2025-01-17 | 2025-01-17
作者：作者名

子节点内容描述...

---
【标记族】
父子关系：^父节点ID
分类标签：@分类.子分类
状态标签：@状态
```

### **有依赖关系的节点模板**
```
编号：{#N新编号}
标题：依赖节点标题
时间：2025-01-17 | 2025-01-17
作者：作者名

依赖节点内容描述...

---
【标记族】
父子关系：^父节点ID
依赖关系：←依赖的节点ID1 ←依赖的节点ID2
引用关系：→引用的节点ID1
分类标签：@分类.子分类
状态标签：@状态
```

## 💻 **API和数据操作规范**

### **数据验证标准**

```javascript
// 验证节点数据结构是否符合Schema 2.0
function validateNodeStructure(node) {
    const requiredFields = ['id', 'title', 'content', 'tags', 'time', 'author', 'relations', 'metadata'];
    const tagCategories = ['status', 'categories', 'technical', 'custom', 'future'];
    
    // 验证必需字段
    for (const field of requiredFields) {
        if (!(field in node)) {
            return { valid: false, error: `Missing required field: ${field}` };
        }
    }
    
    // 验证标签结构
    for (const category of tagCategories) {
        if (!(category in node.tags) || !Array.isArray(node.tags[category])) {
            return { valid: false, error: `Invalid tag category: ${category}` };
        }
    }
    
    // 验证时间格式
    if (!isValidISOString(node.time.created) || !isValidISOString(node.time.modified)) {
        return { valid: false, error: 'Invalid time format' };
    }
    
    return { valid: true };
}
```

### **数据迁移和统一**

```javascript
// 将旧格式数据迁移到Schema 2.0
function migrateToSchema2(oldNode) {
    return {
        // 基础字段映射
        id: oldNode.id || generateId(),
        title: oldNode.title || oldNode.topic || '',
        topic: oldNode.title || oldNode.topic || '',
        content: oldNode.content || '',
        
        // 标签系统统一
        tags: {
            status: extractStatusTags(oldNode),
            categories: extractCategoryTags(oldNode),
            technical: extractTechnicalTags(oldNode),
            custom: extractCustomTags(oldNode),
            future: []
        },
        
        // 时间信息
        time: {
            created: oldNode.created || new Date().toISOString(),
            modified: oldNode.modified || new Date().toISOString()
        },
        
        // 其他字段
        author: oldNode.author || 'NodeMind',
        relations: normalizeRelations(oldNode.relations || {}),
        sessions: oldNode.sessions || [],
        metadata: {
            schemaVersion: '2.0',
            source: 'migration',
            lastUnified: new Date().toISOString()
        }
    };
}
```

## 🔄 **数据同步和一致性**

### **双向同步机制**

```javascript
// MD内容 ↔ 结构化数据的双向同步
class MDContentSync {
    // 从MD内容解析出结构化数据
    parseFromMD(mdContent) {
        const sixElements = this.extractSixElements(mdContent);
        const tags = this.extractTags(mdContent);
        const relations = this.extractRelations(mdContent);
        
        return {
            sixElements,
            tags,
            relations,
            content: mdContent
        };
    }
    
    // 从结构化数据生成MD内容
    generateMD(nodeData) {
        const template = `# ${nodeData.title}

**谁:** ${nodeData.sixElements.who}
**时间:** ${nodeData.sixElements.when}
**地点:** ${nodeData.sixElements.where}
**用什么:** ${nodeData.sixElements.what}
**给谁:** ${nodeData.sixElements.whom}
**干什么:** ${nodeData.sixElements.why}

${nodeData.content}

${this.formatTags(nodeData.tags)}`;
        
        return template;
    }
}
```

## 📈 **性能优化规范**

### **数据存储优化**

```javascript
// 使用索引优化数据查询
const DATA_INDEXES = {
    // 按标签索引
    tagIndex: new Map(),      // tag -> Set of nodeIds
    
    // 按类型索引  
    typeIndex: new Map(),     // type -> Set of nodeIds
    
    // 按关系索引
    relationIndex: new Map(), // nodeId -> Set of related nodeIds
    
    // 按时间索引
    timeIndex: new Map()      // dateRange -> Set of nodeIds
};

// 批量操作优化
class BatchOperations {
    constructor() {
        this.pendingUpdates = new Map();
        this.batchTimer = null;
    }
    
    queueUpdate(nodeId, updateData) {
        this.pendingUpdates.set(nodeId, updateData);
        this.scheduleBatch();
    }
    
    scheduleBatch() {
        if (this.batchTimer) clearTimeout(this.batchTimer);
        this.batchTimer = setTimeout(() => this.executeBatch(), 100);
    }
    
    executeBatch() {
        // 批量执行所有待更新操作
        for (const [nodeId, updateData] of this.pendingUpdates) {
            this.applyUpdate(nodeId, updateData);
        }
        this.pendingUpdates.clear();
    }
}
```

## 🛡️ **错误处理和调试**

### **数据完整性检查**

```javascript
// 数据完整性诊断
function diagnoseDataIntegrity() {
    const issues = [];
    
    // 检查孤立节点
    const orphanNodes = findOrphanNodes();
    if (orphanNodes.length > 0) {
        issues.push({ type: 'orphan_nodes', count: orphanNodes.length, nodes: orphanNodes });
    }
    
    // 检查循环依赖
    const circularDeps = findCircularDependencies();
    if (circularDeps.length > 0) {
        issues.push({ type: 'circular_dependencies', cycles: circularDeps });
    }
    
    // 检查数据结构版本
    const versionMismatches = findVersionMismatches();
    if (versionMismatches.length > 0) {
        issues.push({ type: 'version_mismatch', nodes: versionMismatches });
    }
    
    return {
        healthy: issues.length === 0,
        issues: issues,
        recommendations: generateRecommendations(issues)
    };
}
```

## 📋 **实施检查清单**

### **数据结构合规性检查**

- ✅ 所有节点都包含Schema 2.0必需字段
- ✅ 标签系统按照五大分类组织
- ✅ 时间字段使用ISO 8601格式
- ✅ 关系数据结构正确且无循环依赖
- ✅ MD内容格式符合六要素模板
- ✅ 元数据包含正确的版本信息

### **功能完整性检查**

- ✅ 节点CRUD操作正常
- ✅ 标签染色功能正确工作
- ✅ 关系符号正确解析和显示
- ✅ MD格式双向同步正常
- ✅ 数据统一和迁移功能正常
- ✅ 性能指标在可接受范围内

### **兼容性检查**

- ✅ 向下兼容旧数据格式
- ✅ UI界面功能完全正常
- ✅ 导入导出功能正常
- ✅ 第三方集成不受影响

## 🎯 **未来发展方向**

### **万能数据架构扩展**

1. **权限系统集成**
   - 用户管理 → 用户类任务
   - 角色管理 → 角色类任务  
   - 权限控制 → 权限类任务

2. **游戏化扩展**
   - 成就系统 → 成就类任务
   - 等级系统 → 等级类任务
   - 奖励机制 → 奖励类任务

3. **AI增强**
   - 智能分类 → AI基于MD内容自动分类
   - 智能推荐 → AI推荐相关节点和标签
   - 智能生成 → AI基于模板生成新节点

## 📚 **参考文档**

- [数据结构统一方案使用说明.md](./数据结构统一方案使用说明.md)
- [MD格式着色功能使用说明.md](./MD格式着色功能使用说明.md)
- [NodeMind使用指南.md](./NodeMind使用指南.md)
- [第三次重构实施方案.md](./md-jsmind-第三次重构实施方案.md)
- [全面评估第三次重构.md](./md-jsmind-全面评估第三次重构.md)
- [节点模板.md](./节点模板.md)
- [脑图开发计划.json](../脑图开发计划.json)

---

🎉 **本文档为NodeMind项目的节点数据标准提供了完整、统一、可执行的规范，支持当前功能并为未来扩展奠定坚实基础！** 