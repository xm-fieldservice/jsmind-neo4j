/**
 * SnapshotManager.js - 快照管理业务层
 * 
 * 职责：快照和版本管理业务逻辑
 * 架构层级：🧠 业务层 (Business Layer)
 */

class SnapshotManager {
    constructor(storage) {
        this.storage = storage;
        this.storageAdapter = (window.StorageAdapter && storage instanceof window.StorageAdapter) ? storage : null;
        this._snapConfig = {
            intervalMs: 10 * 60 * 1000, // 默认10分钟
            maxCount: 5                  // 默认保留5份（上限10）
        };
        this._snapTimer = null;
        this._lastSnapshotHash = null;
    }

    /**
     * 启动定时快照调度器
     */
    startSnapshotScheduler() {
        try {
            this.stopSnapshotScheduler(); // 先停止现有的
            
            this._snapTimer = setInterval(async () => {
                await this.createAutoSnapshot();
            }, this._snapConfig.intervalMs);
            
            console.log('[SnapshotManager] 快照调度器已启动，间隔:', this._snapConfig.intervalMs / 1000, '秒');
            
        } catch (error) {
            console.error('[SnapshotManager] 启动快照调度器失败:', error);
        }
    }

    /**
     * 停止快照调度器
     */
    stopSnapshotScheduler() {
        if (this._snapTimer) {
            clearInterval(this._snapTimer);
            this._snapTimer = null;
            console.log('[SnapshotManager] 快照调度器已停止');
        }
    }

    /**
     * 创建自动快照
     */
    async createAutoSnapshot() {
        try {
            // 获取当前脑图数据
            const currentData = await this._getCurrentMindmapData();
            if (!currentData) return;
            
            // 检查数据是否有变化
            const currentHash = this._calculateDataHash(currentData);
            if (currentHash === this._lastSnapshotHash) {
                console.log('[SnapshotManager] 数据无变化，跳过快照');
                return;
            }
            
            // 创建快照
            const success = await this.createSnapshot(currentData, 'auto');
            if (success) {
                this._lastSnapshotHash = currentHash;
                console.log('[SnapshotManager] 自动快照创建成功');
            }
            
        } catch (error) {
            console.error('[SnapshotManager] 创建自动快照失败:', error);
        }
    }

    /**
     * 创建快照
     */
    async createSnapshot(data, type = 'manual', description = '') {
        try {
            if (!data) {
                data = await this._getCurrentMindmapData();
            }
            
            if (!data) {
                console.warn('[SnapshotManager] 无数据可创建快照');
                return false;
            }
            
            const timestamp = Date.now();
            const snapshot = {
                id: `snapshot_${timestamp}`,
                timestamp,
                type, // 'manual' | 'auto'
                description: description || this._generateSnapshotDescription(data, type),
                data: JSON.parse(JSON.stringify(data)), // 深拷贝
                hash: this._calculateDataHash(data),
                version: '1.0'
            };
            
            // 保存快照
            await this._saveSnapshot(snapshot);
            
            // 清理旧快照
            await this._cleanupOldSnapshots();
            
            console.log('[SnapshotManager] 快照创建成功:', snapshot.id);
            return true;
            
        } catch (error) {
            console.error('[SnapshotManager] 创建快照失败:', error);
            return false;
        }
    }

    /**
     * 获取快照列表
     */
    async getSnapshotList() {
        try {
            const indexData = await this._loadSnapshotIndex();
            return indexData.snapshots || [];
        } catch (error) {
            console.error('[SnapshotManager] 获取快照列表失败:', error);
            return [];
        }
    }

    /**
     * 加载快照数据
     */
    async loadSnapshot(snapshotId) {
        try {
            if (!this.storage) {
                console.warn('[SnapshotManager] 存储系统不可用');
                return null;
            }
            
            const snapshot = await this.storage.retrieve('snapshot', snapshotId);
            if (!snapshot) {
                console.warn('[SnapshotManager] 快照不存在:', snapshotId);
                return null;
            }
            
            console.log('[SnapshotManager] 快照加载成功:', snapshotId);
            return snapshot;
            
        } catch (error) {
            console.error('[SnapshotManager] 加载快照失败:', error);
            return null;
        }
    }

    /**
     * 删除快照
     */
    async deleteSnapshot(snapshotId) {
        try {
            if (!this.storage) return false;
            
            // 从存储中删除快照数据
            await this.storage.remove('snapshot', snapshotId);
            
            // 更新索引
            const indexData = await this._loadSnapshotIndex();
            indexData.snapshots = indexData.snapshots.filter(s => s.id !== snapshotId);
            await this._saveSnapshotIndex(indexData);
            
            console.log('[SnapshotManager] 快照删除成功:', snapshotId);
            return true;
            
        } catch (error) {
            console.error('[SnapshotManager] 删除快照失败:', error);
            return false;
        }
    }

