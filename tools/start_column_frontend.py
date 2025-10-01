#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
工作栏前端HTTP服务器启动器
专门为工作栏生态系统提供HTTP服务，解决CORS问题

使用：
  python tools/start_column_frontend.py              # 启动工作栏前端（8000端口）
  python tools/start_column_frontend.py --port 9000  # 自定义端口
  python tools/start_column_frontend.py --open       # 启动后自动打开详情页
  python tools/start_column_frontend.py --detail     # 启动后自动打开详情页工作栏
  
特性：
  - 自动清理端口占用
  - 在项目根目录启动HTTP服务器
  - 支持所有工作栏访问（detail、list、mindmap等）
  - 解决file://协议的CORS问题
"""
import argparse
import os
import sys
import time
import subprocess
import webbrowser
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

DEFAULT_PORT = 8000


def project_root() -> Path:
    """获取项目根目录"""
    return Path(__file__).resolve().parents[1]


def is_windows() -> bool:
    """检查是否为Windows系统"""
    return os.name == 'nt'


def kill_port(port: int):
    """终止占用指定端口的进程（仅Windows）"""
    if not is_windows():
        print(f"[工作栏前端] 非Windows平台，请手动检查端口 {port} 是否被占用")
        return
    
    try:
        # 查询占用端口的PID
        cmd = f'netstat -ano | findstr :{port}'
        out = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.STDOUT)
        pids = set()
        
        for line in out.splitlines():
            line = line.strip()
            if line and 'LISTENING' in line:
                parts = [p for p in line.split() if p]
                if parts:
                    pid = parts[-1]
                    if pid.isdigit():
                        pids.add(int(pid))
        
        if not pids:
            print(f"[工作栏前端] ✓ 端口 {port} 未被占用")
            return
        
        for pid in pids:
            try:
                print(f"[工作栏前端] 正在终止占用端口 {port} 的进程 (PID={pid})...")
                subprocess.run(
                    ["taskkill", "/PID", str(pid), "/F"], 
                    check=False, 
                    stdout=subprocess.DEVNULL, 
                    stderr=subprocess.DEVNULL
                )
                print(f"[工作栏前端] ✓ 已终止进程 PID={pid}")
            except Exception as e:
                print(f"[工作栏前端] ⚠️ 终止进程失败: {e}")
        
        time.sleep(0.5)  # 等待端口释放
        
    except subprocess.CalledProcessError:
        print(f"[工作栏前端] ✓ 端口 {port} 未被占用")
    except Exception as e:
        print(f"[工作栏前端] ⚠️ 端口检查失败: {e}")


def check_server_ready(port: int, timeout_sec: int = 10) -> bool:
    """检查HTTP服务器是否就绪"""
    base_url = f"http://127.0.0.1:{port}"
    start_time = time.time()
    
    while time.time() - start_time < timeout_sec:
        try:
            req = Request(base_url, headers={'User-Agent': 'ColumnFrontend/1.0'})
            with urlopen(req, timeout=2) as response:
                if response.status == 200:
                    return True
        except (URLError, HTTPError):
            pass
        time.sleep(0.5)
    
    return False


def start_http_server(port: int) -> subprocess.Popen:
    """启动HTTP服务器"""
    root = project_root()
    
    print(f"[工作栏前端] 项目根目录: {root}")
    print(f"[工作栏前端] 启动HTTP服务器...")
    print(f"[工作栏前端] 端口: {port}")
    
    # 使用Python内置的http.server模块
    cmd = [sys.executable, '-m', 'http.server', str(port)]
    
    try:
        process = subprocess.Popen(
            cmd, 
            cwd=str(root),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # 等待服务器启动
        print(f"[工作栏前端] 等待服务器启动...")
        
        if check_server_ready(port, timeout_sec=10):
            print(f"[工作栏前端] ✅ HTTP服务器启动成功!")
            print(f"[工作栏前端] 访问地址: http://localhost:{port}")
            return process
        else:
            print(f"[工作栏前端] ⚠️ 服务器可能未完全启动，但继续运行...")
            return process
            
    except Exception as e:
        print(f"[工作栏前端] ❌ 启动失败: {e}")
        sys.exit(1)


def open_browser(port: int, path: str = None):
    """打开浏览器"""
    if path:
        url = f"http://localhost:{port}/{path}"
    else:
        url = f"http://localhost:{port}/"
    
    print(f"[工作栏前端] 正在打开浏览器: {url}")
    
    try:
        time.sleep(1)  # 等待服务器完全就绪
        webbrowser.open(url)
        print(f"[工作栏前端] ✓ 已打开浏览器")
    except Exception as e:
        print(f"[工作栏前端] ⚠️ 打开浏览器失败: {e}")
        print(f"[工作栏前端] 请手动访问: {url}")


def print_usage_info(port: int):
    """打印使用信息"""
    print("\n" + "="*60)
    print("工作栏前端服务器运行中".center(60))
    print("="*60)
    print(f"\n📡 服务器地址: http://localhost:{port}")
    print(f"\n📂 可访问的工作栏:")
    print(f"   • 详情页工作栏:")
    print(f"     http://localhost:{port}/column-sources/detail/detail-column-layout.html")
    print(f"\n   • 测试台:")
    print(f"     http://localhost:{port}/column-sources/_test-harness/test-harness.html")
    print(f"\n   • 其他工作栏:")
    print(f"     http://localhost:{port}/column-sources/")
    print(f"\n💡 提示:")
    print(f"   - 使用 http:// 协议访问，避免CORS错误")
    print(f"   - 不要直接双击HTML文件打开")
    print(f"   - 按 Ctrl+C 停止服务器")
    print("\n" + "="*60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description='工作栏前端HTTP服务器启动器',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--port', 
        type=int, 
        default=DEFAULT_PORT, 
        help=f'HTTP服务器端口（默认: {DEFAULT_PORT}）'
    )
    parser.add_argument(
        '--open', 
        action='store_true', 
        help='启动后自动打开浏览器（项目首页）'
    )
    parser.add_argument(
        '--detail', 
        action='store_true', 
        help='启动后自动打开详情页工作栏'
    )
    parser.add_argument(
        '--test', 
        action='store_true', 
        help='启动后自动打开测试台'
    )
    
    args = parser.parse_args()
    
    print("="*60)
    print("工作栏前端HTTP服务器启动器".center(60))
    print("="*60)
    
    # 清理端口
    print(f"\n[工作栏前端] 检查端口 {args.port}...")
    kill_port(args.port)
    
    # 启动HTTP服务器
    process = start_http_server(args.port)
    
    # 打印使用信息
    print_usage_info(args.port)
    
    # 自动打开浏览器
    if args.detail:
        open_browser(args.port, 'column-sources/detail/detail-column-layout.html')
    elif args.test:
        open_browser(args.port, 'column-sources/_test-harness/test-harness.html')
    elif args.open:
        open_browser(args.port, 'index.html')
    
    # 保持运行
    try:
        print("[工作栏前端] 服务器运行中，按 Ctrl+C 停止\n")
        process.wait()
    except KeyboardInterrupt:
        print("\n\n[工作栏前端] 正在停止服务器...")
        try:
            process.terminate()
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            print("[工作栏前端] 强制终止...")
            process.kill()
        except Exception as e:
            print(f"[工作栏前端] 停止失败: {e}")
        
        print("[工作栏前端] ✓ 服务器已停止")
        sys.exit(0)


if __name__ == '__main__':
    main()
