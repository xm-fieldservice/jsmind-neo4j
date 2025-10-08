# Git提交审核系统 - 设计方案

**作者**: 程序员  
**日期**: 2025-10-08  
**版本**: 1.0

---

## 📋 背景分析

### 现有系统：实时审核

**AIWorkflowMonitor** - 基于日志的实时代码审核
- ✅ 触发时机：代码执行时
- ✅ 覆盖范围：运行时活动
- ✅ 审查内容：工具调用、架构对齐、模块规范
- ❌ 局限性：无法追溯历史、会话级数据

### 补充方案：历史审核

**GitCommitReviewer** - 基于Git提交的历史审核
- ✅ 触发时机：代码提交时
- ✅ 覆盖范围：代码变更历史
- ✅ 审查内容：提交质量、代码diff、团队协作
- ✅ 优势：永久保存、可追溯、团队级监控

---

## 🎯 设计目标

### 1. 双轨制审核架构

```
┌─────────────────────────────────────┐
│  实时审核层（现有）                   │
│  - 基于日志                          │
│  - 代码执行时触发                     │
│  - 拦截AI工具调用                     │
│  - 即时反馈                          │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  历史审核层（新增）⭐                 │
│  - 基于Git提交                       │
│  - 代码提交时触发                     │
│  - 分析提交历史                       │
│  - 长期追溯                          │
└─────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  综合分析层                          │
│  - 关联实时和历史数据                 │
│  - 生成质量报告                       │
│  - 团队级监控                        │
└─────────────────────────────────────┘
```

### 2. 核心功能

#### 功能1: 提交信息质量审核
- 检查提交类型（feat/fix/docs等）
- 检查描述长度和格式
- 检查是否包含详细说明
- 评分并给出改进建议

#### 功能2: 代码变更审核
- 检查修改文件数量
- 检查代码行数变更
- 检查架构对齐
- 检查功能冗余

#### 功能3: 提交频率审核
- 分析提交频率
- 检测大批量提交
- 检测碎片化提交
- 给出优化建议

#### 功能4: 团队协作监控
- 团队成员提交质量排名
- 架构违规统计
- 代码变更热力图
- 质量趋势分析

---

## 🔧 技术架构

### 1. 模块结构

```
src/core/git-workflow/
├── GitCommitReviewer.js          # 核心审核器
├── GitCommitAnalyzer.js          # 提交分析器
├── GitDiffAnalyzer.js            # Diff分析器
├── CommitQualityScorer.js        # 质量评分器
├── TeamCollaborationMonitor.js   # 团队监控器
└── hooks/
    ├── pre-commit.js             # 提交前Hook
    ├── post-commit.js            # 提交后Hook
    └── commit-msg.js             # 提交信息Hook
```

### 2. 触发机制

#### 触发点1: pre-commit Hook
```bash
# .git/hooks/pre-commit
#!/bin/sh
node src/core/git-workflow/hooks/pre-commit.js

if [ $? -ne 0 ]; then
    echo "❌ 提交审核失败"
    exit 1
fi
```

**触发时机**: `git commit`执行前  
**作用**: 阻止不合规的提交

#### 触发点2: commit-msg Hook
```bash
# .git/hooks/commit-msg
#!/bin/sh
node src/core/git-workflow/hooks/commit-msg.js "$1"

if [ $? -ne 0 ]; then
    echo "❌ 提交信息不合规"
    exit 1
fi
```

**触发时机**: 提交信息编辑后  
**作用**: 验证提交信息格式

#### 触发点3: post-commit Hook
```bash
# .git/hooks/post-commit
#!/bin/sh
node src/core/git-workflow/hooks/post-commit.js
```

**触发时机**: 提交成功后  
**作用**: 记录提交质量，生成报告

---

## 📊 审核规则

### 1. 提交信息质量规则

| 检查项 | 规则 | 权重 |
|-------|------|------|
| 提交类型 | 必须包含feat/fix/docs等 | 20% |
| 描述长度 | 10-72字符 | 15% |
| 详细说明 | 包含"## 主要变更" | 30% |
| 文件列表 | 列出变更文件 | 20% |
| 代码统计 | 包含统计信息 | 15% |

**评分公式**:
```javascript
score = (typeScore * 0.2) + 
        (descScore * 0.15) + 
        (detailScore * 0.3) + 
        (fileListScore * 0.2) + 
        (statsScore * 0.15)
```

### 2. 代码变更规则

| 检查项 | 阈值 | 级别 |
|-------|------|------|
| 修改文件数 | >20个 | ⚠️ 警告 |
| 代码行数 | >1000行 | ⚠️ 警告 |
| 新增文件 | 重复模块 | 🔴 阻止 |
| 删除文件 | 核心文件 | ⚠️ 警告 |

### 3. 提交频率规则

| 指标 | 正常范围 | 异常 |
|-----|---------|------|
| 日均提交 | 3-10次 | >20次或<1次 |
| 大提交比例 | <30% | >50% |
| 小提交比例 | <30% | >50% |

---

## 🔍 审核流程

