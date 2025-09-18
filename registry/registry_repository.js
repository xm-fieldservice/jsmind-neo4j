// Registry Repository：与后端交互（写侧权威 + 拉取源）
;(function(global){
  function Repository(opts){
    this.API_BASE = (opts && opts.apiBase) || (global.__REGISTRY_API_BASE || 'http://127.0.0.1:8081');
    this.store = opts.store; // RegistryStore 实例
    this.bus = opts.bus;     // EventBus
  }
  Repository.prototype._fetch = function(url, options){
    return fetch(url, options);
  };
  Repository.prototype.refresh = async function(){
    // 拉取列表，仅更新读侧，不触发 currentId 变化
    const resp = await this._fetch(this.API_BASE.replace(/\/$/,'') + '/registry/get', { method:'GET' });
    if (!resp.ok) throw new Error('获取注册表失败: ' + resp.status);
    const json = await resp.json();
    if (!json.success) throw new Error(json.error || '获取注册表失败');
    const reg = json.data || { projects: [] };
    const list = (reg.projects||[]).map(function(p){
      var name = p.name || (p.payload && p.payload.data && (p.payload.data.label || p.payload.data.topic)) || '未命名项目';
      return { id:p.project_id, project_id:p.project_id, name:name, created_at:p.created_at, last_modified:p.last_modified, source:p.source, payload:p.payload, storage_key:p.storage_key };
    });
    this.store.setProjects(list);
    try{ window.LogPanel && window.LogPanel.log(`[Repo] refresh -> ${list.length} items`); }catch(_){ }
    this.bus && this.bus.emit('registry:refreshed', { total:list.length });
    return list;
  };
  Repository.prototype.saveRegistry = async function(){
    // 将 store 的 projects 回写到后端（明确写入路径）
    const s = this.store.state;
    const reg = { version:'1.0', projects: (s.projects||[]).map(function(p){ return { project_id:p.id, name:p.name, created_at:p.created_at, last_modified:p.last_modified, source:p.source, payload:p.payload, storage_key:p.storage_key }; }), metadata:{ total_projects:(s.projects||[]).length, last_updated:new Date().toISOString(), storage_type:'unified_md' } };
    const resp = await this._fetch(this.API_BASE.replace(/\/$/,'') + '/registry/save', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(reg) });
    if (!resp.ok) throw new Error('保存注册表失败: ' + resp.status);
    const json = await resp.json();
    if (!json.success) throw new Error(json.error || '保存注册表失败');
    this.bus && this.bus.emit('registry:saved', { total: json.data && json.data.total });
    try{ window.LogPanel && window.LogPanel.log(`[Repo] save -> total=${json.data && json.data.total}`); }catch(_){ }
    try{ localStorage.setItem('__registry_fallback__', JSON.stringify(reg)); }catch(_){ }
    return true;
  };
  Repository.prototype.register = async function(project){
    // 明确写入：新增时更新 last_modified
    var now = new Date().toISOString();
    var p = Object.assign({}, project, { id:project.id || project.project_id, project_id: project.project_id || project.id, created_at: project.created_at || now, last_modified: now });
    var list = this.store.state.projects.slice();
    // 去重按 id
    var idx = list.findIndex(function(x){ return x.id === p.id; });
    if (idx>=0) list[idx] = Object.assign({}, list[idx], p); else list.unshift(p);
    this.store.setProjects(list);
    try{ window.LogPanel && window.LogPanel.log(`[Repo] register -> id=${p.id}, name=${p.name}`); }catch(_){ }
    await this.saveRegistry();
    this.bus && this.bus.emit('registry:registered', { id:p.id });
    return p;
  };
  Repository.prototype.rename = async function(id, newName){
    var list = this.store.state.projects.slice();
    var idx = list.findIndex(function(x){ return x.id === id; });
    if (idx<0) return false;
    list[idx] = Object.assign({}, list[idx], { name:newName, last_modified:new Date().toISOString() });
    this.store.setProjects(list);
    await this.saveRegistry();
    this.bus && this.bus.emit('registry:renamed', { id:id, name:newName });
    return true;
  };
  Repository.prototype.remove = async function(id){
    const resp = await this._fetch(this.API_BASE.replace(/\/$/,'') + '/registry/delete', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ project_id:id }) });
    if (!resp.ok) throw new Error('删除失败: ' + resp.status);
    const json = await resp.json();
    if (!json.success) throw new Error(json.error || '删除失败');
    var list = this.store.state.projects.slice().filter(function(x){ return x.id !== id; });
    this.store.setProjects(list);
    try{ window.LogPanel && window.LogPanel.log(`[Repo] remove -> id=${id}`); }catch(_){ }
    this.bus && this.bus.emit('registry:removed', { id:id });
    return true;
  };
  // 从脑图数据上行同步到注册表（更新名称与 payload）
  Repository.prototype.upsertFromMindmap = async function(id, name, data){
    var list = this.store.state.projects.slice();
    var idx = list.findIndex(function(x){ return x.id === id; });
    var now = new Date().toISOString();
    if (idx < 0){
      // 若不存在则按注册处理
      var proj = { id:id, project_id:id, name:name||'未命名项目', created_at: now, last_modified: now, source:'save', payload:{ format:'node_tree', data:data } };
      list.unshift(proj);
    } else {
      list[idx] = Object.assign({}, list[idx], { name: name || list[idx].name, last_modified: now, payload: { format:'node_tree', data: data } });
    }
    this.store.setProjects(list);
    try{ window.LogPanel && window.LogPanel.log(`[Repo] upsertFromMindmap -> id=${id}, name=${name}`); }catch(_){ }
    await this.saveRegistry();
    this.bus && this.bus.emit('registry:upserted', { id:id });
    return true;
  };
  global.RegistryRepository = Repository;
})(window || this);
