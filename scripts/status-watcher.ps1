# 安全的公开状态生成器
#
# 仅接受手动选择的粗粒度状态，不读取窗口标题、进程、设备名称或硬件信息，
# 也不会执行 git add / commit / push。需要更新时请手动运行，例如：
#   powershell -File scripts\status-watcher.ps1 -State creating -Message "整理新文章"

param(
  [ValidateSet('online', 'creating', 'away', 'offline')]
  [string]$State = 'offline',
  [ValidateLength(0, 48)]
  [string]$Message = '',
  [string]$Repo = 'D:\NewBlog'
)

$ErrorActionPreference = 'Stop'
$repoPath = (Resolve-Path -LiteralPath $Repo).Path
$statusFile = Join-Path $repoPath 'public\status.json'
$publicPath = (Resolve-Path -LiteralPath (Join-Path $repoPath 'public')).Path

if ($repoPath -ne 'D:\NewBlog' -or -not $statusFile.StartsWith($publicPath + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "拒绝写入意外路径：$statusFile"
}

$labels = @{
  online   = '在线'
  creating = '正在创作'
  away     = '暂时离开'
  offline  = '状态暂不公开'
}

$payload = [ordered]@{
  updatedAt = [DateTimeOffset]::Now.ToString('o')
  presence = [ordered]@{
    state = $State
    label = $labels[$State]
    message = $Message.Trim()
  }
}

$json = $payload | ConvertTo-Json -Depth 3
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($statusFile, $json, $utf8NoBom)

Write-Host "已生成安全状态：$($labels[$State])"
Write-Host '未采集设备信息，未执行任何 Git 命令。'
