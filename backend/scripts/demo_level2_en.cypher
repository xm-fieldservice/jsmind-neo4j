// Neo4j Deep Relationship Mining Demo - Level 2: Concept Association
// Programmer - 2025-10-05
// 
// Goal: Mine cross-branch concept associations to demonstrate Neo4j graph analysis capabilities

// ========================================
// Step 1: Check current data (only parent-child relationships)
// ========================================
MATCH (n)-[r:HAS_CHILD]->(m)
RETURN count(r) as originalRelationshipCount;

// ========================================
// Step 2: Mine "data" related concept associations
// ========================================
MATCH (n:Task)
WHERE n.topic CONTAINS 'data' OR n.topic CONTAINS '数据' 
   OR n.content CONTAINS 'data' OR n.content CONTAINS '数据'
WITH collect(n) as dataNodes
UNWIND dataNodes as n1
UNWIND dataNodes as n2
WHERE id(n1) < id(n2)
MERGE (n1)-[r:RELATED_CONCEPT {
  type: 'data_management', 
  strength: 0.8,
  reason: 'Both mention data concepts'
}]-(n2)
RETURN count(r) as newDataRelationships;

// ========================================
// Step 3: Mine "AI" related concept associations
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
  reason: 'Both mention AI/intelligent concepts'
}]-(n2)
RETURN count(r) as newAIRelationships;

// ========================================
// Step 4: Mine "mindmap" related concept associations
// ========================================
MATCH (n:Task)
WHERE n.topic CONTAINS 'mindmap' OR n.topic CONTAINS '脑图' 
   OR n.content CONTAINS 'mindmap' OR n.content CONTAINS '脑图'
WITH collect(n) as mindmapNodes
UNWIND mindmapNodes as n1
UNWIND mindmapNodes as n2
WHERE id(n1) < id(n2)
MERGE (n1)-[r:RELATED_CONCEPT {
  type: 'mindmap_feature', 
  strength: 0.85,
  reason: 'Both mention mindmap features'
}]-(n2)
RETURN count(r) as newMindmapRelationships;

// ========================================
// Step 5: Mine "project management" related concept associations
// ========================================
MATCH (n:Task)
WHERE n.topic CONTAINS 'project' OR n.topic CONTAINS '项目'
   OR n.topic CONTAINS 'management' OR n.topic CONTAINS '管理'
   OR n.topic CONTAINS 'task' OR n.topic CONTAINS '任务'
WITH collect(n) as pmNodes
UNWIND pmNodes as n1
UNWIND pmNodes as n2
WHERE id(n1) < id(n2)
MERGE (n1)-[r:RELATED_CONCEPT {
  type: 'project_management', 
  strength: 0.75,
  reason: 'Both mention project management concepts'
}]-(n2)
RETURN count(r) as newPMRelationships;

// ========================================
// Step 6: Statistics of mining results
// ========================================
MATCH ()-[r:RELATED_CONCEPT]->()
WITH r.type as conceptType, count(r) as count
RETURN conceptType, count
ORDER BY count DESC;

// ========================================
// Step 7: View overall relationship growth
// ========================================
MATCH ()-[r]->()
WITH type(r) as relType, count(r) as count
RETURN relType, count
ORDER BY count DESC;

// ========================================
// Step 8: Visualization comparison - original relationships only
// ========================================
// MATCH (n)-[r:HAS_CHILD]->(m)
// RETURN n, r, m
// LIMIT 50;

// ========================================
// Step 9: Visualization comparison - all relationships
// ========================================
// MATCH (n)-[r]->(m)
// RETURN n, r, m
// LIMIT 100;

// ========================================
// Step 10: Visualization comparison - mined relationships only
// ========================================
// MATCH (n)-[r:RELATED_CONCEPT]-(m)
// RETURN n, r, m
// LIMIT 50;

// ========================================
// Step 11: Find core concept nodes
// ========================================
MATCH (n:Task)-[r:RELATED_CONCEPT]-()
WITH n, count(r) as connections
WHERE connections > 2
RETURN n.topic as coreConcept, connections
ORDER BY connections DESC
LIMIT 10;

// ========================================
// Step 12: Cleanup (if need to re-run experiment)
// ========================================
// MATCH ()-[r:RELATED_CONCEPT]->()
// DELETE r;
