"""
配置管理模块
复用现有模型配置,集成AutogenUnifiedStorage
"""
import os
import json
from pathlib import Path
from typing import Dict, Any


class IntelligentBrowserConfig:
    """智能浏览器配置管理"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.config_dir = self.project_root / "data" / "config" / "models"
        self.chromadb_dir = self.project_root / "data" / "chromadb" / "intelligent_browser"
        
        # 确保目录存在
        self.chromadb_dir.mkdir(parents=True, exist_ok=True)
    
    def get_llm_config(self, model_name: str = "qwen_turbo_latest") -> Dict[str, Any]:
        """
        获取LLM配置
        
        Args:
            model_name: 模型名称 (qwen_turbo_latest/deepseek_chat_test等)
        
        Returns:
            LLM配置字典
        """
        config_file = self.config_dir / f"{model_name}.json"
        
        if not config_file.exists():
            raise FileNotFoundError(f"模型配置文件不存在: {config_file}")
        
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # 转换为Autogen格式
        return {
            "config_list": [{
                "model": config.get("model"),
                "api_key": os.getenv(config.get("api_key_env")),
                "base_url": config.get("base_url"),
                "api_type": "openai"
            }],
            "temperature": config.get("temperature", 0.7),
            "timeout": 120
        }
    
    def get_embedding_config(self) -> Dict[str, Any]:
        """
        获取Embedding配置
        使用通义千问的text-embedding-v2
        """
        return {
            "openai_api_base": "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "openai_api_key": os.getenv("DASHSCOPE_API_KEY"),
            "model": "text-embedding-v2"
        }
    
    def get_chromadb_path(self) -> str:
        """获取ChromaDB存储路径"""
        return str(self.chromadb_dir)
    
    def get_search_config(self) -> Dict[str, Any]:
        """获取搜索API配置"""
        return {
            "google_api_key": os.getenv("GOOGLE_API_KEY"),
            "google_cse_id": os.getenv("GOOGLE_CSE_ID"),
            "use_fallback": True  # 启用DuckDuckGo降级
        }


# 全局配置实例
config = IntelligentBrowserConfig()
