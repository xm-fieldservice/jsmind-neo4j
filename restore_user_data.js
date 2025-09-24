/**
 * 用户数据恢复脚本
 * 用于恢复被测试覆盖的用户脑图数据
 */

(function() {
    'use strict';
    
    const DataRestorer = {
        
        /**
         * 恢复用户的真实脑图数据
         */
        async restoreUserData() {
            console.log('🔄 开始恢复用户数据...');
            
            try {
                // 检查AutogenUnifiedStorage中是否有真实的用户数据
                if (window.AutogenUnifiedStorage) {
                    // 尝试获取最近的真实数据
                    const realData = await window.AutogenUnifiedStorage.retrieve('mindmap', 'mindmap_data_v1');
                    
                    if (realData && realData.id && !realData.id.includes('mock') && !realData.id.includes('test')) {
                        console.log('✅ 找到真实用户数据:', realData.id);
                        
                        // 恢复到MindmapController
                        if (window.mindmapController) {
                            window.mindmapController.data = realData;
                            window.mindmapController.renderMindmap();
                            console.log('✅ 用户数据已恢复到脑图');
                            return true;
                        }
                    }
                }
                
                // 如果没找到，尝试从localStorage恢复
                const legacyData = localStorage.getItem('mindmap_data_v1');
                if (legacyData) {
                    try {
                        const parsed = JSON.parse(legacyData);
                        if (parsed && parsed.data && !parsed.data.id.includes('mock') && !parsed.data.id.includes('test')) {
                            console.log('✅ 从localStorage找到用户数据');
                            
                            if (window.mindmapController) {
                                window.mindmapController.data = parsed.data;
                                window.mindmapController.renderMindmap();
                                console.log('✅ 用户数据已从localStorage恢复');
                                return true;
                            }
                        }
                    } catch (e) {
                        console.warn('解析localStorage数据失败:', e);
                    }
                }
                
                console.warn('⚠️ 未找到有效的用户数据，将创建新的默认数据');
                this.createDefaultData();
                return false;
                
            } catch (error) {
                console.error('❌ 数据恢复失败:', error);
                this.createDefaultData();
                return false;
            }
        },
        
        /**
         * 创建默认数据
         */
        createDefaultData() {
            if (window.mindmapController) {
                const defaultData = window.mindmapController.getDefaultData();
                window.mindmapController.data = defaultData;
                window.mindmapController.renderMindmap();
                window.mindmapController.saveMindmapToStorage();
                console.log('✅ 已创建新的默认脑图数据');
            }
        },
        
        /**
         * 清理测试数据
         */
        async cleanTestData() {
            console.log('🧹 清理测试数据...');
            
            try {
                if (window.AutogenUnifiedStorage) {
                    // 清理已知的测试数据键
                    const testKeys = [
                        'test_key', 'test_consistency', 'cleanup_test',
                        'small_data', 'large_data'
                    ];
                    
                    for (const key of testKeys) {
                        try {
                            await window.AutogenUnifiedStorage.remove('mindmap', key);
                            await window.AutogenUnifiedStorage.remove('test', key);
                            console.log('🗑️ 已清理测试数据:', key);
                        } catch (e) {
                            // 忽略不存在的键
                        }
                    }
                }
                
                // 清理Registry中的测试数据
                if (window.Registry && window.Registry.store) {
                    const registryData = window.Registry.store.getAll();
                    const cleanData = registryData.filter(item => 
                        !item.id.includes('mock') && 
                        !item.id.includes('test') &&
                        !item.name.includes('测试') &&
                        !item.name.includes('模拟')
                    );
                    
                    // 重新设置清理后的数据
                    window.Registry.store.clear();
                    cleanData.forEach(item => {
                        window.Registry.store.add(item);
                    });
                    
                    console.log('✅ Registry测试数据已清理');
                }
                
                console.log('✅ 测试数据清理完成');
                
            } catch (error) {
                console.error('❌ 清理测试数据失败:', error);
            }
        }
    };
    
    // 暴露到全局
    window.DataRestorer = DataRestorer;
    
    // 页面加载完成后自动恢复数据
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                DataRestorer.restoreUserData();
                DataRestorer.cleanTestData();
            }, 5000); // 等待测试完成后再恢复
        });
    } else {
        setTimeout(() => {
            DataRestorer.restoreUserData();
            DataRestorer.cleanTestData();
        }, 5000);
    }
    
})();
