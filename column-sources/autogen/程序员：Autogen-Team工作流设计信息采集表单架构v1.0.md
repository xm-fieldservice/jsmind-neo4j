# Autogen Team工作流设计信息采集表单架构

**文档类型**: 表单架构设计  
**创建时间**: 2025-10-06  
**作者**: 程序员  
**版本**: v1.0  
**对齐规范**: 
- Autogen Team工作流通用设计规范v1.0
- KB_RAG_AutoGen_Design.md（知识库设计规范）
- 知识管理系统学习和构建计划v1.2
- Autogen 0.7.1内生机制规范

---

## 📋 表单整体架构

### 设计原则
1. **完全对齐Autogen 0.7.1规范** - 所有字段基于内生机制
2. **Memory-first原则** - 优先使用Memory，工具为辅
3. **配置即是功能** - 所有配置直接生成可执行代码
4. **AI辅助生成** - 关键字段支持AI智能推荐

### 表单结构（7个部分）

```yaml
form_structure:
  part_1: "基本信息采集"
  part_2: "阶段设计采集"  
  part_3: "Agent配置采集（对齐Autogen内生）"
  part_4: "Memory配置采集（ChromaDBVectorMemory）"
  part_5: "Team编排采集（内生GroupChat）"
  part_6: "Tools/MCP配置采集（可选）"
  part_7: "集成与生成"
```

---

## 📝 第一部分：基本信息采集

```yaml
section_1_basic_info:
  title: "工作流基本信息"
  icon: "📋"
  
  fields:
    - field_id: "workflow_name"
      label: "工作流名称"
      type: "text"
      required: true
      placeholder: "例如：项目管理工作流"
      validation: "^[\u4e00-\u9fa5a-zA-Z0-9_]{2,50}$"
      help_text: "工作流的中文名称，2-50个字符"
      example: "项目管理工作流"
    
    - field_id: "workflow_type"
      label: "工作流类型标识"
      type: "text"
      required: true
      placeholder: "例如：project_management"
      validation: "^[a-z_]{2,30}$"
      help_text: "英文小写+下划线，用于生成ID和文件名"
      auto_generate_from: "workflow_name"  # AI自动生成
      example: "project_management"
    
    - field_id: "workflow_description"
      label: "工作流描述"
      type: "textarea"
      required: true
      rows: 4
      placeholder: "描述这个工作流的业务场景和目标..."
      help_text: "详细描述工作流的用途、适用场景"
      ai_assist: true
      example: "支持从想法到交付的完整项目管理流程，包括规划、执行、验收等阶段"
    
    - field_id: "autogen_version"
      label: "Autogen版本"
      type: "select"
      required: true
      default: "0.7.1"
      options:
        - value: "0.7.1"
          label: "0.7.1（推荐）"
          description: "最新版本，完整内生机制支持"
        - value: "0.4+"
          label: "0.4+系列"
          description: "兼容模式，需要适配层"
      help_text: "选择目标Autogen版本"
      readonly: true  # 当前强制0.7.1
    
    - field_id: "model_provider"
      label: "模型提供商"
      type: "select"
      required: true
      options:
        - value: "openai"
          label: "OpenAI"
          models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"]
        - value: "azure_openai"
          label: "Azure OpenAI"
          models: ["gpt-4", "gpt-35-turbo"]
        - value: "deepseek"
          label: "DeepSeek"
          models: ["deepseek-chat", "deepseek-coder"]
      help_text: "选择LLM提供商"
    
    - field_id: "default_model"
      label: "默认模型"
      type: "select"
      required: true
      depends_on: "model_provider"
      help_text: "选择默认使用的模型"
    
    - field_id: "temperature"
      label: "Temperature"
      type: "number"
      required: true
      default: 0.1
      min: 0
      max: 2
      step: 0.1
      help_text: "模型温度参数，控制输出随机性"
```

---

## 🔄 第二部分：阶段设计采集

