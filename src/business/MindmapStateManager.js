/**
 * 程序员 MindmapStateManager.js - 状态管理业务模块
 * 
 * Phase 3: 业务逻辑层拆分 - 状态管理模块
 * 
 * 职责范围：
 * - 应用状态管理
 * - 标签面板状态
 * - 拖拽状态控制
 * - 选中状态管理
 * - 编辑器状态
 * - 配置状态持久化
 * 
 * 技术特点：
 * - 集中状态管理：统一管理所有应用状态
 * - 状态持久化：重要状态自动保存到存储
 * - 状态同步：状态变更自动同步到UI
 * - 状态历史：支持状态回滚和撤销
 * - 性能优化：状态变更防抖、批量更新
 */

class MindmapStateManager {
  constructor(options = {}) {
    // 依赖注入
    this.mind = options.mind;
    this.autogenStorage = options.autogenStorage || window.AutogenUnifiedStorage;
    this.eventBus = options.eventBus || window.AutogenEventBus;
    this.logger = options.logger || console;
    
    // 配置参数
    this.config = {
      // 状态持久化防抖时间
      persistDebounceMs: 1000,
      // 状态历史最大数量
      maxStateHistory: 50,
      // 是否启用状态持久化
      enableStatePersistence: true,
      // 是否启用状态历史
      enableStateHistory: true,
      // 标签面板配置
      tagPanel: {
        maxGroups: 20,
        maxTagsPerGroup: 100,
        defaultThemes: ['theme-yellow', 'theme-green', 'theme-blue', 'theme-purple', 'theme-orange']
      },
      // 快照配置
      snapshot: {
        intervalMs: 10 * 60 * 1000, // 10分钟
        maxCount: 5
      },
      ...options.config
    };
    
    // 应用状态
    this.state = {
      // 基础状态
      initialized: false,
      loading: false,
      saving: false,
      
      // 脑图状态
      selectedNodeId: null,
      clipboard: null,
      dragEnabled: true,
      
      // 标签面板状态
      tagGroups: [],
      activeTagGroup: null,
      tagGroupThemes: {},
      tagPanelVisible: true,
      tagPanelCollapsed: false,
      
      // 编辑器状态
      contentDirty: false,
      editorSize: { width: 300, height: 400 },
      editorVisible: true,
      editorMode: 'edit', // 'edit' | 'preview'
      
      // 工具栏状态
      toolbarVisible: true,
      contextMenuVisible: false,
      contextMenuPosition: { x: 0, y: 0 },
      
      // 快照状态
      snapConfig: {
        intervalMs: this.config.snapshot.intervalMs,
        maxCount: this.config.snapshot.maxCount
      },
      snapTimer: null,
      lastSnapTime: null,
      
      // 调试状态
      debugMessages: [],
      debugPanelVisible: false,
      
      // 性能状态
      performanceMetrics: {
        renderTime: 0,
        saveTime: 0,
        loadTime: 0
      }
    };
    
    // 状态历史
    this.stateHistory = [];
    this.currentHistoryIndex = -1;
    
    // 状态订阅者
    this.subscribers = new Map();
    
    // 防抖定时器
    this._persistTimer = null;
    this._batchUpdateTimer = null;
    
    // 待批量更新的状态
    this._pendingUpdates = {};
    
    // 状态统计
    this.stats = {
      totalStateChanges: 0,
      persistedStates: 0,
      stateRestores: 0,
      subscriptionCount: 0
    };
    
    // 初始化状态管理
    this._initializeStateManager();
    
    this.logger.log('[MindmapStateManager] 状态管理器初始化完成');
  }
  
  /**
   * 设置依赖（用于延迟注入）
   */
  setDependencies(mind, autogenStorage) {
    this.mind = mind;
    this.autogenStorage = autogenStorage || this.autogenStorage;
    this.logger.log('[MindmapStateManager] 依赖设置完成');
  }
  
  /**
   * 获取状态值
   */
  getState(path = null) {
    if (!path) {
      return { ...this.state };
    }
    
    return this._getNestedValue(this.state, path);
  }
  
