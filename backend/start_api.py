import uvicorn
import os
import sys
import psutil
import webbrowser
import threading
import time
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def kill_process_on_port(port):
    """强制清理指定端口上的进程"""
    killed = False
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            for conn in proc.connections():
                if conn.laddr.port == port and conn.status == 'LISTEN':
                    print(f"发现端口 {port} 被进程 {proc.pid} ({proc.name()}) 占用，正在清理...")
                    proc.kill()
                    killed = True
                    print(f"✅ 已清理进程 {proc.pid}")
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    
    if not killed:
        print(f"✅ 端口 {port} 未被占用")
    
    return killed

def open_browser(url, delay=2):
    """延迟打开浏览器"""
    def _open():
        time.sleep(delay)
        print(f"\n🌐 正在打开浏览器: {url}")
        webbrowser.open(url)
    
    thread = threading.Thread(target=_open)
    thread.daemon = True
    thread.start()

if __name__ == "__main__":
    # 从环境变量获取配置，如果没有则使用默认值
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    # 清理端口
    print(f"检查端口 {port}...")
    if kill_process_on_port(port):
        time.sleep(1)  # 等待端口释放
    
    print(f"启动API服务，地址: {host}:{port}")
    
    # 自动打开浏览器
    url = f"http://localhost:{port}/column-sources/relation/relation-column-layout.html"
    open_browser(url, delay=2)
    
    print(f"✅ 服务启动后将自动打开: {url}")
    print(f"💡 提示: 按 Ctrl+C 停止服务\n")
    
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
