# 智能浏览器 Intelligent Browser

基于 **Autogen + LangChain + ChromaDB** 的智能问答系统

## 🎯 核心功能

1. **本地文档RAG检索** - 检索项目文档、脑图内容、工作记录
2. **网络智能浏览** - 使用Playwright浏览网页,提取关键信息
3. **智能路由决策** - 自动判断使用本地检索还是网络搜索
4. **多源信息综合** - 结合本地和网络信息,给出综合答案

## 🏗️ 技术架构

```
Autogen Multi-Agent协调层
├── RouterAgent (路由决策)
├── LocalRAGAgent (本地RAG)
│   └── LangChain + ChromaDB
└── WebBrowserAgent (网络浏览)
    └── Playwright
```

## 📦 安装

### 1. 安装Python依赖

```powershell
cd backend/intelligent_browser
pip install -r requirements.txt
```

### 2. 安装Playwright浏览器

```powershell
playwright install chromium
```

### 3. 配置环境变量

在项目根目录的 `.env` 文件中添加:

```bash
# 通义千问API (用于LLM和Embedding)
DASHSCOPE_API_KEY=your_api_key

# 服务配置
IB_SERVICE_HOST=0.0.0.0
IB_SERVICE_PORT=8001
```

## 🚀 快速开始

### 1. 索引本地文档

```python
python tests/test_local_rag.py
```

这将索引 `column-sources/autogen/` 目录下的所有Markdown文档。

### 2. 启动服务

```powershell
python main.py
```

服务将在 `http://localhost:8001` 启动

### 3. 访问API文档

浏览器打开: http://localhost:8001/docs

### 4. 测试问答

```powershell
# 测试路由决策
python tests/test_router.py

# 测试本地RAG
python tests/test_local_rag.py

# 测试网络浏览
python tests/test_web_browser.py
```

## 📡 API接口

### 1. 智能问答

**POST** `/api/intelligent-browser/ask`

```json
{
  "question": "智能问答系统的核心决策是什么?",
  "mode": "auto",  // auto/local/web
  "urls": []       // 可选,网络模式使用
}
```

**响应**:

```json
{
  "success": true,
  "answer": "...",
  "sources": [...],
  "routing": {
    "query_type": "local_rag",
    "reasoning": "..."
  }
}
```

### 2. 索引文档

**POST** `/api/intelligent-browser/index`

```json
{
  "source_dir": "d:/AI-Projects/.../column-sources/autogen",
  "glob_pattern": "**/*.md"
}
```

### 3. 获取统计

**GET** `/api/intelligent-browser/stats`

## 🧪 测试

### 测试路由决策

```python
from backend.intelligent_browser.config import config
from backend.intelligent_browser.agents.router_agent import RouterAgent

llm_config = config.get_llm_config()
router = RouterAgent(llm_config)

result = router.analyze_query("LangChain的最新版本是多少?")
print(result)  # {'query_type': 'web_search', ...}
```

### 测试本地RAG

```python
from backend.intelligent_browser.coordinator import IntelligentBrowserCoordinator

coordinator = IntelligentBrowserCoordinator()

# 索引文档
coordinator.index_local_documents("./column-sources/autogen")

# 查询
result = coordinator.process_query("智能问答系统的核心决策?", mode="local")
print(result['answer'])
```

### 测试网络浏览

```python
from backend.intelligent_browser.coordinator import IntelligentBrowserCoordinator

coordinator = IntelligentBrowserCoordinator()

result = coordinator.process_query(
    "LangChain的主要功能?",
    mode="web",
    urls=["https://python.langchain.com/docs/get_started/introduction"]
)
print(result['answer'])
```

## 📁 项目结构

```
intelligent_browser/
├── __init__.py
├── config.py              # 配置管理
├── coordinator.py         # 协调器
├── main.py                # FastAPI服务
├── requirements.txt       # 依赖
├── README.md              # 本文档
├── agents/                # Autogen Agents
│   ├── router_agent.py
│   ├── local_rag_agent.py
│   └── web_browser_agent.py
└── tests/                 # 测试脚本
    ├── test_router.py
    ├── test_local_rag.py
    └── test_web_browser.py
```

## 🔧 配置说明

### 模型配置

复用项目现有模型配置: `data/config/models/`

支持的模型:
- `qwen_turbo_latest.json` (推荐)
- `deepseek_chat_test.json`
- `moonshot_kimi_k2.json`

### ChromaDB配置

向量数据库存储路径: `data/chromadb/intelligent_browser/`

### Playwright配置

在 `config.py` 中可配置:
- `headless`: 是否无头模式
- `timeout`: 超时时间
- `viewport`: 视口大小

## 🎯 使用场景

### 场景1: 查询项目文档

```python
result = coordinator.process_query(
    "Autogen框架的核心原则是什么?",
    mode="auto"  # 自动路由到local_rag
)
```

### 场景2: 搜索最新信息

```python
result = coordinator.process_query(
    "LangChain 2025年的新特性?",
    mode="auto"  # 自动路由到web_search
)
```

### 场景3: 混合查询

```python
result = coordinator.process_query(
    "我们的RAG方案和业界最佳实践的差距?",
    mode="auto"  # 自动路由到hybrid
)
```

## 📊 性能指标

- 本地RAG检索: < 2秒
- 网络浏览: < 10秒 (取决于网络)
- 路由决策: < 1秒

## 🔗 集成到前端

参考 `column-sources/autogen/6-智能浏览器技术设计方案v1.0.md`

## 📝 开发计划

- [x] 核心Agent实现
- [x] FastAPI服务
- [x] 测试脚本
- [ ] 前端工作栏
- [ ] 搜索API集成
- [ ] 性能优化

## 🤝 贡献

欢迎提交Issue和Pull Request!

---

**程序员** - 2025-10-11
