from typing import Dict, List, Any, Optional
from neo4j import GraphDatabase
from app.database import get_neo4j_driver

class RelationshipExtractor:
    """
    从脑图数据中提取结构化关系并同步到Neo4j数据库
    """
    
    def __init__(self):
        """初始化关系提取器"""
        self.driver = get_neo4j_driver()
    
    def extract_hierarchical_relations(self, mindmap_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        提取脑图的层次关系
        - 父子节点形成一个HAS_CHILD/IS_CHILD_OF关系
        - 兄弟节点形成一个IS_SIBLING关系
        """
        relationships = []
        
        # 获取根节点和所有节点字典
        root_id = mindmap_data.get("root", "")
        nodes = mindmap_data.get("nodes", {})
        
        if not root_id or not nodes:
            return relationships
            
        # 构建节点父子关系字典
        parent_child_map = {}
        siblings_map = {}
        
        # 遍历所有节点，构建关系映射
        for node_id, node_data in nodes.items():
            parent_id = node_data.get("parent")
            if parent_id:
                # 记录父子关系
                if parent_id not in parent_child_map:
                    parent_child_map[parent_id] = []
                parent_child_map[parent_id].append(node_id)
                
                # 添加HAS_CHILD关系
                relationships.append({
                    "source": parent_id,
                    "target": node_id,
                    "type": "HAS_CHILD",
                    "direction": "out",
                    "properties": {
                        "order": node_data.get("index", 0)
                    }
                })
        
        # 处理兄弟关系
        for parent_id, children in parent_child_map.items():
            if len(children) > 1:
                # 对同一父节点下的子节点按index排序
                sorted_children = sorted(children, 
                                         key=lambda child_id: nodes.get(child_id, {}).get("index", 0))
                
                # 构建相邻兄弟关系
                for i in range(len(sorted_children) - 1):
                    current = sorted_children[i]
                    next_sibling = sorted_children[i + 1]
                    
                    # 添加IS_SIBLING关系
                    relationships.append({
                        "source": current,
                        "target": next_sibling,
                        "type": "IS_SIBLING",
                        "direction": "out",
                        "properties": {
                            "order": i
                        }
                    })
        
        return relationships
    
    def extract_reference_relations(self, mindmap_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        提取节点中的引用关系
        - 通过解析节点内容中的引用标记来建立REFERENCES/IS_REFERENCED_BY关系
        - 例如：[[node_id]]或@node_id格式的引用
        """
        relationships = []
        nodes = mindmap_data.get("nodes", {})
        
        if not nodes:
            return relationships
        
        # 引用模式匹配正则表达式（简化版，实际应用可能需要更复杂的正则）
        import re
        reference_patterns = [
            r"\[\[(\w+)\]\]",  # [[node_id]] 格式
            r"@(\w+)"          # @node_id 格式
        ]
        
        for node_id, node_data in nodes.items():
            node_content = node_data.get("topic", "") + " " + node_data.get("note", "")
            
            # 遍历所有模式查找引用
            for pattern in reference_patterns:
                # 查找所有匹配
                references = re.findall(pattern, node_content)
                
                # 为每个引用创建关系
                for ref_node_id in references:
                    # 检查引用的节点ID是否存在
                    if ref_node_id in nodes and ref_node_id != node_id:
                        relationships.append({
                            "source": node_id,
                            "target": ref_node_id,
                            "type": "REFERENCES",
                            "direction": "out",
                            "properties": {}
                        })
        
        return relationships
    
    def extract_all_relations(self, mindmap_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        提取所有类型的关系
        """
        relationships = []
        
        # 提取层次关系
        hierarchical_rels = self.extract_hierarchical_relations(mindmap_data)
        relationships.extend(hierarchical_rels)
        
        # 提取引用关系
        reference_rels = self.extract_reference_relations(mindmap_data)
        relationships.extend(reference_rels)
        
        # 未来可扩展更多关系类型
        # 如：共现关系、语义关系、时序因果关系等
        
        return relationships
    
    def sync_to_neo4j(self, mindmap_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        将脑图数据同步到Neo4j数据库
        1. 提取所有节点及其属性
        2. 提取所有关系
        3. 将节点和关系同步到Neo4j
        4. 返回同步结果统计
        """
        if not mindmap_data or "nodes" not in mindmap_data:
            return {"status": "error", "message": "无效的脑图数据"}
            
        try:
            nodes = mindmap_data.get("nodes", {})
            
            # 统计计数
            nodes_created = 0
            relations_created = 0
            
            with self.driver.session() as session:
                # 1. 同步所有节点
                for node_id, node_data in nodes.items():
                    # 准备节点属性
                    node_props = {
                        "id": node_id,
                        "topic": node_data.get("topic", ""),
                        "note": node_data.get("note", ""),
                        "parent": node_data.get("parent", ""),
                        "index": node_data.get("index", 0),
                        "expanded": node_data.get("expanded", True),
                        "created_at": node_data.get("created_at", ""),
                        "updated_at": node_data.get("updated_at", "")
                    }
                    
                    # 创建或更新节点
                    create_node_query = """
                    MERGE (n {id: $id})
                    SET n += $props
                    RETURN n
                    """
                    
                    session.run(create_node_query, id=node_id, props=node_props)
                    nodes_created += 1
                
                # 2. 提取并同步关系
                relationships = self.extract_all_relations(mindmap_data)
                
                # 3. 将关系同步到Neo4j
                for rel in relationships:
                    create_relation_query = """
                    MATCH (source {id: $source_id})
                    MATCH (target {id: $target_id})
                    MERGE (source)-[r:`%s` $props]->(target)
                    RETURN r
                    """ % rel["type"]
                    
                    session.run(create_relation_query, 
                               source_id=rel["source"], 
                               target_id=rel["target"],
                               props=rel.get("properties", {}))
                    relations_created += 1
                
            # 返回同步结果统计
            return {
                "status": "success",
                "message": "脑图数据同步成功",
                "stats": {
                    "nodes_created": nodes_created,
                    "relations_created": relations_created
                }
            }
        
        except Exception as e:
            print(f"同步脑图数据到Neo4j出错: {str(e)}")
            return {"status": "error", "message": f"同步出错: {str(e)}"}
