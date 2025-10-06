# Autogen Team工作流设计信息采集表单架构 v2.0

**文档类型**: 表单架构设计（混合模式：Wizard + 高级）  
**创建时间**: 2025-10-06  
**作者**: 程序员  
**版本**: v2.0（混合模式）  
**设计理念**: 
- Wizard模式：业务语言，零技术门槛
- 高级模式：完整参数，精确控制
- 实时可视化：流程图实时预览
- AI智能辅助：自动推荐和填充

**对齐规范**: 
- Autogen Team工作流通用设计规范v1.0
- Team参数清单完整版（4种Team类型）
- 工作流设计方法论（节点、输入输出、循环）
- Autogen 0.7.1内生机制规范

---

## 📋 表单整体架构

### 设计模式切换

```yaml
mode_selector:
  default_mode: "wizard"  # 默认Wizard模式
  modes:
    - id: "wizard"
      label: "🧙 向导模式"
      description: "业务语言引导，AI智能填充，适合快速开始"
      icon: "wizard"
    
    - id: "advanced"
      label: "⚙️ 高级模式"
      description: "完整技术参数，精确控制，适合专家用户"
      icon: "settings"
  
  switch_button:
    position: "top-right"
    label: "切换到{other_mode}"
    confirm: "切换模式将保留已填写的数据"
```

### 实时可视化面板

```yaml
visualization_panel:
  position: "right-side"  # 右侧固定面板
  width: "40%"
  sticky: true
  
  components:
    - component_id: "workflow_diagram"
      type: "interactive_flowchart"
      title: "📊 工作流实时预览"
      library: "mermaid"  # 或 d3.js
      features:
        - "实时更新"
        - "节点可点击编辑"
        - "拖拽调整顺序"
        - "显示输入输出"
        - "循环标记"
      
    - component_id: "config_summary"
      type: "summary_card"
      title: "⚙️ 配置摘要"
      show:
        - "工作流名称"
        - "节点数量"
        - "Team类型"
        - "最大轮次"
        - "是否循环"
```

---

## 🧙 Wizard模式设计

### Wizard流程（7步）

```yaml
wizard_steps:
  - step: 1
    title: "工作流基本信息"
    icon: "📋"
  
  - step: 2
    title: "节点设计（核心）"
    icon: "🔄"
  
  - step: 3
    title: "协作方式"
    icon: "🤝"
  
  - step: 4
    title: "执行控制"
    icon: "⚡"
  
  - step: 5
    title: "Agent配置"
    icon: "🤖"
  
  - step: 6
    title: "高级选项（可选）"
    icon: "🔧"
  
  - step: 7
    title: "预览和生成"
    icon: "✅"
```

---

### 第1步：工作流基本信息

```yaml
wizard_step_1:
  title: "📋 告诉我们您要创建什么工作流"
  description: "用简单的语言描述您的业务流程"
  
  fields:
    - field_id: "workflow_name"
      label: "工作流名称"
      type: "text"
      placeholder: "例如：项目管理工作流"
      required: true
      help_text: "给您的工作流起个名字"
      example: "客户服务工作流"
    
    - field_id: "workflow_description"
      label: "工作流描述"
      type: "textarea"
      rows: 4
      placeholder: "描述这个工作流要完成什么任务，解决什么问题..."
      required: true
      help_text: "详细描述工作流的用途和目标"
      ai_assist: true
      ai_assist_button: "🤖 AI帮我完善描述"
      example: |
        这是一个客户服务工作流，用于处理客户咨询。
        流程包括：接收咨询 → 分析问题 → 提供解决方案 → 跟进反馈
    
    - field_id: "workflow_template"
      label: "选择模板（可选）"
      type: "select_with_preview"
      options:
        - value: "custom"
          label: "🆕 从头开始"
          description: "完全自定义工作流"
        
        - value: "project_management"
          label: "📊 项目管理模板"
          description: "想法 → 规划 → 执行 → 验收"
          preview_diagram: "mermaid_code_here"
        
        - value: "customer_service"
          label: "💬 客户服务模板"
          description: "咨询 → 分析 → 解决 → 回访"
          preview_diagram: "mermaid_code_here"
        
        - value: "content_creation"
          label: "✍️ 内容创作模板"
          description: "构思 → 撰写 → 审核 → 发布"
          preview_diagram: "mermaid_code_here"
        
        - value: "data_analysis"
          label: "📈 数据分析模板"
          description: "采集 → 清洗 → 分析 → 报告"
          preview_diagram: "mermaid_code_here"
      help_text: "选择模板可以快速开始，也可以从头自定义"
  
  ai_recommendation:
    trigger: "on_description_complete"
    action: "recommend_template"
    message: "根据您的描述，我推荐使用【{template_name}】模板"
```

