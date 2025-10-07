/**
 * MindmapStorage.js - 脑图数据存储业务层包装
 * 
 * 职责：脑图业务逻辑封装，统一使用AutogenUnifiedStorage
 * 架构层级：💼 业务层 (Business Layer)
 * 
 * Phase 6.2 增强功能：
 * - 从控制器迁移存储相关功能
 * - 增强统一存储支持
 * - JSON底座同步功能
 */

class MindmapStorage {
    constructor(dependencies = {}) {
        // 🔧 架构整改：强制使用StorageAdapter，移除回退逻辑
        this.storageAdapter = dependencies.storageAdapter;
        this.eventBus = dependencies.eventBus || window.AutogenEventBus;
        this.logger = dependencies.logger || console;
        
        // 强制要求StorageAdapter
        if (!this.storageAdapter) {
            throw new Error('[MindmapStorage] StorageAdapter是必需的依赖，请通过依赖注入提供');
        }
        
        // 🆕 数据压缩引擎
        this.compressor = dependencies.compressor || (window.DataCompressor ? new window.DataCompressor() : null);
        
        // 防抖定时器
        this._saveDebounceTimer = null;
        this._syncDebounceTimer = null;
        
        // JSON底座同步状态
        this._lastSyncHash = null;
        
        console.log('[MindmapStorage] ✅ 业务层包装初始化完成 (使用StorageAdapter)',
                   this.compressor ? ' + 数据压缩引擎' : '');
    }

    /**
     * 保存脑图数据
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
            const mindKey = this._getMindmapKey(data);
            
            // 🔧 架构整改修复：确保数据有id字段，使用固定的'current'作为ID
            const dataToStore = this.compressor ? this.compressor.compress(data) : data;
            if (!dataToStore.id) {
                dataToStore.id = 'current';  // 固定使用'current'作为ID
            }
            
            // 使用StorageAdapter保存
            const success = await this.storageAdapter.saveMindmap(dataToStore);
            
            if (success) {
                console.log('[MindmapStorage] 脑图数据保存成功:', mindKey);
                return true;
            } else {
                console.error('[MindmapStorage] 保存失败');
                return false;
            }
            
        } catch (error) {
            console.error('[MindmapStorage] 保存脑图数据失败:', error);
            return false;
        }
    }

    /**
     * 加载脑图数据
     */
    async loadMindmapData(mindId = null) {
        try {
            const mindKey = mindId || 'current';
            
            // 使用StorageAdapter加载
            const data = await this.storageAdapter.loadMindmap(mindKey);
            
            if (data) {
                // 🆕 智能还原数据（如果压缩引擎可用）
                const restoredData = this.compressor ? this.compressor.decompress(data) : data;
                
                console.log('[MindmapStorage] 脑图数据加载成功:', mindKey);
                return restoredData;
            }
            
            // 返回默认数据
            console.log('[MindmapStorage] 未找到数据，返回默认数据');
            return this._getDefaultMindmapData();
            
        } catch (error) {
            console.error('[MindmapStorage] 加载脑图数据失败:', error);
            return this._getDefaultMindmapData();
        }
    }

    /**
     * 删除脑图数据
     */
    async deleteMindmapData(mindId) {
        try {
            const mindKey = mindId || 'current';
            
            // 使用StorageAdapter删除
            const result = await this.storageAdapter.deleteMindmap(mindKey);
            
            if (result.success) {
                console.log('[MindmapStorage] 脑图数据删除成功:', mindKey);
                return true;
            } else {
                console.error('[MindmapStorage] 删除失败:', result.error);
                return false;
            }
            
        } catch (error) {
            console.error('[MindmapStorage] 删除脑图数据失败:', error);
            return false;
        }
    }

    /**
     * 获取脑图存储键
     * 🔧 修复：始终使用 'current' 作为默认键，确保保存和加载一致
     */
    _getMindmapKey(data) {
        // 始终使用 'current' 作为默认键
        return 'current';
    }

