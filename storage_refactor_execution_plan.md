# 存储系统重构详细执行计划

## 🚨 **阶段1：紧急止血 (立即执行)**

### 1.1 存储调用审计系统 (30分钟)
```javascript
// 创建 storage_audit.js
window.STORAGE_AUDIT = {
  calls: [],
  localStorage_calls: 0,
  autogen_calls: 0,
  
  trackLocalStorage: function(operation, key, source) {
    this.localStorage_calls++;
    this.calls.push({
      type: 'localStorage',
      operation,
      key,
      source: source || new Error().stack.split('\n')[2],
      timestamp: Date.now()
    });
    console.warn(`[AUDIT] localStorage.${operation}(${key}) from:`, source);
  },
  
  trackAutogen: function(operation, type, key, source) {
    this.autogen_calls++;
    this.calls.push({
      type: 'AutogenUnifiedStorage',
      operation,
      storageType: type,
      key,
      source: source || new Error().stack.split('\n')[2],
      timestamp: Date.now()
    });
  },
  
  getReport: function() {
    return {
      total_calls: this.calls.length,
      localStorage_calls: this.localStorage_calls,
      autogen_calls: this.autogen_calls,
      ratio: this.autogen_calls / (this.localStorage_calls + this.autogen_calls),
      recent_calls: this.calls.slice(-20)
    };
  }
};
```

### 1.2 冗余文件标记 (1小时)
**立即标记以下14个文件为DEPRECATED：**

```bash
# 高优先级删除 (功能完全重复)
src/core/storage/FormalStorageManager.js
src/core/storage/SimpleStorageManager.js  
src/core/storage/StorageManager.js
src/core/storage/HybridStorageAdapter.js
src/core/storage/UnifiedStorageAdapter.js

# 中优先级删除 (功能部分重复)
src/persistence/adapters/LocalStorageAdapter.js
src/persistence/adapters/SnapshotAdapter.js
src/services/StorageService.js
src/data/MindmapStorage.js
src/core/storage/StorageRegistry.js

# 低优先级删除 (迁移完成后删除)
src/migration/StorageMigrationTool.js
src/core/storage/StorageMigrator.js
src/services/StorageMonitor.js
src/core/storage/IStorage.js
```

### 1.3 建立删除安全检查 (30分钟)
```javascript
// 创建 file_dependency_check.js
function checkFileDependencies(filename) {
  const dependencies = [];
  // 扫描所有.js和.html文件中对该文件的引用
  // 返回依赖列表，确保安全删除
}
```

## 🔧 **阶段2：系统性清理 (3-5天)**

### 2.1 第一天：合并存储管理器
**目标：将3个StorageManager合并到AutogenUnifiedStorage**

#### 任务2.1.1：分析现有管理器功能
```javascript
// 分析 FormalStorageManager.js 的独有功能
// 分析 SimpleStorageManager.js 的独有功能  
// 分析 StorageManager.js 的独有功能
// 识别可以合并到AutogenUnifiedStorage的功能
```

#### 任务2.1.2：功能迁移
```javascript
// 将独有功能添加到 AutogenUnifiedStorage.js
class AutogenUnifiedStorage {
  // 原有功能...
  
  // 从FormalStorageManager迁移的功能
  async batchStore(operations) { /* ... */ }
  
  // 从SimpleStorageManager迁移的功能  
  getStorageInfo() { /* ... */ }
  
  // 从StorageManager迁移的功能
  async backup() { /* ... */ }
}
```

#### 任务2.1.3：更新调用
```javascript
// 查找所有对旧管理器的调用并更新
// 旧代码：new FormalStorageManager()
// 新代码：window.AutogenUnifiedStorage
```

### 2.2 第二天：合并适配器层
**目标：统一到单一LocalStorageAdapter**

#### 任务2.2.1：适配器功能分析
- 保留：`src/core/storage/adapters/LocalStorageAdapter.js`
- 删除：`src/persistence/adapters/LocalStorageAdapter.js` (重复)
- 合并：`HybridStorageAdapter.js` 和 `UnifiedStorageAdapter.js` 的功能

