# script.js 左侧项目列表功能重构方案

## 1. 问题根源分析

经过反复失败的尝试，我确认 `script.js` 中的核心问题在于**事件处理逻辑的混乱与冲突**。

- **错误的事件绑定方式**：之前的代码在 `renderCatalog` 函数的循环中为每一个动态生成的卡片（`.proj-card`）都单独绑定了一个点击事件监听器。当列表刷新或重绘时，这些监听器可能会被重复绑定或丢失，导致点击事件完全失效。
- **逻辑冲突**：在多次失败的修复中，我尝试将“保存”和“切换”逻辑注入到这个本已脆弱的结构中，进一步引入了代码冲突和多个不完整的事件处理块，最终导致整个左侧列表的功能完全瘫痪。
- **状态不同步**：由于事件处理的失败，切换脑图时“保存当前脑图”的步骤没有被执行，导致了您最初报告的“切换脑图则不能保持”数据的问题。

## 2. 最终修复方案：统一事件委托

为了彻底解决这个问题，我将不再对单个卡片进行修补，而是采用前端开发中处理动态列表的最佳实践——**事件委托**——来重构整个 `initLeftTabsAndProjects` 函数。

**核心思想**：

1.  **单一监听器**：只在父容器 `#project-catalog` 上绑定一个统一的 `click` 事件监听器。
2.  **事件冒泡与目标判断**：利用事件冒泡机制，当任何内部元素被点击时，事件会上传到父容器。在监听器内部，通过 `e.target` 来判断实际被点击的是哪个元素。
3.  **逻辑分发**：
    -   如果点击的是功能按钮（如删除 `[data-action="remove-project"]`），则执行对应的功能（如删除、收藏），并**停止事件传播**，避免触发脑图切换。
    -   如果点击的是卡片的主体区域（`.proj-card-main`），则执行切换脑图的完整流程。

**切换脑图的正确流程**：

1.  **保存当前**：调用 `window.mindmapController.saveMindmapToStorage()` 保存当前脑图的所有修改。
2.  **高亮显示**：移除所有卡片的 `.active` 类，然后给当前被点击的卡片添加 `.active` 类。
3.  **加载新脑图**：从目录数据中找到对应卡片的数据，加载并显示新的脑图。

## 3. 完整替换代码

我将使用以下健康、完整的代码块，一次性替换掉 `script.js` 中从 `// ===================== 左侧：项目列表选项卡 =====================` 开始到其结尾的整个 `(function initLeftTabsAndProjects(){...})()` 部分。