```yaml
section_2_stages:
  title: "工作流阶段设计"
  icon: "🔄"
  description: "定义工作流包含的各个阶段，每个阶段对应一个专业Agent"
  type: "dynamic_list"
  min_items: 2
  max_items: 10
  
  list_header:
    columns:
      - "阶段顺序"
      - "阶段标识"
      - "阶段名称"
      - "输入类型"
      - "输出类型"
      - "操作"
  
  item_template:
    - field_id: "stage_order"
      label: "阶段顺序"
      type: "number"
      required: true
      min: 1
      auto_increment: true
      width: "80px"
      help_text: "阶段在工作流中的执行顺序"
    
    - field_id: "stage_id"
      label: "阶段标识"
      type: "text"
      required: true
      placeholder: "例如：idea_collection"
      validation: "^[a-z_]{2,30}$"
      help_text: "英文小写+下划线"
      example: "idea_collection"
    
    - field_id: "stage_name"
      label: "阶段名称"
      type: "text"
      required: true
      placeholder: "例如：想法收集"
      help_text: "阶段的中文名称"
      example: "想法收集"
    
    - field_id: "stage_description"
      label: "阶段描述"
      type: "textarea"
      required: true
      rows: 3
      placeholder: "描述这个阶段的职责和目标..."
      help_text: "详细说明该阶段要完成什么工作"
      ai_assist: true
      example: "从用户的口语化想法中提取结构化的项目信息"
    
    - field_id: "input_type"
      label: "输入类型"
      type: "text"
      required: true
      placeholder: "例如：user_idea"
      help_text: "该阶段接收的输入数据类型"
      example: "user_idea"
    
    - field_id: "output_type"
      label: "输出类型"
      type: "text"
      required: true
      placeholder: "例如：structured_project"
      help_text: "该阶段产出的输出数据类型"
      example: "structured_project"
    
    - field_id: "itemType"
      label: "MD底座类型标记"
      type: "text"
      required: true
      placeholder: "例如：idea"
      help_text: "符合MD底座规范的itemType"
      auto_generate_from: "stage_id"
      example: "idea"
    
    - field_id: "status_values"
      label: "状态值列表"
      type: "tags"
      required: true
      default: ["pending", "in_progress", "completed"]
      help_text: "该阶段可能的状态值"
      predefined_options:
        - "pending"
        - "in_progress"
        - "completed"
        - "failed"
        - "cancelled"
  
  actions:
    - type: "add_stage"
      label: "➕ 添加阶段"
      icon: "plus"
    - type: "remove_stage"
      label: "➖ 删除阶段"
      icon: "minus"
    - type: "reorder_stages"
      label: "⬍ 调整顺序"
      icon: "arrows-up-down"
    - type: "ai_suggest_stages"
      label: "🤖 AI推荐阶段"
      icon: "robot"
      description: "基于工作流描述，AI智能推荐阶段划分"
```

---

## 🤖 第三部分：Agent配置采集（对齐Autogen内生）

```yaml
section_3_agents:
  title: "Agent配置设计"
  icon: "🤖"
  description: "为每个阶段设计专业Agent，使用Autogen内生AssistantAgent"
  type: "auto_generated_from_stages"
  
  important_notice:
    title: "⚠️ Autogen规范要求"
    content: |
      - 必须使用AssistantAgent（内生类型）
      - 禁止自定义Agent类
      - 系统提示词定义Agent的专业能力
      - Memory-first原则：优先使用Memory而非Tools
  
  for_each_stage:
    agent_basic:
      - field_id: "agent_name"
        label: "Agent名称"
        type: "text"
        required: true
        auto_generate: "{stage_id}_agent"
        editable: true
        help_text: "Agent的标识名称，建议：{阶段}_agent"
        example: "idea_analyzer_agent"
      
      - field_id: "agent_type"
        label: "Agent类型"
        type: "select"
        required: true
        default: "AssistantAgent"
        options:
          - value: "AssistantAgent"
            label: "AssistantAgent（推荐）⭐"
            description: "Autogen内生的通用助手Agent，支持Memory和Tools"
            recommended: true
        help_text: "必须使用Autogen内生Agent类型"
        readonly: true  # 强制AssistantAgent
      
      - field_id: "system_message"
        label: "系统提示词"
        type: "textarea"
        required: true
        rows: 15
        placeholder: |
          你是{专业领域}专家，专注于{具体职责}。
          
          你的职责：
          1. {职责1}
          2. {职责2}
          3. {职责3}
          
          输入格式：{输入格式说明}
          输出格式：{输出格式说明}
        help_text: "Agent的系统提示词，定义其专业能力和行为"
        ai_assist: true
        ai_assist_prompt: |
          基于以下信息生成专业的系统提示词：
          - 阶段名称：{stage_name}
          - 阶段描述：{stage_description}
          - 输入类型：{input_type}
          - 输出类型：{output_type}
        template_options:
          - "分析型Agent"
          - "规划型Agent"
          - "执行型Agent"
          - "审核型Agent"
        example: |
          你是想法分析专家，专注于从口语笔记中提取结构化项目信息。
          
          你的职责：
          1. 分析用户的口语化想法输入
          2. 提取关键信息：目标、范围、约束
          3. 识别潜在的项目要素
          4. 输出结构化的项目雏形
          
          输入格式：自然语言文本
          输出格式：JSON结构
```

