/**
 * 标签列表过滤器增强模块
 * 恢复右侧标签面板与左侧列表过滤器的联动功能
 */

class TagListFilterEnhancement {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    init() {
        // 等待DOM和相关组件加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        // 延迟初始化，确保MindmapController和ListTagFilter都已就绪
        setTimeout(() => {
            this.enhanceTagPanelInteraction();
            this.setupDefaultFilter();
            this.initialized = true;
            console.log('✅ 标签列表过滤器增强已初始化');
        }, 3000);
    }
    
    /**
     * 增强右侧标签面板的交互功能
     */
    enhanceTagPanelInteraction() {
        if (!window.mindmapController || !window.mindmapController.$tagList) {
            console.warn('⚠️ MindmapController或标签面板未就绪');
            return;
        }
        
        const tagList = window.mindmapController.$tagList;
        
        // 使用事件委托，避免重复绑定
        if (!tagList.dataset.enhanced) {
            tagList.addEventListener('click', (e) => {
                const chip = e.target.closest('.tag-chip');
                if (!chip) return;
                
                const tagName = chip.getAttribute('data-tag');
                const hasNodeFocus = !!window.mindmapController.selectedNode;
                
                // 如果没有节点焦点，触发列表过滤器
                if (!hasNodeFocus && window.listTagFilter) {
                    // 延迟执行，避免与原有点击事件冲突
                    setTimeout(() => {
                        window.listTagFilter.toggleTagFilter(tagName);
                        console.log(`🔍 标签过滤器联动: ${tagName}`);
                    }, 50);
                }
                
                // 同步查询面板标签镜像
                this.syncQueryPanelTags();
            });
            
            tagList.dataset.enhanced = 'true';
            console.log('✅ 右侧标签面板交互增强完成');
        }
    }
    
    /**
     * 同步查询面板的标签镜像
     */
    syncQueryPanelTags() {
        setTimeout(() => {
            if (typeof window.refreshQuery1Tags === 'function') {
                window.refreshQuery1Tags();
            }
            if (typeof window.attachAutoRunToChips === 'function') {
                window.attachAutoRunToChips();
            }
        }, 100);
    }
    
    /**
     * 设置默认的"议题"标签过滤
     */
    setupDefaultFilter() {
        if (!window.listTagFilter) {
            console.warn('⚠️ ListTagFilter未就绪，稍后重试');
            setTimeout(() => this.setupDefaultFilter(), 1000);
            return;
        }
        
        // 只在没有已选标签时设置默认值
        if (window.listTagFilter.selectedTags.length === 0) {
            window.listTagFilter.toggleTagFilter('议题');
            console.log('✅ 已默认选择"议题"标签过滤');
        }
    }
    
    /**
     * 手动触发标签过滤
     */
    triggerTagFilter(tagName) {
        if (window.listTagFilter) {
            window.listTagFilter.toggleTagFilter(tagName);
            this.syncQueryPanelTags();
        }
    }
    
    /**
     * 获取当前过滤状态
     */
    getFilterStatus() {
        if (!window.listTagFilter) return null;
        
        return {
            selectedTags: window.listTagFilter.selectedTags.slice(),
            hasNodeFocus: !!window.mindmapController?.selectedNode,
            enhanced: this.initialized
        };
    }
}

// 全局初始化
window.addEventListener('load', () => {
    window.tagListFilterEnhancement = new TagListFilterEnhancement();
});

// 导出给其他模块使用
window.TagListFilterEnhancement = TagListFilterEnhancement;