  /**
   * 设置状态值
   */
  setState(updates, options = {}) {
    const { 
      silent = false, 
      persist = true, 
      batch = false,
      source = 'user'
    } = options;
    
    // 批量更新
    if (batch) {
      Object.assign(this._pendingUpdates, updates);
      this._scheduleBatchUpdate();
      return;
    }
    
    // 立即更新
    this._applyStateUpdates(updates, { silent, persist, source });
  }
  
  /**
   * 订阅状态变更
   */
  subscribe(path, callback, options = {}) {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const subscription = {
      id: subscriptionId,
      path: path,
      callback: callback,
      options: options,
      lastValue: this._getNestedValue(this.state, path)
    };
    
    this.subscribers.set(subscriptionId, subscription);
    this.stats.subscriptionCount++;
    
    this.logger.log(`[MindmapStateManager] 状态订阅: ${path} (${subscriptionId})`);
    
    return subscriptionId;
  }
  
  /**
   * 取消订阅
   */
  unsubscribe(subscriptionId) {
    if (this.subscribers.has(subscriptionId)) {
      this.subscribers.delete(subscriptionId);
      this.stats.subscriptionCount--;
      this.logger.log(`[MindmapStateManager] 取消订阅: ${subscriptionId}`);
      return true;
    }
    return false;
  }
  
  /**
   * 设置选中节点
   */
  setSelectedNode(nodeId) {
    this.setState({
      selectedNodeId: nodeId
    }, {
      source: 'nodeSelection'
    });
    
    // 触发特定事件
    this._emitEvent('state:nodeSelected', {
      nodeId: nodeId,
      previousNodeId: this.state.selectedNodeId
    });
  }
  
  /**
   * 设置剪贴板内容
   */
  setClipboard(clipboardData) {
    this.setState({
      clipboard: clipboardData
    }, {
      source: 'clipboard'
    });
    
    this._emitEvent('state:clipboardChanged', {
      clipboard: clipboardData
    });
  }
  
  /**
   * 设置拖拽状态
   */
  setDragEnabled(enabled) {
    this.setState({
      dragEnabled: enabled
    }, {
      source: 'dragControl'
    });
    
    this._emitEvent('state:dragStateChanged', {
      enabled: enabled
    });
  }
  
  /**
   * 设置标签组
   */
  setTagGroups(tagGroups) {
    this.setState({
      tagGroups: tagGroups
    }, {
      source: 'tagManagement'
    });
    
    this._emitEvent('state:tagGroupsChanged', {
      tagGroups: tagGroups
    });
  }
  
  /**
   * 设置活跃标签组
   */
  setActiveTagGroup(groupId) {
    this.setState({
      activeTagGroup: groupId
    }, {
      source: 'tagManagement'
    });
    
    this._emitEvent('state:activeTagGroupChanged', {
      groupId: groupId
    });
  }
  
  /**
   * 设置标签组主题
   */
  setTagGroupTheme(groupId, theme) {
    const newThemes = { ...this.state.tagGroupThemes };
    newThemes[groupId] = theme;
    
    this.setState({
      tagGroupThemes: newThemes
    }, {
      source: 'tagManagement'
    });
    
    this._emitEvent('state:tagThemeChanged', {
      groupId: groupId,
      theme: theme
    });
  }
  
  /**
   * 切换标签面板可见性
   */
  toggleTagPanel() {
    const newVisible = !this.state.tagPanelVisible;
    
    this.setState({
      tagPanelVisible: newVisible
    }, {
      source: 'uiControl'
    });
    
    this._emitEvent('state:tagPanelToggled', {
      visible: newVisible
    });
  }
  
