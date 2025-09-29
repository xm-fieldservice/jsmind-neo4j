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
        
        // 同步到查询面板标签状态
        this.syncToQueryPanel();
    }
    
    syncToQueryPanel() {
        setTimeout(() => {
            const queryTagList = document.getElementById('q1-tag-list');
            if (!queryTagList) return;
            
            queryTagList.querySelectorAll('.tag-chip').forEach(chip => {
                const tagName = chip.getAttribute('data-tag');
                const shouldBeActive = this.selectedTags.includes(tagName);
                chip.classList.toggle('active', shouldBeActive);
            });
            
            console.log(`🔄 列表过滤器状态同步到查询面板: [${this.selectedTags.join(', ')}]`);
        }, 100);
    }
    
    applyFilter() {
        // 直接执行标签过滤并投射到左侧项目列表
        if (this.selectedTags.length > 0) {
            console.log('🔄 执行标签过滤查询');
            this.executeTagFilter();
        } else {
            // 无标签过滤时，显示项目目录
            if (typeof window.renderCatalog === 'function') {
                console.log('🔄 使用renderCatalog刷新列表');
                window.renderCatalog();
            } else {
                this.fallbackRefresh();
            }
        }
        
        console.log('🔍 应用标签过滤:', this.selectedTags);
    }
    
    executeTagFilter() {
        try {
            // 收集所有节点
            const nodes = window.collectAllNodes ? window.collectAllNodes() : [];
            console.log(`收集到 ${nodes.length} 个节点`);
            
            // 过滤包含选中标签的节点
            const results = nodes.filter(n => {
                const content = (n.data && typeof n.data.content === 'string') ? n.data.content : '';
                
                // 解析标签
                let tags = [];
                try {
                    const mc = window.mindmapController;
                    if (mc && typeof mc._getTagsFromContent === 'function') {
                        tags = mc._getTagsFromContent(content) || [];
                    } else {
                        // 本地解析
                        const lines = content.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
                        if (lines.length) {
                            const m = lines[0].match(/^标签[:：]\s*(.+)$/);
                            if (m && m[1]) {
                                tags = m[1].split(/[，,]/).map(s=>s.trim()).filter(Boolean);
                            }
                        }
                    }
                } catch (error) {
                    console.warn('标签解析失败:', error);
                }
                
                // 检查是否包含所有选中的标签
                const tagSet = new Set(tags.map(t => t.trim()));
                return this.selectedTags.every(selectedTag => tagSet.has(selectedTag.trim()));
            });
            
            console.log(`过滤后得到 ${results.length} 个结果`);
            
            // 投射到左侧项目列表
            this.renderFilteredResults(results);
            
        } catch (error) {
            console.error('标签过滤执行失败:', error);
            this.fallbackRefresh();
        }
    }
    
    renderFilteredResults(results) {
        const projectList = document.getElementById('project-catalog');
        const queryList = document.getElementById('query-results-list');
        
        if (!projectList) {
            console.warn('项目目录元素未找到');
            return;
        }
        
        if (results.length > 0) {
            // 隐藏查询结果列表，显示项目列表
            if (queryList) queryList.style.display = 'none';
            projectList.style.display = 'block';
            
            // 清空并重新填充项目列表
            projectList.innerHTML = '';
            results.forEach(node => {
                const li = document.createElement('li');
                li.className = 'project-item filtered-result';
                li.innerHTML = `
                    <div class="project-title">${node.topic || '未命名'}</div>
                    <div class="project-id">${node.id}</div>
                `;
                li.title = (node.data && node.data.content) ? node.data.content.slice(0, 200) : '';
                
                // 点击事件
                li.addEventListener('click', () => {
                    try {
                        if (window.mindmapController && typeof window.mindmapController.setSelectedNode === 'function') {
                            window.mindmapController.setSelectedNode(node.id);
                        }
                    } catch (error) {
                        console.error('节点选择失败:', error);
                    }
                });
                
                projectList.appendChild(li);
            });
            
            console.log(`✅ 已将 ${results.length} 个过滤结果投射到项目列表`);
        } else {
            // 无结果时显示提示
            projectList.innerHTML = '<li class="no-results">未找到匹配的项目</li>';
        }
    }
    
    fallbackRefresh() {
        // 内置的刷新逻辑
        const projectList = document.getElementById('project-catalog');
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
        
        // 默认选择"议题"标签
        setTimeout(() => {
            if (listTagFilter && listTagFilter.availableTags.has('议题')) {
                listTagFilter.toggleTagFilter('议题');
                console.log('✅ 已默认选择"议题"标签过滤');
            }
        }, 500);
        
        console.log('✅ 列表标签过滤器已初始化');
    }, 2000);
});

// 导出给其他模块使用
window.ListTagFilter = ListTagFilter;
