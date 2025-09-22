/**
 * SimpleStorageManager - 简化的localStorage管理器
 * 专注于基本功能：存储、清理、错误处理
 * 
 * 设计原则：
 * - 简单LRU清理机制
 * - 基于键数量的限制
 * - 同步操作，避免async混淆
 * - 专注于工作缓存场景
 * 
 * @typedef {Object} StorageStats
 * @property {number} reads - 读取次数
 * @property {number} writes - 写入次数
 * @property {number} errors - 错误次数
 * @property {number} cleanups - 清理次数
 * @property {number} keyCount - 当前键数量
 * @property {number} maxKeys - 最大键数量
 * @property {number} usagePercent - 使用率百分比
 * @property {boolean} healthy - 健康状态
 * 
 * @typedef {Object} MindmapData
 * @property {string} format - 数据格式标识
 * @property {Object} data - jsMind节点树数据
 * @property {Object} [meta] - 元数据
 */
class SimpleStorageManager {
    constructor() {
        this.prefix = 'mind:'; // 统一使用mind:前缀
        this.maxKeys = 50; // 简单的键数量限制
        this.stats = {
            reads: 0,
            writes: 0,
            errors: 0,
            cleanups: 0
        };
        
        console.log('[SimpleStorage] 初始化完成');
    }
    
    /**
     * 存储数据
     * @param {string} key - 存储键
     * @param {*} data - 要存储的数据
     * @returns {boolean} - 存储是否成功
     */
    set(key, data) {
        try {
            // 检查是否需要清理
            if (this._getOurKeyCount() >= this.maxKeys) {
                this._cleanupOldest();
            }
            
            const fullKey = `${this.prefix}${key}`;
            const value = {
                data,
                timestamp: Date.now()
            };
            
            localStorage.setItem(fullKey, JSON.stringify(value));
            this.stats.writes++;
            
            console.log(`[SimpleStorage] 存储成功: ${fullKey}`);
            return true;
            
        } catch (error) {
            // 使用统一错误处理器
            this._handleError('存储', error);
            
            // 处理存储空间不足，重试一次
            if (error.name === 'QuotaExceededError') {
                try {
                    const fullKey = `${this.prefix}${key}`;
                    const value = {
                        data,
                        timestamp: Date.now()
                    };
                    localStorage.setItem(fullKey, JSON.stringify(value));
                    this.stats.writes++;
                    return true;
                } catch (retryError) {
                    this._handleError('重试存储', retryError);
                }
            }
            
            return false;
        }
    }
    
    /**
     * 读取数据
     * @param {string} key - 存储键
     * @returns {*} - 存储的数据，如果不存在返回null
     */
    get(key) {
        try {
            const fullKey = `${this.prefix}${key}`;
            const raw = localStorage.getItem(fullKey);
            
            if (!raw) {
                return null;
            }
            
            const parsed = JSON.parse(raw);
            this.stats.reads++;
            
            return parsed.data;
            
        } catch (error) {
            console.error(`[SimpleStorage] 读取失败: ${key}`, error);
            this.stats.errors++;
            
            // 如果解析失败，删除损坏的数据
            try {
                localStorage.removeItem(`${this.prefix}${key}`);
                console.warn(`[SimpleStorage] 删除损坏的数据: ${key}`);
            } catch (removeError) {
                console.error(`[SimpleStorage] 删除损坏数据失败: ${key}`, removeError);
            }
            
            return null;
        }
    }
    
    /**
     * 删除数据
     * @param {string} key - 存储键
     * @returns {boolean} - 删除是否成功
     */
    remove(key) {
        try {
            const fullKey = `${this.prefix}${key}`;
            localStorage.removeItem(fullKey);
            console.log(`[SimpleStorage] 删除成功: ${key}`);
            return true;
        } catch (error) {
            console.error(`[SimpleStorage] 删除失败: ${key}`, error);
            this.stats.errors++;
            return false;
        }
    }
    
    /**
     * 检查键是否存在
     * @param {string} key - 存储键
     * @returns {boolean} - 键是否存在
     */
    exists(key) {
        try {
            const fullKey = `${this.prefix}${key}`;
            return localStorage.getItem(fullKey) !== null;
        } catch (error) {
            console.error(`[SimpleStorage] 检查存在性失败: ${key}`, error);
            return false;
        }
    }
    
