// 节点操作统一化测试脚本
// 用于验证快捷键和按钮操作的统一性

class MindmapOperationsTest {
    constructor(mindmapColumn) {
        this.mindmapColumn = mindmapColumn;
        this.ops = mindmapColumn.ops;
        this.jm = mindmapColumn.jm;
        this.testResults = [];
    }

    // 运行所有测试
    async runAllTests() {
        console.log('========================================');
        console.log('🧪 节点操作统一化测试开始');
        console.log('========================================\n');

        this.testResults = [];

        // 1. API完整性测试
        await this.testAPICompleteness();

        // 2. 方向一致性测试
        await this.testDirectionConsistency();

        // 3. 快捷键操作测试
        await this.testShortcutOperations();

        // 4. 按钮操作测试
        await this.testButtonOperations();

        // 5. 自动保存测试
        await this.testAutoSave();

        // 6. 持久化测试
        await this.testPersistence();

        // 生成测试报告
        this.generateReport();

        console.log('\n========================================');
        console.log('🎉 节点操作统一化测试完成');
        console.log('========================================');

        return this.testResults;
    }

    // 测试API完整性
    async testAPICompleteness() {
        console.log('📋 测试1: API完整性检查');
        console.log('-----------------------------------');

        const requiredMethods = [
            'addChild',
            'addBrother',
            'addCustomNode',
            'removeNode',
            'updateNode',
            'getSelectedNode',
            'selectNode'
        ];

        let passed = 0;
        let failed = 0;

        requiredMethods.forEach(method => {
            if (typeof this.ops[method] === 'function') {
                console.log(`✅ ${method}() - 存在`);
                passed++;
            } else {
                console.log(`❌ ${method}() - 缺失`);
                failed++;
            }
        });

        this.testResults.push({
            name: 'API完整性',
            passed,
            failed,
            total: requiredMethods.length,
            status: failed === 0 ? 'PASS' : 'FAIL'
        });

        console.log(`\n结果: ${passed}/${requiredMethods.length} 通过\n`);
    }

    // 测试方向一致性
    async testDirectionConsistency() {
        console.log('📋 测试2: 方向一致性检查');
        console.log('-----------------------------------');

        let passed = 0;
        let failed = 0;
        const tests = [];

        // 测试addChild方向
        try {
            const rootNode = this.jm.get_node('root');
            this.jm.select_node('root');
            
            const childNode = this.ops.addChild();
            await this.delay(200);

            if (childNode && childNode.direction === 'right') {
                console.log('✅ addChild() - 方向正确 (right)');
                passed++;
            } else {
                console.log(`❌ addChild() - 方向错误 (${childNode?.direction || 'undefined'})`);
                failed++;
            }

            // 清理测试节点
            if (childNode) this.jm.remove_node(childNode.id);
        } catch (err) {
            console.log(`❌ addChild() - 测试失败: ${err.message}`);
            failed++;
        }

        // 测试addBrother方向
        try {
            // 先创建一个子节点用于测试兄弟节点
            const rootNode = this.jm.get_node('root');
            const testNode = this.jm.add_node(rootNode, 'test_node', '测试节点', { direction: 'right' });
            this.jm.select_node('test_node');
            await this.delay(100);

            const brotherNode = this.ops.addBrother();
            await this.delay(200);

            if (brotherNode && brotherNode.direction === 'right') {
                console.log('✅ addBrother() - 方向正确 (right)');
                passed++;
            } else {
                console.log(`❌ addBrother() - 方向错误 (${brotherNode?.direction || 'undefined'})`);
                failed++;
            }

            // 清理测试节点
            if (brotherNode) this.jm.remove_node(brotherNode.id);
            if (testNode) this.jm.remove_node(testNode.id);
        } catch (err) {
            console.log(`❌ addBrother() - 测试失败: ${err.message}`);
            failed++;
        }

        // 测试addCustomNode方向
        try {
            const rootNode = this.jm.get_node('root');
            const customNode = this.ops.addCustomNode(rootNode, '自定义节点', { direction: 'right' });
            await this.delay(200);

            if (customNode && customNode.direction === 'right') {
                console.log('✅ addCustomNode() - 方向正确 (right)');
                passed++;
            } else {
                console.log(`❌ addCustomNode() - 方向错误 (${customNode?.direction || 'undefined'})`);
                failed++;
            }

            // 清理测试节点
            if (customNode) this.jm.remove_node(customNode.id);
        } catch (err) {
            console.log(`❌ addCustomNode() - 测试失败: ${err.message}`);
            failed++;
        }

        this.testResults.push({
            name: '方向一致性',
            passed,
            failed,
            total: 3,
            status: failed === 0 ? 'PASS' : 'FAIL'
        });

        console.log(`\n结果: ${passed}/3 通过\n`);
    }

    // 测试快捷键操作
    async testShortcutOperations() {
        console.log('📋 测试3: 快捷键操作');
        console.log('-----------------------------------');

        console.log('⚠️  快捷键操作需要手动测试');
        console.log('请按照以下步骤进行测试:');
        console.log('1. 选择根节点');
        console.log('2. 按Tab键添加子节点');
        console.log('3. 检查节点是否在右侧');
        console.log('4. 按Enter键添加兄弟节点');
        console.log('5. 检查节点是否在右侧');
        console.log('6. 按Delete键删除节点');
        console.log('7. 检查节点是否被删除\n');

        this.testResults.push({
            name: '快捷键操作',
            passed: 0,
            failed: 0,
            total: 3,
            status: 'MANUAL'
        });
    }

