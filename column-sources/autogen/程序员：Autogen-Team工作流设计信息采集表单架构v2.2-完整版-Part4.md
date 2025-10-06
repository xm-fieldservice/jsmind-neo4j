# v2.2 Part4: 第7步和高级模式

### 第7步：预览和生成

```yaml
wizard_step_7:
  title: "✅ 预览和生成"
  description: "检查配置并生成工作流文件"
  
  layout: "two_column"
  
  left_column:
    - component_id: "workflow_summary"
      type: "summary_card"
      title: "📊 工作流摘要"
      
      sections:
        - title: "基本信息"
          fields:
            - label: "工作流名称"
              value: "{workflow_name}"
            - label: "节点数量"
              value: "{node_count}个"
            - label: "Team类型"
              value: "{team_type_label}"
            - label: "最大轮次"
              value: "{max_turns}轮"
            - label: "工作流模式"  # v2.2新增
              value: "{workflow_mode}"  # 对话/工作流
        
        - title: "节点列表"
          type: "node_list"
          show_for_each_node:
            - "节点{order}: {node_name}"
            - "输入: {node_input}"
            - "输出: {node_output}"
        
        - title: "Agent配置"
          show_for_each_agent:
            - "{agent_name}"
            - "知识库: {has_knowledge ? '是' : '否'}"
            - "工具: {has_tools ? '是' : '否'}"
    
    # ===== v2.2 新增：图验证结果 =====
    - component_id: "graph_validation_result"
      type: "validation_panel"
      title: "🔍 图结构验证"
      show_if: "team_type == 'GraphFlow'"
      auto_validate: true
      
      validation_items:
        - check: "cycle_exit_check"
          label: "循环退出条件检查"
          severity: "error"
          status: "auto"
        
        - check: "entry_point_check"
          label: "入口点检查"
          severity: "error"
          status: "auto"
        
        - check: "unreachable_node_check"
          label: "不可达节点检查"
          severity: "warning"
          status: "auto"
        
        - check: "activation_group_check"
          label: "激活组配置检查"
          severity: "warning"
          status: "auto"
    
    - component_id: "compliance_check"
      type: "checklist"
      title: "🔍 规范合规性检查"
      auto_check: true
      
      items:
        - id: "check_node_count"
          label: "节点数量合理（2-10个）"
          status: "auto"
        
        - id: "check_io_complete"
          label: "所有节点输入输出已定义"
          status: "auto"
        
        - id: "check_agent_config"
          label: "所有Agent已配置"
          status: "auto"
        
        - id: "check_team_type"
          label: "Team类型符合工作流模式"
          status: "auto"
        
        - id: "check_autogen_compliance"
          label: "符合Autogen 0.7.1规范"
          status: "auto"
        
        # ===== v2.2 新增：GraphFlow特定检查 =====
        - id: "check_graph_structure"
          label: "图结构有效（仅GraphFlow）"
          status: "auto"
          show_if: "team_type == 'GraphFlow'"
        
        - id: "check_condition_serializable"
          label: "条件可序列化（无Lambda）"
          status: "auto"
          show_if: "team_type == 'GraphFlow'"
          warning_if_fail: "Lambda函数无法保存到配置文件"
  
  right_column:
    - component_id: "final_diagram"
      type: "interactive_flowchart"
      title: "📊 最终工作流图"
      editable: false
      download: true
      formats: ["PNG", "SVG", "PDF"]
      
      # ===== v2.2 新增：GraphFlow特殊渲染 =====
      graphflow_rendering:
        show_if: "team_type == 'GraphFlow'"
        features:
          - "显示激活组"
          - "标注条件边"
          - "高亮循环路径"
          - "标记入口点"
    
    - component_id: "config_preview_tabs"
      type: "tabbed_code_viewer"
      title: "⚙️ 生成的配置文件"
      
      tabs:
        - tab_id: "agents_config"
          title: "agents_config.yaml"
          language: "yaml"
          download: true
        
        - tab_id: "data_schema"
          title: "data_schema.yaml"
          language: "yaml"
          download: true
        
        - tab_id: "run_script"
          title: "run_{workflow_type}.py"
          language: "python"
          download: true
        
        # ===== v2.2 新增：GraphFlow专用脚本 =====
        - tab_id: "graph_builder_script"
          title: "build_graph_{workflow_type}.py"
          language: "python"
          download: true
          show_if: "team_type == 'GraphFlow'"
          description: "GraphFlow图构建脚本"
  
  actions:
    - action_id: "generate_all"
      label: "🚀 生成工作流"
      type: "primary"
      size: "large"
      confirm: "确认生成工作流文件？"
      output_directory: "./column-sources/autogen/workflows/{workflow_type}/"
      
      # ===== v2.2 新增：GraphFlow生成逻辑 =====
      generation_logic:
        if_graphflow:
          generate_files:
            - "agents_config.yaml"
            - "graph_config.yaml"  # GraphFlow专用
            - "build_graph_{workflow_type}.py"
            - "run_{workflow_type}.py"
            - "README.md"
        else:
          generate_files:
            - "agents_config.yaml"
            - "data_schema.yaml"
            - "run_{workflow_type}.py"
            - "README.md"
    
    - action_id: "save_draft"
      label: "💾 保存草稿"
      type: "secondary"
    
    - action_id: "back_to_edit"
      label: "← 返回修改"
      type: "secondary"
```

---

## ⚙️ 高级模式设计

### 高级模式布局

