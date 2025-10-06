# Autogen Team工作流设计信息采集表单架构 v2.2

**文档类型**: 表单架构设计（混合模式：Wizard + 高级）  
**创建时间**: 2025-10-06  
**作者**: 程序员  
**版本**: v2.2（完整版）  
**设计理念**: 
- Wizard模式：业务语言，零技术门槛
- 高级模式：完整参数，精确控制
- 实时可视化：流程图实时预览
- AI智能辅助：自动推荐和填充

**对齐规范**: 
- Autogen Team工作流通用设计规范v1.0
- Team参数清单完整版（**5种Team类型**，新增GraphFlow）
- 工作流设计方法论（节点、输入输出、循环）
- Autogen 0.7.1内生机制规范
- GraphFlow官方文档和源码规范

**版本历史**:
- v2.0: 基础混合模式设计（4种Team类型）
- v2.1: 新增GraphFlow支持，增强条件配置
- v2.2: 完善GraphFlow细节，补充Lambda序列化、图验证、激活类型说明

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
        - "条件分支标注"  # v2.2新增
        - "激活组可视化"  # v2.2新增
      
    - component_id: "config_summary"
      type: "summary_card"
      title: "⚙️ 配置摘要"
      show:
        - "工作流名称"
        - "节点数量"
        - "Team类型"
        - "最大轮次"
        - "是否循环"
        - "工作流模式"  # v2.2新增：对话/工作流
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
    note: "v2.2: 新增GraphFlow选项和模式分类"
  
  - step: 4
    title: "执行控制"
    icon: "⚡"
  
  - step: 5
    title: "Agent配置"
    icon: "🤖"
  
  - step: 6
    title: "高级选项（可选）"
    icon: "🔧"
    note: "v2.2: 新增GraphFlow高级配置"
  
  - step: 7
    title: "预览和生成"
    icon: "✅"
    note: "v2.2: 新增图验证功能"
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
      
      # ===== v2.1/v2.2 新增：循环配置增强 =====
      - field_id: "loop_condition"
        label: "循环条件"
        type: "condition_builder"  # v2.2增强
        show_if: "node_can_loop == true"
        help_text: "什么情况下会循环"
        visual: "loop_condition_label"
        
        condition_builder:
          type_selector:
            - type: "string_match"
              label: "字符串匹配（推荐）✅"
              description: "检查消息中是否包含特定文本"
              placeholder: "例如：RETRY"
              serializable: true
              example: "RETRY"
            
            - type: "lambda_function"
              label: "Lambda函数（高级）⚠️"
              description: "自定义Python条件函数"
              placeholder: "lambda msg: 'retry' in msg.to_model_text()"
              serializable: false
              warning: |
                ⚠️ Lambda函数不可序列化
                - 无法保存到配置文件
                - 仅用于运行时
                - 建议使用字符串匹配或命名函数
              example: "lambda msg: 'retry' in msg.to_model_text()"
            
            - type: "named_function"
              label: "命名函数（高级）"
              description: "在代码中定义的函数"
              placeholder: "check_retry_condition"
              serializable: true
              note: "需要在代码中预先定义此函数"
      
      # ===== v2.2 新增：激活组配置 =====
      - field_id: "activation_group"
        label: "激活组（高级）"
        type: "text"
        show_if: "node_can_loop == true"
        placeholder: "例如：initial, feedback"
        help_text: "用于区分不同的激活路径，防止循环冲突"
        advanced: true
        tooltip: |
          激活组用于处理多路径到同一节点的情况。
          例如：A→B和C→B，可以设置不同的activation_group
          来区分初始路径和反馈路径。
      
      # ===== v2.2 新增：激活条件 =====
      - field_id: "activation_condition"
        label: "激活条件"
        type: "select_with_explanation"
        show_if: "node_can_loop == true"
        default: "all"
        help_text: "控制节点何时被激活执行"
        
        options:
          - value: "all"
            label: "All（等待所有输入）"
            description: "节点等待所有父节点都完成后才执行"
            icon: "🔗"
            use_cases:
              - "需要汇总多个输入"
              - "确保所有前置条件满足"
              - "Join模式（多路合并）"
            example_scenario: |
              场景：文档审核
              - 编辑1完成语法审核
              - 编辑2完成风格审核
              - 最终审核者等待两者都完成
            diagram: |
              ```mermaid
              graph TD
              E1[编辑1] --> F[最终审核]
              E2[编辑2] --> F
              F[activation="all"]
              ```
          
          - value: "any"
            label: "Any（任一输入即可）"
            description: "节点在任一父节点完成后立即执行"
            icon: "⚡"
            use_cases:
              - "竞速模式（谁先完成用谁的）"
              - "快速响应"
              - "循环反馈（任一路径返回即可）"
            example_scenario: |
              场景：并行搜索
              - 搜索引擎1查询
              - 搜索引擎2查询
              - 结果汇总者使用最先返回的结果
            diagram: |
              ```mermaid
              graph TD
              S1[搜索1] -.最快.-> R[结果汇总]
              S2[搜索2] -.最快.-> R
              R[activation="any"]
              ```
            warning: |
              ⚠️ 使用"any"时要注意：
              - 其他未完成的路径仍会继续执行
              - 可能导致资源浪费
              - 需要合理设计终止条件
      
      - field_id: "node_is_decision"
        label: "是否是决策节点？"
        type: "checkbox"
        default: false
        help_text: "这个节点是否需要做判断和选择"
        visual: "diamond_shape_in_diagram"
      
      # ===== v2.1/v2.2 增强：决策分支配置 =====
      - field_id: "decision_branches"
        label: "决策分支"
        type: "dynamic_list"
        show_if: "node_is_decision == true"
        
        item_template:
          - field_id: "branch_condition_type"
            label: "条件类型"
            type: "radio"
            options:
              - value: "string_match"
                label: "字符串匹配（推荐）✅"
              - value: "lambda_function"
                label: "Lambda函数（高级）⚠️"
          
          - field_id: "condition_value"
            label: "条件"
            type: "text"
            show_if: "branch_condition_type == 'string_match'"
            placeholder: "例如：如果是技术问题"
          
          - field_id: "lambda_code"
            label: "Lambda代码"
            type: "code_editor"
            language: "python"
            show_if: "branch_condition_type == 'lambda_function'"
            placeholder: "lambda msg: 'technical' in msg.to_model_text()"
            warning: "⚠️ Lambda函数不可序列化"
          
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
      
      - pattern: "loop"
        label: "循环执行"
        description: "某些节点可能重复执行"
        diagram_style: "loop_flow"
      
      - pattern: "parallel"
        label: "并行执行"
        description: "多个节点同时执行"
        diagram_style: "parallel_flow"
        note: "Autogen暂不完全支持，会转换为顺序"
```

**程序员**

（Part1完成，包含文档头部、第1步和第2步的完整内容，已补充v2.1和v2.2的所有增强功能）
