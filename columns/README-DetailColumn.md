# 节点详情工作栏 - 模块化版本

**版本**: v1.0.0  
**作者**: 程序员  
**日期**: 2025-10-01

---

## 📦 **文件结构**

```
columns/
├── detail-column-layout.html       # 主HTML文件（布局）
├── detail-column-styles.css        # 样式文件
├── detail-column-core.js           # 核心逻辑模块
├── detail-column-sessions.js       # 会话管理模块
├── detail-column-fullscreen.js     # 全屏功能模块
└── README-DetailColumn.md          # 本文档
```

---

## ✨ **功能清单**

### **基础功能**（detail-column-core.js）
- ✅ 选项卡切换（详情、查询1、查询2、查询3）
- ✅ 标题编辑
- ✅ 节点ID显示
- ✅ 标签管理（点击切换）
- ✅ Markdown内容编辑
- ✅ 预览切换
- ✅ 附件管理
- ✅ 查询功能（关键词、全文本、标签筛选）
- ✅ 图标粘贴
- ✅ 保存功能

### **会话管理**（detail-column-sessions.js）
- ✅ 自动解析会话（按`##`标题识别）
- ✅ 会话列表显示
- ✅ 定位到会话（点击跳转）
- ✅ 重命名会话（双击修改）
- ✅ 新增会话（插入`## 标题`）
- ✅ 多选会话（复选框）
- ✅ 全选/全不选
- ✅ 复制所选会话（导出为Markdown）
- ✅ 实时更新会话列表

### **全屏功能**（detail-column-fullscreen.js）
- ✅ 全屏编辑模式
- ✅ 双面板布局（编辑器60% + 会话列表35%）
- ✅ 字体缩放（A+/A-/重置）
- ✅ 预览切换
- ✅ 保存功能
- ✅ ESC键退出全屏
- ✅ 响应式布局计算

---

## 🚀 **使用方法**

### **1. 直接测试**

在浏览器中打开：
```
file:///d:/AI-Projects/project_manager(neo4j+d3.jsECHART)/columns/detail-column-layout.html
```

### **2. 集成到系统**

#### **方式A：直接引入**
```html
<iframe src="columns/detail-column-layout.html" 
        style="width:100%;height:100%;border:none;"></iframe>
```

#### **方式B：工作栏配置**
```javascript
{
    id: 'detail',
    name: '节点详情',
    version: '1.0.0',
    author: '程序员',
    description: '节点详情编辑、会话管理、查询功能',
    category: 'core',
    icon: '📝',
    files: [
        'columns/detail-column-layout.html',
        'columns/detail-column-styles.css',
        'columns/detail-column-core.js',
        'columns/detail-column-sessions.js',
        'columns/detail-column-fullscreen.js'
    ],
    render: (container) => {
        // 加载iframe或动态插入HTML
    }
}
```

---

## 📖 **API 使用**

### **加载节点数据**
```javascript
window.DetailColumnAPI.loadNode({
    id: 'node_123',
    title: '示例节点',
    content: '# 标题\n\n## 会话1\n内容...'
});
```

### **获取当前数据**
```javascript
const data = window.DetailColumnAPI.getCurrentData();
console.log(data);
// {
//     title: '示例节点',
//     content: '# 标题...',
//     tags: ['重要', '紧急']
// }
```

### **会话管理API**
```javascript
// 解析会话
window.sessionManager.parseSessions(content);

// 渲染会话列表
window.sessionManager.renderSessionList();

// 定位到会话
window.sessionManager.gotoSession(0);

// 新增会话
window.sessionManager.addSession();

// 复制所选
window.sessionManager.copySelectedSessions();
```

---

## 🎯 **功能演示**

### **1. 会话管理**

输入以下Markdown内容：
```markdown
# 项目概述

这是项目的基本介绍。

## 需求分析
- 用户需求1
- 用户需求2

## 技术方案
- 使用React
- 使用Node.js

## 实施计划
第一阶段：...
第二阶段：...
```

点击"🔲 全屏"后，右侧会话列表将显示：
- 需求分析
- 技术方案
- 实施计划

### **2. 会话操作**

- **定位**：点击会话项，自动跳转到对应位置
- **重命名**：双击会话项，弹出重命名对话框
- **多选**：勾选复选框，选择多个会话
- **复制**：点击"📋 复制"按钮，复制所选会话到剪贴板

### **3. 快捷键**

- `ESC` - 退出全屏
- 点击"A+" - 增大字体
- 点击"A-" - 减小字体
- 点击"重置" - 恢复默认字体

---

## 🔧 **配置说明**

### **修改默认字体大小**
编辑 `detail-column-fullscreen.js`:
```javascript
this.fontSize = 14; // 改为你想要的大小
```

### **修改布局比例**
编辑 `detail-column-fullscreen.js` 的 `calculateLayout()` 方法:
```javascript
const editorWidth = Math.floor(winWidth * 0.6);    // 编辑器60%
const sessionsWidth = Math.floor(winWidth * 0.35); // 会话35%
```

### **自定义标签**
编辑 `detail-column-layout.html`:
```html
<div class="tag-panel" id="tag-panel">
    <div class="tag-chip">你的标签1</div>
    <div class="tag-chip">你的标签2</div>
</div>
```

---

## 🐛 **已知问题**

1. **Markdown渲染**：需要marked.js库，如果CDN加载失败，会使用简单的回退渲染
2. **附件功能**：当前仅前端演示，需要集成后端存储
3. **查询功能**：需要连接数据底座API

---

## 📋 **测试清单**

### **基础功能**
- [ ] 选项卡切换正常
- [ ] 标题编辑可用
- [ ] 标签点击切换状态
- [ ] Markdown预览正常
- [ ] 附件添加显示
- [ ] 查询功能执行

### **全屏功能**
- [ ] 点击全屏按钮进入全屏
- [ ] 布局正确（左60%右35%）
- [ ] 会话列表正确显示
- [ ] ESC键退出全屏
- [ ] 字体缩放正常
- [ ] 预览切换正常

### **会话管理**
- [ ] 自动识别## 标题
- [ ] 会话列表显示正确
- [ ] 点击定位到会话
- [ ] 双击重命名会话
- [ ] 新增会话功能
- [ ] 多选功能正常
- [ ] 全选/全不选正常
- [ ] 复制所选成功

---

## 🚀 **下一步计划**

### **Phase 1: 数据集成**
- [ ] 连接AutogenUnifiedStorage
- [ ] 实现真实的保存/加载
- [ ] 集成标签系统
- [ ] 连接查询API

### **Phase 2: 功能增强**
- [ ] 附件上传到服务器
- [ ] 会话拖拽排序
- [ ] 导出为PDF/Word
- [ ] 版本历史

### **Phase 3: 工作栏封装**
- [ ] 创建工作栏配置
- [ ] 上传到工作栏仓库
- [ ] 编写完整文档
- [ ] 发布版本

---

## 💡 **开发建议**

1. **保持模块独立**：每个JS文件职责单一，便于维护
2. **使用事件通信**：模块间通过事件传递消息
3. **统一错误处理**：使用toast提示用户
4. **日志完整**：console.log记录关键操作

---

## 📞 **技术支持**

如有问题，请联系：程序员

---

**程序员**
