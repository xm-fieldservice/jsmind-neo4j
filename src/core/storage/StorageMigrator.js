/**
 * StorageMigrator - 数据迁移工具
 * 负责从旧存储格式迁移到新的注册式存储系统
 */

/**
 * @typedef {Object} MigrationResult
 * @property {number} success - 成功迁移的项目数
 * @property {number} failed - 迁移失败的项目数
 * @property {number} skipped - 跳过的项目数
 * @property {Array<string>} errors - 错误信息列表
 * @property {Object} details - 详细信息
 */

class StorageMigrator {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }

  async migrate(key) {
    const data = await this.source.get(key);
    if (data) {
      await this.target.set(key, data);
      await this.source.delete(key);
      return true;
    }
    return false;
  }

  async migrateAll(prefix) {
    const keys = await this.source.list(prefix);
    let successCount = 0;
    for (const key of keys) {
      const result = await this.migrate(key);
      if (result) successCount++;
    }
    return { total: keys.length, success: successCount };
  }
}

if (typeof window !== 'undefined') {
  window.StorageMigrator = StorageMigrator;
}
