/**
 * StorageMigrationTool - 存储系统迁移工具
 * 
 * 功能：
 * 1. 从四个旧StorageManager迁移数据到AutogenUnifiedStorage
 * 2. 数据完整性验证
 * 3. 回滚机制
 * 4. 迁移进度报告
 * 5. 安全的数据清理
 */

class StorageMigrationTool {
    constructor(unifiedStorage) {
        this.unifiedStorage = unifiedStorage;
        this.migrationLog = [];
        this.backupData = new Map();
        this.migrationStats = {
            total: 0,
            success: 0,
            failed: 0,
            skipped: 0,
            startTime: null,
            endTime: null
        };
        
        // 旧存储系统的前缀映射
        this.legacyPrefixes = {
            simple: 'mind:',
            formal: 'reg:',
            unified: ['mindmap_', 'relation_', 'app_state_'],
            basic: '' // StorageManager.js没有特定前缀
        };
        
        console.log('[StorageMigrationTool] 迁移工具初始化完成');
    }
    
    /**
     * 执行完整迁移流程
     */
    async performFullMigration() {
        console.log('[StorageMigrationTool] 开始完整迁移流程');
        this.migrationStats.startTime = Date.now();
        
        try {
            // 1. 预迁移检查
            await this.preMigrationCheck();
            
            // 2. 创建数据备份
            await this.createBackup();
            
            // 3. 执行数据迁移
            await this.migrateAllSystems();
            
            // 4. 验证迁移结果
            await this.validateMigration();
            
            // 5. 清理旧数据（可选）
            await this.cleanupOldData();
            
            this.migrationStats.endTime = Date.now();
            this.logSuccess('完整迁移流程成功完成');
            
            return {
                success: true,
                stats: this.migrationStats,
                log: this.migrationLog
            };
            
        } catch (error) {
            this.logError('迁移流程失败', error);
            
            // 尝试回滚
            await this.rollback();
            
            return {
                success: false,
                error: error.message,
                stats: this.migrationStats,
                log: this.migrationLog
            };
        }
    }
    
    /**
     * 预迁移检查
     */
    async preMigrationCheck() {
        this.logInfo('开始预迁移检查');
        
        // 检查localStorage可用性
        if (!this.isLocalStorageAvailable()) {
            throw new Error('LocalStorage不可用');
        }
        
        // 检查存储空间
        const usage = this.calculateStorageUsage();
        if (usage.percentage > 80) {
            this.logWarning(`存储使用率过高: ${usage.percentage}%`);
        }
        
        // 扫描现有数据
        const existingData = this.scanExistingData();
        this.migrationStats.total = existingData.totalItems;
        
        this.logInfo(`预迁移检查完成，发现 ${existingData.totalItems} 项数据`);
        
        return existingData;
    }
    
    /**
     * 扫描现有数据
     */
    scanExistingData() {
        const data = {
            simple: [],
            formal: [],
            unified: [],
            basic: [],
            totalItems: 0
        };
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            
            // 分类现有数据
            if (key.startsWith(this.legacyPrefixes.simple)) {
                data.simple.push(key);
            } else if (key.startsWith(this.legacyPrefixes.formal)) {
                data.formal.push(key);
            } else if (this.legacyPrefixes.unified.some(prefix => key.startsWith(prefix))) {
                data.unified.push(key);
            } else if (!key.startsWith('autogen:') && !key.includes('_migrated')) {
                data.basic.push(key);
            }
        }
        
        data.totalItems = data.simple.length + data.formal.length + 
                         data.unified.length + data.basic.length;
        
