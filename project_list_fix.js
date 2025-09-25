// 项目列表修复模块 - 完全重写
(function ProjectListFix() {
    'use strict';
    
    console.log('=== 项目列表修复模块启动 ===');
    
    const STORAGE_KEY = 'mm_project_catalog_v1';
    
    // 工具函数
    function loadProjects() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('加载项目数据失败:', e);
            return [];
        }
    }
    
    function saveProjects(projects) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
            return true;
        } catch (e) {
            console.error('保存项目数据失败:', e);
            return false;
        }
    }
    
    // 简单的标签提取
    function extractTags(project) {
        try {
            if (!project?.payload?.data?.content) return [];
            
            const content = project.payload.data.content;
            const lines = content.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('标签: ')) {
                    const tagText = line.substring(4).trim();
                    if (tagText) {
                        return tagText.split(',').map(t => t.trim()).filter(Boolean);
                    }
                }
            }
            return [];
        } catch (e) {
            console.error('提取标签失败:', e);
            return [];
        }
    }
    
    // 渲染项目列表
    function renderProjectList() {
        const container = document.getElementById('project-catalog');
        if (!container) {
            console.error('未找到项目列表容器 project-catalog');
            return;
        }
        
        const projects = loadProjects();
        console.log('渲染项目列表，项目数量:', projects.length);
        
        // 清空容器
        container.innerHTML = '';
        
        if (projects.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.textContent = '暂无项目（通过"导入脑图"添加）';
            emptyItem.style.color = '#888';
            container.appendChild(emptyItem);
            return;
        }
        
        // 渲染每个项目
        projects.forEach((project, index) => {
            const li = document.createElement('li');
            
            // 提取标签
            const tags = extractTags(project);
            console.log(`项目 "${project.name}" 标签:`, tags);
            
            // 创建标签HTML
            let tagsHtml = '';
            if (tags.length > 0) {
                const tagSpans = tags.map(tag => `<span class="proj-tag">${tag}</span>`).join('');
                tagsHtml = `<div class="proj-tags">${tagSpans}</div>`;
            }
            
            // 创建项目卡片
            li.innerHTML = `
                <div class="proj-card" data-project-index="${index}">
                    <div class="proj-card-main">
                        <div class="proj-title">${project.name || 'untitled'}</div>
                        <div class="proj-hash">${project.content_hash || 'no-hash'}</div>
                        ${tagsHtml}
                    </div>
                    <div class="proj-actions-row">
                        <button class="proj-btn icon-only proj-save" type="button" title="导出" data-action="export">💾</button>
                        <button class="proj-btn icon-only proj-fav ${project.is_fav ? 'active' : ''}" type="button" title="收藏" data-action="favorite">${project.is_fav ? '★' : '☆'}</button>
                        <button class="proj-btn icon-only proj-del" type="button" title="移除" data-action="remove">🗑️</button>
                    </div>
                </div>
            `;
            
            container.appendChild(li);
        });
        
        console.log('✅ 项目列表渲染完成');
    }
    
    // 处理按钮点击
    function handleButtonClick(e) {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        
        e.stopPropagation();
        e.preventDefault();
        
        const action = button.getAttribute('data-action');
        const card = button.closest('.proj-card');
        const index = parseInt(card.getAttribute('data-project-index'));
        
        console.log('按钮点击事件:', { action, index });
        
        const projects = loadProjects();
        const project = projects[index];
        
        if (!project) {
            console.error('项目不存在:', index);
            return;
        }
        
        switch (action) {
            case 'export':
                exportProject(project);
                break;
            case 'favorite':
                toggleFavorite(projects, index, button);
                break;
            case 'remove':
                removeProject(projects, index, project.name);
                break;
        }
    }
    
    // 导出项目
    function exportProject(project) {
        try {
            console.log('导出项目:', project.name);
            
            if (!project.payload) {
                alert('项目数据不完整，无法导出');
                return;
            }
            
            const json = JSON.stringify(project.payload, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${project.name || 'mindmap'}_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('✅ 项目导出成功');
        } catch (e) {
            console.error('导出项目失败:', e);
            alert('导出失败: ' + e.message);
        }
    }
    
    // 切换收藏状态
    function toggleFavorite(projects, index, button) {
        try {
            console.log('切换收藏状态:', projects[index].name);
            
            projects[index].is_fav = !projects[index].is_fav;
            
            if (saveProjects(projects)) {
                const isFav = projects[index].is_fav;
                button.classList.toggle('active', isFav);
                button.textContent = isFav ? '★' : '☆';
                console.log('✅ 收藏状态已更新:', isFav);
            }
        } catch (e) {
            console.error('切换收藏失败:', e);
        }
    }
    
    // 移除项目
    function removeProject(projects, index, projectName) {
        try {
            console.log('移除项目:', projectName);
            
            if (confirm(`确认从列表中移除项目 "${projectName}"？`)) {
                projects.splice(index, 1);
                
                if (saveProjects(projects)) {
                    renderProjectList();
                    bindEvents();
                    console.log('✅ 项目已移除');
                }
            }
        } catch (e) {
            console.error('移除项目失败:', e);
        }
    }
    
    // 绑定事件
    function bindEvents() {
        const container = document.getElementById('project-catalog');
        if (!container) return;
        
        // 移除旧的事件监听器
        container.removeEventListener('click', handleButtonClick);
        
        // 添加新的事件监听器
        container.addEventListener('click', handleButtonClick);
        
        console.log('✅ 事件绑定完成');
    }
    
    // 初始化
    function init() {
        console.log('初始化项目列表管理器...');
        
        // 等待DOM准备
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                renderProjectList();
                bindEvents();
            });
        } else {
            renderProjectList();
            bindEvents();
        }
        
        console.log('✅ 项目列表管理器初始化完成');
    }
    
    // 导出到全局，方便调试
    window.ProjectListManager = {
        render: renderProjectList,
        bind: bindEvents,
        load: loadProjects,
        save: saveProjects,
        extractTags: extractTags
    };
    
    // 启动
    init();
    
})();
