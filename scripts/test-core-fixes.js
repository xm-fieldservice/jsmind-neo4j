/**
 * 核心修复验证测试脚本
 * 验证Day 1和Day 2的核心问题是否已修复
 */

class CoreFixesValidator {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    /**
     * 运行所有核心修复验证
     */
    async runAllTests() {
        console.log('🔧 开始核心修复验证...');
        console.log('='.repeat(50));
        
        try {
            // 测试存储系统修复
            await this.testStorageSystemFixes();
            
            // 测试状态管理器修复
            await this.testStateManagerFixes();
            
            // 测试事件总线修复
            await this.testEventBusFixes();
            
            // 测试模块加载修复
            await this.testModuleLoadingFixes();
            
        } catch (error) {
            this.addTest('测试环境初始化', false, `环境初始化失败: ${error.message}`);
        }
        
        this.printResults();
        return this.testResults;
    }

    /**
     * 测试存储系统修复
     */
    async testStorageSystemFixes() {
        console.log('\n📦 测试存储系统修复...');
        
        // 测试存储系统初始化函数是否可用
        const hasInitFunction = typeof window.initializeStorageSystem === 'function';
        this.addTest('存储初始化函数可用', hasInitFunction, hasInitFunction ? '函数已暴露到全局' : '函数未找到');
        
        if (hasInitFunction) {
            try {
                // 测试存储系统初始化
                const result = await window.initializeStorageSystem({ enableFormal: false });
                this.addTest('存储系统初始化', result.success, result.success ? '初始化成功' : result.error);
                
                if (result.success && result.storage) {
                    // 测试基本存储操作
                    const testKey = 'test_core_fix';
                    const testData = { test: true, timestamp: Date.now() };
                    
                    const saveResult = result.storage.set(testKey, testData);
                    this.addTest('存储写入操作', saveResult, '数据保存测试');
                    
                    const loadResult = result.storage.get(testKey);
                    const loadSuccess = loadResult && loadResult.test === true;
                    this.addTest('存储读取操作', loadSuccess, '数据读取测试');
                    
                    // 清理测试数据
                    result.storage.remove(testKey);
                }
                
            } catch (error) {
                this.addTest('存储系统初始化', false, `初始化异常: ${error.message}`);
            }
        }
    }

    /**
     * 测试状态管理器修复
     */
    async testStateManagerFixes() {
        console.log('\n📊 测试状态管理器修复...');
        
        try {
            // 动态导入StateManager
            const stateModule = await import('../src/core/StateManager.js');
            this.addTest('StateManager模块加载', true, 'StateManager模块成功加载');
            
            // 创建EventBus实例（如果可用）
            let eventBus = null;
            if (typeof window.EventBus === 'function') {
                eventBus = new window.EventBus({ debugMode: false });
                this.addTest('EventBus创建', true, 'EventBus实例创建成功');
            } else {
                // 创建简单的事件总线替代
                eventBus = {
                    emit: () => {},
                    on: () => () => {},
                    getStats: () => ({ totalEvents: 0 })
                };
                this.addTest('EventBus创建', false, '使用简化EventBus替代');
            }
            
            // 创建StateManager实例
            const standardEvents = {
                SYSTEM: { READY: 'system:ready', ERROR: 'system:error' },
                STORAGE: { READY: 'storage:ready', ERROR: 'storage:error' },
                MINDMAP: { UPDATED: 'mindmap:updated', SELECTION_CHANGED: 'mindmap:selection_changed' },
                UI: { VIEW_CHANGED: 'ui:view_changed' },
                REGISTRY: { CHANGED: 'registry:changed' }
            };
            
            const stateManager = new stateModule.StateManager(eventBus, standardEvents);
            this.addTest('StateManager创建', true, 'StateManager实例创建成功');
            
            // 测试深度克隆修复
            const testAction = {
                type: 'UI_SET_ACTIVE_TAB',
                payload: 'test_tab'
            };
            
            try {
                stateManager.dispatch(testAction);
                this.addTest('深度克隆修复', true, 'Action分发成功，深度克隆正常');
            } catch (error) {
                this.addTest('深度克隆修复', false, `Action分发失败: ${error.message}`);
            }
            
            // 测试状态获取
            const currentState = stateManager.getState();
            const hasValidState = currentState && typeof currentState === 'object';
            this.addTest('状态获取', hasValidState, hasValidState ? '状态结构正常' : '状态结构异常');
            
            // 测试增强功能
            const stats = stateManager.getStats();
            const hasEnhancedStats = stats && typeof stats.uptimeFormatted === 'string';
            this.addTest('增强统计功能', hasEnhancedStats, hasEnhancedStats ? '增强统计正常' : '增强统计缺失');
            
        } catch (error) {
            this.addTest('StateManager模块加载', false, `模块加载失败: ${error.message}`);
        }
    }