---

## 💾 第四部分：Memory配置采集（ChromaDBVectorMemory）

```yaml
section_4_memory:
  title: "Memory配置（知识检索能力）"
  icon: "💾"
  description: "配置Agent的知识检索能力，基于ChromaDBVectorMemory"
  type: "per_agent_optional"
  
  important_notice:
    title: "⚠️ Memory-first原则"
    content: |
      - 优先使用Memory实现知识检索
      - 必须使用ChromaDBVectorMemory（Autogen内生）
      - 向量检索自动注入到Agent上下文
      - 仅在确需时才使用Tools/MCP
  
  for_each_agent:
    - field_id: "need_memory"
      label: "是否需要Memory"
      type: "checkbox"
      default: false
      help_text: "该Agent是否需要知识检索能力"
      recommendation_logic: |
        推荐启用Memory的场景：
        - 需要参考历史知识
        - 需要专业领域知识
        - 需要检索文档片段
    
    - field_id: "memory_config"
      label: "Memory配置"
      type: "object"
      show_if: "need_memory == true"
      
      fields:
        - field_id: "memory_type"
          label: "Memory类型"
          type: "select"
          required: true
          default: "ChromaDBVectorMemory"
          options:
            - value: "ChromaDBVectorMemory"
              label: "ChromaDBVectorMemory（推荐）⭐"
              description: "Autogen内生向量Memory，支持语义检索"
          help_text: "必须使用Autogen内生Memory类型"
          readonly: true
        
        - field_id: "collection_name"
          label: "集合名称"
          type: "text"
          required: true
          auto_generate: "{stage_id}_knowledge"
          editable: true
          placeholder: "例如：planning_knowledge"
          help_text: "ChromaDB集合名称，用于隔离不同知识域"
          example: "planning_knowledge"
        
        - field_id: "persistence_path"
          label: "持久化路径"
          type: "text"
          required: true
          default: "./data/memory/chromadb"
          placeholder: "./data/memory/chromadb"
          help_text: "ChromaDB数据持久化路径"
        
        - field_id: "k"
          label: "检索数量(k)"
          type: "number"
          required: true
          default: 5
          min: 1
          max: 50
          help_text: "每次检索返回的结果数量"
          recommendation: |
            - 严格匹配：k=3
            - 一般场景：k=5-10
            - 宽松召回：k=20-50
        
        - field_id: "score_threshold"
          label: "相似度阈值"
          type: "number"
          required: true
          default: 0.6
          min: 0
          max: 1
          step: 0.1
          help_text: "相似度得分阈值（0-1），低于此值的结果将被过滤"
          recommendation: |
            - 严格匹配：0.8
            - 一般场景：0.6
            - 宽松召回：0.0（无阈值）
        
        - field_id: "embedding_function"
          label: "嵌入函数配置"
          type: "select"
          required: true
          default: "DefaultEmbeddingFunction"
          options:
            - value: "DefaultEmbeddingFunction"
              label: "DefaultEmbeddingFunction（默认）"
              description: "all-MiniLM-L6-v2模型，适合通用场景"
              model: "all-MiniLM-L6-v2"
              dimension: 384
            
            - value: "OpenAIEmbeddingFunction"
              label: "OpenAIEmbeddingFunction"
              description: "OpenAI嵌入模型，质量高但需API Key"
              model: "text-embedding-3-small"
              dimension: 1536
              requires_api_key: true
            
            - value: "SentenceTransformerEmbeddingFunction"
              label: "SentenceTransformerEmbeddingFunction（自定义）"
              description: "自定义SentenceTransformer模型"
              customizable: true
          help_text: "选择嵌入函数，影响检索质量"
        
        - field_id: "openai_api_key"
          label: "OpenAI API Key"
          type: "password"
          show_if: "embedding_function == 'OpenAIEmbeddingFunction'"
          placeholder: "sk-..."
          help_text: "OpenAI API密钥，用于嵌入计算"
          env_var: "OPENAI_API_KEY"
        
        - field_id: "custom_model_name"
          label: "自定义模型名称"
          type: "text"
          show_if: "embedding_function == 'SentenceTransformerEmbeddingFunction'"
          placeholder: "例如：paraphrase-multilingual-MiniLM-L12-v2"
          help_text: "SentenceTransformer模型名称"
          popular_models:
            - "paraphrase-multilingual-MiniLM-L12-v2"
            - "all-MiniLM-L6-v2"
            - "all-mpnet-base-v2"
```

