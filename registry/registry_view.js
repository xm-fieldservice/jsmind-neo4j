// Registry View：渲染左侧列表，仅订阅 Store；所有动作通过 CommandBus
;(function(global){
  function View(opts){
    this.store = opts.store;
    this.cmd = opts.cmd;
    this.bus = opts.bus;
    this.root = document.getElementById('project-list');
    this.formatTime = function(ts){ try{ var d=new Date(ts), n=new Date(), diff=n-d; if (diff<60000) return '刚刚'; if (diff<3600000) return Math.floor(diff/60000)+'分钟前'; if (diff<86400000) return Math.floor(diff/3600000)+'小时前'; return Math.floor(diff/86400000)+'天前'; }catch(e){ return '未知'; } };
    this.getSourceIcon = function(source){ var m={ 'new':'', 'import':'📥', 'localStorage':'💾', 'autogen':'🤖' }; return m[source] || ''; };
  }
  View.prototype.mount = function(){
    var self = this;
    this.unsubscribe && this.unsubscribe();
    this.unsubscribe = this.store.subscribe(function(){ self.render(); });
    this.render();
  };
  View.prototype.render = function(){
    if (!this.root) return;
    var s = this.store.state;
    this.root.innerHTML = '';
    var sorted = this.store.getSorted();
    // 读取收藏/归档状态（本地轻量持久化）
    var favSet = new Set();
    var arcSet = new Set();
    try{
      // 使用AutogenUnifiedStorage加载收藏和归档数据（同步方式）
      if (window.AutogenUnifiedStorage) {
        try {
          // 使用Promise方式处理异步调用
          window.AutogenUnifiedStorage.retrieve('registry', 'favorites').then(function(favData) {
            if (favData && Array.isArray(favData)) { 
              favData.forEach(function(id){ favSet.add(id); }); 
              // 重新渲染以应用收藏状态
              setTimeout(function() { self.render(); }, 0);
            }
          }).catch(function(e) {
            console.warn('[Registry] 加载收藏数据失败:', e);
          });
          
          window.AutogenUnifiedStorage.retrieve('registry', 'archived').then(function(arcData) {
            if (arcData && Array.isArray(arcData)) { 
              arcData.forEach(function(id){ arcSet.add(id); }); 
              // 重新渲染以应用归档状态
              setTimeout(function() { self.render(); }, 0);
            }
          }).catch(function(e) {
            console.warn('[Registry] 加载归档数据失败:', e);
          });
        } catch(e) {
          console.warn('[Registry] AutogenUnifiedStorage调用失败:', e);
        }
      } else {
        console.warn('[Registry] AutogenUnifiedStorage不可用');
      }
    }catch(_){ }
    if (!sorted.length){
      var emptyItem = document.createElement('li');
      emptyItem.className = 'empty-state';
      emptyItem.innerHTML = '<div style="text-align:center;padding:20px;color:#666;"><div style="font-size:18px;margin-bottom:10px;">📝</div><div>暂无脑图项目</div><div style="font-size:12px;margin-top:5px;">创建新脑图后会自动显示在这里</div></div>';
      this.root.appendChild(emptyItem);
      return;
    }
    var self = this;
    sorted.forEach(function(p){
      var item = document.createElement('div');
      var isFav = favSet.has(p.id);
      var isArc = arcSet.has(p.id);
      item.className = 'project-item' + (p.id===s.currentId ? ' active':'' ) + (isArc ? ' archived':'');
      item.dataset.projectId = p.id;
      var info = document.createElement('div'); info.className = 'project-info';
      var nameEl = document.createElement('div'); nameEl.className = 'project-name'; nameEl.textContent = p.name || '未命名项目'; info.appendChild(nameEl);
      var meta = document.createElement('div'); meta.className = 'project-meta';
      var timeEl = document.createElement('span'); timeEl.className = 'project-time'; timeEl.textContent = self.formatTime(p.last_modified || p.created_at); meta.appendChild(timeEl);
      // 仅显示来源图标，移除文字（清理 new 字样）
      var srcEl = document.createElement('span'); srcEl.className = 'project-source'; srcEl.textContent = self.getSourceIcon(p.source);
      meta.appendChild(srcEl);
      // 将操作图标显性放在修改时间旁边
      var inlineActions = document.createElement('span'); inlineActions.className = 'project-actions inline';
      var btnDel = document.createElement('button'); btnDel.className = 'action-btn delete-btn'; btnDel.title= isFav ? '已收藏，不能删除' : '删除'; btnDel.textContent='🗑';
      if (isFav){ btnDel.disabled = true; btnDel.style.opacity = '0.5'; }
      btnDel.addEventListener('click', function(e){ e.stopPropagation(); if (!btnDel.disabled) self.onRemove(p); });
      var btnFav = document.createElement('button'); btnFav.className = 'action-btn fav-btn'; btnFav.title = isFav ? '已收藏' : '收藏'; btnFav.textContent = isFav ? '★' : '☆';
      btnFav.addEventListener('click', function(e){
        e.stopPropagation();
        if (isFav){ favSet.delete(p.id); } else { favSet.add(p.id); }
        // 使用AutogenUnifiedStorage保存收藏数据
        if (window.AutogenUnifiedStorage) {
          window.AutogenUnifiedStorage.store('registry', 'favorites', Array.from(favSet)).catch(function(e) {
            console.warn('[Registry] 保存收藏数据失败:', e);
          });
        } else {
          console.warn('[Registry] AutogenUnifiedStorage不可用，无法保存收藏数据');
        }
        self.render();
      });
      var btnArc = document.createElement('button'); btnArc.className = 'action-btn archive-btn'; btnArc.title = isArc ? '已归档（占位）' : '归档（占位）'; btnArc.textContent = '📦';
      btnArc.addEventListener('click', function(e){
        e.stopPropagation();
        if (isArc){ arcSet.delete(p.id); } else { arcSet.add(p.id); }
        // 使用AutogenUnifiedStorage保存归档数据
        if (window.AutogenUnifiedStorage) {
          window.AutogenUnifiedStorage.store('registry', 'archived', Array.from(arcSet)).catch(function(e) {
            console.warn('[Registry] 保存归档数据失败:', e);
          });
        } else {
          console.warn('[Registry] AutogenUnifiedStorage不可用，无法保存归档数据');
        }
        self.render();
      });
      inlineActions.appendChild(btnDel); inlineActions.appendChild(btnFav); inlineActions.appendChild(btnArc);
      meta.appendChild(inlineActions);
      info.appendChild(meta);
      item.appendChild(info);
      item.addEventListener('click', function(){ self.onSelect(p); });
      self.root.appendChild(item);
    });
  };
  View.prototype.onSelect = function(project){
    this.cmd.select(project.id);
    // 设置加载状态，防止加载期间的误写
    try{ if (window.Registry && window.Registry.fsm) window.Registry.fsm.setState('Loading'); }catch(_){ }
    // UI加载到脑图（不触发写回）
    try{
      var payload = project.payload || {};
      var data = (payload.format==='node_tree' && payload.data) ? payload.data : (payload.data||payload)||null;
      if (!data || !data.id) return;
      if (!Array.isArray(data.children)) data.children = [];
      if (!data.label && !data.topic) data.label = project.name || '项目脑图';
      if (!window.mindmapController){ console.warn('[RegistryView] mindmapController 不存在'); return; }
      window.mindmapController.data = data;
      if (typeof window.mindmapController.renderMindmap === 'function') window.mindmapController.renderMindmap();
      // 延迟设置为 Ready 状态，确保渲染完成后再允许保存
      setTimeout(function(){
        try{ if (window.Registry && window.Registry.fsm) window.Registry.fsm.setState('Ready'); }catch(_){ }
        try{ if (window.AppLifecycle && typeof window.AppLifecycle.setReady==='function'){ window.AppLifecycle.setReady(String(data.id)); } }catch(_){ }
        try{ window.__STORAGE_PAUSE = false; window.__REG_SYNC_SUPPRESS = false; }catch(_){ }
      }, 500); // 延迟500ms确保渲染稳定
      // 注意：不再设置 __mindFullCache，避免与 mindKey 解析冲突
      // 保存时的 mindKey 现在直接从当前画布根ID获取，确保一致性
      // 切换视图
      try{ var btn=document.querySelector('.view-toggle[data-view="mindmap"]'); var col=document.getElementById('mindmap-column'); if (btn && !(btn.classList.contains('active') || (col&&col.classList.contains('visible')))){ btn.click(); } }catch(_){ }
    }catch(e){ console.warn('[RegistryView] 选择加载失败', e); }
  };
  View.prototype.onRemove = async function(project){
    if (!confirm('确定要删除项目"'+(project.name||'未命名')+'"吗？')) return;
    try{ await this.cmd.remove(project.id); }catch(e){ alert('删除失败: '+e.message); }
  };
  global.RegistryView = View;
})(window || this);
