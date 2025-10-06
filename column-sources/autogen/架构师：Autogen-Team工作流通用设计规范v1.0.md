# Autogen Team工作流通用设计规范

**文档类型**: 架构规范  
**创建时间**: 2025-10-06  
**作者**: 架构师  
**版本**: v1.0  
**适用范围**: 所有基于Autogen 0.7.1的Team工作流设计  
**核心原则**: 配置即是功能，使用Autogen内生机制

---

## 📋 目录

1. [核心设计原则](#一核心设计原则)
2. [工作流设计步骤](#二工作流设计步骤)
3. [配置文件规范](#三配置文件规范)
4. [数据架构规范](#四数据架构规范)
5. [脚本实现规范](#五脚本实现规范)
6. [集成规范](#六集成规范)
7. [审查清单](#七审查清单)

---

## 一、核心设计原则

### 1.1 Autogen框架规范 ⭐⭐⭐

**强制要求**：

1. **配置即是功能**
   - ❌ 禁止：自定义Agent类、自定义Team类
   - ✅ 必须：通过YAML配置文件定义所有Agent和Team
   - ✅ 必须：所有功能通过配置参数实现

2. **使用Autogen内生机制**
   - ✅ 必须使用：`AssistantAgent`（内生Agent）
   - ✅ 必须使用：`RoundRobinGroupChat`或其他内生Team类型
   - ✅ 必须使用：`ChromaDBVectorMemory`（内生Memory）
   - ❌ 禁止：自定义execute()、run()等方法

3. **外部脚本启动**
   - ✅ 必须：通过Python脚本启动（如run_workflow.py）
   - ✅ 必须：脚本仅负责加载配置和调用内生方法
   - ❌ 禁止：在脚本中实现业务逻辑

### 1.2 架构集成规范

**强制要求**：

1. **复用现有系统功能**
   - ✅ 必须：使用AutogenUnifiedStorage（统一存储）
   - ✅ 必须：使用AutogenEventBus（事件总线）
   - ✅ 必须：使用ColumnRegistry（组件注册）
   - ✅ 必须：遵循MD底座数据结构v1.1

2. **避免重复造轮子**
   - ❌ 禁止：创建自定义存储类
   - ❌ 禁止：创建自定义事件系统
   - ❌ 禁止：创建自定义注册表
   - ✅ 必须：查阅"系统功能清单"，优先使用现有功能

---

## 二、工作流设计步骤

### 2.1 阶段分析

**步骤1：识别工作流阶段**

```
分析业务流程，识别明确的阶段：
├─ 每个阶段有明确的输入和输出
├─ 每个阶段有独立的职责
├─ 阶段之间有清晰的边界
└─ 阶段可以顺序或并行执行

示例（项目管理）：
阶段1：想法收集 → 阶段2：项目立项 → 阶段3：项目规划 
→ 阶段4：计划生成 → 阶段5：任务执行 → 阶段6：验收交付
```

**步骤2：定义阶段数据结构**

```yaml
# 每个阶段定义：
stage_definition:
  stage_id: "planning"
  stage_name: "项目规划"
  input_type: "project_idea"
  output_type: "planning_document"
  itemType: "planning"  # MD底座类型标记
  status_values: ["pending", "in_progress", "completed"]
```

### 2.2 Agent设计

**步骤3：为每个阶段设计专业Agent**

**设计原则**：
- ✅ 一个阶段对应一个专业Agent
- ✅ Agent职责单一，提示词聚焦
- ✅ Agent之间相互独立，错误隔离
- ❌ 避免一个Agent处理多个阶段

**Agent设计模板**：

```yaml
agent_template:
  name: "{stage}_agent"  # 阶段名_agent
  type: "AssistantAgent"  # 必须使用内生类型
  system_message: |
    你是{专业领域}专家，专注于{具体职责}。
    
    你的职责：
    1. {职责1}
    2. {职责2}
    3. {职责3}
    
    输入格式：{输入格式说明}
    输出格式：{输出格式说明}
  
  model_client: "${model_config}"
  
  # 可选：如果需要知识检索
  memory:
    - type: "ChromaDBVectorMemory"
      config:
        collection_name: "{stage}_knowledge"
        persistence_path: "./data/memory/chromadb"
        k: 5
        score_threshold: 0.6
```

### 2.3 Team编排

**步骤4：定义Team协作方式**

**Team类型选择**：

| Team类型 | 适用场景 | 特点 |
|---------|---------|------|
| RoundRobinGroupChat | 顺序执行的工作流 | Agent轮流发言 |
| SelectorGroupChat | 需要动态选择Agent | 根据条件选择 |
| MagenticOneGroupChat | 复杂协作场景 | 支持多种协作模式 |

**Team配置模板**：

```yaml
team_config:
  type: "RoundRobinGroupChat"  # 或其他内生类型
  participants: 
    - "{stage1}_agent"
    - "{stage2}_agent"
    - "{stage3}_agent"
  max_turns: 10
  
  # 可选：选择器提示（如果使用SelectorGroupChat）
  selector_prompt: |
    根据当前工作流阶段选择合适的Agent：
    - {条件1} -> {agent1}
    - {条件2} -> {agent2}
```

---

## 三、配置文件规范

### 3.1 Agent配置文件 `{workflow_name}_agents_config.yaml`

**必需结构**：

```yaml
# 模型配置
model_config:
  type: "openai"  # 或其他支持的类型
  model: "gpt-4"
  api_key: "${OPENAI_API_KEY}"  # 使用环境变量
  temperature: 0.1

# Agent列表
agents:
  - name: "{stage1}_agent"
    type: "AssistantAgent"
    system_message: |
      {详细的系统提示词}
    model_client: "${model_config}"
    memory:  # 可选
      - type: "ChromaDBVectorMemory"
        config: {...}
  
  - name: "{stage2}_agent"
    type: "AssistantAgent"
    system_message: |
      {详细的系统提示词}
    model_client: "${model_config}"

# Team配置
team_config:
  type: "RoundRobinGroupChat"
  participants: ["{stage1}_agent", "{stage2}_agent"]
  max_turns: 10
```

**命名规范**：
- 文件名：`{workflow_name}_agents_config.yaml`
- Agent名：`{stage}_agent`（小写，下划线分隔）
- 集合名：`{stage}_knowledge`

### 3.2 数据结构配置 `{workflow_name}_data_schema.yaml`

**必需结构**：

```yaml
# 完整工作流数据架构
workflow_complete_structure:
  # 基本信息
  workflow_id: "{workflow_type}_{timestamp}"
  workflow_name: "{工作流名称}"
  
  # MD底座根节点
  topic: "{工作流实例名称}"
  meta:
    itemType: "{workflow_type}"  # 工作流类型
    workflowId: "{workflow_id}"
    createdAt: "{ISO8601时间}"
    updatedAt: "{ISO8601时间}"
    currentStage: "{当前阶段}"
    workflowTemplate: "{模板名称}_v1"
    
    # 现场恢复关键数据
    restoration_context:
      last_active_time: "{ISO8601时间}"
      active_agents: ["{agent_name}"]
      visualization_state:  # 可视化组件状态
        component1: {...}
        component2: {...}
      agent_context:  # Agent上下文
        conversation_history: [...]
        memory_snapshots: [...]
  
  data:
    # 业务核心数据
    {业务字段1}: {值}
    {业务字段2}: {值}
    
    # 所有阶段完整数据（支持任意阶段恢复）
    stages:
      {stage1}:
        status: "completed|in_progress|pending"
        data: {...}
      {stage2}:
        status: "completed|in_progress|pending"
        data: {...}
  
  # 子节点树（MD底座children结构）
  children:
    - topic: "阶段1：{stage1_name}"
      meta:
        itemType: "stage"
        stage: "{stage1}"
      data: {...}
      children: [...]
```

---

## 四、数据架构规范

### 4.1 MD底座数据结构规范

**强制要求**：

1. **根节点必需字段**：
```yaml
{
  "topic": "节点标题",  # 必需
  "meta": {  # 必需
    "itemType": "类型标识",  # 必需，用于区分数据类型
    "createdAt": "ISO8601时间",  # 推荐
    "updatedAt": "ISO8601时间"  # 推荐
  },
  "data": {},  # 必需，业务数据
  "children": []  # 必需，子节点数组
}
```

2. **itemType命名规范**：
```
工作流实例：{workflow_type}_instance
工作流阶段：{workflow_type}_stage
阶段数据：{workflow_type}_{stage}_data
```

### 4.2 现场恢复数据规范

**必需包含**：

```yaml
restoration_context:
  # 时间信息
  last_active_time: "{ISO8601}"
  
  # Agent状态
  active_agents: ["{agent_name}"]
  agent_context:
    conversation_history: []  # 对话历史
    memory_snapshots: []  # Memory快照
  
  # 可视化状态（如果有UI）
  visualization_state:
    {component_id}:
      {state_field}: {value}
```

---

## 五、脚本实现规范

### 5.1 主启动脚本 `run_{workflow_name}.py`

**标准模板**：

```python
"""
{工作流名称}启动脚本
使用Autogen内生机制，通过配置文件驱动
"""
import asyncio
import yaml
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.messages import TextMessage
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_ext.memory.chromadb import (
    ChromaDBVectorMemory,
    PersistentChromaDBVectorMemoryConfig
)

class WorkflowRunner:
    """工作流运行器 - 基于配置文件"""
    
    def __init__(self, config_path: str = "{workflow_name}_agents_config.yaml"):
        self.config = self.load_config(config_path)
        self.agents = []
        self.team = None
        
    def load_config(self, config_path: str) -> dict:
        """加载配置文件"""
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    async def setup_agents(self):
        """根据配置创建Agent（配置即是功能）"""
        model_config = self.config['model_config']
        model_client = OpenAIChatCompletionClient(
            model=model_config['model'],
            api_key=model_config.get('api_key'),
            temperature=model_config.get('temperature', 0.1)
        )
        
        for agent_config in self.config['agents']:
            # 创建Memory（如果配置了）
            memories = []
            if 'memory' in agent_config:
                for mem_config in agent_config['memory']:
                    if mem_config['type'] == 'ChromaDBVectorMemory':
                        memory = ChromaDBVectorMemory(
                            config=PersistentChromaDBVectorMemoryConfig(
                                **mem_config['config']
                            )
                        )
                        memories.append(memory)
            
            # 使用Autogen内生的AssistantAgent
            agent = AssistantAgent(
                name=agent_config['name'],
                model_client=model_client,
                system_message=agent_config['system_message'],
                memory=memories if memories else None
            )
            self.agents.append(agent)
    
    async def setup_team(self):
        """根据配置创建Team（使用Autogen内生GroupChat）"""
        team_config = self.config['team_config']
        
        # 使用Autogen内生的Team类型
        self.team = RoundRobinGroupChat(
            participants=self.agents,
            max_turns=team_config.get('max_turns', 10)
        )
    
    async def run(self, initial_message: str):
        """运行工作流"""
        task = TextMessage(content=initial_message, source="user")
        result = await self.team.run(task=task)
        return result

async def main():
    """主函数 - 外部脚本启动"""
    runner = WorkflowRunner("{workflow_name}_agents_config.yaml")
    await runner.setup_agents()
    await runner.setup_team()
    
    result = await runner.run("初始输入")
    print("工作流执行结果：")
    print(result)

if __name__ == "__main__":
    asyncio.run(main())
```

### 5.2 系统集成脚本 `integrate_{workflow_name}.py`

**标准模板**：

```python
"""
{工作流名称}系统集成脚本
集成到现有AutogenUnifiedStorage和EventBus
"""
import asyncio
from run_{workflow_name} import WorkflowRunner

class IntegratedWorkflowRunner(WorkflowRunner):
    """集成版工作流运行器"""
    
    def __init__(self, config_path: str, storage, event_bus):
        super().__init__(config_path)
        self.storage = storage  # AutogenUnifiedStorage
        self.event_bus = event_bus  # AutogenEventBus
    
    async def run_with_storage(self, initial_message: str, workflow_id: str):
        """运行并保存到UnifiedStorage"""
        # 1. 运行工作流
        result = await self.run(initial_message)
        
        # 2. 保存到UnifiedStorage（MD底座格式）
        workflow_data = {
            "topic": f"{workflow_name}实例_{workflow_id}",
            "meta": {
                "itemType": "{workflow_type}_instance",
                "workflowId": workflow_id,
                "timestamp": get_current_time()
            },
            "data": {
                "initial_message": initial_message,
                "result": str(result)
            }
        }
        
        await self.storage.store(
            f"workflow_{workflow_id}",
            workflow_data,
            {"tier": "INDEXED_DB"}
        )
        
        # 3. 触发事件
        self.event_bus.emit("workflow:completed", {
            "workflow_id": workflow_id,
            "result": result
        })
        
        return result
```

### 5.3 工作区触发脚本 `workspace_trigger_{workflow_name}.py`

**标准模板**：

```python
"""
{工作流名称}工作区触发脚本
支持从工作区按键触发工作流生成或唤醒（加载）
"""
import asyncio
from run_{workflow_name} import WorkflowRunner

class WorkspaceTrigger:
    """工作区触发器"""
    
    def __init__(self, storage, event_bus):
        self.storage = storage
        self.event_bus = event_bus
    
    async def create_new_workflow(self, input_data: str):
        """创建新工作流实例"""
        runner = WorkflowRunner("{workflow_name}_agents_config.yaml")
        await runner.setup_agents()
        await runner.setup_team()
        
        result = await runner.run(input_data)
        
        # 保存完整数据到UnifiedStorage
        workflow_id = f"{workflow_type}_{int(asyncio.get_event_loop().time())}"
        workflow_data = {
            "topic": f"{workflow_name}：{extract_name(result)}",
            "meta": {
                "itemType": "{workflow_type}",
                "workflowId": workflow_id,
                "createdAt": get_current_time(),
                "currentStage": "{initial_stage}",
                "restoration_context": {
                    "visualization_state": self.get_initial_viz_state()
                }
            },
            "data": {
                "stages": {
                    "{initial_stage}": {
                        "status": "completed",
                        "data": {"content": input_data}
                    }
                }
            },
            "children": []
        }
        
        await self.storage.store(
            f"workflow_{workflow_id}",
            workflow_data,
            {"tier": "INDEXED_DB"}
        )
        
        self.event_bus.emit("workflow:created", {
            "workflow_id": workflow_id,
            "workflow_data": workflow_data
        })
        
        return workflow_id
    
    async def load_existing_workflow(self, workflow_id: str):
        """加载现有工作流（现场恢复）
        
        核心：读取数据 + 渲染可视化 = 现场恢复
        """
        # 1. 从UnifiedStorage读取完整数据
        workflow_data = await self.storage.retrieve(f"workflow_{workflow_id}")
        
        if not workflow_data:
            raise ValueError(f"工作流不存在: {workflow_id}")
        
        # 2. 触发事件，通知各组件渲染
        self.event_bus.emit("workflow:loaded", {
            "workflow_id": workflow_id,
            "workflow_data": workflow_data,
            "current_stage": workflow_data["meta"]["currentStage"],
            "visualization_state": workflow_data["meta"]["restoration_context"]["visualization_state"]
        })
        
        # 3. 如果未完成，准备Agent继续工作
        if workflow_data["meta"]["currentStage"] != "completed":
            runner = WorkflowRunner("{workflow_name}_agents_config.yaml")
            await runner.setup_agents()
        
        return workflow_data
```

---

## 六、集成规范

### 6.1 与现有系统集成检查清单

| 检查项 | 要求 | 说明 |
|--------|------|------|
| 使用AutogenUnifiedStorage | ✅ 必须 | 统一存储，支持分层 |
| 使用AutogenEventBus | ✅ 必须 | 事件总线，组件通信 |
| 使用ColumnRegistry | ✅ 推荐 | 如果有UI组件 |
| 遵循MD底座v1.1 | ✅ 必须 | 数据结构规范 |
| 避免自定义存储 | ❌ 禁止 | 使用现有功能 |
| 避免自定义事件系统 | ❌ 禁止 | 使用现有功能 |

### 6.2 可视化组件集成（如果需要）

**配置文件**：`{workflow_name}_visualization_config.yaml`

```yaml
visualization_components:
  component1:
    component_id: "{component_id}"
    data_binding:
      source: "workflow_data.{path}"
    events:
      on_change: "save_to_storage"
    registry_integration:
      use_existing: true
      column_id: "{existing_column_id}"

data_sharing:
  storage: "AutogenUnifiedStorage"
  event_bus: "AutogenEventBus"
  sync_strategy: "real_time"
```

---

## 七、审查清单

### 7.1 Autogen规范审查

- [ ] ✅ 所有Agent通过YAML配置定义
- [ ] ✅ 使用AssistantAgent（内生）
- [ ] ✅ 使用RoundRobinGroupChat或其他内生Team
- [ ] ✅ 使用ChromaDBVectorMemory（内生）
- [ ] ✅ 通过外部Python脚本启动
- [ ] ❌ 无自定义Agent类
- [ ] ❌ 无自定义Team类
- [ ] ❌ 无自定义execute/run方法

### 7.2 架构集成审查

- [ ] ✅ 使用AutogenUnifiedStorage
- [ ] ✅ 使用AutogenEventBus
- [ ] ✅ 遵循MD底座数据结构
- [ ] ✅ 查阅系统功能清单
- [ ] ❌ 无重复造轮子
- [ ] ❌ 无自定义存储类
- [ ] ❌ 无自定义事件系统

### 7.3 数据架构审查

- [ ] ✅ 包含完整的阶段数据
- [ ] ✅ 包含restoration_context
- [ ] ✅ 支持现场恢复（读取+渲染）
- [ ] ✅ 符合MD底座规范
- [ ] ✅ itemType命名规范

### 7.4 代码质量审查

- [ ] ✅ 配置文件命名规范
- [ ] ✅ 脚本文件命名规范
- [ ] ✅ 代码注释完整
- [ ] ✅ 错误处理完善
- [ ] ✅ 日志记录规范

---

## 八、最佳实践

### 8.1 Agent设计最佳实践

1. **职责单一**：一个Agent只负责一个阶段
2. **提示词聚焦**：系统提示词明确、具体
3. **输入输出明确**：清晰定义输入输出格式
4. **错误隔离**：Agent之间相互独立

### 8.2 数据架构最佳实践

1. **完整性**：保存所有阶段的完整数据
2. **可恢复性**：包含restoration_context
3. **可追溯性**：记录时间戳和历史
4. **可扩展性**：使用meta和data字段扩展

### 8.3 集成最佳实践

1. **优先复用**：先查系统功能清单
2. **事件驱动**：使用EventBus解耦
3. **统一存储**：使用UnifiedStorage
4. **配置驱动**：避免硬编码

---

## 九、参考文档

- `程序员：项目管理工作流Multi-Agent架构设计方案v3.0.md` - 完整实例
- `审查员：项目管理应用架构功能清单.md` - 系统功能清单
- `架构师：数据底座规范v1.2-关系表达(meta)增强.md` - MD底座规范
- Autogen 0.7.1 官方文档

---

## 十、快速开始检查表

设计新的Team工作流时，按以下顺序检查：

1. [ ] 分析业务流程，识别阶段
2. [ ] 为每个阶段设计专业Agent
3. [ ] 编写agents_config.yaml
4. [ ] 编写data_schema.yaml
5. [ ] 实现run_{workflow_name}.py
6. [ ] 实现integrate_{workflow_name}.py
7. [ ] 实现workspace_trigger_{workflow_name}.py
8. [ ] 通过审查清单验证
9. [ ] 测试和优化
10. [ ] 文档和提交

---

**架构师**
