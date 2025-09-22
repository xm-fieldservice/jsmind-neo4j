/**
 * 阶段2.2状态管理系统测试
 * 验证Redux-like状态容器、状态持久化和全局变量迁移功能
 */

console.log('=== 阶段2.2状态管理系统测试 ===');

async function testStateManagementSystem() {
    try {
        console.log('\n1. 等待状态管理系统加载...');
        
        // 等待状态管理系统加载
        if (!window.AppStateManager) {
            console.log('等待状态管理系统加载...');
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (window.AppStateManager) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        const stateManager = window.AppStateManager;
        const persistence = window.StatePersistence;
        const migrator = window.GlobalMigrator;
        const helper = window.MigrationHelper;
        
        console.log('✅ 状态管理系统已加载');

        // 测试状态管理器基础功能
        console.log('\n2. 测试状态管理器基础功能...');
        
        // 获取初始状态
        const initialState = stateManager.getState();
        console.log('初始状态结构:', Object.keys(initialState));
        
        // 测试状态订阅
        let subscriptionTriggered = false;
        const unsubscribe = stateManager.subscribe((newState, oldState, action) => {
            subscriptionTriggered = true;
            console.log('📡 状态变化订阅触发:', action.type);
        });
        
        // 测试脑图状态更新
        console.log('\n3. 测试脑图状态管理...');
        
        stateManager.dispatch({
            type: window.ActionTypes.MINDMAP.SET_CURRENT_PID,
            payload: 'test-mindmap-' + Date.now()
        });
        
        const currentPid = stateManager.getState('mindmap.current.pid');
        console.log('当前脑图PID:', currentPid);
        
        stateManager.dispatch({
            type: window.ActionTypes.MINDMAP.SET_NODE_COUNT,
            payload: 42
        });
        
        const nodeCount = stateManager.getState('mindmap.current.nodeCount');
        console.log('节点数量:', nodeCount);
        
        // 测试UI状态管理
        console.log('\n4. 测试UI状态管理...');
        
        stateManager.dispatch({
            type: window.ActionTypes.UI.SET_ACTIVE_TAB,
            payload: 'registry'
        });
        
        const activeTab = stateManager.getState('ui.activeTab');
        console.log('当前活动标签:', activeTab);
        
        stateManager.dispatch({
            type: window.ActionTypes.UI.ADD_NOTIFICATION,
            payload: {
                type: 'info',
                message: '这是一个测试通知',
                duration: 3000
            }
        });
        
        const notifications = stateManager.getState('ui.notifications');
        console.log('通知列表:', notifications.length, '条');
        
        // 测试注册表状态管理
        console.log('\n5. 测试注册表状态管理...');
        
        const testProject = {
            id: 'test-project-' + Date.now(),
            name: '测试项目',
            payload: { format: 'node_tree', data: { id: 'root', topic: '测试' } },
            createdAt: Date.now(),
            source: 'test'
        };
        
        stateManager.dispatch({
            type: window.ActionTypes.REGISTRY.ADD_PROJECT,
            payload: testProject
        });
        
        const projects = stateManager.getState('registry.projects');
        console.log('项目列表:', projects.length, '个项目');
        
        // 测试状态持久化
        console.log('\n6. 测试状态持久化...');
        
        const persistenceStats = persistence.getStats();
        console.log('持久化统计:', persistenceStats);
        
        // 手动保存状态
        const saveResult = await persistence.saveState(true);
        console.log('手动保存结果:', saveResult);
        
        // 获取备份列表
        const backups = persistence.getBackups();
        console.log('备份列表:', backups.length, '个备份');
        
        // 测试全局变量迁移
        console.log('\n7. 测试全局变量迁移...');
        
        const migrationStats = migrator.getStats();
        console.log('迁移统计:', migrationStats);
        
        // 测试迁移的全局变量
        console.log('测试迁移的全局变量访问...');
        
        // 通过代理访问
        const oldPid = window.__currentMindPid;
        console.log('通过代理获取PID:', oldPid);
        
        // 通过代理设置
        window.__currentMindPid = 'proxy-test-' + Date.now();
        const newPid = stateManager.getState('mindmap.current.pid');
        console.log('通过代理设置后的PID:', newPid);
        
        // 测试Registry代理
        console.log('测试Registry代理...');
        if (window.Registry) {
            const registryProjects = window.Registry.getProjects();
            console.log('通过Registry代理获取项目:', registryProjects.length);
        }
        
        // 生成迁移分析报告
        console.log('\n8. 生成迁移分析报告...');
        
        const migrationReport = migrator.generateMigrationReport();
        console.log('迁移报告:', {
            总结: migrationReport.summary,
            已迁移变量数: migrationReport.migratedVariables.length,
            未管理变量数: migrationReport.unmanagedVariables.length,
            建议数: migrationReport.recommendations.length
        });
        
        // 生成迁移指南
        const migrationGuide = helper.createMigrationGuide();
        console.log('迁移指南:', {
            标题: migrationGuide.title,
            完成率: migrationGuide.overview.completionRate + '%',
            步骤数: migrationGuide.steps.length
        });
        
        // 测试状态验证
        console.log('\n9. 测试状态验证...');
        
        const currentState = stateManager.getState();
        const validation = stateManager.validator.validate(currentState);
        console.log('状态验证结果:', {
            有效: validation.isValid,
            错误数: validation.errors.length,
            警告数: validation.warnings.length
        });
        
        // 测试状态历史记录
        console.log('\n10. 测试状态历史记录...');
        
        const history = stateManager.getHistory(5);
        console.log('最近5条历史记录:', history.map(h => h.action.type));
        
        // 测试状态差异计算
        console.log('\n11. 测试状态差异计算...');
        
        const stateBefore = window.StateUtils.deepClone(currentState);
        
        stateManager.dispatch({
            type: window.ActionTypes.UI.SET_THEME,
            payload: { mode: 'dark', primaryColor: '#ff6b6b' }
        });
        
        const stateAfter = stateManager.getState();
        const changes = window.StateUtils.diffState(stateBefore, stateAfter);
        console.log('状态变化:', changes.length, '处变更');
        
        // 清理订阅
        unsubscribe();
        
        // 测试结果汇总
        console.log('\n=== 测试结果汇总 ===');
        
        const finalStats = {
            状态管理器: stateManager.getStats(),
            持久化管理器: persistence.getStats(),
            全局变量迁移器: migrator.getStats(),
            订阅触发: subscriptionTriggered,
            状态验证: validation.isValid,
            历史记录数: history.length,
            状态变化数: changes.length
        };
        
        console.log('最终统计:', finalStats);
        
        return {
            success: true,
            stats: finalStats,
            migrationReport,
            migrationGuide
        };

    } catch (error) {
        console.error('❌ 状态管理系统测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 演示状态管理系统的使用方法
function demonstrateStateManagementUsage() {
    console.log('\n=== 状态管理系统使用演示 ===');
    
    if (!window.AppStateManager) {
        console.error('❌ 状态管理系统未加载');
        return;
    }

    console.log('💡 状态管理系统使用示例:');
    
    console.log('\n🔄 替换前（全局变量）:');
    console.log('  window.__currentMindPid = "new-pid";');
    console.log('  const pid = window.__currentMindPid;');
    console.log('  window.__activeTab = "registry";');
    
    console.log('\n✅ 替换后（状态管理器）:');
    console.log('  // 更新状态');
    console.log('  stateManager.dispatch({');
    console.log('    type: ActionTypes.MINDMAP.SET_CURRENT_PID,');
    console.log('    payload: "new-pid"');
    console.log('  });');
    console.log('');
    console.log('  // 获取状态');
    console.log('  const pid = stateManager.getState("mindmap.current.pid");');
    console.log('');
    console.log('  // 订阅状态变化');
    console.log('  const unsubscribe = stateManager.subscribe((newState, oldState, action) => {');
    console.log('    console.log("状态变化:", action.type);');
    console.log('  }, "mindmap.current.pid");');
    
    console.log('\n📡 事件驱动示例:');
    console.log('  // 监听脑图状态变化');
    console.log('  GlobalEventBus.on(StandardEvents.MINDMAP.UPDATED, (payload) => {');
    console.log('    console.log("脑图状态更新:", payload);');
    console.log('  });');
    
    console.log('\n🎯 优势:');
    console.log('  1. 集中式状态管理，避免全局变量污染');
    console.log('  2. 自动状态持久化和恢复');
    console.log('  3. 完整的状态变化历史记录');
    console.log('  4. 状态验证和错误处理');
    console.log('  5. 向后兼容的全局变量代理');
    console.log('  6. 与事件系统完美集成');
}

// 状态管理最佳实践指南
function showBestPractices() {
    console.log('\n=== 状态管理最佳实践 ===');
    
    console.log('\n📋 最佳实践:');
    console.log('  1. 使用Action更新状态，避免直接修改');
    console.log('  2. 通过订阅监听状态变化，而非轮询');
    console.log('  3. 使用路径订阅只监听需要的状态分支');
    console.log('  4. 合理使用中间件处理复杂逻辑');
    console.log('  5. 定期检查状态健康度和迁移进度');
    
    console.log('\n⚠️ 注意事项:');
    console.log('  1. 避免在状态中存储大量数据');
    console.log('  2. 不要在Reducer中执行异步操作');
    console.log('  3. 状态结构应该保持扁平化');
    console.log('  4. 及时清理不需要的订阅');
    console.log('  5. 使用TypeScript可以获得更好的类型安全');
    
    console.log('\n🔧 调试技巧:');
    console.log('  1. 开启调试模式查看详细日志');
    console.log('  2. 使用getHistory()查看状态变化历史');
    console.log('  3. 使用getStats()监控性能指标');
    console.log('  4. 定期检查迁移报告');
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
    window.testStateManagementSystem = testStateManagementSystem;
    window.demonstrateStateManagementUsage = demonstrateStateManagementUsage;
    window.showBestPractices = showBestPractices;
    
    console.log('测试函数已添加到全局:');
    console.log('- testStateManagementSystem() - 运行完整测试');
    console.log('- demonstrateStateManagementUsage() - 演示使用方法');
    console.log('- showBestPractices() - 显示最佳实践');
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        testStateManagementSystem, 
        demonstrateStateManagementUsage, 
        showBestPractices 
    };
}

// 自动运行演示（如果状态管理系统已加载）
if (typeof window !== 'undefined' && window.location) {
    // 等待页面加载完成后自动运行演示
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (window.AppStateManager) {
                    console.log('🚀 自动运行状态管理系统演示...');
                    demonstrateStateManagementUsage();
                    showBestPractices();
                }
            }, 3000);
        });
    } else {
        setTimeout(() => {
            if (window.AppStateManager) {
                console.log('🚀 自动运行状态管理系统演示...');
                demonstrateStateManagementUsage();
                showBestPractices();
            }
        }, 3000);
    }
}
