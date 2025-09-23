// 统一存储接口定义

export default class StorageInterface {
  /**
   * 保存数据
   * @param {string} key - 存储键
   * @param {any} data - 要保存的数据
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async save(key, data) {
    throw new Error('save方法必须被实现');
  }

  /**
   * 加载数据
   * @param {string} key - 存储键
   * @returns {Promise<any>}
   */
  async load(key) {
    throw new Error('load方法必须被实现');
  }

  /**
   * 删除数据
   * @param {string} key - 存储键
   * @returns {Promise<{success: boolean}>}
   */
  async remove(key) {
    throw new Error('remove方法必须被实现');
  }

  /**
   * 列出匹配前缀的键
   * @param {string} prefix - 键前缀
   * @returns {Promise<string[]>}
   */
  async list(prefix = '') {
    throw new Error('list方法必须被实现');
  }

  /**
   * 获取存储使用情况
   * @returns {Promise<{used: number, quota: number, percentage: number}>}
   */
  async getUsage() {
    throw new Error('getUsage方法必须被实现');
  }

  /**
   * 初始化存储
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error('init方法必须被实现');
  }
}
