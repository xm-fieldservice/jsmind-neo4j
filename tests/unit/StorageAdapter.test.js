/**
 * StorageAdapter.test.js - StorageAdapter单元测试
 * 
 * 测试覆盖：
 * - 初始化
 * - 脑图数据保存和加载
 * - 配置管理
 * - 数据验证
 * - 数据转换
 * - 错误处理
 */

const StorageAdapter = require('../../src/adapters/StorageAdapter');

describe('StorageAdapter - 初始化', () => {
    let adapter;
    let mockStorage;

    beforeEach(() => {
        mockStorage = {
            store: jest.fn(() => Promise.resolve(true)),
            retrieve: jest.fn(() => Promise.resolve(null)),
            remove: jest.fn(() => Promise.resolve(true)),
            getStats: jest.fn(() => Promise.resolve({}))
        };

        global.window = {
            AutogenUnifiedStorage: mockStorage
        };

        adapter = new StorageAdapter();
    });

    afterEach(() => {
        delete global.window;
    });

    test('应该成功初始化', async () => {
        await adapter.initialize();
        expect(adapter.initialized).toBe(true);
    });

    test('应该防止重复初始化', async () => {
        await adapter.initialize();
        await adapter.initialize(); // 第二次调用
        
        // 不应该抛出错误
        expect(adapter.initialized).toBe(true);
    });

    test('应该在未找到存储引擎时抛出错误', async () => {
        delete global.window.AutogenUnifiedStorage;
        const newAdapter = new StorageAdapter();
        
        await expect(newAdapter.initialize()).rejects.toThrow(/未找到/);
    });
});

describe('StorageAdapter - 脑图数据保存', () => {
    let adapter;
    let mockStorage;

    beforeEach(async () => {
        mockStorage = {
            store: jest.fn(() => Promise.resolve(true)),
            retrieve: jest.fn(() => Promise.resolve(null))
        };

        global.window = {
            AutogenUnifiedStorage: mockStorage
        };

        adapter = new StorageAdapter();
        await adapter.initialize();
    });

    afterEach(() => {
        delete global.window;
    });

    test('应该成功保存脑图数据', async () => {
        const mindmapData = {
            id: 'test-mindmap',
            meta: { name: '测试脑图' },
            format: 'node_tree',
            data: { id: 'root', topic: '根节点' }
        };

        const result = await adapter.saveMindmap(mindmapData);
        
        expect(result).toBe(true);
        expect(mockStorage.store).toHaveBeenCalledWith(
            'mindmap',
            expect.any(String),
            expect.objectContaining({
                id: 'test-mindmap',
                _storedAt: expect.any(Number),
                _version: '1.0'
            }),
            {}
        );
    });

    test('应该验证脑图数据', async () => {
        const invalidData = {
            // 缺少必要字段
            id: 'test'
        };

        await expect(adapter.saveMindmap(invalidData)).rejects.toThrow(/必须包含/);
    });

    test('应该支持保存选项', async () => {
        const mindmapData = {
            id: 'test',
            meta: { name: '测试' },
            format: 'node_tree',
            data: {}
        };

        const options = { immediate: true };
        await adapter.saveMindmap(mindmapData, options);
        
        expect(mockStorage.store).toHaveBeenCalledWith(
            'mindmap',
            expect.any(String),
            expect.any(Object),
            options
        );
    });
});

