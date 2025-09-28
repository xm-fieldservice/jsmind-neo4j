/**
 * 程序员 MindmapRenderer.js - 脑图UI渲染逻辑模块
 * 
 * 职责：
 * - 脑图渲染与显示控制
 * - 节点样式和颜色管理
 * - 布局计算与视觉优化
 * - 渲染性能优化
 * 
 * 设计原则：
 * - 单一职责：专注UI渲染逻辑
 * - 依赖注入：避免硬编码全局依赖
 * - 性能优先：防抖渲染、缓存优化
 * - 错误隔离：渲染错误不影响数据层
 */

class MindmapRenderer {
  constructor(options = {}) {
    // 依赖注入
    this.mind = options.mind || null;
    this.eventBus = options.eventBus || null;
    this.logger = options.logger || console;
    
    // 渲染配置
    this.config = {
      // 防抖配置
      renderDebounceMs: 100,
      colorApplyDebounceMs: 50,
      
      // 默认样式
      defaultNodeColor: {
        background: '#f5f5f5',
        foreground: '#333'
      },
      
      // 性能配置
      enableRenderCache: true,
      maxCacheSize: 100,
      
      // 布局配置
      autoFitEnabled: true,
      autoFitDelayMs: 300
    };
    
    // 内部状态
    this.isRendering = false;
    this.renderQueue = [];
    this.styleCache = new Map();
    this.lastRenderHash = null;
    
    // 防抖定时器
    this._renderDebounceTimer = null;
    this._colorDebounceTimer = null;
    this._autoFitTimer = null;
    
    // 渲染统计
    this.stats = {
      totalRenders: 0,
      cachedRenders: 0,
      renderTime: 0,
      lastRenderTimestamp: null
    };
    
    this.logger.log('[MindmapRenderer] 渲染器初始化完成');
  }
  
  /**
   * 设置jsMind实例
   */
  setMindInstance(mind) {
    this.mind = mind;
    this.logger.log('[MindmapRenderer] jsMind实例已设置');
  }
  
  /**
   * 主渲染方法 - 将数据渲染为脑图
   * @param {Object} data - 内部数据结构
   * @param {Object} options - 渲染选项
   */
  async renderMindmap(data, options = {}) {
    if (!this.mind || !data) {
      this.logger.warn('[MindmapRenderer] 渲染失败：缺少mind实例或数据');
      return false;
    }
    
    // 防抖处理
    if (options.debounce !== false) {
      return this._debouncedRender(data, options);
    }
    
    return this._performRender(data, options);
  }
  
  /**
   * 防抖渲染
   */
  _debouncedRender(data, options) {
    return new Promise((resolve) => {
      if (this._renderDebounceTimer) {
        clearTimeout(this._renderDebounceTimer);
      }
      
      this._renderDebounceTimer = setTimeout(async () => {
        const result = await this._performRender(data, options);
        resolve(result);
      }, this.config.renderDebounceMs);
    });
  }
  
  /**
   * 执行实际渲染
   */
  async _performRender(data, options = {}) {
    const startTime = performance.now();
    
    try {
      this.isRendering = true;
      this.stats.totalRenders++;
      
      // 数据验证
      if (!this._validateRenderData(data)) {
        throw new Error('渲染数据验证失败');
      }
      
      // 生成数据哈希，检查是否需要重新渲染
      const dataHash = this._generateDataHash(data);
      if (this.config.enableRenderCache && dataHash === this.lastRenderHash && !options.forceRender) {
        this.stats.cachedRenders++;
        this.logger.log('[MindmapRenderer] 使用缓存渲染结果');
        return true;
      }
      
      // 转换为jsMind格式
      const jmData = this._convertToJsMindFormat(data);
      
      // 数据安全检查
      if (!jmData || !jmData.data) {
        this.logger.error('[MindmapRenderer] jsMind数据格式错误', { original: data, converted: jmData });
        throw new Error('jsMind数据转换失败');
      }
      
      // 执行渲染
      this.mind.show(jmData);
      this.lastRenderHash = dataHash;
      
      // 后渲染处理
      await this._postRenderProcessing(data, options);
      
      // 触发渲染完成事件
      this._emitRenderEvent('rendered', { data, options });
      
      const renderTime = performance.now() - startTime;
      this.stats.renderTime += renderTime;
      this.stats.lastRenderTimestamp = Date.now();
      
      this.logger.log(`[MindmapRenderer] 渲染完成，耗时: ${renderTime.toFixed(2)}ms`);
      return true;
      
    } catch (error) {
      this.logger.error('[MindmapRenderer] 渲染失败:', error);
      this._emitRenderEvent('render-error', { error, data, options });
      return false;
    } finally {
      this.isRendering = false;
    }
  }
  
