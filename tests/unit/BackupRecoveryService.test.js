/**
 * BackupRecoveryService.test.js - 备份恢复服务单元测试
 */

const BackupRecoveryService = require('../../src/services/BackupRecoveryService');

describe('BackupRecoveryService - 初始化', () => {
    let service;
    let mockStorageAdapter;
    
    beforeEach(() => {
        mockStorageAdapter = {
            saveConfig: jest.fn(() => Promise.resolve(true)),
            loadConfig: jest.fn(() => Promise.resolve(null)),
            saveMindmap: jest.fn(() => Promise.resolve(true)),
            loadMindmap: jest.fn(() => Promise.resolve(null)),
            listMindmaps: jest.fn(() => Promise.resolve([]))
        };
        
        service = new BackupRecoveryService({
            storageAdapter: mockStorageAdapter,
            config: { autoBackupEnabled: false }
        });
    });
    
    afterEach(() => {
        if (service) {
            service.destroy();
        }
    });
    
    test('应该成功初始化', () => {
        expect(service).toBeDefined();
        expect(service.storageAdapter).toBe(mockStorageAdapter);
    });
    
    test('应该在缺少StorageAdapter时抛出错误', () => {
        expect(() => {
            new BackupRecoveryService({});
        }).toThrow(/StorageAdapter是必需的依赖/);
    });
});

describe('BackupRecoveryService - 创建备份', () => {
    let service;
    let mockStorageAdapter;
    
    beforeEach(() => {
        mockStorageAdapter = {
            saveConfig: jest.fn(() => Promise.resolve(true)),
            loadConfig: jest.fn(() => Promise.resolve([])),
            saveMindmap: jest.fn(() => Promise.resolve(true)),
            loadMindmap: jest.fn((key) => Promise.resolve({
                id: key,
                meta: { name: `脑图${key}` },
                format: 'node_tree',
                data: {}
            })),
            listMindmaps: jest.fn(() => Promise.resolve(['mindmap1', 'mindmap2']))
        };
        
        service = new BackupRecoveryService({
            storageAdapter: mockStorageAdapter,
            config: { autoBackupEnabled: false, maxBackups: 5 }
        });
    });
    
    afterEach(() => {
        service.destroy();
    });
    
    test('应该成功创建手动备份', async () => {
        const result = await service.createBackup('manual');
        
        expect(result.success).toBe(true);
        expect(result.backupId).toMatch(/^backup_/);
        expect(result.mindmapCount).toBe(2);
        expect(mockStorageAdapter.saveConfig).toHaveBeenCalled();
    });
    
    test('应该成功创建自动备份', async () => {
        const result = await service.createBackup('auto');
        
        expect(result.success).toBe(true);
        expect(result.mindmapCount).toBe(2);
    });
    
    test('应该更新备份列表', async () => {
        await service.createBackup('manual');
        
        const saveConfigCalls = mockStorageAdapter.saveConfig.mock.calls;
        const backupListCall = saveConfigCalls.find(call => call[0] === 'backup_list');
        
        expect(backupListCall).toBeDefined();
    });
});

describe('BackupRecoveryService - 恢复备份', () => {
    let service;
    let mockStorageAdapter;
    
    beforeEach(() => {
        const mockBackupData = {
            id: 'backup_123',
            type: 'manual',
            timestamp: Date.now(),
            mindmaps: [
                { id: 'mindmap1', meta: { name: '脑图1' }, format: 'node_tree', data: {} },
                { id: 'mindmap2', meta: { name: '脑图2' }, format: 'node_tree', data: {} }
            ]
        };
        
        mockStorageAdapter = {
            saveConfig: jest.fn(() => Promise.resolve(true)),
            loadConfig: jest.fn((key) => {
                if (key === 'backup_123') return Promise.resolve(mockBackupData);
                return Promise.resolve(null);
            }),
            saveMindmap: jest.fn(() => Promise.resolve(true)),
            loadMindmap: jest.fn(() => Promise.resolve(null)),
            listMindmaps: jest.fn(() => Promise.resolve([]))
        };
        
        service = new BackupRecoveryService({
            storageAdapter: mockStorageAdapter,
            config: { autoBackupEnabled: false }
        });
    });
    
    afterEach(() => {
        service.destroy();
    });
    
    test('应该成功恢复备份', async () => {
        const result = await service.restoreBackup('backup_123');
        
        expect(result.success).toBe(true);
        expect(result.successCount).toBe(2);
        expect(result.failCount).toBe(0);
        expect(mockStorageAdapter.saveMindmap).toHaveBeenCalledTimes(2);
    });
    
    test('应该在备份不存在时抛出错误', async () => {
        await expect(service.restoreBackup('nonexistent')).rejects.toThrow(/备份不存在/);
    });
    
    test('应该处理部分恢复失败', async () => {
        mockStorageAdapter.saveMindmap = jest.fn()
            .mockResolvedValueOnce(true)
            .mockRejectedValueOnce(new Error('保存失败'));
        
        const result = await service.restoreBackup('backup_123');
        
        expect(result.successCount).toBe(1);
        expect(result.failCount).toBe(1);
    });
});

