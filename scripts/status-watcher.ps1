# ============================================================
# 设备状态上报脚本（电脑端）
# 作用：检测当前前台窗口，把"我在做什么"实时写入 status.json
#       并推送到 GitHub（博客 /about 页实时展示）。
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File scripts\status-watcher.ps1
#   （或运行 install-status-watcher.bat 安装开机自启，VBS 隐藏后台运行）
#
# 行为：
#   - 每 $interval 秒检测一次前台窗口
#   - 活动变化时立即更新 status.json 并推送
#   - 每 $heartbeat 秒推送一次"心跳"，保持"在线"状态新鲜
#   - 活动不变时静默（不产生多余提交）
# ============================================================

param(
  [int]$interval = 60,     # 检测间隔（秒）
  [int]$heartbeat = 600,   # 心跳间隔（秒），0 = 关闭
  [string]$repo = "D:\NewBlog"
)

$statusFile = Join-Path $repo "public\status.json"

# 后台运行时把输出写到日志（前台跑则直接显示）
$logFile = Join-Path $PSScriptRoot "status-watcher.log"
try { Start-Transcript -Path $logFile -Append -ErrorAction SilentlyContinue | Out-Null } catch {}

# ---- Win32 前台窗口 API ----
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

# ---- 窗口标题 → 活动描述 映射规则（按需修改） ----
$rules = @(
  @{ Pattern = 'Visual Studio Code|vscode|Code -';  Activity = '正在写代码';  Detail = 'VS Code' }
  @{ Pattern = 'WebStorm|IntelliJ|PyCharm|IDEA';    Activity = '正在写代码';  Detail = 'JetBrains IDE' }
  @{ Pattern = 'Chrome|Edge|Firefox|Brave';         Activity = '正在浏览网页'; Detail = '浏览器' }
  @{ Pattern = '微信|WeChat';                        Activity = '正在用微信';  Detail = '微信' }
  @{ Pattern = 'QQ ';                                Activity = '正在用 QQ';   Detail = 'QQ' }
  @{ Pattern = '哔哩哔哩|bilibili|Bilibili';         Activity = '正在看视频';  Detail = '哔哩哔哩' }
  @{ Pattern = 'PotPlayer|mpv|VLC|爱奇艺|优酷|腾讯视频'; Activity = '正在看视频'; Detail = '播放器' }
  @{ Pattern = '网易云音乐|QQ音乐|Spotify|酷狗';     Activity = '正在听音乐';  Detail = '音乐' }
  @{ Pattern = 'Word|WPS|Excel|PowerPoint|OneNote';  Activity = '正在处理文档'; Detail = 'Office' }
  @{ Pattern = 'Windows Terminal|cmd|PowerShell|MobaXterm'; Activity = '正在敲命令'; Detail = '终端' }
  @{ Pattern = 'Steam|英雄联盟|原神|游戏';           Activity = '正在玩游戏';  Detail = '游戏' }
)

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

function Resolve-Activity($info) {
  foreach ($r in $rules) {
    if ($info.Title -match $r.Pattern -or $info.Process -match $r.Pattern) {
      return @{ Activity = $r.Activity; Detail = $r.Detail }
    }
  }
  # 未匹配：用进程名
  return @{ Activity = "正在使用 $($info.Process)"; Detail = $info.Title }
}

# ---- 主循环 ----
$lastPush = 0
$lastActivity = $null

while ($true) {
  try {
    $info = Get-ActiveInfo
    $now = [DateTimeOffset]::Now

    if ($info -eq $null) {
      $activity = '离开电脑'
      $detail = '未检测到活动窗口'
    } else {
      $mapped = Resolve-Activity $info
      $activity = $mapped.Activity
      $detail = $mapped.Detail
    }

    $changed = ($activity -ne $lastActivity)
    $heartbeatDue = ($heartbeat -gt 0 -and ($now.ToUnixTimeSeconds() - $lastPush) -ge $heartbeat)

    if ($changed -or $heartbeatDue) {
      # 生成完整状态（不读旧文件；手机暂未接入固定离线）
      $nowStr = $now.ToString("yyyy-MM-ddTHH:mm:sszzz")
      $statusObj = @{
        updatedAt = $nowStr
        pc = @{
          online = $true
          activity = $activity
          detail = $detail
          updatedAt = $nowStr
        }
        phone = @{
          online = $false
          activity = "离线"
          detail = ""
          updatedAt = ""
        }
      }
      $status = $statusObj | ConvertTo-Json -Depth 4

      # 写文件（无 BOM 的 UTF-8，否则浏览器 JSON.parse 会失败）
      $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
      [System.IO.File]::WriteAllText($statusFile, $status, $utf8NoBom)

      # 推送到 GitHub（只推 status.json；失败时明确提示，不静默）
      git -C $repo add public/status.json
      git -C $repo commit -m "status: $activity"
      $pushResult = git -C $repo push origin main 2>&1
      if ($LASTEXITCODE -ne 0) {
        Write-Host "[push失败] $pushResult"
      } else {
        Write-Host "[已推送] 线上约 40 秒后生效"
      }

      $lastPush = $now.ToUnixTimeSeconds()
      $lastActivity = $activity
      Write-Host ("[{0}] {1} - {2}" -f $now.ToString("HH:mm:ss"), $activity, $detail)
    }
  } catch {
    Write-Host ("[error] " + $_.Exception.Message)
  }

  Start-Sleep -Seconds $interval
}
