/**
 * LocalStorage 适配器
 * 负责浏览器本地存储的读写操作
 */

class LocalStorageAdapter {
    constructor() {
        this.stats = {
            reads: 0,
            writes: 0,
            errors: 0,
            totalSize: 0
        };
        
        console.log('[LocalStorageAdapter] 初始化完成');
    }
    
    /**
     * 读取数据
     * @param {string} key - 存储键
     * @returns {Object|null} 解析后的数据
     */
    read(key) {
        try {
            this.stats.reads++;
            const raw = localStorage.getItem(key);
            
            if (!raw) {
                return null;
            }
            
            const data = JSON.parse(raw);
            console.log(`[LocalStorageAdapter] 读取成功: ${key} (${raw.length} bytes)`);
            return data;
            
        } catch (error) {
            this.stats.errors++;
            console.error(`[LocalStorageAdapter] 读取失败: ${key}`, error);
            return null;
        }
    }
    
    /**
     * 写入数据
     * @param {string} key - 存储键
     * @param {Object} data - 要存储的数据
     * @returns {boolean} 是否成功
     */
    write(key, data) {
        try {
            this.stats.writes++;
            const json = JSON.stringify(data);
            
            // 检查存储空间
            if (!this._checkStorageSpace(json.length)) {
                console.warn(`[LocalStorageAdapter] 存储空间不足: ${key}`);
                this._cleanup();
            }
            
            localStorage.setItem(key, json);
            this.stats.totalSize += json.length;
            
            // 降低日志频率
            if (Math.random() < 0.1) {
                console.log(`[LocalStorageAdapter] 写入成功: ${key} (${json.length} bytes)`);
            }
            
            return true;
            
        } catch (error) {
            this.stats.errors++;
            console.error(`[LocalStorageAdapter] 写入失败: ${key}`, error);
            
            // 尝试清理后重试
            if (error.name === 'QuotaExceededError') {
                console.warn('[LocalStorageAdapter] 存储配额超限，尝试清理...');
                this._cleanup();
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                    console.log(`[LocalStorageAdapter] 清理后写入成功: ${key}`);
                    return true;
                } catch (retryError) {
                    console.error(`[LocalStorageAdapter] 清理后仍然失败: ${key}`, retryError);
                }
            }
            
            return false;
        }
    }
    
    /**
     * 检查键是否存在
     * @param {string} key - 存储键
     * @returns {boolean} 是否存在
     */
    exists(key) {
        return localStorage.getItem(key) !== null;
    }
    
    /**
     * 删除数据
     * @param {string} key - 存储键
     * @returns {boolean} 是否成功
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            console.log(`[LocalStorageAdapter] 删除成功: ${key}`);
            return true;
        } catch (error) {
            this.stats.errors++;
            console.error(`[LocalStorageAdapter] 删除失败: ${key}`, error);
            return false;
        }
    }
    
    /**
     * 列出所有匹配的键
     * @param {string} prefix - 键前缀
     * @returns {Array<string>} 匹配的键列表
     */
    listKeys(prefix = '') {
        const keys = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keys.push(key);
                }
            }
        } catch (error) {
            console.error('[LocalStorageAdapter] 列举键失败', error);
        }
        return keys;
    }
    
    /**
     * 获取存储使用情况
     * @returns {Object} 使用情况统计
     */
    getUsage() {
        let totalSize = 0;
        let itemCount = 0;
        
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    const value = localStorage.getItem(key);
                    if (value) {
                        totalSize += key.length + value.length;
                        itemCount++;
                    }
                }
            }
        } catch (error) {
            console.error('[LocalStorageAdapter] 获取使用情况失败', error);
        }
        
        return {
            totalSize,
            itemCount,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            estimatedQuotaMB: 5 // 大多数浏览器的localStorage配额约为5MB
        };
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计数据
     */
    getStats() {
        const usage = this.getUsage();
        return {
            ...this.stats,
            usage,
            timestamp: new Date().toISOString()
        };
    }
    
    // ========== 私有方法 ==========
    
    /**
     * 检查存储空间是否足够
     * @param {number} requiredSize - 需要的空间大小
     * @returns {boolean} 是否有足够空间
     */
    _checkStorageSpace(requiredSize) {
        try {
            const usage = this.getUsage();
            const usagePercent = (usage.totalSize / (5 * 1024 * 1024)) * 100;
            
            // 记录使用情况
            if (usagePercent > 90) {
                console.warn(`[LocalStorageAdapter] 存储空间严重不足: ${usagePercent.toFixed(1)}%`);
            } else if (usagePercent > 80) {
                console.warn(`[LocalStorageAdapter] 存储空间紧张: ${usagePercent.toFixed(1)}%`);
            }
            
            const availableSize = (5 * 1024 * 1024) - usage.totalSize;
            
            // 如果超过80%，主动清理
            if (usagePercent > 80) {
                console.log('[LocalStorageAdapter] 触发主动清理...');
                this._aggressiveCleanup();
            }
            
            return availableSize > requiredSize * 1.2; // 留20%缓冲
        } catch (error) {
            console.error('[LocalStorageAdapter] 空间检查失败:', error);
            return true; // 检查失败时假设有空间
        }
    }
    
    /**
     * 清理旧数据释放空间
     */
    _cleanup() {
        try {
            console.log('[LocalStorageAdapter] 开始清理存储空间...');
            
            // 清理策略：删除旧的快照和临时数据
            const keysToClean = [];
            
            // 1. 清理旧快照（保留最新10个）
            const snapshotKeys = this.listKeys('mindmap_snapshot_')
                .sort()
                .reverse(); // 最新的在前
            
            if (snapshotKeys.length > 10) {
                keysToClean.push(...snapshotKeys.slice(10));
            }
            
            // 2. 清理临时缓存
            keysToClean.push(...this.listKeys('temp_'));
            keysToClean.push(...this.listKeys('cache_'));
            
            // 3. 清理调试数据
            keysToClean.push(...this.listKeys('debug_'));
            keysToClean.push(...this.listKeys('_drag_diag_'));
            
            // 执行清理
            let cleanedSize = 0;
            keysToClean.forEach(key => {
                try {
                    const value = localStorage.getItem(key);
                    if (value) {
                        cleanedSize += key.length + value.length;
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    console.warn(`[LocalStorageAdapter] 清理键失败: ${key}`, error);
                }
            });
            
            console.log(`[LocalStorageAdapter] 清理完成: 删除${keysToClean.length}个键, 释放${(cleanedSize/1024).toFixed(1)}KB空间`);
            
        } catch (error) {
            console.error('[LocalStorageAdapter] 清理失败', error);
        }
    }
    
    /**
     * 激进清理 - 在存储空间紧张时使用
     */
    _aggressiveCleanup() {
        try {
            console.log('[LocalStorageAdapter] 开始激进清理...');
            
            const keysToClean = [];
            let cleanedSize = 0;
            
            // 1. 清理所有快照（只保留最新3个）
            const snapshotKeys = this.listKeys('mindmap_snapshot_')
                .sort()
                .reverse();
            
            if (snapshotKeys.length > 3) {
                keysToClean.push(...snapshotKeys.slice(3));
            }
            
            // 2. 清理所有临时和缓存数据
            keysToClean.push(...this.listKeys('temp_'));
            keysToClean.push(...this.listKeys('cache_'));
            keysToClean.push(...this.listKeys('debug_'));
            keysToClean.push(...this.listKeys('_drag_diag_'));
            keysToClean.push(...this.listKeys('backup_'));
            
            // 3. 清理旧的全图缓存（保留最新的）
            const fullCacheKeys = this.listKeys('__mind_full_cache_');
            if (fullCacheKeys.length > 1) {
                keysToClean.push(...fullCacheKeys.slice(1));
            }
            
            // 4. 清理重复的脑图数据键
            const mindmapKeys = this.listKeys('mm:');
            const projectCatalog = this.read('mm_project_catalog_v1') || [];
            const activeIds = new Set(projectCatalog.map(p => p.id));
            
            mindmapKeys.forEach(key => {
                const match = key.match(/^mm:(.+):data$/);
                if (match && !activeIds.has(match[1])) {
                    keysToClean.push(key); // 清理不在项目目录中的脑图数据
                }
            });
            
            // 执行清理
            keysToClean.forEach(key => {
                try {
                    const value = localStorage.getItem(key);
                    if (value) {
                        cleanedSize += key.length + value.length;
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    console.warn(`[LocalStorageAdapter] 激进清理键失败: ${key}`, error);
                }
            });
            
            console.log(`[LocalStorageAdapter] 激进清理完成: 删除${keysToClean.length}个键, 释放${(cleanedSize/1024).toFixed(1)}KB空间`);
            
            // 清理后重新检查使用情况
            const usage = this.getUsage();
            const usagePercent = (usage.totalSize / (5 * 1024 * 1024)) * 100;
            console.log(`[LocalStorageAdapter] 清理后使用率: ${usagePercent.toFixed(1)}%`);
            
        } catch (error) {
            console.error('[LocalStorageAdapter] 激进清理失败', error);
        }
    }
    
    /**
     * 获取存储健康状态
     */
    getHealthStatus() {
        const usage = this.getUsage();
        const usagePercent = (usage.totalSize / (5 * 1024 * 1024)) * 100;
        
        let status = 'healthy';
        let message = '存储空间充足';
        
        if (usagePercent > 95) {
            status = 'critical';
            message = '存储空间严重不足，需要立即清理';
        } else if (usagePercent > 85) {
            status = 'warning';
            message = '存储空间紧张，建议清理';
        } else if (usagePercent > 70) {
            status = 'caution';
            message = '存储空间使用较多';
        }
        
        return {
            status,
            message,
            usagePercent: usagePercent.toFixed(1),
            totalSize: usage.totalSize,
            itemCount: usage.itemCount,
            availableSize: (5 * 1024 * 1024) - usage.totalSize
        };
    }
}

// 导出给PersistenceManager使用
if (typeof window !== 'undefined') {
    window.LocalStorageAdapter = LocalStorageAdapter;
}