  /**
   * 设置编辑器状态
   */
  setEditorState(editorUpdates) {
    const updates = {};
    
    if (editorUpdates.dirty !== undefined) {
      updates.contentDirty = editorUpdates.dirty;
    }
    
    if (editorUpdates.size) {
      updates.editorSize = { ...this.state.editorSize, ...editorUpdates.size };
    }
    
    if (editorUpdates.visible !== undefined) {
      updates.editorVisible = editorUpdates.visible;
    }
    
    if (editorUpdates.mode) {
      updates.editorMode = editorUpdates.mode;
    }
    
    this.setState(updates, {
      source: 'editorControl'
    });
    
    this._emitEvent('state:editorStateChanged', {
      updates: editorUpdates
    });
  }
  
  /**
   * 设置快照配置
   */
  setSnapConfig(config) {
    const newConfig = { ...this.state.snapConfig, ...config };
    
    this.setState({
      snapConfig: newConfig
    }, {
      source: 'snapshotConfig'
    });
    
    // 重新启动快照定时器
    this._restartSnapTimer();
    
    this._emitEvent('state:snapConfigChanged', {
      config: newConfig
    });
  }
  
  /**
   * 添加调试消息
   */
  addDebugMessage(message, level = 'info') {
    const debugMessage = {
      id: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      message: message,
      level: level,
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString()
    };
    
    const newMessages = [...this.state.debugMessages, debugMessage];
    
    // 限制调试消息数量
    if (newMessages.length > 100) {
      newMessages.shift();
    }
    
    this.setState({
      debugMessages: newMessages
    }, {
      source: 'debug',
      persist: false // 调试消息不持久化
    });
    
    this._emitEvent('state:debugMessageAdded', {
      message: debugMessage
    });
  }
  
  /**
   * 清空调试消息
   */
  clearDebugMessages() {
    this.setState({
      debugMessages: []
    }, {
      source: 'debug',
      persist: false
    });
    
    this._emitEvent('state:debugMessagesCleared', {});
  }
  
  /**
   * 更新性能指标
   */
  updatePerformanceMetrics(metrics) {
    const newMetrics = { ...this.state.performanceMetrics, ...metrics };
    
    this.setState({
      performanceMetrics: newMetrics
    }, {
      source: 'performance',
      persist: false // 性能指标不持久化
    });
  }
  
  /**
   * 保存状态到历史
   */
  saveStateToHistory(label = null) {
    if (!this.config.enableStateHistory) return;
    
    const stateSnapshot = {
      id: `state_${Date.now()}`,
      label: label || `状态快照 ${new Date().toLocaleTimeString()}`,
      state: JSON.parse(JSON.stringify(this.state)),
      timestamp: Date.now()
    };
    
    // 如果当前不在历史末尾，删除后续历史
    if (this.currentHistoryIndex < this.stateHistory.length - 1) {
      this.stateHistory.splice(this.currentHistoryIndex + 1);
    }
    
    this.stateHistory.push(stateSnapshot);
    this.currentHistoryIndex = this.stateHistory.length - 1;
    
    // 限制历史数量
    if (this.stateHistory.length > this.config.maxStateHistory) {
      this.stateHistory.shift();
      this.currentHistoryIndex--;
    }
    
    this.logger.log(`[MindmapStateManager] 状态已保存到历史: ${stateSnapshot.id}`);
  }
  
  /**
   * 撤销状态
   */
  undoState() {
    if (this.currentHistoryIndex <= 0) {
      this.logger.warn('[MindmapStateManager] 没有可撤销的状态');
      return false;
    }
    
    this.currentHistoryIndex--;
    const previousState = this.stateHistory[this.currentHistoryIndex];
    
    this._restoreStateFromSnapshot(previousState);
    
    this.logger.log(`[MindmapStateManager] 状态已撤销到: ${previousState.id}`);
    return true;
  }
  
  /**
   * 重做状态
   */
  redoState() {
    if (this.currentHistoryIndex >= this.stateHistory.length - 1) {
      this.logger.warn('[MindmapStateManager] 没有可重做的状态');
      return false;
    }
    
    this.currentHistoryIndex++;
    const nextState = this.stateHistory[this.currentHistoryIndex];
    
    this._restoreStateFromSnapshot(nextState);
    
    this.logger.log(`[MindmapStateManager] 状态已重做到: ${nextState.id}`);
    return true;
  }
  
