# MD底座数据结构规范 v1.1（增强版）

## 📋 概述

**版本**: v1.1 增强版  
**基于**: v1.0 MD底座规范  
**设计哲学**: "万物皆任务"/"万物皆笔记"  
**核心特性**: 统一的节点树结构 + metadata无限扩展  
**日期**: 2025-10-02

---

## 🏗️ 核心数据结构（保持v1.0）

```javascript
{
  "id": "node-xxx",
  "topic": "节点标题",
  "children": [...],  // 子节点
  "data": {
    "content": "节点内容",
    ... // 任意业务字段
  },
  "meta": {
    "mind_id": "项目ID",
    "itemType": "节点类型",  // ⭐ 关键
    ... // 任意元数据
  }
}
```

---

## 📐 metadata标准字段建议（v1.1新增）

```javascript
meta: {
  // 基础字段（v1.0已有）
  mind_id: string,
  createdAt: number,
  updatedAt: number,
  accessCount: number,
  
  // 类型标识（v1.1核心）⭐
  itemType: string,  // 节点类型（必需）
  
  // 状态管理
  status: string,  // 待办/进行中/完成
  priority: string,  // 高/中/低/紧急
  progress: number,  // 0-100
  
  // 人员
  createdBy: string,
  assignee: string,
  
  // 时间
  dueDate: number,
  completedAt: number,
  
  // 分类
  tags: string[],
  category: string,
  
  // 工作流相关（v1.1）
  workflowId: string,
  nodeType: string,  // human/agent/team
  instanceId: string,
  
  // 知识回流相关（v1.1）⭐
  feedbackSource: string,  // form/swimlane/detail
  extractedFrom: string,
  entityType: string,  // 问题/方案/组件/经验
  confidence: number,  // 0-1
  
  // 关系
  parentId: string,
  relatedIds: string[],
  dependencies: string[],
  
  // 其他
  ... // 任意扩展
}
```

---

## 📊 itemType参考值列表（v1.1新增）

```javascript
// 基础类型
'mindmap' - 脑图节点
'note' - 笔记
'memo' - 备忘

// 任务管理
'project' - 项目
'task' - 任务
'goal' - 目标
'plan' - 计划
'idea' - 想法
'milestone' - 里程碑

// 工作流 ⭐
'workflow' - 工作流模板
'workflow_instance' - 工作流实例
'workflow_node' - 工作流节点
'form_submission' - 表单提交

// 知识回流 ⭐
'extracted_entity' - 提取的实体
'extracted_relation' - 提取的关系
'decision_record' - 决策记录
'experience' - 经验总结
'property_change' - 属性变更记录

// 问题解决
'problem' - 问题
'solution' - 解决方案
'bug' - Bug

// 组织
'team' - 团队
'person' - 人员

// ... 任意扩展
```

---

## 🎯 核心场景示例

### 1. 任务/项目（"万物皆任务"）

```javascript
{
  "id": "project_001",
  "topic": "项目管理系统开发",
  "data": {
    "content": "开发基于知识图谱的项目管理系统",
    "budget": 100000
  },
  "meta": {
    "itemType": "project",
    "status": "进行中",
    "assignee": "张三",
    "tags": ["核心项目"]
  },
  "children": [
    {
      "id": "task_001",
      "topic": "需求分析",
      "meta": {
        "itemType": "task",
        "status": "已完成",
        "assignee": "李四"
      }
    }
  ]
}
```

### 2. 工作流模板 ⭐

```javascript
{
  "id": "workflow_001",
  "topic": "项目审批流程",
  "meta": {
    "itemType": "workflow",
    "category": "项目管理"
  },
  "children": [
    {
      "id": "node_start",
      "topic": "填写项目信息",
      "data": {
        "formSchema": {
          "fields": [
            {"name": "projectName", "type": "text"},
            {"name": "budget", "type": "number"}
          ]
        }
      },
      "meta": {
        "itemType": "workflow_node",
        "nodeType": "human"
      }
    },
    {
      "id": "node_analyze",
      "topic": "智能分析",
      "data": {
        "agentId": "ProjectAnalyzerAgent"
      },
      "meta": {
        "itemType": "workflow_node",
        "nodeType": "agent"
      }
    }
  ]
}
```

### 3. 表单提交 ⭐⭐⭐ 知识回流核心

```javascript
{
  "id": "form_001",
  "topic": "任务完成反馈",
  "data": {
    "content": `
遇到的问题：Session过期漏洞
解决方案：Token刷新机制，参考ProjectB
经验总结：优先检查Token生命周期
    `,
    "fields": {
      "taskName": "修复登录Bug",
      "workHours": 8
    }
  },
  "meta": {
    "itemType": "form_submission",
    "submittedBy": "张三",
    "workflowInstanceId": "instance_001"
  },
  "children": [
    // ⭐ 提取的知识作为子节点
    {
      "id": "extracted_001",
      "topic": "Session过期漏洞",
      "meta": {
        "itemType": "extracted_entity",
        "entityType": "problem",
        "confidence": 0.95
      }
    },
    {
      "id": "extracted_002",
      "topic": "Token刷新机制",
      "data": {
        "referenceProject": "ProjectB"
      },
      "meta": {
        "itemType": "extracted_entity",
        "entityType": "solution",
        "confidence": 0.92
      },
      "children": [
        {
          "id": "relation_001",
          "topic": "解决关系",
          "data": {
            "relationType": "solves",
            "from": "Token刷新机制",
            "to": "Session过期漏洞"
          },
          "meta": {
            "itemType": "extracted_relation"
          }
        }
      ]
    }
  ]
}
```

### 4. 属性变更（泳道拖拽）⭐

```javascript
{
  "id": "change_001",
  "topic": "任务状态变更",
  "data": {
    "targetId": "task_001",
    "propertyName": "status",
    "oldValue": "待办",
    "newValue": "进行中"
  },
  "meta": {
    "itemType": "property_change",
    "changedBy": "张三",
    "feedbackSource": "swimlane_drag"
  }
}
```

---

## 🔄 知识回流闭环示例

```javascript
// 1. 初始项目
{
  "topic": "项目A",
  "meta": {"itemType": "project"},
  "children": [
    {"topic": "任务1", "meta": {"itemType": "task", "status": "待办"}}
  ]
}

// 2. 泳道拖拽 → 属性变更
{
  "topic": "状态变更",
  "meta": {"itemType": "property_change"},
  "data": {"oldValue": "待办", "newValue": "进行中"}
}

// 3. 表单提交 → 知识提取
{
  "topic": "任务完成反馈",
  "meta": {"itemType": "form_submission"},
  "children": [
    {"topic": "遇到的问题", "meta": {"itemType": "extracted_entity"}},
    {"topic": "解决方案", "meta": {"itemType": "extracted_entity"}}
  ]
}

// 4. 知识回流 → 项目增强
{
  "topic": "项目A",
  "children": [
    {
      "topic": "任务1",
      "meta": {"status": "已完成"},  // 状态已更新
      "children": [
        {"topic": "遇到的问题"},  // 新增知识
        {"topic": "解决方案"}  // 新增知识
      ]
    }
  ]
}
```

---

## 🎯 核心优势

1. **统一性** - 一种数据结构统治一切
2. **灵活性** - metadata无限扩展
3. **简洁性** - 开发者只需理解节点树
4. **契合哲学** - 完美体现"万物皆任务/笔记"

---

**程序员**
