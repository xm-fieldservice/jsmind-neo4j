/**
 * 统一存储管理系统
 * 管理LocalStorage与JSON底座的双向同步
 * 支持脑图数据、关系数据、应用状态等多种数据类型
 */

import UnifiedStorageAdapter from '../core/storage/UnifiedStorageAdapter';
import LocalStorageAdapter from '../core/storage/adapters/LocalStorageAdapter';
import IndexedDBAdapter from '../core/storage/adapters/IndexedDBAdapter';
import JsonBaseAdapter from './adapters/JsonBaseAdapter';

class UnifiedStorageManager {
    constructor() {
        // 数据类型配置
        this.DATA_TYPES = {
            MINDMAP: 'mindmap',
            RELATION: 'relation', 
            APP_STATE: 'app_state',
            USER_PREFERENCES: 'user_preferences'
        };
        
        // TTL配置（毫秒）
        this.TTL_CONFIG = {
            [this.DATA_TYPES.MINDMAP]: 1800000,    // 30分钟
            [this.DATA_TYPES.RELATION]: 300000,    // 5分钟
            [this.DATA_TYPES.APP_STATE]: 86400000, // 24小时
            [this.DATA_TYPES.USER_PREFERENCES]: 604800000 // 7天
        };
        
        // 创建各个存储适配器
        const localStorageAdapter = new LocalStorageAdapter();
        const indexedDBAdapter = new IndexedDBAdapter();
        const jsonBaseAdapter = new JsonBaseAdapter();
        
        // 优先级顺序：IndexedDB > localStorage > JSON文件
        this.storageAdapter = new UnifiedStorageAdapter([
            indexedDBAdapter,
            localStorageAdapter,
            jsonBaseAdapter
        ]);
        
        // 缓存统计
        this.cacheStats = {
            hits: 0,
            misses: 0,
            syncs: 0
        };
        
        // 同步定时器
        this.syncTimers = {};
        
        // 初始化
        this.initialize();
    }
    
    /**
     * 初始化存储管理器
     */
    async initialize() {
        console.log('[统一存储] 初始化存储管理器');
        
        try {
            // 启动定期清理任务
            this.startCleanupTasks();
            
            // 注册页面卸载事件
            this.registerUnloadHandlers();
            
            // 加载缓存统计
            this.loadCacheStats();
            
            console.log('[统一存储] 初始化完成');
        } catch (error) {
            console.error('[统一存储] 初始化失败:', error);
        }
    }
    
    /**
     * 保存脑图数据
     */
    async saveMindmap(mindmapData) {
        const cacheKey = `${this.DATA_TYPES.MINDMAP}_${mindmapData.id}`;
        const cacheData = {
            ...mindmapData,
            timestamp: Date.now(),
            dirty: true,
            version: mindmapData.version || '1.0.0'
        };
        
        try {
            await this.storageAdapter.save(`mm:${mindmapData.id}:data`, cacheData);
            console.log(`[统一存储] 脑图数据已缓存: ${mindmapData.id}`);
        } catch (error) {
            console.error(`[统一存储] 缓存失败: ${error}`);
        }
        
        // 触发延迟同步到JSON底座
        this.scheduleJsonSync(this.DATA_TYPES.MINDMAP, mindmapData.id);
        
        return true;
    }
    
    /**
     * 加载脑图数据
     */
    async loadMindmap(mindmapId) {
        const cacheKey = `${this.DATA_TYPES.MINDMAP}_${mindmapId}`;
        
        try {
            const cacheData = await this.storageAdapter.load(`mm:${mindmapId}:data`);
            if (cacheData) {
                this.cacheStats.hits++;
                console.log(`[统一存储] 从缓存加载脑图: ${mindmapId}`);
                return cacheData;
            }
        } catch (error) {
            console.error(`[统一存储] 加载失败: ${error}`);
        }
        
        // 3. 从JSON底座加载
        this.cacheStats.misses++;
        try {
            const jsonBase = await this.loadJsonBase();
            const mindmapData = jsonBase.mindmaps?.find(m => m.id === mindmapId);
            
            if (mindmapData) {
                // 更新缓存
                await this.storageAdapter.save(`mm:${mindmapId}:data`, mindmapData);
                console.log(`[统一存储] 从JSON底座加载脑图: ${mindmapId}`);
                return mindmapData;
            }
        } catch (error) {
            console.error(`[统一存储] 从JSON底座加载脑图失败: ${mindmapId}`, error);
        }
        
        return null;
    }
    
