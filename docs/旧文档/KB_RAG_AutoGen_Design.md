# AutoGen 0.7.1 知识库 + RAG 核心原型设计与脑图/关系管理集成方案

> 版本：v0.1（2025-08-21）
> 面向项目：project_manager(neo4j+d3.jsECHART)
> 规范遵循：AutoGen 0.7.1（内生机制优先）、Windows PowerShell 启动规范、前端字段适配后端原则
> 兼容说明：若当前运行环境的 AutoGen SDK 为 0.4+ 系列，可参考第 15 章的“映射与最小实现”说明进行落地（保留本方案的设计原则不变）。

---

## 1. 背景与目标
- 构建一套“知识库（治理层）+ RAG（在线检索增强）”的可落地原型，完全基于 AutoGen 内生机制（Agents/Tools/Memory/MCP）。
- 与现有 jsMind 脑图前端和 Neo4j 关系库打通，实现“图与文”融合检索与可溯源回答。
- 保持工程可运维：有版本、权限、审计与链路观测；CI/CD 一致；遵循前端适配后端的数据契约。

---

## 2. 术语与边界
- 知识库（Knowledge Base）：离线治理的内容资产与索引层（文件/段落/节点/边 + 元数据 + 版本/权限），关注“真/全/可控”。
- RAG（Retrieval-Augmented Generation）：在线对话时的“查询重写→检索→重排→压缩→生成→引用”，关注“准/可溯源/低幻觉”。
- 本方案明确：知识库≠RAG，但 RAG 依赖知识库的高质量数据与元数据治理。

---

## 3. 总体架构（AutoGen 内生）

 - 代理层（Agents）
  - 默认（推荐，避免过度复杂）：单一 AssistantAgent，内生挂载 Memory（检索/召回）与必要工具（如 Neo4j 查询）。
  - 可选扩展：
    - PlannerAgent：任务分解与路由（复杂工作流时启用）。
    - RetrieverAgent：封装混合检索与重排（当需要和主Agent解耦时）。
    - SynthesizerAgent：生成与引用格式化（需要多阶段生成时）。
    - GraphAgent：图扩展/路径发现/实体对齐；调用 Neo4j 工具。

- 工具与MCP（Tools/MCP）
 - 工具注册基于 `autogen_core.tools.BaseTool/FunctionTool`；当使用 MCP 时通过 `autogen_ext.tools.mcp.McpWorkbench` 挂载。
 - 重要约束：`tools` 与 `workbench` 在 `AssistantAgent` 上互斥，不能同时配置（与本地 0.7.1 源码一致）。
 - Memory-first：向量检索优先以 `autogen_core.memory.Memory` 的实现承载；仅在确需时将检索能力封装为工具。
  - 内置优先：本地检索优先使用内置实现（如 `_local_search.py:38-112`）；仅保留图查询（Neo4j）等“非向量”能力为工具。
  - GraphRAG/Neo4j：按需启用图检索与路径分析工具；默认关闭。

- 记忆与状态（Memory/State）
  - ConversationMemory：对话级短期记忆（不作为证据）。
  - KnowledgeIndex Versions：索引版本、嵌入版本、切分版本。

- 前后端契约
  - 前端仅展示“证据片段+来源+得分+高亮范围”，不擅自转换数据结构。
  - 后端统一暴露 RAG 管线工具化接口，所有页面共用一套抽象。

---

## 4. 知识库管理设计

### 4.1 数据模型（统一元数据）
- MVP 版（原型阶段最小集）：
  - 文档（document）：id, title, source_type(file/url), path_or_url, tags?
  - 片段（chunk）：id, doc_id, content, embedding, metadata?{lang?, source?}
  - 可溯源：在 chunk.metadata 中保留 `doc_id/chunk_id/source` 即可满足引用需求
  - 图数据：Phase 2 再引入（见第 7 章），原型阶段不强制设计节点/边模型

