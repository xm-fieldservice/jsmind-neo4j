# v2.2 Part3: 第4-5步（执行控制和Agent配置）

### 第4步：执行控制

```yaml
wizard_step_4:
  title: "⚡ 工作流执行控制"
  description: "设置工作流的执行规则"
  
  fields:
    - field_id: "max_turns"
      label: "最多讨论多少轮？"
      type: "slider_with_input"
      min: 5
      max: 100
      default: 20
      marks:
        5: "快速"
        20: "一般"
        50: "深入"
        100: "充分"
      help_text: "轮次越多，讨论越深入，但耗时越长"
      recommendation: |
        - 简单工作流：5-10轮
        - 一般工作流：15-30轮
        - 复杂工作流：30-50轮
      visual: "max_turns_indicator_in_diagram"
    
    - field_id: "termination_conditions"
      label: "什么情况下停止工作流？"
      type: "checkbox_group"
      options:
        - value: "max_turns"
          label: "达到最大轮次自动停止"
          checked: true
          disabled: true
          help_text: "防止无限循环，必选"
        
        - value: "task_complete"
          label: "Agent完成任务后停止"
          checked: true
          help_text: "Agent说"完成"或"TERMINATE"时停止"
          config:
            keywords: ["完成", "TERMINATE", "DONE"]
        
        - value: "user_approval"
          label: "需要用户确认后停止"
          checked: false
          help_text: "每个阶段需要用户批准才继续"
        
        - value: "custom_condition"
          label: "自定义停止条件"
          checked: false
          help_text: "高级用户可自定义"
          show_advanced_config: true
      visual: "termination_badge_in_diagram"
    
    - field_id: "timeout_settings"
      label: "超时设置（可选）"
      type: "collapsible_section"
      collapsed: true
      
      fields:
        - field_id: "enable_timeout"
          label: "启用超时控制"
          type: "checkbox"
          default: false
        
        - field_id: "timeout_seconds"
          label: "超时时间（秒）"
          type: "number"
          show_if: "enable_timeout == true"
          default: 300
          min: 60
          max: 3600
          help_text: "单个Agent执行超过此时间将中断"
```

---

### 第5步：Agent配置

```yaml
wizard_step_5:
  title: "🤖 为每个节点配置AI Agent"
  description: "每个节点由一个专业的AI Agent执行"
  
  auto_generate_from: "nodes_from_step_2"
  
  for_each_node:
    display_mode: "accordion"  # 手风琴展开
    
    header:
      show: "节点{order}: {node_name}"
      icon: "🤖"
      status_indicator: "configured|pending"
    
    fields:
      - field_id: "agent_name"
        label: "Agent名称"
        type: "text"
        auto_generate: "{node_name}_agent"
        editable: true
        help_text: "给这个Agent起个名字"
        example: "问题分析_agent"
      
      - field_id: "agent_expertise"
        label: "这个Agent擅长什么？"
        type: "textarea"
        rows: 3
        placeholder: "用简单的语言描述这个Agent的专业能力..."
        required: true
        ai_assist: true
        ai_assist_prompt: |
          基于节点信息自动生成：
          - 节点名称：{node_name}
          - 节点描述：{node_description}
          - 输入：{node_input}
          - 输出：{node_output}
        example: "擅长分析客户咨询文本，识别问题类型和紧急程度"
      
      - field_id: "need_knowledge"
        label: "这个Agent需要知识库吗？"
        type: "radio_with_explanation"
        options:
          - value: true
            label: "需要"
            explanation: "Agent需要查询历史知识、文档或专业资料"
            icon: "📚"
          
          - value: false
            label: "不需要"
            explanation: "Agent仅基于输入数据处理，不需要额外知识"
            icon: "🚫"
        help_text: "知识库可以让Agent参考历史经验和专业知识"
      
      - field_id: "knowledge_config"
        label: "知识库配置"
        type: "simple_config"
        show_if: "need_knowledge == true"
        
        fields:
          - field_id: "knowledge_domain"
            label: "知识领域"
            type: "text"
            placeholder: "例如：客户服务历史记录"
            help_text: "这个知识库包含什么内容"
          
          - field_id: "knowledge_size"
            label: "知识库规模"
            type: "select"
            options:
              - value: "small"
                label: "小型（<1000条）"
                config: {k: 3, score_threshold: 0.7}
              - value: "medium"
                label: "中型（1000-10000条）"
                config: {k: 5, score_threshold: 0.6}
              - value: "large"
                label: "大型（>10000条）"
                config: {k: 10, score_threshold: 0.5}
            help_text: "AI会根据规模优化检索参数"
      
      - field_id: "need_tools"
        label: "这个Agent需要工具吗？"
        type: "radio_with_explanation"
        options:
          - value: false
            label: "不需要"
            explanation: "大多数情况不需要工具"
            recommended: true
          
          - value: true
            label: "需要"
            explanation: "需要调用外部API、数据库或执行代码"
            advanced: true
        help_text: "工具用于特殊操作，如查询数据库、调用API等"
      
      - field_id: "tools_list"
        label: "需要哪些工具？"
        type: "checkbox_group"
        show_if: "need_tools == true"
        options:
          - value: "database_query"
            label: "数据库查询"
          - value: "api_call"
            label: "API调用"
          - value: "file_operation"
            label: "文件操作"
          - value: "code_execution"
            label: "代码执行（谨慎）"
      
      - field_id: "ai_generate_system_message"
        label: "AI生成专业提示词"
        type: "action_button"
        icon: "🤖"
        label_text: "让AI生成这个Agent的专业提示词"
        action: "generate_system_message"
        based_on:
          - "node_name"
          - "node_description"
          - "agent_expertise"
          - "node_input"
          - "node_output"
        result_preview: true
```

