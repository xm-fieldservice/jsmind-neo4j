#!/usr/bin/env pwsh
<#
.SYNOPSIS
    智能Git提交脚本 - 自动生成结构化提交信息

.DESCRIPTION
    分析Git变更，自动生成符合规范的提交信息
    
.PARAMETER Type
    提交类型: feat, fix, docs, style, refactor, perf, test, chore, arch
    
.PARAMETER Message
    简短描述
    
.PARAMETER Auto
    自动模式，分析变更自动生成提交信息

.EXAMPLE
    .\smart-commit.ps1 -Type feat -Message "添加用户登录功能"
    .\smart-commit.ps1 -Auto
#>

param(
    [ValidateSet('feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'arch')]
    [string]$Type,
    
    [string]$Message,
    
    [switch]$Auto
)

$repo = $PSScriptRoot

# 切换到仓库目录
Set-Location $repo

# 检查是否有变更
$status = git status --porcelain
if (-not $status) {
    Write-Host "ℹ️  没有需要提交的变更" -ForegroundColor Yellow
    exit 0
}

# 分析变更
function Analyze-Changes {
    $changes = @{
        Added = @()
        Modified = @()
        Deleted = @()
        Renamed = @()
    }
    
    $statusLines = git status --porcelain
    foreach ($line in $statusLines) {
        $status = $line.Substring(0, 2).Trim()
        $file = $line.Substring(3)
        
        switch ($status) {
            'A' { $changes.Added += $file }
            'M' { $changes.Modified += $file }
            'D' { $changes.Deleted += $file }
            'R' { $changes.Renamed += $file }
            '??' { $changes.Added += $file }
        }
    }
    
    return $changes
}

# 自动推断提交类型
function Infer-CommitType {
    param($changes)
    
    $allFiles = $changes.Added + $changes.Modified + $changes.Deleted
    
    # 文档变更
    if ($allFiles | Where-Object { $_ -match '\.(md|txt|doc)$' }) {
        return 'docs'
    }
    
    # 测试文件
    if ($allFiles | Where-Object { $_ -match 'test|spec' }) {
        return 'test'
    }
    
    # 架构文件
    if ($allFiles | Where-Object { $_ -match 'src/core|架构|architecture' }) {
        return 'arch'
    }
    
    # 配置文件
    if ($allFiles | Where-Object { $_ -match '\.(json|yml|yaml|config)$' }) {
        return 'chore'
    }
    
    # 样式文件
    if ($allFiles | Where-Object { $_ -match '\.(css|scss|less)$' }) {
        return 'style'
    }
    
    # 默认为功能
    return 'feat'
}

# 生成提交信息
function Generate-CommitMessage {
    param(
        [string]$type,
        [string]$summary,
        $changes
    )
    
    $message = "$type`: $summary`n`n"
    
    # 主要变更
    $message += "## 主要变更`n"
    if ($changes.Added.Count -gt 0) {
        $message += "- 新增 $($changes.Added.Count) 个文件`n"
    }
    if ($changes.Modified.Count -gt 0) {
        $message += "- 修改 $($changes.Modified.Count) 个文件`n"
    }
    if ($changes.Deleted.Count -gt 0) {
        $message += "- 删除 $($changes.Deleted.Count) 个文件`n"
    }
    $message += "`n"
    
    # 详细文件列表
    $message += "## 变更文件`n"
    
    if ($changes.Added.Count -gt 0) {
        $message += "### 新增`n"
        foreach ($file in $changes.Added | Select-Object -First 10) {
            $message += "- $file`n"
        }
        if ($changes.Added.Count -gt 10) {
            $message += "- ... 及其他 $($changes.Added.Count - 10) 个文件`n"
        }
        $message += "`n"
    }
    
    if ($changes.Modified.Count -gt 0) {
        $message += "### 修改`n"
        foreach ($file in $changes.Modified | Select-Object -First 10) {
            $message += "- $file`n"
        }
        if ($changes.Modified.Count -gt 10) {
            $message += "- ... 及其他 $($changes.Modified.Count - 10) 个文件`n"
        }
        $message += "`n"
    }
    
    if ($changes.Deleted.Count -gt 0) {
        $message += "### 删除`n"
        foreach ($file in $changes.Deleted | Select-Object -First 5) {
            $message += "- $file`n"
        }
        $message += "`n"
    }
    
    # 统计信息
    $stats = git diff --cached --stat
    if ($stats) {
        $message += "## 代码统计`n"
        $message += "``````n"
        $message += $stats
        $message += "`n``````n"
    }
    
    return $message
}

# 主流程
Write-Host "📝 智能Git提交" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

# 添加所有变更
Write-Host "`n📦 添加变更..." -ForegroundColor Yellow
git add -A

# 分析变更
$changes = Analyze-Changes

Write-Host "✅ 检测到变更:" -ForegroundColor Green
Write-Host "  - 新增: $($changes.Added.Count) 个文件" -ForegroundColor White
Write-Host "  - 修改: $($changes.Modified.Count) 个文件" -ForegroundColor White
Write-Host "  - 删除: $($changes.Deleted.Count) 个文件" -ForegroundColor White

# 自动模式
if ($Auto) {
    Write-Host "`n🤖 自动模式" -ForegroundColor Cyan
    
    $Type = Infer-CommitType -changes $changes
    Write-Host "  - 推断类型: $Type" -ForegroundColor White
    
    $Message = "自动提交 $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    Write-Host "  - 生成描述: $Message" -ForegroundColor White
}

# 交互模式
if (-not $Type) {
    Write-Host "`n❓ 请选择提交类型:" -ForegroundColor Cyan
    Write-Host "  1. feat     - 新功能"
    Write-Host "  2. fix      - Bug修复"
    Write-Host "  3. docs     - 文档更新"
    Write-Host "  4. style    - 代码格式"
    Write-Host "  5. refactor - 重构"
    Write-Host "  6. perf     - 性能优化"
    Write-Host "  7. test     - 测试"
    Write-Host "  8. chore    - 构建/工具"
    Write-Host "  9. arch     - 架构级变更"
    
    $choice = Read-Host "`n请输入数字 (1-9)"
    
    $types = @('feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'arch')
    $Type = $types[[int]$choice - 1]
}

if (-not $Message) {
    $Message = Read-Host "`n📝 请输入简短描述"
}

# 生成提交信息
Write-Host "`n✍️  生成提交信息..." -ForegroundColor Yellow
$commitMessage = Generate-CommitMessage -type $Type -summary $Message -changes $changes

# 显示提交信息预览
Write-Host "`n📄 提交信息预览:" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host $commitMessage -ForegroundColor White
Write-Host "=" * 50 -ForegroundColor Gray

# 确认提交
$confirm = Read-Host "`n❓ 确认提交? (Y/n)"
if ($confirm -eq '' -or $confirm -eq 'Y' -or $confirm -eq 'y') {
    # 提交
    Write-Host "`n💾 提交中..." -ForegroundColor Yellow
    $commitMessage | git commit -F -
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 提交成功！" -ForegroundColor Green
        
        # 询问是否推送
        $push = Read-Host "`n❓ 是否推送到远程? (Y/n)"
        if ($push -eq '' -or $push -eq 'Y' -or $push -eq 'y') {
            Write-Host "`n🚀 推送中..." -ForegroundColor Yellow
            git push
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ 推送成功！" -ForegroundColor Green
            } else {
                Write-Host "❌ 推送失败" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "❌ 提交失败" -ForegroundColor Red
    }
} else {
    Write-Host "`n❌ 已取消提交" -ForegroundColor Yellow
}

Write-Host "`n" -NoNewline
