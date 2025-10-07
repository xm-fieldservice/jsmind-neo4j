/**
 * BackupRecoveryService.js - 数据备份与恢复服务
 * 
 * 功能：
 * - 自动备份脑图数据
 * - 手动备份
 * - 数据恢复
 * - 备份管理（列表、删除、导出）
 */

class BackupRecoveryService {
    constructor(dependencies = {}) {
        this.storageAdapter = dependencies.storageAdapter;
        this.logger = dependencies.logger || console;
        
        if (!this.storageAdapter) {
            throw new Error('[BackupRecoveryService] StorageAdapter是必需的依赖');
        }
        
        // 配置
        this.config = {
            autoBackupEnabled: true,
            autoBackupInterval: 30 * 60 * 1000, // 30分钟
            maxBackups: 10,
            backupPrefix: 'backup_',
            ...dependencies.config
        };
        
        // 状态
        this.autoBackupTimer = null;
        this.lastBackupTime = null;
        
        this.logger.log('[BackupRecoveryService] 初始化完成');
    }
    
    /**
     * 启动自动备份
     */
    startAutoBackup() {
        if (!this.config.autoBackupEnabled) {
            this.logger.log('[BackupRecoveryService] 自动备份已禁用');
            return;
        }
        
        if (this.autoBackupTimer) {
            this.logger.warn('[BackupRecoveryService] 自动备份已在运行');
            return;
        }
        
        this.autoBackupTimer = setInterval(async () => {
            try {
                await this.createBackup('auto');
            } catch (error) {
                this.logger.error('[BackupRecoveryService] 自动备份失败:', error);
            }
        }, this.config.autoBackupInterval);
        
        this.logger.log(`[BackupRecoveryService] 自动备份已启动，间隔: ${this.config.autoBackupInterval}ms`);
    }
    
    /**
     * 停止自动备份
     */
    stopAutoBackup() {
        if (this.autoBackupTimer) {
            clearInterval(this.autoBackupTimer);
            this.autoBackupTimer = null;
            this.logger.log('[BackupRecoveryService] 自动备份已停止');
        }
    }
    
    /**
     * 创建备份
     * @param {string} type - 备份类型 ('manual' | 'auto')
     * @returns {Promise<Object>} 备份信息
     */
    async createBackup(type = 'manual') {
        try {
            const timestamp = Date.now();
            const backupId = `${this.config.backupPrefix}${timestamp}`;
            
            this.logger.log(`[BackupRecoveryService] 开始创建${type}备份: ${backupId}`);
            
            // 获取所有脑图数据
            const mindmaps = await this._getAllMindmaps();
            
            // 创建备份数据
            const backupData = {
                id: backupId,
                type,
                timestamp,
                createdAt: new Date().toISOString(),
                mindmapCount: mindmaps.length,
                mindmaps,
                metadata: {
                    version: '1.0',
                    platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
                }
            };
            
            // 保存备份
            await this.storageAdapter.saveConfig(backupId, backupData);
            
            // 更新备份列表
            await this._updateBackupList(backupId);
            
            // 清理旧备份
            await this._cleanupOldBackups();
            
            this.lastBackupTime = timestamp;
            
            this.logger.log(`[BackupRecoveryService] 备份创建成功: ${backupId}, 包含${mindmaps.length}个脑图`);
            
            return {
                success: true,
                backupId,
                mindmapCount: mindmaps.length,
                timestamp
            };
            
        } catch (error) {
            this.logger.error('[BackupRecoveryService] 创建备份失败:', error);
            throw error;
        }
    }
    
