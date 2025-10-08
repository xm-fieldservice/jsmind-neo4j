# Git提交规范和工具使用指南

**作者**: 程序员  
**日期**: 2025-10-08  
**版本**: 1.0

---

## 📋 提交信息规范

### 格式标准

```
类型: 简短描述（不超过50字符）

## 主要变更
- 变更点1
- 变更点2

## 详细说明
### 1. 功能/修复
- 详细描述1
- 详细描述2

### 2. 技术实现
- 实现细节1
- 实现细节2

### 3. 影响范围
- 影响的模块
- 影响的功能

## 代码统计
```
文件变更统计
```
```

---

## 🏷️ 提交类型

| 类型 | 说明 | 示例 |
|-----|------|------|
| **feat** | 新功能 | feat: 添加用户登录功能 |
| **fix** | Bug修复 | fix: 修复登录失败问题 |
| **docs** | 文档更新 | docs: 更新API文档 |
| **style** | 代码格式 | style: 统一代码缩进 |
| **refactor** | 重构 | refactor: 重构用户模块 |
| **perf** | 性能优化 | perf: 优化查询性能 |
| **test** | 测试 | test: 添加单元测试 |
| **chore** | 构建/工具 | chore: 更新依赖包 |
| **arch** | 架构级变更 | arch: 实现AI工作流监控 |

---

## 🛠️ 工具使用

### 1. 智能提交脚本

**位置**: `smart-commit.ps1`

#### 使用方式

##### 自动模式（推荐）
```powershell
.\smart-commit.ps1 -Auto
```

**功能**:
- ✅ 自动分析变更文件
- ✅ 自动推断提交类型
- ✅ 自动生成提交信息
- ✅ 显示预览供确认

##### 指定类型和描述
```powershell
.\smart-commit.ps1 -Type feat -Message "添加用户管理功能"
```

##### 交互模式
```powershell
.\smart-commit.ps1
```

**流程**:
1. 选择提交类型（1-9）
2. 输入简短描述
3. 自动生成详细提交信息
4. 预览并确认
5. 提交
6. 询问是否推送

---

### 2. Git提交模板

**位置**: `.gitmessage`

#### 使用方式

```bash
# 使用模板提交
git commit

# 会自动打开编辑器，显示模板
# 填写相应内容后保存即可
```

**模板内容**:
```
# 提交类型：简短描述（不超过50字符）

## 主要变更
- 
- 

## 详细说明
### 1. 功能/修复
- 

### 2. 技术实现
- 

### 3. 影响范围
- 

## 测试情况
- [ ] 单元测试通过
- [ ] 功能测试通过
- [ ] 无破坏性变更
```

---

### 3. 快捷命令

#### 配置别名

```bash
# 快速保存（简单提交）
git config alias.save '!git add -A && git commit -m "Quick save" && git push'

# 智能提交（使用脚本）
git config alias.smart '!pwsh smart-commit.ps1 -Auto'

# 交互提交（使用脚本）
git config alias.commit-i '!pwsh smart-commit.ps1'
```

#### 使用

```bash
# 快速保存
git save

# 智能提交
git smart

# 交互提交
git commit-i
```

---

## 📊 提交信息示例

### 示例1: 新功能

```
feat: 实现AI开发工作流监控系统

## 主要变更
- 新增 3 个核心模块
- 修改 2 个页面集成
- 新增 2 个文档

## 详细说明
### 1. 核心功能
- 创建AIWorkflowMonitor核心监控模块
- 创建ArchitectureAlignmentChecker架构检查器
- 创建ModuleComplianceChecker模块规范检查器

### 2. 技术实现
- 使用函数劫持技术拦截AI工具调用
- 实现透明代理模式，AI无感知
- 并行执行多项审查，提高效率

### 3. 影响范围
- 影响所有页面的AI代码操作
- 自动记录到UnifiedLogger
- 实时反馈审查结果

## 代码统计
```
8 files changed, 2067 insertions(+), 305 deletions(-)
create mode 100644 src/core/ai-workflow/AIWorkflowMonitor.js
create mode 100644 src/core/ai-workflow/ArchitectureAlignmentChecker.js
create mode 100644 src/core/ai-workflow/ModuleComplianceChecker.js
```
```

---

### 示例2: Bug修复

