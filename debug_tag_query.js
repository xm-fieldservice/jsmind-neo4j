/**
 * 标签查询诊断工具
 * 用于调试为什么"议题"标签查询返回0结果
 */

window.debugTagQuery = function() {
    console.log('🔍 开始标签查询诊断...');
    
    // 1. 检查collectAllNodes函数
    let nodes = [];
    try {
        if (typeof window.collectAllNodes === 'function') {
            nodes = window.collectAllNodes();
            console.log(`📊 总节点数: ${nodes.length}`);
        } else {
            console.error('❌ collectAllNodes函数不存在');
            return;
        }
    } catch (error) {
        console.error('❌ collectAllNodes执行失败:', error);
        return;
    }
    
    // 2. 检查包含"议题"标签的节点
    const issueNodes = [];
    nodes.forEach((node, index) => {
        const content = (node.data && typeof node.data.content === 'string') ? node.data.content : '';
        
        // 检查内容中是否包含"议题"
        if (content.includes('议题')) {
            console.log(`📋 节点 ${index + 1}:`, {
                id: node.id,
                topic: node.topic,
                content: content.substring(0, 100) + '...',
                hasDataTags: !!(node.data && node.data.tags),
                dataTags: node.data?.tags
            });
            
            // 使用MindmapController的标签解析方法
            let parsedTags = [];
            try {
                const mc = window.mindmapController;
                if (mc && typeof mc._getTagsFromContent === 'function') {
                    parsedTags = mc._getTagsFromContent(content) || [];
                    console.log(`  解析出的标签: [${parsedTags.join(', ')}]`);
                } else {
                    // 本地解析
                    const lines = content.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
                    if (lines.length) {
                        const m = lines[0].match(/^标签[:：]\s*(.+)$/);
                        if (m && m[1]) {
                            parsedTags = m[1].split(/[，,]/).map(s=>s.trim()).filter(Boolean);
                            console.log(`  本地解析标签: [${parsedTags.join(', ')}]`);
                        }
                    }
                }
            } catch (error) {
                console.error('  标签解析失败:', error);
            }
            
            issueNodes.push({
                node,
                parsedTags,
                hasIssueTag: parsedTags.includes('议题')
            });
        }
    });
    
    console.log(`🎯 包含"议题"文本的节点数: ${issueNodes.length}`);
    console.log(`✅ 正确解析出"议题"标签的节点数: ${issueNodes.filter(n => n.hasIssueTag).length}`);
    
    // 3. 测试matchByTags函数
    if (typeof window.matchByTags !== 'undefined') {
        console.log('🧪 测试matchByTags函数...');
        issueNodes.forEach((item, index) => {
            const matches = window.matchByTags(item.node, ['议题']);
            console.log(`  节点${index + 1} matchByTags结果: ${matches}`);
        });
    } else {
        console.warn('⚠️ matchByTags函数不在全局作用域');
    }
    
    // 4. 检查当前查询状态
    const selectedTags = window.getSelectedTagNames ? window.getSelectedTagNames() : [];
    console.log(`🏷️ 当前选中的标签: [${selectedTags.join(', ')}]`);
    
    // 5. 检查列表过滤器状态
    if (window.listTagFilter) {
        console.log(`🔍 列表过滤器选中标签: [${window.listTagFilter.selectedTags.join(', ')}]`);
    }
    
    return {
        totalNodes: nodes.length,
        issueNodes: issueNodes.length,
        correctlyParsed: issueNodes.filter(n => n.hasIssueTag).length,
        selectedTags,
        filterTags: window.listTagFilter?.selectedTags || []
    };
};

// 自动运行诊断
setTimeout(() => {
    if (window.mindmapController && window.collectAllNodes) {
        window.debugTagQuery();
    }
}, 5000);
