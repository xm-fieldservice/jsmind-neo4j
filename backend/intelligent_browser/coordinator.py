"""
IntelligentBrowserCoordinator - 智能浏览器协调器
协调RouterAgent, LocalRAGAgent, WebSearchAgent的工作
"""
from typing import Dict, Literal
from .config import config
from .agents import RouterAgent, LocalRAGAgent, WebSearchAgent


class IntelligentBrowserCoordinator:
    """智能浏览器协调器"""
    
    def __init__(self, model_name: str = "qwen_turbo_latest"):
        """
        初始化协调器
        
        Args:
            model_name: 使用的模型名称
        """
        # 获取配置
        llm_config = config.get_llm_config(model_name)
        embedding_config = config.get_embedding_config()
        chromadb_path = config.get_chromadb_path()
        
        # 初始化各个Agent
        self.router = RouterAgent(llm_config)
        self.local_rag = LocalRAGAgent(llm_config, embedding_config, chromadb_path)
        self.web_search = WebSearchAgent(llm_config)
    
    def process_query(
        self,
        question: str,
        mode: Literal["auto", "local", "web"] = "auto",
        urls: list = None
    ) -> Dict:
        """
        处理用户查询
        
        Args:
            question: 用户问题
            mode: 查询模式 (auto/local/web)
            urls: 可选的URL列表(仅web模式使用)
        
        Returns:
            查询结果
        """
        # 如果是auto模式,使用Router决策
        if mode == "auto":
            routing_result = self.router.analyze_query(question)
            query_type = routing_result["query_type"]
            reasoning = routing_result["reasoning"]
        elif mode == "local":
            query_type = "local_rag"
            reasoning = "用户指定使用本地检索"
        elif mode == "web":
            query_type = "web_search"
            reasoning = "用户指定使用网络搜索"
        else:
            query_type = "local_rag"
            reasoning = "默认使用本地检索"
        
        # 根据决策执行查询
        if query_type == "local_rag":
            result = self.local_rag.query(question)
        elif query_type == "web_search":
            result = self.web_search.query(question, urls=urls)
        elif query_type == "hybrid":
            # 混合模式:同时查询本地和网络
            local_result = self.local_rag.query(question)
            web_result = self.web_search.query(question, urls=urls)
            
            result = self._merge_results(question, local_result, web_result)
        else:
            result = {
                "answer": "无法确定查询类型",
                "sources": [],
                "agent": "Unknown"
            }
        
        # 添加路由信息
        result["routing"] = {
            "query_type": query_type,
            "reasoning": reasoning
        }
        
        return result
    
    def _merge_results(self, question: str, local_result: Dict, web_result: Dict) -> Dict:
        """
        合并本地和网络查询结果
        
        Args:
            question: 用户问题
            local_result: 本地查询结果
            web_result: 网络查询结果
        
        Returns:
            合并后的结果
        """
        # 简单合并策略:组合答案和来源
        merged_answer = f"""**本地文档检索结果**:
{local_result.get('answer', '无结果')}

**网络搜索结果**:
{web_result.get('answer', '无结果')}

**综合结论**:
(基于以上信息的综合分析)
"""
        
        return {
            "answer": merged_answer,
            "sources": local_result.get("sources", []) + web_result.get("sources", []),
            "agent": "Hybrid",
            "local_result": local_result,
            "web_result": web_result
        }
    
    def index_local_documents(self, source_dir: str):
        """
        索引本地文档
        
        Args:
            source_dir: 文档源目录
        """
        self.local_rag.index_documents(source_dir)
    
    def get_stats(self) -> Dict:
        """
        获取系统统计信息
        
        Returns:
            统计信息
        """
        return {
            "local_rag": self.local_rag.get_stats(),
            "config": {
                "chromadb_path": config.get_chromadb_path()
            }
        }
