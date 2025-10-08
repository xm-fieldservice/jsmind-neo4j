# AI开发工作流监控系统使用手册

**作者**: 程序员  
**日期**: 2025-10-08  
**版本**: 1.0

---

## 📋 系统概述

AI开发工作流监控系统是一个**架构级**的代码审核机制，用于监控AI的代码活动，确保：
1. ✅ 架构对齐 - 遵循架构清单
2. ✅ 模块化规范 - 符合编码规范
3. ✅ 功能去重 - 避免重复造轮子

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────┐
│  应用层 (页面/工作栏)                 │
├─────────────────────────────────────┤
│  业务层 (脑图/关系/详情等)            │
├─────────────────────────────────────┤
│  架构监控层 ⭐ (AI工作流监控)         │
│  ├─ AIWorkflowMonitor              │
│  ├─ ArchitectureAlignmentChecker   │
│  └─ ModuleComplianceChecker        │
├─────────────────────────────────────┤
│  核心服务层 (日志/存储/事件)          │
├─────────────────────────────────────┤
│  基础设施层 (IndexedDB/LocalStorage) │
└─────────────────────────────────────┘
```

---

## 🔄 双机制工作流

### 机制1：自动拦截（默认启用）

**触发方式**: 工具层自动拦截  
**AI操作**: 无需操作  
**适用场景**: 日常开发

```javascript
// AI正常写代码，自动触发审查
await write_to_file({
    TargetFile: 'Helper.js',
    CodeContent: '...'
});
// ↑ 自动审查，不通过会抛出错误
```

**工作流程**:
```
AI调用工具 (write_to_file/Edit)
    ↓
自动拦截
    ↓
执行审查 (架构+模块+冗余)
    ↓
    ├─ 通过 → 执行原始操作
    └─ 不通过 → 抛出错误，AI收到反馈
```

### 机制2：手动调用（AI主动）

**触发方式**: AI主动调用API  
**AI操作**: `window.aiReview()`  
**适用场景**: 提前检查、详细报告

```javascript
// AI主动审查
const review = await window.aiReview({
    action: 'create_file',
    target: 'src/utils/Helper.js',
    code: '你的代码内容',
    purpose: '数据处理辅助函数'
});

if (!review.approved) {
    console.log('审查未通过:', review.violations);
    console.log('建议:', review.suggestions);
    // 根据建议修改代码
}
```

---

## 🎯 审查规则

### 1. 架构对齐检查

**检查项**:
- ✅ 是否查询了架构清单
- ✅ 是否使用了现有模块
- ✅ 功能重复度

**规则**:
- 功能重复度 > 80% → ❌ 阻止创建
- 功能重复度 > 30% → ⚠️ 发出警告
- 核心架构文件修改 → ⚠️ 特别警告

**示例**:
```javascript
// 创建新文件时自动检查
// 如果已存在DataHelper.js，创建Helper.js会被阻止
{
    passed: false,
    message: "功能高度重复 (85%)",
    suggestion: "建议复用现有模块: DataHelper.js"
}
```

### 2. 模块化规范检查

**检查项**:
- ✅ 代码行数限制 (≤1000行)
- ✅ 函数长度限制 (≤100行)
- ✅ 命名规范
- ✅ 代码结构

**规则**:
- JavaScript文件 ≤ 1000行
- 类名使用 PascalCase
- 函数名使用 camelCase
- 嵌套深度 ≤ 4层

**示例**:
```javascript
// 代码行数过多
{
    passed: false,
    message: "代码行数过多: 1200行 (限制1000行)",
    suggestion: "建议拆分为多个模块"
}
```

### 3. 功能冗余检测

**检查方式**:
- 文件名相似度匹配
- 功能描述相似度匹配
- 架构清单对比

**示例**:
```javascript
// 检查冗余
const redundancy = await window.aiReview.checkRedundancy({
    purpose: '数据验证'
});

console.log('重复度:', redundancy.score);
console.log('已存在模块:', redundancy.existingModules);
```

---

## 📚 API参考

### 手动审查API

#### `window.aiReview(params)`

执行手动审查

**参数**:
```javascript
{
    action: 'create_file' | 'modify_file',
    target: 'src/utils/Helper.js',
    code: '代码内容',
    purpose: '功能描述'
}
```

**返回**:
```javascript
{
    approved: true/false,
    score: 0-100,
    violations: ['违规项1', '违规项2'],
    suggestions: ['建议1', '建议2'],
    details: {
        architectureCheck: {...},
        moduleCheck: {...},
        redundancyCheck: {...}
    }
}
```

#### `window.aiReview.getArchitecture()`

获取架构清单

**返回**:
```javascript
{
    modules: [
        {
            name: '模块名',
            section: '所属章节',
            purpose: '功能描述'
        }
    ]
}
```

#### `window.aiReview.checkRedundancy(params)`

检查功能冗余

**参数**:
```javascript
{
    purpose: '功能描述'
}
```

**返回**:
```javascript
{
    score: 0-1,  // 冗余度
    existingModules: ['模块1', '模块2']
}
```

#### `window.aiReview.getStats()`

获取审查统计

**返回**:
```javascript
{
    totalReviews: 100,
    passed: 85,
    failed: 15,
    violations: [...]
}
```

---

## 🔔 告警机制

### 三级告警

| 级别 | 触发条件 | 行为 |
|-----|---------|------|
| 🟢 **通过** | 所有检查通过 | 正常记录日志 |
| 🟡 **警告** | 重复度30-80% | 黄色日志 + 控制台警告 |
| 🔴 **阻止** | 重复度>80%或严重违规 | 红色日志 + 弹窗 + 阻止操作 |

### 告警示例

```javascript
// 🔴 严重违规
alert(`🚨 严重违规！
功能重复度80%！
已存在类似模块：DataHelper.js

建议：
1. 复用现有模块
2. 扩展现有功能而非重写`);