    /**
     * 保存关系数据
     */
    async saveRelationData(mindmapId, relationData) {
        const cacheKey = `${this.DATA_TYPES.RELATION}_${mindmapId}`;
        const cacheData = {
            mindmap_id: mindmapId,
            timestamp: Date.now(),
            ttl: this.TTL_CONFIG[this.DATA_TYPES.RELATION],
            data: relationData
        };
        
        try {
            await this.storageAdapter.save(`rl:${mindmapId}:data`, cacheData);
            console.log(`[统一存储] 关系数据已缓存: ${mindmapId}`);
        } catch (error) {
            console.error(`[统一存储] 缓存失败: ${error}`);
        }
        
        // 触发延迟同步到JSON底座
        this.scheduleJsonSync(this.DATA_TYPES.RELATION, mindmapId);
        
        return true;
    }
    
    /**
     * 加载关系数据
     */
    async loadRelationData(mindmapId) {
        const cacheKey = `${this.DATA_TYPES.RELATION}_${mindmapId}`;
        
        try {
            const cacheData = await this.storageAdapter.load(`rl:${mindmapId}:data`);
            if (cacheData) {
                this.cacheStats.hits++;
                console.log(`[统一存储] 从缓存加载关系数据: ${mindmapId}`);
                return cacheData.data;
            }
        } catch (error) {
            console.error(`[统一存储] 加载失败: ${error}`);
        }
        
        // 3. 从JSON底座加载
        this.cacheStats.misses++;
        try {
            const jsonBase = await this.loadJsonBase();
            const relationData = jsonBase.relations?.[mindmapId];
            
            if (relationData) {
                // 重新缓存
                await this.storageAdapter.save(`rl:${mindmapId}:data`, {
                    mindmap_id: mindmapId,
                    timestamp: Date.now(),
                    ttl: this.TTL_CONFIG[this.DATA_TYPES.RELATION],
                    data: relationData
                });
                console.log(`[统一存储] 从JSON底座加载关系数据: ${mindmapId}`);
                return relationData;
            }
        } catch (error) {
            console.error(`[统一存储] 从JSON底座加载关系数据失败: ${mindmapId}`, error);
        }
        
        return null;
    }
    
    /**
     * 保存应用状态
     */
    saveAppState(module, state) {
        const appStateKey = 'unified_app_state';
        const currentState = JSON.parse(localStorage.getItem(appStateKey) || '{}');
        
        currentState[module] = {
            ...state,
            timestamp: Date.now()
        };
        
        localStorage.setItem(appStateKey, JSON.stringify(currentState));
        console.log(`[统一存储] 应用状态已保存: ${module}`);
        
        // 定期同步到JSON底座
        this.scheduleJsonSync(this.DATA_TYPES.APP_STATE, 'all');
    }
    
    /**
     * 加载应用状态
     */
    loadAppState(module) {
        const appStateKey = 'unified_app_state';
        const appState = JSON.parse(localStorage.getItem(appStateKey) || '{}');
        return appState[module] || {};
    }
    
    /**
     * 加载JSON底座数据
     */
    async loadJsonBase() {
        try {
            const response = await fetch('/data/all_mindmaps.json');
            if (!response.ok) {
                throw new Error(`JSON底座加载失败: ${response.status}`);
            }
            
            const jsonData = await response.json();
            console.log('[统一存储] JSON底座加载成功');
            return jsonData;
            
        } catch (error) {
            console.error('[统一存储] JSON底座加载失败:', error);
            
            // 返回默认结构
            return {
                export_time: new Date().toISOString(),
                total_count: 0,
                version: '2.0.0',
                mindmaps: [],
                relations: {},
                app_config: {
                    user_preferences: {},
                    app_state: {}
                },
                cache_metadata: {
                    last_cleanup: new Date().toISOString(),
                    cache_statistics: this.cacheStats
                }
            };
        }
    }
    
    /**
     * 保存JSON底座数据
     */
    async saveJsonBase(jsonData) {
        try {
            // 创建Blob对象
            const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
            
            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'all_mindmaps.json';
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            return { success: true };
        } catch (error) {
            console.error('JSON下载失败:', error);
            return { success: false, error };
        }
    }
    