### 4.2 索引构建流水线（离线/准实时）
1) 采集与清洗：PDF/MD/HTML/代码/脑图导出 → 统一抽取器
2) 结构化切分：标题/段落/表格/代码块，避免纯定长切分
3) 嵌入计算：统一 embedding 模型与维度，多语加 lang 标记
4) 写入存储：
   - 对象存储：原文档（FileRepo 内生/或工具）
   - 向量库：chunks + metadata（VectorMemory，Memory 适配器）
   - 稀疏索引：BM25（SparseSearch 内生/或工具）
   - 图谱：实体/关系入 Neo4j（内建 GraphRAG 优先，或自定义 Neo4j 工具/MCP）
5) 校验与评测：覆盖率、去重率、坏块率、抽检可检索率
6) 版本与灰度：new_index 建好→离线评测→蓝绿/别名切换

### 4.3 权限与隔离
- metadata 携带租户/项目/角色域；检索时基于调用主体进行过滤
- 只下发“可见 evidence”，前端不做二次筛选

---

## 5. RAG 在线流程设计（工具化）

### 5.1 标准链路（内生优先）
- 最简实现（推荐）：
  - Retrieve：`Memory.update_context()` 基于向量检索注入证据
  - Generate：`AssistantAgent` 直接生成，输出附带引用（doc_id:chunk_id）
  - 说明：无需额外 Agent 与工具即可完成 RAG 核心闭环

 - 可选增强（按需启用）：
  - QueryRewrite / Hybrid(BM25+向量) / Rerank / Compress / CitationCheck / Cache
  - 默认关闭，验证 MVP 后再逐步增加

注：上述步骤默认以内生实现（Prompt/Memory/Agent 编排）。仅在需要复用外部能力时，才以 `FunctionTool` 或经 `McpWorkbench` 的方式暴露为工具。

### 5.2 关键参数建议
- k 值：初检索 k=50，重排取 top 5~10；
- 长度预算：控制 evidence tokens < 40% 模型上下文；
- 引用强约束：输出按 [doc_id:chunk_id] 标注；
- 无答案策略：返回“未检索到足够证据”，并附相近主题建议。

### 5.3 质量评测
- 线下：覆盖率、精准率、引用正确率、幻觉率（人工与 LLM 复核）
- 线上：点击/停留、用户反馈、无答案率、命中率；抽样对话链路回放

---

## 6. AutoGen 实现要点（内生机制优先）

> 实践准则：Memory-first。优先使用 AutoGen 的内生 `autogen_core.memory.Memory` 作为检索与上下文回填；工具（Tools/MCP）主要承载“非向量”类操作（如 Neo4j 图查询、文件读取、评测/缓存等）。多 Agent 仅在确有需要时引入，默认使用单 Agent + Memory + 少量工具。

### 6.1 工具与 MCP 接口（示意，0.7.1 对齐）
- 默认策略：不注册任何 `tools`，采用“单 Agent + Memory”即可满足多数 RAG 需求。
- 工具封装：使用 `FunctionTool(func, strict?)` 或自定义 `BaseTool`；当启用结构化输出时（见 6.3），工具需 `strict=True`。
- MCP 使用：通过 `McpWorkbench` 连接 MCP 服务器；注意 `AssistantAgent(tools=...)` 与 `workbench=...` 不能同时设置。
- Memory-first：向量检索实现为 `Memory` 子类，提供 `add()` 与 `update_context()`，由 Agent 在推理前自动纳入上下文。
- 可选工具能力：
  - SparseSearchTool：index(corpus), search(query, k, filters)
  - RerankTool：rerank(query, candidates[]) → sorted[]
  - ChunkCompressTool：compress(chunks[], budget_tokens)
  - Neo4jTool：run_cypher(cypher, params) → rows；expand_entity(name|id, depth, rel_filter)
  - FileRepoTool：get(doc_id|path) → blob/bytes/URL