---

### 第6步：高级选项（可选）

```yaml
wizard_step_6:
  title: "🔧 高级选项（可选）"
  description: "这些是可选的高级配置，可以跳过"
  collapsible: true
  collapsed_by_default: true
  
  sections:
    - section_id: "team_advanced"
      title: "Team高级配置"
      
      fields:
        - field_id: "team_name"
          label: "Team名称"
          type: "text"
          placeholder: "例如：客户服务团队"
          help_text: "给整个Team起个名字（可选）"
        
        - field_id: "team_description"
          label: "Team描述"
          type: "textarea"
          rows: 2
          placeholder: "描述这个Team的职责..."
          help_text: "Team的整体描述（可选）"
        
        - field_id: "allow_repeated_speaker"
          label: "允许同一Agent连续发言"
          type: "checkbox"
          default: false
          show_if: "team_type == 'SelectorGroupChat'"
          help_text: "是否允许同一个Agent连续多次发言"
        
        - field_id: "max_selector_attempts"
          label: "最大选择尝试次数"
          type: "number"
          default: 3
          min: 1
          max: 10
          show_if: "team_type == 'SelectorGroupChat'"
          help_text: "选择Agent失败时的最大重试次数"
        
        - field_id: "max_stalls"
          label: "最大停滞次数"
          type: "number"
          default: 3
          min: 1
          max: 10
          show_if: "team_type == 'MagenticOneGroupChat'"
          help_text: "工作流停滞时的最大容忍次数"
    
    # ===== v2.1/v2.2 新增：GraphFlow高级配置 =====
    - section_id: "graphflow_advanced"
      title: "GraphFlow高级配置"
      show_if: "team_type == 'GraphFlow'"
      
      fields:
        - field_id: "graph_builder_config"
          label: "图构建配置"
          type: "object"
          
          fields:
            - field_id: "entry_point"
              label: "入口节点"
              type: "select"
              options_from: "all_nodes"
              required: true
              help_text: "工作流从哪个节点开始"
            
            - field_id: "parallel_execution"
              label: "启用并行执行"
              type: "checkbox"
              default: false
              help_text: "允许多个节点同时执行（扇出）"
            
            - field_id: "max_concurrent_nodes"
              label: "最大并发节点数"
              type: "number"
              show_if: "parallel_execution == true"
              default: 2
              min: 2
              max: 10
        
        - field_id: "edge_config"
          label: "边配置"
          type: "dynamic_list"
          description: "配置节点之间的连接关系"
          
          auto_generate_from: "node_connections"
          
          item_template:
            - field_id: "from_node"
              label: "从节点"
              type: "select"
              options_from: "all_nodes"
            
            - field_id: "to_node"
              label: "到节点"
              type: "select"
              options_from: "all_nodes"
            
            - field_id: "condition"
              label: "条件（可选）"
              type: "condition_builder"
              help_text: "留空表示无条件连接"
            
            - field_id: "activation_group"
              label: "激活组（可选）"
              type: "text"
              help_text: "用于区分不同路径"
    
    - section_id: "runtime_advanced"
      title: "运行时高级配置"
      
      fields:
        - field_id: "emit_team_events"
          label: "记录团队协作过程"
          type: "checkbox"
          default: false
          help_text: "启用后可以查看详细的协作日志（用于调试）"
        
        - field_id: "model_context_type"
          label: "对话历史保留策略"
          type: "select"
          show_if: "team_type == 'SelectorGroupChat'"
          options:
            - value: "unbounded"
              label: "全部保留"
              description: "保留所有对话历史"
            - value: "buffered"
              label: "保留最近N轮"
              description: "只保留最近的对话"
          help_text: "控制Agent能看到多少历史对话"
        
        - field_id: "buffer_size"
          label: "保留轮数"
          type: "number"
          show_if: "model_context_type == 'buffered'"
          default: 10
          min: 5
          max: 50
    
    - section_id: "integration_advanced"
      title: "系统集成配置"
      
      fields:
        - field_id: "storage_tier"
          label: "数据存储层级"
          type: "select"
          default: "INDEXED_DB"
          options:
            - value: "MEMORY"
              label: "内存（临时）"
            - value: "INDEXED_DB"
              label: "IndexedDB（推荐）"
            - value: "NEO4J"
              label: "Neo4j（图数据库）"
        
        - field_id: "enable_visualization"
          label: "启用可视化组件"
          type: "checkbox"
          default: false
          help_text: "是否需要脑图、泳道等可视化界面"
```

**程序员**

（Part3完成，包含第4-6步的完整内容，补充了GraphFlow高级配置）
