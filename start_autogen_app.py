"""
启动AutoGen混合存储脑图应用
集成本地MD存储与服务器端向量库、图库、数据库
"""
import asyncio
import os
import sys
import subprocess
import json
from pathlib import Path
from datetime import datetime

# 添加项目根目录到Python路径
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

# 导入AutoGen组件
try:
    from autogen_config import validate_config, PROJECT_ROOT, DATA_DIR
    from autogen_memory_manager import memory_manager
    from hybrid_storage_architecture import hybrid_storage
    from data_migration_script import DataMigrationScript
except ImportError as e:
    print(f"导入AutoGen组件失败: {e}")
    print("请确保已安装所需依赖: pip install -r requirements_autogen.txt")
    sys.exit(1)


class AutoGenAppLauncher:
    """AutoGen应用启动器"""
    
    def __init__(self):
        self.project_root = PROJECT_ROOT
        self.data_dir = DATA_DIR
        self.app_port = int(os.getenv("APP_PORT", "8080"))
        self.python_backend_port = int(os.getenv("PYTHON_BACKEND_PORT", "8081"))
        
    async def check_environment(self):
        """检查环境配置"""
        print("🔍 检查环境配置...")
        
        # 1. 检查Python环境
        python_version = sys.version_info
        if python_version.major < 3 or python_version.minor < 8:
            print("❌ Python版本过低，需要Python 3.8+")
            return False
        print(f"✅ Python版本: {python_version.major}.{python_version.minor}")
        
        # 2. 检查AutoGen配置
        if not validate_config():
            print("❌ AutoGen配置无效，请设置API密钥")
            print("请在.env文件中设置 OPENAI_API_KEY 或 AZURE_OPENAI_API_KEY")
            return False
        print("✅ AutoGen配置有效")
        
        # 3. 检查数据目录
        self.data_dir.mkdir(exist_ok=True)
        print(f"✅ 数据目录: {self.data_dir}")
        
        # 4. 检查前端文件
        index_file = self.project_root / "index.html"
        if not index_file.exists():
            print("❌ 前端文件缺失: index.html")
            return False
        print("✅ 前端文件完整")
        
        return True
    
    async def initialize_autogen_components(self):
        """初始化AutoGen组件"""
        print("🚀 初始化AutoGen组件...")
        
        try:
            # 1. 初始化内存管理器
            stats = memory_manager.get_storage_stats()
            print(f"✅ 内存管理器: {stats}")
            
            # 2. 初始化混合存储
            print("✅ 混合存储架构已就绪")
            
            # 3. 检查是否需要数据迁移
            await self.check_data_migration()
            
            return True
            
        except Exception as e:
            print(f"❌ AutoGen组件初始化失败: {e}")
            return False
    
    async def check_data_migration(self):
        """检查并执行数据迁移"""
        print("📦 检查数据迁移...")
        
        try:
            migration_script = DataMigrationScript()
            data_files = migration_script.find_external_data_files()
            
            if data_files:
                print(f"发现 {len(data_files)} 个外部数据文件")
                user_input = input("是否执行数据迁移到AutoGen存储? (y/n): ")
                
                if user_input.lower() == 'y':
                    print("开始数据迁移...")
                    result = await migration_script.run_migration()
                    if result.get("success", False):
                        print(f"✅ 数据迁移完成: {result['successful_migrations']}/{result['total_projects']}")
                    else:
                        print(f"⚠️ 数据迁移部分成功: {result}")
                else:
                    print("跳过数据迁移")
            else:
                print("✅ 无需数据迁移")
                
        except Exception as e:
            print(f"⚠️ 数据迁移检查失败: {e}")
    
    async def start_python_backend(self):
        """启动Python后端服务"""
        print(f"🐍 启动Python后端服务 (端口: {self.python_backend_port})...")
        
        try:
            # 创建简单的HTTP服务器用于AutoGen API
            backend_script = self.project_root / "autogen_http_server.py"
            if not backend_script.exists():
                await self.create_backend_server()
            
            # 启动后端服务
            cmd = [
                sys.executable, 
                str(backend_script), 
                "--port", str(self.python_backend_port)
            ]
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=str(self.project_root)
            )
            
            print(f"✅ Python后端已启动 (PID: {process.pid})")
            return process
            
        except Exception as e:
            print(f"❌ Python后端启动失败: {e}")
            return None
    
    async def create_backend_server(self):
        """创建后端HTTP服务器"""
        server_code = '''"""
AutoGen HTTP服务器
为前端提供AutoGen功能的HTTP API接口
"""
import asyncio
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import sys
from pathlib import Path
import json
import os
import asyncio
from threading import Lock
from env_loader import init_env

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from autogen_memory_manager import memory_manager
from hybrid_storage_architecture import hybrid_storage

class AutoGenHTTPHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/status':
            self.send_json_response({"status": "ok", "service": "AutoGen Backend"})
        elif path == '/storage/stats':
            stats = memory_manager.get_storage_stats()
            self.send_json_response(stats)
        elif path == '/health':
            self.send_json_response({"ok": True})
        elif path == '/registry/get':
            result = self.get_registry()
            self.send_json_response(result)
        else:
            self.send_error(404, 'Not Found')
    
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length else '{}'
        try:
            data = json.loads(body)
        except Exception:
            data = {}
        parsed_path = urlparse(self.path)
        path = parsed_path.path
            
        if path == '/mindmap/save':
            result = asyncio.run(self.save_mindmap(data))
            self.send_json_response(result)
        elif path == '/mindmap/load':
            result = asyncio.run(self.load_mindmap(data))
            self.send_json_response(result)
        elif path == '/mindmap/search':
            result = asyncio.run(self.search_mindmaps(data))
            self.send_json_response(result)
        elif path == '/relation/get_all_relations':
            result = asyncio.run(self.get_all_relations(data))
            self.send_json_response(result)
        elif path == '/relation/inject_md':
            result = asyncio.run(self.inject_md_to_servers(data))
            self.send_json_response(result)
        # Registry endpoints
        elif path == '/registry/save':
            result = self.save_registry(data)
            self.send_json_response(result)
        elif path == '/registry/delete':
            project_id = data.get('project_id')
            result = self.delete_from_registry(project_id)
            self.send_json_response(result)
        else:
            self.send_error(404, "Not Found")
                
        except Exception as e:
            self.send_json_response({"error": str(e)}, status=500)
    
    async def save_mindmap(self, data):
        """保存脑图"""
        success = await hybrid_storage.store_project_data(data)
        return {"success": success}
    
    async def load_mindmap(self, data):
        """加载脑图"""
        project_id = data.get("project_id")
        result = await hybrid_storage.retrieve_project_data(project_id)
        return {"data": result}
    
    async def search_mindmaps(self, data):
        """搜索脑图"""
        query = data.get("query", "")
        results = await memory_manager.retrieve_relevant_projects(query)
        return {"results": results}
    
    async def get_all_relations(self, data):
        """获取节点的所有关系"""
        from relation_manager import relation_manager
        node_id = data.get("node_id")
        if not node_id:
            return {"success": False, "error": "缺少node_id参数"}
        
        relations = await relation_manager.get_all_relations(node_id)
        return {"success": True, "data": relations}
    
    async def inject_md_to_servers(self, data):
        """注入MD文档到服务器存储"""
        from relation_manager import relation_manager
        project_id = data.get("project_id")
        md_content = data.get("md_content")
        
        if not project_id or not md_content:
            return {"success": False, "error": "缺少project_id或md_content参数"}
        
        result = await relation_manager.inject_md_to_servers(md_content, project_id)
        return {"success": True, "data": result}
    
    def send_json_response(self, payload, status=200):
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

    # ---------- Registry helpers ----------
    _registry_lock = Lock()

    @property
    def data_dir(self):
        base = os.path.join(os.path.dirname(__file__), 'data')
        os.makedirs(base, exist_ok=True)
        return base

    @property
    def registry_path(self):
        return os.path.join(self.data_dir, 'mindmap_registry.json')

    def _init_registry_if_missing(self):
        if not os.path.exists(self.registry_path):
            with open(self.registry_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "version": "1.0",
                    "projects": [],
                    "metadata": {"total_projects": 0, "last_updated": None, "storage_type": "unified_md"}
                }, f, ensure_ascii=False, indent=2)

    def get_registry(self):
        try:
            with self._registry_lock:
                self._init_registry_if_missing()
                with open(self.registry_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            # ensure fields
            projects = data.get('projects') or []
            data['metadata'] = data.get('metadata') or {}
            data['metadata']['total_projects'] = len(projects)
            return {"success": True, "data": data}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def save_registry(self, payload):
        try:
            if not isinstance(payload, dict):
                return {"success": False, "error": "invalid payload"}
            with self._registry_lock:
                self._init_registry_if_missing()
                # normalize: enforce project_id = payload.projects[*].project_id
                reg = payload
                projects = reg.get('projects') or []
                # deduplicate by project_id
                seen = set()
                normalized = []
                for p in projects:
                    pid = p.get('project_id') or (p.get('payload', {}).get('data', {}).get('id'))
                    if not pid:
                        continue
                    if pid in seen:
                        continue
                    seen.add(pid)
                    p['project_id'] = pid
                    normalized.append(p)
                reg['projects'] = normalized
                reg.setdefault('metadata', {})
                reg['metadata']['total_projects'] = len(normalized)
                reg['metadata']['last_updated'] = reg['metadata'].get('last_updated')
                with open(self.registry_path, 'w', encoding='utf-8') as f:
                    json.dump(reg, f, ensure_ascii=False, indent=2)
            return {"success": True, "data": {"total": len(normalized)}}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def delete_from_registry(self, project_id: str):
        try:
            if not project_id:
                return {"success": False, "error": "missing project_id"}
            with self._registry_lock:
                self._init_registry_if_missing()
                with open(self.registry_path, 'r', encoding='utf-8') as f:
                    reg = json.load(f)
                before = len(reg.get('projects') or [])
                reg['projects'] = [p for p in (reg.get('projects') or []) if (p.get('project_id') or p.get('payload', {}).get('data', {}).get('id')) != project_id]
                reg.setdefault('metadata', {})
                reg['metadata']['total_projects'] = len(reg['projects'])
                with open(self.registry_path, 'w', encoding='utf-8') as f:
                    json.dump(reg, f, ensure_ascii=False, indent=2)
            return {"success": True, "data": {"removed": before - len(reg['projects'])}}
        except Exception as e:
            return {"success": False, "error": str(e)}
    def do_OPTIONS(self):
        """处理CORS预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run_server(port=8081):
    """运行HTTP服务器"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, AutoGenHTTPHandler)
    print(f"AutoGen HTTP服务器已启动: http://127.0.0.1:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("服务器已停止")
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8081, help="服务器端口")
    args = parser.parse_args()
    
    if __name__ == '__main__':
        cfg = init_env()
        try:
            port = int(cfg.get('REGISTRY_PORT', '8081'))
        except Exception:
            port = 8081
        print(f"[ENV] RUN_MODE={cfg.get('RUN_MODE','local')} PORT={port}")
        run_server(port)

        
        backend_file = self.project_root / "autogen_http_server.py"
        with open(backend_file, 'w', encoding='utf-8') as f:
            f.write(server_code)
        
        print("✅ 后端服务器脚本已创建")
    
    def start_frontend_server(self):
        """启动前端服务器"""
        print(f"🌐 启动前端服务器 (端口: {self.app_port})...")
        
        try:
            # 使用Python内置HTTP服务器
            cmd = [
                sys.executable, 
                "-m", "http.server", 
                str(self.app_port),
                "--directory", str(self.project_root)
            ]
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=str(self.project_root)
            )
            
            print(f"✅ 前端服务器已启动 (PID: {process.pid})")
            print(f"🔗 访问地址: http://localhost:{self.app_port}")
            return process
            
        except Exception as e:
            print(f"❌ 前端服务器启动失败: {e}")
            return None
    
    def show_startup_info(self):
        """显示启动信息"""
        print("\n" + "="*60)
        print("🎉 AutoGen混合存储脑图应用启动成功!")
        print("="*60)
        print(f"📱 前端地址: http://localhost:{self.app_port}")
        print(f"🐍 后端API: http://localhost:{self.python_backend_port}")
        print(f"📁 数据目录: {self.data_dir}")
        print("\n功能特性:")
        print("✅ 本地MD存储 + 服务器向量库")
        print("✅ 冷热数据智能分层")
        print("✅ AutoGen 0.7.1框架集成")
        print("✅ 前端功能完全兼容")
        print("✅ 离线工作能力")
        print("✅ AI智能搜索")
        print("\n按 Ctrl+C 停止服务")
        print("="*60)
    
    async def run(self):
        """运行应用"""
        print("🚀 启动AutoGen混合存储脑图应用")
        print("="*50)
        
        # 1. 检查环境
        if not await self.check_environment():
            print("❌ 环境检查失败，退出")
            return
        
        # 2. 初始化AutoGen组件
        if not await self.initialize_autogen_components():
            print("❌ AutoGen组件初始化失败，退出")
            return
        
        # 3. 启动后端服务
        backend_process = await self.start_python_backend()
        if not backend_process:
            print("❌ 后端服务启动失败，退出")
            return
        
        # 4. 启动前端服务
        frontend_process = self.start_frontend_server()
        if not frontend_process:
            print("❌ 前端服务启动失败，退出")
            if backend_process:
                backend_process.terminate()
            return
        
        # 5. 显示启动信息
        self.show_startup_info()
        
        # 6. 等待用户中断
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 正在停止服务...")
            if backend_process:
                backend_process.terminate()
            if frontend_process:
                frontend_process.terminate()
            print("✅ 服务已停止")


async def main():
    """主函数"""
    launcher = AutoGenAppLauncher()
    await launcher.run()


if __name__ == "__main__":
    # 设置环境变量
    os.environ.setdefault("PYTHONPATH", str(PROJECT_ROOT))
    
    # 运行应用
    asyncio.run(main())
