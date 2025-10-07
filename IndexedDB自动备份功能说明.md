# IndexedDB自动备份功能说明

**实现时间**: 2025-10-07  
**功能**: IndexedDB自动备份到本地文件  
**实现方式**: File System Access API + 目录句柄

---

## 🎯 功能概述

### 核心特性
- ✅ **一次授权**：用户选择备份目录一次
- ✅ **自动保存**：定时自动备份到固定目录
- ✅ **无需确认**：后续备份无需用户干预
- ✅ **完整导出**：导出所有IndexedDB数据
- ✅ **数据恢复**：支持从备份文件恢复

---

## 📋 使用方法

### 1. 启用自动备份

```javascript
// 启用自动备份（每5分钟）
await window.AutogenUnifiedStorage.enableAutoBackup(5 * 60 * 1000);

// 浏览器会弹出目录选择器
// 选择备份目录，例如：D:\AI-Projects\project_manager\backups
// 授权后，系统会自动定时备份
```

**首次使用流程**：
1. 调用`enableAutoBackup()`
2. 浏览器弹出目录选择器
3. 选择备份目录（建议创建专用目录）
4. 授权读写权限
5. 立即执行首次备份
6. 启动定时备份

---

### 2. 备份文件

**文件命名格式**：
```
indexeddb_backup_2025-10-07T17-00-00.json
indexeddb_backup_2025-10-07T17-05-00.json
indexeddb_backup_2025-10-07T17-10-00.json
```

**文件内容结构**：
```json
{
  "exportTime": "2025-10-07T17:00:00.000Z",
  "version": "2.0.0",
  "totalItems": 150,
  "stats": {
    "reads": 500,
    "writes": 150,
    "hits": { "memory": 300, "localStorage": 100, "indexedDB": 100 }
  },
  "data": {
    "mindmap": [
      {
        "key": "mindmap:current",
        "data": { /* 脑图数据 */ },
        "timestamp": 1696680000000,
        "ttl": 1800000,
        "version": "2.0.0"
      }
    ],
    "logs": [
      {
        "key": "logs_1696680000000",
        "data": [ /* 日志数据 */ ],
        "timestamp": 1696680000000,
        "ttl": 604800000,
        "version": "2.0.0"
      }
    ],
    "app_state": [ /* ... */ ],
    "user_preferences": [ /* ... */ ]
  }
}
```

---

### 3. 禁用自动备份

```javascript
// 禁用自动备份
window.AutogenUnifiedStorage.disableAutoBackup();
```

---

### 4. 手动备份

```javascript
// 手动触发一次备份
await window.AutogenUnifiedStorage.backupToLocalFile();
```

---

### 5. 数据恢复

```javascript
// 选择备份文件恢复
const fileHandle = await window.showOpenFilePicker({
    types: [{
        description: 'IndexedDB备份文件',
        accept: { 'application/json': ['.json'] }
    }]
});

const result = await window.AutogenUnifiedStorage.restoreFromBackup(fileHandle[0]);
if (result.success) {
    console.log(`✅ 恢复成功: ${result.count}条数据`);
}
```

---

## 🔧 配置参数

### 备份间隔

```javascript
// 1分钟
await window.AutogenUnifiedStorage.enableAutoBackup(1 * 60 * 1000);

// 5分钟（默认）
await window.AutogenUnifiedStorage.enableAutoBackup(5 * 60 * 1000);

// 10分钟
await window.AutogenUnifiedStorage.enableAutoBackup(10 * 60 * 1000);

// 30分钟
await window.AutogenUnifiedStorage.enableAutoBackup(30 * 60 * 1000);
```

---

## 📁 推荐目录结构

```
project_manager/
└── backups/                                    # 备份目录
    ├── indexeddb_backup_2025-10-07T17-00-00.json
    ├── indexeddb_backup_2025-10-07T17-05-00.json
    ├── indexeddb_backup_2025-10-07T17-10-00.json
    └── ...
```

**建议**：
- 创建专用`backups`目录
- 定期清理旧备份（保留最近7天）
- 重要数据额外备份到云盘

---

## ⚠️ 浏览器兼容性

### 支持的浏览器
- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Opera 72+

### 不支持的浏览器
- ❌ Firefox（不支持`showDirectoryPicker`）
- ❌ Safari（不支持File System Access API）
- ❌ IE11

**检测方法**：
```javascript
if ('showDirectoryPicker' in window) {
    console.log('✅ 支持自动备份');
} else {
    console.log('❌ 不支持自动备份');
}
```

