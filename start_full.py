#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速完整启动脚本
一键启动后端+前端+自动打开浏览器
"""
import subprocess
import sys
from pathlib import Path

def main():
    """快速启动完整系统"""
    project_root = Path(__file__).parent
    start_script = project_root / 'tools' / 'start.py'
    
    print("🚀 启动完整脑图系统...")
    print("- 后端服务器: http://127.0.0.1:8081")
    print("- 前端服务器: http://127.0.0.1:8082")  
    print("- 自动打开浏览器")
    print("- MD底座自动同步")
    print()
    
    # 调用完整启动
    cmd = [sys.executable, str(start_script), '--full']
    subprocess.run(cmd, cwd=str(project_root))

if __name__ == '__main__':
    main()
