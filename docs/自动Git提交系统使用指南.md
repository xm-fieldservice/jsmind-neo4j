# 自动Git提交系统使用指南

**程序员**  
**日期**: 2025-10-08  
**版本**: 1.0

---

##  功能说明

智能自动Git提交系统，监控项目文件变化，在指定时间无新变化后自动提交。

### 核心特性

1. **智能监控**
   - 实时监控项目文件变化
   - 自动排除 `node_modules`, `.git`, `vendor` 等目录
   - 只监控代码文件（js, html, css, md等）

2. **智能提交**
   - 检测到变化后启动倒计时
   - 有新变化时自动重置倒计时
   - 倒计时结束后自动提交
   - 使用 `git smart` 生成美丽的提交信息

3. **灵活配置**
   - 可配置等待时间（默认5分钟）
   - 可选择是否自动推送
   - 实时显示状态

---

##  快速开始

### 基本使用

```powershell
# 启动监控（默认5分钟）
.\auto-commit-smart.ps1

# 指定等待时间（3分钟）
.\auto-commit-smart.ps1 -WaitMinutes 3

# 启用自动推送
.\auto-commit-smart.ps1 -AutoPush

# 组合使用
.\auto-commit-smart.ps1 -WaitMinutes 3 -AutoPush
```

### 停止监控

按 `Ctrl+C` 停止监控

---

##  工作流程

```
文件变化  启动倒计时(5分钟)
    
新变化?  是  重置倒计时
     否
倒计时结束  调用 git smart  自动提交  (可选)自动推送
```

---

##  使用场景

### 场景1: 日常开发（推荐）

```powershell
# 启动监控，5分钟自动提交
.\auto-commit-smart.ps1
```

**适合**：正常开发节奏，专注编码

### 场景2: 快速迭代

```powershell
# 3分钟自动提交，适合快速开发
.\auto-commit-smart.ps1 -WaitMinutes 3 -AutoPush
```

**适合**：快速原型开发，频繁修改

### 场景3: 深度开发

```powershell
# 10分钟自动提交，适合深度思考
.\auto-commit-smart.ps1 -WaitMinutes 10
```

**适合**：复杂功能开发，需要长时间思考

---

##  提交信息示例

使用 `git smart` 生成的美丽提交信息：

```
docs: 自动提交 2025-10-08 10:15

**项目**: project_manager

## 主要变更
- 修改 3 个文件

## 变更文件
### 修改
- src/core/ai-workflow/AIWorkflowMonitor.js
- docs/工作记录-关系管理.md
- README.md

## 代码统计
```
3 files changed, 45 insertions(+), 12 deletions(-)
```
```

---

##  与手动提交结合

### 方式1: 完全自动

启动自动监控后，无需手动提交：

```powershell
.\auto-commit-smart.ps1 -AutoPush
```

### 方式2: 混合模式（推荐）

- 自动监控作为备份
- 重要节点手动提交

```powershell
# 终端1: 启动自动监控
.\auto-commit-smart.ps1

# 终端2: 手动提交重要节点
git smart
```

---

##  最佳实践

### 1. 推荐配置

```powershell
# 日常开发推荐配置
.\auto-commit-smart.ps1 -WaitMinutes 5 -AutoPush
```

### 2. 工作流建议

-  早上启动自动监控
-  专注编码，无需关心提交
-  重要里程碑手动提交
-  晚上停止监控，查看提交历史

### 3. 注意事项

-  确保网络稳定（如果启用自动推送）
-  定期检查提交历史
-  重要功能建议手动提交

---

##  故障排查

### 问题1: 脚本无法执行

**症状**: 提示无法加载脚本

**解决**:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 问题2: git smart 命令不存在

**症状**: 提示 git smart 不是有效命令

**解决**:
```powershell
# 配置 git smart 别名
git config alias.smart "!pwsh smart-commit-enhanced.ps1 -Auto"
```

### 问题3: 监控不生效

**检查**:
- 确认在项目根目录执行
- 确认有Git仓库
- 确认有文件变化

---

##  日志示例

```
 启动智能自动Git提交
等待时间: 5 分钟
自动推送: True
按 Ctrl+C 停止

  [10:00:23] 检测到变化，将在 5 分钟后提交
  [10:01:45] 检测到变化，将在 5 分钟后提交
  [10:03:12] 检测到变化，将在 5 分钟后提交

 开始智能提交...
 调用 git smart 生成美丽的提交信息...
 提交完成（第 1 次）
```

---

##  进阶技巧

### 1. 配置Git别名

```powershell
# 配置自动提交别名
git config alias.auto-commit "!pwsh auto-commit-smart.ps1"

# 使用
git auto-commit
```

### 2. 后台运行

```powershell
# Windows后台运行
Start-Process powershell -ArgumentList "-File auto-commit-smart.ps1 -WaitMinutes 5 -AutoPush" -WindowStyle Hidden
```

### 3. 开机自启动

创建快捷方式到启动文件夹：
```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
```

---

##  对比

### 手动提交 vs 自动提交

| 特性 | 手动提交 | 自动提交 |
|------|---------|---------|
| 提交频率 | 不定期 | 固定间隔 |
| 提交信息 | 需要编写 | 自动生成 |
| 工作打断 | 需要停下 | 无感知 |
| 代码备份 | 可能遗忘 | 自动备份 |
| 适用场景 | 重要节点 | 日常开发 |

**建议**: 混合使用，自动提交作为备份，重要节点手动提交

---

##  相关文档

- [Git提交规范和工具使用指南](Git提交规范和工具使用指南.md)
- [smart-commit-enhanced.ps1 使用说明](../README.md)

---

**程序员**
