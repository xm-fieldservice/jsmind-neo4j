/**
 * MindmapStorage.js - 脑图数据存储层
 * 
 * 职责：数据存储和同步管理
 * 架构层级：💾 数据层 (Data Layer)
 */

class MindmapStorage {
    constructor() {
        this.autogenStorage = null;
        this.localStorageKey = 'mindmap_data_v1';
        this.rootId = null;
        this.perMindStorageKey = null;
        
        // JSON底座同步相关
        this._jsonBaseSyncTimer = null;
        this._lastJsonBaseHash = null;
        
        // 初始化存储系统
        this._initStorage();
    }

    /**
     * 初始化存储系统
     */
    async _initStorage() {
        try {
            // 使用AutogenUnifiedStorage统一存储系统
            if (window.AutogenUnifiedStorage) {
                this.autogenStorage = window.AutogenUnifiedStorage;
                console.log('[MindmapStorage] ✅ 使用AutogenUnifiedStorage统一存储系统');
            } else {
                console.warn('[MindmapStorage] AutogenUnifiedStorage不可用，将使用传统localStorage');
                this.autogenStorage = null;
            }
        } catch (error) {
            console.error('[MindmapStorage] 存储系统初始化失败:', error);
            this.autogenStorage = null;
        }
    }

    /**
     * 保存脑图数据到存储
     */
    async saveMindmapData(data, immediate = false) {
        try {
            if (!data) {
                console.warn('[MindmapStorage] 无数据可保存');
                return false;
            }

            // 防抖逻辑：合并频繁保存操作
            if (!immediate) {
                clearTimeout(this._saveDebounceTimer);
                this._saveDebounceTimer = setTimeout(() => {
                    this.saveMindmapData(data, true);
                }, 800);
                return true;
            }

            // 获取存储键
            const mindKey = this._getCurrentMindKey(data);
            
            // 保存到AutogenUnifiedStorage
            if (this.autogenStorage) {
                await this._saveWithUnifiedStorage(data, mindKey);
            }
            
            // 保存到localStorage（备份）
            this._saveToLocalStorage(data, mindKey);
            
            // 同步到JSON底座
            await this._syncToJsonBase(data, mindKey);
            
            console.log('[MindmapStorage] 脑图数据保存成功');
            return true;
            
        } catch (error) {
            console.error('[MindmapStorage] 保存脑图数据失败:', error);
            return false;
        }
    }

    /**
     * 从存储加载脑图数据
     */
    async loadMindmapData(mindId = null) {
        try {
            let data = null;
            
            // 尝试从AutogenUnifiedStorage加载
            if (this.autogenStorage) {
                data = await this._loadFromUnifiedStorage(mindId);
                if (data) {
                    console.log('[MindmapStorage] 从AutogenUnifiedStorage加载成功');
                    return data;
                }
            }
            
            // 尝试从localStorage加载
            data = this._loadFromLocalStorage(mindId);
            if (data) {
                console.log('[MindmapStorage] 从localStorage加载成功');
                return data;
            }
            
            // 返回默认数据
            console.log('[MindmapStorage] 未找到数据，返回默认数据');
            return this._getDefaultData();
            
        } catch (error) {
            console.error('[MindmapStorage] 加载脑图数据失败:', error);
            return this._getDefaultData();
        }
    }

    /**
     * 删除脑图数据
     */
    async deleteMindmapData(mindId) {
        try {
            const mindKey = mindId || this._getCurrentMindKey();
            
            // 从AutogenUnifiedStorage删除
            if (this.autogenStorage) {
                await this.autogenStorage.remove('mindmap', mindKey);
            }
            
            // 从localStorage删除
            localStorage.removeItem(mindKey);
            
            console.log('[MindmapStorage] 脑图数据删除成功:', mindKey);
            return true;
            
        } catch (error) {
            console.error('[MindmapStorage] 删除脑图数据失败:', error);
            return false;
        }
    }

    /**
     * 获取存储系统状态
     */
    getStorageSystemStatus() {
        return {
            autogenStorage: {
                available: !!this.autogenStorage,
                type: 'AutogenUnifiedStorage'
            },
            localStorage: {
                available: typeof localStorage !== 'undefined',
                type: 'localStorage'
            },
            jsonBase: {
                available: true,
                type: 'JSON底座'
            }
        };
    }

