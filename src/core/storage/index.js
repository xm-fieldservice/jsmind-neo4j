/**
 * 存储模块入口文件
 * 支持双模式运行：简化存储 + 注册式存储
 */

// 移除冗余存储管理器，统一使用AutogenUnifiedStorage
// import SimpleStorageManager from './SimpleStorageManager.js';
import SimpleDataValidator from './SimpleDataValidator.js';
import StorageRegistry from './StorageRegistry.js';
// import FormalStorageManager from './FormalStorageManager.js';
import StorageMigrator from './StorageMigrator.js';
import { registerDefaultTypes } from './DefaultStorageTypes.js';

/**
 * 初始化存储系统（双模式）
 * @param {Object} options - 初始化选项
 * @param {boolean} options.enableFormal - 是否启用注册式存储
 * @param {boolean} options.autoMigrate - 是否自动迁移数据
 * @returns {Promise<Object>} 初始化结果
 */
async function initializeStorage(options = {}) {
    const {
        enableFormal = true,
        autoMigrate = false
    } = options;

    try {
        console.log('[Storage] 开始初始化双模式存储系统...');

        // 1. 使用AutogenUnifiedStorage替代简化存储系统
        const legacyStorage = window.AutogenUnifiedStorage || null;
        const legacyValidator = new SimpleDataValidator();
        
        let formalStorage = null;
        let registry = null;
        let migrator = null;
        let formalEnabled = enableFormal; // 修复：使用可变变量

        // 2. 初始化注册式存储系统
        if (formalEnabled) {
            try {
                // 创建注册中心
                registry = new StorageRegistry();
                
                // 注册默认类型
                const registrationResult = registerDefaultTypes(registry);
                console.log(`[Storage] 默认类型注册: 成功 ${registrationResult.success}, 失败 ${registrationResult.failed}`);
                
                // 使用AutogenUnifiedStorage替代制式化存储管理器
                formalStorage = window.AutogenUnifiedStorage || null;
                
                // 创建迁移工具
                migrator = new StorageMigrator(formalStorage, registry);
                
                console.log('[Storage] ✅ 注册式存储系统初始化成功');
                
            } catch (formalError) {
                console.warn('[Storage] 注册式存储系统初始化失败，使用简化模式:', formalError);
                formalEnabled = false; // 修复：使用可变变量
            }
        }

        // 3. 自动迁移数据（如果启用）
        let migrationResult = null;
        if (formalEnabled && autoMigrate && migrator) {
            try {
                console.log('[Storage] 开始自动数据迁移...');
                migrationResult = await migrator.migrateAll({
                    dryRun: false,
                    cleanupLegacy: false // 保守策略，不自动清理
                });
                console.log(`[Storage] 数据迁移完成: 成功 ${migrationResult.success}, 失败 ${migrationResult.failed}`);
            } catch (migrationError) {
                console.warn('[Storage] 自动迁移失败:', migrationError);
            }
        }

        // 4. 获取统计信息
        const legacyStats = legacyStorage.getStats();
        const formalStats = formalStorage ? formalStorage.getStats() : null;

        const result = {
            success: true,
            mode: formalEnabled ? 'dual' : 'legacy',
            
            // 简化存储系统（向后兼容）
            legacy: {
                storage: legacyStorage,
                validator: legacyValidator,
                stats: legacyStats
            },
            
            // 注册式存储系统
            formal: formalEnabled ? {
                storage: formalStorage,
                registry: registry,
                migrator: migrator,
                stats: formalStats
            } : null,
            
            // 迁移结果
            migration: migrationResult,
            
            // 统一接口（优先使用注册式）
            storage: formalStorage || legacyStorage,
            validator: legacyValidator,
            registry: registry
        };

        console.log(`[Storage] 双模式存储系统初始化成功 (模式: ${result.mode})`);
        return result;
        
    } catch (error) {
        console.error('[Storage] 存储系统初始化失败:', error);
        
        return {
            success: false,
            error: error.message,
            mode: 'failed',
            legacy: null,
            formal: null,
            storage: null,
            validator: null,
            registry: null
        };
    }
}

/**
 * 初始化简化存储系统（原有接口，保持兼容）
 * @returns {Object} 初始化结果
 */
function initializeSimpleStorage() {
    try {
        const storage = new SimpleStorageManager();
        const validator = new SimpleDataValidator();
        const stats = storage.getStats();
        
        console.log('[Storage] 简化存储系统初始化成功');
        
        return {
            success: true,
            storage,
            validator,
            stats
        };
        
    } catch (error) {
        console.error('[Storage] 简化存储系统初始化失败:', error);
        
        return {
            success: false,
            error: error.message,
            storage: null,
            validator: null,
            stats: null
        };
    }
}

