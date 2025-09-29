// 子节点加载功能验证脚本
// 用于诊断点击项目列表项时子节点加载功能的问题

(function(){
    console.log('🔍 开始子节点加载功能验证...');

    // 验证结果收集
    const results = {
        timestamp: new Date().toISOString(),
        checks: [],
        errors: [],
        warnings: []
    };

    // 辅助函数
    const log = (type, message, details) => {
        const entry = { type, message, details, timestamp: Date.now() };
        results[type === 'error' ? 'errors' : type === 'warning' ? 'warnings' : 'checks'].push(entry);
        console.log(`[${type.toUpperCase()}] ${message}`, details || '');
    };

    // 1. 检查基本环境
    const checkEnvironment = () => {
        log('info', '检查运行环境');

        // 检查jsMind
        if (typeof window.jsMind === 'undefined') {
            log('error', 'jsMind库未加载');
        } else {
            log('info', 'jsMind库已加载', { version: window.jsMind.version || 'unknown' });
        }

        // 检查MindmapController
        if (typeof window.mindmapController === 'undefined') {
            log('error', 'MindmapController未初始化');
        } else {
            log('info', 'MindmapController已初始化', {
                hasMind: !!window.mindmapController.mind,
                mindType: typeof window.mindmapController.mind
            });
        }

        // 检查项目列表
        const catalog = document.getElementById('project-catalog');
        if (!catalog) {
            log('error', '项目列表DOM元素不存在', { elementId: 'project-catalog' });
        } else {
            const items = catalog.querySelectorAll('.proj-card');
            log('info', '项目列表已找到', { itemCount: items.length });
        }
    };

    // 2. 检查事件绑定
    const checkEventBindings = () => {
        log('info', '检查事件绑定状态');

        const catalog = document.getElementById('project-catalog');
        if (!catalog) {
            log('error', '无法检查事件绑定：项目列表不存在');
            return;
        }

        // 检查是否绑定了点击事件
        const hasClickListener = catalog._eventBound || catalog.onclick || catalog.hasAttribute('data-events-bound');
        log('info', '项目列表事件绑定状态', { hasClickListener: !!hasClickListener });

        // 检查列表项数量
        const items = catalog.querySelectorAll('.proj-card');
        if (items.length === 0) {
            log('warning', '项目列表为空，无项目可测试');
        } else {
            log('info', `发现${items.length}个项目项`);
        }
    };

    // 3. 模拟点击测试
    const simulateClickTest = async () => {
        log('info', '执行模拟点击测试');

        const catalog = document.getElementById('project-catalog');
        if (!catalog) {
            log('error', '无法执行点击测试：项目列表不存在');
            return;
        }

        const items = catalog.querySelectorAll('.proj-card');
        if (items.length === 0) {
            log('warning', '无项目项可测试');
            return;
        }

        const firstItem = items[0];
        log('info', '选择第一个项目进行测试', {
            itemText: firstItem.textContent.trim().substring(0, 50) + '...',
            itemClass: firstItem.className
        });

        // 记录点击前的状态
        const beforeNodeCount = document.querySelectorAll('.jmnode').length;
        const beforeTime = Date.now();

        try {
            // 模拟点击
            firstItem.click();
            log('info', '已模拟点击项目项');

            // 等待一段时间让子节点加载
            await new Promise(resolve => setTimeout(resolve, 500));

            // 检查点击后的状态
            const afterNodeCount = document.querySelectorAll('.jmnode').length;
            const afterTime = Date.now();
            const duration = afterTime - beforeTime;

            log('info', '点击后状态检查', {
                beforeNodeCount,
                afterNodeCount,
                nodeIncrease: afterNodeCount - beforeNodeCount,
                duration: `${duration}ms`
            });

            if (afterNodeCount > beforeNodeCount) {
                log('info', '✅ 检测到节点数量增加，可能子节点加载成功');
            } else {
                log('warning', '⚠️ 节点数量未增加，子节点加载可能失败');
            }

        } catch (error) {
            log('error', '模拟点击测试失败', { error: error.message });
        }
    };

    // 4. 检查子节点加载函数
    const checkChildLoadingFunction = () => {
        log('info', '检查子节点加载函数定义');

        // 检查loadChildNodes函数是否存在（如果有的话）
        if (typeof window.loadChildNodes === 'function') {
            log('info', 'loadChildNodes函数已定义');
        } else {
            log('warning', 'loadChildNodes函数未定义（可能内联实现）');
        }

        // 检查相关的辅助函数
        const helperFunctions = ['loadCatalog', 'findIndexForCard', 'domIndex'];
        helperFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                log('info', `${funcName}函数已定义`);
            } else {
                log('warning', `${funcName}函数未定义`);
            }
        });
    };

    // 5. 检查数据准备
    const checkDataPreparation = async () => {
        log('info', '检查数据准备状态');

        try {
            // 检查是否有项目数据
            if (typeof window.loadCatalog === 'function') {
                const catalogData = await window.loadCatalog();
                log('info', '项目目录数据加载成功', {
                    itemCount: Array.isArray(catalogData) ? catalogData.length : '非数组',
                    firstItem: Array.isArray(catalogData) && catalogData[0] ? {
                        name: catalogData[0].name,
                        hasPayload: !!catalogData[0].payload,
                        hasChildren: !!(catalogData[0].payload && catalogData[0].payload.data && catalogData[0].payload.data.children)
                    } : null
                });

                // 检查第一个项目是否有子节点数据
                if (Array.isArray(catalogData) && catalogData[0] && catalogData[0].payload && catalogData[0].payload.data) {
                    const children = catalogData[0].payload.data.children;
                    if (Array.isArray(children) && children.length > 0) {
                        log('info', `第一个项目有${children.length}个子节点数据可供加载`);
                    } else {
                        log('warning', '第一个项目无子节点数据');
                    }
                }
            } else {
                log('error', 'loadCatalog函数不存在，无法检查数据');
            }
        } catch (error) {
            log('error', '数据准备检查失败', { error: error.message });
        }
    };

    // 6. 生成验证报告
    const generateReport = () => {
        console.log('\n' + '='.repeat(60));
        console.log('📊 子节点加载功能验证报告');
        console.log('='.repeat(60));

        console.log(`⏰ 验证时间: ${results.timestamp}`);
        console.log(`✅ 检查项: ${results.checks.length}`);
        console.log(`⚠️ 警告: ${results.warnings.length}`);
        console.log(`❌ 错误: ${results.errors.length}`);

        if (results.errors.length > 0) {
            console.log('\n🔴 错误详情:');
            results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error.message}`);
                if (error.details) console.log(`     详情:`, error.details);
            });
        }

        if (results.warnings.length > 0) {
            console.log('\n🟡 警告详情:');
            results.warnings.forEach((warning, index) => {
                console.log(`  ${index + 1}. ${warning.message}`);
                if (warning.details) console.log(`     详情:`, warning.details);
            });
        }

        console.log('\n🔍 诊断建议:');
        if (results.errors.some(e => e.message.includes('未加载'))) {
            console.log('  • 检查jsMind库是否正确加载');
            console.log('  • 验证项目列表DOM结构是否正确');
            console.log('  • 检查事件绑定是否生效');
        }

        if (results.warnings.some(w => w.message.includes('节点数量未增加'))) {
            console.log('  • 检查项目数据是否有子节点');
            console.log('  • 验证add_node API调用是否正确');
            console.log('  • 检查脑图渲染时机是否合适');
        }

        console.log('='.repeat(60));

        // 保存结果到全局变量供进一步分析
        window.childNodeLoadingTestResults = results;

        return results;
    };

    // 执行所有检查
    const runAllTests = async () => {
        try {
            checkEnvironment();
            await new Promise(resolve => setTimeout(resolve, 100)); // 等待环境稳定

            checkEventBindings();
            await new Promise(resolve => setTimeout(resolve, 100));

            await checkDataPreparation();
            await new Promise(resolve => setTimeout(resolve, 100));

            checkChildLoadingFunction();
            await new Promise(resolve => setTimeout(resolve, 100));

            await simulateClickTest();

            return generateReport();
        } catch (error) {
            log('error', '验证脚本执行失败', { error: error.message });
            return generateReport();
        }
    };

    // 启动验证
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAllTests);
    } else {
        setTimeout(runAllTests, 500);
    }

    // 暴露到全局供手动调用
    window.runChildNodeLoadingTest = runAllTests;
    console.log('✅ 子节点加载验证脚本已加载，可调用 window.runChildNodeLoadingTest() 手动执行');

})();
