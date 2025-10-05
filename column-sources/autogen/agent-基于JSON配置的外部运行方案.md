# agent-基于JSON配置的外部运行方案

## 🎯 方案对齐与优化

### 1. 运行机制对齐检查

#### 1.1 当前方案问题识别
**原方案问题**：
- ❌ 在Python代码中硬编码Agent配置
- ❌ 使用自定义的Agent初始化逻辑
- ❌ 没有完全使用外部配置驱动

**优化后方案**：
- ✅ 预先配置Agent和Team的JSON配置文件
- ✅ 使用外部Python脚本运行，配置作为参数传入
- ✅ 完全使用Autogen原生运行机制

### 2. JSON配置规范

#### 2.1 Agent配置JSON格式
```json
{
  "agent_configs": {
    "mindmap_assistant": {
      "name": "MindmapAssistant",
      "system_message": "你是一个专业的脑图助手，帮助用户扩展、分析和优化脑图结构。",
      "llm_config": {
        "config_list": [
          {
            "model": "gpt-4",
            "api_key": "${OPENAI_API_KEY}",
            "api_type": "openai"
          }
        ],
        "temperature": 0.7,
        "timeout": 600
      },
      "human_input_mode": "NEVER",
      "max_consecutive_auto_reply": 5
    },
    "structure_expert": {
      "name": "StructureExpert",
      "system_message": "你是脑图结构专家，负责优化节点组织结构。",
      "llm_config": {
        "config_list": [
          {
            "model": "gpt-4",
            "api_key": "${OPENAI_API_KEY}",
            "api_type": "openai"
          }
        ]
      }
    },
    "content_expert": {
      "name": "ContentExpert",
      "system_message": "你是内容生成专家，负责扩展和丰富节点内容。",
      "llm_config": {
        "config_list": [
          {
            "model": "gpt-4",
            "api_key": "${OPENAI_API_KEY}",
            "api_type": "openai"
          }
        ]
      }
    }
  }
}
```

#### 2.2 Team配置JSON格式
```json
{
  "team_configs": {
    "mindmap_expert_team": {
      "name": "MindmapExpertTeam",
      "agents": ["structure_expert", "content_expert", "mindmap_assistant"],
      "manager_llm_config": {
        "config_list": [
          {
            "model": "gpt-4",
            "api_key": "${OPENAI_API_KEY}",
            "api_type": "openai"
          }
        ]
      },
      "max_round": 10,
      "roles": {
        "structure_expert": "结构优化专家",
        "content_expert": "内容生成专家", 
        "mindmap_assistant": "脑图助手"
      }
    },
    "simple_assistant": {
      "name": "SimpleAssistant",
      "agents": ["mindmap_assistant"],
      "max_round": 5
    }
  }
}
```

#### 2.3 运行配置JSON格式
```json
{
  "run_config": {
    "team": "mindmap_expert_team",
    "user_intent": "expand",
    "input_data": {
      "node_data": {
        "id": "node_123",
        "topic": "项目管理需求",
        "content": "需要设计一个项目管理系统的脑图结构...",
        "parent_id": "root"
      },
      "context": {
        "mindmap_id": "mindmap_001",
        "selected_nodes": ["node_123"]
      }
    },
    "output_format": "mindmap_nodes",
    "timeout": 30
  }
}
```

### 3. 外部Python运行脚本设计

