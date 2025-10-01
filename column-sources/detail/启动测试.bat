@echo off
cd /d "%~dp0\..\..\"

echo ============================================
echo Detail Column - Test Environment Startup
echo ============================================
echo.

echo [1/3] Cleaning port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo       Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)
echo       [OK] Port 8000 cleaned

echo.
echo [2/3] Starting HTTP server on port 8000...
start /B python -m http.server 8000
timeout /t 2 /nobreak >nul
echo       [OK] Server started

echo.
echo [3/3] Opening browser...
start http://localhost:8000/column-sources/detail/detail-column-layout.html
timeout /t 1 /nobreak >nul
echo       [OK] Browser opened

echo.
echo ============================================
echo Test Environment Ready
echo ============================================
echo.
echo Server: http://localhost:8000
echo.
echo Test Steps:
echo    1. Click [Test] button in detail page
echo    2. Test harness opens in new window
echo    3. Click any node in the list
echo    4. Switch to detail page to see data
echo.
echo Note:
echo    - Server runs in background
echo    - Press any key to close this window
echo    - Server continues running
echo.
echo ============================================
echo.
pause
