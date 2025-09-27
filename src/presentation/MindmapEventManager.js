/**
 * 程序员 MindmapEventManager.js - 脑图事件处理模块
 * 
 * 职责：
 * - 键盘事件处理（快捷键、导航）
 * - 鼠标事件处理（点击、拖拽、右键菜单）
 * - 触摸事件支持（移动端兼容）
 * - 事件委托和冒泡管理
 * 
 * 设计原则：
 * - 单一职责：专注事件处理逻辑
 * - 事件委托：高效的事件管理
 * - 防抖节流：避免事件风暴
 * - 跨平台：支持桌面和移动端
 */

class MindmapEventManager {
  constructor(options = {}) {
    // 依赖注入
    this.mind = options.mind || null;
    this.container = options.container || null;
    this.eventBus = options.eventBus || null;
    this.logger = options.logger || console;
    
    // 事件配置
    this.config = {
      // 防抖配置
      keyboardDebounceMs: 100,
      dragDebounceMs: 50,
      resizeDebounceMs: 200,
      
      // 拖拽配置
      dragThreshold: 6, // 像素阈值，避免点击误触
      dragEnabled: true,
      softDragEnabled: false, // 软拖拽回退
      
      // 键盘配置
      keyboardEnabled: true,
      shortcuts: {
        'Tab': 'addSibling',
        'Enter': 'addChild',
        'Delete': 'deleteNode',
        'F2': 'editNode',
        'Escape': 'cancelEdit',
        'Ctrl+Z': 'undo',
        'Ctrl+Y': 'redo',
        'Ctrl+C': 'copy',
        'Ctrl+V': 'paste',
        'Ctrl+X': 'cut'
      },
      
      // 右键菜单配置
      contextMenuEnabled: true,
      contextMenuItems: [
        { id: 'add-child', label: '添加子节点', icon: '➕' },
        { id: 'add-sibling', label: '添加同级节点', icon: '↗️' },
        { id: 'edit-node', label: '编辑节点', icon: '✏️' },
        { id: 'delete-node', label: '删除节点', icon: '🗑️' },
        { id: 'separator', type: 'separator' },
        { id: 'copy-node', label: '复制', icon: '📋' },
        { id: 'cut-node', label: '剪切', icon: '✂️' },
        { id: 'paste-node', label: '粘贴', icon: '📄' }
      ]
    };
    
    // 内部状态
    this.isInitialized = false;
    this.eventHandlers = new Map();
    this.activeEvents = new Set();
    
    // 拖拽状态
    this.dragState = {
      active: false,
      sourceId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    };
    
    // 键盘状态
    this.keyboardState = {
      pressedKeys: new Set(),
      lastKeyTime: 0,
      isComposing: false
    };
    
    // 防抖定时器
    this._debounceTimers = new Map();
    
    // 事件统计
    this.stats = {
      keyboardEvents: 0,
      mouseEvents: 0,
      dragEvents: 0,
      contextMenuEvents: 0,
      totalEvents: 0
    };
    
    this.logger.log('[MindmapEventManager] 事件管理器初始化完成');
  }
  
