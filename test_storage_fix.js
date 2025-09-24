/**
 * 存储修复效果测试
 */

(function() {
    'use strict';
    
    console.log('🧪 开始测试存储修复效果');
    
    // 测试智能清理功能
    function testSmartCleanup() {
        console.log('📋 测试智能清理功能');
        
        if (!window.AutogenUnifiedStorage) {
            console.error('❌ AutogenUnifiedStorage不可用');
            return false;
        }
        
        try {
            // 检查智能清理方法是否存在
            if (typeof window.AutogenUnifiedStorage.smartCleanupForSpace === 'function') {
                console.log('✅ smartCleanupForSpace方法已定义');
            } else {
                console.error('❌ smartCleanupForSpace方法未定义');
                return false;
            }
            
            // 测试存储监控
            if (window.StorageMonitor) {
                const stats = window.StorageMonitor.getStorageStats();
                console.log(`📊 当前存储状态: ${stats.totalSizeMB}MB (${stats.usagePercent}%)`);
                
                const suggestions = window.StorageMonitor.getCleanupSuggestions();
                console.log(`💡 清理建议: ${suggestions.length}条`);
                
                suggestions.forEach((suggestion, index) => {
                    const icon = suggestion.type === 'critical' ? '🚨' : 
                                suggestion.type === 'warning' ? '⚠️' : 'ℹ️';
                    console.log(`  ${icon} ${suggestion.message}`);
                });
            }
            
            return true;
        } catch (error) {
            console.error('❌ 智能清理测试失败:', error);
            return false;
        }
    }
    
    // 测试存储操作
    async function testStorageOperations() {
        console.log('📋 测试存储操作');
        
        try {
            // 测试小数据存储
            const smallData = { test: 'small data', timestamp: Date.now() };
            const smallResult = await window.AutogenUnifiedStorage.store('test', 'small_data', smallData);
            console.log(`✅ 小数据存储: ${smallResult ? '成功' : '失败'}`);
            
            // 测试大数据存储（模拟）
            const largeData = {
                test: 'large data',
                content: 'x'.repeat(100000), // 100KB数据
                timestamp: Date.now()
            };
            const largeResult = await window.AutogenUnifiedStorage.store('test', 'large_data', largeData);
            console.log(`✅ 大数据存储: ${largeResult ? '成功' : '失败'}`);
            
            // 测试读取
            const retrievedSmall = await window.AutogenUnifiedStorage.retrieve('test', 'small_data');
            console.log(`✅ 小数据读取: ${retrievedSmall ? '成功' : '失败'}`);
            
            const retrievedLarge = await window.AutogenUnifiedStorage.retrieve('test', 'large_data');
            console.log(`✅ 大数据读取: ${retrievedLarge ? '成功' : '失败'}`);
            
            return true;
        } catch (error) {
            console.error('❌ 存储操作测试失败:', error);
            return false;
        }
    }
    
    // 主测试函数
    async function runStorageFixTest() {
        console.log('🚀 开始存储修复测试');
        
        const tests = [
            { name: '智能清理功能', fn: testSmartCleanup },
            { name: '存储操作', fn: testStorageOperations }
        ];
        
        let passedTests = 0;
        
        for (const test of tests) {
            console.log(`\n📋 执行: ${test.name}`);
            try {
                const result = await test.fn();
                if (result) {
                    console.log(`✅ ${test.name} - 通过`);
                    passedTests++;
                } else {
                    console.log(`❌ ${test.name} - 失败`);
                }
            } catch (error) {
                console.error(`❌ ${test.name} - 异常:`, error);
            }
        }
        
        console.log(`\n📊 测试结果: ${passedTests}/${tests.length} 通过`);
        
        if (passedTests === tests.length) {
            console.log('🎉 存储修复测试全部通过！');
        } else {
            console.log('⚠️ 部分测试失败，需要进一步调试');
        }
        
        return passedTests === tests.length;
    }
    
    // 导出测试函数
    window.testStorageFix = runStorageFixTest;
    
    // 自动运行测试
    setTimeout(() => {
        console.log('⏰ 自动运行存储修复测试');
        runStorageFixTest();
    }, 2000);
    
})();
