@echo off
rem ============================================================
rem 安装"设备状态上报"开机自启（注册表 Run 键 + VBS 隐藏窗口）
rem 用法：双击运行即可，无需管理员权限
rem ============================================================
chcp 65001 >nul
setlocal

set RUNKEY=HKCU\Software\Microsoft\Windows\CurrentVersion\Run
set VBS=D:\NewBlog\scripts\status-watcher-hidden.vbs

echo.
echo [1/3] 写入开机自启注册表项...
reg add "%RUNKEY%" /v BlogStatusWatcher /t REG_SZ /d "wscript.exe \"%VBS%\"" /f >nul
if errorlevel 1 (
  echo [失败] 写入注册表失败
  pause
  exit /b 1
)
echo [完成] 已设置：登录后自动静默运行

echo [2/3] 立即启动一次...
start "" wscript.exe "%VBS%"
echo [完成] 已启动

echo [3/3] 验证...
timeout /t 3 /nobreak >nul
tasklist | findstr /i "wscript.exe" >nul
if errorlevel 1 (
  echo [提示] 未检测到 wscript 进程，请查看日志：
) else (
  echo [OK] 状态上报已在后台静默运行（无窗口）
)
echo.
echo   日志:  D:\NewBlog\scripts\status-watcher.log
echo   状态:  D:\NewBlog\public\status.json
echo.
echo 常用命令:
echo   停止:   taskkill /F /IM wscript.exe ^(会结束所有 wscript^)
echo   卸载:   运行 uninstall-status-watcher.bat
echo.
pause
