// 调试挖掘查询 - 找出为什么总是0结果
// 程序员 - 2025-10-05

// ========================================
// 步骤1：检查有多少Task节点
// ========================================
MATCH (n:Task)
RETURN count(n) as totalTasks;

// ========================================
// 步骤2：检查有多少节点包含"项目"
// ========================================
MATCH (n:Task)
WHERE n.topic CONTAINS '项目'
RETURN count(n) as projectNodes, collect(n.topic)[0..5] as samples;

// ========================================
// 步骤3：检查有多少节点包含"数据"
// ========================================
MATCH (n:Task)
WHERE n.topic CONTAINS '数据'
RETURN count(n) as dataNodes, collect(n.topic)[0..5] as samples;

// ========================================
// 步骤4：检查有多少节点包含"管理"
// ========================================
MATCH (n:Task)
WHERE n.topic CONTAINS '管理'
RETURN count(n) as managementNodes, collect(n.topic)[0..5] as samples;

// ========================================
// 步骤5：测试简单的关系创建
// ========================================
MATCH (n:Task)
WHERE n.topic CONTAINS '数据'
WITH collect(n) as nodes
WHERE size(nodes) >= 2
WITH nodes[0] as n1, nodes[1] as n2
MERGE (n1)-[r:TEST_RELATION]-(n2)
RETURN n1.topic, n2.topic, r;

// ========================================
// 步骤6：检查是否已有RELATED_CONCEPT关系
// ========================================
MATCH ()-[r:RELATED_CONCEPT]->()
RETURN count(r) as existingRelations;

// ========================================
// 步骤7：清理测试关系
// ========================================
// MATCH ()-[r:TEST_RELATION]->()
// DELETE r;
