"""
AutoGen 内存管理器
基于AutoGen 0.7.1框架的统一MD文档存储管理
"""
import asyncio
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import os

# 设置环境变量
os.environ.setdefault("OPENAI_API_KEY", "your-api-key-here")

try:
    from autogen_ext.memory.chromadb import (
        ChromaDBVectorMemory,
        PersistentChromaDBVectorMemoryConfig,
        SentenceTransformerEmbeddingFunctionConfig
    )
    from autogen_ext.experimental.task_centric_memory import MemoryController
    from autogen_ext.models.openai import OpenAIChatCompletionClient
    from autogen_core.memory import MemoryContent, MemoryMimeType
except ImportError as e:
    print(f"AutoGen依赖未安装: {e}")
    print("请运行: pip install autogen-ext[chromadb,task-centric-memory]")

from autogen_config import (
    CHROMADB_CONFIG, MEMORY_CONTROLLER_CONFIG, MD_DOCUMENT_CONFIG,
    MD_STORAGE_PATH, get_model_config, CHROMA_DB_PATH
)


class AutoGenMemoryManager:
    """AutoGen框架的统一内存管理器"""
    
    def __init__(self):
        self.vector_memory: Optional[ChromaDBVectorMemory] = None
        self.memory_controller: Optional[MemoryController] = None
        self.model_client = None
        self._initialize_components()
    
    def _initialize_components(self):
        """初始化AutoGen组件"""
        try:
            # 初始化模型客户端
            model_config = get_model_config()
            if model_config["type"] == "openai":
                self.model_client = OpenAIChatCompletionClient(
                    model=model_config["model"],
                    api_key=model_config["api_key"]
                )
            
            # 初始化ChromaDB向量内存
            embedding_config = SentenceTransformerEmbeddingFunctionConfig(
                model_name=CHROMADB_CONFIG["embedding_function"]["model_name"]
            )
            
            chroma_config = PersistentChromaDBVectorMemoryConfig(
                collection_name=CHROMADB_CONFIG["collection_name"],
                persistence_path=CHROMADB_CONFIG["persistence_path"],
                k=CHROMADB_CONFIG["k"],
                score_threshold=CHROMADB_CONFIG["score_threshold"],
                embedding_function=embedding_config
            )
            
            self.vector_memory = ChromaDBVectorMemory(config=chroma_config)
            
            # 初始化任务中心化内存控制器
            self.memory_controller = MemoryController(
                reset=False,
                client=self.model_client,
                config=MEMORY_CONTROLLER_CONFIG
            )
            
            print("AutoGen组件初始化成功")
            
        except Exception as e:
            print(f"AutoGen组件初始化失败: {e}")
            print("将使用本地存储模式")
    
    async def store_mindmap_tree(self, project_data: Dict[str, Any]) -> bool:
        """存储脑图树到AutoGen内存系统"""
        try:
            # 提取项目信息
            project_id = project_data.get("id", "unknown")
            project_name = project_data.get("name", "未命名项目")
            mindmap_data = project_data.get("payload", {}).get("data", {})
            
            # 生成内容摘要用于向量化
            content_summary = self._generate_content_summary(mindmap_data)
            
            # 存储到ChromaDB向量内存
            if self.vector_memory:
                memory_content = MemoryContent(
                    content=content_summary,
                    mime_type=MemoryMimeType.TEXT_PLAIN
                )
                
                # 添加元数据
                metadata = {
                    "project_id": project_id,
                    "project_name": project_name,
                    "created_at": datetime.now().isoformat(),
                    "content_hash": self._compute_hash(json.dumps(mindmap_data))
                }
                
                await self.vector_memory.add_memory(memory_content, metadata)
            
            # 存储到任务中心化内存
            if self.memory_controller:
                task_description = f"项目管理: {project_name}"
                insight = f"项目结构: {content_summary}"
                await self.memory_controller.add_memo(task=task_description, insight=insight)
            
            # 更新统一MD文档
            await self._update_unified_md_document(project_data)
            
            return True
            
        except Exception as e:
            print(f"存储脑图树失败: {e}")
            return False
    
    async def retrieve_relevant_projects(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """基于查询检索相关项目"""
        results = []
        
        try:
            # 从ChromaDB检索
            if self.vector_memory:
                # 这里需要实现具体的检索逻辑
                # AutoGen的检索接口可能需要适配
                pass
            
            # 从任务中心化内存检索
            if self.memory_controller:
                memos = await self.memory_controller.retrieve_relevant_memos(task=query)
                for memo in memos:
                    results.append({
                        "insight": memo.insight,
                        "task": memo.task,
                        "relevance_score": getattr(memo, "score", 0.0)
                    })
            
            return results[:limit]
            
        except Exception as e:
            print(f"检索相关项目失败: {e}")
            return []
    
    def _generate_content_summary(self, mindmap_data: Dict[str, Any]) -> str:
        """生成脑图内容摘要"""
        def extract_text_from_node(node):
            texts = []
            if isinstance(node, dict):
                if "label" in node:
                    texts.append(node["label"])
                if "content" in node:
                    texts.append(node["content"])
                if "children" in node:
                    for child in node["children"]:
                        texts.extend(extract_text_from_node(child))
            return texts
        
        all_texts = extract_text_from_node(mindmap_data)
        return " | ".join(all_texts[:50])  # 限制长度
    
    def _compute_hash(self, content: str) -> str:
        """计算内容哈希"""
        return hashlib.md5(content.encode()).hexdigest()
    
    async def _update_unified_md_document(self, project_data: Dict[str, Any]):
        """更新统一MD文档"""
        try:
            # 读取现有文档
            if MD_STORAGE_PATH.exists():
                with open(MD_STORAGE_PATH, 'r', encoding='utf-8') as f:
                    existing_content = f.read()
            else:
                existing_content = ""
            
            # 生成新的树单元内容
            project_id = project_data.get("id", "unknown")
            project_name = project_data.get("name", "未命名项目")
            mindmap_data = project_data.get("payload", {}).get("data", {})
            
            tree_unit_content = MD_DOCUMENT_CONFIG["tree_unit_template"].format(
                project_name=project_name,
                project_id=project_id,
                created_at=datetime.now().isoformat(),
                tags=project_data.get("tags", []),
                content_hash=self._compute_hash(json.dumps(mindmap_data)),
                mindmap_data=json.dumps(mindmap_data, indent=2, ensure_ascii=False),
                vector_summary=self._generate_content_summary(mindmap_data)
            )
            
            # 更新或追加内容
            if f"### 树单元: {project_name}" in existing_content:
                # 更新现有项目
                # 这里需要实现更复杂的替换逻辑
                pass
            else:
                # 追加新项目
                if not existing_content:
                    # 创建新文档
                    header = MD_DOCUMENT_CONFIG["header_template"].format(
                        created_at=datetime.now().isoformat(),
                        updated_at=datetime.now().isoformat(),
                        total_projects=1,
                        version="1.0",
                        global_tags="[]"
                    )
                    existing_content = header
                
                existing_content += "\n" + tree_unit_content
            
            # 写入文件
            with open(MD_STORAGE_PATH, 'w', encoding='utf-8') as f:
                f.write(existing_content)
                
        except Exception as e:
            print(f"更新MD文档失败: {e}")
    
    async def migrate_from_external_files(self, external_data_path: str) -> bool:
        """从外部文件迁移数据"""
        try:
            # 读取外部数据文件
            with open(external_data_path, 'r', encoding='utf-8') as f:
                external_data = json.load(f)
            
            # 批量迁移
            success_count = 0
            for item in external_data:
                if await self.store_mindmap_tree(item):
                    success_count += 1
            
            print(f"迁移完成: {success_count}/{len(external_data)} 个项目")
            return success_count == len(external_data)
            
        except Exception as e:
            print(f"数据迁移失败: {e}")
            return False
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """获取存储统计信息"""
        stats = {
            "vector_memory_initialized": self.vector_memory is not None,
            "memory_controller_initialized": self.memory_controller is not None,
            "md_document_exists": MD_STORAGE_PATH.exists(),
            "chromadb_path": str(CHROMA_DB_PATH),
            "md_storage_path": str(MD_STORAGE_PATH)
        }
        
        if MD_STORAGE_PATH.exists():
            stats["md_document_size"] = MD_STORAGE_PATH.stat().st_size
        
        return stats


# 全局实例
memory_manager = AutoGenMemoryManager()


async def main():
    """测试函数"""
    print("AutoGen内存管理器测试")
    
    # 获取统计信息
    stats = memory_manager.get_storage_stats()
    print("存储统计:", json.dumps(stats, indent=2, ensure_ascii=False))
    
    # 测试存储
    test_project = {
        "id": "test_001",
        "name": "测试项目",
        "payload": {
            "data": {
                "id": "root",
                "label": "测试根节点",
                "content": "这是一个测试项目",
                "children": [
                    {"id": "n1", "label": "子节点1", "content": "内容1"},
                    {"id": "n2", "label": "子节点2", "content": "内容2"}
                ]
            }
        },
        "tags": ["测试", "示例"]
    }
    
    success = await memory_manager.store_mindmap_tree(test_project)
    print(f"存储测试结果: {success}")
    
    # 测试检索
    results = await memory_manager.retrieve_relevant_projects("测试项目")
    print(f"检索结果: {len(results)} 个相关项目")


if __name__ == "__main__":
    asyncio.run(main())
