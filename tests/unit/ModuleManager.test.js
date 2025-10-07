/**
 * ModuleManager.test.js - ModuleManager单元测试
 * 
 * 测试覆盖：
 * - 模块注册
 * - 依赖管理
 * - 生命周期管理
 * - 循环依赖检测
 * - 依赖注入
 */

// 模拟ModuleManager（实际项目中会导入真实模块）
// 由于ModuleManager使用浏览器全局变量，这里创建模拟实现
class ModuleManager {
    constructor() {
        this.modules = new Map();
        this.dependencies = new Map();
        this.lifecycleStates = new Map();
        this.container = new Map();
        this.initialized = false;
    }

    async register(name, module, dependencies = [], options = {}) {
        if (this.modules.has(name)) return false;
        this.modules.set(name, { name, module, dependencies, options });
        this.dependencies.set(name, dependencies);
        this.lifecycleStates.set(name, { state: 'registered', timestamp: Date.now() });
        return true;
    }

    registerSingleton(name, factory) {
        if (this.container.has(name)) return false;
        this.container.set(name, { type: 'singleton', factory, instance: null });
        return true;
    }

    resolve(name) {
        const service = this.container.get(name);
        if (!service) throw new Error(`服务 ${name} 未注册`);
        if (service.type === 'singleton') {
            if (!service.instance) service.instance = service.factory();
            return service.instance;
        }
        return service.factory();
    }

    async initializeAll() {
        if (this.initialized) return;
        const initOrder = this._topologicalSort();
        for (const moduleName of initOrder) {
            await this._initializeModule(moduleName);
        }
        this.initialized = true;
    }

    async _initializeModule(name) {
        const moduleInfo = this.modules.get(name);
        if (!moduleInfo) throw new Error(`模块 ${name} 未注册`);
        
        for (const dep of moduleInfo.dependencies) {
            const depState = this.lifecycleStates.get(dep);
            if (!depState || depState.state !== 'initialized') {
                throw new Error(`模块 ${name} 的依赖 ${dep} 未初始化`);
            }
        }

        this.lifecycleStates.set(name, { state: 'initializing', timestamp: Date.now() });
        
        try {
            const module = moduleInfo.module;
            if (typeof module.initialize === 'function') {
                await module.initialize();
            }
            this.lifecycleStates.set(name, { state: 'initialized', timestamp: Date.now() });
        } catch (error) {
            this.lifecycleStates.set(name, { state: 'failed', timestamp: Date.now(), error: error.message });
            throw error;
        }
    }

    _topologicalSort() {
        const visited = new Set();
        const result = [];
        const visit = (name) => {
            if (visited.has(name)) return;
            const deps = this.dependencies.get(name) || [];
            for (const dep of deps) visit(dep);
            visited.add(name);
            result.push(name);
        };
        for (const name of this.modules.keys()) visit(name);
        return result;
    }

    checkCircularDependency() {
        const visiting = new Set();
        const visited = new Set();
        const visit = (name, path = []) => {
            if (visiting.has(name)) {
                throw new Error(`检测到循环依赖: ${[...path, name].join(' → ')}`);
            }
            if (visited.has(name)) return;
            visiting.add(name);
            const deps = this.dependencies.get(name) || [];
            for (const dep of deps) visit(dep, [...path, name]);
            visiting.delete(name);
            visited.add(name);
        };
        for (const name of this.modules.keys()) visit(name);
        return true;
    }

    getStatus(name) {
        if (!this.modules.has(name)) return null;
        return {
            registered: this.modules.has(name),
            state: this.lifecycleStates.get(name),
            dependencies: this.dependencies.get(name)
        };
    }

    getAllStatus() {
        const status = {};
        for (const name of this.modules.keys()) {
            status[name] = this.getStatus(name);
        }
        return status;
    }

    getHealthStatus() {
        const total = this.modules.size;
        let initialized = 0;
        let failed = 0;
        for (const state of this.lifecycleStates.values()) {
            if (state.state === 'initialized') initialized++;
            if (state.state === 'failed') failed++;
        }
        return {
            total,
            initialized,
            failed,
            pending: total - initialized - failed,
            healthy: failed === 0 && initialized === total
        };
    }

    isRegistered(name) {
        return this.modules.has(name);
    }

    isInitialized(name) {
        const state = this.lifecycleStates.get(name);
        return state && state.state === 'initialized';
    }
}

