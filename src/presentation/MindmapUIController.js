/**
 * 程序员 MindmapUIController.js - 脑图UI控制器模块
 * 
 * 职责：
 * - 工具栏控制和状态管理
 * - 模态框和对话框管理
 * - Toast消息和通知系统
 * - 标签面板和侧边栏控制
 * 
 * 设计原则：
 * - 单一职责：专注UI控制逻辑
 * - 状态管理：统一的UI状态控制
 * - 组件化：可复用的UI组件
 * - 响应式：适配不同屏幕尺寸
 */

class MindmapUIController {
  constructor(options = {}) {
    // 依赖注入
    this.eventBus = options.eventBus || null;
    this.logger = options.logger || console;
    
    // DOM元素引用
    this.dom = {
      // 工具栏元素
      toolbar: null,
      toolbarButtons: new Map(),
      
      // 面板元素
      tagPanel: null,
      tagGroups: null,
      tagList: null,
      tagEmpty: null,
      
      // 模态框元素
      modals: new Map(),
      
      // Toast元素
      toast: null,
      
      // 编辑器元素
      contentEditor: null,
      
      // 容器元素
      container: null
    };
    
    // UI配置
    this.config = {
      // Toast配置
      toast: {
        duration: 3000,
        maxToasts: 5,
        position: 'top-right'
      },
      
      // 工具栏配置
      toolbar: {
        enabled: true,
        position: 'top',
        buttons: [
          { id: 'add-child', label: '添加子节点', icon: '➕', shortcut: 'Enter' },
          { id: 'add-sibling', label: '添加同级', icon: '↗️', shortcut: 'Tab' },
          { id: 'delete-node', label: '删除节点', icon: '🗑️', shortcut: 'Delete' },
          { id: 'separator', type: 'separator' },
          { id: 'expand-all', label: '展开全部', icon: '📖' },
          { id: 'collapse-all', label: '折叠全部', icon: '📕' },
          { id: 'separator', type: 'separator' },
          { id: 'export', label: '导出', icon: '💾' },
          { id: 'import', label: '导入', icon: '📂' }
        ]
      },
      
      // 标签面板配置
      tagPanel: {
        enabled: true,
        position: 'right',
        width: '300px',
        collapsible: true
      },
      
      // 模态框配置
      modal: {
        backdrop: true,
        keyboard: true,
        focus: true
      }
    };
    
    // UI状态
    this.state = {
      // 工具栏状态
      toolbarVisible: true,
      toolbarPosition: this.config.toolbar.position,
      
      // 面板状态
      tagPanelVisible: true,
      tagPanelCollapsed: false,
      
      // 模态框状态
      activeModals: new Set(),
      
      // Toast状态
      activeToasts: [],
      
      // 编辑状态
      isEditing: false,
      editingNodeId: null,
      
      // 响应式状态
      isMobile: false,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    };
    
    // 事件监听器
    this.eventListeners = new Map();
    
    // Toast队列
    this.toastQueue = [];
    this.toastContainer = null;
    
    // 初始化标记
    this.isInitialized = false;
    
    this.logger.log('[MindmapUIController] UI控制器初始化完成');
  }
  
