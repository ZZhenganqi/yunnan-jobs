@echo off
chcp 65001 >nul 2>&1
rem ============================================================
rem  无人值守更新（供 Windows 计划任务调用）
rem  与「一键更新并发布.bat」的区别：
rem    - 不 pause、不弹浏览器，全程静默
rem    - 自动定位 node.exe（系统 PATH 里通常没有 node）
rem    - 输出写入 logs/ 目录，便于事后排查
rem ============================================================
cd /d "%~dp0"

set "LOGDIR=%~dp0logs"
if not exist "%LOGDIR%" md "%LOGDIR%"

rem 生成时间戳（不依赖区域设置，避免 %DATE% 格式差异）
set "TS="
for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss" 2^>nul') do set "TS=%%i"
if not defined TS set "TS=run"
set "LOG=%LOGDIR%\daily-%TS%.log"

echo ============================================ >> "%LOG%"
echo  开始时间: %DATE% %TIME%                     >> "%LOG%"
echo ============================================ >> "%LOG%"

rem ---------- 定位 node.exe ----------
set "NODE_EXE="

rem 1) 优先用 PATH 里的
for /f "delims=" %%i in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%i"

rem 2) WorkBuddy 托管的 node（取版本号最高的一个）
if not defined NODE_EXE (
  set "NODEBASE=%USERPROFILE%\.workbuddy\binaries\node\versions"
  if exist "%NODEBASE%" (
    for /f "delims=" %%d in ('dir /b /o-n "%NODEBASE%" 2^>nul') do (
      if not defined NODE_EXE if exist "%NODEBASE%\%%d\node.exe" set "NODE_EXE=%NODEBASE%\%%d\node.exe"
    )
  )
)

rem 3) 常见安装位置
if not defined NODE_EXE if exist "C:\Program Files\nodejs\node.exe" set "NODE_EXE=C:\Program Files\nodejs\node.exe"

if not defined NODE_EXE (
  echo  错误: 找不到 node.exe，无法更新。 >> "%LOG%"
  exit /b 1
)
echo  使用 node: %NODE_EXE% >> "%LOG%"

rem ---------- 第 1 步: 抓取 ----------
"%NODE_EXE%" scripts\fetch.mjs >> "%LOG%" 2>&1
if errorlevel 1 (
  echo. >> "%LOG%"
  echo  抓取失败，已停止发布。 >> "%LOG%"
  exit /b 1
)

rem ---------- 第 2 步: 发布 ----------
"%NODE_EXE%" scripts\publish.mjs >> "%LOG%" 2>&1
if errorlevel 1 (
  echo. >> "%LOG%"
  echo  发布失败（可能是 token 失效）。 >> "%LOG%"
  exit /b 1
)

echo. >> "%LOG%"
echo  完成时间: %DATE% %TIME% >> "%LOG%"
echo  网站约 1-2 分钟后更新。 >> "%LOG%"
exit /b 0
