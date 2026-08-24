@echo off
chcp 65001 >nul
echo.
echo [已停用] 为保护隐私，博客状态不再支持后台采集和自动 Git 推送。
echo 如需手动发布粗粒度状态，请运行：
echo   powershell -File D:\NewBlog\scripts\status-watcher.ps1 -State creating -Message "整理新文章"
echo.
pause
