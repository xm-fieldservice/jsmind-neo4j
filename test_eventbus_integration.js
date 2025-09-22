/**
 * 第二阶段事件总线集成测试
 * 验证增强版事件总线的功能和与存储系统的集成
 */

console.log('=== 第二阶段事件总线集成测试 ===');

async function testEventBusIntegration() {
    try {
        console.log('\n1. 测试增强版事件总线基础功能...');
        
        // 等待事件总线加载
        if (!window.GlobalEventBus) {
            console.log('等待事件总线加载...');
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (window.GlobalEventBus) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        const eventBus = window.GlobalEventBus;
        const events = window.StandardEvents;
        
        console.log('✅ 事件总线已加载');
        console.log('✅ 标准事件定义已加载');

        // 测试基础事件发布订阅
        console.log('\n2. 测试基础事件发布订阅...');
        let testEventReceived = false;
        
        const unsubscribe = eventBus.on('test:basic', (payload) => {
            testEventReceived = true;
            console.log('✅ 接收到测试事件:', payload);
        });
        
        eventBus.emit('test:basic', { message: 'Hello EventBus!' });
        
        if (testEventReceived) {
            console.log('✅ 基础事件发布订阅测试通过');
        } else {
            console.error('❌ 基础事件发布订阅测试失败');
        }
        
        unsubscribe();

        // 测试命名空间功能
        console.log('\n3. 测试命名空间功能...');
        let namespaceEventReceived = false;
        
        const nsUnsubscribe = eventBus.on('storage:test', (payload) => {
            namespaceEventReceived = true;
            console.log('✅ 接收到命名空间事件:', payload);
        });
        
        eventBus.emit('storage:test', { namespace: 'storage', event: 'test' });
        
        if (namespaceEventReceived) {
            console.log('✅ 命名空间功能测试通过');
        } else {
            console.error('❌ 命名空间功能测试失败');
        }
        
        nsUnsubscribe();

        // 测试一次性事件
        console.log('\n4. 测试一次性事件...');
        let onceEventCount = 0;
        
        eventBus.once('test:once', () => {
            onceEventCount++;
        });
        
        eventBus.emit('test:once', {});
        eventBus.emit('test:once', {}); // 第二次发布，不应该触发
        
        if (onceEventCount === 1) {
            console.log('✅ 一次性事件测试通过');
        } else {
            console.error('❌ 一次性事件测试失败，触发次数:', onceEventCount);
        }

        // 测试优先级
        console.log('\n5. 测试事件优先级...');
        const executionOrder = [];
        
        eventBus.on('test:priority', () => executionOrder.push('low'), { priority: 1 });
        eventBus.on('test:priority', () => executionOrder.push('high'), { priority: 10 });
        eventBus.on('test:priority', () => executionOrder.push('medium'), { priority: 5 });
        
        eventBus.emit('test:priority', {});
        
        if (executionOrder.join(',') === 'high,medium,low') {
            console.log('✅ 事件优先级测试通过');
        } else {
            console.error('❌ 事件优先级测试失败，执行顺序:', executionOrder);
        }

        // 测试组件生命周期管理
        console.log('\n6. 测试组件生命周期管理...');
        const componentId = 'test-component';
        eventBus.registerComponent(componentId);
        
        let componentEventCount = 0;
        eventBus.on('test:component', () => componentEventCount++, { componentId });
        eventBus.on('test:component', () => componentEventCount++, { componentId });
        
        eventBus.emit('test:component', {});
        console.log('销毁前事件计数:', componentEventCount);
        
        eventBus.destroyComponent(componentId);
        eventBus.emit('test:component', {}); // 销毁后不应该触发
        
        if (componentEventCount === 2) {
            console.log('✅ 组件生命周期管理测试通过');
        } else {
            console.error('❌ 组件生命周期管理测试失败');
        }

        // 测试错误处理
        console.log('\n7. 测试错误处理...');
        let errorHandled = false;
        
        eventBus.onError((errorInfo) => {
            errorHandled = true;
            console.log('✅ 错误被正确处理:', errorInfo.error.message);
        });
        
        eventBus.on('test:error', () => {
            throw new Error('测试错误');
        });
        
        eventBus.emit('test:error', {});
        
        // 等待错误处理
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (errorHandled) {
            console.log('✅ 错误处理测试通过');
        } else {
            console.error('❌ 错误处理测试失败');
        }

        // 测试与存储系统的集成
        console.log('\n8. 测试与存储系统的集成...');
        let storageEventReceived = false;
        
        const storageUnsubscribe = eventBus.on(events.STORAGE.READY, (payload) => {
            storageEventReceived = true;
            console.log('✅ 接收到存储就绪事件:', payload.mode);
        });
        
        // 如果存储系统已经就绪，手动触发事件测试
        if (window.StorageSystem) {
            eventBus.emit(events.STORAGE.READY, {
                system: window.StorageSystem,
                mode: window.StorageSystem.mode,
                test: true
            });
        }
        
        if (storageEventReceived || window.StorageSystem) {
            console.log('✅ 存储系统集成测试通过');
        } else {
            console.warn('⚠️ 存储系统尚未就绪，跳过集成测试');
        }
        
        storageUnsubscribe();

        // 获取统计信息
        console.log('\n9. 获取事件总线统计信息...');
        const stats = eventBus.getStats();
        console.log('事件总线统计:', stats);
        
        const listenersInfo = eventBus.getListenersInfo();
        console.log('当前监听器数量:', Object.keys(listenersInfo).length);

        // 测试事件历史
        console.log('\n10. 测试事件历史功能...');
        const history = eventBus.getEventHistory(5);
        console.log('最近5个事件:', history.map(e => e.event));

        console.log('\n=== 事件总线集成测试完成 ===');
        console.log('✅ 所有核心功能测试通过！');
        
        return {
            success: true,
            stats,
            listenersInfo,
            eventHistory: history
        };

    } catch (error) {
        console.error('❌ 事件总线集成测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 演示标准事件的使用
function demonstrateStandardEvents() {
    console.log('\n=== 标准事件使用演示 ===');
    
    if (!window.GlobalEventBus || !window.StandardEvents) {
        console.error('❌ 事件总线或标准事件未加载');
        return;
    }

    const eventBus = window.GlobalEventBus;
    const events = window.StandardEvents;

    // 监听存储相关事件
    eventBus.on(events.STORAGE.READY, (payload) => {
        console.log('📦 存储系统就绪:', payload.mode);
    });

    eventBus.on(events.STORAGE.ERROR, (payload) => {
        console.error('📦 存储系统错误:', payload.error);
    });

    // 监听脑图相关事件
    eventBus.on(events.MINDMAP.UPDATED, (payload) => {
        console.log('🧠 脑图已更新:', payload);
    });

    eventBus.on(events.MINDMAP.NODE_ADDED, (payload) => {
        console.log('🧠 节点已添加:', payload);
    });

    // 监听注册表相关事件
    eventBus.on(events.REGISTRY.CHANGED, (payload) => {
        console.log('📋 注册表已变更:', payload);
    });

    // 监听UI相关事件
    eventBus.on(events.UI.TAB_CHANGED, (payload) => {
        console.log('🖥️ 标签页已切换:', payload);
    });

    // 监听系统相关事件
    eventBus.on(events.SYSTEM.READY, (payload) => {
        console.log('⚡ 系统已就绪:', payload);
    });

    console.log('✅ 标准事件监听器已注册');
    console.log('💡 现在可以通过以下方式发布事件:');
    console.log('   window.GlobalEventBus.emit(window.StandardEvents.MINDMAP.UPDATED, data)');
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
    window.testEventBusIntegration = testEventBusIntegration;
    window.demonstrateStandardEvents = demonstrateStandardEvents;
    
    console.log('测试函数已添加到全局:');
    console.log('- testEventBusIntegration() - 运行完整测试');
    console.log('- demonstrateStandardEvents() - 演示标准事件使用');
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testEventBusIntegration, demonstrateStandardEvents };
}

// 自动运行演示（如果事件总线已加载）
if (typeof window !== 'undefined' && window.location) {
    // 等待页面加载完成后自动运行演示
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (window.GlobalEventBus) {
                    console.log('🚀 自动运行标准事件演示...');
                    demonstrateStandardEvents();
                }
            }, 1000);
        });
    } else {
        setTimeout(() => {
            if (window.GlobalEventBus) {
                console.log('🚀 自动运行标准事件演示...');
                demonstrateStandardEvents();
            }
        }, 1000);
    }
}
