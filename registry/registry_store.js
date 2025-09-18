// Registry Store：单一状态源（读侧投影）
;(function(global){
  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
  function Store(){
    this.state = {
      projects: [],
      currentId: null,
      sortMode: 'created_asc', // created_asc | name_asc | name_desc
      lastUpdated: null
    };
    this.listeners = new Set();
  }
  Store.prototype.subscribe = function(fn){ this.listeners.add(fn); return ()=>this.listeners.delete(fn); };
  Store.prototype.emit = function(){ var snap = clone(this.state); this.listeners.forEach(fn=>{ try{ fn(snap); }catch(e){} }); };
  Store.prototype.setProjects = function(list){ this.state.projects = Array.isArray(list)? list.slice(): []; this.state.lastUpdated = new Date().toISOString(); this.emit(); };
  Store.prototype.setCurrentId = function(id){ this.state.currentId = id || null; this.emit(); };
  Store.prototype.setSortMode = function(mode){ this.state.sortMode = mode; this.emit(); };
  // 选择器：按当前排序返回列表
  Store.prototype.getSorted = function(){
    var s = this.state;
    var arr = (s.projects||[]).slice();
    if (s.sortMode === 'created_asc'){
      arr.sort(function(a,b){
        var ca = a.created_at||'', cb = b.created_at||'';
        if (ca!==cb) return ca.localeCompare(cb);
        return String(a.id).localeCompare(String(b.id));
      });
    } else if (s.sortMode === 'name_asc'){
      arr.sort(function(a,b){ return String(a.name||'').localeCompare(String(b.name||'')); });
    } else if (s.sortMode === 'name_desc'){
      arr.sort(function(a,b){ return String(b.name||'').localeCompare(String(a.name||'')); });
    }
    return arr;
  };
  global.RegistryStore = Store;
})(window || this);