// 🟡 警告
console.warn(`⚠️ 代码规范警告:
1. 代码行数过多: 1200行
2. 函数 "processData" 过长: 150行

建议：
1. 拆分为多个模块
2. 提取子函数`);
```

---

## 🚀 使用场景

### 场景1：AI正常开发

```
用户: "创建一个数据处理工具"
AI: 调用 write_to_file()
    ↓
自动拦截 → 审查
    ↓
✅ 通过 → 文件创建成功
```

### 场景2：AI谨慎开发

```
用户: "创建一个复杂的数据管理器"
AI: 先调用 window.aiReview() 检查
    ↓
发现已存在类似模块
    ↓
AI: 决定复用现有模块
    ↓
调用 Edit() 扩展现有模块
    ↓
自动拦截 → 审查 → ✅ 通过
```

### 场景3：用户要求自查

```
用户: "请先检查架构清单，确保不重复"
AI: 调用 window.aiReview.getArchitecture()
    ↓
查看现有模块列表
    ↓
AI: 发现可以复用 DataHelper.js
    ↓
AI: 扩展现有模块而非新建
```

---

## 📊 日志记录

所有审查活动都会记录到UnifiedLogger：

```javascript
// 审查开始
UnifiedLogger.info('AI_WORKFLOW', '手动审查开始', params);

// 审查完成
UnifiedLogger.info('AI_WORKFLOW', '手动审查完成', result);

// 审查失败
UnifiedLogger.error('AI_WORKFLOW', '❌ 代码审查失败', review);

// 审查通过
UnifiedLogger.info('AI_WORKFLOW', '✅ 代码审查通过', {
    file: params.TargetFile
});
```

可以通过日志面板查看所有审查记录。

---

## 🛠️ 配置

### 修改审查规则

编辑 `ModuleComplianceChecker.js`:

```javascript
this.rules = {
    maxLines: 1000,           // 最大行数
    maxFunctionLines: 100,    // 单个函数最大行数
    maxComplexity: 10,        // 最大圈复杂度
    minDocumentation: 0.3     // 最小文档覆盖率
};
```

### 启用/禁用自动拦截

编辑 `AIWorkflowMonitor.js`:

```javascript
constructor() {
    this.autoMode = true;   // 改为false禁用自动拦截
    this.manualMode = true; // 改为false禁用手动API
}
```

---

## 🐛 故障排查

### 问题1：审查系统未启动

**症状**: 控制台没有看到 `[AIWorkflowMonitor] 初始化完成`

**解决**:
1. 检查脚本是否正确加载
2. 查看控制台错误信息
3. 确认页面已完全加载

### 问题2：审查总是通过

**症状**: 明显违规的代码也能通过审查

**解决**:
1. 检查架构清单文件是否存在
2. 查看 `ArchitectureAlignmentChecker` 是否正确加载
3. 检查审查规则配置

### 问题3：审查过于严格

**症状**: 正常代码被频繁阻止

**解决**:
1. 调整冗余度阈值（默认80%）
2. 修改代码行数限制
3. 更新架构清单，添加新模块

---

## 📈 统计信息

查看审查统计:

```javascript
const stats = window.aiReview.getStats();
console.log('总审查次数:', stats.totalReviews);
console.log('通过次数:', stats.passed);
console.log('失败次数:', stats.failed);
console.log('违规记录:', stats.violations);
```

---

## 🎓 最佳实践

### 1. AI开发前

- ✅ 先调用 `getArchitecture()` 查看现有模块
- ✅ 使用 `checkRedundancy()` 检查功能重复
- ✅ 优先考虑复用和扩展

### 2. AI开发中

- ✅ 保持代码简洁，单文件≤1000行
- ✅ 遵循命名规范
- ✅ 添加充分的注释

### 3. AI开发后

- ✅ 查看审查日志
- ✅ 根据建议优化代码
- ✅ 更新架构清单

---

## 📝 更新日志

### v1.0 (2025-10-08)

- ✅ 初始版本发布
- ✅ 自动拦截机制
- ✅ 手动审查API
- ✅ 架构对齐检查
- ✅ 模块化规范检查
- ✅ 功能冗余检测

---

## 🤝 贡献

如需修改审查规则或添加新功能，请：

1. 修改对应的检查器文件
2. 更新本文档
3. 提交Git并注明修改原因

---

**程序员**