### 6.2 版本说明（重要）
- 本仓库实际依赖的 AutoGen 为“0.4+ 系列”。
- 文档中的术语与模式参考了 0.7.1 的最新规范，但所有实现与接口示例均以 0.4+ 可行路径给出。
- 若后续升级到 0.7.1，可平滑迁移（主要在命名与扩展包路径上做最小差异改动）。

### 6.3 使用内置 ChromaDBVectorMemory（标准接口对齐）
对齐本地实现：`autogen_ext.memory.chromadb._chromadb.ChromaDBVectorMemory`，基于 `MemoryContent`，配置使用 `_chroma_configs.py` 提供的标准类。

示例（最简实现，推荐起步）：

```python
from autogen_ext.memory.chromadb import ChromaDBVectorMemory
from autogen_agentchat.agents import AssistantAgent

memory = ChromaDBVectorMemory(config=config)
agent = AssistantAgent(name="rag_agent", model_client=client, memory=[memory])
```

示例（进阶配置，Phase 1：直接使用内置实现）：

```python
# 配置与注入
import os
from pathlib import Path
from autogen_core.memory import MemoryContent, MemoryMimeType
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_ext.memory.chromadb import (
    ChromaDBVectorMemory,
    PersistentChromaDBVectorMemoryConfig,
    OpenAIEmbeddingFunctionConfig,
)

memory = ChromaDBVectorMemory(
    config=PersistentChromaDBVectorMemoryConfig(
        collection_name="project_kb",
        persistence_path=os.path.join(str(Path.home()), ".chromadb_autogen"),
        k=8,
        score_threshold=0.5,
        embedding_function_config=OpenAIEmbeddingFunctionConfig(
            api_key=os.environ["OPENAI_API_KEY"],
            model_name="text-embedding-3-small",
        ),
    )
)

# 写入一条记忆（离线构建阶段循环调用）
await memory.add(
    MemoryContent(
        content="文档片段内容……",
        mime_type=MemoryMimeType.TEXT,
        metadata={"doc_id": "doc-001", "chunk_id": 12, "source": "md"},
    )
)

assistant = AssistantAgent(
    name="assistant",
    model_client=OpenAIChatCompletionClient(model="gpt-4.1"),
    memory=[memory],  # 直接挂载内置 Memory
)
# 在对话中 Memory 会通过 update_context 自动注入检索结果
```

依赖：`autogen-ext[chromadb]`（已在 `_chromadb.py` 明确要求）。如不使用 OpenAI，可改用 `SentenceTransformerEmbeddingFunctionConfig`。

示例（Phase 2：与 GraphRAG 工具集成，见 6.4）。

### 6.4 GraphRAG 工具（按需启用）
- 扩展实现：`autogen_ext.tools.graphrag._local_search` 与 `_global_search`
- 示例参考：
  - `autogen_repo/python/samples/agentchat_graphrag/app.py`
  - `autogen_repo/python/examples/autogen_0_7_1/minimal_graphrag.py`
- 建议：仅在确需图查询/路径分析时添加 GraphRAG 工具；默认采用“单 Agent + Memory”方案。

### 6.5 回退方案：自定义 Neo4j 工具 / MCP
- 若需针对私有图模型或特定 Cypher 模板，保留 `neo4j_query_tool`（FunctionTool）或通过 `McpWorkbench` 接入。
- 注意：与 `workbench` 互斥，不与 `tools` 同时配置。

实施建议（汇总）：
- Phase 1：基础实现
  - 直接使用内置 `ChromaDBVectorMemory`（而非自定义类），按上文配置即可。
  - 参考官方示例：`docs/src/user-guide/agentchat-user-guide/memory.ipynb`（268-278）
- Phase 2：工具集成
  - 使用内建 GraphRAG 工具（参考 `python/samples/agentchat_graphrag/README.md:9-12`）。
  - 仅在需要特定 Cypher 查询时再自定义 Neo4j 工具。

