// Clean Import Script - ASCII Only
// Copy and paste this into Neo4j Browser

// Step 1: Clear all data
MATCH (n) DETACH DELETE n;

// Step 2: Create Projects
CREATE (p1:Project {id: 'project1', name: 'Project Management System', type: 'project', description: 'Core project based on Neo4j and D3.js', status: 'active'});
CREATE (p2:Project {id: 'project2', name: 'AI Assistant', type: 'project', description: 'AI assistant with DeepSeek integration', status: 'planning'});

// Step 3: Create Tasks
CREATE (t1:Task {id: 'task1', name: 'Requirements Analysis', type: 'task', description: 'Phase 1 - Collect and analyze requirements', status: 'completed', priority: 'high'});
CREATE (t2:Task {id: 'task2', name: 'Architecture Design', type: 'task', description: 'System architecture design', status: 'completed', priority: 'high'});
CREATE (t3:Task {id: 'task3', name: 'Development', type: 'task', description: 'Frontend and backend development', status: 'in_progress', priority: 'high'});
CREATE (t4:Task {id: 'task4', name: 'Testing', type: 'task', description: 'System testing and validation', status: 'pending', priority: 'medium'});
CREATE (t5:Task {id: 'task5', name: 'Deployment', type: 'task', description: 'Production deployment', status: 'pending', priority: 'medium'});

// Step 4: Create People
CREATE (person1:Person {id: 'person1', name: 'Zhang San', type: 'person', description: 'Project Manager', role: 'Project Manager'});
CREATE (person2:Person {id: 'person2', name: 'Li Si', type: 'person', description: 'Architect', role: 'Architect'});
CREATE (person3:Person {id: 'person3', name: 'Wang Wu', type: 'person', description: 'Developer', role: 'Developer'});
CREATE (person4:Person {id: 'person4', name: 'Zhao Liu', type: 'person', description: 'QA Engineer', role: 'QA Engineer'});

// Step 5: Create Resources
CREATE (r1:Resource {id: 'resource1', name: 'Dev Server', type: 'resource', description: 'Cloud server - Aliyun ECS', resourceType: 'server'});
CREATE (r2:Resource {id: 'resource2', name: 'Neo4j Database', type: 'resource', description: 'Graph database instance', resourceType: 'database'});

// Step 6: Create Milestones
CREATE (m1:Milestone {id: 'milestone1', name: 'MVP Release', type: 'milestone', description: 'Minimum Viable Product', status: 'in_progress'});
CREATE (m2:Milestone {id: 'milestone2', name: 'V1.0 Release', type: 'milestone', description: 'Official release', status: 'pending'});

// Step 7: Create Relationships - Project contains Tasks
MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task1'}) CREATE (p)-[:CONTAINS {label: 'contains', weight: 2}]->(t);
MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task2'}) CREATE (p)-[:CONTAINS {label: 'contains', weight: 2}]->(t);
MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task3'}) CREATE (p)-[:CONTAINS {label: 'contains', weight: 2}]->(t);
MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task4'}) CREATE (p)-[:CONTAINS {label: 'contains', weight: 2}]->(t);
MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task5'}) CREATE (p)-[:CONTAINS {label: 'contains', weight: 2}]->(t);

// Step 8: Create Relationships - Task dependencies
MATCH (t1:Task {id: 'task1'}), (t2:Task {id: 'task2'}) CREATE (t1)-[:PRECEDES {label: 'precedes', weight: 1}]->(t2);
MATCH (t2:Task {id: 'task2'}), (t3:Task {id: 'task3'}) CREATE (t2)-[:PRECEDES {label: 'precedes', weight: 1}]->(t3);
MATCH (t3:Task {id: 'task3'}), (t4:Task {id: 'task4'}) CREATE (t3)-[:PRECEDES {label: 'precedes', weight: 1}]->(t4);
MATCH (t4:Task {id: 'task4'}), (t5:Task {id: 'task5'}) CREATE (t4)-[:PRECEDES {label: 'precedes', weight: 1}]->(t5);

// Step 9: Create Relationships - People manage/responsible
MATCH (person:Person {id: 'person1'}), (p:Project {id: 'project1'}) CREATE (person)-[:MANAGES {label: 'manages', weight: 3}]->(p);
MATCH (person:Person {id: 'person2'}), (t:Task {id: 'task2'}) CREATE (person)-[:RESPONSIBLE {label: 'responsible', weight: 2}]->(t);
MATCH (person:Person {id: 'person3'}), (t:Task {id: 'task3'}) CREATE (person)-[:RESPONSIBLE {label: 'responsible', weight: 2}]->(t);
MATCH (person:Person {id: 'person4'}), (t:Task {id: 'task4'}) CREATE (person)-[:RESPONSIBLE {label: 'responsible', weight: 2}]->(t);

// Step 10: Create Relationships - Tasks use Resources
MATCH (t:Task {id: 'task3'}), (r:Resource {id: 'resource1'}) CREATE (t)-[:USES {label: 'uses', weight: 1}]->(r);
MATCH (t:Task {id: 'task3'}), (r:Resource {id: 'resource2'}) CREATE (t)-[:USES {label: 'uses', weight: 1}]->(r);

// Step 11: Create Relationships - Tasks lead to Milestones
MATCH (t:Task {id: 'task3'}), (m:Milestone {id: 'milestone1'}) CREATE (t)-[:LEADS_TO {label: 'leads to', weight: 2}]->(m);
MATCH (t:Task {id: 'task5'}), (m:Milestone {id: 'milestone2'}) CREATE (t)-[:LEADS_TO {label: 'leads to', weight: 2}]->(m);

// Step 12: Create Relationships - People collaborate
MATCH (p1:Person {id: 'person2'}), (p2:Person {id: 'person3'}) CREATE (p1)-[:COLLABORATES_WITH {label: 'collaborates', weight: 1}]->(p2);
MATCH (p1:Person {id: 'person3'}), (p2:Person {id: 'person4'}) CREATE (p1)-[:COLLABORATES_WITH {label: 'collaborates', weight: 1}]->(p2);

// Step 13: Verify - Show statistics
MATCH (n) RETURN labels(n) as NodeType, count(n) as Count ORDER BY Count DESC;
