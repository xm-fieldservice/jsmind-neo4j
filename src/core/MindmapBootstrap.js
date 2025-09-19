/**
 * MindmapBootstrap.js - 脑图自包含启动器
 * 
 * 根治混乱机制：
 * 1. 零全局依赖 - 不依赖任何window.*全局变量
 * 2. 状态隔离 - 每个实例独立的状态空间
 * 3. 确定性初始化 - 可预测的启动流程
 * 4. 故障隔离 - 单点失败不影响整体
 */

class MindmapBootstrap {
  constructor(containerId = 'mindmap-container') {
    // 实例级状态，完全隔离
    this.state = {
      phase: 'INIT',           // INIT -> CONTAINER -> JSMIND -> DATA -> READY -> ERROR
      containerId,
      container: null,
      mind: null,
      data: null,
      error: null,
      startTime: Date.now()
    };
    
    // 配置项 - 可外部覆盖
    this.config = {
      timeout: 5000,           // 5秒超时
      retryInterval: 100,      // 100ms重试间隔
      maxRetries: 50,          // 最多50次重试
      storageKey: 'mindmap_data_v1'
    };
    
    // 事件回调
    this.callbacks = {
      onReady: null,
      onError: null,
      onProgress: null
    };
    
    // 绑定方法上下文
    this._bindMethods();
  }
  
  _bindMethods() {
    this.start = this.start.bind(this);
    this._checkContainer = this._checkContainer.bind(this);
    this._createMind = this._createMind.bind(this);
    this._loadData = this._loadData.bind(this);
    this._render = this._render.bind(this);
  }
  
  /**
   * 启动脑图 - 主入口
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} - 返回初始化结果
   */
  async start(options = {}) {
    try {
      // 合并配置
      Object.assign(this.config, options.config || {});
      Object.assign(this.callbacks, options.callbacks || {});
      
      console.log('[Bootstrap] 开始自包含初始化');
      this._updatePhase('CONTAINER');
      
      // 阶段1: 确保容器存在且可用
      await this._ensureContainer();
      
      // 阶段2: 创建jsMind实例
      this._updatePhase('JSMIND');
      await this._createMind();
      
      // 阶段3: 加载数据
      this._updatePhase('DATA');
      await this._loadData();
      
      // 阶段4: 渲染脑图
      this._updatePhase('RENDER');
      await this._render();
      
      // 完成
      this._updatePhase('READY');
      console.log('[Bootstrap] 初始化完成', {
        duration: Date.now() - this.state.startTime,
        phase: this.state.phase
      });
      
      if (this.callbacks.onReady) {
        this.callbacks.onReady({
          mind: this.state.mind,
          data: this.state.data,
          container: this.state.container
        });
      }
      
      return {
        success: true,
        mind: this.state.mind,
        data: this.state.data,
        duration: Date.now() - this.state.startTime
      };
      
    } catch (error) {
      this._updatePhase('ERROR', error);
      console.error('[Bootstrap] 初始化失败:', error);
      
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
      
      return {
        success: false,
        error: error.message,
        phase: this.state.phase,
        duration: Date.now() - this.state.startTime
      };
    }
  }
  
  /**
   * 确保容器存在且可用
   */
  async _ensureContainer() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const check = () => {
        attempts++;
        
        // 检查DOM元素
        const container = document.getElementById(this.state.containerId);
        if (!container) {
          if (attempts >= this.config.maxRetries) {
            reject(new Error(`容器 #${this.state.containerId} 不存在`));
            return;
          }
          setTimeout(check, this.config.retryInterval);
          return;
        }
        
        // 检查可见性
        const rect = container.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        if (!isVisible) {
          if (attempts >= this.config.maxRetries) {
            reject(new Error(`容器 #${this.state.containerId} 不可见`));
            return;
          }
          setTimeout(check, this.config.retryInterval);
          return;
        }
        
        // 容器就绪
        this.state.container = container;
        console.log('[Bootstrap] 容器就绪', {
          id: this.state.containerId,
          size: `${rect.width}x${rect.height}`,
          attempts
        });
        resolve();
      };
      
      check();
    });
  }
  
  /**
   * 创建jsMind实例
   */
  async _createMind() {
    return new Promise((resolve, reject) => {
      try {
        // 检查jsMind库
        if (typeof jsMind === 'undefined') {
          reject(new Error('jsMind库未加载'));
          return;
        }
        
        // 创建配置
        const options = {
          container: this.state.containerId,
          editable: true,
          draggable: true,
          theme: 'primary',
          support_html: false,
          mode: 'side'
        };
        
        // 创建实例
        this.state.mind = new jsMind(options);
        
        if (!this.state.mind) {
          reject(new Error('jsMind实例创建失败'));
          return;
        }
        
        console.log('[Bootstrap] jsMind实例创建成功');
        resolve();
        
      } catch (error) {
        reject(new Error(`jsMind创建失败: ${error.message}`));
      }
    });
  }
  
  /**
   * 加载数据
   */
  async _loadData() {
    return new Promise((resolve) => {
      try {
        // 尝试从localStorage加载
        const raw = localStorage.getItem(this.config.storageKey);
        
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && saved.format === 'node_tree' && saved.data) {
            this.state.data = saved;
            console.log('[Bootstrap] 从存储加载数据成功');
            resolve();
            return;
          }
        }
        
        // 使用默认数据
        this.state.data = this._getDefaultData();
        console.log('[Bootstrap] 使用默认数据');
        resolve();
        
      } catch (error) {
        console.warn('[Bootstrap] 数据加载失败，使用默认数据:', error);
        this.state.data = this._getDefaultData();
        resolve();
      }
    });
  }
  
  /**
   * 渲染脑图
   */
  async _render() {
    return new Promise((resolve, reject) => {
      try {
        if (!this.state.mind || !this.state.data) {
          reject(new Error('mind或data未就绪'));
          return;
        }
        
        // 渲染
        this.state.mind.show(this.state.data);
        
        // 验证渲染结果
        setTimeout(() => {
          const nodes = this.state.container.querySelectorAll('.jmnode');
          if (nodes.length === 0) {
            reject(new Error('渲染验证失败：无节点'));
            return;
          }
          
          console.log('[Bootstrap] 渲染成功', { nodeCount: nodes.length });
          resolve();
        }, 50);
        
      } catch (error) {
        reject(new Error(`渲染失败: ${error.message}`));
      }
    });
  }
  
  /**
   * 获取默认数据
   */
  _getDefaultData() {
    const uid = `root-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    return {
      meta: { name: 'Project Mindmap', author: 'bootstrap', version: '1.0' },
      format: 'node_tree',
      data: {
        id: uid,
        topic: '项目脑图',
        children: [
          { id: 'n1', topic: '需求', children: [] },
          { id: 'n2', topic: '设计', children: [] },
          { id: 'n3', topic: '开发', children: [] }
        ]
      }
    };
  }
  
  /**
   * 更新阶段状态
   */
  _updatePhase(phase, error = null) {
    this.state.phase = phase;
    this.state.error = error;
    
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress({
        phase,
        error,
        duration: Date.now() - this.state.startTime
      });
    }
  }
  
  /**
   * 获取当前状态
   */
  getState() {
    return { ...this.state };
  }
  
  /**
   * 重置状态
   */
  reset() {
    this.state = {
      phase: 'INIT',
      containerId: this.state.containerId,
      container: null,
      mind: null,
      data: null,
      error: null,
      startTime: Date.now()
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MindmapBootstrap;
} else if (typeof window !== 'undefined') {
  window.MindmapBootstrap = MindmapBootstrap;
}
