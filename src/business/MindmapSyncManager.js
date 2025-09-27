/**
 * 程序员 MindmapSyncManager.js - 数据同步业务模块
 * 
 * Phase 3: 业务逻辑层拆分 - 数据同步模块
 * 
 * 职责范围：
 * - 本地存储同步
 * - JSON底座同步
 * - 数据加载与保存
 * - 快照管理
 * - 数据一致性保证
 * 
 * 技术特点：
 * - 多存储源支持：AutogenUnifiedStorage + JSON底座
 * - 防抖同步：避免频繁IO操作
 * - 增量同步：只同步变更数据
 * - 错误恢复：同步失败时的回退机制
 * - 性能优化：数据哈希比较、批量操作
 */

class MindmapSyncManager {
  constructor(options = {}) {
    // 依赖注入
    this.mind = options.mind;
    this.dataManager = options.dataManager;
    this.autogenStorage = options.autogenStorage || window.AutogenUnifiedStorage;
    this.eventBus = options.eventBus || window.AutogenEventBus;
    this.logger = options.logger || console;
    
    // 配置参数
    this.config = {
      // 同步防抖时间
      syncDebounceMs: 2000,
      // JSON底座同步防抖时间
      jsonBaseSyncDebounceMs: 5000,
      // 快照间隔时间
      snapshotIntervalMs: 10 * 60 * 1000, // 10分钟
      // 最大快照数量
      maxSnapshots: 5,
      // 数据哈希算法
      hashAlgorithm: 'simple',
      // 是否启用JSON底座同步
      enableJsonBaseSync: true,
      // 是否启用自动快照
      enableAutoSnapshot: true,
      // JSON底座API端点
      jsonBaseApiUrl: 'http://localhost:5001/api',
      ...options.config
    };
    
    // 内部状态
    this.state = {
      isLoading: false,
      isSaving: false,
      isSyncing: false,
      lastSyncTime: null,
      lastSnapshotTime: null,
      dataHash: null,
      syncErrors: [],
      pendingOperations: []
    };
    
    // 存储键管理
    this.storageKeys = {
      mainData: 'mindmap_data_v1',
      fullCache: '__mind_full_cache_v1',
      snapshots: '__mind_snapshots_v1',
      syncState: '__mind_sync_state_v1'
    };
    
    // 防抖定时器
    this._syncTimer = null;
    this._jsonBaseSyncTimer = null;
    this._snapshotTimer = null;
    
    // 同步统计
    this.stats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalSnapshots: 0,
      dataLoads: 0,
      dataSaves: 0,
      jsonBaseSyncs: 0,
      averageSyncTime: 0
    };
    
    // 启动自动快照
    if (this.config.enableAutoSnapshot) {
      this._startAutoSnapshot();
    }
    
