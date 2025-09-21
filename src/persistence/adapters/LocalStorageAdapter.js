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
            const availableSize = (5 * 1024 * 1024) - usage.totalSize; // 假设5MB配额
            return availableSize > requiredSize * 1.2; // 留20%缓冲
        } catch (error) {
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
}

// 导出给PersistenceManager使用
if (typeof window !== 'undefined') {
    window.LocalStorageAdapter = LocalStorageAdapter;
}
