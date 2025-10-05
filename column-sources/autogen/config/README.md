# Autogen配置文件说明

## 📁 目录结构

```
config/
├── agents/           # Agent配置文件目录
│   ├── mindmap_assistant.json
│   ├── structure_expert.json
│   ├── content_expert.json
│   └── analysis_expert.json
├── teams/            # Team配置文件目录
│   ├── mindmap_expert_team.json
│   └── simple_assistant.json
└── README.md         # 本文件
```

## 📋 Agent配置格式

每个Agent配置文件必须包含以下字段：

```json
{
  "id": "agent_unique_id",           // 唯一标识符
  "name": "Agent显示名称",            // 显示名称
  "type": "assistant",                // Agent类型
  "config": {
    "system_message": "系统提示词",   // Agent的系统提示词
    "model": "gpt-4",                 // 使用的模型
    "temperature": 0.7,               // 温度参数
    "max_tokens": 2000                // 最大token数
  },
  "metadata": {
    "created_at": "2025-10-05T11:55:00Z",
    "author": "system",
    "version": "1.0",
    "usage_count": 0,
    "success_rate": 0
  },
  "tags": ["tag1", "tag2"]            // 标签数组
}
```

## 📋 Team配置格式

每个Team配置文件必须包含以下字段：

```json
{
  "id": "team_unique_id",             // 唯一标识符
  "name": "Team显示名称",              // 显示名称
  "description": "Team描述",           // 描述
  "agents": ["agent_id1", "agent_id2"], // Agent ID数组
  "workflow": {
    "first_agent": "agent_id1",       // 首个Agent
    "fallback_agent": "agent_id2",    // 备用Agent
    "max_round": 10                   // 最大轮次
  },
  "manager_config": {
    "model": "gpt-4",
    "temperature": 0.5
  },
  "metadata": {
    "created_at": "2025-10-05T11:55:00Z",
    "author": "system",
    "version": "1.0",
    "usage_count": 0,
    "average_processing_time": 0
  },
  "tags": ["tag1", "tag2"]
}
```

## 🔧 如何添加新配置

### 添加新Agent

1. 在 `agents/` 目录创建新的JSON文件
2. 按照上述格式填写配置
3. 确保 `id` 字段唯一
4. 在管理页面点击"📂 导入配置"按钮

### 添加新Team

1. 在 `teams/` 目录创建新的JSON文件
2. 按照上述格式填写配置
3. 确保 `agents` 数组中的Agent ID存在
4. 在管理页面点击"📂 导入配置"按钮

## ⚠️ 注意事项

1. **文件命名**: 建议使用小写字母和下划线，例如 `my_custom_agent.json`
2. **ID唯一性**: 每个Agent和Team的ID必须唯一
3. **Agent引用**: Team配置中的Agent ID必须在agents目录中存在
4. **JSON格式**: 确保JSON格式正确，可以使用在线工具验证
5. **自动导入**: 管理页面首次加载时会自动从配置文件导入

## 🔄 配置更新流程

1. 修改配置文件
2. 在管理页面点击"🔄 重新加载"按钮
3. 或者点击"📂 导入配置"强制重新导入

## 📤 配置导出

在管理页面点击"📥 导出配置"可以导出当前所有配置到JSON文件，用于备份或迁移。

## 🔧 外部运行脚本

### 运行单个Agent
```bash
python run_agent.py -c config/agents/mindmap_assistant.json -i "请帮我扩展项目管理节点"
```

### 运行Team（交互模式）
```bash
python run_team_interactive.py --team-json config/teams/mindmap_expert_team.json --max-rounds 3
```

### 脚本说明
- **run_agent.py**: 运行单个Agent，支持单次对话和交互模式
- **run_team_interactive.py**: 运行Team协作，支持多Agent协同处理

### 环境要求
1. 安装Python 3.8+
2. 安装Autogen依赖：`pip install pyautogen`
3. 设置环境变量：`OPENAI_API_KEY` 或其他模型的API Key
