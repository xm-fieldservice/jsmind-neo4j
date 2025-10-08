# Git提交审核系统

**作者**: 程序员  
**日期**: 2025-10-08  
**版本**: 1.0

---

## 📋 概述

Git提交审核系统是对AI开发工作流监控系统的补充，通过Git Hooks实现提交时的代码审核，确保提交质量和架构对齐。

### 双轨制审核架构

```
实时审核（AIWorkflowMonitor）
  - 基于日志
  - 代码执行时触发
  - 拦截AI工具调用

历史审核（GitCommitReviewer）⭐
  - 基于Git提交
  - 代码提交时触发
  - 分析提交历史
```

---

## 🚀 快速开始

### 1. 安装Hooks

```bash
cd D:\AI-Projects\project_manager(neo4j+d3.jsECHART)
node src/core/git-workflow/install-hooks.js
```

### 2. 测试

```bash
# 修改一些文件
git add .
git commit -m "测试提交"

# 会看到审核过程和结果
```

### 3. 卸载（如需）

```bash
node src/core/git-workflow/install-hooks.js --uninstall
```

---

## 📊 功能特性

### 1. 提交前审核（pre-commit）

**触发时机**: `git commit`执行前

**审核内容**:
- ✅ 文件数量（≤20个）
- ✅ 代码行数（≤1000行）
- ✅ 新增文件重复检查

**结果**:
- 通过 → 继续提交
- 失败 → 阻止提交，显示建议

### 2. 提交后评分（post-commit）

**触发时机**: 提交成功后

**评分内容**:
- 提交类型（20分）
- 描述长度（15分）
- 详细说明（40分）
- 格式规范（25分）

**输出**:
- 质量评分（0-100）
- 详细检查结果
- 改进建议

### 3. 审核记录

**保存位置**: `.git/commit-reviews/`

**记录内容**:
- 提交哈希
- 作者信息
- 质量分数
- 审核详情
- 代码统计

---

## 🎯 使用示例

### 示例1: 审核通过

```bash
$ git commit -m "feat: 添加用户管理功能

## 主要变更
- 新增用户列表页面
- 新增用户详情页面

## 详细说明
### 1. 功能实现
- 使用React实现用户界面
- 集成后端API

### 2. 技术细节
- 使用Hooks管理状态
- 添加单元测试
"

🔍 执行提交前审核...
  ✅ 文件数量: 5个
  ✅ 代码行数: +245 -12 (总计: 257行)
  ✅ 新增文件: 2个

✅ 审核通过

[main 1a2b3c4] feat: 添加用户管理功能
 5 files changed, 245 insertions(+), 12 deletions(-)

📊 提交质量评分
══════════════════════════════════════════════════

总分: 95/100

检查项:
  - 提交类型: ✅ 正确
  - 描述长度: ✅ 合适
  - 详细说明: ✅ 完整
  - 格式规范: ✅ 正确

代码统计:
  - 修改文件: 5个
  - 新增代码: +245行
  - 删除代码: -12行
  - 总变更量: 257行

🎉 提交质量优秀！

══════════════════════════════════════════════════
```

### 示例2: 审核失败

```bash
$ git commit -m "修改代码"

🔍 执行提交前审核...
  ✅ 文件数量: 3个
  ✅ 代码行数: +50 -10 (总计: 60行)
  ✅ 无新增文件

✅ 审核通过

[main 2b3c4d5] 修改代码
 3 files changed, 50 insertions(+), 10 deletions(-)

📊 提交质量评分
══════════════════════════════════════════════════

总分: 35/100

检查项:
  - 提交类型: ❌ 缺少
  - 描述长度: ❌ 不合适
  - 详细说明: ❌ 缺少
  - 格式规范: ❌ 不规范

代码统计:
  - 修改文件: 3个
  - 新增代码: +50行
  - 删除代码: -10行
  - 总变更量: 60行

⚠️  提交质量较低，建议改进:
  - 添加提交类型 (feat/fix/docs等)
  - 优化描述长度 (10-72字符)
  - 添加详细说明
  - 使用Markdown格式

  💡 建议使用智能提交脚本: git smart

══════════════════════════════════════════════════
```

### 示例3: 大批量提交被阻止