---

## 🔗 第五部分：Team编排采集（内生GroupChat）

```yaml
section_5_team:
  title: "Team编排配置"
  icon: "🔗"
  description: "定义Agent之间的协作方式，使用Autogen内生GroupChat"
  
  important_notice:
    title: "⚠️ Autogen规范要求"
    content: |
      - 必须使用内生GroupChat类型
      - 禁止自定义Team类
      - 配置驱动协作逻辑
  
  fields:
    - field_id: "team_type"
      label: "Team类型"
      type: "select"
      required: true
      default: "RoundRobinGroupChat"
      options:
        - value: "RoundRobinGroupChat"
          label: "RoundRobinGroupChat（顺序执行）⭐"
          description: "Agent按顺序轮流执行，适合线性工作流"
          recommended: true
          use_case: "适合明确顺序的工作流，如：想法→规划→执行"
          
        - value: "SelectorGroupChat"
          label: "SelectorGroupChat（动态选择）"
          description: "根据条件动态选择Agent，适合分支工作流"
          use_case: "适合需要条件判断的工作流，如：根据项目类型选择不同处理流程"
          
        - value: "MagenticOneGroupChat"
          label: "MagenticOneGroupChat（复杂协作）"
          description: "支持多种协作模式，适合复杂场景"
          use_case: "适合复杂多Agent协作场景"
      help_text: "必须使用Autogen内生Team类型"
    
    - field_id: "max_turns"
      label: "最大轮次"
      type: "number"
      required: true
      default: 10
      min: 1
      max: 100
      help_text: "Team执行的最大轮次限制，防止无限循环"
      recommendation: |
        - 简单工作流：5-10轮
        - 复杂工作流：20-50轮
        - 实验性工作流：100轮
    
    - field_id: "selector_prompt"
      label: "选择器提示词"
      type: "textarea"
      show_if: "team_type == 'SelectorGroupChat'"
      required_if: "team_type == 'SelectorGroupChat'"
      rows: 10
      placeholder: |
        根据当前工作流阶段选择合适的Agent：
        - 如果是想法阶段 -> idea_analyzer_agent
        - 如果是规划阶段 -> project_planner_agent
        - 如果是任务生成 -> task_generator_agent
      help_text: "定义如何根据条件选择Agent"
      ai_assist: true
      ai_assist_prompt: |
        基于以下Agent列表生成选择器提示词：
        {agent_list}
      example: |
        根据当前工作流阶段选择合适的Agent：
        - 想法阶段 -> idea_analyzer_agent
        - 规划阶段 -> project_planner_agent
        - 任务生成 -> task_generator_agent
        - 执行阶段 -> execution_coach_agent
        - 验收阶段 -> acceptance_reviewer_agent
    
    - field_id: "participants_order"
      label: "Agent执行顺序"
      type: "sortable_list"
      auto_populate: "from_agents"
      help_text: "拖拽调整Agent的执行顺序"
      show_if: "team_type == 'RoundRobinGroupChat'"
      visual_mode: "drag_drop"
```

---

## 🛠️ 第六部分：Tools/MCP配置采集（可选）

