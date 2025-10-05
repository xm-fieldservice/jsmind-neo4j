# -*- coding: utf-8 -*-
"""
交互式团队运行脚本（AutoGen 0.7.1 内生团队机制）
- 循环读取用户输入，将其作为 user 消息传入团队推理（AutogenTeamBackend.infer_rounds）
- 每轮写入审计日志（utils.logger_sink：user/assistant），遵循会话落盘规则
- 支持从 JSON 文件加载团队配置（backend-style 或 component-style 均可）

用法（PowerShell）：
  # 基本用法（指定团队配置 JSON 文件路径）
  python .\scripts\run_team_interactive.py --team-json \
    .\config\projects\1.json --max-rounds 2 --timeout 60

命令：
  :q / :quit - 退出程序
  :h / :help - 显示帮助

说明：
- 必须在环境中设置对应 API Key（如 DASHSCOPE_API_KEY 或 OPENAI_API_KEY）
- UTF-8 输出，适配 Windows PowerShell
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional
from datetime import datetime
import io
import re

# 强制 UTF-8 输出（Windows PowerShell 适配），并忽略无法编码的代理字符
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="ignore")
    else:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="ignore")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="ignore")
    else:
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="ignore")
except Exception:
    pass

# 项目根目录入 sys.path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# 本地模块（严格使用内生机制）
from autogen_client.autogen_backends import AutogenTeamBackend, AutogenAgentBackend  # type: ignore
from autogen_client.config_loader import (
    normalize_team_config as _normalize_team_config,  # type: ignore
    normalize_agent_config as _normalize_agent_config,  # type: ignore
    load_agent_json as _load_agent_json,  # type: ignore
)
from utils.logger_sink import log_user_message, log_assistant_message  # type: ignore
from scripts.notes_core import preprocess_and_write  # type: ignore


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _gen_session_id() -> str:
    # 会话ID：YYYY-MM-DD-<short-uuid>
    return datetime.utcnow().strftime("%Y-%m-%d") + "-" + os.urandom(8).hex()


def _dbg(msg: str):
    try:
        sys.stderr.write(f"[team_interactive] {msg}\n")
        sys.stderr.flush()
    except Exception:
        pass


def _load_json(path: Path) -> Dict[str, Any]:
    data: Dict[str, Any] = {}
    try:
        txt = path.read_text(encoding="utf-8", errors="ignore")
        data = json.loads(txt)
    except Exception as e:
        raise RuntimeError(f"加载 JSON 失败: {path} -> {e}")
    return data


def _safe_str(obj: Any) -> str:
    try:
        s = str(obj)
    except Exception:
        try:
            s = repr(obj)
        except Exception:
            s = ""
    try:
        return s.encode("utf-8", errors="ignore").decode("utf-8", errors="ignore")
    except Exception:
        return ""


def _p(s: str):
    """安全打印到 stdout，忽略无法编码的代理字符。"""
    try:
        txt = _safe_str(s) + "\n"
        sys.stdout.write(txt)
        sys.stdout.flush()
    except Exception:
        try:
            sys.stdout.buffer.write((s + "\n").encode("utf-8", errors="ignore"))
            sys.stdout.flush()
        except Exception:
            pass


def _sanitize(obj: Any):
    """递归清洗：将所有 str 中无法编码到 UTF-8 的代理字符删除。"""
    if isinstance(obj, str):
        try:
            return obj.encode("utf-8", errors="ignore").decode("utf-8", errors="ignore")
        except Exception:
            return obj
    if isinstance(obj, list):
        return [_sanitize(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    return obj


def _inject_placeholders(obj: Any, placeholders: Dict[str, str]):
    """递归替换配置中的占位符，如 {session_id}。
    - 仅作用于 str；其他类型保持不变
    - 深拷贝式返回，不修改原对象引用
    """
    try:
        if isinstance(obj, str):
            s = obj
            for k, v in (placeholders or {}).items():
                s = s.replace("{" + k + "}", str(v))
            return s
        if isinstance(obj, list):
            return [_inject_placeholders(v, placeholders) for v in obj]
        if isinstance(obj, dict):
            return {k: _inject_placeholders(v, placeholders) for k, v in obj.items()}
        return obj
    except Exception:
        return obj


def _rule_route(text: str) -> str:
    """简单规则路由：高置信度直达 note，其余交给团队路由。
    - 以 '#笔记' 前缀开头 -> note
    - 无问号且包含明显的记录类关键词（记录/补充/备忘/总结/进展/日志/纪要/说明/实现/修复/完成/上线） -> note
    - 其他 -> other（交给团队 Router/QARAG）
    """
    try:
        s = (text or "").strip()
        # 优先：若显式声明 [graphrag] 前缀，则交给 Agent 工具处理（避免被“说明/总结”等关键词误判为 note）
        sl = s.lower()
        if sl.startswith("[graphrag]") or ("[graphrag]" in sl):
            return "other"
        # 新增：若包含结构化查询提示词，强制归为问答路径
        structured_markers = [
            "核心答案",
            "详细说明",
            "权威来源",
            "查询统计",
            "智能网络查询",
            "严格按以下结构输出",
        ]
        if any(m in s for m in structured_markers):
            return "other"
        if s.startswith("#笔记"):
            return "note"
        low = s.lower()
        has_q = ("?" in low) or ("？" in s)
        note_kw = ["记录", "补充", "备忘", "总结", "进展", "日志", "纪要", "说明", "实现", "修复", "完成", "上线"]
        if (not has_q) and any(k in s for k in note_kw):
            return "note"
    except Exception:
        pass
    return "other"


def _load_env_file():
    """从项目根目录加载 .env 到当前进程环境（若未设置时才写入）。
    路径：<repo_root>/.env；忽略注释与空行；支持 KEY=VALUE（可带引号）。
    与 scripts/team_runner.py 的实现保持一致风格。
    """
    try:
        repo_root = Path(__file__).resolve().parents[1]
        env_path = repo_root / ".env"
        if not env_path.exists():
            return
        for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            if "=" not in s:
                continue
            key, val = s.split("=", 1)
            key = key.strip()
            val = val.strip()
            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                val = val[1:-1]
            if key and (key not in os.environ or os.environ.get(key, "") == ""):
                os.environ[key] = val
    except Exception:
        # 静默失败，避免影响交互
        pass


def _apply_env_file(path: Optional[str]):
    """从指定路径加载 .env。若 path 为空则不处理。优先于默认 _load_env_file。"""
    if not path:
        return
    p = Path(path)
    if not p.exists():
        _dbg(f"env-file 不存在: {p}")
        return
    try:
        for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
            s = line.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            k, v = s.split("=", 1)
            k = k.strip(); v = v.strip()
            if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                v = v[1:-1]
            if k and (k not in os.environ or os.environ.get(k, "") == ""):
                os.environ[k] = v
    except Exception:
        pass


def _apply_inline_env(kvs: list[str]):
    """从命令行 --set-env KEY=VALUE 写入当前进程环境。"""
    if not kvs:
        return
    for item in kvs:
        if not item or "=" not in item:
            continue
        k, v = item.split("=", 1)
        k = k.strip(); v = v.strip()
        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
            v = v[1:-1]
        if k:
            os.environ[k] = v


def _component_team_to_backend(team_cfg: Dict[str, Any]) -> Dict[str, Any]:
    """与 scripts/team_runner.py 保持一致的宽松转换逻辑。"""
    if not isinstance(team_cfg, dict):
        return {}
    members = team_cfg.get("members")
    if isinstance(members, list) and len(members) > 0:
        try:
            _dbg(f"检测到 backend-style 配置，members={len(members)}")
        except Exception:
            pass
        return team_cfg

    cfg = dict(team_cfg)
    conf = dict(cfg.get("config") or {})
    participants = conf.get("participants") or cfg.get("participants") or []

    # 调试：显示 participants 数量与名称
    try:
        names = []
        if isinstance(participants, list):
            for a in participants:
                if isinstance(a, dict):
                    ac = dict(a.get("config") or {})
                    names.append(ac.get("name") or a.get("name") or "")
        _dbg(f"component-style: participants={len(participants)} -> {names}")
    except Exception:
        pass

    def _to_backend_agent(a: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(a, dict):
            return {}
        ac = dict(a.get("config") or {})
        name = ac.get("name") or a.get("name") or "Assistant"
        system_message = ac.get("system_message") or a.get("system_message") or "You are a helpful assistant."
        mc = dict(ac.get("model_client") or a.get("model_client") or {})
        tools = ac.get("tools") or []
        memory = ac.get("memory") or []
        backend_agent = {
            "type": "agent",
            "name": name,
            "system_message": system_message,
            "model_client": mc,
            "tools": tools,
            "memory": memory,
        }
        try:
            backend_agent = _normalize_agent_config(backend_agent)
        except Exception:
            pass
        return backend_agent

    backend = {
        "type": "team",
        "name": conf.get("name") or cfg.get("name") or "Team",
        "members": [_to_backend_agent(x) for x in participants if isinstance(x, dict)],
        "max_rounds": conf.get("max_turns") or conf.get("max_rounds") or cfg.get("max_rounds") or 3,
    }
    # 调试：显示 backend members 数量与名称
    try:
        mem_names = [m.get("name") for m in (backend.get("members") or []) if isinstance(m, dict)]
        _dbg(f"backend-style: members={len(backend.get('members') or [])} -> {mem_names}")
        if not backend.get("members"):
            _dbg(f"警告: members 为空。可用键: {list(team_cfg.keys())}; config.keys: {list(conf.keys()) if isinstance(conf, dict) else 'n/a'}")
    except Exception:
        pass
    try:
        backend = _normalize_team_config(backend)
    except Exception:
        pass
    return backend


def _ensure_provider_env_aliases(team_backend_cfg: Dict[str, Any]):
    """为 OpenAI 兼容客户端自动设置环境变量别名，避免 SDK 报缺省 OPENAI_API_KEY 等。
    逻辑：
    - 若 member.model_client.config.model_info.api_type == "openai"：
      - 从其 api_key_env 取值 val；若存在且 OPENAI_API_KEY 未设置，则设为 val。
      - 若存在 base_url 且 OPENAI_BASE_URL 未设置，则设为该 base_url。
    """
    try:
        members = team_backend_cfg.get("members") or []
        for m in members:
            mc = (m.get("model_client") or {}).get("config") or {}
            model_info = mc.get("model_info") or {}
            api_type = (model_info.get("api_type") or "").lower()
            if api_type == "openai":
                api_key_env = mc.get("api_key_env") or m.get("api_key_env")
                if api_key_env:
                    val = os.environ.get(str(api_key_env), "")
                    if val and not os.environ.get("OPENAI_API_KEY"):
                        os.environ["OPENAI_API_KEY"] = val
                base_url = mc.get("base_url") or mc.get("endpoint")
                if base_url and not os.environ.get("OPENAI_BASE_URL"):
                    os.environ["OPENAI_BASE_URL"] = str(base_url).rstrip("/")
    except Exception:
        pass


class TeamInteractive:
    def __init__(self, team_config: Dict[str, Any], session_id: Optional[str] = None,
                 max_rounds: int = 3, timeout: float = 120.0, max_output_chars: int = 5000,
                 terminate_on_text: Optional[str] = None,
                 note_topic_id: Optional[str] = None, note_topic_name: Optional[str] = None,
                 attachments: Optional[list[str]] = None):
        self.session_id = session_id or _gen_session_id()
        self.team_cfg = dict(team_config or {})
        self.max_rounds = int(max_rounds)
        self.timeout = float(timeout)
        self.max_output_chars = int(max_output_chars)
        self.terminate_on_text = terminate_on_text
        self.note_topic_id = note_topic_id
        self.note_topic_name = note_topic_name
        self.attachments = attachments or []
        # 应用运行时选项到 backend 配置
        self._prepare_backend_cfg()
        self.backend = AutogenTeamBackend(self.backend_cfg)
        # 缓存 QA 后端以降低首问与每问的重复构建开销
        self._qa_backend = None
        self._qa_cfg = None
        # stdin 模式：auto/single/interactive（默认 auto）
        self.stdin_mode = getattr(self, 'stdin_mode', 'auto')
        # 去抖：避免同样的输入在短时间内被重复处理
        self._last_input = None
        self._last_input_ts = 0.0

    def _prepare_backend_cfg(self):
        cfg = self.team_cfg
        # 兼容 component-style
        backend_cfg = _component_team_to_backend(cfg)
        # 清洗 team 配置中的非法代理字符
        backend_cfg = _sanitize(backend_cfg)
        # 注入占位符（如 {session_id}）
        backend_cfg = _inject_placeholders(backend_cfg, {"session_id": self.session_id})
        # 健壮性：若注入后非字典，则回退为空字典
        if not isinstance(backend_cfg, dict):
            backend_cfg = {}
        # 运行时参数写入
        backend_cfg["max_rounds"] = self.max_rounds
        backend_cfg["timeout"] = self.timeout
        backend_cfg["max_output_chars"] = self.max_output_chars
        if self.terminate_on_text:
            backend_cfg["terminate_on_text"] = self.terminate_on_text
        self.backend_cfg = backend_cfg
        # 设置 OpenAI 兼容别名，避免 SDK 要求 OPENAI_API_KEY/OPENAI_BASE_URL
        _ensure_provider_env_aliases(self.backend_cfg)
        # 最终校验输出
        try:
            mems = self.backend_cfg.get("members") or []
            _dbg(f"final backend_cfg.members={len(mems)}")
        except Exception:
            pass

    def _log_user(self, text: str):
        try:
            log_user_message(self.session_id, text, meta={"timestamp": _now_iso(), "tool_calls": []})
        except Exception:
            pass

    def _log_assistant(self, text: str):
        try:
            log_assistant_message(self.session_id, text or "", meta={"timestamp": _now_iso(), "tool_calls": []})
        except Exception:
            pass

    def infer_once(self, task: str) -> str:
        start = time.time()
        safe_task = _safe_str(task)
        self._log_user(safe_task)
        # 计时：输入接收 -> 路由判定
        t_recv = start
        # 规则优先路由：'#笔记' 前缀或明显记录型文本 -> Note 路径
        route = _rule_route(safe_task)
        # 若显式携带附件，则强制走 note 路径
        if self.attachments:
            route = "note"
        # 诊断：输出本次路由与上下文
        try:
            _dbg(f"route={route} attachments={len(self.attachments)} topic_id={self.note_topic_id or '-'} timeout={self.timeout}")
        except Exception:
            pass
        diag_header = f"[ROUTE] {route} | attachments={len(self.attachments)} | topic_id={self.note_topic_id or '-'} | timeout={self.timeout}"
        t_route = time.time()
        if route == "note":
            try:
                t_exec_s = time.time()
                res = preprocess_and_write(
                    agent_config_path=str((ROOT / "config" / "agents" / "笔记助理.json").resolve()),
                    raw_text=safe_task.lstrip("#笔记").strip(),
                    note_topic_id=self.note_topic_id,
                    note_topic_name=self.note_topic_name,
                    turn=1,
                    enable_diagnostics=False,
                    attachments=self.attachments if self.attachments else None,
                )
                t_exec_e = time.time()
                att = res.get("attachments") or {}
                att_msg = ""
                try:
                    if att:
                        att_msg = f", attachments: files={att.get('files',0)}, chunks={att.get('chunks',0)}, errors={len(att.get('errors',[]))}"
                except Exception:
                    pass
                # 计时诊断
                try:
                    t_total = time.time() - t_recv
                    t_route_ms = int((t_route - t_recv) * 1000)
                    t_exec_ms = int((t_exec_e - t_exec_s) * 1000)
                    _dbg(f"timer: route_ms={t_route_ms} exec_ms={t_exec_ms} total_ms={int(t_total*1000)}")
                except Exception:
                    pass
                # 若存在规范化正文，则按分隔线包裹输出，供外皮直接承接为“正文”。
                body = (res.get("normalized_text") or "").strip()
                body_block = f"-----\n{body}\n-----" if body else ""
                stats = f"[NoteWriter] 已写入 {res.get('wrote')} 条（block_id={res.get('block_id')}, normalized={res.get('normalized')}{att_msg})"
                prefix = (body_block + "\n") if body_block else ""
                text = f"{prefix}{diag_header}\n[timer] route_ms={t_route_ms} exec_ms={t_exec_ms} total_ms={int(t_total*1000)}\n{stats}"
                # 轻量埋点：记录 note 写入事件
                try:
                    log_dir = (ROOT / "logs").resolve(); log_dir.mkdir(exist_ok=True)
                    (log_dir / "tools.log").open("a", encoding="utf-8").write(
                        json.dumps({
                            "ts": _now_iso(),
                            "session_id": self.session_id,
                            "event": "note_write",
                            "route": "note",
                            "block_id": res.get("block_id"),
                            "wrote": res.get("wrote"),
                            "normalized": res.get("normalized"),
                            "attachments": res.get("attachments", {})
                        }, ensure_ascii=False) + "\n"
                    )
                except Exception:
                    pass
            except Exception as e:
                t_total = time.time() - t_recv
                text = f"{diag_header}\n[timer] total_ms={int(t_total*1000)}\n[NoteWriter] 写入失败: {_safe_str(e)}"
        else:
            # 默认走RAG问答（直接复用单体"笔记助理"Agent以立即产出回答并写库）
            try:
                # 惰性初始化并缓存 QA 后端（检查配置文件更新时间，必要时重新加载）
                agent_path = (ROOT / "config" / "agents" / "笔记助理.json").resolve()
                config_mtime = os.path.getmtime(str(agent_path)) if os.path.exists(str(agent_path)) else 0
                if self._qa_backend is None or getattr(self, '_qa_config_mtime', 0) < config_mtime:
                    self._qa_cfg = _load_agent_json(str(agent_path))
                    # 注入占位符（如 {session_id}）
                    self._qa_cfg = _inject_placeholders(self._qa_cfg, {"session_id": self.session_id})
                    # 若缺少 GraphRAG 配置文件，则移除/禁用 graphrag 工具，避免运行时失败
                    try:
                        graphrag_root = (ROOT / "graphrag").resolve()
                        settings_yaml = graphrag_root / "settings.yaml"
                        if not settings_yaml.exists():
                            # 移除 tools 中的 graphrag_* 项
                            tools = self._qa_cfg.get("tools") or []
                            if isinstance(tools, list):
                                filtered = []
                                for t in tools:
                                    try:
                                        name = (t.get("name") or t.get("provider") or "").lower() if isinstance(t, dict) else ""
                                    except Exception:
                                        name = ""
                                    if name.startswith("graphrag_") or (isinstance(t, dict) and str(t.get("module", "")).startswith("autogen_ext.tools.graphrag")):
                                        continue
                                    filtered.append(t)
                                self._qa_cfg["tools"] = filtered
                            # 关闭 capabilities 标志
                            caps = self._qa_cfg.get("capabilities") or {}
                            if isinstance(caps, dict):
                                tcaps = caps.get("tools") or {}
                                if isinstance(tcaps, dict):
                                    for k in list(tcaps.keys()):
                                        if str(k).startswith("graphrag_"):
                                            try:
                                                tcaps[k]["enabled"] = False
                                            except Exception:
                                                tcaps[k] = {"enabled": False}
                                    caps["tools"] = tcaps
                                self._qa_cfg["capabilities"] = caps
                            _dbg("GraphRAG settings.yaml 未找到，已禁用 graphrag_* 工具")
                            try:
                                log_dir = (ROOT / "logs").resolve(); log_dir.mkdir(exist_ok=True)
                                (log_dir / "tools.log").open("a", encoding="utf-8").write(
                                    json.dumps({
                                        "ts": _now_iso(),
                                        "session_id": self.session_id,
                                        "event": "graphrag_disabled",
                                        "reason": "settings_yaml_missing",
                                        "path": str(settings_yaml)
                                    }, ensure_ascii=False) + "\n"
                                )
                            except Exception:
                                pass
                    except Exception:
                        pass
                    if not isinstance(self._qa_cfg, dict):
                        self._qa_cfg = {}
                    self._qa_config_mtime = config_mtime
                    # 按配置构建后端（不做运行时强制禁写/改写）
                    self._qa_backend = AutogenAgentBackend(self._qa_cfg)
                # 透传议题信息到环境，便于写库统一注入 note_topic_* 元数据
                try:
                    if self.note_topic_id:
                        os.environ["NOTE_TOPIC_ID"] = str(self.note_topic_id)
                    if self.note_topic_name:
                        os.environ["NOTE_TOPIC_NAME"] = str(self.note_topic_name)
                except Exception:
                    pass
                qa_start = time.time()
                qa_text = _safe_str(self._qa_backend.infer_once(safe_task))
                qa_dur_ms = int((time.time() - qa_start) * 1000)
                try:
                    # 输出当前 QA 写库防护状态
                    try:
                        pol = str(getattr(self._qa_backend, 'cfg', {}).get('memory_write_policy', 'n/a'))
                    except Exception:
                        pol = 'n/a'
                    try:
                        qmem = getattr(self._qa_backend, 'cfg', {}).get('memory') or []
                        ro_cnt = sum(1 for m in qmem if isinstance(m, dict) and m.get('write_enabled') is False)
                    except Exception:
                        ro_cnt = -1
                    _dbg(f"qa_latency_ms={qa_dur_ms} len={len(qa_text or '')} | policy={pol} ro_mems={ro_cnt}")
                except Exception:
                    pass
                if not qa_text or not qa_text.strip():
                    qa_text = "[QARAG] 无输出（模型未返回文本）"
                # 结构化输出检测与埋点
                try:
                    structured_markers = [
                        "核心答案", "详细说明", "权威来源", "查询统计", "智能网络查询", "严格按以下结构输出"
                    ]
                    looks_structured = any(m in qa_text for m in structured_markers)
                    # 简单原始JSON判定：行尾含大括号闭合且含典型键名，或以 '[{' 起始
                    raw_json_line = bool(re.search(r"\{[^}]*\}\s*$", qa_text, re.MULTILINE)) and bool(re.search(r"\b(results|items|data|title|url|snippet|score)\b\s*:", qa_text))
                    raw_json_block = qa_text.strip().startswith("[") and ("title" in qa_text or "url" in qa_text)
                    is_raw_json = raw_json_line or raw_json_block
                    log_dir = (ROOT / "logs").resolve(); log_dir.mkdir(exist_ok=True)
                    evt = {
                        "ts": _now_iso(),
                        "session_id": self.session_id,
                        "route": "other",
                        "qa_latency_ms": qa_dur_ms,
                        "text_len": len(qa_text or "")
                    }
                    if looks_structured and not is_raw_json:
                        evt.update({"event": "structured_ok"})
                    else:
                        evt.update({"event": "structured_warn", "reason": "raw_or_unstructured" if is_raw_json else "no_structured_markers"})
                    (log_dir / "tools.log").open("a", encoding="utf-8").write(json.dumps(evt, ensure_ascii=False) + "\n")
                except Exception:
                    pass
                # 计时诊断
                try:
                    t_total = time.time() - t_recv
                    t_route_ms = int((t_route - t_recv) * 1000)
                    _dbg(f"timer: route_ms={t_route_ms} qa_ms={qa_dur_ms} total_ms={int(t_total*1000)}")
                except Exception:
                    pass
                text = f"{diag_header}\n[timer] route_ms={t_route_ms} qa_ms={qa_dur_ms} total_ms={int(t_total*1000)}\n[QA] 检索/写入按配置执行→\n{qa_text}"
                # 轻量埋点：记录 QA 推理事件（用于后续对齐工具调用统计）
                try:
                    log_dir = (ROOT / "logs").resolve(); log_dir.mkdir(exist_ok=True)
                    (log_dir / "tools.log").open("a", encoding="utf-8").write(
                        json.dumps({
                            "ts": _now_iso(),
                            "session_id": self.session_id,
                            "event": "qa_infer",
                            "route": "other",
                            "qa_latency_ms": qa_dur_ms,
                            "text_len": len(qa_text or "")
                        }, ensure_ascii=False) + "\n"
                    )
                except Exception:
                    pass
            except Exception as e:
                # 回退到团队推理（可能仅有Router JSON）
                t_total = time.time() - t_recv
                text = f"{diag_header}\n[timer] total_ms={int(t_total*1000)}\n{self.backend.infer_rounds(safe_task)}"
        # 清洗模型回复，移除无法编码字符
        text = _safe_str(text)
        # 保护性截断
        if isinstance(text, str) and self.max_output_chars and len(text) > self.max_output_chars:
            text = text[: self.max_output_chars]
        self._log_assistant(text)
        _dbg(f"turn latency ms={int((time.time()-start)*1000)}")
        return text or ""

    def loop(self):
        # 根据 stdin_mode 决定处理方式
        mode = getattr(self, 'stdin_mode', 'auto')
        try:
            force_single = (mode == 'single')
            force_interactive = (mode == 'interactive')
        except Exception:
            force_single = False; force_interactive = False

        # 单次模式或自动且 stdin 非 TTY：一次性读取全部输入后退出
        try:
            if force_single or (mode == 'auto' and not sys.stdin.isatty()):
                try:
                    data = sys.stdin.read()
                except Exception:
                    data = ""
                if data:
                    # 过滤控制命令，仅保留实际内容
                    lines = []
                    for ln in data.splitlines():
                        l = (ln or "").strip()
                        if l.lower() in (":q", ":quit", ":exit", ":h", ":help"):
                            continue
                        lines.append(ln)
                    merged = "\n".join(lines).strip()
                    if merged:
                        resp = self.infer_once(merged)
                        _p(f"[助手-1] {resp}")
                return
        except Exception:
            # 安全降级到交互模式
            pass

        # 交互模式：会话头信息改走 stderr，避免进入 UI 输出框
        _dbg("\n=== 交互式团队运行（AutoGen 0.7.1）===")
        _dbg(f"会话ID: {self.session_id}  轮次上限: {self.max_rounds}  超时(s): {self.timeout}")
        _dbg("输入 :help 获取帮助，:quit 退出\n")
        turn = 1
        while True:
            try:
                # 提示符写到 stderr，输入不在 stdout 打印任何前缀
                try:
                    sys.stderr.write(f"[用户-{turn}] ")
                    sys.stderr.flush()
                except Exception:
                    pass
                user_input = input()
                # 多行粘贴模式：当用户输入以 ``` 开头的行或 :paste 时，持续读取直到再次遇到以 ``` 开头的行或 :end/:done
                try:
                    si = user_input.strip()
                    if si.lower() == ":paste" or si.startswith("```"):
                        sys.stderr.write("[paste] 已进入多行粘贴模式（以 ``` 或 :end/:done 结束）\n")
                        sys.stderr.flush()
                        lines = []
                        while True:
                            ln = input()
                            sl = ln.strip()
                            if sl.startswith("```") or sl.lower() in (":end", ":done"):
                                break
                            lines.append(ln)
                        user_input = "\n".join(lines)
                        # 显示前 160 字符的接收预览
                        try:
                            _dbg(f"paste.recv: {(' '.join(user_input.split())[:160])}")
                        except Exception:
                            pass
                except Exception:
                    pass
                if not user_input.strip():
                    continue
                # 收到输入后去抖（同一内容在2秒内重复则忽略）
                try:
                    norm = ' '.join([x.strip() for x in user_input.replace('\r','').split('\n') if x.strip()])
                    now_ts = time.time()
                    if self._last_input == norm and (now_ts - self._last_input_ts) < 2.0:
                        _dbg("debounce: duplicated input ignored")
                        continue
                    self._last_input = norm; self._last_input_ts = now_ts
                except Exception:
                    pass
                try:
                    _dbg(f"recv: {norm[:160]}")
                except Exception:
                    pass
                cmd = user_input.strip().lower()
                if cmd in (":q", ":quit", ":exit"):
                    _dbg("已退出。")
                    break
                if cmd in (":h", ":help"):
                    _dbg(":q/:quit 退出；:h/:help 帮助。正常输入将进入团队推理。\n多行输入：输入以 ``` 开头的行或 :paste 进入粘贴模式；以 ``` 开头的行或 :end/:done 结束。")
                    continue

                resp = self.infer_once(user_input)
                _p(f"[助手-{turn}] {resp}")
                turn += 1
            except KeyboardInterrupt:
                _dbg("\n用户中断，退出。")
                break
            except Exception as e:
                _dbg(f"错误: {_safe_str(e)}")


def build_arg_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description="交互式团队运行脚本（AutoGen 0.7.1）")
    ap.add_argument("--team-json", required=True, help="团队配置 JSON 路径（backend-style 或 component-style）")
    ap.add_argument("--session-id", default=None, help="自定义会话ID（默认自动生成）")
    ap.add_argument("--max-rounds", type=int, default=3, help="每次推理的最大轮次（传入团队编排）")
    ap.add_argument("--timeout", type=float, default=120.0, help="超时时长（秒）")
    ap.add_argument("--max-output-chars", type=int, default=5000, help="输出最大字符数（保护性截断）")
    ap.add_argument("--terminate-on-text", default=None, help="文本触发终止（可选，如 '}' ）")
    ap.add_argument("--env-file", default=None, help="显式指定 .env 路径，优先于默认项目根 .env")
    ap.add_argument("--set-env", action="append", default=[], help="以 KEY=VALUE 形式设置环境变量，可重复使用")
    ap.add_argument("--topic-id", default=None, help="议题ID（用于聚合多次补充）")
    ap.add_argument("--topic-name", default=None, help="议题名称（仅首条/变更时写入）")
    ap.add_argument("--attachments", default=None, help="以分号分隔的本地文件路径列表，如 'D:\\a.pdf;D:\\b.docx'")
    ap.add_argument("--stdin-mode", choices=["auto", "single", "interactive"], default="auto",
                    help="stdin 处理模式：auto(默认, 非TTY则单次读取退出)/single(强制单次)/interactive(强制交互循环)")
    return ap


def main():
    ap = build_arg_parser()
    args = ap.parse_args()

    # 集成环境变量：优先加载 --env-file，其次加载项目根 .env；支持 --set-env 内联变量
    _apply_env_file(args.env_file)
    _load_env_file()
    _apply_inline_env(args.set_env)

    team_path = Path(args.team_json)
    if not team_path.exists():
        print(f"团队配置不存在: {team_path}")
        sys.exit(1)

    try:
        team_cfg = _load_json(team_path)
    except Exception as e:
        print(str(e))
        sys.exit(2)

    client = TeamInteractive(
        team_cfg,
        session_id=args.session_id,
        max_rounds=args.max_rounds,
        timeout=args.timeout,
        max_output_chars=args.max_output_chars,
        terminate_on_text=args.terminate_on_text,
        note_topic_id=args.topic_id,
        note_topic_name=args.topic_name,
        attachments=[p for p in str(args.attachments).split(';')] if args.attachments else [],
    )
    # 诊断：回显关键启动参数
    try:
        _dbg(f"args: team_json={args.team_json} session_id={client.session_id} max_rounds={args.max_rounds} timeout={args.timeout} topic_id={args.topic_id or '-'} attachments={len(client.attachments)} stdin_mode={args.stdin_mode}")
    except Exception:
        pass
    # 将 stdin_mode 透传给 loop（通过闭包变量）
    client.stdin_mode = getattr(args, 'stdin_mode', 'auto')
    client.loop()


if __name__ == "__main__":
    main()
