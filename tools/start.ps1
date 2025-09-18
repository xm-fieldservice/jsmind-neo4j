#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# 配置
$Port = 8081
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$BackendScript = Join-Path $ProjectRoot 'start_autogen_app.py'
$IndexHtml = Join-Path $ProjectRoot 'index.html'
$BackendUrl = "http://127.0.0.1:$Port"

Write-Host "[启动器] 项目根目录: $ProjectRoot"

# 1) 端口清理（若被占用则终止占用进程）
try {
  $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($conns) {
    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
      try { Write-Host "[启动器] 终止占用端口 $Port 的进程 PID=$pid"; Stop-Process -Id $pid -Force -ErrorAction Stop } catch {}
    }
    Start-Sleep -Milliseconds 300
  }
} catch {}

# 2) 启动后端（后台运行）
if (!(Test-Path $BackendScript)) {
  Write-Error "后端脚本不存在: $BackendScript"
  exit 1
}

# 尝试定位 Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command py -ErrorAction SilentlyContinue }
if (-not $python) { Write-Error "未找到 Python，请先安装 Python3 并确保在 PATH 中"; exit 1 }

Write-Host "[启动器] 启动后端: $($python.Source) $BackendScript"
$backend = Start-Process -FilePath $python.Source -ArgumentList @('-u', $BackendScript) -WorkingDirectory $ProjectRoot -WindowStyle Minimized -PassThru

# 3) 健康检查（等待后端就绪）
$maxWait = 30
for ($i=0; $i -lt $maxWait; $i++) {
  try {
    $resp = Invoke-WebRequest -Uri "$BackendUrl/health" -UseBasicParsing -TimeoutSec 2
    if ($resp.StatusCode -eq 200) { Write-Host "[启动器] 后端已就绪: $BackendUrl"; break }
  } catch {}
  Start-Sleep -Seconds 1
}
if ($i -ge $maxWait) {
  Write-Warning "后端健康检查超时，但继续尝试打开前端。请手动确认 $BackendUrl/health 是否可访问。"
}

# 4) 打开前端 index.html
if (Test-Path $IndexHtml) {
  Write-Host "[启动器] 打开前端: $IndexHtml"
  Start-Process -FilePath $IndexHtml
} else {
  Write-Warning "未找到 index.html: $IndexHtml"
}

Write-Host "[启动器] 完成。如需停止后端，请手动结束 PID=$($backend.Id) 进程，或关闭 PowerShell。"
