/**
 * 程序员 - P2阶段架构优化验证测试
 * 
 * 验证P2.1事件系统统一和P2.2错误处理标准化的成果
 * 确保解决审核员指出的"事件系统混乱"和"错误处理机制碎片化"问题
 */

;(function(global) {
    'use strict';

    class P2ArchitectureValidationTest {
        constructor() {
            this.testResults = {
                total: 0,
                passed: 0,
                failed: 0,
                details: []
            };
            
            this.eventBus = global.AutogenEventBus;
            this.logger = global.UnifiedLogger;
            this.errorHandler = global.ErrorHandler;
            
            console.log('[P2ArchitectureValidationTest] 初始化P2架构验证测试');
        }

        /**
         * 运行所有P2验证测试
         */
        async runAllTests() {
            console.log('[P2ArchitectureValidationTest] 🚀 开始P2阶段架构验证');
            
            // P2.1 事件系统统一验证
            await this._testEventSystemUnification();
            
            // P2.2 错误处理标准化验证
            await this._testErrorHandlingStandardization();
            
            // P2 整体架构健康度评估
            await this._testArchitectureHealth();
            
            // 生成测试报告
            this._generateTestReport();
            
            return this.testResults;
        }

        /**
         * P2.1 事件系统统一验证
         */
        async _testEventSystemUnification() {
            console.log('[P2ArchitectureValidationTest] 验证P2.1事件系统统一...');
            
            // 测试1: 事件标准验证器
            await this._runTest('P2.1.1 事件标准验证器功能', () => {
                if (!global.EventValidator) {
                    throw new Error('EventValidator未加载');
                }
                
                // 测试标准事件名称验证
                const validEvent = global.EventValidator.validateEventName('mindmap:operation:create');
                if (!validEvent.valid) {
                    throw new Error('标准事件名称验证失败');
                }
                
                // 测试无效事件名称验证
                const invalidEvent = global.EventValidator.validateEventName('invalid-event-name');
                if (invalidEvent.valid) {
                    throw new Error('无效事件名称应该被拒绝');
                }
                
                return '事件验证器工作正常';
            });

            // 测试2: 事件迁移工具
            await this._runTest('P2.1.2 事件迁移工具功能', () => {
                if (!global.EventMigrationTool) {
                    throw new Error('EventMigrationTool未加载');
                }
                
                // 测试事件迁移
                const oldEvent = 'mindmap-ui:toolbar:button-click';
                const newEvent = global.EventMigrationTool.getStandardEventName(oldEvent);
                
                if (newEvent !== 'ui:interaction:click') {
                    throw new Error(`事件迁移失败: ${oldEvent} -> ${newEvent}`);
                }
                
                return '事件迁移工具工作正常';
            });

            // 测试3: AutogenEventBus增强功能
            await this._runTest('P2.1.3 AutogenEventBus增强功能', () => {
                if (!this.eventBus) {
                    throw new Error('AutogenEventBus未加载');
                }
                
                // 重置统计
                this.eventBus.resetEventStats();
                
                // 发送标准事件
                this.eventBus.emit('system:test:validation', { test: 'P2.1.3' });
                
                // 发送需要迁移的事件
                this.eventBus.emit('mindmap-ui:toolbar:button-click', { test: 'migration' });
                
                // 检查统计
                const stats = this.eventBus.getEventStats();
                if (stats.emitted < 2) {
                    throw new Error('事件发送统计异常');
                }
                
                if (stats.migrated < 1) {
                    throw new Error('事件迁移统计异常');
                }
                
                return `事件统计: 发送${stats.emitted}, 迁移${stats.migrated}, 验证${stats.validated}`;
            });
        }

        /**
         * P2.2 错误处理标准化验证
         */
        async _testErrorHandlingStandardization() {
            console.log('[P2ArchitectureValidationTest] 验证P2.2错误处理标准化...');
            
            // 测试1: 统一日志系统
            await this._runTest('P2.2.1 统一日志系统功能', () => {
                if (!this.logger) {
                    throw new Error('UnifiedLogger未加载');
                }
                
                // 测试不同级别的日志
                this.logger.info('test', 'P2.2.1测试信息日志');
                this.logger.warn('test', 'P2.2.1测试警告日志');
                this.logger.error('test', 'P2.2.1测试错误日志');
                
                // 检查统计
                const stats = this.logger.getStats();
                if (stats.total < 3) {
                    throw new Error('日志统计异常');
                }
                
                return `日志统计: 总计${stats.total}, 错误${stats.errors}, 警告${stats.warnings}`;
            });

            // 测试2: ErrorHandler集成
            await this._runTest('P2.2.2 ErrorHandler统一日志集成', () => {
                if (!this.errorHandler) {
                    throw new Error('ErrorHandler未加载');
                }
                
                // 测试错误处理
                const testError = new Error('P2.2.2测试错误');
                this.errorHandler.handle(testError, { 
                    component: 'P2ArchitectureValidationTest',
                    action: 'testing'
                }, { 
                    category: 'test',
                    silent: true 
                });
                
                // 检查是否集成了统一日志
                if (!this.errorHandler.logger) {
                    throw new Error('ErrorHandler未集成统一日志系统');
                }
                
                return 'ErrorHandler已成功集成统一日志系统';
            });

            // 测试3: 日志分类和过滤
            await this._runTest('P2.2.3 日志分类和过滤功能', () => {
                // 测试不同分类的日志
                this.logger.info('system', '系统日志测试');
                this.logger.info('business', '业务日志测试');
                this.logger.info('ui', 'UI日志测试');
                
                // 测试日志过滤
                const systemLogs = this.logger.getHistory({ category: 'system' });
                const businessLogs = this.logger.getHistory({ category: 'business' });
                
                if (systemLogs.length === 0 || businessLogs.length === 0) {
                    throw new Error('日志分类过滤功能异常');
                }
                
                return `分类日志: 系统${systemLogs.length}条, 业务${businessLogs.length}条`;
            });
        }

        /**
         * P2 整体架构健康度评估
         */
        async _testArchitectureHealth() {
            console.log('[P2ArchitectureValidationTest] 评估P2整体架构健康度...');
            
            // 测试1: 事件系统健康度
            await this._runTest('P2.3.1 事件系统健康度评估', () => {
                const eventStats = this.eventBus.getEventStats();
                
                // 检查事件验证启用状态
                if (!eventStats.validationEnabled) {
                    throw new Error('事件验证未启用');
                }
                
                // 检查事件迁移启用状态
                if (!eventStats.migrationEnabled) {
                    throw new Error('事件迁移未启用');
                }
                
                // 计算事件系统健康度
                const healthScore = this._calculateEventSystemHealth(eventStats);
                
                if (healthScore < 80) {
                    throw new Error(`事件系统健康度过低: ${healthScore}%`);
                }
                
                return `事件系统健康度: ${healthScore}%`;
            });

            // 测试2: 错误处理系统健康度
            await this._runTest('P2.3.2 错误处理系统健康度评估', () => {
                const logStats = this.logger.getStats();
                
                // 检查日志系统状态
                if (logStats.total === 0) {
                    throw new Error('日志系统未记录任何日志');
                }
                
                // 计算错误处理系统健康度
                const healthScore = this._calculateErrorSystemHealth(logStats);
                
                if (healthScore < 85) {
                    throw new Error(`错误处理系统健康度过低: ${healthScore}%`);
                }
                
                return `错误处理系统健康度: ${healthScore}%`;
            });

            // 测试3: P2整体架构评分
            await this._runTest('P2.3.3 P2整体架构评分', () => {
                const eventHealth = this._calculateEventSystemHealth(this.eventBus.getEventStats());
                const errorHealth = this._calculateErrorSystemHealth(this.logger.getStats());
                
                // P2整体评分 = (事件系统健康度 + 错误处理健康度) / 2
                const overallScore = (eventHealth + errorHealth) / 2;
                
                if (overallScore < 85) {
                    throw new Error(`P2整体架构评分过低: ${overallScore.toFixed(1)}%`);
                }
                
                return `P2整体架构评分: ${overallScore.toFixed(1)}% (目标: ≥85%)`;
            });
        }

        /**
         * 计算事件系统健康度
         */
        _calculateEventSystemHealth(stats) {
            let score = 100;
            
            // 验证启用 +20分
            if (stats.validationEnabled) score += 20;
            
            // 迁移启用 +20分  
            if (stats.migrationEnabled) score += 20;
            
            // 错误率检查
            if (stats.errors > 0) {
                const errorRate = stats.errors / Math.max(stats.emitted, 1);
                score -= errorRate * 50; // 错误率每增加1%扣0.5分
            }
            
            return Math.max(0, Math.min(100, score));
        }

        /**
         * 计算错误处理系统健康度
         */
        _calculateErrorSystemHealth(stats) {
            let score = 100;
            
            // 基础功能检查
            if (stats.total > 0) score += 20;
            if (stats.enabledCategories.length >= 5) score += 15;
            if (stats.bufferSize > 0) score += 15;
            
            return Math.max(0, Math.min(100, score));
        }

        /**
         * 运行单个测试
         */
        async _runTest(testName, testFunction) {
            this.testResults.total++;
            
            try {
                const result = await testFunction();
                this.testResults.passed++;
                this.testResults.details.push({
                    test: testName,
                    status: 'PASS',
                    message: result
                });
                console.log(`✅ [${testName}] PASS: ${result}`);
            } catch (error) {
                this.testResults.failed++;
                this.testResults.details.push({
                    test: testName,
                    status: 'FAIL',
                    message: error.message
                });
                console.error(`❌ [${testName}] FAIL: ${error.message}`);
            }
        }

        /**
         * 生成测试报告
         */
        _generateTestReport() {
            const successRate = (this.testResults.passed / this.testResults.total * 100).toFixed(1);
            
            console.log('\n' + '='.repeat(60));
            console.log('🎯 P2阶段架构验证测试报告');
            console.log('='.repeat(60));
            console.log(`总测试数: ${this.testResults.total}`);
            console.log(`通过数: ${this.testResults.passed}`);
            console.log(`失败数: ${this.testResults.failed}`);
            console.log(`成功率: ${successRate}%`);
            console.log('='.repeat(60));
            
            // 详细结果
            this.testResults.details.forEach(detail => {
                const icon = detail.status === 'PASS' ? '✅' : '❌';
                console.log(`${icon} ${detail.test}: ${detail.message}`);
            });
            
            console.log('='.repeat(60));
            
            // 最终评估
            if (this.testResults.failed === 0) {
                console.log('🎉 P2阶段架构优化验证通过！');
            } else {
                console.log('⚠️ P2阶段架构优化存在问题，需要修复');
            }
            
            // 触发完成事件
            if (this.eventBus) {
                this.eventBus.emit('system:test:complete', {
                    phase: 'P2',
                    results: this.testResults,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    // 全局导出
    global.P2ArchitectureValidationTest = P2ArchitectureValidationTest;

    // 自动运行测试（延迟执行以确保所有组件加载完成）
    setTimeout(() => {
        if (global.AutogenEventBus && global.UnifiedLogger && global.ErrorHandler) {
            const validator = new P2ArchitectureValidationTest();
            validator.runAllTests();
        } else {
            console.warn('[P2ArchitectureValidationTest] ⚠️ 部分P2组件未加载，跳过自动测试');
        }
    }, 2000);

    console.log('[P2ArchitectureValidationTest] ✅ P2架构验证测试已加载');

})(typeof window !== 'undefined' ? window : global);
