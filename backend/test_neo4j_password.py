#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试Neo4j密码"""

from neo4j import GraphDatabase
import sys

# 测试的密码列表
passwords = [
    'neo4j',
    'password',
    'jl39724033',
    'test123',
    '123456',
    'admin',
]

uri = "bolt://localhost:7687"
user = "neo4j"

print("🔍 开始测试Neo4j密码...\n")

for pwd in passwords:
    try:
        driver = GraphDatabase.driver(uri, auth=(user, pwd))
        with driver.session() as session:
            result = session.run("RETURN 1")
            result.single()
        driver.close()
        print(f"✅ 成功！密码是: {pwd}")
        print(f"\n请更新 backend/.env 文件：")
        print(f"NEO4J_PASSWORD={pwd}")
        sys.exit(0)
    except Exception as e:
        error_msg = str(e)
        if "Unauthorized" in error_msg or "authentication failure" in error_msg:
            print(f"❌ 密码错误: {pwd}")
        else:
            print(f"⚠️  其他错误 ({pwd}): {error_msg}")

print("\n❌ 所有测试密码都失败了")
print("请访问 http://localhost:7474 手动登录查看正确密码")
