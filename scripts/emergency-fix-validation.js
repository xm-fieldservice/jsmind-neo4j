/**
 * 紧急修复验证脚本
 * 专门验证StateManager状态验证和Action格式问题的修复
 */

console.log('🚨 开始紧急修复验证...');

class EmergencyFixValidator {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runAllTests() {
        console.log('🔧 开始紧急修复验证...');
        
        try {
            // 测试存储系统修复
            await this.testStorageConstructorFix();
            
            // 测试StateManager状态验证修复
            await this.testStateValidationFix();
            
            // 测试ComponentLifecycle Action修复
            await this.testComponentLifecycleActionFix();
            
        } catch (error) {
            this.addTest('紧急修复环境', false, `环境初始化失败: ${error.message}`);
        }
        
        this.printResults();
        return this.results;
    }

    /**
     * 测试存储系统构造函数修复
     */
    async testStorageConstructorFix() {
        console.log('\n📦 测试存储系统构造函数修复...');
        
        try {
            // 测试存储系统初始化
            const result = await window.initializeStorageSystem({ enableFormal: false });
            
            if (result && result.success) {
                this.addTest('存储系统构造函数修复', true, '存储系统初始化成功');
                
                // 测试基本操作
                if (result.storage) {
                    const testKey = 'emergency_test';
                    const testData = { emergency: true, timestamp: Date.now() };
                    
                    const saveResult = result.storage.set(testKey, testData);
                    const loadResult = result.storage.get(testKey);
                    
                    this.addTest('存储基本操作', saveResult && loadResult && loadResult.emergency, '存储读写正常');
                    
                    // 清理
                    result.storage.remove(testKey);
                } else {
                    this.addTest('存储实例创建', false, '存储实例为null');
                }
            } else {
                this.addTest('存储系统构造函数修复', false, result ? result.error : '初始化返回null');
            }
            
        } catch (error) {
            this.addTest('存储系统构造函数修复', false, `构造函数错误: ${error.message}`);
        }
    }

    /**
     * 测试StateManager状态验证修复
     */
    async testStateValidationFix() {
        console.log('\n📊 测试StateManager状态验证修复...');
        
        try {
            // 动态导入StateManager
            const stateModule = await import('../src/core/StateManager.js');
            
            // 创建简单的事件总线
            const mockEventBus = {
                emit: () => {},
                on: () => () => {},
                getStats: () => ({ totalEvents: 0 })
            };
            
            const standardEvents = {
                SYSTEM: { READY: 'system:ready', ERROR: 'system:error' },
                STORAGE: { READY: 'storage:ready', ERROR: 'storage:error' },
                MINDMAP: { UPDATED: 'mindmap:updated', SELECTION_CHANGED: 'mindmap:selection_changed' },
                UI: { VIEW_CHANGED: 'ui:view_changed' },
                REGISTRY: { CHANGED: 'registry:changed' }
            };
            
            // 测试StateManager创建
            const stateManager = new stateModule.StateManager(mockEventBus, standardEvents);
            this.addTest('StateManager创建', true, 'StateManager实例创建成功');
            
            // 测试默认状态验证
            const initialState = stateManager.getState();
            const hasRequiredFields = initialState && 
                                    initialState.mindmap && 
                                    initialState.mindmap.current && 
                                    typeof initialState.mindmap.current.nodeCount === 'number' &&
                                    initialState.ui && 
                                    initialState.ui.activeTab &&
                                    initialState.ui.theme &&
                                    initialState.ui.theme.mode &&
                                    initialState.system &&
                                    initialState.system.storage &&
                                    initialState.system.storage.mode;
            
            this.addTest('默认状态验证', hasRequiredFields, hasRequiredFields ? '所有必需字段存在' : '缺少必需字段');
            
            // 测试Action分发
            const testAction = {
                type: 'UI_SET_ACTIVE_TAB',
                payload: 'test_tab'
            };
            
            try {
                stateManager.dispatch(testAction);
                this.addTest('Action分发修复', true, 'Action分发成功，无验证错误');
            } catch (error) {
                this.addTest('Action分发修复', false, `Action分发失败: ${error.message}`);
            }
            
        } catch (error) {
            this.addTest('StateManager状态验证修复', false, `StateManager测试失败: ${error.message}`);
        }
    }

