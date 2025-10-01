@echo off
echo ========================================
echo Column Frontend HTTP Server
echo ========================================
echo.
echo Starting...
echo.

cd /d "%~dp0"
python tools\start_column_frontend.py --detail

pause
