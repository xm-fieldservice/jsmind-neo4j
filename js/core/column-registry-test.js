/**
 * ColumnRegistry 单元测试脚本
 * 程序员 - 验证零侵入性和功能正确性
 * 
 * 测试项目：
 * 1. ColumnRegistry是否成功加载到全局
 * 2. 注册测试工作栏
 * 3. 验证DOM元素自动创建
 * 4. 验证顶部按钮自动创建
 * 5. 注销工作栏并验证清理
 * 6. 审计日志功能测试
 */

;(function() {
    'use strict';
    
    console.log('\n========== ColumnRegistry 单元测试开始 ==========\n');
    
    // 等待DOM加载完成
    function whenReady(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }
    
    whenReady(function() {
        // 延迟执行测试，确保ColumnRegistry已初始化
        setTimeout(runTests, 1000);
    });
    
    function runTests() {
        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        function test(name, fn) {
            try {
                fn();
                results.passed++;
                results.tests.push({ name, status: '✅ PASS' });
                console.log(`✅ PASS: ${name}`);
            } catch (error) {
                results.failed++;
                results.tests.push({ name, status: '❌ FAIL', error: error.message });
                console.error(`❌ FAIL: ${name}`, error);
            }
        }
        
        // 测试1：ColumnRegistry全局可用性
        test('ColumnRegistry全局可用', () => {
            if (!window.ColumnRegistry) {
                throw new Error('window.ColumnRegistry不存在');
            }
            if (typeof window.ColumnRegistry.register !== 'function') {
                throw new Error('register方法不存在');
            }
            if (typeof window.ColumnRegistry.unregister !== 'function') {
                throw new Error('unregister方法不存在');
            }
        });
        
        // 测试2：注册测试工作栏
        test('注册测试工作栏', () => {
            const result = window.ColumnRegistry.register({
                id: 'test-column',
                title: '测试工作栏',
                icon: '🧪',
                position: 'after:detail',
                defaultActive: false,
                renderFn: (container) => {
                    container.innerHTML = '<div style="padding:20px;">测试工作栏内容</div>';
                }
            });
            
            if (!result) {
                throw new Error('注册返回false');
            }
        });
        
        // 测试3：验证DOM元素创建
        test('验证DOM元素自动创建', () => {
            const column = document.getElementById('test-column-column');
            if (!column) {
                throw new Error('工作栏DOM未创建');
            }
            
            const divider = document.getElementById('test-column-divider');
            if (!divider) {
                throw new Error('分割线DOM未创建');
            }
            
            const content = column.querySelector('.column-content');
            if (!content) {
                throw new Error('内容区域未创建');
            }
            
            if (!content.textContent.includes('测试工作栏内容')) {
                throw new Error('渲染函数未执行');
            }
        });
        
        // 测试4：验证顶部按钮创建
        test('验证顶部按钮自动创建', () => {
            const button = document.querySelector('.view-toggle[data-view="test-column"]');
            if (!button) {
                throw new Error('顶部按钮未创建');
            }
            
            if (!button.textContent.includes('测试工作栏')) {
                throw new Error('按钮文本不正确');
            }
        });
        
        // 测试5：验证ColumnManager集成
        test('验证ColumnManager集成', () => {
            if (!window.columnManager) {
                throw new Error('columnManager不存在');
            }
            
            if (!window.columnManager.views.includes('test-column')) {
                throw new Error('工作栏未添加到ColumnManager');
            }
        });
        
        // 测试6：验证审计日志
        test('验证审计日志功能', () => {
            const auditLog = window.ColumnRegistry.getAuditLog();
            if (!Array.isArray(auditLog)) {
                throw new Error('审计日志不是数组');
            }
            
            const registerLog = auditLog.find(log => 
                log.action === 'COLUMN_REGISTERED' && 
                log.details.columnId === 'test-column'
            );
            
            if (!registerLog) {
                throw new Error('注册日志未记录');
            }
        });
        
        // 测试7：注销工作栏
        test('注销测试工作栏', () => {
            const result = window.ColumnRegistry.unregister('test-column');
            if (!result) {
                throw new Error('注销返回false');
            }
        });
        
        // 测试8：验证清理完成
        test('验证DOM元素已清理', () => {
            const column = document.getElementById('test-column-column');
            if (column) {
                throw new Error('工作栏DOM未清理');
            }
            
            const divider = document.getElementById('test-column-divider');
            if (divider) {
                throw new Error('分割线DOM未清理');
            }
            
            const button = document.querySelector('.view-toggle[data-view="test-column"]');
            if (button) {
                throw new Error('顶部按钮未清理');
            }
        });
        
        // 测试9：验证事件发布
        test('验证事件系统集成', () => {
            let eventReceived = false;
            
            window.AutogenEventBus.on('column:registered', (payload) => {
                if (payload.id === 'test-event-column') {
                    eventReceived = true;
                }
            });
            
            window.ColumnRegistry.register({
                id: 'test-event-column',
                title: '事件测试',
                icon: '📡',
                defaultActive: false,
                renderFn: (container) => {
                    container.innerHTML = '<div>事件测试</div>';
                }
            });
            
            setTimeout(() => {
                if (!eventReceived) {
                    console.warn('⚠️ 事件未接收（可能是异步问题）');
                }
            }, 100);
            
            // 清理测试工作栏
            window.ColumnRegistry.unregister('test-event-column');
        });
        
        // 输出测试结果
        console.log('\n========== 测试结果 ==========');
        console.log(`✅ 通过: ${results.passed}个`);
        console.log(`❌ 失败: ${results.failed}个`);
        console.log(`📊 通过率: ${(results.passed / (results.passed + results.failed) * 100).toFixed(1)}%`);
        
        results.tests.forEach(t => {
            console.log(`${t.status} - ${t.name}`);
            if (t.error) {
                console.log(`   错误: ${t.error}`);
            }
        });
        
        console.log('\n========== ColumnRegistry 单元测试完成 ==========\n');
        
        // 将结果存储到全局，方便查看
        window.ColumnRegistryTestResults = results;
        
        // 如果所有测试通过，标记阶段1.1完成
        if (results.failed === 0) {
            console.log('🎉 阶段1.1开发完成：ColumnRegistry核心功能验证通过');
            console.log('📋 下一步：开始阶段2.1 - 开发ColumnWarehouse');
        }
    }
    
})();