    this.logger.log('[MindmapSyncManager] 数据同步管理器初始化完成');
  }
  
  /**
   * 设置依赖（用于延迟注入）
   */
  setDependencies(mind, dataManager, autogenStorage) {
    this.mind = mind;
    this.dataManager = dataManager;
    this.autogenStorage = autogenStorage || this.autogenStorage;
    this.logger.log('[MindmapSyncManager] 依赖设置完成');
  }
  
  /**
   * 异步加载初始数据
   */
  async loadInitialData() {
    if (this.state.isLoading) {
      this.logger.warn('[MindmapSyncManager] 数据加载已在进行中');
      return null;
    }
    
    this.state.isLoading = true;
    const startTime = performance.now();
    
    try {
      this.logger.log('[MindmapSyncManager] 开始加载初始数据...');
      
      // 尝试多种数据源加载
      let loadedData = null;
      
      // 1. 尝试从专用存储键加载
      loadedData = await this._loadFromPerMindStorage();
      if (loadedData) {
        this.logger.log('[MindmapSyncManager] 从专用存储加载成功');
      }
      
      // 2. 回退到主存储键
      if (!loadedData) {
        loadedData = await this._loadFromMainStorage();
        if (loadedData) {
          this.logger.log('[MindmapSyncManager] 从主存储加载成功');
        }
      }
      
      // 3. 回退到全图缓存
      if (!loadedData) {
        loadedData = await this._loadFromFullCache();
        if (loadedData) {
          this.logger.log('[MindmapSyncManager] 从全图缓存加载成功');
        }
      }
      
      // 4. 最后尝试从快照恢复
      if (!loadedData) {
        loadedData = await this._loadFromLatestSnapshot();
        if (loadedData) {
          this.logger.log('[MindmapSyncManager] 从快照恢复成功');
        }
      }
      
      // 更新数据哈希
      if (loadedData) {
        this.state.dataHash = this._calculateDataHash(loadedData);
      }
      
      const duration = performance.now() - startTime;
      this.stats.dataLoads++;
      this.logger.log(`[MindmapSyncManager] 数据加载完成 (${duration.toFixed(2)}ms)`);
      
      // 触发事件
      this._emitEvent('sync:dataLoaded', {
        data: loadedData,
        source: loadedData ? 'storage' : 'none',
        duration: duration
      });
      
      return loadedData;
    } catch (error) {
      this.logger.error('[MindmapSyncManager] 数据加载失败:', error);
      this._recordSyncError('load', error);
      return null;
    } finally {
      this.state.isLoading = false;
    }
  }
  
  /**
   * 保存脑图数据到存储
   */
  async saveMindmapToStorage(data = null, options = {}) {
    // 防抖保存
    return new Promise((resolve, reject) => {
      clearTimeout(this._syncTimer);
      this._syncTimer = setTimeout(async () => {
        try {
          const result = await this._performSave(data, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, this.config.syncDebounceMs);
    });
  }
  
  /**
   * 执行实际保存操作
   */
  async _performSave(data = null, options = {}) {
    if (this.state.isSaving) {
      this.logger.warn('[MindmapSyncManager] 保存操作已在进行中');
      return false;
    }
    
    this.state.isSaving = true;
    const startTime = performance.now();
    
    try {
      // 获取要保存的数据
      const saveData = data || this._getCurrentMindData();
      if (!saveData) {
        throw new Error('没有可保存的数据');
      }
      
      // 检查数据是否有变化
      const newHash = this._calculateDataHash(saveData);
      if (this.state.dataHash === newHash && !options.force) {
        this.logger.log('[MindmapSyncManager] 数据无变化，跳过保存');
        return true;
      }
      
      this.logger.log('[MindmapSyncManager] 开始保存数据...');
      
      // 保存到AutogenUnifiedStorage
      await this._saveToUnifiedStorage(saveData);
      
      // 保存到全图缓存
      await this._saveToFullCache(saveData);
      
      // 更新数据哈希
      this.state.dataHash = newHash;
      this.state.lastSyncTime = Date.now();
      
      // 触发JSON底座同步
      if (this.config.enableJsonBaseSync) {
        this._scheduleJsonBaseSync(saveData);
      }
      
      const duration = performance.now() - startTime;
      this.stats.dataSaves++;
      this.stats.totalSyncs++;
      this.stats.successfulSyncs++;
      this._updateAverageSyncTime(duration);
      
      this.logger.log(`[MindmapSyncManager] 数据保存完成 (${duration.toFixed(2)}ms)`);
      
      // 触发事件
      this._emitEvent('sync:dataSaved', {
        data: saveData,
        duration: duration,
        hash: newHash
      });
      
      return true;
    } catch (error) {
      this.logger.error('[MindmapSyncManager] 数据保存失败:', error);
      this.stats.failedSyncs++;
      this._recordSyncError('save', error);
      throw error;
    } finally {
      this.state.isSaving = false;
    }
  }
  
  /**
   * 同步到JSON底座
   */
  async syncToJsonBase(data = null, options = {}) {
    if (!this.config.enableJsonBaseSync) {
      this.logger.log('[MindmapSyncManager] JSON底座同步已禁用');
      return false;
    }
    
    // 防抖同步
    return new Promise((resolve, reject) => {
      clearTimeout(this._jsonBaseSyncTimer);
      this._jsonBaseSyncTimer = setTimeout(async () => {
        try {
          const result = await this._performJsonBaseSync(data, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, this.config.jsonBaseSyncDebounceMs);
    });
  }
  
  /**
   * 执行JSON底座同步
   */
  async _performJsonBaseSync(data = null, options = {}) {
    if (this.state.isSyncing) {
      this.logger.warn('[MindmapSyncManager] JSON底座同步已在进行中');
      return false;
    }
    
    this.state.isSyncing = true;
    const startTime = performance.now();
    
    try {
      const syncData = data || this._getCurrentMindData();
      if (!syncData) {
        throw new Error('没有可同步的数据');
      }
      
      this.logger.log('[MindmapSyncManager] 开始JSON底座同步...');
      
      // 构建同步请求
      const syncRequest = {
        mindmap: {
          id: this._getMindmapId(syncData),
          title: this._getMindmapTitle(syncData),
          data: syncData,
          lastModified: new Date().toISOString(),
          hash: this._calculateDataHash(syncData)
        },
        sync_mode: options.mode || 'incremental'
      };
      
      // 发送同步请求
      const response = await fetch(`${this.config.jsonBaseApiUrl}/sync-mindmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(syncRequest)
      });
      
      if (!response.ok) {
        throw new Error(`JSON底座同步失败: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      const duration = performance.now() - startTime;
      this.stats.jsonBaseSyncs++;
      
      this.logger.log(`[MindmapSyncManager] JSON底座同步完成 (${duration.toFixed(2)}ms)`);
      
      // 触发事件
      this._emitEvent('sync:jsonBaseSynced', {
        data: syncData,
        result: result,
        duration: duration
      });
      
      return true;
    } catch (error) {
      this.logger.error('[MindmapSyncManager] JSON底座同步失败:', error);
      this._recordSyncError('jsonBase', error);
      
      // 如果是网络错误，可以稍后重试
      if (error.message.includes('fetch')) {
        this.logger.log('[MindmapSyncManager] 网络错误，将稍后重试JSON底座同步');
        setTimeout(() => {
          this._performJsonBaseSync(data, options).catch(() => {
            // 静默处理重试失败
          });
        }, 30000); // 30秒后重试
      }
      
      return false;
    } finally {
      this.state.isSyncing = false;
    }
  }
  
  /**
   * 创建数据快照
   */
  async createSnapshot(data = null, label = null) {
    try {
      const snapshotData = data || this._getCurrentMindData();
      if (!snapshotData) {
        throw new Error('没有可快照的数据');
      }
      
      const snapshot = {
        id: `snapshot_${Date.now()}`,
        label: label || `自动快照 ${new Date().toLocaleString()}`,
        data: snapshotData,
        hash: this._calculateDataHash(snapshotData),
        timestamp: Date.now(),
        size: JSON.stringify(snapshotData).length
      };
      
      // 获取现有快照
      const snapshots = await this._getSnapshots();
      
      // 添加新快照
      snapshots.push(snapshot);
      
      // 限制快照数量
      if (snapshots.length > this.config.maxSnapshots) {
        snapshots.splice(0, snapshots.length - this.config.maxSnapshots);
      }
      
      // 保存快照
      await this.autogenStorage.store('mindmap', this.storageKeys.snapshots, snapshots);
      
      this.state.lastSnapshotTime = Date.now();
      this.stats.totalSnapshots++;
      
      this.logger.log(`[MindmapSyncManager] 快照创建成功: ${snapshot.id}`);
      
      // 触发事件
      this._emitEvent('sync:snapshotCreated', {
        snapshot: snapshot,
        totalSnapshots: snapshots.length
      });
      
      return snapshot;
    } catch (error) {
      this.logger.error('[MindmapSyncManager] 快照创建失败:', error);
      throw error;
    }
  }
  
  /**
   * 从快照恢复数据
   */
  async restoreFromSnapshot(snapshotId) {
    try {
      const snapshots = await this._getSnapshots();
      const snapshot = snapshots.find(s => s.id === snapshotId);
      
      if (!snapshot) {
        throw new Error(`快照不存在: ${snapshotId}`);
      }
      
      this.logger.log(`[MindmapSyncManager] 开始从快照恢复: ${snapshotId}`);
      
      // 恢复数据
      if (this.mind && snapshot.data) {
        this.mind.show(snapshot.data);
      }
      
      // 保存恢复的数据
      await this._performSave(snapshot.data, { force: true });
      
      this.logger.log(`[MindmapSyncManager] 快照恢复完成: ${snapshotId}`);
      
      // 触发事件
      this._emitEvent('sync:snapshotRestored', {
        snapshotId: snapshotId,
        snapshot: snapshot
      });
      
      return snapshot.data;
    } catch (error) {
      this.logger.error('[MindmapSyncManager] 快照恢复失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取同步状态
   */
  getSyncState() {
    return {
      isLoading: this.state.isLoading,
      isSaving: this.state.isSaving,
      isSyncing: this.state.isSyncing,
      lastSyncTime: this.state.lastSyncTime,
      lastSnapshotTime: this.state.lastSnapshotTime,
      dataHash: this.state.dataHash,
      hasErrors: this.state.syncErrors.length > 0,
      errorCount: this.state.syncErrors.length,
      stats: { ...this.stats }
    };
  }
  
  /**
   * 获取快照列表
   */
  async getSnapshots() {
    try {
      return await this._getSnapshots();
    } catch (error) {
      this.logger.error('[MindmapSyncManager] 获取快照列表失败:', error);
      return [];
    }
  }
  
  /**
   * 删除快照
   */
  async deleteSnapshot(snapshotId) {
    try {
      const snapshots = await this._getSnapshots();
      const index = snapshots.findIndex(s => s.id === snapshotId);
      
      if (index === -1) {
        throw new Error(`快照不存在: ${snapshotId}`);
      }
      
      snapshots.splice(index, 1);
      await this.autogenStorage.store('mindmap', this.storageKeys.snapshots, snapshots);
      
      this.logger.log(`[MindmapSyncManager] 快照删除成功: ${snapshotId}`);
      
      // 触发事件
      this._emitEvent('sync:snapshotDeleted', {
        snapshotId: snapshotId,
        remainingCount: snapshots.length
      });
      
      return true;
    } catch (error) {
      this.logger.error('[MindmapSyncManager] 快照删除失败:', error);
      throw error;
    }
  }
  
  /**
   * 清理资源
   */
  destroy() {
    // 清理定时器
    clearTimeout(this._syncTimer);
    clearTimeout(this._jsonBaseSyncTimer);
    clearTimeout(this._snapshotTimer);
    
    // 清理状态
    this.state.syncErrors = [];
    this.state.pendingOperations = [];
    
    this.logger.log('[MindmapSyncManager] 数据同步管理器已销毁');
  }
  
  // ==================== 私有方法 ====================
  
  /**
   * 从专用存储加载数据
   */
  async _loadFromPerMindStorage() {
    try {
      const mindKey = this._getMindKey();
      const storageKey = `${mindKey}:data`;
      return await this.autogenStorage.retrieve('mindmap', storageKey);
    } catch (error) {
      this.logger.warn('[MindmapSyncManager] 专用存储加载失败:', error);
      return null;
    }
  }
  
  /**
   * 从主存储加载数据
   */
  async _loadFromMainStorage() {
    try {
      return await this.autogenStorage.retrieve('mindmap', this.storageKeys.mainData);
    } catch (error) {
      this.logger.warn('[MindmapSyncManager] 主存储加载失败:', error);
      return null;
    }
  }
  
  /**
   * 从全图缓存加载数据
   */
  async _loadFromFullCache() {
    try {
      return await this.autogenStorage.retrieve('mindmap', this.storageKeys.fullCache);
    } catch (error) {
      this.logger.warn('[MindmapSyncManager] 全图缓存加载失败:', error);
      return null;
    }
  }
  
  /**
   * 从最新快照加载数据
   */
  async _loadFromLatestSnapshot() {
    try {
      const snapshots = await this._getSnapshots();
      if (snapshots.length === 0) return null;
      
      // 获取最新快照
      const latestSnapshot = snapshots[snapshots.length - 1];
      this.logger.log(`[MindmapSyncManager] 从最新快照加载: ${latestSnapshot.id}`);
      
      return latestSnapshot.data;
    } catch (error) {
      this.logger.warn('[MindmapSyncManager] 快照加载失败:', error);
      return null;
    }
  }
  
  /**
   * 保存到统一存储
   */
  async _saveToUnifiedStorage(data) {
    const mindKey = this._getMindKey();
    const storageKey = `${mindKey}:data`;
    
    await this.autogenStorage.store('mindmap', storageKey, data);
    await this.autogenStorage.store('mindmap', this.storageKeys.mainData, data);
  }
  
  /**
   * 保存到全图缓存
   */
  async _saveToFullCache(data) {
    await this.autogenStorage.store('mindmap', this.storageKeys.fullCache, data);
  }
  
  /**
   * 获取当前脑图数据
   */
  _getCurrentMindData() {
    if (!this.mind) return null;
    
    try {
      return this.mind.get_data('node_tree');
    } catch (error) {
      this.logger.warn('[MindmapSyncManager] 获取当前脑图数据失败:', error);
      return null;
    }
  }
  
  /**
   * 获取脑图键
   */
  _getMindKey() {
    // 简化版本，实际应该从数据中获取
    return 'default_mind';
  }
  
  /**
   * 获取脑图ID
   */
  _getMindmapId(data) {
    return data?.data?.id || 'default_mindmap';
  }
  
  /**
   * 获取脑图标题
   */
  _getMindmapTitle(data) {
    return data?.data?.topic || '未命名脑图';
  }
  
  /**
   * 计算数据哈希
   */
  _calculateDataHash(data) {
    if (!data) return null;
    
    try {
      const str = JSON.stringify(data, Object.keys(data).sort());
      
      if (this.config.hashAlgorithm === 'simple') {
        // 简单哈希算法
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // 转换为32位整数
        }
        return hash.toString(36);
      }
      
      // 默认使用长度和部分内容作为哈希
      return `${str.length}_${str.substring(0, 100)}`.replace(/[^a-zA-Z0-9]/g, '');
    } catch (error) {
      this.logger.warn('[MindmapSyncManager] 哈希计算失败:', error);
      return Date.now().toString();
    }
  }
  
  /**
   * 获取快照列表
   */
  async _getSnapshots() {
    try {
      const snapshots = await this.autogenStorage.retrieve('mindmap', this.storageKeys.snapshots);
      return Array.isArray(snapshots) ? snapshots : [];
    } catch (error) {
      this.logger.warn('[MindmapSyncManager] 获取快照失败:', error);
      return [];
    }
  }
  
  /**
   * 启动自动快照
   */
  _startAutoSnapshot() {
    const createAutoSnapshot = () => {
      this.createSnapshot(null, `自动快照 ${new Date().toLocaleString()}`).catch(error => {
        this.logger.warn('[MindmapSyncManager] 自动快照失败:', error);
      });
    };
    
    this._snapshotTimer = setInterval(createAutoSnapshot, this.config.snapshotIntervalMs);
    this.logger.log(`[MindmapSyncManager] 自动快照已启动，间隔: ${this.config.snapshotIntervalMs}ms`);
  }
  
  /**
   * 安排JSON底座同步
   */
  _scheduleJsonBaseSync(data) {
    this.syncToJsonBase(data).catch(error => {
      this.logger.warn('[MindmapSyncManager] JSON底座同步失败:', error);
    });
  }
  
  /**
   * 记录同步错误
   */
  _recordSyncError(operation, error) {
    const errorRecord = {
      operation: operation,
      error: error.message,
      timestamp: Date.now(),
      stack: error.stack
    };
    
    this.state.syncErrors.push(errorRecord);
    
    // 限制错误记录数量
    if (this.state.syncErrors.length > 50) {
      this.state.syncErrors.shift();
    }
  }
  
  /**
   * 更新平均同步时间
   */
  _updateAverageSyncTime(duration) {
    if (this.stats.successfulSyncs === 1) {
      this.stats.averageSyncTime = duration;
    } else {
      this.stats.averageSyncTime = (this.stats.averageSyncTime * (this.stats.successfulSyncs - 1) + duration) / this.stats.successfulSyncs;
    }
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
  module.exports = MindmapSyncManager;
} else if (typeof window !== 'undefined') {
  window.MindmapSyncManager = MindmapSyncManager;
}
