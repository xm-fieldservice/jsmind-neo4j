#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
脑图工作栏测试服务器启动脚本
启动本地HTTP服务器并自动打开浏览器
关闭浏览器后自动退出并释放端口
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import time
import threading
from pathlib import Path

# 配置
PORT = 8888
HOST = "localhost"
TEST_PAGE = "mindmap-standalone.html"
IDLE_TIMEOUT = 300  # 5分钟无请求后自动退出（秒）
CHECK_INTERVAL = 10  # 检查间隔（秒）

# 全局变量：记录最后一次请求时间
last_request_time = time.time()
server_running = True

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义HTTP请求处理器，记录请求时间"""
    
    def do_GET(self):
        global last_request_time
        last_request_time = time.time()
        return super().do_GET()
    
    def log_message(self, format, *args):
        """简化日志输出"""
        # 只记录HTML页面请求，忽略静态资源
        if self.path.endswith('.html') or self.path == '/':
            print(f"📄 [{time.strftime('%H:%M:%S')}] {self.path}")

def check_idle_timeout(httpd):
    """检查空闲超时，自动关闭服务器"""
    global server_running
    
    while server_running:
        time.sleep(CHECK_INTERVAL)
        
        idle_time = time.time() - last_request_time
        
        if idle_time > IDLE_TIMEOUT:
            print()
            print("=" * 60)
            print(f"⏰ 超过 {IDLE_TIMEOUT//60} 分钟无请求，自动关闭服务器...")
            print("=" * 60)
            server_running = False
            httpd.shutdown()
            break

def start_server():
    """启动HTTP服务器"""
    
    # 切换到脚本所在目录的上两级（项目根目录）
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    os.chdir(project_root)
    
    print("=" * 60)
    print("  🧠 脑图工作栏测试服务器")
    print("=" * 60)
    print()
    print(f"📁 工作目录: {os.getcwd()}")
    print(f"🌐 服务地址: http://{HOST}:{PORT}")
    print(f"📄 测试页面: {TEST_PAGE}")
    print()
    print("=" * 60)
    print()
    
    # 检查测试页面是否存在
    test_page_path = script_dir / TEST_PAGE
    if not test_page_path.exists():
        print(f"❌ 错误: 找不到测试页面 {TEST_PAGE}")
        print(f"   路径: {test_page_path}")
        input("\n按任意键退出...")
        sys.exit(1)
    
    # 创建HTTP服务器（使用自定义处理器）
    Handler = CustomHTTPRequestHandler
    
    # 设置允许端口重用
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
            # 构建URL
            url = f"http://{HOST}:{PORT}/column-sources/mindmap/{TEST_PAGE}"
            
            print(f"✅ 服务器已启动！")
            print()
            print(f"🔗 访问地址: {url}")
            print()
            print("=" * 60)
            print()
            print("💡 使用提示:")
            print("   • 点击节点选中")
            print("   • 使用工具栏按钮操作")
            print("   • 按 F12 打开开发者工具查看日志")
            print("   • 按 Ctrl+C 停止服务器")
            print(f"   • {IDLE_TIMEOUT//60}分钟无请求自动退出")
            print()
            print("=" * 60)
            print()
            
            # 启动超时检测线程
            timeout_thread = threading.Thread(target=check_idle_timeout, args=(httpd,), daemon=True)
            timeout_thread.start()
            
            # 自动打开浏览器
            print("🌐 正在打开浏览器...")
            webbrowser.open(url)
            
            print()
            print("✅ 浏览器已打开！服务器运行中...")
            print(f"   （{IDLE_TIMEOUT//60}分钟无请求将自动退出）")
            print()
            
            # 启动服务器（阻塞）
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print()
        print("=" * 60)
        print("🛑 用户手动停止服务器")
        print("=" * 60)
        global server_running
        server_running = False
        sys.exit(0)
    except OSError as e:
        if e.errno == 10048:  # Windows端口占用错误
            print()
            print("=" * 60)
            print(f"❌ 错误: 端口 {PORT} 已被占用")
            print("=" * 60)
            print()
            print("💡 解决方案:")
            print("   1. 关闭占用该端口的程序")
            print("   2. 或者等待几秒后重试（端口释放需要时间）")
            print("   3. 或者修改脚本中的 PORT 配置")
            print()
        else:
            print(f"❌ 错误: {e}")
        input("\n按任意键退出...")
        sys.exit(1)
    finally:
        # 确保服务器正常关闭
        global server_running
        server_running = False
        print()
        print("✅ 端口已释放，可以重新启动")
        print()

if __name__ == "__main__":
    start_server()
