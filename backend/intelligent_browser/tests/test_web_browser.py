"""
测试WebBrowserAgent
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.intelligent_browser.config import config
from backend.intelligent_browser.agents.web_browser_agent import WebBrowserAgent


def test_browse_url():
    """测试浏览URL"""
    print("=== 测试浏览URL ===\n")
    
    # 初始化
    llm_config = config.get_llm_config()
    playwright_config = config.get_playwright_config()
    
    agent = WebBrowserAgent(llm_config, playwright_config)
    
    # 测试URL
    test_url = "https://python.langchain.com/docs/get_started/introduction"
    print(f"浏览: {test_url}\n")
    
    result = agent.browse_url(test_url)
    
    if result["success"]:
        print(f"✅ 浏览成功")
        print(f"标题: {result['title']}")
        print(f"内容长度: {result['length']} 字符")
        print(f"\n内容预览:\n{result['content'][:500]}...")
    else:
        print(f"❌ 浏览失败: {result['error']}")


def test_query_with_url():
    """测试基于URL的查询"""
    print("\n=== 测试基于URL的查询 ===\n")
    
    # 初始化
    llm_config = config.get_llm_config()
    playwright_config = config.get_playwright_config()
    
    agent = WebBrowserAgent(llm_config, playwright_config)
    
    # 测试问题和URL
    question = "LangChain的主要功能是什么?"
    urls = ["https://python.langchain.com/docs/get_started/introduction"]
    
    print(f"问题: {question}")
    print(f"URL: {urls[0]}\n")
    
    result = agent.query(question, urls=urls)
    
    print(f"回答: {result['answer']}\n")
    print(f"来源数: {len(result['sources'])}")


if __name__ == "__main__":
    print("⚠️  注意: 此测试需要安装Playwright浏览器")
    print("运行: playwright install chromium\n")
    
    # 测试浏览URL
    test_browse_url()
    
    # 测试查询
    # test_query_with_url()  # 需要LLM支持,可能较慢
