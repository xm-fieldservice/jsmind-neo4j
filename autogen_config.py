"""
AutoGen 0.7.1 配置文件
统一MD文档存储系统的AutoGen集成配置
"""
import os
from pathlib import Path
from typing import Dict, Any

# 环境变量配置
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")

# 项目路径配置
PROJECT_ROOT = Path(__file__).parent
DATA_DIR = PROJECT_ROOT / "data"
MEMORY_DIR = DATA_DIR / "memory"
CHROMA_DB_PATH = MEMORY_DIR / "chromadb"
MD_STORAGE_PATH = DATA_DIR / "unified_mindmap_storage.md"

# 确保目录存在
DATA_DIR.mkdir(exist_ok=True)
MEMORY_DIR.mkdir(exist_ok=True)
CHROMA_DB_PATH.mkdir(exist_ok=True)

# AutoGen ChromaDB 向量内存配置
CHROMADB_CONFIG = {
    "collection_name": "mindmap_knowledge_base",
    "persistence_path": str(CHROMA_DB_PATH),
    "k": 10,  # 返回前10个最相关结果
    "score_threshold": 0.3,  # 最小相似度阈值
    "embedding_function": {
        "type": "sentence_transformer",
        "model_name": "all-MiniLM-L6-v2"  # 轻量级但高效的嵌入模型
    }
}

# AutoGen 任务中心化内存控制器配置
MEMORY_CONTROLLER_CONFIG = {
    "generalize_task": True,
    "revise_generalized_task": True,
    "generate_topics": True,
    "validate_memos": True,
    "max_memos_to_retrieve": 15,
    "max_train_trials": 5,
    "max_test_trials": 3,
    "MemoryBank": {
        "db_path": str(MEMORY_DIR / "memory_bank.db"),
        "embedding_model": "sentence-transformers/all-MiniLM-L6-v2"
    }
}

# 统一MD文档格式配置
MD_DOCUMENT_CONFIG = {
    "header_template": """# 项目知识库统一存储
## 元数据
- 创建时间: {created_at}
- 最后更新: {updated_at}
- 总项目数: {total_projects}
- 版本: {version}

## 全局标签索引
{global_tags}

## 项目脑图数据
""",
    "tree_unit_template": """### 树单元: {project_name}
**元数据:**
- ID: {project_id}
- 创建时间: {created_at}
- 标签: {tags}
- 内容哈希: {content_hash}

**脑图数据:**
```json
{mindmap_data}
```

**向量化摘要:**
{vector_summary}

---
""",
    "encoding": "utf-8"
}

# 数据迁移配置
MIGRATION_CONFIG = {
    "backup_original": True,
    "backup_dir": DATA_DIR / "backup",
    "batch_size": 50,  # 批量处理大小
    "validate_migration": True
}

# 性能优化配置
PERFORMANCE_CONFIG = {
    "cache_size": 1000,  # 内存缓存大小
    "lazy_loading": True,  # 延迟加载
    "batch_operations": True,  # 批量操作
    "index_refresh_interval": 300  # 索引刷新间隔(秒)
}

def get_model_config() -> Dict[str, Any]:
    """获取模型配置"""
    if OPENAI_API_KEY:
        return {
            "type": "openai",
            "model": "gpt-4o-mini",
            "api_key": OPENAI_API_KEY,
            "temperature": 0.1
        }
    elif AZURE_OPENAI_API_KEY:
        return {
            "type": "azure_openai",
            "model": "gpt-4",
            "api_key": AZURE_OPENAI_API_KEY,
            "endpoint": AZURE_OPENAI_ENDPOINT,
            "temperature": 0.1
        }
    else:
        raise ValueError("需要设置 OPENAI_API_KEY 或 AZURE_OPENAI_API_KEY 环境变量")

def validate_config() -> bool:
    """验证配置有效性"""
    try:
        get_model_config()
        return True
    except ValueError:
        return False

if __name__ == "__main__":
    print("AutoGen 配置验证:")
    print(f"项目根目录: {PROJECT_ROOT}")
    print(f"数据目录: {DATA_DIR}")
    print(f"ChromaDB路径: {CHROMA_DB_PATH}")
    print(f"MD存储路径: {MD_STORAGE_PATH}")
    print(f"配置有效: {validate_config()}")
