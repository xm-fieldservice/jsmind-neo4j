/**
 * 自动MD同步 - 基于现有的本地保存机制
 * 把现有的"点击写入按键"改成"自动同步到MD文件"
 */
(function() {
  'use strict';
  
  console.log('[自动MD同步] 加载中...');
  
  // 配置
  const CONFIG = {
    autoSync: true,           // 是否启用自动同步
    syncDelay: 2000,         // 保存后延迟同步时间（毫秒）
    filename: 'mindmap_auto_sync.md'  // 默认文件名
  };
  
  // 格式化脑图数据为MD格式
  function formatToMD(data) {
    if (!data) return '# 空脑图\n\n暂无数据。';
    
    const timestamp = new Date().toLocaleString();
    const nodeCount = countNodes(data);
    
    let md = `# ${data.label || data.topic || '未命名脑图'}\n\n`;
    md += `- **创建时间**: ${timestamp}\n`;
    md += `- **节点总数**: ${nodeCount}\n`;
    md += `- **根节点ID**: ${data.id}\n\n`;
    
    // 递归生成节点树
    md += '## 脑图结构\n\n';
    md += generateNodeTree(data, 0);
    
    // 添加详细内容
    if (hasNodeContent(data)) {
      md += '\n## 节点详细内容\n\n';
      md += generateNodeDetails(data);
    }
    
    // 添加原始JSON数据（可选）
    md += '\n## 原始数据\n\n';
    md += '```json\n';
    md += JSON.stringify(data, null, 2);
    md += '\n```\n';
    
    return md;
  }
  
  // 计算节点数量
  function countNodes(node) {
    if (!node) return 0;
    let count = 1;
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        count += countNodes(child);
      });
    }
    return count;
  }
  
  // 生成节点树结构
  function generateNodeTree(node, level = 0) {
    if (!node) return '';
    
    const indent = '  '.repeat(level);
    const bullet = level === 0 ? '###' : '-';
    let result = `${indent}${bullet} **${node.label || node.topic || '未命名节点'}** (ID: ${node.id})\n`;
    
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        result += generateNodeTree(child, level + 1);
      });
    }
    
    return result;
  }
  
  // 检查是否有节点内容
  function hasNodeContent(node) {
    if (node.content && node.content.trim()) return true;
    if (node.children && Array.isArray(node.children)) {
      return node.children.some(child => hasNodeContent(child));
    }
    return false;
  }
  
  // 生成节点详细内容
  function generateNodeDetails(node, level = 0) {
    if (!node) return '';
    
    let result = '';
    const hasContent = node.content && node.content.trim();
    
    if (hasContent) {
      const title = node.label || node.topic || '未命名节点';
      const headerLevel = Math.min(level + 3, 6); // 最多到h6
      const header = '#'.repeat(headerLevel);
      
      result += `${header} ${title}\n\n`;
      result += `${node.content.trim()}\n\n`;
    }
    
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        result += generateNodeDetails(child, level + 1);
      });
    }
    
    return result;
  }
  
  // 自动保存到本地MD文件
  async function autoSaveToMD(data) {
    try {
      if (!window.showSaveFilePicker) {
        console.warn('[自动MD同步] 浏览器不支持File System Access API');
        return false;
      }
      
      const mdContent = formatToMD(data);
      const filename = `${data.label || 'mindmap'}_${Date.now()}.md`;
      
      const opts = {
        suggestedName: filename,
        types: [
          {
            description: 'Markdown 文件',
            accept: { 'text/markdown': ['.md'] }
          }
        ]
      };
      
      const handle = await window.showSaveFilePicker(opts);
      const writable = await handle.createWritable();
      await writable.write(new Blob([mdContent], { type: 'text/markdown' }));
      await writable.close();
      
      console.log('[自动MD同步] ✅ 已自动保存到:', filename);
      
      // 显示提示
      if (window.mindmapController && window.mindmapController.showToast) {
        window.mindmapController.showToast(`已自动同步到 ${filename}`);
      }
      
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[自动MD同步] 用户取消了保存');
      } else {
        console.error('[自动MD同步] 保存失败:', error);
      }
      return false;
    }
  }
  
  // 包装原有的保存方法
  function wrapSaveMethod() {
    if (!window.mindmapController || !window.mindmapController.saveMindmapToStorage) {
      setTimeout(wrapSaveMethod, 1000);
      return;
    }
    
    const originalSave = window.mindmapController.saveMindmapToStorage;
    
    window.mindmapController.saveMindmapToStorage = function(...args) {
      // 执行原始保存
      const result = originalSave.apply(this, args);
      
      // 如果启用自动同步，延迟执行MD同步
      if (CONFIG.autoSync && this.data) {
        setTimeout(() => {
          autoSaveToMD(this.data);
        }, CONFIG.syncDelay);
      }
      
      return result;
    };
    
    // 标记已包装
    window.mindmapController.saveMindmapToStorage.__autoMDSyncWrapped = true;
    console.log('[自动MD同步] ✅ 已包装保存方法');
  }
  
  // 手动触发同步
  function manualSync() {
    if (!window.mindmapController || !window.mindmapController.data) {
      console.warn('[自动MD同步] 无脑图数据可同步');
      return;
    }
    
    autoSaveToMD(window.mindmapController.data);
  }
  
  // 切换自动同步开关
  function toggleAutoSync() {
    CONFIG.autoSync = !CONFIG.autoSync;
    console.log(`[自动MD同步] 自动同步已${CONFIG.autoSync ? '开启' : '关闭'}`);
    
    if (window.mindmapController && window.mindmapController.showToast) {
      window.mindmapController.showToast(`自动MD同步已${CONFIG.autoSync ? '开启' : '关闭'}`);
    }
    
    return CONFIG.autoSync;
  }
  
  // 修改现有的"写"按钮行为
  function enhanceExportButton() {
    const exportBtn = document.getElementById('mindmap-export-btn');
    if (!exportBtn) {
      setTimeout(enhanceExportButton, 1000);
      return;
    }
    
    // 移除原有事件监听器
    const newBtn = exportBtn.cloneNode(true);
    exportBtn.parentNode.replaceChild(newBtn, exportBtn);
    
    // 添加新的事件监听器
    newBtn.addEventListener('click', () => {
      if (window.mindmapController && window.mindmapController.data) {
        autoSaveToMD(window.mindmapController.data);
      } else {
        console.warn('[自动MD同步] 无脑图数据可导出');
      }
    });
    
    // 更新按钮提示
    newBtn.title = '导出脑图为MD文档';
    
    console.log('[自动MD同步] ✅ 已增强导出按钮');
  }
  
  // 暴露到全局
  window.AutoMDSync = {
    sync: manualSync,
    toggle: toggleAutoSync,
    formatToMD: formatToMD,
    config: CONFIG
  };
  
  // 启动
  setTimeout(() => {
    wrapSaveMethod();
    enhanceExportButton();
    console.log('[自动MD同步] ✅ 自动MD同步已就绪');
    console.log('[自动MD同步] 💡 使用说明:');
    console.log('[自动MD同步]   - 编辑脑图时会自动同步到MD文件');
    console.log('[自动MD同步]   - 点击"写"按钮直接保存MD文件');
    console.log('[自动MD同步]   - window.AutoMDSync.toggle() 切换自动同步');
    console.log('[自动MD同步]   - window.AutoMDSync.sync() 手动同步');
  }, 2000);
  
})();
