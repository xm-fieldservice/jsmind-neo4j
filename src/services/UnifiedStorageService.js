/**
 * 程序员 - P1.2 统一存储服务
 * 
 * 基于P0成功经验，整合多套存储系统
 * 提供统一的存储操作接口，简化存储调用
 */

class UnifiedStorageService {
    constructor(dependencyContainer = null) {
        // 优先使用ModuleManager，回退到DependencyContainer
        this.container = dependencyContainer || window.ModuleManager || window.GlobalDependencyContainer;
        this.primaryStorage = null;
        this.fallbackStorage = null;
        this.initialized = false;
        
        // 存储操作统计
        this.stats = {
            operations: 0,
            successes: 0,
            failures: 0,
            cacheHits: 0
        };
        
        // 简单缓存
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟
        
        console.log('[UnifiedStorageService] 统一存储服务初始化');
    }
    
    /**
     * 初始化存储服务
     */
    async initialize() {
        try {
            // 主存储：AutogenUnifiedStorage
            this.primaryStorage = this.container ? 
                this.container.resolve('storage') : 
                window.AutogenUnifiedStorage;
                
            if (!this.primaryStorage) {
                throw new Error('主存储系统不可用');
            }
            
            // 备用存储：localStorage包装器
            this.fallbackStorage = {
                store: async (type, key, data) => {
                    try {
                        const fullKey = `${type}:${key}`;
                        localStorage.setItem(fullKey, JSON.stringify(data));
                        return { success: true };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                },
                retrieve: async (type, key) => {
                    try {
                        const fullKey = `${type}:${key}`;
                        const data = localStorage.getItem(fullKey);
                        return data ? JSON.parse(data) : null;
                    } catch (error) {
                        return null;
                    }
                },
                remove: async (type, key) => {
                    try {
                        const fullKey = `${type}:${key}`;
                        localStorage.removeItem(fullKey);
                        return { success: true };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }
            };
            
            this.initialized = true;
            console.log('[UnifiedStorageService] ✅ 统一存储服务初始化完成');
            
        } catch (error) {
            console.error('[UnifiedStorageService] 初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 存储数据
     */
    async store(type, key, data, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        this.stats.operations++;
        const cacheKey = `${type}:${key}`;
        
        try {
            // 1. 尝试主存储
            const result = await this.primaryStorage.store(type, key, data);
            
            if (result && result.success) {
                // 更新缓存
                this.cache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
                
                this.stats.successes++;
                console.log(`[UnifiedStorageService] ✅ 主存储成功: ${cacheKey}`);
                return result;
            }
            
            // 2. 主存储失败，尝试备用存储
            console.warn(`[UnifiedStorageService] 主存储失败，使用备用存储: ${cacheKey}`);
            const fallbackResult = await this.fallbackStorage.store(type, key, data);
            
            if (fallbackResult.success) {
                this.stats.successes++;
                return fallbackResult;
            }
            
            throw new Error('主存储和备用存储都失败');
            
        } catch (error) {
            this.stats.failures++;
            console.error(`[UnifiedStorageService] 存储失败: ${cacheKey}`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 检索数据
     */
    async retrieve(type, key, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        this.stats.operations++;
        const cacheKey = `${type}:${key}`;
        
        try {
            // 1. 检查缓存
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                const age = Date.now() - cached.timestamp;
                
                if (age < this.cacheTimeout) {
                    this.stats.cacheHits++;
                    console.log(`[UnifiedStorageService] 🎯 缓存命中: ${cacheKey}`);
                    return cached.data;
                } else {
                    // 缓存过期
                    this.cache.delete(cacheKey);
                }
            }
            
            // 2. 尝试主存储
            const data = await this.primaryStorage.retrieve(type, key);
            
            if (data !== null && data !== undefined) {
                // 更新缓存
                this.cache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });
                
                this.stats.successes++;
                console.log(`[UnifiedStorageService] ✅ 主存储检索成功: ${cacheKey}`);
                return data;
            }
            
            // 3. 主存储无数据，尝试备用存储
            const fallbackData = await this.fallbackStorage.retrieve(type, key);
            
            if (fallbackData !== null) {
                this.stats.successes++;
                console.log(`[UnifiedStorageService] ✅ 备用存储检索成功: ${cacheKey}`);
                return fallbackData;
            }
            
            // 4. 都没有数据
            console.log(`[UnifiedStorageService] 未找到数据: ${cacheKey}`);
            return null;
            
        } catch (error) {
            this.stats.failures++;
            console.error(`[UnifiedStorageService] 检索失败: ${cacheKey}`, error);
            return null;
        }
    }
    
    /**
     * 删除数据
     */
    async remove(type, key) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        this.stats.operations++;
        const cacheKey = `${type}:${key}`;
        
        try {
            // 清除缓存
            this.cache.delete(cacheKey);
            
            // 1. 尝试主存储删除
            const result = await this.primaryStorage.remove(type, key);
            
            // 2. 同时尝试备用存储删除（确保彻底清理）
            await this.fallbackStorage.remove(type, key);
            
            this.stats.successes++;
            console.log(`[UnifiedStorageService] ✅ 删除成功: ${cacheKey}`);
            return result;
            
        } catch (error) {
            this.stats.failures++;
            console.error(`[UnifiedStorageService] 删除失败: ${cacheKey}`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 列出键
     */
    async list(type) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            // 优先使用主存储的列表功能
            if (this.primaryStorage.list) {
                return await this.primaryStorage.list(type);
            }
            
            // 备用：从localStorage扫描
            const keys = [];
            const prefix = `${type}:`;
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keys.push(key.substring(prefix.length));
                }
            }
            
            return keys;
            
        } catch (error) {
            console.error(`[UnifiedStorageService] 列表获取失败: ${type}`, error);
            return [];
        }
    }
    
    /**
     * 清理缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('[UnifiedStorageService] 缓存已清理');
    }
    
    /**
     * 获取服务状态
     */
    getStatus() {
        return {
            initialized: this.initialized,
            primaryStorage: !!this.primaryStorage,
            fallbackStorage: !!this.fallbackStorage,
            cacheSize: this.cache.size,
            stats: { ...this.stats }
        };
    }
    
    /**
     * 批量操作
     */
    async batchStore(operations) {
        const results = [];
        
        for (const op of operations) {
            const result = await this.store(op.type, op.key, op.data, op.options);
            results.push({
                key: `${op.type}:${op.key}`,
                success: result.success,
                error: result.error
            });
        }
        
        return results;
    }
    
    /**
     * 批量检索
     */
    async batchRetrieve(operations) {
        const results = {};
        
        for (const op of operations) {
            const data = await this.retrieve(op.type, op.key, op.options);
            results[`${op.type}:${op.key}`] = data;
        }
        
        return results;
    }
}

// 全局导出
window.UnifiedStorageService = UnifiedStorageService;

console.log('[UnifiedStorageService] 统一存储服务类已加载');
