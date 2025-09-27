// 引导新注册表模块（方案C）
;(function(global){
  // 立即设置开关，防止旧管理器在脚本解析阶段实例化
  // 启用新注册表机制，用于界面刷新
  global.__USE_NEW_REGISTRY__ = true;
  function boot(){
    try{
      // 已在顶层设置开关
      // 依赖检查 - 使用已有的EventBus或创建简单实现
      var eventBus = global.GlobalEventBus || global.EventBus || {
        emit: function(event, data) {
          try {
            // 统一事件发射：优先使用AutogenEventBus
            if (window.AutogenEventBus && typeof window.AutogenEventBus.emit === 'function') {
              window.AutogenEventBus.emit(event, data);
            } else {
              window.dispatchEvent(new CustomEvent(event, { detail: data }));
            }
          } catch (e) {
            console.warn('[RegistryBoot] 事件发送失败:', e);
          }
        },
        on: function(event, callback) {
          try {
            window.addEventListener(event, function(e) {
              callback(e.detail);
            });
          } catch (e) {
            console.warn('[RegistryBoot] 事件监听失败:', e);
          }
        }
      };
      
      var store = new global.RegistryStore();
      var fsm = new global.RegistryStateMachine();
      var repo = new global.RegistryRepository({ store:store, bus:eventBus, apiBase: global.__REGISTRY_API_BASE });
      var cmd  = new global.CommandBus({ store:store, repo:repo, bus:eventBus, fsm:fsm });
      var view = new global.RegistryView({ store:store, cmd:cmd, bus:eventBus });
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