```yaml
section_6_tools:
  title: "Tools/MCP配置（可选）"
  icon: "🛠️"
  description: "配置非向量类操作工具，仅在确需时启用"
  type: "optional"
  
  important_notice:
    title: "⚠️ Memory-first原则"
    content: |
      - 优先使用Memory实现知识检索
      - Tools主要用于非向量操作：
        * Neo4j图查询
        * 文件读取
        * 外部API调用
        * 代码执行
      - tools与workbench互斥，不能同时配置
      - 默认不启用Tools，保持简单
  
  fields:
    - field_id: "enable_tools"
      label: "启用Tools/MCP"
      type: "checkbox"
      default: false
      help_text: "是否为Agent配置工具能力"
      warning: "仅在Memory无法满足需求时启用"
    
    - field_id: "tool_mode"
      label: "工具模式"
      type: "radio"
      show_if: "enable_tools == true"
      required_if: "enable_tools == true"
      options:
        - value: "tools"
          label: "Tools（FunctionTool）"
          description: "使用Autogen内生FunctionTool"
        - value: "mcp"
          label: "MCP（McpWorkbench）"
          description: "使用MCP服务器"
      help_text: "tools与workbench互斥，只能选择一种"
    
    - field_id: "tools_list"
      label: "工具列表"
      type: "multi_select"
      show_if: "tool_mode == 'tools'"
      options:
        - value: "neo4j_query"
          label: "Neo4j查询工具"
          description: "执行Cypher查询，获取图数据"
          category: "graph"
        
        - value: "file_read"
          label: "文件读取工具"
          description: "读取本地文件内容"
          category: "file"
        
        - value: "web_search"
          label: "Web搜索工具"
          description: "在线搜索信息"
          category: "web"
        
        - value: "code_executor"
          label: "代码执行工具"
          description: "执行Python代码"
          category: "code"
          warning: "安全风险，谨慎使用"
      help_text: "选择需要的工具"
    
    - field_id: "mcp_servers"
      label: "MCP服务器配置"
      type: "dynamic_list"
      show_if: "tool_mode == 'mcp'"
      item_template:
        - field_id: "server_name"
          label: "服务器名称"
          type: "text"
          placeholder: "例如：neo4j_server"
        
        - field_id: "server_url"
          label: "服务器URL"
          type: "text"
          placeholder: "例如：http://localhost:8000"
      help_text: "配置MCP服务器连接"
```

---

## 🔌 第七部分：集成与生成