---

## 🎯 使用场景

### 场景1：开发调试
```javascript
// 每1分钟备份一次
await window.AutogenUnifiedStorage.enableAutoBackup(1 * 60 * 1000);
```

### 场景2：日常使用
```javascript
// 每5分钟备份一次（推荐）
await window.AutogenUnifiedStorage.enableAutoBackup(5 * 60 * 1000);
```

### 场景3：生产环境
```javascript
// 每10分钟备份一次
await window.AutogenUnifiedStorage.enableAutoBackup(10 * 60 * 1000);
```

---

## 📊 备份文件管理

### 查看备份状态
```javascript
const config = window.AutogenUnifiedStorage.backupConfig;
console.log('备份已启用:', config.enabled);
console.log('备份间隔:', config.interval / 1000, '秒');
console.log('上次备份:', new Date(config.lastBackupTime).toLocaleString());
```

### 备份文件清理脚本

**手动清理**（保留最近7天）：
```javascript
// 在备份目录中，删除7天前的文件
// 文件名格式：indexeddb_backup_YYYY-MM-DDTHH-MM-SS.json
```

**自动清理**（可选实现）：
```javascript
// 在备份时检查并删除旧文件
// 保留最近N个备份文件
```

---

## 🔒 安全性

### 权限控制
- ✅ 用户必须明确授权目录访问
- ✅ 每次启动需要重新授权
- ✅ 用户可随时撤销权限

### 数据安全
- ✅ 备份文件包含完整数据
- ✅ 支持数据恢复
- ⚠️ 备份文件未加密（明文JSON）
- ⚠️ 注意备份目录的访问权限

---

## 💡 最佳实践

### 1. 备份策略
- **开发环境**：1-5分钟
- **生产环境**：5-10分钟
- **低频使用**：10-30分钟

### 2. 存储管理
- 定期清理旧备份（保留7-30天）
- 重要数据额外备份到云盘
- 监控备份目录大小

### 3. 数据恢复
- 定期测试恢复功能
- 保留多个版本备份
- 记录备份时间点

---

## 🚀 快速开始

### 步骤1：创建备份目录
```
D:\AI-Projects\project_manager\backups\
```

### 步骤2：启用自动备份
```javascript
// 在浏览器控制台执行
await window.AutogenUnifiedStorage.enableAutoBackup(5 * 60 * 1000);
// 选择刚创建的backups目录
```

### 步骤3：验证备份
```
查看backups目录，应该看到：
indexeddb_backup_2025-10-07T17-00-00.json
```

### 步骤4：测试恢复
```javascript
// 选择备份文件恢复
const fileHandle = await window.showOpenFilePicker();
const result = await window.AutogenUnifiedStorage.restoreFromBackup(fileHandle[0]);
console.log(result);
```

---

## 📚 相关API

### enableAutoBackup(interval)
启用自动备份
- **参数**: `interval` - 备份间隔（毫秒）
- **返回**: `Promise<boolean>` - 是否成功

### disableAutoBackup()
禁用自动备份
- **返回**: `void`

### backupToLocalFile()
手动执行一次备份
- **返回**: `Promise<boolean>` - 是否成功

### exportAllData()
导出所有IndexedDB数据
- **返回**: `Promise<Object>` - 导出的数据

### restoreFromBackup(fileHandle)
从备份文件恢复数据
- **参数**: `fileHandle` - 文件句柄
- **返回**: `Promise<Object>` - `{ success, count }`

---

## ⚠️ 注意事项

### 1. 浏览器限制
- 每次启动浏览器需要重新授权目录
- 关闭浏览器后目录句柄失效
- 需要重新调用`enableAutoBackup()`

### 2. 性能影响
- 备份操作异步执行，不阻塞主线程
- 大数据量备份可能需要几秒钟
- 建议备份间隔不少于1分钟

### 3. 存储空间
- 备份文件大小取决于IndexedDB数据量
- 定期清理旧备份文件
- 监控磁盘空间使用

---

## 🔄 与其他功能集成

### 与日志系统集成
```javascript
// 日志也会自动备份
// 备份文件中包含logs类型数据
```

### 与脑图数据集成
```javascript
// 脑图数据自动备份
// 备份文件中包含mindmap类型数据
```

### 与冷热数据分层集成
```javascript
// 所有层级数据都会备份
// 包括热数据、温数据、冷数据
```

---

**实现完成时间**: 2025-10-07  
**功能状态**: ✅ 可用  
**浏览器要求**: Chrome 86+

程序员
