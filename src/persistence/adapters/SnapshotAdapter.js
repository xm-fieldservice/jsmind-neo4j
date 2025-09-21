/**
 * 快照适配器
 * 负责脑图快照的创建、管理和恢复
 */

class SnapshotAdapter {
    constructor() {
        this.stats = {
            created: 0,
            restored: 0,
            deleted: 0,
            errors: 0
        };
        
        this.config = {
            maxSnapshots: 50,           // 最大快照数量
            indexKey: 'mindmap_snapshots_index',
            configKey: 'mindmap_snapshots_config',
            keyPrefix: 'mindmap_snapshot_'
        };
        
        // 初始化快照配置
        this._initializeConfig();
        
        console.log('[SnapshotAdapter] 初始化完成');
    }
    
    /**
     * 创建快照
     * @param {string} mindId - 脑图ID
     * @param {Object} mindPack - 脑图数据包
     * @param {string} reason - 快照原因
     * @returns {Promise<string>} 快照ID
     */
    async save(mindId, mindPack, reason = 'manual') {
        try {
            this.stats.created++;
            
            const timestamp = Date.now();
            const snapshotId = `${mindId}_${timestamp}`;
            const snapshotKey = `${this.config.keyPrefix}${snapshotId}`;
            
            // 创建快照数据
            const snapshot = {
                id: snapshotId,
                mindId: mindId,
                timestamp: timestamp,
                datetime: new Date(timestamp).toISOString(),
                reason: reason,
                data: JSON.parse(JSON.stringify(mindPack)), // 深拷贝
                size: JSON.stringify(mindPack).length,
                version: mindPack.meta?.format_version || 1
            };
            
            // 保存快照
            localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
            
            // 更新索引
            await this._updateIndex(mindId, snapshotId, snapshot);
            
            // 清理旧快照
            await this._cleanupOldSnapshots(mindId);
            
            console.log(`[SnapshotAdapter] 快照创建成功: ${snapshotId} (${reason})`);
            return snapshotId;
            
        } catch (error) {
            this.stats.errors++;
            console.error(`[SnapshotAdapter] 快照创建失败: ${mindId}`, error);
            throw error;
        }
    }
    
    /**
     * 恢复快照
     * @param {string} snapshotId - 快照ID
     * @returns {Promise<Object|null>} 恢复的数据
     */
    async restore(snapshotId) {
        try {
            this.stats.restored++;
            
            const snapshotKey = `${this.config.keyPrefix}${snapshotId}`;
            const raw = localStorage.getItem(snapshotKey);
            
            if (!raw) {
                console.warn(`[SnapshotAdapter] 快照不存在: ${snapshotId}`);
                return null;
            }
            
            const snapshot = JSON.parse(raw);
            if (!snapshot || !snapshot.data) {
                console.warn(`[SnapshotAdapter] 快照数据无效: ${snapshotId}`);
                return null;
            }
            
            console.log(`[SnapshotAdapter] 快照恢复成功: ${snapshotId}`);
            return snapshot.data;
            
        } catch (error) {
            this.stats.errors++;
            console.error(`[SnapshotAdapter] 快照恢复失败: ${snapshotId}`, error);
            return null;
        }
    }
    
    /**
     * 列出指定脑图的快照
     * @param {string} mindId - 脑图ID
     * @returns {Array<Object>} 快照列表
     */
    list(mindId) {
        try {
            const index = this._getIndex();
            const mindSnapshots = index[mindId] || [];
            
            // 按时间倒序排列
            return mindSnapshots
                .map(item => ({
                    id: item.id,
                    timestamp: item.timestamp,
                    datetime: item.datetime,
                    reason: item.reason,
                    size: item.size,
                    version: item.version
                }))
                .sort((a, b) => b.timestamp - a.timestamp);
                
        } catch (error) {
            console.error(`[SnapshotAdapter] 列举快照失败: ${mindId}`, error);
            return [];
        }
    }
    
