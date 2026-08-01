@echo off
rem 卸载"设备状态上报"开机自启
chcp 65001 >nul
set RUNKEY=HKCU\Software\Microsoft\Windows\CurrentVersion\Run

echo 停止正在运行的状态上报...
taskkill /F /IM wscript.exe >nul 2>&1
echo 删除开机自启注册表项...
reg delete "%RUNKEY%" /v BlogStatusWatcher /f >nul 2>&1
echo [完成] 已卸载开机自启。手动前台运行请执行:
echo   powershell -ExecutionPolicy Bypass -File D:\NewBlog\scripts\status-watcher.ps1
pause
