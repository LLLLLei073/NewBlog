' Hidden launcher for status-watchdog.ps1 (no window, background)
' Registered by install-status-watcher.bat (HKCU Run key, on-logon autostart)
' The watchdog keeps status-watcher.ps1 alive (auto-restart on crash)
' NOTE: keep this file pure ASCII, NO BOM (wscript fails on BOM)
Set shell = CreateObject("Wscript.Shell")
shell.Run """powershell.exe"" -NoProfile -ExecutionPolicy Bypass -File ""D:\NewBlog\scripts\status-watchdog.ps1""", 0, False