以上统一注册为 AutoGen 工具或经 MCP 暴露，供 Agent 调用。

### 6.2 代理编排（示例）
- PlannerAgent：根据意图路由
  - “事实问答/规范/历史问题” → RAG 链
  - “结构/依赖/关系问答” → GraphAgent + RAG（图文混合）
- RetrieverAgent：封装 Hybrid→Rerank→Compress
- SynthesizerAgent：生成与引用，必要时二次压缩

### 6.3 与现有仓库的映射（0.7.1 术语对齐）
- 现有脚本：`store_documents_to_chroma.py`、`query_vector_store.py`
  - 推荐封装为 `Memory` 适配器（首选），以 `add()` 写入、`update_context()` 回填检索结果。
  - 如需工具形态，再封装为 `FunctionTool`，但与 `McpWorkbench` 不能并用于同一 Agent。
- 后端 FastAPI（`backend/app/*.py`）
  - 对外暴露 `/api/v1/rag/query`、`/api/v1/rag/build`、`/api/v1/graph/query` 等统一接口（内部调用 `AssistantAgent` + Memory + 工具/MCP）。
- 前端（Simple 系列页面）
  - 仅展示 evidence 列表与引用，字段对齐后端返回结构。

### 6.4 AssistantAgent 关键参数（与本地 0.7.1 源码一致）
- `reflect_on_tool_use`：工具调用后是否再做一次模型推理生成最终文本；启用结构化输出时默认 True，否则默认 False。
- `max_tool_iterations`：单次运行内串行工具调用迭代上限（≥1，默认 1）。
- `output_content_type`：设置后返回 `StructuredMessage`（需工具严格模式时 `strict=True`）。
- `tool_call_summary_format`/`tool_call_summary_formatter`：工具结果的汇总输出（后者为可编程但不可序列化）。
- `model_context`：使用 `BufferedChatCompletionContext` 或 `TokenLimitedChatCompletionContext` 控制上下文大小。
- `memory: list[Memory]`：Memory 集在推理前通过 `update_context()` 注入消息上下文。

---

## 7. 脑图（jsMind）+ 关系管理（Neo4j）集成

### 7.1 目标
- 将脑图节点/边作为一等知识来源与查询通道：
  - 写入：脑图→实体/关系入库（Neo4j），并对节点内容做嵌入→向量库
  - 检索：文本问答可结合“相邻节点扩展”做图感知检索
  - 展示：回答附带“图证据路径”和“文档证据片段”

### 7.2 数据流
1) 前端 `jsmind-controller.js` 事件（节点增/改/删）→ 后端 `/api/v1/graph/sync`（批量）
2) 后端将节点/边写入 Neo4j；节点内容走切分+嵌入 → VectorMemory（Memory 适配器）
3) 查询时：
   - GraphAgent：根据问题识别实体 → `expand_entity(depth)` 获取邻域
   - 将邻域节点文本（标题/注释/链接）作为检索提示词增强 → 走 Hybrid RAG
   - 合并“图证据（路径、节点）”与“文证据（片段）”返回

注：若采用 Memory-first 方案，步骤 2 的“向量库写入与检索”由 `Memory` 适配器完成（保持相同数据字段与可溯源信息）。

### 7.3 Neo4j 建模建议
- 节点标签：Topic/Task/DocRef/Person/Tag 等；公共属性：name, type, attrs, updatedAt
- 关系：RELATES_TO, DEPENDS_ON, TAGGED_AS, REFERENCES 等；属性：weight, provenance
- 索引：(:Topic{name}), (:Task{name})
- 常用查询：
  - 实体扩展：`MATCH p=(n {name:$q})-[:RELATES_TO*1..$d]-(m) RETURN p LIMIT $k`
  - 依赖链：`MATCH p=(a {name:$src})-[:DEPENDS_ON*1..3]->(b {name:$dst}) RETURN p`

