/**
 * 存储系统集成测试脚本
 * 用于在控制台中快速测试存储功能
 */

// 测试存储系统集成
async function testStorageIntegration() {
    console.log('🔧 开始存储系统集成测试...\n');
    
    try {
        // 1. 导入存储模块
        console.log('📦 导入存储模块...');
        const storageModule = await import('./src/core/storage/index.js');
        
        // 2. 初始化存储系统
        console.log('🚀 初始化存储系统...');
        const initResult = storageModule.initializeStorage();
        
        if (!initResult.success) {
            throw new Error(`存储系统初始化失败: ${initResult.error}`);
        }
        
        console.log('✅ 存储系统初始化成功');
        console.log('📊 初始统计:', initResult.stats);
        
        const { storage, validator } = initResult;
        
        // 3. 基础功能测试
        console.log('\n🧪 基础功能测试...');
        
        // 测试基础读写
        const testKey = 'test:integration';
        const testData = { message: 'Hello Storage!', timestamp: Date.now() };
        
        const writeSuccess = storage.set(testKey, testData);
        console.log(`写入测试: ${writeSuccess ? '✅' : '❌'}`);
        
        const readData = storage.get(testKey);
        const readSuccess = JSON.stringify(readData) === JSON.stringify(testData);
        console.log(`读取测试: ${readSuccess ? '✅' : '❌'}`);
        
        // 4. 脑图数据测试
        console.log('\n🧠 脑图数据测试...');
        
        const mindmapData = {
            format: 'node_tree',
            data: {
                id: 'root-integration-test',
                topic: '集成测试脑图',
                content: '这是一个集成测试脑图',
                children: [
                    {
                        id: 'node-1',
                        topic: '测试节点1',
                        content: '节点1的内容',
                        data: { content: '节点1的内容' },
                        children: []
                    },
                    {
                        id: 'node-2',
                        topic: '测试节点2',
                        content: '节点2的内容',
                        data: { content: '节点2的内容' },
                        children: []
                    }
                ]
            },
            meta: {
                mind_id: 'integration-test',
                format_version: 1,
                saved_at: new Date().toISOString(),
                source: 'integration-test'
            }
        };
        
        // 验证脑图数据
        const validation = validator.validateMindmap(mindmapData);
        console.log(`数据验证: ${validation.valid ? '✅' : '❌'}`);
        if (!validation.valid) {
            console.log('验证问题:', validation.issues);
        }
        
        // 保存脑图数据
        const mindKey = 'mind:integration-test:data';
        const saveMindSuccess = storage.set(mindKey, mindmapData);
        console.log(`脑图保存: ${saveMindSuccess ? '✅' : '❌'}`);
        
        // 读取脑图数据
        const loadedMindmap = storage.get(mindKey);
        const loadMindSuccess = !!loadedMindmap;
        console.log(`脑图读取: ${loadMindSuccess ? '✅' : '❌'}`);
        
        // 验证数据完整性
        if (loadedMindmap) {
            const dataIntegrity = JSON.stringify(loadedMindmap) === JSON.stringify(mindmapData);
            console.log(`数据完整性: ${dataIntegrity ? '✅' : '❌'}`);
        }
        
        // 5. 存储统计
        console.log('\n📊 存储统计:');
        const stats = storage.getStats();
        console.table(stats);
        
        // 6. 清理测试数据
        console.log('\n🧹 清理测试数据...');
        storage.remove(testKey);
        storage.remove(mindKey);
        
        console.log('\n🎉 存储系统集成测试完成！');
        
        return {
            success: true,
            storage,
            validator,
            stats: storage.getStats()
        };
        
    } catch (error) {
        console.error('❌ 存储系统集成测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 测试与jsmind-controller的集成
async function testControllerIntegration() {
    console.log('🎮 测试与jsmind-controller的集成...\n');
    
    try {
        // 检查MindmapController是否可用
        if (typeof window === 'undefined' || !window.mindmapController) {
            throw new Error('MindmapController不可用，请在浏览器环境中运行');
        }
        
        const controller = window.mindmapController;
        
        // 检查存储系统状态
        console.log('📊 检查存储系统状态...');
        const status = controller.getStorageSystemStatus();
        console.log('存储系统状态:', status);
        
        // 测试保存功能
        console.log('\n💾 测试保存功能...');
        if (controller.data) {
            await controller.saveMindmapToStorage(true); // 立即保存
            console.log('✅ 保存测试完成');
        } else {
            console.log('⚠️ 没有数据可保存');
        }
        
        // 测试加载功能
        console.log('\n📂 测试加载功能...');
        const loadedData = await controller.loadMindmapFromStorage();
        console.log(`加载测试: ${loadedData ? '✅' : '❌'}`);
        
        console.log('\n🎉 控制器集成测试完成！');
        
        return {
            success: true,
            status,
            hasData: !!controller.data,
            loadedData: !!loadedData
        };
        
    } catch (error) {
        console.error('❌ 控制器集成测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 性能测试
async function performanceTest() {
    console.log('⚡ 开始性能测试...\n');
    
    try {
        const storageModule = await import('./src/core/storage/index.js');
        const initResult = storageModule.initializeStorage();
        
        if (!initResult.success) {
            throw new Error(`存储系统初始化失败: ${initResult.error}`);
        }
        
        const { storage } = initResult;
        
        // 批量写入测试
        console.log('📝 批量写入测试...');
        const writeStart = performance.now();
        const writeCount = 100;
        
        for (let i = 0; i < writeCount; i++) {
            const data = {
                id: `perf-test-${i}`,
                content: `性能测试数据 ${i}`,
                timestamp: Date.now(),
                data: 'x'.repeat(100) // 100字节数据
            };
            storage.set(`perf:write:${i}`, data);
        }
        
        const writeEnd = performance.now();
        const writeTime = writeEnd - writeStart;
        console.log(`写入 ${writeCount} 条记录耗时: ${writeTime.toFixed(2)}ms`);
        console.log(`平均写入时间: ${(writeTime / writeCount).toFixed(2)}ms/条`);
        
        // 批量读取测试
        console.log('\n📖 批量读取测试...');
        const readStart = performance.now();
        let readSuccessCount = 0;
        
        for (let i = 0; i < writeCount; i++) {
            const data = storage.get(`perf:write:${i}`);
            if (data) readSuccessCount++;
        }
        
        const readEnd = performance.now();
        const readTime = readEnd - readStart;
        console.log(`读取 ${writeCount} 条记录耗时: ${readTime.toFixed(2)}ms`);
        console.log(`平均读取时间: ${(readTime / writeCount).toFixed(2)}ms/条`);
        console.log(`读取成功率: ${(readSuccessCount / writeCount * 100).toFixed(1)}%`);
        
        // 清理性能测试数据
        console.log('\n🧹 清理性能测试数据...');
        for (let i = 0; i < writeCount; i++) {
            storage.remove(`perf:write:${i}`);
        }
        
        console.log('\n🎉 性能测试完成！');
        
        return {
            success: true,
            writeTime,
            readTime,
            writeCount,
            readSuccessCount,
            avgWriteTime: writeTime / writeCount,
            avgReadTime: readTime / writeCount,
            readSuccessRate: readSuccessCount / writeCount
        };
        
    } catch (error) {
        console.error('❌ 性能测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 导出测试函数
if (typeof window !== 'undefined') {
    window.testStorageIntegration = testStorageIntegration;
    window.testControllerIntegration = testControllerIntegration;
    window.performanceTest = performanceTest;
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testStorageIntegration,
        testControllerIntegration,
        performanceTest
    };
}

console.log('🔧 存储系统测试脚本已加载');
console.log('可用函数:');
console.log('  - testStorageIntegration(): 基础存储系统测试');
console.log('  - testControllerIntegration(): 控制器集成测试');
console.log('  - performanceTest(): 性能测试');
