Param(
  [string]$Root = "d:\AI-Projects\project_manager(neo4j+d3.jsECHART)"
)

$ErrorActionPreference = 'Stop'

# 时间戳与产物路径
$stamp = Get-Date -Format yyyyMMdd_HHmm
$staging = Join-Path $Root ("_migration_staging_" + $stamp)
$zip = Join-Path $Root ("migration_package_" + $stamp + ".zip")

# 清理潜在旧产物
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
if (Test-Path $zip) { Remove-Item $zip -Force }

# 创建临时目录
New-Item -ItemType Directory -Path $staging | Out-Null

# 需要排除的目录与文件（数据/临时/构建）
$excludeDirs = @('.git','node_modules','dist','.specstory')
$excludeFiles = @('*.mindmap.json','*.log','*.sqlite','*.db','拼接脑图.json')

# 构建 /XD 参数（必须使用源绝对路径）
$xdArgs = @()
foreach($d in $excludeDirs){ $xdArgs += @('/XD', (Join-Path $Root $d)) }

# 构建 /XF 参数（文件模式即可）
$xfArgs = @()
foreach($f in $excludeFiles){ $xfArgs += @('/XF', $f) }

# 执行 robocopy（其返回码 0~7 通常为成功/部分成功，不抛出异常）
$robocopyArgs = @(
  $Root,
  $staging,
  '/E'
) + $xdArgs + $xfArgs

Write-Host "Running robocopy with args:" -ForegroundColor Cyan
$robocopyArgs | ForEach-Object { Write-Host "  " $_ }

# 使用调用运算符 & 以避免字符串拼接导致的空格问题
& robocopy @robocopyArgs | Out-Host
$rc = $LASTEXITCODE
Write-Host "robocopy exit code: $rc" -ForegroundColor Yellow

# 简单校验：确保有文件进入 staging
$stagedCount = (Get-ChildItem -Path $staging -Recurse -File | Measure-Object).Count
if ($stagedCount -le 0) {
  Write-Warning "Staging 目录为空，可能是排除规则过严或源路径不正确。将仍然创建空 zip（可取消后调整排除规则重试）。"
}

# 创建 zip 迁移包
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zip -CompressionLevel Optimal

# 清理临时目录
Remove-Item $staging -Recurse -Force

Write-Output "Created: $zip"
