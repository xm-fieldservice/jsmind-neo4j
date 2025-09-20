(function(){
  // Auto-save all mindmaps to a chosen directory using File System Access API
  // UI-less by default; injects a small toggle link into Detail > 状态 区域若存在
  const STATE = {
    dirHandle: null,
    timer: null,
    intervalMs: (typeof window.MindmapAutoJSONIntervalMs === 'number') ? window.MindmapAutoJSONIntervalMs : 60*1000,
    lastCount: 0,
    lastTs: 0
  };

  function logInfo(msg){ try{ window.LogPanel && window.LogPanel.log('[AutoSave] '+msg); }catch(_){ console.log('[AutoSave]', msg); } }
  function logWarn(msg){ try{ window.LogPanel && window.LogPanel.warn('[AutoSave] '+msg); }catch(_){ console.warn('[AutoSave]', msg); } }
  function logErr(msg){ try{ window.LogPanel && window.LogPanel.error('[AutoSave] '+msg); }catch(_){ console.error('[AutoSave]', msg); } }

  async function chooseDirectoryAndStart(){
    try{
      if (!window.showDirectoryPicker){
        logWarn('当前浏览器不支持目录访问 API，自动保存不可用');
        toast('浏览器不支持目录访问，无法启用自动保存');
        return;
      }
      const dir = await window.showDirectoryPicker({ mode:'readwrite' });
      STATE.dirHandle = dir;
      startTimer();
      await runOnce();
      toast('自动保存已启动（间隔：'+Math.round(STATE.intervalMs/1000)+'秒）');
      logInfo('started, interval='+STATE.intervalMs+'ms');
      updateDetailStatus();
    }catch(e){
      if (e && e.name === 'AbortError'){ toast('已取消'); return; }
      logErr('选择目录失败 '+(e && e.message ? e.message : String(e)));
      toast('选择目录失败');
    }
  }

  function startTimer(){
    if (STATE.timer){ return; }
    STATE.timer = setInterval(()=>{ runOnce().catch(()=>{}); }, STATE.intervalMs);
  }

  async function runOnce(){
    try{
      if (!STATE.dirHandle) return;
      if (typeof STATE.dirHandle.requestPermission === 'function'){
        const perm = await STATE.dirHandle.requestPermission({ mode:'readwrite' }).catch(()=>null);
        if (perm !== 'granted') return;
      }
      // 收集全部脑图
      let items = [];
      try{
        if (window.mindmapController && typeof window.mindmapController.getAllMindmapsFromStorage === 'function'){
          items = window.mindmapController.getAllMindmapsFromStorage();
        }
      }catch(_){ items = []; }
      if (!Array.isArray(items) || items.length===0){
        STATE.lastCount = 0; STATE.lastTs = Date.now(); updateDetailStatus();
        return;
      }
      const sanitize = (s)=> String(s||'mindmap').replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,'_').slice(0,60);
      const t0 = Date.now();
      let ok = 0;
      for (const it of items){
        const id = (it.id || (it.data && it.data.data && it.data.data.id) || 'unknown');
        const name = sanitize(it.name || (it.data && it.data.data && (it.data.data.topic || it.data.data.label)) || 'mindmap');
        const fileName = `${name}_${id}.json`;
        const fileHandle = await STATE.dirHandle.getFileHandle(fileName, { create:true });
        const writable = await fileHandle.createWritable();
        const payload = (it.data && it.data.format) ? it.data : (it.data || {});
        const json = JSON.stringify(payload, null, 2);
        await writable.write(new Blob([json], {type:'application/json'}));
        await writable.close();
        ok++;
      }
      const dt = Date.now()-t0;
      STATE.lastCount = ok; STATE.lastTs = Date.now();
      updateDetailStatus();
      if (!STATE._toastCounter) STATE._toastCounter = 0; STATE._toastCounter++;
      if (STATE._toastCounter % 3 === 1){ toast(`自动保存完成（${ok} 项，${dt}ms）`); }
      logInfo(`done count=${ok}, duration=${dt}ms`);
    }catch(e){ logErr('失败 '+(e && e.message ? e.message : String(e))); }
  }

  function toast(msg){
    try{
      if (window.mindmapController && typeof window.mindmapController.showToast === 'function'){
        window.mindmapController.showToast(msg);
      }else{
        // 简易兜底
        logInfo(msg);
      }
    }catch(_){ logInfo(msg); }
  }

  function updateDetailStatus(){
    try{
      const el = document.getElementById('autojson-detail-status');
      if (!el) return;
      const mins = Math.max(1, Math.round(STATE.intervalMs/60000));
      const tsStr = STATE.lastTs ? new Date(STATE.lastTs).toLocaleString() : '--';
      const cntStr = (STATE.lastTs ? String(STATE.lastCount) : '--');
      el.textContent = `自动保存：${STATE.timer?'已启动':'未启动'}\n间隔：${mins}分钟\n上次：${tsStr}\n数量：${cntStr}`;
    }catch(_){ }
  }

  function injectToggle(){
    // 在“节点详情>状态”区域追加一个小按钮
    const host = document.getElementById('node-status') || document.querySelector('#detail-container h4+ #node-status');
    const para = document.getElementById('autojson-detail-status');
    if (!host && !para) return;
    // 若状态容器不存在则创建
    if (!document.getElementById('autojson-detail-status')){
      const div = document.createElement('div');
      div.id = 'autojson-detail-status';
      div.style.cssText = 'font-size:12px;color:#555;line-height:1.6;margin-top:4px;white-space:pre-line;';
      div.textContent = '自动保存：未启动';
      const wrap = host ? host.parentElement : document.querySelector('#detail-container .detail-item:nth-child(2)');
      wrap && wrap.appendChild(div);
    }
    // 添加一个轻量按钮（仅当未添加过）
    if (!document.getElementById('autojson-start-btn')){
      const btn = document.createElement('button');
      btn.id = 'autojson-start-btn';
      btn.type = 'button';
      btn.textContent = '启用自动保存全部脑图';
      btn.style.cssText = 'margin-top:6px;padding:2px 8px;font-size:12px;';
      btn.addEventListener('click', chooseDirectoryAndStart);
      const wrap = document.getElementById('autojson-detail-status')?.parentElement;
      wrap && wrap.appendChild(btn);
    }
    updateDetailStatus();
  }

  // 挂到全局，便于其它模块调用（可选）
  window.AutoSaveAllMindmaps = {
    start: chooseDirectoryAndStart,
    runOnce,
  };

  // 启动注入
  window.addEventListener('DOMContentLoaded', function(){
    // 等待 mindmapController 加载
    const checkAndInject = () => {
      if (window.mindmapController && typeof window.mindmapController.getAllMindmapsFromStorage === 'function'){
        injectToggle();
      } else {
        setTimeout(checkAndInject, 1000);
      }
    };
    setTimeout(checkAndInject, 500);
  });
})();