### 7.4 前端适配（只透传）
- 后端返回结构：
```json
{
  "answer": "...",
  "citations": [
    {"doc_id":"d1","chunk_id":"c9","score":0.82,"snippet":"...","source":"/docs/x.md#H2"}
  ],
  "graph": {
    "paths": [ {"nodes":[...],"edges":[...]} ],
    "focus_entities": ["任务A","主题B"],
    "notes": "基于邻域深度=2"
  }
}
```
- jsMind 仅展示 `graph.paths` 与高亮 focus_entities，不改变字段语义。

---

## 8. API 契约（后端）
- POST `/api/v1/rag/build`
  - body: { input_dir, index_name, embed_model, options }
  - resp: { task_id, status }
- POST `/api/v1/rag/query`
  - body: { query, k?, filters?, graph_hops?, with_graph? }
  - resp: 上述统一结构（answer/citations/graph）
- POST `/api/v1/graph/sync`
  - body: { nodes:[], edges:[], version }
  - resp: { upserted, removed, index_tasks }
- POST `/api/v1/graph/query`
  - body: { cypher, params }
  - resp: { rows }

---

## 9. 运行与脚本（PowerShell 示例）
- 构建索引（离线）：
```powershell
python backend/app/main.py --task build_index --input_dir .\docs --index_name main --embed_model bge-small
```
- 在线查询（示例 curl）：
```powershell
curl -s -X POST http://localhost:8000/api/v1/rag/query -H "Content-Type: application/json" -d '{
  "query":"项目A的核心依赖是什么？", "with_graph": true, "graph_hops": 2, "k": 8
}'
```

---

## 10. 观测与评测
- 日志：记录检索工具输入/输出、候选/重排得分、被采纳片段、生成提示、最终答案与引用。
- 指标：命中率、无答案率、平均延迟、引用正确率、人工申诉率。
- 评测集：按领域构建黄金集，用于版本上线前的离线评测；保留“问-证据-答-引用”。

---

## 11. 安全与合规
- 权限前置：索引写入时带上租户/项目域，查询时强过滤。
- 敏感信息红线：压缩/生成时二次脱敏；引用仅回显可见片段。
- 审计：对每次回答保留证据与链路 ID，便于复盘。

---

## 12. CI/CD 与仓库规范
- 持续集成：`.github/workflows/ci.yml` 运行 lint/test；RAG 管线工具做最小集成测试。
- 版本策略：索引版本与代码版本关联；支持蓝绿切换与回滚。
- Git 建议：提交信息包含“索引版本/嵌入模型/切分策略”变更点。

---

## 13. 路线图（Roadmap）
- v0.1 原型（当前）：统一 API、Hybrid 检索+重排、基础图扩展、引用溯源
- v0.2 图文融合：图路径证据在提示中结构化使用、句级压缩优化
- v0.3 可观测：对话/检索全链路追踪面板、线上评测闭环
- v0.4 治理提升：权限细粒度到 chunk，自动再嵌入与热更新

---

## 14. 与现有代码的落地对接建议
- 复用：`store_documents_to_chroma.py`/`query_vector_store.py` 首选封装为 `Memory` 适配器（0.7.1 推荐实践）；必要时再提供工具封装以便在非 Memory 模式下调用。
- 后端整合：在 `backend/app/main.py` 或路由模块中注册上述 API；将 Memory 与工具/或 MCP Workbench 注册进 `AssistantAgent`（注意 tools 与 workbench 互斥）。

- 复用现有代码，减少重复开发

---

## 15. 修订与补齐（基于专家意见）

> 本章在不改变本仓库既定“0.7.1 规范表述”的前提下，提供面向 AutoGen 0.4+ SDK 的实现映射与最小可运行伪代码，强调 Memory-first，简化为“单Agent + Memory + 少量工具（Neo4j 等）”的默认架构。

