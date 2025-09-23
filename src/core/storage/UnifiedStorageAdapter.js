import StorageInterface from './StorageInterface';

export default class UnifiedStorageAdapter extends StorageInterface {
  constructor(backends = []) {
    super();
    this.backends = backends;
  }

  async init() {
    // 初始化所有后端
    await Promise.all(this.backends.map(backend => backend.init()));
  }

  async save(key, data) {
    // 并行保存到所有后端
    const results = await Promise.allSettled(
      this.backends.map(backend => backend.save(key, data))
    );
    // 检查结果，如果至少有一个成功则视为成功
    const success = results.some(result => result.status === 'fulfilled' && result.value.success);
    return { success };
  }

  async load(key) {
    // 按顺序尝试从各个后端加载，直到成功
    for (const backend of this.backends) {
      try {
        const data = await backend.load(key);
        if (data !== null) {
          return data;
        }
      } catch (error) {
        console.warn(`从 ${backend.constructor.name} 加载失败`, error);
      }
    }
    return null;
  }

  async remove(key) {
    // 并行删除所有后端的数据
    const results = await Promise.allSettled(
      this.backends.map(backend => backend.remove(key))
    );
    const success = results.every(result => result.status === 'fulfilled' && result.value.success);
    return { success };
  }

  async list(prefix) {
    // 从第一个后端获取列表（通常IndexedDB作为主存储）
    if (this.backends.length > 0) {
      return this.backends[0].list(prefix);
    }
    return [];
  }

  async getUsage() {
    // 获取所有后端的存储使用情况，然后汇总
    const usages = await Promise.all(this.backends.map(backend => backend.getUsage()));
    return {
      used: usages.reduce((sum, usage) => sum + usage.used, 0),
      quota: usages.reduce((sum, usage) => sum + usage.quota, 0),
      percentage: usages.reduce((sum, usage) => sum + usage.percentage, 0) / usages.length
    };
  }
}