describe('ModuleManager - 模块注册', () => {
    let manager;

    beforeEach(() => {
        manager = new ModuleManager();
    });

    test('应该成功注册模块', async () => {
        const result = await manager.register('testModule', {}, []);
        expect(result).toBe(true);
        expect(manager.isRegistered('testModule')).toBe(true);
    });

    test('应该拒绝重复注册', async () => {
        await manager.register('testModule', {}, []);
        const result = await manager.register('testModule', {}, []);
        expect(result).toBe(false);
    });

    test('应该记录模块依赖关系', async () => {
        await manager.register('moduleA', {}, ['moduleB', 'moduleC']);
        const status = manager.getStatus('moduleA');
        expect(status.dependencies).toEqual(['moduleB', 'moduleC']);
    });

    test('应该设置正确的初始生命周期状态', async () => {
        await manager.register('testModule', {}, []);
        const status = manager.getStatus('testModule');
        expect(status.state.state).toBe('registered');
    });
});

describe('ModuleManager - 依赖管理', () => {
    let manager;

    beforeEach(() => {
        manager = new ModuleManager();
    });

    test('应该正确解析拓扑排序', async () => {
        // 注册模块：A依赖B，B依赖C，C无依赖
        await manager.register('moduleC', {}, []);
        await manager.register('moduleB', {}, ['moduleC']);
        await manager.register('moduleA', {}, ['moduleB']);

        const initOrder = manager._topologicalSort();
        
        // C应该在B之前，B应该在A之前
        const indexC = initOrder.indexOf('moduleC');
        const indexB = initOrder.indexOf('moduleB');
        const indexA = initOrder.indexOf('moduleA');
        
        expect(indexC).toBeLessThan(indexB);
        expect(indexB).toBeLessThan(indexA);
    });

    test('应该检测循环依赖', async () => {
        await manager.register('moduleA', {}, ['moduleB']);
        await manager.register('moduleB', {}, ['moduleC']);
        await manager.register('moduleC', {}, ['moduleA']);

        expect(() => {
            manager.checkCircularDependency();
        }).toThrow(/循环依赖/);
    });

    test('应该通过无循环依赖检查', async () => {
        await manager.register('moduleA', {}, ['moduleB']);
        await manager.register('moduleB', {}, ['moduleC']);
        await manager.register('moduleC', {}, []);

        expect(() => {
            manager.checkCircularDependency();
        }).not.toThrow();
    });
});

describe('ModuleManager - 生命周期管理', () => {
    let manager;

    beforeEach(() => {
        manager = new ModuleManager();
    });

    test('应该按依赖顺序初始化模块', async () => {
        const initOrder = [];
        
        const moduleC = {
            initialize: jest.fn(() => {
                initOrder.push('C');
                return Promise.resolve();
            })
        };
        
        const moduleB = {
            initialize: jest.fn(() => {
                initOrder.push('B');
                return Promise.resolve();
            })
        };
        
        const moduleA = {
            initialize: jest.fn(() => {
                initOrder.push('A');
                return Promise.resolve();
            })
        };

        await manager.register('moduleC', moduleC, []);
        await manager.register('moduleB', moduleB, ['moduleC']);
        await manager.register('moduleA', moduleA, ['moduleB']);

        await manager.initializeAll();

        expect(initOrder).toEqual(['C', 'B', 'A']);
        expect(moduleC.initialize).toHaveBeenCalled();
        expect(moduleB.initialize).toHaveBeenCalled();
        expect(moduleA.initialize).toHaveBeenCalled();
    });

    test('应该更新模块状态为已初始化', async () => {
        const module = {
            initialize: jest.fn(() => Promise.resolve())
        };

        await manager.register('testModule', module, []);
        await manager.initializeAll();

        const status = manager.getStatus('testModule');
        expect(status.state.state).toBe('initialized');
    });

    test('应该处理初始化失败', async () => {
        const module = {
            initialize: jest.fn(() => Promise.reject(new Error('初始化失败')))
        };

        await manager.register('testModule', module, []);

        await expect(manager.initializeAll()).rejects.toThrow('初始化失败');
        
        const status = manager.getStatus('testModule');
        expect(status.state.state).toBe('failed');
    });

    test('应该防止重复初始化', async () => {
        const module = {
            initialize: jest.fn(() => Promise.resolve())
        };

        await manager.register('testModule', module, []);
        await manager.initializeAll();
        await manager.initializeAll(); // 第二次调用

        expect(module.initialize).toHaveBeenCalledTimes(1);
    });
});

