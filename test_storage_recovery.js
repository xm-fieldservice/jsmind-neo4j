// 存储系统恢复测试脚本
const assert = require('assert');
const { UnifiedStorageManager } = require('./src/storage/UnifiedStorageManager');

async function testStorageRecovery() {
  console.log('=== 开始存储系统恢复测试 ===');
  
  const storage = new UnifiedStorageManager();
  await storage.initializeIndexedDB();
  
  // 测试数据
  const testData = {
    id: 'test_project',
    name: '测试项目',
    nodes: [
      { id: 'node1', content: '测试节点1' },
      { id: 'node2', content: '测试节点2' }
    ]
  };
  
  try {
    // 测试保存功能
    console.log('测试保存功能...');
    const saveResult = await storage.saveMindmap('test_project', testData);
    assert.ok(saveResult.success, '保存失败');
    
    // 测试加载功能
    console.log('测试加载功能...');
    const loadedData = await storage.loadMindmap('test_project');
    assert.deepStrictEqual(loadedData, testData, '加载的数据不一致');
    
    // 测试JSON导出
    console.log('测试JSON导出功能...');
    const exportResult = await storage.exportToJson();
    assert.ok(exportResult.success, 'JSON导出失败');
    
    console.log('✅ 所有测试通过！存储系统功能正常');
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return false;
  }
}

// 执行测试
(async () => {
  const result = await testStorageRecovery();
  process.exit(result ? 0 : 1);
})();
