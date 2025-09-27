# 存储系统清理计划

## 📊 当前存储文件现状 (19个文件)

### 🎯 保留的核心文件 (5个)
1. `AutogenUnifiedStorage.js` - 统一接口层
2. `StorageHealthMonitor.js` - 健康监控
3. `DefaultStorageTypes.js` - 类型定义
4. `StorageUtils.js` - 工具函数
5. `LocalStorageAdapter.js` (src/core/storage/adapters/) - 底层适配器

### 🗑️ 计划清理的冗余文件 (14个)

#### 重复的存储管理器
- `FormalStorageManager.js` → 合并到 AutogenUnifiedStorage
- `SimpleStorageManager.js` → 合并到 AutogenUnifiedStorage  
- `StorageManager.js` → 合并到 AutogenUnifiedStorage
- `HybridStorageAdapter.js` → 功能重复，删除
- `UnifiedStorageAdapter.js` → 功能重复，删除

#### 重复的适配器
- `src/persistence/adapters/LocalStorageAdapter.js` → 与核心适配器重复
- `src/persistence/adapters/SnapshotAdapter.js` → 合并到 AutogenUnifiedStorage

#### 重复的接口定义
- `IStorage.js` → 合并到 StorageInterface.js
- `StorageInterface.js` → 简化为类型定义

#### 重复的工具和服务
- `StorageRegistry.js` → 合并到 AutogenUnifiedStorage
- `StorageMigrator.js` → 合并到 StorageUtils
- `StorageService.js` → 合并到 AutogenUnifiedStorage
- `StorageMonitor.js` → 合并到 StorageHealthMonitor
- `MindmapStorage.js` → 合并到 AutogenUnifiedStorage

#### 迁移工具
- `StorageMigrationTool.js` → 完成迁移后删除

## 🎯 清理后的目标架构

```
src/core/storage/
├── AutogenUnifiedStorage.js     # 统一接口和实现
├── StorageHealthMonitor.js      # 健康监控
├── DefaultStorageTypes.js       # 类型定义
├── StorageUtils.js              # 工具函数
└── adapters/
    └── LocalStorageAdapter.js   # 底层适配器
```

## 📋 执行步骤

### 第1步：功能合并
1. 将各个存储管理器的功能合并到 AutogenUnifiedStorage
2. 将适配器功能统一到核心适配器
3. 将工具函数合并到 StorageUtils

### 第2步：调用更新
1. 更新所有对冗余存储系统的调用
2. 统一使用 AutogenUnifiedStorage 接口
3. 更新导入语句和依赖关系

### 第3步：文件清理
1. 删除冗余文件
2. 更新 index.html 中的脚本引用
3. 清理相关的测试文件

### 第4步：验证测试
1. 运行存储功能测试
2. 验证数据迁移完整性
3. 性能基准测试

## 🎯 预期成果

- **文件数量**: 19个 → 5个 (减少74%)
- **代码重复**: 大幅减少存储相关重复代码
- **维护复杂度**: 显著降低
- **性能**: 减少多层封装的性能损耗
- **一致性**: 统一的存储接口和行为