### 流程1: 提交前审核（pre-commit）

```
1. 用户执行 git commit
   ↓
2. Git触发 pre-commit hook
   ↓
3. 获取暂存区变更
   git diff --cached
   ↓
4. 分析变更
   - 统计文件数量
   - 统计代码行数
   - 检查新增文件
   ↓
5. 执行审核
   - 文件数量检查
   - 代码行数检查
   - 架构对齐检查
   ↓
6. 判断结果
   ├─ 通过 → 继续提交
   └─ 失败 → 阻止提交，显示错误
```

### 流程2: 提交信息审核（commit-msg）

```
1. 用户编辑提交信息
   ↓
2. Git触发 commit-msg hook
   ↓
3. 读取提交信息
   cat .git/COMMIT_EDITMSG
   ↓
4. 分析提交信息
   - 检查类型
   - 检查描述
   - 检查格式
   ↓
5. 评分
   计算质量分数
   ↓
6. 判断结果
   ├─ 分数≥60 → 通过
   └─ 分数<60 → 失败，显示建议
```

### 流程3: 提交后记录（post-commit）

```
1. 提交成功
   ↓
2. Git触发 post-commit hook
   ↓
3. 获取提交信息
   git log -1
   ↓
4. 分析提交
   - 提交信息质量
   - 代码变更分析
   - 架构影响评估
   ↓
5. 记录到数据库
   - 提交哈希
   - 质量分数
   - 审核结果
   ↓
6. 生成报告
   - 个人报告
   - 团队报告
   ↓
7. 发送通知
   - 质量低于阈值时警告
   - 连续高质量时表扬
```

---

## 💾 数据存储

### 1. 存储结构

```javascript
// IndexedDB Schema
{
    storeName: 'git_commits',
    schema: {
        hash: 'string',           // 提交哈希
        author: 'string',         // 作者
        timestamp: 'number',      // 时间戳
        message: 'string',        // 提交信息
        messageScore: 'number',   // 信息质量分
        changes: {
            filesAdded: 'number',
            filesModified: 'number',
            filesDeleted: 'number',
            insertions: 'number',
            deletions: 'number'
        },
        review: {
            passed: 'boolean',
            score: 'number',
            violations: 'array',
            suggestions: 'array'
        }
    }
}
```

### 2. 查询接口

```javascript
// 查询最近的提交
const recentCommits = await db.getRecentCommits(30);

// 查询某作者的提交
const authorCommits = await db.getCommitsByAuthor('AI-Agent');

// 查询低质量提交
const lowQualityCommits = await db.getCommitsByScore(0, 60);

// 统计数据
const stats = await db.getCommitStats({
    timeRange: 'last-week',
    groupBy: 'author'
});
```

---

## 📈 报告生成

### 1. 个人报告

```markdown
# Git提交质量报告 - AI-Agent

**时间范围**: 2025-10-01 ~ 2025-10-08

## 总体评分
- 平均分数: 78/100
- 提交总数: 45次
- 高质量提交: 32次 (71%)
- 低质量提交: 13次 (29%)

## 提交类型分布
- feat: 20次 (44%)
- fix: 15次 (33%)
- docs: 8次 (18%)
- chore: 2次 (5%)

## 代码变更统计
- 总文件数: 156个
- 新增: 45个
- 修改: 98个
- 删除: 13个
- 代码行数: +3,245 / -1,567

## 问题分析
1. ⚠️ 大批量提交: 3次
2. ⚠️ 提交信息过短: 8次
3. ⚠️ 缺少详细说明: 5次

## 改进建议
1. 减少单次提交的文件数量
2. 添加更详细的提交说明
3. 遵循提交信息模板
```

### 2. 团队报告

```markdown
# 团队Git提交质量报告

**时间范围**: 2025-10-01 ~ 2025-10-08

## 团队概况
- 团队成员: 3人
- 提交总数: 125次
- 平均分数: 75/100

## 成员排名
1. Developer-1: 85/100 (40次提交)
2. AI-Agent-1: 78/100 (45次提交)
3. AI-Agent-2: 65/100 (40次提交)

## 架构违规统计
- 重复模块创建: 5次
- 大批量提交: 8次
- 核心文件修改: 3次

## 代码变更热力图
```
文件路径                          修改次数
src/core/                         ████████████ 45
src/components/                   ████████ 32
docs/                            ██████ 28
column-sources/mindmap/          ████ 18
```

## 质量趋势
```
100 |                    ●
 90 |              ●   ●   ●
 80 |        ●   ●           ●
 70 |  ●   ●                   ●
 60 |●
    +---------------------------
     周一 周二 周三 周四 周五 周六 周日
```
```

---

## 🔗 与现有系统集成

### 1. 数据关联

