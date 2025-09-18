# MD底座集成实施计划

## 阶段一：MD底座双向读写引擎（不改动现有持久化）

### 1.1 创建MD解析器
```javascript
// src/services/mdBaseParser.js
class MindmapMDParser {
  // 将脑图JSON转换为MD格式
  jsonToMD(mindmapData) { ... }
  
  // 将MD格式解析为脑图JSON
  mdToJSON(mdContent) { ... }
  
  // 增量更新MD文档
  updateMDSection(mdContent, projectId, newData) { ... }
}
```

### 1.2 创建MD底座管理器
```javascript
// src/services/mdBaseManager.js
class MDBaseManager {
  // 读取统一MD文档
  async loadMDBase() { ... }
  
  // 写入脑图到MD底座
  async writeMindmapToMD(projectData) { ... }
  
  // 从MD底座恢复脑图
  async restoreMindmapFromMD(projectId) { ... }
  
  // 同步检查（本地MD vs 服务器MD）
  async syncCheck() { ... }
}
```

### 1.3 集成到现有存储服务
- 在 `mindmapStorage.js` 的 `save()` 方法中添加MD写入
- 在 `load()` 方法中添加MD读取兜底
- 保持现有localStorage/IndexedDB不变

## 阶段二：服务器同步接口

### 2.1 后端MD同步API
```python
# backend_server.py 新增接口
@app.route('/api/md-base/sync', methods=['POST'])
async def sync_md_base():
    # 接收本地MD内容
    # 与服务器MD对比
    # 返回冲突解决方案
    pass

@app.route('/api/md-base/download', methods=['GET'])
async def download_md_base():
    # 下载服务器最新MD底座
    pass

@app.route('/api/md-base/upload', methods=['POST'])
async def upload_md_base():
    # 上传本地MD到服务器
    pass
```

### 2.2 前端同步客户端
```javascript
// src/services/mdSyncClient.js
class MDSyncClient {
  async syncWithServer() {
    // 1. 获取本地MD哈希
    // 2. 与服务器对比
    // 3. 下载差异部分
    // 4. 合并冲突
    // 5. 上传本地变更
  }
}
```

## 阶段三：冷热数据分层集成

### 3.1 数据温度评估
- 基于访问频率自动分类
- 热数据：本地MD + localStorage + IndexedDB
- 温数据：本地MD + 服务器向量库
- 冷数据：仅服务器存储
- 归档数据：压缩存储

### 3.2 智能缓存策略
- 热数据优先本地加载
- 冷数据按需从服务器拉取
- 自动清理过期缓存

## 实施优先级

### P0 (立即实施)
1. MD解析器基础功能
2. 现有存储服务集成MD写入
3. 恢复四图功能增强

### P1 (本周内)
1. MD底座管理器完整实现
2. 服务器同步基础API
3. 冲突检测与解决机制

### P2 (下周)
1. 冷热数据自动分层
2. 智能同步策略
3. 性能优化与监控

## 技术要点

### 数据格式标准化
```markdown
## 项目: 脑图的优化和改造 (ID: mind_001)
- 创建时间: 2025-09-18T10:00:00Z
- 最后修改: 2025-09-18T10:15:00Z  
- 数据温度: hot
- 访问次数: 45

### 脑图结构
```json
{
  "format": "node_tree",
  "data": { ... }
}
```

### 节点内容
- **开发** (ID: node_001)
  - 内容: 成功后，导入标签...
  - 创建时间: 2025-09-18T10:01:00Z
  - 标签: [开发, 功能]
```

### 兼容性保证
- 现有localStorage数据完全保留
- IndexedDB镜像机制不变  
- 注册表系统无需修改
- 前端UI保持现有交互

### 性能考虑
- MD解析采用增量更新
- 大文档分块处理
- 异步写入不阻塞UI
- 智能缓存减少重复解析