    /**
     * 删除快照
     * @param {string} snapshotId - 快照ID
     * @returns {Promise<boolean>} 是否成功
     */
    async delete(snapshotId) {
        try {
            this.stats.deleted++;
            
            const snapshotKey = `${this.config.keyPrefix}${snapshotId}`;
            
            // 获取快照信息
            const raw = localStorage.getItem(snapshotKey);
            if (!raw) {
                console.warn(`[SnapshotAdapter] 快照不存在: ${snapshotId}`);
                return false;
            }
            
            const snapshot = JSON.parse(raw);
            const mindId = snapshot.mindId;
            
            // 删除快照数据
            localStorage.removeItem(snapshotKey);
            
            // 更新索引
            await this._removeFromIndex(mindId, snapshotId);
            
            console.log(`[SnapshotAdapter] 快照删除成功: ${snapshotId}`);
            return true;
            
        } catch (error) {
            this.stats.errors++;
            console.error(`[SnapshotAdapter] 快照删除失败: ${snapshotId}`, error);
            return false;
        }
    }
    
    /**
     * 获取快照详情
     * @param {string} snapshotId - 快照ID
     * @returns {Object|null} 快照详情
     */
    getDetails(snapshotId) {
        try {
            const snapshotKey = `${this.config.keyPrefix}${snapshotId}`;
            const raw = localStorage.getItem(snapshotKey);
            
            if (!raw) {
                return null;
            }
            
            const snapshot = JSON.parse(raw);
            return {
                id: snapshot.id,
                mindId: snapshot.mindId,
                timestamp: snapshot.timestamp,
                datetime: snapshot.datetime,
                reason: snapshot.reason,
                size: snapshot.size,
                version: snapshot.version,
                nodeCount: this._countNodes(snapshot.data?.data)
            };
            
        } catch (error) {
            console.error(`[SnapshotAdapter] 获取快照详情失败: ${snapshotId}`, error);
            return null;
        }
    }
    
