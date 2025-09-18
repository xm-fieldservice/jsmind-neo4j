#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地一键启动器（Python 版）- 增强版
- 清理端口占用（Windows：netstat + taskkill；其他平台：仅提示）
- 启动后端服务器（非阻塞）
- 启动前端HTTP服务器（可选）
- MD底座初始化同步
- 健康检查与自动打开浏览器
使用：
  python tools/start.py              # 仅启动后端
  python tools/start.py --full       # 启动后端+前端+打开浏览器
  python tools/start.py --frontend   # 仅启动前端HTTP服务器
  python tools/start.py --port 8090  # 自定义后端端口
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
try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

DEFAULT_BACKEND_PORT = 8081
DEFAULT_FRONTEND_PORT = 8082


def project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def is_windows() -> bool:
    return os.name == 'nt'


def kill_port(port: int):
    """在 Windows 上终止占用指定端口的进程；其他平台提示跳过。"""
    if not is_windows():
        print(f"[启动器] 非 Windows 平台，跳过端口清理（端口: {port}）")
        return
    try:
        # 查询占用端口的 PID 列表
        cmd = f'netstat -ano | findstr :{port}'
        out = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.STDOUT)
        pids = set()
        for line in out.splitlines():
            line = line.strip()
            # 仅处理 LISTENING 行
            if line and 'LISTENING' in line:
                parts = [p for p in line.split() if p]
                if parts:
                    pid = parts[-1]
                    if pid.isdigit():
                        pids.add(int(pid))
        if not pids:
            print(f"[启动器] 端口 {port} 未被占用")
            return
        for pid in pids:
            try:
                print(f"[启动器] 终止占用端口 {port} 的进程 PID={pid}")
                subprocess.run(["taskkill", "/PID", str(pid), "/F"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass
        time.sleep(0.3)
    except subprocess.CalledProcessError:
        # 未找到占用，忽略
        print(f"[启动器] 端口 {port} 未被占用")
    except Exception as e:
        print(f"[启动器] 端口清理失败：{e}")


def find_python_exe() -> str:
    # 优先使用当前解释器
    return sys.executable or "python"


def start_backend(port: int) -> subprocess.Popen:
    """启动后端服务并等待健康检查通过，返回进程对象。失败返回 None。"""
    root = project_root()
    script = root / 'backend_server.py'
    if not script.exists():
        print(f"[启动器] 未找到后端脚本: {script}")
        return None

    cmd = [sys.executable, str(script)]
    print(f"[启动器] 启动后端: {' '.join(cmd)}")
    try:
        process = subprocess.Popen(cmd, cwd=str(root))
    except Exception as e:
        print(f"[启动器] 启动后端失败: {e}")
        return None

    # 健康检查
    base_url = f"http://127.0.0.1:{port}"
    if not health_check(base_url, timeout_sec=30):
        print(f"[启动器] 后端启动超时或健康检查失败")
        try:
            process.terminate()
        except Exception:
            pass
        return None

    return process


def health_check(base_url: str, timeout_sec: int = 30) -> bool:
    url = base_url.rstrip('/') + '/health'
    start = time.time()
    while time.time() - start < timeout_sec:
        try:
            req = Request(url, headers={'User-Agent': 'LocalStarter/1.0'})
            with urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    print(f"[启动器] 后端已就绪: {url}")
                    return True
        except (URLError, HTTPError):
            pass
        time.sleep(1)
    print(f"[启动器] 健康检查超时：{url}")
    return False


def start_frontend_server(port: int):
    """启动前端HTTP服务器"""
    print(f"[启动器] 启动前端HTTP服务器: http://127.0.0.1:{port}")
    
    cmd = [sys.executable, '-m', 'http.server', str(port)]
    process = subprocess.Popen(cmd, cwd=str(project_root()))
    
    # 等待前端服务器启动
    for i in range(10):  # 最多等待10秒
        try:
            time.sleep(1)
            req = Request(f"http://127.0.0.1:{port}/index.html")
            with urlopen(req, timeout=2) as response:
                if response.status == 200:
                    print(f"[启动器] 前端服务器已就绪: http://127.0.0.1:{port}")
                    return process
        except (URLError, HTTPError):
            continue
    
    print(f"[启动器] 前端服务器启动可能失败，但继续运行...")
    return process


def open_browser_delayed(url: str, delay: int = 2):
    """延迟打开浏览器"""
    def delayed_open():
        time.sleep(delay)
        try:
            webbrowser.open(url)
            print(f"[启动器] 已打开浏览器: {url}")
        except Exception as e:
            print(f"[启动器] 打开浏览器失败: {e}")
            print(f"[启动器] 请手动访问: {url}")
    
    # 在后台线程中延迟打开
    import threading
    thread = threading.Thread(target=delayed_open, daemon=True)
    thread.start()
    return thread


def open_frontend():
    index = project_root() / 'index.html'
    if index.exists():
        print(f"[启动器] 打开前端: {index}")
        webbrowser.open(index.as_uri())
    else:
        print(f"[启动器] 未找到 index.html: {index}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=DEFAULT_BACKEND_PORT, help='后端端口（默认 8081）')
    parser.add_argument('--frontend-port', type=int, default=DEFAULT_FRONTEND_PORT, help='前端端口（默认 8082）')
    parser.add_argument('--full', action='store_true', help='启动完整系统（后端+前端+浏览器）')
    parser.add_argument('--frontend', action='store_true', help='仅启动前端HTTP服务器')
    parser.add_argument('--no-browser', action='store_true', help='不自动打开浏览器')
    args = parser.parse_args()

    # 预加载 .env（可选）
    root = project_root()
    env_path = root / '.env'
    if load_dotenv and env_path.exists():
        load_dotenv(dotenv_path=str(env_path), override=False)
        print(f"[启动器] 已加载 .env: {env_path}")
    else:
        print("[启动器] 未找到 .env 或未安装 python-dotenv，使用系统环境变量")

    # .env 可覆盖端口
    port_from_env = os.getenv('REGISTRY_PORT')
    if port_from_env and port_from_env.isdigit():
        args.port = int(port_from_env)
        print(f"[启动器] 使用 .env REGISTRY_PORT={args.port}")

    base_url = f"http://127.0.0.1:{args.port}"
    health_url = base_url.rstrip('/') + '/health'

    print(f"[启动器] 项目根目录: {project_root()}")
    
    # 根据参数决定启动模式
    if args.frontend:
        # 仅启动前端模式
        print(f"[启动器] 仅启动前端HTTP服务器模式")
        print(f"[启动器] 前端端口: {args.frontend_port}")
        
        kill_port(args.frontend_port)
        frontend_process = start_frontend_server(args.frontend_port)
        
        frontend_url = f"http://127.0.0.1:{args.frontend_port}/index.html"
        if not args.no_browser:
            open_browser_delayed(frontend_url, delay=2)
        
        print(f"[启动器] 前端服务器运行中: {frontend_url}")
        print(f"[启动器] 完成。前端 PID={frontend_process.pid}，按 Ctrl+C 停止")
        
        try:
            frontend_process.wait()
        except KeyboardInterrupt:
            print("\n[启动器] 正在停止前端服务器...")
            frontend_process.terminate()
        
        return
    
    # 启动后端
    print(f"[启动器] 后端端口: {args.port}")
    kill_port(args.port)
    backend = start_backend(args.port)
    if not backend:
        print("[启动器] 后端启动失败，退出。")
        sys.exit(1)
    
    # MD底座初始化同步
    print(f"[启动器] 执行MD底座初始化同步...")
    try:
        sync_script = project_root() / 'tools' / 'md_sync_simple.py'
        result = subprocess.run([
            sys.executable, str(sync_script), str(project_root())
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print(f"[启动器] MD底座同步成功")
        else:
            print(f"[启动器] MD底座同步失败: {result.stderr}")
    except Exception as e:
        print(f"[启动器] MD底座同步异常: {e}")
    
    # 完整模式：同时启动前端
    if args.full:
        print(f"[启动器] 启动完整系统模式（后端+前端+浏览器）")
        print(f"[启动器] 前端端口: {args.frontend_port}")
        
        kill_port(args.frontend_port)
        frontend_process = start_frontend_server(args.frontend_port)
        
        frontend_url = f"http://127.0.0.1:{args.frontend_port}/index.html"
        if not args.no_browser:
            open_browser_delayed(frontend_url, delay=3)
        
        print(f"[启动器] 完整系统运行中:")
        print(f"[启动器] - 后端: http://127.0.0.1:{args.port}")
        print(f"[启动器] - 前端: {frontend_url}")
        print(f"[启动器] 后端 PID={backend.pid}, 前端 PID={frontend_process.pid}")
        print(f"[启动器] 按 Ctrl+C 停止所有服务")
        
        try:
            # 等待任一进程结束
            while backend.poll() is None and frontend_process.poll() is None:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[启动器] 正在停止所有服务...")
            backend.terminate()
            frontend_process.terminate()
    else:
        # 仅后端模式
        frontend_path = project_root() / 'index.html'
        print(f"[启动器] 仅启动后端模式")
        print(f"[启动器] 要使用完整功能，请运行: python tools/start.py --full")
        print(f"[启动器] 或手动启动前端: python -m http.server {args.frontend_port}")
        print(f"[启动器] 然后访问: http://127.0.0.1:{args.frontend_port}/index.html")
        print(f"[启动器] 完成。后端 PID={backend.pid}，如需停止请结束该进程或关闭终端。")


if __name__ == '__main__':
    main()