```javascript
        // ===================== 左侧：项目列表选项卡 =====================
        (function initLeftTabsAndProjects(){
            const tabsNav = document.getElementById('list-tabs-nav');
            const tabsContent = document.getElementById('list-tabs-content');
            if (tabsNav && tabsContent){
                tabsNav.addEventListener('click', (e)=>{
                    const btn = e.target.closest('.tab-btn');
                    if (!btn) return;
                    const tab = btn.dataset.tab;
                    tabsNav.querySelectorAll('.tab-btn').forEach(b=> b.classList.toggle('active', b===btn));
                    tabsContent.querySelectorAll('.tab-pane').forEach(p=> p.classList.toggle('active', p.dataset.tab===tab));
                });
            }

            const CKEY = 'mm_project_catalog_v1';
            const $catalog = document.getElementById('project-catalog');

            const loadCatalog = ()=>{
                try{
                    const raw = localStorage.getItem(CKEY);
                    return raw ? JSON.parse(raw) : [];
                }catch(_){ return []; }
            };
            const saveCatalog = (list)=>{ try{ localStorage.setItem(CKEY, JSON.stringify(list)); }catch(_){ } };

            const computeHash = (text)=>{
                try{
                    let h = 0; for (let i=0;i<text.length;i++){ h = (h*31 + text.charCodeAt(i))|0; }
                    return 'fh_'+(h>>>0).toString(16);
                }catch(_){ return 'unknown'; }
            };

            window.addEventListener('mindmap:imported', (e)=>{
                const detail = e && e.detail || {};
                const name = detail.name || '未命名项目';
                const payload = detail.payload;
                if (!payload || !payload.data) return;
                const text = JSON.stringify(payload.data);
                const content_hash = computeHash(text);
                const list = loadCatalog();
                if (!list.some(x => x && x.content_hash === content_hash)){
                    list.push({ id: payload.data.id, name, payload, createdAt: Date.now(), updatedAt: Date.now(), content_hash, is_fav: false });
                    saveCatalog(list);
                    renderCatalog();
                }
            });

            const findIndexForCard = (list, card) => {
                if (!card) return -1;
                const idxAttr = card.getAttribute('data-idx');
                const idx = idxAttr ? parseInt(idxAttr, 10) : -1;
                return (idx >= 0 && idx < list.length) ? idx : -1;
            };

            const renderCatalog = ()=>{
                if (!$catalog) return;
                const list = loadCatalog();
                $catalog.innerHTML = '';
                if (!list.length) {
                    $catalog.innerHTML = '<li>暂无项目（通过“导入脑图”添加）</li>';
                    return;
                }
                list.forEach((it, idx)=>{
                    const li = document.createElement('li');
                    li.innerHTML = `
                      <div class="proj-card" data-idx="${idx}">
                        <div class="proj-card-main">
                          <div class="proj-title">${it.name || `项目 ${idx+1}`}</div>
                          <div class="proj-meta">${new Date(it.updatedAt || it.createdAt).toLocaleString()}</div>
                        </div>
                        <div class="proj-actions-row">
                          <button class="proj-btn icon-only proj-save" title="导出" data-action="save-project">💾</button>
                          <button class="proj-btn icon-only proj-fav ${it.is_fav ? 'active' : ''}" title="收藏" data-action="toggle-fav">${it.is_fav ? '★' : '☆'}</button>
                          <button class="proj-btn icon-only proj-del" title="移除" data-action="remove-project">🗑️</button>
                        </div>
                      </div>`;
                    $catalog.appendChild(li);
                });
            };

            if (!$catalog._eventBound) {
                $catalog.addEventListener('click', (e) => {
                    const card = e.target.closest('.proj-card');
                    if (!card) return;

                    const list = loadCatalog();
                    const idx = findIndexForCard(list, card);
                    if (idx < 0) return;

                    const actionBtn = e.target.closest('button[data-action]');

                    if (actionBtn) {
                        e.stopPropagation();
                        const action = actionBtn.getAttribute('data-action');
                        const item = list[idx];

                        if (action === 'remove-project') {
                            if (window.confirm(`确认从列表中移除“${item.name}”？`)) {
                                list.splice(idx, 1);
                                saveCatalog(list);
                                card.closest('li')?.remove();
                            }
                        } else if (action === 'toggle-fav') {
                            item.is_fav = !item.is_fav;
                            saveCatalog(list);
                            actionBtn.classList.toggle('active', item.is_fav);
                            actionBtn.textContent = item.is_fav ? '★' : '☆';
                        } else if (action === 'save-project') {
                            if (window.mindmapController) {
                                window.mindmapController.exportMindmapToFile();
                            }
                        }
                        return;
                    }

                    try {
                        if (window.mindmapController && window.mindmapController.mind) {
                            window.mindmapController.saveMindmapToStorage();
                        }

                        document.querySelectorAll('#project-catalog .proj-card.active').forEach(el => el.classList.remove('active'));
                        card.classList.add('active');

                        const it = list[idx];
                        if (window.mindmapController && it.payload) {
                            if (window.columnManager && !window.columnManager.activeViews.includes('mindmap')) {
                                window.columnManager.toggleView('mindmap');
                            }
                            window.__mindFullCache = it.payload;
                            window.mindmapController.show(it.payload);
                            const jm = window.mindmapController.mind;
                            const rootId = it.payload.data && it.payload.data.id;
                            if (jm && rootId) {
                                const nd = jm.get_node(rootId);
                                if (nd) {
                                    jm.expand_node(nd);
                                    jm.center_node(nd);
                                }
                            }
                        }
                    } catch (err) {
                        console.error('切换脑图失败:', err);
                    }
                });
                $catalog._eventBound = true;
            }

            renderCatalog();
        })();
```

请您审阅此方案。如果同意，我将以此为准，执行最后一次修复。
