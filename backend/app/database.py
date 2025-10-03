from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

def get_neo4j_driver():
    """获取Neo4j驱动（每次重新加载配置）"""
    # 每次都重新加载环境变量
    load_dotenv(override=True)
    
    # Neo4j连接配置
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
    
    print(f"[Neo4j] 连接配置: URI={NEO4J_URI}, USER={NEO4J_USER}, PASSWORD={'*' * len(NEO4J_PASSWORD)}")
    
    try:
        driver = GraphDatabase.driver(
            NEO4J_URI, 
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        return driver
    except Exception as e:
        print(f"连接Neo4j数据库出错: {str(e)}")
        raise e

def close_neo4j_connection():
    """关闭Neo4j连接"""
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None
