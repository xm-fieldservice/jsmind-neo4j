/**
 * HotColdDataManager.js - 冷热数据分层管理器
 * 
 * 设计目标：
 * - 基于访问频率自动识别冷热数据
 * - 热数据优先保留在内存和LocalStorage
 * - 冷数据自动迁移到IndexedDB或JSON底座
 * - 支持AI应用场景的大规模数据管理
 * 
 * 参考用户需求：AI应用需要庞大的基础数据支持，需要冷热数据分层存储方案
 */

class HotColdDataManager {
    constructor(storage, options = {}) {
        // 底层存储引擎
        this.storage = storage;
        
        // 配置参数
        this.config = {
            // 热数据阈值：访问次数 >= 10次
            hotThreshold: options.hotThreshold || 10,
            
            // 温数据阈值：访问次数 >= 3次
            warmThreshold: options.warmThreshold || 3,
            
            // 冷数据阈值：访问次数 < 3次
            coldThreshold: options.coldThreshold || 3,
            
            // 时间窗口：7天内的访问统计
            timeWindow: options.timeWindow || 7 * 24 * 60 * 60 * 1000,
            
            // 自动迁移间隔：每小时检查一次
            migrationInterval: options.migrationInterval || 60 * 60 * 1000,
            
            // 冷数据归档到JSON底座
            archiveToJsonBase: options.archiveToJsonBase !== false,
            
            // JSON底座端点
            jsonBaseEndpoint: options.jsonBaseEndpoint || 'http://localhost:5001/api/archive',
            
            // 内存缓存最大容量（条目数）
            memoryCacheMaxSize: options.memoryCacheMaxSize || 100,
            
            // LocalStorage最大容量（条目数）
            localStorageMaxSize: options.localStorageMaxSize || 500
        };
        
        // 访问统计数据
        this.accessStats = new Map(); // key -> { count, lastAccess, firstAccess, temperature }
        
        // 数据温度枚举
        this.Temperature = {
            HOT: 'hot',       // 热数据：高频访问
            WARM: 'warm',     // 温数据：中频访问
            COLD: 'cold',     // 冷数据：低频访问
            FROZEN: 'frozen'  // 冻结数据：已归档到JSON底座
        };
        
        // 统计信息
        this.stats = {
            totalAccess: 0,
            hotData: 0,
            warmData: 0,
            coldData: 0,
            frozenData: 0,
            migrations: 0,
            archives: 0,
            lastMigration: null,
            lastArchive: null
        };
        
        // 自动迁移定时器
        this.migrationTimer = null;
        
        // 初始化
        this.initialize();
        
        console.log('[HotColdDataManager] 冷热数据分层管理器初始化完成');
    }
    
