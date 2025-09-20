from fastapi import FastAPI, Query, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from app.database import get_neo4j_driver
from app.models import RelationshipEdge, RelationshipResponse
from app.extractors import RelationshipExtractor

# 创建FastAPI应用
app = FastAPI(title="脑图关系API", description="提供脑图节点关系的查询和管理")

# 添加CORS中间件，允许前端页面调用API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该限制为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 健康检查接口
@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "ok"}

# 关系查询接口
@app.get("/api/relations", response_model=RelationshipResponse)
async def get_relations(
    node_id: str = Query(..., description="节点ID"),
    driver = Depends(get_neo4j_driver)
):
    """
    查询与特定节点相关的所有关系
    """
    try:
        # 连接到Neo4j
        with driver.session() as session:
            # 查询语句：查找与node_id相关的所有关系
            query = """
            MATCH (n)-[r]-(m)
            WHERE n.id = $node_id
            RETURN r, n, m
            """
            
            # 执行查询
            result = session.run(query, node_id=node_id)
            relationships = []
            
            # 处理查询结果
            for record in result:
                rel = record["r"]
                start_node = record["n"]
                end_node = record["m"]
                
                # 确定方向
                if start_node["id"] == node_id:
                    direction = "out"
                    source = start_node["id"]
                    target = end_node["id"]
                else:
                    direction = "in"
                    source = end_node["id"]
                    target = start_node["id"]
                
                # 转换为API响应格式
                edge = RelationshipEdge(
                    id=rel.id,
                    type=rel.type,
                    source=source,
                    target=target,
                    direction=direction,
                    properties=dict(rel.items())
                )
                relationships.append(edge)
            
            # 如果没有找到关系，返回空列表
            return RelationshipResponse(items=relationships)
            
    except Exception as e:
        # 记录错误
        print(f"查询关系出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"查询关系时出错: {str(e)}")

# 新增关系接口
@app.post("/api/relations", status_code=201)
async def create_relation(
    relation: RelationshipEdge,
    driver = Depends(get_neo4j_driver)
):
    """
    创建一个新的关系
    """
    try:
        with driver.session() as session:
            # 先确保两个节点存在
            create_nodes_query = """
            MERGE (source {id: $source_id})
            MERGE (target {id: $target_id})
            """
            session.run(create_nodes_query, 
                        source_id=relation.source, 
                        target_id=relation.target)
            
            # 然后创建关系
            create_relation_query = """
            MATCH (source {id: $source_id})
            MATCH (target {id: $target_id})
            CREATE (source)-[r:`%s` $props]->(target)
            RETURN r
            """ % relation.type
            
            result = session.run(create_relation_query, 
                                source_id=relation.source, 
                                target_id=relation.target,
                                props=relation.properties or {})
            
            rel_created = result.single()
            if not rel_created:
                raise HTTPException(status_code=400, detail="创建关系失败")
                
            return {"status": "success", "message": "关系创建成功", "id": rel_created["r"].id}
            
    except Exception as e:
        print(f"创建关系出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"创建关系时出错: {str(e)}")

# 删除关系接口
@app.delete("/api/relations/{relation_id}")
async def delete_relation(
    relation_id: str,
    driver = Depends(get_neo4j_driver)
):
    """
    删除一个关系
    """
    try:
        with driver.session() as session:
            delete_query = """
            MATCH ()-[r]-() 
            WHERE id(r) = $relation_id
            DELETE r
            RETURN count(r) as deleted
            """
            result = session.run(delete_query, relation_id=relation_id)
            deleted = result.single()["deleted"]
            
            if deleted == 0:
                raise HTTPException(status_code=404, detail="未找到指定关系")
                
            return {"status": "success", "message": "关系已删除"}
            
    except Exception as e:
        print(f"删除关系出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除关系时出错: {str(e)}")

# D3.js图形数据接口
@app.get("/api/neo4j/graph-data")
async def get_graph_data(
    node_id: Optional[str] = Query(None, description="中心节点ID，如果不指定则返回全图"),
    depth: int = Query(2, description="关系深度，默认为2层"),
    limit: int = Query(100, description="最大节点数量，默认100"),
    driver = Depends(get_neo4j_driver)
):
    """
    获取D3.js可视化所需的图形数据
    返回格式: {nodes: [...], links: [...]}
    """
    try:
        with driver.session() as session:
            if node_id:
                # 查询指定节点周围的关系网络（不依赖APOC）
                query = """
                MATCH (center {id: $node_id})-[*1..$depth]-(connected)
                WITH center, connected
                LIMIT $limit
                MATCH (n1)-[r]-(n2)
                WHERE (n1 = center OR n1 = connected) AND (n2 = center OR n2 = connected)
                RETURN 
                    collect(DISTINCT {
                        id: n1.id, 
                        label: coalesce(n1.label, n1.name, n1.id),
                        type: coalesce(n1.type, 'default'),
                        description: coalesce(n1.description, ''),
                        properties: properties(n1)
                    }) + collect(DISTINCT {
                        id: n2.id, 
                        label: coalesce(n2.label, n2.name, n2.id),
                        type: coalesce(n2.type, 'default'),
                        description: coalesce(n2.description, ''),
                        properties: properties(n2)
                    }) as nodes,
                    collect(DISTINCT {
                        source: n1.id,
                        target: n2.id,
                        type: type(r),
                        label: coalesce(r.label, type(r)),
                        value: coalesce(r.weight, 1),
                        properties: properties(r)
                    }) as links
                """
                result = session.run(query, node_id=node_id, depth=depth, limit=limit)
            else:
                # 查询全图数据
                query = """
                MATCH (n)
                WITH collect(n) as nodes LIMIT $limit
                UNWIND nodes as n1
                UNWIND nodes as n2
                MATCH (n1)-[r]-(n2)
                WHERE id(n1) < id(n2)
                RETURN 
                    collect(DISTINCT {
                        id: n1.id, 
                        label: coalesce(n1.label, n1.name, n1.id),
                        type: coalesce(n1.type, 'default'),
                        description: coalesce(n1.description, ''),
                        properties: properties(n1)
                    }) + collect(DISTINCT {
                        id: n2.id, 
                        label: coalesce(n2.label, n2.name, n2.id),
                        type: coalesce(n2.type, 'default'),
                        description: coalesce(n2.description, ''),
                        properties: properties(n2)
                    }) as nodes,
                    collect({
                        source: n1.id,
                        target: n2.id,
                        type: type(r),
                        label: coalesce(r.label, type(r)),
                        value: coalesce(r.weight, 1),
                        properties: properties(r)
                    }) as links
                """
                result = session.run(query, limit=limit)
            
            record = result.single()
            if record:
                # 去重节点数据
                nodes_dict = {}
                for node in record["nodes"]:
                    nodes_dict[node["id"]] = node
                
                return {
                    "nodes": list(nodes_dict.values()),
                    "links": record["links"]
                }
            else:
                return {"nodes": [], "links": []}
                
    except Exception as e:
        print(f"获取图形数据出错: {str(e)}")
        # 返回示例数据以便测试
        return {
            "nodes": [
                {"id": "node1", "label": "项目管理", "type": "project", "description": "主要项目节点"},
                {"id": "node2", "label": "任务A", "type": "task", "description": "重要任务"},
                {"id": "node3", "label": "资源B", "type": "resource", "description": "项目资源"}
            ],
            "links": [
                {"source": "node1", "target": "node2", "type": "contains", "label": "包含", "value": 1},
                {"source": "node1", "target": "node3", "type": "uses", "label": "使用", "value": 1}
            ]
        }

# 同步脑图数据到Neo4j接口
@app.post("/api/sync-mindmap")
async def sync_mindmap_data(
    mindmap_data: Dict[str, Any] = Body(...)
):
    """
    将脑图数据同步到Neo4j数据库
    - 提取所有节点及其属性
    - 提取所有关系(层次关系、引用关系等)
    - 将节点和关系同步到Neo4j
    """
    try:
        extractor = RelationshipExtractor()
        result = extractor.sync_to_neo4j(mindmap_data)
        return result
    except Exception as e:
        print(f"同步脑图数据出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"同步脑图数据时出错: {str(e)}")
