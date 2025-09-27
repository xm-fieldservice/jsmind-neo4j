/* jsmind-controller.js
 * 将脑图从 G6 迁移到 jsMind 的控制器，尽量保持与原 MindmapController 同名/同接口，避免改动其它脚本。
 */
(function(){
  class MindmapController {
    constructor() {
      this.containerId = 'mindmap-container';
      this.localStorageKey = 'mindmap_data_v1'; // 兼容原有 Key（将按根ID动态重写）
      this.rootId = null; // 根ID
      this.perMindStorageKey = null; // 根据根ID动态生成的存储键

      // JSON底座增量同步相关
      this._jsonBaseSyncTimer = null; // 同步防抖定时器
      this._lastJsonBaseHash = null; // 上次同步的数据哈希

      // 初始化持久化管理器（异步）
      this._initPersistenceManager();

      // 异步加载数据
      this._loadInitialData();
      this.mind = null; // jsMind 实例
      this.clipboard = null;
      this.selectedNode = null;
      this.debugMessages = []; // 调试信息存储
      // 全图快照持久化键（与 script.js 的 LS_KEY_FULL 保持一致）
      this.fullCacheKey = '__mind_full_cache_v1';
      // 保存防抖定时器
      this._saveDebounceTimer = null;
      // 拖拽开关（仅使用原生拖拽，默认开启，可通过 enableDragging()/disableDragging() 控制）
      this.dragEnabled = true;
      // —— 快照配置 ——
      this._snapConfig = {
        intervalMs: 10 * 60 * 1000, // 默认10分钟
        maxCount: 5                  // 默认保留5份（上限10）
      };
      this._snapTimer = null;
      // 标签面板状态
      this.tagGroups = [];
      this.activeTagGroup = null;
      this.tagGroupThemes = {}; // 分组 -> 主题类名 映射（如 theme-yellow/theme-green/theme-blue）
      this.dom = {
        titleInput: document.getElementById('detail-title-input'),
        contentEditor: document.getElementById('detail-content-editor'),
        contentPreview: document.getElementById('detail-content-preview'),
        nodeIdText: document.getElementById('detail-node-id'),
        fileInput: document.getElementById('fileInputMindmap'),
        attachBtn: document.getElementById('detail-attachments-upload'),
        attachList: document.getElementById('detail-attachments-list'),
        attachInput: document.getElementById('fileInputAttachment'),
        toast: document.getElementById('mindmap-toast'),
        contextMenu: document.getElementById('mindmap-contextmenu'),
        containerEl: document.getElementById('mindmap-container'),
      };
      // 内容编辑脏标记：用于占位符模式下避免空值误覆盖
      this._contentDirty = false;
      // 拖拽诊断代码已移除 - jsMind 0.8.7 原生拖拽无需诊断
      this.bindDetailEvents();
      // 异步初始化，避免阻塞构造函数
      this.init().catch(err => console.error('[MindmapController] 初始化失败:', err));
      
      // 绑定测试按钮
      this.bindTestButtons();
      
      // 启动定时快照
      try { this.startSnapshotScheduler(); } catch(_) { /* ignore */ }
    }

    // 初始化存储系统（简化版 - 只使用AutogenUnifiedStorage）
    async _initPersistenceManager() {
      try {
        // 使用AutogenUnifiedStorage统一存储系统
        if (window.AutogenUnifiedStorage) {
          this.autogenStorage = window.AutogenUnifiedStorage;
          console.log('[MindmapController] ✅ 使用AutogenUnifiedStorage统一存储系统');
        } else {
          console.warn('[MindmapController] AutogenUnifiedStorage不可用，将使用传统localStorage');
          this.autogenStorage = null;
        }
      } catch (error) {
        console.error('[MindmapController] 存储系统初始化失败:', error);
        this.autogenStorage = null;
      }
    }

    // 获取当前脑图ID
    _getCurrentMindId() {
      try {
        const rootId = (this.mind && this.mind.get_root && this.mind.get_root().id) || 
                      (this.data && this.data.id);
        return rootId ? String(rootId) : 'root';
      } catch (error) {
        return 'root';
      }
    }

    // 获取存储系统状态（简化版）
    getStorageSystemStatus() {
      return {
        autogenStorage: {
          available: !!this.autogenStorage,
          type: 'AutogenUnifiedStorage'
        },
        localStorage: {
          available: typeof Storage !== 'undefined',
          keys: this._getLocalStorageKeys()
        }
      };
    }

    // 获取相关的localStorage键
    _getLocalStorageKeys() {
      const keys = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('mm:') || key.includes('mindmap'))) {
            keys.push(key);
          }
        }
      } catch (error) {
        console.warn('[MindmapController] 获取localStorage键失败:', error);
      }
      return keys;
    }


    // 统一存储保存方法（完全使用AutogenUnifiedStorage）
    async _saveWithUnifiedStorage(jmData) {
      // 确保AutogenUnifiedStorage可用
      if (!this.autogenStorage) {
        console.error('[MindmapController] AutogenUnifiedStorage不可用，无法保存数据');
        return false;
      }
      
      try {
        const success = await this.autogenStorage.store('mindmap', this.localStorageKey, jmData);
        if (success) {
          if (Math.random() < 0.1) { // 仅10%概率输出日志
            console.log('[MindmapController] ✅ 已保存到AutogenUnifiedStorage:', this.localStorageKey);
          }
          return true;
        } else {
          console.error('[MindmapController] AutogenUnifiedStorage保存失败');
          return false;
        }
      } catch (error) {
        console.error('[MindmapController] AutogenUnifiedStorage保存异常:', error);
        return false;
      }
    }

    // 增量同步到JSON底座（方案A：轻量级增量同步）
    async _syncToJsonBase(jmData, mindKey) {
      try {
        // 防抖机制：避免频繁同步
        if (!this._jsonBaseSyncTimer) {
          this._jsonBaseSyncTimer = setTimeout(async () => {
            await this._performJsonBaseSync(jmData, mindKey);
            this._jsonBaseSyncTimer = null;
          }, 2000); // 2秒防抖
        }
      } catch (error) {
        console.warn('[MindmapController] JSON底座同步调度失败:', error);
      }
    }

    // 执行JSON底座同步
    async _performJsonBaseSync(jmData, mindKey) {
      try {
        // 检查是否需要同步（简单的变更检测）
        const currentHash = this._calculateDataHash(jmData);
        const lastHash = this._lastJsonBaseHash;
        
        if (currentHash === lastHash) {
          // 数据未变更，跳过同步
          return;
        }

        // 构建脑图数据结构
        const mindmapEntry = {
          id: mindKey,
          name: (this.data && (this.data.label || this.data.topic)) || '未命名项目',
          data: jmData,
          last_modified: new Date().toISOString(),
          content_hash: currentHash
        };

        // 调用现有的后端API进行同步
        const response = await fetch('http://localhost:5001/api/sync-mindmap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mindmap: mindmapEntry,
            sync_mode: 'incremental'
          })
        });

        if (response.ok) {
          this._lastJsonBaseHash = currentHash;
          if (Math.random() < 0.2) { // 20%概率输出日志
            console.log('[MindmapController] ✅ JSON底座增量同步成功:', mindKey);
          }
          
          // 触发同步完成事件
          if (window.AutogenEventBus) {
            window.AutogenEventBus.emit('mindmap:jsonBaseSynced', {
              mindKey,
              hash: currentHash,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          console.warn('[MindmapController] JSON底座同步失败:', response.status, response.statusText);
        }

      } catch (error) {
        // 网络错误或API不可用时，静默处理，不影响正常保存
        if (Math.random() < 0.1) { // 10%概率输出警告
          console.warn('[MindmapController] JSON底座同步异常（不影响本地保存）:', error.message);
        }
      }
    }

    // 计算数据哈希值（用于变更检测）
    _calculateDataHash(data) {
      try {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // 转换为32位整数
        }
        return hash.toString(16);
      } catch (error) {
        return 'hash_error_' + Date.now();
      }
    }

    // 异步加载初始数据
    async _loadInitialData() {
      try {
        const loadedData = await this.loadMindmapFromStorage();
        this.data = loadedData || this.getDefaultData();
        
        // 数据加载完成后，如果已经初始化了mind实例，重新渲染
        if (this.mind) {
          this.renderMindmap();
        }
      } catch (error) {
        console.error('[MindmapController] 初始数据加载失败:', error);
        this.data = this.getDefaultData();
      }
    }

    // 绑定测试按钮
    bindTestButtons(){
      try{
        const testBtn = document.getElementById('test-export-all-btn');
        if (testBtn && !testBtn.dataset.mmWired){
          testBtn.addEventListener('click', ()=>{
            this.showToast('开始保存全部脑图（JSON格式）...');
            this.exportAllMindmapsWithPicker();
          });
          testBtn.dataset.mmWired = '1';
        }
      }catch(e){
        console.warn('绑定测试按钮失败:', e);
      }
    }

    // Toast 提示方法
    showToast(message, type = 'info'){
      try{
        // 使用日志面板显示消息
        if (window.LogPanel){
          if (type === 'error'){
            window.LogPanel.error(`[Toast] ${message}`);
          } else {
            window.LogPanel.log(`[Toast] ${message}`);
          }
        }
        
        // 同时在控制台输出
        if (type === 'error'){
          console.error(`[MindmapController Toast] ${message}`);
        } else {
          console.log(`[MindmapController Toast] ${message}`);
        }
        
        // 简单的页面提示（可选）
        if (type === 'error'){
          // 对于错误，使用 alert 确保用户看到
          setTimeout(() => alert(`错误: ${message}`), 100);
        }
      }catch(e){
        console.warn('showToast 失败:', e);
      }
    }

    // 渲染（将内部 this.data 转为 jsMind 的 node_tree 格式）
    renderMindmap(){
      // 渲染前兜底：根标题不得为空
      try{
        if (!this.data || !this.data.label || !String(this.data.label).trim()){
          this.data = Object.assign({}, this.data, { label: '未命名项目' });
        }
      }catch(_){ this.data = this.data || { id: 'root', label: '未命名项目', children: [] }; }
      const jmData = {
        meta: { name: 'Project Mindmap', author: 'local', version: '1.0' },
        format: 'node_tree',
        data: this.toJsMindTree(this.data),
      };
      this.mind.show(jmData);
      // 在首次渲染全图后立即固化全图快照
      this.ensureFullSnapshotFromMind(jmData);
      this.ensureDragEnabled();
      // 再次补丁，确保渲染后 draggable 依赖就绪
      try { this._patchDraggableSafeguards(); } catch(_) { /* ignore */ }
      // 强制仅原生拖拽：不注入 HTML5 draggable 层
      console.log('[MindmapController] 渲染脑图完成');
      // 渲染后为未设置颜色的节点应用默认浅灰底/深色字（非强制覆盖，仅设置缺省值）
      this.applyDefaultNodeColor('#f5f5f5', '#333');
      // 渲染后同步标签面板（从脑图“标签管理”解析标签组与标签）
      this.renderTagPanelFromMind();
      // 选中当前项目根，避免残留选中指向其他项目导致找不到节点
      this.selectedNode = this.data.id;
      this.setSelectedNode(this.data.id);
      // 测试：为根节点标题追加5个emoji（纯文本显示，不依赖HTML）
      this._appendEmojisToRootForTest();
      this.scheduleAutoFit();
      // 广播渲染完成事件（供注册管理器自举）
      try{ 
        if (window.AutogenEventBus) {
          window.AutogenEventBus.emit('mindmap:rendered', { data: this.data });
        } else {
          window.dispatchEvent(new CustomEvent('mindmap:rendered', { detail: { data: this.data } }));
        }
      }catch(_){ }
    }
    // 确保拖拽已启用（仅原生拖拽；不启用软拖拽回退）
    ensureDragEnabled(){
      if (!this.dragEnabled || !this.mind) return;
      
      try {
        // jsMind 0.8.7 的 draggable-node 插件会自动启用，只需确保 editable: true
        console.log('[MindmapController] jsMind 原生拖拽已启用');
      } catch(e) {
        console.warn('[MindmapController] 拖拽启用失败:', e);
      }
    }

    // HTML5拖拽相关方法已删除 - 使用 jsMind 原生拖拽

    // 拖拽诊断功能已清除 - 使用jsMind原生拖拽，无需额外诊断

    _installDragDomProbes(){
      try{
        if (this._dragProbesInstalled) return;
        const container = this.dom && this.dom.containerEl;
        // 
        if (!container) return;
        const getNodeInfo = (el)=>{
          try{
            const n = el && el.closest ? el.closest('.jmnode') : null;
            if (!n) return { nodeid:null, cls: el && el.className || '' };
            return { nodeid: n.getAttribute('nodeid') || n.dataset.nodeid || null, cls: n.className||'' };
          }catch(_){ return { nodeid:null, cls:'' }; }
        };
        const probe = (type)=> (e)=>{
          // DOM事件探针 - 仅用于调试，不记录日志
          const info = getNodeInfo(e.target);
          console.debug(`[DragProbe] ${type}:`, {
            nodeid: info.nodeid,
            cls: info.cls,
            btn: e.button,
            x: e.clientX,
            y: e.clientY
          });
        };
        // 拖拽相关事件
        container.addEventListener('dragstart', probe('dragstart'));
        container.addEventListener('dragover', probe('dragover'));
        container.addEventListener('dragend', probe('dragend'));
        container.addEventListener('drop', probe('drop'));
        // 鼠标事件（辅助定位是否事件根本未触发）
        container.addEventListener('mousedown', probe('mousedown'));
        container.addEventListener('mousemove', probe('mousemove'));
        container.addEventListener('mouseup', probe('mouseup'));
        this._dragProbesInstalled = true;
      }catch(_){ /* ignore */ }
    }

    // 软拖拽（回退）：按下节点 -> 在另一节点上释放 -> 将其作为目标的最后一个子节点
    enableSoftDrag(){
      try{
        if (this._softDragInstalled) return;
        const container = this.dom && this.dom.containerEl;
        if (!container) return;
        this._softDragInstalled = true;
        this._softDrag = { active:false, startX:0, startY:0, sourceId:null };
        this._softDragHandlers = this._softDragHandlers || {};

        const getNodeId = (el)=>{
          let cur = el;
          while(cur && cur !== container){
            if (cur.classList && cur.classList.contains('jmnode')){
              // jsMind 节点元素通常带有 nodeid 属性
              const nid = cur.getAttribute('nodeid') || cur.dataset.nodeid || '';
              return nid || null;
            }
            cur = cur.parentNode;
          }
          return null;
        };

        const onMouseDown = (e)=>{
          const nid = getNodeId(e.target);
          if (!nid) return;
          this._softDrag.active = true;
          this._softDrag.sourceId = nid;
          this._softDrag.startX = e.clientX || 0;
          this._softDrag.startY = e.clientY || 0;
        };
        container.addEventListener('mousedown', onMouseDown);
        this._softDragHandlers.onMouseDown = onMouseDown;

        const onMouseUp = (e)=>{
          if (!this._softDrag || !this._softDrag.active) return;
          const dx = Math.abs((e.clientX||0) - this._softDrag.startX);
          const dy = Math.abs((e.clientY||0) - this._softDrag.startY);
          const movedEnough = (dx+dy) > 6; // 阈值：避免点击误触
          const srcId = this._softDrag.sourceId;
          this._softDrag.active = false;
          this._softDrag.sourceId = null;
          if (!movedEnough) return;
          const targetId = getNodeId(e.target);
          if (!targetId || targetId === srcId) return;
          // 执行移动：作为目标的最后一个子节点
          this.moveNodeTo(srcId, targetId, 'last');
        };

        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('dragend', onMouseUp);
        this._softDragHandlers.onMouseUp = onMouseUp;
      }catch(_){ /* ignore */ }
    }

    // 卸载软拖拽与相关监听
    disableSoftDrag(){
      try{
        if (!this._softDragInstalled) return;
        const container = this.dom && this.dom.containerEl;
        const h = this._softDragHandlers || {};
        if (container && h.onMouseDown) container.removeEventListener('mousedown', h.onMouseDown);
        if (h.onMouseUp) {
          document.removeEventListener('mouseup', h.onMouseUp);
          document.removeEventListener('dragend', h.onMouseUp);
        }
        this._softDragInstalled = false;
        this._softDragHandlers = {};
        this._softDrag = null;
      }catch(_){ /* ignore */ }
    }

    // 对外：开启/关闭拖拽
    enableDragging(){
      this.dragEnabled = true;
      this.ensureDragEnabled();
      this.showToast && this.showToast('拖拽已开启');
    }
    disableDragging(){
      this.dragEnabled = false;
      this.ensureDragEnabled();
      this.showToast && this.showToast('拖拽已关闭');
    }

    // —— 节点移动（编程式） ——
    // 将 nodeId 移动到 targetParentId 的 children 中
    // position: 'last' | 'first' | number（索引，0基）
    moveNodeTo(nodeId, targetParentId, position = 'last'){
      try{
        if (!nodeId || !targetParentId) { this.showToast('缺少参数'); return; }
        if (nodeId === this.data.id){ this.showToast('根节点不可移动'); return; }
        if (nodeId === targetParentId){ this.showToast('不能将节点移动到自身'); return; }
        // 不能移动到其子孙节点之下
        if (this._isDescendant(nodeId, targetParentId)) { this.showToast('不能将父节点移动到其子孙节点下'); return; }

        const node = this.findNode(nodeId);
        const oldParent = this.findParentNode(nodeId);
        const newParent = this.findNode(targetParentId);
        if (!node || !oldParent || !newParent){ this.showToast('未找到相关节点'); return; }

        // 从旧父节点移除
        const oldIdx = oldParent.children.findIndex(c=>c.id===nodeId);
        if (oldIdx < 0) return;
        const [moving] = oldParent.children.splice(oldIdx, 1);

        // 插入到新父节点指定位置
        newParent.children = newParent.children || [];
        let insertIndex;
        if (position === 'first') insertIndex = 0;
        else if (position === 'last') insertIndex = newParent.children.length;
        else if (typeof position === 'number' && position >= 0) insertIndex = Math.min(position, newParent.children.length);
        else insertIndex = newParent.children.length;
        newParent.children.splice(insertIndex, 0, moving);

        // 若新父节点在画布中是折叠状态，则先展开并同步 expanded
        try{
          const jmP = this.mind && this.mind.get_node(targetParentId);
          if (jmP && jmP.expanded === false){ this.mind.expand_node(jmP); newParent.expanded = true; }
        }catch(_){ /* ignore */ }

        // 重新渲染以确保顺序与父子关系立即反映
        this.renderMindmap();
        this.saveMindmapToStorage();
        this.setSelectedNode(nodeId);
        this.showToast('节点已移动');
      }catch(e){
        console.error('[MindmapController] moveNodeTo异常:', e);
        this.showToast('移动失败', 'error');
      }
    }

    // 判断 a 是否是 b 的祖先（用于防循环）
    _isDescendant(ancestorId, nodeId){
      const parent = this.findParentNode(nodeId);
      if (!parent) return false;
      if (parent.id === ancestorId) return true;
      return this._isDescendant(ancestorId, parent.id);
    }

    // 默认数据（与原结构保持一致）
    getDefaultData(){
      const uid = `root-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      return {
        id: uid,
        label: '项目脑图',
        content: '# 根节点\n\n在此编写内容...',
        expanded: true,
        children: [
          { id: 'n1', label: '需求', content: '需求说明...', children: [] },
          { id: 'n2', label: '设计', content: '设计说明...', children: [] },
          { id: 'n3', label: '开发', content: '开发计划...', children: [] },
        ],
      };
    }

    // —— 初始化与渲染 ——
    async init(){
      this._debugLog('初始化开始');
      
      // 检查容器是否存在
      const container = document.getElementById(this.containerId);
      if (!container) {
        this._debugLog('错误: 容器不存在 - ' + this.containerId);
        return;
      }
      this._debugLog('容器找到: ' + this.containerId);
      
      // 检查 jsMind 是否加载
      if (typeof jsMind === 'undefined') {
        this._debugLog('错误: jsMind 库未加载');
        return;
      }
      this._debugLog('jsMind 库已加载');
      
      this.createMind();
      
      if (!this.mind) {
        this._debugLog('错误: jsMind 实例创建失败');
        return;
      }
      this._debugLog('jsMind 实例创建成功');
      
      const loaded = await this.showSavedMindIfAny();
      if (!loaded) {
        this._debugLog('未找到保存数据，使用默认数据');
        this.renderMindmap();
      } else {
        this._debugLog('加载保存数据成功');
      }
      
      this.observeContainerResize();
      this.wireDragSync();
      this.wireToolbar();
      this.wireContextMenu();
      this.wireKeyboardShortcuts();
      this.wireBeforeUnload();
      this._applyEditorSizeFromStorage().catch(err => console.error('编辑器尺寸加载失败:', err));
      this.wireContentEditorResizePersistence();
      this._initLogPanelControls();
      
      this._debugLog('初始化完成');
    }


    // —— 持久化：加载并显示 ——
    async showSavedMindIfAny(){
      try {
        // 1) 优先：每个脑图的独立键 mm:{mindKey}:data
        try{
          const mk = (function(){
            // 统一解析 mindKey：仅使用当前画布根ID，避免 __mindFullCache 的滞后/串扰问题
            try{ const rid = (this.mind && this.mind.get_root && this.mind.get_root().id) || (this.data && this.data.id); if (rid) return String(rid); }catch(_){ }
            return 'root';
          }).call(this);
          // 使用AutogenUnifiedStorage替代localStorage直接调用
          const savedPer = await window.AutogenUnifiedStorage.retrieve('mindmap', `${mk}:data`);
          if (savedPer){
            if (savedPer && savedPer.format && savedPer.data){
              this.mind.show(savedPer);
              // 加载后回填并同步
              try { this.syncJsMindToData(); } catch(_){ }
              try { this.saveMindmapToStorage(); } catch(_){ }
              // 基础渲染附加步骤
              this.ensureDragEnabled();
              this.applyDefaultNodeColor('#f5f5f5', '#333');
              this.renderTagPanelFromMind();
              const selPer = (this.mind.get_selected_node() && this.mind.get_selected_node().id) || (this.mind.get_root() && this.mind.get_root().id);
              if (selPer) this.setSelectedNode(selPer);
              try{ const rid = (this.mind.get_root && this.mind.get_root().id); if (rid){ this.mind.center_node(rid); } }catch(_){ }
              this._appendEmojisToRootForTest();
              this.scheduleAutoFit();
              try{ console.log('[PERSIST][LOAD] per-mind ->', { mind_id: mk, perKey: `mm:${mk}:data` }); }catch(_){ }
              return true;
            }
          }
        }catch(_){ }

        // 2) 回退：使用旧的 mindmap_data_v1（可能是子树，但至少能显示）
        const saved = await window.AutogenUnifiedStorage.retrieve('mindmap', 'mindmap_data_v1');
        if (!saved) return false;
        if (!saved || !saved.format || !saved.data) return false;
        // 仅接受 jsMind 支持的格式
        const okFormats = ['node_tree','node_array','freemind'];
        if (okFormats.indexOf(saved.format) === -1) return false;
        this.mind.show(saved);
        // 从持久化加载后，同步固化全图快照
        this.ensureFullSnapshotFromMind(saved);
        this.ensureDragEnabled();
        console.log('[MindmapController] 已从本地存储加载脑图 (format=%s)', saved.format);
        try{ console.log('[PERSIST][LOAD] legacy ->', { legacyKey: this.localStorageKey }); }catch(_){ }
        // 渲染后应用默认颜色和标签面板等后续步骤
        // 同步内部数据结构，保持与 jsMind 一致
        this.syncJsMindToData();
        this.applyDefaultNodeColor('#f5f5f5', '#333');
        this.renderTagPanelFromMind();
        const sel = (this.mind.get_selected_node() && this.mind.get_selected_node().id) || (this.mind.get_root() && this.mind.get_root().id);
        if (sel) this.setSelectedNode(sel);
        try{ const rid = (this.mind.get_root && this.mind.get_root().id); if (rid){ this.mind.center_node(rid); } }catch(_){ }
        // 测试：为根节点标题追加5个emoji（纯文本显示，不依赖HTML）
        this._appendEmojisToRootForTest();
        this.scheduleAutoFit();
        return true;
      } catch(e){
        console.warn('[MindmapController] 读取本地持久化失败，回退内部渲染', e);
        return false;
      }
    }

    createMind(){
      this._debugLog('创建 jsMind 实例');
      
      const options = {
        container: this.containerId,
        editable: true,  // 启用编辑模式（包含拖拽功能）
        theme: 'primary',
        support_html: false,
        mode: 'side',
      };
      
      this._debugLog('jsMind 配置: ' + JSON.stringify(options));
      
      try {
        this.mind = new jsMind(options);
        this._debugLog('jsMind 实例创建成功 - 拖拽功能已自动启用');
      } catch(error) {
        this._debugLog('错误: jsMind 实例创建失败 - ' + error.message);
        this.mind = null;
        return;
      }
      // jsMind 0.8.7 原生拖拽无需额外配置
      // 选择事件
      this.mind.add_event_listener((type, data)=>{
        if(type === jsMind.event_type.select){
          const node = this.mind.get_selected_node();
          if (node) {
            this.selectedNode = node.id;
            // 惰性插入创建时间：仅当内容为空或全空白时
            try {
              const internal = this.findNode(node.id);
              if (internal) {
                const raw = (internal.content || '').trim();
                if (raw === ''){
                  const ts = this._formatDateTimeLocal(new Date());
                  const createdLine = this._buildCreatedLine(ts) + '\n\n';
                  internal.content = createdLine;
                  // 同步到 jsMind 节点数据
                  const jmNode = this.mind.get_node(node.id);
                  if (jmNode) {
                    jmNode.data = jmNode.data || {};
                    jmNode.data.content = internal.content;
                  }
                  // 持久化
                  this.saveMindmapToStorage();
                  // 更新右侧编辑器立即可见
                  if (this.dom.contentEditor){
                    this.dom.contentEditor.value = internal.content;
                    this.dom.contentEditor.placeholder = '';
                  }
                  this.showToast(`已添加创建时间：${ts}`);
                }
              }
            } catch(_) { /* ignore */ }
            this.updateNodeDetails(node.id);
            // 异步：若内容为空且未处于编辑脏状态，尝试从 IndexedDB 取回最新全文
            try { this._tryHydrateContentFromIDB(node.id); } catch(_) { /* ignore */ }
          }
        }
      });
    }

    // 渲染（将内部 this.data 转为 jsMind 的 node_tree 格式）
    renderMindmap(){
      this._debugLog('渲染脑图');
      
      if (!this.mind) {
        this._debugLog('错误: jsMind 实例不存在，无法渲染');
        return;
      }
      
      if (!this.data) {
        this._debugLog('错误: 数据不存在，无法渲染');
        return;
      }
      
      // 数据完整性验证和修复
      try {
        // 确保根节点有有效的标题
        if (!this.data.label || !String(this.data.label).trim()) {
          this.data.label = this.data.id && this.data.id.startsWith('root-') ? '项目脑图' : '未命名项目';
          console.warn(`[MindmapController] 修复根节点空标题: ${this.data.id} -> ${this.data.label}`);
        }
        
        // 确保根节点有ID
        if (!this.data.id) {
          this.data.id = `root-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
          console.warn(`[MindmapController] 修复根节点缺失ID: -> ${this.data.id}`);
        }
        
        // 确保children数组存在
        if (!Array.isArray(this.data.children)) {
          this.data.children = [];
          console.warn(`[MindmapController] 修复根节点缺失children数组`);
        }
        
      } catch (error) {
        console.error('[MindmapController] 数据修复失败:', error);
        // 创建默认数据
        this.data = {
          id: `root-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          label: '项目脑图',
          content: '创建: ' + new Date().toLocaleString(),
          children: []
        };
        console.warn('[MindmapController] 已创建默认数据结构');
      }
      
      this._debugLog('数据根ID: ' + (this.data.id || '无'));
      this._debugLog('数据标签: ' + (this.data.label || '无'));
      
      // 转换为jsMind格式
      const convertedData = this.toJsMindTree(this.data);
      if (!convertedData) {
        console.error('[MindmapController] 数据转换失败，无法渲染');
        return;
      }
      
      const jmData = {
        meta: { name: 'Project Mindmap', author: 'local', version: '1.0' },
        format: 'node_tree',
        data: convertedData,
      };
      
      this._debugLog('jsMind 数据根ID: ' + (jmData.data && jmData.data.id || '无'));
      
      try {
        this.mind.show(jmData);
        this._debugLog('jsMind.show() 执行成功');
      } catch(error) {
        this._debugLog('错误: jsMind.show() 失败 - ' + error.message);
        return;
      }
      // 在首次渲染全图后立即固化全图快照
      this.ensureFullSnapshotFromMind(jmData);
      this.ensureDragEnabled();
      // 再次补丁，确保渲染后 draggable 依赖就绪
      try { this._patchDraggableSafeguards(); } catch(_) { /* ignore */ }
      // 强制仅原生拖拽：不注入 HTML5 draggable 层
      console.log('[MindmapController] 渲染脑图完成');
      // 渲染后为未设置颜色的节点应用默认浅灰底/深色字（非强制覆盖，仅设置缺省值）
      this.applyDefaultNodeColor('#f5f5f5', '#333');
      // 渲染后同步标签面板（从脑图“标签管理”解析标签组与标签）
      this.renderTagPanelFromMind();
      // 选中当前选中节点或根
      const sel = this.selectedNode || this.data.id;
      this.setSelectedNode(sel);
      // 测试：为根节点标题追加5个emoji（纯文本显示，不依赖HTML）
      this._appendEmojisToRootForTest();
      this.scheduleAutoFit();
      // 广播渲染完成事件（供注册管理器自举）
      try{ 
        if (window.AutogenEventBus) {
          window.AutogenEventBus.emit('mindmap:rendered', { data: this.data });
        } else {
          window.dispatchEvent(new CustomEvent('mindmap:rendered', { detail: { data: this.data } }));
        }
      }catch(_){ }
    }

    // 拖拽安全补丁已移除 - jsMind 0.8.7 原生拖拽无需补丁

    // 异步从 IndexedDB 读取该节点的最新全文，若内部内容为空且未脏，则回填并持久化
    async _tryHydrateContentFromIDB(nodeId){
      try{
        if (!nodeId || this._contentDirty) return;
        const internal = this.findNode(nodeId);
        const current = (internal && (internal.content||'').trim()) || '';
        if (current) return; // 已有内容则不覆盖
        // 内容恢复功能已简化，不再依赖外部服务
        // 持久化
        this.saveMindmapToStorage();
        this.showToast && this.showToast('已从本地内容库恢复全文');
      }catch(e){ /* ignore */ }
    }

    // 将当前 jsMind 的全图快照固化到内存与 localStorage
    ensureFullSnapshotFromMind(snapshot){
  try{
    if (!this.mind || typeof this.mind.get_data !== 'function') return;
    const exported = this.mind.get_data('node_tree');
    const full = snapshot && snapshot.format ? snapshot : exported;
    if (!full || !full.data) return;
    const copy = JSON.parse(JSON.stringify(full));
    // 注意：不再设置 window.__mindFullCache，避免全局状态干扰保存ID解析
    try { 
      if (this.autogenStorage) {
        this.autogenStorage.store('snapshot', this.fullCacheKey, copy).catch(() => {});
      }
    } catch(_) { /* ignore */ }
    try{ console.log('[PERSIST][SNAPSHOT] fullCache updated ->', { key: this.fullCacheKey, mind_id: copy && copy.meta && copy.meta.mind_id, root: copy && copy.data && copy.data.id }); }catch(_){ }
  }catch(_){ /* ignore */ }
}

    // 为所有未设置颜色的节点应用默认颜色（浅灰底/深色字）。仅当节点无自定义颜色时才设置。
    applyDefaultNodeColor(defaultBg, defaultFg){
      try{
        const exported = this.mind.get_data('node_tree');
        const walk = (node)=>{
          if (!node) return;
          const hasBg = !!(node.data && node.data['background-color']);
          const hasFg = !!(node.data && node.data['foreground-color']);
          if (!hasBg || !hasFg){
            // 只在缺省时设置，避免覆盖用户或主题已定义的颜色
            this.mind.set_node_color(node.id, hasBg ? null : defaultBg, hasFg ? null : defaultFg);
          }
          if (node.children && node.children.length){ node.children.forEach(walk); }
        };
        if (exported && exported.data){ walk(exported.data); }
      }catch(e){ /* ignore */ }
    }


    // —— 标签面板渲染（来源可为：当前脑图 / 系统标签脑图） ——
    async renderTagPanelFromSource(opts={}){
      try{
        const mode = opts && opts.mode ? opts.mode : 'current'; // 'current' | 'system'
        if (!this.$tagGroups) this.$tagGroups = document.getElementById('tag-groups');
        if (!this.$tagList) this.$tagList = document.getElementById('tag-list');
        if (!this.$tagEmpty) this.$tagEmpty = document.getElementById('tag-panel-empty');
        if (!this.$tagGroups || !this.$tagList) return;

        // 选择数据源
        let root = null;
        if (mode === 'system'){
          // 来自系统标签脑图的 pack
          let pack = opts.systemPack || null;
          if (!pack){
            // 优先从AutogenUnifiedStorage读取
            try{ pack = await window.AutogenUnifiedStorage.retrieve('mindmap', 'SYS_TAGS:data'); }catch(_){ }
            
            // 如果localStorage没有，尝试从JSON底座API获取
            if (!pack) {
              try {
                this._loadSystemTagsFromJsonBase().then(systemPack => {
                  if (systemPack) {
                    // 异步更新标签面板
                    this.renderTagPanelFromSource({ mode: 'system', systemPack }).catch(err => console.error('标签面板更新失败:', err));
                  }
                });
              } catch(_) { }
            }
          }
          root = pack && pack.data ? pack.data : null;
        } else {
          const exported = this.mind?.get_data?.('node_tree');
          root = exported?.data || null;
        }
        const normalize = (s)=> (typeof s === 'string' ? s.trim() : '');
        const eq = (a,b)=> normalize(a) === normalize(b);
        const findByTopic = (node, topic)=>{
          if (!node) return null;
          if (eq(node.topic, topic)) return node;
          if (Array.isArray(node.children)){
            for (const c of node.children){
              const r = findByTopic(c, topic);
              if (r) return r;
            }
          }
          return null;
        };

        // 支持多种标签节点名称：优先"标签管理"，其次"系统标签"
        let tagRoot = findByTopic(root, '标签管理');
        if (!tagRoot) {
          tagRoot = findByTopic(root, '系统标签');
        }
        if (!tagRoot || !Array.isArray(tagRoot.children) || tagRoot.children.length === 0){
          this.tagGroups = [];
          this.activeTagGroup = null;
          this.tagGroupThemes = {};
          this.$tagGroups.innerHTML = '';
          this.$tagList.innerHTML = '';
          if (this.$tagEmpty) this.$tagEmpty.style.display = '';
          return;
        }

        if (this.$tagEmpty) this.$tagEmpty.style.display = 'none';
        const themeOf = (name)=>{
          const n = normalize(name);
          // 系统标签分组主题映射
          if (/^管理$/.test(n)) return 'theme-blue';
          if (/^点评$/.test(n)) return 'theme-green';
          if (/^状态$/.test(n)) return 'theme-yellow';
          // 兼容旧的分组名称
          if (/^分类$/.test(n) || /^操作$/.test(n)) return 'theme-blue';
          if (/^部门$/.test(n)) return 'theme-green';
          // 其余关键字回退
          if (/常规|normal|default/i.test(n)) return 'theme-yellow';
          if (/AI|智能|assistant/i.test(n)) return 'theme-green';
          if (/笔记|note|文档/i.test(n)) return 'theme-blue';
          // fallback：根据名称哈希简单分配，避免无主题时都同色
          const pool = ['theme-yellow','theme-green','theme-blue'];
          let h = 0; for (let i=0;i<n.length;i++){ h = (h*31 + n.charCodeAt(i))>>>0; }
          return pool[h % pool.length];
        };

        const groups = tagRoot.children.map(g=>{
          const name = normalize(g.topic || g.id);
          return {
            name,
            theme: themeOf(name),
            tags: (g.children||[]).map(t=> normalize(t.topic || t.id)).filter(Boolean)
          };
        }).filter(g=> g.name);

        // 保存分组列表（取消单选激活逻辑，左侧仅展示分组名）
        this.tagGroups = groups;
        this.activeTagGroup = null;
        // 建立主题映射
        this.tagGroupThemes = {};
        groups.forEach(g=>{ this.tagGroupThemes[g.name] = g.theme; });

        // 渲染左侧组（纯文字标签，不可点击），并在特定分组名后追加 emoji
        const emojiOf = (name)=>{
          // 系统标签分组emoji映射
          if (name === '管理') return '📋';
          if (name === '点评') return '⭐';
          if (name === '状态') return '🔄';
          // 兼容旧的分组名称
          if (name === '分类') return '📅';
          if (name === '部门') return '📚';
          if (name === '操作') return '📌';
          return '';
        };
        // 按系统标签顺序排列，兼容旧分组
        const leftOrder = ['管理','点评','状态','分类','部门','操作'];
        const groupsOrdered = groups.slice().sort((a,b)=>{
          const ia = leftOrder.indexOf(a.name);
          const ib = leftOrder.indexOf(b.name);
          const sa = ia===-1 ? Number.MAX_SAFE_INTEGER : ia;
          const sb = ib===-1 ? Number.MAX_SAFE_INTEGER : ib;
          if (sa!==sb) return sa-sb;
          return a.name.localeCompare(b.name,'zh-Hans-CN');
        });
        this.$tagGroups.innerHTML = groupsOrdered.map(g=>{
          const classes = ['tag-group-btn', g.theme].join(' ');
          const emoji = emojiOf(g.name);
          const emojiHtml = emoji ? `<span class=\"tag-group-emoji\" aria-hidden=\"true\">${emoji}</span>` : '';
          return `<button class=\"${classes}\"><span class=\"tag-group-name\">${g.name}</span>${emojiHtml}</button>`;
        }).join('');

        // 渲染右侧：一次性展示所有分组下的全部标签
        this.renderTagList();
      }catch(e){ /* ignore */ }
    }

    // 兼容旧接口：始终从"系统标签脑图"解析，与script.js保持一致
    renderTagPanelFromMind(){
      try{ this.renderTagPanelFromSource({ mode: 'system' }).catch(err => console.error('标签面板渲染失败:', err)); }catch(_){ }
    }

    // 从JSON底座加载系统标签数据（使用标准查询服务）
    async _loadSystemTagsFromJsonBase() {
      try {
        // 使用JsonBaseQueryService获取系统标签
        if (window.JsonBaseQueryService) {
          const systemTagsResult = await window.JsonBaseQueryService.getSystemTags();
          if (systemTagsResult) {
            console.log('[TagPanel] 从JSON底座加载系统标签:', systemTagsResult.source.name);
            return systemTagsResult;
          }
        }
        
        console.warn('[TagPanel] JsonBaseQueryService不可用或未找到系统标签');
        return null;
      } catch (error) {
        console.warn('[TagPanel] 从JSON底座加载系统标签失败:', error);
        return null;
      }
    }

    // 渲染右侧标签列表：
    // - 当未提供 groupName 时，展示所有分组下的全部标签（去重）
    // - 当提供 groupName 时，仅展示该分组
    renderTagList(groupName){
      if (!this.$tagList) return;
      if (!this.$tagList) return;
      const groups = this.tagGroups || [];
      let tagItems = [];
      if (groupName){
        const g = groups.find(x=> x.name === groupName);
        const theme = g ? g.theme : (this.tagGroupThemes[groupName] || '');
        const tags = g ? g.tags : [];
        if (!tags.length){
          this.$tagList.innerHTML = '<div class="tag-empty">此分组暂无标签</div>';
          return;
        }
        tagItems = tags.map(t=>({ name:t, theme }));
      } else {
        // 分组行渲染：按系统标签顺序，每行=左侧分组名+emoji，右侧chips
        const order = ['管理','点评','状态','分类','部门','操作'];
        const preferred = {
          '管理': ['目标','规划','项目','议题','日程'],
          '点评': ['里程碑','节点','难点'],
          '状态': ['计划','发布','进行','验收','中断'],
          // 兼容旧分组
          '分类': ['项目','笔记','任务'],
          '部门': ['软件','贝壳','内务'],
          '操作': ['完成','工作区','疑难','里程碑','收藏']
        };
        const emojiOf = (name)=>{
          // 系统标签分组emoji映射
          if (name === '管理') return '📋';
          if (name === '点评') return '⭐';
          if (name === '状态') return '🔄';
          // 兼容旧的分组名称
          if (name === '分类') return '📅';
          if (name === '部门') return '📚';
          if (name === '操作') return '📌';
          return '';
        };
        const htmlRows = [];
        order.forEach(name=>{
          const g = groups.find(x=> x.name === name);
          if (!g) return; // 如果不存在该组则跳过
          const theme = g.theme;
          const list = Array.isArray(g.tags) ? g.tags.slice() : [];
          // 先按首选顺序过滤排列，再接上其余
          const pref = preferred[name] || [];
          const setPref = new Set(pref);
          const a = pref.filter(t=> list.includes(t));
          const b = list.filter(t=> !setPref.has(t));
          const finalTags = a.concat(b);
          const emojis = emojiOf(name);
          const chipsHtml = finalTags.map(t=>`<span class=\"tag-chip ${theme}\" data-tag=\"${t}\">${t}</span>`).join('');
          const row = `
            <div class=\"tag-row\">
              <div class=\"tag-row-label ${theme}\"><span class=\"tag-group-name\">${name}</span>${emojis ? `<span class=\\"emoji\\" aria-hidden=\\"true\\">${emojis}</span>` : ''}</div>
              <div class=\"tag-row-chips\">${chipsHtml}</div>
            </div>`;
          htmlRows.push(row);
        });
        if (!htmlRows.length){
          this.$tagList.innerHTML = '<div class="tag-empty">暂无可用标签</div>';
          return;
        }
        this.$tagList.innerHTML = htmlRows.join('');
        // 绑定点击事件在下方统一处理
        tagItems = []; // 已直接写入DOM
      }
      if (tagItems.length){
        this.$tagList.innerHTML = tagItems.map(it=>`<span class=\"tag-chip ${it.theme}\" data-tag=\"${it.name}\">${it.name}</span>`).join('');
      }
      // 绑定点击：为当前选中节点切换该标签，标签写入内容头部
      this.$tagList.querySelectorAll('.tag-chip').forEach(chip=>{
        chip.addEventListener('click', (e)=>{
          const tag = e.currentTarget.getAttribute('data-tag');
          this._toggleTagForSelectedNode(tag);
        });
      });
      // 初次渲染时根据当前节点内容点亮
      this.highlightActiveTagsForSelectedNode();
    }

    // —— 标签与内容头部联动 ——
    // 规范：将标签行写在内容最顶部，形如："标签: 标签A, 标签B"，与正文之间用一个空行分隔
    _parseTagsFromContent(raw){
      const content = (raw || '').replace(/\r\n/g, '\n');
      const lines = content.split('\n');
      if (!lines.length) return { tags: [], body: '' };
      const first = lines[0].trim();
      const match = first.startsWith('标签:') ? first.slice(3).trim() : null;
      if (match===null){
        return { tags: [], body: content };
      }
      const tags = match.split(',').map(s=>s.trim()).filter(Boolean);
      // 跳过标签行与紧随其后的空行
      let start = 1;
      if (lines[1] !== undefined && lines[1].trim()==='') start = 2;
      const body = lines.slice(start).join('\n');
      return { tags, body };
    }

    _buildTagsLine(tags){
      const arr = Array.from(new Set(tags.filter(Boolean)));
      return arr.length ? `标签: ${arr.join(', ')}` : '';
    }

    _getTagsFromContent(raw){
      return this._parseTagsFromContent(raw).tags;
    }

    _toggleTagForSelectedNode(tag){
      if (!this.selectedNode) return;
      const node = this.findNode(this.selectedNode);
      if (!node) return;
      const editor = this.dom.contentEditor;
      const currentRaw = (editor && editor.value!=null) ? editor.value : (node.content || '');
      const { tags, body } = this._parseTagsFromContent(currentRaw);
      const set = new Set(tags);
      if (set.has(tag)) set.delete(tag); else set.add(tag);
      const newTagsLine = this._buildTagsLine(Array.from(set));
      const newContent = newTagsLine ? `${newTagsLine}\n\n${body}`.replace(/\n\n\n+/g,'\n\n') : body;
      // 写回编辑器与节点
      if (editor) editor.value = newContent;
      node.content = newContent;
      // 同步到 jsMind 节点
      const jmNode = this.mind.get_node(this.selectedNode);
      if (jmNode){ jmNode.data = jmNode.data || {}; jmNode.data.content = newContent; }
      // 依据“操作”分组标签，更新标题尾部emoji（纯文本）
      this._applyOperationEmojisToTitleFor(this.selectedNode);
      // 保存与点亮
      this.saveMindmapToStorage();
      this.highlightActiveTagsForSelectedNode();
      this.showToast('标签已更新');
    }

    highlightActiveTagsForSelectedNode(){
      if (!this.$tagList) return;
      if (!this.selectedNode) return;
      const node = this.findNode(this.selectedNode);
      if (!node) return;
      const active = new Set(this._getTagsFromContent(node.content || ''));
      this.$tagList.querySelectorAll('.tag-chip').forEach(chip=>{
        const t = chip.getAttribute('data-tag');
        chip.classList.toggle('active', active.has(t));
      });
    }

    // —— 标题尾部操作类标签的 Emoji 纯文本后缀 ——
    _getOperationTagEmojiMap(){
      return {
        '完成': '✅',
        '工作区': '🛠️',
        '问题': '❓',
        '疑难': '❓', // 别名同映射
        '里程碑': '🔶',
        '收藏': '📌'
      };
    }

    _stripOperationEmojis(label){
      const base = label || '';
      // 仅移除标题尾部连续的操作类 emoji（带可变空格），避免误删正文中的 emoji
      const tailEmojiRe = /(?:\s*[✅🛠️❓🔶📌])+\s*$/u;
      return base.replace(tailEmojiRe, '');
    }

    _applyOperationEmojisToTitleFor(nodeId){
      try{
        if (!nodeId) return;
        const node = this.findNode(nodeId);
        if (!node) return;
        const map = this._getOperationTagEmojiMap();
        const order = ['完成','工作区','问题','里程碑','收藏'];
        const tagSet = new Set(this._getTagsFromContent(node.content || ''));

        const baseTitle = this._stripOperationEmojis(node.label || '');
        const emojis = [];
        // 按固定顺序追加；“问题/疑难”同义二选一
        if (tagSet.has('完成')) emojis.push(map['完成']);
        if (tagSet.has('工作区')) emojis.push(map['工作区']);
        if (tagSet.has('问题') || tagSet.has('疑难')) emojis.push(map['问题']);
        if (tagSet.has('里程碑')) emojis.push(map['里程碑']);
        if (tagSet.has('收藏')) emojis.push(map['收藏']);

        const newTitle = emojis.length ? `${baseTitle} ${emojis.join('')}` : baseTitle;

        // 写回内部与 jsMind 节点（纯文本，不使用 HTML）
        node.label = newTitle;
        if (this.mind) {
          try { this.mind.update_node(nodeId, newTitle); } catch(_) { /* ignore */ }
        }
        // 若当前详情正选中该节点，同步输入框
        if (this.selectedNode === nodeId && this.dom.titleInput) {
          this.dom.titleInput.value = newTitle;
        }
        // 持久化
        this.saveMindmapToStorage();
      }catch(e){ console.warn('[MindmapController] 应用操作Emoji失败', e); }
    }

    // ===== 全屏编辑 + 会话列表（阶段一，独立弹屏）=====
    enterFullscreenEditor(){
      try{
        if (this._mmFsOverlay) return; // 已在全屏
        const baseEditor = this.dom.contentEditor;
        if (!baseEditor) return;
        const rect = baseEditor.getBoundingClientRect();
        const height = Math.max(240, Math.round(rect.height));
        const gap = 12;

        // 计算面板尺寸与位置
        const contentWidth = Math.max(300, Math.round(rect.width));
        const maxEditorWidth = Math.floor(window.innerWidth * 0.95);
        const editorWidth = Math.min(maxEditorWidth, contentWidth * 3);
        const sessionsLeft = Math.round(rect.left);
        const sessionsTop = Math.round(rect.top);
        const sessionsWidth = Math.round(rect.width);
        const sessionsHeight = height;
        const editorLeft = Math.max(16, sessionsLeft - gap - editorWidth);
        const editorTop = sessionsTop;

        // overlay
        const overlay = document.createElement('div');
        overlay.className = 'mm-fs-overlay';

        const backdrop = document.createElement('div');
        backdrop.className = 'mm-fs-backdrop';
        overlay.appendChild(backdrop);

        // 左侧编辑 Pane（绝对定位到内容框左侧）
        const pane = document.createElement('div');
        pane.className = 'mm-editor-pane mm-fs-pane';
        pane.style.left = editorLeft + 'px';
        pane.style.top = editorTop + 'px';
        pane.style.width = editorWidth + 'px';
        pane.style.height = sessionsHeight + 'px';

        // 工具栏
        const toolbar = document.createElement('div');
        toolbar.className = 'mm-toolbar';
        toolbar.innerHTML = `
          <div class="left">
            <button type="button" class="mm-btn h1" title="标题H1">H1</button>
            <button type="button" class="mm-btn h2" title="标题H2">H2</button>
            <button type="button" class="mm-btn h3" title="标题H3">H3</button>
            <button type="button" class="mm-btn h4" title="标题H4">H4</button>
            <button type="button" class="mm-btn h5" title="标题H5">H5</button>
            <button type="button" class="mm-btn h6" title="标题H6">H6</button>
            <button type="button" class="mm-btn sep" title="分隔符">—</button>
            <button type="button" class="mm-btn bold" title="加粗">B</button>
            <button type="button" class="mm-btn italic" title="斜体"><i>I</i></button>
            <button type="button" class="mm-btn strike" title="删除线">S</button>
            <button type="button" class="mm-btn list" title="无序列表">•</button>
            <button type="button" class="mm-btn olist" title="有序列表">1.</button>
            <button type="button" class="mm-btn task" title="任务清单">[ ]</button>
            <button type="button" class="mm-btn quote" title="引用">❝</button>
            <button type="button" class="mm-btn code" title="代码块">{ }</button>
            <button type="button" class="mm-btn link" title="链接">🔗</button>
            <button type="button" class="mm-btn image" title="图片">🖼️</button>
            <button type="button" class="mm-btn table" title="表格">▦</button>
          </div>
          <div class="right">
            <button type="button" class="mm-btn copy" title="复制">复制</button>
            <button type="button" class="mm-btn paste" title="粘贴">粘贴</button>
            <span class="mm-zoom">
              <button type="button" class="mm-btn font-dec" title="字号-">A-</button>
              <button type="button" class="mm-btn font-reset" title="字号重置">A</button>
              <button type="button" class="mm-btn font-inc" title="字号+">A+</button>
            </span>
            <button type="button" class="mm-btn preview-toggle" title="预览切换">预览</button>
            <button type="button" class="mm-btn close" title="关闭(ESC)">关闭</button>
          </div>`;

        let ta;
        let currentContent = '';
        
        // 检查基础编辑器类型并获取内容
        if (baseEditor.tagName === 'DIV') {
          // 富文本编辑器：获取Markdown内容
          currentContent = this._getMarkdownFromDiv(baseEditor);
          // 创建富文本编辑器
          ta = document.createElement('div');
          ta.className = 'mm-editor rich-text-editor';
          ta.contentEditable = true;
          ta.style.cssText = `
            height: ${sessionsHeight - toolbar.offsetHeight - 8}px;
            border: 1px solid #ccc;
            padding: 8px;
            background: white;
            overflow-y: auto;
            font-family: inherit;
            font-size: inherit;
            line-height: 1.4;
          `;
          // 渲染富文本内容
          this._renderMdPreview(ta, currentContent);
          ta.dataset.markdownContent = currentContent;
        } else {
          // 普通textarea
          currentContent = baseEditor.value || '';
          ta = document.createElement('textarea');
          ta.className = 'mm-editor';
          ta.value = currentContent;
          ta.style.height = (sessionsHeight - toolbar.offsetHeight - 8) + 'px';
        }

        // 预览容器
        const preview = document.createElement('div');
        preview.className = 'mm-preview hidden';
        preview.setAttribute('aria-label', 'markdown-preview');

        pane.appendChild(toolbar);
        pane.appendChild(ta);
        pane.appendChild(preview);
        // 记录 pane 引用，供持久化与关闭时使用
        this._mmFsPane = pane;
        // 记录 textarea 引用，供会话渲染与保存退出使用
        this._mmFsTextarea = ta;
        // 绑定全屏编辑的输入与失焦事件：同步主编辑器并防抖保存
        try{
          const syncToMainAndDebounce = ()=>{
            if (this.dom && this.dom.contentEditor) {
              let content = '';
              if (ta.tagName === 'DIV') {
                // 富文本编辑器：获取Markdown内容
                content = this._getMarkdownFromDiv(ta);
                // 同步到主编辑器
                if (this.dom.contentEditor.tagName === 'DIV') {
                  this._renderRichContent(content, this.dom.contentEditor);
                } else {
                  this.dom.contentEditor.value = content;
                }
              } else {
                // 普通textarea
                content = ta.value;
                if (this.dom.contentEditor.tagName === 'DIV') {
                  this._renderRichContent(content, this.dom.contentEditor);
                } else {
                  this.dom.contentEditor.value = content;
                }
              }
            }
            this._contentDirty = true;
            this._debounceSave && this._debounceSave();
          };
          
          // 输入过程中：持续同步并触发防抖保存
          ta.addEventListener('input', syncToMainAndDebounce);
          
          // 失焦：若内容已脏则再触发一次保存，避免无编辑时误置脏状态
          ta.addEventListener('blur', ()=>{
            if (!this._contentDirty) return;
            syncToMainAndDebounce();
          });
          
          // 如果是富文本编辑器，还需要绑定粘贴事件
          if (ta.tagName === 'DIV') {
            ta.addEventListener('paste', (e) => {
              this._handleContentPaste(e, ta);
            });
          }
        }catch(_){ /* ignore */ }

        // 左下角尺寸调节器（激活）
        const resizerBL = document.createElement('div');
        resizerBL.className = 'mm-resizer bl';
        resizerBL.title = '拖动调整大小（左下角）';
        // 简易内联样式，避免依赖外部CSS
        Object.assign(resizerBL.style, {
          position:'absolute', bottom:'6px', left:'6px', width:'14px', height:'14px',
          background:'#e0e0e0', border:'1px solid #cfcfcf', borderRadius:'2px',
          cursor:'nesw-resize', opacity:'0.9'
        });
        pane.appendChild(resizerBL);

        // 会话列表（覆盖原内容框位置）
        const sessions = document.createElement('div');
        sessions.className = 'mm-session-list mm-fs-sessions';
        sessions.style.left = sessionsLeft + 'px';
        sessions.style.top = sessionsTop + 'px';
        sessions.style.width = sessionsWidth + 'px';
        sessions.style.height = sessionsHeight + 'px';
        sessions.innerHTML = `
          <div class="mm-session-header">
            <label class="mm-sel-all" title="全选/全不选">
              <input type="checkbox" class="mm-sel-all-cb" /> 全选
            </label>
            <div style="flex:1"></div>
            <button type="button" class="mm-btn add-session">新增会话</button>
            <button type="button" class="mm-btn copy-selected" title="复制所选会话为Markdown">复制所选</button>
          </div>
          <div class="mm-session-items"></div>`;

        overlay.appendChild(pane);
        overlay.appendChild(sessions);

        // 将 overlay 添加到 body（不改动原容器/不隐藏原编辑器）
        document.body.appendChild(overlay);
        // 记录 overlay 引用，供 Esc/关闭时移除
        this._mmFsOverlay = overlay;
        // 使 overlay 可聚焦并捕获键盘事件
        overlay.tabIndex = -1;
        try { overlay.focus(); } catch(_){}
        // 点击背景关闭
        backdrop.addEventListener('click', ()=> this.exitFullscreenEditor(true));

        // 补偿：在插入DOM后再计算文本域高度，避免toolbar高度为0
        setTimeout(()=>{
          const th = toolbar.offsetHeight || 0;
          ta.style.height = Math.max(80, (sessionsHeight - th - 8)) + 'px';
        }, 0);

        // 事件绑定
        overlay.querySelector('.mm-btn.close').addEventListener('click', ()=> this.exitFullscreenEditor());
        overlay.addEventListener('keydown', (e)=>{
          if (e.key === 'Escape') { e.preventDefault(); this.exitFullscreenEditor(); }
          if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); this.exitFullscreenEditor(true); }
        });
        const bind = (sel, fn)=>{ const el = overlay.querySelector(sel); if (el) el.addEventListener('click', fn); };
        bind('.mm-btn.h1', ()=> this._applyHeading(ta, 1));
        bind('.mm-btn.h2', ()=> this._applyHeading(ta, 2));
        bind('.mm-btn.h3', ()=> this._applyHeading(ta, 3));
        bind('.mm-btn.h4', ()=> this._applyHeading(ta, 4));
        bind('.mm-btn.h5', ()=> this._applyHeading(ta, 5));
        bind('.mm-btn.h6', ()=> this._applyHeading(ta, 6));
        bind('.mm-btn.sep', ()=> this._insertTextAtCursor(ta, '\n\n---\n\n'));
        bind('.mm-btn.bold', ()=> this._wrapSelection(ta, '**'));
        bind('.mm-btn.italic', ()=> this._wrapSelection(ta, '*'));
        bind('.mm-btn.strike', ()=> this._wrapSelection(ta, '~~'));
        bind('.mm-btn.list', ()=> this._prefixLine(ta, '- '));
        bind('.mm-btn.olist', ()=> this._prefixLine(ta, '1. '));
        bind('.mm-btn.task', ()=> this._prefixLine(ta, '- [ ] '));
        bind('.mm-btn.quote', ()=> this._prefixLine(ta, '> '));
        bind('.mm-btn.code', ()=> this._insertTextAtCursor(ta, '\n```\n\n```\n'));
        bind('.mm-btn.copy', ()=> this._copyFs(ta));
        bind('.mm-btn.paste', ()=> this._pasteFs(ta));
        bind('.mm-btn.font-inc', ()=> this._zoomFs(ta, +1));
        bind('.mm-btn.font-dec', ()=> this._zoomFs(ta, -1));
        bind('.mm-btn.font-reset', ()=> this._zoomFs(ta, 0));
        bind('.mm-btn.add-session', ()=> this._addSessionAtCursor(ta));
        bind('.mm-btn.link', ()=> this._insertLink(ta));
        bind('.mm-btn.image', ()=> this._insertImage(ta));
        bind('.mm-btn.table', ()=> this._insertTable(ta));
        bind('.mm-btn.preview-toggle', ()=> this._togglePreview(preview, ta));
        // 会话列表 多选/复制
        this._fsSessionSelected = new Set();
        this._fsEnsureChecklistStyles();
        const selAllCb = overlay.querySelector('.mm-sel-all-cb');
        if (selAllCb){
          selAllCb.addEventListener('change', (e)=>{
            this._fsSelectAll(!!selAllCb.checked);
          });
        }
        bind('.mm-btn.copy-selected', ()=> this._fsCopySelectedSessions());

        // 垂直拖动（在工具栏按住上下移动面板）
        this._enableFsPaneDragVertical(pane, toolbar);
        // 左下角缩放
        this._enableFsPaneResizeBL(pane, resizerBL);

        // 会话列表渲染（初次 + 实时），以及预览实时渲染
        this._renderSessionList();
        ta.addEventListener('input', ()=> {
          // 实时渲染会话列表与预览
          this._renderSessionList();
          this._renderMdPreview(preview, ta.value);
          // 实时同步到详情编辑器并持久化
          if (this.dom && this.dom.contentEditor){
            this.dom.contentEditor.value = ta.value;
            this._contentDirty = true;
          }
          this._debounceSave();
        });
        // 初次渲染预览
        this._renderMdPreview(preview, ta.value);

      }catch(err){ console.error('进入全屏失败', err); }
    }

    exitFullscreenEditor(save=true){
      try{
        // 关闭前持久化面板尺寸与位置
        if (this._mmFsPane) {
          this._persistFsPane(this._mmFsPane);
        }
        if (save && this._mmFsTextarea && this.dom && this.dom.contentEditor){
          let content = '';
          if (this._mmFsTextarea.tagName === 'DIV') {
            // 富文本编辑器：获取Markdown内容
            content = this._getMarkdownFromDiv(this._mmFsTextarea);
          } else {
            // 普通textarea
            content = this._mmFsTextarea.value;
          }
          
          // 同步到主编辑器
          if (this.dom.contentEditor.tagName === 'DIV') {
            this._renderRichContent(content, this.dom.contentEditor);
          } else {
            this.dom.contentEditor.value = content;
          }
          
          // 触发保存
          this._contentDirty = true;
          this._debounceSave();
        }
        if (this._mmFsOverlay && this._mmFsOverlay.parentNode){
          this._mmFsOverlay.parentNode.removeChild(this._mmFsOverlay);
        }
        this._mmFsOverlay = null;
        this._mmFsTextarea = null;
        this._mmFsPane = null;
        this._fsSessionSelected = null;
        this._fsSessionsCache = null;
      }catch(err){ console.error('退出全屏失败', err); }
    }

    _renderSessionList(){
      if (!this._mmFsOverlay || !this._mmFsTextarea) return;
      const itemsBox = this._mmFsOverlay.querySelector('.mm-session-items');
      if (!itemsBox) return;
      itemsBox.innerHTML = '';
      const sessions = this._parseSessions(this._mmFsTextarea.value || '');
      // 缓存，供复制所选使用
      this._fsSessionsCache = sessions;
      if (!sessions.length){ return; }
      sessions.forEach((s, idx)=>{
        const item = document.createElement('div');
        item.className = 'mm-session-item';
        item.setAttribute('data-session-index', String(idx));

        // 复选框
        const label = document.createElement('label');
        label.className = 'mm-session-check';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'mm-session-check-cb';
        cb.checked = !!(this._fsSessionSelected && this._fsSessionSelected.has(idx));
        cb.addEventListener('click', (e)=>{ e.stopPropagation(); });
        cb.addEventListener('change', ()=>{
          this._fsOnItemCheck(idx, cb.checked);
        });
        label.appendChild(cb);

        // 文本
        const title = document.createElement('span');
        title.className = 'mm-session-title';
        title.textContent = s.title || (`会话${idx+1}`);
        item.title = '单击定位，双击重命名';

        item.appendChild(label);
        item.appendChild(title);

        // 点击定位；双击重命名
        item.addEventListener('click', ()=> this._gotoSession(idx));
        item.addEventListener('dblclick', ()=>{
          const cur = s.title || (`会话${idx+1}`);
          const name = window.prompt('重命名会话标题（将作为该段首行）', cur);
          if (name && name.trim()){ this._replaceSessionTitle(idx, name.trim()); this._renderSessionList(); }
        });

        // 选中态样式
        if (this._fsSessionSelected && this._fsSessionSelected.has(idx)){
          item.classList.add('selected');
        }
        itemsBox.appendChild(item);
      });
      this._fsSyncHeaderSelectAll();
    }

    // —— 会话多选/复制（全屏会话列表）——
    _fsEnsureChecklistStyles(){
      try{
        if (document.getElementById('mm-fs-session-style')) return;
        const st = document.createElement('style');
        st.id = 'mm-fs-session-style';
        st.textContent = `
          .mm-session-header{ display:flex; align-items:center; gap:8px; padding:6px 8px; border-bottom:1px solid #eee; }
          .mm-session-items{ overflow:auto; padding:6px 0; }
          .mm-session-item{ position:relative; display:flex; align-items:center; gap:8px; padding:6px 10px 6px 34px; cursor:pointer; }
          .mm-session-item:hover{ background:#f7f7f7; }
          .mm-session-item.selected{ background:rgba(25,118,210,0.08); outline:1px solid rgba(25,118,210,0.35); }
          .mm-session-check{ position:absolute; left:8px; top:50%; transform:translateY(-50%); }
          .mm-session-title{ white-space:nowrap; text-overflow:ellipsis; overflow:hidden; }
        `;
        document.head.appendChild(st);
      }catch(_){ }
    }

    _fsSelectAll(checked){
      this._fsSessionSelected = this._fsSessionSelected || new Set();
      this._fsSessionSelected.clear();
      if (checked && Array.isArray(this._fsSessionsCache)){
        for (let i=0;i<this._fsSessionsCache.length;i++){ this._fsSessionSelected.add(i); }
      }
      // 同步UI
      const itemsBox = this._mmFsOverlay && this._mmFsOverlay.querySelector('.mm-session-items');
      if (itemsBox){
        itemsBox.querySelectorAll('.mm-session-item').forEach(item=>{
          const idx = parseInt(item.getAttribute('data-session-index')||'-1',10);
          const on = checked && !isNaN(idx);
          item.classList.toggle('selected', on);
          const cb = item.querySelector('.mm-session-check-cb');
          if (cb) cb.checked = on;
        });
      }
      this._fsSyncHeaderSelectAll();
    }

    _fsOnItemCheck(idx, checked){
      this._fsSessionSelected = this._fsSessionSelected || new Set();
      if (checked) this._fsSessionSelected.add(idx); else this._fsSessionSelected.delete(idx);
      // 切换行样式
      const item = this._mmFsOverlay && this._mmFsOverlay.querySelector(`.mm-session-item[data-session-index="${idx}"]`);
      if (item){ item.classList.toggle('selected', !!checked); }
      this._fsSyncHeaderSelectAll();
    }

    _fsSyncHeaderSelectAll(){
      const cb = this._mmFsOverlay && this._mmFsOverlay.querySelector('.mm-sel-all-cb');
      if (!cb) return;
      const total = (this._fsSessionsCache && this._fsSessionsCache.length) ? this._fsSessionsCache.length : 0;
      const sel = this._fsSessionSelected ? this._fsSessionSelected.size : 0;
      cb.indeterminate = sel>0 && sel<total;
      cb.checked = total>0 && sel===total;
    }

    _fsCollectSelectedPayload(){
      const selected = Array.from(this._fsSessionSelected || []);
      const sessions = this._fsSessionsCache || [];
      if (!selected.length || !sessions.length) return '';
      const sep = '\n\n---\n\n';
      const blocks = selected
        .filter(i=> i>=0 && i<sessions.length)
        .map(i=>{
          const it = sessions[i];
          const title = (it && it.title) ? it.title.replace(/^\s+|\s+$/g,'') : `### 会话${i+1}`;
          const raw = (it && typeof it.raw === 'string') ? it.raw : '';
          // 如果 raw 首行就是标题，则避免重复：标题行后接正文
          const lines = raw.split(/\r?\n/);
          const firstNonEmpty = lines.findIndex(s=> (s||'').trim().length>0);
          if (firstNonEmpty===-1){ return title; }
          const firstLine = lines[firstNonEmpty];
          const isHeading = /^#{1,6}\s/.test(firstLine.trim());
          const body = isHeading ? lines.slice(firstNonEmpty+1).join('\n') : lines.slice(firstNonEmpty).join('\n');
          return `${title}\n\n${body}`.replace(/\n\n\n+/g,'\n\n');
        });
      return blocks.join(sep);
    }

    async _fsCopySelectedSessions(){
      const text = this._fsCollectSelectedPayload();
      if (!text){ this.showToast('未选择任何会话'); return; }
      try{
        if (navigator.clipboard && navigator.clipboard.writeText){
          await navigator.clipboard.writeText(text);
        } else {
          // 回退
          const ta = document.createElement('textarea');
          ta.value = text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta);
          ta.focus(); ta.select(); try{ document.execCommand('copy'); }catch(_){ }
          document.body.removeChild(ta);
        }
        this.showToast('已复制所选会话到剪贴板');
      }catch(err){
        this.showToast(`复制失败：${String(err)}`, 'error');
      }
    }

    _replaceSessionTitle(index, newTitle){
      if (!this._mmFsTextarea) return;
      const ta = this._mmFsTextarea;
      const text = ta.value || '';
      const { parts, starts } = this._computeSessionPositions(text);
      if (!parts.length) return;
      const i = Math.max(0, Math.min(parts.length-1, index|0));
      const seg = parts[i];
      const segStart = starts[i];
      const segEnd = segStart + seg.length;
      // 找到首个非空行作为标题替换对象
      const lines = seg.split(/\r?\n/);
      let firstIdx = -1;
      for (let k=0;k<lines.length;k++){ if (lines[k].trim().length>0){ firstIdx = k; break; } }
      if (firstIdx === -1){ lines.unshift(''); firstIdx = 0; }
      const finalTitle = /^#{1,6}\s/.test(newTitle) ? newTitle : `### ${newTitle}`;

      // 识别并保留时间戳（格式：YYYY-MM-DD HH:mm:ss）
      const tsRe = /\b\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\b/;
      let movedTs = null;
      let titleLine = lines[firstIdx];
      const sameLineTs = titleLine && titleLine.match(tsRe);
      if (sameLineTs){
        movedTs = sameLineTs[0];
        titleLine = titleLine.replace(tsRe, '').trim();
      }
      // 应用新标题（不带时间戳）
      lines[firstIdx] = finalTitle;
      // 如果下一非空行不是时间戳且我们从同一行剥离了时间戳，则插入到下一行
      const nextIdx = firstIdx + 1;
      const nextNonEmptyIdx = (function(){
        for (let t = nextIdx; t < lines.length; t++){
          if (lines[t].trim().length > 0) return t;
        }
        return -1;
      })();
      const isTimestampLine = (s)=> tsRe.test((s||'').trim());
      if (movedTs){
        if (nextNonEmptyIdx === -1){
          // 段落末尾无内容，直接追加时间戳行
          lines.splice(nextIdx, 0, movedTs);
        } else {
          // 存在后续非空行，若不是时间戳，则在标题后插入时间戳独立行
          if (!isTimestampLine(lines[nextNonEmptyIdx])){
            lines.splice(nextIdx, 0, movedTs);
          }
          // 若下一非空行已是时间戳，则无需处理
        }
      } else {
        // 没有同一行时间戳，若下一非空行已经是时间戳则自然保留；否则不做额外处理
      }
      const newSeg = lines.join('\n');
      const newText = text.slice(0, segStart) + newSeg + text.slice(segEnd);
      ta.value = newText;
      // 保持光标于新标题行行首
      const pos = segStart + newSeg.indexOf(finalTitle);
      ta.setSelectionRange(pos, pos);
      // 触发保存/联动
      if (this.dom && this.dom.contentEditor){ this.dom.contentEditor.value = newText; }
      this._contentDirty = true;
      this._debounceSave();
    }

    _togglePreview(previewEl, ta){
      if (!previewEl) return;
      const hidden = previewEl.classList.contains('hidden');
      if (hidden){ previewEl.classList.remove('hidden'); this._renderMdPreview(previewEl, ta ? ta.value : ''); }
      else { previewEl.classList.add('hidden'); }
    }

    _renderMdPreview(previewEl, text){
      if (!previewEl) return;
      const src = String(text || '');
      // 简易渲染：转义 + 常用语法
      const esc = s=> s.replace(/[&<>]/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
      let html = esc(src);
      // 代码块 ```
      html = html.replace(/```([\s\S]*?)```/g, (m, code)=> `<pre class="mm-code"><code>${esc(code)}</code></pre>`);
      // 标题
      html = html.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>')
                 .replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>')
                 .replace(/^####\s+(.*)$/gm, '<h4>$1</h4>')
                 .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
                 .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
                 .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');
      // 水平线
      html = html.replace(/^\s*(?:---+|—+|\*{3,}|_{3,})\s*$/gm, '<hr/>');
      // 引用
      html = html.replace(/^>\s?(.*)$/gm, '<blockquote>$1</blockquote>');
      // 列表（简化）
      html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>)(\n(?!<li>))/gs, '<ul>$1</ul>$2');
      // 有序列表（简化）
      html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>)(\n(?!<li>))/gs, '<ol>$1</ol>$2');
      // 粗体/斜体/删除线
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                 .replace(/\*(.+?)\*/g, '<em>$1</em>')
                 .replace(/~~(.+?)~~/g, '<del>$1</del>');
      // 链接与图片
      html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img alt="$1" src="$2" />')
                 .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
      // 行内代码
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      // 段落
      html = html.replace(/^(?!<h\d|<ul>|<ol>|<li>|<pre>|<blockquote>|<hr>|<img|<p>|<code|<a)(.+)$/gm, '<p>$1</p>');
      previewEl.innerHTML = html;
    }

    _insertLink(ta){ this._insertAtCursor(ta, '[标题](https://example.com)'); }
    _insertImage(ta){ this._insertAtCursor(ta, '![](https://example.com/image.png)'); }
    _insertTable(ta){
      const tpl = `\n\n| 列1 | 列2 | 列3 |\n|---|---|---|\n| a | b | c |\n`;
      this._insertAtCursor(ta, tpl);
    }

    _insertAtCursor(ta, text){
      if (!ta) return;
      const start = ta.selectionStart || 0, end = ta.selectionEnd || start;
      const val = ta.value || '';
      ta.value = val.slice(0, start) + text + val.slice(end);
      const pos = start + text.length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
      if (this.dom && this.dom.contentEditor){ this.dom.contentEditor.value = ta.value; }
      this._debounceSaveNodeContent && this._debounceSaveNodeContent();
    }

    _parseSessions(text){
      const { parts } = this._computeSessionPositions(text);
      return parts.map(raw=>{
        const lines = raw.split(/\r?\n/).filter(l=>l.trim().length>0);
        let title = lines[0] || '';
        if (!/^#{1,6}\s/.test(title)) {
          const ts = this._nowTs();
          title = `### 会话 ${ts}`;
        }
        return { title, raw };
      });
    }

    _computeSessionPositions(text){
      const src = String(text || '');
      if (src.length === 0) return { parts: [''], starts: [0] };
      // 支持多种分隔：---、—、***、___，并兼容以“### 会话”开头的新段
      const hrRe = /\n\s*(?:---+|—+|\*{3,}|_{3,})\s*\n/g; // 水平分隔
      const headingRe = /^###\s+会话[^\n]*$/gm; // 会话标题行

      // 首先按水平线切割
      let indices = [0];
      let m;
      while((m = hrRe.exec(src))){ indices.push(m.index + m[0].length); }

      if (indices.length === 1){
        // 若没有水平线，则按“### 会话”标题切割（跳过首行已在0）
        while((m = headingRe.exec(src))){ if (m.index !== 0) indices.push(m.index); }
      }

      indices = Array.from(new Set(indices)).sort((a,b)=>a-b);
      const parts = [];
      const starts = [];
      for (let i=0;i<indices.length;i++){
        const start = indices[i];
        const end = (i+1<indices.length) ? indices[i+1] : src.length;
        const seg = src.slice(start, end);
        if (seg.length >= 0){
          parts.push(seg);
          starts.push(start);
        }
      }
      if (parts.length === 0) { parts.push(src); starts.push(0); }
      return { parts, starts };
    }

    _gotoSession(index){
      if (!this._mmFsTextarea) return;
      const text = this._mmFsTextarea.value || '';
      const posInfo = this._computeSessionPositions(text);
      const count = posInfo.starts.length;
      const idx = Math.max(0, Math.min(count-1, index|0));
      const pos = posInfo.starts[idx] || 0;
      this._mmFsTextarea.focus();
      this._mmFsTextarea.setSelectionRange(pos, pos);
      setTimeout(()=>{
        const lineIndex = (this._mmFsTextarea.value.substring(0,pos).match(/\n/g)||[]).length;
        this._scrollTextareaToLine(this._mmFsTextarea, lineIndex);
      }, 0);
    }

    _enableFsPaneDragVertical(pane, dragHandle){
      if (!pane || !dragHandle) return;
      let startY = 0; let startTop = 0; let dragging = false;
      const onDown = (e)=>{
        dragging = true;
        startY = e.clientY;
        const rect = pane.getBoundingClientRect();
        startTop = rect.top;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        e.preventDefault();
      };
      const onMove = (e)=>{
        if (!dragging) return;
        const dy = e.clientY - startY;
        let newTop = startTop + dy;
        const overlayRect = this._mmFsOverlay.getBoundingClientRect();
        const paneRect = pane.getBoundingClientRect();
        // 限制仅上下移动：left 保持
        const minTop = overlayRect.top + 8;
        const maxTop = overlayRect.bottom - paneRect.height - 8;
        newTop = Math.max(minTop, Math.min(maxTop, newTop));
        pane.style.top = newTop + 'px';
        this._relayoutFsEditor(pane);
      };
      const onUp = ()=>{
        dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        this._persistFsPane(pane);
      };
      dragHandle.style.cursor = 'ns-resize';
      dragHandle.addEventListener('mousedown', onDown);
    }

    _enableFsPaneResizeBL(pane, handle){
      if (!pane || !handle) return;
      let startX=0, startY=0, startW=0, startH=0, startLeft=0; let resizing=false;
      const onDown = (e)=>{
        resizing = true;
        const rect = pane.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        startW = rect.width; startH = rect.height; startLeft = rect.left;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        e.preventDefault();
      };
      const onMove = (e)=>{
        if (!resizing) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        // 左下角：向左拖动增大left（变小宽度），向右拖动增大宽度
        let newW = startW - dx; // 因为左侧在动
        let newH = startH + dy;
        let newLeft = startLeft + dx;
        const overlayRect = this._mmFsOverlay.getBoundingClientRect();
        // 约束
        const minW = 420, minH = 260;
        newW = Math.max(minW, Math.min(overlayRect.width - 32, newW));
        newH = Math.max(minH, Math.min(overlayRect.height - 32, newH));
        // left 不得越出左边界
        const maxLeft = (overlayRect.left + overlayRect.width) - newW - 8;
        const minLeft = overlayRect.left + 8;
        newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
        pane.style.width = newW + 'px';
        pane.style.height = newH + 'px';
        pane.style.left = newLeft + 'px';
        // bottom 以top计算
        const top = parseFloat(pane.style.top || pane.getBoundingClientRect().top);
        pane.style.top = top + 'px';
        this._relayoutFsEditor(pane);
      };
      const onUp = ()=>{
        resizing = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        this._persistFsPane(pane);
      };
      handle.addEventListener('mousedown', onDown);
    }

    _persistFsPane(pane){
      if (!pane) return;
      const rect = pane.getBoundingClientRect();
      const state = {
        width: rect.width,
        height: rect.height,
        left: pane.offsetLeft || 0,
        top: pane.offsetTop || 0
      };
      try{ 
        if (this.autogenStorage) {
          this.autogenStorage.store('ui_state', 'mmFsPaneState', state).catch(() => {});
        }
      }catch(e){ /* ignore */ }
    }

    _applyFsPanePersist(pane){
      try{
        if (this.autogenStorage) {
          this.autogenStorage.retrieve('ui_state', 'mmFsPaneState').then(s => {
            if (s && typeof s === 'object'){
              if (s.width) pane.style.width = Math.max(320, s.width) + 'px';
              if (s.height) pane.style.height = Math.max(220, s.height) + 'px';
              if (s.left !== undefined) pane.style.left = s.left + 'px';
              if (s.top !== undefined) pane.style.top = s.top + 'px';
            }
          }).catch(() => {});
          return;
        }
        // 回退到localStorage（兼容性）
        const raw = localStorage.getItem('mmFsPaneState');
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s && typeof s === 'object'){
          if (s.width) pane.style.width = Math.max(320, s.width) + 'px';
          if (s.height) pane.style.height = Math.max(220, s.height) + 'px';
          if (typeof s.left === 'number') pane.style.left = s.left + 'px';
          if (typeof s.top === 'number') pane.style.top = s.top + 'px';
        }
      }catch(e){ /* ignore */ }
    }

    _relayoutFsEditor(pane){
      // 根据 pane 当前尺寸，调整 textarea 高度，避免被工具栏与底部控件遮挡
      if (!pane || !this._mmFsTextarea) return;
      const toolbar = pane.querySelector('.mm-toolbar');
      const rect = pane.getBoundingClientRect();
      const tb = toolbar ? toolbar.getBoundingClientRect() : { height: 40 };
      const padding = 16; // 上下余量
      const ta = this._mmFsTextarea;
      const newH = Math.max(120, rect.height - (tb.height + padding));
      ta.style.height = newH + 'px';
    }

    _addSessionAtCursor(ta){
      const ts = this._nowTs();
      // 新会话片段：第一行可编辑标题，第二行固定时间戳
      const snippet = `\n\n---\n\n### 会话\n${ts}\n\n`;
      // 将光标移动到所有会话末尾（全文末尾）
      try{
        const val = ta.value || '';
        ta.focus();
        ta.setSelectionRange(val.length, val.length);
      }catch(_){ /* ignore */ }
      // 在末尾插入新会话片段
      this._insertTextAtCursor(ta, snippet);
      this._renderSessionList();
      // 滚动到文本末尾，便于立即开始输入
      try{
        const lineIndex = (ta.value.match(/\n/g) || []).length;
        this._scrollTextareaToLine(ta, lineIndex);
      }catch(_){ /* ignore */ }
    }

    _applyHeading(ta, level){
      level = Math.min(6, Math.max(1, level|0));
      const prefix = '#'.repeat(level) + ' ';
      this._prefixLine(ta, prefix);
    }

    _wrapSelection(ta, wrapper){
      const {selectionStart:s, selectionEnd:e, value} = ta;
      if (s===e){
        const insertion = wrapper + (wrapper==='**'?'粗体':wrapper==='*'?'斜体':'删除线') + wrapper;
        this._insertTextAtCursor(ta, insertion, true, wrapper.length, wrapper.length);
      }else{
        const selected = value.slice(s,e);
        const replaced = wrapper + selected + wrapper;
        ta.setRangeText(replaced, s, e, 'end');
        ta.focus();
        // 同步并保存
        if (this.dom && this.dom.contentEditor){ this.dom.contentEditor.value = ta.value; }
        this._contentDirty = true;
        this._debounceSave();
      }
    }

    _prefixLine(ta, prefix){
      const {selectionStart:s} = ta;
      const startLine = ta.value.lastIndexOf('\n', s-1) + 1;
      ta.setRangeText(prefix, startLine, startLine, 'end');
      ta.focus();
      // 同步并保存
      if (this.dom && this.dom.contentEditor){ this.dom.contentEditor.value = ta.value; }
      this._contentDirty = true;
      this._debounceSave();
    }

    _insertTextAtCursor(ta, text, placeCursor=false, backLeft=0, backRight=0){
      const {selectionStart:s, selectionEnd:e} = ta;
      ta.setRangeText(text, s, e, 'end');
      if (placeCursor){
        const pos = s + text.length - (backRight||0);
        ta.setSelectionRange(pos - (backLeft||0), pos);
      }
      ta.focus();
      // 同步并保存（全屏编辑框专用）
      if (this.dom && this.dom.contentEditor){ this.dom.contentEditor.value = ta.value; }
      this._contentDirty = true;
      this._debounceSave();
    }

    _copyFs(ta){
      const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd);
      const text = sel || ta.value;
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(()=>{
          this.showToast('已复制到剪贴板');
        }).catch(()=> alert('复制失败：浏览器限制'));
      }else{
        alert('复制不可用，请使用系统快捷键');
      }
    }

    _pasteFs(ta){
      if (navigator.clipboard && navigator.clipboard.readText){
        navigator.clipboard.readText().then(txt=>{
          this._insertTextAtCursor(ta, txt);
        }).catch(()=> alert('粘贴失败：浏览器限制'));
      }else{
        alert('粘贴不可用，请使用系统快捷键');
      }
    }

    _zoomFs(ta, delta){
      const cur = parseFloat(getComputedStyle(ta).fontSize)||14;
      let next = cur;
      if (delta===0) next = 14; else next = Math.max(10, Math.min(28, cur + delta*2));
      ta.style.fontSize = next + 'px';
    }

    _scrollTextareaToLine(ta, lineIndex){
      const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      ta.scrollTop = Math.max(0, lineIndex * lineHeight - 2*lineHeight);
    }

    _nowTs(){
      const pad=n=> (n<10?'0':'')+n;
      const d=new Date();
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    // —— 测试：为根节点标题追加5个emoji（纯文本，不入库） —— 
    // 注意：此功能已禁用，避免污染根节点标题
    _appendEmojisToRootForTest(){
      // 禁用此功能，避免在根节点标题后自动添加测试emoji
      // 同时清理已有的测试emoji
      this._cleanupTestEmojisFromRoot();
      return;
      
      try{
        if (!this.mind) return;
        const root = this.mind.get_root();
        if (!root) return;
        // 以内部数据的根标题为基准，避免多次调用导致重复叠加
        const base = (this.data && this.data.label) ? this.data.label : (root.topic || '');
        const emojis = ' 🏷️🔧📌⭐✅';
        // 若当前已包含任意测试emoji，则认为已追加过，避免重复
        const current = root.topic || '';
        if (/[🏷️🔧📌⭐✅]/.test(current)) return;
        this.mind.update_node(root.id, base + emojis);
      }catch(_){ /* ignore */ }
    }
    
    // 清理根节点标题中的测试emoji
    _cleanupTestEmojisFromRoot(){
      try{
        if (!this.mind) return;
        const root = this.mind.get_root();
        if (!root) return;
        
        const current = root.topic || '';
        // 检查是否包含测试emoji
        if (/[🏷️🔧📌⭐✅]/.test(current)) {
          // 移除测试emoji（包括前面的空格）
          const cleaned = current.replace(/\s*[🏷️🔧📌⭐✅]+\s*$/g, '').trim();
          if (cleaned !== current) {
            console.log('[MindmapController] 清理根节点测试emoji:', current, '->', cleaned);
            this.mind.update_node(root.id, cleaned);
            
            // 同步更新内部数据
            if (this.data && this.data.id === root.id) {
              this.data.label = cleaned;
              this.data.topic = cleaned;
            }
          }
        }
      }catch(error){ 
        console.warn('[MindmapController] 清理测试emoji失败:', error);
      }
    }

    // —— 数据转换 ——
    toJsMindTree(node, depth=0){
      if (!node || !node.id) {
        console.warn('[MindmapController] toJsMindTree: 无效的节点', node);
        return null;
      }
      
      // 确保标题不为空，优先使用label，其次topic，最后使用默认值
      let safeLabel = '';
      if (node.label && String(node.label).trim()) {
        safeLabel = String(node.label).trim();
      } else if (node.topic && String(node.topic).trim()) {
        safeLabel = String(node.topic).trim();
      } else {
        safeLabel = node.id.startsWith('root-') ? '项目脑图' : '未命名节点';
        console.warn(`[MindmapController] 修复空标题节点: ${node.id} -> ${safeLabel}`);
      }
      
      const safeContent = (node && node.content != null) ? String(node.content) : '';
      const t = {
        id: node.id,
        topic: safeLabel,
        expanded: node.expanded !== false,
        // 顶层写入 content，兼容 jsMind node_tree 导出规则
        content: safeContent,
        // 同时在 data.content 冗余一份，兼容旧逻辑
        data: { content: safeContent },
      };
      // 右侧单侧布局：强制第一层方向为 right
      if (depth===1){ t.direction = 'right'; }
      // 附件序列化到 data.attachments
      if (Array.isArray(node.attachments) && node.attachments.length){
        t.data.attachments = node.attachments;
      }
      if (node.children && node.children.length){
        t.children = node.children.map(ch=>this.toJsMindTree(ch, depth+1)).filter(Boolean);
      }
      return t;
    }

    fromJsMindTree(jmNode){
      if (!jmNode || !jmNode.id) {
        console.warn('[MindmapController] fromJsMindTree: 无效的jsMind节点');
        return null;
      }
      
      // 修复标题为空的问题：确保每个节点都有有效的标题
      let nodeLabel = jmNode.topic || jmNode.label || '';
      if (!nodeLabel || nodeLabel.trim() === '') {
        nodeLabel = jmNode.id.startsWith('root-') ? '项目脑图' : '未命名节点';
        console.warn(`[MindmapController] 修复空标题节点: ${jmNode.id} -> ${nodeLabel}`);
      }
      
      const n = {
        id: jmNode.id,
        label: nodeLabel,
        topic: nodeLabel, // 同时设置topic字段，确保兼容性
        // 优先读取顶层 content，其次 data.content
        content: (jmNode.content !== undefined ? jmNode.content : ((jmNode.data && jmNode.data.content) || '')),
        expanded: jmNode.expanded !== false,
        // 读取附件数组（如存在）
        attachments: (jmNode.data && Array.isArray(jmNode.data.attachments)) ? jmNode.data.attachments : [],
        children: []
      };
      
      if (jmNode.children && jmNode.children.length > 0) {
        for (const child of jmNode.children) {
          const childNode = this.fromJsMindTree(child);
          if (childNode) { n.children.push(childNode); }
        }
      }
      return n;
    }

    // 为根的直接子节点自动分配左右方向（交替），仅当未设置时
    ensureRootChildrenDirection(){
      const root = this.data;
      if (!root || !Array.isArray(root.children)) return;
      let changed = false;
      root.children.forEach((ch)=>{
        if (ch.direction !== 'right'){ ch.direction = 'right'; changed = true; }
      });
      if (changed) this.saveMindmapToStorage();
    }

    // —— 存储 ——
    async loadMindmapFromStorage(){
      try {
        // 完全使用AutogenUnifiedStorage加载
        if (!this.autogenStorage) {
          console.error('[MindmapController] AutogenUnifiedStorage不可用，无法加载数据');
          return null;
        }
        
        try {
          const data = await this.autogenStorage.retrieve('mindmap', this.localStorageKey);
          if (data) {
            console.log('[MindmapController] ✅ 使用AutogenUnifiedStorage加载成功');
            if (data.format === 'node_tree' && data.data) {
              return this.fromJsMindTree(data.data);
            } else if (data.data) {
              // 处理其他格式的数据
              return this.fromJsMindTree(data);
            }
          }
          
          // 如果没有找到数据，返回null让系统使用默认数据
          console.log('[MindmapController] 未找到存储的脑图数据，将使用默认数据');
          return null;
          
        } catch (error) {
          console.error('[MindmapController] AutogenUnifiedStorage加载失败:', error);
          return null;
        }
        
        return null;
      } 
      catch (e) {
        console.warn('[MindmapController] 读取本地持久化异常，将使用默认数据', e);
        return null;
      }
    }

    async saveMindmapToStorage(immediate = false){
  // 防抖逻辑：合并频繁保存操作，提升性能
  if (!immediate) {
    clearTimeout(this._saveDebounceTimer);
    this._saveDebounceTimer = setTimeout(() => {
      this.saveMindmapToStorage(true);
    }, 800); // 800ms防抖
    return;
  }
  
  try {
// 白名单授权机制已移除 - 存储系统统一后无需复杂授权控制
    // 全局保存守卫：冷启动/加载中/非当前项目/默认root 一律拒绝
    try{
      if (typeof window !== 'undefined'){
        if (window.__STORAGE_PAUSE || window.__REG_SYNC_SUPPRESS) return;
        if (!this.data || !this.data.id || this.data.id === 'root') return;
        if (window.AppLifecycle && !window.AppLifecycle.allowSave(this.data.id)) return;
      }
    }catch(_){ /* ignore */ }
    if (!this.mind) return;
    // 使用 jsMind 官方导出格式保存（node_tree）
    let jmData = this.mind.get_data('node_tree');
        // 在保存前补全每个节点的顶层 content 与 data.content
        const patchTree = (jmNode)=>{
          if (!jmNode) return;
          // 从内部数据中查找对应节点内容
          const internal = this.findNode(jmNode.id);
          const c = internal ? (internal.content || '') : ((jmNode.content !== undefined ? jmNode.content : (jmNode.data && jmNode.data.content) || ''));
          jmNode.content = c;
          jmNode.data = jmNode.data || {};
          jmNode.data.content = c;
          // 同步附件
          const atts = internal && Array.isArray(internal.attachments) ? internal.attachments : (Array.isArray(jmNode.data.attachments) ? jmNode.data.attachments : []);
          if (atts && atts.length){ jmNode.data.attachments = atts; } else { delete jmNode.data.attachments; }
          if (jmNode.children && jmNode.children.length){ jmNode.children.forEach(patchTree); }
        };
        if (jmData && jmData.data){ patchTree(jmData.data); }
        // 统一解析 mindKey：仅使用当前画布根ID，避免 __mindFullCache 的滞后/串扰问题
        const mindKey = (function(){
          try{ const rid = (this.mind && this.mind.get_root && this.mind.get_root().id) || (this.data && this.data.id); if (rid) return String(rid); }catch(_){ }
          return 'root';
        }).call(this);
        try{ jmData.meta = Object.assign({}, jmData.meta || {}, { mind_id: mindKey }); }catch(_){ /* ignore */ }
        
        // 使用统一存储系统保存
        try {
          await this._saveWithUnifiedStorage(jmData);
          console.log('[MindmapController] ✅ 使用统一存储系统保存');
          
          // 增量同步到JSON底座（方案A：轻量级增量同步）
          await this._syncToJsonBase(jmData, mindKey);
          
        } catch (error) {
          console.error('[MindmapController] 统一存储系统保存失败:', error);
        }
        
        // 降低保存日志频率，避免噪音
        if (Math.random() < 0.1) { // 仅10%概率输出日志
          console.log('[MindmapController] 已保存到localStorage:', this.localStorageKey);
        }
        
        // MD文档自动保存已禁用 - 避免频繁备份
        // this._saveToMDDocument(jmData).catch(e => {
        //   console.warn('[MindmapController] MD文档保存失败:', e.message);
        // });
        
        // 同步刷新全图快照，确保强刷后脚本使用最新内容
        try{ this.ensureFullSnapshotFromMind(jmData); }catch(_){ }
        
        // 上行同步到注册表（新架构）：更新名称与payload，保持列表与脑图一致（无需阻塞保存）
        try{
          if (window.Registry && window.Registry.repo && typeof window.Registry.repo.upsertFromMindmap === 'function'){
            // 检查状态机：仅在 Ready 状态时允许写入，避免加载期误写
            const fsm = window.Registry.fsm;
            if (fsm && fsm.state !== 'Ready') {
              console.log('[MindmapController] 跳过注册表同步，当前状态:', fsm.state);
              return;
            }
            const name = (this.data && (this.data.label || this.data.topic)) || '未命名项目';
            Promise.resolve(window.Registry.repo.upsertFromMindmap(String(mindKey), name, this.data)).catch(function(e){ console.warn('[MindmapController] upsertFromMindmap失败', e); });
          }
        }catch(e){ console.warn('[MindmapController] upsertFromMindmap失败', e); }
        
        try{
          const sz = (o)=>{ try{ return JSON.stringify(o).length; }catch(_){ return 0; } };
          console.log('[PERSIST][SAVE] done ->', {
            perKey: this.localStorageKey,
            mind_id: mindKey,
            storage_method: 'localStorage'
          });
        }catch(_){ }
      } catch(e){
        console.error('[MindmapController] 保存到存储失败', e);
      }
    }

    
    // 从jsMind同步数据到内部数据结构
    syncJsMindToData() {
      if (!this.mind) return;
      try {
        const jmData = this.mind.get_data('node_tree');
        if (jmData && jmData.data) {
          // 使用内部重建逻辑

          // 回退：本地重建（与核心模块等价逻辑）
          const contentIndex = new Map();
          const indexOld = (n)=>{
            if (!n) return;
            contentIndex.set(n.id, n.content || '');
            if (Array.isArray(n.children)) n.children.forEach(indexOld);
          };
          indexOld(this.data);
          const fallbackRebuild = (jmNode)=>{
            if (!jmNode) return null;
            const base = {
              id: jmNode.id,
              label: jmNode.topic || '',
              content: (jmNode.data && (jmNode.data.content ?? undefined)) !== undefined ? jmNode.data.content : (contentIndex.get(jmNode.id) || ''),
              expanded: jmNode.expanded !== false,
              children: []
            };
            if (Array.isArray(jmNode.children)){
              base.children = jmNode.children.map(fallbackRebuild).filter(Boolean);
            }
            return base;
          };
          this.data = fallbackRebuild(jmData.data);
        }
      } catch (e) {
        console.error('[MindmapController] syncJsMindToData异常:', e);
      }
    }

    // —— 选择/详情 ——
    setSelectedNode(nodeId){
      if(!nodeId) return;
      // 在切换前，先保存当前详情的未提交更改
      if (this.selectedNode){ this.saveDetailsFor(this.selectedNode); }
      const node = this.mind.get_node(nodeId);
      if (node){
        this.mind.select_node(node);
        this.selectedNode = nodeId;
        this.updateNodeDetails(nodeId);
      } else {
        // 回退选中根
        const root = this.mind.get_root();
        if (root){
          this.mind.select_node(root);
          this.selectedNode = root.id;
          this.updateNodeDetails(root.id);
        }
      }
    }

    updateNodeDetails(nodeId){
      const n = this.findNode(nodeId);
      if (!n) return;
      if (this.dom.titleInput) this.dom.titleInput.value = n.label || '';
      if (this.dom.contentEditor) {
        const content = n.content || '';
        
        // 检查是否需要转换为富文本编辑器
        if (this.dom.contentEditor.tagName === 'TEXTAREA' && content.includes('data:image')) {
          this._convertToRichTextEditor();
        }
        
        if (this.dom.contentEditor.tagName === 'DIV') {
          // 富文本编辑器：渲染HTML内容
          this._renderRichContent(content);
        } else {
          // 普通textarea：显示纯文本
          this.dom.contentEditor.value = content;
          this.dom.contentEditor.placeholder = '';
        }
      }
      if (this.dom.nodeIdText) this.dom.nodeIdText.textContent = nodeId || '';
      // 预览（非自动，保留与原逻辑一致由按钮控制）
      // 切换节点后重置脏标记，防止占位符导致误判
      this._contentDirty = false;
      // 进入详情时也同步一次标题尾部的操作类emoji，确保历史数据立即生效
      this._applyOperationEmojisToTitleFor(nodeId);
      // 点亮与当前节点内容匹配的标签
      this.highlightActiveTagsForSelectedNode();
      // 渲染附件列表
      this.renderAttachmentList(nodeId);
    }

    bindDetailEvents(){
      const titleInput = this.dom.titleInput;
      const contentEditor = this.dom.contentEditor;
      if (titleInput) {
        titleInput.addEventListener('blur', () => this.saveTitleFromDetail());
        titleInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); this.saveTitleFromDetail(); }
          // Tab: 跳转到内容框
          if (e.key === 'Tab') {
            e.preventDefault();
            if (this.dom && this.dom.contentEditor){ this.dom.contentEditor.focus(); }
          }
        });
      }
      if (contentEditor) {
        const debouncedSave = this._debounceSave.bind(this);
        // 占位符策略：聚焦时才将真实内容写入编辑器，避免空值覆盖
        contentEditor.addEventListener('focus', () => {
          this._debugLog('=== 内容编辑器获得焦点 ===');
          if (!this.selectedNode) {
            this._debugLog('没有选中节点，退出');
            return;
          }
          const node = this.findNode(this.selectedNode);
          if (!node) {
            this._debugLog('未找到节点数据，退出');
            return;
          }
          
          // 兼容富文本编辑器和普通textarea
          let curVal = '';
          if (contentEditor.tagName === 'DIV') {
            curVal = this._getMarkdownFromDiv(contentEditor);
          } else {
            curVal = contentEditor.value || '';
          }
          
          const saved = node.content || '';
          this._debugLog('当前值长度:', curVal.length);
          this._debugLog('保存值长度:', saved.length);
          this._debugLog('保存值预览:', saved.substring(0, 100) + '...');
          
          if (curVal.trim() === '' && saved.trim() !== ''){
            // 兼容富文本编辑器和普通textarea
            if (contentEditor.tagName === 'DIV') {
              this._renderRichContent(saved, contentEditor);
            } else {
              contentEditor.value = saved;
              contentEditor.placeholder = '';
            }
            this._debugLog('已恢复保存的内容到编辑器');
          }
          // 总是显示已保存的图片（无论内容是否为空）
          this._debugLog('开始显示已保存的图片');
          this._displaySavedImages(contentEditor, saved);
        });
        // 输入事件 - 只绑定给普通textarea，富文本编辑器有自己的事件绑定
        if (contentEditor.tagName !== 'DIV') {
          contentEditor.addEventListener('input', () => { this._contentDirty = true; debouncedSave(); });
        }
        contentEditor.addEventListener('blur', () => {
          this._debugLog('=== 内容编辑器失去焦点 ===');
          this.saveContentFromDetail();
          // 失去焦点时保持图片显示
          if (this.selectedNode) {
            this._debugLog('选中节点ID:', this.selectedNode);
            const node = this.findNode(this.selectedNode);
            if (node && node.content) {
              this._debugLog('节点内容长度:', node.content.length);
              this._debugLog('开始重新显示图片');
              this._displaySavedImages(contentEditor, node.content);
            } else {
              this._debugLog('节点或内容为空');
            }
          } else {
            this._debugLog('没有选中节点');
          }
        });
        
        // 粘贴事件：支持截图和图片文件
        contentEditor.addEventListener('paste', (e) => {
          this._handleContentPaste(e, contentEditor);
        });

        // 构建编辑器容器与工具栏（全屏/复制/粘贴）并固定到内容框顶部右侧
        try{
          // 若尚未包裹，则创建包装容器
          if (!contentEditor.closest('.mm-editor-wrap')){
            const wrap = document.createElement('div');
            wrap.className = 'mm-editor-wrap';
            // 在原位置插入 wrap 并把 textarea 放进去
            contentEditor.parentElement.insertBefore(wrap, contentEditor);
            wrap.appendChild(contentEditor);

            // 工具栏容器
            const toolbar = document.createElement('div');
            toolbar.className = 'mm-editor-toolbar';
            wrap.appendChild(toolbar);

            // 全屏按钮
            const btnFull = document.createElement('button');
            btnFull.type = 'button';
            btnFull.className = 'mm-toolbar-btn mm-btn-fullscreen';
            btnFull.textContent = '全屏';
            btnFull.title = '全屏编辑 (F / Alt+Enter)';
            btnFull.addEventListener('click', () => this.enterFullscreenEditor());
            toolbar.appendChild(btnFull);
            this.dom.fullscreenBtn = btnFull;

            // 复制按钮
            const btnCopy = document.createElement('button');
            btnCopy.type = 'button';
            btnCopy.className = 'mm-toolbar-btn';
            btnCopy.textContent = '复制';
            btnCopy.title = '复制内容到剪贴板';
            btnCopy.addEventListener('click', async ()=>{
              try{
                await navigator.clipboard.writeText(contentEditor.value || '');
                this.showToast('已复制到剪贴板');
              }catch(err){ console.warn('复制失败', err); }
            });
            toolbar.appendChild(btnCopy);

            // 粘贴按钮
            const btnPaste = document.createElement('button');
            btnPaste.type = 'button';
            btnPaste.className = 'mm-toolbar-btn';
            btnPaste.textContent = '粘贴';
            btnPaste.title = '从剪贴板粘贴到光标处';
            btnPaste.addEventListener('click', async ()=>{
              try{
                const text = await navigator.clipboard.readText();
                this._insertAtCursor(contentEditor, text || '');
                this._contentDirty = true; this._debounceSave();
              }catch(err){ console.warn('粘贴失败', err); }
            });
            toolbar.appendChild(btnPaste);

            // 快捷键（全屏）
            contentEditor.addEventListener('keydown', (e)=>{
              if ((e.altKey && e.key === 'Enter') || e.key === 'F') {
                e.preventDefault();
                this.enterFullscreenEditor();
                return;
              }
              // Tab: 打开全屏
              if (e.key === 'Tab'){
                e.preventDefault();
                this.enterFullscreenEditor();
              }
            });
          }
        }catch(err){ console.warn('注入编辑器工具栏失败', err); }
      }
      // 附件事件绑定
      try{
        const btn = this.dom.attachBtn;
        const input = this.dom.attachInput;
        if (btn && input){
          btn.addEventListener('click', () => { input.click(); });
          input.addEventListener('change', (e)=>{
            const files = Array.from(e.target.files || []);
            if (files.length){ this._handleAttachmentFiles(files); }
            // 重置 input，便于重复选择同一文件
            e.target.value = '';
          });
        }
        // 附件列表事件委托（查看/删除）
        const list = this.dom.attachList;
        if (list && !list._mmBound){
          list.addEventListener('click', (e)=>{
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.getAttribute('data-action');
            const idxStr = target.getAttribute('data-index');
            const index = idxStr ? parseInt(idxStr, 10) : -1;
            if (index < 0) return;
            if (action === 'view'){
              const n = this.findNode(this.selectedNode);
              if (!n || !Array.isArray(n.attachments) || !n.attachments[index]) return;
              const att = n.attachments[index];
              try{
                const a = document.createElement('a');
                a.href = att.url || att.dataUrl || '#';
                a.download = att.name || 'attachment';
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }catch(_){ this.showToast('无法打开附件', 'error'); }
            } else if (action === 'remove'){
              this._removeAttachmentAt(index);
            }
          });
          list._mmBound = true;
        }
      }catch(e){ console.warn('绑定附件事件失败', e); }
    }

    // —— 附件渲染 ——
    renderAttachmentList(nodeId){
      try{
        const list = this.dom && this.dom.attachList;
        if (!list) return;
        const n = this.findNode(nodeId || this.selectedNode);
        if (!n){ list.innerHTML = '<div class="att-empty">未选择节点</div>'; return; }
        const items = Array.isArray(n.attachments) ? n.attachments : [];
        if (!items.length){ list.innerHTML = '<div class="att-empty">暂无附件</div>'; return; }
        list.innerHTML = items.map((att, i)=>{
          const name = (att && att.name) ? att.name : `附件${i+1}`;
          const size = att && (att.size!=null) ? ` · ${this._formatBytes(att.size)}` : '';
          const type = att && att.type ? ` · ${att.type}` : '';
          const ts = att && att.ts ? ` · ${att.ts}` : '';
          return `
            <div class="att-item">
              <span class="att-name" title="${name}">${name}</span>
              <span class="att-meta">${size}${type}${ts}</span>
              <span class="att-actions">
                <button class="mm-btn att-view" data-action="view" data-index="${i}">查看/下载</button>
                <button class="mm-btn att-remove" data-action="remove" data-index="${i}">删除</button>
              </span>
            </div>`;
        }).join('');
      }catch(e){ console.warn('渲染附件列表失败', e); }
    }

    // —— 处理内容编辑器的粘贴事件（支持截图） ——
    _handleContentPaste(e, contentEditor) {
      try {
        console.log('粘贴事件触发');
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) {
          console.log('无法获取剪贴板数据');
          return;
        }

        const items = clipboardData.items;
        if (!items) {
          console.log('剪贴板中没有项目');
          return;
        }

        console.log('剪贴板项目数量:', items.length);
        
        // 检查是否有图片文件
        let hasImage = false;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          console.log(`项目 ${i}: 类型=${item.type}, 种类=${item.kind}`);
          
          if (item.type.indexOf('image') !== -1) {
            hasImage = true;
            e.preventDefault(); // 阻止默认粘贴行为
            console.log('发现图片，开始处理');
            
            const file = item.getAsFile();
            if (file) {
              console.log('获取到文件:', file.name, file.type, file.size);
              this._insertImageFromFile(file, contentEditor);
            } else {
              console.log('无法获取文件对象');
            }
            break;
          }
        }

        // 如果没有图片，让默认的文本粘贴继续
        if (!hasImage) {
          console.log('没有发现图片，继续文本粘贴');
          // 标记内容已修改
          this._contentDirty = true;
          this._debounceSave();
        }
      } catch (err) {
        console.warn('处理粘贴事件失败:', err);
      }
    }

    // —— 将图片文件转换为base64并插入到编辑器 ——
    _insertImageFromFile(file, contentEditor) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target.result;
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = file.name || `screenshot-${timestamp}.png`;
          
          console.log('开始插入图片:', filename, 'Base64长度:', base64.length);
          
          // 直接插入Markdown图片语法
          const imageMarkdown = `![${filename}](${base64})`;
          
          if (contentEditor.tagName === 'DIV') {
            // 富文本编辑器：插入到光标位置
            this._insertAtCursorInDiv(contentEditor, imageMarkdown);
          } else {
            // 普通textarea：插入到光标位置
            this._insertAtCursor(contentEditor, imageMarkdown);
          }
          
          // 更新节点内容数据
          if (this.selectedNode) {
            const node = this.findNode(this.selectedNode);
            if (node) {
              // 获取当前内容
              const currentContent = contentEditor.tagName === 'DIV' 
                ? this._getMarkdownFromDiv(contentEditor)
                : contentEditor.value;
              node.content = currentContent;
              
              // 同步到jsMind节点
              const jmNode = this.mind.get_node(this.selectedNode);
              if (jmNode) {
                jmNode.data = jmNode.data || {};
                jmNode.data.content = node.content;
              }
              
              this._debugLog('图片已保存到节点', { 
                nodeId: this.selectedNode, 
                contentLength: node.content.length,
                hasBase64: node.content.includes('data:image')
              });
            }
          }
          
          // 如果是富文本编辑器，立即重新渲染以显示图片
          if (contentEditor.tagName === 'DIV') {
            const content = this._getMarkdownFromDiv(contentEditor);
            this._renderRichContent(content, contentEditor);
          }
          
          // 标记内容已修改并保存
          this._contentDirty = true;
          this._debounceSave();
          
          this.showToast('截图已插入');
        };
        
        reader.onerror = () => {
          this.showToast('读取图片失败', 'error');
        };
        
        reader.readAsDataURL(file);
      } catch (err) {
        console.warn('插入图片失败:', err);
        this.showToast('插入图片失败', 'error');
      }
    }

    // —— 创建调试面板 ——
    _createDebugPanel() {
      try {
        // 检查是否已存在
        if (document.querySelector('.debug-panel')) return;
        
        const panel = document.createElement('div');
        panel.className = 'debug-panel';
        panel.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          width: 400px;
          height: 300px;
          background: rgba(0,0,0,0.9);
          color: #00ff00;
          font-family: monospace;
          font-size: 12px;
          border: 1px solid #333;
          border-radius: 4px;
          z-index: 10000;
          display: block;
        `;
        
        const header = document.createElement('div');
        header.textContent = '调试信息 - 截图粘贴功能';
        header.style.cssText = `
          background: #333;
          color: white;
          padding: 5px 10px;
          font-weight: bold;
          border-bottom: 1px solid #555;
        `;
        
        const content = document.createElement('div');
        content.className = 'debug-content';
        content.style.cssText = `
          padding: 10px;
          height: 250px;
          overflow-y: auto;
          line-height: 1.4;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
          position: absolute;
          top: 5px;
          right: 10px;
          background: none;
          border: none;
          color: white;
          font-size: 16px;
          cursor: pointer;
        `;
        closeBtn.addEventListener('click', () => {
          panel.style.display = 'none';
        });
        
        panel.appendChild(header);
        panel.appendChild(content);
        panel.appendChild(closeBtn);
        document.body.appendChild(panel);
        
        this._debugLog('调试面板已创建');
      } catch (err) {
        console.warn('创建调试面板失败:', err);
      }
    }

    // —— 调试日志方法 ——
    _debugLog(message, data = null) {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data) : ''}`;
      this.debugMessages.push(logEntry);
      console.log(logEntry);
      
      // 保持调试消息数量在合理范围内
      if (this.debugMessages.length > 100) {
        this.debugMessages = this.debugMessages.slice(-50);
      }
      
      // 使用控制台调试输出
      try {
        console.debug('[ImageDebug]', message, data);
      } catch (err) {
        // 忽略调试输出错误
      }
    }

    // —— 转换为富文本编辑器 ——
    _convertToRichTextEditor() {
      try {
        const textarea = this.dom.contentEditor;
        if (!textarea || textarea.tagName !== 'TEXTAREA') return;
        
        this._debugLog('开始转换为富文本编辑器');
        
        // 创建contenteditable div
        const richEditor = document.createElement('div');
        richEditor.id = textarea.id;
        richEditor.className = textarea.className + ' rich-text-editor';
        richEditor.contentEditable = true;
        richEditor.style.cssText = textarea.style.cssText + `
          min-height: ${textarea.style.height || '200px'};
          border: 1px solid #ccc;
          padding: 8px;
          background: white;
          overflow-y: auto;
          font-family: inherit;
          font-size: inherit;
          line-height: 1.4;
        `;
        
        // 保存当前内容
        const currentContent = textarea.value || '';
        
        // 替换textarea
        textarea.parentElement.insertBefore(richEditor, textarea);
        textarea.remove();
        
        // 更新DOM引用
        this.dom.contentEditor = richEditor;
        
        // 渲染内容
        this._renderRichContent(currentContent, richEditor);
        
        // 绑定事件
        this._bindRichEditorEvents(richEditor);
        
        this._debugLog('富文本编辑器转换完成');
        
      } catch (err) {
        console.warn('转换富文本编辑器失败:', err);
        this._debugLog('转换失败:', err.message);
      }
    }

    // —— 渲染富文本内容 ——
    _renderRichContent(markdownContent, editor) {
      if (!editor) editor = this.dom.contentEditor;
      if (!editor || editor.tagName !== 'DIV') return;
      
      try {
        // 使用现有的MD预览渲染逻辑
        this._renderMdPreview(editor, markdownContent);
        
        // 为图片添加删除按钮
        this._addImageDeleteButtons(editor);
        
        // 保存原始Markdown内容到data属性
        editor.dataset.markdownContent = markdownContent;
        
        this._debugLog('富文本内容渲染完成', { contentLength: markdownContent.length });
        
      } catch (err) {
        console.warn('渲染富文本内容失败:', err);
        this._debugLog('渲染失败:', err.message);
      }
    }

    // —— 为图片添加删除按钮 ——
    _addImageDeleteButtons(editor) {
      if (!editor) return;
      
      try {
        const images = editor.querySelectorAll('img');
        images.forEach((img, index) => {
          // 检查是否已经有删除按钮
          if (img.parentElement.querySelector('.image-delete-btn')) return;
          
          // 创建图片容器
          const imgContainer = document.createElement('div');
          imgContainer.className = 'rich-image-container';
          imgContainer.style.cssText = `
            position: relative;
            display: inline-block;
            margin: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
          `;
          
          // 创建删除按钮
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'image-delete-btn';
          deleteBtn.innerHTML = '×';
          deleteBtn.title = '删除图片';
          deleteBtn.style.cssText = `
            position: absolute;
            top: 2px;
            right: 2px;
            width: 20px;
            height: 20px;
            background: rgba(255, 0, 0, 0.7);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
            z-index: 10;
          `;
          
          // 删除按钮悬停效果
          deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.background = 'rgba(255, 0, 0, 0.9)';
          });
          deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.background = 'rgba(255, 0, 0, 0.7)';
          });
          
          // 删除功能
          deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._deleteImageFromRichEditor(img, editor);
          });
          
          // 将图片包装在容器中
          img.parentElement.insertBefore(imgContainer, img);
          imgContainer.appendChild(img);
          imgContainer.appendChild(deleteBtn);
          
          // 调整图片样式
          img.style.cssText = `
            display: block;
            max-width: 100%;
            height: auto;
          `;
        });
        
        this._debugLog('为图片添加删除按钮完成', { imageCount: images.length });
        
      } catch (err) {
        console.warn('添加图片删除按钮失败:', err);
      }
    }

    // —— 从富文本编辑器删除图片 ——
    _deleteImageFromRichEditor(imgElement, editor) {
      try {
        // 获取图片的src用于从Markdown中移除
        const imgSrc = imgElement.src;
        const imgAlt = imgElement.alt || '';
        
        // 移除图片容器
        const container = imgElement.closest('.rich-image-container');
        if (container) {
          container.remove();
        } else {
          imgElement.remove();
        }
        
        // 更新Markdown内容
        let currentMarkdown = this._getMarkdownFromDiv(editor);
        
        // 移除对应的Markdown图片语法
        const imageMarkdownPattern = new RegExp(`!\\[${imgAlt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\([^)]*\\)`, 'g');
        currentMarkdown = currentMarkdown.replace(imageMarkdownPattern, '');
        
        // 如果没有找到精确匹配，尝试移除包含相同base64开头的图片
        if (imgSrc.startsWith('data:image')) {
          const base64Start = imgSrc.substring(0, 50); // 取前50个字符作为匹配
          const base64Pattern = new RegExp(`!\\[[^\\]]*\\]\\([^)]*${base64Start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^)]*\\)`, 'g');
          currentMarkdown = currentMarkdown.replace(base64Pattern, '');
        }
        
        // 清理多余的空行
        currentMarkdown = currentMarkdown.replace(/\n\n+/g, '\n\n').trim();
        
        // 更新编辑器内容
        editor.dataset.markdownContent = currentMarkdown;
        
        // 重新渲染内容
        this._renderRichContent(currentMarkdown, editor);
        
        // 标记内容已修改并保存
        this._contentDirty = true;
        this._debounceSave();
        
        this._debugLog('图片删除完成', { 
          deletedSrc: imgSrc.substring(0, 50) + '...',
          newContentLength: currentMarkdown.length
        });
        
        this.showToast('图片已删除');
        
      } catch (err) {
        console.warn('删除图片失败:', err);
        this.showToast('删除图片失败', 'error');
      }
    }

    // —— 从富文本编辑器获取Markdown内容 ——
    _getMarkdownFromDiv(editor) {
      if (!editor || editor.tagName !== 'DIV') return '';
      
      try {
        // 从HTML转换为Markdown
        let html = editor.innerHTML;
        
        // 处理纯文本节点（用户直接输入的文本）
        let textContent = editor.textContent || '';
        
        // 复杂HTML转Markdown
        let markdown = html
          .replace(/<img[^>]+alt="([^"]*)"[^>]+src="([^"]+)"[^>]*>/g, '![$1]($2)')
          .replace(/<h([1-6])>(.*?)<\/h[1-6]>/g, (m, level, text) => '#'.repeat(parseInt(level)) + ' ' + text)
          .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
          .replace(/<em>(.*?)<\/em>/g, '*$1*')
          .replace(/<del>(.*?)<\/del>/g, '~~$1~~')
          .replace(/<code>(.*?)<\/code>/g, '`$1`')
          .replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
          .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
          .replace(/<br\s*\/?>/g, '\n')
          .replace(/<div[^>]*>(.*?)<\/div>/g, '$1\n')
          .replace(/<[^>]+>/g, '') // 移除其他HTML标签
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/\n\n+/g, '\n\n')
          .trim();
        
        this._debugLog('从富文本编辑器获取内容', { 
          htmlLength: html.length, 
          textLength: textContent.length,
          markdownLength: markdown.length,
          htmlPreview: html.substring(0, 100),
          textPreview: textContent.substring(0, 100),
          markdownPreview: markdown.substring(0, 100)
        });
        
        return markdown;
        
      } catch (err) {
        console.warn('从富文本编辑器获取内容失败:', err);
        // 回退到纯文本
        return editor.textContent || '';
      }
    }

    // —— 在富文本编辑器中插入内容 ——
    _insertAtCursorInDiv(editor, text) {
      if (!editor || editor.tagName !== 'DIV') return;
      
      try {
        // 获取当前Markdown内容
        const currentMarkdown = this._getMarkdownFromDiv(editor);
        
        // 简单追加到末尾（可以后续优化为真正的光标位置插入）
        const newMarkdown = currentMarkdown + (currentMarkdown ? '\n\n' : '') + text;
        
        // 更新并重新渲染
        this._renderRichContent(newMarkdown, editor);
        
      } catch (err) {
        console.warn('在富文本编辑器中插入内容失败:', err);
      }
    }

    // —— 绑定富文本编辑器事件 ——
    _bindRichEditorEvents(editor) {
      if (!editor) return;
      
      try {
        // 输入事件 - 实时更新Markdown内容到dataset
        editor.addEventListener('input', () => {
          // 实时获取并保存Markdown内容
          const markdownContent = this._getMarkdownFromDiv(editor);
          editor.dataset.markdownContent = markdownContent;
          
          this._contentDirty = true;
          
          // 使用原有的防抖保存机制
          if (this._debounceSave) {
            this._debounceSave();
          }
          
          this._debugLog('富文本编辑器内容更新', { 
            contentLength: markdownContent.length,
            preview: markdownContent.substring(0, 50)
          });
        });
        
        // 粘贴事件
        editor.addEventListener('paste', (e) => {
          this._handleContentPaste(e, editor);
        });
        
        this._debugLog('富文本编辑器事件绑定完成');
        
      } catch (err) {
        console.warn('绑定富文本编辑器事件失败:', err);
      }
    }

    // —— 显示已保存的图片 ——
    _displaySavedImages(contentEditor, content) {
      try {
        this._debugLog('=== _displaySavedImages 开始 ===');
        this._debugLog('内容长度:', content ? content.length : 0);
        this._debugLog('内容预览:', content ? content.substring(0, 100) + '...' : '无内容');
        
        // 检查现有的图片显示区域
        let existingImageArea = contentEditor.parentElement.querySelector('.content-images-area');
        this._debugLog('现有图片区域:', existingImageArea ? '存在' : '不存在');
        
        // 匹配Markdown图片语法
        const imageRegex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
        let match;
        const images = [];
        
        while ((match = imageRegex.exec(content)) !== null) {
          images.push({
            filename: match[1] || 'image',
            base64: match[2]
          });
        }
        
        this._debugLog('找到图片数量:', images.length);
        images.forEach((img, i) => {
          this._debugLog(`图片 ${i}: ${img.filename}, Base64长度: ${img.base64.length}`);
        });
        
        // 如果没有图片，清除所有图片预览
        if (images.length === 0) {
          this._debugLog('没有图片，清除所有图片预览');
          const overlayContainer = contentEditor.parentElement.querySelector('.image-overlay-container');
          if (overlayContainer) {
            const existingPreviews = overlayContainer.querySelectorAll('.image-preview');
            existingPreviews.forEach(preview => preview.remove());
          }
          if (existingImageArea) {
            existingImageArea.style.display = 'none';
          }
          return;
        }
        
        // 在textarea中显示图片占位符
        let displayContent = content;
        images.forEach((img) => {
          const imageMarkdown = `![${img.filename}](${img.base64})`;
          const imagePlaceholder = `📷 ${img.filename}`;
          displayContent = displayContent.replace(imageMarkdown, imagePlaceholder);
        });
        
        // 更新textarea显示内容（仅显示占位符，不修改实际保存的内容）
        if (contentEditor.value !== displayContent) {
          contentEditor.value = displayContent;
          this._debugLog('已更新textarea显示内容，图片显示为📷占位符');
        }
        
        this._debugLog('=== _displaySavedImages 结束 ===');
      } catch (err) {
        console.warn('显示已保存图片失败:', err);
        this._debugLog('显示图片失败:', err.message);
      }
    }

    // —— 创建图片预览覆盖层（在textarea内部显示图片）——
    _createImageOverlay(contentEditor, base64, filename, markdownText) {
      try {
        // 获取或创建图片覆盖层容器
        let wrapper = contentEditor.parentElement.querySelector('.textarea-wrapper');
        let overlayContainer = wrapper ? wrapper.querySelector('.image-overlay-container') : null;
        
        if (!wrapper) {
          // 创建包装容器
          wrapper = document.createElement('div');
          wrapper.className = 'textarea-wrapper';
          wrapper.style.cssText = `
            position: relative; 
            display: block; 
            width: 100%;
          `;
          
          // 将textarea包装起来
          contentEditor.parentElement.insertBefore(wrapper, contentEditor);
          wrapper.appendChild(contentEditor);
          
          // 创建覆盖层容器
          overlayContainer = document.createElement('div');
          overlayContainer.className = 'image-overlay-container';
          overlayContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 10;
          `;
          wrapper.appendChild(overlayContainer);
        }
        
        // 创建图片预览元素
        const imgPreview = document.createElement('div');
        imgPreview.className = 'image-preview';
        imgPreview.style.cssText = `
          position: absolute;
          background: white;
          border: 2px solid #007cba;
          border-radius: 4px;
          padding: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          z-index: 1000;
          pointer-events: auto;
          max-width: 200px;
        `;
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = base64;
        img.alt = filename;
        img.style.cssText = `
          max-width: 100%;
          height: auto;
          display: block;
          border-radius: 2px;
        `;
        
        // 创建文件名标签
        const label = document.createElement('div');
        label.textContent = filename;
        label.style.cssText = `
          font-size: 11px;
          color: #666;
          margin-top: 2px;
          text-align: center;
          word-break: break-all;
        `;
        
        // 创建删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.title = '删除图片';
        deleteBtn.style.cssText = `
          position: absolute;
          top: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          border: none;
          background: #ff4444;
          color: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
        `;
        
        deleteBtn.addEventListener('click', () => {
          // 从textarea内容中移除对应的Markdown
          contentEditor.value = contentEditor.value.replace(markdownText, '').replace(/\n\n\n+/g, '\n\n').trim();
          
          // 更新节点数据
          if (this.selectedNode) {
            const node = this.findNode(this.selectedNode);
            if (node) {
              node.content = contentEditor.value;
              const jmNode = this.mind.get_node(this.selectedNode);
              if (jmNode) {
                jmNode.data = jmNode.data || {};
                jmNode.data.content = node.content;
              }
            }
          }
          
          // 移除预览元素
          imgPreview.remove();
          
          // 标记内容已修改并保存
          this._contentDirty = true;
          this._debounceSave();
          
          this.showToast('图片已删除');
        });
        
        // 组装元素
        imgPreview.appendChild(img);
        imgPreview.appendChild(label);
        imgPreview.appendChild(deleteBtn);
        
        // 计算位置（在textarea右上角显示）
        const rect = contentEditor.getBoundingClientRect();
        const containerRect = overlayContainer.getBoundingClientRect();
        imgPreview.style.top = '10px';
        imgPreview.style.right = '10px';
        
        overlayContainer.appendChild(imgPreview);
        
        this._debugLog('图片预览覆盖层已创建', { filename });
        
      } catch (err) {
        console.warn('创建图片预览覆盖层失败:', err);
        this._debugLog('创建图片预览失败', err.message);
      }
    }

    // —— 创建图片显示容器 ——
    _createImageContainer(contentEditor, base64, filename) {
      try {
        console.log('创建图片容器:', filename);
        console.log('contentEditor:', contentEditor);
        console.log('contentEditor.parentElement:', contentEditor.parentElement);
        
        // 查找或创建图片显示区域
        let imageArea = contentEditor.parentElement.querySelector('.content-images-area');
        console.log('现有imageArea:', imageArea);
        
        if (!imageArea) {
          imageArea = document.createElement('div');
          imageArea.className = 'content-images-area';
          imageArea.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #f9f9f9;
            max-height: 300px;
            overflow-y: auto;
            display: block;
          `;
          
          // 添加标题
          const title = document.createElement('div');
          title.textContent = '插入的图片：';
          title.style.cssText = 'font-weight: bold; margin-bottom: 8px; color: #666;';
          imageArea.appendChild(title);
          
          contentEditor.parentElement.appendChild(imageArea);
          console.log('创建了新的imageArea:', imageArea);
        }
        
        // 创建图片容器
        const imgContainer = document.createElement('div');
        imgContainer.className = 'inserted-image';
        imgContainer.style.cssText = `
          margin-bottom: 10px;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: white;
          position: relative;
        `;
        
        // 创建图片元素
        const img = document.createElement('img');
        img.src = base64;
        img.alt = filename;
        img.style.cssText = `
          max-width: 100%;
          height: auto;
          display: block;
          border-radius: 4px;
        `;
        
        // 创建文件名标签
        const label = document.createElement('div');
        label.textContent = filename;
        label.style.cssText = `
          font-size: 12px;
          color: #666;
          margin-top: 4px;
          word-break: break-all;
        `;
        
        // 创建删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.title = '删除图片';
        deleteBtn.style.cssText = `
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border: none;
          background: rgba(255,0,0,0.7);
          color: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
        `;
        
        deleteBtn.addEventListener('click', () => {
          // 从内容中移除对应的Markdown
          const imageMarkdown = `![${filename}](${base64})`;
          contentEditor.value = contentEditor.value.replace(imageMarkdown, '').replace(/\n\n\n+/g, '\n\n').trim();
          
          // 移除图片容器
          imgContainer.remove();
          
          // 如果没有图片了，隐藏图片区域
          const remainingImages = imageArea.querySelectorAll('.inserted-image');
          if (remainingImages.length === 0) {
            imageArea.style.display = 'none';
          }
          
          // 标记内容已修改并保存
          this._contentDirty = true;
          this._debounceSave();
          
          this.showToast('图片已删除');
        });
        
        // 组装元素
        imgContainer.appendChild(img);
        imgContainer.appendChild(label);
        imgContainer.appendChild(deleteBtn);
        imageArea.appendChild(imgContainer);
        
        // 显示图片区域
        imageArea.style.display = 'block';
        
      } catch (err) {
        console.warn('创建图片容器失败:', err);
      }
    }

    // —— 处理上传的附件文件 ——
    _handleAttachmentFiles(files){
      try{
        if (!this.selectedNode){ this.showToast('请先选择一个节点', 'error'); return; }
        const node = this.findNode(this.selectedNode);
        if (!node){ this.showToast('未找到选中节点', 'error'); return; }
        node.attachments = Array.isArray(node.attachments) ? node.attachments : [];

        const readAsDataUrl = (file)=> new Promise((resolve, reject)=>{
          try{
            const reader = new FileReader();
            reader.onload = ()=> resolve(reader.result);
            reader.onerror = (err)=> reject(err);
            reader.readAsDataURL(file);
          }catch(err){ reject(err); }
        });

        Promise.all(files.map(async (f)=>{
          const dataUrl = await readAsDataUrl(f);
          return {
            name: f.name,
            size: f.size,
            type: f.type || 'application/octet-stream',
            url: dataUrl, // 内联存储
            ts: this._nowTs(),
          };
        })).then((atts)=>{
          // 写入内部数据
          node.attachments.push(...atts);
          // 同步到 jsMind 节点数据，保证导出一致
          const jmNode = this.mind && this.mind.get_node(this.selectedNode);
          if (jmNode){
            jmNode.data = jmNode.data || {};
            jmNode.data.attachments = node.attachments.slice();
          }
          // 持久化并刷新 UI
          this.saveMindmapToStorage();
          this.renderAttachmentList(this.selectedNode);
          this.showToast(`已添加 ${atts.length} 个附件`);
        }).catch((err)=>{
          console.error('读取附件失败', err);
          this.showToast('读取附件失败', 'error');
        });
      }catch(e){ console.error('处理附件异常', e); this.showToast('处理附件异常', 'error'); }
    }

    _removeAttachmentAt(index){
      try{
        if (!this.selectedNode) return;
        const node = this.findNode(this.selectedNode);
        if (!node || !Array.isArray(node.attachments)) return;
        if (index < 0 || index >= node.attachments.length) return;
        const [removed] = node.attachments.splice(index, 1);
        // 同步 jsMind
        const jmNode = this.mind && this.mind.get_node(this.selectedNode);
        if (jmNode){
          jmNode.data = jmNode.data || {};
          jmNode.data.attachments = node.attachments.slice();
        }
        this.saveMindmapToStorage();
        this.renderAttachmentList(this.selectedNode);
        this.showToast(`已删除附件：${removed && removed.name ? removed.name : ''}`);
      }catch(e){ console.warn('删除附件失败', e); this.showToast('删除附件失败', 'error'); }
    }

    _formatBytes(bytes){
      try{
        const num = Number(bytes)||0;
        const units = ['B','KB','MB','GB','TB'];
        let i=0, val=num;
        while(val>=1024 && i<units.length-1){ val/=1024; i++; }
        return `${val.toFixed(val<10 && i>0 ? 1 : 0)} ${units[i]}`;
      }catch(_){ return `${bytes||0} B`; }
    }

    _insertAtCursor(textarea, text){
      try{
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || start;
        const value = textarea.value || '';
        textarea.value = value.slice(0, start) + text + value.slice(end);
        const pos = start + text.length;
        textarea.selectionStart = textarea.selectionEnd = pos;
        textarea.focus();
      }catch(_){
        // 兼容性退化：直接追加
        textarea.value = (textarea.value || '') + text;
      }
    }

    _debounceSave(){
      if (this._saveTimeout) clearTimeout(this._saveTimeout);
      this._saveTimeout = setTimeout(()=>{
        this.saveContentFromDetail();
      }, 800); // 增加延迟时间，减少保存频率
    }

    saveDetailsFor(nodeId){
      if (!nodeId) return;
      const prevSel = this.selectedNode;
      this.selectedNode = nodeId; // 临时指向，复用已有保存函数
      this.saveTitleFromDetail();
      this.saveContentFromDetail();
      this.selectedNode = prevSel;
    }

    saveTitleFromDetail(){
      if (!this.selectedNode) return;
      
      const node = this.findNode(this.selectedNode);
      if (!node) return;
      
      const titleInput = this.dom.titleInput;
      if (!titleInput) return;
      
      const newTitle = titleInput.value || '';
      
      try {
        // 更新内部数据结构
        node.label = newTitle;
        
        // 更新jsMind节点
        this.mind.update_node(this.selectedNode, newTitle);
        
        // 同步并保存
        this.saveMindmapToStorage();
        this.showToast('标题已保存');
        
      } catch (e) {
        console.error('[MindmapController] 保存标题异常:', e);
        this.showToast('保存失败', 'error');
      }
    }

    saveContentFromDetail(){
      if (!this.selectedNode) return;
      
      const node = this.findNode(this.selectedNode);
      if (!node) return;
      
      const contentEditor = this.dom.contentEditor;
      if (!contentEditor) return;
      
      let newContent = '';
      
      if (contentEditor.tagName === 'DIV') {
        // 富文本编辑器：获取Markdown内容
        newContent = this._getMarkdownFromDiv(contentEditor);
      } else {
        // 普通textarea
        newContent = contentEditor.value || '';
      }
      
      try {
        // 在占位符模式下：若未编辑过且输入为空，且已有内容存在，则跳过保存，避免空覆盖
        if (!this._contentDirty && newContent === '' && (node.content || '').length > 0) {
          return;
        }
        // 更新内部数据结构
        node.content = newContent;
        
        // 更新jsMind节点数据
        const jmNode = this.mind.get_node(this.selectedNode);
        if (jmNode) {
          jmNode.data = jmNode.data || {};
          jmNode.data.content = newContent;
        }
        
        this._debugLog('内容已保存', { 
          nodeId: this.selectedNode,
          contentLength: newContent.length,
          editorType: contentEditor.tagName
        });
        
        // 同步并保存
        this.saveMindmapToStorage();
        this.showToast('内容已保存');
        // 保存后复位脏标记
        this._contentDirty = false;
        
      } catch (e) {
        console.error('[MindmapController] 保存内容异常:', e);
        this.showToast('保存失败', 'error');
      }
    }

    // —— 节点增删 ——
    addChildNode(parentId){
      const parent = this.findNode(parentId);
      if (!parent){ this.showToast('未找到父节点'); return; }
      parent.children = parent.children || [];
      const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      const newNode = {
        id: newId,
        label: '新节点',
        content: '',
        children: [],
      };
      parent.children.push(newNode);
      // jsMind 增量添加
      this.mind.add_node(parentId, newId, newNode.label, null, { content: newNode.content });
  // 新增节点应用默认颜色（不覆盖用户后续自定义）
  try{ this.mind.set_node_color(newId, '#f5f5f5', '#333'); }catch(e){ /* ignore */ }
  // 若父节点折叠，则先展开父节点，保持内部expanded同步
  const pNode = this.mind.get_node(parentId);
      if (pNode && pNode.expanded === false) {
        try { this.mind.expand_node(pNode); } catch(e) { /* ignore */ }
        parent.expanded = true;
      }
      // 保存前先从 jsMind 同步一次数据到 this.data，确保新增节点已在内部结构中
      this.syncJsMindToData();
      this.saveMindmapToStorage();
      // 刷新标签面板
      this.renderTagPanelFromMind();
      const activate = ()=>{ this.setSelectedNode(newId); this.editNode(newId); };
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(activate);
      } else {
        setTimeout(activate, 0);
      }
    }

    addSiblingNode(nodeId){
      const parent = this.findParentNode(nodeId);
      if (!parent){ this.showToast('根节点不可添加同级'); return; }
      const idx = parent.children.findIndex(c=>c.id===nodeId);
      const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      const newNode = { id: newId, label: '新节点', content: '', children: [] };
      parent.children.splice(idx+1, 0, newNode);
      // 作为父的子节点添加，然后调整顺序（jsMind 无直接"插入到之后"的 API，刷新一次保持简单）
      this.renderMindmap();
      this.saveMindmapToStorage();
      this.setSelectedNode(newId);
    }

    removeNode(nodeId){
  if (nodeId === this.data.id){ this.showToast('根节点不可删除'); return; }
  const parent = this.findParentNode(nodeId);
  if (!parent) return;
  const idx = parent.children.findIndex(c=>c.id===nodeId);
  if (idx>=0) parent.children.splice(idx,1);
  this.mind.remove_node(nodeId);
  // 标记本次为“删除”操作，用于 MD 同步策略 delete_only
  try{ window.__MD_SYNC_OP = 'delete'; }catch(_){ }
  this.saveMindmapToStorage();
  this.setSelectedNode(parent.id);
  this.showToast('节点已删除');
}

    // —— 调试日志输出到页面 ——
    _logToPanel(title, content) {
      try {
        const logBody = document.getElementById('list-log-body');
        const logPanel = document.getElementById('list-log-panel');
        const logHeader = document.getElementById('list-log-header');
        const logCaret = document.getElementById('list-log-caret');
        const logControls = document.getElementById('list-log-controls');
        
        if (logBody) {
          const timestamp = new Date().toLocaleTimeString();
          const logEntry = `[${timestamp}] ${title}\n${content}\n\n`;
          logBody.textContent += logEntry;
          logBody.scrollTop = logBody.scrollHeight;
          
          // 自动展开日志面板
          if (logPanel && logPanel.dataset.collapsed === 'true') {
            logPanel.dataset.collapsed = 'false';
            logBody.style.display = 'block';
            if (logControls) logControls.style.display = 'flex';
            if (logCaret) logCaret.textContent = '▾';
          }
        }
      } catch(e) {
        console.log(title, content); // 回退到控制台
      }
    }

    // 初始化日志面板控制按钮
    _initLogPanelControls() {
      try {
        const logHeader = document.getElementById('list-log-header');
        const logPanel = document.getElementById('list-log-panel');
        const logBody = document.getElementById('list-log-body');
        const logControls = document.getElementById('list-log-controls');
        const logCaret = document.getElementById('list-log-caret');
        const clearBtn = document.getElementById('list-log-clear');
        const copyBtn = document.getElementById('list-log-copy');

        // 日志面板展开/折叠
        if (logHeader) {
          logHeader.addEventListener('click', () => {
            const isCollapsed = logPanel.dataset.collapsed === 'true';
            logPanel.dataset.collapsed = isCollapsed ? 'false' : 'true';
            logBody.style.display = isCollapsed ? 'block' : 'none';
            if (logControls) logControls.style.display = isCollapsed ? 'flex' : 'none';
            if (logCaret) logCaret.textContent = isCollapsed ? '▾' : '▸';
          });
        }

        // 清空按钮
        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            if (logBody) {
              logBody.textContent = '';
              this.showToast('日志已清空');
            }
          });
        }

        // 复制按钮
        if (copyBtn) {
          copyBtn.addEventListener('click', async () => {
            if (logBody && logBody.textContent) {
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(logBody.textContent);
                  this.showToast('日志已复制到剪贴板');
                } else {
                  // 回退方案
                  const textarea = document.createElement('textarea');
                  textarea.value = logBody.textContent;
                  textarea.style.position = 'fixed';
                  textarea.style.opacity = '0';
                  document.body.appendChild(textarea);
                  textarea.focus();
                  textarea.select();
                  try {
                    document.execCommand('copy');
                    this.showToast('日志已复制到剪贴板');
                  } catch(err) {
                    this.showToast('复制失败', 'error');
                  }
                  document.body.removeChild(textarea);
                }
              } catch(err) {
                this.showToast('复制失败', 'error');
              }
            } else {
              this.showToast('没有日志内容可复制');
            }
          });
        }
      } catch(e) {
        console.warn('初始化日志面板控制按钮失败:', e);
      }
    }

    // —— 复制/剪切/粘贴 ——
    copyNode(nodeId){
      // 调试：检查传入的nodeId和当前选中节点
      this._logToPanel('[DEBUG] copyNode - 传入nodeId:', nodeId || 'undefined');
      this._logToPanel('[DEBUG] copyNode - 当前selectedNode:', this.selectedNode || 'undefined');
      this._logToPanel('[DEBUG] copyNode - jsMind选中节点:', (this.mind.get_selected_node() && this.mind.get_selected_node().id) || 'undefined');
      
      const n = this.findNode(nodeId);
      if (!n){ this.showToast('未找到节点'); return; }
      
      // 调试：检查原始节点结构
      this._logToPanel('[DEBUG] copyNode - 原始节点:', JSON.stringify(n, null, 2));
      
      // 内部剪贴板：用于节点间的复制粘贴
      this.clipboard = JSON.parse(JSON.stringify(n));
      
      // 调试：检查剪贴板内容
      this._logToPanel('[DEBUG] copyNode - 剪贴板内容:', JSON.stringify(this.clipboard, null, 2));
      
      // 系统剪贴板：复制标题和内容到外部文本编辑器
      this._copyNodeToSystemClipboard(n);
      
      this.showToast('已复制');
    }

    // 将节点标题和内容复制到系统剪贴板
    _copyNodeToSystemClipboard(node) {
      try {
        const title = (node.label || node.topic || '').toString();
        const content = (node.content || '').toString();
        
        // 合并标题和内容，用换行分隔
        let combinedText = title;
        if (content && content.trim()) {
          combinedText += '\n\n' + content;
        }
        
        // 调试：显示要复制到系统剪贴板的内容
        this._logToPanel('[DEBUG] _copyNodeToSystemClipboard - 标题:', title);
        this._logToPanel('[DEBUG] _copyNodeToSystemClipboard - 内容:', content);
        this._logToPanel('[DEBUG] _copyNodeToSystemClipboard - 合并文本:', combinedText);
        
        const doToastOk = () => {
          this._logToPanel('[DEBUG] 系统剪贴板复制成功');
        };
        const doToastErr = () => {
          this._logToPanel('[DEBUG] 系统剪贴板复制失败');
          this.showToast('系统剪贴板复制失败', 'error');
        };
        
        // 优先使用 Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(combinedText).then(doToastOk).catch(() => {
            // 回退方案
            try {
              const ta = document.createElement('textarea');
              ta.style.position = 'fixed'; 
              ta.style.left = '-9999px';
              ta.value = combinedText; 
              document.body.appendChild(ta); 
              ta.select();
              const ok = document.execCommand && document.execCommand('copy');
              document.body.removeChild(ta);
              ok ? doToastOk() : doToastErr();
            } catch(_) { 
              doToastErr(); 
            }
          });
        } else {
          // 直接使用回退方案
          try {
            const ta = document.createElement('textarea');
            ta.style.position = 'fixed'; 
            ta.style.left = '-9999px';
            ta.value = combinedText; 
            document.body.appendChild(ta); 
            ta.select();
            const ok = document.execCommand && document.execCommand('copy');
            document.body.removeChild(ta);
            ok ? doToastOk() : doToastErr();
          } catch(_) { 
            doToastErr(); 
          }
        }
      } catch (e) {
        console.warn('复制到系统剪贴板失败:', e);
      }
    }

    cutNode(nodeId){
      if (nodeId === this.data.id){ this.showToast('根节点不可剪切'); return; }
      this.copyNode(nodeId);
      this.removeNode(nodeId);
    }

    pasteNode(targetNodeId, asChild=true){
      this._logToPanel('[DEBUG] pasteNode - 开始执行粘贴操作', `目标节点ID: ${targetNodeId}, asChild: ${asChild}`);
      
      if (!this.clipboard){ 
        this._logToPanel('[DEBUG] pasteNode - 剪贴板为空', '操作终止');
        this.showToast('剪贴板为空'); 
        return; 
      }
      
      const target = this.findNode(targetNodeId);
      if (!target){ 
        this._logToPanel('[DEBUG] pasteNode - 未找到目标节点', `节点ID: ${targetNodeId}`);
        this.showToast('未找到目标节点'); 
        return; 
      }
      
      // 调试：检查粘贴前的剪贴板内容
      this._logToPanel('[DEBUG] pasteNode - 粘贴前剪贴板:', JSON.stringify(this.clipboard, null, 2));
      
      const clone = JSON.parse(JSON.stringify(this.clipboard));
      
      // 调试：检查克隆后的内容
      this._logToPanel('[DEBUG] pasteNode - 克隆后内容:', JSON.stringify(clone, null, 2));
      
      // 重新生成整棵子树的 id
      const remap = {};
      const regen = (node)=>{
        const oldId = node.id;
        const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        remap[oldId] = newId;
        node.id = newId;
        if (node.children){ 
          this._logToPanel('[DEBUG] regen - 处理子节点:', node.children.length + '个');
          node.children.forEach(regen); 
        }
      };
      regen(clone);
      
      // 调试：检查ID重新生成后的内容
      this._logToPanel('[DEBUG] pasteNode - ID重新生成后:', JSON.stringify(clone, null, 2));
      
      if (asChild){
        target.children = target.children || [];
        target.children.push(clone);
      } else {
        const parent = this.findParentNode(targetNodeId);
        if (!parent){ this.showToast('根节点不可粘贴为同级'); return; }
        const idx = parent.children.findIndex(c=>c.id===targetNodeId);
        parent.children.splice(idx+1, 0, clone);
      }
      this.renderMindmap();
      this.saveMindmapToStorage();
      this.setSelectedNode(clone.id);
    }

    // 将指定节点的整棵子树序列化为 jsMind node_tree JSON 并复制到剪贴板
    copySubtreeJSON(nodeId){
    try{
      const n = this.findNode(nodeId);
      if (!n){ this.showToast('未找到节点'); return; }
      // 使用精简序列化，去除重复字段
      const tree = this._toJsMindTreeLean(n);
      const json = JSON.stringify(tree, null, 2);
      // 优先使用 Clipboard API 确保以纯文本写入
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(json).then(()=>{
          this.showToast('子树JSON已复制到剪贴板');
        }).catch(()=>{
          // 退化：使用 textarea + _copyFs
          const ta = document.createElement('textarea');
          ta.style.position = 'fixed'; ta.style.left = '-9999px';
          ta.value = json; document.body.appendChild(ta); ta.select();
          this._copyFs(ta); document.body.removeChild(ta);
        });
      } else {
        // 兼容旧环境
        const ta = document.createElement('textarea');
        ta.style.position = 'fixed'; ta.style.left = '-9999px';
        ta.value = json; document.body.appendChild(ta); ta.select();
        this._copyFs(ta); document.body.removeChild(ta);
      }
    }catch(err){
      console.error(err);
    }
  }

    // 将指定节点的整棵子树导出为本地JSON文件（优先文件保存选择器）
    async exportSubtreeJSON(nodeId){
      try{
        const n = this.findNode(nodeId);
        if (!n){ this.showToast('未找到节点'); return; }
        const tree = this._toJsMindTreeLean(n);
        const json = JSON.stringify(tree, null, 2);
        const suggestedBase = (n.label || n.topic || 'subtree').toString().replace(/\s+/g,'_').slice(0,50);
        const suggestedName = `${suggestedBase}_${n.id}.subtree.json`;

        // 优先使用 File System Access API（Chromium 浏览器）
        if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function'){
          try{
            const handle = await window.showSaveFilePicker({
              suggestedName,
              types: [{ description: 'JSON 文件', accept: { 'application/json': ['.json'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(new Blob([json], { type: 'application/json' }));
            await writable.close();
            this.showToast('子树JSON已保存');
            return;
          }catch(pickErr){
            // 用户取消直接退出；其他错误回退到下载
            if (pickErr && pickErr.name === 'AbortError'){ this.showToast('已取消保存'); return; }
            console.warn('showSaveFilePicker 失败，回退到下载方式:', pickErr);
          }
        }

        // 回退：使用 a[download]
        const blob = new Blob([json], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        this.showToast('子树JSON已导出');
      }catch(err){
        console.error(err);
        this.showToast('导出子树失败', 'error');
      }
    }
    findNode(id){
      const dfs=(n)=>{
        if (n.id===id) return n;
        if (!n.children) return null;
        for(const ch of n.children){
          const r = dfs(ch); if(r) return r;
        }
        return null;
      };
      return dfs(this.data);
    }

    findParentNode(id){
      const dfs=(n)=>{
        if (!n.children) return null;
        for(const ch of n.children){
          if (ch.id===id) return n;
          const r = dfs(ch); if(r) return r;
        }
        return null;
      };
      return dfs(this.data);
    }

    // —— 导入导出 ——
    _suggestFileName(){
      try{
        // 优先从 jsMind 根节点获取标题
        let title = '';
        try {
          const root = this.mind && this.mind.get_root && this.mind.get_root();
          if (root) title = root.topic || '';
        } catch(_){ /* ignore */ }
        // 回退：内部数据结构的根 label
        if (!title && this.data && this.data.label){ title = this.data.label; }
        // 最终回退
        if (!title) title = 'mindmap';
        // 清理成文件名友好格式
        const cleaned = String(title)
          .replace(/[\\/:*?"<>|]+/g, ' ')
          .replace(/\s+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 80) || 'mindmap';
        return `${cleaned}.mindmap.json`;
      }catch(_){ return 'mindmap.mindmap.json'; }
    }

    /**
     * 保存当前脑图为MD格式
     */
    exportMindmapToMD() {
      try {
        const result = window.MDExporter.saveMDToFile(this.data);
        result.then(res => {
          if (res.success) {
            this.showToast(`已保存为MD: ${res.filename}`);
          } else {
            this.showToast('MD保存失败: ' + res.error, 'error');
          }
        });
      } catch (error) {
        console.error('MD导出失败:', error);
        this.showToast('MD导出失败', 'error');
      }
    }

    exportMindmapToFile(){
      const blob = new Blob([JSON.stringify(this.data, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = this._suggestFileName();
      a.click();
      URL.revokeObjectURL(a.href);
    }

    // 使用本地保存文件选择器进行导出，若不支持则回退到下载
    async exportMindmapWithPicker(){
      try{
        // 仅使用 File System Access API（Chromium 内核可用）
        if (window.showSaveFilePicker){
          const opts = {
            suggestedName: this._suggestFileName(),
            types: [
              {
                description: 'JSON 文件',
                accept: { 'application/json': ['.json'] }
              }
            ]
          };
          const handle = await window.showSaveFilePicker(opts);
          const writable = await handle.createWritable();
          const content = JSON.stringify(this.data, null, 2);
          await writable.write(new Blob([content], {type:'application/json'}));
          await writable.close();
          this.showToast('已保存到本地');
          return;
        } else {
          this.showToast('当前浏览器不支持本地保存（File System Access API）');
          return;
        }
      }catch(e){
        console.warn('[MindmapController] 保存到本地失败', e);
        this.showToast('保存失败：请检查浏览器权限或设置');
        return;
      }
    }

    importMindmapFromPicker(){
  // 防重复点击保护
  if (this._importLock) {
    this.showToast('正在导入中，请稍候...');
    return;
  }
  
  // 兼容：若未缓存 fileInput，则按ID即时获取
  try{ if (!this.dom) this.dom = {}; }catch(_){ this.dom = this.dom || {}; }
  if (!this.dom.fileInput){ this.dom.fileInput = document.getElementById('fileInputMindmap'); }
  if (!this.dom.fileInput){ this.showToast('未找到导入控件'); return; }
  this.dom.fileInput.onchange = (e)=>{
    const f = e.target.files && e.target.files[0];
    if (f) this.importMindmapFromFile(f);
    this.dom.fileInput.value = '';
  };
  this.dom.fileInput.click();
}

    async importMindmapFromFile(file){
  try{
    // 设置导入锁定
    this._importLock = true;
    this.showToast('开始导入文件...');
    
    // 第一步：清理列表内原有的内容
    await this.clearAllProjectsFromList();
    
    // 第二步：读取JSON文件内容
    const text = await file.text();
    const obj = JSON.parse(text);
    
    this.showToast('正在处理文件内容...');
    
    // 第三步：根据文件内容结构直接显示，不做格式判断和转换
    if (obj && obj.mindmaps && Array.isArray(obj.mindmaps)) {
      // 备份文件格式：包含多个脑图，全部导入
      console.log(`[导入] 检测到备份文件格式，包含 ${obj.mindmaps.length} 个脑图`);
      this.showToast(`发现${obj.mindmaps.length}个脑图，正在导入...`);
      
      for (let i = 0; i < obj.mindmaps.length; i++) {
        const mindmap = obj.mindmaps[i];
        console.log(`[导入] 正在导入第 ${i + 1} 个脑图:`, mindmap.name || mindmap.id);
        await this.importSingleMindmapToList(mindmap, file.name, i);
      }
      
      // 显示第一个脑图
      if (obj.mindmaps.length > 0) {
        await this.loadFirstMindmapFromList();
      }
      
      this.showToast(`成功导入${obj.mindmaps.length}个脑图`);
      
    } else if (obj && (obj.format === 'node_tree' || obj.data || obj.id)) {
      // 单个脑图格式：直接导入
      this.showToast('发现单个脑图，正在导入...');
      
      const mindmapData = {
        id: obj.id || obj.data?.id || `imported-${Date.now()}`,
        name: obj.topic || obj.label || obj.data?.topic || obj.data?.label || file.name.replace(/\.(json|mindmap\.json)$/i, ''),
        data: obj
      };
      
      await this.importSingleMindmapToList(mindmapData, file.name, 0);
      await this.loadFirstMindmapFromList();
      
      this.showToast('成功导入1个脑图');
      
    } else {
      // 其他格式：尝试作为脑图数据导入
      this.showToast('未知格式，尝试作为脑图数据导入...');
      
      const mindmapData = {
        id: `imported-${Date.now()}`,
        name: file.name.replace(/\.(json|mindmap\.json)$/i, ''),
        data: obj
      };
      
      await this.importSingleMindmapToList(mindmapData, file.name, 0);
      await this.loadFirstMindmapFromList();
      
      this.showToast('导入完成');
    }
    
  }catch(e){
    console.error('[导入] 导入失败', e);
    this.showToast(`导入失败：${e.message}`, 'error');
  } finally {
    // 释放导入锁定
    this._importLock = false;
  }
}

    // 清理列表内所有项目
    async clearAllProjectsFromList() {
      try {
        this.showToast('正在清理现有项目列表...');
        
        // 清理 localStorage 中的项目数据
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('mm:') || 
            key.startsWith('mindmap_') || 
            key === 'mm_project_catalog_v1' ||
            key === '__mind_full_cache_v1'
          )) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn(`清理键失败: ${key}`, e);
          }
        });
        
        // 清理注册表（通过设置空数组）
        if (window.Registry && window.Registry.repo && window.Registry.repo.store) {
          try {
            window.Registry.repo.store.setProjects([]);
            await window.Registry.repo.saveRegistry();
          } catch (e) {
            console.warn('清理注册表失败', e);
          }
        }
        
        // 清理UI显示
        const catalog = document.getElementById('project-catalog');
        if (catalog) {
          catalog.innerHTML = '<div class="no-projects">列表已清空，等待导入...</div>';
        }
        
        console.log(`[清理] 已清理 ${keysToRemove.length} 个存储键`);
        
      } catch (e) {
        console.error('[清理] 清理列表失败', e);
        this.showToast('清理列表时出现错误', 'error');
      }
    }
    
    // 将单个脑图导入到列表
    async importSingleMindmapToList(mindmapData, fileName, index) {
      try {
        // 生成唯一ID
        const uniqueId = mindmapData.id || `imported-${Date.now()}-${index}`;
        
        // 智能处理数据结构
        let payload;
        if (mindmapData.data && mindmapData.data.format === 'node_tree') {
          // 备份文件格式：mindmapData.data 已经是完整的 payload
          payload = mindmapData.data;
        } else if (mindmapData.data && mindmapData.data.data) {
          // 嵌套格式：需要提取内层数据
          payload = {
            format: 'node_tree',
            data: mindmapData.data.data
          };
        } else {
          // 直接数据格式
          payload = {
            format: 'node_tree',
            data: mindmapData.data || mindmapData
          };
        }
        
        // 构建项目数据
        const projectData = {
          id: uniqueId,
          project_id: uniqueId,
          name: mindmapData.name || `导入项目${index + 1}`,
          payload: payload,
          source: 'imported',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          fileName: fileName,
          originalIndex: index
        };
        
        // 保存到 AutogenUnifiedStorage
        const storageKey = `mm:${uniqueId}:data`;
        if (this.autogenStorage) {
          try {
            await this.autogenStorage.store('mindmap', storageKey, projectData.payload);
            console.log(`[导入] ✅ 已保存到AutogenUnifiedStorage: ${storageKey}`);
          } catch (error) {
            console.error(`[导入] AutogenUnifiedStorage保存失败: ${storageKey}`, error);
          }
        } else {
          console.error('[导入] AutogenUnifiedStorage不可用，无法保存导入数据');
        }
        
        // 注册到项目目录
        if (window.Registry && window.Registry.cmd) {
          try {
            await window.Registry.cmd.register(projectData);
            console.log(`[导入] ✅ 已注册到Registry: ${projectData.name}`);
          } catch (e) {
            console.warn(`注册项目失败: ${projectData.name}`, e);
          }
        }
        
        console.log(`[导入] 成功导入: ${projectData.name}`);
        
      } catch (e) {
        console.error(`[导入] 导入单个脑图失败:`, mindmapData, e);
        throw e;
      }
    }
    
    // 加载列表中的第一个脑图到界面
    async loadFirstMindmapFromList() {
      try {
        if (window.Registry && window.Registry.repo && window.Registry.repo.store) {
          const projects = window.Registry.repo.store.state.projects;
          if (projects && projects.length > 0) {
            const firstProject = projects[0];
            
            // 加载第一个项目的数据
            if (firstProject.payload && firstProject.payload.data) {
              let data = firstProject.payload.data;
              
              // 数据格式转换
              if (data.format === 'node_tree' && data.data) {
                data = this.fromJsMindTree(data.data);
              } else if (data.data) {
                data = this.fromJsMindTree(data);
              } else {
                // 直接使用原始数据
                data = data;
              }
              
              // 设置为当前数据并渲染
              this.data = data;
              this.renderMindmap();
              if (data.id) {
                this.setSelectedNode(data.id);
              }
              
              // 关键修复：同步保存到统一存储系统，确保数据流一致性
              try {
                // 直接使用AutogenUnifiedStorage保存
                if (this.autogenStorage && data) {
                  const jmData = {
                    format: 'node_tree',
                    data: this.toJsMindTree(data)
                  };
                  await this.autogenStorage.store('mindmap', this.localStorageKey, jmData);
                  console.log('[加载] 数据已同步到AutogenUnifiedStorage');
                } else {
                  // 回退到常规保存方法
                  this.saveMindmapToStorage();
                  console.log('[加载] 数据已同步到存储系统');
                }
              } catch (error) {
                console.warn('[加载] 同步到存储系统失败:', error);
              }
              
              // 选中列表项
              if (window.Registry.cmd) {
                window.Registry.cmd.select(firstProject.id);
              }
              
              // 触发界面刷新事件，通知其他系统数据已更新
              try {
                if (window.AutogenEventBus && typeof window.AutogenEventBus.emit === 'function') {
                  window.AutogenEventBus.emit('mindmap:dataLoaded', { 
                    source: 'import',
                    projectId: firstProject.id,
                    projectName: firstProject.name,
                    data: data
                  });
                  console.log('[加载] 已通过AutogenEventBus触发数据加载事件');
                } else {
                  window.dispatchEvent(new CustomEvent('mindmap:dataLoaded', {
                    detail: { 
                      source: 'import',
                      projectId: firstProject.id,
                      projectName: firstProject.name,
                      data: data
                    }
                  }));
                  console.log('[加载] 已通过CustomEvent触发数据加载事件');
                }
              } catch (error) {
                console.warn('[加载] 触发事件失败:', error);
                console.warn('[加载] AutogenEventBus状态:', {
                  exists: !!window.AutogenEventBus,
                  hasEmit: window.AutogenEventBus && typeof window.AutogenEventBus.emit === 'function'
                });
              }
              
              console.log(`[加载] 已加载第一个项目: ${firstProject.name}`);
            }
          }
        }
      } catch (e) {
        console.error('[加载] 加载第一个脑图失败', e);
      }
    }

// 显示脑图选择对话框（用于多脑图备份文件）
async _showMindmapSelectionDialog(mindmaps) {
  return new Promise((resolve) => {
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.className = 'mindmap-selection-dialog';
    dialog.innerHTML = `
      <div class="dialog-overlay">
        <div class="dialog-content">
          <h3>选择要导入的脑图</h3>
          <div class="mindmap-list">
            ${mindmaps.map((mindmap, index) => `
              <div class="mindmap-item" data-index="${index}">
                <div class="mindmap-name">${mindmap.name || '未命名脑图'}</div>
                <div class="mindmap-id">${mindmap.id}</div>
              </div>
            `).join('')}
          </div>
          <div class="dialog-buttons">
            <button class="btn-cancel">取消</button>
            <button class="btn-confirm" disabled>确认导入</button>
          </div>
        </div>
      </div>
    `;
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .mindmap-selection-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
      }
      .dialog-overlay {
        background: rgba(0,0,0,0.5);
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .dialog-content {
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 500px;
        width: 90%;
        max-height: 70%;
        overflow-y: auto;
      }
      .mindmap-list {
        margin: 15px 0;
        max-height: 300px;
        overflow-y: auto;
      }
      .mindmap-item {
        padding: 10px;
        border: 1px solid #ddd;
        margin: 5px 0;
        cursor: pointer;
        border-radius: 4px;
      }
      .mindmap-item:hover {
        background: #f5f5f5;
      }
      .mindmap-item.selected {
        background: #e3f2fd;
        border-color: #2196f3;
      }
      .mindmap-name {
        font-weight: bold;
        margin-bottom: 5px;
      }
      .mindmap-id {
        font-size: 12px;
        color: #666;
      }
      .dialog-buttons {
        text-align: right;
        margin-top: 20px;
      }
      .dialog-buttons button {
        margin-left: 10px;
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .btn-cancel {
        background: #f5f5f5;
        color: #333;
      }
      .btn-confirm {
        background: #2196f3;
        color: white;
      }
      .btn-confirm:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(dialog);
    
    let selectedIndex = -1;
    
    // 绑定事件
    dialog.addEventListener('click', (e) => {
      if (e.target.classList.contains('dialog-overlay')) {
        // 点击遮罩关闭
        cleanup();
        resolve(null);
      } else if (e.target.classList.contains('mindmap-item') || e.target.closest('.mindmap-item')) {
        // 选择脑图
        const item = e.target.closest('.mindmap-item');
        selectedIndex = parseInt(item.dataset.index);
        
        // 更新选中状态
        dialog.querySelectorAll('.mindmap-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        
        // 启用确认按钮
        dialog.querySelector('.btn-confirm').disabled = false;
      } else if (e.target.classList.contains('btn-cancel')) {
        // 取消
        cleanup();
        resolve(null);
      } else if (e.target.classList.contains('btn-confirm')) {
        // 确认
        if (selectedIndex >= 0) {
          cleanup();
          resolve(mindmaps[selectedIndex]);
        }
      }
    });
    
    function cleanup() {
      document.body.removeChild(dialog);
      document.head.removeChild(style);
    }
  });
}

    // 使用本地保存文件选择器进行导出，若不支持则回退到下载
    async exportMindmapWithPicker(){
      try{
        // 仅使用 File System Access API（Chromium 内核可用）
        if (window.showSaveFilePicker){
          const opts = {
            suggestedName: this._suggestFileName(),
            types: [
              {
                description: 'JSON 文件',
                accept: { 'application/json': ['.json'] }
              }
            ]
          };
          const handle = await window.showSaveFilePicker(opts);
          const writable = await handle.createWritable();
          const content = JSON.stringify(this.data, null, 2);
          await writable.write(new Blob([content], {type:'application/json'}));
          await writable.close();
          this.showToast('已保存到本地');
          return;
        } else {
          this.showToast('当前浏览器不支持本地保存（File System Access API）');
          return;
        }
      }catch(e){
        console.warn('[MindmapController] 保存到本地失败', e);
        this.showToast('保存失败：请检查浏览器权限或设置');
        return;
      }
    }

    // 保存全部脑图为单个JSON文件（使用文件选择器）
    async exportAllMindmapsWithPicker(){
      try{
        // 收集全部脑图数据
        const items = this.getAllMindmapsFromStorage();
        
        if (!items || items.length === 0){ 
          this.showToast('没有可保存的脑图数据'); 
          return; 
        }

        // 构建包含所有脑图的数据结构
        const allMindmapsData = {
          export_time: new Date().toISOString(),
          total_count: items.length,
          mindmaps: items
        };

        // 使用 showSaveFilePicker 保存单个JSON文件
        if (window.showSaveFilePicker){
          const opts = {
            suggestedName: `all_mindmaps_${new Date().toISOString().slice(0,10)}.json`,
            types: [
              {
                description: 'JSON 文件',
                accept: { 'application/json': ['.json'] }
              }
            ]
          };
          const handle = await window.showSaveFilePicker(opts);
          const writable = await handle.createWritable();
          const content = JSON.stringify(allMindmapsData, null, 2);
          await writable.write(new Blob([content], {type:'application/json'}));
          await writable.close();
          this.showToast(`已保存 ${items.length} 个脑图到单个JSON文件`);
          return;
        } else {
          // 回退：直接下载
          const json = JSON.stringify(allMindmapsData, null, 2);
          const blob = new Blob([json], {type:'application/json'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `all_mindmaps_${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          this.showToast(`已下载包含 ${items.length} 个脑图的JSON文件`);
        }

      }catch(e){
        if (e && e.name === 'AbortError'){ 
          this.showToast('已取消保存'); 
          return; 
        }
        console.error('[MindmapController] 全部脑图导出失败:', e);
        this.showToast('保存失败: ' + e.message, 'error');
      }
    }

    // 获取所有脑图数据
    // localStorage扫描功能已移除 - 统一存储后通过AutogenUnifiedStorage和Registry获取数据
    getAllMindmapsFromStorage(){
      const items = [];
      
      try{
        // 从Registry获取所有注册的脑图项目
        if (window.Registry && window.Registry.repo && window.Registry.repo.store) {
          const projects = window.Registry.repo.store.state.projects;
          if (projects && Array.isArray(projects)) {
            projects.forEach(project => {
              if (project.payload && project.payload.data) {
                items.push({
                  id: project.id,
                  name: project.name || '未命名脑图',
                  data: project.payload,
                  source: 'registry'
                });
              }
            });
          }
        }
        
        // 如果没有找到任何脑图，至少导出当前脑图
        if (items.length === 0 && this.data && this.data.id) {
          const jmData = this.mind?.get_data?.('node_tree');
          if (jmData && jmData.data) {
            items.push({
              id: this.data.id,
              name: this.data.label || this.data.topic || '当前脑图',
              data: jmData,
              source: 'current'
            });
          }
        }
        
      }catch(e){
        console.error('获取脑图数据失败:', e);
        this.showToast('获取脑图数据失败: ' + e.message, 'error');
      }
      
      this.showToast(`找到 ${items.length} 个脑图数据`);
      return items;
    }

    // 保存MD底座到目录
    async saveMDBaseToDirectory(dirHandle, items){
      try{
        const mdContent = this.generateMDBase(items);
        const fileHandle = await dirHandle.getFileHandle('unified_mindmap_storage.md', { create:true });
        const writable = await fileHandle.createWritable();
        await writable.write(new Blob([mdContent], {type:'text/markdown'}));
        await writable.close();
        console.log('[MindmapController] MD底座已保存到目录');
      }catch(e){
        console.warn('[MindmapController] 保存MD底座失败:', e);
      }
    }

    // 下载MD底座文件
    downloadMDBase(items){
      try{
        const mdContent = this.generateMDBase(items);
        const blob = new Blob([mdContent], {type:'text/markdown'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'unified_mindmap_storage.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        console.log('[MindmapController] MD底座已下载');
      }catch(e){
        console.warn('[MindmapController] 下载MD底座失败:', e);
      }
    }

    // 生成MD底座内容
    generateMDBase(items){
      const timestamp = new Date().toLocaleString();
      let mdContent = `# 统一脑图存储底座\n\n`;
      mdContent += `更新时间: ${timestamp}\n`;
      mdContent += `脑图数量: ${items.length}\n\n`;
      mdContent += `---\n\n`;
      
      items.forEach((item, index) => {
        mdContent += `## ${index + 1}. ${item.name}\n\n`;
        mdContent += `- **ID**: ${item.id}\n`;
        mdContent += `- **来源**: ${item.source}\n`;
        
        if (item.data && item.data.data) {
          const rootData = item.data.data;
          mdContent += `- **根节点**: ${rootData.topic || rootData.label || '未命名'}\n`;
          
          // 递归生成脑图结构
          if (rootData.children && rootData.children.length > 0) {
            mdContent += `- **结构**:\n`;
            mdContent += this.generateMDStructure(rootData, 2);
          }
        }
        
        mdContent += `\n---\n\n`;
      });
      
      return mdContent;
    }

    // 递归生成MD结构
    generateMDStructure(node, level = 0){
      let result = '';
      const indent = '  '.repeat(level);
      
      if (node.topic || node.label) {
        result += `${indent}- ${node.topic || node.label}\n`;
      }
      
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          result += this.generateMDStructure(child, level + 1);
        });
      }
      
      return result;
    }

    // —— 适配/自适应 ——
    scheduleAutoFit(){
      // jsMind 没有内置 fitContent，可通过 resize + 适中缩放实现；此处先保留最小实现
      try{
        this.mind.resize();
      }catch(e){ /* ignore */ }
    }

    observeContainerResize(){
      const el = document.getElementById(this.containerId);
      if (!el) return;
      const ro = new ResizeObserver(()=>{
        this.scheduleAutoFit();
      });
      ro.observe(el);
      this._resizeObserver = ro;
    }

    // 将当前 jsMind 画布的数据同步回内部 this.data 并持久化
    syncFromMind(){
      try{
        const exportData = this.mind.get_data('node_tree');
        if (exportData && exportData.data){
          const newTree = this.fromJsMindTree(exportData.data);
          // 简单去抖：仅当结构变化时再写入
          const oldStr = JSON.stringify(this.data);
          const newStr = JSON.stringify(newTree);
          if (oldStr !== newStr){
            this.data = newTree;
            this.saveMindmapToStorage();
            // 数据变更后，刷新标签面板
            this.renderTagPanelFromMind();
          }
        }
      }catch(e){ console.warn('[MindmapController] syncFromMind异常:', e); }
    }

    // 监听拖拽结束后同步内部数据
    wireDragSync(){
      const el = this.dom.containerEl;
      if (!el) return;
      const handler = ()=>{
        // 若拖拽未开启则不进行同步
        if (!this.dragEnabled) return;
        // 稍微延迟，等 jsMind 完成内部移动
        setTimeout(()=>{ this.syncFromMind(); }, 0);
      };
      el.addEventListener('mouseup', handler);
      el.addEventListener('mouseleave', handler);
      // 鼠标拖拽可能移出容器，增加全局兜底
      document.addEventListener('mouseup', handler);
      document.addEventListener('dragend', handler);
    }

    // —— 工具/UI ——
    formatDateTime(d){
      const pad=n=>String(n).padStart(2,'0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    // 精确到秒的本地时间格式
    _formatDateTimeLocal(d){
      const pad=n=>String(n).padStart(2,'0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    // 构建“创建:”行
    _buildCreatedLine(ts){
      return `创建: ${ts}`;
    }

    showToast(msg){
      const t = this.dom.toast; if(!t) return;
      t.textContent = msg;
      t.classList.remove('hidden');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(()=>t.classList.add('hidden'), 1500);
    }

    // —— 内容编辑器大小持久化 ——
    async _applyEditorSizeFromStorage(){
      const el = this.dom.contentEditor;
      if (!el) return;
      try{
        // 始终启用拖拽与最小尺寸
        el.style.resize = 'both';
        el.style.minWidth = '200px';
        el.style.minHeight = '120px';
        const size = await window.AutogenUnifiedStorage.retrieve('ui_state', 'detail_content_editor_size');
        if (!size) return;
        if (size && typeof size.width === 'number' && typeof size.height === 'number'){
          el.style.width = `${size.width}px`;
          el.style.height = `${size.height}px`;
        }
      }catch(_){}
    }
    async _persistEditorSize(width, height){
      try{
        const w = Math.max(200, Math.min(2000, Math.floor(width||0)));
        const h = Math.max(120, Math.min(2000, Math.floor(height||0)));
        // 统一使用AutogenUnifiedStorage
        await window.AutogenUnifiedStorage.store('ui_state', 'detail_content_editor_size', {width:w, height:h});
      }catch(_){}
    }
    wireContentEditorResizePersistence(){
      const el = this.dom.contentEditor;
      if (!el) return;
      // 观察尺寸变化（包含用户拖拽引起的变化）
      try{
        const ro = new ResizeObserver((entries)=>{
          const rect = entries && entries[0] && entries[0].contentRect;
          if (!rect) return;
          clearTimeout(this._editorResizeTimer);
          this._editorResizeTimer = setTimeout(()=>{
            this._persistEditorSize(rect.width, rect.height).catch(err => console.error('编辑器尺寸保存失败:', err));
          }, 150);
        });
        ro.observe(el);
        this._editorResizeObserver = ro;
      }catch(_){
        // 回退：在 mouseup 时记录一次
        const handler = ()=>{
          const r = el.getBoundingClientRect();
          this._persistEditorSize(r.width, r.height).catch(err => console.error('编辑器尺寸保存失败:', err));
        };
        el.addEventListener('mouseup', handler);
        el.addEventListener('mouseleave', handler);
      }
    }

    // 与原接口兼容的空实现/占位
    editNode(nodeId){
      this.setSelectedNode(nodeId);
      const node = this.mind.get_node(nodeId);
      try { if (node) this.mind.begin_edit(node); } catch(e) { /* ignore */ }
    }
    clearSelectedNode(){ this.mind.select_clear(); this.selectedNode=null; }
    collapseExpandNode(nodeId){
      const node = this.mind.get_node(nodeId);
      if (!node) return;
      if (node.expanded){ this.mind.collapse_node(node); } else { this.mind.expand_node(node); }
      // 同步内部数据的 expanded
      const n = this.findNode(nodeId);
      if (n){ n.expanded = !!this.mind.get_node(nodeId).expanded; this.saveMindmapToStorage(); }
    }

    // —— 工具栏 ——
    wireToolbar(){
      const expBtn = document.getElementById('mindmap-export-btn');
      const impBtn = document.getElementById('mindmap-import-btn');
      const newBtn = document.getElementById('mindmap-new-btn');
      // 幂等绑定：避免重复 addEventListener
      if (expBtn && !expBtn.dataset.mmWired){
        expBtn.addEventListener('click', ()=>this.exportAllMindmapsWithPicker());
        expBtn.dataset.mmWired = '1';
      }
      if (impBtn && !impBtn.dataset.mmWired){
        impBtn.addEventListener('click', ()=>this.importMindmapFromPicker());
        impBtn.dataset.mmWired = '1';
      }
      if (newBtn && !newBtn.dataset.mmWired){
        newBtn.addEventListener('click', async ()=>{
          setTimeout(()=>{ try{ delete newBtn.dataset.mmBusy; }catch(_){ newBtn.dataset.mmBusy=''; } }, 800);
          if (window.__NEW_MIND_LOCK) return; window.__NEW_MIND_LOCK = true; setTimeout(()=>{ window.__NEW_MIND_LOCK = false; }, 800);
          // 统一新建流程：生成默认数据并渲染
          const data = (typeof this.getDefaultData === 'function') ? this.getDefaultData() : { id: 'root-'+Date.now(), label:'项目脑图', children:[] };
          this.data = data;
          this.renderMindmap();
          // 构建注册负载
          const name = data.label || data.topic || '未命名项目';
          const payload = { format:'node_tree', data };
          // 新架构优先：CommandBus 注册并选择
          if (window.Registry && window.Registry.cmd) {
            try { await window.Registry.cmd.register({ id:data.id, project_id:data.id, name, payload, source:'new' }); } catch(e){ console.warn('[New] Registry.register 失败', e); }
            try { window.Registry.cmd.select(data.id); } catch(_){ }
          } else if (window.mindmapRegistry && typeof window.mindmapRegistry.registerProject === 'function') {
            // 回退：旧注册管理器
            try { await window.mindmapRegistry.registerProject({ name, payload, source:'new' }); } catch(e){ console.warn('[New] legacy registerProject 失败', e); }
          } else {
            // 最后回退：广播事件，供外部兜底监听
            try { 
              if (window.AutogenEventBus) {
                window.AutogenEventBus.emit('mindmap:imported', { name, payload, source:'new' });
              } else {
                window.dispatchEvent(new CustomEvent('mindmap:imported', { detail:{ name, payload, source:'new' } }));
              }
            } catch(_){ }
          }
          // 视图切换到“脑图”
          try{
            const mindBtn = document.querySelector('.view-toggle[data-view="mindmap"]');
            const mindCol = document.getElementById('mindmap-column');
            if (mindBtn && !(mindBtn.classList.contains('active') || (mindCol && mindCol.classList.contains('visible')))){
              mindBtn.click();
            }
          }catch(_){ }
          // 本地保存一次（不依赖注册流程）
          try{ this.saveMindmapToStorage(); }catch(_){ }
        });
        newBtn.dataset.mmWired = '1';
      }

      // —— 设置按钮配色（不依赖外部CSS）——
      try{
        if (expBtn){
          Object.assign(expBtn.style, { background:'#4CAF50', color:'#fff', border:'none' });
          expBtn.title = expBtn.title || '保存到本地（以根节点命名）';
        }
        if (impBtn){
          Object.assign(impBtn.style, { background:'#2196F3', color:'#fff', border:'none' });
          impBtn.title = impBtn.title || '从文件导入';
        }
      }catch(_){/* ignore */}

      // —— 快照管理器按钮：若存在“全屏”按钮则复用，否则创建一个 ——
      try{
        let snapBtn = document.getElementById('mindmap-snapshot-btn');
        let fsBtn = document.getElementById('mindmap-fullscreen-btn');
        if (fsBtn){
          // 复用“全屏”按钮为“快照管理器”
          fsBtn.id = 'mindmap-snapshot-btn';
          fsBtn.textContent = '快照管理器';
          fsBtn.title = '打开快照管理器（Ctrl+Shift+S）';
          Object.assign(fsBtn.style, { background:'#9C27B0', color:'#fff', border:'none' });
          if (!fsBtn.dataset.mmWired){
            fsBtn.addEventListener('click', ()=> this.openSnapshotManager());
            fsBtn.dataset.mmWired = '1';
          }
          snapBtn = fsBtn;
        }
        if (!snapBtn){
          // 在导出按钮后插入一个快照按钮
          const btn = document.createElement('button');
          btn.id = 'mindmap-snapshot-btn';
          btn.type = 'button';
          btn.textContent = '快照管理器';
          btn.title = '打开快照管理器（Ctrl+Shift+S）';
          Object.assign(btn.style, { marginLeft:'6px', background:'#9C27B0', color:'#fff', border:'none', padding:'4px 10px', borderRadius:'4px' });
          if (!btn.dataset.mmWired){
            btn.addEventListener('click', ()=> this.openSnapshotManager());
            btn.dataset.mmWired = '1';
          }
          const anchor = expBtn || impBtn || newBtn;
          if (anchor && anchor.parentNode){
            anchor.parentNode.insertBefore(btn, anchor.nextSibling);
          } else {
            // 回退：尝试挂到工具栏容器
            const toolbar = document.getElementById('mindmap-toolbar') || document.querySelector('.mindmap-toolbar');
            if (toolbar){ toolbar.appendChild(btn); }
          }
        }
      }catch(_){/* ignore */}
    }

    // —— 右键菜单 ——
    wireContextMenu(){
      const menu = this.dom.contextMenu;
      const container = this.dom.containerEl;
      if (!container || !menu) return;
      const hideMenu = ()=>{
        menu.style.display='none';
        menu.classList.add('hidden');
      };
      document.addEventListener('click', hideMenu);
      container.addEventListener('scroll', hideMenu);
      // 视口滚动/尺寸变化时隐藏（position: fixed 避免剪裁，但滚动时应收起）
      window.addEventListener('scroll', hideMenu, { passive: true });
      window.addEventListener('resize', hideMenu);
      container.addEventListener('contextmenu', (e)=>{
        const jmnode = e.target.closest && e.target.closest('.jmnode');
        let nodeId = null;
        if (jmnode){
          nodeId = jmnode.getAttribute('nodeid');
          this.setSelectedNode(nodeId);
        } else if (this.selectedNode){
          // 非节点区域，但当前已有选中节点——使用选中节点打开菜单
          nodeId = this.selectedNode;
        } else {
          return; // 无选中节点则不拦截浏览器默认菜单
        }
        e.preventDefault();
        // 显示后测量尺寸
        menu.classList.remove('hidden');
        menu.style.display = 'block';
        const mw = menu.offsetWidth || 180; // 兜底最小宽度
        const mh = menu.offsetHeight || 200; // 兜底最小高度
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;
        let x = e.clientX;
        let y = e.clientY;
        // 右/下边界防溢出（基于视口坐标，position: fixed）
        if (x + mw > vw) { x = Math.max(0, vw - mw - 8); }
        if (y + mh > vh) { y = Math.max(0, vh - mh - 8); }
        menu.style.left = `${Math.round(x)}px`;
        menu.style.top = `${Math.round(y)}px`;
        menu.dataset.targetId = nodeId;
        // 仅在根节点时显示“从列表中移除”
        try{
          const root = this.mind && this.mind.get_root && this.mind.get_root();
          const isRoot = !!(root && root.id === nodeId);
          const item = menu.querySelector('[data-action="remove-from-list"]');
          if (item){ item.style.display = isRoot ? '' : 'none'; }
        }catch(_){ /* ignore */ }
      });
      menu.addEventListener('click', (e)=>{
        const btn = e.target.closest('button,[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const targetId = menu.dataset.targetId || this.selectedNode || (function(){
          try{ const r = (this.mind && this.mind.get_root && this.mind.get_root()); return r && r.id; }catch(_){ return null; }
        }).call(this);
        this.handleContextMenuAction(action, targetId);
        hideMenu();
      });
    }

    wireBeforeUnload(){
      window.addEventListener('beforeunload', ()=>{
        if (this.selectedNode){ this.saveDetailsFor(this.selectedNode); }
        // 页面关闭时立即保存，不使用防抖
        this.saveMindmapToStorage(true);
      });
    }

    handleContextMenuAction(action, nodeId){
      switch(action){
        case 'add-child': this.addChildNode(nodeId); break;
        case 'add-sibling': this.addSiblingNode(nodeId); break;
        case 'edit': this.editNode(nodeId); break;
        case 'remove': this.removeNode(nodeId); break;
        case 'copy-title': this.copyNodeTitle(nodeId); break;
        case 'copy-full': this.copyNodeFull(nodeId); break;
        case 'paste': this.pasteNode(nodeId, true); break; // 兼容菜单/工具栏使用的通用 paste
        case 'remove-from-list': this._removeCurrentMindFromProjectList(); break;
        default: break;
      }
    }

    // 复制节点标题（仅标题，不包含内容和时间戳）
    copyNodeTitle(nodeId){
      try{
        const node = this.findNode(nodeId);
        if (!node){ this.showToast('未找到节点', 'error'); return; }
        
        // 仅获取标题，清理时间戳
        let title = (node.label || node.topic || '').toString();
        
        // 移除时间戳（格式：创建: 2025-09-18 17:34:13）
        title = this._removeTimestamp(title);
        
        this._copyToClipboard(title, '已复制标题');
      }catch(e){
        console.warn('copyNodeTitle异常:', e);
        this.showToast('复制失败', 'error');
      }
    }

    // 复制节点标题+内容（不包含时间戳）
    copyNodeFull(nodeId){
      try{
        const node = this.findNode(nodeId);
        if (!node){ this.showToast('未找到节点', 'error'); return; }
        
        // 获取标题和内容，清理时间戳
        let title = (node.label || node.topic || '').toString();
        let content = (node.content || '').toString();
        
        // 移除标题中的时间戳
        title = this._removeTimestamp(title);
        
        // 移除内容中的时间戳
        content = this._removeTimestamp(content);
        
        // 合并标题和内容
        let combinedText = title;
        if (content && content.trim()) {
          combinedText += '\n\n' + content;
        }
        
        this._copyToClipboard(combinedText, '已复制标题+内容');
      }catch(e){
        console.warn('copyNodeFull异常:', e);
        this.showToast('复制失败', 'error');
      }
    }

    // 移除文本中的时间戳
    _removeTimestamp(text){
      if (!text) return '';
      
      // 匹配各种时间戳格式
      const timestampPatterns = [
        /创建:\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g,
        /修改:\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g,
        /更新:\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g,
        /时间:\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g,
        /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g  // 纯时间戳
      ];
      
      let cleanText = text;
      timestampPatterns.forEach(pattern => {
        cleanText = cleanText.replace(pattern, '');
      });
      
      // 清理多余的空行和空格
      return cleanText.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    }

    // 统一的复制到剪贴板方法
    _copyToClipboard(text, successMessage){
      const doToastOk = ()=> this.showToast(successMessage);
      const doToastErr = ()=> this.showToast('复制失败', 'error');
      
      // 优先使用 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(doToastOk).catch(()=>{
          // 回退到 execCommand
          this._fallbackCopy(text, doToastOk, doToastErr);
        });
      } else {
        // 直接使用回退方法
        this._fallbackCopy(text, doToastOk, doToastErr);
      }
    }

    // 回退复制方法
    _fallbackCopy(text, onSuccess, onError){
      try{
        const ta = document.createElement('textarea');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, 99999); // 移动端兼容
        
        const success = document.execCommand && document.execCommand('copy');
        document.body.removeChild(ta);
        
        success ? onSuccess() : onError();
      }catch(_){
        onError();
      }
    }

    _removeCurrentMindFromProjectList(){
      try{
        const pack = this.mind && this.mind.get_data && this.mind.get_data('node_tree');
        if (!pack || !pack.data){ this.showToast('无法识别当前脑图', 'error'); return; }
        const text = JSON.stringify(pack.data);
        const run = async ()=>{
          let contentHash = '';
          try{
            // 简单哈希计算
            let h = 0; for (let i=0;i<text.length;i++){ h = (h*31 + text.charCodeAt(i))|0; } contentHash = 'fh_'+(h>>>0).toString(16);
          }catch(_){ contentHash = 'unknown'; }
          const KEY='mm_project_catalog_v1';
          try{
            const list = await window.AutogenUnifiedStorage.retrieve('project_list', 'projects') || [];
            const idx = list.findIndex(x=> x.content_hash === contentHash);
            if (idx >= 0){
              const removed = list.splice(idx,1);
              // 统一使用AutogenUnifiedStorage
              await window.AutogenUnifiedStorage.store('project_list', 'projects', list);
              try{ console.log('[projects] removed', removed && removed[0] && removed[0].name); }catch(_){ }
              if (window.AutogenEventBus) {
                window.AutogenEventBus.emit('mindmap:removed', { content_hash: contentHash });
              } else {
                window.dispatchEvent(new CustomEvent('mindmap:removed', { detail: { content_hash: contentHash } }));
              }
              this.showToast('已从列表中移除');
            } else {
              this.showToast('列表中未找到该脑图');
            }
          }catch(e){ console.warn('移除失败', e); this.showToast('移除失败', 'error'); }
        };
        run();
      }catch(e){ this.showToast('移除失败', 'error'); }
    }

    // —— 从文件导入为子节点 ——
    openImportChildrenDialog(parentId){
      try{
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.addEventListener('change', async (e)=>{
          const file = (e.target.files && e.target.files[0]) || null;
          if (!file){ document.body.removeChild(input); return; }
          await this.importChildNodesFromFile(file, parentId);
          // 清理
          document.body.removeChild(input);
        }, { once: true });
        input.click();
      }catch(e){
        console.error('[MindmapController] 打开导入对话框失败', e);
        this.showToast('无法打开文件选择器', 'error');
      }
    }

    async importChildNodesFromFile(file, parentId){
      try{
        if (!file){ this.showToast('未选择文件'); return; }
        const parent = this.findNode(parentId);
        if (!parent){ this.showToast('未找到父节点', 'error'); return; }

        const text = await file.text();
        let obj;
        try{ obj = JSON.parse(text); }
        catch(_){ this.showToast('导入失败：JSON 解析错误', 'error'); return; }

        // 解析为内部节点结构
        let rootNode = null;
        if (obj && obj.format === 'node_tree' && obj.data){
          // jsMind 树
          rootNode = this.fromJsMindTree(obj.data);
        } else if (obj && obj.id && (obj.label !== undefined || obj.topic !== undefined)){
          // 内部结构或接近内部结构
          rootNode = {
            id: obj.id,
            label: obj.label != null ? obj.label : (obj.topic || ''),
            content: obj.content != null ? obj.content : ((obj.data && obj.data.content) || ''),
            expanded: obj.expanded !== false,
            attachments: Array.isArray(obj.attachments) ? obj.attachments : [],
            children: Array.isArray(obj.children) ? obj.children : [],
          };
        } else if (obj && obj.data){
          // 某些导出可能直接是 {data:{...}}
          try { rootNode = this.fromJsMindTree(obj.data); } catch(_) { /* ignore */ }
        }

        if (!rootNode){
          this.showToast('导入失败：不支持的文件结构', 'error');
          return;
        }

        // 以“导入为子节点”为语义：优先导入 root 的 children；若无 children 则导入 root 本身
        const sourceList = (Array.isArray(rootNode.children) && rootNode.children.length)
          ? rootNode.children
          : [rootNode];

        // 深拷贝并重映射ID
        const clones = JSON.parse(JSON.stringify(sourceList));
        const remapIds = (node)=>{
          const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
          node.id = newId;
          if (node.children && node.children.length){ node.children.forEach(remapIds); }
        };
        clones.forEach(remapIds);

        // 插入为父节点的子节点
        parent.children = parent.children || [];
        clones.forEach(n=> parent.children.push(n));

        // 刷新渲染、持久化、展开父节点并选中第一个导入节点
        this.renderMindmap();
        this.saveMindmapToStorage();
        try{
          const pNode = this.mind && this.mind.get_node(parentId);
          if (pNode){
            try { this.mind.expand_node(pNode); } catch(_) { /* ignore */ }
          }
        }catch(_){}

        const firstId = clones[0] && clones[0].id;
        if (firstId){ this.setSelectedNode(firstId); }

        this.showToast(`已导入 ${clones.length} 个子节点`);
      }catch(e){
        console.error('[MindmapController] 导入子节点失败', e);
        this.showToast('导入失败', 'error');
      }
    }

    // —— 键盘快捷键 ——
    wireKeyboardShortcuts(){
      const container = this.dom.containerEl;
      if (!container) return;
      container.setAttribute('tabindex','0');
      const isEditingInput = (el)=>{
        return !!el && (el.tagName==='INPUT' || el.tagName==='TEXTAREA' || el.isContentEditable);
      };
      container.addEventListener('keydown', (e)=>{
        if (isEditingInput(document.activeElement)) return;
        const currentId = this.selectedNode || (function(){
          try{ const r = (this.mind && this.mind.get_root && this.mind.get_root()); return r && r.id; }catch(_){ return null; }
        }).call(this);
        if (!currentId) return;
        // Ctrl/Cmd 组合
        const ctrl = e.ctrlKey || e.metaKey;
        if (ctrl){
          const key = e.key.toLowerCase();
          // 快照快捷键：Ctrl+Shift+S 打开管理器；Ctrl+Alt+S 立即拍快照
          if (key==='s' && e.shiftKey){ this.openSnapshotManager(); e.preventDefault(); return; }
          if (key==='s' && e.altKey){ this.takeSnapshot(); e.preventDefault(); return; }
          if (key==='c'){ this.copyNode(currentId); e.preventDefault(); return; }
          if (key==='x'){ this.cutNode(currentId); e.preventDefault(); return; }
          if (key==='v'){ this.pasteNode(currentId, true); e.preventDefault(); return; }
          return;
        }
        // 基本操作（连续建图友好）：Tab=添加子节点，Enter=添加同级，Delete=删除
        if (e.key==='Tab'){
          e.preventDefault();
          this.addChildNode(currentId);
        }
        else if (e.key==='Enter'){
          this.addSiblingNode(currentId); e.preventDefault();
        }
        else if (e.key==='Delete' || e.key==='Backspace'){
          this.removeNode(currentId); e.preventDefault();
        }
      });
    }

    // —— 快照：存取/调度/UI ——
    async _loadSnapshotConfig(){
      try{
        if (this.autogenStorage) {
          const obj = await this.autogenStorage.retrieve('config', 'mindmap_snapshots_config');
          if (obj && typeof obj.intervalMs==='number') this._snapConfig.intervalMs = Math.max(60*1000, obj.intervalMs);
          if (obj && typeof obj.maxCount==='number') this._snapConfig.maxCount = Math.min(10, Math.max(1, Math.floor(obj.maxCount)));
          return;
        }
        // 回退到localStorage
        const raw = localStorage.getItem('mindmap_snapshots_config');
        if (!raw) return;
        const obj = JSON.parse(raw);
        if (obj && typeof obj.intervalMs==='number') this._snapConfig.intervalMs = Math.max(60*1000, obj.intervalMs);
        if (obj && typeof obj.maxCount==='number') this._snapConfig.maxCount = Math.min(10, Math.max(1, Math.floor(obj.maxCount)));
      }catch(_){/* ignore */}
    }
    async _saveSnapshotConfig(){
      try{
        const cfg = { intervalMs: this._snapConfig.intervalMs, maxCount: Math.min(10, Math.max(1, Math.floor(this._snapConfig.maxCount))) };
        // 统一使用AutogenUnifiedStorage
        await window.AutogenUnifiedStorage.store('config', 'mindmap_snapshots_config', cfg);
      }catch(_){/* ignore */}
    }
    async _snapshotIndex(){
      try{ 
        if (this.autogenStorage) {
          const index = await this.autogenStorage.retrieve('snapshot', 'mindmap_snapshots_index');
          return Array.isArray(index) ? index : [];
        }
        // 回退到localStorage
        const raw = localStorage.getItem('mindmap_snapshots_index'); 
        return Array.isArray(JSON.parse(raw))? JSON.parse(raw): []; 
      }catch(_){ return []; }
    }
    async _saveSnapshotIndex(list){
      try{ 
        // 统一使用AutogenUnifiedStorage
        await window.AutogenUnifiedStorage.store('snapshot', 'mindmap_snapshots_index', list);
      }catch(_){/* ignore */}
    }
    async takeSnapshot(){
      try{
        // 导出当前内部数据为一份全量快照
        const payload = { ts: new Date().toISOString(), data: this.data };
        const id = `snap_${Date.now()}`;
        // 统一使用AutogenUnifiedStorage
        await window.AutogenUnifiedStorage.store('snapshot', `mindmap_snapshot_${id}`, payload);
        // 更新索引并裁剪
        const idx = await this._snapshotIndex();
        idx.unshift({ id, ts: payload.ts });
        const maxN = Math.min(10, Math.max(1, Math.floor(this._snapConfig.maxCount || 5)));
        const drop = idx.splice(maxN);
        await this._saveSnapshotIndex(idx);
        // 删除溢出快照
        drop.forEach(x=>{ 
          try{ 
            // 统一使用AutogenUnifiedStorage删除
            window.AutogenUnifiedStorage.remove('snapshot', `mindmap_snapshot_${x.id}`).catch(() => {});
          }catch(_){/* ignore */} 
        });
        this.showToast('已创建快照');
      }catch(e){ console.warn('创建快照失败', e); this.showToast('创建快照失败', 'error'); }
    }
    async listSnapshots(){ return await this._snapshotIndex(); }
    restoreSnapshot(id){
      try{
        if (this.autogenStorage) {
          this.autogenStorage.retrieve('snapshot', `mindmap_snapshot_${id}`).then(obj => {
            if (!obj || !obj.data){ this.showToast('快照格式无效', 'error'); return; }
            this.data = obj.data;
            this.saveMindmapToStorage();
            this.renderMindmap();
            this.setSelectedNode(this.data && this.data.id);
            this.showToast('已从快照恢复');
          }).catch(() => {
            this.showToast('快照不存在', 'error');
          });
          return;
        }
        // 回退到localStorage
        const raw = localStorage.getItem(`mindmap_snapshot_${id}`);
        if (!raw){ this.showToast('快照不存在', 'error'); return; }
        const obj = JSON.parse(raw);
        if (!obj || !obj.data){ this.showToast('快照格式无效', 'error'); return; }
        this.data = obj.data;
        this.saveMindmapToStorage();
        this.renderMindmap();
        this.setSelectedNode(this.data && this.data.id);
        this.showToast('已从快照恢复');
      }catch(e){ console.warn('恢复快照失败', e); this.showToast('恢复失败', 'error'); }
    }
    async deleteSnapshot(id){
      try{
        if (this.autogenStorage) {
          await this.autogenStorage.remove('snapshot', `mindmap_snapshot_${id}`);
          const idx = (await this._snapshotIndex()).filter(x=>x.id!==id);
          this._saveSnapshotIndex(idx);
          this.showToast('已删除快照');
          return;
        }
        // 回退到localStorage
        localStorage.removeItem(`mindmap_snapshot_${id}`);
        const idx = (await this._snapshotIndex()).filter(x=>x.id!==id);
        this._saveSnapshotIndex(idx);
        this.showToast('已删除快照');
      }catch(_){ this.showToast('删除失败', 'error'); }
    }
    exportSnapshot(id){
      try{
        if (this.autogenStorage) {
          this.autogenStorage.retrieve('snapshot', `mindmap_snapshot_${id}`).then(obj => {
            if (!obj){ this.showToast('快照不存在', 'error'); return; }
            const raw = JSON.stringify(obj);
            const blob = new Blob([raw], {type:'application/json'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${id}.json`;
            a.click(); URL.revokeObjectURL(a.href);
          }).catch(() => {
            this.showToast('快照不存在', 'error');
          });
          return;
        }
        // 回退到localStorage
        const raw = localStorage.getItem(`mindmap_snapshot_${id}`);
        if (!raw){ this.showToast('快照不存在', 'error'); return; }
        const blob = new Blob([raw], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${id}.json`;
        a.click(); URL.revokeObjectURL(a.href);
      }catch(_){ this.showToast('导出失败', 'error'); }
    }
    async startSnapshotScheduler(){
      try{
        await this._loadSnapshotConfig();
        if (this._snapTimer) clearInterval(this._snapTimer);
        const iv = Math.max(60*1000, Number(this._snapConfig.intervalMs)|| (10*60*1000));
        this._snapTimer = setInterval(()=>{ try{ this.takeSnapshot(); }catch(_){/* ignore */} }, iv);
      }catch(_){/* ignore */}
    }
    stopSnapshotScheduler(){ try{ if (this._snapTimer) clearInterval(this._snapTimer); this._snapTimer=null; }catch(_){/* ignore */}
    }
    async openSnapshotManager(){
      // 简易管理器 UI（无外部CSS依赖）
      try{
        const prev = document.getElementById('mm-snap-overlay'); if (prev){ prev.parentNode.removeChild(prev); }
        const overlay = document.createElement('div'); overlay.id='mm-snap-overlay';
        Object.assign(overlay.style,{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.35)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center'});
        const panel = document.createElement('div');
        Object.assign(panel.style,{width:'640px',maxWidth:'95vw',maxHeight:'80vh',overflow:'auto',background:'#fff',borderRadius:'8px',boxShadow:'0 6px 24px rgba(0,0,0,0.2)',padding:'14px'});
        const title = document.createElement('div'); title.textContent='快照管理器'; Object.assign(title.style,{fontSize:'16px',fontWeight:'bold',marginBottom:'10px'});
        const cfgWrap = document.createElement('div'); cfgWrap.innerHTML = `
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
            <label>间隔(分钟)：<input id="snap-interval" type="number" min="1" max="120" style="width:80px;" value="${Math.round((this._snapConfig.intervalMs||600000)/60000)}" /></label>
            <label>最多保留(<=10)：<input id="snap-max" type="number" min="1" max="10" style="width:80px;" value="${Math.min(10, Math.max(1, this._snapConfig.maxCount||5))}" /></label>
            <button id="snap-save-cfg" class="mm-btn">保存设置</button>
            <button id="snap-take" class="mm-btn">立即拍一份</button>
            <button id="snap-close" class="mm-btn">关闭</button>
          </div>`;
        const list = document.createElement('div');
        const items = await this.listSnapshots();
        if (!items.length){ list.innerHTML = '<div style="padding:8px;color:#666;">暂无快照</div>'; }
        else{
          const html = items.map(it=>{
            const ts = it.ts || '';
            return `<div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #eee;padding:8px;border-radius:6px;margin:6px 0;">
              <div style="font-family:monospace;">${it.id}</div>
              <div>${ts}</div>
              <div style="display:flex;gap:6px;">
                <button class="mm-btn" data-act="restore" data-id="${it.id}">恢复</button>
                <button class="mm-btn" data-act="export" data-id="${it.id}">导出</button>
                <button class="mm-btn" data-act="delete" data-id="${it.id}">删除</button>
              </div>
            </div>`;
          }).join('');
          list.innerHTML = html;
        }
        panel.appendChild(title); panel.appendChild(cfgWrap); panel.appendChild(list); overlay.appendChild(panel); document.body.appendChild(overlay);
        // 事件
        cfgWrap.querySelector('#snap-close').addEventListener('click', ()=> overlay.remove());
        cfgWrap.querySelector('#snap-save-cfg').addEventListener('click', ()=>{
          const m = Number(cfgWrap.querySelector('#snap-interval').value);
          const max = Number(cfgWrap.querySelector('#snap-max').value);
          this._snapConfig.intervalMs = Math.max(60*1000, Math.floor((isFinite(m)?m:10)*60000));
          this._snapConfig.maxCount = Math.min(10, Math.max(1, Math.floor(isFinite(max)?max:5)));
          this._saveSnapshotConfig();
          this.startSnapshotScheduler();
          this.showToast('已保存快照设置');
        });
        cfgWrap.querySelector('#snap-take').addEventListener('click', async ()=>{ await this.takeSnapshot(); list.innerHTML=''; await this.openSnapshotManager(); });
        list.addEventListener('click', async (e)=>{
          const btn = e.target.closest('button[data-act]'); if (!btn) return;
          const act = btn.getAttribute('data-act'); const id = btn.getAttribute('data-id');
          if (act==='restore'){ if (confirm('确认恢复该快照并替换当前内容？')){ this.restoreSnapshot(id); } }
          if (act==='delete'){ if (confirm('确认删除该快照？')){ await this.deleteSnapshot(id); btn.closest('div').remove(); } }
          if (act==='export'){ this.exportSnapshot(id); }
        });
      }catch(e){ console.warn('打开快照管理器失败', e); this.showToast('打开快照管理器失败', 'error'); }
    }

  }

  // 添加Toast提示方法
  MindmapController.prototype.showToast = function(message, type = 'info') {
    const toast = this.dom.toast;
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `mindmap-toast ${type}`;
    toast.style.display = 'block';
    
    // 自动隐藏
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, 2000);
  };
  
  // 暴露到全局，保持与原脚本兼容
  window.MindmapController = MindmapController;
  // 不再自动创建实例，由 script.js 统一管理
  // window.mindmapController = new MindmapController();
})();
