#!/usr/bin/env pwsh
<#
.SYNOPSIS
    智能Git提交脚本（增强版）- 支持标签、项目名称识别和多标签复选
.DESCRIPTION
    分析Git变更，自动生成符合规范的提交信息
    新功能：
    1. 支持标签参数 (-Tags)
    2. 自动识别项目名称 (-ProjectName 或自动检测)
    3. 交互式多标签复选 (-InteractiveTags)
.PARAMETER Type
    提交类型: feat, fix, docs, style, refactor, perf, test, chore, arch
.PARAMETER Message
    简短描述
.PARAMETER Tags
    标签数组，多个标签用逗号分隔
.PARAMETER ProjectName
    项目名称（可选，不指定则自动识别）
.PARAMETER Auto
    自动模式，分析变更自动生成提交信息
.PARAMETER InteractiveTags
    交互式标签选择模式
.EXAMPLE
    .\smart-commit-enhanced.ps1 -Type feat -Message "添加功能" -Tags "重要更新","性能优化"
    .\smart-commit-enhanced.ps1 -Auto
    .\smart-commit-enhanced.ps1 -InteractiveTags
    .\smart-commit-enhanced.ps1 -ProjectName "项目管理系统" -Tags "bug修复"
#>

param(
    [ValidateSet('feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'arch')]
    [string]$Type,
    
    [string]$Message,
    
    [string[]]$Tags,
    
    [string]$ProjectName,
    
    [switch]$Auto,
    
    [switch]$InteractiveTags
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

# 自动识别项目名称
function Get-ProjectName {
    # 优先使用参数指定的项目名称
    if ($script:ProjectName) {
        return $script:ProjectName
    }
    
    # 尝试从 package.json 读取
    $packageJsonPath = Join-Path $repo "package.json"
    if (Test-Path $packageJsonPath) {
        try {
            $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
            if ($packageJson.name) {
                return $packageJson.name
            }
        } catch {
            # 忽略解析错误
        }
    }
    
    # 尝试从 .git/config 读取远程仓库名称
    $gitConfigPath = Join-Path $repo ".git\config"
    if (Test-Path $gitConfigPath) {
        $gitConfig = Get-Content $gitConfigPath
        foreach ($line in $gitConfig) {
            if ($line -match 'url\s*=\s*.*[:/]([^/]+)/([^/\.]+)(\.git)?$') {
                return $matches[2]
            }
        }
    }
    
    # 使用当前目录名称
    return (Get-Item $repo).Name
}

# 交互式标签选择
function Select-Tags {
    $availableTags = @(
        "功能增强",
        "性能优化",
        "bug修复",
        "重要更新",
        "紧急修复",
        "架构改进",
        "代码重构",
        "文档完善",
        "测试增强",
        "依赖更新"
    )
    
    Write-Host "`n🏷️  请选择标签（输入数字，多个用逗号分隔，如: 1,3,5）:" -ForegroundColor Cyan
    for ($i = 0; $i -lt $availableTags.Count; $i++) {
        Write-Host "  $($i + 1). $($availableTags[$i])"
    }
    Write-Host "  0. 不添加标签"
    
    $input = Read-Host "`n请输入选择"
    
    if ($input -eq '0' -or [string]::IsNullOrWhiteSpace($input)) {
        return @()
    }
    
    $selectedTags = @()
    $choices = $input -split ',' | ForEach-Object { $_.Trim() }
    
    foreach ($choice in $choices) {
        $index = [int]$choice - 1
        if ($index -ge 0 -and $index -lt $availableTags.Count) {
            $selectedTags += $availableTags[$index]
        }
    }
    
    return $selectedTags
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
        $changes,
        [string[]]$tags,
        [string]$projectName
    )
    
    # 构建标题
    $title = "$type`: $summary"
    
    # 添加标签到标题
    if ($tags -and $tags.Count -gt 0) {
        $tagString = ($tags | ForEach-Object { "[$_]" }) -join " "
        $title = "$type`: $summary $tagString"
    }
    
    $message = "$title`n`n"
    
    # 添加项目信息
    if ($projectName) {
        $message += "**项目**: $projectName`n`n"
    }
    
    # 添加标签信息
    if ($tags -and $tags.Count -gt 0) {
        $message += "**标签**: $($tags -join ', ')`n`n"
    }
    
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
Write-Host "📝 智能Git提交（增强版）" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

# 获取项目名称
$detectedProjectName = Get-ProjectName
Write-Host "`n📦 项目: $detectedProjectName" -ForegroundColor Green

# 添加所有变更
Write-Host "`n📦 添加变更..." -ForegroundColor Yellow
git add -A

# 分析变更
$changes = Analyze-Changes

Write-Host "✅ 检测到变更:" -ForegroundColor Green
Write-Host "  - 新增: $($changes.Added.Count) 个文件" -ForegroundColor White
Write-Host "  - 修改: $($changes.Modified.Count) 个文件" -ForegroundColor White
Write-Host "  - 删除: $($changes.Deleted.Count) 个文件" -ForegroundColor White

# 处理标签
$selectedTags = @()
if ($InteractiveTags) {
    $selectedTags = Select-Tags
} elseif ($Tags) {
    $selectedTags = $Tags
}

if ($selectedTags.Count -gt 0) {
    Write-Host "`n🏷️  已选择标签: $($selectedTags -join ', ')" -ForegroundColor Magenta
}

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
$commitMessage = Generate-CommitMessage -type $Type -summary $Message -changes $changes -tags $selectedTags -projectName $detectedProjectName

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
