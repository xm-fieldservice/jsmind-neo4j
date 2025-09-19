class RealtimeMDSyncer {
  constructor() {
    this.initRealtimeSync();
    console.log('[实时MD同步器] 已初始化');
  }
  
  initRealtimeSync() {
    // 监听LocalStorage变化
    window.addEventListener('storage', (e) => {
      if (e.key === 'mindmap_data_v2') {
        try{
          const payload = JSON.parse(e.newValue);
          this.updateMDAndSave(payload);
        }catch(err){ console.warn('[实时MD] storage事件解析失败', err); }
      }
    });
    
    // 监听MindmapStorage保存事件（两个常见入口都做包装）
    const self = this;
    function wrapSave(obj, fnName){
      try{
        if (!obj || typeof obj[fnName] !== 'function') return;
        const original = obj[fnName];
        obj[fnName] = function(){
          const args = Array.prototype.slice.call(arguments);
          const payload = args && args[0] ? args[0] : (window.mindmapController && window.mindmapController.data);
          const ret = original.apply(this, args);
          try{ self.updateMDAndSave(payload); }catch(err){ console.warn('[实时MD] 包装保存失败', err); }
          return ret;
        };
        console.log(`[实时MD] 已包装 ${fnName}`);
      }catch(e){ console.warn(`[实时MD] 包装 ${fnName} 失败`, e); }
    }
    // 包装 saveMindmapToStorage 与 save（若存在）
    wrapSave(window.MindmapStorage, 'saveMindmapToStorage');
    wrapSave(window.MindmapStorage, 'save');
  }
  
  updateMDAndSave(payload) {
    if (!window.MDBaseManager || !payload) return;
    try {
      // 策略：仅接受“键盘删除”同步
      try{
        const policy = (typeof window!=='undefined' && window.MD_SYNC_POLICY) || 'all';
        const op = (typeof window!=='undefined' && window.__MD_SYNC_OP) || null;
        if (policy === 'delete_only' && op !== 'delete'){
          return; // 跳过非删除操作的同步
        }
      }catch(_){ }

      const projectData = {
        id: (payload && (payload.meta && payload.meta.mind_id)) || (payload && payload.data && payload.data.id) || 'default',
        name: (payload && payload.data && payload.data.topic) || '未命名项目',
        payload: payload,
        updatedAt: Date.now()
      };
      // 仅同步到 MD 底座缓存（毫秒级），不触发任何写库
      Promise.resolve(window.MDBaseManager.applyProjectToCache(projectData))
        .then(()=>{ console.log(`[实时MD] 已同步MD缓存: ${projectData.name}`); })
        .catch((e)=>{ console.warn('[实时MD] 同步MD缓存失败:', e); });
      // 清理一次性操作标志
      try{ if (window.__MD_SYNC_OP) window.__MD_SYNC_OP = null; }catch(_){ }
    } catch (e) {
      console.warn('[实时MD] 处理payload失败:', e);
    }
  }
}

// 暴露到全局命名空间
window.RealtimeMDSyncer = RealtimeMDSyncer;
