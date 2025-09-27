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

// 防止重复定义
if (typeof window.AutogenUnifiedStorage !== 'undefined') {
    console.warn('[AutogenUnifiedStorage] 已存在，跳过重复定义');
} else {

class AutogenUnifiedStorage {
    constructor() {
        // 存储层级配置（参考autogen多层缓存）
        this.storageHierarchy = {
            MEMORY: 'memory',
            LOCAL_STORAGE: 'localStorage', 
            INDEXED_DB: 'indexedDB'
        };
        
        // 数据类型配置
        this.dataTypes = {
            MINDMAP: 'mindmap',
            PROJECT: 'project',
            RELATION: 'relation',
            APP_STATE: 'app_state',
            USER_PREFERENCES: 'user_preferences'
        };
        
        // TTL配置（毫秒）
        this.ttlConfig = {
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
            
            // JSON底座同步（如果启用）
            if (options.syncToJsonBase !== false) {
                this.syncToJsonBase(type, key, data, options).catch(() => {}); // 异步，不阻塞主流程
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
     * 持久化到存储层
     * @param {string} key - 存储键
     * @param {Object} item - 存储项
     */
    async persistToStorage(key, item) {
        // 存储到LocalStorage
        this.setToLocalStorage(key, item);
        
        // 存储到IndexedDB
        await this.setToIndexedDB(key, item);
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
            
            // 尝试调用JSON底座API
            const response = await fetch('/api/json-base/sync', {
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
}

// 创建全局单例
window.AutogenUnifiedStorage = new AutogenUnifiedStorage();

// 兼容性导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutogenUnifiedStorage;
}

} // 结束防重复定义检查
