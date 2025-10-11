"""
测试LocalRAGAgent
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.intelligent_browser.config import config
from backend.intelligent_browser.agents.local_rag_agent import LocalRAGAgent


def test_index_documents():
    """测试文档索引"""
    print("=== 测试文档索引 ===\n")
    
    # 初始化
    llm_config = config.get_llm_config()
    embedding_config = config.get_embedding_config()
    chromadb_path = config.get_chromadb_path()
    
    agent = LocalRAGAgent(llm_config, embedding_config, chromadb_path)
    
    # 索引autogen文档
    source_dir = str(project_root / "column-sources" / "autogen")
    print(f"索引目录: {source_dir}\n")
    
    agent.index_documents(source_dir)
    
    # 查看统计
    stats = agent.get_stats()
    print(f"\n统计信息:")
    print(f"  文档总数: {stats['total_documents']}")
    print(f"  存储路径: {stats['persist_directory']}")


def test_query():
    """测试查询"""
    print("\n=== 测试查询 ===\n")
    
    # 初始化
    llm_config = config.get_llm_config()
    embedding_config = config.get_embedding_config()
    chromadb_path = config.get_chromadb_path()
    
    agent = LocalRAGAgent(llm_config, embedding_config, chromadb_path)
    
    # 测试问题
    question = "智能问答系统的核心决策是什么?"
    print(f"问题: {question}\n")
    
    result = agent.query(question)
    
    print(f"回答: {result['answer']}\n")
    print(f"来源数: {len(result['sources'])}")
    for i, source in enumerate(result['sources'][:3], 1):
        print(f"\n来源 {i}:")
        print(f"  {source['content'][:100]}...")


if __name__ == "__main__":
    # 先索引文档
    test_index_documents()
    
    # 再测试查询
    test_query()
