/**
 * 阶段2.3组件生命周期管理系统测试
 * 验证组件生命周期管理、应用启动/关闭流程和内存泄漏检测功能
 */

console.log('=== 阶段2.3组件生命周期管理系统测试 ===');

async function testComponentLifecycleSystem() {
    try {
        console.log('\n1. 等待组件生命周期系统加载...');
        
        // 等待组件生命周期系统加载
        if (!window.ComponentLifecycle) {
            console.log('等待组件生命周期系统加载...');
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (window.ComponentLifecycle) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        const componentManager = window.ComponentLifecycle;
        const applicationManager = window.ApplicationLifecycle;
        const memoryDetector = window.memoryLeakDetector;
        
        console.log('✅ 组件生命周期系统已加载');

        // 测试组件生命周期管理器基础功能
        console.log('\n2. 测试组件生命周期管理器基础功能...');
        
        // 获取初始状态
        const initialStats = componentManager.getStats();
        console.log('初始组件统计:', initialStats);
        
        // 创建测试组件
        class TestComponent extends window.IComponent {
            constructor(name) {
                super(name, window.ComponentType.SERVICE, window.ComponentPriority.NORMAL);
                this.initializeCount = 0;
                this.startCount = 0;
                this.stopCount = 0;
                this.destroyCount = 0;
            }
            
            async initialize(config = {}) {
                this.initializeCount++;
                console.log(`[${this.name}] 初始化 (第${this.initializeCount}次)`);
                await new Promise(resolve => setTimeout(resolve, 100)); // 模拟异步初始化
                return true;
            }
            
            async start() {
                this.startCount++;
                console.log(`[${this.name}] 启动 (第${this.startCount}次)`);
                await new Promise(resolve => setTimeout(resolve, 50)); // 模拟异步启动
                return true;
            }
            
            async stop() {
                this.stopCount++;
                console.log(`[${this.name}] 停止 (第${this.stopCount}次)`);
                await new Promise(resolve => setTimeout(resolve, 50)); // 模拟异步停止
                return true;
            }
            
            async destroy() {
                this.destroyCount++;
                console.log(`[${this.name}] 销毁 (第${this.destroyCount}次)`);
                await new Promise(resolve => setTimeout(resolve, 50)); // 模拟异步销毁
                return true;
            }
        }
        
        // 创建测试组件实例
        const testComponent1 = new TestComponent('TestService1');
        const testComponent2 = new TestComponent('TestService2');
        
        // 设置依赖关系
        testComponent2.setDependencies(['TestService1']);
        
        console.log('\n3. 测试组件注册...');
        
        // 注册组件
        const registerResult1 = componentManager.register(testComponent1);
        const registerResult2 = componentManager.register(testComponent2);
        
        console.log('组件注册结果:', { testComponent1: registerResult1, testComponent2: registerResult2 });
        
        // 获取组件信息
        const component1Info = componentManager.getComponentInfo('TestService1');
        const component2Info = componentManager.getComponentInfo('TestService2');
        
        console.log('TestService1信息:', component1Info);
        console.log('TestService2信息:', component2Info);
        
        console.log('\n4. 测试组件初始化和启动...');
        
        // 初始化和启动组件1
        const initResult1 = await componentManager.initialize('TestService1');
        console.log('TestService1初始化结果:', initResult1);
        
        const startResult1 = await componentManager.start('TestService1');
        console.log('TestService1启动结果:', startResult1);
        
        // 初始化和启动组件2（依赖组件1）
        const initResult2 = await componentManager.initialize('TestService2');
        console.log('TestService2初始化结果:', initResult2);
        
        const startResult2 = await componentManager.start('TestService2');
        console.log('TestService2启动结果:', startResult2);
        
        console.log('\n5. 测试应用生命周期管理器...');
        
        // 获取应用状态
        const appState = applicationManager.getApplicationState();
        console.log('应用状态:', appState);
        
        // 获取应用统计
        const appStats = applicationManager.getStats();
        console.log('应用统计:', appStats);
        
        // 测试健康检查
        const healthCheck = applicationManager.healthCheck();
        console.log('应用健康检查:', healthCheck);
        
        console.log('\n6. 测试内存泄漏检测器...');
        
        // 获取内存检测器状态
        const memoryStats = memoryDetector.getStats();
        console.log('内存检测器统计:', memoryStats);
        
        // 获取检测报告
        const memoryReport = memoryDetector.getReport();
        console.log('内存检测报告:', {
            摘要: memoryReport.summary,
            当前状态: memoryReport.current,
            基线: memoryReport.baseline,
            泄漏数量: memoryReport.leaks.length,
            警告数量: memoryReport.warnings.length
        });
        
        console.log('\n7. 测试组件停止和销毁...');
        
        // 停止组件
        const stopResult2 = await componentManager.stop('TestService2');
        const stopResult1 = await componentManager.stop('TestService1');
        
        console.log('组件停止结果:', { testComponent1: stopResult1, testComponent2: stopResult2 });
        
        // 销毁组件
        const destroyResult2 = await componentManager.destroy('TestService2');
        const destroyResult1 = await componentManager.destroy('TestService1');
        
        console.log('组件销毁结果:', { testComponent1: destroyResult1, testComponent2: destroyResult2 });
        
        console.log('\n8. 测试事件监听...');
        
        // 设置事件监听器
        let componentEvents = [];
        let systemEvents = [];
        
        window.GlobalEventBus.on(window.StandardEvents.COMPONENT.REGISTERED, (payload) => {
            componentEvents.push({ type: 'registered', payload });
        });
        
        window.GlobalEventBus.on(window.StandardEvents.COMPONENT.STARTED, (payload) => {
            componentEvents.push({ type: 'started', payload });
        });
        
        window.GlobalEventBus.on(window.StandardEvents.SYSTEM.MEMORY_DETECTION_COMPLETE, (payload) => {
            systemEvents.push({ type: 'memory_detection', payload });
        });
        
        // 创建另一个测试组件来触发事件
        const testComponent3 = new TestComponent('TestService3');
        componentManager.register(testComponent3);
        await componentManager.initialize('TestService3');
        await componentManager.start('TestService3');
        
        // 等待事件处理
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('组件事件:', componentEvents.length, '个');
        console.log('系统事件:', systemEvents.length, '个');
        
        // 清理测试组件
        await componentManager.destroy('TestService3');
        
        console.log('\n9. 测试错误处理...');
        
        // 创建会失败的组件
        class FailingComponent extends window.IComponent {
            constructor(name) {
                super(name, window.ComponentType.SERVICE, window.ComponentPriority.LOW);
            }
            
            async initialize(config = {}) {
                throw new Error('故意的初始化失败');
            }
            
            async start() {
                return false; // 启动失败
            }
            
            async stop() {
                return true;
            }
            
            async destroy() {
                return true;
            }
        }
        
        const failingComponent = new FailingComponent('FailingService');
        componentManager.register(failingComponent);
        
        const failInitResult = await componentManager.initialize('FailingService');
        console.log('失败组件初始化结果:', failInitResult);
        
        // 清理失败组件
        componentManager.unregister('FailingService');
        
        console.log('\n10. 测试内存泄漏模拟...');
        
        // 模拟内存泄漏（创建大量DOM节点）
        const testContainer = document.createElement('div');
        testContainer.id = 'memory-leak-test';
        document.body.appendChild(testContainer);
        
        // 创建大量DOM节点
        for (let i = 0; i < 100; i++) {
            const element = document.createElement('div');
            element.className = 'test-node';
            element.textContent = `测试节点 ${i}`;
            testContainer.appendChild(element);
        }
        
        // 创建一些事件监听器
        const testEventListeners = [];
        for (let i = 0; i < 10; i++) {
            const listener = () => console.log(`测试监听器 ${i}`);
            document.addEventListener('click', listener);
            testEventListeners.push(listener);
        }
        
        // 创建一些定时器
        const testTimers = [];
        for (let i = 0; i < 5; i++) {
            const timer = setInterval(() => {
                // 什么都不做
            }, 10000);
            testTimers.push(timer);
        }
        
        console.log('已创建测试内存泄漏场景');
        
        // 手动触发内存检测
        await memoryDetector._performDetection();
        
        // 清理测试泄漏
        testContainer.remove();
        testEventListeners.forEach(listener => {
            document.removeEventListener('click', listener);
        });
        testTimers.forEach(timer => {
            clearInterval(timer);
        });
        
        console.log('已清理测试内存泄漏');
        
        // 最终统计
        console.log('\n=== 测试结果汇总 ===');
        
        const finalStats = {
            组件生命周期管理器: componentManager.getStats(),
            应用生命周期管理器: applicationManager.getStats(),
            内存泄漏检测器: memoryDetector.getStats(),
            组件事件数: componentEvents.length,
            系统事件数: systemEvents.length,
            健康检查: applicationManager.healthCheck()
        };
        
        console.log('最终统计:', finalStats);
        
        return {
            success: true,
            stats: finalStats,
            componentEvents,
            systemEvents
        };

    } catch (error) {
        console.error('❌ 组件生命周期系统测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 演示组件生命周期系统的使用方法
function demonstrateComponentLifecycleUsage() {
    console.log('\n=== 组件生命周期系统使用演示 ===');
    
    if (!window.ComponentLifecycle) {
        console.error('❌ 组件生命周期系统未加载');
        return;
    }

    console.log('💡 组件生命周期系统使用示例:');
    
    console.log('\n🔄 创建自定义组件:');
    console.log('  class MyComponent extends IComponent {');
    console.log('    constructor() {');
    console.log('      super("MyComponent", ComponentType.SERVICE, ComponentPriority.NORMAL);');
    console.log('    }');
    console.log('    ');
    console.log('    async initialize(config) {');
    console.log('      // 组件初始化逻辑');
    console.log('      return true;');
    console.log('    }');
    console.log('    ');
    console.log('    async start() {');
    console.log('      // 组件启动逻辑');
    console.log('      return true;');
    console.log('    }');
    console.log('    ');
    console.log('    async stop() {');
    console.log('      // 组件停止逻辑');
    console.log('      return true;');
    console.log('    }');
    console.log('    ');
    console.log('    async destroy() {');
    console.log('      // 组件销毁逻辑');
    console.log('      return true;');
    console.log('    }');
    console.log('  }');
    
    console.log('\n✅ 注册和管理组件:');
    console.log('  const myComponent = new MyComponent();');
    console.log('  ComponentLifecycle.register(myComponent);');
    console.log('  await ComponentLifecycle.initialize("MyComponent");');
    console.log('  await ComponentLifecycle.start("MyComponent");');
    
    console.log('\n📡 监听组件事件:');
    console.log('  GlobalEventBus.on(StandardEvents.COMPONENT.STARTED, (payload) => {');
    console.log('    console.log("组件已启动:", payload.component);');
    console.log('  });');
    
    console.log('\n🔍 内存泄漏检测:');
    console.log('  // 自动检测（已启动）');
    console.log('  const report = memoryLeakDetector.getReport();');
    console.log('  console.log("内存状态:", report.summary);');
    
    console.log('\n🎯 优势:');
    console.log('  1. 统一的组件生命周期管理');
    console.log('  2. 自动依赖关系处理');
    console.log('  3. 完整的应用启动/关闭流程');
    console.log('  4. 实时内存泄漏检测和警告');
    console.log('  5. 与状态管理和事件系统集成');
    console.log('  6. 详细的统计和健康检查');
}

// 组件生命周期最佳实践指南
function showComponentLifecycleBestPractices() {
    console.log('\n=== 组件生命周期最佳实践 ===');
    
    console.log('\n📋 组件设计最佳实践:');
    console.log('  1. 继承IComponent接口，实现所有必需方法');
    console.log('  2. 在initialize()中进行资源分配和配置');
    console.log('  3. 在start()中启动服务和监听器');
    console.log('  4. 在stop()中停止服务但保留状态');
    console.log('  5. 在destroy()中完全清理所有资源');
    
    console.log('\n⚠️ 内存管理注意事项:');
    console.log('  1. 及时移除事件监听器');
    console.log('  2. 清理定时器和间隔器');
    console.log('  3. 移除DOM节点引用');
    console.log('  4. 避免循环引用');
    console.log('  5. 使用WeakMap和WeakSet避免内存泄漏');
    
    console.log('\n🔧 依赖管理技巧:');
    console.log('  1. 明确声明组件依赖关系');
    console.log('  2. 避免循环依赖');
    console.log('  3. 按优先级组织启动顺序');
    console.log('  4. 使用事件而非直接调用解耦组件');
    
    console.log('\n🔍 调试和监控:');
    console.log('  1. 定期检查组件健康状态');
    console.log('  2. 监控内存使用趋势');
    console.log('  3. 关注组件启动/停止时间');
    console.log('  4. 记录组件错误和异常');
    console.log('  5. 使用浏览器开发工具分析性能');
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
    window.testComponentLifecycleSystem = testComponentLifecycleSystem;
    window.demonstrateComponentLifecycleUsage = demonstrateComponentLifecycleUsage;
    window.showComponentLifecycleBestPractices = showComponentLifecycleBestPractices;
    
    console.log('测试函数已添加到全局:');
    console.log('- testComponentLifecycleSystem() - 运行完整测试');
    console.log('- demonstrateComponentLifecycleUsage() - 演示使用方法');
    console.log('- showComponentLifecycleBestPractices() - 显示最佳实践');
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        testComponentLifecycleSystem, 
        demonstrateComponentLifecycleUsage, 
        showComponentLifecycleBestPractices 
    };
}

// 自动运行演示（如果组件生命周期系统已加载）
if (typeof window !== 'undefined' && window.location) {
    // 等待页面加载完成后自动运行演示
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (window.ComponentLifecycle) {
                    console.log('🚀 自动运行组件生命周期系统演示...');
                    demonstrateComponentLifecycleUsage();
                    showComponentLifecycleBestPractices();
                }
            }, 5000);
        });
    } else {
        setTimeout(() => {
            if (window.ComponentLifecycle) {
                console.log('🚀 自动运行组件生命周期系统演示...');
                demonstrateComponentLifecycleUsage();
                showComponentLifecycleBestPractices();
            }
        }, 5000);
    }
}
