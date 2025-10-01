# 详情页工作栏

节点详情展示和编辑工作栏。

## 🚀 快速开始

### **启动测试环境（一键）**
```
双击 启动测试.bat
```

自动完成：
- ✅ 启动HTTP服务器（8000端口）
- ✅ 打开详情页
- ✅ 准备测试

### **手动测试步骤**
1. 确保HTTP服务器运行（见上方）
2. 访问：`http://localhost:8000/column-sources/detail/detail-column-layout.html`
3. 点击右上角"🧪 测试"按钮
4. 在测试台点击测试节点
5. 查看详情页数据加载

---

## 📂 文件结构

```
detail/
├─ detail-column-layout.html       # 页面布局
├─ detail-column-styles.css        # 样式表
├─ detail-column-core.js           # 核心逻辑（事件监听、数据加载）
├─ detail-column-sessions.js       # 会话管理
├─ detail-column-fullscreen.js     # 全屏功能
├─ test-data.json                  # 测试数据底座
├─ 启动测试.bat                    # 一键启动测试
├─ TEST-GUIDE.md                   # 完整测试指南
├─ 事件驱动架构说明.md              # 事件架构文档
├─ 访问说明.md                     # 访问方式说明
└─ 如何测试.txt                    # 快速测试说明
```

---

## ✨ 核心功能

### **数据展示**
- ✅ 节点标题显示
- ✅ Markdown内容渲染
- ✅ 标签系统（分组、高亮）
- ✅ 图片展示
- ✅ 附件列表

### **编辑功能**
- ✅ 标题编辑
- ✅ 内容编辑（Markdown）
- ✅ 标签选择（双向同步）
- ✅ 图片粘贴
- ✅ 附件管理

### **高级功能**
- ✅ 全屏编辑模式
- ✅ 会话管理
- ✅ 数据持久化
- ✅ 事件驱动架构

---

## 🎯 事件驱动架构

详情页监听 `node:selected` 事件：

```javascript
// 其他页面触发
window.dispatchEvent(new CustomEvent('node:selected', {
  detail: { nodeId: 'test_node_001' }
}));

// 详情页接收并处理
window.addEventListener('node:selected', async (event) => {
  const nodeId = event.detail?.nodeId;
  await loadNodeData(nodeId);
});
```

完整说明见：[事件驱动架构说明.md](./事件驱动架构说明.md)

---

## 🧪 测试系统

### **测试台**
位置：`column-sources/_test-harness/`

功能：
- 节点列表选择
- 一键发送事件
- 批量测试
- 事件监控

### **测试数据**
文件：`test-data.json`

包含5个测试节点：
- test_node_001 - 项目管理系统重构
- test_node_002 - 工作栏生态系统设计
- test_node_003 - 详情页工作栏开发
- test_node_004 - 接口定义强制验证机制
- test_node_005 - 测试驱动开发实践

---

## 📚 文档

- [TEST-GUIDE.md](./TEST-GUIDE.md) - 完整测试指南
- [事件驱动架构说明.md](./事件驱动架构说明.md) - 事件系统文档
- [访问说明.md](./访问说明.md) - HTTP访问方式
- [如何测试.txt](./如何测试.txt) - 快速测试说明

---

## ⚠️ 重要提示

**必须通过HTTP服务器访问**：
- ✅ 正确：`http://localhost:8000/column-sources/detail/...`
- ❌ 错误：`file:///D:/AI-Projects/.../detail-column-layout.html`

**原因**：浏览器会阻止 `file://` 协议的跨域请求（CORS错误）

**解决**：使用 `启动测试.bat` 自动启动HTTP服务器

---

## 🔧 开发说明

### **修改代码后**
1. 保存文件
2. 刷新浏览器（F5）
3. 查看更改

### **调试**
1. 打开浏览器开发者工具（F12）
2. 查看Console输出
3. 检查Network请求
4. 调试JavaScript

### **添加新功能**
1. 在相应的 `.js` 文件中添加功能
2. 更新 `test-data.json`（如需要）
3. 测试功能
4. 更新文档

---

**维护者**: 程序员  
**最后更新**: 2025-10-01
