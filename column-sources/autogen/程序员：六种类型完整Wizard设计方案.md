# 六种类型完整Wizard设计方案

**文档类型**: 完整设计方案  
**创建时间**: 2025-10-06  
**作者**: 程序员  
**版本**: v1.0  
**目标**: 为6种类型（1个单Agent + 5个Team）设计完整的业务语言Wizard

---

## 📊 六种类型对比分析

### 类型1：单一Agent（AssistantAgent）

**适用场景**：
- 简单的问答助手
- 单一功能的工具Agent
- 独立的数据处理

**核心参数**：
```yaml
必需参数:
  - name: str - Agent名称
  - model_client: ChatCompletionClient - 模型客户端
  - system_message: str - 系统提示词

可选参数:
  - tools: List[Tool] - 工具列表
  - handoffs: List[Handoff] - 移交配置
  - model_context: ChatCompletionContext - 模型上下文
  - description: str - 描述
```

**业务问卷**：
```yaml
wizard_questions:
  - question: "这个AI助手要完成什么任务？"
    field: workflow_description
    type: textarea
    example: "回答客户关于产品的常见问题"
  
  - question: "需要什么样的专业能力？"
    field: agent_expertise
    type: text
    example: "产品知识专家"
  
  - question: "需要使用什么工具？"
    field: tools_needed
    type: multi_select
    options: ["搜索", "数据库查询", "API调用", "文件操作"]
```

---

### 类型2：RoundRobinGroupChat（顺序协作）

**适用场景**：
- 固定顺序的多步骤流程
- 每个步骤独立且不需要条件判断
- 简单的流水线处理

**核心参数**：
```yaml
必需参数:
  - participants: List[ChatAgent | Team] - 参与者列表
  
可选参数:
  - name: str - 团队名称
  - description: str - 团队描述
  - termination_condition: TerminationCondition - 终止条件
  - max_turns: int - 最大轮次
  - runtime: AgentRuntime - 运行时
```

**业务问卷**：
```yaml
wizard_questions:
  - question: "工作流程有哪些步骤？"
    field: workflow_steps
    type: textarea
    placeholder: "例如：\n1. 接收客户咨询\n2. 分析问题类型\n3. 查找解决方案\n4. 生成回复"
    ai_assist: true
  
  - question: "每个步骤的职责是什么？"
    field: step_responsibilities
    type: dynamic_list
    auto_generate_from: workflow_steps
  
  - question: "最多讨论多少轮？"
    field: max_turns
    type: number_slider
    min: 5
    max: 100
    default: 20
```

**AI推荐逻辑**：
```javascript
if (pattern === 'sequential' && !has_branches && !has_loops) {
  recommend: "RoundRobinGroupChat"
  confidence: 0.95
  reason: "您的工作流是顺序执行，无分支和循环"
}
```

---

### 类型3：SelectorGroupChat（智能选择）

**适用场景**：
- 需要根据情况动态选择专家
- 有多个专业领域的Agent
- 需要智能路由的场景

**核心参数**：
```yaml
必需参数:
  - participants: List[ChatAgent | Team] - 参与者列表
  - model_client: ChatCompletionClient - 模型客户端
  - selector_prompt: str - 选择器提示词

可选参数:
  - allow_repeated_speaker: bool - 允许重复发言者
  - max_selector_attempts: int - 最大选择尝试次数
  - selector_func: SelectorFuncType - 自定义选择函数
  - candidate_func: CandidateFuncType - 候选函数
  - max_turns: int - 最大轮次
```

**业务问卷**：
```yaml
wizard_questions:
  - question: "有哪些专业领域的专家？"
    field: expert_domains
    type: dynamic_list
    example: ["技术支持专家", "销售顾问", "售后服务专家"]
  
  - question: "什么情况下选择哪个专家？"
    field: selection_rules
    type: conditional_mapping
    format: "当{条件}时，选择{专家}"
    example: "当客户询问技术问题时，选择技术支持专家"
  
  - question: "决策依据是什么？"
    field: decision_criteria
    type: textarea
    ai_assist: true
```

**AI推荐逻辑**：
```javascript
if (has_multiple_domains && needs_dynamic_routing) {
  recommend: "SelectorGroupChat"
  confidence: 0.90
  reason: "您的工作流需要根据情况智能选择专家"
}
```