describe('BackupRecoveryService - 备份列表管理', () => {
    let service;
    let mockStorageAdapter;
    
    beforeEach(() => {
        const mockBackups = {
            'backup_list': ['backup_1', 'backup_2'],
            'backup_1': {
                id: 'backup_1',
                type: 'manual',
                timestamp: 1000,
                createdAt: '2025-01-01T00:00:00Z',
                mindmapCount: 2
            },
            'backup_2': {
                id: 'backup_2',
                type: 'auto',
                timestamp: 2000,
                createdAt: '2025-01-02T00:00:00Z',
                mindmapCount: 3
            }
        };
        
        mockStorageAdapter = {
            saveConfig: jest.fn(() => Promise.resolve(true)),
            loadConfig: jest.fn((key, defaultValue) => {
                return Promise.resolve(mockBackups[key] || defaultValue);
            }),
            saveMindmap: jest.fn(() => Promise.resolve(true)),
            loadMindmap: jest.fn(() => Promise.resolve(null)),
            listMindmaps: jest.fn(() => Promise.resolve([]))
        };
        
        service = new BackupRecoveryService({
            storageAdapter: mockStorageAdapter,
            config: { autoBackupEnabled: false }
        });
    });
    
    afterEach(() => {
        service.destroy();
    });
    
    test('应该获取备份列表', async () => {
        const backups = await service.getBackupList();
        
        expect(backups).toHaveLength(2);
        expect(backups[0].id).toBe('backup_2'); // 按时间倒序
        expect(backups[1].id).toBe('backup_1');
    });
    
    test('应该删除备份', async () => {
        const result = await service.deleteBackup('backup_1');
        
        expect(result).toBe(true);
        expect(mockStorageAdapter.saveConfig).toHaveBeenCalledWith('backup_1', null);
    });
    
    test('应该获取备份统计信息', async () => {
        const stats = await service.getBackupStats();
        
        expect(stats.totalBackups).toBe(2);
        expect(stats.autoBackups).toBe(1);
        expect(stats.manualBackups).toBe(1);
    });
});

describe('BackupRecoveryService - 自动备份', () => {
    let service;
    let mockStorageAdapter;
    
    beforeEach(() => {
        jest.useFakeTimers();
        
        mockStorageAdapter = {
            saveConfig: jest.fn(() => Promise.resolve(true)),
            loadConfig: jest.fn(() => Promise.resolve([])),
            saveMindmap: jest.fn(() => Promise.resolve(true)),
            loadMindmap: jest.fn(() => Promise.resolve(null)),
            listMindmaps: jest.fn(() => Promise.resolve([]))
        };
        
        service = new BackupRecoveryService({
            storageAdapter: mockStorageAdapter,
            config: { 
                autoBackupEnabled: true,
                autoBackupInterval: 1000 // 1秒用于测试
            }
        });
    });
    
    afterEach(() => {
        service.destroy();
        jest.useRealTimers();
    });
    
    test('应该启动自动备份', () => {
        service.startAutoBackup();
        expect(service.autoBackupTimer).toBeDefined();
    });
    
    test('应该停止自动备份', () => {
        service.startAutoBackup();
        service.stopAutoBackup();
        expect(service.autoBackupTimer).toBeNull();
    });
    
    test('应该在定时器触发时调用createBackup', () => {
        // 使用spy监控createBackup方法调用
        const createBackupSpy = jest.spyOn(service, 'createBackup').mockResolvedValue({
            success: true,
            backupId: 'test',
            mindmapCount: 0,
            timestamp: Date.now()
        });
        
        service.startAutoBackup();
        
        // 快进定时器
        jest.advanceTimersByTime(1000);
        
        // 验证createBackup被调用
        expect(createBackupSpy).toHaveBeenCalledWith('auto');
        
        createBackupSpy.mockRestore();
    });
});

describe('BackupRecoveryService - 导入导出', () => {
    let service;
    let mockStorageAdapter;
    
    beforeEach(() => {
        const mockBackupData = {
            id: 'backup_123',
            type: 'manual',
            timestamp: Date.now(),
            mindmaps: [{ id: 'mindmap1', meta: { name: '脑图1' }, format: 'node_tree', data: {} }]
        };
        
        mockStorageAdapter = {
            saveConfig: jest.fn(() => Promise.resolve(true)),
            loadConfig: jest.fn((key) => {
                if (key === 'backup_123') return Promise.resolve(mockBackupData);
                return Promise.resolve([]);
            }),
            saveMindmap: jest.fn(() => Promise.resolve(true)),
            loadMindmap: jest.fn(() => Promise.resolve(null)),
            listMindmaps: jest.fn(() => Promise.resolve([]))
        };
        
        service = new BackupRecoveryService({
            storageAdapter: mockStorageAdapter,
            config: { autoBackupEnabled: false }
        });
    });
    
    afterEach(() => {
        service.destroy();
    });
    
    test('应该导出备份到Blob', async () => {
        const blob = await service.exportBackup('backup_123');
        
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/json');
    });
    
    test('应该从文件导入备份', async () => {
        const mockFile = {
            text: jest.fn(() => Promise.resolve(JSON.stringify({
                id: 'backup_old',
                mindmaps: [{ id: 'mindmap1', meta: { name: '脑图1' }, format: 'node_tree', data: {} }]
            })))
        };
        
        const result = await service.importBackup(mockFile);
        
        expect(result.success).toBe(true);
        expect(result.backupId).toMatch(/^backup_imported_/);
        expect(mockStorageAdapter.saveConfig).toHaveBeenCalled();
    });
});
