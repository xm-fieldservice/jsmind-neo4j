"""
关系管理器
基于AutoGen混合存储架构的关系分析和管理
从服务器端向量库和图库获取关系数据
"""
import asyncio
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

# 导入AutoGen组件
from autogen_memory_manager import memory_manager
from hybrid_storage_architecture import hybrid_storage, DataTemperature
from server_deployment_config import server_config, ServerTier


class RelationType(Enum):
    """关系类型"""
    SEMANTIC = "semantic"      # 语义关系（向量库）
    STRUCTURAL = "structural"  # 结构关系（图库）
    TEMPORAL = "temporal"      # 时间关系（数据库）
    HIERARCHICAL = "hierarchical"  # 层级关系（脑图结构）


@dataclass
class RelationNode:
    """关系节点"""
    id: str
    label: str
    type: str
    content: str
    metadata: Dict[str, Any]
    temperature: DataTemperature


@dataclass
class RelationEdge:
    """关系边"""
    source_id: str
    target_id: str
    relation_type: RelationType
    weight: float
    properties: Dict[str, Any]
    created_at: datetime


class RelationManager:
    """关系管理器"""
    
    def __init__(self):
        self.vector_relations = []  # 向量库关系缓存
        self.graph_relations = []   # 图库关系缓存
        self.db_relations = []      # 数据库关系缓存
        
    async def inject_md_to_servers(self, md_content: str, project_id: str) -> Dict[str, bool]:
        """将MD文档注入到服务器端存储"""
        print(f"📤 开始注入MD文档到服务器: {project_id}")
        
        results = {
            "vector_injection": False,
            "graph_injection": False,
            "db_injection": False
        }
        
        try:
            # 1. 解析MD文档
            parsed_data = await self._parse_md_document(md_content, project_id)
            
            # 2. 注入向量库（语义关系）
            results["vector_injection"] = await self._inject_to_vector_db(parsed_data)
            
            # 3. 注入图库（结构关系）
            results["graph_injection"] = await self._inject_to_graph_db(parsed_data)
            
            # 4. 注入数据库（元数据关系）
            results["db_injection"] = await self._inject_to_relational_db(parsed_data)
            
            print(f"✅ MD文档注入完成: {results}")
            return results
            
        except Exception as e:
            print(f"❌ MD文档注入失败: {e}")
            return results
    
    async def get_semantic_relations(self, node_id: str, limit: int = 10) -> List[RelationEdge]:
        """从向量库获取语义关系"""
        try:
            print(f"🔍 从向量库获取语义关系: {node_id}")
            
            # 1. 获取节点内容
            node_content = await self._get_node_content(node_id)
            if not node_content:
                return []
            
            # 2. 向量相似度搜索
            similar_nodes = await memory_manager.retrieve_relevant_projects(
                query=node_content, limit=limit
            )
            
            # 3. 构建语义关系边
            relations = []
            for similar_node in similar_nodes:
                if similar_node.get("project_id") != node_id:
                    edge = RelationEdge(
                        source_id=node_id,
                        target_id=similar_node.get("project_id", "unknown"),
                        relation_type=RelationType.SEMANTIC,
                        weight=similar_node.get("relevance_score", 0.0),
                        properties={
                            "similarity_type": "vector_cosine",
                            "content_overlap": similar_node.get("insight", "")
                        },
                        created_at=datetime.now()
                    )
                    relations.append(edge)
            
            print(f"✅ 找到 {len(relations)} 个语义关系")
            return relations
            
        except Exception as e:
            print(f"❌ 获取语义关系失败: {e}")
            return []
    
    async def get_structural_relations(self, node_id: str) -> List[RelationEdge]:
        """从图库获取结构关系"""
        try:
            print(f"🔍 从图库获取结构关系: {node_id}")
            
            # 这里应该连接Neo4j图数据库
            # 暂时使用模拟数据
            relations = await self._query_neo4j_relations(node_id)
            
            print(f"✅ 找到 {len(relations)} 个结构关系")
            return relations
            
        except Exception as e:
            print(f"❌ 获取结构关系失败: {e}")
            return []
    
    async def get_temporal_relations(self, node_id: str) -> List[RelationEdge]:
        """从数据库获取时间关系"""
        try:
            print(f"🔍 从数据库获取时间关系: {node_id}")
            
            # 这里应该连接PostgreSQL数据库
            # 暂时使用模拟数据
            relations = await self._query_postgres_relations(node_id)
            
            print(f"✅ 找到 {len(relations)} 个时间关系")
            return relations
            
        except Exception as e:
            print(f"❌ 获取时间关系失败: {e}")
            return []
    
    async def get_all_relations(self, node_id: str) -> Dict[str, List[RelationEdge]]:
        """获取所有类型的关系"""
        print(f"🔄 获取节点的所有关系: {node_id}")
        
        # 并行获取各种关系
        semantic_task = self.get_semantic_relations(node_id)
        structural_task = self.get_structural_relations(node_id)
        temporal_task = self.get_temporal_relations(node_id)
        
        semantic_relations, structural_relations, temporal_relations = await asyncio.gather(
            semantic_task, structural_task, temporal_task, return_exceptions=True
        )
        
        # 处理异常结果
        if isinstance(semantic_relations, Exception):
            semantic_relations = []
        if isinstance(structural_relations, Exception):
            structural_relations = []
        if isinstance(temporal_relations, Exception):
            temporal_relations = []
        
        relations = {
            "semantic": semantic_relations,
            "structural": structural_relations,
            "temporal": temporal_relations
        }
        
        total_count = sum(len(r) for r in relations.values())
        print(f"✅ 总共找到 {total_count} 个关系")
        
        return relations
    
    async def build_relation_graph(self, project_ids: List[str]) -> Dict[str, Any]:
        """构建关系图谱"""
        print(f"🏗️ 构建关系图谱，包含 {len(project_ids)} 个项目")
        
        nodes = []
        edges = []
        
        try:
            # 1. 获取所有节点信息
            for project_id in project_ids:
                node_info = await self._get_node_info(project_id)
                if node_info:
                    nodes.append(node_info)
            
            # 2. 获取所有关系
            for project_id in project_ids:
                relations = await self.get_all_relations(project_id)
                for relation_type, relation_list in relations.items():
                    edges.extend(relation_list)
            
            # 3. 构建图谱数据结构
            graph_data = {
                "nodes": [self._node_to_dict(node) for node in nodes],
                "edges": [self._edge_to_dict(edge) for edge in edges],
                "metadata": {
                    "total_nodes": len(nodes),
                    "total_edges": len(edges),
                    "created_at": datetime.now().isoformat(),
                    "relation_types": list(set(edge.relation_type.value for edge in edges))
                }
            }
            
            print(f"✅ 关系图谱构建完成: {len(nodes)}个节点, {len(edges)}条边")
            return graph_data
            
        except Exception as e:
            print(f"❌ 构建关系图谱失败: {e}")
            return {"nodes": [], "edges": [], "metadata": {}}
    
    # 私有方法实现
    async def _parse_md_document(self, md_content: str, project_id: str) -> Dict[str, Any]:
        """解析MD文档"""
        try:
            # 1. 提取文档结构
            sections = self._extract_sections(md_content)
            
            # 2. 提取关键词和实体
            keywords = self._extract_keywords(md_content)
            entities = self._extract_entities(md_content)
            
            # 3. 分析内容语义
            semantic_chunks = self._chunk_content(md_content)
            
            parsed_data = {
                "project_id": project_id,
                "content": md_content,
                "sections": sections,
                "keywords": keywords,
                "entities": entities,
                "semantic_chunks": semantic_chunks,
                "metadata": {
                    "word_count": len(md_content.split()),
                    "section_count": len(sections),
                    "parsed_at": datetime.now().isoformat()
                }
            }
            
            return parsed_data
            
        except Exception as e:
            print(f"解析MD文档失败: {e}")
            return {}
    
    def _extract_sections(self, content: str) -> List[Dict[str, Any]]:
        """提取文档章节"""
        sections = []
        lines = content.split('\n')
        current_section = None
        
        for line in lines:
            # 检测标题行
            if line.startswith('#'):
                if current_section:
                    sections.append(current_section)
                
                level = len(line) - len(line.lstrip('#'))
                title = line.lstrip('# ').strip()
                current_section = {
                    "level": level,
                    "title": title,
                    "content": ""
                }
            elif current_section:
                current_section["content"] += line + "\n"
        
        if current_section:
            sections.append(current_section)
        
        return sections
    
    def _extract_keywords(self, content: str) -> List[str]:
        """提取关键词"""
        # 简单的关键词提取（实际应用中可使用NLP库）
        words = re.findall(r'\b\w+\b', content.lower())
        # 过滤停用词和短词
        keywords = [word for word in words if len(word) > 3]
        # 返回频率最高的关键词
        from collections import Counter
        return [word for word, count in Counter(keywords).most_common(20)]
    
    def _extract_entities(self, content: str) -> List[Dict[str, str]]:
        """提取实体"""
        entities = []
        
        # 提取可能的人名（大写字母开头的词）
        names = re.findall(r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b', content)
        for name in names:
            entities.append({"type": "PERSON", "text": name})
        
        # 提取日期
        dates = re.findall(r'\d{4}-\d{2}-\d{2}', content)
        for date in dates:
            entities.append({"type": "DATE", "text": date})
        
        # 提取邮箱
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', content)
        for email in emails:
            entities.append({"type": "EMAIL", "text": email})
        
        return entities
    
    def _chunk_content(self, content: str, chunk_size: int = 500) -> List[str]:
        """将内容分块"""
        words = content.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i + chunk_size])
            chunks.append(chunk)
        
        return chunks
    
    async def _inject_to_vector_db(self, parsed_data: Dict[str, Any]) -> bool:
        """注入向量库"""
        try:
            # 使用AutoGen内存管理器存储
            project_data = {
                "id": parsed_data["project_id"],
                "name": f"项目_{parsed_data['project_id']}",
                "payload": {
                    "data": parsed_data
                },
                "tags": parsed_data.get("keywords", [])[:5]  # 前5个关键词作为标签
            }
            
            success = await memory_manager.store_mindmap_tree(project_data)
            print(f"向量库注入{'成功' if success else '失败'}")
            return success
            
        except Exception as e:
            print(f"向量库注入失败: {e}")
            return False
    
    async def _inject_to_graph_db(self, parsed_data: Dict[str, Any]) -> bool:
        """注入图库"""
        try:
            # 这里应该连接Neo4j并创建节点和关系
            # 暂时模拟成功
            print("模拟图库注入成功")
            return True
            
        except Exception as e:
            print(f"图库注入失败: {e}")
            return False
    
    async def _inject_to_relational_db(self, parsed_data: Dict[str, Any]) -> bool:
        """注入关系数据库"""
        try:
            # 这里应该连接PostgreSQL并存储元数据
            # 暂时模拟成功
            print("模拟数据库注入成功")
            return True
            
        except Exception as e:
            print(f"数据库注入失败: {e}")
            return False
    
    async def _get_node_content(self, node_id: str) -> Optional[str]:
        """获取节点内容"""
        try:
            # 从混合存储获取项目数据
            project_data = await hybrid_storage.retrieve_project_data(node_id)
            if project_data and project_data.get("payload", {}).get("data"):
                return json.dumps(project_data["payload"]["data"])
            return None
        except Exception as e:
            print(f"获取节点内容失败: {e}")
            return None
    
    async def _query_neo4j_relations(self, node_id: str) -> List[RelationEdge]:
        """查询Neo4j关系"""
        # 模拟Neo4j查询结果
        return [
            RelationEdge(
                source_id=node_id,
                target_id=f"related_{i}",
                relation_type=RelationType.STRUCTURAL,
                weight=0.8 - i * 0.1,
                properties={"relation": f"depends_on_{i}"},
                created_at=datetime.now()
            ) for i in range(3)
        ]
    
    async def _query_postgres_relations(self, node_id: str) -> List[RelationEdge]:
        """查询PostgreSQL关系"""
        # 模拟PostgreSQL查询结果
        return [
            RelationEdge(
                source_id=node_id,
                target_id=f"temporal_{i}",
                relation_type=RelationType.TEMPORAL,
                weight=0.9 - i * 0.2,
                properties={"time_diff": f"{i+1}_days"},
                created_at=datetime.now()
            ) for i in range(2)
        ]
    
    async def _get_node_info(self, project_id: str) -> Optional[RelationNode]:
        """获取节点信息"""
        try:
            project_data = await hybrid_storage.retrieve_project_data(project_id)
            if project_data:
                return RelationNode(
                    id=project_id,
                    label=project_data.get("name", "未命名"),
                    type="project",
                    content=json.dumps(project_data.get("payload", {})),
                    metadata=project_data,
                    temperature=hybrid_storage.evaluate_data_temperature(project_data)
                )
            return None
        except Exception as e:
            print(f"获取节点信息失败: {e}")
            return None
    
    def _node_to_dict(self, node: RelationNode) -> Dict[str, Any]:
        """节点转字典"""
        return {
            "id": node.id,
            "label": node.label,
            "type": node.type,
            "temperature": node.temperature.value,
            "metadata": node.metadata
        }
    
    def _edge_to_dict(self, edge: RelationEdge) -> Dict[str, Any]:
        """边转字典"""
        return {
            "source": edge.source_id,
            "target": edge.target_id,
            "type": edge.relation_type.value,
            "weight": edge.weight,
            "properties": edge.properties,
            "created_at": edge.created_at.isoformat()
        }


# 全局关系管理器实例
relation_manager = RelationManager()


async def main():
    """测试函数"""
    print("关系管理器测试")
    
    # 测试MD文档注入
    test_md = """
# 测试项目
这是一个测试项目的描述。

## 需求分析
- 功能需求1
- 功能需求2

## 设计方案
设计思路和方案说明。
    """
    
    result = await relation_manager.inject_md_to_servers(test_md, "test_project_001")
    print(f"注入结果: {result}")
    
    # 测试关系获取
    relations = await relation_manager.get_all_relations("test_project_001")
    print(f"关系数量: {sum(len(r) for r in relations.values())}")
    
    # 测试图谱构建
    graph = await relation_manager.build_relation_graph(["test_project_001"])
    print(f"图谱: {len(graph['nodes'])}个节点, {len(graph['edges'])}条边")


if __name__ == "__main__":
    asyncio.run(main())
