/**
 * 标签系统综合测试
 */

function testTagSystem() {
    console.log('🧪 开始测试标签系统...');
    
    const tests = [];
    
    // 测试1: 系统标签数据
    tests.push({
        name: '系统标签数据',
        test: () => {
            const data = localStorage.getItem('mm:proj:SYS_TAGS:data');
            if (!data) return { success: false, message: '系统标签数据不存在' };
            
            try {
                const parsed = JSON.parse(data);
                const hasTagRoot = parsed.data && parsed.data.topic === '标签管理';
                const hasGroups = parsed.data && parsed.data.children && parsed.data.children.length > 0;
                
                if (!hasTagRoot) return { success: false, message: '缺少标签管理根节点' };
                if (!hasGroups) return { success: false, message: '缺少标签分组' };
                
                return { success: true, message: `找到${parsed.data.children.length}个标签分组` };
            } catch (e) {
                return { success: false, message: '数据格式错误: ' + e.message };
            }
        }
    });
    
    // 测试2: 标签面板DOM
    tests.push({
        name: '标签面板DOM',
        test: () => {
            const tagGroups = document.getElementById('tag-groups');
            const tagList = document.getElementById('tag-list');
            const tagEmpty = document.getElementById('tag-panel-empty');
            
            if (!tagGroups) return { success: false, message: 'tag-groups元素不存在' };
            if (!tagList) return { success: false, message: 'tag-list元素不存在' };
            if (!tagEmpty) return { success: false, message: 'tag-panel-empty元素不存在' };
            
            return { success: true, message: '标签面板DOM结构完整' };
        }
    });
    
    // 测试3: 标签过滤器UI
    tests.push({
        name: '标签过滤器UI',
        test: () => {
            const filterContainer = document.getElementById('tag-filter-container');
            const filterChips = document.getElementById('tag-filter-chips');
            const filterStatus = document.getElementById('filter-status');
            
            if (!filterContainer) return { success: false, message: '标签过滤器容器不存在' };
            if (!filterChips) return { success: false, message: '标签过滤chips容器不存在' };
            if (!filterStatus) return { success: false, message: '过滤状态显示不存在' };
            
            return { success: true, message: '标签过滤器UI完整' };
        }
    });
    
    // 测试4: 核心对象
    tests.push({
        name: '核心对象',
        test: () => {
            const mc = window.mindmapController;
            const tagFilter = window.listTagFilter;
            const tagInteraction = window.tagInteraction;
            const refreshFn = window.refreshProjectList;
            
            const missing = [];
            if (!mc) missing.push('mindmapController');
            if (!tagFilter) missing.push('listTagFilter');
            if (!tagInteraction) missing.push('tagInteraction');
            if (!refreshFn) missing.push('refreshProjectList');
            
            if (missing.length > 0) {
                return { success: false, message: '缺少对象: ' + missing.join(', ') };
            }
            
            return { success: true, message: '所有核心对象已加载' };
        }
    });
    
    // 测试5: 标签面板渲染
    tests.push({
        name: '标签面板渲染',
        test: () => {
            const tagGroups = document.getElementById('tag-groups');
            const tagList = document.getElementById('tag-list');
            
            const hasGroupsContent = tagGroups && tagGroups.innerHTML.trim().length > 0;
            const hasListContent = tagList && tagList.innerHTML.trim().length > 0;
            
            if (!hasGroupsContent && !hasListContent) {
                return { success: false, message: '标签面板未渲染内容' };
            }
            
            const tagChips = document.querySelectorAll('.tag-chip');
            return { 
                success: true, 
                message: `标签面板已渲染，找到${tagChips.length}个标签` 
            };
        }
    });
    
    // 执行测试
    console.log('📋 执行测试...');
    const results = tests.map(test => {
        try {
            const result = test.test();
            console.log(`${result.success ? '✅' : '❌'} ${test.name}: ${result.message}`);
            return { ...test, ...result };
        } catch (error) {
            console.log(`❌ ${test.name}: 测试异常 - ${error.message}`);
            return { ...test, success: false, message: '测试异常: ' + error.message };
        }
    });
    
    // 统计结果
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`\n📊 测试结果: ${passed}/${total} 通过`);
    
    if (passed === total) {
        console.log('🎉 所有测试通过！标签系统已就绪');
        showTestNotification('标签系统测试全部通过！', 'success');
    } else {
        console.log('⚠️ 部分测试失败，请检查上述错误');
        showTestNotification(`标签系统测试: ${passed}/${total} 通过`, 'warning');
    }
    
    return results;
}

function showTestNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px;
    `;
    
    const colors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// 延迟执行测试，确保所有组件都已加载
setTimeout(() => {
    testTagSystem();
}, 5000);

// 导出测试函数
window.testTagSystem = testTagSystem;