```yaml
section_7_integration:
  title: "系统集成与文件生成"
  icon: "🔌"
  description: "配置与现有系统的集成，并生成所有配置文件"
  
  subsection_1_integration:
    title: "系统集成配置"
    
    fields:
      - field_id: "use_unified_storage"
        label: "使用AutogenUnifiedStorage"
        type: "checkbox"
        required: true
        default: true
        disabled: true
        help_text: "强制使用现有统一存储（不可取消）"
        icon: "✅"
      
      - field_id: "storage_tier"
        label: "存储层级"
        type: "select"
        required: true
        default: "INDEXED_DB"
        options:
          - value: "MEMORY"
            label: "内存（临时数据）"
            description: "数据仅在内存中，重启后丢失"
          - value: "INDEXED_DB"
            label: "IndexedDB（推荐）⭐"
            description: "浏览器持久化存储"
          - value: "NEO4J"
            label: "Neo4j（关系数据）"
            description: "图数据库存储"
        help_text: "选择数据存储层级"
      
      - field_id: "use_event_bus"
        label: "使用AutogenEventBus"
        type: "checkbox"
        required: true
        default: true
        disabled: true
        help_text: "强制使用现有事件总线（不可取消）"
        icon: "✅"
      
      - field_id: "event_subscriptions"
        label: "事件订阅配置"
        type: "dynamic_list"
        description: "定义工作流需要监听的事件"
        predefined_events:
          - "workflow:created"
          - "workflow:loaded"
          - "workflow:completed"
          - "stage:started"
          - "stage:completed"
          - "data:changed"
        item_template:
          - field_id: "event_name"
            label: "事件名称"
            type: "select_or_text"
            options: "predefined_events"
          
          - field_id: "handler_description"
            label: "处理逻辑描述"
            type: "textarea"
            rows: 2
      
      - field_id: "need_visualization"
        label: "是否需要可视化"
        type: "checkbox"
        default: false
        help_text: "该工作流是否需要UI可视化组件"
      
      - field_id: "visualization_components"
        label: "可视化组件"
        type: "multi_select"
        show_if: "need_visualization == true"
        options:
          - value: "mindmap"
            label: "脑图（jsMind）"
            description: "节点树可视化"
          - value: "detail"
            label: "详情页"
            description: "数据详情展示"
          - value: "swimlane"
            label: "泳道（任务看板）"
            description: "任务状态管理"
          - value: "relation"
            label: "关系图（Neo4j）"
            description: "实体关系可视化"
          - value: "chart"
            label: "图表（ECharts）"
            description: "数据图表展示"
        help_text: "选择需要的可视化组件"
      
      - field_id: "use_column_registry"
        label: "使用ColumnRegistry"
        type: "checkbox"
        default: false
        show_if: "need_visualization == true"
        auto_check_if: "need_visualization == true"
        help_text: "使用现有组件注册表（推荐）"
  
  subsection_2_preview:
    title: "配置预览与生成"
    
    components:
      - component_id: "config_preview"
        type: "tabbed_code_viewer"
        tabs:
          - tab_id: "agents_config"
            title: "agents_config.yaml"
            language: "yaml"
            auto_generate: true
            editable: true
            download: true
          
          - tab_id: "data_schema"
            title: "data_schema.yaml"
            language: "yaml"
            auto_generate: true
            editable: true
            download: true
          
          - tab_id: "run_script"
            title: "run_{workflow_type}.py"
            language: "python"
            auto_generate: true
            editable: true
            download: true
          
          - tab_id: "integrate_script"
            title: "integrate_{workflow_type}.py"
            language: "python"
            auto_generate: true
            editable: true
            download: true
          
          - tab_id: "workspace_trigger"
            title: "workspace_trigger_{workflow_type}.py"
            language: "python"
            auto_generate: true
            editable: true
            download: true
          
          - tab_id: "visualization_config"
            title: "visualization_config.yaml"
            language: "yaml"
            auto_generate: true
            show_if: "need_visualization == true"
            editable: true
            download: true
      
      - component_id: "compliance_check"
        type: "checklist"
        title: "Autogen规范合规性检查"
        auto_check: true
        items:
          - id: "check_agent_type"
            label: "✅ 使用Autogen内生Agent类型（AssistantAgent）"
            check_rule: "all agents use AssistantAgent"
          
          - id: "check_team_type"
            label: "✅ 使用Autogen内生Team类型（GroupChat）"
            check_rule: "team_type in ['RoundRobinGroupChat', 'SelectorGroupChat', 'MagenticOneGroupChat']"
          
          - id: "check_memory_type"
            label: "✅ 使用Autogen内生Memory类型（ChromaDBVectorMemory）"
            check_rule: "if memory enabled, use ChromaDBVectorMemory"
          
          - id: "check_config_driven"
            label: "✅ 配置文件驱动（无自定义类）"
            check_rule: "no custom classes in generated code"
          
          - id: "check_external_script"
            label: "✅ 外部脚本启动"
            check_rule: "has run_*.py script"
          
          - id: "check_unified_storage"
            label: "✅ 集成AutogenUnifiedStorage"
            check_rule: "use_unified_storage == true"
          
          - id: "check_event_bus"
            label: "✅ 集成AutogenEventBus"
            check_rule: "use_event_bus == true"
          
          - id: "check_md_schema"
            label: "✅ 符合MD底座数据规范"
            check_rule: "data schema has topic/meta/data/children"
          
          - id: "check_project_id"
            label: "✅ 项目ID格式正确（timestamp_hash）"
            check_rule: "project_id format: {type}_{timestamp}_{hash}"
          
          - id: "check_memory_first"
            label: "✅ Memory-first原则（优先Memory而非Tools）"
            check_rule: "if knowledge retrieval needed, use Memory not Tools"
      
      - component_id: "generation_summary"
        type: "summary_panel"
        title: "生成文件清单"
        auto_generate: true
        content:
          - "📄 agents_config.yaml - Agent配置文件"
          - "📄 data_schema.yaml - 数据结构配置"
          - "🐍 run_{workflow_type}.py - 主启动脚本"
          - "🐍 integrate_{workflow_type}.py - 系统集成脚本"
          - "🐍 workspace_trigger_{workflow_type}.py - 工作区触发脚本"
          - "📄 visualization_config.yaml - 可视化配置（如果需要）"
          - "📋 README_{workflow_type}.md - 使用说明文档"
  
  actions:
    - action_id: "generate_files"
      label: "🚀 生成工作流文件"
      type: "primary"
      size: "large"
      description: "生成所有配置文件和脚本到指定目录"
      confirm: "确认生成工作流文件？"
      output_directory: "./column-sources/autogen/workflows/{workflow_type}/"
      post_action: "show_success_message"
    
    - action_id: "save_draft"
      label: "💾 保存草稿"
      type: "secondary"
      description: "保存当前配置为草稿，稍后继续编辑"
      storage: "localStorage"
      key: "workflow_draft_{workflow_type}"
    
    - action_id: "load_draft"
      label: "📂 加载草稿"
      type: "secondary"
      description: "加载之前保存的草稿配置"
      storage: "localStorage"
    
    - action_id: "load_template"
      label: "📋 加载模板"
      type: "secondary"
      description: "从已有工作流加载配置模板"
      templates:
        - "项目管理工作流模板"
        - "知识运营工作流模板"
        - "客户服务工作流模板"
    
    - action_id: "export_json"
      label: "📤 导出配置"
      type: "secondary"
      description: "导出配置为JSON文件"
      format: "json"
    
    - action_id: "import_json"
      label: "📥 导入配置"
      type: "secondary"
      description: "从JSON文件导入配置"
      format: "json"
```

