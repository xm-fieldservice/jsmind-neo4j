/**
 * 极简MD同步 - 去掉所有乱七八糟的东西
 * 只做一件事：把脑图数据写入MD文件
 */
(function() {
  'use strict';
  
  console.log('[极简MD同步] 加载中...');
  
  // 简单的MD格式化
  function formatProjectToMD(projectData) {
    const timestamp = new Date().toLocaleString();
    const nodeCount = countNodes(projectData.payload?.data);
    
    return `
## 项目: ${projectData.name} (ID: ${projectData.id})
- 创建时间: ${timestamp}
- 最后修改: ${timestamp}
- 节点数量: ${nodeCount}

### 脑图数据
\`\`\`json
${JSON.stringify(projectData.payload, null, 2)}
\`\`\`

---

`;
  }
  
  // 计算节点数量
  function countNodes(data) {
    if (!data) return 0;
    let count = 1;
    if (data.children && Array.isArray(data.children)) {
      data.children.forEach(child => {
        count += countNodes(child);
      });
    }
    return count;
  }
  
  // 方案1：下载MD文件
  function downloadMD(content, filename = 'mindmap_export.md') {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[极简MD同步] ✅ MD文件已下载');
  }
  
  // 方案2：发送到服务器（如果可用）
  async function sendToServer(content) {
    try {
      const response = await fetch('/api/md-base/save', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: content
      });
      
      if (response.ok) {
        console.log('[极简MD同步] ✅ 已保存到服务器');
        return true;
      } else {
        console.warn('[极简MD同步] ⚠️ 服务器保存失败');
        return false;
      }
    } catch (error) {
      console.warn('[极简MD同步] ⚠️ 服务器不可用:', error.message);
      return false;
    }
  }
  
  // 方案3：保存到localStorage
  function saveToLocalStorage(content) {
    try {
      localStorage.setItem('md_export_content', content);
      localStorage.setItem('md_export_timestamp', Date.now().toString());
      console.log('[极简MD同步] ✅ 已保存到localStorage');
      return true;
    } catch (error) {
      console.warn('[极简MD同步] ⚠️ localStorage保存失败:', error.message);
      return false;
    }
  }
  
  // 主同步函数
  async function syncToMD(projectData) {
    if (!projectData || !projectData.name) {
      console.warn('[极简MD同步] ⚠️ 无效的项目数据');
      return false;
    }
    
    console.log('[极简MD同步] 🚀 开始同步:', projectData.name);
    
    // 格式化为MD
    const mdContent = formatProjectToMD(projectData);
    
    // 尝试多种保存方式
    let success = false;
    
    // 1. 尝试服务器保存
    success = await sendToServer(mdContent);
    
    // 2. 如果服务器失败，保存到localStorage
    if (!success) {
      success = saveToLocalStorage(mdContent);
    }
    
    // 3. 提供手动下载选项
    if (success) {
      console.log('[极简MD同步] ✅ 同步完成');
      
      // 可选：自动下载备份
      if (window.AUTO_DOWNLOAD_MD) {
        downloadMD(mdContent, `${projectData.name}_${Date.now()}.md`);
      }
    } else {
      console.error('[极简MD同步] ❌ 所有保存方式都失败');
    }
    
    return success;
  }
  
  // 包装保存方法
  function wrapSaveMethod() {
    if (!window.mindmapController || !window.mindmapController.saveMindmapToStorage) {
      setTimeout(wrapSaveMethod, 1000);
      return;
    }
    
    const originalSave = window.mindmapController.saveMindmapToStorage;
    
    window.mindmapController.saveMindmapToStorage = function(...args) {
      // 执行原始保存
      const result = originalSave.apply(this, args);
      
      // 获取当前项目数据
      const projectData = {
        id: this.data?.id || 'unknown',
        name: this.data?.label || '未命名项目',
        payload: {
          format: 'node_tree',
          data: this.data
        }
      };
      
      // 异步同步到MD
      setTimeout(() => {
        syncToMD(projectData);
      }, 100);
      
      return result;
    };
    
    console.log('[极简MD同步] ✅ 已包装保存方法');
  }
  
  // 手动同步函数
  function manualSync() {
    if (!window.mindmapController || !window.mindmapController.data) {
      console.warn('[极简MD同步] ⚠️ 无脑图数据可同步');
      return;
    }
    
    const projectData = {
      id: window.mindmapController.data.id || 'manual_sync',
      name: window.mindmapController.data.label || '手动同步',
      payload: {
        format: 'node_tree',
        data: window.mindmapController.data
      }
    };
    
    syncToMD(projectData);
  }
  
  // 手动下载函数
  function manualDownload() {
    if (!window.mindmapController || !window.mindmapController.data) {
      console.warn('[极简MD同步] ⚠️ 无脑图数据可下载');
      return;
    }
    
    const projectData = {
      id: window.mindmapController.data.id || 'manual_download',
      name: window.mindmapController.data.label || '手动下载',
      payload: {
        format: 'node_tree',
        data: window.mindmapController.data
      }
    };
    
    const mdContent = formatProjectToMD(projectData);
    downloadMD(mdContent, `${projectData.name}.md`);
  }
  
  // 暴露到全局
  window.SimpleMDSync = {
    sync: syncToMD,
    download: manualDownload,
    manualSync: manualSync,
    formatToMD: formatProjectToMD
  };
  
  // 自动启动
  setTimeout(() => {
    wrapSaveMethod();
    console.log('[极简MD同步] ✅ 极简同步已就绪');
    console.log('[极简MD同步] 💡 使用 window.SimpleMDSync.download() 手动下载MD文件');
  }, 2000);
  
})();
