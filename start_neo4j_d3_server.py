#!/usr/bin/env python3
"""
Neo4j + D3.js 集成服务启动器
基于AutoGen 0.7.1框架规范
同时启动后端API服务器和前端HTTP服务器
"""

import subprocess
import sys
import os
import time
import threading
import signal
from pathlib import Path

class Neo4jD3Server:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.project_root = Path(__file__).parent
        
    def check_neo4j_connection(self):
        """检查Neo4j连接状态"""
        print("🔍 检查Neo4j连接状态...")
        try:
            from backend.app.database import get_neo4j_driver
            driver = get_neo4j_driver()
            with driver.session() as session:
                result = session.run("RETURN 1 as test")
                if result.single():
                    print("✅ Neo4j连接正常")
                    return True
        except Exception as e:
            print(f"❌ Neo4j连接失败: {e}")
            print("💡 请确保Neo4j服务已启动，配置信息正确")
            return False
        return False
    
    def start_backend_server(self):
        """启动FastAPI后端服务器"""
        print("🚀 启动Neo4j后端API服务器...")
        
        # 检查依赖
        backend_requirements = self.project_root / "backend" / "requirements.txt"
        if backend_requirements.exists():
            print("📦 检查后端依赖...")
            try:
                subprocess.run([
                    sys.executable, "-m", "pip", "install", "-r", str(backend_requirements)
                ], check=True, capture_output=True)
                print("✅ 后端依赖检查完成")
            except subprocess.CalledProcessError as e:
                print(f"⚠️ 依赖安装警告: {e}")
        
        # 启动后端服务
        backend_dir = self.project_root / "backend"
        os.chdir(backend_dir)
        
        try:
            self.backend_process = subprocess.Popen([
                sys.executable, "-m", "uvicorn", "app.main:app", 
                "--host", "0.0.0.0", 
                "--port", "8000", 
                "--reload"
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            print("✅ 后端服务器已启动 (http://localhost:8000)")
            print("📋 API文档: http://localhost:8000/docs")
            
        except Exception as e:
            print(f"❌ 后端服务器启动失败: {e}")
            return False
        
        # 回到项目根目录
        os.chdir(self.project_root)
        return True
    
    def start_frontend_server(self):
        """启动前端HTTP服务器"""
        print("🌐 启动前端HTTP服务器...")
        
        try:
            # 使用Python内置HTTP服务器
            self.frontend_process = subprocess.Popen([
                sys.executable, "-m", "http.server", "3000"
            ], cwd=self.project_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            print("✅ 前端服务器已启动 (http://localhost:3000)")
            
        except Exception as e:
            print(f"❌ 前端服务器启动失败: {e}")
            return False
        
        return True
    
    def wait_for_backend_ready(self, timeout=30):
        """等待后端服务就绪"""
        print("⏳ 等待后端服务就绪...")
        
        import requests
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                response = requests.get("http://localhost:8000/health", timeout=5)
                if response.status_code == 200:
                    print("✅ 后端服务就绪")
                    return True
            except:
                pass
            time.sleep(2)
        
        print("❌ 后端服务启动超时")
        return False
    
    def test_d3_integration(self):
        """测试D3.js与Neo4j集成"""
        print("🧪 测试D3.js与Neo4j集成...")
        
        try:
            import requests
            
            # 测试图形数据API
            response = requests.get("http://localhost:8000/api/neo4j/graph-data", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ 图形数据API正常 (节点: {len(data.get('nodes', []))}, 连线: {len(data.get('links', []))})")
                return True
            else:
                print(f"❌ 图形数据API错误: {response.status_code}")
                
        except Exception as e:
            print(f"❌ 集成测试失败: {e}")
        
        return False
    
    def print_status(self):
        """打印服务状态"""
        print("\n" + "="*60)
        print("🎯 Neo4j + D3.js 集成服务状态")
        print("="*60)
        print("🔗 前端地址: http://localhost:3000")
        print("🔗 后端API: http://localhost:8000")
        print("📋 API文档: http://localhost:8000/docs")
        print("🎨 D3.js关系图: 在前端页面的关系管理模块中查看")
        print("="*60)
        print("💡 使用说明:")
        print("   1. 打开前端页面 http://localhost:3000")
        print("   2. 进入关系管理模块")
        print("   3. D3.js关系图将自动从Neo4j加载数据")
        print("   4. 按 Ctrl+C 停止所有服务")
        print("="*60)
    
    def signal_handler(self, signum, frame):
        """处理中断信号"""
        print("\n🛑 正在停止服务...")
        self.stop_servers()
        sys.exit(0)
    
    def stop_servers(self):
        """停止所有服务器"""
        if self.backend_process:
            print("🛑 停止后端服务器...")
            self.backend_process.terminate()
            self.backend_process.wait()
        
        if self.frontend_process:
            print("🛑 停止前端服务器...")
            self.frontend_process.terminate()
            self.frontend_process.wait()
    
    def run(self):
        """运行集成服务"""
        print("🚀 启动Neo4j + D3.js集成服务")
        print("="*60)
        
        # 注册信号处理器
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        # 检查Neo4j连接
        if not self.check_neo4j_connection():
            print("❌ 无法连接Neo4j，请检查配置后重试")
            return False
        
        # 启动后端服务器
        if not self.start_backend_server():
            return False
        
        # 等待后端就绪
        if not self.wait_for_backend_ready():
            self.stop_servers()
            return False
        
        # 启动前端服务器
        if not self.start_frontend_server():
            self.stop_servers()
            return False
        
        # 测试集成
        time.sleep(3)  # 给服务一点时间完全启动
        self.test_d3_integration()
        
        # 打印状态信息
        self.print_status()
        
        # 保持运行
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.signal_handler(signal.SIGINT, None)
        
        return True

def main():
    """主函数"""
    server = Neo4jD3Server()
    success = server.run()
    
    if not success:
        print("❌ 服务启动失败")
        sys.exit(1)

if __name__ == "__main__":
    main()
