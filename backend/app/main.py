from fastapi import FastAPI, Query, HTTPException, Depends, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from pathlib import Path
from app.database import get_neo4j_driver
from app.models import RelationshipEdge, RelationshipResponse
from app.extractors import RelationshipExtractor
from app.document_parser import MarkdownDocumentParser

# 创建FastAPI应用
app = FastAPI(title="脑图关系API", description="提供脑图节点关系的查询和管理")

# 挂载静态文件目录
static_dir = Path(__file__).parent.parent.parent
app.mount("/column-sources", StaticFiles(directory=str(static_dir / "column-sources")), name="column-sources")
app.mount("/src", StaticFiles(directory=str(static_dir / "src")), name="src")

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
    node_id: str = Query(..., description="节点ID")
):
    """
    查询与特定节点相关的所有关系
    """
    try:
        # 连接到Neo4j
        driver = get_neo4j_driver()
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
    relation: RelationshipEdge
):
    """
    创建一个新的关系
    """
    try:
        driver = get_neo4j_driver()
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
    relation_id: str
):
    """
    删除一个关系
    """
    try:
        driver = get_neo4j_driver()
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
    limit: int = Query(100, description="最大节点数量，默认100")
):
    """
    获取D3.js可视化所需的图形数据
    返回格式: {nodes: [...], links: [...]}
    """
    try:
        driver = get_neo4j_driver()
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
                # 查询全图数据（修复版 - 程序员）
                query = """
                MATCH (n1)-[r]->(n2)
                WITH n1, r, n2
                LIMIT $limit
                RETURN 
                    collect(DISTINCT {
                        id: n1.id, 
                        label: coalesce(n1.label, n1.name, n1.id),
                        type: coalesce(n1.type, head(labels(n1)), 'default'),
                        description: coalesce(n1.description, ''),
                        properties: properties(n1)
                    }) + collect(DISTINCT {
                        id: n2.id, 
                        label: coalesce(n2.label, n2.name, n2.id),
                        type: coalesce(n2.type, head(labels(n2)), 'default'),
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

# 执行Cypher查询接口
@app.post("/api/neo4j/execute-cypher")
async def execute_cypher(
    cypher_query: Dict[str, str] = Body(...)
):
    """
    执行Cypher查询并返回图形数据
    请求格式: {"cypher": "MATCH (n) RETURN n LIMIT 10"}
    返回格式: {nodes: [...], links: [...]}
    """
    try:
        cypher = cypher_query.get("cypher", "")
        if not cypher:
            raise HTTPException(status_code=400, detail="Cypher查询不能为空")
        
        # 每次都获取新的驱动
        driver = get_neo4j_driver()
        with driver.session() as session:
            result = session.run(cypher)
            
            nodes_dict = {}
            links = []
            raw_results = []  # 存储原始结果（用于统计查询）
            
            # 处理查询结果
            for record in result:
                # 保存原始记录（用于统计查询）
                raw_results.append(dict(record))
                
                for key in record.keys():
                    value = record[key]
                    
                    # 处理节点
                    if hasattr(value, 'labels'):  # Neo4j节点
                        node_id = value.get('id', str(value.id))
                        if node_id not in nodes_dict:
                            nodes_dict[node_id] = {
                                "id": node_id,
                                "label": value.get('label') or value.get('name') or node_id,
                                "type": value.get('type', 'default'),
                                "description": value.get('description', ''),
                                "properties": dict(value.items())
                            }
                    
                    # 处理关系
                    elif hasattr(value, 'type'):  # Neo4j关系
                        start_node = value.start_node
                        end_node = value.end_node
                        
                        # 添加起始节点
                        start_id = start_node.get('id', str(start_node.id))
                        if start_id not in nodes_dict:
                            nodes_dict[start_id] = {
                                "id": start_id,
                                "label": start_node.get('label') or start_node.get('name') or start_id,
                                "type": start_node.get('type', 'default'),
                                "description": start_node.get('description', ''),
                                "properties": dict(start_node.items())
                            }
                        
                        # 添加结束节点
                        end_id = end_node.get('id', str(end_node.id))
                        if end_id not in nodes_dict:
                            nodes_dict[end_id] = {
                                "id": end_id,
                                "label": end_node.get('label') or end_node.get('name') or end_id,
                                "type": end_node.get('type', 'default'),
                                "description": end_node.get('description', ''),
                                "properties": dict(end_node.items())
                            }
                        
                        # 添加关系
                        links.append({
                            "source": start_id,
                            "target": end_id,
                            "type": value.type,
                            "label": value.get('label', value.type),
                            "value": value.get('weight', 1),
                            "properties": dict(value.items())
                        })
            
            # 返回结果（包含图形数据和原始数据）
            response = {
                "nodes": list(nodes_dict.values()),
                "links": links,
                "rawResults": raw_results,  # 原始查询结果（用于统计查询）
                "resultType": "graph" if (nodes_dict or links) else "data"
            }
            
            return response
            
    except Exception as e:
        print(f"执行Cypher查询出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"执行Cypher查询时出错: {str(e)}")

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

# 清空Neo4j数据库接口
@app.delete("/api/neo4j/clear-database")
async def clear_database():
    """清空Neo4j数据库中的所有数据"""
    try:
        driver = get_neo4j_driver()
        with driver.session() as session:
            # 删除所有节点和关系
            session.run("MATCH (n) DETACH DELETE n")
            
        return {
            "status": "success",
            "message": "数据库已清空"
        }
    except Exception as e:
        print(f"清空数据库出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"清空数据库时出错: {str(e)}")

# 上传Markdown文档并导入Neo4j接口
@app.post("/api/upload-document")
async def upload_document(file: UploadFile = File(...)):
    """
    上传Markdown文档并自动解析导入到Neo4j
    - 解析文档结构（标题、列表、任务）
    - 提取实体（项目、任务、人员）
    - 识别关系（包含、依赖、负责）
    - 导入到Neo4j数据库
    """
    try:
        # 检查文件类型
        if not file.filename.endswith(('.md', '.markdown', '.txt')):
            raise HTTPException(status_code=400, detail="只支持Markdown文件(.md, .markdown, .txt)")
        
        # 读取文件内容
        content = await file.read()
        text_content = content.decode('utf-8')
        
        # 创建文档解析器
        parser = MarkdownDocumentParser()
        
        # 解析文档
        parsed_data = parser.parse_document(text_content)
        
        # 导入到Neo4j
        import_result = parser.import_to_neo4j(parsed_data)
        
        # 返回结果
        return {
            "status": "success",
            "filename": file.filename,
            "parsed": {
                "tasks": len(parsed_data['entities']['tasks']),
                "projects": len(parsed_data['entities']['projects']),
                "persons": len(parsed_data['entities']['persons']),
                "relationships": len(parsed_data['relationships'])
            },
            "import_result": import_result
        }
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="文件编码错误，请确保使用UTF-8编码")
    except Exception as e:
        print(f"上传文档出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"上传文档时出错: {str(e)}")