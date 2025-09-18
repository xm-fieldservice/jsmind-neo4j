# -*- coding: utf-8 -*-
"""
本地后端服务（稳定版）
- 提供注册表 CRUD 与占位接口
- 使用 data/mindmap_registry.json 作为注册表索引
- CORS 允许 file:// 页面直接调用
用法：python backend_server.py --port 8081
"""
import argparse
import json
import os
import time
import hashlib
import shutil
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from threading import Lock
from pathlib import Path

try:
    from env_loader import init_env
except Exception:
    def init_env():
        return {"RUN_MODE": "local", "REGISTRY_PORT": os.getenv("REGISTRY_PORT", "8081")}

PROJECT_ROOT = Path(__file__).parent
DATA_DIR = PROJECT_ROOT / 'data'
DATA_DIR.mkdir(exist_ok=True)

class BackendHandler(BaseHTTPRequestHandler):
    _lock = Lock()

    @property
    def registry_path(self) -> Path:
        return DATA_DIR / 'mindmap_registry.json'

    def _ensure_registry(self):
        if not self.registry_path.exists():
            with self._lock:
                if not self.registry_path.exists():
                    with self.registry_path.open('w', encoding='utf-8') as f:
                        json.dump({
                            "version": "1.0",
                            "projects": [],
                            "metadata": {"total_projects": 0, "last_updated": None, "storage_type": "unified_md"}
                        }, f, ensure_ascii=False, indent=2)

    def _send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        # CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/health':
            return self._send_json({"ok": True})
        
        # MD底座同步API
        if path == '/api/md-base/hash':
            return self._handle_md_base_hash()
        if path == '/api/md-base/download':
            return self._handle_md_base_download()
        if path == '/registry/get':
            try:
                self._ensure_registry()
                with self._lock:
                    with self.registry_path.open('r', encoding='utf-8') as f:
                        data = json.load(f)
                data.setdefault('metadata', {})
                data['metadata']['total_projects'] = len(data.get('projects') or [])
                return self._send_json({"success": True, "data": data})
            except Exception as e:
                return self._send_json({"success": False, "error": str(e)}, status=500)
        return self._send_json({"error": "Not Found"}, status=404)

    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(length).decode('utf-8') if length else '{}'
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {}

        if path == '/registry/save':
            try:
                self._ensure_registry()
                reg = payload if isinstance(payload, dict) else {}
                projects = reg.get('projects') or []
                # 统一化：确保 project_id 存在并去重
                seen = set()
                normalized = []
                for p in projects:
                    pid = p.get('project_id') or (p.get('payload', {}).get('data', {}).get('id') if isinstance(p.get('payload'), dict) else None)
                    if not pid or pid in seen:
                        continue
                    p['project_id'] = pid
                    seen.add(pid)
                    normalized.append(p)
                reg['projects'] = normalized
                reg.setdefault('metadata', {})
                reg['metadata']['total_projects'] = len(normalized)
                with self._lock:
                    with self.registry_path.open('w', encoding='utf-8') as f:
                        json.dump(reg, f, ensure_ascii=False, indent=2)
                return self._send_json({"success": True, "data": {"total": len(normalized)}})
            except Exception as e:
                return self._send_json({"success": False, "error": str(e)}, status=500)

        if path == '/registry/delete':
            try:
                self._ensure_registry()
                project_id = payload.get('project_id')
                if not project_id:
                    return self._send_json({"success": False, "error": "missing project_id"}, status=400)
                with self._lock:
                    with self.registry_path.open('r', encoding='utf-8') as f:
                        reg = json.load(f)
                    before = len(reg.get('projects') or [])
                    reg['projects'] = [p for p in (reg.get('projects') or []) if (p.get('project_id') or p.get('payload', {}).get('data', {}).get('id')) != project_id]
                    reg.setdefault('metadata', {})
                    reg['metadata']['total_projects'] = len(reg['projects'])
                    with self.registry_path.open('w', encoding='utf-8') as f:
                        json.dump(reg, f, ensure_ascii=False, indent=2)
                return self._send_json({"success": True, "data": {"removed": before - len(reg['projects'])}})
            except Exception as e:
                return self._send_json({"success": False, "error": str(e)}, status=500)
        
        # MD底座上传和保存API
        if path in ['/api/md-base/upload', '/api/md-base/save']:
            return self._handle_md_base_upload(raw)
        
        return self._send_json({"error": "Not Found"}, status=404)
    
    def _handle_md_base_hash(self):
        """获取MD底座文件哈希"""
        try:
            md_file_path = DATA_DIR / 'unified_mindmap_storage.md'
            if md_file_path.exists():
                with md_file_path.open('r', encoding='utf-8') as f:
                    content = f.read()
                
                hash_value = hashlib.sha256(content.encode('utf-8')).hexdigest()
                return self._send_json({
                    "hash": hash_value,
                    "size": len(content),
                    "last_modified": md_file_path.stat().st_mtime
                })
            else:
                return self._send_json({"hash": None, "exists": False}, status=404)
        except Exception as e:
            return self._send_json({"error": str(e)}, status=500)
    
    def _handle_md_base_download(self):
        """下载MD底座文件"""
        try:
            md_file_path = DATA_DIR / 'unified_mindmap_storage.md'
            if md_file_path.exists():
                with md_file_path.open('r', encoding='utf-8') as f:
                    content = f.read()
            else:
                # 返回默认内容
                content = self._get_default_md_content()
            
            # 发送文本响应
            body = content.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            return self._send_json({"error": str(e)}, status=500)
    
    def _handle_md_base_upload(self, content):
        """上传MD底座内容"""
        try:
            if not content or content.strip() == '':
                return self._send_json({"error": "空内容"}, status=400)
            md_file_path = DATA_DIR / 'unified_mindmap_storage.md'
            
            # 备份现有文件
            if md_file_path.exists():
                backup_path = DATA_DIR / f'unified_mindmap_storage.md.backup.{int(time.time())}'
                shutil.copy2(md_file_path, backup_path)
                print(f"[MD-Base] 已备份到: {backup_path}")
            
            # 写入新内容
            with md_file_path.open('w', encoding='utf-8') as f:
                f.write(content)
            
            # 计算新哈希
            hash_value = hashlib.sha256(content.encode('utf-8')).hexdigest()
            
            print(f"[MD-Base] 已更新，大小: {len(content)} 字节，哈希: {hash_value[:8]}...")
            
            return self._send_json({
                "success": True,
                "hash": hash_value,
                "size": len(content),
                "timestamp": time.time()
            })
        except Exception as e:
            print(f"[MD-Base] 上传失败: {e}")
            return self._send_json({"error": str(e)}, status=500)
    
    def _get_default_md_content(self):
        """获取默认MD底座内容"""
        return """# 统一脑图存储文档

这是AutoGen混合存储架构的统一MD文档，用于存储所有脑图数据。

## 存储格式说明

每个脑图项目以以下格式存储：

```
## 项目: [项目名称] (ID: [项目ID])
- 创建时间: [时间戳]
- 最后修改: [时间戳]
- 数据温度: [hot/warm/cold/archive]

### 脑图结构
[JSON格式的脑图数据]

### 内容详情
[节点内容和附件信息]

---
```

## 项目列表

*暂无项目，等待第一个脑图创建...*

"""


def run(port: int):
    cfg = init_env()
    httpd = HTTPServer(('', port), BackendHandler)
    print(f"[Backend] 运行于 http://127.0.0.1:{port}  RUN_MODE={cfg.get('RUN_MODE','local')}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("[Backend] 停止")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=int(os.getenv('REGISTRY_PORT', '8081')))
    args = parser.parse_args()
    run(args.port)
