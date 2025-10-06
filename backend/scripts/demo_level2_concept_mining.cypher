// Neo4j深层次关系挖掘演示 - Level 2: 概念关联
// 程序员 - 2025-10-05
// 
// 目标：挖掘跨分支的概念关联，展示Neo4j的图分析能力

// ========================================
// 步骤1：查看当前数据（只有父子关系）
// ========================================
MATCH (n)-[r:HAS_CHILD]->(m)
RETURN count(r) as 原始关系数量;

// ========================================
// 步骤2：挖掘"数据"相关的概念关联
// ========================================
MATCH (n:Task)
WHERE n.topic CONTAINS '数据' OR n.content CONTAINS '数据'
WITH collect(n) as dataNodes
UNWIND dataNodes as n1
UNWIND dataNodes as n2
WHERE id(n1) < id(n2)
MERGE (n1)-[r:RELATED_CONCEPT {
  type: 'data_management', 
  strength: 0.8,
  discoveredAt: datetime(),
  reason: 'Both mention data concepts'
}]-(n2)
RETURN count(r) as 新增数据关联数量;

// ========================================
// 步骤3：挖掘"AI"相关的概念关联
// ========================================
MATCH (n:Task)
WHERE n.topic CONTAINS 'AI' 
   OR n.topic CONTAINS '智能' 
   OR n.content CONTAINS 'AI'
   OR n.content CONTAINS '智能'
WITH collect(n) as aiNodes
UNWIND aiNodes as n1
UNWIND aiNodes as n2
WHERE id(n1) < id(n2)
MERGE (n1)-[r:RELATED_CONCEPT {
  type: 'ai_related', 
  strength: 0.9,
  discoveredAt: datetime(),
  reason: 'Both mention AI/intelligent concepts'
}]-(n2)
RETURN count(r) as 新增AI关联数量;

// ========================================
// 步骤4：挖掘"脑图"相关的概念关联
// ========================================
MATCH (n:Task)
WHERE n.topic CONTAINS '脑图' OR n.content CONTAINS '脑图'
WITH collect(n) as mindmapNodes
UNWIND mindmapNodes as n1
UNWIND mindmapNodes as n2
WHERE id(n1) < id(n2)
MERGE (n1)-[r:RELATED_CONCEPT {
  type: 'mindmap_feature', 
  strength: 0.85,
  discoveredAt: datetime(),
  reason: 'Both mention mindmap features'
}]-(n2)
RETURN count(r) as 新增脑图关联数量;

// ========================================
// 步骤5：挖掘"项目管理"相关的概念关联
// ========================================
MATCH (n:Task)
WHERE n.topic CONTAINS '项目' 
   OR n.topic CONTAINS '管理'
   OR n.topic CONTAINS '任务'
WITH collect(n) as pmNodes
UNWIND pmNodes as n1
UNWIND pmNodes as n2
WHERE id(n1) < id(n2)
MERGE (n1)-[r:RELATED_CONCEPT {
  type: 'project_management', 
  strength: 0.75,
  discoveredAt: datetime(),
  reason: 'Both mention project management concepts'
}]-(n2)
RETURN count(r) as 新增项目管理关联数量;

// ========================================
// 步骤6：统计挖掘结果
// ========================================
MATCH ()-[r:RELATED_CONCEPT]->()
WITH r.type as conceptType, count(r) as count
RETURN conceptType as 概念类型, count as 关联数量
ORDER BY count DESC;

// ========================================
// 步骤7：查看总体关系增长
// ========================================
MATCH ()-[r]->()
WITH type(r) as relType, count(r) as count
RETURN relType as 关系类型, count as 数量
ORDER BY count DESC;

// ========================================
// 步骤8：可视化对比 - 只看原始关系
// ========================================
// MATCH (n)-[r:HAS_CHILD]->(m)
// RETURN n, r, m
// LIMIT 50;

// ========================================
// 步骤9：可视化对比 - 看所有关系
// ========================================
// MATCH (n)-[r]->(m)
// RETURN n, r, m
// LIMIT 100;

// ========================================
// 步骤10：可视化对比 - 只看挖掘出的关系
// ========================================
// MATCH (n)-[r:RELATED_CONCEPT]-(m)
// RETURN n, r, m
// LIMIT 50;

// ========================================
// 步骤11：找出最核心的概念节点
// ========================================
MATCH (n:Task)-[r:RELATED_CONCEPT]-()
WITH n, count(r) as connections
WHERE connections > 2
RETURN n.topic as 核心概念, connections as 关联数量
ORDER BY connections DESC
LIMIT 10;

// ========================================
// 步骤12：清理（如需重新实验）
// ========================================
// MATCH ()-[r:RELATED_CONCEPT]->()
// DELETE r;