```javascript
class UnifiedCodeReviewer {
    // 关联实时审核和历史审核
    async correlateReviews(timeRange) {
        // 获取实时审核日志
        const runtimeLogs = await AIWorkflowMonitor.getLogs(timeRange);
        
        // 获取Git提交记录
        const gitCommits = await GitCommitReviewer.getCommits(timeRange);
        
        // 关联分析
        const correlation = this.analyzeCorrelation(runtimeLogs, gitCommits);
        
        return {
            runtime: {
                totalReviews: runtimeLogs.length,
                passed: runtimeLogs.filter(l => l.passed).length,
                failed: runtimeLogs.filter(l => !l.passed).length
            },
            git: {
                totalCommits: gitCommits.length,
                avgScore: gitCommits.reduce((sum, c) => sum + c.score, 0) / gitCommits.length,
                violations: gitCommits.filter(c => !c.passed).length
            },
            correlation: {
                // 实时审核失败后的提交质量
                postFailureCommits: correlation.postFailureCommits,
                // 提交质量与运行时质量的相关性
                qualityCorrelation: correlation.qualityCorrelation
            }
        };
    }
}
```

### 2. 统一日志

```javascript
// 实时审核和历史审核都记录到UnifiedLogger
UnifiedLogger.info('CODE_REVIEW', '实时审核完成', {
    type: 'runtime',
    result: runtimeReview
});

UnifiedLogger.info('CODE_REVIEW', 'Git提交审核完成', {
    type: 'git',
    result: gitReview
});
```

---

## 🎯 实施计划

### Phase 1: 核心模块开发（1天）
- [x] GitCommitReviewer核心类
- [x] GitCommitAnalyzer分析器
- [x] CommitQualityScorer评分器
- [ ] 单元测试

### Phase 2: Hook集成（0.5天）
- [ ] pre-commit hook
- [ ] commit-msg hook
- [ ] post-commit hook
- [ ] Hook安装脚本

### Phase 3: 数据存储（0.5天）
- [ ] IndexedDB schema
- [ ] 数据访问接口
- [ ] 数据迁移工具

### Phase 4: 报告生成（1天）
- [ ] 个人报告生成器
- [ ] 团队报告生成器
- [ ] 可视化图表
- [ ] 导出功能

### Phase 5: 集成测试（0.5天）
- [ ] 与AIWorkflowMonitor集成
- [ ] 端到端测试
- [ ] 性能测试

### Phase 6: 文档和部署（0.5天）
- [ ] 使用文档
- [ ] API文档
- [ ] 部署脚本

**总计**: 4天

---

## 📝 使用示例

### 示例1: 提交被阻止

```bash
$ git commit -m "修改代码"

🔍 执行提交前审核...
❌ 审核失败:
  1. 提交信息过短 (当前: 4字符, 要求: 10-72字符)
  2. 缺少提交类型 (应为: feat/fix/docs等)
  3. 缺少详细说明

建议:
  - 使用提交模板: git commit (不带-m参数)
  - 或使用智能脚本: git smart

提交已取消
```

### 示例2: 提交成功

```bash
$ git smart

📝 智能Git提交
==================================================

📦 添加变更...
✅ 检测到变更:
  - 新增: 3 个文件
  - 修改: 5 个文件
  - 删除: 1 个文件

🤖 自动模式
  - 推断类型: feat
  - 生成描述: 自动提交 2025-10-08 09:23

✍️  生成提交信息...

📄 提交信息预览:
==================================================
feat: 自动提交 2025-10-08 09:23

## 主要变更
- 新增 3 个文件
- 修改 5 个文件
- 删除 1 个文件

## 变更文件
### 新增
- src/core/git-workflow/GitCommitReviewer.js
- src/core/git-workflow/GitCommitAnalyzer.js
- src/core/git-workflow/CommitQualityScorer.js

### 修改
- index.html
- docs/Git提交审核系统-设计方案.md
...
==================================================

❓ 确认提交? (Y/n) y

🔍 执行提交前审核...
✅ 审核通过

💾 提交中...
✅ 提交成功！

📊 提交质量评分: 85/100
  - 提交类型: ✅ 正确
  - 描述长度: ✅ 合适
  - 详细说明: ✅ 完整
  - 文件列表: ✅ 清晰
  - 代码统计: ✅ 包含

❓ 是否推送到远程? (Y/n)
```

---

## 🔒 安全考虑

### 1. Hook绕过防护

```bash
# 用户可能使用 --no-verify 绕过hook
git commit --no-verify -m "bypass"

# 解决方案：在服务器端再次验证
# 使用 pre-receive hook
```

### 2. 数据隐私

```javascript
// 不记录敏感信息
const sanitizedMessage = commit.message
    .replace(/password|token|secret/gi, '***')
    .replace(/\b\d{16}\b/g, '****');  // 信用卡号
```

### 3. 性能优化

```javascript
// 大型提交的性能优化
if (diff.files.length > 100) {
    // 只分析前100个文件
    diff.files = diff.files.slice(0, 100);
    console.warn('⚠️ 文件过多，只分析前100个');
}
```

---

## 📊 成功指标

### 1. 提交质量提升
- 目标：平均分数从60提升到80
- 时间：3个月

### 2. 架构违规减少
- 目标：违规次数减少50%
- 时间：2个月

### 3. 团队协作改善
- 目标：提交信息规范率达到90%
- 时间：1个月

---

**程序员**
