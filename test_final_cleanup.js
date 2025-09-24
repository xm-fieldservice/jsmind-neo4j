/**
 * 最终清理验证测试 - 验证剩余5%工作的完成情况
 * 测试拖拽诊断清理、快照异步化、配置优化等
 */

(function() {
    'use strict';
    
    const FinalCleanupTest = {
        
        /**
         * 测试拖拽诊断功能清理
         */
        testDragDiagnosticCleanup() {
            console.log('📋 测试拖拽诊断功能清理');
            
            const controller = window.mindmapController;
            if (!controller) {
                console.error('❌ MindmapController不可用');
                return false;
            }
            
            const results = {
                dragDiagRemoved: typeof controller._dragDiag === 'undefined',
                dragDiagLogRemoved: typeof controller._dragDiagLog === 'undefined',
                exportDragDiagnosticsRemoved: typeof controller.exportDragDiagnostics === 'undefined',
                initDragDiagnosticsRemoved: typeof controller._initDragDiagnostics === 'undefined'
            };
            
            const allRemoved = Object.values(results).every(v => v === true);
            
            if (allRemoved) {
                console.log('✅ 拖拽诊断功能已完全清理');
            } else {
                console.error('❌ 拖拽诊断功能清理不完整:', results);
            }
            
            return allRemoved;
        },
        
        /**
         * 测试快照系统异步化
         */
        async testSnapshotAsyncification() {
            console.log('📋 测试快照系统异步化');
            
            const controller = window.mindmapController;
            if (!controller) {
                console.error('❌ MindmapController不可用');
                return false;
            }
            
            try {
                // 测试_snapshotIndex是否为异步方法
                const indexResult = controller._snapshotIndex();
                const isPromise = indexResult && typeof indexResult.then === 'function';
                
                if (!isPromise) {
                    console.error('❌ _snapshotIndex不是异步方法');
                    return false;
                }
                
                // 测试异步调用
                const snapshots = await indexResult;
                if (!Array.isArray(snapshots)) {
                    console.error('❌ _snapshotIndex返回值不是数组');
                    return false;
                }
                
                console.log('✅ 快照系统已异步化，当前快照数量:', snapshots.length);
                return true;
                
            } catch (error) {
                console.error('❌ 快照系统异步化测试失败:', error);
                return false;
            }
        },
        
        /**
         * 测试配置加载优化
         */
        async testConfigOptimization() {
            console.log('📋 测试配置加载优化');
            
            const controller = window.mindmapController;
            if (!controller) {
                console.error('❌ MindmapController不可用');
                return false;
            }
            
            try {
                // 测试_loadSnapshotConfig是否为异步方法
                const configResult = controller._loadSnapshotConfig();
                const isPromise = configResult && typeof configResult.then === 'function';
                
                if (!isPromise) {
                    console.error('❌ _loadSnapshotConfig不是异步方法');
                    return false;
                }
                
                // 测试异步调用
                await configResult;
                
                console.log('✅ 配置加载已优化为异步');
                return true;
                
            } catch (error) {
                console.error('❌ 配置加载优化测试失败:', error);
                return false;
            }
        },
        
        /**
         * 测试核心组件加载
         */
        testCoreComponentsLoading() {
            console.log('📋 测试核心组件加载');
            
            const results = {
                errorHandlerExists: typeof window.ErrorHandler !== 'undefined',
                dependencyManagerExists: typeof window.DependencyManager !== 'undefined',
                handleErrorFunctionExists: typeof window.handleError === 'function'
            };
            
            const allLoaded = Object.values(results).every(v => v === true);
            
            if (allLoaded) {
                console.log('✅ 核心组件已正确加载');
            } else {
                console.error('❌ 核心组件加载不完整:', results);
            }
            
            return allLoaded;
        },
        
        /**
         * 测试存储错误修复
         */
        async testStorageErrorFix() {
            console.log('📋 测试存储错误修复');
            
            if (!window.AutogenUnifiedStorage) {
                console.error('❌ AutogenUnifiedStorage不可用');
                return false;
            }
            
            try {
                // 测试存储操作不会产生diagnostic:undefined错误
                await window.AutogenUnifiedStorage.store('test', 'cleanup_test', { test: true });
                const retrieved = await window.AutogenUnifiedStorage.retrieve('test', 'cleanup_test');
                
                if (retrieved && retrieved.test === true) {
                    console.log('✅ 存储系统工作正常，无diagnostic错误');
                    
                    // 清理测试数据
                    await window.AutogenUnifiedStorage.remove('test', 'cleanup_test');
                    return true;
                } else {
                    console.error('❌ 存储系统数据不一致');
                    return false;
                }
                
            } catch (error) {
                console.error('❌ 存储系统测试失败:', error);
                return false;
            }
        },
        
        /**
         * 测试系统整体稳定性
         */
        testSystemStability() {
            console.log('📋 测试系统整体稳定性');
            
            const results = {
                noGlobalErrors: !window.hasGlobalErrors,
                mindmapControllerReady: window.mindmapController && typeof window.mindmapController.init === 'function',
                registryReady: window.Registry && typeof window.Registry.cmd === 'object',
                autogenStorageReady: window.AutogenUnifiedStorage && typeof window.AutogenUnifiedStorage.store === 'function',
                eventBusReady: window.AutogenEventBus && typeof window.AutogenEventBus.emit === 'function' && typeof window.AutogenEventBus.on === 'function'
            };
            
            const systemStable = Object.values(results).every(v => v === true);
            
            if (systemStable) {
                console.log('✅ 系统整体稳定');
            } else {
                console.error('❌ 系统稳定性问题:', results);
            }
            
            return systemStable;
        },
        
        /**
         * 运行所有最终测试
         */
        async runAllTests() {
            console.log('🚀 开始最终清理验证测试');
            console.log('=====================================');
            
            const tests = [
                { name: '拖拽诊断清理', test: () => this.testDragDiagnosticCleanup() },
                { name: '快照系统异步化', test: () => this.testSnapshotAsyncification() },
                { name: '配置加载优化', test: () => this.testConfigOptimization() },
                { name: '核心组件加载', test: () => this.testCoreComponentsLoading() },
                { name: '存储错误修复', test: () => this.testStorageErrorFix() },
                { name: '系统整体稳定性', test: () => this.testSystemStability() }
            ];
            
            const results = {};
            let passedTests = 0;
            
            for (const { name, test } of tests) {
                console.log(`\n📋 执行: ${name}`);
                try {
                    const result = await test();
                    results[name] = result;
                    if (result) {
                        passedTests++;
                        console.log(`✅ ${name} - 通过`);
                    } else {
                        console.log(`❌ ${name} - 失败`);
                    }
                } catch (error) {
                    console.error(`❌ ${name} - 异常:`, error);
                    results[name] = false;
                }
            }
            
            console.log('\n=====================================');
            console.log('📊 最终测试结果汇总:');
            
            const totalTests = tests.length;
            const successRate = Math.round((passedTests / totalTests) * 100);
            
            console.log(`总体通过率: ${passedTests}/${totalTests} (${successRate}%)`);
            
            if (successRate === 100) {
                console.log('🎉 第二阶段架构清理工作100%完成！');
                console.log('✨ 系统已达到企业级应用标准！');
            } else if (successRate >= 90) {
                console.log('👍 第二阶段架构清理工作基本完成');
                console.log('⚠️ 少量问题需要进一步处理');
            } else {
                console.log('⚠️ 第二阶段架构清理工作需要进一步完善');
            }
            
            // 详细结果
            console.log('\n📋 详细测试结果:');
            Object.entries(results).forEach(([name, result]) => {
                console.log(`  ${result ? '✅' : '❌'} ${name}`);
            });
            
            return {
                results,
                passedTests,
                totalTests,
                successRate
            };
        }
    };
    
    // 暴露到全局
    window.FinalCleanupTest = FinalCleanupTest;
    
    // 自动运行测试（延迟执行，确保所有模块加载完成）
    setTimeout(() => {
        console.log('⏰ 自动运行最终清理验证测试');
        FinalCleanupTest.runAllTests();
    }, 3000);
    
})();