describe('StorageAdapter - 脑图数据加载', () => {
    let adapter;
    let mockStorage;

    beforeEach(async () => {
        mockStorage = {
            retrieve: jest.fn()
        };

        global.window = {
            AutogenUnifiedStorage: mockStorage
        };

        adapter = new StorageAdapter();
        await adapter.initialize();
    });

    afterEach(() => {
        delete global.window;
    });

    test('应该成功加载脑图数据', async () => {
        const storedData = {
            id: 'test-mindmap',
            meta: { name: '测试脑图' },
            format: 'node_tree',
            data: { id: 'root', topic: '根节点' },
            _storedAt: Date.now(),
            _version: '1.0'
        };

        mockStorage.retrieve.mockResolvedValue(storedData);

        const result = await adapter.loadMindmap('test-mindmap');
        
        expect(result).toBeDefined();
        expect(result.id).toBe('test-mindmap');
        expect(result._storedAt).toBeUndefined(); // 应该被移除
        expect(result._version).toBeUndefined(); // 应该被移除
    });

    test('应该返回null当数据不存在', async () => {
        mockStorage.retrieve.mockResolvedValue(null);

        const result = await adapter.loadMindmap('nonexistent');
        
        expect(result).toBeNull();
    });

    test('应该调用正确的存储方法', async () => {
        mockStorage.retrieve.mockResolvedValue(null);

        await adapter.loadMindmap('test-id');
        
        expect(mockStorage.retrieve).toHaveBeenCalledWith('mindmap', 'test-id');
    });
});

describe('StorageAdapter - 脑图数据删除', () => {
    let adapter;
    let mockStorage;

    beforeEach(async () => {
        mockStorage = {
            remove: jest.fn(() => Promise.resolve(true))
        };

        global.window = {
            AutogenUnifiedStorage: mockStorage
        };

        adapter = new StorageAdapter();
        await adapter.initialize();
    });

    afterEach(() => {
        delete global.window;
    });

    test('应该成功删除脑图数据', async () => {
        const result = await adapter.deleteMindmap('test-mindmap');
        
        expect(result).toBe(true);
        expect(mockStorage.remove).toHaveBeenCalledWith('mindmap', 'test-mindmap');
    });
});

describe('StorageAdapter - 脑图查询', () => {
    let adapter;
    let mockStorage;

    beforeEach(async () => {
        mockStorage = {
            queryByType: jest.fn()
        };

        global.window = {
            AutogenUnifiedStorage: mockStorage
        };

        adapter = new StorageAdapter();
        await adapter.initialize();
    });

    afterEach(() => {
        delete global.window;
    });

    test('应该查询脑图列表', async () => {
        const mockResults = [
            { id: 'mindmap1', _storedAt: 1, _version: '1.0' },
            { id: 'mindmap2', _storedAt: 2, _version: '1.0' }
        ];

        mockStorage.queryByType.mockResolvedValue(mockResults);

        const results = await adapter.queryMindmaps();
        
        expect(results).toHaveLength(2);
        expect(results[0]._storedAt).toBeUndefined(); // 应该被转换
        expect(mockStorage.queryByType).toHaveBeenCalledWith('mindmap', {});
    });

    test('应该支持查询过滤', async () => {
        mockStorage.queryByType.mockResolvedValue([]);

        const filter = { name: '测试' };
        await adapter.queryMindmaps(filter);
        
        expect(mockStorage.queryByType).toHaveBeenCalledWith('mindmap', filter);
    });
});

describe('StorageAdapter - 配置管理', () => {
    let adapter;
    let mockStorage;

    beforeEach(async () => {
        mockStorage = {
            store: jest.fn(() => Promise.resolve(true)),
            retrieve: jest.fn()
        };

        global.window = {
            AutogenUnifiedStorage: mockStorage
        };

        adapter = new StorageAdapter();
        await adapter.initialize();
    });

    afterEach(() => {
        delete global.window;
    });

    test('应该保存配置', async () => {
        const result = await adapter.saveConfig('testKey', 'testValue');
        
        expect(result).toBe(true);
        expect(mockStorage.store).toHaveBeenCalledWith('config', 'testKey', 'testValue');
    });

    test('应该加载配置', async () => {
        mockStorage.retrieve.mockResolvedValue('testValue');

        const result = await adapter.loadConfig('testKey');
        
        expect(result).toBe('testValue');
        expect(mockStorage.retrieve).toHaveBeenCalledWith('config', 'testKey');
    });

    test('应该返回默认值当配置不存在', async () => {
        mockStorage.retrieve.mockResolvedValue(null);

        const result = await adapter.loadConfig('nonexistent', 'defaultValue');
        
        expect(result).toBe('defaultValue');
    });
});

