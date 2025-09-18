from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# Neo4j连接配置
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")  # 默认密码，应通过环境变量配置

# 创建Neo4j连接驱动
_driver = None

def get_neo4j_driver():
    """获取Neo4j驱动单例"""
    global _driver
    if _driver is None:
        try:
            _driver = GraphDatabase.driver(
                NEO4J_URI, 
                auth=(NEO4J_USER, NEO4J_PASSWORD)
            )
        except Exception as e:
            print(f"连接Neo4j数据库出错: {str(e)}")
            raise e
    return _driver

def close_neo4j_connection():
    """关闭Neo4j连接"""
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None
