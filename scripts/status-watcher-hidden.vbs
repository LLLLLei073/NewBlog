' Hidden launcher for status-watcher.ps1 (no window, background)
' Registered by install-status-watcher.bat (HKCU Run key, on-logon autostart)
' Args: 30s detection + 120s heartbeat so mobile sees fresh state ~30s
' NOTE: keep this file pure ASCII, NO BOM (wscript fails on BOM)
Set shell = CreateObject("Wscript.Shell")
shell.Run """powershell.exe"" -NoProfile -ExecutionPolicy Bypass -File ""D:\NewBlog\scripts\status-watcher.ps1"" -interval 30 -heartbeat 120", 0, False
