/**
 * AutogenUnifiedStorage增强功能测试脚本
 * 测试JSON底座集成、批量操作、高级查询等新功能
 */

(function() {
    'use strict';
    
    console.log('🚀 开始AutogenUnifiedStorage增强功能测试...');
    
    // 测试数据
    const testData = {
        mindmap1: { id: 'test1', name: '测试脑图1', nodes: ['node1', 'node2'] },
        mindmap2: { id: 'test2', name: '测试脑图2', nodes: ['node3', 'node4'] },
        config1: { theme: 'dark', language: 'zh-CN' },
        project1: { id: 'proj1', name: '测试项目', status: 'active' }
    };
    
    async function runTests() {
        const results = [];
        
        try {
            // 测试1：JSON底座同步功能
            console.log('\n📊 测试1：JSON底座同步功能');
            const syncResult = await window.AutogenUnifiedStorage.store(
                'mindmap', 
                'test_sync', 
                testData.mindmap1, 
                { syncToJsonBase: true }
            );
            results.push({
                test: 'JSON底座同步',
                success: syncResult,
                details: '测试自动同步到JSON底座'
            });
            
            // 测试2：批量存储操作
            console.log('\n📊 测试2：批量存储操作');
            const batchStoreOps = [
                { type: 'mindmap', key: 'batch1', data: testData.mindmap1 },
                { type: 'mindmap', key: 'batch2', data: testData.mindmap2 },
                { type: 'config', key: 'batch_config', data: testData.config1 }
            ];
            
            const batchStoreResults = await window.AutogenUnifiedStorage.batchStore(batchStoreOps);
            const batchStoreSuccess = batchStoreResults.every(r => r.success);
            results.push({
                test: '批量存储',
                success: batchStoreSuccess,
                details: `${batchStoreResults.length}个操作，成功率：${batchStoreResults.filter(r => r.success).length}/${batchStoreResults.length}`
            });
            
            // 测试3：批量读取操作
            console.log('\n📊 测试3：批量读取操作');
            const batchRetrieveReqs = [
                { type: 'mindmap', key: 'batch1' },
                { type: 'mindmap', key: 'batch2' },
                { type: 'config', key: 'batch_config' }
            ];
            
            const batchRetrieveResults = await window.AutogenUnifiedStorage.batchRetrieve(batchRetrieveReqs);
            const batchRetrieveSuccess = batchRetrieveResults.every(r => r.success);
            results.push({
                test: '批量读取',
                success: batchRetrieveSuccess,
                details: `${batchRetrieveResults.length}个请求，成功率：${batchRetrieveResults.filter(r => r.success).length}/${batchRetrieveResults.length}`
            });
            
            // 测试4：按类型查询
            console.log('\n📊 测试4：按类型查询');
            const mindmapQuery = await window.AutogenUnifiedStorage.queryByType('mindmap');
            const querySuccess = mindmapQuery.length > 0;
            results.push({
                test: '类型查询',
                success: querySuccess,
                details: `查询mindmap类型，找到${mindmapQuery.length}条记录`
            });
            
            // 测试5：条件过滤查询
            console.log('\n📊 测试5：条件过滤查询');
            const filteredQuery = await window.AutogenUnifiedStorage.queryByType('mindmap', { id: 'test1' });
            const filterSuccess = filteredQuery.length > 0 && filteredQuery[0].data.id === 'test1';
            results.push({
                test: '条件过滤',
                success: filterSuccess,
                details: `过滤查询id='test1'，找到${filteredQuery.length}条匹配记录`
            });
            
            // 测试6：性能报告
            console.log('\n📊 测试6：性能报告');
            const perfReport = window.AutogenUnifiedStorage.getPerformanceReport();
            const perfSuccess = perfReport && typeof perfReport.cacheHitRate === 'number';
            results.push({
                test: '性能报告',
                success: perfSuccess,
                details: `缓存命中率：${perfReport.cacheHitRate.toFixed(2)}%，JSON底座同步：${perfReport.jsonBaseSyncs}次`
            });
            
            // 测试7：存储统计验证
            console.log('\n📊 测试7：存储统计验证');
            const stats = window.AutogenUnifiedStorage.stats;
            const statsSuccess = stats.writes > 0 && stats.reads > 0;
            results.push({
                test: '存储统计',
                success: statsSuccess,
                details: `写入：${stats.writes}次，读取：${stats.reads}次，JSON同步：${stats.jsonBaseSyncs}次`
            });
            
        } catch (error) {
            console.error('❌ 测试执行失败:', error);
            results.push({
                test: '测试执行',
                success: false,
                details: `错误：${error.message}`
            });
        }
        
        // 生成测试报告
        console.log('\n📋 AutogenUnifiedStorage增强功能测试报告');
        console.log('=' .repeat(60));
        
        let passCount = 0;
        results.forEach((result, index) => {
            const status = result.success ? '✅ 通过' : '❌ 失败';
            console.log(`${index + 1}. ${result.test}: ${status}`);
            console.log(`   详情: ${result.details}`);
            if (result.success) passCount++;
        });
        
        console.log('=' .repeat(60));
        console.log(`📊 测试总结: ${passCount}/${results.length} 通过 (${(passCount/results.length*100).toFixed(1)}%)`);
        
        // 显示增强后的能力
        console.log('\n🎯 AutogenUnifiedStorage增强后的新能力:');
        console.log('✅ JSON底座自动同步 - 所有存储操作自动同步到JSON底座');
        console.log('✅ 批量操作支持 - batchStore()和batchRetrieve()方法');
        console.log('✅ 高级查询功能 - queryByType()和条件过滤');
        console.log('✅ 增强性能监控 - 详细的性能报告和统计');
        console.log('✅ 降级同步机制 - API失败时自动降级到现有机制');
        
        return {
            totalTests: results.length,
            passedTests: passCount,
            successRate: (passCount / results.length * 100).toFixed(1),
            results: results
        };
    }
    
    // 执行测试
    runTests().then(report => {
        console.log(`\n🎉 AutogenUnifiedStorage增强功能测试完成！成功率: ${report.successRate}%`);
        
        // 保存测试结果到存储
        window.AutogenUnifiedStorage.store('test_results', 'enhancement_test', {
            timestamp: new Date().toISOString(),
            report: report,
            version: '增强版本v1.0'
        }).then(() => {
            console.log('📝 测试结果已保存到AutogenUnifiedStorage');
        });
        
    }).catch(error => {
        console.error('❌ 测试失败:', error);
    });
    
})();
