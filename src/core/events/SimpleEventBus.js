class SimpleEventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      const callbacks = [...this.listeners.get(event)];
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`事件 ${event} 处理出错`, e);
        }
      });
    }
  }
}

export default new SimpleEventBus();
