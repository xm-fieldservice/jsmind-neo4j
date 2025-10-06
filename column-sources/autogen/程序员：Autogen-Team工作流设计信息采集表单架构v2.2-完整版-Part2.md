# v2.2 Part2: 第3步协作方式（含GraphFlow）

### 第3步：协作方式 ⭐⭐⭐ v2.1/v2.2 重大更新

```yaml
wizard_step_3:
  title: "🤝 Agent之间如何协作？"
  description: "选择最适合您工作流的协作方式"
  
  # ===== v2.2 新增：模式分类器 =====
  mode_classifier:
    title: "首先，选择协作模式"
    description: "根据您的需求选择合适的模式"
    
    categories:
      - category_id: "conversation_mode"
        label: "💬 对话模式"
        description: "Agent通过对话协作，适合灵活的交互场景"
        icon: "chat"
        characteristics:
          - "Agent自主决策"
          - "灵活的对话流"
          - "适合不确定的执行路径"
        team_types:
          - "RoundRobinGroupChat"
          - "SelectorGroupChat"
          - "Swarm"
          - "MagenticOneGroupChat"
        recommended_for:
          - "需要灵活对话"
          - "Agent自主决策"
          - "不确定的执行路径"
          - "探索性任务"
      
      - category_id: "workflow_mode"
        label: "🔀 工作流模式"
        description: "基于有向图的确定性执行，适合固定流程"
        icon: "flowchart"
        characteristics:
          - "确定性执行"
          - "严格控制顺序"
          - "支持分支和循环"
          - "可并行执行"
        team_types:
          - "GraphFlow"
        recommended_for:
          - "确定性流程"
          - "需要严格控制顺序"
          - "包含分支和循环"
          - "需要并行执行"
        note: "⭐ 如果您在第2步设计了节点流程，强烈推荐使用此模式"
        highlight: true
  
  visual_selector:
    type: "card_selector"
    layout: "grid"
    group_by: "category"
    
    # ===== 对话模式Team类型 =====
    conversation_mode_teams:
      - value: "RoundRobinGroupChat"
        label: "按顺序依次执行"
        icon: "→→→"
        category: "conversation_mode"
        description: "Agent按照固定顺序轮流工作"
        适用场景:
          - "流程明确，步骤固定"
          - "每个步骤必须按顺序完成"
          - "例如：想法 → 规划 → 执行 → 验收"
        diagram_preview: |
          ```mermaid
          graph LR
          A[Agent1] --> B[Agent2] --> C[Agent3] --> D[Agent4]
          ```
        recommended: true
        auto_select_if: "workflow_pattern == 'sequential' && !has_branches && !has_loops"
        parameters:
          - "participants"
          - "max_turns"
          - "termination_condition"
      
      - value: "SelectorGroupChat"
        label: "根据情况智能选择"
        icon: "🔀"
        category: "conversation_mode"
        description: "AI根据当前情况选择最合适的Agent"
        适用场景:
          - "需要根据条件判断"
          - "不同情况走不同流程"
          - "例如：根据问题类型选择专家"
        diagram_preview: |
          ```mermaid
          graph TD
          S[Selector] -->|条件1| A[Agent1]
          S -->|条件2| B[Agent2]
          S -->|条件3| C[Agent3]
          ```
        auto_select_if: "workflow_pattern == 'conditional' && !has_loops"
        parameters:
          - "participants"
          - "model_client"
          - "selector_prompt"
          - "allow_repeated_speaker"
          - "max_selector_attempts"
      
      - value: "MagenticOneGroupChat"
        label: "复杂协作模式"
        icon: "🕸️"
        category: "conversation_mode"
        description: "多Agent复杂协同，适合高级场景"
        适用场景:
          - "多Agent需要互相配合"
          - "复杂的协作逻辑"
          - "需要编排和调度"
        diagram_preview: |
          ```mermaid
          graph TD
          O[Orchestrator] --> A1[Agent1]
          O --> A2[Agent2]
          O --> A3[Agent3]
          A1 <--> A2
          A2 <--> A3
          ```
        advanced: true
        parameters:
          - "participants"
          - "model_client"
          - "max_stalls"
          - "final_answer_prompt"
      
      - value: "Swarm"
        label: "蜂群模式（实验性）"
        icon: "🐝"
        category: "conversation_mode"
        description: "Agent自主切换，灵活协作"
        适用场景:
          - "Agent需要自主决策"
          - "动态切换执行者"
          - "实验性功能"
        diagram_preview: |
          ```mermaid
          graph LR
          A1[Agent1] -.切换.-> A2[Agent2]
          A2 -.切换.-> A3[Agent3]
          A3 -.切换.-> A1
          ```
        experimental: true
        parameters:
          - "participants"
          - "max_turns"
    
    # ===== v2.1/v2.2 新增：工作流模式Team类型 =====
    workflow_mode_teams:
      - value: "GraphFlow"
        label: "工作流图执行（推荐用于确定性流程）⭐"
        icon: "🔀"
        category: "workflow_mode"
        description: "基于有向图的精确工作流控制，支持顺序、并行、分支、循环"
        
        # ===== v2.2 新增：实验性功能警告 =====
        experimental_warning:
          show: true
          level: "warning"
          message: |
            🧪 **实验性功能警告**
            
            GraphFlow是Autogen 0.7.1的实验性功能：
            - API可能在未来版本中变化
            - 某些边缘情况可能不稳定
            - 建议在生产环境前充分测试
            
            官方文档：https://microsoft.github.io/autogen/dev/user-guide/agentchat-user-guide/graph-flow.html
        
        适用场景:
          - "需要严格控制执行顺序"
          - "包含条件分支和循环"
          - "确定性的多步骤流程"
          - "需要并行执行某些步骤"
        
        autogen_support: "0.7.1+"
        experimental: true
        recommended_for_node_design: true
        
        diagram_preview: |
          ```mermaid
          graph TD
          A[Agent1] --> B[Agent2]
          B -->|条件1| C[Agent3]
          B -->|条件2| D[Agent4]
          C --> E[Agent5]
          D --> E
          E -.循环.-> B
          ```
        
        key_features:
          - feature: "顺序链"
            description: "A → B → C 顺序执行"
            icon: "→"
          
          - feature: "并行扇出"
            description: "A → (B, C) 并行执行"
            icon: "⇉"
          
          - feature: "条件分支"
            description: "根据条件选择路径"
            icon: "◇"
          
          - feature: "循环控制"
            description: "带退出条件的循环"
            icon: "↻"
        
        # ===== v2.2 新增：GraphFlow完整参数列表 =====
        parameters:
          required:
            - param: "participants"
              type: "List[ChatAgent]"
              description: "参与的Agent列表"
            
            - param: "graph"
              type: "DiGraph"
              description: "有向图对象，定义执行流程"
              note: "⭐ 这是GraphFlow最核心的参数"
              builder: "DiGraphBuilder"
              builder_methods:
                - "add_node(agent, activation='all')"
                - "add_edge(source, target, condition=None, activation_group=None)"
                - "set_entry_point(agent)"
                - "build()"
          
          optional:
            - param: "name"
              type: "str | None"
              default: null
            
            - param: "description"
              type: "str | None"
              default: null
            
            - param: "termination_condition"
              type: "TerminationCondition | None"
              default: null
            
            - param: "max_turns"
              type: "int | None"
              default: null
            
            - param: "runtime"
              type: "AgentRuntime | None"
              default: null
            
            - param: "custom_message_types"
              type: "List[type[BaseAgentEvent | BaseChatMessage]] | None"
              default: null
        
        # ===== v2.2 新增：图构建配置 =====
        graph_builder_config:
          title: "图构建配置"
          description: "定义节点和边的连接关系"
          
          node_config:
            - field: "activation"
              type: "Literal['all', 'any']"
              default: "all"
              description: "节点激活条件"
          
          edge_config:
            - field: "condition"
              type: "Union[str, Callable, None]"
              description: "边的执行条件"
              types:
                - "None: 无条件，总是执行"
                - "str: 字符串匹配（推荐）✅"
                - "Callable: Lambda或命名函数 ⚠️"
            
            - field: "activation_group"
              type: "str"
              default: "target_node_name"
              description: "激活组标识"
            
            - field: "activation_condition"
              type: "Literal['all', 'any']"
              default: "all"
              description: "激活条件类型"
          
          entry_point:
            required_if: "no_source_nodes"
            description: "如果没有源节点（入度为0的节点），必须设置入口点"
        
        # ===== v2.2 新增：图验证规则 =====
        graph_validation:
          auto_validate: true
          validation_rules:
            - rule_id: "cycle_exit_check"
              name: "循环退出条件检查"
              severity: "error"
              description: "所有循环必须包含至少一个条件边作为退出机制"
              check_logic: "DiGraph.has_cycles_with_exit()"
              error_message: |
                ❌ 检测到没有退出条件的循环！
                
                循环路径：{cycle_path}
                
                问题：循环中的所有边都是无条件的，会导致无限循环。
                
                解决方案：
                1. 为循环中的某条边添加条件
                2. 确保条件最终会为False，退出循环
                
                示例：
                - 字符串条件："APPROVE"
                - Lambda条件：lambda msg: "APPROVE" in msg.to_model_text()
              
              example_fix: |
                ```python
                # 错误示例（无限循环）
                builder.add_edge(agent_a, agent_b)
                builder.add_edge(agent_b, agent_a)  # ❌ 无条件循环
                
                # 正确示例（有退出条件）
                builder.add_edge(agent_a, agent_b)
                builder.add_edge(agent_b, agent_c, condition="APPROVE")  # ✅ 退出
                builder.add_edge(agent_b, agent_a, condition=lambda msg: "APPROVE" not in msg.to_model_text())  # ✅ 循环
                ```
            
            - rule_id: "entry_point_check"
              name: "入口点检查"
              severity: "error"
              description: "如果没有源节点，必须设置入口点"
              error_message: |
                ❌ 图中没有源节点，必须设置入口点！
                
                解决方案：
                builder.set_entry_point(agent_name)
            
            - rule_id: "unreachable_node_check"
              name: "不可达节点检查"
              severity: "warning"
              description: "检查是否有节点无法从入口点到达"
              error_message: |
                ⚠️ 节点 {node_name} 无法从入口点到达
                
                建议：
                - 检查边的连接关系
                - 确保所有节点都在执行路径上
        
        code_generation_template: |
          ```python
          from autogen_agentchat.teams import DiGraphBuilder, GraphFlow
          from autogen_agentchat.conditions import MaxMessageTermination
          
          # 构建图
          builder = DiGraphBuilder()
          
          # 添加节点
          builder.add_node(agent_a, activation="all")
          builder.add_node(agent_b, activation="all")
          builder.add_node(agent_c, activation="any")
          
          # 添加边
          builder.add_edge(agent_a, agent_b)
          builder.add_edge(agent_b, agent_c, condition="APPROVE")
          builder.add_edge(agent_b, agent_a, 
                          condition=lambda msg: "APPROVE" not in msg.to_model_text(),
                          activation_group="feedback")
          
          # 设置入口点（如果需要）
          builder.set_entry_point(agent_a)
          
          # 构建图
          graph = builder.build()
          
          # 创建团队
          team = GraphFlow(
              participants=[agent_a, agent_b, agent_c],
              graph=graph,
              termination_condition=MaxMessageTermination(20)
          )
          ```
  
  # ===== v2.2 新增：AI推荐逻辑增强 =====
  ai_recommendation:
    trigger: "on_step_enter"
    based_on:
      - "workflow_pattern"
      - "node_count"
      - "has_decision_nodes"
      - "has_loops"
      - "has_parallel"
    
    recommendation_logic:
      - if: "has_sequential_nodes && !has_loops && !has_branches"
        recommend_mode: "conversation"
        recommend_team: "RoundRobinGroupChat"
        reason: "您的流程是简单的顺序执行，对话模式更灵活"
        confidence: 0.9
      
      - if: "has_branches || has_loops || has_parallel"
        recommend_mode: "workflow"
        recommend_team: "GraphFlow"
        reason: "您的流程包含分支/循环/并行，需要GraphFlow的精确控制"
        confidence: 0.95
        highlight: true
      
      - if: "has_decision_nodes && !has_loops"
        recommend_mode: "conversation"
        recommend_team: "SelectorGroupChat"
        reason: "您有决策节点但无循环，Selector可以智能选择"
        confidence: 0.8
      
      - if: "node_count > 6 && has_complex_logic"
        recommend_mode: "workflow"
        recommend_team: "GraphFlow"
        reason: "复杂流程建议使用GraphFlow确保可控性"
        confidence: 0.85
    
    message_template: |
      🤖 **AI推荐**
      
      根据您的工作流特点，我推荐使用：
      
      **模式**：{recommended_mode}
      **Team类型**：{recommended_team}
      
      **原因**：{reason}
      
      **置信度**：{confidence * 100}%
```

**程序员**

（Part2完成，包含完整的第3步协作方式，重点是GraphFlow的详细配置、验证规则和AI推荐逻辑）
