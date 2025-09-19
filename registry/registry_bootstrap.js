// 引导新注册表模块（方案C）
;(function(global){
  // 立即设置开关，防止旧管理器在脚本解析阶段实例化
  // 已禁用新注册表机制，恢复原始localStorage加载
  global.__USE_NEW_REGISTRY__ = false;
  function boot(){
    try{
      // 已在顶层设置开关
      // 依赖检查
      if (!global.GlobalEventBus){ console.error('[RegistryBoot] EventBus 未加载'); return; }
      var store = new global.RegistryStore();
      var fsm = new global.RegistryStateMachine();
      var repo = new global.RegistryRepository({ store:store, bus:global.GlobalEventBus, apiBase: global.__REGISTRY_API_BASE });
      var cmd  = new global.RegistryCommandBus({ store:store, repo:repo, bus:global.GlobalEventBus, fsm:fsm });
      var view = new global.RegistryView({ store:store, cmd:cmd, bus:global.GlobalEventBus });
      // 绑定状态显示（可选）
      fsm.onChange(function(s){ try{ window.LogPanel && window.LogPanel.log('Registry FSM: '+s.state); }catch(_){ } });
      // 挂到全局
      global.Registry = { store:store, repo:repo, cmd:cmd, fsm:fsm, view:view };
      // 启动
      view.mount();
      cmd.init();
      console.log('[RegistryBoot] 新注册表模块已启动');
    }catch(e){ console.error('[RegistryBoot] 启动失败', e); }
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window || this);
