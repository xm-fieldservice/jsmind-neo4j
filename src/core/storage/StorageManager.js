if (typeof StorageManager === 'undefined') {
  class StorageManager {
    constructor(adapter) {
      this.adapter = adapter;
    }

    get(key) {
      return this.adapter.get(key);
    }

    set(key, value) {
      this.adapter.set(key, value);
    }

    delete(key) {
      this.adapter.delete(key);
    }

    list(prefix) {
      return this.adapter.list(prefix);
    }
  }
  window.StorageManager = StorageManager;
}
