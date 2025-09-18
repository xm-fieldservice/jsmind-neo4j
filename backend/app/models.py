from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class RelationshipEdge(BaseModel):
    """关系边模型，表示两个节点之间的关系"""
    id: Optional[str] = None  # 关系ID，创建时可不提供
    type: str  # 关系类型
    source: str  # 源节点ID
    target: str  # 目标节点ID
    direction: str = "out"  # 方向：out表示从源到目标，in表示从目标到源
    properties: Optional[Dict[str, Any]] = None  # 关系属性

class RelationshipResponse(BaseModel):
    """关系查询响应模型"""
    items: List[RelationshipEdge] = []  # 关系列表
