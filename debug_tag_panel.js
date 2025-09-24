/**
 * 调试标签面板渲染问题
 */

window.debugTagPanel = function() {
    console.log('🔍 开始调试标签面板...');
    
    const mc = window.mindmapController;
    if (!mc) {
        console.error('❌ MindmapController不存在');
        return;
    }
    
    // 检查DOM元素
    const tagGroups = document.getElementById('tag-groups');
    const tagList = document.getElementById('tag-list');
    const tagEmpty = document.getElementById('tag-panel-empty');
    
    console.log('📋 DOM元素检查:');
    console.log('- tag-groups:', tagGroups ? '✅ 存在' : '❌ 不存在');
    console.log('- tag-list:', tagList ? '✅ 存在' : '❌ 不存在');
    console.log('- tag-panel-empty:', tagEmpty ? '✅ 存在' : '❌ 不存在');
    
    if (!tagGroups || !tagList) {
        console.error('❌ 标签面板DOM元素缺失');
        return;
    }
    
    // 检查当前内容
    console.log('📄 当前面板内容:');
    console.log('- tag-groups HTML:', tagGroups.innerHTML);
    console.log('- tag-list HTML:', tagList.innerHTML);
    console.log('- tag-empty display:', tagEmpty ? tagEmpty.style.display : 'N/A');
    
    // 检查标签数据
    console.log('🏷️ 标签数据检查:');
    console.log('- tagGroups:', mc.tagGroups);
    console.log('- tagGroupThemes:', mc.tagGroupThemes);
    
    // 手动触发渲染
    console.log('🔄 手动触发标签面板渲染...');
    try {
        mc.renderTagPanelFromMind();
        
        setTimeout(() => {
            console.log('📄 渲染后面板内容:');
            console.log('- tag-groups HTML:', tagGroups.innerHTML);
            console.log('- tag-list HTML:', tagList.innerHTML);
            
            if (tagGroups.innerHTML.trim() || tagList.innerHTML.trim()) {
                console.log('✅ 标签面板渲染成功！');
            } else {
                console.warn('⚠️ 标签面板仍为空');
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ 渲染过程出错:', error);
    }
};

// 自动执行调试
setTimeout(() => {
    if (window.mindmapController) {
        window.debugTagPanel();
    }
}, 3000);

console.log('🛠️ 标签面板调试工具已加载，使用 debugTagPanel() 手动调试');
