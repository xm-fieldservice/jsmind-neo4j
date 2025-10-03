# Neo4j数据库配置指南

## 📋 概述

本指南帮助您安装和配置Neo4j图数据库，以支持关系管理页面的完整功能。

---

## 🚀 快速安装（推荐）

### 方式1：使用Neo4j Desktop（最简单）

1. **下载Neo4j Desktop**
   ```
   https://neo4j.com/download/
   ```

2. **安装并启动**
   - 双击安装包
   - 创建新项目
   - 创建新数据库（Graph DBMS）
   - 设置密码（记住这个密码！）
   - 点击"Start"启动数据库

3. **获取连接信息**
   - URI: `bolt://localhost:7687`
   - 用户名: `neo4j`
   - 密码: 您设置的密码

---

### 方式2：使用Docker（快速）

```bash
# 拉取Neo4j镜像
docker pull neo4j:latest

# 启动Neo4j容器
docker run \
    --name neo4j \
    -p 7474:7474 -p 7687:7687 \
    -e NEO4J_AUTH=neo4j/your_password \
    -v $HOME/neo4j/data:/data \
    neo4j:latest
```

访问: http://localhost:7474

---

### 方式3：手动安装

1. **下载Neo4j Community Edition**
   ```
   https://neo4j.com/download-center/#community
   ```

2. **解压到目录**
   ```
   D:\neo4j\neo4j-community-5.x.x
   ```

3. **启动Neo4j**
   ```bash
   cd D:\neo4j\neo4j-community-5.x.x
   bin\neo4j.bat console
   ```

4. **首次登录**
   - 访问: http://localhost:7474
   - 默认用户名: `neo4j`
   - 默认密码: `neo4j`
   - 首次登录会要求修改密码

---

## ⚙️ 配置后端

### 1. 编辑 `.env` 文件

```bash
cd backend
notepad .env
```

### 2. 填写Neo4j连接信息

```env
# Neo4j数据库配置
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_actual_password

# FastAPI服务配置
HOST=0.0.0.0
PORT=8000
```

**重要**: 将 `your_actual_password` 替换为您实际设置的密码！

---

## 🎯 启动后端服务

### 1. 安装Python依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python start_api.py
```

### 3. 验证服务

访问: http://localhost:8000/health

应该看到: `{"status": "ok"}`

---

## 📊 创建测试数据

### 方式1：通过Neo4j Browser

1. 访问: http://localhost:7474
2. 登录后，在查询框输入：

```cypher
// 创建项目节点
CREATE (p:Project {
    id: 'project1',
    name: '项目管理系统',
    type: 'project',
    description: '核心项目'
})

// 创建任务节点
CREATE (t1:Task {
    id: 'task1',
    name: '需求分析',
    type: 'task',
    description: '项目第一阶段'
})

CREATE (t2:Task {
    id: 'task2',
    name: '架构设计',
    type: 'task',
    description: '系统架构设计'
})

CREATE (t3:Task {
    id: 'task3',
    name: '开发实现',
    type: 'task',
    description: '功能开发'
})

// 创建人员节点
CREATE (person1:Person {
    id: 'person1',
    name: '张三',
    type: 'person',
    description: '项目经理'
})

CREATE (person2:Person {
    id: 'person2',
    name: '李四',
    type: 'person',
    description: '架构师'
})

CREATE (person3:Person {
    id: 'person3',
    name: '王五',
    type: 'person',
    description: '开发工程师'
})

// 创建关系
MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task1'})
CREATE (p)-[:CONTAINS {label: '包含'}]->(t)

MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task2'})
CREATE (p)-[:CONTAINS {label: '包含'}]->(t)

MATCH (p:Project {id: 'project1'}), (t:Task {id: 'task3'})
CREATE (p)-[:CONTAINS {label: '包含'}]->(t)

MATCH (t1:Task {id: 'task1'}), (t2:Task {id: 'task2'})
CREATE (t1)-[:PRECEDES {label: '先于'}]->(t2)

MATCH (t2:Task {id: 'task2'}), (t3:Task {id: 'task3'})
CREATE (t2)-[:PRECEDES {label: '先于'}]->(t3)

MATCH (person:Person {id: 'person1'}), (p:Project {id: 'project1'})
CREATE (person)-[:MANAGES {label: '管理'}]->(p)

MATCH (person:Person {id: 'person2'}), (t:Task {id: 'task2'})
CREATE (person)-[:RESPONSIBLE {label: '负责'}]->(t)

MATCH (person:Person {id: 'person3'}), (t:Task {id: 'task3'})
CREATE (person)-[:RESPONSIBLE {label: '负责'}]->(t)

RETURN 'Test data created successfully' as result
```

### 方式2：通过API上传

在关系管理页面上传文档，系统会自动同步到Neo4j。

---

## ✅ 验证配置

### 1. 测试数据库连接

```bash
cd backend
python -c "from app.database import get_neo4j_driver; driver = get_neo4j_driver(); print('✅ Neo4j连接成功')"
```

### 2. 测试API接口

```bash
# 测试健康检查
curl http://localhost:8000/health

# 测试执行Cypher
curl -X POST http://localhost:8000/api/neo4j/execute-cypher \
  -H "Content-Type: application/json" \
  -d '{"cypher": "MATCH (n) RETURN count(n) as count"}'
```

### 3. 测试前端页面

1. 访问: http://localhost:8000/column-sources/relation/relation-column-layout.html
2. 输入AI查询
3. 点击"执行查询"
4. 应该能看到从Neo4j返回的数据

---

## 🔧 常见问题

### 问题1：无法连接到Neo4j

**症状**: `Failed to fetch` 或 `Connection refused`

**解决方案**:
1. 确认Neo4j已启动
2. 检查端口7687是否被占用
3. 验证密码是否正确

### 问题2：后端启动失败

**症状**: `ModuleNotFoundError: No module named 'neo4j'`

**解决方案**:
```bash
pip install neo4j
```

### 问题3：权限错误

**症状**: `Authentication failed`

**解决方案**:
1. 重置Neo4j密码
2. 更新 `.env` 文件中的密码

---

## 📚 相关文档

- [Neo4j官方文档](https://neo4j.com/docs/)
- [Cypher查询语言](https://neo4j.com/docs/cypher-manual/current/)
- [Neo4j Python驱动](https://neo4j.com/docs/python-manual/current/)

---

## 🎯 下一步

配置完成后，您可以：

1. ✅ 使用AI查询生成Cypher
2. ✅ 执行Cypher查询并查看结果
3. ✅ 可视化Neo4j中的关系图谱
4. ✅ 上传文档自动同步到Neo4j

---

**维护者**: 程序员  
**创建日期**: 2025-10-03  
**最后更新**: 2025-10-03
