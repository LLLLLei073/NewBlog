' 隐藏启动 status-watcher.ps1 —— 无窗口后台运行
' 由 install-status-watcher.bat 注册为开机自启
' 启动参数：30 秒检测 + 2 分钟心跳（保证移动端 30 秒内看到新状态）
Set shell = CreateObject("Wscript.Shell")
cmd = """powershell.exe"" -NoProfile -ExecutionPolicy Bypass -File ""D:\NewBlog\scripts\status-watcher.ps1"" -interval 30 -heartbeat 120"
shell.Run cmd, 0, False
