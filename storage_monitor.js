/**
 * 存储监控工具
 * 监控LocalStorage使用情况，提供清理建议
 */

(function() {
    'use strict';
    
    const StorageMonitor = {
        
        /**
         * 获取存储使用统计
         */
        getStorageStats() {
            let totalSize = 0;
            let itemCount = 0;
            const items = [];
            
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    const value = localStorage[key];
                    const size = key.length + value.length;
                    totalSize += size;
                    itemCount++;
                    
                    items.push({
                        key,
                        size,
                        sizeKB: Math.round(size / 1024),
                        type: this.categorizeKey(key)
                    });
                }
            }
            
            // 按大小排序
            items.sort((a, b) => b.size - a.size);
            
            return {
                totalSize,
                totalSizeKB: Math.round(totalSize / 1024),
                totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
                itemCount,
                items,
                quota: 5 * 1024 * 1024, // 假设5MB配额
                usagePercent: Math.round((totalSize / (5 * 1024 * 1024)) * 100)
            };
        },
        
        /**
         * 分类存储键
         */
        categorizeKey(key) {
            if (key.startsWith('autogen:')) return 'AutogenStorage';
            if (key.startsWith('mindmap_')) return 'Mindmap';
            if (key.startsWith('mind:')) return 'MindController';
            if (key.startsWith('reg:')) return 'Registry';
            if (key.includes('cache')) return 'Cache';
            if (key.includes('temp')) return 'Temporary';
            if (key.includes('backup')) return 'Backup';
            return 'Other';
        },
        
        /**
         * 获取清理建议
         */
        getCleanupSuggestions() {
            const stats = this.getStorageStats();
            const suggestions = [];
            
            // 检查使用率
            if (stats.usagePercent > 80) {
                suggestions.push({
                    type: 'critical',
                    message: `存储使用率过高 (${stats.usagePercent}%)，建议立即清理`,
                    action: 'emergencyCleanup'
                });
            } else if (stats.usagePercent > 60) {
                suggestions.push({
                    type: 'warning',
                    message: `存储使用率较高 (${stats.usagePercent}%)，建议定期清理`,
                    action: 'regularCleanup'
                });
            }
            
            // 检查大文件
            const largeItems = stats.items.filter(item => item.sizeKB > 100);
            if (largeItems.length > 0) {
                suggestions.push({
                    type: 'info',
                    message: `发现 ${largeItems.length} 个大文件 (>100KB)`,
                    action: 'reviewLargeFiles',
                    items: largeItems.slice(0, 5) // 只显示前5个
                });
            }
            
            // 检查临时文件
            const tempItems = stats.items.filter(item => 
                item.type === 'Temporary' || 
                item.key.includes('temp') || 
                item.key.includes('cache')
            );
            if (tempItems.length > 0) {
                suggestions.push({
                    type: 'info',
                    message: `发现 ${tempItems.length} 个临时/缓存文件`,
                    action: 'cleanTempFiles',
                    items: tempItems.slice(0, 5)
                });
            }
            
            return suggestions;
        },
        
        /**
         * 执行清理操作
         */
        async performCleanup(type = 'safe') {
            const beforeStats = this.getStorageStats();
            let cleanedCount = 0;
            let cleanedSize = 0;
            
            const keysToRemove = [];
            
            switch (type) {
                case 'emergency':
                    // 紧急清理：删除所有非关键数据
                    for (let key in localStorage) {
                        if (localStorage.hasOwnProperty(key)) {
                            if (this.isSafeToDelete(key, 'emergency')) {
                                keysToRemove.push(key);
                            }
                        }
                    }
                    break;
                    
                case 'regular':
                    // 常规清理：删除临时和过期数据
                    for (let key in localStorage) {
                        if (localStorage.hasOwnProperty(key)) {
                            if (this.isSafeToDelete(key, 'regular')) {
                                keysToRemove.push(key);
                            }
                        }
                    }
                    break;
                    
                case 'safe':
                default:
                    // 安全清理：只删除明确的临时数据
                    for (let key in localStorage) {
                        if (localStorage.hasOwnProperty(key)) {
                            if (this.isSafeToDelete(key, 'safe')) {
                                keysToRemove.push(key);
                            }
                        }
                    }
                    break;
            }
            
            // 执行删除
            keysToRemove.forEach(key => {
                try {
                    const size = localStorage[key].length + key.length;
                    localStorage.removeItem(key);
                    cleanedCount++;
                    cleanedSize += size;
                } catch (error) {
                    console.warn(`清理失败: ${key}`, error);
                }
            });
            
            const afterStats = this.getStorageStats();
            
            return {
                type,
                cleanedCount,
                cleanedSize,
                cleanedSizeKB: Math.round(cleanedSize / 1024),
                beforeStats,
                afterStats,
                savedPercent: Math.round(((beforeStats.totalSize - afterStats.totalSize) / beforeStats.totalSize) * 100)
            };
        },
        
        /**
         * 判断是否可以安全删除
         */
        isSafeToDelete(key, level) {
            // 永远不删除的关键数据
            const criticalKeys = [
                'mindmap_data_v1',
                '__mind_full_cache_v1'
            ];
            
            if (criticalKeys.includes(key)) {
                return false;
            }
            
            switch (level) {
                case 'emergency':
                    // 紧急情况：删除除关键数据外的所有内容
                    return !key.includes('mindmap_data_v1') && !key.includes('__mind_full_cache_v1');
                    
                case 'regular':
                    // 常规清理：删除临时、缓存、备份数据
                    return key.includes('temp_') || 
                           key.includes('cache_') || 
                           key.includes('backup_') ||
                           key.includes('snapshot_') ||
                           (key.startsWith('autogen:') && !key.includes('mindmap_data_v1')) ||
                           key.includes('_old') ||
                           key.includes('_v0');
                           
                case 'safe':
                default:
                    // 安全清理：只删除明确的临时数据
                    return key.includes('temp_') || 
                           key.includes('cache_') ||
                           key.includes('test_');
            }
        },
        
        /**
         * 显示存储报告
         */
        showReport() {
            const stats = this.getStorageStats();
            const suggestions = this.getCleanupSuggestions();
            
            console.log('📊 LocalStorage 使用报告');
            console.log('================================');
            console.log(`总大小: ${stats.totalSizeMB}MB (${stats.totalSizeKB}KB)`);
            console.log(`项目数: ${stats.itemCount}`);
            console.log(`使用率: ${stats.usagePercent}%`);
            console.log('');
            
            console.log('📁 按类型分组:');
            const byType = {};
            stats.items.forEach(item => {
                if (!byType[item.type]) {
                    byType[item.type] = { count: 0, size: 0 };
                }
                byType[item.type].count++;
                byType[item.type].size += item.size;
            });
            
            Object.entries(byType).forEach(([type, data]) => {
                console.log(`  ${type}: ${data.count}项, ${Math.round(data.size/1024)}KB`);
            });
            console.log('');
            
            console.log('🔍 最大的5个项目:');
            stats.items.slice(0, 5).forEach((item, index) => {
                console.log(`  ${index + 1}. ${item.key}: ${item.sizeKB}KB`);
            });
            console.log('');
            
            if (suggestions.length > 0) {
                console.log('💡 清理建议:');
                suggestions.forEach((suggestion, index) => {
                    const icon = suggestion.type === 'critical' ? '🚨' : 
                                suggestion.type === 'warning' ? '⚠️' : 'ℹ️';
                    console.log(`  ${icon} ${suggestion.message}`);
                });
            } else {
                console.log('✅ 存储状态良好，无需清理');
            }
            
            return { stats, suggestions };
        },
        
        /**
         * 交互式清理
         */
        async interactiveCleanup() {
            const report = this.showReport();
            
            if (report.suggestions.length === 0) {
                console.log('✅ 无需清理');
                return;
            }
            
            console.log('');
            console.log('🧹 可用的清理选项:');
            console.log('1. 安全清理 (只删除临时文件)');
            console.log('2. 常规清理 (删除缓存和备份)');
            console.log('3. 紧急清理 (删除所有非关键数据)');
            console.log('');
            console.log('使用方法:');
            console.log('  await StorageMonitor.performCleanup("safe")');
            console.log('  await StorageMonitor.performCleanup("regular")');
            console.log('  await StorageMonitor.performCleanup("emergency")');
        }
    };
    
    // 全局导出
    window.StorageMonitor = StorageMonitor;
    
    // 添加快捷命令
    window.checkStorage = () => StorageMonitor.showReport();
    window.cleanStorage = (type = 'safe') => StorageMonitor.performCleanup(type);
    
    console.log('📊 存储监控工具已加载');
    console.log('💡 使用 checkStorage() 查看存储状态');
    console.log('🧹 使用 cleanStorage() 执行清理');
    
})();