  /**
   * 初始化UI控制器
   */
  async initialize() {
    if (this.isInitialized) {
      this.logger.warn('[MindmapUIController] UI控制器已初始化');
      return;
    }
    
    try {
      // 初始化DOM引用
      this._initializeDOMReferences();
      
      // 初始化工具栏
      this._initializeToolbar();
      
      // 初始化标签面板
      this._initializeTagPanel();
      
      // 初始化Toast系统
      this._initializeToastSystem();
      
      // 初始化模态框系统
      this._initializeModalSystem();
      
      // 绑定事件监听器
      this._bindEventListeners();
      
      // 检测响应式状态
      this._updateResponsiveState();
      
      this.isInitialized = true;
      this.logger.log('[MindmapUIController] UI控制器初始化成功');
      
      // 触发初始化完成事件
      this._emitEvent('initialized', { timestamp: Date.now() });
      
    } catch (error) {
      this.logger.error('[MindmapUIController] UI控制器初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 初始化DOM引用
   */
  _initializeDOMReferences() {
    // 标签面板元素
    this.dom.tagGroups = document.getElementById('tag-groups');
    this.dom.tagList = document.getElementById('tag-list');
    this.dom.tagEmpty = document.getElementById('tag-panel-empty');
    this.dom.tagPanel = document.getElementById('tag-panel');
    
    // 编辑器元素
    this.dom.contentEditor = document.getElementById('detail-content');
    
    // 容器元素
    this.dom.container = document.getElementById('mindmap-container');
    
    // Toast元素
    this.dom.toast = document.getElementById('mindmap-toast');
    
    this.logger.log('[MindmapUIController] DOM引用初始化完成');
  }
  
  /**
   * 初始化工具栏
   */
  _initializeToolbar() {
    if (!this.config.toolbar.enabled) return;
    
    try {
      // 创建工具栏容器
      this.dom.toolbar = this._createToolbarContainer();
      
      // 创建工具栏按钮
      this.config.toolbar.buttons.forEach(buttonConfig => {
        if (buttonConfig.type === 'separator') {
          this._createToolbarSeparator();
        } else {
          const button = this._createToolbarButton(buttonConfig);
          this.dom.toolbarButtons.set(buttonConfig.id, button);
        }
      });
      
      // 设置工具栏可见性
      this._updateToolbarVisibility();
      
      this.logger.log('[MindmapUIController] 工具栏初始化完成');
    } catch (error) {
      this.logger.error('[MindmapUIController] 工具栏初始化失败:', error);
    }
  }
  
  /**
   * 创建工具栏容器
   */
  _createToolbarContainer() {
    let toolbar = document.getElementById('mindmap-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'mindmap-toolbar';
      toolbar.className = `mindmap-toolbar mindmap-toolbar-${this.config.toolbar.position}`;
      
      // 插入到适当位置
      const container = this.dom.container || document.body;
      container.insertBefore(toolbar, container.firstChild);
    }
    return toolbar;
  }
  
  /**
   * 创建工具栏按钮
   */
  _createToolbarButton(config) {
    const button = document.createElement('button');
    button.id = `toolbar-${config.id}`;
    button.className = 'toolbar-button';
    button.title = config.shortcut ? `${config.label} (${config.shortcut})` : config.label;
    
    // 按钮内容
    const icon = document.createElement('span');
    icon.className = 'toolbar-icon';
    icon.textContent = config.icon;
    
    const label = document.createElement('span');
    label.className = 'toolbar-label';
    label.textContent = config.label;
    
    button.appendChild(icon);
    button.appendChild(label);
    
    // 绑定点击事件
    button.addEventListener('click', (event) => {
      this._handleToolbarButtonClick(config.id, event);
    });
    
    this.dom.toolbar.appendChild(button);
    return button;
  }
  
  /**
   * 创建工具栏分隔符
   */
  _createToolbarSeparator() {
    const separator = document.createElement('div');
    separator.className = 'toolbar-separator';
    this.dom.toolbar.appendChild(separator);
  }
  
  /**
   * 处理工具栏按钮点击
   */
  _handleToolbarButtonClick(buttonId, event) {
    this.logger.log(`[MindmapUIController] 工具栏按钮点击: ${buttonId}`);
    
    // 触发工具栏按钮事件
    this._emitEvent('toolbar:button-click', {
      buttonId,
      event,
      timestamp: Date.now()
    });
  }
  
  /**
   * 初始化标签面板
   */
  _initializeTagPanel() {
    if (!this.config.tagPanel.enabled) return;
    
    try {
      // 如果标签面板不存在，创建它
      if (!this.dom.tagPanel) {
        this.dom.tagPanel = this._createTagPanel();
      }
      
      // 设置标签面板样式
      this._updateTagPanelStyle();
      
      // 绑定标签面板事件
      this._bindTagPanelEvents();
      
      this.logger.log('[MindmapUIController] 标签面板初始化完成');
    } catch (error) {
      this.logger.error('[MindmapUIController] 标签面板初始化失败:', error);
    }
  }
  
  /**
   * 创建标签面板
   */
  _createTagPanel() {
    const panel = document.createElement('div');
    panel.id = 'tag-panel';
    panel.className = 'tag-panel';
    
    // 标签面板头部
    const header = document.createElement('div');
    header.className = 'tag-panel-header';
    header.innerHTML = `
      <h3>标签管理</h3>
      <button class="tag-panel-toggle" title="折叠/展开">📌</button>
    `;
    
    // 标签分组容器
    const groupsContainer = document.createElement('div');
    groupsContainer.id = 'tag-groups';
    groupsContainer.className = 'tag-groups';
    
    // 标签列表容器
    const listContainer = document.createElement('div');
    listContainer.id = 'tag-list';
    listContainer.className = 'tag-list';
    
    // 空状态提示
    const emptyState = document.createElement('div');
    emptyState.id = 'tag-panel-empty';
    emptyState.className = 'tag-panel-empty';
    emptyState.innerHTML = '<p>暂无标签</p>';
    
    panel.appendChild(header);
    panel.appendChild(groupsContainer);
    panel.appendChild(listContainer);
    panel.appendChild(emptyState);
    
    // 插入到页面
    document.body.appendChild(panel);
    
    // 更新DOM引用
    this.dom.tagGroups = groupsContainer;
    this.dom.tagList = listContainer;
    this.dom.tagEmpty = emptyState;
    
    return panel;
  }
  
  /**
   * 更新标签面板样式
   */
  _updateTagPanelStyle() {
    if (!this.dom.tagPanel) return;
    
    // 设置位置和尺寸
    this.dom.tagPanel.style.width = this.config.tagPanel.width;
    this.dom.tagPanel.classList.toggle('collapsed', this.state.tagPanelCollapsed);
    this.dom.tagPanel.classList.toggle('hidden', !this.state.tagPanelVisible);
  }
  
  /**
   * 绑定标签面板事件
   */
  _bindTagPanelEvents() {
    if (!this.dom.tagPanel) return;
    
    // 折叠/展开按钮
    const toggleButton = this.dom.tagPanel.querySelector('.tag-panel-toggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        this.toggleTagPanel();
      });
    }
  }
  
  /**
   * 初始化Toast系统
   */
  _initializeToastSystem() {
    try {
      // 创建Toast容器
      this.toastContainer = this._createToastContainer();
      
      this.logger.log('[MindmapUIController] Toast系统初始化完成');
    } catch (error) {
      this.logger.error('[MindmapUIController] Toast系统初始化失败:', error);
    }
  }
  
  /**
   * 创建Toast容器
   */
  _createToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = `toast-container toast-${this.config.toast.position}`;
      document.body.appendChild(container);
    }
    return container;
  }
  
  /**
   * 显示Toast消息
   */
  showToast(message, type = 'info', duration = null) {
    try {
      const toastDuration = duration || this.config.toast.duration;
      
      // 创建Toast元素
      const toast = this._createToastElement(message, type);
      
      // 添加到容器
      this.toastContainer.appendChild(toast);
      this.state.activeToasts.push(toast);
      
      // 限制Toast数量
      this._limitToastCount();
      
      // 自动移除
      setTimeout(() => {
        this._removeToast(toast);
      }, toastDuration);
      
      // 触发Toast事件
      this._emitEvent('toast:show', {
        message,
        type,
        duration: toastDuration,
        timestamp: Date.now()
      });
      
      this.logger.log(`[MindmapUIController] Toast显示: ${message}`);
      
    } catch (error) {
      this.logger.error('[MindmapUIController] Toast显示失败:', error);
      // 回退到alert
      alert(`${type.toUpperCase()}: ${message}`);
    }
  }
  
  /**
   * 创建Toast元素
   */
  _createToastElement(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Toast图标
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = icons[type] || icons.info;
    
    // Toast消息
    const messageEl = document.createElement('span');
    messageEl.className = 'toast-message';
    messageEl.textContent = message;
    
    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
      this._removeToast(toast);
    });
    
    toast.appendChild(icon);
    toast.appendChild(messageEl);
    toast.appendChild(closeBtn);
    
    return toast;
  }
  
  /**
   * 移除Toast
   */
  _removeToast(toast) {
    if (toast && toast.parentNode) {
      toast.classList.add('toast-removing');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        const index = this.state.activeToasts.indexOf(toast);
        if (index > -1) {
          this.state.activeToasts.splice(index, 1);
        }
      }, 300); // 动画时间
    }
  }
  
  /**
   * 限制Toast数量
   */
  _limitToastCount() {
    while (this.state.activeToasts.length > this.config.toast.maxToasts) {
      const oldestToast = this.state.activeToasts.shift();
      this._removeToast(oldestToast);
    }
  }
  
  /**
   * 初始化模态框系统
   */
  _initializeModalSystem() {
    try {
      // 绑定全局键盘事件（ESC关闭模态框）
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.state.activeModals.size > 0) {
          this.closeTopModal();
        }
      });
      
      this.logger.log('[MindmapUIController] 模态框系统初始化完成');
    } catch (error) {
      this.logger.error('[MindmapUIController] 模态框系统初始化失败:', error);
    }
  }
  
  /**
   * 显示模态框
   */
  showModal(modalId, content, options = {}) {
    try {
      const modal = this._createModal(modalId, content, options);
      this.dom.modals.set(modalId, modal);
      this.state.activeModals.add(modalId);
      
      document.body.appendChild(modal);
      
      // 触发显示动画
      setTimeout(() => {
        modal.classList.add('modal-show');
      }, 10);
      
      // 触发模态框事件
      this._emitEvent('modal:show', {
        modalId,
        options,
        timestamp: Date.now()
      });
      
      this.logger.log(`[MindmapUIController] 模态框显示: ${modalId}`);
      
    } catch (error) {
      this.logger.error('[MindmapUIController] 模态框显示失败:', error);
    }
  }
  
  /**
   * 创建模态框
   */
  _createModal(modalId, content, options) {
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    
    // 模态框背景
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    if (options.backdrop !== false) {
      backdrop.addEventListener('click', () => {
        this.closeModal(modalId);
      });
    }
    
    // 模态框对话框
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    
    // 模态框内容
    const contentEl = document.createElement('div');
    contentEl.className = 'modal-content';
    
    if (typeof content === 'string') {
      contentEl.innerHTML = content;
    } else {
      contentEl.appendChild(content);
    }
    
    dialog.appendChild(contentEl);
    modal.appendChild(backdrop);
    modal.appendChild(dialog);
    
    return modal;
  }
  
  /**
   * 关闭模态框
   */
  closeModal(modalId) {
    try {
      const modal = this.dom.modals.get(modalId);
      if (!modal) return;
      
      modal.classList.remove('modal-show');
      
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
        this.dom.modals.delete(modalId);
        this.state.activeModals.delete(modalId);
      }, 300); // 动画时间
      
      // 触发模态框事件
      this._emitEvent('modal:close', {
        modalId,
        timestamp: Date.now()
      });
      
      this.logger.log(`[MindmapUIController] 模态框关闭: ${modalId}`);
      
    } catch (error) {
      this.logger.error('[MindmapUIController] 模态框关闭失败:', error);
    }
  }
  
  /**
   * 关闭顶层模态框
   */
  closeTopModal() {
    const modalIds = Array.from(this.state.activeModals);
    if (modalIds.length > 0) {
      const topModalId = modalIds[modalIds.length - 1];
      this.closeModal(topModalId);
    }
  }
  
  /**
   * 切换标签面板
   */
  toggleTagPanel() {
    this.state.tagPanelCollapsed = !this.state.tagPanelCollapsed;
    this._updateTagPanelStyle();
    
    this._emitEvent('tagpanel:toggle', {
      collapsed: this.state.tagPanelCollapsed,
      timestamp: Date.now()
    });
  }
  
  /**
   * 切换工具栏
   */
  toggleToolbar() {
    this.state.toolbarVisible = !this.state.toolbarVisible;
    this._updateToolbarVisibility();
    
    this._emitEvent('toolbar:toggle', {
      visible: this.state.toolbarVisible,
      timestamp: Date.now()
    });
  }
  
  /**
   * 更新工具栏可见性
   */
  _updateToolbarVisibility() {
    if (this.dom.toolbar) {
      this.dom.toolbar.style.display = this.state.toolbarVisible ? 'flex' : 'none';
    }
  }
  
  /**
   * 绑定事件监听器
   */
  _bindEventListeners() {
    // 窗口大小调整事件
    const resizeHandler = () => {
      this._updateResponsiveState();
    };
    window.addEventListener('resize', resizeHandler);
    this.eventListeners.set('resize', resizeHandler);
  }
  
  /**
   * 更新响应式状态
   */
  _updateResponsiveState() {
    const oldIsMobile = this.state.isMobile;
    this.state.screenWidth = window.innerWidth;
    this.state.screenHeight = window.innerHeight;
    this.state.isMobile = this.state.screenWidth < 768;
    
    if (oldIsMobile !== this.state.isMobile) {
      this._emitEvent('responsive:change', {
        isMobile: this.state.isMobile,
        screenWidth: this.state.screenWidth,
        screenHeight: this.state.screenHeight
      });
    }
  }
  
  /**
   * 获取UI状态
   */
  getUIState() {
    return { ...this.state };
  }
  
  /**
   * 触发事件
   */
  _emitEvent(eventName, data) {
    try {
      if (this.eventBus && typeof this.eventBus.emit === 'function') {
        this.eventBus.emit(`mindmap-ui:${eventName}`, data);
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(`mindmap-ui:${eventName}`, { detail: data }));
      }
    } catch (error) {
      this.logger.warn('[MindmapUIController] 事件触发失败:', error);
    }
  }
  
  /**
   * 销毁UI控制器
   */
  destroy() {
    try {
      // 移除事件监听器
      this.eventListeners.forEach((handler, eventType) => {
        window.removeEventListener(eventType, handler);
      });
      
      // 关闭所有模态框
      this.state.activeModals.forEach(modalId => {
        this.closeModal(modalId);
      });
      
      // 移除所有Toast
      this.state.activeToasts.forEach(toast => {
        this._removeToast(toast);
      });
      
      // 清理DOM引用
      this.dom.toolbarButtons.clear();
      this.dom.modals.clear();
      
      // 重置状态
      this.state.activeModals.clear();
      this.state.activeToasts = [];
      this.eventListeners.clear();
      
      this.isInitialized = false;
      this.logger.log('[MindmapUIController] UI控制器已销毁');
      
    } catch (error) {
      this.logger.error('[MindmapUIController] 销毁失败:', error);
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MindmapUIController;
} else if (typeof window !== 'undefined') {
  window.MindmapUIController = MindmapUIController;
}
