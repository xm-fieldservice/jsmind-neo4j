# script.js批量localStorage替换执行计划

## 📊 **当前状态**
- **总localStorage调用**: 21处
- **已完成替换**: 2处 (第5行、第9行)
- **待替换**: 19处
- **验收状态**: 阶段性验收通过 ✅

## 🚀 **批量替换策略**

### **执行方式**: 一次性完成剩余19处替换
### **验证方式**: 完成后统一验证
### **质量保证**: 基于已验证的替换模式

## 🎯 **替换目标分组**

### **第一组: 系统标签管理 (6处)**
- 第134行: `localStorage.getItem('mm:proj:SYS_TAGS:data')`
- 第155行: `localStorage.getItem(key)`
- 第161行: `localStorage.getItem('mm:proj:SYS_TAGS:backup')`
- 第164行: `localStorage.setItem(key, JSON.stringify(bak))`
- 第172行: `localStorage.setItem(key, JSON.stringify(tpl))`
- 第173行: `localStorage.setItem('mm:proj:SYS_TAGS:backup', JSON.stringify(tpl))`

### **第二组: 项目目录管理 (3处)**
- 第219行: `localStorage.getItem(SEL_KEY)`
- 第1505行: `localStorage.getItem(CKEY)` (重复函数)
- 第1509行: `localStorage.setItem(CKEY, JSON.stringify(list))` (重复函数)
- 第1650行: `localStorage.setItem('mm_project_catalog_selected_idx', String(idx))`

### **第三组: 脑图数据存储 (6处)**
- 第305行: `localStorage.getItem(legacyKey)`
- 第306行: `localStorage.setItem(namespacedKey, raw)`
- 第1066行: `localStorage.getItem(LS_KEY_FULL)`
- 第1066行: `localStorage.setItem(LS_KEY_FULL, JSON.stringify(snap))`
- 第1672行: `localStorage.getItem(\`mm:proj:\${it.pid}:data\`)`
- 其他相关调用...

### **第四组: 快照和缓存系统 (4处)**
- 第1137行: `localStorage.getItem('__mind_full_cache_v1')`
- 第1204行: `localStorage.setItem(LS_KEY_FULL, JSON.stringify(snap0))`
- 第1247行: `localStorage.getItem(LS_KEY_FULL)`
- 第1435行: `localStorage.getItem('JM_BOOT_MODE')`

## 🔧 **统一替换模式**

```javascript
// 模式1: 简单读取
localStorage.getItem(key) 
→ await window.AutogenUnifiedStorage.retrieve('legacy', key)

// 模式2: JSON数据读取
JSON.parse(localStorage.getItem(key) || '{}')
→ await window.AutogenUnifiedStorage.retrieve('legacy', key) || {}

// 模式3: 简单存储
localStorage.setItem(key, value)
→ await window.AutogenUnifiedStorage.store('legacy', key, JSON.parse(value))

// 模式4: JSON数据存储
localStorage.setItem(key, JSON.stringify(data))
→ await window.AutogenUnifiedStorage.store('legacy', key, data)

// 模式5: 删除操作
localStorage.removeItem(key)
→ await window.AutogenUnifiedStorage.remove('legacy', key)
```

## 📋 **执行检查清单**

### **替换前**
- [x] 确认当前21处localStorage调用位置
- [x] 验证AutogenUnifiedStorage接口可用
- [x] 确认替换模式正确性

### **批量替换中**
- [ ] 按分组逐个替换localStorage调用
- [ ] 确保async/await语法正确
- [ ] 保持原有逻辑不变
- [ ] 使用合适的存储类型分类

### **替换后验证**
- [ ] PowerShell扫描确认localStorage调用数量
- [ ] 功能测试确认核心功能正常
- [ ] 性能测试确认无显著下降
- [ ] 错误日志检查确认无新增错误

## 🎯 **预期结果**

- **替换前**: 21处localStorage调用
- **替换后**: 0处localStorage调用
- **功能状态**: 完全保持一致
- **性能影响**: 预期无显著影响或略有提升

## ⏱️ **执行时间估算**

- **批量替换**: 15-20分钟
- **功能验证**: 5-10分钟
- **性能测试**: 5分钟
- **总计**: 约30分钟完成

**准备就绪，等待执行批准！**
