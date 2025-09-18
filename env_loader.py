# -*- coding: utf-8 -*-
"""
统一环境变量加载器
- 从项目根目录 .env 读取必要配置
- 设置默认值与运行模式（本地/混合）
- 不输出敏感值，仅打印去敏状态
"""
import os
from pathlib import Path
from typing import Dict

try:
    from dotenv import load_dotenv
except Exception:  # 允许缺省
    load_dotenv = None


NEEDED_KEYS = [
    # 大模型/AutoGen
    'OPENAI_API_KEY',
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_DEPLOYMENT',
    # 图数据库/关系
    'NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD',
    # 向量库等
    'VECTOR_DB_URL',
    # 后端端口（可选）
    'REGISTRY_PORT',
]


def _mask(v: str) -> str:
    if not v:
        return ''
    if len(v) <= 6:
        return '*' * len(v)
    return v[:3] + '***' + v[-3:]


def init_env() -> Dict[str, str]:
    """加载 .env，并返回精简后的环境配置。
    如果缺少大模型 Key，则设置运行模式为 local。
    """
    root = Path(__file__).parent
    env_path = root / '.env'

    if load_dotenv and env_path.exists():
        load_dotenv(dotenv_path=str(env_path), override=False)
        print(f"[ENV] 已加载 .env: {env_path}")
    else:
        print("[ENV] 未加载 .env（未安装 python-dotenv 或文件不存在），采用系统环境变量")

    cfg = {k: os.getenv(k, '') for k in NEEDED_KEYS}

    # 运行模式判断
    has_llm = bool(cfg.get('OPENAI_API_KEY') or cfg.get('AZURE_OPENAI_API_KEY'))
    mode = 'hybrid' if has_llm else 'local'
    cfg['RUN_MODE'] = mode

    # 端口默认值
    if not cfg.get('REGISTRY_PORT'):
        cfg['REGISTRY_PORT'] = '8081'

    # 去敏输出
    printable = {k: (_mask(v) if 'KEY' in k or 'PASSWORD' in k else v) for k, v in cfg.items()}
    print('[ENV] 配置摘要 =>', printable)

    return cfg
