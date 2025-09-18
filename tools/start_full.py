#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整启动脚本：后端 + 前端 + 自动打开浏览器
"""
import os
import sys
import time
import subprocess
import webbrowser
from pathlib import Path

def start_full_system():
    """启动完整系统"""
    project_root = Path(__file__).parent.parent
    
    print("[完整启动] 启动后端服务...")
    
    # 1. 启动后端（使用现有的start.py）
    start_script = project_root / 'tools' / 'start.py'
    backend_process = subprocess.Popen([
        sys.executable, str(start_script)
    ], cwd=str(project_root))
    
    # 等待后端启动
    print("[完整启动] 等待后端就绪...")
    time.sleep(3)
    
    # 2. 启动前端静态服务器
    print("[完整启动] 启动前端服务器...")
    frontend_process = subprocess.Popen([
        sys.executable, '-m', 'http.server', '8082'
    ], cwd=str(project_root))
    
    # 等待前端启动
    time.sleep(2)
    
    # 3. 自动打开浏览器
    url = 'http://127.0.0.1:8082/index.html'
    print(f"[完整启动] 打开浏览器: {url}")
    
    try:
        webbrowser.open(url)
        print("[完整启动] 浏览器已打开")
    except Exception as e:
        print(f"[完整启动] 自动打开浏览器失败: {e}")
        print(f"[完整启动] 请手动访问: {url}")
    
    print("[完整启动] 系统启动完成")
    print("后端: http://127.0.0.1:8081")
    print("前端: http://127.0.0.1:8082")
    print("按 Ctrl+C 停止所有服务")
    
    try:
        # 保持运行
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[完整启动] 正在停止服务...")
        backend_process.terminate()
        frontend_process.terminate()
        print("[完整启动] 所有服务已停止")

if __name__ == '__main__':
    start_full_system()
