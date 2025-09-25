/**
 * 标签过滤功能演示
 */

function demoTagFilter() {
    console.log('🎯 开始演示标签过滤功能...');
    
    // 等待组件加载
    setTimeout(() => {
        const tagFilter = window.listTagFilter;
        if (!tagFilter) {
            console.error('❌ 标签过滤器未加载');
            return;
        }
        
        console.log('✅ 标签过滤器已加载');
        
        // 演示"议题"标签过滤
        console.log('🏷️ 演示"议题"标签过滤...');
        tagFilter.toggleTagFilter('议题');
        
        // 检查过滤状态
        setTimeout(() => {
            const selectedTags = tagFilter.getSelectedTags();
            console.log('📋 当前选中标签:', selectedTags);
            
            if (selectedTags.includes('议题')) {
                console.log('✅ "议题"标签过滤已激活');
                
                // 检查UI更新
                const filterStatus = document.getElementById('filter-status');
                if (filterStatus) {
                    console.log('📊 过滤状态显示:', filterStatus.textContent);
                }
                
                // 检查查询结果列表
                const queryList = document.getElementById('query-results-list');
                const projectList = document.getElementById('project-list');
                
                if (queryList && projectList) {
                    const queryVisible = queryList.style.display !== 'none';
                    const projectVisible = projectList.style.display !== 'none';
                    
                    console.log('👁️ 列表显示状态:');
                    console.log('  - 查询结果列表:', queryVisible ? '显示' : '隐藏');
                    console.log('  - 项目列表:', projectVisible ? '显示' : '隐藏');
                    
                    if (queryVisible && !projectVisible) {
                        console.log('✅ 过滤UI状态正确');
                    } else {
                        console.log('⚠️ 过滤UI状态可能不正确');
                    }
                }
                
            } else {
                console.log('❌ "议题"标签过滤未激活');
            }
        }, 500);
        
    }, 3000);
}

// 创建手动测试按钮
function createTestButton() {
    const button = document.createElement('button');
    button.textContent = '🧪 测试议题标签过滤';
    button.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 8px 12px;
        background: #3b82f6;
        color: white;
        border: 0;
        border-radius: 6px;
        cursor: pointer;
        z-index: 10000;
        font-size: 12px;
    `;
    
    button.addEventListener('click', () => {
        demoTagFilter();
        button.textContent = '✅ 测试已执行';
        setTimeout(() => {
            button.textContent = '🧪 测试议题标签过滤';
        }, 2000);
    });
    
    document.body.appendChild(button);
    console.log('🔘 测试按钮已创建');
}

// 自动演示
setTimeout(() => {
    createTestButton();
    console.log('💡 点击右上角的测试按钮来演示"议题"标签过滤功能');
}, 4000);

// 导出函数
window.demoTagFilter = demoTagFilter;
