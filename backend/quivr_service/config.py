"""
Quivr服务配置文件
复用现有的模型配置：data/config/models/
"""
import os
import json
from pathlib import Path

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent.parent

# 模型配置目录
MODEL_CONFIG_DIR = PROJECT_ROOT / "data" / "config" / "models"

# 向量数据库配置
VECTOR_DB_CONFIG = {
    "type": "chromadb",
    "persist_directory": str(PROJECT_ROOT / "data" / "chromadb"),
    "collection_name": "intelligent_qa"
}

# 默认使用通义千问模型
DEFAULT_LLM_MODEL = "qwen_turbo_latest"
DEFAULT_EMBEDDING_MODEL = "text-embedding-v2"

# API配置
API_HOST = os.getenv("QUIVR_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("QUIVR_API_PORT", "8000"))

# 日志配置
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = PROJECT_ROOT / "logs" / "quivr_service.log"


def load_model_config(model_name: str) -> dict:
    """
    加载模型配置
    
    Args:
        model_name: 模型配置文件名（不含.json后缀）
    
    Returns:
        模型配置字典
    """
    config_file = MODEL_CONFIG_DIR / f"{model_name}.json"
    
    if not config_file.exists():
        raise FileNotFoundError(f"模型配置文件不存在: {config_file}")
    
    with open(config_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_llm_config() -> dict:
    """获取LLM配置"""
    config = load_model_config(DEFAULT_LLM_MODEL)
    
    # 从环境变量获取API Key
    api_key_env = config['config'].get('api_key_env', 'DASHSCOPE_API_KEY')
    api_key = os.getenv(api_key_env)
    
    if not api_key:
        raise ValueError(f"环境变量 {api_key_env} 未设置")
    
    return {
        "model": config['config']['model'],
        "base_url": config['config']['base_url'],
        "api_key": api_key,
        "temperature": config['config'].get('parameters', {}).get('temperature', 0.7),
        "max_tokens": config['config'].get('parameters', {}).get('max_tokens', 4096)
    }


def get_embedding_config() -> dict:
    """获取嵌入模型配置"""
    # 通义千问嵌入模型
    api_key = os.getenv('DASHSCOPE_API_KEY')
    
    if not api_key:
        raise ValueError("环境变量 DASHSCOPE_API_KEY 未设置")
    
    return {
        "model": DEFAULT_EMBEDDING_MODEL,
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "api_key": api_key
    }


# 可用的模型列表
AVAILABLE_MODELS = [
    "qwen_turbo_latest",      # 通义千问Turbo（推荐）
    "deepseek_chat_test",     # DeepSeek Chat（推荐）
    "moonshot_kimi_k2",       # Moonshot Kimi
    "qwen2_5_vl_72b_instruct" # 通义千问VL（多模态）
]


if __name__ == "__main__":
    # 测试配置加载
    print("=== Quivr服务配置测试 ===")
    print(f"项目根目录: {PROJECT_ROOT}")
    print(f"模型配置目录: {MODEL_CONFIG_DIR}")
    print(f"向量数据库目录: {VECTOR_DB_CONFIG['persist_directory']}")
    print(f"\n可用模型: {', '.join(AVAILABLE_MODELS)}")
    
    try:
        llm_config = get_llm_config()
        print(f"\n✅ LLM配置加载成功:")
        print(f"  模型: {llm_config['model']}")
        print(f"  Base URL: {llm_config['base_url']}")
        print(f"  API Key: {'已设置' if llm_config['api_key'] else '未设置'}")
    except Exception as e:
        print(f"\n❌ LLM配置加载失败: {e}")
    
    try:
        embedding_config = get_embedding_config()
        print(f"\n✅ 嵌入模型配置加载成功:")
        print(f"  模型: {embedding_config['model']}")
        print(f"  Base URL: {embedding_config['base_url']}")
    except Exception as e:
        print(f"\n❌ 嵌入模型配置加载失败: {e}")
