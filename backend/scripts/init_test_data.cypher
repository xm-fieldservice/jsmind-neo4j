// Neo4j测试数据初始化脚本
// 程序员 - 2025-10-05

// ========================================
// 清空现有数据（可选，谨慎使用）
// ========================================
// MATCH (n) DETACH DELETE n;

// ========================================
// 创建项目节点
// ========================================
CREATE (p1:Project {
    id: 'project1',
    name: '项目管理系统',
    type: 'project',
    description: '核心项目 - 基于Neo4j和D3.js的知识图谱管理系统',
    status: 'active',
    createdAt: datetime(),
    updatedAt: datetime()
})

CREATE (p2:Project {
    id: 'project2',
    name: 'AI智能助手',
    type: 'project',
    description: '集成DeepSeek的AI助手系统',
    status: 'planning',
    createdAt: datetime(),
    updatedAt: datetime()
})

// ========================================
// 创建任务节点
// ========================================
CREATE (t1:Task {
    id: 'task1',
    name: '需求分析',
    type: 'task',
    description: '项目第一阶段 - 收集和分析用户需求',
    status: 'completed',
    priority: 'high',
    createdAt: datetime(),
    updatedAt: datetime()
})

CREATE (t2:Task {
    id: 'task2',
    name: '架构设计',
    type: 'task',
    description: '系统架构设计 - 三层架构设计',
    status: 'completed',
    priority: 'high',
    createdAt: datetime(),
    updatedAt: datetime()
})

CREATE (t3:Task {
    id: 'task3',
    name: '开发实现',
    type: 'task',
    description: '功能开发 - 前后端开发',
    status: 'in_progress',
    priority: 'high',
    createdAt: datetime(),
    updatedAt: datetime()
})

CREATE (t4:Task {
    id: 'task4',
    name: '测试验证',
    type: 'task',
    description: '系统测试和验证',
    status: 'pending',
    priority: 'medium',
    createdAt: datetime(),
    updatedAt: datetime()
})

CREATE (t5:Task {
    id: 'task5',
    name: '部署上线',
    type: 'task',
    description: '生产环境部署',
    status: 'pending',
    priority: 'medium',
    createdAt: datetime(),
    updatedAt: datetime()
})

// ========================================
// 创建人员节点
// ========================================
CREATE (person1:Person {
    id: 'person1',
    name: '张三',
    type: 'person',
    description: '项目经理',
    role: 'Project Manager',
    email: 'zhangsan@example.com',
    createdAt: datetime(),
    updatedAt: datetime()
})

CREATE (person2:Person {
    id: 'person2',
    name: '李四',
    type: 'person',
    description: '架构师',
    role: 'Architect',
    email: 'lisi@example.com',
    createdAt: datetime(),
    updatedAt: datetime()
})

CREATE (person3:Person {
    id: 'person3',
    name: '王五',
    type: 'person',
    description: '开发工程师',
    role: 'Developer',
    email: 'wangwu@example.com',
    createdAt: datetime(),
    updatedAt: datetime()
})

CREATE (person4:Person {
    id: 'person4',
    name: '赵六',
    type: 'person',
    description: '测试工程师',
    role: 'QA Engineer',
    email: 'zhaoliu@example.com',
    createdAt: datetime(),
    updatedAt: datetime()
})

// ========================================
// 创建资源节点
// ========================================
CREATE (r1:Resource {
    id: 'resource1',
    name: '开发服务器',
    type: 'resource',
    description: '云服务器 - 阿里云ECS',
    resourceType: 'server',
    status: 'active',
    createdAt: datetime(),
    updatedAt: datetime()
})

CREATE (r2:Resource {
    id: 'resource2',
    name: 'Neo4j数据库',
    type: 'resource',
    description: '图数据库实例',
    resourceType: 'database',
    status: 'active',
    createdAt: datetime(),
    updatedAt: datetime()
})

// ========================================
// 创建里程碑节点
// ========================================
CREATE (m1:Milestone {
    id: 'milestone1',
    name: 'MVP版本',
    type: 'milestone',
    description: '第一个里程碑 - 最小可行产品',
    targetDate: date('2025-11-01'),
    status: 'in_progress',
    createdAt: datetime(),
    updatedAt: datetime()
})

