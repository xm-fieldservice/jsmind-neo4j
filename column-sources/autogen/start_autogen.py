#!/usr/bin/env python3
"""
Autogen管理页面启动脚本
"""

import http.server
import socketserver
import webbrowser
import os
from pathlib import Path

PORT = 8003
DIRECTORY = Path(__file__).parent

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY.parent.parent), **kwargs)

def main():
    print(f"🚀 启动Autogen管理页面...")
    print(f"📂 工作目录: {DIRECTORY}")
    print(f"🌐 服务地址: http://localhost:{PORT}")
    print(f"📄 页面路径: /column-sources/autogen/autogen-manager.html")
    print("\n按 Ctrl+C 停止服务\n")
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        # 自动打开浏览器
        url = f"http://localhost:{PORT}/column-sources/autogen/autogen-manager.html"
        webbrowser.open(url)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 服务已停止")

if __name__ == "__main__":
    main()