    /**
     * 测试事件总线修复
     */
    async testEventBusFixes() {
        console.log('\n📡 测试事件总线修复...');
        
        // 测试全局EventBus是否可用
        const hasGlobalEventBus = typeof window.EventBus === 'function';
        this.addTest('全局EventBus可用', hasGlobalEventBus, hasGlobalEventBus ? 'EventBus类已暴露' : 'EventBus类未找到');
        
        const hasGlobalInstance = typeof window.GlobalEventBus === 'object';
        this.addTest('全局EventBus实例', hasGlobalInstance, hasGlobalInstance ? '全局实例已创建' : '全局实例未找到');
        
        if (hasGlobalEventBus) {
            try {
                // 创建测试实例
                const testEventBus = new window.EventBus({ debugMode: false });
                this.addTest('EventBus实例创建', true, '测试实例创建成功');
                
                // 测试基本事件功能
                let eventTriggered = false;
                const unsubscribe = testEventBus.on('test:basic', () => {
                    eventTriggered = true;
                });
                
                testEventBus.emit('test:basic', { test: true });
                this.addTest('基本事件功能', eventTriggered, '事件发布和监听正常');
                
                // 测试增强功能
                const stats = testEventBus.getStats();
                const hasEnhancedFeatures = stats && typeof stats.uptimeFormatted === 'string';
                this.addTest('增强事件功能', hasEnhancedFeatures, hasEnhancedFeatures ? '增强功能正常' : '增强功能缺失');
                
                // 清理
                unsubscribe();
                
            } catch (error) {
                this.addTest('EventBus功能测试', false, `功能测试失败: ${error.message}`);
            }
        }
    }

    /**
     * 测试模块加载修复
     */
    async testModuleLoadingFixes() {
        console.log('\n🔗 测试模块加载修复...');
        
        // 测试关键模块是否可访问
        const modules = [
            { name: 'StateSchema', path: '../src/core/StateSchema.js' },
            { name: 'StorageIndex', path: '../src/core/storage/index.js' }
        ];
        
        for (const module of modules) {
            try {
                const imported = await import(module.path);
                const hasExports = imported && Object.keys(imported).length > 0;
                this.addTest(`${module.name}模块加载`, hasExports, hasExports ? '模块加载成功' : '模块无导出');
            } catch (error) {
                this.addTest(`${module.name}模块加载`, false, `加载失败: ${error.message}`);
            }
        }
        
        // 测试脚本文件是否可访问
        const scripts = [
            'test-storage-system.js',
            'test-day2-integration.js'
        ];
        
        for (const script of scripts) {
            const scriptExists = document.querySelector(`script[src*="${script}"]`) !== null;
            this.addTest(`${script}脚本引用`, scriptExists, scriptExists ? '脚本已引用' : '脚本未引用');
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
        
        this.testResults.tests.push(result);
        
        if (passed) {
            this.testResults.passed++;
            console.log(`  ✅ ${name}: ${message}`);
        } else {
            this.testResults.failed++;
            console.log(`  ❌ ${name}: ${message}`);
        }
    }

    /**
     * 打印测试结果
     */
    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('🔧 核心修复验证结果');
        console.log('='.repeat(50));
        
        const total = this.testResults.passed + this.testResults.failed;
        const successRate = total > 0 ? (this.testResults.passed / total * 100).toFixed(1) : 0;
        
        console.log(`总测试数: ${total}`);
        console.log(`通过: ${this.testResults.passed}`);
        console.log(`失败: ${this.testResults.failed}`);
        console.log(`成功率: ${successRate}%`);
        
        // 评估修复效果
        let assessment = '';
        if (successRate >= 90) {
            assessment = '🟢 优秀 - 核心问题已基本修复';
        } else if (successRate >= 75) {
            assessment = '🟡 良好 - 主要问题已修复，有少量遗留';
        } else if (successRate >= 60) {
            assessment = '🟠 一般 - 部分问题已修复，需要继续优化';
        } else {
            assessment = '🔴 差 - 核心问题仍然存在，需要重点修复';
        }
        
        console.log(`修复效果: ${assessment}`);
        
        // 显示失败的测试
        if (this.testResults.failed > 0) {
            console.log('\n❌ 仍需修复的问题:');
            this.testResults.tests
                .filter(test => !test.passed)
                .forEach((test, index) => {
                    console.log(`  ${index + 1}. ${test.name}: ${test.message}`);
                });
        }
        
        // 修复建议
        console.log('\n💡 修复建议:');
        if (successRate >= 90) {
            console.log('  ✨ 核心修复工作完成良好，可以继续功能开发');
        } else if (successRate >= 75) {
            console.log('  🔧 继续修复剩余的小问题，确保系统稳定');
        } else {
            console.log('  🚨 优先修复核心功能，暂停新功能开发');
            console.log('  📋 建议采用渐进式修复策略');
        }
        
        console.log('\n' + '='.repeat(50));
        
        return {
            success: successRate >= 75,
            successRate: parseFloat(successRate),
            total,
            passed: this.testResults.passed,
            failed: this.testResults.failed,
            assessment
        };
    }
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.CoreFixesValidator = CoreFixesValidator;
    
    // 提供快速测试函数
    window.testCoreFixes = async function() {
        const validator = new CoreFixesValidator();
        return await validator.runAllTests();
    };
    
    console.log('🔧 核心修复验证工具已加载');
    console.log('使用 testCoreFixes() 函数开始验证');
}

// Node.js 环境导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoreFixesValidator;
}