    /**
     * 获取默认脑图数据
     */
    _getDefaultMindmapData() {
        return {
            meta: {
                name: 'default_mindmap',
                author: 'system',
                version: '1.0'
            },
            format: 'node_tree',
            data: {
                id: 'root',
                topic: '新建脑图',
                children: []
            }
        };
    }

    /**
     * 获取存储系统状态
     */
    getStorageSystemStatus() {
        return {
            adapter: {
                available: !!this.storageAdapter,
                type: 'StorageAdapter',
                status: this.storageAdapter ? 'active' : 'inactive'
            }
        };
    }

    /**
     * 获取所有脑图键列表
     */
    async getAllMindmapKeys() {
        try {
            return await this.storageAdapter.listMindmaps();
        } catch (error) {
            console.warn('[MindmapStorage] 获取脑图键列表失败:', error);
            return [];
        }
    }

    // 🔧 架构整改：已删除saveWithUnifiedStorage()和loadFromUnifiedStorage()方法
    // 统一使用saveMindmapData()和loadMindmapData()方法

    /**
     * JSON底座同步（从控制器迁移）
     */
    async syncToJsonBase(jmData, mindKey, immediate = false) {
        // 防抖机制
        if (!immediate) {
            clearTimeout(this._syncDebounceTimer);
            this._syncDebounceTimer = setTimeout(() => {
                this.syncToJsonBase(jmData, mindKey, true);
            }, 2000);
            return { success: true, deferred: true };
        }

        try {
            // 检查数据变更
            const currentHash = this._calculateDataHash(jmData);
            if (currentHash === this._lastSyncHash) {
                return { success: true, skipped: true, reason: '数据未变更' };
            }

            // 构建同步数据
            const syncData = {
                id: mindKey,
                name: (jmData.data && (jmData.data.topic || jmData.data.label)) || '未命名项目',
                data: jmData,
                last_modified: new Date().toISOString(),
                content_hash: currentHash
            };

            // 发送到JSON底座API
            const response = await fetch('http://localhost:5001/api/sync-mindmap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(syncData)
            });

            if (response.ok) {
                this._lastSyncHash = currentHash;
                
                // 触发同步完成事件
                if (this.eventBus) {
                    this.eventBus.emit('mindmap:jsonBaseSynced', {
                        mindKey,
                        hash: currentHash,
                        timestamp: new Date().toISOString()
                    });
                }
                
                if (Math.random() < 0.2) { // 20%概率输出日志
                    this.logger.log('[MindmapStorage] ✅ JSON底座同步成功:', mindKey);
                }
                
                return { success: true, hash: currentHash };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            // 网络错误时静默处理，不影响本地保存
            if (Math.random() < 0.1) { // 10%概率输出警告
                this.logger.warn('[MindmapStorage] JSON底座同步异常（不影响本地保存）:', error.message);
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * 提取脑图存储键
     */
    _extractMindKey(jmData) {
        if (jmData && jmData.data && jmData.data.id) {
            return `mindmap_${jmData.data.id}`;
        }
        if (jmData && jmData.meta && jmData.meta.name) {
            return jmData.meta.name;
        }
        return 'mindmap_data_v1';
    }

    /**
     * 计算数据哈希值（使用统一框架工具）
     */
    _calculateDataHash(data) {
        // 使用统一的DataUtils工具
        if (typeof window !== 'undefined' && window.DataUtils) {
            return window.DataUtils.calculateDataHash(data);
        }
        
        console.warn('[MindmapStorage] DataUtils不可用，使用回退逻辑');
        // 简化的回退逻辑
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
            this.logger.warn('[MindmapStorage] 计算哈希值失败:', error);
            return 'hash_error_' + Date.now();
        }
    }
}

// 全局注册
if (typeof window !== 'undefined') {
    window.MindmapStorage = MindmapStorage;
}