        return data;
    }
    
    /**
     * 创建数据备份
     */
    async createBackup() {
        this.logInfo('创建数据备份');
        
        const backupData = {};
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !key.startsWith('autogen:')) {
                try {
                    backupData[key] = localStorage.getItem(key);
                } catch (error) {
                    this.logWarning(`备份失败: ${key}`, error);
                }
            }
        }
        
        // 保存备份到内存
        this.backupData.set('localStorage', backupData);
        
        // 保存备份到文件（可选）
        await this.saveBackupToFile(backupData);
        
        this.logInfo(`数据备份完成，备份了 ${Object.keys(backupData).length} 项`);
    }
    
    /**
     * 保存备份到文件
     */
    async saveBackupToFile(backupData) {
        try {
            const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(backupBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `storage_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.logInfo('备份文件已下载');
        } catch (error) {
            this.logWarning('备份文件保存失败', error);
        }
    }
    
    /**
     * 迁移所有系统
     */
    async migrateAllSystems() {
        this.logInfo('开始迁移所有存储系统');
        
        // 迁移SimpleStorageManager数据
        await this.migrateSimpleStorage();
        
        // 迁移FormalStorageManager数据
        await this.migrateFormalStorage();
        
        // 迁移UnifiedStorageManager数据
        await this.migrateUnifiedStorage();
        
        // 迁移基础StorageManager数据
        await this.migrateBasicStorage();
        
        this.logInfo('所有系统迁移完成');
    }
    
    /**
     * 迁移SimpleStorageManager数据
     */
    async migrateSimpleStorage() {
        this.logInfo('迁移SimpleStorageManager数据');
        
        const prefix = this.legacyPrefixes.simple;
        let migratedCount = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(prefix) || key.includes('_migrated')) {
                continue;
            }
            
            try {
                const rawData = localStorage.getItem(key);
                const parsedData = JSON.parse(rawData);
                
                // 提取实际数据
                const actualData = parsedData.data || parsedData;
                const itemKey = key.replace(prefix, '');
                
                // 确定数据类型
                const dataType = this.determineDataType(itemKey, actualData);
                
                // 存储到新系统
                const success = await this.unifiedStorage.store(dataType, itemKey, actualData, {
                    metadata: {
                        migratedFrom: 'SimpleStorageManager',
                        originalKey: key,
                        migratedAt: new Date().toISOString()
                    }
                });
                
                if (success) {
                    // 标记为已迁移
                    localStorage.setItem(`${key}_migrated`, 'true');
                    migratedCount++;
                    this.migrationStats.success++;
                } else {
                    this.logError(`SimpleStorage迁移失败: ${key}`);
                    this.migrationStats.failed++;
                }
                
            } catch (error) {
                this.logError(`SimpleStorage解析失败: ${key}`, error);
                this.migrationStats.failed++;
            }
        }
        
        this.logInfo(`SimpleStorageManager迁移完成: ${migratedCount} 项`);
    }
    
    /**
     * 迁移FormalStorageManager数据
     */
    async migrateFormalStorage() {
        this.logInfo('迁移FormalStorageManager数据');
        
        const prefix = this.legacyPrefixes.formal;
        let migratedCount = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(prefix) || key.includes('_migrated')) {
                continue;
            }
            
            try {
                const rawData = localStorage.getItem(key);
                const item = JSON.parse(rawData);
                
                if (item._meta && item.data) {
                    const success = await this.unifiedStorage.store(
                        item._meta.type,
                        item._meta.id,
                        item.data,
                        {
                            metadata: {
                                migratedFrom: 'FormalStorageManager',
                                originalKey: key,
                                originalVersion: item._meta.version,
                                migratedAt: new Date().toISOString()
                            }
                        }
                    );
                    
                    if (success) {
                        localStorage.setItem(`${key}_migrated`, 'true');
                        migratedCount++;
                        this.migrationStats.success++;
                    } else {
                        this.logError(`FormalStorage迁移失败: ${key}`);
                        this.migrationStats.failed++;
                    }
                } else {
                    this.logWarning(`FormalStorage数据格式异常: ${key}`);
                    this.migrationStats.skipped++;
                }
                
            } catch (error) {
                this.logError(`FormalStorage解析失败: ${key}`, error);
                this.migrationStats.failed++;
            }
        }
        
        this.logInfo(`FormalStorageManager迁移完成: ${migratedCount} 项`);
    }
    
    /**
     * 迁移UnifiedStorageManager数据
     */
    async migrateUnifiedStorage() {
        this.logInfo('迁移UnifiedStorageManager数据');
        
        const prefixes = this.legacyPrefixes.unified;
        let migratedCount = 0;
        
        for (const prefix of prefixes) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key || !key.startsWith(prefix) || key.includes('_migrated')) {
                    continue;
                }
                
                try {
                    const rawData = localStorage.getItem(key);
                    const data = JSON.parse(rawData);
                    
                    // 确定数据类型和ID
                    const type = prefix.replace('_', '');
                    const id = key.replace(prefix, '');
                    const actualData = data.data || data;
                    
                    const success = await this.unifiedStorage.store(type, id, actualData, {
                        metadata: {
                            migratedFrom: 'UnifiedStorageManager',
                            originalKey: key,
                            migratedAt: new Date().toISOString()
                        }
                    });
                    
                    if (success) {
                        localStorage.setItem(`${key}_migrated`, 'true');
                        migratedCount++;
                        this.migrationStats.success++;
                    } else {
                        this.logError(`UnifiedStorage迁移失败: ${key}`);
                        this.migrationStats.failed++;
                    }
                    
                } catch (error) {
                    this.logError(`UnifiedStorage解析失败: ${key}`, error);
                    this.migrationStats.failed++;
                }
            }
        }
        
        this.logInfo(`UnifiedStorageManager迁移完成: ${migratedCount} 项`);
    }
    
    /**
     * 迁移基础StorageManager数据
     */
    async migrateBasicStorage() {
        this.logInfo('迁移基础StorageManager数据');
        
        let migratedCount = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || key.startsWith('autogen:') || key.includes('_migrated') ||
                key.startsWith('mind:') || key.startsWith('reg:') ||
                this.legacyPrefixes.unified.some(prefix => key.startsWith(prefix))) {
                continue;
            }
            
            try {
                const rawData = localStorage.getItem(key);
                let data;
                
                try {
                    data = JSON.parse(rawData);
                } catch {
                    // 如果不是JSON，直接存储原始字符串
                    data = rawData;
                }
                
                const dataType = this.determineDataType(key, data);
                
                const success = await this.unifiedStorage.store(dataType, key, data, {
                    metadata: {
                        migratedFrom: 'BasicStorageManager',
                        originalKey: key,
                        migratedAt: new Date().toISOString()
                    }
                });
                
                if (success) {
                    localStorage.setItem(`${key}_migrated`, 'true');
                    migratedCount++;
                    this.migrationStats.success++;
                } else {
                    this.logError(`BasicStorage迁移失败: ${key}`);
                    this.migrationStats.failed++;
                }
                
            } catch (error) {
                this.logError(`BasicStorage处理失败: ${key}`, error);
                this.migrationStats.failed++;
            }
        }
        
        this.logInfo(`基础StorageManager迁移完成: ${migratedCount} 项`);
    }
    
    /**
     * 确定数据类型
     */
    determineDataType(key, data) {
        // 根据键名和数据结构推断类型
        if (key.includes('mindmap') || key.includes('mind') || 
            (data && data.format && data.data)) {
            return this.unifiedStorage.dataTypes.MINDMAP;
        }
        
        if (key.includes('relation') || 
            (data && Array.isArray(data.nodes) && Array.isArray(data.links))) {
            return this.unifiedStorage.dataTypes.RELATION;
        }
        
        if (key.includes('project')) {
            return this.unifiedStorage.dataTypes.PROJECT;
        }
        
        if (key.includes('state') || key.includes('config')) {
            return this.unifiedStorage.dataTypes.APP_STATE;
        }
        
        if (key.includes('preferences') || key.includes('settings')) {
            return this.unifiedStorage.dataTypes.USER_PREFERENCES;
        }
        
        // 默认为应用状态
        return this.unifiedStorage.dataTypes.APP_STATE;
    }
    
    /**
     * 验证迁移结果
     */
    async validateMigration() {
        this.logInfo('验证迁移结果');
        
        const validation = {
            totalChecked: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
        
        // 检查每个已迁移的项目
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.includes('_migrated')) {
                continue;
            }
            
            const originalKey = key.replace('_migrated', '');
            validation.totalChecked++;
            
            try {
                // 验证数据是否正确迁移
                const isValid = await this.validateSingleItem(originalKey);
                if (isValid) {
                    validation.passed++;
                } else {
                    validation.failed++;
                    validation.errors.push(`验证失败: ${originalKey}`);
                }
            } catch (error) {
                validation.failed++;
                validation.errors.push(`验证错误: ${originalKey} - ${error.message}`);
            }
        }
        
        this.logInfo(`迁移验证完成: ${validation.passed}/${validation.totalChecked} 通过`);
        
        if (validation.failed > 0) {
            this.logWarning(`${validation.failed} 项验证失败`);
            validation.errors.forEach(error => this.logError(error));
        }
        
        return validation;
    }
    
    /**
     * 验证单个项目
     */
    async validateSingleItem(originalKey) {
        try {
            const originalData = localStorage.getItem(originalKey);
            if (!originalData) return false;
            
            // 根据原始键确定新的存储位置
            const { type, key } = this.mapOriginalKeyToNew(originalKey);
            
            // 从新系统读取数据
            const newData = await this.unifiedStorage.retrieve(type, key);
            
            if (!newData) {
                return false;
            }
            
            // 简单的数据一致性检查
            return this.compareData(originalData, newData);
            
        } catch (error) {
            this.logError(`验证项目失败: ${originalKey}`, error);
            return false;
        }
    }
    
    /**
     * 映射原始键到新格式
     */
    mapOriginalKeyToNew(originalKey) {
        if (originalKey.startsWith('mind:')) {
            return {
                type: this.unifiedStorage.dataTypes.MINDMAP,
                key: originalKey.replace('mind:', '')
            };
        }
        
        if (originalKey.startsWith('reg:')) {
            // 需要解析reg:type:id格式
            const parts = originalKey.split(':');
            return {
                type: parts[1] || this.unifiedStorage.dataTypes.APP_STATE,
                key: parts[2] || parts[1]
            };
        }
        
        // 其他情况
        const type = this.determineDataType(originalKey, null);
        return { type, key: originalKey };
    }
    
    /**
     * 比较数据一致性
     */
    compareData(originalData, newData) {
        try {
            let original = originalData;
            
            // 尝试解析原始数据
            try {
                original = JSON.parse(originalData);
            } catch {
                // 如果不是JSON，直接比较字符串
                return originalData === JSON.stringify(newData);
            }
            
            // 提取实际数据进行比较
            const originalActual = original.data || original;
            
            return JSON.stringify(originalActual) === JSON.stringify(newData);
            
        } catch (error) {
            this.logError('数据比较失败', error);
            return false;
        }
    }
    
    /**
     * 清理旧数据
     */
    async cleanupOldData() {
        this.logInfo('开始清理旧数据');
        
        const keysToRemove = [];
        
        // 收集所有已迁移的键
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('_migrated')) {
                const originalKey = key.replace('_migrated', '');
                keysToRemove.push(originalKey, key);
            }
        }
        
        // 安全删除（分批进行）
        const batchSize = 10;
        for (let i = 0; i < keysToRemove.length; i += batchSize) {
            const batch = keysToRemove.slice(i, i + batchSize);
            
            for (const key of batch) {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    this.logWarning(`删除失败: ${key}`, error);
                }
            }
            
            // 小延迟，避免阻塞UI
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        this.logInfo(`旧数据清理完成: ${keysToRemove.length} 项`);
    }
    
    /**
     * 回滚迁移
     */
    async rollback() {
        this.logWarning('开始回滚迁移');
        
        try {
            const backup = this.backupData.get('localStorage');
            if (!backup) {
                throw new Error('没有找到备份数据');
            }
            
            // 清除新系统数据
            await this.clearNewSystemData();
            
            // 恢复备份数据
            for (const [key, value] of Object.entries(backup)) {
                try {
                    localStorage.setItem(key, value);
                } catch (error) {
                    this.logError(`恢复失败: ${key}`, error);
                }
            }
            
            this.logInfo('回滚完成');
            
        } catch (error) {
            this.logError('回滚失败', error);
        }
    }
    
    /**
     * 清除新系统数据
     */
    async clearNewSystemData() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('autogen:')) {
                keysToRemove.push(key);
            }
        }
        
        for (const key of keysToRemove) {
            localStorage.removeItem(key);
        }
        
        // 清除内存缓存
        if (this.unifiedStorage.memoryCache) {
            this.unifiedStorage.memoryCache.clear();
        }
    }
    
    /**
     * 工具方法
     */
    
    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }
    
    calculateStorageUsage() {
        let totalSize = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            totalSize += (key.length + value.length) * 2; // UTF-16
        }
        
        return {
            total: totalSize,
            percentage: (totalSize / (5 * 1024 * 1024)) * 100 // 5MB限制
        };
    }
    
    /**
     * 日志方法
     */
    
    logInfo(message) {
        const entry = {
            level: 'INFO',
            message,
            timestamp: new Date().toISOString()
        };
        this.migrationLog.push(entry);
        console.log(`[StorageMigrationTool] ${message}`);
    }
    
    logWarning(message, error = null) {
        const entry = {
            level: 'WARNING',
            message,
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        };
        this.migrationLog.push(entry);
        console.warn(`[StorageMigrationTool] ${message}`, error);
    }
    
    logError(message, error = null) {
        const entry = {
            level: 'ERROR',
            message,
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        };
        this.migrationLog.push(entry);
        console.error(`[StorageMigrationTool] ${message}`, error);
    }
    
    logSuccess(message) {
        const entry = {
            level: 'SUCCESS',
            message,
            timestamp: new Date().toISOString()
        };
        this.migrationLog.push(entry);
        console.log(`[StorageMigrationTool] ✅ ${message}`);
    }
    
    /**
     * 获取迁移报告
     */
    getMigrationReport() {
        const duration = this.migrationStats.endTime - this.migrationStats.startTime;
        
        return {
            summary: {
                duration: duration,
                total: this.migrationStats.total,
                success: this.migrationStats.success,
                failed: this.migrationStats.failed,
                skipped: this.migrationStats.skipped,
                successRate: this.migrationStats.total > 0 ? 
                    (this.migrationStats.success / this.migrationStats.total) * 100 : 0
            },
            log: this.migrationLog,
            stats: this.migrationStats
        };
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageMigrationTool;
}

// 全局导出
window.StorageMigrationTool = StorageMigrationTool;
