# ============================================================
# 设备状态上报脚本（电脑端）v2
# 检测前台窗口 → 活动映射 → status.json → 推送 GitHub
#
# 功能：
#   - 每 $interval 秒检测前台窗口，活动变化立即推送
#   - 每 $heartbeat 秒心跳推送（网络恢复后自动补推未推送的提交）
#   - 活动历史时间线（history）+ 每日统计（daily）
#   - 隐私开关：detail 开关 / 私密应用名单 / 隐身时段
#   - 规则可配置化（scripts/config.json）
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File scripts\status-watcher.ps1
#   （开机自启请运行 install-status-watcher.bat）
# ============================================================

param(
  [int]$interval = 30,     # 检测间隔（秒）
  [int]$heartbeat = 120,   # 心跳间隔（秒），0 = 关闭
  [string]$repo = "D:\NewBlog"
)

$statusFile = Join-Path $repo "public\status.json"
$configFile = Join-Path $PSScriptRoot "config.json"

# 后台运行时把输出写到日志（前台跑则直接显示）
$logFile = Join-Path $PSScriptRoot "status-watcher.log"
try { Start-Transcript -Path $logFile -Append -ErrorAction SilentlyContinue | Out-Null } catch {}

# ---- 加载配置（规则 / 隐私 / 历史上限） ----
$config = @{
  showDetail  = $true
  privateApps = @()
  quietHours  = @{ enabled = $false; start = "23:00"; end = "07:00" }
  historyLimit = 60
  rules = @()
}
if (Test-Path $configFile) {
  try {
    $cfg = [System.IO.File]::ReadAllText($configFile) | ConvertFrom-Json
    if ($cfg.showDetail -ne $null) { $config.showDetail = [bool]$cfg.showDetail }
    if ($cfg.privateApps) { $config.privateApps = @($cfg.privateApps) }
    if ($cfg.quietHours) { $config.quietHours = $cfg.quietHours }
    if ($cfg.historyLimit) { $config.historyLimit = [int]$cfg.historyLimit }
    if ($cfg.rules) { $config.rules = @($cfg.rules) }
  } catch { Write-Host "[warn] config.json 读取失败，使用默认配置: $($_.Exception.Message)" }
}

# ---- Win32 前台窗口 API ----
if (-not ("StatusWin" -as [type])) {
  Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class StatusWin {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
}
"@
}

function Get-ActiveInfo {
  $hwnd = [StatusWin]::GetForegroundWindow()
  if ($hwnd -eq [IntPtr]::Zero) { return $null }
  $sb = New-Object System.Text.StringBuilder 512
  [StatusWin]::GetWindowText($hwnd, $sb, 512) | Out-Null
  $title = $sb.ToString()
  if ([string]::IsNullOrWhiteSpace($title)) { return $null }
  $procId = 0
  [StatusWin]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
  $procName = ''
  try { $procName = (Get-Process -Id $procId -ErrorAction Stop).ProcessName } catch {}
  return @{ Title = $title; Process = $procName }
}

# 窗口标题清洗：去掉浏览器后缀、截断超长标题（P1-7 智能识别）
function Clean-Title($title) {
  $t = $title -replace ' - (Google Chrome|Microsoft Edge|Mozilla Firefox|Brave)$', ''
  $t = $t -replace '^(.{60}).*$', '$1…'
  return $t.Trim()
}

function Resolve-Activity($info) {
  foreach ($r in $config.rules) {
    if ($info.Title -match $r.pattern -or $info.Process -match $r.pattern) {
      $det = $r.detail
      if ($det -eq '@title') { $det = Clean-Title $info.Title }
      return @{ Activity = $r.activity; Detail = $det }
    }
  }
  return @{ Activity = "正在使用 $($info.Process)"; Detail = Clean-Title $info.Title }
}

# 隐身时段判断（支持跨午夜）
function Test-QuietHours($now) {
  $qh = $config.quietHours
  if (-not $qh.enabled) { return $false }
  $t = $now.ToString("HH:mm")
  if ($qh.start -le $qh.end) { return ($t -ge $qh.start -and $t -lt $qh.end) }
  return ($t -ge $qh.start -or $t -lt $qh.end)
}

# ---- 电脑硬件信息（采集一次，缓存复用） ----
$script:sysInfo = $null
function Get-SystemInfo {
  if ($script:sysInfo) { return $script:sysInfo }
  try {
    $cpu = (Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1).Name
    $gpu = (Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | Select-Object -First 1).Name
    $os  = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue)
    $ramGB = [math]::Round(($os.TotalVisibleMemorySize / 1MB), 1)
    $uptime = (Get-Date) - $os.LastBootUpTime
    $uptimeStr = ""
    if ($uptime.Days -gt 0) { $uptimeStr += "{0}天" -f $uptime.Days }
    $uptimeStr += "{0}小时" -f $uptime.Hours
    $script:sysInfo = @{
      cpu = $cpu; gpu = $gpu; ram = "$ramGB GB"
      os = "$($os.Caption) $($os.Version)"
      host = $env:COMPUTERNAME; uptime = $uptimeStr
    }
  } catch {
    $script:sysInfo = @{ cpu = "未知"; gpu = "未知"; ram = "未知"; os = "未知"; host = $env:COMPUTERNAME; uptime = "未知" }
  }
  return $script:sysInfo
}

