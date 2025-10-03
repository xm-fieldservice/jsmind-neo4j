#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
脑图工作栏测试服务器启动脚本 - 自动清理端口版本
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import subprocess
import platform
from pathlib import Path

# 配置
PORT = 8888
HOST = "localhost"
TEST_PAGE = "mindmap-standalone.html"

def clear_port(port):
    """清理指定端口的占用进程"""
    try:
        print(f"🔧 正在清理端口 {port}...")
        
        if platform.system() == "Windows":
            # 查找占用端口的进程
            result = subprocess.run(
                f'netstat -ano | findstr :{port}',
                shell=True, capture_output=True, text=True
            )
            
            if result.stdout:
                lines = result.stdout.strip().split('\n')
                pids = set()
                for line in lines:
                    parts = line.split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        pids.add(pid)
                
                # 强制结束进程
                for pid in pids:
                    try:
                        subprocess.run(f'taskkill /F /PID {pid}', shell=True, check=True)
                        print(f"✅ 已结束进程 PID: {pid}")
                    except:
                        pass
                        
                print(f"✅ 端口 {port} 清理完成")
            else:
                print(f"✅ 端口 {port} 未被占用")
        
    except Exception as e:
        print(f"⚠️ 清理端口时出现问题: {e}")
        print("继续启动服务器...")

def start_server():
    """启动HTTP服务器"""
    
    # 清理端口占用
    clear_port(PORT)
    
    # 切换到脚本所在目录的上两级（项目根目录）
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    os.chdir(project_root)
    
    print("=" * 60)
    print("  🧠 脑图工作栏测试服务器 (自动清理端口版)")
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
    
    # 创建HTTP服务器
    Handler = http.server.SimpleHTTPRequestHandler
    
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
            print()
            print("=" * 60)
            print()
            
            # 自动打开浏览器
            print("🌐 正在打开浏览器...")
            webbrowser.open(url)
            
            print()
            print("✅ 浏览器已打开！服务器运行中...")
            print()
            
            # 启动服务器（阻塞）
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print()
        print("=" * 60)
        print("🛑 服务器已停止")
        print("=" * 60)
        sys.exit(0)
    except OSError as e:
        if e.errno == 10048:  # Windows端口占用错误
            print(f"❌ 错误: 端口 {PORT} 仍被占用")
            print(f"   端口清理可能失败，请手动检查")
        else:
            print(f"❌ 错误: {e}")
        input("\n按任意键退出...")
        sys.exit(1)

if __name__ == "__main__":
    start_server()