  /**
   * 后渲染处理
   */
  async _postRenderProcessing(data, options) {
    // 应用默认节点颜色
    if (options.applyDefaultColors !== false) {
      await this.applyDefaultNodeColor();
    }
    
    // 启用拖拽
    if (options.enableDrag !== false) {
      this._ensureDragEnabled();
    }
    
    // 自动适配
    if (options.autoFit !== false && this.config.autoFitEnabled) {
      this.scheduleAutoFit();
    }
    
    // 选中节点
    if (options.selectedNodeId) {
      this.selectNode(options.selectedNodeId);
    }
  }
  
  /**
   * 数据验证
   */
  _validateRenderData(data) {
    if (!data || typeof data !== 'object') {
      this.logger.warn('[MindmapRenderer] 数据验证失败: 数据为空或非对象', data);
      return false;
    }
    
    // 增强的标题字段检查，防止undefined.name错误
    const titleFields = [data.topic, data.label, data.name, data.title];
    const hasValidTitle = titleFields.some(field => field && typeof field === 'string' && field.trim().length > 0);
    
    if (!hasValidTitle) {
      this.logger.warn('[MindmapRenderer] 数据验证失败: 缺少有效标题字段', {
        data: data,
        titleFields: titleFields,
        availableKeys: Object.keys(data)
      });
      return false;
    }
    
    return true;
  }
  
  /**
   * 生成数据哈希用于缓存比较
   */
  _generateDataHash(data) {
    try {
      const str = JSON.stringify(data, Object.keys(data).sort());
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      return hash.toString();
    } catch (error) {
      return Math.random().toString();
    }
  }
  
  /**
   * 转换为jsMind格式
   */
  _convertToJsMindFormat(data) {
    return {
      format: 'node_tree',
      data: this._toJsMindTree(data)
    };
  }
  
  /**
   * 递归转换为jsMind树结构
   */
  _toJsMindTree(node) {
    // 增强的安全检查
    if (!node || typeof node !== 'object') {
      console.warn('[MindmapRenderer] 节点为空或无效，使用默认节点', node);
      return {
        id: 'default_' + Date.now(),
        topic: '默认节点',
        expanded: true
      };
    }
    
    // 安全获取标题，防止undefined.name错误
    let topic = '未命名节点';
    const titleCandidates = [node.topic, node.label, node.name, node.title];
    for (const candidate of titleCandidates) {
      if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
        topic = candidate.trim();
        break;
      }
    }
    
    const result = {
      id: node.id || 'node_' + Date.now(),
      topic: topic,
      expanded: node.expanded !== false
    };
    
    // 添加样式信息
    if (node.backgroundColor || node['background-color']) {
      result['background-color'] = node.backgroundColor || node['background-color'];
    }
    if (node.foregroundColor || node['foreground-color']) {
      result['foreground-color'] = node.foregroundColor || node['foreground-color'];
    }
    
