/**
 * 程序员 MindmapPresentationIntegration.js - 表现层模块集成脚本
 * 
 * 职责：
 * - 无侵入式集成表现层模块到现有控制器
 * - 方法重写和依赖注入
 * - 事件桥接和状态同步
 * - 错误处理和回退机制
 * 
 * 设计原则：
 * - 无侵入性：不破坏现有代码结构
 * - 渐进式：可选择性地启用各个模块
 * - 向后兼容：保持原有API接口不变
 * - 错误隔离：模块失败不影响整体功能
 */

class MindmapPresentationIntegration {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.eventBus = options.eventBus || window.AutogenEventBus;
    
    // 集成状态
    this.integrationState = {
      renderer: false,
      eventManager: false,
      uiController: false,
      initialized: false
    };
    
    // 模块实例
    this.modules = {
      renderer: null,
      eventManager: null,
      uiController: null
    };
    
    // 原始方法备份
    this.originalMethods = new Map();
    
    // 集成配置
    this.config = {
      enableRenderer: true,
      enableEventManager: true,
      enableUIController: true,
      
      // 回退配置
      fallbackOnError: true,
      maxRetries: 3,
      retryDelayMs: 1000
    };
    
    this.logger.log('[MindmapPresentationIntegration] 表现层集成器初始化完成');
  }
  
  /**
   * 执行表现层模块集成
   */
  async integrate(mindmapController) {
    if (!mindmapController) {
      throw new Error('MindmapController实例是必需的');
    }
    
    try {
      this.logger.log('[MindmapPresentationIntegration] 开始表现层模块集成...');
      
      // 等待依赖加载
      await this._waitForDependencies();
      
      // 初始化各个模块
      await this._initializeModules(mindmapController);
      
      // 集成渲染器
      if (this.config.enableRenderer) {
        await this._integrateRenderer(mindmapController);
      }
      
      // 集成事件管理器
      if (this.config.enableEventManager) {
        await this._integrateEventManager(mindmapController);
      }
      
      // 集成UI控制器
      if (this.config.enableUIController) {
        await this._integrateUIController(mindmapController);
      }
      
      // 设置事件桥接
      this._setupEventBridges(mindmapController);
      
      // 标记集成完成
      this.integrationState.initialized = true;
      
      this.logger.log('[MindmapPresentationIntegration] ✅ 表现层模块集成完成');
      
      // 触发集成完成事件
      this._emitIntegrationEvent('presentation-integration-complete', {
        modules: this.integrationState,
        timestamp: Date.now()
      });
      
      return true;
      
    } catch (error) {
      this.logger.error('[MindmapPresentationIntegration] 表现层模块集成失败:', error);
      
      // 触发集成失败事件
      this._emitIntegrationEvent('presentation-integration-failed', {
        error: error.message,
        timestamp: Date.now()
      });
      
      // 如果启用回退，尝试恢复原始方法
      if (this.config.fallbackOnError) {
        this._restoreOriginalMethods(mindmapController);
      }
      
      throw error;
    }
  }
  
  /**
   * 等待依赖加载
   */
  async _waitForDependencies() {
    const maxWaitTime = 10000; // 10秒超时
    const checkInterval = 100;
    let waitTime = 0;
    
    const checkDependencies = () => {
      const dependencies = {
        MindmapRenderer: typeof window.MindmapRenderer !== 'undefined',
        MindmapEventManager: typeof window.MindmapEventManager !== 'undefined',
        MindmapUIController: typeof window.MindmapUIController !== 'undefined',
        AutogenUnifiedStorage: typeof window.AutogenUnifiedStorage !== 'undefined'
      };
      
      return Object.values(dependencies).every(loaded => loaded);
    };
    
    while (!checkDependencies() && waitTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
    }
    
    if (!checkDependencies()) {
      throw new Error('表现层模块依赖加载超时');
    }
    
    this.logger.log('[MindmapPresentationIntegration] 依赖加载完成');
  }
  
  /**
   * 初始化各个模块
   */
  async _initializeModules(mindmapController) {
    try {
      // 初始化渲染器
      if (this.config.enableRenderer && window.MindmapRenderer) {
        this.modules.renderer = new window.MindmapRenderer({
          mind: mindmapController.mind,
          eventBus: this.eventBus,
          logger: this.logger
        });
        this.logger.log('[MindmapPresentationIntegration] 渲染器模块初始化完成');
      }
      
      // 初始化事件管理器
      if (this.config.enableEventManager && window.MindmapEventManager) {
        this.modules.eventManager = new window.MindmapEventManager({
          mind: mindmapController.mind,
          container: mindmapController.dom?.containerEl,
          eventBus: this.eventBus,
          logger: this.logger
        });
        await this.modules.eventManager.initialize();
        this.logger.log('[MindmapPresentationIntegration] 事件管理器模块初始化完成');
      }
      
      // 初始化UI控制器
      if (this.config.enableUIController && window.MindmapUIController) {
        this.modules.uiController = new window.MindmapUIController({
          eventBus: this.eventBus,
          logger: this.logger
        });
        await this.modules.uiController.initialize();
        this.logger.log('[MindmapPresentationIntegration] UI控制器模块初始化完成');
      }
      
    } catch (error) {
      this.logger.error('[MindmapPresentationIntegration] 模块初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 集成渲染器模块
   */
  async _integrateRenderer(mindmapController) {
    if (!this.modules.renderer) return;
    
    try {
      // 备份原始方法
      this._backupOriginalMethod(mindmapController, 'renderMindmap');
      this._backupOriginalMethod(mindmapController, 'applyDefaultNodeColor');
      this._backupOriginalMethod(mindmapController, 'scheduleAutoFit');
      
      // 重写渲染方法
      mindmapController.renderMindmap = async (...args) => {
        try {
          // 使用新的渲染器
          const success = await this.modules.renderer.renderMindmap(mindmapController.data, {
            selectedNodeId: mindmapController.selectedNode,
            forceRender: args[0] === true
          });
          
          if (success) {
            this.logger.log('[MindmapPresentationIntegration] 使用新渲染器渲染成功');
            return true;
          } else {
            throw new Error('渲染器返回失败');
          }
        } catch (error) {
          this.logger.warn('[MindmapPresentationIntegration] 新渲染器失败，回退到原方法:', error);
          return this._callOriginalMethod(mindmapController, 'renderMindmap', args);
        }
      };
      
      // 重写颜色应用方法
      mindmapController.applyDefaultNodeColor = async (backgroundColor, foregroundColor) => {
        try {
          await this.modules.renderer.applyDefaultNodeColor(backgroundColor, foregroundColor);
          this.logger.log('[MindmapPresentationIntegration] 使用新渲染器应用颜色成功');
        } catch (error) {
          this.logger.warn('[MindmapPresentationIntegration] 新渲染器颜色应用失败，回退到原方法:', error);
          return this._callOriginalMethod(mindmapController, 'applyDefaultNodeColor', [backgroundColor, foregroundColor]);
        }
      };
      
      // 重写自动适配方法
      mindmapController.scheduleAutoFit = () => {
        try {
          this.modules.renderer.scheduleAutoFit();
          this.logger.log('[MindmapPresentationIntegration] 使用新渲染器自动适配');
        } catch (error) {
          this.logger.warn('[MindmapPresentationIntegration] 新渲染器自动适配失败，回退到原方法:', error);
          return this._callOriginalMethod(mindmapController, 'scheduleAutoFit', []);
        }
      };
      
      // 为控制器实例添加渲染器引用
      mindmapController.renderer = this.modules.renderer;
      
      this.integrationState.renderer = true;
      this.logger.log('[MindmapPresentationIntegration] ✅ 渲染器集成完成');
      
    } catch (error) {
      this.logger.error('[MindmapPresentationIntegration] 渲染器集成失败:', error);
      throw error;
    }
  }
  
  /**
   * 集成事件管理器模块
   */
  async _integrateEventManager(mindmapController) {
    if (!this.modules.eventManager) return;
    
    try {
      // 备份原始方法
      this._backupOriginalMethod(mindmapController, 'wireKeyboardShortcuts');
      this._backupOriginalMethod(mindmapController, 'wireContextMenu');
      this._backupOriginalMethod(mindmapController, 'enableDragging');
      this._backupOriginalMethod(mindmapController, 'disableDragging');
      
      // 设置依赖
      this.modules.eventManager.setDependencies(mindmapController.mind, mindmapController.dom?.containerEl);
      
      // 重写键盘快捷键方法
      mindmapController.wireKeyboardShortcuts = () => {
        try {
          // 新的事件管理器已经在初始化时绑定了键盘事件
          this.logger.log('[MindmapPresentationIntegration] 使用新事件管理器的键盘快捷键');
        } catch (error) {
          this.logger.warn('[MindmapPresentationIntegration] 新事件管理器键盘绑定失败，回退到原方法:', error);
          return this._callOriginalMethod(mindmapController, 'wireKeyboardShortcuts', []);
        }
      };
      
      // 重写右键菜单方法
      mindmapController.wireContextMenu = () => {
        try {
          // 新的事件管理器已经在初始化时绑定了右键菜单
          this.logger.log('[MindmapPresentationIntegration] 使用新事件管理器的右键菜单');
        } catch (error) {
          this.logger.warn('[MindmapPresentationIntegration] 新事件管理器右键菜单失败，回退到原方法:', error);
          return this._callOriginalMethod(mindmapController, 'wireContextMenu', []);
        }
      };
      
      // 重写拖拽控制方法
      mindmapController.enableDragging = () => {
        try {
          mindmapController.dragEnabled = true;
          this.modules.eventManager.config.dragEnabled = true;
          this.logger.log('[MindmapPresentationIntegration] 使用新事件管理器启用拖拽');
        } catch (error) {
          this.logger.warn('[MindmapPresentationIntegration] 新事件管理器拖拽启用失败，回退到原方法:', error);
          return this._callOriginalMethod(mindmapController, 'enableDragging', []);
        }
      };
      
      mindmapController.disableDragging = () => {
        try {
          mindmapController.dragEnabled = false;
          this.modules.eventManager.config.dragEnabled = false;
          this.logger.log('[MindmapPresentationIntegration] 使用新事件管理器禁用拖拽');
        } catch (error) {
          this.logger.warn('[MindmapPresentationIntegration] 新事件管理器拖拽禁用失败，回退到原方法:', error);
          return this._callOriginalMethod(mindmapController, 'disableDragging', []);
        }
      };
      
      // 为控制器实例添加事件管理器引用
      mindmapController.eventManager = this.modules.eventManager;
      
      this.integrationState.eventManager = true;
      this.logger.log('[MindmapPresentationIntegration] ✅ 事件管理器集成完成');
      
    } catch (error) {
      this.logger.error('[MindmapPresentationIntegration] 事件管理器集成失败:', error);
      throw error;
    }
  }
  
  /**
   * 集成UI控制器模块
   */
  async _integrateUIController(mindmapController) {
    if (!this.modules.uiController) return;
    
    try {
      // 备份原始方法
      this._backupOriginalMethod(mindmapController, 'showToast');
      this._backupOriginalMethod(mindmapController, 'renderTagPanelFromMind');
      
      // 重写Toast方法
      mindmapController.showToast = (message, type = 'info') => {
        try {
          this.modules.uiController.showToast(message, type);
          this.logger.log(`[MindmapPresentationIntegration] 使用新UI控制器显示Toast: ${message}`);
        } catch (error) {
          this.logger.warn('[MindmapPresentationIntegration] 新UI控制器Toast失败，回退到原方法:', error);
          return this._callOriginalMethod(mindmapController, 'showToast', [message, type]);
        }
      };
      
      // 重写标签面板渲染方法（保持兼容性）
      mindmapController.renderTagPanelFromMind = async () => {
        try {
          // 调用原方法进行标签面板渲染
          const result = await this._callOriginalMethod(mindmapController, 'renderTagPanelFromMind', []);
          this.logger.log('[MindmapPresentationIntegration] 标签面板渲染完成（使用原方法）');
          return result;
        } catch (error) {
          this.logger.warn('[MindmapPresentationIntegration] 标签面板渲染失败:', error);
        }
      };
      
      // 为控制器实例添加UI控制器引用
      mindmapController.uiController = this.modules.uiController;
      
      this.integrationState.uiController = true;
      this.logger.log('[MindmapPresentationIntegration] ✅ UI控制器集成完成');
      
    } catch (error) {
      this.logger.error('[MindmapPresentationIntegration] UI控制器集成失败:', error);
      throw error;
    }
  }
  
  /**
   * 设置事件桥接
   */
  _setupEventBridges(mindmapController) {
    try {
      // 监听事件管理器的快捷键事件
      if (this.modules.eventManager && this.eventBus) {
        this.eventBus.on('mindmap-events:keyboard:shortcut', (data) => {
          this._handleShortcutEvent(mindmapController, data);
        });
        
        this.eventBus.on('mindmap-events:drag:drop', (data) => {
          this._handleDragDropEvent(mindmapController, data);
        });
        
        this.eventBus.on('mindmap-events:contextmenu:show', (data) => {
          this._handleContextMenuEvent(mindmapController, data);
        });
      }
      
      // 监听UI控制器的工具栏事件
      if (this.modules.uiController && this.eventBus) {
        this.eventBus.on('mindmap-ui:toolbar:button-click', (data) => {
          this._handleToolbarEvent(mindmapController, data);
        });
      }
      
      this.logger.log('[MindmapPresentationIntegration] 事件桥接设置完成');
      
    } catch (error) {
      this.logger.error('[MindmapPresentationIntegration] 事件桥接设置失败:', error);
    }
  }
  
  /**
   * 处理快捷键事件
   */
  _handleShortcutEvent(mindmapController, data) {
    try {
      const { shortcut } = data;
      
      switch (shortcut) {
        case 'addChild':
          if (mindmapController.addChild) {
            mindmapController.addChild();
          }
          break;
        case 'addSibling':
          if (mindmapController.addSibling) {
            mindmapController.addSibling();
          }
          break;
        case 'deleteNode':
          if (mindmapController.deleteNode) {
            mindmapController.deleteNode();
          }
          break;
        case 'editNode':
          if (mindmapController.editNode) {
            mindmapController.editNode();
          }
          break;
        default:
          this.logger.log(`[MindmapPresentationIntegration] 未处理的快捷键: ${shortcut}`);
      }
    } catch (error) {
      this.logger.error('[MindmapPresentationIntegration] 快捷键事件处理失败:', error);
    }
  }
  
  /**
   * 处理拖拽放置事件
   */
  _handleDragDropEvent(mindmapController, data) {
    try {
      const { sourceId, targetId } = data;
      if (mindmapController.moveNodeTo) {
        mindmapController.moveNodeTo(sourceId, targetId, 'last');
      }
    } catch (error) {
      this.logger.error('[MindmapPresentationIntegration] 拖拽事件处理失败:', error);
    }
  }
  
  /**
   * 处理右键菜单事件
   */
  _handleContextMenuEvent(mindmapController, data) {
    try {
      // 这里可以显示自定义的右键菜单
      this.logger.log('[MindmapPresentationIntegration] 右键菜单事件:', data);
    } catch (error) {
      this.logger.error('[MindmapPresentationIntegration] 右键菜单事件处理失败:', error);
    }
  }
  
  /**
   * 处理工具栏事件
   */
  _handleToolbarEvent(mindmapController, data) {
    try {
      const { buttonId } = data;
      
      switch (buttonId) {
        case 'add-child':
          if (mindmapController.addChild) {
            mindmapController.addChild();
          }
          break;
        case 'add-sibling':
          if (mindmapController.addSibling) {
            mindmapController.addSibling();
          }
          break;
        case 'delete-node':
          if (mindmapController.deleteNode) {
            mindmapController.deleteNode();
          }
          break;
        case 'expand-all':
          if (mindmapController.expandAll) {
            mindmapController.expandAll();
          }
          break;
        case 'collapse-all':
          if (mindmapController.collapseAll) {
            mindmapController.collapseAll();
          }
          break;
        default:
          this.logger.log(`[MindmapPresentationIntegration] 未处理的工具栏按钮: ${buttonId}`);
      }
    } catch (error) {
      this.logger.error('[MindmapPresentationIntegration] 工具栏事件处理失败:', error);
    }
  }
  
  /**
   * 备份原始方法
   */
  _backupOriginalMethod(obj, methodName) {
    if (obj[methodName] && typeof obj[methodName] === 'function') {
      const key = `${obj.constructor.name}.${methodName}`;
      this.originalMethods.set(key, obj[methodName].bind(obj));
      this.logger.log(`[MindmapPresentationIntegration] 备份原始方法: ${key}`);
    }
  }
  
  /**
   * 调用原始方法
   */
  _callOriginalMethod(obj, methodName, args = []) {
    const key = `${obj.constructor.name}.${methodName}`;
    const originalMethod = this.originalMethods.get(key);
    if (originalMethod) {
      return originalMethod.apply(obj, args);
    } else {
      this.logger.warn(`[MindmapPresentationIntegration] 原始方法未找到: ${key}`);
      return null;
    }
  }
  
  /**
   * 恢复原始方法
   */
  _restoreOriginalMethods(mindmapController) {
    try {
      this.originalMethods.forEach((originalMethod, key) => {
        const methodName = key.split('.')[1];
        if (mindmapController[methodName]) {
          mindmapController[methodName] = originalMethod;
          this.logger.log(`[MindmapPresentationIntegration] 恢复原始方法: ${methodName}`);
        }
      });
    } catch (error) {
      this.logger.error('[MindmapPresentationIntegration] 恢复原始方法失败:', error);
    }
  }
  
  /**
   * 触发集成事件
   */
  _emitIntegrationEvent(eventName, data) {
    try {
      if (this.eventBus && typeof this.eventBus.emit === 'function') {
        this.eventBus.emit(eventName, data);
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
      }
    } catch (error) {
      this.logger.warn('[MindmapPresentationIntegration] 集成事件触发失败:', error);
    }
  }
  
  /**
   * 获取集成状态
   */
  getIntegrationState() {
    return {
      ...this.integrationState,
      moduleStats: {
        renderer: this.modules.renderer ? this.modules.renderer.getRenderStats() : null,
        eventManager: this.modules.eventManager ? this.modules.eventManager.getEventStats() : null,
        uiController: this.modules.uiController ? this.modules.uiController.getUIState() : null
      }
    };
  }
  
  /**
   * 销毁集成器
   */
  destroy() {
    try {
      // 销毁各个模块
      if (this.modules.renderer) {
        this.modules.renderer.destroy();
      }
      if (this.modules.eventManager) {
        this.modules.eventManager.destroy();
      }
      if (this.modules.uiController) {
        this.modules.uiController.destroy();
      }
      
      // 清理引用
      this.modules = { renderer: null, eventManager: null, uiController: null };
      this.originalMethods.clear();
      
      // 重置状态
      this.integrationState = {
        renderer: false,
        eventManager: false,
        uiController: false,
        initialized: false
      };
      
      this.logger.log('[MindmapPresentationIntegration] 表现层集成器已销毁');
      
    } catch (error) {
      this.logger.error('[MindmapPresentationIntegration] 销毁失败:', error);
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MindmapPresentationIntegration;
} else if (typeof window !== 'undefined') {
  window.MindmapPresentationIntegration = MindmapPresentationIntegration;
}

// 自动集成逻辑
(function() {
  'use strict';
  
  // 等待DOM加载完成后自动执行集成
  if (typeof window !== 'undefined') {
    const autoIntegrate = async () => {
      try {
        // 等待MindmapController实例可用
        let attempts = 0;
        const maxAttempts = 50; // 5秒超时
        
        while (attempts < maxAttempts) {
          if (window.mindmapController && typeof window.mindmapController === 'object') {
            console.log('[MindmapPresentationIntegration] 检测到MindmapController实例，开始自动集成...');
            
            // 创建集成器实例
            const integrator = new MindmapPresentationIntegration({
              logger: console,
              eventBus: window.AutogenEventBus
            });
            
            // 执行集成
            await integrator.integrate(window.mindmapController);
            
            // 将集成器实例保存到全局，供调试使用
            window.presentationIntegrator = integrator;
            
            console.log('[MindmapPresentationIntegration] ✅ 自动集成完成');
            break;
          }
          
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (attempts >= maxAttempts) {
          console.warn('[MindmapPresentationIntegration] 自动集成超时：未找到MindmapController实例');
        }
        
      } catch (error) {
        console.error('[MindmapPresentationIntegration] 自动集成失败:', error);
      }
    };
    
    // 如果DOM已加载，立即执行；否则等待DOMContentLoaded事件
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoIntegrate);
    } else {
      // 延迟执行，确保其他脚本已加载
      setTimeout(autoIntegrate, 500);
    }
  }
})();
