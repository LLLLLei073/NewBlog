# ============================================================
# 设备状态上报看护脚本（watchdog）
# 作用：每 60 秒检查 status-watcher.ps1 是否在运行，
#       若崩溃/退出则在 3 秒内自动拉起（隐藏窗口）。
# 由 status-watchdog-hidden.vbs 通过注册表 Run 键开机自启。
# ============================================================

$watcherScript = Join-Path $PSScriptRoot "status-watcher.ps1"
$logFile = Join-Path $PSScriptRoot "status-watchdog.log"
try { Start-Transcript -Path $logFile -Append -ErrorAction SilentlyContinue | Out-Null } catch {}

function Write-Log($msg) {
  Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg)
}

Write-Log "watchdog 启动，监控 $watcherScript"

while ($true) {
  try {
    # 查找运行中的 watcher 进程（排除自身）
    $running = $false
    Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object {
      $_.ProcessId -ne $PID -and $_.CommandLine -match 'status-watcher\.ps1'
    } | ForEach-Object { $running = $true }

    if (-not $running) {
      Write-Log "watcher 未运行，正在拉起..."
      $psi = New-Object System.Diagnostics.ProcessStartInfo
      $psi.FileName = 'powershell.exe'
      $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$watcherScript`" -interval 30 -heartbeat 120"
      $psi.WindowStyle = 'Hidden'
      $psi.CreateNoWindow = $true
      $p = [System.Diagnostics.Process]::Start($psi)
      if ($p) { Write-Log "已启动 watcher (PID $($p.Id))" } else { Write-Log "启动失败" }
    }
  } catch {
    Write-Log ("[error] " + $_.Exception.Message)
  }

  Start-Sleep -Seconds 60
}