---

### 第2步：节点设计（核心）⭐⭐⭐

```yaml
wizard_step_2:
  title: "🔄 设计工作流节点"
  description: "定义工作流包含哪些步骤（节点）"
  
  important_notice:
    icon: "💡"
    message: |
      工作流由多个节点组成，每个节点代表一个处理步骤。
      每个节点会由一个专业的AI Agent来执行。
  
  quick_input:
    title: "快速输入"
    description: "告诉我您需要几个节点，每个节点做什么"
    
    fields:
      - field_id: "node_count_estimate"
        label: "您预计需要几个节点？"
        type: "number_slider"
        min: 2
        max: 10
        default: 4
        marks:
          2: "简单"
          4: "一般"
          6: "复杂"
          10: "很复杂"
        help_text: "不用太精确，AI会帮您优化"
        on_change: "update_node_list_template"
      
      - field_id: "node_quick_description"
        label: "简单描述每个节点做什么"
        type: "textarea"
        rows: 6
        placeholder: |
          例如：
          1. 接收客户咨询
          2. 分析问题类型
          3. 查找解决方案
          4. 生成回复
        help_text: "用简单的语言列出步骤，AI会帮您细化"
        ai_assist: true
        ai_assist_button: "🤖 AI帮我设计节点"
  
  detailed_node_design:
    title: "详细节点设计"
    description: "为每个节点配置详细信息"
    type: "dynamic_list"
    auto_populate_from: "node_quick_description"
    
    visual_mode: "flowchart_editor"  # 可视化编辑器
    
    item_template:
      - field_id: "node_order"
        label: "节点顺序"
        type: "number"
        auto_increment: true
        width: "60px"
        visual: "node_position_in_diagram"
      
      - field_id: "node_name"
        label: "节点名称"
        type: "text"
        placeholder: "例如：问题分析"
        required: true
        help_text: "这个节点叫什么"
        visual: "node_label_in_diagram"
      
      - field_id: "node_description"
        label: "节点描述"
        type: "textarea"
        rows: 2
        placeholder: "这个节点要完成什么任务..."
        required: true
        ai_assist: true
        visual: "node_tooltip_in_diagram"
      
      - field_id: "node_input"
        label: "输入"
        type: "text"
        placeholder: "例如：客户咨询文本"
        help_text: "这个节点接收什么输入"
        auto_suggest_from: "previous_node_output"
        visual: "input_arrow_in_diagram"
      
      - field_id: "node_output"
        label: "输出"
        type: "text"
        placeholder: "例如：问题类型分类结果"
        help_text: "这个节点产出什么输出"
        auto_suggest: true
        visual: "output_arrow_in_diagram"
      
      - field_id: "node_can_loop"
        label: "是否可能循环？"
        type: "checkbox"
        default: false
        help_text: "这个节点是否可能需要重复执行"
        visual: "loop_arrow_in_diagram"
      
      - field_id: "loop_condition"
        label: "循环条件"
        type: "text"
        show_if: "node_can_loop == true"
        placeholder: "例如：如果分析结果不确定，重新分析"
        help_text: "什么情况下会循环"
        visual: "loop_condition_label"
      
      - field_id: "node_is_decision"
        label: "是否是决策节点？"
        type: "checkbox"
        default: false
        help_text: "这个节点是否需要做判断和选择"
        visual: "diamond_shape_in_diagram"
      
      - field_id: "decision_branches"
        label: "决策分支"
        type: "dynamic_list"
        show_if: "node_is_decision == true"
        item_template:
          - field_id: "condition"
            label: "条件"
            placeholder: "例如：如果是技术问题"
          - field_id: "next_node"
            label: "跳转到"
            type: "select"
            options_from: "all_nodes"
        visual: "branch_arrows_in_diagram"
    
    actions:
      - type: "add_node"
        label: "➕ 添加节点"
        icon: "plus"
      
      - type: "remove_node"
        label: "➖ 删除节点"
        icon: "minus"
      
      - type: "reorder_nodes"
        label: "⬍ 调整顺序"
        icon: "arrows-up-down"
        method: "drag_drop_in_diagram"
      
      - type: "ai_optimize"
        label: "🤖 AI优化节点设计"
        icon: "robot"
        description: "让AI帮您优化节点划分和流程"
  
  workflow_pattern_detection:
    title: "工作流模式识别"
    auto_detect: true
    patterns:
      - pattern: "sequential"
        label: "顺序执行"
        description: "节点按顺序依次执行"
        diagram_style: "linear_flow"
      
      - pattern: "conditional"
        label: "条件分支"
        description: "根据条件选择不同路径"
        diagram_style: "branching_flow"
      
      - pattern: "循环"
        label: "循环执行"
        description: "某些节点可能重复执行"
        diagram_style: "loop_flow"
      
      - pattern: "parallel"
        label: "并行执行"
        description: "多个节点同时执行"
        diagram_style: "parallel_flow"
        note: "Autogen暂不完全支持，会转换为顺序"
```

