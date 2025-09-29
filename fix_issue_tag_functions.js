/**
 * 修复"议题"标签功能
 * 1. 恢复默认加载"议题"标签节点列表（应该是4个）
 * 2. 恢复详情页标签查询与列表栏同步显示
 */

window.fixIssueTagFunctions = function() {
    console.log('🔧 开始修复"议题"标签功能...');
    
    // 1. 检查当前"议题"标签节点数量
    const checkIssueNodes = () => {
        console.log('📊 检查"议题"标签节点数量:');
        const nodes = window.collectAllNodes ? window.collectAllNodes() : [];
        console.log(`  总节点数: ${nodes.length}`);
        
        const issueNodes = [];
        nodes.forEach((node, index) => {
            const content = (node.data && typeof node.data.content === 'string') ? node.data.content : '';
            
            // 解析标签
            let tags = [];
            try {
                const mc = window.mindmapController;
                if (mc && typeof mc._getTagsFromContent === 'function') {
                    tags = mc._getTagsFromContent(content);
                } else {
                    // 备用解析方法
                    const tagMatches = content.match(/\[([^\]]+)\]/g);
                    if (tagMatches) {
                        tags = tagMatches.map(m => m.slice(1, -1).trim());
                    }
                }
            } catch (error) {
                console.warn('标签解析失败:', error);
            }
            
            if (tags.includes('议题')) {
                issueNodes.push({
                    id: node.id,
                    topic: node.topic,
                    content: content,
                    tags: tags
                });
            }
        });
        
        console.log(`  包含"议题"标签的节点数: ${issueNodes.length}`);
        issueNodes.forEach((item, i) => {
            console.log(`    节点${i+1}: ${item.topic} (ID: ${item.id})`);
        });
        
        return issueNodes;
    };
    
    // 2. 强制初始化ListTagFilter并选择"议题"标签
    const forceInitIssueFilter = () => {
        console.log('🔄 强制初始化"议题"标签过滤器:');
        
        try {
            // 确保ListTagFilter类存在
            if (!window.ListTagFilter) {
                console.error('  ❌ ListTagFilter类不存在');
                return false;
            }
            
            // 重新创建实例
            window.listTagFilter = new window.ListTagFilter();
            console.log('  ✅ ListTagFilter实例已重新创建');
            
            // 延迟选择"议题"标签
            setTimeout(() => {
                if (window.listTagFilter.availableTags.has('议题')) {
                    window.listTagFilter.toggleTagFilter('议题');
                    console.log('  ✅ 已选择"议题"标签过滤');
                    
                    // 检查过滤结果
                    setTimeout(() => {
                        const selectedTags = window.listTagFilter.getSelectedTags();
                        console.log('  当前选中标签:', selectedTags);
                        
                        if (selectedTags.includes('议题')) {
                            console.log('  ✅ "议题"标签过滤生效');
                        } else {
                            console.error('  ❌ "议题"标签过滤未生效');
                        }
                    }, 500);
                } else {
                    console.error('  ❌ "议题"标签不在可用标签中');
                    console.log('  可用标签:', Array.from(window.listTagFilter.availableTags));
                }
            }, 1000);
            
            return true;
        } catch (error) {
            console.error('  ❌ 初始化失败:', error);
            return false;
        }
    };
    
    // 3. 修复标签查询与列表同步
    const fixTagQuerySync = () => {
        console.log('🔗 修复标签查询与列表同步:');
        
        // 检查查询1面板是否存在
        const q1TagList = document.getElementById('q1-tag-list');
        if (!q1TagList) {
            console.error('  ❌ 查询1标签面板不存在');
            return false;
        }
        
        // 重新绑定标签点击事件
        const rebindTagClickEvents = () => {
            const tagChips = q1TagList.querySelectorAll('.tag-chip');
            console.log(`  找到 ${tagChips.length} 个标签芯片`);
            
            tagChips.forEach(chip => {
                const tagName = chip.getAttribute('data-tag');
                
                // 移除旧的事件监听器（通过克隆节点）
                const newChip = chip.cloneNode(true);
                chip.parentNode.replaceChild(newChip, chip);
                
                // 添加新的事件监听器
                newChip.addEventListener('click', () => {
                    newChip.classList.toggle('active');
                    console.log(`  标签"${tagName}"被点击，状态: ${newChip.classList.contains('active') ? '选中' : '未选中'}`);
                    
                    // 自动执行查询
                    setTimeout(() => {
                        if (typeof window.runQuery1 === 'function') {
                            window.runQuery1();
                            console.log('  ✅ 已自动执行查询1');
                        } else {
                            console.error('  ❌ runQuery1函数不存在');
                        }
                    }, 100);
                    
                    // 同步到列表过滤器
                    if (window.listTagFilter && tagName) {
                        const isActive = newChip.classList.contains('active');
                        const currentSelected = window.listTagFilter.getSelectedTags();
                        const shouldSelect = isActive && !currentSelected.includes(tagName);
                        const shouldDeselect = !isActive && currentSelected.includes(tagName);
                        
                        if (shouldSelect || shouldDeselect) {
                            window.listTagFilter.toggleTagFilter(tagName);
                            console.log(`  🔄 已同步到列表过滤器: ${tagName}`);
                        }
                    }
                });
            });
        };
        
        // 立即重新绑定
        rebindTagClickEvents();
        
        // 监听详情页切换到查询1时重新绑定
        const tabBtns = document.querySelectorAll('.tab-btn[data-tab="query-1"]');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(rebindTagClickEvents, 200);
            });
        });
        
        console.log('  ✅ 标签查询同步功能已修复');
        return true;
    };
    
    // 4. 暴露runQuery1到全局作用域
    const exposeRunQuery1 = () => {
        // 查找runQuery1函数
        if (typeof runQuery1 !== 'undefined') {
            window.runQuery1 = runQuery1;
            console.log('  ✅ runQuery1已暴露到全局作用域');
            return true;
        } else {
            console.error('  ❌ runQuery1函数不在当前作用域');
            return false;
        }
    };
    
    // 执行修复步骤
    const issueNodes = checkIssueNodes();
    const filterInit = forceInitIssueFilter();
    const syncFixed = fixTagQuerySync();
    
    // 总结修复结果
    console.log('🎯 修复结果总结:');
    console.log(`  议题节点数量: ${issueNodes.length} (期望: 4)`);
    console.log(`  过滤器初始化: ${filterInit ? '成功' : '失败'}`);
    console.log(`  查询同步修复: ${syncFixed ? '成功' : '失败'}`);
    
    if (issueNodes.length === 4 && filterInit && syncFixed) {
        console.log('  ✅ 所有功能修复成功！');
    } else {
        console.log('  ⚠️ 部分功能需要进一步修复');
    }
    
    return {
        issueNodesCount: issueNodes.length,
        filterInitialized: filterInit,
        syncFixed: syncFixed
    };
};

// 延迟自动执行修复
setTimeout(() => {
    if (typeof window.fixIssueTagFunctions === 'function') {
        window.fixIssueTagFunctions();
    }
}, 4000);
