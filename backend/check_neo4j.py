#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""检查Neo4j数据库内容"""

from app.database import get_neo4j_driver

driver = get_neo4j_driver()

with driver.session() as session:
    # 1. 检查所有标签
    print("=== 数据库标签 ===")
    result = session.run("CALL db.labels()")
    labels = [record[0] for record in result]
    print(f"标签列表: {labels}")
    print()
    
    # 2. 统计各类型节点数量
    print("=== 节点统计 ===")
    for label in labels:
        result = session.run(f"MATCH (n:{label}) RETURN count(n) as count")
        count = result.single()["count"]
        print(f"{label}: {count}个")
    print()
    
    # 3. 检查总节点数
    result = session.run("MATCH (n) RETURN count(n) as total")
    total = result.single()["total"]
    print(f"总节点数: {total}")
    print()
    
    # 4. 检查总关系数
    result = session.run("MATCH ()-[r]->() RETURN count(r) as total")
    total_rels = result.single()["total"]
    print(f"总关系数: {total_rels}")
    print()
    
    # 5. 查看前5个节点示例
    print("=== 节点示例 ===")
    result = session.run("MATCH (n) RETURN n LIMIT 5")
    for i, record in enumerate(result, 1):
        node = record["n"]
        print(f"{i}. {dict(node)}")

driver.close()
