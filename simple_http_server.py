#!/usr/bin/env python3
"""
简易HTTP服务器用于运行系统健康检查
"""

import http.server
import socketserver
import os
import webbrowser

PORT = 8080
DIRECTORY = "."

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def log_message(self, format, *args):
        print(f"[HTTP Server] {format % args}")

def main():
    # 切换到项目根目录
    os.chdir(DIRECTORY)
    
    # 启动HTTP服务器
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"🚀 HTTP服务器已启动: http://localhost:{PORT}")
        print(f"📁 服务目录: {os.path.abspath(DIRECTORY)}")
        print("⏹️  按Ctrl+C停止服务器")
        print("🌐 正在打开浏览器...")
        
        # 自动打开浏览器
        webbrowser.open(f"http://localhost:{PORT}")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 服务器已停止")

if __name__ == "__main__":
    main()
