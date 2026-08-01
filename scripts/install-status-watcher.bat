@echo off
rem ============================================================
rem 安装"设备状态上报"开机自启（注册表 Run 键 + VBS 隐藏窗口）
rem 自启的是 watchdog（看护进程），它负责拉起并保活 watcher
rem 用法：双击运行即可，无需管理员权限
rem ============================================================
chcp 65001 >nul
setlocal

set RUNKEY=HKCU\Software\Microsoft\Windows\CurrentVersion\Run
set VBS=D:\NewBlog\scripts\status-watchdog-hidden.vbs

echo.
echo [1/3] 写入开机自启注册表项（watchdog）...
reg add "%RUNKEY%" /v BlogStatusWatcher /t REG_SZ /d "wscript.exe \"%VBS%\"" /f >nul
if errorlevel 1 (
  echo [失败] 写入注册表失败
  pause
  exit /b 1
)
echo [完成] 已设置：登录后自动静默运行（watchdog 自动拉起状态上报）

echo [2/3] 停止旧实例并重启...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" | Where-Object { $_.CommandLine -match 'status-watcher|status-watchdog' -and $_.ProcessId -ne $PID } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
start "" wscript.exe "%VBS%"
echo [完成] 已启动 watchdog

echo [3/3] 验证...
timeout /t 6 /nobreak >nul
tasklist | findstr /i "wscript.exe" >nul
if errorlevel 1 (
  echo [提示] 未检测到 wscript 进程，请查看日志：
) else (
  echo [OK] 看护进程已在后台运行
)
echo.
echo   日志:  D:\NewBlog\scripts\status-watchdog.log
echo          D:\NewBlog\scripts\status-watcher.log
echo   配置:  D:\NewBlog\scripts\config.json
echo.
echo 常用命令:
echo   停止:   taskkill /F /IM wscript.exe ^(会结束所有 wscript^)
echo   卸载:   运行 uninstall-status-watcher.bat
echo.
pause
