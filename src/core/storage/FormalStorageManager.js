/**
 * FormalStorageManager - 制式化存储管理器
 * 基于注册中心的标准化localStorage操作
 * 
 * 核心特性：
 * - 统一的CRUD接口
 * - 自动数据验证
 * - 版本控制和迁移
 * - 标准化存储格式
 */

/**
 * @typedef {Object} StorageItem
 * @property {Object} _meta - 元数据
 * @property {string} _meta.type - 存储类型
 * @property {string} _meta.id - 项目ID
 * @property {string} _meta.version - 数据版本
 * @property {string} _meta.storedAt - 存储时间
 * @property {string} _meta.lastAccess - 最后访问时间
 * @property {*} data - 实际数据
 */

class FormalStorageManager {
    constructor(registry) {
        if (!registry) {
            throw new Error('FormalStorageManager 需要 StorageRegistry 实例');
        }
        
        this.registry = registry;
        this.prefix = 'reg:'; // 注册式存储前缀
        this.stats = {
            reads: 0,
            writes: 0,
            errors: 0,
            migrations: 0
        };
        
        console.log('[FormalStorageManager] 制式化存储管理器初始化');
    }

    /**
     * 存储数据
     * @param {string} type - 存储类型
     * @param {string} id - 项目ID
     * @param {*} data - 要存储的数据
     * @param {Object} metadata - 额外元数据
     * @returns {StorageItem|null} - 存储项或null
     */
    store(type, id, data, metadata = {}) {
        try {
            // 检查类型是否已注册
            if (!this.registry.isRegistered(type)) {
                throw new Error(`存储类型 "${type}" 未注册`);
            }

            // 验证数据
            const validation = this.registry.validateData(type, data);
            if (!validation.valid) {
                throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
            }

            // 获取Schema配置
            const schema = this.registry.getSchema(type);
            const storageKey = this._createKey(type, id);
            
            // 构建标准化存储项
            const storageItem = {
                _meta: {
                    type,
                    id,
                    version: schema.version,
                    storedAt: new Date().toISOString(),
                    lastAccess: new Date().toISOString(),
                    ...metadata
                },
                data: this._deepClone(data) // 深拷贝避免引用问题
            };

            // 存储到localStorage
            localStorage.setItem(storageKey, JSON.stringify(storageItem));
            this.stats.writes++;

            console.log(`[FormalStorageManager] ✅ 存储成功: ${type}:${id}`);
            return storageItem;

        } catch (error) {
            this.stats.errors++;
            console.error(`[FormalStorageManager] 存储失败 ${type}:${id}:`, error);
            return null;
        }
    }

    /**
     * 检索数据
     * @param {string} type - 存储类型
     * @param {string} id - 项目ID
     * @returns {StorageItem|null} - 存储项或null
     */
    retrieve(type, id) {
        try {
            const storageKey = this._createKey(type, id);
            const raw = localStorage.getItem(storageKey);
            
            if (!raw) {
                return null;
            }

            let item = JSON.parse(raw);
            this.stats.reads++;

            // 更新最后访问时间
            item._meta.lastAccess = new Date().toISOString();
            localStorage.setItem(storageKey, JSON.stringify(item));

            // 检查是否需要迁移
            item = this._migrateIfNeeded(type, item);

            console.log(`[FormalStorageManager] ✅ 检索成功: ${type}:${id}`);
            return item;

        } catch (error) {
            this.stats.errors++;
            console.error(`[FormalStorageManager] 检索失败 ${type}:${id}:`, error);
            return null;
        }
    }

    /**
     * 检查项目是否存在
     * @param {string} type - 存储类型
     * @param {string} id - 项目ID
     * @returns {boolean} - 是否存在
     */
    exists(type, id) {
        try {
            const storageKey = this._createKey(type, id);
            return localStorage.getItem(storageKey) !== null;
        } catch (error) {
            console.error(`[FormalStorageManager] 检查存在性失败 ${type}:${id}:`, error);
            return false;
        }
    }

    /**
     * 删除数据
     * @param {string} type - 存储类型
     * @param {string} id - 项目ID
     * @returns {boolean} - 删除是否成功
     */
    remove(type, id) {
        try {
            const storageKey = this._createKey(type, id);
            
            if (!localStorage.getItem(storageKey)) {
                console.warn(`[FormalStorageManager] 项目不存在: ${type}:${id}`);
                return false;
            }

            localStorage.removeItem(storageKey);
            console.log(`[FormalStorageManager] ✅ 删除成功: ${type}:${id}`);
            return true;

        } catch (error) {
            this.stats.errors++;
            console.error(`[FormalStorageManager] 删除失败 ${type}:${id}:`, error);
            return false;
        }
    }

