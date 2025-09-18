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