    /**
     * 测试ComponentLifecycle Action修复
     */
    async testComponentLifecycleActionFix() {
        console.log('\n🔄 测试ComponentLifecycle Action修复...');
        
        try {
            // 动态导入相关模块
            const stateModule = await import('../src/core/StateManager.js');
            
            // 检查ActionTypes是否包含INIT_COMPONENT_LIFECYCLE
            const hasAction = stateModule.ActionTypes && 
                            stateModule.ActionTypes.SYSTEM && 
                            stateModule.ActionTypes.SYSTEM.INIT_COMPONENT_LIFECYCLE;
            
            this.addTest('ComponentLifecycle Action定义', hasAction, hasAction ? 'INIT_COMPONENT_LIFECYCLE已定义' : 'Action类型缺失');
            
            if (hasAction) {
                // 测试Action的实际使用
                const mockEventBus = {
                    emit: () => {},
                    on: () => () => {},
                    getStats: () => ({ totalEvents: 0 })
                };
                
                const standardEvents = {
                    SYSTEM: { READY: 'system:ready', ERROR: 'system:error' }
                };
                
                const stateManager = new stateModule.StateManager(mockEventBus, standardEvents);
                
                // 测试ComponentLifecycle Action
                const lifecycleAction = {
                    type: stateModule.ActionTypes.SYSTEM.INIT_COMPONENT_LIFECYCLE,
                    payload: {
                        components: { test: 'component' },
                        stats: { initialized: true }
                    }
                };
                
                try {
                    stateManager.dispatch(lifecycleAction);
                    
                    // 检查状态是否正确更新
                    const state = stateManager.getState();
                    const hasComponents = state.system && state.system.components;
                    
                    this.addTest('ComponentLifecycle Action处理', hasComponents, hasComponents ? 'Action处理成功' : '状态未更新');
                } catch (error) {
                    this.addTest('ComponentLifecycle Action处理', false, `Action处理失败: ${error.message}`);
                }
            }
            
        } catch (error) {
            this.addTest('ComponentLifecycle Action修复', false, `ComponentLifecycle测试失败: ${error.message}`);
        }
    }

    /**
     * 添加测试结果
     */
    addTest(name, passed, message = '') {
        const result = {
            name,
            passed: !!passed,
            message,
            timestamp: new Date().toISOString()
        };
        
        this.results.tests.push(result);
        
        if (passed) {
            this.results.passed++;
            console.log(`  ✅ ${name}: ${message}`);
        } else {
            this.results.failed++;
            console.log(`  ❌ ${name}: ${message}`);
        }
    }

    /**
     * 打印测试结果
     */
    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('🚨 紧急修复验证结果');
        console.log('='.repeat(50));
        
        const total = this.results.passed + this.results.failed;
        const successRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;
        
        console.log(`总测试数: ${total}`);
        console.log(`通过: ${this.results.passed}`);
        console.log(`失败: ${this.results.failed}`);
        console.log(`成功率: ${successRate}%`);
        
        // 评估修复效果
        let status = '';
        if (successRate >= 90) {
            status = '🟢 优秀 - 紧急问题已修复';
        } else if (successRate >= 75) {
            status = '🟡 良好 - 主要问题已修复';
        } else if (successRate >= 60) {
            status = '🟠 一般 - 部分问题已修复';
        } else {
            status = '🔴 差 - 问题仍然存在';
        }
        
        console.log(`修复状态: ${status}`);
        
        // 显示失败的测试
        if (this.results.failed > 0) {
            console.log('\n❌ 仍需修复的问题:');
            this.results.tests
                .filter(test => !test.passed)
                .forEach((test, index) => {
                    console.log(`  ${index + 1}. ${test.name}: ${test.message}`);
                });
        }
        
        console.log('\n' + '='.repeat(50));
        
        return {
            success: successRate >= 75,
            successRate: parseFloat(successRate),
            total,
            passed: this.results.passed,
            failed: this.results.failed,
            status
        };
    }
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.EmergencyFixValidator = EmergencyFixValidator;
    
    // 提供快速测试函数
    window.testEmergencyFixes = async function() {
        const validator = new EmergencyFixValidator();
        return await validator.runAllTests();
    };
    
    console.log('🚨 紧急修复验证工具已加载');
    console.log('使用 testEmergencyFixes() 函数开始验证');
}

// 自动运行
if (typeof window !== 'undefined') {
    // 延迟自动运行，确保其他模块已加载
    setTimeout(async () => {
        console.log('🚨 自动运行紧急修复验证...');
        await window.testEmergencyFixes();
    }, 2000);
}
