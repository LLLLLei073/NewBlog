# 旧版 watchdog 已停用。
#
# 状态更新现在必须由用户显式运行 status-watcher.ps1，避免后台采集、
# 频繁写文件和自动提交。保留本文件仅用于让旧的启动入口安全退出。

Write-Warning 'BlogStatusWatcher 已停用；没有启动后台采集进程。'
exit 0
