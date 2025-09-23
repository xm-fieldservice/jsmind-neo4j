import StorageInterface from '../StorageInterface';

class IndexedDBAdapter extends StorageInterface {
  constructor(dbName = 'mindmapDB', storeName = 'mindmaps') {
    super();
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onupgradeneeded = (event) => {
        this.db = event.target.result;
        if (!this.db.objectStoreNames.contains(this.storeName)) {
          this.db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async save(key, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ id: key, data });
      
      request.onsuccess = () => resolve({ success: true });
      request.onerror = (event) => reject({ success: false, error: event.target.error });
    });
  }

  async load(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = (event) => reject(null);
    });
  }

  async remove(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve({ success: true });
      request.onerror = (event) => reject({ success: false, error: event.target.error });
    });
  }

  async list(prefix = '') {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();
      
      request.onsuccess = () => {
        const keys = request.result;
        resolve(keys.filter(key => key.startsWith(prefix)));
      };
      request.onerror = (event) => reject([]);
    });
  }

  async getUsage() {
    return new Promise((resolve) => {
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
          resolve({
            used: estimate.usage,
            quota: estimate.quota,
            percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
          });
        }).catch(() => resolve({ used: 0, quota: 0, percentage: 0 }));
      } else {
        resolve({ used: 0, quota: 0, percentage: 0 });
      }
    });
  }
}

// 浏览器环境自动注册
try {
  if (typeof window !== 'undefined') {
    window.IndexedDBAdapter = IndexedDBAdapter;
  }
} catch (e) {
  console.warn('IndexedDBAdapter 全局注册失败', e);
}
