/**
 * MindmapStorage.js - 脑图数据存储业务层包装
 * 
 * 职责：脑图业务逻辑封装，统一使用AutogenUnifiedStorage
 * 架构层级：💼 业务层 (Business Layer)
 */

class MindmapStorage {
    constructor() {
        // 唯一存储依赖：AutogenUnifiedStorage
        this.storage = window.AutogenUnifiedStorage;
        
        if (!this.storage) {
            throw new Error('[MindmapStorage] AutogenUnifiedStorage未初始化，无法创建MindmapStorage实例');
        }
        
        console.log('[MindmapStorage] ✅ 业务层包装初始化完成，使用统一存储系统');
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
            
            // 统一存储：只使用AutogenUnifiedStorage
            const result = await this.storage.store('mindmap', mindKey, data);
            
            if (result.success) {
                console.log('[MindmapStorage] 脑图数据保存成功:', mindKey);
                return true;
            } else {
                console.error('[MindmapStorage] 保存失败:', result.error);
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
            
            // 统一加载：只使用AutogenUnifiedStorage
            const data = await this.storage.retrieve('mindmap', mindKey);
            
            if (data) {
                console.log('[MindmapStorage] 脑图数据加载成功:', mindKey);
                return data;
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
            
            // 统一删除：只使用AutogenUnifiedStorage
            const result = await this.storage.remove('mindmap', mindKey);
            
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
     */
    _getMindmapKey(data) {
        if (data && data.meta && data.meta.name) {
            return data.meta.name;
        }
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
            unified: {
                available: !!this.storage,
                type: 'AutogenUnifiedStorage',
                status: 'active'
            }
        };
    }

    /**
     * 获取所有脑图键列表
     */
    async getAllMindmapKeys() {
        try {
            return await this.storage.list('mindmap');
        } catch (error) {
            console.warn('[MindmapStorage] 获取脑图键列表失败:', error);
            return [];
        }
    }
}

// 全局注册
if (typeof window !== 'undefined') {
    window.MindmapStorage = MindmapStorage;
}
