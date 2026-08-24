@echo off
chcp 65001 >nul
set RUNKEY=HKCU\Software\Microsoft\Windows\CurrentVersion\Run

echo 删除 BlogStatusWatcher 开机自启项...
reg delete "%RUNKEY%" /v BlogStatusWatcher /f >nul 2>&1
echo [完成] 已移除该项目的开机自启项。
echo 如有旧进程仍在运行，请重新登录 Windows；脚本不会再自动启动。
pause
