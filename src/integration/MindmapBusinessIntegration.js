/**
 * 程序员 MindmapBusinessIntegration.js - 业务层集成脚本
 * 
 * Phase 3: 业务逻辑层拆分 - 业务层无侵入式集成
 * 
 * 职责范围：
 * - 业务模块无侵入式集成到现有MindmapController
 * - 方法重写与事件桥接
 * - 依赖管理与错误回退
 * - 业务模块协调与通信
 * 
 * 技术特点：
 * - 无侵入集成：保持100%向后兼容性
 * - 智能依赖管理：等待所有依赖加载完成
 * - 错误隔离：业务模块失败时自动回退
 * - 事件协调：统一业务模块间的事件通信
 * - 性能优化：懒加载、批量操作、防抖处理
 */

class MindmapBusinessIntegration {
  constructor(options = {}) {
    // 配置参数
    this.config = {
      // 是否启用各个业务模块
      enableNodeManager: true,
      enableSyncManager: true,
      enableStateManager: true,
      
      // 依赖等待超时时间
      dependencyTimeoutMs: 10000,
      
      // 错误回退配置
      fallbackOnError: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      
      // 性能优化配置
      enableLazyLoading: true,
      enableBatchOperations: true,
      
      // 调试配置
      enableDebugLogging: true,
      logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
      
      ...options
    };
    
    // 依赖注入
    this.eventBus = options.eventBus || window.AutogenEventBus;
    this.logger = options.logger || console;
    
    // 业务模块实例
    this.modules = {
      nodeManager: null,
      syncManager: null,
      stateManager: null
    };
    
    // 集成状态
    this.integrationState = {
      initialized: false,
      nodeManager: false,
      syncManager: false,
      stateManager: false,
      errors: []
    };
    
    // 原始方法备份
    this.originalMethods = new Map();
    
    // 重试计数器
    this.retryCounters = new Map();
    
    // 性能统计
    this.stats = {
      integrationTime: 0,
      methodCalls: 0,
      fallbackCalls: 0,
      errors: 0,
      retries: 0
    };
    
    this.logger.log('[MindmapBusinessIntegration] 业务层集成器初始化完成');
  }
  
  /**
   * 执行业务层模块集成
   */
  async integrate(mindmapController) {
    if (!mindmapController) {
      throw new Error('MindmapController实例是必需的');
    }
    
    const startTime = performance.now();
    
    try {
      this.logger.log('[MindmapBusinessIntegration] 开始业务层集成...');
      
      // 等待依赖加载
      await this._waitForDependencies();
      
      // 初始化业务模块
      await this._initializeBusinessModules(mindmapController);
      
      // 集成节点管理器
      if (this.config.enableNodeManager) {
        await this._integrateNodeManager(mindmapController);
      }
      
      // 集成数据同步管理器
      if (this.config.enableSyncManager) {
        await this._integrateSyncManager(mindmapController);
      }
      
      // 集成状态管理器
      if (this.config.enableStateManager) {
        await this._integrateStateManager(mindmapController);
      }
      
      // 设置模块间协调
      this._setupModuleCoordination();
      
      // 标记集成完成
      this.integrationState.initialized = true;
      
      const duration = performance.now() - startTime;
      this.stats.integrationTime = duration;
      
      this.logger.log(`[MindmapBusinessIntegration] ✅ 业务层集成完成 (${duration.toFixed(2)}ms)`);
      
      // 触发集成完成事件
      this._emitEvent('business:integrationComplete', {
        duration: duration,
        modules: this.integrationState
      });
      
      return true;
    } catch (error) {
      this.logger.error('[MindmapBusinessIntegration] 业务层集成失败:', error);
      this.stats.errors++;
      
      // 如果启用回退，尝试恢复原始方法
      if (this.config.fallbackOnError) {
        this._restoreOriginalMethods(mindmapController);
      }
      
      throw error;
    }
  }
  