    // 测试按钮操作
    async testButtonOperations() {
        console.log('📋 测试4: 按钮操作');
        console.log('-----------------------------------');

        let passed = 0;
        let failed = 0;

        // 测试添加节点按钮
        try {
            const rootNode = this.jm.get_node('root');
            this.jm.select_node('root');
            
            // 模拟按钮操作（不使用prompt）
            const testNode = this.ops.addCustomNode(rootNode, '按钮测试节点', { direction: 'right' });
            await this.delay(200);

            if (testNode && testNode.direction === 'right') {
                console.log('✅ 添加节点按钮 - 功能正常，方向正确');
                passed++;
            } else {
                console.log('❌ 添加节点按钮 - 功能异常');
                failed++;
            }

            // 清理
            if (testNode) this.jm.remove_node(testNode.id);
        } catch (err) {
            console.log(`❌ 添加节点按钮 - 测试失败: ${err.message}`);
            failed++;
        }

        // 测试删除节点按钮
        try {
            const rootNode = this.jm.get_node('root');
            const testNode = this.jm.add_node(rootNode, 'delete_test', '删除测试', { direction: 'right' });
            this.jm.select_node('delete_test');
            await this.delay(100);

            const result = this.ops.removeNode(testNode);

            if (result && !this.jm.get_node('delete_test')) {
                console.log('✅ 删除节点按钮 - 功能正常');
                passed++;
            } else {
                console.log('❌ 删除节点按钮 - 功能异常');
                failed++;
            }
        } catch (err) {
            console.log(`❌ 删除节点按钮 - 测试失败: ${err.message}`);
            failed++;
        }

        this.testResults.push({
            name: '按钮操作',
            passed,
            failed,
            total: 2,
            status: failed === 0 ? 'PASS' : 'FAIL'
        });

        console.log(`\n结果: ${passed}/2 通过\n`);
    }

    // 测试自动保存
    async testAutoSave() {
        console.log('📋 测试5: 自动保存机制');
        console.log('-----------------------------------');

        let passed = 0;
        let failed = 0;

        // 检查autoSave方法存在
        if (typeof this.mindmapColumn.autoSave === 'function') {
            console.log('✅ autoSave() 方法存在');
            passed++;
        } else {
            console.log('❌ autoSave() 方法不存在');
            failed++;
        }

        // 检查事件监听器
        if (this.jm._event_handles && this.jm._event_handles.length > 0) {
            console.log('✅ jsMind事件监听器已注册');
            passed++;
        } else {
            console.log('❌ jsMind事件监听器未注册');
            failed++;
        }

        this.testResults.push({
            name: '自动保存机制',
            passed,
            failed,
            total: 2,
            status: failed === 0 ? 'PASS' : 'FAIL'
        });

        console.log(`\n结果: ${passed}/2 通过\n`);
    }

    // 测试持久化
    async testPersistence() {
        console.log('📋 测试6: 数据持久化');
        console.log('-----------------------------------');

        let passed = 0;
        let failed = 0;

        // 检查存储方法
        if (typeof this.mindmapColumn.saveToUnifiedStorage === 'function') {
            console.log('✅ saveToUnifiedStorage() 方法存在');
            passed++;
        } else {
            console.log('❌ saveToUnifiedStorage() 方法不存在');
            failed++;
        }

        // 检查AutogenUnifiedStorage
        if (typeof AutogenUnifiedStorage !== 'undefined') {
            console.log('✅ AutogenUnifiedStorage 已加载');
            passed++;
        } else {
            console.log('❌ AutogenUnifiedStorage 未加载');
            failed++;
        }

        this.testResults.push({
            name: '数据持久化',
            passed,
            failed,
            total: 2,
            status: failed === 0 ? 'PASS' : 'FAIL'
        });

        console.log(`\n结果: ${passed}/2 通过\n`);
    }

    // 生成测试报告
    generateReport() {
        console.log('\n========================================');
        console.log('📊 测试报告汇总');
        console.log('========================================\n');

        let totalPassed = 0;
        let totalFailed = 0;
        let totalTests = 0;

        this.testResults.forEach(result => {
            const status = result.status === 'PASS' ? '✅' : 
                          result.status === 'FAIL' ? '❌' : '⚠️';
            console.log(`${status} ${result.name}: ${result.passed}/${result.total} 通过`);
            
            if (result.status !== 'MANUAL') {
                totalPassed += result.passed;
                totalFailed += result.failed;
                totalTests += result.total;
            }
        });

        console.log('\n-----------------------------------');
        console.log(`总计: ${totalPassed}/${totalTests} 通过`);
        console.log(`通过率: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
        
        const overallStatus = totalFailed === 0 ? '✅ PASS' : '❌ FAIL';
        console.log(`总体状态: ${overallStatus}`);
        console.log('-----------------------------------\n');

        // 保存测试结果到全局
        window.testResults = this.testResults;
        console.log('💾 测试结果已保存到 window.testResults');
    }

    // 延迟工具方法
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 自动运行测试（如果mindmapColumn已存在）
if (typeof window.mindmapColumn !== 'undefined') {
    console.log('🚀 检测到mindmapColumn实例，准备运行测试...\n');
    
    setTimeout(async () => {
        const tester = new MindmapOperationsTest(window.mindmapColumn);
        await tester.runAllTests();
        
        // 暴露测试器到全局
        window.mindmapTester = tester;
        console.log('💡 提示: 可以使用 window.mindmapTester.runAllTests() 重新运行测试');
    }, 1000);
} else {
    console.log('⚠️  mindmapColumn实例未找到，请先加载脑图页面');
    console.log('💡 加载后使用: new MindmapOperationsTest(window.mindmapColumn).runAllTests()');
}

// 导出测试类
window.MindmapOperationsTest = MindmapOperationsTest;