    /**
     * 列出所有我们管理的键
     * @returns {Array<string>} - 键名数组
     */
    listKeys() {
        const keys = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const fullKey = localStorage.key(i);
                if (fullKey && fullKey.startsWith(this.prefix)) {
                    keys.push(fullKey.substring(this.prefix.length));
                }
            }
        } catch (error) {
            console.error('[SimpleStorage] 列举键失败', error);
        }
        return keys;
    }
    
    /**
     * 清空所有我们管理的数据
     * @returns {number} - 清理的键数量
     */
    clear() {
        let cleared = 0;
        try {
            const keysToRemove = [];
            
            // 收集要删除的键
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            
            // 删除键
            for (const key of keysToRemove) {
                localStorage.removeItem(key);
                cleared++;
            }
            
            console.log(`[SimpleStorage] 清空完成，删除了 ${cleared} 个键`);
            this.stats.cleanups++;
            
        } catch (error) {
            console.error('[SimpleStorage] 清空失败', error);
        }
        
        return cleared;
    }
    
    /**
     * 获取我们管理的键数量
     * @returns {number} - 键数量
     */
    _getOurKeyCount() {
        let count = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    count++;
                }
            }
        } catch (error) {
            console.error('[SimpleStorage] 计算键数量失败', error);
        }
        return count;
    }
    
    /**
     * 清理最旧的数据（简单LRU）
     * @returns {boolean} - 是否成功清理
     */
    _cleanupOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        try {
            // 找到最旧的键
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    try {
                        const value = localStorage.getItem(key);
                        const parsed = JSON.parse(value);
                        const timestamp = parsed.timestamp || 0;
                        
                        if (timestamp < oldestTime) {
                            oldestTime = timestamp;
                            oldestKey = key;
                        }
                    } catch (parseError) {
                        // 解析失败的键直接删除
                        localStorage.removeItem(key);
                        console.warn(`[SimpleStorage] 删除损坏的键: ${key}`);
                    }
                }
            }
            
            // 删除最旧的键
            if (oldestKey) {
                localStorage.removeItem(oldestKey);
                this.stats.cleanups++;
                console.log(`[SimpleStorage] LRU清理: ${oldestKey}`);
                return true;
            }
            
        } catch (error) {
            console.error('[SimpleStorage] LRU清理失败', error);
        }
        
        return false;
    }
    
    /**
     * 紧急清理（保留关键数据）
     * @returns {number} - 清理的键数量
     */
    _emergencyCleanup() {
        console.warn('[SimpleStorage] 执行紧急清理...');
        
        const keysToKeep = [
            'current:mindmap',  // 当前脑图
            'settings',         // 设置数据
            'project:catalog'   // 项目目录
        ];
        
        let cleaned = 0;
        
        try {
            const keysToRemove = [];
            
            // 收集要删除的键（除了关键数据）
            for (let i = 0; i < localStorage.length; i++) {
                const fullKey = localStorage.key(i);
                if (fullKey && fullKey.startsWith(this.prefix)) {
                    const key = fullKey.substring(this.prefix.length);
                    
                    if (!keysToKeep.includes(key)) {
                        keysToRemove.push(fullKey);
                    }
                }
            }
            
            // 删除非关键数据
            for (const key of keysToRemove) {
                localStorage.removeItem(key);
                cleaned++;
            }
            
            console.warn(`[SimpleStorage] 紧急清理完成，清理了 ${cleaned} 项`);
            this.stats.cleanups++;
            
        } catch (error) {
            console.error('[SimpleStorage] 紧急清理失败', error);
        }
        
        return cleaned;
    }
    
    /**
     * 保存脑图数据（统一接口）
     * @param {string} mindId - 脑图ID
     * @param {Object} data - 脑图数据
     * @returns {boolean} - 保存是否成功
     */
    saveMindmap(mindId, data) {
        return this.set(`${mindId}:data`, data);
    }
    
    /**
     * 加载脑图数据（统一接口）
     * @param {string} mindId - 脑图ID
     * @returns {Object|null} - 脑图数据或null
     */
    loadMindmap(mindId) {
        return this.get(`${mindId}:data`);
    }
    
    /**
     * 检查脑图是否存在
     * @param {string} mindId - 脑图ID
     * @returns {boolean} - 是否存在
     */
    mindmapExists(mindId) {
        return this.exists(`${mindId}:data`);
    }
    
    /**
     * 删除脑图数据
     * @param {string} mindId - 脑图ID
     * @returns {boolean} - 删除是否成功
     */
    removeMindmap(mindId) {
        return this.remove(`${mindId}:data`);
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计数据
     */
    getStats() {
        const keyCount = this._getOurKeyCount();
        const usagePercent = Math.round((keyCount / this.maxKeys) * 100);
        
        return {
            reads: this.stats.reads,
            writes: this.stats.writes,
            errors: this.stats.errors,
            cleanups: this.stats.cleanups,
            keyCount,
            maxKeys: this.maxKeys,
            usagePercent,
            healthy: keyCount < this.maxKeys * 0.8 && this.stats.errors < 10
        };
    }
    
    /**
     * 统一错误处理器
     * @param {string} operation - 操作名称
     * @param {Error} error - 错误对象
     * @param {*} [fallbackValue] - 回退值
     * @returns {*} 回退值或null
     */
    _handleError(operation, error, fallbackValue = null) {
        this.stats.errors++;
        console.error(`[SimpleStorage] ${operation}操作失败:`, error);
        
        // 记录错误详情用于调试
        if (error.name === 'QuotaExceededError') {
            console.warn('[SimpleStorage] 存储空间不足，尝试清理');
            this._emergencyCleanup();
        }
        
        return fallbackValue;
    }

    /**
     * 打印统计信息到控制台
     */
    printStats() {
        const stats = this.getStats();
        console.log('[SimpleStorage] 统计信息:', stats);
    }
}

// 创建单例
const simpleStorage = new SimpleStorageManager();

// 导出
export default simpleStorage;