  /**
   * 获取集成状态
   */
  getIntegrationState() {
    return {
      ...this.integrationState,
      stats: { ...this.stats },
      moduleStates: {
        nodeManager: this.modules.nodeManager ? this.modules.nodeManager.getManagerState() : null,
        syncManager: this.modules.syncManager ? this.modules.syncManager.getSyncState() : null,
        stateManager: this.modules.stateManager ? this.modules.stateManager.getStats() : null
      }
    };
  }
  
  /**
   * 销毁集成器
   */
  destroy() {
    // 销毁业务模块
    Object.values(this.modules).forEach(module => {
      if (module && typeof module.destroy === 'function') {
        module.destroy();
      }
    });
    
    // 清理状态
    this.modules = { nodeManager: null, syncManager: null, stateManager: null };
    this.originalMethods.clear();
    this.retryCounters.clear();
    
    this.logger.log('[MindmapBusinessIntegration] 业务层集成器已销毁');
  }
  
  // ==================== 私有方法 ====================
  
  /**
   * 等待依赖加载
   */
  async _waitForDependencies() {
    const dependencies = [
      'MindmapNodeManager',
      'MindmapSyncManager', 
      'MindmapStateManager'
    ];
    
    const startTime = Date.now();
    const timeout = this.config.dependencyTimeoutMs;
    
    while (Date.now() - startTime < timeout) {
      const allLoaded = dependencies.every(dep => typeof window[dep] === 'function');
      
      if (allLoaded) {
        this.logger.log('[MindmapBusinessIntegration] 所有业务模块依赖已加载');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const missingDeps = dependencies.filter(dep => typeof window[dep] !== 'function');
    throw new Error(`业务模块依赖加载超时: ${missingDeps.join(', ')}`);
  }
  
  /**
   * 初始化业务模块
   */
  async _initializeBusinessModules(mindmapController) {
    try {
      // 初始化节点管理器
      if (this.config.enableNodeManager && window.MindmapNodeManager) {
        this.modules.nodeManager = new window.MindmapNodeManager({
          mind: mindmapController.mind,
          dataManager: mindmapController.dataManager,
          eventBus: this.eventBus,
          logger: this.logger
        });
        this.logger.log('[MindmapBusinessIntegration] 节点管理器初始化完成');
      }
      
      // 初始化数据同步管理器
      if (this.config.enableSyncManager && window.MindmapSyncManager) {
        this.modules.syncManager = new window.MindmapSyncManager({
          mind: mindmapController.mind,
          dataManager: mindmapController.dataManager,
          autogenStorage: mindmapController.autogenStorage,
          eventBus: this.eventBus,
          logger: this.logger
        });
        this.logger.log('[MindmapBusinessIntegration] 数据同步管理器初始化完成');
      }
      
      // 初始化状态管理器
      if (this.config.enableStateManager && window.MindmapStateManager) {
        this.modules.stateManager = new window.MindmapStateManager({
          mind: mindmapController.mind,
          autogenStorage: mindmapController.autogenStorage,
          eventBus: this.eventBus,
          logger: this.logger
        });
        this.logger.log('[MindmapBusinessIntegration] 状态管理器初始化完成');
      }
      
    } catch (error) {
      this.logger.error('[MindmapBusinessIntegration] 业务模块初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 集成节点管理器
   */
  async _integrateNodeManager(mindmapController) {
    if (!this.modules.nodeManager) return;
    
    try {
      // 备份原始方法
      this._backupOriginalMethod(mindmapController, 'addChildNode');
      this._backupOriginalMethod(mindmapController, 'addSiblingNode');
      this._backupOriginalMethod(mindmapController, 'removeNode');
      this._backupOriginalMethod(mindmapController, 'updateNodeDetails');
      this._backupOriginalMethod(mindmapController, 'setSelectedNode');
      this._backupOriginalMethod(mindmapController, 'findNode');
      this._backupOriginalMethod(mindmapController, 'findParentNode');
      this._backupOriginalMethod(mindmapController, 'copyNode');
      this._backupOriginalMethod(mindmapController, 'cutNode');
      this._backupOriginalMethod(mindmapController, 'pasteNode');
      
      // 重写节点操作方法
      mindmapController.addChildNode = (parentNodeId, nodeData) => {
        return this._executeWithFallback(mindmapController, 'addChildNode', [parentNodeId, nodeData], () => {
          return this.modules.nodeManager.addChildNode(parentNodeId, nodeData);
        });
      };
      
      mindmapController.addSiblingNode = (siblingNodeId, nodeData) => {
        return this._executeWithFallback(mindmapController, 'addSiblingNode', [siblingNodeId, nodeData], () => {
          return this.modules.nodeManager.addSiblingNode(siblingNodeId, nodeData);
        });
      };
      
      mindmapController.removeNode = (nodeId) => {
        return this._executeWithFallback(mindmapController, 'removeNode', [nodeId], () => {
          return this.modules.nodeManager.removeNode(nodeId);
        });
      };
      
      mindmapController.updateNodeDetails = (nodeId) => {
        return this._executeWithFallback(mindmapController, 'updateNodeDetails', [nodeId], () => {
          return this.modules.nodeManager.updateNodeDetails(nodeId);
        });
      };
      
      mindmapController.setSelectedNode = (nodeId) => {
        return this._executeWithFallback(mindmapController, 'setSelectedNode', [nodeId], () => {
          const result = this.modules.nodeManager.setSelectedNode(nodeId);
          // 同步到状态管理器
          if (this.modules.stateManager) {
            this.modules.stateManager.setSelectedNode(nodeId);
          }
          return result;
        });
      };
      
      mindmapController.findNode = (nodeId) => {
        return this._executeWithFallback(mindmapController, 'findNode', [nodeId], () => {
          return this.modules.nodeManager.findNode(nodeId);
        });
      };
      
      mindmapController.findParentNode = (nodeId) => {
        return this._executeWithFallback(mindmapController, 'findParentNode', [nodeId], () => {
          return this.modules.nodeManager.findParentNode(nodeId);
        });
      };
      
      mindmapController.copyNode = (nodeId) => {
        return this._executeWithFallback(mindmapController, 'copyNode', [nodeId], () => {
          const result = this.modules.nodeManager.copyNode(nodeId);
          // 同步到状态管理器
          if (this.modules.stateManager && result) {
            this.modules.stateManager.setClipboard(this.modules.nodeManager.state.clipboard);
          }
          return result;
        });
      };
      
      mindmapController.cutNode = (nodeId) => {
        return this._executeWithFallback(mindmapController, 'cutNode', [nodeId], () => {
          const result = this.modules.nodeManager.cutNode(nodeId);
          // 同步到状态管理器
          if (this.modules.stateManager && result) {
            this.modules.stateManager.setClipboard(this.modules.nodeManager.state.clipboard);
          }
          return result;
        });
      };
      
      mindmapController.pasteNode = (targetNodeId, asChild = true) => {
        return this._executeWithFallback(mindmapController, 'pasteNode', [targetNodeId, asChild], () => {
          return this.modules.nodeManager.pasteNode(targetNodeId, asChild);
        });
      };
      
      // 为控制器实例添加节点管理器引用
      mindmapController.nodeManager = this.modules.nodeManager;
      
      this.integrationState.nodeManager = true;
      this.logger.log('[MindmapBusinessIntegration] ✅ 节点管理器集成完成');
      
    } catch (error) {
      this.logger.error('[MindmapBusinessIntegration] 节点管理器集成失败:', error);
      throw error;
    }
  }
  
  /**
   * 集成数据同步管理器
   */
  async _integrateSyncManager(mindmapController) {
    if (!this.modules.syncManager) return;
    
    try {
      // 备份原始方法
      this._backupOriginalMethod(mindmapController, 'saveMindmapToStorage');
      this._backupOriginalMethod(mindmapController, 'loadMindmapFromStorage');
      this._backupOriginalMethod(mindmapController, '_loadInitialData');
      this._backupOriginalMethod(mindmapController, 'showSavedMindIfAny');
      
      // 重写数据同步方法
      mindmapController.saveMindmapToStorage = (data, options) => {
        return this._executeWithFallback(mindmapController, 'saveMindmapToStorage', [data, options], () => {
          return this.modules.syncManager.saveMindmapToStorage(data, options);
        });
      };
      
      mindmapController.loadMindmapFromStorage = () => {
        return this._executeWithFallback(mindmapController, 'loadMindmapFromStorage', [], () => {
          return this.modules.syncManager.loadInitialData();
        });
      };
      
      mindmapController._loadInitialData = () => {
        return this._executeWithFallback(mindmapController, '_loadInitialData', [], () => {
          return this.modules.syncManager.loadInitialData();
        });
      };
      
      mindmapController.showSavedMindIfAny = () => {
        return this._executeWithFallback(mindmapController, 'showSavedMindIfAny', [], async () => {
          const data = await this.modules.syncManager.loadInitialData();
          if (data && mindmapController.mind) {
            mindmapController.mind.show(data);
            return true;
          }
          return false;
        });
      };
      
      // 添加新的同步方法
      mindmapController.syncToJsonBase = (data, options) => {
        if (this.modules.syncManager) {
          return this.modules.syncManager.syncToJsonBase(data, options);
        }
        return Promise.resolve(false);
      };
      
      mindmapController.createSnapshot = (data, label) => {
        if (this.modules.syncManager) {
          return this.modules.syncManager.createSnapshot(data, label);
        }
        return Promise.resolve(null);
      };
      
      mindmapController.restoreFromSnapshot = (snapshotId) => {
        if (this.modules.syncManager) {
          return this.modules.syncManager.restoreFromSnapshot(snapshotId);
        }
        return Promise.resolve(null);
      };
      
      // 为控制器实例添加同步管理器引用
      mindmapController.syncManager = this.modules.syncManager;
      
      this.integrationState.syncManager = true;
      this.logger.log('[MindmapBusinessIntegration] ✅ 数据同步管理器集成完成');
      
    } catch (error) {
      this.logger.error('[MindmapBusinessIntegration] 数据同步管理器集成失败:', error);
      throw error;
    }
  }
  
  /**
   * 集成状态管理器
   */
  async _integrateStateManager(mindmapController) {
    if (!this.modules.stateManager) return;
    
    try {
      // 添加状态管理方法到控制器
      mindmapController.getState = (path) => {
        return this.modules.stateManager.getState(path);
      };
      
      mindmapController.setState = (updates, options) => {
        return this.modules.stateManager.setState(updates, options);
      };
      
      mindmapController.subscribeState = (path, callback, options) => {
        return this.modules.stateManager.subscribe(path, callback, options);
      };
      
      mindmapController.unsubscribeState = (subscriptionId) => {
        return this.modules.stateManager.unsubscribe(subscriptionId);
      };
      
      // 备份和重写拖拽控制方法
      this._backupOriginalMethod(mindmapController, 'enableDragging');
      this._backupOriginalMethod(mindmapController, 'disableDragging');
      
      mindmapController.enableDragging = () => {
        return this._executeWithFallback(mindmapController, 'enableDragging', [], () => {
          this.modules.stateManager.setDragEnabled(true);
          mindmapController.dragEnabled = true;
          this.logger.log('[MindmapBusinessIntegration] 拖拽已启用');
        });
      };
      
      mindmapController.disableDragging = () => {
        return this._executeWithFallback(mindmapController, 'disableDragging', [], () => {
          this.modules.stateManager.setDragEnabled(false);
          mindmapController.dragEnabled = false;
          this.logger.log('[MindmapBusinessIntegration] 拖拽已禁用');
        });
      };
      
      // 同步现有状态到状态管理器
      this.modules.stateManager.setState({
        selectedNodeId: mindmapController.selectedNode,
        dragEnabled: mindmapController.dragEnabled
      }, { source: 'initialization' });
      
      // 为控制器实例添加状态管理器引用
      mindmapController.stateManager = this.modules.stateManager;
      
      this.integrationState.stateManager = true;
      this.logger.log('[MindmapBusinessIntegration] ✅ 状态管理器集成完成');
      
    } catch (error) {
      this.logger.error('[MindmapBusinessIntegration] 状态管理器集成失败:', error);
      throw error;
    }
  }
  
  /**
   * 设置模块间协调
   */
  _setupModuleCoordination() {
    // 节点操作后自动保存
    if (this.modules.nodeManager && this.modules.syncManager) {
      this.eventBus.on('node:added', () => {
        this.modules.syncManager.saveMindmapToStorage();
      });
      
      this.eventBus.on('node:removed', () => {
        this.modules.syncManager.saveMindmapToStorage();
      });
      
      this.eventBus.on('node:updated', () => {
        this.modules.syncManager.saveMindmapToStorage();
      });
      
      this.eventBus.on('node:moved', () => {
        this.modules.syncManager.saveMindmapToStorage();
      });
    }
    
    // 状态变更时的协调
    if (this.modules.stateManager) {
      this.eventBus.on('state:changed', (data) => {
        // 可以在这里添加状态变更的协调逻辑
        this.logger.log('[MindmapBusinessIntegration] 状态变更协调:', data.updates);
      });
    }
    
    this.logger.log('[MindmapBusinessIntegration] 模块间协调设置完成');
  }
  
  /**
   * 备份原始方法
   */
  _backupOriginalMethod(controller, methodName) {
    if (typeof controller[methodName] === 'function') {
      this.originalMethods.set(methodName, controller[methodName].bind(controller));
    }
  }
  
  /**
   * 调用原始方法
   */
  _callOriginalMethod(controller, methodName, args) {
    const originalMethod = this.originalMethods.get(methodName);
    if (originalMethod) {
      return originalMethod.apply(controller, args);
    }
    this.logger.warn(`[MindmapBusinessIntegration] 原始方法不存在: ${methodName}`);
    return null;
  }
  
  /**
   * 带回退机制的方法执行
   */
  _executeWithFallback(controller, methodName, args, newImplementation) {
    this.stats.methodCalls++;
    
    try {
      return newImplementation();
    } catch (error) {
      this.logger.warn(`[MindmapBusinessIntegration] 新实现失败，回退到原方法: ${methodName}`, error);
      this.stats.fallbackCalls++;
      
      // 尝试重试
      const retryKey = methodName;
      const retryCount = this.retryCounters.get(retryKey) || 0;
      
      if (retryCount < this.config.maxRetries) {
        this.retryCounters.set(retryKey, retryCount + 1);
        this.stats.retries++;
        
        // 延迟重试
        setTimeout(() => {
          try {
            return newImplementation();
          } catch (retryError) {
            this.logger.error(`[MindmapBusinessIntegration] 重试失败: ${methodName}`, retryError);
            return this._callOriginalMethod(controller, methodName, args);
          }
        }, this.config.retryDelayMs);
      }
      
      return this._callOriginalMethod(controller, methodName, args);
    }
  }
  
  /**
   * 恢复原始方法
   */
  _restoreOriginalMethods(controller) {
    this.originalMethods.forEach((originalMethod, methodName) => {
      controller[methodName] = originalMethod;
    });
    
    this.logger.log('[MindmapBusinessIntegration] 原始方法已恢复');
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

// 自动集成功能
if (typeof window !== 'undefined') {
  window.MindmapBusinessIntegration = MindmapBusinessIntegration;
  
  // 自动集成到现有的MindmapController
  const autoIntegrate = async () => {
    try {
      if (window.mindmapController && !window.mindmapController._businessIntegrated) {
        console.log('[MindmapBusinessIntegration] 检测到MindmapController，开始自动集成...');
        
        const integrator = new MindmapBusinessIntegration({
          enableDebugLogging: true
        });
        
        await integrator.integrate(window.mindmapController);
        
        // 标记已集成，避免重复集成
        window.mindmapController._businessIntegrated = true;
        window.mindmapController._businessIntegrator = integrator;
        
        console.log('[MindmapBusinessIntegration] ✅ 自动集成完成');
      }
    } catch (error) {
      console.error('[MindmapBusinessIntegration] 自动集成失败:', error);
    }
  };
  
  // 如果DOM已加载，立即执行；否则等待DOMContentLoaded事件
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoIntegrate);
  } else {
    // 延迟执行，确保其他脚本已加载
    setTimeout(autoIntegrate, 1000);
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MindmapBusinessIntegration;
}