describe('StorageAdapter - 批量操作', () => {
    let adapter;
    let mockStorage;

    beforeEach(async () => {
        mockStorage = {
            store: jest.fn(() => Promise.resolve(true))
        };

        global.window = {
            AutogenUnifiedStorage: mockStorage
        };

        adapter = new StorageAdapter();
        await adapter.initialize();
    });

    afterEach(() => {
        delete global.window;
    });

    test('应该批量保存数据', async () => {
        const items = [
            { id: 'item1', data: { value: 1 } },
            { id: 'item2', data: { value: 2 } }
        ];

        const results = await adapter.batchStore('test', items);
        
        expect(results).toHaveLength(2);
        expect(mockStorage.store).toHaveBeenCalledTimes(2);
    });
});

describe('StorageAdapter - 错误处理', () => {
    let adapter;
    let mockStorage;

    beforeEach(async () => {
        mockStorage = {
            store: jest.fn(),
            retrieve: jest.fn()
        };

        global.window = {
            AutogenUnifiedStorage: mockStorage
        };

        adapter = new StorageAdapter();
        await adapter.initialize();
    });

    afterEach(() => {
        delete global.window;
    });

    test('应该在未初始化时抛出错误', async () => {
        const newAdapter = new StorageAdapter();
        // 不调用initialize
        
        await expect(newAdapter.saveMindmap({})).rejects.toThrow(/未初始化/);
    });

    test('应该处理存储错误', async () => {
        mockStorage.store.mockRejectedValue(new Error('存储失败'));

        const mindmapData = {
            id: 'test',
            meta: { name: '测试' },
            format: 'node_tree',
            data: {}
        };

        await expect(adapter.saveMindmap(mindmapData)).rejects.toThrow('存储失败');
    });

    test('应该处理加载错误', async () => {
        mockStorage.retrieve.mockRejectedValue(new Error('加载失败'));

        await expect(adapter.loadMindmap('test')).rejects.toThrow('加载失败');
    });
});

describe('StorageAdapter - 数据验证', () => {
    let adapter;

    beforeEach(async () => {
        global.window = {
            AutogenUnifiedStorage: {
                store: jest.fn(() => Promise.resolve(true))
            }
        };

        adapter = new StorageAdapter();
        await adapter.initialize();
    });

    afterEach(() => {
        delete global.window;
    });

    test('应该拒绝空数据', async () => {
        await expect(adapter.saveMindmap(null)).rejects.toThrow(/不能为空/);
    });

    test('应该拒绝缺少meta.name的数据', async () => {
        const invalidData = {
            id: 'test',
            meta: {}, // 缺少name
            format: 'node_tree',
            data: {}
        };

        await expect(adapter.saveMindmap(invalidData)).rejects.toThrow(/meta.name/);
    });

    test('应该拒绝缺少format的数据', async () => {
        const invalidData = {
            id: 'test',
            meta: { name: '测试' },
            // 缺少format
            data: {}
        };

        await expect(adapter.saveMindmap(invalidData)).rejects.toThrow(/format/);
    });
});

describe('StorageAdapter - 性能测试', () => {
    let adapter;
    let mockStorage;

    beforeEach(async () => {
        mockStorage = {
            store: jest.fn(() => Promise.resolve(true)),
            retrieve: jest.fn(() => Promise.resolve(null))
        };

        global.window = {
            AutogenUnifiedStorage: mockStorage
        };

        adapter = new StorageAdapter();
        await adapter.initialize();
    });

    afterEach(() => {
        delete global.window;
    });

    test('应该快速保存大量数据', async () => {
        const mindmapData = {
            id: 'test',
            meta: { name: '测试' },
            format: 'node_tree',
            data: {}
        };

        const startTime = Date.now();
        
        for (let i = 0; i < 100; i++) {
            await adapter.saveMindmap({ ...mindmapData, id: `test-${i}` });
        }
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
});
