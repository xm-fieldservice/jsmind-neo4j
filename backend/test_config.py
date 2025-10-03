#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试环境配置和Neo4j连接"""

from dotenv import load_dotenv
import os
import sys

print("=== 测试配置加载 ===\n")
load_dotenv(override=True)

pwd = os.getenv("NEO4J_PASSWORD")
uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
user = os.getenv("NEO4J_USER", "neo4j")

print(f"URI: {uri}")
print(f"USER: {user}")
print(f"密码长度: {len(pwd) if pwd else 0}")
print(f"密码值: {repr(pwd)}")
print(f"是否等于jl39724033: {pwd == 'jl39724033'}\n")

# 测试连接
from neo4j import GraphDatabase

print("=== 测试Neo4j连接 ===\n")
try:
    driver = GraphDatabase.driver(uri, auth=(user, pwd))
    with driver.session() as session:
        result = session.run("RETURN 1 as test")
        result.single()
    print("✅ Neo4j连接成功！")
    print(f"✅ 密码正确: {pwd}")
    driver.close()
    sys.exit(0)
except Exception as e:
    print(f"❌ Neo4j连接失败！")
    print(f"错误: {e}")
    print(f"\n请检查:")
    print(f"1. Neo4j是否在运行 (端口7687)")
    print(f"2. 密码是否正确: {pwd}")
    sys.exit(1)
