@echo off
echo Starting Backend API Service...

cd /d "%~dp0backend"

REM 清理占用端口进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do (
    taskkill /F /PID %%a 2>nul
)

REM 检查Python环境
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Python not found! Please install Python and try again.
    pause
    exit /b 1
)

REM 安装依赖
python -m pip install -r requirements.txt

REM 启动后端API服务
python start_api.py

pause
