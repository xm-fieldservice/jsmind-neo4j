# Autogen Team工作流通用设计规范

**文档类型**: 架构规范  
**创建时间**: 2025-10-06  
**作者**: 架构师  
**版本**: v1.2（更新：完善GraphFlow高级特性和最佳实践）  
**适用范围**: 所有基于Autogen 0.7.1的Team工作流设计  
**核心原则**: 配置即是功能，使用Autogen内生机制

**版本更新记录**：
- v1.0 (2025-10-06): 初始版本，支持对话模式Team（RoundRobin、Selector、MagenticOne）
- v1.1 (2025-10-06): 补充GraphFlow支持，新增工作流模式，完善Agent设计原则
- v1.2 (2025-10-06): 完善GraphFlow高级特性（激活组、条件边、循环模式、消息过滤、性能优化、FAQ）

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
- ✅ 一个阶段/**节点**对应一个专业Agent
- ✅ Agent职责单一，可以是**领域专家**或**工作流节点执行者**
- ✅ Agent之间相互独立，错误隔离
- ✅ 在对话式Team中，Agent通过消息传递协作
- ✅ 在GraphFlow中，Agent通过**图结构编排**，按确定性路径执行
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

| Team类型 | 适用场景 | 特点 | 模式 |
|---------|---------|------|------|
| **GraphFlow** | **确定性工作流执行** | **基于有向图的精确控制** | 工作流模式 |
| RoundRobinGroupChat | 顺序对话协作 | Agent轮流发言 | 对话模式 |
| SelectorGroupChat | 动态选择Agent | 根据条件选择 | 对话模式 |
| MagenticOneGroupChat | 复杂协作场景 | 支持多种协作模式 | 对话模式 |

**模式说明**：
- **对话模式**：Agent通过消息传递自然协作，适合灵活交互
- **工作流模式**：Agent通过图结构确定性执行，适合固定流程

**Team配置模板**：

**对话模式Team配置**：

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

**工作流模式Team配置（GraphFlow）**：

```yaml
# GraphFlow配置模板
team_config:
  type: "GraphFlow"
  participants: 
    - "{node1}_agent"
    - "{node2}_agent"
    - "{node3}_agent"
  
  # 图结构配置
  graph:
    builder_config:
      # 节点列表
      nodes: 
        - name: "{node1}_agent"
          activation: "all"  # all或any
        - name: "{node2}_agent"
          activation: "all"
        - name: "{node3}_agent"
          activation: "all"
      
      # 边配置（节点间连接）
      edges:
        - source: "{node1}_agent"
          target: "{node2}_agent"
          condition: null  # 无条件
        
        - source: "{node2}_agent"
          target: "{node3}_agent"
          condition: "APPROVE"  # 字符串条件（推荐，可序列化）
        
        - source: "{node2}_agent"
          target: "{node1}_agent"
          condition: "REJECT"  # 循环条件
          activation_group: "feedback"  # 激活组
      
      # 入口点（如果没有源节点，必须设置）
      entry_point: "{node1}_agent"
  
  # 终止条件
  max_turns: 20  # 防止无限循环
  
  termination_condition:
    type: "MaxMessageTermination"
    max_messages: 20

# 注意事项：
# 1. 所有循环必须包含至少一个条件边作为退出机制
# 2. Lambda函数条件不可序列化，建议使用字符串条件
# 3. 激活组用于处理多路径到同一节点的情况
```

### 2.4 GraphFlow高级特性 ⭐⭐⭐

#### 2.4.1 激活组（Activation Groups）详解

**使用场景**：
- 多路径汇聚到同一节点
- 循环中的复杂依赖
- 优先级不同的触发条件

**配置示例**：

```yaml
# 场景1: A→B→C→B (循环)
activation_groups_example_1:
  描述: "初始路径和反馈路径使用不同激活组"
  edges:
    - source: "agent_a"
      target: "agent_b"
      activation_group: "initial"  # 初始路径
    
    - source: "agent_c"
      target: "agent_b"
      activation_group: "feedback"  # 反馈路径
      activation_condition: "all"  # 默认，等待所有父节点

# 场景2: (C1, C2)→B (任一触发)
activation_groups_example_2:
  描述: "并行任务，任一完成即可触发下游"
  edges:
    - source: "agent_c1"
      target: "agent_b"
      activation_group: "parallel_group"
      activation_condition: "any"  # 任一完成即触发
    
    - source: "agent_c2"
      target: "agent_b"
      activation_group: "parallel_group"
      activation_condition: "any"
```

#### 2.4.2 条件边的三种配置方式

**类型1：无条件**
```yaml
condition: null
说明: "无条件激活，节点完成后自动触发"
示例: "builder.add_edge(agent_a, agent_b)"
```

**类型2：字符串匹配（推荐）**
```yaml
condition: "APPROVE"
说明: "检查消息内容是否包含指定字符串"
示例: "builder.add_edge(agent_b, agent_c, condition='APPROVE')"
优点: "可序列化，推荐用于配置文件"
限制: "只支持简单的包含判断"
```

**类型3：Lambda函数（高级）**
```yaml
condition: "lambda msg: 'yes' in msg.to_model_text()"
说明: "自定义条件逻辑"
示例: "builder.add_edge(agent_a, agent_b, condition=lambda msg: ...)"
优点: "灵活，支持复杂逻辑"
限制: "不可序列化，无法保存到配置文件"
警告: "⚠️ Lambda函数仅用于原型开发，生产环境建议使用字符串条件"
```

**推荐实践**：
1. 优先使用字符串条件
2. 复杂逻辑考虑拆分为多个简单条件
3. Lambda函数仅用于原型开发

#### 2.4.3 循环工作流设计模式

**循环验证规则**：

```yaml
loop_design_rules:
  强制要求:
    - "所有循环必须包含至少一个条件边"
    - "条件边必须能保证最终退出循环"
    - "建议设置max_turns防止无限循环"
  
  验证机制:
    - "DiGraph.graph_validate()自动检查循环"
    - "构建时会抛出ValueError如果循环无退出条件"
```

**常见循环模式**：

**模式1：审批循环**
```yaml
描述: "A→B→C(APPROVE) or A(REJECT)"
退出条件: "APPROVE"
配置示例:
  builder.add_edge(agent_b, agent_c, condition="APPROVE")  # 退出
  builder.add_edge(agent_b, agent_a, condition="REJECT")   # 循环
```

**模式2：迭代优化**
```yaml
描述: "生成→评审→改进(循环)→完成"
退出条件: "质量达标"
最大轮次: 10
配置示例:
  builder.add_edge(generator, reviewer)
  builder.add_edge(reviewer, generator, condition="NEEDS_IMPROVEMENT")
  builder.add_edge(reviewer, finalizer, condition="APPROVED")
```

**完整的循环工作流配置示例**：

```yaml
# 文档审批工作流
loop_workflow_example:
  name: "文档审批工作流"
  team_type: "GraphFlow"
  
  agents:
    - name: "writer_agent"
      role: "起草文档"
    - name: "reviewer_agent"
      role: "审核文档，说APPROVE或提出修改意见"
    - name: "finalizer_agent"
      role: "最终发布"
  
  graph:
    nodes:
      - name: "writer_agent"
        activation: "all"
      - name: "reviewer_agent"
        activation: "all"
      - name: "finalizer_agent"
        activation: "all"
    
    edges:
      # 初始路径
      - source: "writer_agent"
        target: "reviewer_agent"
      
      # 循环路径（修改）
      - source: "reviewer_agent"
        target: "writer_agent"
        condition: "REJECT"
        activation_group: "feedback"
      
      # 退出路径（通过）
      - source: "reviewer_agent"
        target: "finalizer_agent"
        condition: "APPROVE"
    
    entry_point: "writer_agent"
  
  termination_condition:
    type: "MaxMessageTermination"
    max_messages: 20  # 防止无限循环
```

#### 2.4.4 并行执行模式

**扇出（Fan-out）模式**：

```yaml
parallel_fanout:
  描述: "一个节点完成后，多个节点并行执行"
  图结构: "A → (B, C, D)"
  
  配置示例:
    builder.add_edge(agent_a, agent_b)
    builder.add_edge(agent_a, agent_c)
    builder.add_edge(agent_a, agent_d)
  
  执行特点:
    - "B、C、D同时进入就绪队列"
    - "执行顺序不确定"
    - "适合独立的并行任务"
```

**汇聚（Join）模式**：

```yaml
parallel_join:
  描述: "多个节点完成后，汇聚到一个节点"
  图结构: "(A, B, C) → D"
  
  配置示例:
    builder.add_edge(agent_a, agent_d)
    builder.add_edge(agent_b, agent_d)
    builder.add_edge(agent_c, agent_d)
    # D默认使用activation="all"，等待所有父节点完成
  
  激活策略:
    all模式: "等待A、B、C全部完成"
    any模式: "任一完成即触发D"
```

#### 2.4.5 消息过滤（Message Filtering）

**使用场景**：
- 循环中避免消息历史过长
- Agent只需要看特定来源的消息
- 减少幻觉，提高准确性

**配置示例**：

```yaml
filtered_agent:
  type: "MessageFilterAgent"
  wrapped_agent: "base_agent"
  filter:
    per_source:
      - source: "user"
        position: "first"  # 只看第一条用户消息
        count: 1
      
      - source: "upstream_agent"
        position: "last"  # 只看上游Agent的最后一条
        count: 1

最佳实践:
  - "循环中的Agent应该过滤消息"
  - "只保留关键信息，避免上下文污染"
  - "使用position='last'获取最新状态"
```

#### 2.4.6 实验性功能警告 ⚠️

```yaml
experimental_notice:
  状态: "实验性功能"
  API稳定性: "可能在未来版本中变化"
  
  风险提示:
    - "不建议在生产环境大规模使用"
    - "API可能在0.8.x版本中调整"
    - "优先考虑稳定的RoundRobin/Selector"
  
  适用场景:
    推荐使用:
      - "确定性工作流原型"
      - "内部工具和脚本"
      - "研究和实验项目"
    
    谨慎使用:
      - "生产环境关键业务"
      - "需要长期维护的系统"
  
  迁移准备:
    - "保持配置文件的可读性"
    - "避免过度依赖Lambda函数"
    - "关注AutoGen版本更新日志"
```

#### 2.4.7 GraphFlow设计检查清单

```yaml
graphflow_checklist:
  图结构设计:
    - [ ] 所有节点都有明确的职责
    - [ ] 节点间的连接符合业务逻辑
    - [ ] 循环包含至少一个条件边
    - [ ] 设置了合理的入口点
    - [ ] 没有孤立节点
  
  条件配置:
    - [ ] 优先使用字符串条件（可序列化）
    - [ ] 条件互斥，避免冲突
    - [ ] 循环有明确的退出条件
    - [ ] 测试了所有分支路径
  
  激活配置:
    - [ ] 汇聚节点使用正确的activation类型
    - [ ] 激活组命名清晰
    - [ ] 理解"all"和"any"的区别
    - [ ] 多路径汇聚配置正确
  
  性能和可维护性:
    - [ ] 设置了合理的max_turns防止无限循环
    - [ ] 考虑使用消息过滤减少上下文长度
    - [ ] 节点命名清晰易懂
    - [ ] 添加了必要的注释和文档
  
  测试验证:
    - [ ] 测试了正常执行路径
    - [ ] 测试了所有分支条件
    - [ ] 测试了循环退出机制
    - [ ] 验证了终止条件生效
```

#### 2.4.8 常见问题FAQ

**问题1：循环无法退出**
```yaml
症状: "工作流一直循环，达到max_turns才停止"
原因: "循环中缺少条件边或条件永远不满足"
解决方案:
  - "检查循环中是否有条件边"
  - "验证条件字符串是否正确"
  - "添加调试日志查看消息内容"
```

**问题2：节点未执行**
```yaml
症状: "某个节点从未被触发"
原因: "父节点依赖未满足或激活条件配置错误"
解决方案:
  - "检查节点的所有父节点是否都执行了"
  - "验证activation_condition是'all'还是'any'"
  - "使用graph_validate()检查图结构"
```

**问题3：Lambda函数无法序列化**
```yaml
症状: "保存配置时Lambda函数丢失"
原因: "Lambda函数不可序列化"
解决方案:
  - "改用字符串条件"
  - "或在代码中动态添加Lambda条件"
  - "不要依赖配置文件保存Lambda"
```

**问题4：消息历史过长**
```yaml
症状: "循环多次后响应变慢或出错"
原因: "消息历史累积导致上下文过长"
解决方案:
  - "使用MessageFilterAgent过滤消息"
  - "只保留关键消息（first/last）"
  - "考虑使用BufferedChatCompletionContext"
```

#### 2.4.9 性能优化建议

```yaml
performance_optimization:
  消息过滤:
    建议: "在循环工作流中使用MessageFilterAgent"
    效果: "减少上下文长度，提高响应速度"
    实现: "per_source过滤，只保留关键消息"
    
  并行执行:
    建议: "利用扇出模式并行处理独立任务"
    效果: "多个Agent同时执行，缩短总时间"
    注意: "AutoGen内部会按就绪队列顺序执行"
    
  终止条件:
    建议: "设置合理的max_turns和termination_condition"
    效果: "避免无限循环，节省资源"
    推荐值: "简单流程10-20轮，复杂流程30-50轮"
    
  模型选择:
    建议: "根据节点复杂度选择合适的模型"
    效果: "平衡成本和质量"
    策略: "简单节点用小模型，关键节点用大模型"
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
        team_type = team_config['type']
        
        # 根据类型创建不同的Team
        if team_type == "RoundRobinGroupChat":
            # 使用Autogen内生的RoundRobinGroupChat
            self.team = RoundRobinGroupChat(
                participants=self.agents,
                max_turns=team_config.get('max_turns', 10)
            )
        
        elif team_type == "GraphFlow":
            # 使用GraphFlow（工作流模式）
            from autogen_agentchat.teams import GraphFlow
            from autogen_agentchat.teams._group_chat._graph import DiGraphBuilder
            from autogen_agentchat.conditions import MaxMessageTermination
            
            # 构建图
            builder = DiGraphBuilder()
            
            # 添加节点
            graph_config = team_config['graph']['builder_config']
            for node_config in graph_config['nodes']:
                agent = next(a for a in self.agents if a.name == node_config['name'])
                builder.add_node(agent, activation=node_config.get('activation', 'all'))
            
            # 添加边
            for edge_config in graph_config['edges']:
                source_agent = next(a for a in self.agents if a.name == edge_config['source'])
                target_agent = next(a for a in self.agents if a.name == edge_config['target'])
                
                builder.add_edge(
                    source_agent,
                    target_agent,
                    condition=edge_config.get('condition'),  # 字符串条件或None
                    activation_group=edge_config.get('activation_group'),
                    activation_condition=edge_config.get('activation_condition', 'all')
                )
            
            # 设置入口点（如果配置了）
            if 'entry_point' in graph_config:
                entry_agent = next(a for a in self.agents if a.name == graph_config['entry_point'])
                builder.set_entry_point(entry_agent)
            
            # 构建图
            graph = builder.build()
            
            # 创建GraphFlow团队
            self.team = GraphFlow(
                participants=self.agents,
                graph=graph,
                termination_condition=MaxMessageTermination(team_config.get('max_turns', 20))
            )
        
        else:
            raise ValueError(f"不支持的Team类型: {team_type}")
    
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
        # 生成符合MD底座规范的工作流ID
        import hashlib
        timestamp = int(asyncio.get_event_loop().time())
        unique_hash = hashlib.md5(f"{timestamp}{input_data}".encode()).hexdigest()[:8]
        workflow_id = f"{workflow_type}_{timestamp}_{unique_hash}"  # 标准MD底座格式
        
        workflow_data = {
            "topic": f"{workflow_name}：{self.extract_name(result)}",
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
    
    def extract_name(self, result):
        """从工作流结果中提取名称"""
        try:
            # 实现具体的名称提取逻辑
            return str(result).split('\n')[0] if result else "未命名"
        except:
            return "未命名工作流"
    
    def get_initial_viz_state(self):
        """获取初始可视化状态"""
        return {
            "mindmap": {"selected_node": None, "zoom_level": 1.0},
            "swimlane": {"active_lane": "idea", "filters": []},
            "detail_panel": {"open": False},
            "relation_view": {"visible": False},
            "chart_panel": {"active_chart": None}
        }
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
