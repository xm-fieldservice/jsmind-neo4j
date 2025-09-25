/**
 * 调试标签面板渲染问题 - 详细版本
 */

window.debugTagPanel = function() {
    console.log('🔍 开始详细调试标签面板...');
    
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
    
    // 检查JsonBaseQueryService
    console.log('🔧 JsonBaseQueryService检查:');
    console.log('- JsonBaseQueryService存在:', !!window.JsonBaseQueryService);
    
    if (window.JsonBaseQueryService) {
        // 测试获取系统标签
        window.JsonBaseQueryService.getSystemTags().then(result => {
            console.log('📊 系统标签数据:', result);
            if (result && result.data) {
                console.log('- 根节点:', result.data);
                
                // 查找标签管理节点
                const findByTopic = (node, topic) => {
                    if (!node) return null;
                    if (node.topic === topic) return node;
                    if (Array.isArray(node.children)) {
                        for (const c of node.children) {
                            const r = findByTopic(c, topic);
                            if (r) return r;
                        }
                    }
                    return null;
                };
                
                let tagRoot = findByTopic(result.data, '标签管理');
                if (!tagRoot) {
                    tagRoot = findByTopic(result.data, '系统标签');
                }
                
                console.log('- 标签管理节点:', tagRoot);
                if (tagRoot && tagRoot.children) {
                    console.log('- 标签分组数量:', tagRoot.children.length);
                    tagRoot.children.forEach((group, index) => {
                        console.log(`  ${index + 1}. ${group.topic} (${group.children ? group.children.length : 0}个标签)`);
                    });
                }
            }
        }).catch(error => {
            console.error('❌ 获取系统标签失败:', error);
        });
    }
    
    // 手动触发渲染
    console.log('🔄 手动触发标签面板渲染...');
    try {
        mc.renderTagPanelFromMind();
        
        setTimeout(() => {
            console.log('📄 渲染后面板内容:');
            console.log('- tag-groups HTML:', tagGroups.innerHTML);
            console.log('- tag-list HTML:', tagList.innerHTML);
            console.log('- tagGroups数据:', mc.tagGroups);
            
            if (tagGroups.innerHTML.trim() || tagList.innerHTML.trim()) {
                console.log('✅ 标签面板渲染成功！');
            } else {
                console.warn('⚠️ 标签面板仍为空，检查数据源');
                
                // 尝试直接从localStorage读取
                try {
                    const raw = localStorage.getItem('mm:proj:SYS_TAGS:data');
                    if (raw) {
                        const pack = JSON.parse(raw);
                        console.log('📦 localStorage中的系统标签数据:', pack);
                    } else {
                        console.warn('⚠️ localStorage中没有系统标签数据');
                    }
                } catch (e) {
                    console.error('❌ 读取localStorage失败:', e);
                }
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
    } else {
        console.warn('⚠️ MindmapController尚未加载，3秒后重试...');
        setTimeout(() => {
            if (window.mindmapController) {
                window.debugTagPanel();
            }
        }, 3000);
    }
}, 3000);

console.log('🛠️ 标签面板详细调试工具已加载，使用 debugTagPanel() 手动调试');
