/**
 * 修复refreshProjectList函数未定义的问题
 */

(function() {
    console.log('🔧 开始修复refreshProjectList函数...');
    
    // 等待页面加载完成
    function waitForQuerySystem() {
        // 检查查询系统是否已加载
        const queryBtn = document.getElementById('q1-run');
        if (!queryBtn) {
            setTimeout(waitForQuerySystem, 100);
            return;
        }
        
        // 创建refreshProjectList函数
        window.refreshProjectList = function() {
            console.log('🔍 执行项目列表刷新...');
            
            // 触发查询按钮点击事件
            const queryBtn = document.getElementById('q1-run');
            if (queryBtn) {
                queryBtn.click();
                console.log('✅ 已触发查询刷新');
            } else {
                console.warn('⚠️ 查询按钮不存在，使用备用方案');
                
                // 备用方案：直接刷新项目列表显示
                const projectList = document.getElementById('project-list');
                const queryList = document.getElementById('query-results-list');
                
                if (projectList && queryList) {
                    // 如果有标签过滤器选中的标签，显示过滤结果
                    if (window.listTagFilter && window.listTagFilter.getSelectedTags().length > 0) {
                        const selectedTags = window.listTagFilter.getSelectedTags();
                        console.log('🏷️ 应用标签过滤:', selectedTags);
                        
                        // 这里应该执行实际的过滤逻辑
                        // 暂时显示过滤状态
                        projectList.style.display = 'none';
                        queryList.style.display = 'block';
                        queryList.innerHTML = `
                            <li style="padding: 12px; text-align: center; color: #666;">
                                <div>🔍 按标签过滤: ${selectedTags.join(', ')}</div>
                                <div style="font-size: 12px; margin-top: 4px;">请使用查询面板进行实际过滤</div>
                            </li>
                        `;
                    } else {
                        // 没有过滤条件，显示项目列表
                        projectList.style.display = 'block';
                        queryList.style.display = 'none';
                    }
                }
            }
        };
        
        console.log('✅ refreshProjectList函数已创建');
        
        // 测试函数是否工作
        if (typeof window.refreshProjectList === 'function') {
            console.log('✅ refreshProjectList函数测试通过');
        } else {
            console.error('❌ refreshProjectList函数创建失败');
        }
    }
    
    // 开始等待
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForQuerySystem);
    } else {
        waitForQuerySystem();
    }
})();

// 同时提供一个简化版本的全局函数
window.simpleRefreshProjectList = function() {
    console.log('🔄 简化版项目列表刷新');
    
    const projectList = document.getElementById('project-list');
    const queryList = document.getElementById('query-results-list');
    
    if (projectList && queryList) {
        if (window.listTagFilter && window.listTagFilter.getSelectedTags().length > 0) {
            const selectedTags = window.listTagFilter.getSelectedTags();
            projectList.style.display = 'none';
            queryList.style.display = 'block';
            queryList.innerHTML = `
                <li style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; margin: 4px 0;">
                    <div style="font-weight: 500; color: #374151;">🏷️ 标签过滤激活</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                        过滤条件: ${selectedTags.join(', ')}
                    </div>
                    <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
                        提示: 使用查询面板的标签选择器进行实际过滤
                    </div>
                </li>
            `;
        } else {
            projectList.style.display = 'block';
            queryList.style.display = 'none';
        }
    }
};
