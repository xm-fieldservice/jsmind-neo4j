/* src/services/mindmapStorage.js
 * 轻量存储抽象：提供全局 window.MindmapStorage
 * - load(): 读取并返回 { format, data } | null
 * - save(obj): 接受 { format, data } 并写入本地存储
 * 兼容现有 key: 'mindmap_data_v1'
 */
(function(){
  const KEY = 'mindmap_data_v2';  // 新主键，避免与旧键冲突
  const BACKUP_KEY = 'mindmap_data_backup_v2';

  function safeParse(json){
    try { return JSON.parse(json); } catch(_) { return null; }
  }
  function isValidPayload(obj){
    return !!(obj && typeof obj === 'object' && obj.format && obj.data);
  }
  function readFirst(keys){
    for (const k of keys){
      try{
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const obj = safeParse(raw);
        if (!obj) continue;
        if (isValidPayload(obj)) return obj;
      }catch(_){/* ignore */}
    }
    return null;
  }

  async function sha256Hex(text){
    try{
      const data = new TextEncoder().encode(text || '');
      const buf = await crypto.subtle.digest('SHA-256', data);
      const arr = Array.from(new Uint8Array(buf));
      return arr.map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(_){
      // Fallback: simple non-crypto hash (not collision-resistant)
      let h = 0; const s = String(text||'');
      for (let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i))|0; }
      return 'fh_'+(h>>>0).toString(16);
    }
  }

  function walkNodes(jmNode, acc){
    if (!jmNode) return acc;
    acc.push(jmNode);
    if (Array.isArray(jmNode.children)){
      jmNode.children.forEach(n=>walkNodes(n, acc));
    }
    return acc;
  }

  const api = {
    load(){
      try{
        // 优先读取新键
        const text = localStorage.getItem(KEY);
        if (text) {
          const obj = JSON.parse(text);
          if (obj) return obj;
        }
        
        // 兜底：尝试读取旧键（仅读取，不写入）
        const legacyText = localStorage.getItem('mindmap_data_v1');
        if (legacyText) {
          console.log('[MindmapStorage] 从旧键读取数据，建议重新保存以迁移到新键');
          const obj = JSON.parse(legacyText);
          return obj || null;
        }
        
        return null;
      }catch(e){
        console.warn('[MindmapStorage] 读取失败:', e);
        return null;
      }
    },
    save(payload){
      try{
        if (!isValidPayload(payload)) return;
        const text = JSON.stringify(payload);
        localStorage.setItem(KEY, text); // 主存储
        localStorage.setItem(BACKUP_KEY, text); // 单备份
        console.log('[MindmapStorage] 已保存 (format=%s)', payload.format);
      }catch(e){
        console.error('[MindmapStorage] 保存失败:', e);
      }
    },
    // 供控制器轻保存模式使用：与内部一致的哈希算法
    async hashContent(text){
      return await sha256Hex(text || '');
    },
    // ---------- Query APIs (async) ----------
    async getStatus(){
      try{
        return { };
      }catch(e){ console.warn('[MindmapStorage] getStatus failed:', e); return { }; }
    },
    // 新增：从MD底座恢复项目
    async loadFromMDBase(projectId){
      try{
        if (!window.MDBaseManager) return null;
        const project = await window.MDBaseManager.restoreMindmapFromMD(projectId);
        return project ? project.payload : null;
      }catch(e){ console.warn('[MindmapStorage] 从MD底座加载失败:', e); return null; }
    },
    // 新增：获取MD底座中的所有项目
    async getAllProjectsFromMDBase(){
      try{
        if (!window.MDBaseManager) return [];
        return await window.MDBaseManager.getAllProjects();
      }catch(e){ console.warn('[MindmapStorage] 获取MD底座项目列表失败:', e); return []; }
    },
    // 清理localStorage存储空间
    _cleanupStorage(){
      try{
        console.log('[MindmapStorage] 开始清理localStorage...');
        
        // 删除大型缓存项
        const itemsToClean = [
          'md_base_backup',
          'md_base_offline_storage'
        ];
        
        itemsToClean.forEach(key => {
          if (localStorage.getItem(key)) {
            const size = localStorage.getItem(key).length;
            localStorage.removeItem(key);
            console.log(`[MindmapStorage] 已清理 ${key}: ${(size/1024).toFixed(2)} KB`);
          }
        });
        
        // 清理隔离区域数据
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('md_quarantine_')) {
            localStorage.removeItem(key);
            console.log(`[MindmapStorage] 已清理隔离数据: ${key}`);
          }
        });
        
        console.log('[MindmapStorage] localStorage清理完成');
      }catch(e){
        console.error('[MindmapStorage] 清理失败:', e);
      }
    }
  };
  window.MindmapStorage = api;
})();
