/**
 * 调试"议题"标签过滤功能
 * 检查为什么"议题"标签过滤不工作
 */

window.debugIssueTagFilter = function() {
    console.log('🔍 开始调试"议题"标签过滤功能...');
    
    // 1. 检查ListTagFilter是否正确初始化
    console.log('1. 检查ListTagFilter状态:');
    console.log('  window.listTagFilter:', window.listTagFilter);
    console.log('  window.ListTagFilter:', window.ListTagFilter);
    
    if (window.listTagFilter) {
        console.log('  selectedTags:', window.listTagFilter.selectedTags);
        console.log('  availableTags:', Array.from(window.listTagFilter.availableTags));
    }
    
    // 2. 检查是否有"议题"标签的节点
    console.log('2. 检查脑图中的"议题"标签节点:');
    const nodes = window.collectAllNodes ? window.collectAllNodes() : [];
    console.log(`  总节点数: ${nodes.length}`);
    
    const issueNodes = [];
    nodes.forEach((node, index) => {
        const content = (node.data && typeof node.data.content === 'string') ? node.data.content : '';
        if (content.includes('议题')) {
            issueNodes.push({
                id: node.id,
                topic: node.topic,
                content: content,
                index: index
            });
        }
    });
    
    console.log(`  包含"议题"文本的节点数: ${issueNodes.length}`);
    issueNodes.forEach((item, i) => {
        console.log(`    节点${i+1}: ${item.topic} (ID: ${item.id})`);
    });
    
    // 3. 测试手动触发"议题"标签过滤
    console.log('3. 测试手动触发"议题"标签过滤:');
    if (window.listTagFilter) {
        try {
            window.listTagFilter.toggleTagFilter('议题');
            console.log('  ✅ 手动触发成功');
            console.log('  当前选中标签:', window.listTagFilter.selectedTags);
        } catch (error) {
            console.error('  ❌ 手动触发失败:', error);
        }
    } else {
        console.error('  ❌ listTagFilter未初始化');
    }
    
    // 4. 检查UI元素
    console.log('4. 检查UI元素:');
    const filterContainer = document.getElementById('tag-filter-container');
    const filterChips = document.getElementById('tag-filter-chips');
    const filterStatus = document.getElementById('filter-status');
    const projectList = document.getElementById('project-catalog');
    const queryList = document.getElementById('query-results-list');
    
    console.log('  tag-filter-container:', filterContainer ? '存在' : '缺失');
    console.log('  tag-filter-chips:', filterChips ? '存在' : '缺失');
    console.log('  filter-status:', filterStatus ? '存在' : '缺失');
    console.log('  project-catalog:', projectList ? '存在' : '缺失');
    console.log('  query-results-list:', queryList ? '存在' : '缺失');
    
    if (filterStatus) {
        console.log('  当前过滤状态:', filterStatus.textContent);
    }
    
    // 5. 强制重新初始化
    console.log('5. 尝试强制重新初始化:');
    try {
        if (window.ListTagFilter) {
            window.listTagFilter = new window.ListTagFilter();
            console.log('  ✅ 重新初始化成功');
            
            // 延迟触发"议题"标签
            setTimeout(() => {
                if (window.listTagFilter.availableTags.has('议题')) {
                    window.listTagFilter.toggleTagFilter('议题');
                    console.log('  ✅ 已重新选择"议题"标签');
                } else {
                    console.error('  ❌ "议题"标签不在可用标签中');
                }
            }, 1000);
        } else {
            console.error('  ❌ ListTagFilter类不存在');
        }
    } catch (error) {
        console.error('  ❌ 重新初始化失败:', error);
    }
    
    console.log('🔍 调试完成，请查看上述输出结果');
};

// 自动运行调试
setTimeout(() => {
    if (typeof window.debugIssueTagFilter === 'function') {
        window.debugIssueTagFilter();
    }
}, 3000);