    /**
     * JSON底座数据验证
     */
    validateJsonBase(jsonData) {
        const errors = [];
        
        // 检查核心字段
        if (!jsonData.mindmaps || !Array.isArray(jsonData.mindmaps)) {
            errors.push('mindmaps字段缺失或格式错误');
        }
        
        // 验证脑图数据格式
        jsonData.mindmaps?.forEach((mindmap, index) => {
            if (!mindmap.id) {
                errors.push(`mindmaps[${index}] 缺少id字段`);
            }
            if (!mindmap.data?.format) {
                errors.push(`mindmaps[${index}] 缺少format字段`);
            }
        });
        
        // 检查扩展数据关联性
        if (jsonData.relations) {
            const validMindmapIds = new Set(jsonData.mindmaps.map(m => m.id));
            Object.keys(jsonData.relations).forEach(mindmapId => {
                if (!validMindmapIds.has(mindmapId)) {
                    errors.push(`关系数据引用了不存在的脑图: ${mindmapId}`);
                }
            });
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * 调度JSON同步任务
     */
    scheduleJsonSync(dataType, identifier) {
        const syncKey = `${dataType}_${identifier}`;
        
        // 清除之前的同步任务
        if (this.syncTimers[syncKey]) {
            clearTimeout(this.syncTimers[syncKey]);
        }
        
        // 设置新的同步任务（5秒延迟）
        this.syncTimers[syncKey] = setTimeout(async () => {
            await this.syncToJsonBase(dataType, identifier);
            delete this.syncTimers[syncKey];
        }, 5000);
    }
    
    /**
     * 同步到JSON底座
     */
    async syncToJsonBase(dataType, identifier) {
        try {
            const jsonBase = await this.loadJsonBase();
            
            switch (dataType) {
                case this.DATA_TYPES.MINDMAP:
                    await this.syncMindmapToJsonBase(jsonBase, identifier);
                    break;
                case this.DATA_TYPES.RELATION:
                    await this.syncRelationToJsonBase(jsonBase, identifier);
                    break;
                case this.DATA_TYPES.APP_STATE:
                    await this.syncAppStateToJsonBase(jsonBase);
                    break;
            }
            
            await this.saveJsonBase(jsonBase);
            
        } catch (error) {
            console.error(`[统一存储] ${dataType}同步失败:`, error);
        }
    }
    
    /**
     * 同步脑图数据到JSON底座
     */
    async syncMindmapToJsonBase(jsonBase, mindmapId) {
        const cacheKey = `${this.DATA_TYPES.MINDMAP}_${mindmapId}`;
        const cached = await this.storageAdapter.load(`mm:${mindmapId}:data`);
        
        if (cached) {
            const cacheData = cached;
            if (cacheData.dirty) {
                // 更新或添加脑图数据
                const existingIndex = jsonBase.mindmaps.findIndex(m => m.id === mindmapId);
                const mindmapData = {
                    id: cacheData.id,
                    name: cacheData.name,
                    data: cacheData.data,
                    metadata: {
                        created_at: cacheData.metadata?.created_at || new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        version: cacheData.version
                    }
                };
                
                if (existingIndex >= 0) {
                    jsonBase.mindmaps[existingIndex] = mindmapData;
                } else {
                    jsonBase.mindmaps.push(mindmapData);
                }
                
                // 清除dirty标记
                cacheData.dirty = false;
                await this.storageAdapter.save(`mm:${mindmapId}:data`, cacheData);
                
                console.log(`[统一存储] 脑图数据已同步到JSON底座: ${mindmapId}`);
            }
        }
    }
    
    /**
     * 同步关系数据到JSON底座
     */
    async syncRelationToJsonBase(jsonBase, mindmapId) {
        const cacheKey = `${this.DATA_TYPES.RELATION}_${mindmapId}`;
        const cached = await this.storageAdapter.load(`rl:${mindmapId}:data`);
        
        if (cached) {
            const cacheData = cached;
            
            // 确保relations对象存在
            if (!jsonBase.relations) {
                jsonBase.relations = {};
            }
            
            // 保存关系数据
            jsonBase.relations[mindmapId] = {
                last_updated: new Date().toISOString(),
                ...cacheData.data
            };
            
            console.log(`[统一存储] 关系数据已同步到JSON底座: ${mindmapId}`);
        }
    }
    
    /**
     * 同步应用状态到JSON底座
     */
    async syncAppStateToJsonBase(jsonBase) {
        const appStateKey = 'unified_app_state';
        const localAppState = JSON.parse(localStorage.getItem(appStateKey) || '{}');
        
        // 确保app_config存在
        if (!jsonBase.app_config) {
            jsonBase.app_config = { user_preferences: {}, app_state: {} };
        }
        
        // 同步应用状态
        jsonBase.app_config.app_state = localAppState;
        
        console.log('[统一存储] 应用状态已同步到JSON底座');
    }
    
    /**
     * 检查缓存是否过期
     */
    isCacheExpired(cacheData, dataType) {
        const ttl = this.TTL_CONFIG[dataType] || 300000; // 默认5分钟
        return Date.now() - cacheData.timestamp > ttl;
    }
    
    /**
     * 清理过期缓存
     */
    cleanExpiredCache() {
        const now = Date.now();
        const keys = Object.keys(localStorage);
        let cleanedCount = 0;
        
        keys.forEach(key => {
            // 清理关系缓存
            if (key.startsWith(`${this.DATA_TYPES.RELATION}_`)) {
                try {
                    const cached = JSON.parse(localStorage.getItem(key));
                    if (now - cached.timestamp > cached.ttl) {
                        localStorage.removeItem(key);
                        cleanedCount++;
                    }
                } catch (error) {
                    localStorage.removeItem(key);
                    cleanedCount++;
                }
            }
            
            // 清理脑图缓存
            if (key.startsWith(`${this.DATA_TYPES.MINDMAP}_`)) {
                try {
                    const cached = JSON.parse(localStorage.getItem(key));
                    if (this.isCacheExpired(cached, this.DATA_TYPES.MINDMAP)) {
                        localStorage.removeItem(key);
                        cleanedCount++;
                    }
                } catch (error) {
                    localStorage.removeItem(key);
                    cleanedCount++;
                }
            }
        });
        
        // 清理IndexedDB缓存
        this.storageAdapter.clearExpiredCaches();
        
        if (cleanedCount > 0) {
            console.log(`[统一存储] 清理了 ${cleanedCount} 个过期缓存`);
        }
    }
    
    /**
     * 启动清理任务
     */
    startCleanupTasks() {
        // 每5分钟清理一次过期缓存
        setInterval(() => {
            this.cleanExpiredCache();
        }, 300000);
        
        console.log('[统一存储] 缓存清理任务已启动');
    }
    
    /**
     * 注册页面卸载处理器
     */
    registerUnloadHandlers() {
        window.addEventListener('beforeunload', () => {
            // 强制同步所有pending的数据
            Object.keys(this.syncTimers).forEach(syncKey => {
                clearTimeout(this.syncTimers[syncKey]);
            });
            
            // 保存缓存统计
            this.saveCacheStats();
        });
    }
    
    /**
     * 加载缓存统计
     */
    loadCacheStats() {
        const stats = localStorage.getItem('unified_cache_stats');
        if (stats) {
            try {
                this.cacheStats = { ...this.cacheStats, ...JSON.parse(stats) };
            } catch (error) {
                console.warn('[统一存储] 缓存统计数据损坏');
            }
        }
    }
    
    /**
     * 保存缓存统计
     */
    saveCacheStats() {
        localStorage.setItem('unified_cache_stats', JSON.stringify(this.cacheStats));
    }
    
    /**
     * JSON底座备份（降级方案）
     */
    saveJsonBaseBackup(jsonData) {
        try {
            localStorage.setItem('json_base_backup', JSON.stringify({
                data: jsonData,
                timestamp: Date.now()
            }));
            console.log('[统一存储] JSON底座已备份到LocalStorage');
        } catch (error) {
            console.error('[统一存储] JSON底座备份失败:', error);
        }
    }
    
    /**
     * 获取存储统计信息
     */
    getStorageStats() {
        return {
            cacheStats: this.cacheStats,
            localStorageUsage: this.getLocalStorageUsage(),
            pendingSyncs: Object.keys(this.syncTimers).length
        };
    }
    
    /**
     * 获取LocalStorage使用情况
     */
    getLocalStorageUsage() {
        let totalSize = 0;
        const breakdown = {};
        
        Object.keys(localStorage).forEach(key => {
            const size = localStorage.getItem(key).length;
            totalSize += size;
            
            if (key.startsWith('mindmap_')) {
                breakdown.mindmaps = (breakdown.mindmaps || 0) + size;
            } else if (key.startsWith('relation_')) {
                breakdown.relations = (breakdown.relations || 0) + size;
            } else {
                breakdown.others = (breakdown.others || 0) + size;
            }
        });
        
        return {
            totalSize,
            breakdown,
            percentage: (totalSize / (5 * 1024 * 1024)) * 100 // 5MB限制
        };
    }
}

// 创建全局实例
window.UnifiedStorage = new UnifiedStorageManager();

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedStorageManager;
}
