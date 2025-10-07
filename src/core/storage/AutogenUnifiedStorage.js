/**
 * AutogenUnifiedStorage - 基于Autogen框架的统一存储管理器
 * 
 * 设计原则：
 * 1. 完全基于autogen内生机制（CacheStore模式）
 * 2. 统一四个StorageManager的核心功能
 * 3. 支持多层存储：内存缓存 -> LocalStorage -> IndexedDB
 * 4. 自动数据迁移和版本管理
 * 5. 智能清理和性能优化
 * 
 * 参考autogen _cache_store.py的设计模式
 */

// 防止重复定义（但允许重新初始化不完整的实例）
if (typeof window.AutogenUnifiedStorage !== 'undefined' && 
    typeof window.AutogenUnifiedStorage.retrieve === 'function' &&
    typeof window.AutogenUnifiedStorage.store === 'function') {
    console.warn('[AutogenUnifiedStorage] 完整实例已存在，跳过重复定义');
} else {
    if (typeof window.AutogenUnifiedStorage !== 'undefined') {
        console.warn('[AutogenUnifiedStorage] 发现不完整实例，重新初始化');
    }

class AutogenUnifiedStorage {
    constructor() {
        // 存储层级配置（参考autogen多层缓存）
        this.storageHierarchy = {
            MEMORY: 'memory',
            LOCAL_STORAGE: 'localStorage', 
            INDEXED_DB: 'indexedDB',
            JSON_BASE: 'jsonBase'  // JSON数据底座
        };
        
        // JSON数据底座配置
        this.jsonBaseConfig = {
            enabled: true,  // 是否启用JSON底座同步
            endpoint: '/api/data',  // API端点（未来实现）
            filePath: './data/nodes.json',  // JSON文件路径
            syncMode: 'auto',  // auto: 自动同步 | manual: 手动同步
            syncDelay: 1000,  // 同步延迟（毫秒，防抖）
            syncTypes: ['node']  // 需要同步到JSON底座的数据类型
        };
        
        // 数据类型配置
        this.dataTypes = {
            NODE: 'node',  // 节点数据（同步到JSON底座）
            MINDMAP: 'mindmap',
            PROJECT: 'project',
            RELATION: 'relation',
            APP_STATE: 'app_state',
            USER_PREFERENCES: 'user_preferences'
        };
        
        // TTL配置（毫秒）
        this.ttlConfig = {
            [this.dataTypes.NODE]: 3600000,         // 1小时
            [this.dataTypes.MINDMAP]: 1800000,      // 30分钟
            [this.dataTypes.PROJECT]: 3600000,      // 1小时
            [this.dataTypes.RELATION]: 300000,      // 5分钟
            [this.dataTypes.APP_STATE]: 86400000,   // 24小时
            [this.dataTypes.USER_PREFERENCES]: 604800000 // 7天
        };
        
        // 内存缓存（第一层，最快）
        this.memoryCache = new Map();
        
        // 存储统计（参考autogen统计机制）
        this.stats = {
            reads: 0,
            writes: 0,
            hits: { memory: 0, localStorage: 0, indexedDB: 0 },
            misses: 0,
            errors: 0,
            cleanups: 0,
            migrations: 0,
            jsonBaseSyncs: 0,
            jsonBaseSyncErrors: 0
        };
        
        // 数据版本管理
        this.currentVersion = '2.0.0';
        this.migrationChain = new Map();
        
        // 记录初始化时间
        this.initTime = Date.now();
        
        // 🆕 P1.2: 冷热数据管理器
        this.hotColdManager = null;
        
        // 🆕 本地文件备份配置
        this.backupConfig = {
            enabled: false,
            directoryHandle: null,  // 目录句柄（用户授权一次）
            interval: 5 * 60 * 1000,  // 5分钟自动备份
            lastBackupTime: 0,
            backupTimer: null
        };
        
        // 初始化
        this.initialize();
        
        console.log('[AutogenUnifiedStorage] 统一存储管理器初始化完成');
    }
    
    /**
     * 初始化存储系统
     */
    async initialize() {
        try {
            // 检查IndexedDB支持
            await this.initializeIndexedDB();
            
            // 🆕 P1.2: 初始化冷热数据管理器
            if (typeof window.HotColdDataManager !== 'undefined') {
                this.hotColdManager = new window.HotColdDataManager(this, {
                    hotThreshold: 10,
                    warmThreshold: 3,
                    coldThreshold: 3,
                    archiveToJsonBase: true
                });
                console.log('[AutogenUnifiedStorage] ✅ 冷热数据管理器已启用');
            }
            
            // 设置清理任务
            this.setupCleanupTasks();
            
            // 注册页面卸载处理
            this.registerUnloadHandlers();
            
            // 执行数据迁移
            await this.performMigrations();
            
            console.log('[AutogenUnifiedStorage] 初始化成功');
        } catch (error) {
            console.error('[AutogenUnifiedStorage] 初始化失败:', error);
        }
    }
    
    /**
     * 存储数据（统一接口）
     * @param {string} type - 数据类型
     * @param {string} key - 存储键
     * @param {*} data - 数据
     * @param {Object} options - 选项
     */
    async store(type, key, data, options = {}) {
        try {
            const storageKey = this.createStorageKey(type, key);
            const storageItem = this.createStorageItem(type, data, options);
            
            // 验证数据
            if (!this.validateData(type, data)) {
                throw new Error(`数据验证失败: ${type}:${key}`);
            }
            
            // 存储到内存缓存
            this.memoryCache.set(storageKey, storageItem);
            
            // 异步存储到持久层
            await this.persistToStorage(storageKey, storageItem);
            
            // JSON底座同步（自动判断是否需要同步）
            if (options.skipJsonBase !== true && this.jsonBaseConfig.syncTypes.includes(type)) {
                this.syncToJsonBase(type, key, data).catch(err => {
                    console.warn('[AutogenUnifiedStorage] JSON底座同步失败（异步）:', err);
                }); // 异步，不阻塞主流程
            }
            
            this.stats.writes++;
            console.log(`[AutogenUnifiedStorage] 存储成功: ${storageKey}`);
            
            return true;
        } catch (error) {
            this.stats.errors++;
            console.error(`[AutogenUnifiedStorage] 存储失败: ${type}:${key}`, error);
            return false;
        }
    }
    
    /**
     * 读取数据（多层级查找）
     * @param {string} type - 数据类型
     * @param {string} key - 存储键
     */
    async retrieve(type, key) {
        try {
            const storageKey = this.createStorageKey(type, key);
            this.stats.reads++;
            
            // 🆕 P1.2: 记录访问（用于冷热数据分层）
            if (this.hotColdManager) {
                this.hotColdManager.recordAccess(type, key);
            }
            
            // 第一层：内存缓存
            if (this.memoryCache.has(storageKey)) {
                const item = this.memoryCache.get(storageKey);
                if (!this.isExpired(item)) {
                    this.stats.hits.memory++;
                    console.log(`[AutogenUnifiedStorage] 内存缓存命中: ${storageKey}`);
                    return item.data;
                }
                // 过期则删除
                this.memoryCache.delete(storageKey);
            }
            
            // 第二层：LocalStorage
            const localItem = this.getFromLocalStorage(storageKey);
            if (localItem && !this.isExpired(localItem)) {
                // 回填内存缓存
                this.memoryCache.set(storageKey, localItem);
                this.stats.hits.localStorage++;
                console.log(`[AutogenUnifiedStorage] LocalStorage命中: ${storageKey}`);
                return localItem.data;
            }
            
            // 第三层：IndexedDB
            const indexedItem = await this.getFromIndexedDB(storageKey);
            if (indexedItem && !this.isExpired(indexedItem)) {
                // 回填上层缓存
                this.memoryCache.set(storageKey, indexedItem);
                this.setToLocalStorage(storageKey, indexedItem);
                this.stats.hits.indexedDB++;
                console.log(`[AutogenUnifiedStorage] IndexedDB命中: ${storageKey}`);
                return indexedItem.data;
            }
            
            // 🆕 P1.2: 第四层：尝试从JSON底座恢复
            if (this.hotColdManager) {
                const restored = await this.hotColdManager.restoreFromJsonBase(type, key);
                if (restored) {
                    console.log(`[AutogenUnifiedStorage] JSON底座命中: ${storageKey}`);
                    return restored;
                }
            }
            
            // 所有层级都未找到
            this.stats.misses++;
            return null;
            
        } catch (error) {
            this.stats.errors++;
            console.error(`[AutogenUnifiedStorage] 读取失败: ${type}:${key}`, error);
            return null;
        }
    }
    
    /**
     * 删除数据（所有层级）
     * @param {string} type - 数据类型
     * @param {string} key - 存储键
     */
    async remove(type, key) {
        try {
            const storageKey = this.createStorageKey(type, key);
            
            // 从所有层级删除
            this.memoryCache.delete(storageKey);
            this.removeFromLocalStorage(storageKey);
            await this.removeFromIndexedDB(storageKey);
            
            console.log(`[AutogenUnifiedStorage] 删除成功: ${storageKey}`);
            return true;
        } catch (error) {
            this.stats.errors++;
            console.error(`[AutogenUnifiedStorage] 删除失败: ${type}:${key}`, error);
            return false;
        }
    }
    
    /**
     * 列出指定类型的所有数据
     * @param {string} type - 数据类型
     */
    async list(type) {
        try {
            const prefix = `autogen:${type}:`;
            const items = [];
            
            // 合并所有层级的数据
            const allKeys = new Set();
            
            // 内存缓存
            for (const key of this.memoryCache.keys()) {
                if (key.startsWith(prefix)) {
                    allKeys.add(key);
                }
            }
            
            // LocalStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    allKeys.add(key);
                }
            }
            
            // IndexedDB
            const indexedKeys = await this.getIndexedDBKeys(prefix);
            indexedKeys.forEach(key => allKeys.add(key));
            
            // 获取所有数据
            for (const key of allKeys) {
                const keyParts = key.split(':');
                const itemKey = keyParts[keyParts.length - 1];
                const data = await this.retrieve(type, itemKey);
                
                if (data) {
                    items.push({
                        key: itemKey,
                        data: data,
                        type: type
                    });
                }
            }
            
            console.log(`[AutogenUnifiedStorage] 列出 ${type} 类型: ${items.length} 项`);
            return items;
            
        } catch (error) {
            console.error(`[AutogenUnifiedStorage] 列出失败: ${type}`, error);
            return [];
        }
    }
    
    /**
     * 创建存储键（统一格式）
     * @param {string} type - 数据类型
     * @param {string} key - 原始键
     */
    createStorageKey(type, key) {
        return `autogen:${type}:${key}`;
    }
    
    /**
     * 创建存储项（统一格式）
     * @param {string} type - 数据类型
     * @param {*} data - 数据
     * @param {Object} options - 选项
     */
    createStorageItem(type, data, options = {}) {
        const now = Date.now();
        return {
            type: type,
            data: data,
            metadata: {
                version: this.currentVersion,
                createdAt: now,
                updatedAt: now,
                ttl: options.ttl || this.ttlConfig[type] || 300000,
                ...options.metadata
            },
            _internal: {
                storageKey: options.storageKey,
                layer: 'unified'
            }
        };
    }
    
    /**
     * 验证数据
     * @param {string} type - 数据类型
     * @param {*} data - 数据
     */
    validateData(type, data) {
        if (data === null || data === undefined) {
            return false;
        }
        
        // 宽松的数据验证 - 只检查基本结构
        try {
            // 确保数据可以被JSON序列化
            JSON.stringify(data);
            return true;
        } catch (error) {
            console.warn(`[AutogenUnifiedStorage] 数据序列化失败: ${type}`, error);
            return false;
        }
    }
    
    /**
     * 检查数据是否过期
     * @param {Object} item - 存储项
     */
    isExpired(item) {
        if (!item.metadata) return true;
        const now = Date.now();
        const expireTime = item.metadata.createdAt + item.metadata.ttl;
        return now > expireTime;
    }
    
    /**
     * 持久化到存储层（事务性保存）
     * @param {string} key - 存储键
     * @param {Object} item - 存储项
     * @returns {Promise<Object>} 保存结果 {lsSuccess, idbSuccess, verified}
     */
    async persistToStorage(key, item) {
        const result = {
            lsSuccess: false,
            idbSuccess: false,
            verified: false
        };
        
        try {
            // 1. 同步保存到LocalStorage
            result.lsSuccess = this.setToLocalStorage(key, item);
            
            // 2. 异步保存到IndexedDB - 必须等待完成
            result.idbSuccess = await this.setToIndexedDB(key, item);
            
            // 3. 验证持久化（至少一个成功）
            if (!result.lsSuccess && !result.idbSuccess) {
                throw new Error(`持久化完全失败: ${key}`);
            }
            
            // 4. 验证数据可读性
            if (result.idbSuccess) {
                const verified = await this.getFromIndexedDB(key);
                result.verified = !!verified;
            } else if (result.lsSuccess) {
                const verified = this.getFromLocalStorage(key);
                result.verified = !!verified;
            }
            
            console.log(`[AutogenUnifiedStorage] 持久化完成: ${key}`, result);
            return result;
            
        } catch (error) {
            console.error(`[AutogenUnifiedStorage] 持久化失败: ${key}`, error);
            throw error;
        }
    }
    
    /**
     * LocalStorage操作
     */
    getFromLocalStorage(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn(`[AutogenUnifiedStorage] LocalStorage读取失败: ${key}`, error);
            return null;
        }
    }
    
    setToLocalStorage(key, item) {
        try {
            localStorage.setItem(key, JSON.stringify(item));
            return true;
        } catch (error) {
            console.warn(`[AutogenUnifiedStorage] LocalStorage写入失败: ${key}`, error);
            
            // 存储空间不足时，执行智能清理
            if (error.name === 'QuotaExceededError') {
                console.warn(`[AutogenUnifiedStorage] 配额超限，执行智能清理保持功能`);
                
                // 执行更激进的清理
                const cleanResult = this.smartCleanupForSpace(key, item);
                
                if (cleanResult.success) {
                    // 清理成功后重试
                    try {
                        localStorage.setItem(key, JSON.stringify(item));
                        console.log(`[AutogenUnifiedStorage] 清理后存储成功: ${key}`);
                        return true;
                    } catch (retryError) {
                        console.error(`[AutogenUnifiedStorage] 清理后仍失败: ${key}`, retryError);
                        return false;
                    }
                } else {
                    console.error(`[AutogenUnifiedStorage] 清理失败，无法保存: ${key}`);
                    return false;
                }
            }
            return false;
        }
    }
    
    removeFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn(`[AutogenUnifiedStorage] LocalStorage删除失败: ${key}`, error);
        }
    }
    
    /**
     * IndexedDB操作
     */
    async initializeIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AutogenUnifiedStorage', 1);
            
            request.onerror = () => {
                console.warn('[AutogenUnifiedStorage] IndexedDB不可用，将使用LocalStorage');
                this.indexedDBAvailable = false;
                resolve();
            };
            
            request.onsuccess = (event) => {
                this.indexedDB = event.target.result;
                this.indexedDBAvailable = true;
                console.log('[AutogenUnifiedStorage] IndexedDB初始化成功');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('storage')) {
                    db.createObjectStore('storage', { keyPath: 'key' });
                }
            };
        });
    }
    
    async getFromIndexedDB(key) {
        if (!this.indexedDBAvailable) return null;
        
        return new Promise((resolve) => {
            try {
                const transaction = this.indexedDB.transaction(['storage'], 'readonly');
                const store = transaction.objectStore('storage');
                const request = store.get(key);
                
                request.onsuccess = () => {
                    resolve(request.result ? request.result.item : null);
                };
                
                request.onerror = () => {
                    console.warn(`[AutogenUnifiedStorage] IndexedDB读取失败: ${key}`);
                    resolve(null);
                };
            } catch (error) {
                console.warn(`[AutogenUnifiedStorage] IndexedDB操作失败: ${key}`, error);
                resolve(null);
            }
        });
    }
    
    async setToIndexedDB(key, item) {
        if (!this.indexedDBAvailable) return;
        
        return new Promise((resolve) => {
            try {
                const transaction = this.indexedDB.transaction(['storage'], 'readwrite');
                const store = transaction.objectStore('storage');
                const request = store.put({ key: key, item: item });
                
                request.onsuccess = () => resolve(true);
                request.onerror = () => {
                    console.warn(`[AutogenUnifiedStorage] IndexedDB写入失败: ${key}`);
                    resolve(false);
                };
            } catch (error) {
                console.warn(`[AutogenUnifiedStorage] IndexedDB操作失败: ${key}`, error);
                resolve(false);
            }
        });
    }
    
    async removeFromIndexedDB(key) {
        if (!this.indexedDBAvailable) return;
        
        return new Promise((resolve) => {
            try {
                const transaction = this.indexedDB.transaction(['storage'], 'readwrite');
                const store = transaction.objectStore('storage');
                const request = store.delete(key);
                
                request.onsuccess = () => resolve(true);
                request.onerror = () => {
                    console.warn(`[AutogenUnifiedStorage] IndexedDB删除失败: ${key}`);
                    resolve(false);
                };
            } catch (error) {
                console.warn(`[AutogenUnifiedStorage] IndexedDB操作失败: ${key}`, error);
                resolve(false);
            }
        });
    }
    
    async getIndexedDBKeys(prefix) {
        if (!this.indexedDBAvailable) return [];
        
        return new Promise((resolve) => {
            try {
                const transaction = this.indexedDB.transaction(['storage'], 'readonly');
                const store = transaction.objectStore('storage');
                const request = store.getAllKeys();
                
                request.onsuccess = () => {
                    const keys = request.result.filter(key => key.startsWith(prefix));
                    resolve(keys);
                };
                
                request.onerror = () => {
                    console.warn('[AutogenUnifiedStorage] IndexedDB键列举失败');
                    resolve([]);
                };
            } catch (error) {
                console.warn('[AutogenUnifiedStorage] IndexedDB操作失败', error);
                resolve([]);
            }
        });
    }
    
    /**
     * 清理过期数据
     */
    cleanExpiredData() {
        let cleanedCount = 0;
        
        // 清理内存缓存
        for (const [key, item] of this.memoryCache.entries()) {
            if (this.isExpired(item)) {
                this.memoryCache.delete(key);
                cleanedCount++;
            }
        }
        
        // 清理LocalStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('autogen:')) {
                const item = this.getFromLocalStorage(key);
                if (item && this.isExpired(item)) {
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => {
            this.removeFromLocalStorage(key);
            cleanedCount++;
        });
        
        if (cleanedCount > 0) {
            this.stats.cleanups++;
        }
    }
    
    /**
     * 智能清理以腾出空间（保持功能优先）
     */
    smartCleanupForSpace(targetKey, targetItem) {
        console.warn('[AutogenUnifiedStorage] 执行智能清理以腾出空间...');
        
        const targetSize = JSON.stringify(targetItem).length;
        
        // 关键数据，绝对不能删除
        const criticalKeys = [
            'mindmap_data_v1',
            '__mind_full_cache_v1'
        ];
        
        // 如果要保存的就是关键数据，需要更激进的清理
        const isCriticalData = criticalKeys.some(critical => targetKey.includes(critical));
        
        let cleanedCount = 0;
        let freedSpace = 0;
        
        // 第一轮：清理内存缓存
        const cacheSize = this.memoryCache.size;
        this.memoryCache.clear();
        cleanedCount += cacheSize;
        
        // 第二轮：按优先级清理LocalStorage
        const cleanupPriorities = [
            // 优先级1：临时和测试数据
            {
                name: '临时数据',
                filter: (key) => key.includes('temp_') || key.includes('test_') || key.includes('debug_')
            },
            // 优先级2：缓存和快照数据  
            {
                name: '缓存数据',
                filter: (key) => key.includes('cache_') || key.includes('snapshot_') || key.includes('backup_')
            },
            // 优先级3：旧版本数据
            {
                name: '旧版本数据',
                filter: (key) => key.includes('_v0') || key.includes('_old') || key.includes('_migrated')
            },
            // 优先级4：非关键autogen数据
            {
                name: '非关键autogen数据',
                filter: (key) => key.startsWith('autogen:') && !criticalKeys.some(critical => key.includes(critical))
            }
        ];
        
        // 如果是关键数据，添加更激进的清理策略
        if (isCriticalData) {
            cleanupPriorities.push({
                name: '其他应用数据',
                filter: (key) => !key.startsWith('autogen:') && !criticalKeys.some(critical => key.includes(critical))
            });
        }
        
        // 执行分级清理
        for (const priority of cleanupPriorities) {
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && priority.filter(key)) {
                    keysToRemove.push(key);
                }
            }
            
            // 按大小排序，优先删除大文件
            keysToRemove.sort((a, b) => {
                const sizeA = (localStorage[a] || '').length;
                const sizeB = (localStorage[b] || '').length;
                return sizeB - sizeA;
            });
            
            // 删除文件直到有足够空间
            for (const key of keysToRemove) {
                try {
                    const itemSize = (localStorage[key] || '').length;
                    localStorage.removeItem(key);
                    cleanedCount++;
                    freedSpace += itemSize;
                    
                    // 检查是否已有足够空间
                    if (freedSpace >= targetSize * 1.2) { // 留20%缓冲
                        console.log(`[AutogenUnifiedStorage] ${priority.name}清理完成，释放${Math.round(freedSpace/1024)}KB`);
                        return {
                            success: true,
                            cleanedCount,
                            freedSpace,
                            strategy: priority.name
                        };
                    }
                } catch (error) {
                    // 忽略删除错误
                }
            }
            
            if (keysToRemove.length > 0) {
                console.log(`[AutogenUnifiedStorage] ${priority.name}清理: ${keysToRemove.length}项, 释放${Math.round(freedSpace/1024)}KB`);
            }
        }
        
        console.warn(`[AutogenUnifiedStorage] 智能清理完成: ${cleanedCount}项, 释放${Math.round(freedSpace/1024)}KB`);
        
        return {
            success: freedSpace >= targetSize,
            cleanedCount,
            freedSpace,
            strategy: 'complete'
        };
    }
    
    setupCleanupTasks() {
        // 每5分钟清理一次过期数据
        setInterval(() => {
            this.cleanExpiredData();
        }, 300000);
        
        console.log('[AutogenUnifiedStorage] 清理任务已设置');
    }
    
    /**
     * 注册页面卸载处理
     */
    registerUnloadHandlers() {
        window.addEventListener('beforeunload', () => {
            // 保存统计信息
            this.setToLocalStorage('autogen:system:stats', {
                type: 'system',
                data: this.stats,
                metadata: {
                    version: this.currentVersion,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    ttl: 86400000 // 24小时
                }
            });
        });
    }
    
    /**
     * 执行数据迁移
     */
    async performMigrations() {
        try {
            // 检查是否需要从旧存储系统迁移数据
            await this.migrateFromOldSystems();
            
            console.log('[AutogenUnifiedStorage] 数据迁移完成');
        } catch (error) {
            console.error('[AutogenUnifiedStorage] 数据迁移失败:', error);
        }
    }
    
    /**
     * 从旧存储系统迁移数据
     */
    async migrateFromOldSystems() {
        // 检查是否已经迁移过
        const migrationFlag = localStorage.getItem('autogen_migration_completed');
        if (migrationFlag) {
            console.log('[AutogenUnifiedStorage] 数据已迁移，跳过迁移流程');
            return;
        }
        
        console.log('[AutogenUnifiedStorage] 开始数据迁移流程');
        
        // 先清理一些空间
        await this.emergencyCleanup();
        
        const migrationTasks = [];
        
        // 迁移SimpleStorageManager数据
        migrationTasks.push(this.migrateSimpleStorage());
        
        // 迁移FormalStorageManager数据
        migrationTasks.push(this.migrateFormalStorage());
        
        // 迁移UnifiedStorageManager数据（最容易出问题的，先跳过）
        // migrationTasks.push(this.migrateUnifiedStorage());
        
        await Promise.all(migrationTasks);
        this.stats.migrations++;
        
        // 标记迁移完成
        try {
            localStorage.setItem('autogen_migration_completed', Date.now().toString());
        } catch (error) {
            console.warn('[AutogenUnifiedStorage] 无法设置迁移标记:', error);
        }
        
        console.log('[AutogenUnifiedStorage] 数据迁移流程完成');
    }
    
    async migrateSimpleStorage() {
        // 迁移mind:前缀的数据
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('mind:')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    const newKey = key.replace('mind:', '');
                    await this.store(this.dataTypes.MINDMAP, newKey, data.data || data);
                    
                    // 标记为已迁移，但不立即删除（安全考虑）
                    localStorage.setItem(`${key}_migrated`, 'true');
                } catch (error) {
                    console.warn(`[AutogenUnifiedStorage] 迁移失败: ${key}`, error);
                }
            }
        }
    }
    
    async migrateFormalStorage() {
        // 迁移reg:前缀的数据
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('reg:')) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (item._meta && item.data) {
                        await this.store(item._meta.type, item._meta.id, item.data);
                        localStorage.setItem(`${key}_migrated`, 'true');
                    }
                } catch (error) {
                    console.warn(`[AutogenUnifiedStorage] 迁移失败: ${key}`, error);
                }
            }
        }
    }
    
    async migrateUnifiedStorage() {
        // 迁移各种类型的缓存数据
        const prefixes = ['mindmap_', 'relation_', 'app_state_'];
        
        for (const prefix of prefixes) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        const type = prefix.replace('_', '');
                        const id = key.replace(prefix, '');
                        
                        await this.store(type, id, data.data || data);
                        localStorage.setItem(`${key}_migrated`, 'true');
                    } catch (error) {
                        console.warn(`[AutogenUnifiedStorage] 迁移失败: ${key}`, error);
                    }
                }
            }
        }
    }
    
    /**
     * 获取存储统计信息
     */
    getStats() {
        return {
            ...this.stats,
            memoryCache: {
                size: this.memoryCache.size,
                keys: Array.from(this.memoryCache.keys())
            },
            storage: {
                indexedDBAvailable: this.indexedDBAvailable,
                localStorageUsage: this.getLocalStorageUsage()
            },
            health: {
                healthy: this.stats.errors < 10,
                hitRate: this.calculateHitRate()
            }
        };
    }
    
    getLocalStorageUsage() {
        let totalSize = 0;
        let autogenSize = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            const size = (key.length + value.length) * 2; // UTF-16
            
            totalSize += size;
            if (key.startsWith('autogen:')) {
                autogenSize += size;
            }
        }
        
        return {
            total: totalSize,
            autogen: autogenSize,
            percentage: (totalSize / (5 * 1024 * 1024)) * 100 // 5MB限制
        };
    }
    
    calculateHitRate() {
        const totalHits = this.stats.hits.memory + this.stats.hits.localStorage + this.stats.hits.indexedDB;
        const totalRequests = totalHits + this.stats.misses;
        return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    }
    
    /**
     * 🆕 查询存储配额
     */
    async getStorageQuota() {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                
                const usage = estimate.usage || 0;
                const quota = estimate.quota || 0;
                
                return {
                    usage: usage,
                    quota: quota,
                    usageInMB: (usage / 1024 / 1024).toFixed(2),
                    usageInGB: (usage / 1024 / 1024 / 1024).toFixed(2),
                    quotaInMB: (quota / 1024 / 1024).toFixed(2),
                    quotaInGB: (quota / 1024 / 1024 / 1024).toFixed(2),
                    percentUsed: quota > 0 ? ((usage / quota) * 100).toFixed(2) : 0,
                    availableInGB: ((quota - usage) / 1024 / 1024 / 1024).toFixed(2),
                    supported: true
                };
            } catch (error) {
                console.error('[AutogenUnifiedStorage] 查询配额失败:', error);
                return { supported: false, error: error.message };
            }
        } else {
            console.warn('[AutogenUnifiedStorage] 浏览器不支持Storage API');
            return { supported: false, error: '浏览器不支持Storage API' };
        }
    }
    
    /**
     * 🆕 显示存储配额信息
     */
    async showStorageQuota() {
        const quota = await this.getStorageQuota();
        
        if (!quota.supported) {
            console.warn('[存储配额] 浏览器不支持查询配额');
            return;
        }
        
        console.log('╔════════════════════════════════════════╗');
        console.log('║       IndexedDB 存储配额信息           ║');
        console.log('╠════════════════════════════════════════╣');
        console.log(`║ 已使用: ${quota.usageInMB} MB (${quota.usageInGB} GB)`.padEnd(41) + '║');
        console.log(`║ 总配额: ${quota.quotaInGB} GB`.padEnd(41) + '║');
        console.log(`║ 使用率: ${quota.percentUsed}%`.padEnd(41) + '║');
        console.log(`║ 剩余: ${quota.availableInGB} GB`.padEnd(41) + '║');
        console.log('╚════════════════════════════════════════╝');
        
        return quota;
    }
    
    /**
     * JSON底座同步功能
     * @param {string} type - 数据类型
     * @param {string} key - 存储键
     * @param {*} data - 数据
     * @param {Object} options - 选项
     */
    async syncToJsonBase(type, key, data, options = {}) {
        try {
            // 检查是否有JSON底座API
            if (typeof window === 'undefined' || !window.fetch) {
                console.warn('[AutogenUnifiedStorage] JSON底座同步跳过：环境不支持');
                return;
            }
            
            const syncData = {
                type,
                key,
                data,
                timestamp: Date.now(),
                source: 'AutogenUnifiedStorage',
                version: this.currentVersion,
                metadata: {
                    storageKey: this.createStorageKey(type, key),
                    dataSize: JSON.stringify(data).length,
                    options: options
                }
            };
            
            // 使用统一API配置获取正确的同步URL
            const syncUrl = window.ApiConfig ? 
                window.ApiConfig.getJsonBaseSyncUrl() : 
                'http://127.0.0.1:5001/api/json-base/sync'; // 回退方案
            
            const response = await fetch(syncUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Storage-Source': 'AutogenUnifiedStorage'
                },
                body: JSON.stringify(syncData)
            });
            
            if (response.ok) {
                this.stats.jsonBaseSyncs++;
                console.log(`[AutogenUnifiedStorage] JSON底座同步成功: ${type}:${key}`);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
        } catch (error) {
            this.stats.jsonBaseSyncErrors++;
            console.warn(`[AutogenUnifiedStorage] JSON底座同步失败: ${type}:${key}`, error.message);
            
            // 降级：尝试使用现有的JSON底座同步机制
            try {
                if (window.mindmapController && window.mindmapController._syncToJsonBase) {
                    await window.mindmapController._syncToJsonBase(data, key);
                    this.stats.jsonBaseSyncs++;
                    console.log(`[AutogenUnifiedStorage] JSON底座降级同步成功: ${type}:${key}`);
                }
            } catch (fallbackError) {
                console.warn(`[AutogenUnifiedStorage] JSON底座降级同步也失败: ${type}:${key}`, fallbackError.message);
            }
        }
    }
    
    /**
     * 批量存储操作
     * @param {Array} operations - 操作数组 [{type, key, data, options}, ...]
     */
    async batchStore(operations) {
        const results = [];
        const startTime = Date.now();
        
        for (const op of operations) {
            try {
                const result = await this.store(op.type, op.key, op.data, op.options);
                results.push({ 
                    success: true, 
                    type: op.type,
                    key: op.key,
                    result 
                });
            } catch (error) {
                results.push({ 
                    success: false, 
                    type: op.type,
                    key: op.key,
                    error: error.message 
                });
            }
        }
        
        const duration = Date.now() - startTime;
        console.log(`[AutogenUnifiedStorage] 批量存储完成: ${operations.length}个操作，耗时${duration}ms`);
        
        return results;
    }
    
    /**
     * 批量读取操作
     * @param {Array} requests - 请求数组 [{type, key}, ...]
     */
    async batchRetrieve(requests) {
        const results = [];
        const startTime = Date.now();
        
        for (const req of requests) {
            try {
                const data = await this.retrieve(req.type, req.key);
                results.push({ 
                    success: true, 
                    type: req.type,
                    key: req.key,
                    data 
                });
            } catch (error) {
                results.push({ 
                    success: false, 
                    type: req.type,
                    key: req.key,
                    error: error.message 
                });
            }
        }
        
        const duration = Date.now() - startTime;
        console.log(`[AutogenUnifiedStorage] 批量读取完成: ${requests.length}个请求，耗时${duration}ms`);
        
        return results;
    }
    
    /**
     * 按类型查询所有数据
     * @param {string} type - 数据类型
     * @param {Object} filter - 过滤条件
     */
    async queryByType(type, filter = {}) {
        const results = [];
        const startTime = Date.now();
        
        // 从内存缓存查询
        for (const [cacheKey, item] of this.memoryCache) {
            if (cacheKey.startsWith(`${type}:`)) {
                if (this.matchesFilter(item.data, filter)) {
                    results.push({
                        key: cacheKey.replace(`${type}:`, ''),
                        data: item.data,
                        source: 'memory',
                        timestamp: item.timestamp
                    });
                }
            }
        }
        
        // 从localStorage查询（如果内存中没有）
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`autogen_${type}:`)) {
                    const cacheKey = key.replace('autogen_', '');
                    if (!this.memoryCache.has(cacheKey)) {
                        const raw = localStorage.getItem(key);
                        if (raw) {
                            const item = JSON.parse(raw);
                            if (this.matchesFilter(item.data, filter)) {
                                results.push({
                                    key: cacheKey.replace(`${type}:`, ''),
                                    data: item.data,
                                    source: 'localStorage',
                                    timestamp: item.timestamp
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.warn(`[AutogenUnifiedStorage] localStorage查询失败: ${type}`, error);
        }
        
        const duration = Date.now() - startTime;
        console.log(`[AutogenUnifiedStorage] 类型查询完成: ${type}，找到${results.length}条记录，耗时${duration}ms`);
        
        return results;
    }
    
    /**
     * 条件过滤匹配
     * @param {*} data - 数据
     * @param {Object} filter - 过滤条件
     */
    matchesFilter(data, filter) {
        for (const [key, value] of Object.entries(filter)) {
            if (data[key] !== value) return false;
        }
        return true;
    }
    
    /**
     * 获取详细性能报告
     */
    getPerformanceReport() {
        return {
            ...this.stats,
            cacheHitRate: this.calculateHitRate(),
            memoryUsage: this.memoryCache.size,
            jsonBaseSyncSuccessRate: this.stats.jsonBaseSyncs / (this.stats.jsonBaseSyncs + this.stats.jsonBaseSyncErrors || 1),
            errorRate: this.stats.errors / (this.stats.reads + this.stats.writes || 1),
            uptime: Date.now() - (this.initTime || Date.now())
        };
    }
    
    /**
     * 紧急清理方法 - 清理过期和无效数据
     */
    async emergencyCleanup() {
        console.log('[AutogenUnifiedStorage] 开始紧急清理');
        
        try {
            // 清理localStorage中的过期数据
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('temp_') || key.startsWith('cache_'))) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.warn('[AutogenUnifiedStorage] 清理localStorage项失败:', key, error);
                }
            });
            
            // 清理内存缓存
            if (this.cache) {
                this.cache.clear();
            }
            
            console.log(`[AutogenUnifiedStorage] ✅ 紧急清理完成，清理了${keysToRemove.length}个项目`);
            
        } catch (error) {
            console.error('[AutogenUnifiedStorage] 紧急清理失败:', error);
        }
    }
    
    // ==================== JSON数据底座同步方法 ====================
    
    /**
     * 同步数据到JSON数据底座
     * @param {string} type - 数据类型
     * @param {string} key - 数据键
     * @param {Object} data - 数据内容
     * @returns {Promise<boolean>} 是否同步成功
     */
    async syncToJsonBase(type, key, data) {
        // 检查是否启用JSON底座
        if (!this.jsonBaseConfig.enabled) {
            return true;
        }
        
        // 检查数据类型是否需要同步
        if (!this.jsonBaseConfig.syncTypes.includes(type)) {
            return true;
        }
        
        try {
            console.log(`[JSON数据底座] 开始同步: ${type}:${key}`);
            
            // 步骤1：检查节点是否存在
            const exists = await this.checkExistsInJsonBase(type, key);
            
            // 步骤2：加载现有数据底座
            const jsonBaseData = await this.loadJsonBase();
            
            // 步骤3：更新或新增节点
            if (exists) {
                // 更新现有节点
                const nodeIndex = jsonBaseData.nodes.findIndex(n => n.id === key);
                if (nodeIndex !== -1) {
                    jsonBaseData.nodes[nodeIndex] = {
                        ...data,
                        updated_at: new Date().toISOString()
                    };
                    console.log(`[JSON数据底座] 更新节点: ${key}`);
                }
            } else {
                // 新增节点
                jsonBaseData.nodes.push({
                    ...data,
                    id: key,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                console.log(`[JSON数据底座] 新增节点: ${key}`);
            }
            
            // 步骤4：更新元数据
            jsonBaseData.meta.updated_at = new Date().toISOString();
            jsonBaseData.meta.total_nodes = jsonBaseData.nodes.length;
            
            // 步骤5：重建索引
            this.rebuildJsonBaseIndexes(jsonBaseData);
            
            // 步骤6：保存到文件（通过API）
            await this.saveJsonBase(jsonBaseData);
            
            // 步骤7：触发事件
            if (window.AutogenEventBus) {
                window.AutogenEventBus.emit('jsonBase.synced', {
                    type: type,
                    key: key,
                    operation: exists ? 'update' : 'insert',
                    timestamp: Date.now()
                });
            }
            
            this.stats.jsonBaseSyncs++;
            console.log(`[JSON数据底座] 同步成功: ${key}`);
            return true;
            
        } catch (error) {
            this.stats.jsonBaseSyncErrors++;
            console.error(`[JSON数据底座] 同步失败:`, error);
            
            // 标记为待同步
            this.markForLaterSync(type, key, data);
            return false;
        }
    }
    
    /**
     * 检查节点是否存在于JSON数据底座
     * @param {string} type - 数据类型
     * @param {string} key - 数据键
     * @returns {Promise<boolean>} 是否存在
     */
    async checkExistsInJsonBase(type, key) {
        try {
            const jsonBaseData = await this.loadJsonBase();
            const exists = jsonBaseData.nodes.some(n => n.id === key);
            return exists;
        } catch (error) {
            console.warn(`[JSON数据底座] 检查失败，假定不存在:`, error);
            return false;
        }
    }
    
    /**
     * 加载JSON数据底座
     * @returns {Promise<Object>} JSON底座数据
     */
    async loadJsonBase() {
        try {
            // 方式1：尝试从API加载（未来实现）
            // const response = await fetch(this.jsonBaseConfig.endpoint);
            // if (response.ok) {
            //     return await response.json();
            // }
            
            // 方式2：从文件加载（当前实现）
            const response = await fetch(this.jsonBaseConfig.filePath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('[JSON数据底座] 加载失败:', error);
            // 返回空数据结构
            return {
                meta: {
                    version: "2.0",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    total_nodes: 0
                },
                nodes: [],
                indexes: {
                    by_tag: {},
                    by_date: {},
                    root_nodes: []
                }
            };
        }
    }
    
    /**
     * 保存JSON数据底座
     * @param {Object} data - JSON底座数据
     * @returns {Promise<boolean>} 是否保存成功
     */
    async saveJsonBase(data) {
        try {
            // 方式1：通过API保存（需要后端支持）
            const response = await fetch(this.jsonBaseConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`保存失败: HTTP ${response.status}`);
            }
            
            console.log('[JSON数据底座] 保存成功');
            return true;
            
        } catch (error) {
            console.warn('[JSON数据底座] API保存失败，数据已在内存中更新:', error);
            // 注意：浏览器无法直接写文件，需要后端API支持
            // 这里只是模拟，实际需要后端接口
            return false;
        }
    }
    
    /**
     * 重建JSON数据底座索引
     * @param {Object} jsonBaseData - JSON底座数据
     */
    rebuildJsonBaseIndexes(jsonBaseData) {
        // 清空现有索引
        jsonBaseData.indexes = {
            by_tag: {},
            by_date: {},
            root_nodes: []
        };
        
        // 遍历所有节点重建索引
        jsonBaseData.nodes.forEach(node => {
            // 按标签索引
            if (node.tags && Array.isArray(node.tags)) {
                node.tags.forEach(tag => {
                    if (!jsonBaseData.indexes.by_tag[tag]) {
                        jsonBaseData.indexes.by_tag[tag] = [];
                    }
                    if (!jsonBaseData.indexes.by_tag[tag].includes(node.id)) {
                        jsonBaseData.indexes.by_tag[tag].push(node.id);
                    }
                });
            }
            
            // 按日期索引
            if (node.created_at) {
                const date = node.created_at.split('T')[0];  // YYYY-MM-DD
                if (!jsonBaseData.indexes.by_date[date]) {
                    jsonBaseData.indexes.by_date[date] = [];
                }
                if (!jsonBaseData.indexes.by_date[date].includes(node.id)) {
                    jsonBaseData.indexes.by_date[date].push(node.id);
                }
            }
            
            // 根节点索引
            if (node.parent_id === null || node.parent_id === undefined) {
                if (!jsonBaseData.indexes.root_nodes.includes(node.id)) {
                    jsonBaseData.indexes.root_nodes.push(node.id);
                }
            }
        });
        
        console.log('[JSON数据底座] 索引重建完成');
    }
    
    /**
     * 标记数据待稍后同步（离线支持）
     * @param {string} type - 数据类型
     * @param {string} key - 数据键
     * @param {Object} data - 数据内容
     */
    markForLaterSync(type, key, data) {
        try {
            const pendingKey = 'pending_sync';
            let pending = this.retrieve('system', pendingKey) || [];
            
            // 检查是否已经在待同步列表中
            const existingIndex = pending.findIndex(
                item => item.type === type && item.key === key
            );
            
            if (existingIndex !== -1) {
                // 更新现有项
                pending[existingIndex] = {
                    type: type,
                    key: key,
                    data: data,
                    timestamp: Date.now()
                };
            } else {
                // 添加新项
                pending.push({
                    type: type,
                    key: key,
                    data: data,
                    timestamp: Date.now()
                });
            }
            
            this.store('system', pendingKey, pending, { skipJsonBase: true });
            console.log(`[JSON数据底座] 已标记待同步: ${type}:${key}`);
            
        } catch (error) {
            console.error('[JSON数据底座] 标记待同步失败:', error);
        }
    }
    
    /**
     * 从JSON数据底座读取节点
     * @param {string} type - 数据类型
     * @param {string} key - 数据键
     * @returns {Promise<Object|null>} 节点数据
     */
    async retrieveFromJsonBase(type, key) {
        try {
            const jsonBaseData = await this.loadJsonBase();
            const node = jsonBaseData.nodes.find(n => n.id === key);
            
            if (node) {
                console.log(`[JSON数据底座] 读取成功: ${type}:${key}`);
                return node;
            }
            
            return null;
            
        } catch (error) {
            console.error(`[JSON数据底座] 读取失败:`, error);
            return null;
        }
    }
    
    /**
     * 🆕 启用自动备份到本地文件
     * @param {number} interval - 备份间隔（毫秒）
     */
    async enableAutoBackup(interval = 5 * 60 * 1000) {
        // 请求目录访问权限
        try {
            if (!('showDirectoryPicker' in window)) {
                console.warn('[AutogenUnifiedStorage] 浏览器不支持目录选择API');
                alert('⚠️ 当前浏览器不支持自动备份功能\n\n建议使用：\n• Chrome 86+\n• Edge 86+');
                return false;
            }
            
            // 请求用户选择备份目录
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents'
            });
            
            // 验证写入权限
            const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
            if (permission !== 'granted') {
                console.warn('[AutogenUnifiedStorage] 用户拒绝目录写入权限');
                return false;
            }
            
            // 保存目录句柄
            this.backupConfig.directoryHandle = dirHandle;
            this.backupConfig.interval = interval;
            this.backupConfig.enabled = true;
            
            // 立即执行一次备份
            await this.backupToLocalFile();
            
            // 启动定时备份
            this.backupConfig.backupTimer = setInterval(() => {
                this.backupToLocalFile();
            }, interval);
            
            console.log(`[AutogenUnifiedStorage] ✅ 自动备份已启用，间隔: ${interval/1000}秒`);
            console.log(`[AutogenUnifiedStorage] 备份目录: ${dirHandle.name}`);
            
            return true;
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('[AutogenUnifiedStorage] 启用自动备份失败:', error);
            }
            return false;
        }
    }
    
    /**
     * 🆕 禁用自动备份
     */
    disableAutoBackup() {
        if (this.backupConfig.backupTimer) {
            clearInterval(this.backupConfig.backupTimer);
            this.backupConfig.backupTimer = null;
        }
        this.backupConfig.enabled = false;
        console.log('[AutogenUnifiedStorage] 自动备份已禁用');
    }
    
    /**
     * 🆕 备份IndexedDB到本地文件
     */
    async backupToLocalFile() {
        if (!this.backupConfig.directoryHandle) {
            console.warn('[AutogenUnifiedStorage] 未配置备份目录');
            return false;
        }
        
        try {
            // 1. 导出所有IndexedDB数据
            const allData = await this.exportAllData();
            
            // 2. 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `indexeddb_backup_${timestamp}.json`;
            
            // 3. 创建文件
            const fileHandle = await this.backupConfig.directoryHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            
            // 4. 写入数据
            const content = JSON.stringify(allData, null, 2);
            await writable.write(content);
            await writable.close();
            
            // 5. 更新备份时间
            this.backupConfig.lastBackupTime = Date.now();
            
            console.log(`[AutogenUnifiedStorage] ✅ 备份完成: ${filename}`);
            console.log(`[AutogenUnifiedStorage] 数据大小: ${(content.length / 1024).toFixed(2)} KB`);
            
            return true;
            
        } catch (error) {
            console.error('[AutogenUnifiedStorage] 备份失败:', error);
            return false;
        }
    }
    
    /**
     * 🆕 导出所有IndexedDB数据
     */
    async exportAllData() {
        if (!this.indexedDBAvailable) {
            return { error: 'IndexedDB不可用' };
        }
        
        return new Promise((resolve) => {
            try {
                const transaction = this.indexedDB.transaction(['storage'], 'readonly');
                const store = transaction.objectStore('storage');
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const allItems = request.result || [];
                    
                    // 组织数据结构
                    const exportData = {
                        exportTime: new Date().toISOString(),
                        version: this.currentVersion,
                        totalItems: allItems.length,
                        stats: this.getStats(),
                        data: {}
                    };
                    
                    // 按类型分组
                    allItems.forEach(record => {
                        const key = record.key;
                        const item = record.item;
                        
                        // 提取类型（从key中）
                        const typeMatch = key.match(/^([^:]+):/);
                        const type = typeMatch ? typeMatch[1] : 'unknown';
                        
                        if (!exportData.data[type]) {
                            exportData.data[type] = [];
                        }
                        
                        exportData.data[type].push({
                            key: key,
                            data: item.data,
                            timestamp: item.timestamp,
                            ttl: item.ttl,
                            version: item.version
                        });
                    });
                    
                    resolve(exportData);
                };
                
                request.onerror = () => {
                    console.error('[AutogenUnifiedStorage] 导出数据失败');
                    resolve({ error: '导出失败' });
                };
                
            } catch (error) {
                console.error('[AutogenUnifiedStorage] 导出数据异常:', error);
                resolve({ error: error.message });
            }
        });
    }
    
    /**
     * 🆕 从备份文件恢复数据
     */
    async restoreFromBackup(fileHandle) {
        try {
            const file = await fileHandle.getFile();
            const content = await file.text();
            const backupData = JSON.parse(content);
            
            if (!backupData.data) {
                throw new Error('备份文件格式错误');
            }
            
            let restoredCount = 0;
            
            // 恢复所有数据
            for (const [type, items] of Object.entries(backupData.data)) {
                for (const item of items) {
                    await this.store(type, item.key.replace(`${type}:`, ''), item.data, {
                        ttl: item.ttl
                    });
                    restoredCount++;
                }
            }
            
            console.log(`[AutogenUnifiedStorage] ✅ 恢复完成: ${restoredCount}条数据`);
            return { success: true, count: restoredCount };
            
        } catch (error) {
            console.error('[AutogenUnifiedStorage] 恢复失败:', error);
            return { success: false, error: error.message };
        }
    }
}

// 创建全局单例
window.AutogenUnifiedStorage = new AutogenUnifiedStorage();

// 兼容性导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutogenUnifiedStorage;
}

} // 结束防重复定义检查