    /**
     * 获取所有存储的脑图键
     */
    getAllMindmapKeys() {
        try {
            const keys = [];
            
            // 从localStorage获取键
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('mm:') || key.includes('mindmap'))) {
                    keys.push(key);
                }
            }
            
            return keys;
            
        } catch (error) {
            console.warn('[MindmapStorage] 获取存储键失败:', error);
            return [];
        }
    }

    /**
     * 清理过期数据
     */
    async cleanupExpiredData() {
        try {
            if (this.autogenStorage && this.autogenStorage.cleanup) {
                await this.autogenStorage.cleanup();
                console.log('[MindmapStorage] 过期数据清理完成');
            }
        } catch (error) {
            console.warn('[MindmapStorage] 清理过期数据失败:', error);
        }
    }

    /**
     * 使用AutogenUnifiedStorage保存
     */
    async _saveWithUnifiedStorage(data, mindKey) {
        try {
            if (!this.autogenStorage) return;
            
            // 准备存储数据
            const storageData = {
                id: data.id || 'root',
                label: data.label || data.topic || '新脑图',
                data: data,
                timestamp: Date.now(),
                version: '1.0'
            };
            
            // 保存到统一存储
            await this.autogenStorage.store('mindmap', mindKey, storageData);
            
            // 同时保存为当前脑图
            await this.autogenStorage.store('mindmap', 'current', storageData);
            
        } catch (error) {
            console.error('[MindmapStorage] AutogenUnifiedStorage保存失败:', error);
            throw error;
        }
    }

    /**
     * 从AutogenUnifiedStorage加载
     */
    async _loadFromUnifiedStorage(mindId) {
        try {
            if (!this.autogenStorage) return null;
            
            let mindKey = mindId;
            if (!mindKey) {
                // 尝试加载当前脑图
                mindKey = 'current';
            }
            
            const storageData = await this.autogenStorage.retrieve('mindmap', mindKey);
            if (storageData && storageData.data) {
                return storageData.data;
            }
            
            return null;
            
        } catch (error) {
            console.warn('[MindmapStorage] AutogenUnifiedStorage加载失败:', error);
            return null;
        }
    }

    /**
     * 保存到localStorage
     */
    _saveToLocalStorage(data, mindKey) {
        try {
            const storageData = {
                id: data.id || 'root',
                label: data.label || data.topic || '新脑图',
                data: data,
                timestamp: Date.now(),
                version: '1.0'
            };
            
            localStorage.setItem(mindKey, JSON.stringify(storageData));
            
        } catch (error) {
            console.warn('[MindmapStorage] localStorage保存失败:', error);
        }
    }

    /**
     * 从localStorage加载
     */
    _loadFromLocalStorage(mindId) {
        try {
            let mindKey = mindId;
            if (!mindKey) {
                mindKey = this.localStorageKey;
            }
            
            const stored = localStorage.getItem(mindKey);
            if (stored) {
                const storageData = JSON.parse(stored);
                return storageData.data || storageData;
            }
            
            return null;
            
        } catch (error) {
            console.warn('[MindmapStorage] localStorage加载失败:', error);
            return null;
        }
    }

    /**
     * 同步到JSON底座
     */
    async _syncToJsonBase(data, mindKey) {
        try {
            // 防抖同步
            clearTimeout(this._jsonBaseSyncTimer);
            this._jsonBaseSyncTimer = setTimeout(async () => {
                await this._performJsonBaseSync(data, mindKey);
            }, 2000);
            
        } catch (error) {
            console.warn('[MindmapStorage] JSON底座同步失败:', error);
        }
    }

    /**
     * 执行JSON底座同步
     */
    async _performJsonBaseSync(data, mindKey) {
        try {
            // 计算数据哈希，避免重复同步
            const dataHash = this._calculateDataHash(data);
            if (dataHash === this._lastJsonBaseHash) {
                return;
            }
            
            // 准备同步数据
            const syncData = {
                id: data.id || 'root',
                label: data.label || data.topic || '新脑图',
                content: data,
                timestamp: Date.now(),
                source: 'mindmap_storage',
                storage_key: mindKey
            };
            
            // 尝试通过API同步
            try {
                const response = await fetch('/api/json-base/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(syncData)
                });
                
                if (response.ok) {
                    this._lastJsonBaseHash = dataHash;
                    console.log('[MindmapStorage] JSON底座同步成功');
                } else {
                    throw new Error(`API响应错误: ${response.status}`);
                }
                
            } catch (apiError) {
                // API失败时的降级方案
                console.warn('[MindmapStorage] API同步失败，使用本地方案:', apiError.message);
                await this._fallbackJsonBaseSync(syncData);
            }
            
        } catch (error) {
            console.error('[MindmapStorage] JSON底座同步执行失败:', error);
        }
    }

    /**
     * JSON底座同步降级方案
     */
    async _fallbackJsonBaseSync(syncData) {
        try {
            // 保存到特殊的JSON底座键
            const jsonBaseKey = `json_base_${syncData.id}`;
            
            if (this.autogenStorage) {
                await this.autogenStorage.store('json_base', jsonBaseKey, syncData);
            } else {
                localStorage.setItem(`__json_base__${jsonBaseKey}`, JSON.stringify(syncData));
            }
            
            console.log('[MindmapStorage] JSON底座降级同步完成');
            
        } catch (error) {
            console.error('[MindmapStorage] JSON底座降级同步失败:', error);
        }
    }

    /**
     * 获取当前脑图存储键
     */
    _getCurrentMindKey(data = null) {
        try {
            let rootId = this.rootId;
            
            if (!rootId && data) {
                rootId = data.id || 'root';
            }
            
            if (!rootId) {
                rootId = 'root';
            }
            
            return `mm:${rootId}`;
            
        } catch (error) {
            return this.localStorageKey;
        }
    }

    /**
     * 计算数据哈希
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
            return hash.toString();
        } catch (error) {
            return Date.now().toString();
        }
    }

    /**
     * 获取默认数据
     */
    _getDefaultData() {
        const timestamp = Date.now();
        return {
            id: 'root-' + timestamp,
            label: '新脑图',
            topic: '新脑图',
            content: '',
            children: [
                {
                    id: 'node-' + (timestamp + 1),
                    label: '子节点1',
                    topic: '子节点1',
                    content: '这是一个示例子节点',
                    children: []
                }
            ],
            created_at: new Date().toISOString(),
            last_modified: new Date().toISOString()
        };
    }

    /**
     * 设置根ID
     */
    setRootId(rootId) {
        this.rootId = rootId;
        this.perMindStorageKey = this._getCurrentMindKey();
    }

    /**
     * 获取根ID
     */
    getRootId() {
        return this.rootId;
    }

    /**
     * 批量导入数据
     */
    async batchImportData(dataList) {
        try {
            const results = [];
            
            for (const data of dataList) {
                try {
                    const mindKey = this._getCurrentMindKey(data);
                    await this.saveMindmapData(data, true);
                    results.push({ success: true, key: mindKey });
                } catch (error) {
                    results.push({ success: false, error: error.message });
                }
            }
            
            console.log('[MindmapStorage] 批量导入完成:', results);
            return results;
            
        } catch (error) {
            console.error('[MindmapStorage] 批量导入失败:', error);
            return [];
        }
    }

    /**
     * 导出所有数据
     */
    async exportAllData() {
        try {
            const keys = this.getAllMindmapKeys();
            const exportData = [];
            
            for (const key of keys) {
                try {
                    const data = this._loadFromLocalStorage(key);
                    if (data) {
                        exportData.push({
                            key,
                            data,
                            exportTime: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.warn('[MindmapStorage] 导出数据失败:', key, error);
                }
            }
            
            return {
                version: '1.0',
                exportTime: new Date().toISOString(),
                totalCount: exportData.length,
                data: exportData
            };
            
        } catch (error) {
            console.error('[MindmapStorage] 导出所有数据失败:', error);
            return null;
        }
    }

    /**
     * 销毁存储管理器
     */
    destroy() {
        // 清理定时器
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
        }
        if (this._jsonBaseSyncTimer) {
            clearTimeout(this._jsonBaseSyncTimer);
        }
        
        // 清理引用
        this.autogenStorage = null;
        this.rootId = null;
        this.perMindStorageKey = null;
        this._lastJsonBaseHash = null;
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.MindmapStorage = MindmapStorage;
}