/**
 * 执行数据迁移
 * @param {Object} options - 迁移选项
 * @returns {Object} 迁移结果
 */
async function migrateToFormalStorage(options = {}) {
    try {
        console.log('[Storage] 开始数据迁移到注册式存储...');
        
        // 初始化注册式存储系统
        const registry = new StorageRegistry();
        registerDefaultTypes(registry);
        
        const formalStorage = window.AutogenUnifiedStorage || null;
        const migrator = new StorageMigrator(formalStorage, registry);
        
        // 执行迁移
        const result = await migrator.migrateAll({
            dryRun: options.dryRun || false,
            cleanupLegacy: options.cleanupLegacy || false,
            includeTypes: options.includeTypes || null
        });
        
        console.log(`[Storage] 迁移完成: 成功 ${result.success}, 失败 ${result.failed}`);
        return result;
        
    } catch (error) {
        console.error('[Storage] 数据迁移失败:', error);
        return {
            success: 0,
            failed: 0,
            skipped: 0,
            errors: [error.message],
            details: {}
        };
    }
}

function cleanupStorage(storageInstance, emergency = false) {
    if (!storageInstance) {
        console.error('[Storage] 清理失败: 未提供存储实例');
        return { success: false, error: '未提供存储实例' };
    }
    
    console.log(`[Storage] 开始${emergency ? '紧急' : '常规'}清理...`);
    
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
    
    const result = {
        success: true,
        cleanedCount,
        beforeStats,
        afterStats,
        improvement: beforeStats.keyCount - afterStats.keyCount
    };
    
    console.log('[Storage] 清理完成:', result);
    return result;
}

/**
 * 导出存储数据（用于备份）
 * @param {Object} storageInstance - 存储实例
 * @returns {Object} - 导出的数据
 */
function exportStorageData(storageInstance) {
    if (!storageInstance) {
        console.error('[Storage] 导出失败: 未提供存储实例');
        return { success: false, error: '未提供存储实例' };
    }
    
    console.log('[Storage] 导出存储数据...');
    
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
            console.warn(`[Storage] 导出键"${key}"失败:`, error);
        }
    }
    
    const result = {
        success: true,
        timestamp: new Date().toISOString(),
        version: '1.0',
        exportedCount,
        data
    };
    
    console.log(`[Storage] 导出完成，共导出${exportedCount}个键`);
    return result;
}

/**
 * 导入存储数据（用于恢复）
 * @param {Object} storageInstance - 存储实例
 * @param {Object} importData - 要导入的数据
 * @returns {Object} - 导入结果
 */
function importStorageData(storageInstance, importData) {
    if (!storageInstance) {
        console.error('[Storage] 导入失败: 未提供存储实例');
        return { success: false, error: '未提供存储实例' };
    }
    
    console.log('[Storage] 导入存储数据...');
    
    if (!importData || !importData.data) {
        return {
            success: false,
            error: '导入数据格式无效'
        };
    }
    
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
    
    const result = {
        success: failedCount === 0,
        importedCount,
        failedCount,
        failures
    };
    
    console.log(`[Storage] 导入完成，成功${importedCount}个，失败${failedCount}个`);
    return result;
}

/**
 * 获取健康建议
 * @param {Object} stats - 统计信息
 * @returns {Array} - 建议列表
 */
function _getHealthRecommendations(stats) {
    const recommendations = [];
    
    const usagePercent = parseFloat(stats.usagePercent);
    
    if (usagePercent > 90) {
        recommendations.push('存储使用率过高，建议立即清理');
    } else if (usagePercent > 80) {
        recommendations.push('存储使用率较高，建议定期清理');
    }
    
    if (stats.errors > stats.writes * 0.1) {
        recommendations.push('错误率较高，建议检查数据完整性');
    }
    
    if (stats.keyCount === 0) {
        recommendations.push('没有存储数据，系统正常');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('存储系统运行正常');
    }
    
    return recommendations;
}

// 导出主要类
if (typeof window !== 'undefined') {
    window.SimpleStorageManager = SimpleStorageManager;
    window.SimpleDataValidator = SimpleDataValidator;
    window.StorageRegistry = StorageRegistry;
    // window.FormalStorageManager = FormalStorageManager; // 已删除，使用AutogenUnifiedStorage
    window.StorageMigrator = StorageMigrator;

    window.initializeStorage = initializeStorage;
    window.initializeSimpleStorage = initializeSimpleStorage;
    window.migrateToFormalStorage = migrateToFormalStorage;
    window.cleanupStorage = cleanupStorage;
    window.exportStorageData = exportStorageData;
    window.importStorageData = importStorageData;
}
