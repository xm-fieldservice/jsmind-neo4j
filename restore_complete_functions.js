/**
 * 恢复完整功能
 * 1. 默认加载"议题"标签的4个节点到列表项
 * 2. 查询1页面标签镜像详情页标签，点击触发查询
 * 3. 点击列表项，节点正常出现在脑图栏
 */

window.restoreCompleteFunctions = function() {
    console.log('🔧 开始恢复完整功能...');
    
    // 1. 恢复默认"议题"标签过滤
    const restoreDefaultIssueFilter = () => {
        console.log('📋 恢复默认"议题"标签过滤:');
        
        // 确保ListTagFilter正确初始化
        if (!window.listTagFilter && window.ListTagFilter) {
            window.listTagFilter = new window.ListTagFilter();
            console.log('  ✅ ListTagFilter已重新初始化');
        }
        
        if (window.listTagFilter) {
            // 清除现有选择，然后选择"议题"
            window.listTagFilter.selectedTags = [];
            window.listTagFilter.toggleTagFilter('议题');
            console.log('  ✅ 已选择"议题"标签过滤');
            
            // 检查结果
            const selectedTags = window.listTagFilter.getSelectedTags();
            console.log('  当前选中标签:', selectedTags);
            return selectedTags.includes('议题');
        }
        
        console.error('  ❌ ListTagFilter未初始化');
        return false;
    };
    
    // 2. 恢复查询1页面标签镜像和触发机制
    const restoreQuery1TagMirror = () => {
        console.log('🔗 恢复查询1页面标签镜像:');
        
        // 检查必要元素
        const detailTagList = document.getElementById('tag-list');
        const query1TagList = document.getElementById('q1-tag-list');
        
        if (!detailTagList) {
            console.error('  ❌ 详情页标签列表不存在');
            return false;
        }
        
        if (!query1TagList) {
            console.error('  ❌ 查询1标签列表不存在');
            return false;
        }
        
        // 重建镜像函数
        const refreshQuery1Tags = () => {
            console.log('  🔄 刷新查询1标签镜像...');
            
            // 清空查询1标签列表
            query1TagList.innerHTML = '';
            
            // 复制详情页标签结构
            const tagRows = detailTagList.querySelectorAll('.tag-row');
            tagRows.forEach(row => {
                const clone = row.cloneNode(true);
                
                // 重新绑定标签点击事件
                clone.querySelectorAll('.tag-chip').forEach(chip => {
                    chip.classList.remove('active');
                    
                    // 绑定点击事件：切换状态 + 自动执行查询
                    chip.addEventListener('click', () => {
                        chip.classList.toggle('active');
                        const tagName = chip.getAttribute('data-tag');
                        console.log(`  标签"${tagName}"被点击，状态: ${chip.classList.contains('active') ? '选中' : '未选中'}`);
                        
                        // 自动执行查询
                        setTimeout(() => {
                            if (window.runQuery1) {
                                window.runQuery1();
                                console.log('  ✅ 已自动执行查询1');
                            } else {
                                console.error('  ❌ runQuery1函数不存在');
                            }
                        }, 100);
                    });
                });
                
                query1TagList.appendChild(clone);
            });
            
            console.log(`  ✅ 已镜像 ${tagRows.length} 个标签组`);
        };
        
        // 立即刷新一次
        refreshQuery1Tags();
        
        // 监听切换到查询1标签页时刷新
        const query1TabBtn = document.querySelector('.tab-btn[data-tab="query-1"]');
        if (query1TabBtn) {
            query1TabBtn.addEventListener('click', () => {
                setTimeout(refreshQuery1Tags, 200);
            });
            console.log('  ✅ 已绑定查询1标签页切换事件');
        }
        
        // 暴露刷新函数到全局
        window.refreshQuery1Tags = refreshQuery1Tags;
        
        return true;
    };
    
    // 3. 恢复列表项点击联动脑图功能
    const restoreListItemClickToMindmap = () => {
        console.log('🎯 恢复列表项点击联动脑图:');
        
        // 获取列表容器
        const projectList = document.getElementById('project-catalog');
        const queryList = document.getElementById('query-results-list');
        
        if (!projectList && !queryList) {
            console.error('  ❌ 列表容器不存在');
            return false;
        }
        
        // 绑定项目列表点击事件
        if (projectList) {
            // 移除旧的事件监听器
            const newProjectList = projectList.cloneNode(true);
            projectList.parentNode.replaceChild(newProjectList, projectList);
            
            // 使用事件委托绑定点击事件
            newProjectList.addEventListener('click', (e) => {
                const listItem = e.target.closest('li');
                if (!listItem) return;
                
                const nodeId = listItem.dataset.nodeId || listItem.getAttribute('data-node-id');
                if (!nodeId) {
                    console.warn('  ⚠️ 列表项缺少节点ID');
                    return;
                }
                
                console.log(`  📍 点击项目列表项: ${nodeId}`);
                selectAndCenterNode(nodeId);
            });
            
            console.log('  ✅ 项目列表点击事件已绑定');
        }
        
        // 绑定查询结果列表点击事件
        if (queryList) {
            // 移除旧的事件监听器
            const newQueryList = queryList.cloneNode(true);
            queryList.parentNode.replaceChild(newQueryList, queryList);
            
            // 使用事件委托绑定点击事件
            newQueryList.addEventListener('click', (e) => {
                const listItem = e.target.closest('li');
                if (!listItem) return;
                
                const nodeId = listItem.dataset.nodeId || listItem.getAttribute('data-node-id');
                if (!nodeId) {
                    console.warn('  ⚠️ 查询结果项缺少节点ID');
                    return;
                }
                
                console.log(`  📍 点击查询结果项: ${nodeId}`);
                selectAndCenterNode(nodeId);
            });
            
            console.log('  ✅ 查询结果列表点击事件已绑定');
        }
        
        return true;
    };
    
    // 4. 统一的节点选择和居中函数
    const selectAndCenterNode = (nodeId) => {
        console.log(`🎯 选择并居中节点: ${nodeId}`);
        
        try {
            // 方法1: 使用全局selectAndCenter函数
            if (typeof selectAndCenter === 'function') {
                selectAndCenter(nodeId);
                console.log('  ✅ 使用selectAndCenter成功');
                return;
            }
            
            // 方法2: 使用mindmapController
            if (window.mindmapController) {
                if (typeof window.mindmapController.setSelectedNode === 'function') {
                    window.mindmapController.setSelectedNode(nodeId);
                    console.log('  ✅ 使用mindmapController.setSelectedNode成功');
                    return;
                }
                
                if (window.mindmapController.mind && typeof window.mindmapController.mind.select_node === 'function') {
                    window.mindmapController.mind.select_node(nodeId);
                    console.log('  ✅ 使用mind.select_node成功');
                    return;
                }
            }
            
            // 方法3: 直接使用jsMind
            if (window.jm && typeof window.jm.select_node === 'function') {
                window.jm.select_node(nodeId);
                console.log('  ✅ 使用jm.select_node成功');
                return;
            }
            
            console.error('  ❌ 所有节点选择方法都失败');
            
        } catch (error) {
            console.error('  ❌ 节点选择失败:', error);
        }
    };
    
    // 暴露到全局
    window.selectAndCenterNode = selectAndCenterNode;
    
    // 5. 检查"议题"节点数量
    const checkIssueNodesCount = () => {
        console.log('📊 检查"议题"节点数量:');
        
        const nodes = window.collectAllNodes ? window.collectAllNodes() : [];
        const issueNodes = [];
        
        nodes.forEach(node => {
            const content = (node.data && typeof node.data.content === 'string') ? node.data.content : '';
            
            // 解析标签
            let tags = [];
            try {
                if (window.mindmapController && typeof window.mindmapController._getTagsFromContent === 'function') {
                    tags = window.mindmapController._getTagsFromContent(content);
                } else {
                    // 备用解析
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
                    tags: tags
                });
            }
        });
        
        console.log(`  议题节点数量: ${issueNodes.length} (期望: 4)`);
        issueNodes.forEach((node, i) => {
            console.log(`    ${i+1}. ${node.topic} (${node.id})`);
        });
        
        return issueNodes;
    };
    
    // 执行所有恢复步骤
    console.log('🚀 开始执行恢复步骤...');
    
    const step1 = restoreDefaultIssueFilter();
    const step2 = restoreQuery1TagMirror();
    const step3 = restoreListItemClickToMindmap();
    const issueNodes = checkIssueNodesCount();
    
    // 总结结果
    console.log('📋 功能恢复总结:');
    console.log(`  默认议题过滤: ${step1 ? '✅ 成功' : '❌ 失败'}`);
    console.log(`  查询1标签镜像: ${step2 ? '✅ 成功' : '❌ 失败'}`);
    console.log(`  列表项点击联动: ${step3 ? '✅ 成功' : '❌ 失败'}`);
    console.log(`  议题节点数量: ${issueNodes.length} 个`);
    
    if (step1 && step2 && step3 && issueNodes.length === 4) {
        console.log('🎉 所有功能恢复成功！');
    } else {
        console.log('⚠️ 部分功能需要进一步检查');
    }
    
    return {
        defaultFilter: step1,
        tagMirror: step2,
        listClick: step3,
        issueNodesCount: issueNodes.length
    };
};

// 延迟自动执行
setTimeout(() => {
    if (typeof window.restoreCompleteFunctions === 'function') {
        window.restoreCompleteFunctions();
    }
}, 5000);
