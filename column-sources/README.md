# 工作栏原料页面目录

本目录存放所有工作栏的**原料页面**（开发中的页面和封装后的工作栏文件）。

## 🚀 快速启动

### **方式1：一键启动（推荐）** ⭐
双击项目根目录的 `启动工作栏.bat`，自动启动HTTP服务器并打开详情页。

### **方式2：命令行启动**
```bash
# 启动HTTP服务器（8000端口）
python tools/start_column_frontend.py --detail
```

### **方式3：手动启动**
```bash
# 在项目根目录运行
python -m http.server 8000

# 然后访问
http://localhost:8000/column-sources/detail/detail-column-layout.html
```

⚠️ **重要**: 必须通过HTTP服务器访问，不要直接双击HTML文件（会遇到CORS错误）！

---

## 📁 目录结构

```
column-sources/
├─ detail/          详情页工作栏
├─ list/            列表页工作栏（未来）
├─ mindmap/         脑图工作栏（未来）
├─ swimlane/        泳道看板工作栏（未来）
└─ README.md        本说明文件
```

---

## 📋 每个工作栏目录的标准结构

以 `detail/` 为例：

```
detail/
├─ detail-column-layout.html      布局HTML
├─ detail-column-styles.css       样式CSS
├─ detail-column-core.js          核心逻辑
├─ detail-column-sessions.js      会话管理（可选）
├─ detail-column-fullscreen.js    全屏功能（可选）
├─ detail-column.js               封装后的工作栏文件 ⭐
└─ README.md                      工作栏说明文档
```

---

## 🔄 开发流程

### **阶段1：原料页面开发**
```
在 column-sources/[name]/ 目录中开发：
  ├─ [name]-column-layout.html
  ├─ [name]-column-styles.css
  ├─ [name]-column-core.js
  └─ ...（其他模块文件）
```

### **阶段2：封装为工作栏**
```
将所有文件封装为单个 [name]-column.js：
  ├─ 添加 IIFE 包裹
  ├─ 内联所有 HTML/CSS/JS
  ├─ 添加 ColumnRegistry.register()
  ├─ 添加自动持久化接入代码（10行）
  └─ 保存为 [name]-column.js
```

### **阶段3：上传到仓库**
```
通过设置页面上传 [name]-column.js：
  ├─ 上传到 ColumnWarehouse
  ├─ 生成元数据
  └─ 点击"上线"启用
```

---

## 📝 工作栏命名规范

| 工作栏 | 目录名 | 封装后文件名 |
|--------|--------|-------------|
| 详情页 | `detail/` | `detail-column.js` |
| 列表页 | `list/` | `list-column.js` |
| 脑图页 | `mindmap/` | `mindmap-column.js` |
| 泳道看板 | `swimlane/` | `swimlane-column.js` |

---

## ✅ 已完成的工作栏

### 1. 详情页工作栏 (detail/)
**状态**: ✅ 原料页面开发完成，待封装

**文件清单**:
- `detail-column-layout.html` (136行)
- `detail-column-styles.css` (450行)
- `detail-column-core.js` (610行)
- `detail-column-sessions.js` (300行)
- `detail-column-fullscreen.js` (280行)

**核心功能**:
- ✅ 标题编辑
- ✅ 标签系统（分组+复选+双向同步）
- ✅ Markdown编辑器
- ✅ 图片粘贴和管理
- ✅ 附件管理
- ✅ 全屏编辑模式
- ✅ 会话管理
- ✅ 保存到本地（文件选择器）
- ✅ 自动持久化接入（10行代码）

**下一步**: 封装为 `detail-column.js`

---

## 🚀 未来计划

### 待开发的工作栏
- [ ] 列表页工作栏 (list/)
- [ ] 脑图工作栏 (mindmap/)
- [ ] 泳道看板工作栏 (swimlane/)
- [ ] 关系图工作栏 (relation/)
- [ ] 统计图表工作栏 (charts/)
- [ ] 项目看板工作栏 (project/)

---

## 📚 相关文档

- [工作栏生态完整实施方案-总览](../docs/程序员：工作栏生态完整实施方案-总览.md)
- [工作栏开发规范](../docs/程序员：工作栏生态完整实施方案-Part3-工作栏开发规范.md)
- [详情页工作栏优化修改报告](../docs/程序员：详情页工作栏优化修改报告.md)
- [自动持久化功能补充报告](../docs/程序员：自动持久化功能补充报告.md)

---

**维护者**: 程序员  
**最后更新**: 2025-10-01
