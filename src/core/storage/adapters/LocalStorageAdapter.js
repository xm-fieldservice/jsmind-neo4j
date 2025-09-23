import StorageInterface from '../StorageInterface';

if (typeof LocalStorageAdapter === 'undefined') {
  class LocalStorageAdapter extends StorageInterface {
    async save(key, data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return { success: true };
      } catch (error) {
        console.error('localStorage保存失败:', error);
        return { success: false, error };
      }
    }

    async load(key) {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }

    async remove(key) {
      localStorage.removeItem(key);
      return { success: true };
    }

    async list(prefix = '') {
      return Object.keys(localStorage).filter(key => key.startsWith(prefix));
    }

    async getUsage() {
      // 计算localStorage使用量
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        total += ((localStorage.getItem(key).length * 2) / 1024); // KB
      }
      return {
        used: total,
        quota: 5120, // 5MB
        percentage: (total / 5120 * 100).toFixed(2)
      };
    }

    async init() {
      // localStorage无需特殊初始化
      return;
    }
  }
  window.LocalStorageAdapter = LocalStorageAdapter;
}