---

### 类型4：GraphFlow（工作流图）

**适用场景**：
- 有明确的分支和循环
- 需要条件判断
- 复杂的审批流程

**核心参数**：
```yaml
必需参数:
  - participants: List[ChatAgent | Team] - 参与者列表
  - graph: DiGraph - 有向图对象

可选参数:
  - termination_condition: TerminationCondition - 终止条件
  - max_turns: int - 最大轮次
```

**业务问卷**：
```yaml
wizard_questions:
  - question: "流程中有哪些决策点？"
    field: decision_points
    type: dynamic_list
    example: ["审核通过/拒绝", "质量达标/需改进"]
  
  - question: "什么条件下走不同分支？"
    field: branch_conditions
    type: conditional_mapping
    format: "当{条件}时，转到{节点}"
  
  - question: "是否需要循环或退回？"
    field: has_loops
    type: yes_no
    if_yes: "请描述循环条件"
  
  - question: "循环的退出条件是什么？"
    field: loop_exit_condition
    type: text
    show_if: has_loops === true
    required: true
```

**AI推荐逻辑**：
```javascript
if (has_branches || has_loops || has_parallel) {
  recommend: "GraphFlow"
  confidence: 0.95
  reason: "您的工作流包含分支/循环/并行，需要GraphFlow的精确控制"
  warning: "GraphFlow是实验性功能，建议充分测试"
}
```

---

### 类型5：Swarm（蜂群协作）

**适用场景**：
- Agent之间需要动态移交
- 基于上下文变量的协作
- 灵活的任务分配

**核心参数**：
```yaml
必需参数:
  - participants: List[ChatAgent] - 参与者列表（仅ChatAgent）

可选参数:
  - name: str - 团队名称
  - description: str - 团队描述
  - termination_condition: TerminationCondition - 终止条件
  - max_turns: int - 最大轮次
```

**业务问卷**：
```yaml
wizard_questions:
  - question: "Agent之间如何移交任务？"
    field: handoff_rules
    type: dynamic_mapping
    example: "当需要专业分析时，移交给分析专家"
  
  - question: "需要共享哪些上下文信息？"
    field: context_variables
    type: multi_select
    options: ["用户信息", "历史记录", "当前状态", "任务进度"]
  
  - question: "谁来决定移交？"
    field: handoff_decision
    type: select
    options: ["Agent自主决定", "用户指定", "系统规则"]
```

**AI推荐逻辑**：
```javascript
if (needs_dynamic_handoff && has_context_sharing) {
  recommend: "Swarm"
  confidence: 0.85
  reason: "您的工作流需要Agent之间动态移交和上下文共享"
}
```

---

### 类型6：MagenticOneGroupChat（复杂协作）

**适用场景**：
- 非常复杂的多Agent协作
- 需要协调者（Ledger Agent）
- 有停滞检测和恢复机制

**核心参数**：
```yaml
必需参数:
  - participants: List[ChatAgent] - 参与者列表（仅ChatAgent）
  - model_client: ChatCompletionClient - 模型客户端

特有参数:
  - max_stalls: int - 最大停滞次数
  - final_answer_prompt: str - 最终答案提示

可选参数:
  - max_turns: int - 最大轮次（默认20）
  - termination_condition: TerminationCondition - 终止条件
```

**业务问卷**：
```yaml
wizard_questions:
  - question: "需要什么样的协作模式？"
    field: collaboration_mode
    type: textarea
    placeholder: "描述Agent之间如何协作完成复杂任务"
  
  - question: "谁来协调整个流程？"
    field: coordinator_role
    type: text
    default: "系统自动协调"
  
  - question: "如何处理工作流停滞？"
    field: stall_handling
    type: select
    options: ["自动重试", "切换Agent", "请求人工介入"]
  
  - question: "最多容忍几次停滞？"
    field: max_stalls
    type: number
    min: 1
    max: 10
    default: 3
```

**AI推荐逻辑**：
```javascript
if (is_very_complex || node_count > 6) {
  recommend: "MagenticOneGroupChat"
  confidence: 0.85
  reason: "您的工作流非常复杂，建议使用高级协作模式"
}
```

---

## 🎯 统一Wizard流程设计

