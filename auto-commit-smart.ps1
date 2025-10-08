#!/usr/bin/env pwsh
<#
.SYNOPSIS
    智能自动Git提交系统
.DESCRIPTION
    监控项目文件变化，在X分钟无新变化后自动提交
    使用 git smart 生成美丽的提交信息
.PARAMETER WaitMinutes
    等待时间（分钟），默认5分钟
.PARAMETER AutoPush
    是否自动推送到远程
.EXAMPLE
    .\auto-commit-smart.ps1
    .\auto-commit-smart.ps1 -WaitMinutes 3 -AutoPush
#>

param(
    [int]$WaitMinutes = 5,
    [switch]$AutoPush
)

$repo = $PSScriptRoot
Set-Location $repo

$lastChangeTime = $null
$timer = $null
$commitCount = 0

Write-Host " 启动智能自动Git提交" -ForegroundColor Green
Write-Host "等待时间: $WaitMinutes 分钟" -ForegroundColor Cyan
Write-Host "自动推送: $($AutoPush.IsPresent)" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Gray

# 提交函数（调用 git smart）
function Do-Commit {
    $changes = git status --porcelain
    if (-not $changes) {
        Write-Host "  无变更，跳过提交" -ForegroundColor Gray
        return
    }
    
    Write-Host "`n 开始智能提交..." -ForegroundColor Yellow
    Write-Host " 调用 git smart 生成美丽的提交信息..." -ForegroundColor Cyan
    
    # 调用 git smart（自动模式）
    git smart -Auto
    
    # 如果需要自动推送
    if ($AutoPush -and $LASTEXITCODE -eq 0) {
        Write-Host " 推送到远程..." -ForegroundColor Yellow
        git push
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " 推送成功" -ForegroundColor Green
        } else {
            Write-Host " 推送失败" -ForegroundColor Red
        }
    }
    
    $script:commitCount++
    Write-Host " 提交完成（第 $script:commitCount 次）`n" -ForegroundColor Green
}

# 重置计时器
function Reset-Timer {
    if ($script:timer) {
        $script:timer.Stop()
        $script:timer.Dispose()
    }
    
    $script:lastChangeTime = Get-Date
    $script:timer = New-Object System.Timers.Timer
    $script:timer.Interval = $WaitMinutes * 60 * 1000
    $script:timer.AutoReset = $false
    
    Register-ObjectEvent -InputObject $script:timer -EventName Elapsed -Action {
        Do-Commit
    } | Out-Null
    
    $script:timer.Start()
    
    $time = Get-Date -Format "HH:mm:ss"
    Write-Host "  [$time] 检测到变化，将在 $WaitMinutes 分钟后提交" -ForegroundColor Cyan
}

# 创建文件监控
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $repo
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::DirectoryName -bor [System.IO.NotifyFilters]::LastWrite

# 注册事件
$onChange = Register-ObjectEvent -InputObject $watcher -EventName Changed -Action {
    $path = $Event.SourceEventArgs.FullPath
    if ($path -notmatch 'node_modules|\.git|vendor|\.vs|\.vscode|\.log$|\.tmp$') {
        Reset-Timer
    }
}

$onCreate = Register-ObjectEvent -InputObject $watcher -EventName Created -Action {
    $path = $Event.SourceEventArgs.FullPath
    if ($path -notmatch 'node_modules|\.git|vendor|\.vs|\.vscode|\.log$|\.tmp$') {
        Reset-Timer
    }
}

$onDelete = Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action {
    $path = $Event.SourceEventArgs.FullPath
    if ($path -notmatch 'node_modules|\.git|vendor|\.vs|\.vscode|\.log$|\.tmp$') {
        Reset-Timer
    }
}

# 保持运行
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`n 停止监控..." -ForegroundColor Yellow
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    Unregister-Event -SourceIdentifier $onChange.Name
    Unregister-Event -SourceIdentifier $onCreate.Name
    Unregister-Event -SourceIdentifier $onDelete.Name
    if ($timer) {
        $timer.Stop()
        $timer.Dispose()
    }
    Write-Host " 已停止" -ForegroundColor Green
    Write-Host "总共自动提交: $commitCount 次" -ForegroundColor Cyan
}