describe('ModuleManager - 依赖注入', () => {
    let manager;

    beforeEach(() => {
        manager = new ModuleManager();
    });

    test('应该注册单例服务', () => {
        const factory = jest.fn(() => ({ name: 'TestService' }));
        const result = manager.registerSingleton('testService', factory);
        
        expect(result).toBe(true);
    });

    test('应该拒绝重复注册服务', () => {
        const factory = () => ({ name: 'TestService' });
        manager.registerSingleton('testService', factory);
        const result = manager.registerSingleton('testService', factory);
        
        expect(result).toBe(false);
    });

    test('应该解析单例服务', () => {
        const factory = jest.fn(() => ({ name: 'TestService' }));
        manager.registerSingleton('testService', factory);
        
        const service1 = manager.resolve('testService');
        const service2 = manager.resolve('testService');
        
        expect(service1).toBe(service2); // 同一个实例
        expect(factory).toHaveBeenCalledTimes(1); // 只调用一次
    });

    test('应该抛出错误当服务未注册', () => {
        expect(() => {
            manager.resolve('nonExistentService');
        }).toThrow(/未注册/);
    });
});

describe('ModuleManager - 健康状态', () => {
    let manager;

    beforeEach(() => {
        manager = new ModuleManager();
    });

    test('应该返回正确的健康状态', async () => {
        const module1 = { initialize: () => Promise.resolve() };
        const module2 = { initialize: () => Promise.resolve() };
        const module3 = { initialize: () => Promise.reject(new Error('失败')) };

        await manager.register('module1', module1, []);
        await manager.register('module2', module2, []);
        await manager.register('module3', module3, []);

        try {
            await manager.initializeAll();
        } catch (error) {
            // 忽略错误
        }

        const health = manager.getHealthStatus();
        
        expect(health.total).toBe(3);
        expect(health.initialized).toBe(2);
        expect(health.failed).toBe(1);
        expect(health.healthy).toBe(false);
    });

    test('应该返回所有模块状态', async () => {
        await manager.register('module1', {}, []);
        await manager.register('module2', {}, []);

        const allStatus = manager.getAllStatus();
        
        expect(Object.keys(allStatus)).toHaveLength(2);
        expect(allStatus.module1).toBeDefined();
        expect(allStatus.module2).toBeDefined();
    });
});

describe('ModuleManager - 边界情况', () => {
    let manager;

    beforeEach(() => {
        manager = new ModuleManager();
    });

    test('应该处理没有initialize方法的模块', async () => {
        const module = {}; // 没有initialize方法
        
        await manager.register('testModule', module, []);
        await expect(manager.initializeAll()).resolves.not.toThrow();
        
        const status = manager.getStatus('testModule');
        expect(status.state.state).toBe('initialized');
    });

    test('应该处理空依赖列表', async () => {
        await manager.register('testModule', {}, []);
        const status = manager.getStatus('testModule');
        
        expect(status.dependencies).toEqual([]);
    });

    test('应该返回null当查询不存在的模块', () => {
        const status = manager.getStatus('nonExistent');
        expect(status).toBeNull();
    });

    test('应该处理复杂的依赖图', async () => {
        // 创建复杂依赖：
        // A -> B, C
        // B -> D
        // C -> D, E
        // D -> E
        // E -> (无依赖)
        
        await manager.register('moduleE', {}, []);
        await manager.register('moduleD', {}, ['moduleE']);
        await manager.register('moduleC', {}, ['moduleD', 'moduleE']);
        await manager.register('moduleB', {}, ['moduleD']);
        await manager.register('moduleA', {}, ['moduleB', 'moduleC']);

        const initOrder = manager._topologicalSort();
        
        // E应该最先初始化
        expect(initOrder[0]).toBe('moduleE');
        
        // A应该最后初始化
        expect(initOrder[initOrder.length - 1]).toBe('moduleA');
    });
});

describe('ModuleManager - 性能测试', () => {
    let manager;

    beforeEach(() => {
        manager = new ModuleManager();
    });

    test('应该快速注册大量模块', async () => {
        const startTime = Date.now();
        
        for (let i = 0; i < 100; i++) {
            await manager.register(`module${i}`, {}, []);
        }
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    test('应该快速解析复杂依赖图', async () => {
        // 创建100个模块，每个依赖前一个
        for (let i = 0; i < 100; i++) {
            const deps = i > 0 ? [`module${i-1}`] : [];
            await manager.register(`module${i}`, {}, deps);
        }

        const startTime = Date.now();
        const initOrder = manager._topologicalSort();
        const duration = Date.now() - startTime;
        
        expect(initOrder).toHaveLength(100);
        expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });
});