    /**
     * 初始化管理器
     */
    initialize() {
        // 加载访问统计数据
        this.loadAccessStats();
        
        // 启动自动迁移任务
        this.startAutoMigration();
        
        // 注册页面卸载处理
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.saveAccessStats();
            });
        }
    }
    
    /**
     * 记录数据访问
     * @param {string} type - 数据类型
     * @param {string} key - 数据键
     */
    recordAccess(type, key) {
        const fullKey = `${type}:${key}`;
        const now = Date.now();
        
        if (!this.accessStats.has(fullKey)) {
            this.accessStats.set(fullKey, {
                count: 0,
                firstAccess: now,
                lastAccess: now,
                temperature: this.Temperature.COLD,
                type: type,
                key: key
            });
        }
        
        const stats = this.accessStats.get(fullKey);
        stats.count++;
        stats.lastAccess = now;
        
        // 更新温度
        stats.temperature = this.calculateTemperature(stats);
        
        // 更新全局统计
        this.stats.totalAccess++;
        
        // 每100次访问保存一次统计数据
        if (this.stats.totalAccess % 100 === 0) {
            this.saveAccessStats();
        }
        
        console.log(`[HotColdDataManager] 访问记录: ${fullKey}, 次数: ${stats.count}, 温度: ${stats.temperature}`);
    }
    
    /**
     * 计算数据温度
     * @param {Object} stats - 访问统计
     * @returns {string} 温度等级
     */
    calculateTemperature(stats) {
        const now = Date.now();
        const age = now - stats.firstAccess;
        
        // 时间窗口内的访问频率
        const frequency = age > 0 ? (stats.count / age) * this.config.timeWindow : stats.count;
        
        // 基于访问次数和频率综合判断
        if (stats.count >= this.config.hotThreshold || frequency >= 10) {
            return this.Temperature.HOT;
        } else if (stats.count >= this.config.warmThreshold || frequency >= 3) {
            return this.Temperature.WARM;
        } else {
            return this.Temperature.COLD;
        }
    }
    
    /**
     * 获取数据温度
     * @param {string} type - 数据类型
     * @param {string} key - 数据键
     * @returns {string} 温度等级
     */
    getDataTemperature(type, key) {
        const fullKey = `${type}:${key}`;
        const stats = this.accessStats.get(fullKey);
        
        if (!stats) {
            return this.Temperature.COLD;
        }
        
        return stats.temperature;
    }
    
    /**
     * 获取所有数据的温度分布
     * @returns {Object} 温度分布统计
     */
    getTemperatureDistribution() {
        const distribution = {
            hot: [],
            warm: [],
            cold: [],
            frozen: []
        };
        
        for (const [fullKey, stats] of this.accessStats.entries()) {
            distribution[stats.temperature].push({
                fullKey,
                type: stats.type,
                key: stats.key,
                count: stats.count,
                lastAccess: stats.lastAccess
            });
        }
        
        // 更新统计
        this.stats.hotData = distribution.hot.length;
        this.stats.warmData = distribution.warm.length;
        this.stats.coldData = distribution.cold.length;
        this.stats.frozenData = distribution.frozen.length;
        
        return distribution;
    }
    
    /**
     * 自动迁移冷数据
     * @returns {Object} 迁移结果
     */
    async migrateColdData() {
        console.log('[HotColdDataManager] 开始自动迁移冷数据...');
        
        const distribution = this.getTemperatureDistribution();
        const results = {
            success: 0,
            failed: 0,
            skipped: 0,
            details: []
        };
        
        try {
            // 1. 热数据：保留在内存缓存
            for (const item of distribution.hot) {
                // 热数据已经在内存中，无需操作
                results.skipped++;
            }
            
            // 2. 温数据：保留在LocalStorage
            for (const item of distribution.warm) {
                // 温数据保留在LocalStorage，无需迁移
                results.skipped++;
            }
            
            // 3. 冷数据：迁移到IndexedDB
            for (const item of distribution.cold) {
                try {
                    // 从内存和LocalStorage中移除，保留在IndexedDB
                    await this.migrateToIndexedDB(item.type, item.key);
                    results.success++;
                    results.details.push({
                        key: item.fullKey,
                        action: 'migrated_to_indexeddb',
                        success: true
                    });
                } catch (error) {
                    results.failed++;
                    results.details.push({
                        key: item.fullKey,
                        action: 'migrate_failed',
                        error: error.message
                    });
                }
            }
            
            // 4. 检查是否需要归档到JSON底座
            if (this.config.archiveToJsonBase) {
                const oldColdData = distribution.cold.filter(item => {
                    const age = Date.now() - item.lastAccess;
                    return age > this.config.timeWindow * 2; // 超过2个时间窗口未访问
                });
                
                for (const item of oldColdData) {
                    try {
                        await this.archiveToJsonBase(item.type, item.key);
                        results.success++;
                        results.details.push({
                            key: item.fullKey,
                            action: 'archived_to_json_base',
                            success: true
                        });
                    } catch (error) {
                        results.failed++;
                        results.details.push({
                            key: item.fullKey,
                            action: 'archive_failed',
                            error: error.message
                        });
                    }
                }
            }
            
            // 更新统计
            this.stats.migrations++;
            this.stats.lastMigration = new Date().toISOString();
            
            console.log(`[HotColdDataManager] 迁移完成: 成功${results.success}, 失败${results.failed}, 跳过${results.skipped}`);
            
        } catch (error) {
            console.error('[HotColdDataManager] 迁移过程出错:', error);
        }
        
        return results;
    }
    
    /**
     * 迁移数据到IndexedDB
     * @param {string} type - 数据类型
     * @param {string} key - 数据键
     */
    async migrateToIndexedDB(type, key) {
        if (!this.storage) {
            throw new Error('存储引擎不可用');
        }
        
        // 从内存缓存中移除
        const storageKey = this.storage.createStorageKey(type, key);
        if (this.storage.memoryCache && this.storage.memoryCache.has(storageKey)) {
            this.storage.memoryCache.delete(storageKey);
            console.log(`[HotColdDataManager] 从内存缓存移除: ${storageKey}`);
        }
        
        // 从LocalStorage中移除（数据仍保留在IndexedDB）
        if (this.storage.removeFromLocalStorage) {
            this.storage.removeFromLocalStorage(storageKey);
            console.log(`[HotColdDataManager] 从LocalStorage移除: ${storageKey}`);
        }
        
        // 数据已经在IndexedDB中，无需额外操作
    }
    
    /**
     * 归档数据到JSON底座
     * @param {string} type - 数据类型
     * @param {string} key - 数据键
     */
    async archiveToJsonBase(type, key) {
        if (!this.storage) {
            throw new Error('存储引擎不可用');
        }
        
        try {
            // 1. 从存储中读取数据
            const data = await this.storage.retrieve(type, key);
            if (!data) {
                console.warn(`[HotColdDataManager] 数据不存在，跳过归档: ${type}:${key}`);
                return;
            }
            
            // 2. 构建归档数据
            const archiveData = {
                type: type,
                key: key,
                data: data,
                archivedAt: new Date().toISOString(),
                accessStats: this.accessStats.get(`${type}:${key}`)
            };
            
            // 3. 发送到JSON底座
            const response = await fetch(this.config.jsonBaseEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(archiveData)
            });
            
            if (response.ok) {
                console.log(`[HotColdDataManager] ✅ 归档成功: ${type}:${key}`);
                
                // 4. 更新温度为FROZEN
                const stats = this.accessStats.get(`${type}:${key}`);
                if (stats) {
                    stats.temperature = this.Temperature.FROZEN;
                }
                
                // 5. 从本地存储中删除（已归档到JSON底座）
                await this.storage.remove(type, key);
                
                // 更新统计
                this.stats.archives++;
                this.stats.lastArchive = new Date().toISOString();
                
            } else {
                throw new Error(`归档失败: HTTP ${response.status}`);
            }
            
        } catch (error) {
            // 网络错误时不影响本地数据
            console.warn(`[HotColdDataManager] 归档失败（数据保留在本地）: ${type}:${key}`, error.message);
            throw error;
        }
    }
    
    /**
     * 从JSON底座恢复数据
     * @param {string} type - 数据类型
     * @param {string} key - 数据键
     * @returns {*} 恢复的数据
     */
    async restoreFromJsonBase(type, key) {
        try {
            const response = await fetch(`${this.config.jsonBaseEndpoint}/${type}/${key}`);
            
            if (response.ok) {
                const archiveData = await response.json();
                
                // 恢复到本地存储
                await this.storage.store(type, key, archiveData.data);
                
                // 更新访问统计
                this.recordAccess(type, key);
                
                console.log(`[HotColdDataManager] ✅ 从JSON底座恢复: ${type}:${key}`);
                return archiveData.data;
            } else {
                throw new Error(`恢复失败: HTTP ${response.status}`);
            }
        } catch (error) {
            console.error(`[HotColdDataManager] 从JSON底座恢复失败: ${type}:${key}`, error);
            return null;
        }
    }
    
    /**
     * 启动自动迁移任务
     */
    startAutoMigration() {
        if (this.migrationTimer) {
            clearInterval(this.migrationTimer);
        }
        
        this.migrationTimer = setInterval(() => {
            this.migrateColdData().catch(err => {
                console.error('[HotColdDataManager] 自动迁移失败:', err);
            });
        }, this.config.migrationInterval);
        
        console.log(`[HotColdDataManager] 自动迁移任务已启动，间隔: ${this.config.migrationInterval / 1000}秒`);
    }
    
    /**
     * 停止自动迁移任务
     */
    stopAutoMigration() {
        if (this.migrationTimer) {
            clearInterval(this.migrationTimer);
            this.migrationTimer = null;
            console.log('[HotColdDataManager] 自动迁移任务已停止');
        }
    }
    
    /**
     * 保存访问统计数据
     */
    saveAccessStats() {
        try {
            const statsData = {
                accessStats: Array.from(this.accessStats.entries()),
                stats: this.stats,
                savedAt: Date.now()
            };
            
            localStorage.setItem('hotcold:access_stats', JSON.stringify(statsData));
            console.log('[HotColdDataManager] 访问统计已保存');
        } catch (error) {
            console.warn('[HotColdDataManager] 保存访问统计失败:', error);
        }
    }
    
    /**
     * 加载访问统计数据
     */
    loadAccessStats() {
        try {
            const saved = localStorage.getItem('hotcold:access_stats');
            if (saved) {
                const statsData = JSON.parse(saved);
                this.accessStats = new Map(statsData.accessStats);
                this.stats = { ...this.stats, ...statsData.stats };
                console.log(`[HotColdDataManager] 访问统计已加载: ${this.accessStats.size} 条记录`);
            }
        } catch (error) {
            console.warn('[HotColdDataManager] 加载访问统计失败:', error);
        }
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计数据
     */
    getStats() {
        const distribution = this.getTemperatureDistribution();
        
        return {
            ...this.stats,
            distribution: {
                hot: distribution.hot.length,
                warm: distribution.warm.length,
                cold: distribution.cold.length,
                frozen: distribution.frozen.length
            },
            config: this.config
        };
    }
    
    /**
     * 清理过期统计数据
     */
    cleanupExpiredStats() {
        const now = Date.now();
        const expireTime = this.config.timeWindow * 3; // 3倍时间窗口
        
        let cleaned = 0;
        for (const [fullKey, stats] of this.accessStats.entries()) {
            const age = now - stats.lastAccess;
            if (age > expireTime && stats.temperature === this.Temperature.FROZEN) {
                this.accessStats.delete(fullKey);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`[HotColdDataManager] 清理过期统计: ${cleaned} 条`);
            this.saveAccessStats();
        }
    }
    
    /**
     * 销毁管理器
     */
    destroy() {
        this.stopAutoMigration();
        this.saveAccessStats();
        console.log('[HotColdDataManager] 管理器已销毁');
    }
}

// 全局注册
if (typeof window !== 'undefined') {
    window.HotColdDataManager = HotColdDataManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HotColdDataManager;
}