---

### 第3步：协作方式

```yaml
wizard_step_3:
  title: "🤝 Agent之间如何协作？"
  description: "选择最适合您工作流的协作方式"
  
  visual_selector:
    type: "card_selector"
    layout: "grid"
    
    options:
      - value: "RoundRobinGroupChat"
        label: "按顺序依次执行"
        icon: "→→→"
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
        auto_select_if: "workflow_pattern == 'sequential'"
      
      - value: "SelectorGroupChat"
        label: "根据情况智能选择"
        icon: "🔀"
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
        auto_select_if: "workflow_pattern == 'conditional'"
      
      - value: "MagenticOneGroupChat"
        label: "复杂协作模式"
        icon: "🕸️"
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
      
      - value: "Swarm"
        label: "蜂群模式（实验性）"
        icon: "🐝"
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
  
  ai_recommendation:
    trigger: "on_step_enter"
    based_on:
      - "workflow_pattern"
      - "node_count"
      - "has_decision_nodes"
      - "has_loops"
    message: |
      根据您的工作流特点，我推荐使用【{recommended_team_type}】
      原因：{reason}
```

---

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

---

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
  
  right_column:
    - component_id: "final_diagram"
      type: "interactive_flowchart"
      title: "📊 最终工作流图"
      editable: false
      download: true
      formats: ["PNG", "SVG", "PDF"]
    
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
  
  actions:
    - action_id: "generate_all"
      label: "🚀 生成工作流"
      type: "primary"
      size: "large"
      confirm: "确认生成工作流文件？"
      output_directory: "./column-sources/autogen/workflows/{workflow_type}/"
    
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
```

---

## 📊 实时流程图可视化

### Mermaid图表生成

```yaml
flowchart_visualization:
  library: "mermaid"
  real_time_update: true
  interactive: true
  
  diagram_types:
    - type: "flowchart"
      label: "流程图"
      default: true
      
      generation_rules:
        - if: "workflow_pattern == 'sequential'"
          template: |
            ```mermaid
            graph LR
            {{#each nodes}}
            N{{order}}[{{node_name}}] -->
            {{/each}}
            ```
        
        - if: "workflow_pattern == 'conditional'"
          template: |
            ```mermaid
            graph TD
            {{#each nodes}}
            {{#if is_decision}}
            N{{order}}{{{node_name}}}
            {{#each branches}}
            N{{../order}} -->|{{condition}}| N{{next_node}}
            {{/each}}
            {{else}}
            N{{order}}[{{node_name}}]
            {{/if}}
            {{/each}}
            ```
        
        - if: "has_loops"
          template: |
            ```mermaid
            graph TD
            {{#each nodes}}
            N{{order}}[{{node_name}}]
            {{#if can_loop}}
            N{{order}} -.循环.-> N{{order}}
            {{/if}}
            {{/each}}
            ```
  
  interactive_features:
    - feature: "click_to_edit"
      description: "点击节点可编辑"
      action: "open_node_editor"
    
    - feature: "drag_to_reorder"
      description: "拖拽调整顺序"
      action: "update_node_order"
    
    - feature: "hover_tooltip"
      description: "悬停显示详情"
      show:
        - "节点描述"
        - "输入输出"
        - "Agent名称"
    
    - feature: "zoom_pan"
      description: "缩放和平移"
      controls: true
  
  style_customization:
    node_colors:
      normal: "#4A90E2"
      decision: "#F5A623"
      loop: "#7ED321"
      start: "#50E3C2"
      end: "#D0021B"
    
    arrow_styles:
      normal: "solid"
      loop: "dotted"
      conditional: "dashed"
