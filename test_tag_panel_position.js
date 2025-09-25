// 测试标签面板位置调整
console.log('🔍 测试标签面板位置...');

setTimeout(() => {
    // 检查标签面板是否在正确位置
    const tagPanel = document.getElementById('tag-panel');
    const testBtn = document.getElementById('test-export-all-btn');
    const nodeStatus = document.getElementById('node-status');
    
    console.log('📋 DOM元素检查:');
    console.log('- tag-panel:', tagPanel ? '✅ 存在' : '❌ 不存在');
    console.log('- test-export-all-btn:', testBtn ? '✅ 存在' : '❌ 不存在');
    console.log('- node-status (应该不存在):', nodeStatus ? '❌ 仍存在' : '✅ 已删除');
    
    if (tagPanel) {
        const detailItems = document.querySelectorAll('#detail-container .detail-item');
        let tagPanelIndex = -1;
        
        detailItems.forEach((item, index) => {
            if (item.contains(tagPanel)) {
                tagPanelIndex = index;
            }
        });
        
        console.log('📍 标签面板位置:');
        console.log(`- 在第 ${tagPanelIndex + 1} 个 detail-item 中`);
        console.log('- 详情栏结构:');
        detailItems.forEach((item, index) => {
            const title = item.querySelector('h4')?.textContent || '未知';
            console.log(`  ${index + 1}. ${title}`);
        });
        
        if (tagPanelIndex === 1) {
            console.log('✅ 标签面板已正确移动到第2位（标题后）');
        } else {
            console.log('⚠️ 标签面板位置可能不正确');
        }
    }
    
    if (testBtn) {
        const isInTagPanel = tagPanel && tagPanel.parentElement.contains(testBtn);
        console.log('🔘 测试按钮位置:', isInTagPanel ? '✅ 在标签面板中' : '❌ 不在标签面板中');
    }
    
    console.log('🎯 测试完成');
}, 2000);