```yaml
advanced_mode:
  layout: "three_column"
  
  left_column:
    width: "30%"
    components:
      - "参数导航树"
      - "快速搜索"
  
  center_column:
    width: "40%"
    components:
      - "参数表单"
      - "实时验证"
  
  right_column:
    width: "30%"
    components:
      - "实时流程图"
      - "配置预览"
      - "AI建议"
```

### 参数分组（完整Team参数）

```yaml
advanced_parameters:
  groups:
    - group_id: "basic"
      title: "基础参数"
      icon: "📋"
      
      params:
        - param_id: "participants"
          label: "participants"
          type: "List[ChatAgent | Team]"
          required: true
          description: "参与者列表"
          editor: "agent_list_editor"
          validation: "min_length: 2"
        
        - param_id: "name"
          label: "name"
          type: "str | None"
          required: false
          description: "Team名称"
          placeholder: "my_team"
        
        - param_id: "description"
          label: "description"
          type: "str | None"
          required: false
          description: "Team描述"
          multiline: true
    
    - group_id: "termination"
      title: "终止条件"
      icon: "⏹️"
      
      params:
        - param_id: "termination_condition"
          label: "termination_condition"
          type: "TerminationCondition | None"
          required: false
          description: "终止条件对象"
          editor: "termination_builder"
          options:
            - "MaxMessageTermination"
            - "TextMentionTermination"
            - "StopMessageTermination"
            - "Custom"
        
        - param_id: "max_turns"
          label: "max_turns"
          type: "int | None"
          required: false
          description: "最大轮次"
          default: 20
          min: 1
          max: 100
    
    - group_id: "runtime"
      title: "运行时参数"
      icon: "⚡"
      
      params:
        - param_id: "runtime"
          label: "runtime"
          type: "AgentRuntime | None"
          required: false
          description: "代理运行时"
          advanced: true
        
        - param_id: "custom_message_types"
          label: "custom_message_types"
          type: "List[type[BaseAgentEvent | BaseChatMessage]] | None"
          required: false
          description: "自定义消息类型"
          advanced: true
        
        - param_id: "emit_team_events"
          label: "emit_team_events"
          type: "bool"
          required: false
          default: false
          description: "发出团队事件"
    
    - group_id: "selector_specific"
      title: "SelectorGroupChat特有参数"
      icon: "🔀"
      show_if: "team_type == 'SelectorGroupChat'"
      
      params:
        - param_id: "model_client"
          label: "model_client"
          type: "ChatCompletionClient"
          required: true
          description: "模型客户端"
          editor: "model_client_builder"
        
        - param_id: "selector_prompt"
          label: "selector_prompt"
          type: "str"
          required: false
          description: "选择器提示词"
          multiline: true
          default: "默认选择器提示词..."
        
        - param_id: "allow_repeated_speaker"
          label: "allow_repeated_speaker"
          type: "bool"
          required: false
          default: false
          description: "允许重复发言者"
        
        - param_id: "max_selector_attempts"
          label: "max_selector_attempts"
          type: "int"
          required: false
          default: 3
          description: "最大选择尝试次数"
        
        - param_id: "selector_func"
          label: "selector_func"
          type: "Optional[SelectorFuncType]"
          required: false
          description: "自定义选择函数"
          advanced: true
          note: "不可序列化，配置文件中会被忽略"
        
        - param_id: "candidate_func"
          label: "candidate_func"
          type: "Optional[CandidateFuncType]"
          required: false
          description: "候选函数"
          advanced: true
          note: "不可序列化，配置文件中会被忽略"
        
        - param_id: "model_client_streaming"
          label: "model_client_streaming"
          type: "bool"
          required: false
          default: false
          description: "模型客户端流式处理"
        
        - param_id: "model_context"
          label: "model_context"
          type: "ChatCompletionContext | None"
          required: false
          description: "模型上下文"
          editor: "context_builder"
          options:
            - "UnboundedChatCompletionContext"
            - "BufferedChatCompletionContext"
    
    - group_id: "magentic_specific"
      title: "MagenticOneGroupChat特有参数"
      icon: "🕸️"
      show_if: "team_type == 'MagenticOneGroupChat'"
      
      params:
        - param_id: "model_client"
          label: "model_client"
          type: "ChatCompletionClient"
          required: true
          description: "模型客户端"
        
        - param_id: "max_stalls"
          label: "max_stalls"
          type: "int"
          required: false
          default: 3
          description: "最大停滞次数"
        
        - param_id: "final_answer_prompt"
          label: "final_answer_prompt"
          type: "str"
          required: false
          description: "最终答案提示"
          multiline: true
    
    # ===== v2.1/v2.2 新增：GraphFlow特有参数 =====
    - group_id: "graphflow_specific"
      title: "GraphFlow特有参数 ⭐"
      icon: "🔀"
      show_if: "team_type == 'GraphFlow'"
      
      params:
        - param_id: "graph"
          label: "graph"
          type: "DiGraph"
          required: true
          description: "有向图对象（核心参数）⭐"
          editor: "graph_builder"
          note: "通过DiGraphBuilder构建"
          
          builder_interface:
            class: "DiGraphBuilder"
            methods:
              - method: "add_node"
                signature: "add_node(agent, activation='all')"
                description: "添加节点"
              
              - method: "add_edge"
                signature: "add_edge(source, target, condition=None, activation_group=None, activation_condition='all')"
                description: "添加边"
              
              - method: "set_entry_point"
                signature: "set_entry_point(agent)"
                description: "设置入口点"
              
              - method: "build"
                signature: "build() -> DiGraph"
                description: "构建并验证图"
```

**程序员**

（Part4完成，包含第7步预览生成和高级模式的主要参数分组）