  /**
   * 重置状态到默认值
   */
  resetState() {
    const defaultState = this._getDefaultState();
    
    this.setState(defaultState, {
      source: 'reset',
      persist: true
    });
    
    this._emitEvent('state:reset', {
      previousState: this.state
    });
    
    this.logger.log('[MindmapStateManager] 状态已重置到默认值');
  }
  
  /**
   * 获取状态管理器统计信息
   */
  getStats() {
    return {
      ...this.stats,
      currentStateSize: JSON.stringify(this.state).length,
      historyCount: this.stateHistory.length,
      subscriberCount: this.subscribers.size,
      pendingUpdatesCount: Object.keys(this._pendingUpdates).length
    };
  }
  
  /**
   * 清理资源
   */
  destroy() {
    // 清理定时器
    clearTimeout(this._persistTimer);
    clearTimeout(this._batchUpdateTimer);
    if (this.state.snapTimer) {
      clearInterval(this.state.snapTimer);
    }
    
    // 清理订阅者
    this.subscribers.clear();
    
    // 清理状态历史
    this.stateHistory = [];
    
    this.logger.log('[MindmapStateManager] 状态管理器已销毁');
  }
  
  // ==================== 私有方法 ====================
  
  /**
   * 初始化状态管理器
   */
  async _initializeStateManager() {
    try {
      // 加载持久化状态
      if (this.config.enableStatePersistence) {
        await this._loadPersistedState();
      }
      
      // 启动快照定时器
      this._startSnapTimer();
      
      this.setState({
        initialized: true
      }, {
        source: 'initialization'
      });
      
      this.logger.log('[MindmapStateManager] 状态管理器初始化完成');
    } catch (error) {
      this.logger.error('[MindmapStateManager] 状态管理器初始化失败:', error);
    }
  }
  