### 15.1 版本与兼容说明
- 设计与术语仍按 0.7.1 规范描述；若实际 SDK 为 0.4+，建议：
  - 使用“向量记忆”组件作为内生 Memory（如基于 Chroma/FAISS 的 Memory 适配器），而非将向量检索做成外部工具。
  - 工具（Tools/MCP）用于“非向量”操作：Neo4j 图查询、文件读取、统计、缓存等。
  - 默认单 Agent（AssistantAgent）挂载 Memory 与工具；仅在确有复杂编排需求时引入 Planner/Retriever/Synthesizer 等多 Agent。

### 15.2 Memory-first 最小实现（伪代码，0.7.1 对齐）
```python
# 伪代码：实现一个 `Memory` 适配器（基于本地 Chroma/FAISS）并用于上下文回填
from autogen_core.memory import Memory, MemoryContent

class VectorMemory(Memory):
    def __init__(self, collection_name: str, persist_path: str, top_k: int = 10, score_threshold: float = 0.4):
        ...

    async def add(self, content: str | MemoryContent, mime_type: str = "text/plain", metadata: dict | None = None):
        # 写入向量库并记录可溯源元数据
        ...

    async def update_context(self, context):
        # 基于最近 query 在向量库检索，将检索片段以消息形式注入 context
        ...

# 伪代码：单Agent，挂载Memory与必要工具
rag_agent = AssistantAgent(
    name="rag_agent",
    model_client=model_client,
    memory=[vector_memory],
    tools=[neo4j_query_tool],  # 可选：当需要图查询时（若改用 MCP，则通过 workbench 提供能力）
)
```

#### 文档索引器（伪代码）
```python
class DocumentIndexer:
    def __init__(self, memory):
        self.memory = memory

    async def index_documents(self, sources: list[str]) -> int:
        total_chunks = 0
        for source in sources:
            content = await self._fetch_content(source)
            chunks = self._chunk_content(content)
            for i, chunk in enumerate(chunks):
                await self.memory.add(
                    content=chunk,
                    mime_type="text/plain",
                    metadata={"source": source, "chunk_index": i}
                )
            total_chunks += len(chunks)
        return total_chunks

    async def _fetch_content(self, source: str) -> str:
        # 从文件/URL/仓库获取文本
        ...

    def _chunk_content(self, content: str) -> list[str]:
        # 结构化切分：标题/段落/代码块优先
        ...
```

### 15.3 Neo4j 工具集成（伪代码，工具与 MCP 二选一）
```python
async def neo4j_query_tool(cypher: str, params: dict | None = None) -> dict:
    """执行 Neo4j Cypher 查询（作为工具被 Agent 调用）"""
    # 创建连接、执行查询并返回结果
    ...

# 集成到 Agent（见 15.2 的 rag_agent 定义）
```

### 15.4 统一 RAG 查询 API（FastAPI 伪代码，Memory.update_context 驱动）
```python
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/rag")

@router.post("/query")
async def rag_query(req: dict):
    # req: { query, with_graph?, graph_hops?, k? }
    response = await rag_agent.run(task=req.get("query", ""))  # Memory 会在内部通过 update_context 纳入检索结果
    return {
        "answer": extract_text(response),
        "citations": extract_citations(response),
        "graph": extract_graph(response) if req.get("with_graph") else None,
    }
```

### 15.5 分阶段实施计划（与文档第 13 章一致并细化）
- Phase 1：基础 RAG
  - 接入向量 Memory，完成索引器与最小查询链路；统一返回 answer/citations 结构。
- Phase 2：图文融合
  - 接入 `neo4j_query_tool` 与 jsMind 同步接口；实现“图邻域 → 检索提示增强 → RAG”。
- Phase 3：生产优化
  - 权限过滤、链路追踪、缓存；离线评测+蓝绿切换；可回溯审计。

> 说明：上述伪代码仅示例接口形态，具体类名/函数名请以实际 AutoGen SDK 与本仓代码为准；若使用 0.4+ SDK，请基于其现有 Memory/Agent API 进行适配实现。