    /**
     * 清理所有快照
     * @param {string} mindId - 脑图ID (可选，不指定则清理所有)
     * @returns {Promise<number>} 清理的快照数量
     */
    async cleanup(mindId = null) {
        try {
            let cleanedCount = 0;
            const index = this._getIndex();
            
            if (mindId) {
                // 清理指定脑图的快照
                const snapshots = index[mindId] || [];
                for (const snapshot of snapshots) {
                    const snapshotKey = `${this.config.keyPrefix}${snapshot.id}`;
                    localStorage.removeItem(snapshotKey);
                    cleanedCount++;
                }
                delete index[mindId];
            } else {
                // 清理所有快照
                for (const [currentMindId, snapshots] of Object.entries(index)) {
                    for (const snapshot of snapshots) {
                        const snapshotKey = `${this.config.keyPrefix}${snapshot.id}`;
                        localStorage.removeItem(snapshotKey);
                        cleanedCount++;
                    }
                }
                // 清空索引
                Object.keys(index).forEach(key => delete index[key]);
            }
            
            // 保存更新后的索引
            localStorage.setItem(this.config.indexKey, JSON.stringify(index));
            
            console.log(`[SnapshotAdapter] 清理完成: ${cleanedCount} 个快照`);
            return cleanedCount;
            
        } catch (error) {
            console.error('[SnapshotAdapter] 清理失败', error);
            return 0;
        }
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计数据
     */
    getStats() {
        const index = this._getIndex();
        const totalSnapshots = Object.values(index).reduce((sum, snapshots) => sum + snapshots.length, 0);
        
        return {
            ...this.stats,
            totalSnapshots,
            mindmapCount: Object.keys(index).length,
            timestamp: new Date().toISOString(),
            config: this.config
        };
    }
    
    // ========== 私有方法 ==========
    
    /**
     * 初始化快照配置
     */
    _initializeConfig() {
        try {
            const raw = localStorage.getItem(this.config.configKey);
            if (raw) {
                const config = JSON.parse(raw);
                this.config = { ...this.config, ...config };
            } else {
                // 保存默认配置
                localStorage.setItem(this.config.configKey, JSON.stringify({
                    maxSnapshots: this.config.maxSnapshots,
                    autoSnapshot: true,
                    intervalMs: 300000 // 5分钟
                }));
            }
        } catch (error) {
            console.warn('[SnapshotAdapter] 配置初始化失败', error);
        }
    }
    
    /**
     * 获取快照索引
     * @returns {Object} 索引对象
     */
    _getIndex() {
        try {
            const raw = localStorage.getItem(this.config.indexKey);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.warn('[SnapshotAdapter] 索引读取失败', error);
            return {};
        }
    }
    
    /**
     * 更新快照索引
     * @param {string} mindId - 脑图ID
     * @param {string} snapshotId - 快照ID
     * @param {Object} snapshot - 快照对象
     */
    async _updateIndex(mindId, snapshotId, snapshot) {
        try {
            const index = this._getIndex();
            
            if (!index[mindId]) {
                index[mindId] = [];
            }
            
            // 添加新快照到索引
            index[mindId].push({
                id: snapshotId,
                timestamp: snapshot.timestamp,
                datetime: snapshot.datetime,
                reason: snapshot.reason,
                size: snapshot.size,
                version: snapshot.version
            });
            
            // 按时间排序
            index[mindId].sort((a, b) => b.timestamp - a.timestamp);
            
            // 保存索引
            localStorage.setItem(this.config.indexKey, JSON.stringify(index));
            
        } catch (error) {
            console.error('[SnapshotAdapter] 索引更新失败', error);
        }
    }
    
    /**
     * 从索引中移除快照
     * @param {string} mindId - 脑图ID
     * @param {string} snapshotId - 快照ID
     */
    async _removeFromIndex(mindId, snapshotId) {
        try {
            const index = this._getIndex();
            
            if (index[mindId]) {
                index[mindId] = index[mindId].filter(item => item.id !== snapshotId);
                
                // 如果该脑图没有快照了，删除整个条目
                if (index[mindId].length === 0) {
                    delete index[mindId];
                }
                
                localStorage.setItem(this.config.indexKey, JSON.stringify(index));
            }
            
        } catch (error) {
            console.error('[SnapshotAdapter] 索引移除失败', error);
        }
    }
    
    /**
     * 清理旧快照
     * @param {string} mindId - 脑图ID
     */
    async _cleanupOldSnapshots(mindId) {
        try {
            const index = this._getIndex();
            const snapshots = index[mindId] || [];
            
            if (snapshots.length > this.config.maxSnapshots) {
                // 删除超出限制的旧快照
                const toDelete = snapshots.slice(this.config.maxSnapshots);
                
                for (const snapshot of toDelete) {
                    const snapshotKey = `${this.config.keyPrefix}${snapshot.id}`;
                    localStorage.removeItem(snapshotKey);
                }
                
                // 更新索引
                index[mindId] = snapshots.slice(0, this.config.maxSnapshots);
                localStorage.setItem(this.config.indexKey, JSON.stringify(index));
                
                console.log(`[SnapshotAdapter] 清理旧快照: ${toDelete.length} 个`);
            }
            
        } catch (error) {
            console.error('[SnapshotAdapter] 旧快照清理失败', error);
        }
    }
    
    /**
     * 统计节点数量
     * @param {Object} node - 节点对象
     * @returns {number} 节点数量
     */
    _countNodes(node) {
        if (!node) return 0;
        
        let count = 1; // 当前节点
        if (Array.isArray(node.children)) {
            for (const child of node.children) {
                count += this._countNodes(child);
            }
        }
        return count;
    }
}

// 导出给PersistenceManager使用
if (typeof window !== 'undefined') {
    window.SnapshotAdapter = SnapshotAdapter;
}