```bash
$ git commit -m "feat: 重构整个系统"

🔍 执行提交前审核...
  ❌ 文件数量过多: 35个 (限制: 20个)
  ❌ 代码变更过大: +2500 -800 (总计: 3300行, 限制: 1000行)
  ✅ 新增文件: 8个

❌ 审核失败

建议:
  - 修改文件过多，建议拆分为多个提交
  - 代码变更过大，建议拆分功能

提示:
  - 使用 git commit --no-verify 可以跳过审核（不推荐）
  - 建议拆分为多个小提交
  - 或使用智能提交脚本: git smart
```

---

## 🔧 配置

### 修改审核规则

编辑 `src/core/git-workflow/hooks/pre-commit.js`:

```javascript
const config = {
    maxFiles: 20,      // 最大文件数
    maxLines: 1000,    // 最大代码行数
    checkNewFiles: true, // 是否检查新增文件
    verbose: true      // 是否显示详细信息
};
```

### 跳过审核

```bash
# 临时跳过（不推荐）
git commit --no-verify -m "紧急修复"

# 或使用环境变量
SKIP_HOOKS=1 git commit -m "跳过审核"
```

---

## 📈 查看审核记录

### 查看最近的审核记录

```bash
# 查看最近10次提交的审核记录
ls -lt .git/commit-reviews/ | head -10

# 查看某次提交的详细记录
cat .git/commit-reviews/1a2b3c4.json
```

### 统计提交质量

```bash
# 计算平均分数（需要jq工具）
jq -s 'map(.score) | add/length' .git/commit-reviews/*.json

# 查找低质量提交
jq -r 'select(.score < 60) | .hash' .git/commit-reviews/*.json
```

---

## 🔗 与现有系统集成

### 与AIWorkflowMonitor协同

```javascript
// 实时审核 + 历史审核
const runtimeReview = await AIWorkflowMonitor.review(params);
const gitReview = await GitCommitReviewer.review(commitHash);

// 综合分析
const correlation = analyzeCorrelation(runtimeReview, gitReview);
```

### 记录到UnifiedLogger

```javascript
// Git审核结果也记录到日志系统
UnifiedLogger.info('CODE_REVIEW', 'Git提交审核完成', {
    type: 'git',
    hash: commit.hash,
    score: review.score,
    passed: review.passed
});
```

---

## 🐛 故障排查

### 问题1: Hook不执行

**症状**: 提交时没有看到审核信息

**解决**:
```bash
# 检查hook是否安装
ls -la .git/hooks/pre-commit
ls -la .git/hooks/post-commit

# 检查是否有执行权限
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/post-commit

# 重新安装
node src/core/git-workflow/install-hooks.js
```

### 问题2: Node.js路径错误

**症状**: `/usr/bin/env: 'node': No such file or directory`

**解决**:
```bash
# 检查node路径
which node

# 修改hook文件，使用绝对路径
# 编辑 .git/hooks/pre-commit
#!/bin/sh
/usr/local/bin/node "path/to/pre-commit.js"
```

### 问题3: 审核记录不保存

**症状**: `.git/commit-reviews/` 目录为空

**解决**:
```bash
# 手动创建目录
mkdir -p .git/commit-reviews

# 检查权限
chmod 755 .git/commit-reviews
```

---

## 📝 最佳实践

### 1. 使用智能提交脚本

```bash
# 推荐使用
git smart

# 而不是
git commit -m "简短描述"
```

### 2. 小步提交

- ✅ 每完成一个小功能就提交
- ✅ 每个提交只做一件事
- ❌ 避免大批量提交

### 3. 遵循提交规范

- ✅ 使用提交类型
- ✅ 添加详细说明
- ✅ 列出变更文件
- ✅ 使用Markdown格式

---

## 📊 成功指标

### 目标

- 平均提交质量分数 > 80
- 架构违规次数 < 5次/月
- 提交信息规范率 > 90%

### 监控

```bash
# 每周查看提交质量报告
node src/core/git-workflow/generate-report.js --weekly

# 查看团队排名
node src/core/git-workflow/generate-report.js --team
```

---

## 🔄 更新日志

### v1.0 (2025-10-08)

- ✅ 实现pre-commit hook
- ✅ 实现post-commit hook
- ✅ 提交信息质量评分
- ✅ 代码变更审核
- ✅ 审核记录保存
- ✅ 安装/卸载脚本

---

**程序员**
