# -*- coding: utf-8 -*-
"""
增强版Agent运行脚本 - 作为客户端运行期的替代方案
- 读取Agent配置JSON
- 支持自定义用户输入
- 支持自定义内存策略
- 可选多轮对话模式
- 详细错误报告和日志记录
- 可控制详细度级别

用法示例（PowerShell）：
  # 单轮对话模式
  python .\scripts\run_agent.py -c ".\config\agents\agent_config.json" -i "你好，请介绍自己"
  
  # 多轮对话模式
  python .\scripts\run_agent.py -c ".\config\agents\agent_config.json" --interactive
  
  # 设置内存写入策略
  python .\scripts\run_agent.py -c ".\config\agents\agent_config.json" -i "我是张三" --memory-policy qa_both
  
  # 详细调试模式
  python .\scripts\run_agent.py -c ".\config\agents\agent_config.json" -i "查询今天的天气" --verbose
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
import io
import locale
from pathlib import Path
from typing import Dict, Any, Optional, List

# 设置stdout编码为UTF-8，避免中文乱码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 将项目根目录加入sys.path，便于相对导入
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# 尝试自动加载.env（可选）
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=ROOT / ".env")
except Exception as e:
    print(f"[警告] .env加载失败: {e}")

from autogen_client.config_loader import load_agent_json, normalize_agent_config
from autogen_client.autogen_backends import AutogenAgentBackend


def check_environment() -> Dict[str, bool]:
    """检查必要的环境变量是否已设置"""
    env_vars = [
        "DASHSCOPE_API_KEY",
        "OPENAI_API_KEY",
        "GOOGLE_API_KEY",
        "GOOGLE_CSE_CX"
    ]
    
    results = {}
    for var in env_vars:
        results[var] = os.getenv(var) is not None
    
    return results


def _load_and_normalize_config(cfg_path: Path) -> Dict[str, Any]:
    """加载并规范化配置，兼容 0.7.1 组件风格与后端风格。"""
    # 兼容：若是 0.7.1 组件风格（顶层 provider/component_type/config），先扁平化为后端风格
    try:
        with cfg_path.open('r', encoding='utf-8') as _f:
            _raw = json.load(_f)
    except Exception:
        _raw = None
    if isinstance(_raw, dict) and isinstance(_raw.get('config'), dict) and str(_raw.get('component_type') or '').lower() == 'agent':
        _cfg = dict(_raw.get('config') or {})
        # 确保 model_client 结构正确，特别是 model 参数
        mc = _cfg.get("model_client") or {}
        if isinstance(mc, dict) and isinstance(mc.get('config'), dict):
            # 0.7.1 组件风格：model_client.config.model
            mc_config = mc.get('config')
            if not mc_config.get('model'):
                mc_config['model'] = 'gpt-3.5-turbo'  # 默认模型
        else:
            # 如果 model_client 结构不完整，创建默认结构
            mc = {
                "provider": "autogen_ext.models.openai.OpenAIChatCompletionClient",
                "config": {
                    "model": "gpt-3.5-turbo",
                    "base_url": "https://api.openai.com/v1",
                    "api_key_env": "OPENAI_API_KEY"
                }
            }
        
        backend_flat = {
            "type": "agent",
            "name": _cfg.get("name") or _raw.get("label") or _raw.get("name") or "Assistant",
            "role": _cfg.get("role") or "assistant",
            "system_message": _cfg.get("system_message") or "You are a helpful assistant.",
            "model_client": mc,
            "memory": _cfg.get("memory") or [],
            "tools": _cfg.get("tools") or [],
            "memory_write_policy": _cfg.get("memory_write_policy") or "none",
        }
        cfg = normalize_agent_config(backend_flat)
    else:
        cfg = load_agent_json(str(cfg_path))

    # 将 api_key 中的占位符 ${ENV} 归一为 api_key_env，避免把字面量传入客户端
    try:
        import re as _re
        def _extract_env(val: str) -> str:
            try:
                m = _re.match(r"^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$", str(val).strip())
                return m.group(1) if m else ''
            except Exception:
                return ''
        ak = cfg.get('api_key')
        if isinstance(ak, str) and ak:
            envn = _extract_env(ak)
            if envn and not cfg.get('api_key_env'):
                cfg['api_key_env'] = envn
                try:
                    cfg.pop('api_key', None)
                except Exception:
                    pass
        # 同时处理嵌套位置（model_client.config.api_key）
        mc = cfg.get('model_client') or {}
        if isinstance(mc, dict):
            mcc = mc.get('config') or {}
            if isinstance(mcc, dict):
                ak2 = mcc.get('api_key')
                if isinstance(ak2, str) and ak2:
                    envn2 = _extract_env(ak2)
                    if envn2 and not (cfg.get('api_key_env') or mcc.get('api_key_env')):
                        cfg['api_key_env'] = envn2
                        try:
                            mcc.pop('api_key', None)
                        except Exception:
                            pass
                        mc['config'] = mcc
                        cfg['model_client'] = mc
    except Exception:
        pass
    return cfg


def run_agent_once(
    config_path: str, 
    user_input: str, 
    memory_policy: Optional[str] = None,
    verbose: bool = False
) -> str:
    """
    运行一次Agent对话
    
    Args:
        config_path: Agent配置文件路径
        user_input: 用户输入内容
        memory_policy: 可选，覆盖内存写入策略
        verbose: 详细输出模式
    
    Returns:
        str: Agent的响应内容
    """
    try:
        # 加载配置
        cfg_path = Path(config_path)
        if not cfg_path.exists():
            return f"错误: 配置文件不存在: {cfg_path}"
        
        cfg = _load_and_normalize_config(cfg_path)
        
        # 调试：打印配置结构
        if verbose:
            print(f"[调试] 加载的配置结构:")
            print(f"  name: {cfg.get('name')}")
            mc = cfg.get('model_client', {})
            if isinstance(mc, dict):
                mc_config = mc.get('config', {})
                print(f"  model_client.config.model: {mc_config.get('model')}")
                print(f"  model_client.config.base_url: {mc_config.get('base_url')}")
                print(f"  model_client.config.api_key_env: {mc_config.get('api_key_env')}")
        
        # 应用内存策略（如有指定）
        original_policy = cfg.get("memory_write_policy", "none")
        if memory_policy:
            try:
                cfg["memory_write_policy"] = str(memory_policy).lower()
                if verbose:
                    print(f"[配置] 内存写入策略从 {original_policy} 更改为 {cfg['memory_write_policy']}")
            except Exception as e:
                if verbose:
                    print(f"[警告] 设置内存策略失败: {e}")
        
        if verbose:
            name = cfg.get("name", "未命名")
            model = (cfg.get("model_client") or {}).get("config", {}).get("model", "未知")
            print(f"[配置] name={name} model={model}")
            print(f"[配置] memory_write_policy={cfg.get('memory_write_policy', 'none')}")
            
            # 检查内存配置
            memory_cfg = cfg.get("memory")
            if memory_cfg:
                mem_type = memory_cfg.get("type") if isinstance(memory_cfg, dict) else None
                print(f"[配置] 内存类型: {mem_type or '未设置'}")
        
        # 构建后端
        log_dir = str(ROOT / "logs" / "agent")
        backend = AutogenAgentBackend(agent_config=cfg, log_dir=log_dir)
        
        # 执行推理
        if verbose:
            print(f"\n[用户] {user_input}")
        
        try:
            response = backend.infer_once(user_input)
            if verbose:
                print(f"[助手] {response}")
            
            # 显式关闭内存资源
            try:
                if hasattr(backend, "_close_memories_if_needed") and callable(getattr(backend, "_close_memories_if_needed", None)):
                    if verbose:
                        print(f"[内存] 正在关闭内存资源...")
                    # 从后端获取内存对象列表并传递给关闭函数
                    memories = getattr(backend, "_memory_objects", None) or []
                    backend._close_memories_if_needed(memories)
                    if verbose:
                        print(f"[内存] 内存资源关闭完成")
            except Exception as close_e:
                if verbose:
                    print(f"[警告] 关闭内存资源时出错: {close_e}")
            
            return response
        except Exception as e:
            error_msg = f"推理执行错误: {e}\n{traceback.format_exc()}"
            if verbose:
                print(f"[错误] {error_msg}")
            return f"执行出错: {error_msg}"
    
    except Exception as e:
        error_msg = f"运行Agent时出现错误: {e}\n{traceback.format_exc()}"
        if verbose:
            print(f"[错误] {error_msg}")
        return f"系统错误: {error_msg}"


def interactive_mode(
    config_path: str, 
    memory_policy: Optional[str] = None,
    verbose: bool = False
) -> None:
    """
    交互式对话模式
    
    Args:
        config_path: Agent配置文件路径
        memory_policy: 可选，覆盖内存写入策略
        verbose: 详细输出模式
    """
    try:
        # 加载配置
        cfg_path = Path(config_path)
        if not cfg_path.exists():
            print(f"错误: 配置文件不存在: {cfg_path}")
            return
        
        cfg = _load_and_normalize_config(cfg_path)
        
        # 调试：打印配置结构
        if verbose:
            print(f"[调试] 加载的配置结构:")
            print(f"  name: {cfg.get('name')}")
            mc = cfg.get('model_client', {})
            if isinstance(mc, dict):
                mc_config = mc.get('config', {})
                print(f"  model_client.config.model: {mc_config.get('model')}")
                print(f"  model_client.config.base_url: {mc_config.get('base_url')}")
                print(f"  model_client.config.api_key_env: {mc_config.get('api_key_env')}")
        
        # 应用内存策略（如有指定）
        if memory_policy:
            try:
                cfg["memory_write_policy"] = str(memory_policy).lower()
                if verbose:
                    print(f"[配置] 内存写入策略设置为 {cfg['memory_write_policy']}")
            except Exception as e:
                if verbose:
                    print(f"[警告] 设置内存策略失败: {e}")
        
        name = cfg.get("name", "未命名")
        print(f"开始与 {name} 的交互对话模式，输入 '退出' 或 ':quit' 结束对话")
        
        # 构建后端
        log_dir = str(ROOT / "logs" / "agent")
        backend = AutogenAgentBackend(agent_config=cfg, log_dir=log_dir)
        
        round_count = 0
        while True:
            round_count += 1
            try:
                user_input = input(f"\n[第{round_count}轮] 用户: ")
                if user_input.lower() in ("退出", "exit", "quit", ":quit"):
                    print("对话已结束。")
                    # 在正常退出时关闭内存资源
                    try:
                        if hasattr(backend, "_close_memories_if_needed") and callable(getattr(backend, "_close_memories_if_needed", None)):
                            if verbose:
                                print(f"[内存] 正在关闭内存资源...")
                            backend._close_memories_if_needed()
                            if verbose:
                                print(f"[内存] 内存资源关闭完成")
                    except Exception as close_e:
                        if verbose:
                            print(f"[警告] 关闭内存资源时出错: {close_e}")
                    break
                
                print("思考中...")
                response = backend.infer_once(user_input)
                print(f"[第{round_count}轮] 助手: {response}")
                
            except KeyboardInterrupt:
                print("\n对话被用户中断。")
                # 在正常退出时关闭内存资源
                try:
                    if hasattr(backend, "_close_memories_if_needed") and callable(getattr(backend, "_close_memories_if_needed", None)):
                        if verbose:
                            print(f"[内存] 正在关闭内存资源...")
                        # 从后端获取内存对象列表并传递给关闭函数
                        memories = getattr(backend, "_memory_objects", None) or []
                        backend._close_memories_if_needed(memories)
                        if verbose:
                            print(f"[内存] 内存资源关闭完成")
                except Exception as close_e:
                    if verbose:
                        print(f"[警告] 关闭内存资源时出错: {close_e}")
                break
            except Exception as e:
                print(f"[错误] 对话轮次 {round_count} 出现错误: {e}")
                if verbose:
                    print(traceback.format_exc())
                # 关闭内存资源
                try:
                    if hasattr(backend, "_close_memories_if_needed") and callable(getattr(backend, "_close_memories_if_needed", None)):
                        if verbose:
                            print(f"[内存] 正在关闭内存资源...")
                        # 从后端获取内存对象列表并传递给关闭函数
                        memories = getattr(backend, "_memory_objects", None) or []
                        backend._close_memories_if_needed(memories)
                except Exception:
                    pass  # 出错时的关闭失败不再报告
    
    except Exception as e:
        print(f"[错误] 初始化交互模式失败: {e}")
        if verbose:
            print(traceback.format_exc())


def main():
    """主函数，解析命令行参数并执行对应操作"""
    parser = argparse.ArgumentParser(
        description="增强版Agent运行脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("-c", "--config", required=True, help="Agent配置JSON文件路径")
    parser.add_argument("-i", "--input", help="用户输入内容（非交互模式）")
    parser.add_argument("--memory-policy", help="覆盖内存写入策略（例如，qa_both, none, human）")
    parser.add_argument("--interactive", action="store_true", help="启用交互式对话模式")
    parser.add_argument("-v", "--verbose", action="store_true", help="详细输出模式")
    parser.add_argument("--env-file", help="可选：加载指定的 .env 文件，覆盖默认 ROOT/.env")
    parser.add_argument("--check-env", action="store_true", help="检查环境变量设置")
    
    args = parser.parse_args()

    # 优先加载命令行传入的 env 文件，其次回退到 ROOT/.env
    try:
        if args.env_file:
            from dotenv import load_dotenv as _load
            _load(dotenv_path=Path(args.env_file), override=False)
        else:
            # 已在模块顶层尝试加载 ROOT/.env；此处再尝试一次以防顶层失败
            from dotenv import load_dotenv as _load
            _load(dotenv_path=ROOT / ".env", override=False)
    except Exception as _e:
        print(f"[警告] 加载环境变量失败：{_e}")
    
    # 环境检查
    if args.check_env:
        env_status = check_environment()
        print("环境变量检查结果:")
        for var, exists in env_status.items():
            print(f"  {var}: {'已设置' if exists else '未设置'}")
    
    # 选择运行模式
    if args.interactive:
        interactive_mode(args.config, args.memory_policy, args.verbose)
    elif args.input:
        response = run_agent_once(args.config, args.input, args.memory_policy, args.verbose)
        if not args.verbose:
            print(response)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
