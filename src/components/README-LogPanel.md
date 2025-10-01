# 日志面板组件

## 📋 **组件说明**

从原index.html的列表栏中提取的独立日志面板组件，提供统一的日志输出、查看和管理功能。

---

## 🎯 **功能特性**

1. ✅ **多级日志** - INFO/WARN/ERROR三个级别
2. ✅ **时间戳** - 每条日志自动添加时间戳
3. ✅ **折叠/展开** - 默认折叠，点击展开查看
4. ✅ **清空日志** - 一键清空所有日志
5. ✅ **复制日志** - 一键复制到剪贴板
6. ✅ **console拦截** - 自动拦截console输出
7. ✅ **错误捕获** - 自动捕获全局错误
8. ✅ **JSON格式化** - 自动格式化对象输出

---

## 📁 **文件清单**

```
src/components/
├── LogPanel.html       # HTML结构和完整实现
├── LogPanel.js         # 独立JavaScript模块
└── README-LogPanel.md  # 说明文档（本文档）
```

---

## 🚀 **使用方法**

### **方式1：使用完整HTML文件**

```html
<!-- 直接嵌入完整组件 -->
<div id="log-panel-container"></div>

<script>
    // 加载LogPanel.html内容到容器
    fetch('src/components/LogPanel.html')
        .then(r => r.text())
        .then(html => {
            document.getElementById('log-panel-container').innerHTML = html;
        });
</script>
```

### **方式2：手动添加HTML + 引入JS**

```html
<!-- 1. 添加HTML结构 -->
<div class="log-panel-container">
    <!-- 日志控制按钮 -->
    <div id="list-log-controls" style="display:flex;gap:8px;margin-bottom:4px;justify-content:flex-end;">
        <button id="test-md-save" type="button" style="padding:2px 8px;font-size:11px;background:#10b981;color:white;border:0;border-radius:3px;cursor:pointer;">MD保存</button>
        <button id="list-log-clear" type="button" style="padding:2px 8px;font-size:11px;background:#ef4444;color:white;border:0;border-radius:3px;cursor:pointer;">清空</button>
        <button id="list-log-copy" type="button" style="padding:2px 8px;font-size:11px;background:#3b82f6;color:white;border:0;border-radius:3px;cursor:pointer;">复制</button>
    </div>
    
    <!-- 日志面板 -->
    <div id="list-log-panel" data-collapsed="true" style="margin-top:auto;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;">
        <button id="list-log-header" type="button" style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#f8fafc;border:0;border-bottom:1px solid #e5e7eb;width:100%;cursor:pointer;">
            <span style="font-size:12px;color:#6b7280;">列表日志</span>
            <span id="list-log-caret" aria-hidden="true" style="font-size:12px;color:#9ca3af;">▸</span>
        </button>
        <pre id="list-log-body" style="display:none;margin:0;padding:6px 8px;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow:auto;font-size:12px;line-height:1.4;background:#ffffff;"></pre>
    </div>
</div>

<!-- 2. 引入JavaScript -->
<script src="src/components/LogPanel.js"></script>
```

### **方式3：封装为工作栏**

```javascript
// js/columns/log-panel-column.js
ColumnRegistry.register({
    id: 'log-panel',
    name: '日志面板',
    icon: '📋',
    version: '1.0.0',
    
    render: function(container) {
        // 加载LogPanel.html
        fetch('src/components/LogPanel.html')
            .then(r => r.text())
            .then(html => {
                container.innerHTML = html;
                
                // 加载LogPanel.js
                const script = document.createElement('script');
                script.src = 'src/components/LogPanel.js';
                document.head.appendChild(script);
            });
    }
});
```

---

## 💡 **API使用**

### **基本日志输出**

```javascript
// 普通日志
window.LogPanel.log('这是一条普通日志');

// 警告日志
window.LogPanel.warn('这是一条警告');

// 错误日志
window.LogPanel.error('这是一条错误');

// JSON对象日志
window.LogPanel.json('用户数据', { 
    name: 'John', 
    age: 30 
});
```

### **自动拦截console输出**

```javascript
// 这些console输出会自动显示在日志面板中
console.log('自动拦截的日志');
console.warn('自动拦截的警告');
console.error('自动拦截的错误');
```

### **全局错误捕获**

```javascript
// 这些错误会自动显示在日志面板中
throw new Error('测试错误'); // 自动捕获

Promise.reject('Promise错误'); // 自动捕获
```

---

## 🎨 **样式自定义**

所有样式都是内联的，可以直接修改：

```javascript
// 修改日志面板高度
document.getElementById('list-log-body').style.maxHeight = '400px';

// 修改字体大小
document.getElementById('list-log-body').style.fontSize = '14px';

// 修改颜色主题
document.getElementById('list-log-panel').style.borderColor = '#your-color';
```

---

## 📦 **封装为独立工作栏**

如果想将日志面板作为独立工作栏上传到仓库：

1. 创建 `js/columns/log-panel-board.js`
2. 参考 `swimlane-board.js` 的结构
3. 将LogPanel的HTML和JS封装进去
4. 通过ColumnWarehouse上传

---

## ⚙️ **配置选项**

```javascript
// 禁用console拦截
// 注释掉LogPanel.js中的这部分代码：
// ['log','info','warn','error'].forEach(fn=>{ ... });

// 禁用全局错误捕获
// 注释掉这部分：
// window.addEventListener('error', e=>{ ... });

// 自定义时间格式
// 修改ts()函数
```

---

## 🔧 **故障排除**

### **Q: 日志面板不显示？**
A: 检查HTML元素ID是否正确：
- `list-log-panel`
- `list-log-header`
- `list-log-body`
- `list-log-controls`

### **Q: 日志无法复制？**
A: 检查浏览器是否支持clipboard API，需要HTTPS或localhost环境

### **Q: console输出未拦截？**
A: 确保LogPanel.js在其他脚本之前加载

---

## 📝 **开发建议**

1. ✅ 日志面板适合作为固定组件，不建议频繁显示/隐藏
2. ✅ 如果日志量大，建议增加自动清理功能
3. ✅ 可以添加日志级别过滤（只显示ERROR等）
4. ✅ 可以添加搜索功能
5. ✅ 可以添加导出为文件功能

---

## 🎯 **未来增强**

- [ ] 日志级别过滤
- [ ] 搜索/高亮
- [ ] 导出为文件
- [ ] 自动清理（保留最近N条）
- [ ] 颜色编码（不同级别不同颜色）
- [ ] 时间格式配置
- [ ] 虚拟滚动（优化大量日志性能）

---

**日志面板已完整备份并独立化！可安全使用！**

**程序员**
