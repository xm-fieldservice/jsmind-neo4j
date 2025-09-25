/**
 * 列表栏标签过滤功能
 */

class ListTagFilter {
    constructor() {
        this.selectedTags = [];
        this.availableTags = new Set();
        this.init();
    }
    
    init() {
        this.createFilterUI();
        this.bindEvents();
        this.updateAvailableTags();
    }
    
    createFilterUI() {
        const listContainer = document.querySelector('#list-column .list-container');
        if (!listContainer) return;
        
        // 在项目列表头部后添加过滤器
        const projectListHeader = listContainer.querySelector('.project-list-header');
        if (!projectListHeader) return;
        
        const filterContainer = document.createElement('div');
        filterContainer.id = 'tag-filter-container';
        filterContainer.innerHTML = `
            <div class="tag-filter-panel" style="margin: 8px 0; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb;">
                <div class="tag-filter-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-size: 12px; font-weight: 500; color: #374151;">标签过滤</span>
                    <button id="clear-tag-filter" style="font-size: 11px; padding: 2px 6px; background: #ef4444; color: white; border: 0; border-radius: 3px; cursor: pointer;">清空</button>
                </div>
                <div id="tag-filter-chips" class="tag-filter-chips" style="display: flex; flex-wrap: wrap; gap: 4px; min-height: 24px;">
                    <span style="font-size: 11px; color: #6b7280;">点击右侧标签面板中的标签进行过滤</span>
                </div>
                <div class="tag-filter-status" style="margin-top: 6px; font-size: 11px; color: #6b7280;">
                    <span id="filter-status">显示全部项目</span>
                </div>
            </div>
        `;
        
        projectListHeader.insertAdjacentElement('afterend', filterContainer);
        console.log('✅ 标签过滤器UI已创建');
    }
    
    bindEvents() {
        // 清空过滤器
        const clearBtn = document.getElementById('clear-tag-filter');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilter();
            });
        }
        
        // 监听全局标签点击事件
        window.addEventListener('tagClicked', (event) => {
            const { tagName, hasNodeFocus } = event.detail;
            
            if (!hasNodeFocus) {
                // 无节点焦点时，执行过滤
                this.toggleTagFilter(tagName);
            }
        });
    }
    
    toggleTagFilter(tagName) {
        const index = this.selectedTags.indexOf(tagName);
        
        if (index > -1) {
            // 移除标签
            this.selectedTags.splice(index, 1);
        } else {
            // 添加标签
            this.selectedTags.push(tagName);
        }
        
        this.updateFilterUI();
        this.applyFilter();
    }
    
    clearFilter() {
        this.selectedTags = [];
        this.updateFilterUI();
        this.applyFilter();
    }
    
    updateFilterUI() {
        const chipsContainer = document.getElementById('tag-filter-chips');
        const statusElement = document.getElementById('filter-status');
        
        if (!chipsContainer || !statusElement) return;
        
        if (this.selectedTags.length === 0) {
            chipsContainer.innerHTML = '<span style="font-size: 11px; color: #6b7280;">点击右侧标签面板中的标签进行过滤</span>';
            statusElement.textContent = '显示全部项目';
        } else {
            // 显示选中的标签
            const chipsHtml = this.selectedTags.map(tag => 
                `<span class="filter-tag-chip" data-tag="${tag}" style="
                    display: inline-flex; align-items: center; gap: 4px; 
                    padding: 2px 6px; background: #3b82f6; color: white; 
                    border-radius: 12px; font-size: 11px; cursor: pointer;
                ">
                    ${tag}
                    <span class="remove-tag" style="cursor: pointer; font-weight: bold;">×</span>
                </span>`
            ).join('');
            
            chipsContainer.innerHTML = chipsHtml;
            statusElement.textContent = `按标签过滤: ${this.selectedTags.join(', ')}`;
            
            // 绑定移除标签事件
            chipsContainer.querySelectorAll('.remove-tag').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const chip = e.target.closest('.filter-tag-chip');
                    const tagName = chip.dataset.tag;
                    this.toggleTagFilter(tagName);
                });
            });
        }
    }
    
    applyFilter() {
        // 触发列表刷新 - 使用多种备用方案
        if (window.refreshProjectList) {
            window.refreshProjectList();
        } else if (window.simpleRefreshProjectList) {
            console.log('🔄 使用简化版刷新函数');
            window.simpleRefreshProjectList();
        } else {
            console.warn('⚠️ 刷新函数不存在，使用内置刷新逻辑');
            this.fallbackRefresh();
        }
        
        console.log('🔍 应用标签过滤:', this.selectedTags);
    }
    
    fallbackRefresh() {
        // 内置的刷新逻辑
        const projectList = document.getElementById('project-list');
        const queryList = document.getElementById('query-results-list');
        
        if (!projectList || !queryList) return;
        
        if (this.selectedTags.length > 0) {
            // 有过滤条件时显示过滤提示
            projectList.style.display = 'none';
            queryList.style.display = 'block';
            queryList.innerHTML = `
                <li style="padding: 16px; text-align: center; border: 2px dashed #d1d5db; border-radius: 8px; margin: 8px 0;">
                    <div style="font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">
                        🏷️ 标签过滤已激活
                    </div>
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
                        当前过滤标签: <strong>${this.selectedTags.join(', ')}</strong>
                    </div>
                    <div style="font-size: 11px; color: #9ca3af;">
                        💡 请使用查询面板的标签选择功能进行实际过滤查询
                    </div>
                </li>
            `;
        } else {
            // 无过滤条件时显示项目列表
            projectList.style.display = 'block';
            queryList.style.display = 'none';
        }
    }
    
    updateAvailableTags() {
        // 从当前项目中提取所有可用标签
        this.availableTags.clear();
        
        // 这里可以扫描所有项目的标签
        // 暂时使用系统标签作为可用标签
        const systemTags = ['目标', '规划', '项目', '议题', '日程', '里程碑', '节点', '难点', '计划', '发布', '进行', '验收', '中断'];
        systemTags.forEach(tag => this.availableTags.add(tag));
    }
    
    getSelectedTags() {
        return this.selectedTags.slice();
    }
}

// 初始化标签过滤器
let listTagFilter = null;

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        listTagFilter = new ListTagFilter();
        window.listTagFilter = listTagFilter;
        console.log('✅ 列表标签过滤器已初始化');
    }, 2000);
});

// 导出给其他模块使用
window.ListTagFilter = ListTagFilter;
