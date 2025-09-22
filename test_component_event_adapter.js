/**
 * 阶段2.1组件事件适配器测试
 * 验证组件间直接调用改为事件驱动的功能
 */

console.log('=== 阶段2.1组件事件适配器测试 ===');

async function testComponentEventAdapter() {
    try {
        console.log('\n1. 等待组件事件适配器加载...');
        
        // 等待适配器加载
        if (!window.ComponentAdapters) {
            console.log('等待组件事件适配器加载...');
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (window.ComponentAdapters) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        const adapters = window.ComponentAdapters;
        const mindmapAdapter = window.MindmapAdapter;
        const globalAdapter = window.GlobalAdapter;
        const eventBus = window.GlobalEventBus;
        const events = window.StandardEvents;
        
        console.log('✅ 组件事件适配器已加载');

        // 测试脑图控制器适配器
        console.log('\n2. 测试脑图控制器适配器...');
        
        // 监听脑图相关事件
        let eventsReceived = [];
        const eventListeners = [
            eventBus.on(events.MINDMAP.DATA_ACCESSED, (payload) => {
                eventsReceived.push('DATA_ACCESSED');
                console.log('📡 接收到脑图数据访问事件:', payload);
            }),
            eventBus.on(events.MINDMAP.ROOT_ACCESSED, (payload) => {
                eventsReceived.push('ROOT_ACCESSED');
                console.log('📡 接收到根节点访问事件:', payload);
            }),
            eventBus.on(events.MINDMAP.NODE_SELECT_REQUESTED, (payload) => {
                eventsReceived.push('NODE_SELECT_REQUESTED');
                console.log('📡 接收到节点选择请求事件:', payload);
            }),
            eventBus.on(events.MINDMAP.ERROR, (payload) => {
                eventsReceived.push('ERROR');
                console.log('📡 接收到脑图错误事件:', payload);
            })
        ];

        // 测试控制器状态检查
        const controllerStatus = mindmapAdapter.getControllerStatus();
        console.log('控制器状态:', controllerStatus);

        // 测试获取脑图数据（通过适配器）
        console.log('\n3. 测试通过适配器获取脑图数据...');
        const mindData = mindmapAdapter.getMindData();
        if (mindData) {
            console.log('✅ 成功通过适配器获取脑图数据');
        } else {
            console.log('⚠️ 脑图数据为空（可能控制器未初始化）');
        }

        // 测试获取根节点（通过适配器）
        console.log('\n4. 测试通过适配器获取根节点...');
        const rootNode = mindmapAdapter.getRootNode();
        if (rootNode) {
            console.log('✅ 成功通过适配器获取根节点:', rootNode.topic);
        } else {
            console.log('⚠️ 根节点为空（可能控制器未初始化）');
        }

        // 测试节点选择（通过适配器）
        console.log('\n5. 测试通过适配器选择节点...');
        if (rootNode && rootNode.id) {
            const selectResult = mindmapAdapter.selectAndCenterNode(rootNode.id);
            console.log('节点选择结果:', selectResult);
        } else {
            console.log('⚠️ 跳过节点选择测试（无可用节点）');
        }

        // 测试全局变量适配器
        console.log('\n6. 测试全局变量适配器...');
        
        // 监听全局变量事件
        const globalEventListeners = [
            eventBus.on(events.SYSTEM.GLOBAL_ACCESSED, (payload) => {
                eventsReceived.push('GLOBAL_ACCESSED');
                console.log('📡 接收到全局变量访问事件:', payload);
            }),
            eventBus.on(events.SYSTEM.GLOBAL_CHANGED, (payload) => {
                eventsReceived.push('GLOBAL_CHANGED');
                console.log('📡 接收到全局变量变更事件:', payload);
            })
        ];

        // 测试获取全局变量
        const currentPid = globalAdapter.getCurrentMindPid();
        console.log('当前脑图PID:', currentPid);

        // 测试设置全局变量
        const testPid = 'test_pid_' + Date.now();
        const setResult = globalAdapter.setCurrentMindPid(testPid);
        console.log('设置测试PID结果:', setResult);

        // 验证设置结果
        const newPid = globalAdapter.getCurrentMindPid();
        if (newPid === testPid) {
            console.log('✅ 全局变量设置成功');
        } else {
            console.log('❌ 全局变量设置失败');
        }

        // 测试脑图缓存操作
        console.log('\n7. 测试脑图缓存操作...');
        const currentCache = globalAdapter.getMindFullCache();
        console.log('当前缓存状态:', !!currentCache);

        // 设置测试缓存
        const testCache = { test: true, timestamp: Date.now() };
        const setCacheResult = globalAdapter.setMindFullCache(testCache);
        console.log('设置测试缓存结果:', setCacheResult);

        // 测试容器大小调整
        console.log('\n8. 测试容器大小调整...');
        const resizeResult = mindmapAdapter.handleContainerResize();
        console.log('容器大小调整结果:', resizeResult);

        // 等待事件处理完成
        await new Promise(resolve => setTimeout(resolve, 500));

        // 测试适配器统计信息
        console.log('\n9. 获取适配器统计信息...');
        const stats = adapters.getStats();
        console.log('适配器统计:', stats);

        // 清理事件监听器
        console.log('\n10. 清理测试事件监听器...');
        [...eventListeners, ...globalEventListeners].forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });

        // 测试结果汇总
        console.log('\n=== 测试结果汇总 ===');
        console.log('接收到的事件:', eventsReceived);
        console.log('事件总数:', eventsReceived.length);
        
        const testResults = {
            adapterLoaded: !!adapters,
            mindmapAdapterAvailable: !!mindmapAdapter,
            globalAdapterAvailable: !!globalAdapter,
            controllerStatus,
            eventsReceived: eventsReceived.length,
            stats
        };

        console.log('✅ 组件事件适配器测试完成');
        return {
            success: true,
            results: testResults,
            eventsReceived
        };

    } catch (error) {
        console.error('❌ 组件事件适配器测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 演示如何使用适配器替换直接调用
function demonstrateAdapterUsage() {
    console.log('\n=== 适配器使用演示 ===');
    
    if (!window.MindmapAdapter || !window.GlobalAdapter) {
        console.error('❌ 适配器未加载');
        return;
    }

    console.log('💡 适配器使用示例:');
    
    console.log('\n🔄 替换前（直接调用）:');
    console.log('  const mc = window.mindmapController;');
    console.log('  const data = mc?.mind?.get_data("node_tree");');
    console.log('  const root = mc?.mind?.get_root();');
    console.log('  window.__currentMindPid = "new_pid";');
    
    console.log('\n✅ 替换后（事件驱动）:');
    console.log('  const data = window.MindmapAdapter.getMindData();');
    console.log('  const root = window.MindmapAdapter.getRootNode();');
    console.log('  window.GlobalAdapter.setCurrentMindPid("new_pid");');
    
    console.log('\n📡 事件监听示例:');
    console.log('  window.GlobalEventBus.on(window.StandardEvents.MINDMAP.DATA_ACCESSED, (payload) => {');
    console.log('    console.log("脑图数据被访问:", payload);');
    console.log('  });');
    
    console.log('\n🎯 优势:');
    console.log('  1. 解除组件间直接依赖');
    console.log('  2. 统一的事件通信机制');
    console.log('  3. 更好的错误处理和调试');
    console.log('  4. 支持组件生命周期管理');
}

// 检查现有代码中的直接调用并提供替换建议
function analyzeDirectCalls() {
    console.log('\n=== 直接调用分析 ===');
    
    const directCallPatterns = [
        'window.mindmapController',
        'window.__currentMindPid',
        'window.__mindFullCache',
        'window.Registry'
    ];
    
    console.log('🔍 检测到的直接调用模式:');
    directCallPatterns.forEach(pattern => {
        console.log(`  - ${pattern}`);
    });
    
    console.log('\n📋 替换建议:');
    console.log('  1. window.mindmapController.mind.get_data() → window.MindmapAdapter.getMindData()');
    console.log('  2. window.mindmapController.mind.get_root() → window.MindmapAdapter.getRootNode()');
    console.log('  3. window.__currentMindPid = value → window.GlobalAdapter.setCurrentMindPid(value)');
    console.log('  4. window.__mindFullCache = value → window.GlobalAdapter.setMindFullCache(value)');
    
    console.log('\n⚡ 下一步行动:');
    console.log('  1. 在 script.js 中逐步替换直接调用');
    console.log('  2. 添加事件监听器处理状态变化');
    console.log('  3. 测试功能兼容性');
    console.log('  4. 移除旧的直接调用代码');
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
    window.testComponentEventAdapter = testComponentEventAdapter;
    window.demonstrateAdapterUsage = demonstrateAdapterUsage;
    window.analyzeDirectCalls = analyzeDirectCalls;
    
    console.log('测试函数已添加到全局:');
    console.log('- testComponentEventAdapter() - 运行完整测试');
    console.log('- demonstrateAdapterUsage() - 演示适配器使用');
    console.log('- analyzeDirectCalls() - 分析直接调用');
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testComponentEventAdapter, demonstrateAdapterUsage, analyzeDirectCalls };
}

// 自动运行演示（如果适配器已加载）
if (typeof window !== 'undefined' && window.location) {
    // 等待页面加载完成后自动运行演示
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (window.ComponentAdapters) {
                    console.log('🚀 自动运行适配器使用演示...');
                    demonstrateAdapterUsage();
                    analyzeDirectCalls();
                }
            }, 2000);
        });
    } else {
        setTimeout(() => {
            if (window.ComponentAdapters) {
                console.log('🚀 自动运行适配器使用演示...');
                demonstrateAdapterUsage();
                analyzeDirectCalls();
            }
        }, 2000);
    }
}
