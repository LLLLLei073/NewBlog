' 隐藏启动 status-watcher.ps1 —— 无窗口后台运行
' 由 install-status-watcher.bat 注册为开机自启任务
Set shell = CreateObject("Wscript.Shell")
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File ""D:\NewBlog\scripts\status-watcher.ps1""", 0, False