  /**
   * 应用状态更新
   */
  _applyStateUpdates(updates, options = {}) {
    const { silent = false, persist = true, source = 'unknown' } = options;
    
    const oldState = { ...this.state };
    
    // 应用更新
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        this.state[key] = updates[key];
      }
    });
    
    this.stats.totalStateChanges++;
    
    // 通知订阅者
    if (!silent) {
      this._notifySubscribers(updates, oldState);
    }
    
    // 持久化状态
    if (persist && this.config.enableStatePersistence) {
      this._schedulePersistence();
    }
    
    // 触发通用状态变更事件
    this._emitEvent('state:changed', {
      updates: updates,
      oldState: oldState,
      newState: this.state,
      source: source
    });
    
    this.logger.log(`[MindmapStateManager] 状态已更新 (${source}):`, Object.keys(updates));
  }
  
  /**
   * 安排批量更新
   */
  _scheduleBatchUpdate() {
    clearTimeout(this._batchUpdateTimer);
    this._batchUpdateTimer = setTimeout(() => {
      if (Object.keys(this._pendingUpdates).length > 0) {
        this._applyStateUpdates(this._pendingUpdates, { source: 'batch' });
        this._pendingUpdates = {};
      }
    }, 16); // 16ms ≈ 60fps
  }
  
  /**
   * 通知订阅者
   */
  _notifySubscribers(updates, oldState) {
    this.subscribers.forEach(subscription => {
      try {
        const currentValue = this._getNestedValue(this.state, subscription.path);
        const oldValue = subscription.lastValue;
        
        // 检查值是否发生变化
        if (this._hasValueChanged(oldValue, currentValue)) {
          subscription.callback(currentValue, oldValue, {
            path: subscription.path,
            updates: updates,
            oldState: oldState,
            newState: this.state
          });
          
          subscription.lastValue = currentValue;
        }
      } catch (error) {
        this.logger.error(`[MindmapStateManager] 订阅者通知失败 (${subscription.id}):`, error);
      }
    });
  }
  
  /**
   * 安排状态持久化
   */
  _schedulePersistence() {
    clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => {
      this._persistState();
    }, this.config.persistDebounceMs);
  }
  
  /**
   * 持久化状态
   */
  async _persistState() {
    try {
      const persistableState = this._getPersistableState();
      await this.autogenStorage.store('mindmap', 'app_state_v1', persistableState);
      
      this.stats.persistedStates++;
      this.logger.log('[MindmapStateManager] 状态已持久化');
    } catch (error) {
      this.logger.error('[MindmapStateManager] 状态持久化失败:', error);
    }
  }
  
  /**
   * 加载持久化状态
   */
  async _loadPersistedState() {
    try {
      const persistedState = await this.autogenStorage.retrieve('mindmap', 'app_state_v1');
      
      if (persistedState) {
        // 合并持久化状态到当前状态
        Object.assign(this.state, persistedState);
        this.stats.stateRestores++;
        this.logger.log('[MindmapStateManager] 持久化状态已加载');
      }
    } catch (error) {
      this.logger.warn('[MindmapStateManager] 持久化状态加载失败:', error);
    }
  }
  
  /**
   * 获取可持久化的状态
   */
  _getPersistableState() {
    const { 
      debugMessages, 
      performanceMetrics, 
      snapTimer,
      ...persistableState 
    } = this.state;
    
    return persistableState;
  }
  
  /**
   * 启动快照定时器
   */
  _startSnapTimer() {
    if (this.state.snapTimer) {
      clearInterval(this.state.snapTimer);
    }
    
    const timer = setInterval(() => {
      this.saveStateToHistory(`自动快照 ${new Date().toLocaleTimeString()}`);
      this.state.lastSnapTime = Date.now();
    }, this.state.snapConfig.intervalMs);
    
    this.state.snapTimer = timer;
  }
  
  /**
   * 重启快照定时器
   */
  _restartSnapTimer() {
    this._startSnapTimer();
    this.logger.log('[MindmapStateManager] 快照定时器已重启');
  }
  
  /**
   * 从快照恢复状态
   */
  _restoreStateFromSnapshot(snapshot) {
    const restoredState = { ...snapshot.state };
    
    // 不恢复某些运行时状态
    restoredState.loading = false;
    restoredState.saving = false;
    restoredState.snapTimer = this.state.snapTimer;
    
    this.state = restoredState;
    
    // 通知所有订阅者
    this._notifySubscribers(restoredState, {});
    
    this._emitEvent('state:restored', {
      snapshot: snapshot,
      restoredState: restoredState
    });
  }
  
  /**
   * 获取默认状态
   */
  _getDefaultState() {
    return {
      initialized: true,
      loading: false,
      saving: false,
      selectedNodeId: null,
      clipboard: null,
      dragEnabled: true,
      tagGroups: [],
      activeTagGroup: null,
      tagGroupThemes: {},
      tagPanelVisible: true,
      tagPanelCollapsed: false,
      contentDirty: false,
      editorSize: { width: 300, height: 400 },
      editorVisible: true,
      editorMode: 'edit',
      toolbarVisible: true,
      contextMenuVisible: false,
      contextMenuPosition: { x: 0, y: 0 },
      snapConfig: {
        intervalMs: this.config.snapshot.intervalMs,
        maxCount: this.config.snapshot.maxCount
      },
      snapTimer: this.state.snapTimer,
      lastSnapTime: null,
      debugMessages: [],
      debugPanelVisible: false,
      performanceMetrics: {
        renderTime: 0,
        saveTime: 0,
        loadTime: 0
      }
    };
  }
  
  /**
   * 获取嵌套值
   */
  _getNestedValue(obj, path) {
    if (!path) return obj;
    
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  /**
   * 检查值是否发生变化
   */
  _hasValueChanged(oldValue, newValue) {
    if (oldValue === newValue) return false;
    
    // 对象深度比较
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }
    
    return true;
  }
  
  /**
   * 触发事件
   */
  _emitEvent(eventName, data) {
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit(eventName, data);
    }
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MindmapStateManager;
} else if (typeof window !== 'undefined') {
  window.MindmapStateManager = MindmapStateManager;
}