---

## 🎨 表单交互特性

```yaml
form_features:
  ai_assistance:
    - feature: "系统提示词AI生成"
      trigger: "点击'AI辅助'按钮"
      input: "阶段描述、输入输出类型"
      output: "专业的系统提示词"
      model: "使用用户选择的LLM"
    
    - feature: "选择器提示词AI生成"
      trigger: "点击'AI辅助'按钮"
      input: "Agent列表、阶段信息"
      output: "条件选择逻辑"
    
    - feature: "阶段划分AI推荐"
      trigger: "点击'AI推荐阶段'按钮"
      input: "工作流描述"
      output: "推荐的阶段列表"
  
  real_time_validation:
    - "项目ID格式检查（{type}_{timestamp}_{hash}）"
    - "命名规范检查（小写+下划线）"
    - "必填项检查"
    - "Autogen规范合规性检查"
    - "Memory配置参数范围检查"
  
  auto_completion:
    - "Agent名称自动生成（{stage_id}_agent）"
    - "集合名称自动生成（{stage_id}_knowledge）"
    - "文件名自动生成"
    - "itemType自动生成"
  
  template_management:
    - "保存配置为模板"
    - "从模板加载配置"
    - "模板分类管理"
    - "模板分享导出"
  
  import_export:
    - "导出为JSON"
    - "导出为YAML"
    - "从JSON导入"
    - "从YAML导入"
  
  visual_feedback:
    - "实时配置预览"
    - "代码高亮显示"
    - "错误提示标注"
    - "成功状态指示"
```

---

## 📊 表单数据流

```yaml
data_flow:
  input:
    - "用户填写表单字段"
    - "AI辅助生成内容"
    - "模板加载数据"
  
  processing:
    - "实时验证规则"
    - "自动补全逻辑"
    - "规范合规性检查"
    - "配置文件生成"
  
  output:
    - "agents_config.yaml"
    - "data_schema.yaml"
    - "run_*.py脚本"
    - "integrate_*.py脚本"
    - "workspace_trigger_*.py脚本"
    - "visualization_config.yaml（可选）"
    - "README.md文档"
  
  storage:
    - "草稿保存到localStorage"
    - "模板保存到服务器"
    - "生成文件保存到文件系统"
```

---

## ✅ 对齐检查清单

### 与Autogen规范对齐

- ✅ 强制使用AssistantAgent（内生）
- ✅ 强制使用GroupChat（内生）
- ✅ 强制使用ChromaDBVectorMemory（内生）
- ✅ 配置文件驱动，无自定义类
- ✅ 外部脚本启动
- ✅ Memory-first原则
- ✅ tools与workbench互斥检查

### 与知识库设计规范对齐

- ✅ ChromaDBVectorMemory配置参数完整
- ✅ 嵌入函数配置选项（Default/OpenAI/SentenceTransformer）
- ✅ k值和score_threshold参数
- ✅ collection_name命名规范
- ✅ persistence_path配置

### 与MD底座规范对齐

- ✅ itemType字段
- ✅ 项目ID格式（{type}_{timestamp}_{hash}）
- ✅ topic/meta/data/children结构
- ✅ 状态值规范

### 与现有系统集成对齐

- ✅ AutogenUnifiedStorage集成
- ✅ AutogenEventBus集成
- ✅ ColumnRegistry集成（可选）
- ✅ 可视化组件配置

---

**程序员**
