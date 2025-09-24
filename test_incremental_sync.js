/**
 * 增量同步到JSON底座测试脚本
 * 验证方案A：轻量级增量同步功能
 */

(function() {
    'use strict';
    
    const IncrementalSyncTester = {
        
        /**
         * 测试增量同步功能
         */
        async testIncrementalSync() {
            console.log('🚀 开始测试增量同步功能');
            
            const results = [];
            
            try {
                // 测试1: 检查同步方法是否存在
                if (window.mindmapController && typeof window.mindmapController._syncToJsonBase === 'function') {
                    results.push({
                        test: '同步方法可用性',
                        result: '✅ 通过'
                    });
                } else {
                    results.push({
                        test: '同步方法可用性',
                        result: '❌ 失败: _syncToJsonBase方法不存在'
                    });
                }
                
                // 测试2: 检查哈希计算方法
                if (window.mindmapController && typeof window.mindmapController._calculateDataHash === 'function') {
                    const testData = { test: 'data', timestamp: Date.now() };
                    const hash1 = window.mindmapController._calculateDataHash(testData);
                    const hash2 = window.mindmapController._calculateDataHash(testData);
                    
                    if (hash1 === hash2 && hash1 !== null) {
                        results.push({
                            test: '哈希计算一致性',
                            result: '✅ 通过'
                        });
                    } else {
                        results.push({
                            test: '哈希计算一致性',
                            result: '❌ 失败: 哈希计算不一致'
                        });
                    }
                } else {
                    results.push({
                        test: '哈希计算方法',
                        result: '❌ 失败: _calculateDataHash方法不存在'
                    });
                }
                
                // 测试3: 检查后端API可用性
                try {
                    const response = await fetch('http://localhost:5001/health');
                    if (response.ok) {
                        results.push({
                            test: '后端API连接',
                            result: '✅ 通过'
                        });
                    } else {
                        results.push({
                            test: '后端API连接',
                            result: '⚠️ 警告: API响应异常'
                        });
                    }
                } catch (error) {
                    results.push({
                        test: '后端API连接',
                        result: '⚠️ 警告: API不可用（不影响本地功能）'
                    });
                }
                
                // 测试4: 模拟增量同步
                if (window.mindmapController && window.mindmapController.data) {
                    try {
                        // 触发一次保存，应该会自动调用增量同步
                        await window.mindmapController.saveMindmapToStorage(true);
                        
                        results.push({
                            test: '模拟增量同步触发',
                            result: '✅ 通过'
                        });
                    } catch (error) {
                        results.push({
                            test: '模拟增量同步触发',
                            result: `❌ 失败: ${error.message}`
                        });
                    }
                } else {
                    results.push({
                        test: '模拟增量同步触发',
                        result: '⚠️ 跳过: 无可用脑图数据'
                    });
                }
                
                // 测试5: 检查事件系统集成
                let eventReceived = false;
                const eventHandler = (data) => {
                    eventReceived = true;
                    console.log('📡 收到JSON底座同步事件:', data);
                };
                
                if (window.AutogenEventBus) {
                    window.AutogenEventBus.on('mindmap:jsonBaseSynced', eventHandler);
                    
                    // 等待可能的事件
                    setTimeout(() => {
                        window.AutogenEventBus.off('mindmap:jsonBaseSynced', eventHandler);
                        
                        results.push({
                            test: '事件系统集成',
                            result: eventReceived ? '✅ 通过' : '⚠️ 无事件（正常，取决于数据变更）'
                        });
                        
                        this.displayResults(results);
                    }, 3000);
                } else {
                    results.push({
                        test: '事件系统集成',
                        result: '❌ 失败: AutogenEventBus不可用'
                    });
                    this.displayResults(results);
                }
                
            } catch (error) {
                console.error('❌ 增量同步测试异常:', error);
                results.push({
                    test: '测试执行',
                    result: `❌ 异常: ${error.message}`
                });
                this.displayResults(results);
            }
        },
        
        /**
         * 显示测试结果
         */
        displayResults(results) {
            console.log('\n📊 增量同步测试结果:');
            console.log('='.repeat(50));
            
            let passedCount = 0;
            let totalCount = results.length;
            
            results.forEach(result => {
                console.log(`${result.test}: ${result.result}`);
                if (result.result.includes('✅')) {
                    passedCount++;
                }
            });
            
            console.log('='.repeat(50));
            console.log(`📈 通过率: ${passedCount}/${totalCount} (${Math.round(passedCount/totalCount*100)}%)`);
            
            if (passedCount === totalCount) {
                console.log('🎉 增量同步功能测试全部通过！');
            } else if (passedCount >= totalCount * 0.8) {
                console.log('✅ 增量同步功能基本正常，部分功能需要后端支持');
            } else {
                console.log('⚠️ 增量同步功能存在问题，需要检查');
            }
        },
        
        /**
         * 手动触发同步测试
         */
        async manualSyncTest() {
            console.log('🔧 手动触发同步测试');
            
            if (!window.mindmapController) {
                console.error('❌ MindmapController不可用');
                return;
            }
            
            try {
                // 修改脑图数据
                if (window.mindmapController.data) {
                    const originalLabel = window.mindmapController.data.label;
                    window.mindmapController.data.label = `${originalLabel} [同步测试-${Date.now()}]`;
                    
                    // 触发保存和同步
                    await window.mindmapController.saveMindmapToStorage(true);
                    
                    console.log('✅ 手动同步测试完成，请检查控制台日志');
                    
                    // 恢复原始标签
                    setTimeout(() => {
                        window.mindmapController.data.label = originalLabel;
                        window.mindmapController.saveMindmapToStorage(true);
                    }, 5000);
                } else {
                    console.warn('⚠️ 无可用脑图数据进行测试');
                }
            } catch (error) {
                console.error('❌ 手动同步测试失败:', error);
            }
        }
    };
    
    // 暴露到全局
    window.IncrementalSyncTester = IncrementalSyncTester;
    
    // 自动运行测试 - 已禁用，避免干扰生产环境
    // if (document.readyState === 'loading') {
    //     document.addEventListener('DOMContentLoaded', () => {
    //         setTimeout(() => {
    //             IncrementalSyncTester.testIncrementalSync();
    //         }, 3000);
    //     });
    // } else {
    //     setTimeout(() => {
    //         IncrementalSyncTester.testIncrementalSync();
    //     }, 3000);
    // }
    
    // 手动运行：IncrementalSyncTester.testIncrementalSync()
    
    console.log('📋 增量同步测试工具已加载');
    console.log('💡 使用方法:');
    console.log('  IncrementalSyncTester.testIncrementalSync() - 运行完整测试');
    console.log('  IncrementalSyncTester.manualSyncTest() - 手动触发同步测试');
    
})();
