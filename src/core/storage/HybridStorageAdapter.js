class HybridStorageAdapter extends IStorage {
  constructor() {
    super();
    this.localAdapter = new LocalStorageAdapter();
    this.indexedDBAdapter = new IndexedDBAdapter();
    this.threshold = 1024 * 1024; // 1MB阈值
  }

  async set(key, value) {
    const size = JSON.stringify(value).length;
    if (size > this.threshold) {
      await this.indexedDBAdapter.set(key, value);
    } else {
      this.localAdapter.set(key, value);
    }
  }

  async get(key) {
    // 先尝试从localStorage获取
    let data = this.localAdapter.get(key);
    if (!data) {
      // 再从IndexedDB获取
      data = await this.indexedDBAdapter.get(key);
    }
    return data;
  }

  async delete(key) {
    // 同时删除两个存储中的数据
    this.localAdapter.delete(key);
    await this.indexedDBAdapter.delete(key);
  }

  async list(prefix) {
    // 合并两个存储的键列表
    const localKeys = this.localAdapter.list(prefix);
    const indexedDBKeys = await this.indexedDBAdapter.list(prefix);
    return [...localKeys, ...indexedDBKeys];
  }
}

if (typeof window !== 'undefined') {
  window.HybridStorageAdapter = HybridStorageAdapter;
}