  /**
   * 初始化事件管理器
   */
  async initialize() {
    if (this.isInitialized) {
      this.logger.warn('[MindmapEventManager] 事件管理器已初始化');
      return;
    }
    
    try {
      // 绑定基础事件
      this._bindKeyboardEvents();
      this._bindMouseEvents();
      this._bindDragEvents();
      this._bindContextMenu();
      this._bindResizeEvents();
      this._bindTouchEvents();
      
      this.isInitialized = true;
      this.logger.log('[MindmapEventManager] 事件管理器初始化成功');
      
      // 触发初始化完成事件
      this._emitEvent('initialized', { timestamp: Date.now() });
      
    } catch (error) {
      this.logger.error('[MindmapEventManager] 事件管理器初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 设置依赖
   */
  setDependencies(mind, container) {
    this.mind = mind;
    this.container = container;
    this.logger.log('[MindmapEventManager] 依赖设置完成');
  }
  
  /**
   * 绑定键盘事件
   */
  _bindKeyboardEvents() {
    if (!this.config.keyboardEnabled) return;
    
    const keydownHandler = this._debounce((event) => {
      this._handleKeyDown(event);
    }, this.config.keyboardDebounceMs);
    
    const keyupHandler = (event) => {
      this._handleKeyUp(event);
    };
    
    const compositionHandler = (event) => {
      this._handleComposition(event);
    };
    
    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);
    document.addEventListener('compositionstart', compositionHandler);
    document.addEventListener('compositionend', compositionHandler);
    
    this._storeEventHandler('keyboard', {
      keydown: keydownHandler,
      keyup: keyupHandler,
      composition: compositionHandler
    });
    
    this.logger.log('[MindmapEventManager] 键盘事件绑定完成');
  }
  
  /**
   * 处理键盘按下事件
   */
  _handleKeyDown(event) {
    if (!this.mind || this.keyboardState.isComposing) return;
    
    this.stats.keyboardEvents++;
    this.stats.totalEvents++;
    
    const key = this._getKeyString(event);
    this.keyboardState.pressedKeys.add(key);
    this.keyboardState.lastKeyTime = Date.now();
    
    // 检查快捷键
    const shortcut = this.config.shortcuts[key];
    if (shortcut) {
      event.preventDefault();
      this._executeShortcut(shortcut, event);
      return;
    }
    
    // 处理特殊键
    this._handleSpecialKeys(event);
    
    // 触发键盘事件
    this._emitEvent('keyboard:keydown', {
      key,
      event,
      pressedKeys: Array.from(this.keyboardState.pressedKeys)
    });
  }
  
  /**
   * 处理键盘释放事件
   */
  _handleKeyUp(event) {
    const key = this._getKeyString(event);
    this.keyboardState.pressedKeys.delete(key);
    
    this._emitEvent('keyboard:keyup', {
      key,
      event,
      pressedKeys: Array.from(this.keyboardState.pressedKeys)
    });
  }
  
  /**
   * 处理输入法事件
   */
  _handleComposition(event) {
    this.keyboardState.isComposing = event.type === 'compositionstart';
  }
  
  /**
   * 获取键盘字符串
   */
  _getKeyString(event) {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    parts.push(event.key);
    return parts.join('+');
  }
  
  /**
   * 执行快捷键
   */
  _executeShortcut(shortcut, event) {
    try {
      this.logger.log(`[MindmapEventManager] 执行快捷键: ${shortcut}`);
      
      // 触发快捷键事件
      this._emitEvent('keyboard:shortcut', {
        shortcut,
        event,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.logger.error('[MindmapEventManager] 快捷键执行失败:', error);
    }
  }
  
  /**
   * 处理特殊键
   */
  _handleSpecialKeys(event) {
    const selectedNode = this.mind.get_selected_node();
    if (!selectedNode) return;
    
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        event.preventDefault();
        this._handleArrowNavigation(event.key, selectedNode);
        break;
    }
  }
  
  /**
   * 处理箭头键导航
   */
  _handleArrowNavigation(key, currentNode) {
    try {
      let targetNode = null;
      
      switch (key) {
        case 'ArrowUp':
          targetNode = this._findPreviousSibling(currentNode);
          break;
        case 'ArrowDown':
          targetNode = this._findNextSibling(currentNode);
          break;
        case 'ArrowLeft':
          targetNode = currentNode.parent;
          break;
        case 'ArrowRight':
          targetNode = currentNode.children && currentNode.children[0];
          break;
      }
      
      if (targetNode) {
        this.mind.select_node(targetNode.id);
        this._emitEvent('keyboard:navigation', {
          direction: key,
          fromNode: currentNode.id,
          toNode: targetNode.id
        });
      }
    } catch (error) {
      this.logger.error('[MindmapEventManager] 箭头键导航失败:', error);
    }
  }
  
  /**
   * 绑定鼠标事件
   */
  _bindMouseEvents() {
    if (!this.container) return;
    
    const mouseHandlers = {
      click: (event) => this._handleMouseClick(event),
      dblclick: (event) => this._handleMouseDoubleClick(event),
      mousedown: (event) => this._handleMouseDown(event),
      mouseup: (event) => this._handleMouseUp(event),
      mousemove: (event) => this._handleMouseMove(event),
      wheel: (event) => this._handleMouseWheel(event)
    };
    
    Object.entries(mouseHandlers).forEach(([eventType, handler]) => {
      this.container.addEventListener(eventType, handler);
    });
    
    this._storeEventHandler('mouse', mouseHandlers);
    this.logger.log('[MindmapEventManager] 鼠标事件绑定完成');
  }
  
  /**
   * 处理鼠标点击
   */
  _handleMouseClick(event) {
    this.stats.mouseEvents++;
    this.stats.totalEvents++;
    
    const nodeId = this._getNodeIdFromEvent(event);
    if (nodeId) {
      this._emitEvent('mouse:node-click', {
        nodeId,
        event,
        button: event.button
      });
    }
  }
  
  /**
   * 处理鼠标双击
   */
  _handleMouseDoubleClick(event) {
    const nodeId = this._getNodeIdFromEvent(event);
    if (nodeId) {
      this._emitEvent('mouse:node-doubleclick', {
        nodeId,
        event
      });
    }
  }
  
  /**
   * 处理鼠标按下
   */
  _handleMouseDown(event) {
    const nodeId = this._getNodeIdFromEvent(event);
    if (nodeId && this.config.dragEnabled) {
      this._startDrag(nodeId, event);
    }
  }
  
  /**
   * 处理鼠标释放
   */
  _handleMouseUp(event) {
    if (this.dragState.active) {
      this._endDrag(event);
    }
  }
  
  /**
   * 处理鼠标移动
   */
  _handleMouseMove(event) {
    if (this.dragState.active) {
      this._updateDrag(event);
    }
  }
  
  /**
   * 处理鼠标滚轮
   */
  _handleMouseWheel(event) {
    // 可以在这里添加缩放功能
    this._emitEvent('mouse:wheel', {
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      event
    });
  }
  
  /**
   * 绑定拖拽事件
   */
  _bindDragEvents() {
    if (!this.container || !this.config.dragEnabled) return;
    
    const dragHandlers = {
      dragstart: (event) => this._handleDragStart(event),
      dragover: (event) => this._handleDragOver(event),
      dragend: (event) => this._handleDragEnd(event),
      drop: (event) => this._handleDrop(event)
    };
    
    Object.entries(dragHandlers).forEach(([eventType, handler]) => {
      this.container.addEventListener(eventType, handler);
    });
    
    this._storeEventHandler('drag', dragHandlers);
    this.logger.log('[MindmapEventManager] 拖拽事件绑定完成');
  }
  
  /**
   * 开始拖拽
   */
  _startDrag(nodeId, event) {
    this.dragState = {
      active: true,
      sourceId: nodeId,
      startX: event.clientX || 0,
      startY: event.clientY || 0,
      currentX: event.clientX || 0,
      currentY: event.clientY || 0
    };
    
    this._emitEvent('drag:start', {
      nodeId,
      startX: this.dragState.startX,
      startY: this.dragState.startY
    });
  }
  
  /**
   * 更新拖拽
   */
  _updateDrag(event) {
    if (!this.dragState.active) return;
    
    this.dragState.currentX = event.clientX || 0;
    this.dragState.currentY = event.clientY || 0;
    
    const deltaX = this.dragState.currentX - this.dragState.startX;
    const deltaY = this.dragState.currentY - this.dragState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > this.config.dragThreshold) {
      this._emitEvent('drag:move', {
        nodeId: this.dragState.sourceId,
        deltaX,
        deltaY,
        distance
      });
    }
  }
  
  /**
   * 结束拖拽
   */
  _endDrag(event) {
    if (!this.dragState.active) return;
    
    const targetNodeId = this._getNodeIdFromEvent(event);
    const deltaX = Math.abs((event.clientX || 0) - this.dragState.startX);
    const deltaY = Math.abs((event.clientY || 0) - this.dragState.startY);
    const movedEnough = (deltaX + deltaY) > this.config.dragThreshold;
    
    if (movedEnough && targetNodeId && targetNodeId !== this.dragState.sourceId) {
      this._emitEvent('drag:drop', {
        sourceId: this.dragState.sourceId,
        targetId: targetNodeId,
        event
      });
    }
    
    this._emitEvent('drag:end', {
      nodeId: this.dragState.sourceId,
      targetId: targetNodeId,
      moved: movedEnough
    });
    
    this.stats.dragEvents++;
    this.dragState = { active: false, sourceId: null, startX: 0, startY: 0, currentX: 0, currentY: 0 };
  }
  
  /**
   * 处理HTML5拖拽事件
   */
  _handleDragStart(event) {
    // HTML5拖拽开始
  }
  
  _handleDragOver(event) {
    event.preventDefault(); // 允许放置
  }
  
  _handleDragEnd(event) {
    // HTML5拖拽结束
  }
  
  _handleDrop(event) {
    event.preventDefault();
    // HTML5拖拽放置
  }
  
  /**
   * 绑定右键菜单
   */
  _bindContextMenu() {
    if (!this.container || !this.config.contextMenuEnabled) return;
    
    const contextMenuHandler = (event) => {
      const nodeId = this._getNodeIdFromEvent(event);
      if (nodeId) {
        event.preventDefault();
        this._showContextMenu(event, nodeId);
      }
    };
    
    this.container.addEventListener('contextmenu', contextMenuHandler);
    this._storeEventHandler('contextmenu', { contextmenu: contextMenuHandler });
    
    this.logger.log('[MindmapEventManager] 右键菜单事件绑定完成');
  }
  
  /**
   * 显示右键菜单
   */
  _showContextMenu(event, nodeId) {
    this.stats.contextMenuEvents++;
    
    this._emitEvent('contextmenu:show', {
      nodeId,
      x: event.clientX,
      y: event.clientY,
      items: this.config.contextMenuItems
    });
  }
  
  /**
   * 绑定窗口大小调整事件
   */
  _bindResizeEvents() {
    const resizeHandler = this._debounce(() => {
      this._emitEvent('window:resize', {
        width: window.innerWidth,
        height: window.innerHeight,
        timestamp: Date.now()
      });
    }, this.config.resizeDebounceMs);
    
    window.addEventListener('resize', resizeHandler);
    this._storeEventHandler('resize', { resize: resizeHandler });
  }
  
  /**
   * 绑定触摸事件（移动端支持）
   */
  _bindTouchEvents() {
    if (!this.container) return;
    
    const touchHandlers = {
      touchstart: (event) => this._handleTouchStart(event),
      touchmove: (event) => this._handleTouchMove(event),
      touchend: (event) => this._handleTouchEnd(event)
    };
    
    Object.entries(touchHandlers).forEach(([eventType, handler]) => {
      this.container.addEventListener(eventType, handler);
    });
    
    this._storeEventHandler('touch', touchHandlers);
    this.logger.log('[MindmapEventManager] 触摸事件绑定完成');
  }
  
  /**
   * 处理触摸开始
   */
  _handleTouchStart(event) {
    const touch = event.touches[0];
    if (touch) {
      const nodeId = this._getNodeIdFromEvent(touch);
      if (nodeId) {
        this._emitEvent('touch:start', { nodeId, touch });
      }
    }
  }
  
  /**
   * 处理触摸移动
   */
  _handleTouchMove(event) {
    event.preventDefault(); // 防止页面滚动
    const touch = event.touches[0];
    if (touch) {
      this._emitEvent('touch:move', { touch });
    }
  }
  
  /**
   * 处理触摸结束
   */
  _handleTouchEnd(event) {
    const touch = event.changedTouches[0];
    if (touch) {
      this._emitEvent('touch:end', { touch });
    }
  }
  
  /**
   * 从事件中获取节点ID
   */
  _getNodeIdFromEvent(event) {
    let element = event.target;
    while (element && element !== this.container) {
      if (element.getAttribute && element.getAttribute('nodeid')) {
        return element.getAttribute('nodeid');
      }
      element = element.parentElement;
    }
    return null;
  }
  
  /**
   * 查找前一个兄弟节点
   */
  _findPreviousSibling(node) {
    if (!node.parent) return null;
    const siblings = node.parent.children;
    const currentIndex = siblings.findIndex(sibling => sibling.id === node.id);
    return currentIndex > 0 ? siblings[currentIndex - 1] : null;
  }
  
  /**
   * 查找下一个兄弟节点
   */
  _findNextSibling(node) {
    if (!node.parent) return null;
    const siblings = node.parent.children;
    const currentIndex = siblings.findIndex(sibling => sibling.id === node.id);
    return currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;
  }
  
  /**
   * 防抖函数
   */
  _debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * 存储事件处理器
   */
  _storeEventHandler(category, handlers) {
    this.eventHandlers.set(category, handlers);
    this.activeEvents.add(category);
  }
  
  /**
   * 触发事件
   */
  _emitEvent(eventName, data) {
    try {
      if (this.eventBus && typeof this.eventBus.emit === 'function') {
        this.eventBus.emit(`mindmap-events:${eventName}`, data);
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(`mindmap-events:${eventName}`, { detail: data }));
      }
    } catch (error) {
      this.logger.warn('[MindmapEventManager] 事件触发失败:', error);
    }
  }
  
  /**
   * 获取事件统计
   */
  getEventStats() {
    return {
      ...this.stats,
      activeEventTypes: Array.from(this.activeEvents),
      totalHandlers: this.eventHandlers.size
    };
  }
  
  /**
   * 销毁事件管理器
   */
  destroy() {
    try {
      // 移除所有事件监听器
      this.eventHandlers.forEach((handlers, category) => {
        Object.entries(handlers).forEach(([eventType, handler]) => {
          if (category === 'keyboard' || category === 'resize') {
            document.removeEventListener(eventType, handler);
          } else if (this.container) {
            this.container.removeEventListener(eventType, handler);
          }
        });
      });
      
      // 清除防抖定时器
      this._debounceTimers.forEach(timer => clearTimeout(timer));
      
      // 重置状态
      this.eventHandlers.clear();
      this.activeEvents.clear();
      this._debounceTimers.clear();
      this.dragState = { active: false, sourceId: null, startX: 0, startY: 0, currentX: 0, currentY: 0 };
      this.keyboardState = { pressedKeys: new Set(), lastKeyTime: 0, isComposing: false };
      
      this.isInitialized = false;
      this.logger.log('[MindmapEventManager] 事件管理器已销毁');
      
    } catch (error) {
      this.logger.error('[MindmapEventManager] 销毁失败:', error);
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MindmapEventManager;
} else if (typeof window !== 'undefined') {
  window.MindmapEventManager = MindmapEventManager;
}