    /**
     * 恢复快照
     */
    async restoreSnapshot(snapshotId) {
        try {
            const snapshot = await this.loadSnapshot(snapshotId);
            if (!snapshot || !snapshot.data) {
                console.warn('[SnapshotManager] 快照数据无效');
                return false;
            }
            
            // 在恢复前创建当前状态的备份快照
            await this.createSnapshot(null, 'backup', '恢复前备份');
            
            // 恢复数据
            const success = await this._restoreMindmapData(snapshot.data);
            if (success) {
                console.log('[SnapshotManager] 快照恢复成功:', snapshotId);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('[SnapshotManager] 恢复快照失败:', error);
            return false;
        }
    }

    /**
     * 获取快照统计信息
     */
    async getSnapshotStatistics() {
        try {
            const snapshots = await this.getSnapshotList();
            
            const stats = {
                total: snapshots.length,
                manual: snapshots.filter(s => s.type === 'manual').length,
                auto: snapshots.filter(s => s.type === 'auto').length,
                backup: snapshots.filter(s => s.type === 'backup').length,
                oldestTimestamp: snapshots.length > 0 ? Math.min(...snapshots.map(s => s.timestamp)) : null,
                newestTimestamp: snapshots.length > 0 ? Math.max(...snapshots.map(s => s.timestamp)) : null,
                totalSize: await this._calculateTotalSnapshotSize()
            };
            
            return stats;
            
        } catch (error) {
            console.error('[SnapshotManager] 获取快照统计失败:', error);
            return null;
        }
    }

    /**
     * 配置快照设置
     */
    configureSnapshots(config) {
        try {
            if (config.intervalMs && config.intervalMs > 0) {
                this._snapConfig.intervalMs = config.intervalMs;
            }
            
            if (config.maxCount && config.maxCount > 0 && config.maxCount <= 10) {
                this._snapConfig.maxCount = config.maxCount;
            }
            
            // 重启调度器以应用新配置
            if (this._snapTimer) {
                this.startSnapshotScheduler();
            }
            
            console.log('[SnapshotManager] 快照配置已更新:', this._snapConfig);
            return true;
            
        } catch (error) {
            console.error('[SnapshotManager] 配置快照失败:', error);
            return false;
        }
    }

    /**
     * 清理所有快照
     */
    async clearAllSnapshots() {
        try {
            const snapshots = await this.getSnapshotList();
            
            // 删除所有快照数据
            for (const snapshot of snapshots) {
                await this.storage.remove('snapshot', snapshot.id);
            }
            
            // 清空索引
            await this._saveSnapshotIndex({ snapshots: [], lastCleanup: Date.now() });
            
            console.log('[SnapshotManager] 所有快照已清理');
            return true;
            
        } catch (error) {
            console.error('[SnapshotManager] 清理快照失败:', error);
            return false;
        }
    }

    /**
     * 保存快照
     */
    async _saveSnapshot(snapshot) {
        try {
            if (!this.storage) return;
            
            // 保存快照数据
            if (this.storageAdapter) {
                await this.storageAdapter.saveConfig(`snapshot_${snapshot.id}`, snapshot);
            } else {
                await this.storage.store('snapshot', snapshot.id, snapshot);
            }
            
            // 更新索引
            const indexData = await this._loadSnapshotIndex();
            
            // 移除可能存在的同ID快照
            indexData.snapshots = indexData.snapshots.filter(s => s.id !== snapshot.id);
            
            // 添加新快照信息
            indexData.snapshots.push({
                id: snapshot.id,
                timestamp: snapshot.timestamp,
                type: snapshot.type,
                description: snapshot.description,
                hash: snapshot.hash
            });
            
            // 按时间戳排序（最新的在前）
            indexData.snapshots.sort((a, b) => b.timestamp - a.timestamp);
            
            await this._saveSnapshotIndex(indexData);
            
        } catch (error) {
            console.error('[SnapshotManager] 保存快照失败:', error);
            throw error;
        }
    }

    /**
     * 加载快照索引
     */
    async _loadSnapshotIndex() {
        try {
            if (!this.storage) return { snapshots: [], lastCleanup: 0 };
            
            const indexData = await this.storage.retrieve('snapshot', 'mindmap_snapshots_index');
            return indexData || { snapshots: [], lastCleanup: 0 };
            
        } catch (error) {
            console.warn('[SnapshotManager] 加载快照索引失败:', error);
            return { snapshots: [], lastCleanup: 0 };
        }
    }

    /**
     * 保存快照索引
     */
    async _saveSnapshotIndex(indexData) {
        try {
            if (!this.storage) return;
            
            if (this.storageAdapter) {
                await this.storageAdapter.saveConfig('mindmap_snapshots_index', indexData);
            } else {
                await this.storage.store('snapshot', 'mindmap_snapshots_index', indexData);
            }
            
        } catch (error) {
            console.error('[SnapshotManager] 保存快照索引失败:', error);
        }
    }

    /**
     * 清理旧快照
     */
    async _cleanupOldSnapshots() {
        try {
            const indexData = await this._loadSnapshotIndex();
            const snapshots = indexData.snapshots;
            
            if (snapshots.length <= this._snapConfig.maxCount) return;
            
            // 按类型分组
            const manualSnapshots = snapshots.filter(s => s.type === 'manual');
            const autoSnapshots = snapshots.filter(s => s.type === 'auto');
            const backupSnapshots = snapshots.filter(s => s.type === 'backup');
            
            // 保留策略：手动快照优先保留，自动快照按时间清理
            const toKeep = [];
            const toDelete = [];
            
            // 保留所有手动快照（除非超过总限制）
            toKeep.push(...manualSnapshots.slice(0, Math.min(manualSnapshots.length, this._snapConfig.maxCount)));
            
            // 剩余空间给自动快照
            const remainingSlots = this._snapConfig.maxCount - toKeep.length;
            if (remainingSlots > 0) {
                toKeep.push(...autoSnapshots.slice(0, remainingSlots));
            }
            
            // 保留最近的备份快照
            if (backupSnapshots.length > 0 && toKeep.length < this._snapConfig.maxCount) {
                toKeep.push(backupSnapshots[0]);
            }
            
            // 确定要删除的快照
            const keepIds = new Set(toKeep.map(s => s.id));
            toDelete.push(...snapshots.filter(s => !keepIds.has(s.id)));
            
            // 删除旧快照
            for (const snapshot of toDelete) {
                await this.storage.remove('snapshot', snapshot.id);
            }
            
            // 更新索引
            indexData.snapshots = toKeep;
            indexData.lastCleanup = Date.now();
            await this._saveSnapshotIndex(indexData);
            
            if (toDelete.length > 0) {
                console.log('[SnapshotManager] 清理了', toDelete.length, '个旧快照');
            }
            
        } catch (error) {
            console.error('[SnapshotManager] 清理旧快照失败:', error);
        }
    }

    /**
     * 获取当前脑图数据
     */
    async _getCurrentMindmapData() {
        try {
            // 尝试从全局控制器获取
            if (window.mindmapController && window.mindmapController.mind) {
                const jmData = window.mindmapController.mind.get_data();
                return window.mindmapController.fromJsMindTree(jmData.data);
            }
            
            // 尝试从存储获取
            if (this.storage) {
                const data = await this.storage.retrieve('mindmap', 'current');
                return data;
            }
            
            return null;
            
        } catch (error) {
            console.warn('[SnapshotManager] 获取当前脑图数据失败:', error);
            return null;
        }
    }

    /**
     * 恢复脑图数据
     */
    async _restoreMindmapData(data) {
        try {
            // 通过全局控制器恢复
            if (window.mindmapController) {
                window.mindmapController.data = data;
                window.mindmapController.renderMindmap();
                await window.mindmapController.saveMindmapToStorage(true);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('[SnapshotManager] 恢复脑图数据失败:', error);
            return false;
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
                hash = hash & hash; // 转换为32位整数
            }
            return hash.toString();
        } catch (error) {
            return Date.now().toString();
        }
    }

    /**
     * 生成快照描述
     */
    _generateSnapshotDescription(data, type) {
        try {
            const nodeCount = this._countNodes(data);
            const timestamp = new Date().toLocaleString('zh-CN');
            
            switch (type) {
                case 'auto':
                    return `自动快照 - ${nodeCount}个节点 - ${timestamp}`;
                case 'manual':
                    return `手动快照 - ${nodeCount}个节点 - ${timestamp}`;
                case 'backup':
                    return `备份快照 - ${nodeCount}个节点 - ${timestamp}`;
                default:
                    return `快照 - ${nodeCount}个节点 - ${timestamp}`;
            }
        } catch (error) {
            return `快照 - ${new Date().toLocaleString('zh-CN')}`;
        }
    }

    /**
     * 计算节点数量
     */
    _countNodes(data) {
        if (!data) return 0;
        
        let count = 1; // 当前节点
        if (data.children) {
            count += data.children.reduce((sum, child) => sum + this._countNodes(child), 0);
        }
        return count;
    }

    /**
     * 计算快照总大小
     */
    async _calculateTotalSnapshotSize() {
        try {
            const snapshots = await this.getSnapshotList();
            let totalSize = 0;
            
            for (const snapshotInfo of snapshots) {
                const snapshot = await this.loadSnapshot(snapshotInfo.id);
                if (snapshot) {
                    totalSize += JSON.stringify(snapshot).length;
                }
            }
            
            return totalSize;
            
        } catch (error) {
            console.warn('[SnapshotManager] 计算快照大小失败:', error);
            return 0;
        }
    }

    /**
     * 销毁快照管理器
     */
    destroy() {
        this.stopSnapshotScheduler();
        this.storage = null;
        this._lastSnapshotHash = null;
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.SnapshotManager = SnapshotManager;
}
