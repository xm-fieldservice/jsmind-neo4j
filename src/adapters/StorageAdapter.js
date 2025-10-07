/**
 * StorageAdapter.js - 统一存储适配器
 * 
 * 设计目标：
 * - 隐藏底层存储实现细节
 * - 提供业务专用的存储接口
 * - 统一数据验证和转换
 * - 简化业务组件的存储操作
 */

class StorageAdapter {
    constructor() {
        // 底层存储引擎
        this.storage = null;
        
        // 数据验证器
        this.validators = new Map();
        
        // 数据转换器
        this.transformers = new Map();
        
        // 初始化标志
        this.initialized = false;
        
        // 🆕 P1.3: JSON底座同步配置
        this.jsonBaseSyncEnabled = true;
        this.jsonBaseEndpoint = 'http://localhost:5001/api/sync-mindmap';
        this._syncDebounceTimer = null;
        this._lastSyncHash = null;
        
        console.log('[StorageAdapter] 存储适配器创建');
    }

    /**
     * 初始化存储适配器
     */
    async initialize() {
        if (this.initialized) {
            console.warn('[StorageAdapter] 已初始化，跳过');
            return;
        }

        // 获取底层存储引擎
        if (typeof window !== 'undefined' && window.AutogenUnifiedStorage) {
            this.storage = window.AutogenUnifiedStorage;
            console.log('[StorageAdapter] 使用 AutogenUnifiedStorage');
            
            // 等待AutogenUnifiedStorage初始化完成
            if (this.storage.indexedDB === undefined) {
                console.log('[StorageAdapter] 等待AutogenUnifiedStorage初始化...');
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } else {
            throw new Error('[StorageAdapter] AutogenUnifiedStorage 未找到');
        }

        // 注册默认验证器和转换器
        this._registerDefaultValidators();
        this._registerDefaultTransformers();

        this.initialized = true;
        console.log('[StorageAdapter] 初始化完成');
    }

    /**
     * 保存脑图数据
     * @param {Object} mindmapData - 脑图数据
     * @param {Object} options - 保存选项
     */
    async saveMindmap(mindmapData, options = {}) {
        this._ensureInitialized();

        // 数据验证
        const validated = await this._validateMindmapData(mindmapData);
        
        // 数据转换
        const transformed = this._transformToStorageFormat(validated, 'mindmap');
        
        // 存储
        const mindmapId = mindmapData.id || this._generateId();
        const result = await this.storage.store(
            'mindmap',
            mindmapId,
            transformed,
            options
        );

        // 🆕 P1.3: 自动同步到JSON底座
        if (this.jsonBaseSyncEnabled && !options.skipJsonBaseSync) {
            this._syncToJsonBase(mindmapId, transformed).catch(err => {
                console.warn('[StorageAdapter] JSON底座同步失败（不影响保存）:', err.message);
            });
        }

        console.log(`[StorageAdapter] 脑图 ${mindmapId} 保存成功`);
        return result;
    }

    /**
     * 加载脑图数据
     * @param {string} mindmapId - 脑图ID
     */
    async loadMindmap(mindmapId) {
        this._ensureInitialized();

        // 从存储加载
        const data = await this.storage.retrieve('mindmap', mindmapId);
        
        if (!data) {
            console.warn(`[StorageAdapter] 脑图 ${mindmapId} 不存在`);
            return null;
        }

        // 数据转换
        const transformed = this._transformFromStorageFormat(data, 'mindmap');
        
        console.log(`[StorageAdapter] 脑图 ${mindmapId} 加载成功`);
        return transformed;
    }

    /**
     * 删除脑图数据
     * @param {string} mindmapId - 脑图ID
     */
    async deleteMindmap(mindmapId) {
        this._ensureInitialized();

        const result = await this.storage.remove('mindmap', mindmapId);
        console.log(`[StorageAdapter] 脑图 ${mindmapId} 删除成功`);
        return result;
    }

    /**
     * 列出所有脑图键
     */
    async listMindmaps() {
        this._ensureInitialized();

        const keys = await this.storage.list('mindmap');
        console.log(`[StorageAdapter] 找到 ${keys.length} 个脑图`);
        return keys;
    }

    /**
     * 查询脑图列表
     * @param {Object} filter - 查询过滤条件
     */
    async queryMindmaps(filter = {}) {
        this._ensureInitialized();

        // 使用底层存储的查询功能
        const results = await this.storage.queryByType('mindmap', filter);
        
        // 批量转换
        const transformed = results.map(data => 
            this._transformFromStorageFormat(data, 'mindmap')
        );

        console.log(`[StorageAdapter] 查询到 ${transformed.length} 个脑图`);
        return transformed;
    }

    /**
     * 保存配置数据
     * @param {string} key - 配置键
     * @param {*} value - 配置值
     */
    async saveConfig(key, value) {
        this._ensureInitialized();

        const result = await this.storage.store('config', key, value);
        console.log(`[StorageAdapter] 配置 ${key} 保存成功`);
        return result;
    }

    /**
     * 加载配置数据
     * @param {string} key - 配置键
     * @param {*} defaultValue - 默认值
     */
    async loadConfig(key, defaultValue = null) {
        this._ensureInitialized();

        const value = await this.storage.retrieve('config', key);
        return value !== null ? value : defaultValue;
    }

    /**
     * 获取存储统计信息
     */
    async getStorageStats() {
        this._ensureInitialized();

        if (typeof this.storage.getStats === 'function') {
            return await this.storage.getStats();
        }

        return null;
    }

    /**
     * 批量保存数据
     * @param {string} type - 数据类型
     * @param {Array} items - 数据项数组
     */
    async batchStore(type, items) {
        this._ensureInitialized();

        const results = [];
        for (const item of items) {
            const result = await this.storage.store(type, item.id, item.data);
            results.push(result);
        }

        console.log(`[StorageAdapter] 批量保存 ${items.length} 项 ${type} 数据`);
        return results;
    }

    /**
     * 注册默认验证器
     */
    _registerDefaultValidators() {
        // 脑图数据验证器
        this.validators.set('mindmap', (data) => {
            if (!data) {
                throw new Error('[StorageAdapter] 脑图数据不能为空');
            }
            if (!data.meta || !data.meta.name) {
                throw new Error('[StorageAdapter] 脑图必须包含 meta.name');
            }
            if (!data.format || !data.data) {
                throw new Error('[StorageAdapter] 脑图必须包含 format 和 data');
            }
            return true;
        });
    }

    /**
     * 注册默认转换器
     */
    _registerDefaultTransformers() {
        // 脑图数据转换器（存储格式）
        this.transformers.set('mindmap_to_storage', (data) => {
            return {
                ...data,
                _storedAt: Date.now(),
                _version: '1.0'
            };
        });

        // 脑图数据转换器（业务格式）
        this.transformers.set('mindmap_from_storage', (data) => {
            const { _storedAt, _version, ...businessData } = data;
            return businessData;
        });
    }

    /**
     * 验证脑图数据
     */
    async _validateMindmapData(data) {
        const validator = this.validators.get('mindmap');
        if (validator) {
            validator(data);
        }
        return data;
    }

    /**
     * 转换为存储格式
     */
    _transformToStorageFormat(data, type) {
        const transformer = this.transformers.get(`${type}_to_storage`);
        return transformer ? transformer(data) : data;
    }

    /**
     * 转换为业务格式
     */
    _transformFromStorageFormat(data, type) {
        const transformer = this.transformers.get(`${type}_from_storage`);
        return transformer ? transformer(data) : data;
    }

    /**
     * 生成唯一ID
     */
    _generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 确保已初始化
     */
    _ensureInitialized() {
        if (!this.initialized) {
            throw new Error('[StorageAdapter] 存储适配器未初始化，请先调用 initialize()');
        }
    }

    /**
     * 🆕 P1.3: 同步到JSON底座
     * @param {string} mindmapId - 脑图ID
     * @param {Object} data - 脑图数据
     * @param {boolean} immediate - 是否立即同步
     */
    async _syncToJsonBase(mindmapId, data, immediate = false) {
        // 防抖机制
        if (!immediate) {
            clearTimeout(this._syncDebounceTimer);
            this._syncDebounceTimer = setTimeout(() => {
                this._syncToJsonBase(mindmapId, data, true);
            }, 2000);
            return { success: true, deferred: true };
        }

        try {
            // 检查数据变更
            const currentHash = this._calculateDataHash(data);
            if (currentHash === this._lastSyncHash) {
                return { success: true, skipped: true, reason: '数据未变更' };
            }

            // 构建同步数据
            const syncData = {
                id: mindmapId,
                name: (data.data && (data.data.topic || data.data.label)) || '未命名项目',
                data: data,
                last_modified: new Date().toISOString(),
                content_hash: currentHash
            };

            // 发送到JSON底座API
            const response = await fetch(this.jsonBaseEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(syncData)
            });

            if (response.ok) {
                this._lastSyncHash = currentHash;
                console.log(`[StorageAdapter] ✅ JSON底座同步成功: ${mindmapId}`);
                return { success: true, hash: currentHash };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            // 网络错误时静默处理，不影响本地保存
            console.warn(`[StorageAdapter] JSON底座同步异常: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🆕 P1.3: 批量同步到JSON底座
     * @param {Array} items - 数据项数组 [{id, data}, ...]
     */
    async batchSyncToJsonBase(items) {
        const results = {
            success: 0,
            failed: 0,
            total: items.length
        };

        for (const item of items) {
            try {
                const result = await this._syncToJsonBase(item.id, item.data, true);
                if (result.success) {
                    results.success++;
                } else {
                    results.failed++;
                }
            } catch (error) {
                results.failed++;
            }
        }

        console.log(`[StorageAdapter] 批量同步完成: ${results.success}/${results.total}`);
        return results;
    }

    /**
     * 计算数据哈希值
     * @private
     */
    _calculateDataHash(data) {
        try {
            const str = JSON.stringify(data);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString(16);
        } catch (error) {
            return 'hash_error_' + Date.now();
        }
    }
}

// 导出单例
if (typeof window !== 'undefined') {
    window.StorageAdapter = StorageAdapter;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageAdapter;
}
