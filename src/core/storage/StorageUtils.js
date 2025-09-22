/**
 * 存储工具模块
 * 提供统一的存储操作接口和工具函数
 */

/**
 * 存储工具类
 * 提供基于初始化结果的统一操作接口
 */
export class StorageUtils {
    constructor(initResult) {
        if (!initResult || !initResult.success) {
            throw new Error('存储系统初始化失败，无法创建工具实例');
        }
        
        this.initResult = initResult;
        this.mode = initResult.mode;
        this.storage = initResult.storage;
        this.validator = initResult.validator;
        this.registry = initResult.registry;
        
        // 根据模式选择合适的存储实例
        this.legacyStorage = initResult.legacy?.storage;
        this.formalStorage = initResult.formal?.storage;
        this.migrator = initResult.formal?.migrator;
    }

    /**
     * 获取当前存储模式
     * @returns {string} 存储模式 ('dual', 'legacy', 'formal')
     */
    getMode() {
        return this.mode;
    }

    /**
     * 获取存储统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const stats = {
            mode: this.mode,
            timestamp: new Date().toISOString()
        };

        if (this.legacyStorage) {
            stats.legacy = this.legacyStorage.getStats();
        }

        if (this.formalStorage) {
            stats.formal = this.formalStorage.getStats();
        }

        return stats;
    }

    /**
     * 清理存储空间
     * @param {boolean} emergency - 是否紧急清理
     * @returns {Object} 清理结果
     */
    async cleanup(emergency = false) {
        const results = {
            success: true,
            mode: this.mode,
            legacy: null,
            formal: null,
            errors: []
        };

        // 清理简化存储
        if (this.legacyStorage) {
            try {
                results.legacy = await this._cleanupStorage(this.legacyStorage, emergency);
            } catch (error) {
                results.errors.push(`Legacy cleanup failed: ${error.message}`);
                results.success = false;
            }
        }

        // 清理注册式存储
        if (this.formalStorage) {
            try {
                results.formal = await this._cleanupFormalStorage(emergency);
            } catch (error) {
                results.errors.push(`Formal cleanup failed: ${error.message}`);
                results.success = false;
            }
        }

        return results;
    }

    /**
     * 导出存储数据
     * @param {Object} options - 导出选项
     * @returns {Object} 导出结果
     */
    async exportData(options = {}) {
        const {
            includeLegacy = true,
            includeFormal = true,
            format = 'json'
        } = options;

        const exportResult = {
            success: true,
            timestamp: new Date().toISOString(),
            version: '2.0',
            mode: this.mode,
            data: {},
            stats: {
                legacy: { exported: 0, failed: 0 },
                formal: { exported: 0, failed: 0 }
            },
            errors: []
        };

        // 导出简化存储数据
        if (includeLegacy && this.legacyStorage) {
            try {
                const legacyResult = await this._exportStorageData(this.legacyStorage);
                if (legacyResult.success) {
                    exportResult.data.legacy = legacyResult.data;
                    exportResult.stats.legacy.exported = legacyResult.exportedCount;
                } else {
                    exportResult.errors.push(`Legacy export failed: ${legacyResult.error}`);
                }
            } catch (error) {
                exportResult.errors.push(`Legacy export error: ${error.message}`);
                exportResult.success = false;
            }
        }

        // 导出注册式存储数据
        if (includeFormal && this.formalStorage) {
            try {
                const formalResult = await this._exportFormalData();
                exportResult.data.formal = formalResult.data;
                exportResult.stats.formal.exported = formalResult.exported;
            } catch (error) {
                exportResult.errors.push(`Formal export error: ${error.message}`);
                exportResult.success = false;
            }
        }

        return exportResult;
    }

    /**
     * 导入存储数据
     * @param {Object} importData - 导入数据
     * @param {Object} options - 导入选项
     * @returns {Object} 导入结果
     */
    async importData(importData, options = {}) {
        const {
            overwrite = false,
            validateData = true
        } = options;

        const importResult = {
            success: true,
            timestamp: new Date().toISOString(),
            stats: {
                legacy: { imported: 0, failed: 0 },
                formal: { imported: 0, failed: 0 }
            },
            errors: []
        };

        // 验证导入数据格式
        if (validateData && !this._validateImportData(importData)) {
            return {
                success: false,
                error: '导入数据格式无效'
            };
        }

        // 导入简化存储数据
        if (importData.data?.legacy && this.legacyStorage) {
            try {
                const legacyResult = await this._importStorageData(
                    this.legacyStorage, 
                    { data: importData.data.legacy }
                );
                importResult.stats.legacy = {
                    imported: legacyResult.importedCount,
                    failed: legacyResult.failedCount
                };
                if (legacyResult.failures?.length > 0) {
                    importResult.errors.push(...legacyResult.failures.map(f => `Legacy: ${f.error}`));
                }
            } catch (error) {
                importResult.errors.push(`Legacy import error: ${error.message}`);
                importResult.success = false;
            }
        }

        // 导入注册式存储数据
        if (importData.data?.formal && this.formalStorage) {
            try {
                const formalResult = await this._importFormalData(importData.data.formal, options);
                importResult.stats.formal = formalResult.stats;
                if (formalResult.errors?.length > 0) {
                    importResult.errors.push(...formalResult.errors);
                }
            } catch (error) {
                importResult.errors.push(`Formal import error: ${error.message}`);
                importResult.success = false;
            }
        }

        return importResult;
    }