### 方案A：单页面动态流程 ⭐ 推荐

```yaml
统一流程:
  第1步: 基本信息
    - 名称、描述
  
  第2步: AI智能分析
    - 分析工作流模式
    - 推荐类型（6选1）
    - 展示推荐理由和置信度
  
  第3步: 确认或调整
    - 接受AI推荐
    - 或手动选择其他类型
  
  第4步: 类型特定问卷（动态）
    - 根据选择的类型显示对应问卷
    - 6种类型6套问卷
  
  第5步: Agent配置（动态）
    - 单Agent：配置1个Agent
    - Team：配置多个Agent
  
  第6步: 预览和生成
    - 配置预览
    - 生成文件

优势:
  - ✅ 统一入口，用户体验连贯
  - ✅ AI智能推荐，降低选择难度
  - ✅ 动态问卷，避免冗余
  - ✅ 代码复用率高

实现复杂度: 中等（约1000行）
```

### 方案B：分离页面

```yaml
页面1: agent-wizard.html
  - 专注单Agent设计
  - 3-4步简化流程
  
页面2: team-wizard.html
  - 专注Team设计
  - 7步完整流程
  - 5种Team类型

优势:
  - ✅ 关注点分离
  - ✅ 每个页面更简洁
  - ✅ 易于维护

劣势:
  - ❌ 用户需要先判断用哪个页面
  - ❌ 代码重复（两个页面）

实现复杂度: 低（每个页面约600行）
```

---

## 📋 推荐实现方案

### 最终推荐：**方案A（单页面动态流程）**

**理由**：
1. **符合v2.2架构设计**：混合模式，AI智能辅助
2. **用户体验最佳**：一站式完成所有设计
3. **扩展性强**：未来添加新类型只需加配置

### 实现步骤

#### 第1阶段：核心框架（2-3小时）
```javascript
// 类型配置注册表
const typeConfigs = {
  single_agent: { /* 配置 */ },
  round_robin: { /* 配置 */ },
  selector: { /* 配置 */ },
  graph_flow: { /* 配置 */ },
  swarm: { /* 配置 */ },
  magentic_one: { /* 配置 */ }
};

// 动态问卷渲染器
class DynamicQuestionnaireRenderer {
  render(typeConfig) {
    // 根据配置渲染问卷
  }
}

// AI推荐引擎
class AIRecommendationEngine {
  analyze(userInput) {
    // 分析并推荐类型
  }
}
```

#### 第2阶段：6种类型配置（3-4小时）
- 为每种类型编写完整的问卷配置
- 定义AI推荐逻辑
- 配置参数映射规则

#### 第3阶段：集成和测试（2-3小时）
- 集成AI辅助后端
- 配置生成逻辑
- 端到端测试

**总工时预估**：7-10小时

---

## 🤔 关键决策点

### 决策1：是否合并到当前页面？

**建议**：**否，创建新页面**

**理由**：
1. 当前页面已经有一定实现，改动成本高
2. 新页面可以从零开始，架构更清晰
3. 两个页面可以并存，逐步迁移

**文件命名**：
- `workflow-wizard-v3.html` - 新的完整版
- `workflow-form-wizard.html` - 保留当前版本

### 决策2：AI辅助功能如何实现？

**建议**：**复用现有app_agent.py**

```python
# 在 app_agent.py 中添加
@app.post("/api/workflow/recommend-type")
async def recommend_workflow_type(request: WorkflowAnalysisRequest):
    """AI分析并推荐工作流类型"""
    # 调用AI Agent分析
    # 返回推荐结果
    pass

@app.post("/api/workflow/generate-questionnaire")
async def generate_questionnaire(request: QuestionnaireRequest):
    """根据类型生成问卷答案"""
    # AI辅助填充问卷
    pass
```

---

## ✅ 行动建议

### 立即行动
1. **创建新文件**：`workflow-wizard-v3.html`
2. **实现核心框架**：动态问卷系统
3. **配置6种类型**：问卷和推荐逻辑

### 后续优化
1. **集成AI后端**：实现真正的智能推荐
2. **完善可视化**：实时流程图预览
3. **添加模板库**：常用场景快速开始

---

**程序员**

**需要我现在就开始实现workflow-wizard-v3.html吗？**
