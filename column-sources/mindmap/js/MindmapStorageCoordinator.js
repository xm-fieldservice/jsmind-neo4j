/**
 * 脑图存储协调器
 * 统一管理MindmapStorage实例，实现单例模式
 * 
 * @author 程序员
 * @date 2025-10-07
 * @version 1.0
 * 
 * Phase 2 - Task 2.0.1: 架构对齐 - 存储协调器
 * 
 * 解决问题：
 * - 消除MindmapStorage重复创建（第801、2231行）
 * - 统一存储实例生命周期管理
 * - 提供统一的存储访问接口
 */

class MindmapStorageCoordinator {
    constructor(storageAdapter, eventBus, logger) {
        this.storageAdapter = storageAdapter;
        this.eventBus = eventBus || window.AutogenEventBus;
        this.logger = logger || console;
        
        // 单例：MindmapStorage实例
        this.mindmapStorage = null;
        
        // 统计信息
        this.stats = {
            loadCount: 0,
            saveCount: 0,
            errorCount: 0
        };
    }
    
    /**
     * 获取或创建MindmapStorage实例（单例模式）
     * 这是核心方法，确保全局只有一个MindmapStorage实例
     */
    getMindmapStorage() {
        if (!this.mindmapStorage) {
            if (!this.storageAdapter) {
                throw new Error('[StorageCoordinator] StorageAdapter未初始化');
            }
            
            if (typeof window.MindmapStorage === 'undefined') {
                throw new Error('[StorageCoordinator] MindmapStorage类未加载');
            }
            
            this.mindmapStorage = new window.MindmapStorage({
                storageAdapter: this.storageAdapter,
                eventBus: this.eventBus,
                logger: this.logger
            });
            
            this.logger.log('[StorageCoordinator] ✅ MindmapStorage单例已创建');
            
            // 发射事件
            if (this.eventBus) {
                this.eventBus.emit('mindmap:storage:initialized', {
                    timestamp: Date.now()
                });
            }
        }
        
        return this.mindmapStorage;
    }
    
    /**
     * 加载脑图数据
     * @param {string} id - 脑图ID
     * @returns {Promise<Object>} 脑图数据
     */
    async loadMindmap(id) {
        try {
            this.stats.loadCount++;
            
            const storage = this.getMindmapStorage();
            const data = await storage.loadMindmapData(id);
            
            this.logger.log(`[StorageCoordinator] ✅ 加载脑图成功: ${id}`);
            
            // 发射事件
            if (this.eventBus) {
                this.eventBus.emit('mindmap:storage:loaded', {
                    id: id,
                    hasData: !!data,
                    timestamp: Date.now()
                });
            }
            
            return data;
        } catch (error) {
            this.stats.errorCount++;
            this.logger.error(`[StorageCoordinator] ❌ 加载脑图失败: ${id}`, error);
            
            // 发射错误事件
            if (this.eventBus) {
                this.eventBus.emit('mindmap:storage:error', {
                    action: 'load',
                    id: id,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
            
            throw error;
        }
    }
    
    /**
     * 保存脑图数据
     * @param {Object} data - 脑图数据
     * @param {boolean} immediate - 是否立即保存（不使用防抖）
     * @returns {Promise<boolean>} 保存是否成功
     */
    async saveMindmap(data, immediate = false) {
        try {
            this.stats.saveCount++;
            
            const storage = this.getMindmapStorage();
            const success = await storage.saveMindmapData(data, immediate);
            
            this.logger.log(`[StorageCoordinator] ✅ 保存脑图成功 (immediate: ${immediate})`);
            
            // 发射事件
            if (this.eventBus) {
                this.eventBus.emit('mindmap:storage:saved', {
                    immediate: immediate,
                    success: success,
                    timestamp: Date.now()
                });
            }
            
            return success;
        } catch (error) {
            this.stats.errorCount++;
            this.logger.error('[StorageCoordinator] ❌ 保存脑图失败', error);
            
            // 发射错误事件
            if (this.eventBus) {
                this.eventBus.emit('mindmap:storage:error', {
                    action: 'save',
                    error: error.message,
                    timestamp: Date.now()
                });
            }
            
            throw error;
        }
    }
    
    /**
     * 列出所有脑图
     * @returns {Promise<Array>} 脑图列表
     */
    async listMindmaps() {
        try {
            const storage = this.getMindmapStorage();
            
            // 如果MindmapStorage有listMindmaps方法
            if (typeof storage.listMindmaps === 'function') {
                return await storage.listMindmaps();
            }
            
            // 否则通过StorageAdapter获取
            if (this.storageAdapter && typeof this.storageAdapter.listMindmaps === 'function') {
                return await this.storageAdapter.listMindmaps();
            }
            
            this.logger.warn('[StorageCoordinator] listMindmaps方法不可用');
            return [];
        } catch (error) {
            this.stats.errorCount++;
            this.logger.error('[StorageCoordinator] ❌ 列出脑图失败', error);
            throw error;
        }
    }
    
    /**
     * 删除脑图
     * @param {string} id - 脑图ID
     * @returns {Promise<boolean>} 删除是否成功
     */
    async deleteMindmap(id) {
        try {
            const storage = this.getMindmapStorage();
            
            // 如果MindmapStorage有deleteMindmap方法
            if (typeof storage.deleteMindmap === 'function') {
                const success = await storage.deleteMindmap(id);
                
                this.logger.log(`[StorageCoordinator] ✅ 删除脑图成功: ${id}`);
                
                // 发射事件
                if (this.eventBus) {
                    this.eventBus.emit('mindmap:storage:deleted', {
                        id: id,
                        timestamp: Date.now()
                    });
                }
                
                return success;
            }
            
            this.logger.warn('[StorageCoordinator] deleteMindmap方法不可用');
            return false;
        } catch (error) {
            this.stats.errorCount++;
            this.logger.error(`[StorageCoordinator] ❌ 删除脑图失败: ${id}`, error);
            throw error;
        }
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            hasInstance: !!this.mindmapStorage
        };
    }
    
    /**
     * 清理资源
     */
    destroy() {
        if (this.mindmapStorage) {
            this.logger.log('[StorageCoordinator] 清理MindmapStorage实例');
            
            // 如果MindmapStorage有destroy方法
            if (typeof this.mindmapStorage.destroy === 'function') {
                this.mindmapStorage.destroy();
            }
            
            this.mindmapStorage = null;
        }
        
        // 发射事件
        if (this.eventBus) {
            this.eventBus.emit('mindmap:storage:destroyed', {
                timestamp: Date.now()
            });
        }
    }
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.MindmapStorageCoordinator = MindmapStorageCoordinator;
}

// 支持模块化导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindmapStorageCoordinator;
}
