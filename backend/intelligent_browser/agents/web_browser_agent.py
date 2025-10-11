"""
WebSearchAgent - 网络搜索Agent
使用Google Custom Search API实现智能网络搜索
优化版: 替换Playwright,提升性能和稳定性
"""
from typing import Dict, List, Optional
from autogen import AssistantAgent
import os
import requests
from bs4 import BeautifulSoup
import re


class WebSearchAgent:
    """网络搜索Agent (优化版)"""
    
    def __init__(self, llm_config: Dict):
        """
        初始化网络搜索Agent
        
        Args:
            llm_config: LLM配置
        """
        self.llm_config = llm_config
        
        # Google Custom Search API配置
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.google_cse_id = os.getenv("GOOGLE_CSE_ID")
        
        # 创建Autogen Agent
        self.agent = AssistantAgent(
            name="WebSearch",
            system_message="""你是网络搜索专家。

你可以:
1. 使用Google搜索最新信息
2. 提取网页的关键内容
3. 综合多个搜索结果
4. 给出准确的答案和来源

请基于真实的搜索结果回答问题。
""",
            llm_config=llm_config
        )
    
    def google_search(self, query: str, num_results: int = 5) -> List[Dict]:
        """
        使用Google Custom Search API搜索
        
        Args:
            query: 搜索查询
            num_results: 返回结果数量
        
        Returns:
            搜索结果列表
        """
        if not self.google_api_key or not self.google_cse_id:
            return self._fallback_duckduckgo_search(query, num_results)
        
        try:
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': self.google_api_key,
                'cx': self.google_cse_id,
                'q': query,
                'num': num_results
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            results = []
            for item in data.get('items', []):
                results.append({
                    'title': item.get('title', ''),
                    'url': item.get('link', ''),
                    'snippet': item.get('snippet', ''),
                    'source': 'google'
                })
            
            return results
        
        except Exception as e:
            print(f"Google搜索失败: {e}, 使用降级方案")
            return self._fallback_duckduckgo_search(query, num_results)
    
    def _fallback_duckduckgo_search(self, query: str, num_results: int = 5) -> List[Dict]:
        """
        降级方案: 使用DuckDuckGo搜索 (无需API Key)
        
        Args:
            query: 搜索查询
            num_results: 返回结果数量
        
        Returns:
            搜索结果列表
        """
        try:
            from duckduckgo_search import DDGS
            
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=num_results):
                    results.append({
                        'title': r.get('title', ''),
                        'url': r.get('href', ''),
                        'snippet': r.get('body', ''),
                        'source': 'duckduckgo'
                    })
            
            return results
        
        except Exception as e:
            print(f"DuckDuckGo搜索也失败: {e}")
            return []
    
    def fetch_url_content(self, url: str, max_retries: int = 3) -> Dict:
        """
        获取URL内容 (简单HTTP请求)
        
        Args:
            url: 要访问的URL
            max_retries: 最大重试次数
        
        Returns:
            包含content和metadata的字典
        """
        import time
        
        for attempt in range(max_retries):
            try:
                response = requests.get(
                    url,
                    timeout=10,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                )
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 移除脚本和样式
                for script in soup(["script", "style", "nav", "footer", "header"]):
                    script.decompose()
                
                # 提取标题
                title = soup.title.string if soup.title else "未知"
                
                # 提取主要内容
                main_content = soup.find('main') or soup.find('article') or soup.find('body')
                text = main_content.get_text() if main_content else soup.get_text()
                text = self._clean_text(text)
                
                return {
                    "success": True,
                    "url": url,
                    "title": title,
                    "content": text,
                    "length": len(text),
                    "method": "http_request"
                }
            
            except Exception as e:
                if attempt == max_retries - 1:
                    return {
                        "success": False,
                        "url": url,
                        "error": str(e)
                    }
                
                # 等待后重试
                time.sleep(2 ** attempt)
        
        return {
            "success": False,
            "url": url,
            "error": "所有重试均失败"
        }
    
    def _clean_text(self, text: str) -> str:
        """
        清理提取的文本
        
        Args:
            text: 原始文本
        
        Returns:
            清理后的文本
        """
        # 移除多余空白
        text = re.sub(r'\n\s*\n', '\n\n', text)
        text = re.sub(r' +', ' ', text)
        
        # 限制长度(保留前5000字符)
        if len(text) > 5000:
            text = text[:5000] + "\n...(内容过长,已截断)"
        
        return text.strip()
    
    def search_and_extract(self, query: str, max_results: int = 3) -> Dict:
        """
        搜索并提取内容
        
        Args:
            query: 搜索查询
            max_results: 最多处理几个结果
        
        Returns:
            综合结果
        """
        # 1. 搜索
        search_results = self.google_search(query, num_results=max_results)
        
        if not search_results:
            return {
                "success": False,
                "query": query,
                "error": "搜索失败,请检查API配置或网络连接"
            }
        
        # 2. 提取详细内容 (可选,根据需要)
        detailed_contents = []
        for result in search_results[:max_results]:
            # 优先使用snippet (已经够用)
            content = {
                "title": result['title'],
                "url": result['url'],
                "snippet": result['snippet'],
                "source": result['source']
            }
            
            # 如果snippet太短,尝试获取完整内容
            if len(result['snippet']) < 100:
                full_content = self.fetch_url_content(result['url'])
                if full_content['success']:
                    content['full_content'] = full_content['content'][:1000]
            
            detailed_contents.append(content)
        
        return {
            "success": True,
            "query": query,
            "results": detailed_contents,
            "count": len(detailed_contents)
        }
    
    def query(self, question: str, urls: List[str] = None) -> Dict:
        """
        基于网络搜索回答问题
        
        Args:
            question: 用户问题
            urls: 可选的URL列表,如果为空则搜索
        
        Returns:
            包含answer和sources的字典
        """
        if not urls:
            # 没有提供URL,使用搜索
            search_result = self.search_and_extract(question, max_results=5)
            
            if not search_result['success']:
                return {
                    "answer": search_result['error'],
                    "sources": [],
                    "agent": "WebSearch"
                }
            
            # 使用LLM综合搜索结果
            answer = self._synthesize_search_results(question, search_result['results'])
            
            return {
                "answer": answer,
                "sources": search_result['results'],
                "agent": "WebSearch",
                "search_query": question
            }
        
        # 提供了URL,直接访问
        fetched_contents = []
        for url in urls[:3]:  # 最多3个
            result = self.fetch_url_content(url)
            if result["success"]:
                fetched_contents.append(result)
        
        if not fetched_contents:
            return {
                "answer": "无法访问任何提供的URL",
                "sources": [],
                "agent": "WebSearch"
            }
        
        # 使用LLM综合信息
        answer = self._synthesize_url_contents(question, fetched_contents)
        
        return {
            "answer": answer,
            "sources": [
                {
                    "url": c["url"],
                    "title": c["title"],
                    "excerpt": c["content"][:200]
                }
                for c in fetched_contents
            ],
            "agent": "WebSearch"
        }
    
    def _synthesize_search_results(self, question: str, results: List[Dict]) -> str:
        """
        综合搜索结果回答问题
        
        Args:
            question: 用户问题
            results: 搜索结果列表
        
        Returns:
            综合答案
        """
        # 构建上下文
        context = "\n\n".join([
            f"来源 {i+1}: {r['title']}\nURL: {r['url']}\n摘要: {r['snippet']}\n{r.get('full_content', '')}"
            for i, r in enumerate(results)
        ])
        
        prompt = f"""基于以下搜索结果回答问题:

{context}

问题: {question}

请综合以上搜索结果,给出准确的回答。注明信息来源。
"""
        
        # 使用Agent生成回答
        response = self.agent.generate_reply(
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response
    
    def _synthesize_url_contents(self, question: str, contents: List[Dict]) -> str:
        """
        综合URL内容回答问题
        
        Args:
            question: 用户问题
            contents: URL内容列表
        
        Returns:
            综合答案
        """
        # 构建上下文
        context = "\n\n".join([
            f"来源: {c['title']} ({c['url']})\n{c['content'][:1000]}"
            for c in contents
        ])
        
        prompt = f"""基于以下网页内容回答问题:

{context}

问题: {question}

请综合以上信息,给出准确的回答。
"""
        
        # 使用Agent生成回答
        response = self.agent.generate_reply(
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response