    /**
     * 恢复备份
     * @param {string} backupId - 备份ID
     * @returns {Promise<Object>} 恢复结果
     */
    async restoreBackup(backupId) {
        try {
            this.logger.log(`[BackupRecoveryService] 开始恢复备份: ${backupId}`);
            
            // 加载备份数据
            const backupData = await this.storageAdapter.loadConfig(backupId);
            
            if (!backupData) {
                throw new Error(`备份不存在: ${backupId}`);
            }
            
            // 验证备份数据
            if (!backupData.mindmaps || !Array.isArray(backupData.mindmaps)) {
                throw new Error('备份数据格式无效');
            }
            
            // 恢复所有脑图
            let successCount = 0;
            let failCount = 0;
            
            for (const mindmap of backupData.mindmaps) {
                try {
                    await this.storageAdapter.saveMindmap(mindmap);
                    successCount++;
                } catch (error) {
                    this.logger.error(`[BackupRecoveryService] 恢复脑图失败: ${mindmap.id}`, error);
                    failCount++;
                }
            }
            
            this.logger.log(`[BackupRecoveryService] 备份恢复完成: 成功${successCount}, 失败${failCount}`);
            
            return {
                success: true,
                backupId,
                totalCount: backupData.mindmaps.length,
                successCount,
                failCount
            };
            
        } catch (error) {
            this.logger.error('[BackupRecoveryService] 恢复备份失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取备份列表
     * @returns {Promise<Array>} 备份列表
     */
    async getBackupList() {
        try {
            const backupList = await this.storageAdapter.loadConfig('backup_list', []);
            
            // 加载每个备份的详细信息
            const backups = [];
            for (const backupId of backupList) {
                const backup = await this.storageAdapter.loadConfig(backupId);
                if (backup) {
                    backups.push({
                        id: backup.id,
                        type: backup.type,
                        timestamp: backup.timestamp,
                        createdAt: backup.createdAt,
                        mindmapCount: backup.mindmapCount
                    });
                }
            }
            
            // 按时间倒序排序
            backups.sort((a, b) => b.timestamp - a.timestamp);
            
            return backups;
            
        } catch (error) {
            this.logger.error('[BackupRecoveryService] 获取备份列表失败:', error);
            return [];
        }
    }
    
    /**
     * 删除备份
     * @param {string} backupId - 备份ID
     * @returns {Promise<boolean>}
     */
    async deleteBackup(backupId) {
        try {
            this.logger.log(`[BackupRecoveryService] 删除备份: ${backupId}`);
            
            // 删除备份数据
            await this.storageAdapter.saveConfig(backupId, null);
            
            // 从备份列表中移除
            const backupList = await this.storageAdapter.loadConfig('backup_list', []);
            const newList = backupList.filter(id => id !== backupId);
            await this.storageAdapter.saveConfig('backup_list', newList);
            
            this.logger.log(`[BackupRecoveryService] 备份删除成功: ${backupId}`);
            
            return true;
            
        } catch (error) {
            this.logger.error('[BackupRecoveryService] 删除备份失败:', error);
            return false;
        }
    }
    
    /**
     * 导出备份到文件
     * @param {string} backupId - 备份ID
     * @returns {Promise<Blob>}
     */
    async exportBackup(backupId) {
        try {
            const backupData = await this.storageAdapter.loadConfig(backupId);
            
            if (!backupData) {
                throw new Error(`备份不存在: ${backupId}`);
            }
            
            const json = JSON.stringify(backupData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            
            this.logger.log(`[BackupRecoveryService] 备份导出成功: ${backupId}`);
            
            return blob;
            
        } catch (error) {
            this.logger.error('[BackupRecoveryService] 导出备份失败:', error);
            throw error;
        }
    }
    
    /**
     * 从文件导入备份
     * @param {File} file - 备份文件
     * @returns {Promise<Object>}
     */
    async importBackup(file) {
        try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            
            // 验证备份数据
            if (!backupData.id || !backupData.mindmaps) {
                throw new Error('备份文件格式无效');
            }
            
            // 生成新的备份ID（避免冲突）
            const newBackupId = `${this.config.backupPrefix}imported_${Date.now()}`;
            backupData.id = newBackupId;
            backupData.type = 'imported';
            
            // 保存备份
            await this.storageAdapter.saveConfig(newBackupId, backupData);
            
            // 更新备份列表
            await this._updateBackupList(newBackupId);
            
            this.logger.log(`[BackupRecoveryService] 备份导入成功: ${newBackupId}`);
            
            return {
                success: true,
                backupId: newBackupId,
                mindmapCount: backupData.mindmaps.length
            };
            
        } catch (error) {
            this.logger.error('[BackupRecoveryService] 导入备份失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取备份统计信息
     * @returns {Promise<Object>}
     */
    async getBackupStats() {
        try {
            const backups = await this.getBackupList();
            
            const stats = {
                totalBackups: backups.length,
                autoBackups: backups.filter(b => b.type === 'auto').length,
                manualBackups: backups.filter(b => b.type === 'manual').length,
                lastBackupTime: this.lastBackupTime,
                oldestBackup: backups.length > 0 ? backups[backups.length - 1] : null,
                newestBackup: backups.length > 0 ? backups[0] : null
            };
            
            return stats;
            
        } catch (error) {
            this.logger.error('[BackupRecoveryService] 获取备份统计失败:', error);
            return null;
        }
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 获取所有脑图数据
     */
    async _getAllMindmaps() {
        try {
            const keys = await this.storageAdapter.listMindmaps();
            const mindmaps = [];
            
            for (const key of keys) {
                try {
                    const mindmap = await this.storageAdapter.loadMindmap(key);
                    if (mindmap) {
                        mindmaps.push(mindmap);
                    }
                } catch (error) {
                    this.logger.warn(`[BackupRecoveryService] 加载脑图失败: ${key}`, error);
                }
            }
            
            return mindmaps;
            
        } catch (error) {
            this.logger.error('[BackupRecoveryService] 获取所有脑图失败:', error);
            return [];
        }
    }
    
    /**
     * 更新备份列表
     */
    async _updateBackupList(backupId) {
        try {
            const backupList = await this.storageAdapter.loadConfig('backup_list', []);
            
            if (!backupList.includes(backupId)) {
                backupList.push(backupId);
                await this.storageAdapter.saveConfig('backup_list', backupList);
            }
            
        } catch (error) {
            this.logger.error('[BackupRecoveryService] 更新备份列表失败:', error);
        }
    }
    
    /**
     * 清理旧备份
     */
    async _cleanupOldBackups() {
        try {
            const backupList = await this.storageAdapter.loadConfig('backup_list', []);
            
            if (backupList.length <= this.config.maxBackups) {
                return;
            }
            
            // 加载所有备份的时间戳
            const backups = [];
            for (const backupId of backupList) {
                const backup = await this.storageAdapter.loadConfig(backupId);
                if (backup) {
                    backups.push({ id: backupId, timestamp: backup.timestamp });
                }
            }
            
            // 按时间排序
            backups.sort((a, b) => b.timestamp - a.timestamp);
            
            // 删除超出限制的旧备份
            const toDelete = backups.slice(this.config.maxBackups);
            
            for (const backup of toDelete) {
                await this.deleteBackup(backup.id);
                this.logger.log(`[BackupRecoveryService] 清理旧备份: ${backup.id}`);
            }
            
        } catch (error) {
            this.logger.error('[BackupRecoveryService] 清理旧备份失败:', error);
        }
    }
    
    /**
     * 销毁服务
     */
    destroy() {
        this.stopAutoBackup();
        this.logger.log('[BackupRecoveryService] 服务已销毁');
    }
}

// 导出
if (typeof window !== 'undefined') {
    window.BackupRecoveryService = BackupRecoveryService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackupRecoveryService;
}

console.log('[BackupRecoveryService] 模块加载完成');
