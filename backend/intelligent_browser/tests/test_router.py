"""
测试RouterAgent
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.intelligent_browser.config import config
from backend.intelligent_browser.agents.router_agent import RouterAgent


def test_router_agent():
    """测试路由Agent"""
    print("=== 测试RouterAgent ===\n")
    
    # 初始化
    llm_config = config.get_llm_config()
    router = RouterAgent(llm_config)
    
    # 测试问题
    test_questions = [
        "项目的架构设计是什么?",
        "LangChain的最新版本是多少?",
        "我们的RAG方案和业界最佳实践的差距在哪?"
    ]
    
    for i, question in enumerate(test_questions, 1):
        print(f"测试 {i}: {question}")
        result = router.analyze_query(question)
        print(f"  查询类型: {result['query_type']}")
        print(f"  判断理由: {result['reasoning']}")
        print(f"  置信度: {result['confidence']}")
        print()


if __name__ == "__main__":
    test_router_agent()
