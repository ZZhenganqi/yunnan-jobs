@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Yunnan Public-Job Radar  /  One Click
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js NOT found.
  echo     Please install Node.js 20 LTS: https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo [1/2] Fetching jobs from official sources ...
node scripts\fetch.mjs
if errorlevel 1 (
  echo [X] Fetch failed. Check your network connection.
  pause
  exit /b 1
)

echo.
echo [2/2] Starting server at http://localhost:8787
echo       Browser will open in a few seconds.
echo       Press Ctrl+C in this window to stop.
echo.
start "" /b cmd /c "ping -n 4 127.0.0.1>nul&start http://localhost:8787"
node scripts\serve.mjs
pause