# ---- 主循环 ----
$lastPush = 0
$lastActivity = $null
$lastChangeTime = $null

# 启动时从旧文件恢复上次活动（避免重启后误判"变化"导致 history 重复）
$oldInit = $null
if (Test-Path $statusFile) {
  try { $oldInit = [System.IO.File]::ReadAllText($statusFile) | ConvertFrom-Json } catch {}
  if ($oldInit -and $oldInit.pc) {
    if ($oldInit.pc.activity) { $lastActivity = $oldInit.pc.activity }
    if ($oldInit.pc.updatedAt) { try { $lastChangeTime = [DateTimeOffset]::Parse($oldInit.pc.updatedAt) } catch {} }
  }
}

while ($true) {
  try {
    $info = Get-ActiveInfo
    $now = [DateTimeOffset]::Now

    # ---- 隐私 / 隐身时段处理（P0-3） ----
    if (Test-QuietHours $now) {
      $online = $false; $activity = '离线（休息中）'; $detail = ''
    } elseif ($info -eq $null) {
      $online = $true; $activity = '离开电脑'; $detail = '未检测到活动窗口'
    } else {
      $mapped = Resolve-Activity $info
      $online = $true; $activity = $mapped.Activity; $detail = $mapped.Detail
      # 私密应用名单（进程名匹配）
      foreach ($pa in $config.privateApps) {
        if ($info.Process -match $pa) { $activity = '正在使用私密应用'; $detail = ''; break }
      }
    }
    if (-not $config.showDetail) { $detail = '' }

    $changed = ($activity -ne $lastActivity)
    $heartbeatDue = ($heartbeat -gt 0 -and ($now.ToUnixTimeSeconds() - $lastPush) -ge $heartbeat)

    if ($changed -or $heartbeatDue) {
      # 读旧文件保留 history / daily（.NET 读 UTF-8，避免 GBK 乱码）
      $old = $null
      if (Test-Path $statusFile) {
        try { $old = [System.IO.File]::ReadAllText($statusFile) | ConvertFrom-Json } catch {}
      }

      $nowStr = $now.ToString("yyyy-MM-ddTHH:mm:sszzz")
      $today = $now.ToString("yyyy-MM-dd")

      # 每日统计：累加上一段活动时长（P1-5）
      $stats = @{}
      if ($old -and $old.daily -and $old.daily.date -eq $today) {
        foreach ($p in $old.daily.stats.PSObject.Properties) { $stats[$p.Name] = [int]$p.Value }
      }
      if ($lastActivity -and $lastChangeTime) {
        $secs = [math]::Floor(($now - $lastChangeTime).TotalSeconds)
        if ($secs -gt 0 -and $secs -lt 86400) {
          $stats[$lastActivity] = [int]$stats[$lastActivity] + $secs
        }
      }

      # 活动历史时间线（P1-4）
      $history = @()
      if ($old -and $old.history) { $history = @($old.history) }
      if ($changed) {
        $history += @{ t = $nowStr; activity = $activity; detail = $detail }
        if ($history.Count -gt $config.historyLimit) {
          $history = $history[($history.Count - $config.historyLimit)..($history.Count - 1)]
        }
      }

      $statusObj = @{
        updatedAt = $nowStr
        pc = @{
          online = $online; activity = $activity; detail = $detail
          updatedAt = $nowStr; sysinfo = (Get-SystemInfo)
        }
        phone = @{ online = $false; activity = "离线"; detail = ""; updatedAt = "" }
        history = $history
        daily = @{ date = $today; stats = $stats }
      }
      $status = $statusObj | ConvertTo-Json -Depth 6

      # 写文件（无 BOM 的 UTF-8，否则浏览器 JSON.parse 会失败）
      $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
      [System.IO.File]::WriteAllText($statusFile, $status, $utf8NoBom)

      # 提交 + 推送（P0-1：失败不阻塞，下一次心跳自动重试补推）
      git -C $repo add public/status.json
      git -C $repo commit -m "status: $activity" 2>&1 | Out-Null
      $pushResult = git -C $repo push origin main 2>&1
      if ($LASTEXITCODE -ne 0) {
        Write-Host "[push失败，下轮重试] $($pushResult | Select-Object -First 1)"
      } else {
        Write-Host "[已推送] 线上约 40 秒后生效"
      }

      $lastPush = $now.ToUnixTimeSeconds()
      $lastActivity = $activity
      $lastChangeTime = $now
      Write-Host ("[{0}] {1} - {2}" -f $now.ToString("HH:mm:ss"), $activity, $detail)
    }
  } catch {
    Write-Host ("[error] " + $_.Exception.Message)
  }

  Start-Sleep -Seconds $interval
}
