/**
 * 数据备份工具 - 第二阶段架构统一前的安全备份
 */

(function() {
    'use strict';
    
    const DataBackup = {
        
        /**
         * 创建完整的localStorage备份
         */
        createFullBackup() {
            console.log('🔄 开始创建localStorage完整备份...');
            
            const backup = {
                timestamp: new Date().toISOString(),
                version: '2.0-pre-unification',
                data: {},
                stats: {
                    totalItems: 0,
                    totalSize: 0,
                    categories: {}
                }
            };
            
            // 备份所有localStorage数据
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    try {
                        const value = localStorage.getItem(key);
                        backup.data[key] = value;
                        backup.stats.totalItems++;
                        backup.stats.totalSize += key.length + value.length;
                        
                        // 分类统计
                        const category = this.categorizeKey(key);
                        if (!backup.stats.categories[category]) {
                            backup.stats.categories[category] = { count: 0, size: 0 };
                        }
                        backup.stats.categories[category].count++;
                        backup.stats.categories[category].size += key.length + value.length;
                        
                    } catch (error) {
                        console.warn(`备份失败: ${key}`, error);
                    }
                }
            }
            
            // 保存备份到文件
            const backupJson = JSON.stringify(backup, null, 2);
            const blob = new Blob([backupJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `localStorage_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ localStorage备份完成');
            console.log(`📊 备份统计: ${backup.stats.totalItems}项, ${Math.round(backup.stats.totalSize/1024)}KB`);
            console.log('📁 分类统计:', backup.stats.categories);
            
            return backup;
        },
        
        /**
         * 分类存储键
         */
        categorizeKey(key) {
            if (key.startsWith('autogen:')) return 'AutogenUnifiedStorage';
            if (key.startsWith('mm:')) return 'MindmapData';
            if (key.startsWith('reg:')) return 'Registry';
            if (key.includes('mindmap')) return 'MindmapLegacy';
            if (key.includes('cache')) return 'Cache';
            if (key.includes('favorites') || key.includes('archived')) return 'UserPrefs';
            if (key.startsWith('__')) return 'SystemData';
            return 'Other';
        },
        
        /**
         * 验证关键数据完整性
         */
        validateCriticalData() {
            console.log('🔍 验证关键数据完整性...');
            
            const criticalKeys = [
                'mindmap_data_v1',
                '__mind_full_cache_v1'
            ];
            
            const results = {
                valid: true,
                missing: [],
                corrupted: [],
                details: {}
            };
            
            criticalKeys.forEach(key => {
                try {
                    const value = localStorage.getItem(key);
                    if (!value) {
                        results.missing.push(key);
                        results.valid = false;
                    } else {
                        // 尝试解析JSON
                        const parsed = JSON.parse(value);
                        results.details[key] = {
                            size: value.length,
                            type: typeof parsed,
                            hasData: !!(parsed && (parsed.data || parsed.format))
                        };
                        console.log(`✅ ${key}: ${Math.round(value.length/1024)}KB`);
                    }
                } catch (error) {
                    results.corrupted.push({ key, error: error.message });
                    results.valid = false;
                    console.error(`❌ ${key}: 数据损坏`, error);
                }
            });
            
            if (results.valid) {
                console.log('✅ 关键数据完整性验证通过');
            } else {
                console.warn('⚠️ 发现数据问题:', results);
            }
            
            return results;
        },
        
        /**
         * 创建回滚点
         */
        createRollbackPoint() {
            console.log('📍 创建回滚点...');
            
            const rollbackData = {
                timestamp: new Date().toISOString(),
                phase: 'pre-unification',
                criticalData: {}
            };
            
            // 备份关键数据到内存
            const criticalKeys = [
                'mindmap_data_v1',
                '__mind_full_cache_v1',
                '__registry_fallback__'
            ];
            
            criticalKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                    rollbackData.criticalData[key] = value;
                }
            });
            
            // 保存到sessionStorage作为临时回滚点
            try {
                sessionStorage.setItem('__rollback_point__', JSON.stringify(rollbackData));
                console.log('✅ 回滚点创建成功');
                return true;
            } catch (error) {
                console.error('❌ 回滚点创建失败:', error);
                return false;
            }
        },
        
        /**
         * 执行回滚
         */
        rollback() {
            console.log('🔄 执行回滚...');
            
            try {
                const rollbackData = JSON.parse(sessionStorage.getItem('__rollback_point__'));
                if (!rollbackData) {
                    console.error('❌ 未找到回滚点');
                    return false;
                }
                
                // 恢复关键数据
                Object.entries(rollbackData.criticalData).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                    console.log(`✅ 恢复: ${key}`);
                });
                
                console.log('✅ 回滚完成');
                return true;
            } catch (error) {
                console.error('❌ 回滚失败:', error);
                return false;
            }
        }
    };
    
    // 全局导出
    window.DataBackup = DataBackup;
    
    // 快捷命令
    window.backupData = () => DataBackup.createFullBackup();
    window.validateData = () => DataBackup.validateCriticalData();
    window.createRollback = () => DataBackup.createRollbackPoint();
    window.rollbackData = () => DataBackup.rollback();
    
    console.log('🛡️ 数据备份工具已加载');
    console.log('💡 使用方法:');
    console.log('  backupData() - 创建完整备份');
    console.log('  validateData() - 验证数据完整性');
    console.log('  createRollback() - 创建回滚点');
    console.log('  rollbackData() - 执行回滚');
    
})();
