/**
 * 修复"新"按钮创建的节点默认添加"议题"标签
 */

(function() {
    console.log('🏷️ 开始修复新节点默认标签功能...');
    
    // 等待MindmapController加载
    function waitForController() {
        if (!window.mindmapController) {
            setTimeout(waitForController, 100);
            return;
        }
        
        const mc = window.mindmapController;
        
        // 备份原始的getDefaultData方法
        if (mc.getDefaultData && !mc._originalGetDefaultData) {
            mc._originalGetDefaultData = mc.getDefaultData.bind(mc);
            
            // 重写getDefaultData方法
            mc.getDefaultData = function() {
                const uid = `root-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
                
                // 创建包含"议题"标签的默认数据 - 只有一个根节点
                return {
                    id: uid,
                    label: '项目脑图',
                    content: '标签: 议题\n\n# 根节点\n\n在此编写内容...',
                    expanded: true,
                    children: []  // 空的子节点数组，只创建根节点
                };
            };
            
            console.log('✅ getDefaultData方法已重写，新节点将默认包含"议题"标签');
        }
        
        // 同时修复新建按钮的点击处理
        const newBtn = document.getElementById('mindmap-new-btn');
        if (newBtn && !newBtn._tagFixed) {
            // 备份原始点击处理器
            const originalHandler = newBtn.onclick;
            
            // 添加标记避免重复修复
            newBtn._tagFixed = true;
            
            // 监听新建完成事件
            const handleNewMindmap = () => {
                setTimeout(() => {
                    // 确保根节点有"议题"标签
                    if (mc.mind && mc.mind.get_root) {
                        const root = mc.mind.get_root();
                        if (root) {
                            const currentContent = root.data && root.data.content || '';
                            
                            // 检查是否已经有标签
                            if (!currentContent.includes('标签:') && !currentContent.includes('标签：')) {
                                const newContent = '标签: 议题\n\n' + (currentContent || '# 根节点\n\n在此编写内容...');
                                
                                try {
                                    mc.mind.update_node(root.id, null, newContent);
                                    mc.syncJsMindToData();
                                    mc.saveMindmapToStorage();
                                    
                                    console.log('✅ 新建脑图的根节点已添加"议题"标签');
                                } catch (error) {
                                    console.error('❌ 添加默认标签失败:', error);
                                }
                            }
                        }
                    }
                }, 500);
            };
            
            // 监听脑图创建事件
            window.addEventListener('mindmap:imported', (event) => {
                if (event.detail && event.detail.source === 'new') {
                    handleNewMindmap();
                }
            });
            
            console.log('✅ 新建按钮事件监听已设置');
        }
    }
    
    // 开始等待
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForController);
    } else {
        waitForController();
    }
    
    // 创建测试函数
    window.testNewNodeTag = function() {
        console.log('🧪 测试新节点默认标签功能...');
        
        const newBtn = document.getElementById('mindmap-new-btn');
        if (newBtn) {
            console.log('🔘 模拟点击"新"按钮...');
            newBtn.click();
            
            setTimeout(() => {
                const mc = window.mindmapController;
                if (mc && mc.mind && mc.mind.get_root) {
                    const root = mc.mind.get_root();
                    if (root && root.data && root.data.content) {
                        const content = root.data.content;
                        const hasTag = content.includes('标签: 议题') || content.includes('标签：议题');
                        
                        console.log('📋 根节点内容:', content);
                        console.log('🏷️ 是否包含"议题"标签:', hasTag ? '✅ 是' : '❌ 否');
                        
                        if (hasTag) {
                            console.log('🎉 测试成功！新节点已包含"议题"标签');
                        } else {
                            console.log('⚠️ 测试失败，标签未添加');
                        }
                    }
                }
            }, 1000);
        } else {
            console.error('❌ 未找到"新"按钮');
        }
    };
    
    console.log('💡 使用 testNewNodeTag() 函数测试新节点默认标签功能');
})();
