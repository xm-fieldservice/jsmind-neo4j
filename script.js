        // 全局常量与助手：供早期函数与目录逻辑共用
        const CKEY = 'mm_project_catalog_v1';
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
        const findIndexForCard = (list, card)=>{
            try{
                if (!Array.isArray(list) || !card) return -1;
                const idxAttr = card.getAttribute('data-idx');
                let i = (idxAttr != null) ? parseInt(idxAttr, 10) : -1;
                if (!(i >= 0 && i < list.length)){
                    // 回退：用 DOM 在 ul#project-catalog 中的位置作为索引
                    try{
                        const li = card.closest('li');
                        const ul = document.getElementById('project-catalog');
                        if (li && ul){
                            const domIdx = Array.prototype.indexOf.call(ul.children, li);
                            if (domIdx >= 0 && domIdx < list.length) i = domIdx;
                        }
                    }catch(_){ }

    // 监听：jsMind 内联编辑结束（blur）后，同步根标题到目录名称
    // 已禁用：自动同步机制容易误触发，导致未授权改名
    // try{
    //     document.addEventListener('blur', (e)=>{
    //         // 捕获阶段监听所有 blur，减少对 jsMind 内部实现的耦合
    //         setTimeout(()=>{ try{ syncActiveCardNameFromRoot(); }catch(_){ } }, 30);
    //     }, true);
    // }catch(_){ }
                }
                return (i >= 0 && i < list.length) ? i : -1;
            }catch(_){ return -1; }
        };

        // 仅基于 DOM 计算索引（不依赖 data-idx），给事件处理优先使用
        const domIndex = (card)=>{
            try{
                const ul = document.getElementById('project-catalog');
                const li = card && card.closest && card.closest('li');
                if (ul && li){
                    const i = Array.prototype.indexOf.call(ul.children, li);
                    return i >= 0 ? i : -1;
                }
            }catch(_){ }
            return -1;
        };

        // 文件保存助手与时间格式化
        const formatTimestamp = ()=>{
            const d = new Date();
            const p = (n)=> String(n).padStart(2, '0');
            return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
        };
        async function saveJsonWithPicker(dataObj, defaultFileName='mindmap.json'){
            try{
                const json = JSON.stringify(dataObj, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                if (window.showSaveFilePicker){
                    const fh = await window.showSaveFilePicker({
                        suggestedName: defaultFileName,
                        types: [{ description: 'JSON Files', accept: { 'application/json': ['.json', '.mindmap.json'] } }]
                    });
                    const ws = await fh.createWritable();
                    await ws.write(blob); await ws.close();
                    return true;
                }
                if (window.navigator && window.navigator.msSaveOrOpenBlob){
                    window.navigator.msSaveOrOpenBlob(blob, defaultFileName);
                    return true;
                }
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = defaultFileName; document.body.appendChild(a); a.click();
                setTimeout(()=>{ try{ document.body.removeChild(a); URL.revokeObjectURL(url); }catch(_){ } }, 0);
                return true;
            }catch(err){ try{ console.warn('[save] 失败:', err); }catch(_){ } return false; }
        }

        // 系统标签脑图：模板与注入/读取
        function buildSystemTagsTemplate(){
            // 固定三级：标签管理 -> 分组(分类/部门/操作) -> 标签
            return {
                meta: { name: '系统标签脑图', mind_id: 'SYS_TAGS' },
                format: 'node_tree',
                data: {
                    id: 'tags_root', topic: '标签管理',
                    children: [
                        { id: 'group_category', topic: '分类', children: [
                            { id: 'tag_project', topic: '项目' },
                            { id: 'tag_note', topic: '笔记' },
                            { id: 'tag_task', topic: '任务' },
                            { id: 'tag_software', topic: '软件软件' }
                        ]},
                        { id: 'group_department', topic: '部门', children: [
                            { id: 'tag_beike', topic: '贝壳' },
                            { id: 'tag_internal', topic: '内务' }
                        ]},
                        { id: 'group_ops', topic: '操作', children: [
                            { id: 'tag_done', topic: '完成' },
                            { id: 'tag_workspace', topic: '工作区' },
                            { id: 'tag_hard', topic: '疑难' },
                            { id: 'tag_milestone', topic: '里程碑' },
                            { id: 'tag_star', topic: '收藏' }
                        ]}
                    ]
                }
            };
        }
        function ensureSystemTagsStorage(){
            try{
                const key = 'mm:proj:SYS_TAGS:data';
                const raw = localStorage.getItem(key);
                if (!raw){
                    const pack = buildSystemTagsTemplate();
                    localStorage.setItem(key, JSON.stringify(pack));
                    try{ console.debug('[SYS_TAGS] initialized storage'); }catch(_){ }
                }
            }catch(_){ }
        }
        function ensureSystemTagsInCatalog(){
            try{
                ensureSystemTagsStorage();
                const list = loadCatalog();
                let idx = list.findIndex(it=> it && it.pid === 'SYS_TAGS');
                if (idx === -1){
                    const sysPackRaw = localStorage.getItem('mm:proj:SYS_TAGS:data');
                    const pack = sysPackRaw ? JSON.parse(sysPackRaw) : buildSystemTagsTemplate();
                    const sysItem = {
                        pid: 'SYS_TAGS', id: 'tags_root', name: '系统标签脑图',
                        is_system: true, undeletable: true,
                        payload: pack, createdAt: Date.now(), updatedAt: Date.now(),
                        content_hash: computeHash(JSON.stringify(pack && pack.data || {}))
                    };
                    // 插到列表首位
                    list.unshift(sysItem);
                    saveCatalog(list);
                    try{ console.debug('[SYS_TAGS] injected into catalog'); }catch(_){ }
                }
            }catch(_){ }
        }

        // 验证并修复系统标签包（根必须为“标签管理”）。
        function validateAndRepairSystemTags(){
            try{
                const key = 'mm:proj:SYS_TAGS:data';
                const raw = localStorage.getItem(key);
                let pack = raw ? JSON.parse(raw) : null;
                const ok = !!(pack && pack.data && (pack.data.topic === '标签管理'));
                if (ok){ return true; }
                // 先尝试从备份恢复
                try{
                    const bakRaw = localStorage.getItem('mm:proj:SYS_TAGS:backup');
                    const bak = bakRaw ? JSON.parse(bakRaw) : null;
                    if (bak && bak.data && bak.data.topic === '标签管理'){
                        localStorage.setItem(key, JSON.stringify(bak));
                        try{ logList('SYS_TAGS recovered from backup'); }catch(_){ }
                        return true;
                    }
                }catch(_){ }
                // 用模板重建
                try{
                    const tpl = buildSystemTagsTemplate();
                    localStorage.setItem(key, JSON.stringify(tpl));
                    localStorage.setItem('mm:proj:SYS_TAGS:backup', JSON.stringify(tpl));
                    try{ logList('SYS_TAGS rebuilt from template'); }catch(_){ }
                    return true;
                }catch(_){ }
            }catch(_){ }
            return false;
        }

        // 当前显示的脑图标识（由点击列表项时设置）
        function setCurrentDisplayed(pid, idx){ try{ window.__currentMindPid = pid||null; window.__currentMindListIdx = (typeof idx==='number'? idx: -1); }catch(_){ } }
        function getCurrentDisplayed(){ return { pid: window.__currentMindPid||null, idx: (typeof window.__currentMindListIdx==='number'? window.__currentMindListIdx: -1) }; }

        // 将当前打开脑图的“根节点标题”同步到左侧对应项目名称（基于 pid，而非 DOM 激活项）
        function syncActiveCardNameFromRoot(){
            try{
                const mc = window.mindmapController;
                if (!mc || !mc.mind) return;
                const root = mc.mind.get_root && mc.mind.get_root();
                const rootTitle = (root && root.topic) ? String(root.topic).trim() : '';
                if (!rootTitle) return;
                const list = loadCatalog();
                const cur = getCurrentDisplayed();
                let idx = (cur && cur.idx>=0) ? cur.idx : list.findIndex(x=> x && x.pid === (cur && cur.pid));
                if (idx >= 0){
                    if (list[idx].name !== rootTitle){
                        list[idx].name = rootTitle;
                        list[idx].updatedAt = Date.now();
                        saveCatalog(list);
                        try{ const $catalog = document.getElementById('project-catalog'); const li = $catalog && $catalog.children[idx]; const t = li && li.querySelector('.proj-title'); if (t) t.textContent = rootTitle; }catch(_){ }
                        try{ logList('sync name from root', { idx, name: rootTitle }); }catch(_){ }
                    }
                }
            }catch(_){ }
        }

        // 全局渲染函数：供任何模块调用刷新左侧项目目录
        function renderCatalog(){
            try{
                const $catalog = document.getElementById('project-catalog');
                if (!$catalog) return;
                // 确保系统项存在
                ensureSystemTagsInCatalog();
                const list = loadCatalog();
                $catalog.innerHTML = '';
                const SEL_KEY = 'mm_project_catalog_selected_idx';
                let selectedIdx = -1;
                try{ const rawSel = localStorage.getItem(SEL_KEY); if (rawSel!=null) selectedIdx = parseInt(rawSel,10); }catch(_){ }
                if (!Array.isArray(list) || !list.length){
                    const li = document.createElement('li');
                    li.textContent = '暂无项目（通过“导入脑图”添加）';
                    li.style.color = '#888';
                    $catalog.appendChild(li);
                    return;
                }
                list.forEach((it, idx)=>{
                    const li = document.createElement('li');
                    li.innerHTML = `
                      <div class="proj-card" data-idx="${idx}">
                        <div class="proj-card-main">
                          <div class="proj-title">${(it.name||`项目 ${idx+1}`)}</div>
                          <div class="proj-meta">${new Date(it.updatedAt||it.createdAt||Date.now()).toLocaleString()}</div>
                        </div>
                        <div class="proj-actions-row">
                          <button class="proj-btn icon-only proj-save" type="button" title="导出" data-action="save-project">💾</button>
                          <button class="proj-btn icon-only proj-fav ${it.is_fav? 'active':''}" type="button" title="收藏" data-action="toggle-fav">${it.is_fav? '★' : '☆'}</button>
                          <button class="proj-btn icon-only proj-del" type="button" title="移除" data-action="remove-project" ${it.undeletable? 'disabled aria-disabled="true"':''}>🗑️</button>
                        </div>
                      </div>`;
                    $catalog.appendChild(li);
                    // 恢复选中高亮
                    if (selectedIdx === idx){
                        try{ li.querySelector('.proj-card')?.classList.add('active'); }catch(_){ }
                    }
                });
            }catch(_){ }
        }

// 列表日志工具
function logList(message, data){
    try{
        const body = document.getElementById('list-log-body');
        if (!body) return;
        const ts = new Date().toLocaleTimeString();
        let line = `[${ts}] ${message}`;
        if (typeof data !== 'undefined'){
            try{ line += ' ' + JSON.stringify(data); }catch(_){ line += ' ' + String(data); }
        }
        body.textContent = body.textContent ? (body.textContent + "\n" + line) : line;
        // 滚动到底部
        body.scrollTop = body.scrollHeight;
    }catch(_){ }
}

// 将当前脑图导出并写回左侧列表中“激活”的卡片（若存在）
const saveCurrentMindToActiveCard = ()=>{
    try{
        const mc = window.mindmapController;
        const $catalog = document.getElementById('project-catalog');
        if (!mc || !mc.mind || !$catalog) return;
        const pack = mc.mind.get_data && mc.mind.get_data('node_tree');
        if (!pack || !pack.data) return;
        const rootTitle = (pack.data && (pack.data.topic || '')) || '';
        const content_hash = computeHash(JSON.stringify(pack.data));
        const activeCard = $catalog.querySelector('.proj-card.active');
        if (!activeCard) return;
        const list = loadCatalog();
        let idx = findIndexForCard(list, activeCard);
        if (idx < 0){
            try{
                const row = activeCard.closest('li');
                const iDom = Array.prototype.indexOf.call($catalog.children, row);
                if (iDom >= 0 && iDom < list.length) idx = iDom;
            }catch(_){ }
        }
        if (idx >= 0){
            // 确保每个项目有稳定的 pid
            const old = list[idx] || {};
            const pid = old.pid || ('p_'+Date.now()+'_'+Math.random().toString(36).slice(2,8));
            list[idx] = Object.assign({}, old, {
                pid,
                name: rootTitle || (list[idx]?.name) || '未命名项目',
                payload: pack,
                updatedAt: Date.now(),
                content_hash
            });
            saveCatalog(list);
            try{ const t = activeCard.querySelector('.proj-title'); if (t && rootTitle) t.textContent = rootTitle; }catch(_){ }

            // 将控制器保存的 legacy per-mind 键镜像到 namespaced per-mind 键，避免 id 冲突
            try{
                const legacyKey = `mm:${pack.data && pack.data.id || 'root'}:data`;
                const namespacedKey = `mm:proj:${pid}:data`;
                const raw = localStorage.getItem(legacyKey);
                if (raw) localStorage.setItem(namespacedKey, raw);
            }catch(_){ }
        }
    }catch(_){ }
};

/**
 * 多视图布局管理器
 * 负责管理五个视图（列表、脑图、笔记、关系、详情）的显示/隐藏
 */
class ColumnManager {
    constructor() {
        this.views = ['list', 'mindmap', 'notes', 'relation', 'detail'];
        // 默认显示 列表 + 脑图 + 详情
        // 与 updateLayout 中的固定宽度规则（列表1/7、详情1/5）配合，打开页面即呈现目标布局
        this.activeViews = ['list', 'mindmap', 'detail'];
        this.init();
    }

    init() {
        // 初始化视图状态
        this.views.forEach(view => {
            const column = document.getElementById(`${view}-column`);
            if (column) {
                // 初始状态只显示列表视图
                if (view === 'list') {
                    column.classList.add('visible');
                } else {
                    column.classList.remove('visible');
                }
            }
        });

        // 监听移除事件：刷新左侧“项目列表”并切到该页签
        window.addEventListener('mindmap:removed', (e)=>{
            try{
                const detail = e.detail || {};
                const hash = detail.content_hash;
                const list = loadCatalog();
                let changed = false;
                if (hash){
                    const before = list.length;
                    for (let i=list.length-1;i>=0;i--){ if (list[i].content_hash === hash){ list.splice(i,1); changed = true; } }
                    if (!changed && before !== list.length) changed = true;
                } else if (detail.name) {
                    const before = list.length;
                    for (let i=list.length-1;i>=0;i--){ if (list[i].name === detail.name){ list.splice(i,1); changed = true; } }
                    if (!changed && before !== list.length) changed = true;
                }
                if (changed){ saveCatalog(list); }
                renderCatalog();
                // 切换到“查询结果”页签
                try{
                    const btn = document.querySelector('#list-tabs-nav .tab-btn[data-tab="results"]');
                    const pane = document.querySelector('#list-tabs-content .tab-pane[data-tab="results"]');
                    if (btn && pane){
                        document.querySelectorAll('#list-tabs-nav .tab-btn').forEach(b=> b.classList.toggle('active', b===btn));
                        document.querySelectorAll('#list-tabs-content .tab-pane').forEach(p=> p.classList.toggle('active', p===pane));
                    }
                }catch(_){ /* ignore */ }         }catch(_){ }
        });
        
        this.bindEvents();
        
        // 初始化页面
        this.initPage();
    }

    bindEvents() {
        // 绑定顶部系统栏视图切换按钮事件
        document.querySelectorAll('.view-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 防止拖拽事件蹰败视图切换
                e.stopPropagation();
                const view = e.currentTarget.dataset.view;
                this.toggleView(view);
            });
        });

        // 监听窗口大小变化，进行响应式调整
        window.addEventListener('resize', () => {
            this.updateLayout();
        });
        
        // 绑定分割线拖拽事件
        this.initDividerDrag();
    }
    
    /**
     * 切换视图显示/隐藏状态
     * @param {string} view - 视图名称
     */
    toggleView(view) {
        console.log(`切换视图: ${view}`); // 打印日志追踪切换操作
        
        // 获取对应视图按钮
        const viewButton = document.querySelector(`.view-toggle[data-view="${view}"]`);
        
        // 切换视图按钮活动状态
        if (viewButton) {
            viewButton.classList.toggle('active');
        }
        
        // 更新活动视图列表
        if (this.activeViews.includes(view)) {
            // 不能去除所有视图，至少保留一个
            if (this.activeViews.length > 1) {
                this.activeViews = this.activeViews.filter(v => v !== view);
                console.log(`关闭视图 ${view}, 当前活动视图: ${this.activeViews.join(', ')}`);
            } else {
                // 如果只有一个视图并试图关闭它，不允许
                if (viewButton) viewButton.classList.add('active'); // 保持按钮活动状态
                console.log('至少需要一个激活的视图');
                return;
            }
        } else {
            // 添加新的视图
            this.activeViews.push(view);
            console.log(`打开视图 ${view}, 当前活动视图: ${this.activeViews.join(', ')}`);
        }
        
        // 更新布局显示
        this.updateLayout();
        
        // 记录当前视图状态
        this.logViewStates();
    }
    
    /**
     * 更新布局显示
     */
    updateLayout() {
        // 隐藏所有列
        this.views.forEach(view => {
            const column = document.getElementById(`${view}-column`);
            if (column) {
                column.classList.remove('visible');
                // 重置所有列的样式，清除拖拽设置的宽度限制
                column.style.width = '';
                column.style.flex = '1';
            }
        });
        
        // 显示活动列
        this.activeViews.forEach(view => {
            const column = document.getElementById(`${view}-column`);
            if (column) {
                column.classList.add('visible');
                
                // 如果是脑图视图被激活，确保脑图正确渲染并选中根节点
                if (view === 'mindmap' && window.mindmapController) {
                    // 等待DOM更新完成后执行
                    setTimeout(() => {
                        if (window.mindmapController.handleContainerResize) {
                            window.mindmapController.handleContainerResize();
                        } else {
                            const container = document.getElementById('mindmap-container');
                            if (container && window.mindmapController.mindmap) {
                                window.mindmapController.mindmap.changeSize(container.clientWidth, container.clientHeight);
                            }
                        }
                    }, 100);
                }
            }
        });

        // 将“列表”列设置为屏幕宽度的 1/7（其余列自适应填充）
        const listEl = document.getElementById('list-column');
        if (listEl && listEl.classList.contains('visible')) {
            const vw = Math.max(0, window.innerWidth || document.documentElement.clientWidth || 0);
            // 设定最小宽度以保证可用性
            const minPxList = 200;
            const targetList = Math.max(minPxList, Math.floor(vw / 7));
            listEl.style.flex = 'none';
            listEl.style.width = `${targetList}px`;
        }
        
        // 将“详情”列设置为屏幕宽度的 1/5（其余列自适应填充）
        const detailEl = document.getElementById('detail-column');
        if (detailEl && detailEl.classList.contains('visible')) {
            const vw = Math.max(0, window.innerWidth || document.documentElement.clientWidth || 0);
            // 设定最小宽度以保证可用性
            const minPx = 240;
            const target = Math.max(minPx, Math.floor(vw * 0.2));
            detailEl.style.flex = 'none';
            detailEl.style.width = `${target}px`;
        }
        
        // 更新系统栏按钮状态
        this.updateViewButtonsState();
        
        // 右上角调试工具已移除
    }
    
    /**
     * 记录当前视图状态
     */
    logViewStates() {
        console.group('视图状态检查');
        console.log('当前活动视图:', this.activeViews);
        this.views.forEach(view => {
            const el = document.getElementById(`${view}-column`);
            const isActive = this.activeViews.includes(view);
            console.log(`视图: ${view}`, {
                '活动状态': isActive,
                '可见性': el ? el.classList.contains('visible') : 'DOM元素不存在',
                'DOM类': el ? el.className : 'DOM元素不存在'
            });
        });
        console.groupEnd();
    }

    /**
     * 初始化页面
     */
    initPage() {
        // 初始化默认显示状态
        this.updateLayout();
        
        // 更新系统栏按钮状态
        this.updateViewButtonsState();
        
        // 初始化事件
        this.initPageEvents();
        
        // 创建拖拽覆盖层
        this.createResizeOverlay();
    }
    
    /**
     * 初始化页面事件
     */
    initPageEvents() {
        // 右上角调试工具已移除，脑图列表栏下方已有调试面板
    }
    
    /**
     * 更新视图按钮状态
     */
    updateViewButtonsState() {
        // 更新顶部系统栏按钮状态
        this.views.forEach(view => {
            const btn = document.querySelector(`.view-toggle[data-view="${view}"]`);
            if (btn) {
                if (this.activeViews.includes(view)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }
    
    

    /**
     * 创建拖拽覆盖层
     * 用于在拖拽时覆盖整个页面，防止选择文本和点击其他元素
     */
    createResizeOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'resize-overlay';
        document.body.appendChild(overlay);
    }
    
    /**
     * 初始化分割线拖拽功能
     */
    initDividerDrag() {
        // 获取所有分割线
        const dividers = document.querySelectorAll('.column-divider');
        
        dividers.forEach(divider => {
            divider.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation(); // 阻止事件冒泡
                
                // 获取分割线ID来确定相邻的列
                const dividerId = divider.id;
                let leftColumnId, rightColumnId;
                
                // 根据分割线ID确定左右列
                if (dividerId === 'list-mindmap-divider') {
                    leftColumnId = 'list-column';
                    rightColumnId = 'mindmap-column';
                } else if (dividerId === 'mindmap-relation-divider') {
                    leftColumnId = 'mindmap-column';
                    rightColumnId = 'relation-column';
                } else if (dividerId === 'relation-detail-divider') {
                    leftColumnId = 'relation-column';
                    rightColumnId = 'detail-column';
                }
                
                // 获取左右列元素
                const leftColumn = document.getElementById(leftColumnId);
                const rightColumn = document.getElementById(rightColumnId);
                
                // 确保两个相邻列都是可见的
                if (!leftColumn?.classList.contains('visible') || 
                    !rightColumn?.classList.contains('visible')) {
                    return;
                }
                
                // 记录初始位置和宽度
                const startX = e.clientX;
                const leftColumnWidth = leftColumn.getBoundingClientRect().width;
                const rightColumnWidth = rightColumn.getBoundingClientRect().width;
                const totalWidth = leftColumnWidth + rightColumnWidth;
                
                // 激活覆盖层防止选择文本
                const overlay = document.querySelector('.resize-overlay');
                overlay.classList.add('active');
                
                // 标记当前拖拽的分割线
                divider.classList.add('dragging');
                
                // 鼠标移动事件处理
                const handleMouseMove = (moveEvent) => {
                    moveEvent.preventDefault(); // 阻止默认行为
                    moveEvent.stopPropagation(); // 阻止事件冒泡
                    
                    // 计算移动距离
                    const deltaX = moveEvent.clientX - startX;
                    
                    // 计算新的宽度，确保最小宽度不小于100px
                    const newLeftWidth = Math.max(100, leftColumnWidth + deltaX);
                    const newRightWidth = Math.max(100, totalWidth - newLeftWidth);
                    
                    // 如果总宽度不够，不允许继续拖动
                    if (newLeftWidth + newRightWidth >= totalWidth) {
                        // 设置新的宽度
                        leftColumn.style.width = `${newLeftWidth}px`;
                        leftColumn.style.flex = 'none';
                        rightColumn.style.width = `${newRightWidth}px`;
                        rightColumn.style.flex = 'none';
                        
                        // 更新调试信息
                        const debugPanel = document.getElementById('debug-panel');
                        if (debugPanel && debugPanel.classList.contains('visible')) {
                            this.updateDebugInfo(debugPanel);
                        }
                    }
                };
                
                // 鼠标释放事件处理
                const handleMouseUp = (upEvent) => {
                    upEvent.preventDefault(); // 阻止默认行为
                    upEvent.stopPropagation(); // 阻止事件冒泡
                    
                    // 移除事件监听
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    
                    // 隐藏覆盖层
                    overlay.classList.remove('active');
                    
                    // 移除拖拽状态
                    divider.classList.remove('dragging');
                    
                    // 防止点击事件传播到切换按钮
                    setTimeout(() => {
                        // 一小段延迟后允许点击其他元素
                    }, 50);
                };
                
                // 添加临时事件监听
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });
        });
    }
}

