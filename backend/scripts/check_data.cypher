// Neo4j数据检查脚本
// 程序员 - 2025-10-05

// ========================================
// 1. 统计所有节点数量（按标签分组）
// ========================================
MATCH (n)
RETURN labels(n) as nodeType, count(n) as count
ORDER BY count DESC;

// ========================================
// 2. 查看前20个节点的详细信息
// ========================================
MATCH (n)
RETURN n.id, n.name, n.label, n.topic, labels(n), properties(n)
LIMIT 20;

// ========================================
// 3. 统计所有关系数量（按类型分组）
// ========================================
MATCH ()-[r]->()
RETURN type(r) as relationType, count(r) as count
ORDER BY count DESC;

// ========================================
// 4. 查看完整的图谱结构（小样本）
// ========================================
MATCH (n)-[r]->(m)
RETURN n, r, m
LIMIT 50;

// ========================================
// 5. 检查是否有Task节点
// ========================================
MATCH (t:Task)
RETURN count(t) as taskCount;

// ========================================
// 6. 检查是否有Project节点
// ========================================
MATCH (p:Project)
RETURN count(p) as projectCount;

// ========================================
// 7. 查看所有节点的属性键
// ========================================
MATCH (n)
WITH DISTINCT keys(n) as nodeKeys
UNWIND nodeKeys as key
RETURN DISTINCT key
ORDER BY key;
