/* src/services/mindmapStorage.js
 * 轻量存储抽象：提供全局 window.MindmapStorage
 * - load(): 读取并返回 { format, data } | null
 * - save(obj): 接受 { format, data } 并写入本地存储
 * 兼容现有 key: 'mindmap_data_v1'
 */
(function(){
  const KEY = 'mindmap_data_v2';  // 新主键，避免与旧键冲突
  const BACKUP_KEY = 'mindmap_data_backup_v2';
  const FULL_KEY = '__mind_full_cache_v1';
  const LEGACY_KEY = 'mindmap_data_v1';  // 旧键，仅用于读取兜底
  // IndexedDB config
  const DB_NAME = 'MindmapDB';
  const DB_VERSION = 1;
  const STORE_NODES = 'nodes';       // keyPath: node_id
  const STORE_CONTENTS = 'contents'; // keyPath: content_hash
  const STORE_VERSIONS = 'versions'; // keyPath: id (auto), idx: node_id, content_hash

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
        if (k === FULL_KEY && obj && obj.data){
          // 将只含 data 的快照转换为 {format, data}
          return { meta: obj.meta||{}, format: (obj.format || 'node_tree'), data: obj.data };
        }
        if (isValidPayload(obj)) return obj;
      }catch(_){/* ignore */}
    }
    return null;
  }

  // ---------- IndexedDB helpers (fire-and-forget) ----------
  let _dbPromise = null;
  function openDB(){
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject)=>{
      try{
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e)=>{
          const db = req.result;
          // nodes: { node_id, label, content_hash, updatedAt }
          if (!db.objectStoreNames.contains(STORE_NODES)){
            db.createObjectStore(STORE_NODES, { keyPath: 'node_id' });
          }
          // contents: { content_hash, content, length, updatedAt }
          if (!db.objectStoreNames.contains(STORE_CONTENTS)){
            db.createObjectStore(STORE_CONTENTS, { keyPath: 'content_hash' });
          }
          // versions: { id (auto), node_id, content_hash, updatedAt }
          if (!db.objectStoreNames.contains(STORE_VERSIONS)){
            const store = db.createObjectStore(STORE_VERSIONS, { keyPath: 'id', autoIncrement: true });
            store.createIndex('by_node', 'node_id', { unique: false });
            store.createIndex('by_hash', 'content_hash', { unique: false });
          }
        };
        req.onsuccess = ()=> resolve(req.result);
        req.onerror = ()=> reject(req.error);
      }catch(err){ reject(err); }
    });
    return _dbPromise;
  }

  function runTx(db, storeNames, mode, fn){
    return new Promise((resolve, reject)=>{
      try{
        const tx = db.transaction(storeNames, mode);
        const stores = storeNames.map(n=>tx.objectStore(n));
        const res = fn.apply(null, stores.concat(tx));
        tx.oncomplete = ()=> resolve(res);
        tx.onerror = ()=> reject(tx.error);
        tx.onabort = ()=> reject(tx.error || new Error('IDB transaction aborted'));
      }catch(err){ reject(err); }
    });
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

  async function mirrorToIndexedDB(payload){
    try{
      if (!isValidPayload(payload) || payload.format !== 'node_tree' || !payload.data) return;
      const db = await openDB();
      const list = walkNodes(payload.data, []);
      const now = new Date().toISOString();

      await runTx(db, [STORE_NODES, STORE_CONTENTS, STORE_VERSIONS], 'readwrite', (nodes, contents, versions)=>{
        // We will queue requests; no need to return anything
        list.forEach(async (n)=>{
          try{
            const label = n.topic || '';
            const content = (n.data && n.data.content) || n.content || '';
            const hash = await sha256Hex(content);
            // contents upsert
            contents.put({ content_hash: hash, content, length: (content||'').length, updatedAt: now });
            // nodes upsert (lightweight)
            nodes.put({ node_id: n.id, label, content_hash: hash, updatedAt: now });
            // versions append
            versions.add({ node_id: n.id, content_hash: hash, updatedAt: now });
          }catch(_){ /* ignore individual node errors */ }
        });
      });
    }catch(e){ console.warn('[MindmapStorage][IDB] mirror failed:', e); }
  }

  const api = {
    load(){
      try{
        // 优先读取新键
        const text = window.smartStorage ? window.smartStorage.get(KEY) : localStorage.getItem(KEY);
        if (text) {
          const obj = JSON.parse(text);
          if (obj) return obj;
        }
        
        // 兜底：尝试读取旧键（仅读取，不写入）
        const legacyText = localStorage.getItem(LEGACY_KEY);
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
        // 使用智能存储系统
        if (window.smartStorage) {
          // 主数据：关键优先级
          window.smartStorage.set(KEY, text, window.SmartLocalStorage?.priorities.CRITICAL);
          
          // 备份数据：高优先级
          window.smartStorage.set(BACKUP_KEY, JSON.stringify(payload), window.SmartLocalStorage?.priorities.HIGH);
          
          // 快照数据：中等优先级
          const snapshot = { meta: payload.meta||{}, format: 'node_tree', data: payload.data };
          window.smartStorage.set(FULL_KEY, JSON.stringify(snapshot), window.SmartLocalStorage?.priorities.MEDIUM);
        } else {
          // 降级到传统方式
          localStorage.setItem(KEY, text);
          try{ localStorage.setItem(BACKUP_KEY, JSON.stringify(payload)); }catch(_){}
          try{ 
            const snapshot = { meta: payload.meta||{}, format: 'node_tree', data: payload.data };
            localStorage.setItem(FULL_KEY, JSON.stringify(snapshot)); 
          }catch(_){}
        }
        console.log('[MindmapStorage] 已保存 (format=%s, mirrored to backup & full)', payload.format);

        // Fire-and-forget: mirror into IndexedDB with versioning
        // 不阻塞现有同步流程，失败将被忽略并记录
        try{ mirrorToIndexedDB(payload); }catch(_){ }
        
        // 新增：安全写入MD底座（防误写机制）
        try{
          // 获取项目ID，支持多种数据结构
          const mindId = payload.meta?.mind_id || payload.data?.id || (payload.data && typeof payload.data === 'object' && payload.data.id);
          
          if (window.MDSafeWriter && mindId) {
            const projectData = {
              id: mindId,
              name: payload.data?.topic || payload.data?.label || '未命名项目',
              payload: payload,
              createdAt: payload.meta?.createdAt || Date.now(),
              updatedAt: Date.now(),
              accessCount: (payload.meta?.accessCount || 0) + 1
            };
            
            // 获取之前的数据用于安全验证
            const previousData = this._getPreviousData(mindId);
            
            // 使用安全写入器
            window.MDSafeWriter.safeWriteToMD(projectData, previousData).then(result => {
              if (result.success) {
                console.log('[MindmapStorage] MD安全写入成功:', result.reason);
              } else {
                console.warn('[MindmapStorage] MD安全写入被阻止:', result.reason);
              }
            }).catch(e => 
              console.warn('[MindmapStorage] MD安全写入异常:', e)
            );
          } else if (window.MDBaseManager && mindId) {
            // 降级到普通MD写入（如果安全写入器不可用）
            const projectData = {
              id: mindId,
              name: payload.data?.topic || payload.data?.label || '未命名项目',
              payload: payload,
              createdAt: payload.meta?.createdAt || Date.now(),
              updatedAt: Date.now(),
              accessCount: (payload.meta?.accessCount || 0) + 1
            };
            window.MDBaseManager.writeMindmapToMD(projectData).catch(e => 
              console.warn('[MindmapStorage] MD底座写入失败:', e)
            );
          }
        }catch(_){ /* MD底座写入失败不影响主流程 */ }
      }catch(e){
        console.error('[MindmapStorage] 保存失败:', e);
      }
    },
    // 供控制器轻保存模式使用：与内部一致的哈希算法
    async hashContent(text){
      return await sha256Hex(text || '');
    },
    // 供控制器主动触发 IndexedDB 镜像（不写 localStorage）
    async mirror(payload){
      try{ await mirrorToIndexedDB(payload); }catch(_){ /* ignore */ }
    },
    // ---------- Query APIs (async) ----------
    async getNode(node_id){
      try{
        const db = await openDB();
        return await runTx(db, [STORE_NODES], 'readonly', (nodes)=> new Promise((resolve, reject)=>{
          const req = nodes.get(node_id);
          req.onsuccess = ()=> resolve(req.result || null);
          req.onerror = ()=> reject(req.error);
        }));
      }catch(e){ console.warn('[MindmapStorage][IDB] getNode failed:', e); return null; }
    },
    async getContentByHash(content_hash){
      try{
        const db = await openDB();
        return await runTx(db, [STORE_CONTENTS], 'readonly', (contents)=> new Promise((resolve, reject)=>{
          const req = contents.get(content_hash);
          req.onsuccess = ()=> resolve(req.result || null);
          req.onerror = ()=> reject(req.error);
        }));
      }catch(e){ console.warn('[MindmapStorage][IDB] getContentByHash failed:', e); return null; }
    },
    async listVersions(node_id){
      try{
        const db = await openDB();
        return await runTx(db, [STORE_VERSIONS], 'readonly', (versions)=> new Promise((resolve)=>{
          const idx = versions.index('by_node');
          const out = [];
          const range = IDBKeyRange.only(node_id);
          const req = idx.openCursor(range, 'prev'); // latest first
          req.onsuccess = (e)=>{
            const cur = e.target.result;
            if (cur){ out.push(cur.value); cur.continue(); } else { resolve(out); }
          };
          req.onerror = ()=> resolve([]);
        }));
      }catch(e){ console.warn('[MindmapStorage][IDB] listVersions failed:', e); return []; }
    },
    async getLatestContentByNode(node_id){
      try{
        const versions = await this.listVersions(node_id);
        if (!versions || versions.length===0) return null;
        const latest = versions[0];
        const rec = await this.getContentByHash(latest.content_hash);
        return rec ? { content_hash: latest.content_hash, content: rec.content, updatedAt: latest.updatedAt } : null;
      }catch(e){ console.warn('[MindmapStorage][IDB] getLatestContentByNode failed:', e); return null; }
    },
    async getStatus(){
      try{
        const db = await openDB();
        const idbStatus = await runTx(db, [STORE_NODES, STORE_CONTENTS, STORE_VERSIONS], 'readonly', (nodes, contents, versions)=> new Promise((resolve)=>{
          const counts = { nodes:0, contents:0, versions:0 };
          const done = ()=> resolve(counts);
          let pending = 3;
          const countStore = (storeName, store)=>{
            const req = store.count();
            req.onsuccess = ()=>{ counts[storeName] = req.result||0; if(--pending===0) done(); };
            req.onerror = ()=>{ counts[storeName] = 0; if(--pending===0) done(); };
          };
          countStore('nodes', nodes);
          countStore('contents', contents);
          countStore('versions', versions);
        }));
        
        // 添加MD底座状态
        let mdBaseStatus = { loaded: false, projectCount: 0 };
        try{
          if (window.MDBaseManager) {
            mdBaseStatus = window.MDBaseManager.getStatus();
          }
        }catch(_){ }
        
        return { ...idbStatus, mdBase: mdBaseStatus };
      }catch(e){ console.warn('[MindmapStorage][IDB] getStatus failed:', e); return { nodes:0, contents:0, versions:0, mdBase: { loaded: false, projectCount: 0 } }; }
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
    
    // 获取之前的数据用于安全验证
    _getPreviousData(projectId){
      try{
        // 尝试从备份键获取之前的数据
        const backupData = localStorage.getItem(BACKUP_KEY);
        if (backupData) {
          const parsed = JSON.parse(backupData);
          if (parsed && parsed.meta && parsed.meta.mind_id === projectId) {
            return parsed;
          }
        }
        
        // 尝试从全图快照获取
        const fullData = localStorage.getItem(FULL_KEY);
        if (fullData) {
          const parsed = JSON.parse(fullData);
          if (parsed && parsed.meta && parsed.meta.mind_id === projectId) {
            return parsed;
          }
        }
        
        return null;
      }catch(e){
        console.warn('[MindmapStorage] 获取之前数据失败:', e);
        return null;
      }
    },
    
    // 清理localStorage存储空间
    _cleanupStorage(){
      try{
        console.log('[MindmapStorage] 开始清理localStorage...');
        
        // 删除大型缓存项
        const itemsToClean = [
          'md_base_backup',
          '__mind_full_cache_v1',
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