```
fix: 修复日志导出只导出部分数据的问题

## 主要变更
- 修改 UnifiedLogger.js 的 export() 方法
- 从IndexedDB加载所有历史日志

## 详细说明
### 1. 问题描述
- 之前只导出内存缓冲区的日志
- 刷新页面后历史日志丢失

### 2. 修复方案
- export()方法改为async
- 从IndexedDB加载最多10000条历史
- 添加降级处理，失败时使用内存缓冲区

### 3. 影响范围
- 日志导出功能
- 所有使用导出功能的页面

## 测试情况
- [x] 单元测试通过
- [x] 功能测试通过
- [x] 无破坏性变更
```

---

### 示例3: 文档更新

```
docs: 创建AI开发工作流监控系统使用手册

## 主要变更
- 新增使用手册
- 新增工作原理文档

## 详细说明
### 1. 文档内容
- 系统概述和架构
- 双机制工作流说明
- 审查规则详解
- API参考
- 使用场景和最佳实践

### 2. 目标读者
- AI开发人员
- 系统维护人员
- 架构审查人员

## 文件列表
- docs/AI开发工作流监控系统使用手册.md
- docs/AI开发工作流监控系统-工作原理.md
```

---

## 🎯 最佳实践

### 1. 提交频率

- ✅ **小步提交**: 每完成一个小功能就提交
- ✅ **功能完整**: 确保提交的代码是可运行的
- ❌ **避免大批量**: 不要积累太多变更一次提交

### 2. 提交信息

- ✅ **清晰简洁**: 第一行不超过50字符
- ✅ **详细说明**: 在正文中详细描述变更
- ✅ **列出影响**: 说明影响的模块和功能
- ❌ **避免模糊**: 不要写"修改代码"、"更新文件"

### 3. 代码审查

- ✅ **提交前检查**: 使用`git diff`查看变更
- ✅ **测试通过**: 确保测试通过再提交
- ✅ **遵循规范**: 使用提交模板或智能脚本

---

## 🔧 配置步骤

### 1. 启用提交模板

```bash
cd D:\AI-Projects\project_manager(neo4j+d3.jsECHART)
git config commit.template .gitmessage
```

### 2. 配置快捷命令

```bash
# 智能提交
git config alias.smart '!pwsh smart-commit.ps1 -Auto'

# 交互提交
git config alias.commit-i '!pwsh smart-commit.ps1'

# 快速保存
git config alias.save '!git add -A && git commit -m "Quick save" && git push'
```

### 3. 测试

```bash
# 测试智能提交
git smart

# 测试交互提交
git commit-i

# 测试快速保存
git save
```

---

## 📈 工作流程

### 日常开发流程

```
1. 编写代码
   ↓
2. 测试功能
   ↓
3. 执行智能提交
   git smart
   ↓
4. 确认提交信息
   ↓
5. 提交并推送
   ↓
6. 继续开发
```

### 重要功能流程

```
1. 编写代码
   ↓
2. 完整测试
   ↓
3. 执行交互提交
   git commit-i
   ↓
4. 选择提交类型
   ↓
5. 填写详细描述
   ↓
6. 预览提交信息
   ↓
7. 确认并提交
   ↓
8. 推送到远程
```

---

## 🐛 故障排查

### 问题1: 脚本无法执行

**症状**: `.\smart-commit.ps1 : 无法加载文件`

**解决**:
```powershell
# 设置执行策略
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 问题2: 提交模板不生效

**症状**: `git commit`没有显示模板

**解决**:
```bash
# 检查配置
git config commit.template

# 重新配置
git config commit.template .gitmessage
```

### 问题3: 中文乱码

**症状**: 提交信息中文显示乱码

**解决**:
```bash
# 配置Git编码
git config --global core.quotepath false
git config --global gui.encoding utf-8
git config --global i18n.commit.encoding utf-8
git config --global i18n.logoutputencoding utf-8
```

---

## 📝 总结

通过使用提交模板和智能脚本，可以：

1. ✅ **规范化**: 统一提交信息格式
2. ✅ **自动化**: 减少手动输入
3. ✅ **详细化**: 自动生成详细说明
4. ✅ **可追溯**: 清晰的提交历史

**推荐使用**: `git smart` 进行日常提交

---

**程序员**