CREATE (m2:Milestone {
    id: 'milestone2',
    name: 'V1.0正式版',
    type: 'milestone',
    description: '正式发布版本',
    targetDate: date('2025-12-01'),
    status: 'pending',
    createdAt: datetime(),
    updatedAt: datetime()
})

// ========================================
// 创建关系：项目包含任务
// ========================================
MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task1'})
CREATE (p)-[:CONTAINS {label: '包含', weight: 2, createdAt: datetime()}]->(t)

MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task2'})
CREATE (p)-[:CONTAINS {label: '包含', weight: 2, createdAt: datetime()}]->(t)

MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task3'})
CREATE (p)-[:CONTAINS {label: '包含', weight: 2, createdAt: datetime()}]->(t)

MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task4'})
CREATE (p)-[:CONTAINS {label: '包含', weight: 2, createdAt: datetime()}]->(t)

MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task5'})
CREATE (p)-[:CONTAINS {label: '包含', weight: 2, createdAt: datetime()}]->(t)

// ========================================
// 创建关系：任务依赖关系
// ========================================
MATCH (t1:Task {id: 'task1'}), (t2:Task {id: 'task2'})
CREATE (t1)-[:PRECEDES {label: '先于', weight: 1, createdAt: datetime()}]->(t2)

MATCH (t2:Task {id: 'task2'}), (t3:Task {id: 'task3'})
CREATE (t2)-[:PRECEDES {label: '先于', weight: 1, createdAt: datetime()}]->(t3)

MATCH (t3:Task {id: 'task3'}), (t4:Task {id: 'task4'})
CREATE (t3)-[:PRECEDES {label: '先于', weight: 1, createdAt: datetime()}]->(t4)

MATCH (t4:Task {id: 'task4'}), (t5:Task {id: 'task5'})
CREATE (t4)-[:PRECEDES {label: '先于', weight: 1, createdAt: datetime()}]->(t5)

// ========================================
// 创建关系：人员管理项目
// ========================================
MATCH (person:Person {id: 'person1'}), (p:Project {id: 'project1'})
CREATE (person)-[:MANAGES {label: '管理', weight: 3, createdAt: datetime()}]->(p)

// ========================================
// 创建关系：人员负责任务
// ========================================
MATCH (person:Person {id: 'person2'}), (t:Task {id: 'task2'})
CREATE (person)-[:RESPONSIBLE {label: '负责', weight: 2, createdAt: datetime()}]->(t)

MATCH (person:Person {id: 'person3'}), (t:Task {id: 'task3'})
CREATE (person)-[:RESPONSIBLE {label: '负责', weight: 2, createdAt: datetime()}]->(t)

MATCH (person:Person {id: 'person4'}), (t:Task {id: 'task4'})
CREATE (person)-[:RESPONSIBLE {label: '负责', weight: 2, createdAt: datetime()}]->(t)

// ========================================
// 创建关系：任务使用资源
// ========================================
MATCH (t:Task {id: 'task3'}), (r:Resource {id: 'resource1'})
CREATE (t)-[:USES {label: '使用', weight: 1, createdAt: datetime()}]->(r)

MATCH (t:Task {id: 'task3'}), (r:Resource {id: 'resource2'})
CREATE (t)-[:USES {label: '使用', weight: 1, createdAt: datetime()}]->(r)

// ========================================
// 创建关系：任务通向里程碑
// ========================================
MATCH (t:Task {id: 'task3'}), (m:Milestone {id: 'milestone1'})
CREATE (t)-[:LEADS_TO {label: '通向', weight: 2, createdAt: datetime()}]->(m)

MATCH (t:Task {id: 'task5'}), (m:Milestone {id: 'milestone2'})
CREATE (t)-[:LEADS_TO {label: '通向', weight: 2, createdAt: datetime()}]->(m)

// ========================================
// 创建关系：人员协作关系
// ========================================
MATCH (p1:Person {id: 'person2'}), (p2:Person {id: 'person3'})
CREATE (p1)-[:COLLABORATES_WITH {label: '协作', weight: 1, createdAt: datetime()}]->(p2)

MATCH (p1:Person {id: 'person3'}), (p2:Person {id: 'person4'})
CREATE (p1)-[:COLLABORATES_WITH {label: '协作', weight: 1, createdAt: datetime()}]->(p2)

// ========================================
// 返回统计信息
// ========================================
MATCH (n)
WITH labels(n) as nodeType, count(n) as count
RETURN nodeType, count
ORDER BY count DESC;