/**
 * 热重载功能
 * 监控文件变化自动刷新
 */
class HotReload {
    constructor(interval = 2000) {
        this.interval = interval;
        this.lastModified = {
            html: this.getLastModified('index.html'),
            css: this.getLastModified('styles.css'),
            js: this.getLastModified('script.js')
        };
        this.init();
    }

    init() {
        // 创建状态指示器
        this.createStatusIndicator();
        
        // 每隔设定时间检查文件变化
        setInterval(() => {
            this.checkForChanges();
        }, this.interval);
        
        console.log('🔥 热重载已启动 - 间隔:', this.interval + 'ms');
    }

    createStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'hot-reload-indicator';
        indicator.innerHTML = `
            <div class="indicator-icon">🔄</div>
            <div class="indicator-text">热重载已启用</div>
        `;
        document.body.appendChild(indicator);
        
        // 3秒后隐藏
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 3000);
    }

    getLastModified(file) {
        // 在实际环境中，这里会发送请求获取文件的最后修改时间
        // 在前端模拟中，我们使用当前时间戳作为初始值
        return new Date().getTime();
    }

    async checkForChanges() {
        try {
            // 检查HTML文件变化
            const htmlModified = await this.fetchLastModified('index.html');
            if (htmlModified > this.lastModified.html) {
                this.lastModified.html = htmlModified;
                this.reload('HTML已更新，正在重新加载...');
                return;
            }
            
            // 检查CSS文件变化
            const cssModified = await this.fetchLastModified('styles.css');
            if (cssModified > this.lastModified.css) {
                this.lastModified.css = cssModified;
                this.reloadCSS();
                this.showNotification('CSS已更新');
                return;
            }
            
            // 检查JS文件变化
            const jsModified = await this.fetchLastModified('script.js');
            if (jsModified > this.lastModified.js) {
                this.lastModified.js = jsModified;
                this.reload('JavaScript已更新，正在重新加载...');
                return;
            }
        } catch (error) {
            console.error('热重载检查失败:', error);
        }
    }

    async fetchLastModified(file) {
        // 检查当前页面的协议
        const isHttp = window.location.protocol.startsWith('http');
        
        if (!isHttp) {
            // 如果使用file://协议，直接返回当前时间戳，避免CORS错误
            console.log('检测到使用file://协议访问，跳过文件检查');
            return this.lastModified[file.split('.')[1]] || new Date().getTime();
        }
        
        try {
            // 在HTTP/HTTPS协议下，使用相对路径请求资源
            const url = new URL(file, window.location.href);
            const response = await fetch(`${url.href}?cachebust=${new Date().getTime()}`, { 
                method: 'HEAD'
            });
            
            if (response.ok) {
                const lastModified = response.headers.get('Last-Modified');
                return lastModified ? new Date(lastModified).getTime() : new Date().getTime();
            }
            return this.lastModified[file.split('.')[1]] || new Date().getTime();
        } catch (e) {
            console.warn('热重载检查文件失败:', e);
            // 如果发生错误，返回当前记录的最后修改时间
            return this.lastModified[file.split('.')[1]] || new Date().getTime();
        }
    }

    reloadCSS() {
        // 重新加载CSS而不刷新页面
        const links = document.getElementsByTagName('link');
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (link.rel === 'stylesheet') {
                const href = link.href.split('?')[0];
                link.href = `${href}?cachebust=${new Date().getTime()}`;
            }
        }
    }

    reload(message) {
        this.showNotification(message);
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }

    showNotification(message) {
        const indicator = document.getElementById('hot-reload-indicator') || 
                         this.createStatusIndicator();
        
        indicator.querySelector('.indicator-text').textContent = message;
        indicator.style.opacity = '1';
        indicator.style.backgroundColor = '#4caf50';
        
        // 3秒后隐藏
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 初始化列管理器
    try { window.columnManager = new ColumnManager(); } catch(_) { new ColumnManager(); }
    
    // 初始化热重载（2秒检查间隔）
    new HotReload(2000);

    // 绑定列表日志面板：折叠/展开
    try{
        const panel = document.getElementById('list-log-panel');
        const header = document.getElementById('list-log-header');
        const caret = document.getElementById('list-log-caret');
        const body = document.getElementById('list-log-body');
        const apply = ()=>{
            const collapsed = (panel?.getAttribute('data-collapsed') !== 'false');
            if (body) body.style.display = collapsed ? 'none' : 'block';
            if (caret) caret.textContent = collapsed ? '▸' : '▾';
        };
        header && header.addEventListener('click', ()=>{
            const collapsed = (panel?.getAttribute('data-collapsed') !== 'false');
            panel?.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
            apply();
        });
        apply();
    }catch(_){ }

    // 初始化右侧“详情/查询”选项卡
    (function initDetailTabs(){
        const detailCol = document.getElementById('detail-column');
        if (!detailCol) return;
        const tabs = document.getElementById('detail-tabs');
        const nav = document.getElementById('detail-tabs-nav');
        const content = document.getElementById('detail-tabs-content');
        const legacyDetail = document.getElementById('detail-container');
        if (!tabs || !nav || !content || !legacyDetail) return;

        // 清空导航与内容占位
        nav.innerHTML = '';
        content.innerHTML = '';

        const qCount = parseInt(detailCol.getAttribute('data-queries-count') || '3', 10);

        // 构建“详情”面板
        const paneDetail = document.createElement('div');
        paneDetail.className = 'tab-pane active';
        paneDetail.dataset.tab = 'detail';
        paneDetail.appendChild(legacyDetail); // 将旧详情容器迁入
        content.appendChild(paneDetail);

        // 导航按钮：详情
        const btnDetail = document.createElement('button');
        btnDetail.className = 'tab-btn active';
        btnDetail.dataset.tab = 'detail';
        btnDetail.textContent = '详情';
        nav.appendChild(btnDetail);

        // 构建 i 个“查询”面板
        for (let i = 1; i <= qCount; i++){
            const key = `query-${i}`;
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            btn.dataset.tab = key;
            btn.textContent = `查询${i}`;
            nav.appendChild(btn);

            const pane = document.createElement('div');
            pane.className = 'tab-pane';
            pane.dataset.tab = key;
            if (i === 1){
                // 查询1：标题文本 + 全文本 + 标签组合
                pane.innerHTML = `
                  <div class="detail-item">
                    <h4>查询1</h4>
                    <div class="query-box" style="margin-bottom:8px;">
                      <input id="q1-title-input" class="query-input" placeholder="按标题查询（输入关键字）" />
                      <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#555;">
                        <input type="checkbox" id="q1-fulltext" /> 全文本
                      </label>
                      <button class="query-run" data-tab="${key}" id="q1-run">执行</button>
                      <button class="query-run" id="q1-clear">清空</button>
                    </div>
                    <div class="detail-item" style="margin-top:4px;">
                      <h4>标签筛选</h4>
                      <div id="q1-tag-panel" class="tag-panel">
                        <div class="tag-list" id="q1-tag-list"></div>
                      </div>
                      <div style="font-size:12px;color:#999;margin-top:4px;">提示：此处标签与详情页保持一致（镜像显示），点击标签即可选择/取消选择；组合后作为筛选条件。</div>
                    </div>
                    <div class="query-result" id="${key}-result" style="margin-top:8px;font-size:13px;color:#666;">暂无结果</div>
                  </div>`;
            } else {
                // 其他查询页保留占位
                pane.innerHTML = `
                  <div class=\"detail-item\">暂未配置（查询${i}）</div>`;
            }
            content.appendChild(pane);
        }

        // 切换逻辑
        const switchTo = (tab)=>{
            nav.querySelectorAll('.tab-btn').forEach(b=> b.classList.toggle('active', b.dataset.tab===tab));
            content.querySelectorAll('.tab-pane').forEach(p=> p.classList.toggle('active', p.dataset.tab===tab));
        };
        const refreshQuery1Tags = ()=>{
            const srcList = document.getElementById('tag-list');
            const dstList = document.getElementById('q1-tag-list');
            if (!srcList || !dstList) return;
            // 重建镜像
            dstList.innerHTML = '';
            // 源面板以 .tag-row 结构组织（组名 + chips）
            const rows = srcList.querySelectorAll('.tag-row');
            rows.forEach((row)=>{
                const clone = row.cloneNode(true);
                // 清理交互：改为筛选用途
                clone.querySelectorAll('.tag-chip').forEach(chip=>{
                    chip.classList.remove('active');
                    chip.addEventListener('click', ()=>{
                        chip.classList.toggle('active');
                    });
                });
                dstList.appendChild(clone);
            });
        };

        nav.addEventListener('click', (e)=>{
            const btn = e.target.closest('.tab-btn');
            if (!btn) return;
            switchTo(btn.dataset.tab);
            if (btn.dataset.tab === 'query-1'){
                // 每次激活时同步标签镜像
                refreshQuery1Tags();
        attachAutoRunToChips();
            }
        });

        // 查询实现：收集条件 => 遍历脑图节点 => 结果投射到左侧列表
        const collectAllNodes = ()=>{
            try{
                const mc = window.mindmapController;
                if (!mc || !mc.mind) return [];
                const data = mc.mind.get_data('node_tree');
                const out = [];
                const walk = (n)=>{
                    if (!n) return;
                    if (n.data){ out.push(n); }
                    if (n.children && n.children.length){ n.children.forEach(walk); }
                };
                if (data && data.data){ walk(data.data); }
                return out;
            }catch(_){ return []; }
        };

        const norm = (s)=> (s||'').toString().trim();

        // ===== 全图缓存与子树聚焦（与查询解耦） =====
        const deepClone = (obj)=> JSON.parse(JSON.stringify(obj));
        if (!window.__mindFullCache) window.__mindFullCache = null; // {meta, format, data: node_tree} 或 {data: node_tree}
        const LS_KEY_FULL = '__mind_full_cache_v1';

        const tryInitFullCache = ()=>{
            try{
                if (window.__mindFullCache) return;
                const mc = window.mindmapController;
                if (!mc || !mc.mind || typeof mc.mind.get_data !== 'function') return;
                const capture = ()=>{
                    try{
                        const pack = mc.mind.get_data('node_tree');
                        if (pack && pack.data && pack.data.id){
                            const snap = { meta: {}, format: 'node_tree', data: deepClone(pack.data) };
                            // 若本地尚无持久化全图，则写入
                            if (!window.__mindFullCache) window.__mindFullCache = snap;
                            try{ if (!localStorage.getItem(LS_KEY_FULL)) localStorage.setItem(LS_KEY_FULL, JSON.stringify(snap)); }catch(_){ }
                        }
                    }catch(_){ }
                };
                // 立即尝试一次，并在短延时后重试，确保初次全图渲染完成
                capture();
                setTimeout(capture, 150);
                setTimeout(capture, 400);
            }catch(_){/* ignore */}
        };

        const findSubtree = (root, id)=>{
            if (!root) return null;
            if (root.id === id) return deepClone(root);
            if (Array.isArray(root.children)){
                for (const c of root.children){
                    const r = findSubtree(c, id);
                    if (r) return r;
                }
            }
            return null;
        };

        // 等待 jsMind 就绪后再执行回调
        const waitForJMReady = (cb, retries = 40, interval = 100)=>{
            const ok = ()=>{
                try{
                    const mc = window.mindmapController;
                    if (!mc || !mc.mind) return false;
                    if (typeof mc.mind.get_data !== 'function') return false;
                    const pack = mc.mind.get_data('node_tree');
                    return !!(pack && pack.data && pack.data.id);
                }catch(_){ return false; }
            };
            const tick = ()=>{
                if (ok()) { try{ cb(); }catch(_){} return; }
                if (retries <= 0) { try{ cb(); }catch(_){} return; }
                retries -= 1; setTimeout(tick, interval);
            };
            tick();
        };

        // 选中并将节点居中（通用助手）
        const selectAndCenter = (nodeId)=>{
            try{
                const mc = window.mindmapController;
                if (!mc || !mc.mind) return;
                const jm = mc.mind;
                let restoredOnce = false;
                const doWork = ()=>{
                    // 立即选中
                    try{ if (typeof jm.select_node === 'function') jm.select_node(nodeId); }catch(_){ }
                    const attemptCenter = ()=>{
                        try{
                            if (jm && typeof jm.get_node === 'function'){
                                const nd = jm.get_node(nodeId);
                                if (nd){
                                    // 展开到该节点
                                    try{
                                        let cur = nd;
                                        while (cur){
                                            if (typeof jm.expand_node === 'function') jm.expand_node(cur);
                                            cur = cur.parent;
                                        }
                                    }catch(_){ }
                                    // 居中
                                    try{ if (typeof jm.center_node === 'function') jm.center_node(nd); }catch(_){ }
                                } else if (!restoredOnce) {
                                    // 当前视图找不到该节点，极可能在子树中；自动恢复全图后重试
                                    restoredOnce = true;
                                    tryInitFullCache();
                                    const raw = localStorage.getItem('__mind_full_cache_v1');
                                    let snap = null;
                                    try{ snap = raw ? JSON.parse(raw) : (window.__mindFullCache || null); }catch(_){ snap = window.__mindFullCache || null; }
                                    if (snap && snap.data){
                                        try{ if (typeof jm.show === 'function') jm.show({ meta: snap.meta||{}, format: 'node_tree', data: snap.data }); }catch(_){ }
                                        // 延时重试选中+居中
                                        setTimeout(attemptCenter, 60);
                                        return;
                                    } else {
                                        // 没有快照：走控制器回退渲染全图
                                        try{ mc.renderMindmap && mc.renderMindmap(); }catch(_){ }
                                        setTimeout(attemptCenter, 80);
                                        return;
                                    }
                                }
                            }
                        }catch(_){ }
                        // 兜底控制器
                        try{ if (typeof mc.setSelectedNode === 'function') mc.setSelectedNode(nodeId); }catch(_){ }
                    };
                    // 多次重试，缓解布局延迟
                    setTimeout(attemptCenter, 0);
                    setTimeout(attemptCenter, 50);
                    setTimeout(attemptCenter, 120);
                };
                waitForJMReady(doWork);
            }catch(_){ }
        };

        // 将任意节点规范化为可作为根渲染的 node_tree：
        // - jsMind 要求根的直接子节点拥有 direction: 'left'|'right'
        // - 这里为缺失的方向按左右交替补齐
        // - 同时确保 expanded=true 以展开显示
        const normalizeAsRoot = (sub)=>{
            if (!sub) return sub;
            const root = deepClone(sub);
            if (!Array.isArray(root.children)) root.children = [];
            // 展开根
            if (!root.data) root.data = {};
            root.expanded = true;
            // 为直系孩子补齐 direction
            let toLeft = true;
            root.children.forEach((ch)=>{
                if (!ch) return;
                if (!ch.data) ch.data = {};
                ch.expanded = true;
                if (!ch.direction){
                    ch.direction = toLeft ? 'left' : 'right';
                    toLeft = !toLeft;
                }
            });
            return root;
        };

        const focusSubtree = (nodeId)=>{
            try{
                const mc = window.mindmapController;
                if (!mc || !mc.mind) return;
                // 基于全图缓存截取子树；若缓存未建立，则回退到当前渲染数据
                let cache = window.__mindFullCache;
                if (!cache || !cache.data){
                    // 在首次聚焦前，先把“当前视图”作为全图快照备份（通常此刻为全图）
                    try{
                        const pack0 = mc.mind.get_data && mc.mind.get_data('node_tree');
                        if (pack0 && pack0.data && pack0.data.id){
                            const snap0 = { meta: {}, format: 'node_tree', data: deepClone(pack0.data) };
                            if (!window.__mindFullCache) window.__mindFullCache = snap0;
                            try{ localStorage.setItem(LS_KEY_FULL, JSON.stringify(snap0)); }catch(_){ }
                        }
                    }catch(_){ }
                    tryInitFullCache();
                    const pack = mc.mind.get_data && mc.mind.get_data('node_tree');
                    if (pack && pack.data){
                        cache = { meta: {}, format: 'node_tree', data: pack.data };
                    }
                }
                if (!cache || !cache.data) return;
                const sub = findSubtree(cache.data, nodeId);
                if (!sub) return;
                // 规范化为根数据（补齐 direction/expanded）
                const normalized = normalizeAsRoot(sub);
                if (typeof mc.mind.show === 'function'){
                    mc.mind.show({ meta: cache.meta||{}, format: 'node_tree', data: normalized });
                }
                // 选中节点并调整视野：优先使用 jsMind 原生命令
                try{
                    const jm = mc.mind;
                    // 延迟以等待布局完成
                    setTimeout(()=>{
                        try{ if (jm && typeof jm.select_node === 'function') jm.select_node(nodeId); }catch(_){}
                        try{
                            if (jm && typeof jm.get_node === 'function' && typeof jm.center_node === 'function'){
                                const nd = jm.get_node(nodeId);
                                if (nd) jm.center_node(nd);
                            }
                        }catch(_){}
                        // 兜底：调用控制器自带的选中逻辑
                        try{ if (typeof mc.setSelectedNode === 'function') mc.setSelectedNode(nodeId); }catch(_){}
                    }, 0);
                }catch(_){ }
            }catch(_){/* ignore */}
        };

        // 恢复全图显示（从只读缓存渲染）
        const restoreFullMind = ()=>{
            try{
                const mc = window.mindmapController;
                let cache = window.__mindFullCache;
                if (!mc || !mc.mind) return;
                if (!cache || !cache.data){
                    try{ const raw = localStorage.getItem(LS_KEY_FULL); if (raw) cache = JSON.parse(raw); }catch(_){ }
                }
                if (!cache || !cache.data){ console.warn('[restoreFullMind] 全图缓存缺失'); return; }
                const doShow = ()=>{
                    if (typeof mc.mind.show === 'function'){
                        mc.mind.show({ meta: cache.meta||{}, format: 'node_tree', data: cache.data });
                    }
                    // 恢复后将根居中
                    try{
                        const rootId = cache.data && cache.data.id;
                        if (rootId) selectAndCenter(rootId);
                    }catch(_){ }
                };
                waitForJMReady(doShow);
            }catch(_){ }
        };

        const getSelectedTagNames = ()=>{
            const box = document.getElementById('q1-tag-list');
            if (!box) return [];
            const actives = box.querySelectorAll('.tag-chip.active');
            return Array.from(actives)
                .map(chip => norm((chip.dataset && chip.dataset.tag ? chip.dataset.tag : chip.textContent)))
                .filter(Boolean);
        };

        const matchByTags = (node, selected)=>{
            if (!selected.length) return true; // 未选择标签则不限制
            let tags = [];
            // 1) 优先结构化字段
            if (node?.data && Array.isArray(node.data.tags)) {
                tags = node.data.tags;
            }
            // 2) 若无结构化标签，调用控制器解析内容中的“标签:”行
            if (!tags.length) {
                try{
                    const mc = window.mindmapController;
                    const raw = node?.data && typeof node.data.content === 'string' ? node.data.content : '';
                    if (mc && typeof mc._getTagsFromContent === 'function') {
                        tags = mc._getTagsFromContent(raw) || [];
                    } else if (raw) {
                        // 3) 本地回退解析：匹配首行/行首“标签:”或“标签：”
                        const lines = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
                        if (lines.length) {
                            const m = lines[0].match(/^标签[:：]\s*(.+)$/);
                            if (m && m[1]) {
                                tags = m[1].split(/[，,]/).map(s=>s.trim()).filter(Boolean);
                            }
                        }
                    }
                }catch(_){}
            }
            if (!tags.length) return false;
            // 需要“包含所有被选标签”
            const set = new Set(tags.map(norm));
            return selected.every(t => set.has(norm(t)));
        };

        const runQuery1 = ()=>{
            const titleKw = (document.getElementById('q1-title-input')?.value || '').trim();
            const fulltext = !!document.getElementById('q1-fulltext')?.checked;
            const selTags = getSelectedTagNames();
            const nodes = collectAllNodes();
            const kw = titleKw.toLowerCase();
            const results = nodes.filter(n=>{
                const title = (n.topic || '').toLowerCase();
                const content = (n.data && typeof n.data.content === 'string') ? n.data.content : '';
                const byTitle = kw ? title.includes(kw) : true;
                const byFull = fulltext && kw ? (content.toLowerCase().includes(kw)) : true;
                const byTags = matchByTags(n, selTags);
                // 组合逻辑：
                // - 如勾选全文本：标题或内容命中均可；否则仅看标题条件
                const textOk = kw ? (fulltext ? (byTitle || byFull) : byTitle) : true;
                return textOk && byTags;
            });

            // 投射到查询结果列表（不影响项目列表）
            const projectList = document.getElementById('project-list');
            const queryList = document.getElementById('query-results-list');
            
            if (queryList && projectList) {
                // 显示查询结果，隐藏项目列表
                if (results.length > 0) {
                    projectList.style.display = 'none';
                    queryList.style.display = 'block';
                    
                    queryList.innerHTML = '';
                    results.forEach(n=>{
                        const li = document.createElement('li');
                        li.className = 'query-result-item';
                        li.textContent = `${n.topic || '未命名'} (${n.id})`;
                        li.title = (n.data && n.data.content) ? n.data.content.slice(0, 200) : '';
                        
                        li.addEventListener('click', ()=>{
                            // 安全调用selectAndCenter
                            try {
                                if (typeof selectAndCenter === 'function') {
                                    selectAndCenter(n.id);
                                } else {
                                    console.warn('[查询系统] selectAndCenter函数不存在，尝试备用方案');
                                    // 备用方案：直接选中节点
                                    if (window.mindmapController && typeof window.mindmapController.setSelectedNode === 'function') {
                                        window.mindmapController.setSelectedNode(n.id);
                                    }
                                }
                            } catch (error) {
                                console.error('[查询系统] 选中节点失败:', error);
                            }
                        });
                        
                        // 双击：仅影响显示，聚焦子树；查询仍基于全图缓存
                        li.addEventListener('dblclick', ()=>{
                            try {
                                if (typeof tryInitFullCache === 'function') tryInitFullCache();
                                if (typeof focusSubtree === 'function') focusSubtree(n.id);
                            } catch (error) {
                                console.error('[查询系统] 双击处理失败:', error);
                            }
                        });
                        
                        queryList.appendChild(li);
                    });
                } else {
                    // 无查询结果时显示项目列表
                    projectList.style.display = 'block';
                    queryList.style.display = 'none';
                }
            }

            const box = content.querySelector('#query-1-result');
            if (box){
                box.textContent = `共 ${results.length} 条结果`;
            }
        };

        // 绑定按钮
        document.getElementById('q1-run')?.addEventListener('click', runQuery1);
        document.getElementById('q1-clear')?.addEventListener('click', ()=>{
            const title = document.getElementById('q1-title-input');
            const full = document.getElementById('q1-fulltext');
            if (title) title.value = '';
            if (full) full.checked = false;
            const box = document.getElementById('q1-tag-list');
            if (box){ box.querySelectorAll('.tag-chip.active').forEach(c=> c.classList.remove('active')); }
            
            // 清空查询时返回项目列表
            const projectList = document.getElementById('project-list');
            const queryList = document.getElementById('query-results-list');
            if (projectList && queryList) {
                projectList.style.display = 'block';
                queryList.style.display = 'none';
                queryList.innerHTML = '';
            }
            
            runQuery1();
        });
        // 移除查询面板上的“返回全图”入口，改为全局浮动按钮
        // 回车执行
        document.getElementById('q1-title-input')?.addEventListener('keydown', (e)=>{
            if (e.key === 'Enter') runQuery1();
        });
        // 勾选全文本自动执行
        document.getElementById('q1-fulltext')?.addEventListener('change', runQuery1);

        // 标签点击后自动执行（在镜像构建函数中注册）
        const attachAutoRunToChips = ()=>{
            const box = document.getElementById('q1-tag-list');
            if (!box) return;
            box.querySelectorAll('.tag-chip').forEach(chip=>{
                chip.addEventListener('click', ()=> setTimeout(runQuery1, 0));
            });
        };
        
        // 首次进入时准备标签镜像
        refreshQuery1Tags();
        // 初始化全图缓存：在任意聚焦子树前尽早建立，并默认在强刷后恢复全图
        tryInitFullCache();
        window.addEventListener('load', tryInitFullCache, { once: true });
        // 强刷后等待 jsMind 就绪再恢复全图
        (function(){
            try{
                const raw = localStorage.getItem(LS_KEY_FULL);
                // 启动模式：snapshot(默认) | init（跳过快照，按控制器初始化数据渲染）
                const BOOT_MODE = (window.JM_BOOT_MODE || localStorage.getItem('JM_BOOT_MODE') || sessionStorage.getItem('JM_BOOT_MODE') || 'snapshot');
                const snap = raw ? JSON.parse(raw) : null;
                waitForJMReady(()=>{
                    try{
                        if (BOOT_MODE === 'init'){
                            try { console.log('[JM boot] mode=init'); } catch(_) {}
                            const mc = window.mindmapController;
                            // 优先尝试控制器的本地持久化加载，否则渲染默认数据
                            try{
                                const ok = mc.showSavedMindIfAny && mc.showSavedMindIfAny();
                                if (!ok){ mc.renderMindmap && mc.renderMindmap(); }
                            }catch(_){ try{ mc.renderMindmap && mc.renderMindmap(); }catch(__){} }
                            // 持久化新的全图快照
                            try{ mc.ensureFullSnapshotFromMind && mc.ensureFullSnapshotFromMind(); }catch(_){ }
                            // 居中根
                            try{ const rid = mc?.mind?.get_root && mc.mind.get_root()?.id; if (rid) selectAndCenter(rid); }catch(_){ }
                            return; // 已按初始化路径完成
                        } else { try { console.log('[JM boot] mode=snapshot'); } catch(_) {} }
                        if (snap && snap.data && window.mindmapController?.mind?.show){
                            const mc = window.mindmapController;
                            mc.mind.show(snap);
                            window.__mindFullCache = snap;
                            // 若根不存在，说明快照不完整或被覆盖，回退到控制器渲染
                            const root = mc.mind.get_root && mc.mind.get_root();
                            if (!root || !root.id){
                                try{ mc.renderMindmap && mc.renderMindmap(); }catch(_){ }
                            }
                            // 恢复样式：居中根
                            try{ const rid = (mc.mind.get_root && mc.mind.get_root()?.id) || (snap.data && snap.data.id); if (rid) selectAndCenter(rid); }catch(_){ }
                        } else {
                            // 无快照：直接渲染全图并居中根，确保强刷后回到全图
                            const mc = window.mindmapController;
                            try{ mc.renderMindmap && mc.renderMindmap(); }catch(_){ }
                            try{ const rid = mc?.mind?.get_root && mc.mind.get_root()?.id; if (rid) selectAndCenter(rid); }catch(_){ }
                        }

                    } catch(_){ }
                });
            } catch(_){ }
        })();

    (function initLeftTabsAndProjects(){
        const CKEY = 'mm_project_catalog_v1';
        let $catalog = document.getElementById('project-catalog');

        const ensureBound = ()=>{
            $catalog = document.getElementById('project-catalog');
            if (!$catalog || $catalog._eventBound) return false;

            // 绑定与渲染
            bindCatalogEvents($catalog);
            renderCatalog();
            try{
                const btn = document.querySelector('#list-tabs-nav .tab-btn[data-tab="results"]');
                const pane = document.querySelector('#list-tabs-content .tab-pane[data-tab="results"]');
                if (btn && pane){
                    document.querySelectorAll('#list-tabs-nav .tab-btn').forEach(b=> b.classList.toggle('active', b===btn));
                    document.querySelectorAll('#list-tabs-content .tab-pane').forEach(p=> p.classList.toggle('active', p===pane));
                }
            }catch(_){ /* ignore */ }         return true;
        };

        const bindCatalogEvents = ($catalog)=>{
            if ($catalog._eventBound) return;

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
            let idxNew = list.findIndex(x=> x && x.content_hash === content_hash);
            if (idxNew === -1){
                list.push({ id: payload.data.id, name, payload, createdAt: Date.now(), updatedAt: Date.now(), content_hash, is_fav: false });
                saveCatalog(list);
                renderCatalog();
                idxNew = list.length - 1;
            }
            // 自动选中新导入的项目并打开
            try{
                const ul = document.getElementById('project-catalog');
                const li = ul && ul.children && ul.children[idxNew];
                const cardMain = li && li.querySelector('.proj-card-main');
                if (cardMain){
                    setTimeout(()=>{ cardMain.click(); }, 30);
                }
            }catch(_){ }
        });

        const findIndexForCard = (list, card)=>{
            if (!Array.isArray(list) || !card) return -1;
            const idxAttr = card.getAttribute('data-idx');
            if (idxAttr != null) {
                const i = parseInt(idxAttr, 10);
                if (!isNaN(i) && i >= 0 && i < list.length) return i;
            }
            return -1;
        };

        const renderCatalog = ()=>{
            if (!$catalog) return;
            const list = loadCatalog();
            $catalog.innerHTML = '';
            if (!list.length){
                const li = document.createElement('li');
                li.textContent = '暂无项目（通过“导入脑图”添加）';
                li.style.color = '#888';
                $catalog.appendChild(li);
                return;
            }
            list.forEach((it, idx)=>{
                const li = document.createElement('li');
                li.innerHTML = `
                  <div class="proj-card" data-idx="${idx}">
                    <div class="proj-card-main">
                      <div class="proj-title">${(it.name||`项目 ${idx+1}`)}</div>
                      <div class="proj-meta">${new Date(it.updatedAt||it.createdAt||Date.now()).toLocaleString()}</div>
                    </div>
                    <div class="proj-actions-row">
                      <button class="proj-btn icon-only proj-save" type="button" title="导出" data-action="save-project">💾</button>
                      <button class="proj-btn icon-only proj-fav ${it.is_fav? 'active':''}" type="button" title="收藏" data-action="toggle-fav">${it.is_fav? '★' : '☆'}</button>
                      <button class="proj-btn icon-only proj-del" type="button" title="移除" data-action="remove-project">🗑️</button>
                    </div>
                  </div>`;
                $catalog.appendChild(li);
            });
        };

            $catalog.addEventListener('click', (e) => {
                const card = e.target.closest('.proj-card');
                if (!card) return;

                const list = loadCatalog();
                // 优先用 DOM 位置解析 idx，避免 data-idx 失效
                let idx = domIndex(card);
                if (!(idx >= 0 && idx < list.length)) idx = findIndexForCard(list, card);

                const actionBtn = e.target.closest('button[data-action]');
                
                if (actionBtn) {
                    e.stopPropagation();
                    const action = actionBtn.getAttribute('data-action');
                    // 即便 idx 无法解析，也不阻断按钮行为（例如删除时依赖 DOM 定位）
                    if (!(idx >= 0 && idx < list.length)) idx = domIndex(card);
                    const item = (idx >= 0 && idx < list.length) ? list[idx] : null;

                    if (action === 'remove-project') {
                        if (item && item.undeletable){ return; }
                        const titleEl = card.querySelector('.proj-title');
                        const nm = (titleEl && titleEl.textContent.trim()) || '此项目';
                        if (window.confirm(`确认从列表中移除“${nm}”？`)) {
                            // idx 失效时，尝试通过 DOM 位置删除
                            if (!(idx >= 0 && idx < list.length)) idx = domIndex(card);
                            if (idx >= 0 && idx < list.length){
                                list.splice(idx, 1);
                                saveCatalog(list);
                            }
                            card.closest('li')?.remove();
                            try{ logList('removed by click', { idx }); }catch(_){ }
                        }
                    } else if (action === 'toggle-fav') {
                        item.is_fav = !item.is_fav;
                        saveCatalog(list);
                        actionBtn.classList.toggle('active', item.is_fav);
                        actionBtn.textContent = item.is_fav ? '★' : '☆';
                    } else if (action === 'save-project') {
                        try{
                            // 采用新的保存选择器
                            const pack = (item && item.payload) || (window.mindmapController?.mind?.get_data && window.mindmapController.mind.get_data('node_tree'));
                            if (pack && pack.data){
                                const safeName = (item.name || pack.data.topic || 'mindmap').replace(/[\\/:*?"<>|\n\r]+/g,'_');
                                const fname = `${safeName}_${formatTimestamp()}.mindmap.json`;
                                saveJsonWithPicker(pack, fname);
                            }
                        }catch(_){ }
                    }
                    return;
                }

                try {
                    try { console.debug('[catalog] click card idx=', idx, list[idx]); } catch(_){ }
                    try { logList('click card', { idx, id: list[idx]?.id, name: list[idx]?.name }); }catch(_){ }
                    
                    // 1. 保存当前脑图到per-mind键和目录payload
                    if (window.mindmapController && window.mindmapController.mind) {
                        window.mindmapController.saveMindmapToStorage();
                        // 已禁用自动同步：try{ syncActiveCardNameFromRoot(); }catch(_){ }
                        try { logList('saved current mind to storage'); }catch(_){ }
                        // 同时更新当前激活项目的payload
                        saveCurrentMindToActiveCard();
                    }

                    // 2. 切换激活状态（并持久化选中下标）
                    document.querySelectorAll('#project-catalog .proj-card.active').forEach(el => el.classList.remove('active'));
                    card.classList.add('active');
                    try{ localStorage.setItem('mm_project_catalog_selected_idx', String(idx)); }catch(_){ }
                    try{ const itNow = (idx>=0 && idx<list.length) ? list[idx] : null; setCurrentDisplayed(itNow && itNow.pid, idx); }catch(_){ }

                    // 3. 确保脑图视图可见
                    const it = (idx >= 0 && idx < list.length) ? list[idx] : null;
                    if (window.columnManager && !window.columnManager.activeViews.includes('mindmap')) {
                        try { window.columnManager.toggleView('mindmap'); } catch(_){ }
                    }

                    // 4. 加载目标脑图（优先目录payload，避免 id 冲突；然后按新/旧 per-mind 键）
                    let targetPack = null;

                    // 4.1) 首选：目录payload（随编辑已同步为最新）
                    if (it && it.payload) {
                        targetPack = it.payload;
                        try { console.debug('[catalog] loaded from catalog payload'); } catch(_){ }
                        try { logList('load from catalog payload', { id: it?.id, name: it?.name }); }catch(_){ }
                    }

                    // 4.2) 次选：namespaced per-mind 键（mm:proj:<pid>:data）
                    if (!targetPack && it && it.pid) {
                        try {
                            const rawPer2 = localStorage.getItem(`mm:proj:${it.pid}:data`);
                            if (rawPer2) {
                                const savedPer2 = JSON.parse(rawPer2);
                                if (savedPer2 && savedPer2.format && savedPer2.data) {
                                    targetPack = savedPer2;
                                    try { logList('load from per-mind (namespaced)', { pid: it.pid }); }catch(_){ }
                                }
                            }
                        } catch(_){ }
                    }

                    // 4.3) 再次兜底：legacy per-mind 键（mm:<id>:data）
                    if (!targetPack && it && it.id) {
                        try {
                            const rawPer = localStorage.getItem(`mm:${it.id}:data`);
                            if (rawPer) {
                                const savedPer = JSON.parse(rawPer);
                                if (savedPer && savedPer.format && savedPer.data) {
                                    targetPack = savedPer;
                                    try { console.debug('[catalog] loaded from per-mind key:', it.id); } catch(_){ }
                                    try { logList('load from per-mind (legacy)', { id: it.id }); }catch(_){ }
                                }
                            }
                        } catch(_){ }
                    }

                    // 4.3) 再兜底：全局快照
                    if (!targetPack) {
                        try {
                            const rawSnap = localStorage.getItem('__mind_full_cache_v1');
                            const snap = rawSnap ? JSON.parse(rawSnap) : (window.__mindFullCache || null);
                            if (snap && snap.data) {
                                targetPack = { meta: snap.meta||{}, format: 'node_tree', data: snap.data };
                                try { console.debug('[catalog] loaded from global snapshot'); } catch(_){ }
                                try { logList('load from snapshot'); }catch(_){ }
                            }
                        } catch(_){ }
                    }

                    // 5. 显示目标脑图
                    if (window.mindmapController && targetPack) {
                        try {
                            if (typeof window.mindmapController.show === 'function') {
                                window.mindmapController.show(targetPack);
                            } else if (window.mindmapController.mind && typeof window.mindmapController.mind.show === 'function') {
                                window.mindmapController.mind.show(targetPack);
                            }
                            window.__mindFullCache = targetPack;
                            
                            // 6. 同步更新目录payload为最新数据（确保下次切换时数据一致）
                            if (targetPack !== it.payload) {
                                try {
                                    const freshList = loadCatalog();
                                    const freshIdx = findIndexForCard(freshList, card);
                                    if (freshIdx >= 0) {
                                        freshList[freshIdx].payload = targetPack;
                                        freshList[freshIdx].updatedAt = Date.now();
                                        if (targetPack.data) {
                                            freshList[freshIdx].content_hash = computeHash(JSON.stringify(targetPack.data));
                                        }
                                        saveCatalog(freshList);
                                        try { console.debug('[catalog] synced payload for consistency'); } catch(_){ }
                                        try { logList('sync catalog payload', { idx: freshIdx, id: freshList[freshIdx]?.id }); }catch(_){ }
                                    }
                                } catch(_){ }
                            }

                            // 6.1 镜像：将当前显示的数据写入 namespaced per-mind 键与 legacy 键，避免后续切换落回旧缓存
                            try{
                                const pid = it && it.pid ? it.pid : null;
                                if (pid){
                                    // 仅当是系统项时才允许写入 SYS_TAGS 键
                                    if (pid === 'SYS_TAGS' && it && it.is_system === true){
                                        localStorage.setItem('mm:proj:SYS_TAGS:data', JSON.stringify(targetPack));
                                        localStorage.setItem('mm:proj:SYS_TAGS:backup', JSON.stringify(targetPack));
                                        try{ logList('write SYS_TAGS', { topic: targetPack?.data?.topic }); }catch(_){ }
                                    } else if (pid !== 'SYS_TAGS') {
                                        localStorage.setItem(`mm:proj:${pid}:data`, JSON.stringify(targetPack));
                                        try{ logList('write mm:proj', { pid, topic: targetPack?.data?.topic }); }catch(_){ }
                                    }
                                }
                                if (targetPack && targetPack.data && targetPack.data.id){ localStorage.setItem(`mm:${targetPack.data.id}:data`, JSON.stringify(targetPack)); }
                            }catch(_){ }

                            // 若是系统标签脑图，广播变化
                            try{
                                if (it && it.pid === 'SYS_TAGS'){
                                    window.dispatchEvent(new CustomEvent('tags:system_pack_changed'));
                                }
                            }catch(_){ }
                            
                            try { console.debug('[catalog] show pack ok:', targetPack.data?.topic || targetPack.data?.id); } catch(_){ }
                            try { logList('show ok', { id: targetPack.data?.id, topic: targetPack.data?.topic }); }catch(_){ }
                        } catch(err) {
                            console.warn('[catalog] 显示目标脑图失败，回退 renderMindmap()', err);
                            try { logList('show failed', String(err && err.message || err)); }catch(_){ }
                            try { window.mindmapController.renderMindmap && window.mindmapController.renderMindmap(); } catch(_){ }
                        }

                        // 7. 居中/展开根节点
                        try {
                            const jm = window.mindmapController.mind;
                            const rootId = targetPack.data && targetPack.data.id;
                            if (jm && rootId) {
                                const nd = jm.get_node(rootId);
                                if (nd) { jm.expand_node(nd); jm.center_node(nd); }
                            }
                        } catch(_){ }
                    } else {
                        console.warn('[catalog] 未找到可显示的数据包，保持当前脑图不变', it);
                        try { logList('no pack to show', { id: it?.id, name: it?.name }); }catch(_){ }
                    }
                } catch (err) {
                    console.error('切换脑图失败:', err);
                    try { logList('switch failed', String(err && err.message || err)); }catch(_){ }
                }
            });
            $catalog._eventBound = true;
        };

        // 如果此时节点不存在，则等待其出现后再绑定
        if (!ensureBound()){
            const obs = new MutationObserver(()=>{
                if (ensureBound()){
                    try{ obs.disconnect(); }catch(_){ }
                }
            });
            try{ obs.observe(document.body, { childList: true, subtree: true }); }catch(_){ }
        }
    })();

        // 如果没有持久化全图，也在就绪后将当前根置中，保证“全图样式”观感
        waitForJMReady(()=>{
            try{
                const mc = window.mindmapController;
                const pack = mc?.mind?.get_data && mc.mind.get_data('node_tree');
                if (pack && pack.data && pack.data.id){
                    selectAndCenter(pack.data.id);
                }
            }catch(_){ }
        });

        // 创建全局“返回全图”浮动按钮
        (function(){
            try{
                if (document.getElementById('mind-restore-btn')) return;
                const btn = document.createElement('button');
                btn.id = 'mind-restore-btn';
                btn.textContent = '返回全图';
                btn.style.position = 'fixed';
                btn.style.top = '56px';
                btn.style.right = '16px';
                btn.style.zIndex = '9999';
                btn.style.padding = '6px 10px';
                btn.style.background = '#4caf50';
                btn.style.color = '#fff';
                btn.style.border = 'none';
                btn.style.borderRadius = '4px';
                btn.style.cursor = 'pointer';
                btn.addEventListener('click', restoreFullMind);
                document.body.appendChild(btn);
            }catch(_){ }
        })();
    })();

    // ===================== 关系栏最小实现 =====================
    (function initRelationPanel(){
        const container = document.getElementById('relation-container');
        if (!container) return;
        const listBox = document.getElementById('relation-list');
        const statusEl = document.getElementById('relation-status');
        const dirSel = document.getElementById('relation-direction');
        const typeInp = document.getElementById('relation-type-filter');
        const btnRefresh = document.getElementById('relation-refresh-btn');

        const setStatus = (txt)=>{ if (statusEl) statusEl.textContent = txt; };

        const safeJSON = async (resp)=>{
            try{ return await resp.json(); }catch(_){ return null; }
        };

        // 同步脑图数据到Neo4j数据库
        const syncMindmapToNeo4j = async ()=>{
            setStatus('同步中...');
            try{
                // 获取脑图数据
                const mc = window.mindmapController;
                if (!mc || !mc.data) throw new Error('脑图控制器不可用');
                
                // 发送到后端同步API
                const url = '/api/sync-mindmap';
                const resp = await fetch(url, { 
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json' 
                    },
                    body: JSON.stringify(mc.data)
                });
                
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const result = await safeJSON(resp);
                
                // 显示同步结果
                if (result && result.status === 'success') {
                    const stats = result.stats || {};
                    setStatus(`同步成功: ${stats.nodes_created || 0}个节点, ${stats.relations_created || 0}个关系`);
                    console.log('[relations] 同步成功:', result);
                    return true;
                } else {
                    throw new Error(result && result.message || '未知错误');
                }
            }catch(err){
                console.error('[relations] 同步失败:', err && err.message);
                setStatus(`同步失败: ${err && err.message || '未知错误'}`);
                return false;
            }
        };
        
        const fetchRelations = async (nodeId)=>{
            if (!nodeId) return [];
            setStatus(`加载中...(${nodeId})`);
            try{
                const cfgBase = (window.API_BASE || localStorage.getItem('__api_base'));
                if (!cfgBase){
                    // 未配置API，静默降级为本地空数据
                    this && this._dragDiagLog && this._dragDiagLog('relations.api_disabled', {});
                    return [];
                }
                const API_BASE = cfgBase.replace(/\/$/, '');
                const url = `${API_BASE}/api/relations?nodeId=${encodeURIComponent(nodeId)}`;
                const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const data = await safeJSON(resp);
                if (Array.isArray(data)) return data;
                if (data && Array.isArray(data.items)) return data.items;
                // 非预期结构，回退
                throw new Error('unexpected payload');
            }catch(err){
                console.warn('[relations] 使用 mock 数据:', err && err.message);
                // 最小 mock：符合 Neo4j 关系边的通用结构
                return [
                    { id: 'e1', type: 'KNOWS', source: nodeId, target: `${nodeId}-A`, direction: 'out', properties: { since: 2020 } },
                    { id: 'e2', type: 'DEPENDS_ON', source: `${nodeId}-B`, target: nodeId, direction: 'in', properties: { weight: 0.7 } },
                    { id: 'e3', type: 'RELATED', source: nodeId, target: `${nodeId}-C`, direction: 'out', properties: {} },
                ];
            }
        };

        const applyFilters = (rels)=>{
            const dir = (dirSel && dirSel.value) || 'all';
            const kw = (typeInp && typeInp.value || '').trim().toLowerCase();
            return (rels||[]).filter(r=>{
                const okDir = (dir==='all') || (r.direction===dir);
                const okType = kw ? (String(r.type||'').toLowerCase().includes(kw)) : true;
                return okDir && okType;
            });
        };

        const renderList = (rels, currentId)=>{
            if (!listBox) return;
            listBox.innerHTML = '';
            const arr = applyFilters(rels);
            if (!arr.length){
                const empty = document.createElement('div');
                empty.style.color = '#888';
                empty.textContent = '无匹配关系';
                listBox.appendChild(empty);
                setStatus('0 条');
                return;
            }
            const ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.padding = '0';
            ul.style.margin = '0';
            arr.forEach(edge=>{
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.justifyContent = 'space-between';
                li.style.padding = '6px 8px';
                li.style.borderBottom = '1px solid #f0f0f0';

                const other = (edge.source===currentId) ? edge.target : (edge.target===currentId ? edge.source : (edge.target||edge.source));
                const label = document.createElement('div');
                label.style.fontSize = '13px';
                label.innerHTML = `<strong>${edge.type||'REL'}</strong> <span style="color:#999;">(${edge.direction||''})</span><br/><span style="color:#555;">${currentId}</span> ↔ <span style="color:#555;">${other||''}</span>`;

                const go = document.createElement('button');
                go.textContent = '跳转';
                go.style.fontSize = '12px';
                go.addEventListener('click', ()=>{
                    try{
                        // 简单联动：跳转到另一端节点
                        if (other) selectAndCenter(other);
                    }catch(_){ }
                });

                li.appendChild(label);
                li.appendChild(go);
                ul.appendChild(li);
            });
            listBox.appendChild(ul);
            setStatus(`${arr.length} 条`);
        };

        let lastNodeId = null;
        let lastData = [];
        const refreshFor = async (nodeId)=>{
            lastNodeId = nodeId;
            const data = await fetchRelations(nodeId);
            lastData = data || [];
            renderList(lastData, nodeId);
        };

        // 工具条事件
        if (btnRefresh){ btnRefresh.addEventListener('click', ()=>{ if (lastNodeId) renderList(lastData, lastNodeId); }); }
        if (dirSel){ dirSel.addEventListener('change', ()=>{ if (lastNodeId) renderList(lastData, lastNodeId); }); }
        if (typeInp){ typeInp.addEventListener('input', ()=>{ if (lastNodeId) renderList(lastData, lastNodeId); }); }
        
        // 同步按钮事件
        const btnSync = document.getElementById('relation-sync-btn');
        if (btnSync){
            btnSync.addEventListener('click', async ()=>{
                if (confirm('确定要同步当前脑图数据到Neo4j数据库吗？这将替换所有已存在的脑图关系数据。')){ 
                    const success = await syncMindmapToNeo4j();
                    if (success && lastNodeId) {
                        // 同步成功后重新加载关系
                        setTimeout(async () => {
                            const newData = await fetchRelations(lastNodeId);
                            lastData = newData || [];
                            renderList(lastData, lastNodeId);
                        }, 500); // 等待一下再加载，以确保数据已经写入数据库
                    }
                }
            });
        }

        // 挂钩 mindmapController.setSelectedNode，以在节点变更时刷新关系
        const hookWhenReady = ()=>{
            try{
                const mc = window.mindmapController;
                if (!mc || typeof mc.setSelectedNode !== 'function') return false;
                if (mc.__relHooked) return true;
                const orig = mc.setSelectedNode.bind(mc);
                mc.setSelectedNode = function(nodeId){
                    try{ orig(nodeId); }catch(_){ }
                    try{ if (nodeId) refreshFor(nodeId); }catch(_){ }
                };
                mc.__relHooked = true;
                // 首次选中现有节点（若有）以加载
                try{
                    const cur = mc.selectedNode || (mc.mind?.get_selected_node && mc.mind.get_selected_node()?.id) || (mc.mind?.get_root && mc.mind.get_root()?.id);
                    if (cur) refreshFor(cur);
                }catch(_){ }
                return true;
            }catch(_){ return false; }
        };

        // 等待 jsMind 控制器就绪后挂钩
        if (typeof waitForJMReady === 'function'){
            waitForJMReady(()=>{ hookWhenReady(); });
        } else {
            // 兜底延时
            setTimeout(hookWhenReady, 400);
        }
    })();
    // =================== 关系栏最小实现 · 结束 ===================

    // =================== 标签管理投射到详情面板 ===================
    (function initTagPanelProjector(){
        const PANEL_ID = 'tag-panel';
        const LIST_ID = 'tag-list';
        const EMPTY_ID = 'tag-panel-empty';
        const TAG_STATE_KEY = 'mm_tag_state_v1';

        const getRootId = ()=>{
            try{ const mc = window.mindmapController; return mc?.mind?.get_root && mc.mind.get_root()?.id; }catch(_){ return null; }
        };
        const loadAllTagState = ()=>{ try{ const raw = localStorage.getItem(TAG_STATE_KEY); const p = raw? JSON.parse(raw): {}; return (p && typeof p==='object')? p: {}; }catch(_){ return {}; } };
        const saveAllTagState = (obj)=>{ try{ localStorage.setItem(TAG_STATE_KEY, JSON.stringify(obj||{})); }catch(_){ } };
        const loadTagStateFor = (rid)=>{ const all = loadAllTagState(); return (rid && all[rid] && Array.isArray(all[rid].selected))? all[rid].selected: []; };
        const saveTagStateFor = (rid, selectedIds)=>{ if (!rid) return; const all = loadAllTagState(); all[rid] = { selected: Array.from(new Set(selectedIds||[])) }; saveAllTagState(all); };

        const findNodeByTopic = (root, topic)=>{
            if (!root) return null;
            if ((root.topic||'') === topic) return root;
            const cs = root.children||[];
            for (let i=0;i<cs.length;i++){
                const hit = findNodeByTopic(cs[i], topic);
                if (hit) return hit;
            }
            return null;
        };

        const parseGroups = (tagRoot)=>{
            const groups = [];
            if (!tagRoot) return groups;
            (tagRoot.children||[]).forEach(g=>{
                const gname = g.topic || '';
                const tags = (g.children||[]).map(t=>({ id: t.id, name: t.topic||'' }));
                groups.push({ name: gname, tags });
            });
            return groups;
        };

        const clearList = ()=>{
            const list = document.getElementById(LIST_ID);
            if (list){ list.innerHTML=''; }
        };

        const applyPersistenceOverRendered = ()=>{
            const list = document.getElementById(LIST_ID);
            const empty = document.getElementById(EMPTY_ID);
            if (!list) return;
            // 恢复：支持 data-tag（名称）与 data-tagId（节点ID）两种格式
            const rid = getRootId();
            const saved = new Set(loadTagStateFor(rid));
            const chips = list.querySelectorAll('.tag-chip');
            if (!chips || chips.length===0){ if (empty) empty.style.display=''; return; }
            if (empty) empty.style.display='none';
            chips.forEach(chip=>{
                const id = chip.getAttribute('data-tagId');
                const name = chip.getAttribute('data-tag') || chip.textContent || '';
                const key = id || name;
                if (key && saved.has(key)) chip.classList.add('active');
            });
            // 绑定一次性委托：点击后保存（不干扰控制器原有点击逻辑）
            if (!list._persistBound){
                list.addEventListener('click', (e)=>{
                    const chip = e.target.closest('.tag-chip');
                    if (!chip) return;
                    try{
                        const box = list;
                        const actives = box.querySelectorAll('.tag-chip.active');
                        const keys = Array.from(actives).map(x=> x.getAttribute('data-tagId') || x.getAttribute('data-tag') || x.textContent || '').filter(Boolean);
                        saveTagStateFor(getRootId(), keys);
                    }catch(_){ }
                });
                list._persistBound = true;
            }
        };

        const projectFromMind = ()=>{
            try{
                const mc = window.mindmapController;
                if (!mc || !mc.mind || typeof mc.renderTagPanelFromSource !== 'function') return;
                // 始终从“系统标签脑图”渲染标签面板
                mc.renderTagPanelFromSource({ mode: 'system' });
                // 覆盖上层：应用持久化的激活态并绑定保存
                applyPersistenceOverRendered();
            }catch(_){ }
        };

        // 初次 mind 就绪后投射一次
        if (typeof waitForJMReady === 'function'){
            waitForJMReady(()=>{
                setTimeout(projectFromMind, 50);
                // Hook 控制器的渲染：确保每次渲染后都叠加持久化状态
                try{
                    const mc = window.mindmapController;
                    if (mc && typeof mc.renderTagPanelFromMind === 'function' && !mc.__tagHooked){
                        const orig = mc.renderTagPanelFromMind.bind(mc);
                        mc.renderTagPanelFromMind = function(){
                            try{ orig(); }catch(_){ }
                            try{ applyPersistenceOverRendered(); }catch(_){ }
                        };
                        mc.__tagHooked = true;
                    }
                }catch(_){ }
                // 监听异常清空：若标签列表被意外清空，自动恢复
                try{
                    const list = document.getElementById(LIST_ID);
                    if (list && !list.__tagObs){
                        const obs = new MutationObserver(()=>{
                            try{
                                const hasChips = list.querySelector('.tag-chip');
                                if (!hasChips){ projectFromMind(); }
                            }catch(_){ }
                        });
                        obs.observe(list, { childList: true, subtree: true });
                        list.__tagObs = obs;
                    }
                }catch(_){ }
            });
        } else {
            setTimeout(projectFromMind, 200);
        }

        // 监听：导入脑图、新建、以及卡片点击时都投射一次
        try{
            window.addEventListener('mindmap:imported', ()=> setTimeout(projectFromMind, 60));
        }catch(_){ }
        try{
            const newBtn = document.getElementById('mindmap-new-btn');
            newBtn && newBtn.addEventListener('click', ()=> setTimeout(projectFromMind, 200));
        }catch(_){ }
        try{
            const $catalog = document.getElementById('project-catalog');
            $catalog && $catalog.addEventListener('click', (e)=>{
                const main = e.target.closest('.proj-card-main');
                if (main) setTimeout(projectFromMind, 120);
            });
        }catch(_){ }
        try{
            window.addEventListener('tags:system_pack_changed', ()=> setTimeout(projectFromMind, 50));
        }catch(_){ }
    })();
    // =================== 标签管理投射到详情面板 · 结束 ===================

    // =================== 脑图自检/重渲染（免控制台） ===================
    (function initMindmapDiagnostics(){
        const statusEl = document.getElementById('mindmap-status');
        const btnCheck = document.getElementById('mindmap-selfcheck-btn');
        const btnRerender = document.getElementById('mindmap-rerender-btn');

        const getNodeCount = ()=>{
            try{ return document.querySelectorAll('.jmnode').length; }catch(_){ return 0; }
        };
        const getDragInfo = ()=>{
            try{
                const html5 = document.querySelectorAll('.jmnode[draggable="true"]').length;
                const soft = !!(window.mindmapController && window.mindmapController._softDragEnabled);
                // 优先展示HTML5层数量，其次软拖拽标志
                if (html5 > 0) return `HTML5:${html5}`;
                return soft ? 'Soft:ON' : 'Soft:OFF';
            }catch(_){ return 'N/A'; }
        };
        const updateStatus = (extraMsg)=>{
            try{
                const jsMindOk = (typeof window.jsMind === 'function') || (typeof window.jsMind === 'object');
                const mc = window.mindmapController;
                const jm = mc && mc.mind;
                const hasRoot = !!(jm && typeof jm.get_root === 'function' && jm.get_root());
                const nodes = getNodeCount();
                const drag = getDragInfo();
                const msg = `JM:${jsMindOk?'OK':'X'} | Root:${hasRoot?'OK':'X'} | Nodes:${nodes} | Drag:${drag}` + (extraMsg?` | ${extraMsg}`:'');
                if (statusEl){ statusEl.textContent = msg; }
            }catch(_){ if (statusEl){ statusEl.textContent = '状态: N/A'; } }
        };

        const doSelfCheck = ()=>{
            try{
                const mc = window.mindmapController;
                // 重新启用拖拽层（若存在）
                try{ mc && typeof mc.ensureDragEnabled === 'function' && mc.ensureDragEnabled(); }catch(_){ }
                try{ mc && mc._enableHtml5DnDLayer && mc._enableHtml5DnDLayer(); }catch(_){ }
                // 根节点居中，便于可见性验证
                try{ const rid = mc?.mind?.get_root && mc.mind.get_root()?.id; if (rid) selectAndCenter(rid); }catch(_){ }
            }catch(_){ }
            // 延时读取以等待DOM更新
            setTimeout(()=> updateStatus('自检完成'), 60);
        };

        const doRerender = ()=>{
            try{
                const mc = window.mindmapController;
                if (mc && typeof mc.renderMindmap === 'function') mc.renderMindmap();
            }catch(_){ }
            setTimeout(()=>{
                // 渲染后再次确保拖拽层
                try{ const mc = window.mindmapController; mc && mc._enableHtml5DnDLayer && mc._enableHtml5DnDLayer(); }catch(_){ }
                updateStatus('已重渲染');
            }, 80);
        };

        if (btnCheck){ btnCheck.addEventListener('click', doSelfCheck); }
        if (btnRerender){ btnRerender.addEventListener('click', doRerender); }

        // jsMind 就绪后自动自检一次
        if (typeof waitForJMReady === 'function'){
            waitForJMReady(()=>{ updateStatus('初始'); setTimeout(doSelfCheck, 30); });
        } else {
            setTimeout(()=>{ updateStatus('初始'); doSelfCheck(); }, 200);
        }
    })();
});
