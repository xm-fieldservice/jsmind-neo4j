/**
 * Phase 6.2 职责重构验证测试
 * 验证职责重叠问题的整改效果
 */
class Phase62RefactoringTest {
    constructor() {
        this.testResults = [];
        this.passedTests = 0;
        this.totalTests = 0;
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🧪 [Phase62RefactoringTest] 开始职责重构验证测试');
        
        // 测试职责分离
        await this.testResponsibilitySeparation();
        
        // 测试框架工具统一
        await this.testFrameworkToolsUnification();
        
        // 测试向后兼容性
        await this.testBackwardCompatibility();
        
        // 测试功能完整性
        await this.testFunctionalIntegrity();
        
        this.generateReport();
        return this.getTestSummary();
    }

    /**
     * 测试职责分离
     */
    async testResponsibilitySeparation() {
        console.log('📋 测试职责分离...');
        
        // 测试1：MindmapDataManager不再直接处理存储
        this.test('MindmapDataManager职责分离', () => {
            if (typeof window.MindmapDataManager_Refactored !== 'undefined') {
                const manager = new window.MindmapDataManager_Refactored({});
                
                // 检查是否有prepareMindmapDataForStorage方法（委托模式）
                const hasPrepareMethod = typeof manager.prepareMindmapDataForStorage === 'function';
                
                // 检查是否没有直接的存储操作
                const hasDirectStorage = typeof manager.store === 'function' || 
                                       typeof manager.retrieve === 'function';
                
                return hasPrepareMethod && !hasDirectStorage;
            }
            return false;
        });

        // 测试2：数据验证和处理功能
        this.test('数据验证和处理功能', () => {
            if (typeof window.MindmapDataManager_Refactored !== 'undefined') {
                const manager = new window.MindmapDataManager_Refactored({});
                
                const testData = {
                    id: 'test-root',
                    label: '测试项目',
                    children: []
                };
                
                const processedData = manager.validateAndProcessData(testData);
                
                return processedData && 
                       processedData.format === 'node_tree' && 
                       processedData.data && 
                       processedData.meta;
            }
            return false;
        });
    }

    /**
     * 测试框架工具统一
     */
    async testFrameworkToolsUnification() {
        console.log('🔧 测试框架工具统一...');
        
        // 测试3：DataUtils工具可用性
        this.test('DataUtils工具可用性', () => {
            return typeof window.DataUtils !== 'undefined' && 
                   typeof window.DataUtils.calculateDataHash === 'function';
        });

        // 测试4：哈希计算一致性
        this.test('哈希计算一致性', () => {
            if (typeof window.DataUtils !== 'undefined') {
                const testData = { id: 'test', label: '测试' };
                
                const hash1 = window.DataUtils.calculateDataHash(testData);
                const hash2 = window.DataUtils.calculateDataHash(testData);
                
                return hash1 === hash2 && hash1.length > 0;
            }
            return false;
        });

        // 测试5：数据比较功能
        this.test('数据比较功能', () => {
            if (typeof window.DataUtils !== 'undefined') {
                const data1 = { id: 'test', label: '测试' };
                const data2 = { id: 'test', label: '测试' };
                const data3 = { id: 'test', label: '不同' };
                
                return window.DataUtils.isDataEqual(data1, data2) && 
                       !window.DataUtils.isDataEqual(data1, data3);
            }
            return false;
        });
    }

    /**
     * 测试向后兼容性
     */
    async testBackwardCompatibility() {
        console.log('🔄 测试向后兼容性...');
        
        // 测试6：原始MindmapDataManager仍然可用
        this.test('原始MindmapDataManager可用性', () => {
            return typeof window.MindmapDataManager !== 'undefined';
        });

        // 测试7：MindmapStorage功能完整
        this.test('MindmapStorage功能完整性', () => {
            return typeof window.MindmapStorage !== 'undefined' &&
                   window.MindmapStorage.prototype.saveMindmapData &&
                   window.MindmapStorage.prototype.loadMindmapData;
        });
    }

    /**
     * 测试功能完整性
     */
    async testFunctionalIntegrity() {
        console.log('✅ 测试功能完整性...');
        
        // 测试8：数据转换功能
        this.test('数据转换功能', () => {
            if (typeof window.MindmapDataManager_Refactored !== 'undefined') {
                const manager = new window.MindmapDataManager_Refactored({});
                
                const testData = {
                    id: 'root',
                    label: '根节点',
                    children: [{
                        id: 'child1',
                        label: '子节点1',
                        children: []
                    }]
                };
                
                const jmTree = manager.toJsMindTree(testData);
                const backToInternal = manager.fromJsMindTree(jmTree);
                
                return jmTree && jmTree.id === 'root' && 
                       backToInternal && backToInternal.id === 'root';
            }
            return false;
        });

        // 测试9：错误处理
        this.test('错误处理机制', () => {
            if (typeof window.MindmapDataManager_Refactored !== 'undefined') {
                const manager = new window.MindmapDataManager_Refactored({});
                
                // 测试无效数据处理
                const result1 = manager.validateAndProcessData(null);
                const result2 = manager.validateAndProcessData({});
                
                return result1 === null && result2 === null;
            }
            return false;
        });
    }

    /**
     * 执行单个测试
     */
    test(name, testFn) {
        this.totalTests++;
        try {
            const result = testFn();
            if (result) {
                this.passedTests++;
                this.testResults.push({ name, status: 'PASS', error: null });
                console.log(`✅ ${name}: PASS`);
            } else {
                this.testResults.push({ name, status: 'FAIL', error: 'Test returned false' });
                console.log(`❌ ${name}: FAIL`);
            }
        } catch (error) {
            this.testResults.push({ name, status: 'ERROR', error: error.message });
            console.log(`💥 ${name}: ERROR - ${error.message}`);
        }
    }

    /**
     * 生成测试报告
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.totalTests,
                passed: this.passedTests,
                failed: this.totalTests - this.passedTests,
                passRate: ((this.passedTests / this.totalTests) * 100).toFixed(1)
            },
            details: this.testResults
        };

        console.log('\n📊 Phase 6.2 职责重构验证报告:');
        console.log(`总测试数: ${report.summary.total}`);
        console.log(`通过: ${report.summary.passed}`);
        console.log(`失败: ${report.summary.failed}`);
        console.log(`通过率: ${report.summary.passRate}%`);

        if (report.summary.passRate >= 80) {
            console.log('🎉 整改验证通过！职责重构成功！');
        } else {
            console.log('⚠️ 整改验证未完全通过，需要进一步优化');
        }

        return report;
    }

    /**
     * 获取测试摘要
     */
    getTestSummary() {
        return {
            passed: this.passedTests,
            total: this.totalTests,
            passRate: ((this.passedTests / this.totalTests) * 100).toFixed(1),
            success: this.passedTests >= Math.ceil(this.totalTests * 0.8)
        };
    }
}

// 导出测试类
if (typeof window !== 'undefined') {
    window.Phase62RefactoringTest = Phase62RefactoringTest;
}

// 自动运行测试（如果在浏览器环境中）
if (typeof window !== 'undefined' && window.location) {
    // 延迟执行，确保所有模块都已加载
    setTimeout(async () => {
        const test = new Phase62RefactoringTest();
        const summary = await test.runAllTests();
        
        // 将结果存储到全局变量供检查
        window.Phase62RefactoringTestResult = summary;
    }, 1000);
}