```

---

## 🤖 AI智能辅助功能

### AI辅助场景

```yaml
ai_assistance:
  scenarios:
    - scenario_id: "node_design"
      trigger: "user_input_workflow_description"
      action: "recommend_nodes"
      
      prompt_template: |
        用户描述的工作流：{workflow_description}
        
        请分析并推荐：
        1. 需要几个节点
        2. 每个节点的名称和描述
        3. 每个节点的输入输出
        4. 是否有循环或分支
        
        输出JSON格式的节点列表
      
      output_format: "json"
      auto_fill: true
    
    - scenario_id: "system_message_generation"
      trigger: "click_ai_generate_button"
      action: "generate_system_message"
      
      prompt_template: |
        节点信息：
        - 名称：{node_name}
        - 描述：{node_description}
        - 输入：{node_input}
        - 输出：{node_output}
        - 专长：{agent_expertise}
        
        请生成专业的Agent系统提示词，包括：
        1. 角色定位
        2. 职责列表
        3. 输入输出格式说明
        4. 工作规范
      
      output_format: "text"
      preview: true
      editable: true
    
    - scenario_id: "team_type_recommendation"
      trigger: "on_workflow_pattern_detected"
      action: "recommend_team_type"
      
      logic:
        - if: "pattern == 'sequential' && no_loops && no_branches"
          recommend: "RoundRobinGroupChat"
          reason: "您的工作流是顺序执行，无分支和循环"
        
        - if: "pattern == 'conditional' || has_decision_nodes"
          recommend: "SelectorGroupChat"
          reason: "您的工作流包含条件判断，需要智能选择"
        
        - if: "pattern == 'complex' || node_count > 6"
          recommend: "MagenticOneGroupChat"
          reason: "您的工作流较复杂，建议使用高级协作模式"
    
    - scenario_id: "parameter_optimization"
      trigger: "on_config_complete"
      action: "optimize_parameters"
      
      checks:
        - check: "max_turns_too_low"
          condition: "max_turns < node_count * 2"
          suggestion: "建议max_turns至少为节点数的2倍（{recommended_value}）"
        
        - check: "knowledge_config_missing"
          condition: "has_complex_nodes && !has_memory"
          suggestion: "复杂节点建议启用知识库"
        
        - check: "termination_condition_weak"
          condition: "only_max_turns_termination"
          suggestion: "建议添加任务完成条件"
```

---

## 📱 响应式设计

```yaml
responsive_design:
  breakpoints:
    - size: "desktop"
      min_width: 1200
      layout: "three_column"
      diagram_size: "large"
    
    - size: "tablet"
      min_width: 768
      max_width: 1199
      layout: "two_column"
      diagram_size: "medium"
      diagram_position: "bottom"
    
    - size: "mobile"
      max_width: 767
      layout: "single_column"
      diagram_size: "small"
      diagram_position: "collapsible"
      wizard_steps: "one_at_a_time"
```

---

## 💾 数据持久化

```yaml
data_persistence:
  auto_save:
    enabled: true
    interval: 30  # 秒
    storage: "localStorage"
    key: "workflow_draft_{timestamp}"
  
  draft_management:
    max_drafts: 10
    auto_cleanup: true
    cleanup_after_days: 30
  
  export_formats:
    - format: "json"
      filename: "{workflow_name}_config.json"
    
    - format: "yaml"
      filename: "{workflow_name}_config.yaml"
    
    - format: "zip"
      filename: "{workflow_name}_complete.zip"
      includes:
        - "agents_config.yaml"
        - "data_schema.yaml"
        - "run_*.py"
        - "README.md"
        - "diagram.png"
```

---

**程序员**