    /**
     * 列出指定类型的所有项目
     * @param {string} type - 存储类型
     * @returns {Array<Object>} - 项目列表 {id, meta}
     */
    list(type) {
        try {
            const prefix = this._createKey(type, '');
            const items = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    try {
                        const raw = localStorage.getItem(key);
                        const item = JSON.parse(raw);
                        
                        items.push({
                            id: item._meta.id,
                            meta: item._meta
                        });
                    } catch (parseError) {
                        console.warn(`[FormalStorageManager] 解析项目失败: ${key}`, parseError);
                    }
                }
            }

            console.log(`[FormalStorageManager] ✅ 列出 ${type} 类型项目: ${items.length} 个`);
            return items;

        } catch (error) {
            console.error(`[FormalStorageManager] 列出项目失败 ${type}:`, error);
            return [];
        }
    }

    /**
     * 清理指定类型的所有数据
     * @param {string} type - 存储类型
     * @returns {number} - 清理的项目数量
     */
    clearType(type) {
        try {
            const prefix = this._createKey(type, '');
            const keysToRemove = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }

            for (const key of keysToRemove) {
                localStorage.removeItem(key);
            }

            console.log(`[FormalStorageManager] ✅ 清理 ${type} 类型: ${keysToRemove.length} 个项目`);
            return keysToRemove.length;

        } catch (error) {
            console.error(`[FormalStorageManager] 清理类型失败 ${type}:`, error);
            return 0;
        }
    }

    /**
     * 获取存储统计信息
     * @returns {Object} - 统计信息
     */
    getStats() {
        const typeStats = {};
        const registeredTypes = this.registry.listTypes();

        for (const type of registeredTypes) {
            const items = this.list(type);
            typeStats[type] = {
                count: items.length,
                totalSize: this._calculateTypeSize(type),
                oldestItem: this._getOldestItem(items),
                newestItem: this._getNewestItem(items)
            };
        }

        return {
            ...this.stats,
            types: typeStats,
            totalTypes: registeredTypes.length,
            healthy: this.stats.errors < 10
        };
    }

    /**
     * 数据迁移（如果需要）
     * @private
     */
    _migrateIfNeeded(type, item) {
        const schema = this.registry.getSchema(type);
        if (!schema || item._meta.version === schema.version) {
            return item; // 无需迁移
        }

        console.log(`[FormalStorageManager] 开始迁移 ${type}:${item._meta.id} 从 ${item._meta.version} 到 ${schema.version}`);

        try {
            let migratedItem = this._deepClone(item);

            // 执行迁移链
            for (const migration of schema.migrations) {
                if (migration.from === migratedItem._meta.version) {
                    migratedItem = migration.transform(migratedItem);
                    migratedItem._meta.version = migration.to;
                    migratedItem._meta.migratedAt = new Date().toISOString();
                    
                    console.log(`[FormalStorageManager] 迁移步骤: ${migration.from} -> ${migration.to}`);
                }
            }

            // 保存迁移后的数据
            if (migratedItem._meta.version === schema.version) {
                const storageKey = this._createKey(type, item._meta.id);
                localStorage.setItem(storageKey, JSON.stringify(migratedItem));
                this.stats.migrations++;
                
                console.log(`[FormalStorageManager] ✅ 迁移完成: ${type}:${item._meta.id}`);
            }

            return migratedItem;

        } catch (error) {
            console.error(`[FormalStorageManager] 迁移失败 ${type}:${item._meta.id}:`, error);
            return item; // 返回原始数据
        }
    }

    /**
     * 生成存储键
     * @private
     */
    _createKey(type, id) {
        return `${this.prefix}${type}:${id}`;
    }

    /**
     * 深拷贝对象
     * @private
     */
    _deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * 计算类型的存储大小
     * @private
     */
    _calculateTypeSize(type) {
        const prefix = this._createKey(type, '');
        let totalSize = 0;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                const value = localStorage.getItem(key);
                totalSize += (key.length + (value ? value.length : 0)) * 2; // UTF-16编码
            }
        }

        return totalSize;
    }

    /**
     * 获取最旧的项目
     * @private
     */
    _getOldestItem(items) {
        if (items.length === 0) return null;
        
        return items.reduce((oldest, current) => {
            return new Date(current.meta.storedAt) < new Date(oldest.meta.storedAt) ? current : oldest;
        });
    }

    /**
     * 获取最新的项目
     * @private
     */
    _getNewestItem(items) {
        if (items.length === 0) return null;
        
        return items.reduce((newest, current) => {
            return new Date(current.meta.storedAt) > new Date(newest.meta.storedAt) ? current : newest;
        });
    }
}

// 导出
export default FormalStorageManager;