    /**
     * 执行数据迁移
     * @param {Object} options - 迁移选项
     * @returns {Object} 迁移结果
     */
    async migrate(options = {}) {
        if (!this.migrator) {
            return {
                success: false,
                error: '迁移工具不可用（注册式存储未初始化）'
            };
        }

        try {
            const result = await this.migrator.migrateAll({
                dryRun: options.dryRun || false,
                cleanupLegacy: options.cleanupLegacy || false,
                includeTypes: options.includeTypes || null
            });

            return {
                success: true,
                ...result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 健康检查
     * @returns {Object} 健康检查结果
     */
    async healthCheck() {
        const health = {
            overall: 'healthy',
            timestamp: new Date().toISOString(),
            mode: this.mode,
            checks: {
                legacy: null,
                formal: null,
                migration: null
            },
            recommendations: []
        };

        // 检查简化存储
        if (this.legacyStorage) {
            health.checks.legacy = await this._checkLegacyHealth();
        }

        // 检查注册式存储
        if (this.formalStorage) {
            health.checks.formal = await this._checkFormalHealth();
        }

        // 检查迁移状态
        if (this.migrator) {
            health.checks.migration = await this._checkMigrationHealth();
        }

        // 生成整体健康状态和建议
        health.overall = this._calculateOverallHealth(health.checks);
        health.recommendations = this._generateHealthRecommendations(health.checks);

        return health;
    }

    // ==================== 私有方法 ====================

    /**
     * 清理存储实例
     * @private
     */
    async _cleanupStorage(storageInstance, emergency = false) {
        const beforeStats = storageInstance.getStats();
        let cleanedCount = 0;

        if (emergency) {
            cleanedCount = storageInstance._emergencyCleanup();
        } else {
            // 常规清理：清理超过限制的键
            while (storageInstance._getOurKeyCount() > storageInstance.maxKeys * 0.8) {
                if (!storageInstance._cleanupOldest()) {
                    break; // 无法继续清理
                }
                cleanedCount++;
            }
        }

        const afterStats = storageInstance.getStats();

        return {
            success: true,
            cleanedCount,
            beforeStats,
            afterStats,
            improvement: beforeStats.keyCount - afterStats.keyCount
        };
    }

    /**
     * 清理注册式存储
     * @private
     */
    async _cleanupFormalStorage(emergency = false) {
        // 注册式存储的清理逻辑
        const types = this.registry.listTypes();
        let totalCleaned = 0;

        for (const type of types) {
            try {
                const items = this.formalStorage.list(type);
                if (emergency) {
                    // 紧急清理：清理所有过期数据
                    const cleaned = await this._emergencyCleanupType(type, items);
                    totalCleaned += cleaned;
                } else {
                    // 常规清理：按策略清理
                    const cleaned = await this._regularCleanupType(type, items);
                    totalCleaned += cleaned;
                }
            } catch (error) {
                console.warn(`[StorageUtils] 清理类型 ${type} 失败:`, error);
            }
        }

        return {
            success: true,
            cleanedCount: totalCleaned,
            types: types.length
        };
    }

    /**
     * 导出存储数据
     * @private
     */
    async _exportStorageData(storageInstance) {
        const keys = storageInstance.listKeys();
        const data = {};
        let exportedCount = 0;

        for (const key of keys) {
            try {
                const value = storageInstance.get(key);
                if (value !== null) {
                    data[key] = value;
                    exportedCount++;
                }
            } catch (error) {
                console.warn(`[StorageUtils] 导出键"${key}"失败:`, error);
            }
        }

        return {
            success: true,
            exportedCount,
            data
        };
    }

    /**
     * 导出注册式存储数据
     * @private
     */
    async _exportFormalData() {
        const types = this.registry.listTypes();
        const data = {};
        let exported = 0;

        for (const type of types) {
            try {
                const items = this.formalStorage.list(type);
                data[type] = {};
                
                for (const id of items) {
                    const item = this.formalStorage.retrieve(type, id);
                    if (item) {
                        data[type][id] = item;
                        exported++;
                    }
                }
            } catch (error) {
                console.warn(`[StorageUtils] 导出类型 ${type} 失败:`, error);
            }
        }

        return { data, exported };
    }

    /**
     * 导入存储数据
     * @private
     */
    async _importStorageData(storageInstance, importData) {
        let importedCount = 0;
        let failedCount = 0;
        const failures = [];

        for (const [key, value] of Object.entries(importData.data)) {
            try {
                if (storageInstance.set(key, value)) {
                    importedCount++;
                } else {
                    failedCount++;
                    failures.push({ key, error: '存储失败' });
                }
            } catch (error) {
                failedCount++;
                failures.push({ key, error: error.message });
            }
        }

        return {
            success: failedCount === 0,
            importedCount,
            failedCount,
            failures
        };
    }

    /**
     * 导入注册式存储数据
     * @private
     */
    async _importFormalData(formalData, options) {
        const stats = { imported: 0, failed: 0 };
        const errors = [];

        for (const [type, items] of Object.entries(formalData)) {
            if (!this.registry.isRegistered(type)) {
                errors.push(`未知存储类型: ${type}`);
                continue;
            }

            for (const [id, data] of Object.entries(items)) {
                try {
                    const success = this.formalStorage.store(type, id, data);
                    if (success) {
                        stats.imported++;
                    } else {
                        stats.failed++;
                        errors.push(`存储失败: ${type}/${id}`);
                    }
                } catch (error) {
                    stats.failed++;
                    errors.push(`存储错误: ${type}/${id} - ${error.message}`);
                }
            }
        }

        return { stats, errors };
    }

    /**
     * 验证导入数据格式
     * @private
     */
    _validateImportData(importData) {
        if (!importData || typeof importData !== 'object') {
            return false;
        }

        if (!importData.data || typeof importData.data !== 'object') {
            return false;
        }

        return true;
    }

    /**
     * 检查简化存储健康状态
     * @private
     */
    async _checkLegacyHealth() {
        const stats = this.legacyStorage.getStats();
        const usagePercent = parseFloat(stats.usagePercent);
        
        return {
            status: usagePercent > 90 ? 'warning' : 'healthy',
            stats,
            issues: usagePercent > 90 ? ['存储使用率过高'] : []
        };
    }

    /**
     * 检查注册式存储健康状态
     * @private
     */
    async _checkFormalHealth() {
        const stats = this.formalStorage.getStats();
        const types = this.registry.listTypes();
        
        return {
            status: 'healthy',
            stats,
            registeredTypes: types.length,
            issues: []
        };
    }

    /**
     * 检查迁移健康状态
     * @private
     */
    async _checkMigrationHealth() {
        // 检查是否有待迁移的数据
        const legacyKeys = this.legacyStorage.listKeys();
        const legacyDataCount = legacyKeys.filter(key => 
            key.startsWith('mind:') || key.startsWith('project:')
        ).length;

        return {
            status: legacyDataCount > 0 ? 'pending' : 'completed',
            legacyDataCount,
            issues: legacyDataCount > 0 ? ['存在未迁移的数据'] : []
        };
    }

    /**
     * 计算整体健康状态
     * @private
     */
    _calculateOverallHealth(checks) {
        const statuses = Object.values(checks)
            .filter(check => check !== null)
            .map(check => check.status);

        if (statuses.includes('error')) return 'error';
        if (statuses.includes('warning')) return 'warning';
        if (statuses.includes('pending')) return 'pending';
        return 'healthy';
    }

    /**
     * 生成健康建议
     * @private
     */
    _generateHealthRecommendations(checks) {
        const recommendations = [];

        if (checks.legacy?.status === 'warning') {
            recommendations.push('建议清理简化存储空间');
        }

        if (checks.migration?.status === 'pending') {
            recommendations.push('建议执行数据迁移到注册式存储');
        }

        if (recommendations.length === 0) {
            recommendations.push('存储系统运行正常');
        }

        return recommendations;
    }

    /**
     * 紧急清理指定类型
     * @private
     */
    async _emergencyCleanupType(type, items) {
        // 实现紧急清理逻辑
        return 0;
    }

    /**
     * 常规清理指定类型
     * @private
     */
    async _regularCleanupType(type, items) {
        // 实现常规清理逻辑
        return 0;
    }
}

/**
 * 创建存储工具实例
 * @param {Object} initResult - 存储系统初始化结果
 * @returns {StorageUtils} 存储工具实例
 */
export function createStorageUtils(initResult) {
    return new StorageUtils(initResult);
}

export default StorageUtils;
