/**
 * 自动MD同步模块 - 准实时同步LocalStorage到MD底座
 * 简单、可靠、无依赖的同步方案
 */
(function() {
  'use strict';
  
  console.log('[MD自动同步] 模块加载中...');
  
  // 配置MD同步全局变量
  window.MD_WRITE_MODE = 'server'; // 改为server模式，确保写入文件
  window.MD_SYNC_POLICY = 'all';
  window.INPUT_POLICY = 'human_or_whitelist';
  
  // 初始化白名单
  try {
    const rawWL = localStorage.getItem('save_whitelist');
    window.SAVE_WHITELIST = Array.isArray(JSON.parse(rawWL)) ? new Set(JSON.parse(rawWL)) : new Set();
  } catch(_) { 
    window.SAVE_WHITELIST = new Set(); 
  }
  
  // 同步函数
  function syncToMD(projectData) {
    if (!window.MDBaseManager) {
      console.warn('[MD自动同步] MDBaseManager不可用');
      return Promise.resolve();
    }
    
    return window.MDBaseManager.applyProjectToCache(projectData)
      .then(() => {
        console.log('[MD自动同步] ✅ 同步成功:', projectData.name);
        
        // 自动备份到localStorage（使用SmartStorage）
        try {
          const content = window.MDBaseManager.cache?.content;
          if (content && typeof content === 'string' && content.length > 0) {
            // 使用SmartStorage的智能存储，设置为LOW优先级（可清理的备份数据）
            if (window.smartStorage) {
              const success = window.smartStorage.set('md_base_backup', content, window.SmartLocalStorage?.priorities?.LOW);
              if (success) {
                window.smartStorage.set('md_base_backup_timestamp', Date.now().toString(), window.SmartLocalStorage?.priorities?.LOW);
              } else {
                console.warn('[MD自动同步] SmartStorage备份失败，尝试直接存储');
                // 降级到直接存储
                localStorage.setItem('md_base_backup', content);
                localStorage.setItem('md_base_backup_timestamp', Date.now().toString());
              }
            } else {
              // SmartStorage不可用，使用原生方法
              localStorage.setItem('md_base_backup', content);
              localStorage.setItem('md_base_backup_timestamp', Date.now().toString());
            }
          }
        } catch(e) {
          console.warn('[MD自动同步] localStorage备份失败:', e.message || e);
        }
      })
      .catch(err => {
        console.warn('[MD自动同步] ❌ 同步失败:', err);
      });
  }
  
  // 从MindmapController获取当前数据并同步
  function syncCurrentMindmap() {
    const ctrl = window.mindmapController;
    if (!ctrl || !ctrl.data || !ctrl.data.id) {
      console.warn('[MD自动同步] 脑图数据不可用');
      return;
    }
    
    const projectData = {
      id: ctrl.data.id,
      name: ctrl.data.label || ctrl.data.topic || '未命名项目',
      payload: ctrl.data,
      updatedAt: Date.now()
    };
    
    return syncToMD(projectData);
  }
  
  // 包装MindmapController的保存方法
  function wrapSaveMethod() {
    const ctrl = window.mindmapController;
    if (!ctrl || !ctrl.saveMindmapToStorage) {
      console.warn('[MD自动同步] MindmapController或saveMindmapToStorage不可用');
      return false;
    }
    
    // 检查是否已经包装过
    if (ctrl.saveMindmapToStorage.__mdSyncWrapped) {
      console.log('[MD自动同步] 保存方法已包装，跳过');
      return true;
    }
    
    const originalSave = ctrl.saveMindmapToStorage;
    ctrl.saveMindmapToStorage = function() {
      // 执行原始保存
      const result = originalSave.apply(this, arguments);
      
      // 立即同步到MD（异步，不阻塞保存）
      setTimeout(() => {
        if (this.data && this.data.id) {
          const projectData = {
            id: this.data.id,
            name: this.data.label || this.data.topic || '未命名项目',
            payload: this.data,
            updatedAt: Date.now()
          };
          syncToMD(projectData);
        }
      }, 100); // 100ms延迟，确保保存完成
      
      return result;
    };
    
    // 标记已包装
    ctrl.saveMindmapToStorage.__mdSyncWrapped = true;
    console.log('[MD自动同步] ✅ 保存方法已包装');
    return true;
  }
  
  // 初始化同步
  function initSync() {
    console.log('[MD自动同步] 开始初始化...');
    
    // 等待必要组件加载
    let retryCount = 0;
    const maxRetries = 20; // 最多重试20次（10秒）
    
    function tryInit() {
      retryCount++;
      
      if (!window.mindmapController) {
        if (retryCount < maxRetries) {
          console.log(`[MD自动同步] 等待MindmapController... (${retryCount}/${maxRetries})`);
          setTimeout(tryInit, 500);
          return;
        } else {
          console.error('[MD自动同步] ❌ MindmapController加载超时');
          return;
        }
      }
      
      if (!window.MDBaseManager) {
        if (retryCount < maxRetries) {
          console.log(`[MD自动同步] 等待MDBaseManager... (${retryCount}/${maxRetries})`);
          setTimeout(tryInit, 500);
          return;
        } else {
          console.error('[MD自动同步] ❌ MDBaseManager加载超时');
          return;
        }
      }
      
      // 组件都已加载，开始配置同步
      console.log('[MD自动同步] 组件已就绪，配置同步...');
      
      // 包装保存方法
      if (wrapSaveMethod()) {
        console.log('[MD自动同步] ✅ 自动同步已激活');
        
        // 执行一次初始同步
        setTimeout(() => {
          console.log('[MD自动同步] 执行初始同步...');
          syncCurrentMindmap();
        }, 1000);
      } else {
        console.error('[MD自动同步] ❌ 包装保存方法失败');
      }
    }
    
    // 开始初始化
    tryInit();
  }
  
  // 暴露到全局（用于调试）
  window.MDAutoSync = {
    syncCurrentMindmap: syncCurrentMindmap,
    wrapSaveMethod: wrapSaveMethod,
    initSync: initSync
  };
  
  // 页面加载完成后自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSync);
  } else {
    // 页面已加载完成，立即初始化
    setTimeout(initSync, 100);
  }
  
  console.log('[MD自动同步] 模块已加载');
})();