#### 3.1 主运行脚本 (run_agent.py)
```python
#!/usr/bin/env python3
"""
Autogen Agent外部运行脚本
使用JSON配置文件运行预配置的Agent和Team
"""

import json
import os
import sys
import argparse
from pathlib import Path
import autogen
from autogen import GroupChat, GroupChatManager

class ConfigLoader:
    """配置加载器"""
    
    def __init__(self, config_dir="agent_configs"):
        self.config_dir = Path(config_dir)
        self.agent_configs = {}
        self.team_configs = {}
        
    def load_configs(self):
        """加载所有配置文件"""
        # 加载Agent配置
        agent_config_file = self.config_dir / "agents.json"
        if agent_config_file.exists():
            with open(agent_config_file, 'r', encoding='utf-8') as f:
                self.agent_configs = json.load(f)['agent_configs']
        
        # 加载Team配置  
        team_config_file = self.config_dir / "teams.json"
        if team_config_file.exists():
            with open(team_config_file, 'r', encoding='utf-8') as f:
                self.team_configs = json.load(f)['team_configs']
                
    def resolve_env_vars(self, config):
        """解析环境变量"""
        if isinstance(config, dict):
            return {k: self.resolve_env_vars(v) for k, v in config.items()}
        elif isinstance(config, list):
            return [self.resolve_env_vars(item) for item in config]
        elif isinstance(config, str) and config.startswith('${') and config.endswith('}'):
            env_var = config[2:-1]
            return os.getenv(env_var, config)
        else:
            return config

class AgentRunner:
    """Agent运行器"""
    
    def __init__(self, config_loader):
        self.config_loader = config_loader
        self.agents = {}
        
    def create_agents(self):
        """根据配置创建Agent实例"""
        for agent_id, agent_config in self.config_loader.agent_configs.items():
            # 解析环境变量
            resolved_config = self.config_loader.resolve_env_vars(agent_config)
            
            # 创建Agent
            if resolved_config.get('human_input_mode') == 'NEVER':
                agent = autogen.UserProxyAgent(
                    name=resolved_config['name'],
                    human_input_mode=resolved_config['human_input_mode'],
                    max_consecutive_auto_reply=resolved_config.get('max_consecutive_auto_reply', 5),
                    code_execution_config=False
                )
            else:
                agent = autogen.AssistantAgent(
                    name=resolved_config['name'],
                    system_message=resolved_config['system_message'],
                    llm_config=resolved_config['llm_config']
                )
            
            self.agents[agent_id] = agent
            
    def run_team(self, team_id, message, run_config):
        """运行指定Team处理消息"""
        if team_id not in self.config_loader.team_configs:
            raise ValueError(f"Team配置不存在: {team_id}")
            
        team_config = self.config_loader.team_configs[team_id]
        
        # 获取Team中的Agent实例
        team_agents = []
        for agent_id in team_config['agents']:
            if agent_id in self.agents:
                team_agents.append(self.agents[agent_id])
            else:
                raise ValueError(f"Agent不存在: {agent_id}")
        
        # 创建GroupChat
        groupchat = GroupChat(
            agents=team_agents,
            messages=[],
            max_round=team_config.get('max_round', 10)
        )
        
        # 创建Manager
        manager = GroupChatManager(
            groupchat=groupchat,
            llm_config=team_config.get('manager_llm_config', {})
        )
        
        # 运行对话
        if team_agents and hasattr(team_agents[0], 'initiate_chat'):
            team_agents[0].initiate_chat(
                manager,
                message=message,
                clear_history=True
            )
            
            # 获取最后一条消息作为结果
            last_message = team_agents[0].chat_messages[manager][-1]["content"]
            return self.format_output(last_message, run_config)
        
        return {"error": "对话执行失败"}
    
    def format_output(self, content, run_config):
        """格式化输出结果"""
        output_format = run_config.get('output_format', 'text')
        
        if output_format == 'mindmap_nodes':
            # 解析为脑图节点格式
            return self.parse_mindmap_nodes(content)
        else:
            return {
                "type": "text",
                "content": content,
                "format": output_format
            }
    
    def parse_mindmap_nodes(self, content):
        """解析脑图节点结构"""
        # 这里可以添加具体的解析逻辑
        # 暂时返回原始内容
        return {
            "type": "mindmap_nodes",
            "content": content,
            "nodes": []  # 实际解析后的节点数据
        }

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='运行Autogen Agent')
    parser.add_argument('--config-dir', default='agent_configs', help='配置文件目录')
    parser.add_argument('--run-config', required=True, help='运行配置JSON文件路径')
    parser.add_argument('--output', help='输出文件路径')
    
    args = parser.parse_args()
    
    try:
        # 加载运行配置
        with open(args.run_config, 'r', encoding='utf-8') as f:
            run_config = json.load(f)['run_config']
        
        # 初始化配置加载器
        config_loader = ConfigLoader(args.config_dir)
        config_loader.load_configs()
        
        # 创建Agent运行器
        runner = AgentRunner(config_loader)
        runner.create_agents()
        
        # 准备消息
        message = format_message(run_config['input_data'], run_config['user_intent'])
        
        # 运行Team
        result = runner.run_team(run_config['team'], message, run_config)
        
        # 输出结果
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
        else:
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)

def format_message(input_data, user_intent):
    """格式化输入消息"""
    intent_descriptions = {
        "expand": "请帮我扩展这个节点，生成详细的子节点结构",
        "summarize": "请总结这个节点及其子节点的内容",
        "analyze": "请分析这个节点的逻辑结构和关系", 
        "generate": "请基于这个节点主题生成相关内容",
        "optimize": "请优化这个节点树的组织结构"
    }
    
    node_data = input_data['node_data']
    context = input_data.get('context', {})
    
    message = f"""
用户意图: {intent_descriptions.get(user_intent, user_intent)}

节点信息:
- 标题: {node_data['topic']}
- 内容: {node_data.get('content', '')}
- 节点ID: {node_data['id']}

上下文信息:
- 脑图ID: {context.get('mindmap_id', '未知')}
- 选中节点: {context.get('selected_nodes', [])}

请根据用户意图处理这个节点，并返回结构化的结果。
"""
    return message

if __name__ == "__main__":
    main()
```

### 4. 目录结构规范

