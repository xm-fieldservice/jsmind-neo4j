const UnifiedStorageManager = require('../src/storage/UnifiedStorageManager');

describe('UnifiedStorageManager 集成测试', () => {
  let storage;

  beforeAll(() => {
    storage = new UnifiedStorageManager();
  });

  test('保存和加载脑图数据', async () => {
    const testData = { nodes: [{ id: 'test', content: '测试数据' }] };
    const mindId = 'test-mind';
    
    // 保存数据
    await storage.saveMindmap(mindId, testData);
    
    // 加载数据
    const loadedData = await storage.loadMindmap(mindId);
    
    expect(loadedData).toEqual(testData);
  });

  test('存储健康检查', async () => {
    const health = await storage.getStorageHealth();
    expect(health.status).toBe('healthy');
  });
});
