"""
智能浏览器 FastAPI 服务
提供REST API接口
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Literal
from dotenv import load_dotenv
import os

# 加载环境变量
load_dotenv()

from .coordinator import IntelligentBrowserCoordinator

# 创建FastAPI应用
app = FastAPI(
    title="智能浏览器服务",
    description="基于Autogen + LangChain + ChromaDB的智能问答系统",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局协调器实例
coordinator = None


@app.on_event("startup")
async def startup_event():
    """启动时初始化"""
    global coordinator
    coordinator = IntelligentBrowserCoordinator()
    print("✅ 智能浏览器服务已启动")


# 请求模型
class QueryRequest(BaseModel):
    question: str
    mode: Literal["auto", "local", "web"] = "auto"
    urls: Optional[List[str]] = None


class IndexRequest(BaseModel):
    source_dir: str
    glob_pattern: str = "**/*.md"


# API路由
@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "智能浏览器服务",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "intelligent-browser"
    }


@app.post("/api/intelligent-browser/ask")
async def ask_question(request: QueryRequest):
    """
    智能问答接口
    
    Args:
        request: 查询请求
    
    Returns:
        查询结果
    """
    try:
        result = coordinator.process_query(
            question=request.question,
            mode=request.mode,
            urls=request.urls
        )
        
        return {
            "success": True,
            **result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/intelligent-browser/index")
async def index_documents(request: IndexRequest):
    """
    索引文档接口
    
    Args:
        request: 索引请求
    
    Returns:
        索引结果
    """
    try:
        coordinator.index_local_documents(request.source_dir)
        
        return {
            "success": True,
            "message": f"文档索引完成: {request.source_dir}"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/intelligent-browser/stats")
async def get_stats():
    """
    获取统计信息
    
    Returns:
        统计信息
    """
    try:
        stats = coordinator.get_stats()
        return {
            "success": True,
            **stats
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 启动脚本
if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("IB_SERVICE_HOST", "0.0.0.0")
    port = int(os.getenv("IB_SERVICE_PORT", "8001"))
    
    print(f"🚀 启动智能浏览器服务...")
    print(f"📍 地址: http://{host}:{port}")
    print(f"📚 API文档: http://{host}:{port}/docs")
    
    uvicorn.run(app, host=host, port=port)
