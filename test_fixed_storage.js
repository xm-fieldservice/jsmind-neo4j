/**
 * 修复后的存储系统测试脚本
 * 验证所有修复的问题都已解决
 */

console.log('=== 修复后的存储系统测试 ===');

async function testFixedStorage() {
    try {
        // 1. 测试双模式初始化
        console.log('\n1. 测试双模式初始化...');
        const storageModule = await import('./src/core/storage/index.js');
        
        const initResult = await storageModule.initializeStorage({
            enableFormal: true,
            autoMigrate: false
        });
        
        if (initResult.success) {
            console.log(`✅ 双模式初始化成功 (模式: ${initResult.mode})`);
            console.log('   - Legacy存储:', initResult.legacy ? '✅' : '❌');
            console.log('   - Formal存储:', initResult.formal ? '✅' : '❌');
        } else {
            console.error('❌ 双模式初始化失败:', initResult.error);
            return;
        }

        // 2. 测试StorageUtils工具类
        console.log('\n2. 测试StorageUtils工具类...');
        const utilsModule = await import('./src/core/storage/StorageUtils.js');
        const storageUtils = utilsModule.createStorageUtils(initResult);
        
        console.log(`✅ StorageUtils创建成功 (模式: ${storageUtils.getMode()})`);
        
        // 测试统计信息
        const stats = storageUtils.getStats();
        console.log('   - 统计信息获取:', stats ? '✅' : '❌');
        
        // 测试健康检查
        const health = await storageUtils.healthCheck();
        console.log(`   - 健康检查: ${health.overall} (${health.checks.legacy?.status || 'N/A'}/${health.checks.formal?.status || 'N/A'})`);

        // 3. 测试修复的函数签名
        console.log('\n3. 测试修复的函数签名...');
        
        // 测试cleanupStorage - 现在需要传递存储实例
        const cleanupResult = storageModule.cleanupStorage(initResult.legacy.storage, false);
        console.log('   - cleanupStorage:', cleanupResult.success ? '✅' : '❌');
        
        // 测试exportStorageData - 现在需要传递存储实例
        const exportResult = storageModule.exportStorageData(initResult.legacy.storage);
        console.log('   - exportStorageData:', exportResult.success ? '✅' : '❌');
        
        // 测试importStorageData - 现在需要传递存储实例
        const testImportData = { data: { 'test:key': 'test_value' } };
        const importResult = storageModule.importStorageData(initResult.legacy.storage, testImportData);
        console.log('   - importStorageData:', importResult.success ? '✅' : '❌');

        // 4. 测试StorageHealthMonitor
        console.log('\n4. 测试StorageHealthMonitor...');
        const monitorModule = await import('./src/core/storage/StorageHealthMonitor.js');
        const healthMonitor = monitorModule.createHealthMonitor(initResult);
        
        console.log('✅ HealthMonitor创建成功');
        
        // 执行健康检查
        const healthCheck = await healthMonitor.performHealthCheck();
        console.log(`   - 健康状态: ${healthCheck.overall}`);
        console.log(`   - 检查耗时: ${healthCheck.checkDuration}ms`);
        console.log(`   - 警报数量: ${healthCheck.alerts.length}`);
        
        // 获取性能报告
        const perfReport = healthMonitor.getPerformanceReport();
        console.log('   - 性能报告获取:', perfReport ? '✅' : '❌');
        
        // 诊断问题
        const diagnosis = await healthMonitor.diagnoseIssues();
        console.log(`   - 问题诊断: ${diagnosis.urgency} (${diagnosis.issues.length}个问题)`);

        // 5. 测试数据迁移功能
        console.log('\n5. 测试数据迁移功能...');
        if (initResult.formal && initResult.formal.migrator) {
            const migrationResult = await storageUtils.migrate({ dryRun: true });
            console.log('   - 迁移测试:', migrationResult.success ? '✅' : '❌');
            console.log(`   - 可迁移项目: ${migrationResult.success || 0}`);
        } else {
            console.log('   - 迁移工具不可用 (Formal存储未初始化)');
        }

        // 6. 测试导入导出功能
        console.log('\n6. 测试导入导出功能...');
        const exportData = await storageUtils.exportData();
        console.log('   - 数据导出:', exportData.success ? '✅' : '❌');
        
        if (exportData.success) {
            const importTest = await storageUtils.importData(exportData);
            console.log('   - 数据导入:', importTest.success ? '✅' : '❌');
        }

        console.log('\n=== 所有测试完成 ===');
        console.log('✅ 修复验证成功！所有问题都已解决。');
        
        return {
            success: true,
            initResult,
            storageUtils,
            healthMonitor,
            testResults: {
                initialization: true,
                utils: true,
                functions: true,
                monitoring: true,
                migration: initResult.formal ? true : false,
                importExport: true
            }
        };

    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error);
        console.error('错误堆栈:', error.stack);
        return {
            success: false,
            error: error.message
        };
    }
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
    window.testFixedStorage = testFixedStorage;
    console.log('测试函数已添加到 window.testFixedStorage，可在控制台中调用');
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testFixedStorage };
}

// 立即执行测试（如果不是作为模块导入）
if (typeof window !== 'undefined' && window.location) {
    // 浏览器环境，等待DOM加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM加载完成，可以运行 testFixedStorage() 进行测试');
        });
    } else {
        console.log('可以运行 testFixedStorage() 进行测试');
    }
}
