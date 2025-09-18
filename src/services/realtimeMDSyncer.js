class RealtimeMDSyncer {
  constructor() {
    this.initRealtimeSync();
    console.log('[实时MD同步器] 已初始化');
  }
  
  initRealtimeSync() {
    // 监听LocalStorage变化
    window.addEventListener('storage', (e) => {
      if (e.key === 'mindmap_data_v2') {
        this.updateMDCache(JSON.parse(e.newValue));
      }
    });
    
    // 监听MindmapStorage保存事件
    if (window.MindmapStorage && window.MindmapStorage.save) {
      const originalSave = window.MindmapStorage.save;
      window.MindmapStorage.save = (payload) => {
        const result = originalSave.call(window.MindmapStorage, payload);
        this.updateMDCache(payload);
        return result;
      };
    }
  }
  
  updateMDCache(payload) {
    if (!window.MDBaseManager) return;
    
    try {
      const projectData = {
        id: payload.meta?.mind_id || 'default',
        name: payload.data?.topic || '未命名项目',
        payload: payload,
        updatedAt: Date.now()
      };
      
      // 同步更新MD缓存
      window.MDBaseManager.cache.projects.set(projectData.id, projectData);
      
      console.log(`[实时MD] 已同步更新: ${projectData.name}`);
    } catch (e) {
      console.warn('[实时MD] 缓存更新失败:', e);
    }
  }
}

// 暴露到全局命名空间
window.RealtimeMDSyncer = RealtimeMDSyncer;
