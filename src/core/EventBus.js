// 简化版事件总线（第三阶段最终实现）
// 仅保留基础的发布/订阅功能：on/off/emit
// 移除：命名空间、优先级、中间件、错误处理器、事件历史、统计、生命周期等复杂机制

class SimpleEventBus {
  constructor() {
    this.listeners = new Map();
  }

  // 订阅事件
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // 取消订阅
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // 发布事件
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    // 复制一份，避免回调里订阅/退订引发遍历问题
    const callbacks = [...this.listeners.get(event)];
    for (const cb of callbacks) {
      try {
        cb(data);
      } catch (e) {
        // 简单错误日志，不引入复杂错误管线
        // 保证单个监听器失败不影响其他监听器
        console.error(`事件 ${event} 处理出错`, e);
      }
    }
  }
}

// 创建全局实例
window.EventBus = new SimpleEventBus();
window.SimpleEventBus = SimpleEventBus;
