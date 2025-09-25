// 简单直接的修复：重新绑定按钮事件和显示标签
(function simpleFix() {
    console.log('=== 简单修复开始 ===');
    
    // 1. 获取项目列表容器
    const catalog = document.getElementById('project-catalog');
    if (!catalog) {
        console.error('未找到项目列表容器');
        return;
    }
    
    // 2. 获取项目数据
    const catalogData = localStorage.getItem('mm_project_catalog_v1');
    let projects = catalogData ? JSON.parse(catalogData) : [];
    console.log('项目数据:', projects);
    
    // 3. 简单的标签提取函数
    function getProjectTags(project) {
        if (!project || !project.payload || !project.payload.data) {
            return [];
        }
        
        const content = project.payload.data.content || '';
        if (content.includes('标签: ')) {
            const lines = content.split('\n');
            for (let line of lines) {
                if (line.startsWith('标签: ')) {
                    const tagText = line.substring(4).trim();
                    return tagText.split(',').map(t => t.trim()).filter(Boolean);
                }
            }
        }
        return [];
    }
    
    // 4. 重新渲染项目列表
    function renderProjects() {
        catalog.innerHTML = '';
        
        if (projects.length === 0) {
            const li = document.createElement('li');
            li.textContent = '暂无项目（通过"导入脑图"添加）';
            li.style.color = '#888';
            catalog.appendChild(li);
            return;
        }
        
        projects.forEach((project, index) => {
            const li = document.createElement('li');
            
            // 获取标签
            const tags = getProjectTags(project);
            console.log(`项目 "${project.name}" 的标签:`, tags);
            
            // 创建标签HTML
            const tagsHtml = tags.length > 0 
                ? `<div class="proj-tags">${tags.map(tag => `<span class="proj-tag">${tag}</span>`).join('')}</div>`
                : '';
            
            li.innerHTML = `
                <div class="proj-card" data-index="${index}">
                    <div class="proj-card-main">
                        <div class="proj-title">${project.name || 'untitled'}</div>
                        <div class="proj-hash">${project.content_hash || 'no-hash'}</div>
                        ${tagsHtml}
                    </div>
                    <div class="proj-actions-row">
                        <button class="proj-btn icon-only proj-save" type="button" title="导出" data-action="save">💾</button>
                        <button class="proj-btn icon-only proj-fav ${project.is_fav ? 'active' : ''}" type="button" title="收藏" data-action="fav">${project.is_fav ? '★' : '☆'}</button>
                        <button class="proj-btn icon-only proj-del" type="button" title="移除" data-action="delete">🗑️</button>
                    </div>
                </div>
            `;
            
            catalog.appendChild(li);
        });
    }
    
    // 5. 绑定按钮事件
    function bindEvents() {
        // 移除旧的事件监听器
        const newCatalog = catalog.cloneNode(false);
        catalog.parentNode.replaceChild(newCatalog, catalog);
        
        // 重新获取引用
        const freshCatalog = document.getElementById('project-catalog');
        
        freshCatalog.addEventListener('click', function(e) {
            const button = e.target.closest('button[data-action]');
            if (!button) return;
            
            e.stopPropagation();
            
            const card = button.closest('.proj-card');
            const index = parseInt(card.getAttribute('data-index'));
            const action = button.getAttribute('data-action');
            const project = projects[index];
            
            console.log('按钮点击:', action, 'index:', index, 'project:', project?.name);
            
            switch (action) {
                case 'save':
                    // 导出项目
                    if (project && project.payload) {
                        const json = JSON.stringify(project.payload, null, 2);
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${project.name || 'mindmap'}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        
                        console.log('✅ 项目已导出');
                    }
                    break;
                    
                case 'fav':
                    // 切换收藏
                    if (project) {
                        project.is_fav = !project.is_fav;
                        localStorage.setItem('mm_project_catalog_v1', JSON.stringify(projects));
                        
                        button.classList.toggle('active', project.is_fav);
                        button.textContent = project.is_fav ? '★' : '☆';
                        
                        console.log('✅ 收藏状态已切换:', project.is_fav);
                    }
                    break;
                    
                case 'delete':
                    // 删除项目
                    if (project && confirm(`确认删除项目 "${project.name}"？`)) {
                        projects.splice(index, 1);
                        localStorage.setItem('mm_project_catalog_v1', JSON.stringify(projects));
                        
                        // 重新渲染
                        renderProjects();
                        bindEvents();
                        
                        console.log('✅ 项目已删除');
                    }
                    break;
            }
        });
        
        console.log('✅ 事件已绑定');
    }
    
    // 6. 执行修复
    renderProjects();
    bindEvents();
    
    console.log('=== 简单修复完成 ===');
    console.log('请检查：');
    console.log('1. 是否显示标签');
    console.log('2. 三个按钮是否可以点击');
})();