```
agent_configs/
├── agents.json          # Agent配置
├── teams.json           # Team配置
└── run_configs/         # 运行配置示例
    ├── expand_node.json
    ├── analyze_node.json
    └── optimize_structure.json

scripts/
├── run_agent.py         # 主运行脚本
├── start_agent_service.py  # 启动Agent服务
└── health_check.py      # 健康检查脚本

examples/
├── basic_usage.md       # 基础使用示例
└── advanced_usage.md    # 高级使用示例
```

### 5. 使用示例

#### 5.1 基础使用
```bash
# 运行单个Agent处理请求
python scripts/run_agent.py \
  --run-config agent_configs/run_configs/expand_node.json \
  --output result.json
```

#### 5.2 团队协作使用
```bash
# 运行专家团队处理复杂请求
python scripts/run_agent.py \
  --config-dir agent_configs \
  --run-config agent_configs/run_configs/analyze_complex.json \
  --output analysis_result.json
```

#### 5.3 集成到后端服务
```python
# 在后端API中调用外部脚本
import subprocess
import json

def run_agent_via_script(request_data):
    """通过外部脚本运行Agent"""
    
    # 准备运行配置
    run_config = {
        "run_config": {
            "team": "mindmap_expert_team",
            "user_intent": request_data['user_intent'],
            "input_data": request_data,
            "output_format": "mindmap_nodes",
            "timeout": 30
        }
    }
    
    # 保存临时配置
    temp_config = "temp_run_config.json"
    with open(temp_config, 'w') as f:
        json.dump(run_config, f)
    
    try:
        # 运行外部脚本
        result = subprocess.run([
            'python', 'scripts/run_agent.py',
            '--run-config', temp_config,
            '--output', 'temp_result.json'
        ], capture_output=True, text=True, timeout=35)
        
        if result.returncode == 0:
            with open('temp_result.json', 'r') as f:
                return json.load(f)
        else:
            return {"error": result.stderr}
            
    finally:
        # 清理临时文件
        import os
        if os.path.exists(temp_config):
            os.remove(temp_config)
        if os.path.exists('temp_result.json'):
            os.remove('temp_result.json')
```

### 6. 与现有架构集成

#### 6.1 后端API集成优化
```python
# 在registry_server.py中集成外部脚本运行
@app.route('/api/agent/run', methods=['POST'])
def run_agent():
    """运行Agent处理请求"""
    try:
        data = request.get_json()
        
        # 验证请求
        validation_result = validate_agent_request(data)
        if not validation_result['valid']:
            return jsonify({
                'success': False,
                'error': validation_result['error']
            }), 400
        
        # 使用外部脚本运行Agent
        result = run_agent_via_script(data)
        
        # 保存操作历史
        save_agent_history({
            'request_id': generate_request_id(),
            'input_data': data,
            'output_data': result,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'result': result,
            'metadata': {
                'processing_time': 0,  # 实际需要计算
                'model_used': 'gpt-4'
            }
        })
        
    except Exception as e:
        logger.error(f'Agent运行失败: {e}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
```

### 7. 配置管理最佳实践

#### 7.1 环境变量管理
```bash
# .env文件
OPENAI_API_KEY=your_api_key_here
AGENT_CONFIG_DIR=./agent_configs
DEFAULT_TEAM=mindmap_expert_team
```

#### 7.2 配置版本控制
```json
{
  "version": "1.0.0",
  "description": "脑图助手Agent配置",
  "last_updated": "2025-10-05",
  "configs": {
    "agent_configs": {...},
    "team_configs": {...}
  }
}
```

### 8. 监控和日志

#### 8.1 运行日志
```python
# 在运行脚本中添加日志
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agent_runtime.log'),
        logging.StreamHandler()
    ]
)
```

## 🚀 实施步骤

### 阶段一：配置准备 (2-3天)
1. 创建JSON配置文件结构
2. 定义标准Agent和Team配置
3. 设置环境变量和依赖

### 阶段二：脚本开发 (2-3天)  
4. 实现外部运行脚本
5. 添加错误处理和日志
6. 编写使用文档和示例

### 阶段三：集成测试 (2-3天)
7. 与后端API集成测试
8. 性能和安全测试
9. 用户验收测试

## ✅ 方案优势

### 完全符合要求
- ✅ 预先配置JSON配置
- ✅ 外部Python脚本运行
- ✅ 配置作为参数传入
- ✅ 不使用自定义运行机制

### 技术优势
- ✅ 配置与代码分离
- ✅ 易于维护和扩展
- ✅ 支持多环境部署
- ✅ 完整的错误处理

### 架构优势  
- ✅ 复用现有Autogen原生能力
- ✅ 与项目架构完美集成
- ✅ 支持灵活的团队协作
- ✅ 提供完整的监控日志

---

**文档版本**: 3.0  
**最后更新**: 2025-10-05  
**维护者**: 架构师团队  
**状态**: 完全对齐外部运行要求