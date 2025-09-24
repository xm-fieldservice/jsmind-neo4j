/**
 * 紧急存储空间清理脚本
 * 解决localStorage存储空间不足问题
 */

(function() {
    'use strict';
    
    console.log('[EmergencyCleanup] 开始紧急清理存储空间...');
    
    function emergencyCleanup() {
        // 保留的关键数据
        const criticalKeys = [
            'mindmap_data_v1',
            '__mind_full_cache_v1',
            'autogen_migration_completed'
        ];
        
        let cleanedCount = 0;
        let totalSizeBefore = 0;
        let totalSizeAfter = 0;
        
        // 计算清理前的大小
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                totalSizeBefore += (key.length + value.length) * 2; // UTF-16
            }
        }
        
        // 收集要删除的键
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !criticalKeys.includes(key)) {
                // 清理所有autogen:开头的数据
                if (key.startsWith('autogen:')) {
                    keysToRemove.push(key);
                }
                // 清理重复的迁移数据
                else if (key.includes('_migrated')) {
                    keysToRemove.push(key);
                }
                // 清理快照数据（占用空间大）
                else if (key.includes('snapshot_')) {
                    keysToRemove.push(key);
                }
                // 清理其他临时数据
                else if (key.startsWith('mind:') && key !== 'mindmap_data_v1') {
                    keysToRemove.push(key);
                }
                // 清理注册表数据
                else if (key.startsWith('reg:')) {
                    keysToRemove.push(key);
                }
                // 清理统计数据
                else if (key.includes('stats') || key.includes('cache')) {
                    keysToRemove.push(key);
                }
            }
        }
        
        console.log(`[EmergencyCleanup] 准备清理 ${keysToRemove.length} 个键`);
        
        // 分批删除
        const batchSize = 100;
        for (let i = 0; i < keysToRemove.length; i += batchSize) {
            const batch = keysToRemove.slice(i, i + batchSize);
            batch.forEach(key => {
                try {
                    localStorage.removeItem(key);
                    cleanedCount++;
                } catch (error) {
                    console.warn(`[EmergencyCleanup] 删除失败: ${key}`, error);
                }
            });
            
            // 小延迟避免阻塞
            if (i % 500 === 0) {
                console.log(`[EmergencyCleanup] 已清理 ${cleanedCount} 项...`);
            }
        }
        
        // 计算清理后的大小
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                totalSizeAfter += (key.length + value.length) * 2; // UTF-16
            }
        }
        
        const savedSpace = totalSizeBefore - totalSizeAfter;
        const savedMB = (savedSpace / (1024 * 1024)).toFixed(2);
        
        console.log(`[EmergencyCleanup] ✅ 清理完成:`);
        console.log(`[EmergencyCleanup] - 清理项目: ${cleanedCount} 个`);
        console.log(`[EmergencyCleanup] - 释放空间: ${savedMB} MB`);
        console.log(`[EmergencyCleanup] - 清理前: ${(totalSizeBefore / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`[EmergencyCleanup] - 清理后: ${(totalSizeAfter / (1024 * 1024)).toFixed(2)} MB`);
        
        return {
            cleanedCount,
            savedSpace,
            totalSizeBefore,
            totalSizeAfter
        };
    }
    
    function checkStorageUsage() {
        let totalSize = 0;
        const breakdown = {};
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                const size = (key.length + value.length) * 2;
                totalSize += size;
                
                // 分类统计
                if (key.startsWith('autogen:')) {
                    breakdown.autogen = (breakdown.autogen || 0) + size;
                } else if (key.includes('snapshot')) {
                    breakdown.snapshots = (breakdown.snapshots || 0) + size;
                } else if (key.includes('migrated')) {
                    breakdown.migrated = (breakdown.migrated || 0) + size;
                } else if (key.startsWith('mind:')) {
                    breakdown.mindmaps = (breakdown.mindmaps || 0) + size;
                } else {
                    breakdown.others = (breakdown.others || 0) + size;
                }
            }
        }
        
        const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
        const percentage = (totalSize / (5 * 1024 * 1024)) * 100; // 5MB限制
        
        console.log(`[EmergencyCleanup] 当前存储使用情况:`);
        console.log(`[EmergencyCleanup] - 总大小: ${totalMB} MB (${percentage.toFixed(1)}%)`);
        console.log(`[EmergencyCleanup] - 分类统计:`, Object.keys(breakdown).map(key => 
            `${key}: ${(breakdown[key] / (1024 * 1024)).toFixed(2)} MB`
        ).join(', '));
        
        return { totalSize, breakdown, percentage };
    }
    
    // 执行清理
    console.log('[EmergencyCleanup] 清理前存储状态:');
    checkStorageUsage();
    
    const result = emergencyCleanup();
    
    console.log('[EmergencyCleanup] 清理后存储状态:');
    const afterStats = checkStorageUsage();
    
    // 设置迁移完成标记，避免重复迁移
    try {
        localStorage.setItem('autogen_migration_completed', Date.now().toString());
        console.log('[EmergencyCleanup] 已设置迁移完成标记');
    } catch (error) {
        console.warn('[EmergencyCleanup] 无法设置迁移标记:', error);
    }
    
    // 暴露到全局
    window.EmergencyCleanup = {
        cleanup: emergencyCleanup,
        checkUsage: checkStorageUsage,
        result: result,
        afterStats: afterStats
    };
    
    console.log('[EmergencyCleanup] 清理脚本加载完成，可通过 EmergencyCleanup.cleanup() 手动清理');
    
})();
