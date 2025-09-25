// 修复卡片按钮失灵和标签显示问题
(function fixCardIssues() {
    console.log('=== 修复卡片问题 ===');
    
    // 1. 检查当前项目数据
    const CKEY = 'mm_project_catalog_v1';
    const catalogRaw = localStorage.getItem(CKEY);
    const catalogList = catalogRaw ? JSON.parse(catalogRaw) : [];
    
    console.log('当前项目数据:', catalogList);
    
    // 2. 修复数据结构 - 确保有完整的payload
    let needsUpdate = false;
    catalogList.forEach((project, index) => {
        console.log(`检查项目 ${index}: ${project.name}`);
        
        if (!project.payload || !project.payload.data) {
            console.log('  -> 缺少payload，尝试从注册表数据修复...');
            
            // 尝试从注册表数据修复
            const registryRaw = localStorage.getItem('__registry_fallback__');
            if (registryRaw) {
                try {
                    const registryData = JSON.parse(registryRaw);
                    const registryProject = registryData.projects?.find(p => 
                        p.project_id === project.id || p.name === project.name
                    );
                    
                    if (registryProject && registryProject.payload) {
                        project.payload = registryProject.payload;
                        needsUpdate = true;
                        console.log('  -> 从注册表恢复payload成功');
                    }
                } catch (e) {
                    console.warn('  -> 注册表数据解析失败:', e);
                }
            }
            
            // 如果还是没有，尝试从localStorage恢复
            if (!project.payload && project.id) {
                const perMindKey = `mm:${project.id}:data`;
                const perMindRaw = localStorage.getItem(perMindKey);
                if (perMindRaw) {
                    try {
                        const perMindData = JSON.parse(perMindRaw);
                        if (perMindData.data) {
                            project.payload = perMindData;
                            needsUpdate = true;
                            console.log('  -> 从per-mind键恢复payload成功');
                        }
                    } catch (e) {
                        console.warn('  -> per-mind数据解析失败:', e);
                    }
                }
            }
        }
    });
    
    // 3. 保存修复后的数据
    if (needsUpdate) {
        localStorage.setItem(CKEY, JSON.stringify(catalogList));
        console.log('✅ 项目数据已修复');
    }
    
    // 4. 重新渲染项目列表
    function forceRenderCatalog() {
        const $catalog = document.getElementById('project-catalog');
        if (!$catalog) {
            console.error('未找到project-catalog元素');
            return;
        }
        
        const list = JSON.parse(localStorage.getItem(CKEY) || '[]');
        $catalog.innerHTML = '';
        
        if (!list.length) {
            const li = document.createElement('li');
            li.textContent = '暂无项目（通过"导入脑图"添加）';
            li.style.color = '#888';
            $catalog.appendChild(li);
            return;
        }
        
        // 提取标签函数
        function extractProjectTags(project) {
            const tags = new Set();
            
            try {
                if (!project || !project.payload || !project.payload.data) return [];
                
                function extractFromNode(node) {
                    if (!node) return;
                    
                    const content = node.content || '';
                    const tagPrefix = '标签: ';
                    const lines = content.split('\n');
                    
                    for (let line of lines) {
                        if (line.startsWith(tagPrefix)) {
                            const tagContent = line.substring(tagPrefix.length).trim();
                            const nodeTags = tagContent.split(',').map(t => t.trim()).filter(Boolean);
                            nodeTags.forEach(tag => tags.add(tag));
                            break;
                        }
                    }
                    
                    if (node.children && Array.isArray(node.children)) {
                        node.children.forEach(child => extractFromNode(child));
                    }
                }
                
                extractFromNode(project.payload.data);
            } catch (error) {
                console.error('[标签提取] 失败:', error);
            }
            
            return Array.from(tags);
        }
        
        list.forEach((it, idx) => {
            const li = document.createElement('li');
            
            // 提取标签
            const projectTags = extractProjectTags(it);
            const tagsHtml = projectTags.length > 0 
                ? `<div class="proj-tags">${projectTags.map(tag => `<span class="proj-tag">${tag}</span>`).join('')}</div>`
                : '';
            
            console.log(`项目 ${idx} 标签:`, projectTags);
            
            li.innerHTML = `
              <div class="proj-card" data-idx="${idx}">
                <div class="proj-card-main">
                  <div class="proj-title">${it.name || 'untitled'}</div>
                  <div class="proj-hash">${it.content_hash || 'no-hash'}</div>
                  ${tagsHtml}
                </div>
                <div class="proj-actions-row">
                  <button class="proj-btn icon-only proj-save" type="button" title="导出" data-action="save-project">💾</button>
                  <button class="proj-btn icon-only proj-fav ${it.is_fav? 'active':''}" type="button" title="收藏" data-action="toggle-fav">${it.is_fav? '★' : '☆'}</button>
                  <button class="proj-btn icon-only proj-del" type="button" title="移除" data-action="remove-project" ${it.undeletable? 'disabled aria-disabled="true"':''}>🗑️</button>
                </div>
              </div>`;
            $catalog.appendChild(li);
        });
        
        console.log('✅ 项目列表已重新渲染');
    }
    
    // 5. 重新绑定事件处理器
    function rebindCardEvents() {
        const $catalog = document.getElementById('project-catalog');
        if (!$catalog) return;
        
        // 移除旧的事件监听器
        const newCatalog = $catalog.cloneNode(true);
        $catalog.parentNode.replaceChild(newCatalog, $catalog);
        
        // 添加新的事件监听器
        newCatalog.addEventListener('click', (e) => {
            const card = e.target.closest('.proj-card');
            if (!card) return;
            
            const list = JSON.parse(localStorage.getItem(CKEY) || '[]');
            const idx = parseInt(card.getAttribute('data-idx'), 10);
            
            const actionBtn = e.target.closest('button[data-action]');
            
            if (actionBtn) {
                e.stopPropagation();
                const action = actionBtn.getAttribute('data-action');
                const item = list[idx];
                
                console.log('按钮点击:', action, 'idx:', idx, 'item:', item);
                
                if (action === 'remove-project') {
                    const titleEl = card.querySelector('.proj-title');
                    const nm = (titleEl && titleEl.textContent.trim()) || '此项目';
                    if (window.confirm(`确认从列表中移除"${nm}"？`)) {
                        list.splice(idx, 1);
                        localStorage.setItem(CKEY, JSON.stringify(list));
                        card.closest('li')?.remove();
                        console.log('✅ 项目已删除');
                    }
                } else if (action === 'toggle-fav') {
                    if (item) {
                        item.is_fav = !item.is_fav;
                        localStorage.setItem(CKEY, JSON.stringify(list));
                        actionBtn.classList.toggle('active', item.is_fav);
                        actionBtn.textContent = item.is_fav ? '★' : '☆';
                        console.log('✅ 收藏状态已切换:', item.is_fav);
                    }
                } else if (action === 'save-project') {
                    try {
                        const pack = (item && item.payload) || (window.mindmapController?.mind?.get_data && window.mindmapController.mind.get_data('node_tree'));
                        if (pack && pack.data) {
                            const safeName = (item.name || pack.data.topic || 'mindmap').replace(/[\\/:*?"<>|\n\r]+/g,'_');
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                            const fname = `${safeName}_${timestamp}.mindmap.json`;
                            
                            const json = JSON.stringify(pack, null, 2);
                            const blob = new Blob([json], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fname;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            
                            console.log('✅ 项目已导出:', fname);
                        }
                    } catch (error) {
                        console.error('导出失败:', error);
                    }
                }
                return;
            }
            
            // 卡片点击 - 切换项目
            console.log('卡片点击，切换到项目:', idx);
            // 这里可以添加项目切换逻辑
        });
        
        console.log('✅ 事件处理器已重新绑定');
    }
    
    // 执行修复
    forceRenderCatalog();
    rebindCardEvents();
    
    console.log('=== 修复完成 ===');
    console.log('请检查：');
    console.log('1. 卡片上是否显示标签');
    console.log('2. 三个按钮是否可以点击');
})();