    // 递归处理子节点
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      result.children = node.children
        .filter(child => child) // 过滤空子节点
        .map(child => this._toJsMindTree(child));
    }
    
    return result;
  }
  
  /**
   * 应用默认节点颜色
   */
  async applyDefaultNodeColor(backgroundColor, foregroundColor) {
    const bgColor = backgroundColor || this.config.defaultNodeColor.background;
    const fgColor = foregroundColor || this.config.defaultNodeColor.foreground;
    
    // 防抖处理
    return new Promise((resolve) => {
      if (this._colorDebounceTimer) {
        clearTimeout(this._colorDebounceTimer);
      }
      
      this._colorDebounceTimer = setTimeout(() => {
        this._applyNodeColors(bgColor, fgColor);
        resolve();
      }, this.config.colorApplyDebounceMs);
    });
  }
  
  /**
   * 执行节点颜色应用
   */
  _applyNodeColors(backgroundColor, foregroundColor) {
    try {
      if (!this.mind) return;
      
      const allNodes = this.mind.get_data().data;
      this._applyColorsRecursive(allNodes, backgroundColor, foregroundColor);
      
      this.logger.log('[MindmapRenderer] 默认节点颜色应用完成');
    } catch (error) {
      this.logger.error('[MindmapRenderer] 节点颜色应用失败:', error);
    }
  }
  
  /**
   * 递归应用颜色
   */
  _applyColorsRecursive(node, backgroundColor, foregroundColor) {
    if (!node) return;
    
    // 只为未设置颜色的节点设置默认颜色
    const jmNode = this.mind.get_node(node.id);
    if (jmNode) {
      if (!jmNode.data['background-color']) {
        this.mind.set_node_color(node.id, backgroundColor, foregroundColor);
      }
    }
    
    // 递归处理子节点
    if (node.children) {
      node.children.forEach(child => {
        this._applyColorsRecursive(child, backgroundColor, foregroundColor);
      });
    }
  }
  
  /**
   * 选中节点
   */
  selectNode(nodeId) {
    try {
      if (!this.mind || !nodeId) return false;
      
      const node = this.mind.get_node(nodeId);
      if (!node) {
        this.logger.warn(`[MindmapRenderer] 节点不存在: ${nodeId}`);
        return false;
      }
      
      this.mind.select_node(nodeId);
      this.logger.log(`[MindmapRenderer] 节点已选中: ${nodeId}`);
      return true;
    } catch (error) {
      this.logger.error('[MindmapRenderer] 选中节点失败:', error);
      return false;
    }
  }
  
  /**
   * 居中显示节点
   */
  centerNode(nodeId) {
    try {
      if (!this.mind || !nodeId) return false;
      
      const node = this.mind.get_node(nodeId);
      if (!node) return false;
      
      this.mind.center_node(nodeId);
      this.logger.log(`[MindmapRenderer] 节点已居中: ${nodeId}`);
      return true;
    } catch (error) {
      this.logger.error('[MindmapRenderer] 居中节点失败:', error);
      return false;
    }
  }
  
  /**
   * 自动适配脑图大小
   */
  scheduleAutoFit() {
    if (this._autoFitTimer) {
      clearTimeout(this._autoFitTimer);
    }
    
    this._autoFitTimer = setTimeout(() => {
      this._performAutoFit();
    }, this.config.autoFitDelayMs);
  }
  
  /**
   * 执行自动适配
   */
  _performAutoFit() {
    try {
      // 检查mind实例是否存在
      if (!this.mind) {
        this.logger.warn('[MindmapRenderer] Mind实例未设置，跳过自动适配');
        return;
      }
      
      // 检查center_node方法是否存在
      if (typeof this.mind.center_node !== 'function') {
        this.logger.warn('[MindmapRenderer] center_node方法不存在，跳过自动适配');
        return;
      }
      
      // 获取根节点并居中
      const root = this.mind.get_root();
      if (root) {
        this.mind.center_node(root.id);
        this.logger.log('[MindmapRenderer] 自动适配完成');
      }
    } catch (error) {
      this.logger.error('[MindmapRenderer] 自动适配失败:', error);
    }
  }
  
  /**
   * 确保拖拽已启用
   */
  _ensureDragEnabled() {
    try {
      if (!this.mind) return;
      
      // jsMind 0.8.7 的拖拽功能会自动启用
      this.logger.log('[MindmapRenderer] 拖拽功能已确保启用');
    } catch (error) {
      this.logger.error('[MindmapRenderer] 拖拽启用失败:', error);
    }
  }
  
  /**
   * 清除渲染缓存
   */
  clearRenderCache() {
    this.styleCache.clear();
    this.lastRenderHash = null;
    this.logger.log('[MindmapRenderer] 渲染缓存已清除');
  }
  
  /**
   * 获取渲染统计信息
   */
  getRenderStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.totalRenders > 0 ? 
        (this.stats.cachedRenders / this.stats.totalRenders * 100).toFixed(2) + '%' : '0%',
      averageRenderTime: this.stats.totalRenders > 0 ? 
        (this.stats.renderTime / this.stats.totalRenders).toFixed(2) + 'ms' : '0ms'
    };
  }
  
  /**
   * 触发渲染事件
   */
  _emitRenderEvent(eventName, data) {
    try {
      if (this.eventBus && typeof this.eventBus.emit === 'function') {
        this.eventBus.emit(`mindmap-renderer:${eventName}`, data);
      } else if (typeof AutogenEventBus !== 'undefined') {
        AutogenEventBus.emit(`mindmap-renderer:${eventName}`, data);
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(`mindmap-renderer:${eventName}`, { detail: data }));
      }
    } catch (error) {
      this.logger.warn('[MindmapRenderer] 事件触发失败:', error);
    }
  }
  
  /**
   * 销毁渲染器
   */
  destroy() {
    // 清除定时器
    if (this._renderDebounceTimer) clearTimeout(this._renderDebounceTimer);
    if (this._colorDebounceTimer) clearTimeout(this._colorDebounceTimer);
    if (this._autoFitTimer) clearTimeout(this._autoFitTimer);
    
    // 清除缓存
    this.clearRenderCache();
    
    // 重置状态
    this.mind = null;
    this.eventBus = null;
    this.isRendering = false;
    this.renderQueue = [];
    
    this.logger.log('[MindmapRenderer] 渲染器已销毁');
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MindmapRenderer;
} else if (typeof window !== 'undefined') {
  window.MindmapRenderer = MindmapRenderer;
}
