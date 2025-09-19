# -*- coding: utf-8 -*-
"""
通用智能体运行脚本 - 严格遵循AutoGen 0.7.1本地知识库规范
支持Agent和Team配置
参照: autogen_repo/python/samples/agentchat_chainlit/app_team.py
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
import io
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, List

# 设置UTF-8输出
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 项目根目录
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# 自动加载.env文件
def load_env_file():
    env_file = ROOT / ".env"
    if env_file.exists():
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if key and not os.environ.get(key):
                            os.environ[key] = value
        except Exception as e:
            print(f"[警告] .env文件加载失败: {e}")

# 加载环境变量
load_env_file()

# 导入AutoGen 0.7.1原生模块 - 严格按照本地知识库规范
try:
    from autogen_agentchat.agents import AssistantAgent
    from autogen_agentchat.teams import RoundRobinGroupChat
    from autogen_agentchat.ui import Console
    from autogen_agentchat.messages import TextMessage
    from autogen_ext.models.openai import OpenAIChatCompletionClient
    print("[导入] 使用AutoGen 0.7.1原生模块")
except ImportError as e:
    print(f"错误: 无法导入AutoGen原生模块: {e}")
    print("请确保已安装AutoGen 0.7.1:")
    print("  pip install autogen-agentchat autogen-ext")
    sys.exit(1)

class UniversalRunner:
    """通用运行器 - 支持Agent和Team - 严格遵循本地知识库规范"""
    
    def __init__(self, config_path: str, verbose: bool = False):
        self.config_path = Path(config_path)
        self.verbose = verbose
        self.config = None
        self.component_type = None
        self.agent = None
        self.team = None
        self.clients = []  # 存储所有model clients用于清理
        
        self._load_config()
        self._create_component()
    
    def _load_config(self):
        """加载配置文件"""
        if not self.config_path.exists():
            raise FileNotFoundError(f"配置文件不存在: {self.config_path}")
        
        try:
            with self.config_path.open('r', encoding='utf-8') as f:
                self.config = json.load(f)
            
            self.component_type = self.config.get('component_type', 'agent')
            
            if self.verbose:
                print(f"[配置] 已加载: {self.config_path}")
                print(f"[配置] 组件类型: {self.component_type}")
                
        except Exception as e:
            raise ValueError(f"配置文件格式错误: {e}")
    
    def _create_model_client(self, model_config: Dict[str, Any]) -> OpenAIChatCompletionClient:
        """创建模型客户端 - 严格按照本地知识库规范"""
        mc_config = model_config.get('config', {})
        
        model = mc_config.get('model', 'gpt-3.5-turbo')
        base_url = mc_config.get('base_url')
        api_key_env = mc_config.get('api_key_env', 'OPENAI_API_KEY')
        
        # 获取API密钥
        api_key = os.getenv(api_key_env)
        if not api_key:
            raise ValueError(f"环境变量 {api_key_env} 未设置")
        
        if self.verbose:
            print(f"[模型] 模型: {model}")
            print(f"[模型] API地址: {base_url}")
            print(f"[模型] API密钥环境变量: {api_key_env}")
        
        # 构建客户端参数
        client_params = {
            'model': model,
            'api_key': api_key
        }
        
        if base_url:
            client_params['base_url'] = base_url
        
        # 添加其他配置参数
        for key, value in mc_config.items():
            if key not in ['model', 'base_url', 'api_key', 'api_key_env']:
                client_params[key] = value
        
        client = OpenAIChatCompletionClient(**client_params)
        self.clients.append(client)  # 记录用于清理
        return client
    
    def _create_agent(self, agent_config: Dict[str, Any]) -> AssistantAgent:
        """创建单个Agent - 严格按照本地知识库规范"""
        name = agent_config.get('name', 'Assistant')
        system_message = agent_config.get('system_message', 'You are a helpful assistant.')
        
        # 创建模型客户端
        model_client_config = agent_config.get('model_client', {})
        model_client = self._create_model_client(model_client_config)
        
        # 创建Agent
        agent = AssistantAgent(
            name=name,
            model_client=model_client,
            system_message=system_message
        )
        
        if self.verbose:
            print(f"[Agent] 创建成功: {name}")
        
        return agent
    
    def _create_component(self):
        """创建组件 - Agent或Team"""
        try:
            if self.component_type == 'agent':
                self._create_agent_component()
            elif self.component_type == 'team':
                self._create_team_component()
            else:
                raise ValueError(f"不支持的组件类型: {self.component_type}")
                
        except Exception as e:
            raise RuntimeError(f"创建组件失败: {e}")
    
    def _create_agent_component(self):
        """创建Agent组件"""
        # 提取Agent配置
        if 'config' in self.config:
            agent_config = self.config['config']
        else:
            agent_config = self.config
        
        self.agent = self._create_agent(agent_config)
        
        if self.verbose:
            print(f"[组件] Agent组件创建成功")
    
    def _create_team_component(self):
        """创建Team组件 - 严格按照本地知识库规范"""
        team_config = self.config.get('config', {})
        participants_config = team_config.get('participants', [])
        
        if not participants_config:
            raise ValueError("Team配置中缺少participants")
        
        # 创建所有参与者
        participants = []
        for participant_config in participants_config:
            if participant_config.get('component_type') == 'agent':
                agent_config = participant_config.get('config', {})
                agent = self._create_agent(agent_config)
                participants.append(agent)
            else:
                raise ValueError(f"不支持的参与者类型: {participant_config.get('component_type')}")
        
        # 创建Team - 严格按照本地知识库规范
        # 参照: samples/agentchat_chainlit/app_team.py
        team_params = {
            'participants': participants
        }
        
        # 添加其他Team配置
        max_turns = team_config.get('max_turns')
        if max_turns is not None:
            team_params['max_turns'] = max_turns
        
        # 创建RoundRobinGroupChat
        self.team = RoundRobinGroupChat(**team_params)
        
        if self.verbose:
            print(f"[组件] Team组件创建成功，参与者数量: {len(participants)}")
    
    async def run_once_async(self, user_input: str) -> str:
        """异步执行一次推理 - 使用AutoGen原生方法"""
        try:
            if self.verbose:
                print(f"\n[用户] {user_input}")
            
            result_messages = []
            
            if self.component_type == 'agent':
                # Agent模式 - 严格按照本地知识库规范
                async for message in self.agent.run_stream(task=user_input):
                    if hasattr(message, 'content'):
                        result_messages.append(str(message.content))
                    else:
                        result_messages.append(str(message))
            
            elif self.component_type == 'team':
                # Team模式 - 严格按照本地知识库规范
                # 参照: samples/agentchat_chainlit/app_team.py
                task_message = TextMessage(content=user_input, source="user")
                
                async for message in self.team.run_stream(task=[task_message]):
                    if hasattr(message, 'content'):
                        result_messages.append(str(message.content))
                    else:
                        result_messages.append(str(message))
            
            # 合并所有输出
            result = '\n'.join(result_messages) if result_messages else "响应为空"
            
            if self.verbose:
                print(f"[响应] {result}")
            
            return result
            
        except Exception as e:
            error_msg = f"推理执行错误: {e}"
            if self.verbose:
                print(f"[错误] {error_msg}")
                print(traceback.format_exc())
            return f"执行出错: {error_msg}"
    
    def run_once(self, user_input: str) -> str:
        """同步执行一次推理"""
        try:
            return asyncio.run(self.run_once_async(user_input))
        except RuntimeError:
            # 处理事件循环冲突
            loop = asyncio.new_event_loop()
            try:
                return loop.run_until_complete(self.run_once_async(user_input))
            finally:
                loop.close()
    
    async def interactive_mode_async(self):
        """异步交互模式 - 严格按照本地知识库规范"""
        component_name = "智能体"
        if self.component_type == 'agent' and self.agent:
            component_name = self.agent.name
        elif self.component_type == 'team':
            component_name = "团队"
        
        print(f"开始与 {component_name} 的交互对话，输入 '退出' 结束对话")
        
        round_count = 0
        while True:
            round_count += 1
            try:
                user_input = input(f"\n[第{round_count}轮] 用户: ")
                if user_input.lower() in ("退出", "exit", "quit", ":quit"):
                    print("对话已结束。")
                    break
                
                print("思考中...")
                
                if self.component_type == 'agent':
                    # Agent交互模式
                    await Console(self.agent.run_stream(task=user_input))
                elif self.component_type == 'team':
                    # Team交互模式 - 严格按照本地知识库规范
                    task_message = TextMessage(content=user_input, source="user")
                    await Console(self.team.run_stream(task=[task_message]))
                
            except KeyboardInterrupt:
                print("\n对话被用户中断。")
                break
            except Exception as e:
                print(f"[错误] 对话轮次 {round_count} 出现错误: {e}")
                if self.verbose:
                    print(traceback.format_exc())
    
    def interactive_mode(self):
        """交互模式"""
        try:
            asyncio.run(self.interactive_mode_async())
        except RuntimeError:
            loop = asyncio.new_event_loop()
            try:
                loop.run_until_complete(self.interactive_mode_async())
            finally:
                loop.close()
    
    async def cleanup(self):
        """清理资源 - 严格按照本地知识库规范"""
        for client in self.clients:
            try:
                await client.close()
                if self.verbose:
                    print("[清理] 模型客户端已关闭")
            except Exception as e:
                if self.verbose:
                    print(f"[警告] 清理资源时出错: {e}")

def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="通用智能体运行脚本（AutoGen 0.7.1原生方法，支持Agent和Team）",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("-c", "--config", required=True, help="智能体/团队配置文件路径")
    parser.add_argument("-i", "--input", help="用户输入内容（非交互模式）")
    parser.add_argument("--interactive", action="store_true", help="启用交互式对话模式")
    parser.add_argument("-v", "--verbose", action="store_true", help="详细输出模式")
    
    args = parser.parse_args()
    
    runner = None
    try:
        # 创建运行器
        runner = UniversalRunner(args.config, verbose=args.verbose)
        
        # 选择运行模式
        if args.interactive:
            runner.interactive_mode()
        elif args.input:
            response = runner.run_once(args.input)
            if not args.verbose:
                print(response)
        else:
            parser.print_help()
            
    except Exception as e:
        print(f"错误: {e}")
        if args.verbose:
            print(traceback.format_exc())
        sys.exit(1)
    finally:
        # 清理资源
        if runner and runner.clients:
            try:
                asyncio.run(runner.cleanup())
            except:
                pass

if __name__ == "__main__":
    main()
