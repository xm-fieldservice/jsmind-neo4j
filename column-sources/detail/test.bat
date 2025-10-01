@echo off
cd /d "%~dp0\..\..\"
start /B python -m http.server 8000
timeout /t 2 /nobreak >nul
start http://localhost:8000/column-sources/detail/detail-column-layout.html
echo Server started. Press Ctrl+C to stop.
pause
