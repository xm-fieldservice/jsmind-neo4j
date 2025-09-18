/**
 * 智能localStorage管理器
 * 特性：配额监控、先进先出、优先级管理、自动清理
 */
(function(){
  'use strict';

  class SmartLocalStorage {
    constructor(options = {}) {
      this.maxQuotaPercentage = options.maxQuotaPercentage || 80; // 最大使用80%配额
      this.cleanupThreshold = options.cleanupThreshold || 90; // 90%时触发清理
      this.minFreeSpace = options.minFreeSpace || 1024 * 1024; // 最少保留1MB空间
      
      // 数据优先级配置
      this.priorities = {
        CRITICAL: 1,    // 关键数据（当前脑图）
        HIGH: 2,        // 重要数据（备份、快照）
        MEDIUM: 3,      // 一般数据（历史版本）
        LOW: 4,         // 缓存数据（MD备份、临时数据）
        DISPOSABLE: 5   // 可丢弃数据（隔离数据、测试数据）
      };
      
      // 数据分类规则
      this.dataClassification = {
        'mindmap_data_v1': this.priorities.CRITICAL,
        'mindmap_data_backup_v1': this.priorities.HIGH,
        '__mind_full_cache_v1': this.priorities.MEDIUM,
        'md_base_backup': this.priorities.LOW,
        'md_base_offline_storage': this.priorities.LOW,
        'md_quarantine_': this.priorities.DISPOSABLE, // 前缀匹配
        'test_': this.priorities.DISPOSABLE
      };
      
      this.accessLog = this.loadAccessLog();
      // 读取已缓存的总配额估算值（避免页面加载时进行重写测试）
      try {
        this.cachedTotalQuota = parseInt(localStorage.getItem('__smart_total_quota__') || '0', 10) || 0;
      } catch(_) {
        this.cachedTotalQuota = 0;
      }
      this.init();
    }

    init() {
      console.log('[SmartStorage] 初始化智能localStorage管理器');
      // 轻量初始化检查（不进行写入探测）
      this.checkAndCleanup();
      // 页面稳定后再异步估算配额，以避免阻塞UI线程
      setTimeout(() => {
        try { this.estimateQuotaAsync(); } catch(_) {}
      }, 3000);
      this.startPeriodicMaintenance();
    }

    /**
     * 获取localStorage配额信息
     */
    getQuotaInfo() {
      try {
        // 仅进行轻量统计：计算当前使用量；总配额优先采用缓存值，否则假定为 5MB
        let currentUsage = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            currentUsage += localStorage[key].length * 2; // UTF-16编码
          }
        }
        const fallbackTotal = 5 * 1024 * 1024; // 5MB 作为保守默认
        const totalQuota = this.cachedTotalQuota > 0 ? this.cachedTotalQuota : fallbackTotal;
        const remainingSpace = Math.max(0, totalQuota - currentUsage);
        return {
          totalQuota,
          currentUsage,
          remainingSpace,
          usagePercentage: totalQuota > 0 ? (currentUsage / totalQuota) * 100 : 100,
          isNearLimit: totalQuota > 0 ? ((currentUsage / totalQuota) > (this.cleanupThreshold / 100)) : true
        };
      } catch (error) {
        console.warn('[SmartStorage] 配额检测失败:', error);
        return {
          totalQuota: 5 * 1024 * 1024,
          currentUsage: 0,
          remainingSpace: 0,
          usagePercentage: 0,
          isNearLimit: false
        };
      }
    }

    /**
     * 异步估算总配额（渐进式，避免阻塞UI）
     */
    estimateQuotaAsync() {
      const testKey = '__quota_test__';
      const stepSize = 8 * 1024; // 每步8KB，足够细，避免长阻塞
      let testData = '';
      let totalWritten = 0;
      const maxSteps = 2048; // 上限约 16MB
      let steps = 0;
      const runStep = () => {
        try {
          testData += 'x'.repeat(stepSize);
          localStorage.setItem(testKey, testData);
          totalWritten += stepSize;
          steps++;
          if (steps < maxSteps) {
            // 分帧执行，减小卡顿
            setTimeout(runStep, 0);
          } else {
            finish();
          }
        } catch (_) {
          // 写入失败，说明到达上限
          finish();
        }
      };
      const finish = () => {
        try { localStorage.removeItem(testKey); } catch(_) {}
        const quota = totalWritten + this.getQuotaInfo().currentUsage;
        // 仅当估算值合理时更新缓存
        if (quota > 1024 * 1024) {
          try {
            localStorage.setItem('__smart_total_quota__', String(quota));
            this.cachedTotalQuota = quota;
            console.log('[SmartStorage] 已估算总配额:', (quota/1024/1024).toFixed(2), 'MB');
          } catch(_) {}
        }
      };
      // 异步启动
      setTimeout(runStep, 0);
    }

    /**
     * 智能存储：带配额检查和自动清理
     */
    setItem(key, value, priority = this.priorities.MEDIUM) {
      try {
        const data = typeof value === 'string' ? value : JSON.stringify(value);
        const dataSize = data.length * 2; // UTF-16字节数
        
        // 检查配额
        const quotaInfo = this.getQuotaInfo();
        const projectedUsage = quotaInfo.currentUsage + dataSize;
        const projectedPercentage = (projectedUsage / quotaInfo.totalQuota) * 100;
        
        // 如果预计超过阈值，先清理
        if (projectedPercentage > this.maxQuotaPercentage) {
          console.log(`[SmartStorage] 预计使用${projectedPercentage.toFixed(1)}%，触发预防性清理`);
          this.performCleanup(dataSize);
        }
        
        // 尝试存储
        localStorage.setItem(key, data);
        
        // 记录访问信息
        this.recordAccess(key, priority, dataSize);
        
        console.log(`[SmartStorage] 已存储 ${key}: ${(dataSize/1024).toFixed(2)} KB`);
        return true;
        
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          console.warn(`[SmartStorage] 配额不足，执行紧急清理`);
          
          // 紧急清理
          const freedSpace = this.performEmergencyCleanup();
          
          if (freedSpace > 0) {
            try {
              localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
              this.recordAccess(key, priority, data.length * 2);
              console.log(`[SmartStorage] 清理后成功存储 ${key}`);
              return true;
            } catch (e2) {
              console.error(`[SmartStorage] 清理后仍无法存储 ${key}:`, e2);
            }
          }
        }
        
        console.error(`[SmartStorage] 存储失败 ${key}:`, error);
        return false;
      }
    }

    /**
     * 获取数据项的优先级
     */
    getItemPriority(key) {
      // 精确匹配
      if (this.dataClassification[key]) {
        return this.dataClassification[key];
      }
      
      // 前缀匹配
      for (const prefix in this.dataClassification) {
        if (key.startsWith(prefix)) {
          return this.dataClassification[prefix];
        }
      }
      
      return this.priorities.MEDIUM; // 默认优先级
    }

    /**
     * 记录访问信息
     */
    recordAccess(key, priority, size) {
      this.accessLog[key] = {
        priority: priority || this.getItemPriority(key),
        size: size,
        lastAccess: Date.now(),
        accessCount: (this.accessLog[key]?.accessCount || 0) + 1,
        created: this.accessLog[key]?.created || Date.now()
      };
      
      this.saveAccessLog();
    }

    /**
     * 执行预防性清理
     */
    performCleanup(neededSpace = 0) {
      console.log(`[SmartStorage] 开始预防性清理，需要空间: ${(neededSpace/1024).toFixed(2)} KB`);
      
      const candidates = this.getCleanupCandidates();
      let freedSpace = 0;
      let cleanedItems = 0;
      
      // 按优先级和访问时间排序清理
      for (const candidate of candidates) {
        if (freedSpace >= neededSpace && cleanedItems >= 3) {
          break; // 已释放足够空间
        }
        
        try {
          localStorage.removeItem(candidate.key);
          freedSpace += candidate.size;
          cleanedItems++;
          delete this.accessLog[candidate.key];
          
          console.log(`[SmartStorage] 已清理 ${candidate.key}: ${(candidate.size/1024).toFixed(2)} KB (优先级: ${candidate.priority})`);
        } catch (error) {
          console.warn(`[SmartStorage] 清理失败 ${candidate.key}:`, error);
        }
      }
      
      this.saveAccessLog();
      console.log(`[SmartStorage] 预防性清理完成，释放空间: ${(freedSpace/1024).toFixed(2)} KB`);
      
      return freedSpace;
    }

    /**
     * 执行紧急清理
     */
    performEmergencyCleanup() {
      console.log(`[SmartStorage] 执行紧急清理`);
      
      const candidates = this.getCleanupCandidates();
      let freedSpace = 0;
      
      // 紧急清理：清理更多低优先级数据
      for (const candidate of candidates) {
        if (candidate.priority >= this.priorities.LOW) {
          try {
            localStorage.removeItem(candidate.key);
            freedSpace += candidate.size;
            delete this.accessLog[candidate.key];
            
            console.log(`[SmartStorage] 紧急清理 ${candidate.key}: ${(candidate.size/1024).toFixed(2)} KB`);
          } catch (error) {
            console.warn(`[SmartStorage] 紧急清理失败 ${candidate.key}:`, error);
          }
        }
        
        // 如果释放了足够空间就停止
        if (freedSpace > this.minFreeSpace) {
          break;
        }
      }
      
      this.saveAccessLog();
      console.log(`[SmartStorage] 紧急清理完成，释放空间: ${(freedSpace/1024).toFixed(2)} KB`);
      
      return freedSpace;
    }

    /**
     * 获取清理候选项（先进先出 + 优先级）
     */
    getCleanupCandidates() {
      const candidates = [];
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const logEntry = this.accessLog[key] || {};
          const priority = logEntry.priority || this.getItemPriority(key);
          const size = logEntry.size || localStorage[key].length * 2;
          const lastAccess = logEntry.lastAccess || 0;
          const created = logEntry.created || 0;
          
          candidates.push({
            key,
            priority,
            size,
            lastAccess,
            created,
            age: Date.now() - created,
            timeSinceAccess: Date.now() - lastAccess
          });
        }
      }
      
      // 排序规则：优先级高的排后面，时间久的排前面
      candidates.sort((a, b) => {
        // 首先按优先级排序（高优先级保护）
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // 优先级低的排前面
        }
        
        // 同优先级按最后访问时间排序（FIFO）
        return a.lastAccess - b.lastAccess;
      });
      
      return candidates;
    }

    /**
     * 加载访问日志
     */
    loadAccessLog() {
      try {
        const log = localStorage.getItem('__smart_storage_log__');
        return log ? JSON.parse(log) : {};
      } catch (error) {
        console.warn('[SmartStorage] 访问日志加载失败:', error);
        return {};
      }
    }

    /**
     * 保存访问日志
     */
    saveAccessLog() {
      try {
        localStorage.setItem('__smart_storage_log__', JSON.stringify(this.accessLog));
      } catch (error) {
        console.warn('[SmartStorage] 访问日志保存失败:', error);
      }
    }

    /**
     * 检查并清理
     */
    checkAndCleanup() {
      const quotaInfo = this.getQuotaInfo();
      
      console.log(`[SmartStorage] 配额检查: ${quotaInfo.usagePercentage.toFixed(1)}% (${(quotaInfo.currentUsage/1024/1024).toFixed(2)}MB / ${(quotaInfo.totalQuota/1024/1024).toFixed(2)}MB)`);
      
      if (quotaInfo.isNearLimit) {
        console.log(`[SmartStorage] 接近配额限制，执行维护清理`);
        this.performCleanup();
      }
    }

    /**
     * 启动定期维护
     */
    startPeriodicMaintenance() {
      // 每5分钟检查一次
      setInterval(() => {
        this.checkAndCleanup();
      }, 5 * 60 * 1000);
      
      console.log('[SmartStorage] 已启动定期维护（5分钟间隔）');
    }

    /**
     * 获取存储统计信息
     */
    getStats() {
      const quotaInfo = this.getQuotaInfo();
      const itemCount = Object.keys(localStorage).length;
      
      // 按优先级统计
      const priorityStats = {};
      let totalSize = 0;
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const priority = this.getItemPriority(key);
          const size = localStorage[key].length * 2;
          
          if (!priorityStats[priority]) {
            priorityStats[priority] = { count: 0, size: 0 };
          }
          
          priorityStats[priority].count++;
          priorityStats[priority].size += size;
          totalSize += size;
        }
      }
      
      return {
        quota: quotaInfo,
        itemCount,
        totalSize,
        priorityStats,
        accessLogSize: Object.keys(this.accessLog).length
      };
    }

    /**
     * 手动清理指定优先级的数据
     */
    cleanupByPriority(minPriority = this.priorities.LOW) {
      const candidates = this.getCleanupCandidates().filter(c => c.priority >= minPriority);
      let freedSpace = 0;
      
      candidates.forEach(candidate => {
        try {
          localStorage.removeItem(candidate.key);
          freedSpace += candidate.size;
          delete this.accessLog[candidate.key];
          console.log(`[SmartStorage] 手动清理 ${candidate.key}`);
        } catch (error) {
          console.warn(`[SmartStorage] 手动清理失败 ${candidate.key}:`, error);
        }
      });
      
      this.saveAccessLog();
      return freedSpace;
    }
  }

  // 创建全局实例
  window.SmartLocalStorage = new SmartLocalStorage({
    maxQuotaPercentage: 75,  // 最大使用75%
    cleanupThreshold: 85,    // 85%时触发清理
    minFreeSpace: 512 * 1024 // 最少保留512KB
  });

  // 提供便捷的API
  window.smartStorage = {
    set: (key, value, priority) => window.SmartLocalStorage.setItem(key, value, priority),
    get: (key) => {
      const value = localStorage.getItem(key);
      if (value) {
        window.SmartLocalStorage.recordAccess(key, null, value.length * 2);
      }
      return value;
    },
    remove: (key) => {
      localStorage.removeItem(key);
      delete window.SmartLocalStorage.accessLog[key];
    },
    stats: () => window.SmartLocalStorage.getStats(),
    cleanup: (priority) => window.SmartLocalStorage.cleanupByPriority(priority)
  };

  console.log('[SmartStorage] 智能localStorage管理器已就绪');

})();
