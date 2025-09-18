// 事件总线（发布/订阅）
// 简单实现，后续如需可替换为更成熟的库

;(function(global){
  function EventBus(){ this.listeners = new Map(); }
  EventBus.prototype.on = function(event, handler){
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  };
  EventBus.prototype.off = function(event, handler){
    const set = this.listeners.get(event);
    if (set) set.delete(handler);
  };
  EventBus.prototype.emit = function(event, payload){
    const set = this.listeners.get(event);
    if (set) {
      [].slice.call(set).forEach(function(fn){
        try { fn(payload); } catch (e) { console.warn('[EventBus] handler error', e); }
      });
    }
  };
  global.EventBus = EventBus;
  global.GlobalEventBus = new EventBus();
})(window || this);
