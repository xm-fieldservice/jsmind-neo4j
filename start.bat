@echo off
chcp 65001 >nul
echo 🚀 启动AutoGen混合存储脑图应用
echo =====================================

REM 检查Python环境
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python未安装或不在PATH中
    pause
    exit /b 1
)

REM 检查.env文件
if not exist .env (
    echo ⚠️ 未找到.env文件，复制示例配置...
    copy .env.example .env
    echo ✅ 请编辑.env文件设置API密钥
)

REM 检查依赖
echo 📦 检查Python依赖...
pip show autogen-ext >nul 2>&1
if errorlevel 1 (
    echo 📥 安装AutoGen依赖...
    pip install -r requirements_autogen.txt
)

REM 启动应用
echo 🎯 启动应用...
python start_autogen_app.py

pause
