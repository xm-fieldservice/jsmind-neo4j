"""
RouterAgent - 智能路由决策Agent
分析用户问题,决定使用本地RAG还是网络搜索
"""
from typing import Dict, Literal
from autogen import AssistantAgent


QueryType = Literal["local_rag", "web_search", "hybrid"]


class RouterAgent:
    """智能路由决策Agent"""
    
    def __init__(self, llm_config: Dict):
        """
        初始化路由Agent
        
        Args:
            llm_config: LLM配置
        """
        self.agent = AssistantAgent(
            name="Router",
            system_message=self._get_system_message(),
            llm_config=llm_config
        )
    
    def _get_system_message(self) -> str:
        """获取系统提示词 (优化版 - 更精确的指令)"""
        return """你是指令路由专家。严格按以下规则输出:

1. 如果问题涉及: 项目文档、技术方案、脑图内容、Autogen、架构设计、工作记录
   → 输出: LOCAL_RAG

2. 如果问题需要: 最新信息、网络搜索、实时数据、外部技术动态、新闻
   → 输出: WEB_SEARCH

3. 如果问题复杂需要: 对比分析、验证、结合内外部信息
   → 输出: HYBRID

只输出关键词 (LOCAL_RAG/WEB_SEARCH/HYBRID),不要解释。

示例:
问题: "智能问答系统的核心决策是什么?" → LOCAL_RAG
问题: "LangChain的最新版本?" → WEB_SEARCH
问题: "我们的方案和业界最佳实践的差距?" → HYBRID
"""
    
    def analyze_query(self, question: str) -> Dict:
        """
        分析问题类型
        
        Args:
            question: 用户问题
        
        Returns:
            包含query_type, reasoning, confidence的字典
        """
        prompt = f"""请分析以下问题:

问题: {question}

请判断应该使用哪种查询方式,并返回JSON格式的结果。
"""
        
        # 使用Autogen生成回复
        response = self.agent.generate_reply(
            messages=[{"role": "user", "content": prompt}]
        )
        
        # 解析响应
        return self._parse_response(response)
    
    def _parse_response(self, response: str) -> Dict:
        """
        解析Agent响应 (优化版 - 直接关键词匹配)
        
        Args:
            response: Agent的响应文本
        
        Returns:
            解析后的字典
        """
        response_upper = response.upper().strip()
        
        # 直接匹配关键词
        if "LOCAL_RAG" in response_upper or "LOCAL" in response_upper:
            return {
                "query_type": "local_rag",
                "reasoning": "匹配到LOCAL_RAG关键词",
                "confidence": 0.9
            }
        elif "WEB_SEARCH" in response_upper or "WEB" in response_upper:
            return {
                "query_type": "web_search",
                "reasoning": "匹配到WEB_SEARCH关键词",
                "confidence": 0.9
            }
        elif "HYBRID" in response_upper:
            return {
                "query_type": "hybrid",
                "reasoning": "匹配到HYBRID关键词",
                "confidence": 0.9
            }
        
        # 如果没有匹配,使用备用分析
        return self._fallback_analysis(response)
    
    def _fallback_analysis(self, response: str) -> Dict:
        """
        备用分析方法(基于关键词)
        
        Args:
            response: 响应文本
        
        Returns:
            分析结果
        """
        response_lower = response.lower()
        
        # 关键词匹配
        if any(kw in response_lower for kw in ["local", "本地", "文档", "项目"]):
            return {
                "query_type": "local_rag",
                "reasoning": "基于关键词判断为本地查询",
                "confidence": 0.7
            }
        elif any(kw in response_lower for kw in ["web", "网络", "搜索", "最新"]):
            return {
                "query_type": "web_search",
                "reasoning": "基于关键词判断为网络搜索",
                "confidence": 0.7
            }
        else:
            return {
                "query_type": "hybrid",
                "reasoning": "无法明确判断,使用混合模式",
                "confidence": 0.5
            }