#### 任务2.2.2：接口统一
```javascript
// 统一适配器接口
class LocalStorageAdapter {
  async get(key) { /* ... */ }
  async set(key, value) { /* ... */ }
  async remove(key) { /* ... */ }
  async clear() { /* ... */ }
  async keys() { /* ... */ }
  getInfo() { /* ... */ }
}
```

### 2.3 第三天：清理服务层
**目标：合并StorageService到AutogenUnifiedStorage**

#### 任务2.3.1：服务层功能迁移
```javascript
// 将StorageService的业务逻辑迁移到AutogenUnifiedStorage
// 保持接口兼容性，避免破坏现有调用
```

#### 任务2.3.2：更新所有服务层调用
```javascript
// 更新15个文件中的StorageService调用
// 旧代码：StorageService.store()
// 新代码：AutogenUnifiedStorage.store()
```

### 2.4 第四天：localStorage调用统一
**目标：消除所有直接localStorage调用**

#### 任务2.4.1：批量替换localStorage调用
```javascript
// 在20个文件中替换200+处localStorage调用
// 使用正则表达式批量替换：
// localStorage.getItem\(([^)]+)\) → await AutogenUnifiedStorage.retrieve('legacy', $1)
// localStorage.setItem\(([^,]+),\s*([^)]+)\) → await AutogenUnifiedStorage.store('legacy', $1, $2)
```

#### 任务2.4.2：类型化存储迁移
```javascript
// 将通用localStorage调用迁移到类型化存储
const STORAGE_TYPE_MAPPING = {
  'mm:': 'mindmap',
  'config_': 'config',
  'ui_': 'ui_state',
  'snapshot_': 'snapshot',
  'registry_': 'registry'
};
```

### 2.5 第五天：文件清理和测试
**目标：删除冗余文件，确保系统正常**

#### 任务2.5.1：安全删除冗余文件
```bash
# 按优先级顺序删除文件
rm src/core/storage/FormalStorageManager.js
rm src/core/storage/SimpleStorageManager.js
# ... 逐个删除并测试
```

#### 任务2.5.2：更新引用
```html
<!-- 从index.html中移除已删除文件的引用 -->
<!-- <script src="src/core/storage/FormalStorageManager.js"></script> -->
```

#### 任务2.5.3：功能测试
```javascript
// 运行完整的存储功能测试
// 验证数据读写正常
// 验证性能没有显著下降
```

## 🎯 **阶段3：架构优化 (5-7天)**

### 3.1 性能优化
```javascript
// 实现存储缓存
class StorageCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  get(key) { /* LRU缓存实现 */ }
  set(key, value) { /* ... */ }
}
```

### 3.2 监控系统
```javascript
// 增强StorageHealthMonitor
class StorageHealthMonitor {
  // 监控存储使用情况
  // 监控性能指标
  // 监控错误率
  // 自动报告和告警
}
```

### 3.3 数据迁移和备份
```javascript
// 实现数据备份机制
class StorageBackup {
  async createBackup() { /* ... */ }
  async restoreBackup() { /* ... */ }
  async migrateData() { /* ... */ }
}
```

## 📊 **每日检查点**

### 每日必须完成的验证
1. **功能验证** - 脑图加载、保存、导入、导出正常
2. **性能验证** - 存储操作响应时间 < 100ms
3. **数据完整性** - 所有数据能正确读写
4. **错误监控** - 无存储相关错误
5. **进度报告** - 真实的完成情况，不允许虚假报告

### 风险控制
1. **每日备份** - 重构前备份所有代码
2. **回滚计划** - 准备快速回滚机制
3. **渐进式部署** - 逐步替换，不一次性大改
4. **用户影响最小化** - 确保用户功能不受影响

这是一个**系统性的架构重构项目**，需要严格按计划执行，确保每一步都有实际验证。
