/**
 * 简化持久化服务 - 两个独立功能
 * 1. localStorage持久化（页面连续性）
 * 2. MD文档持久化（数据源基础）
 */
(function(){
  'use strict';

  class SimplePersistence {
    constructor() {
      this.localStorageKey = 'mindmap_data_v2';
      this.backupKey = 'mindmap_data_backup_v2';
      this.snapshotPrefix = 'mindmap_snapshot_';
      this.maxSnapshots = 10; // 最多保留10个快照
      
      console.log('[SimplePersistence] 初始化简化持久化服务');
    }

    /**
     * 功能1：localStorage持久化
     * 目的：页面刷新/切换时的数据恢复
     */
    saveToLocalStorage(mindmapData) {
      try {
        const payload = {
          format: 'node_tree',
          data: mindmapData,
          timestamp: Date.now(),
          version: '2.0'
        };
        
        const jsonStr = JSON.stringify(payload);
        
        // 主存储
        localStorage.setItem(this.localStorageKey, jsonStr);
        // 备份存储
        localStorage.setItem(this.backupKey, jsonStr);
        
        console.log('[SimplePersistence] localStorage保存成功');
        return true;
      } catch (error) {
        console.error('[SimplePersistence] localStorage保存失败:', error);
        return false;
      }
    }

    /**
     * 从localStorage加载
     */
    loadFromLocalStorage() {
      try {
        // 优先读取主键
        let data = localStorage.getItem(this.localStorageKey);
        if (!data) {
          // 回退到备份键
          data = localStorage.getItem(this.backupKey);
        }
        
        if (data) {
          const payload = JSON.parse(data);
          console.log('[SimplePersistence] localStorage加载成功');
          return payload.data;
        }
        
        return null;
      } catch (error) {
        console.error('[SimplePersistence] localStorage加载失败:', error);
        return null;
      }
    }

    /**
     * localStorage快照备份
     */
    createLocalStorageSnapshot() {
      try {
        const data = localStorage.getItem(this.localStorageKey);
        if (!data) return false;
        
        const timestamp = Date.now();
        const snapshotKey = this.snapshotPrefix + timestamp;
        
        localStorage.setItem(snapshotKey, data);
        
        // 清理旧快照
        this.cleanupOldSnapshots();
        
        console.log('[SimplePersistence] localStorage快照创建成功:', snapshotKey);
        return true;
      } catch (error) {
        console.error('[SimplePersistence] localStorage快照创建失败:', error);
        return false;
      }
    }

    /**
     * 清理旧快照
     */
    cleanupOldSnapshots() {
      try {
        const snapshots = [];
        
        // 收集所有快照
        for (let key in localStorage) {
          if (key.startsWith(this.snapshotPrefix)) {
            const timestamp = parseInt(key.replace(this.snapshotPrefix, ''));
            if (!isNaN(timestamp)) {
              snapshots.push({ key, timestamp });
            }
          }
        }
        
        // 按时间排序，保留最新的
        snapshots.sort((a, b) => b.timestamp - a.timestamp);
        
        // 删除超出限制的快照
        if (snapshots.length > this.maxSnapshots) {
          const toDelete = snapshots.slice(this.maxSnapshots);
          toDelete.forEach(snapshot => {
            localStorage.removeItem(snapshot.key);
            console.log('[SimplePersistence] 清理旧快照:', snapshot.key);
          });
        }
      } catch (error) {
        console.warn('[SimplePersistence] 清理快照失败:', error);
      }
    }

    /**
     * 功能2：MD文档持久化
     * 目的：本地MD文档与脑图同步，作为数据源基础
     */
    async saveToMDDocument(mindmapData) {
      try {
        // 构造项目数据
        const projectData = {
          id: mindmapData.id || 'default',
          name: mindmapData.label || mindmapData.topic || '未命名项目',
          payload: {
            format: 'node_tree',
            data: mindmapData
          },
          updatedAt: Date.now()
        };

        // 调用MD底座管理器
        if (window.MDBaseManager) {
          const success = await window.MDBaseManager.writeMindmapToMD(projectData);
          if (success) {
            console.log('[SimplePersistence] MD文档保存成功');
            return true;
          }
        }

        // 如果MD管理器不可用，尝试直接服务器保存
        return await this.saveToServerDirect(projectData);
        
      } catch (error) {
        console.error('[SimplePersistence] MD文档保存失败:', error);
        return false;
      }
    }

    /**
     * 直接服务器保存（备用方案）
     */
    async saveToServerDirect(projectData) {
      try {
        const response = await fetch('http://127.0.0.1:8081/api/md-base/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });
        
        if (response.ok) {
          console.log('[SimplePersistence] 直接服务器保存成功');
          return true;
        }
      } catch (error) {
        console.warn('[SimplePersistence] 服务器保存失败:', error.message);
      }
      
      return false;
    }

    /**
     * 统一保存接口：同时保存到localStorage和MD文档
     */
    async saveAll(mindmapData) {
      const results = {
        localStorage: false,
        mdDocument: false
      };

      // 功能1：localStorage持久化（同步）
      results.localStorage = this.saveToLocalStorage(mindmapData);

      // 功能2：MD文档持久化（异步）
      results.mdDocument = await this.saveToMDDocument(mindmapData);

      console.log('[SimplePersistence] 统一保存结果:', results);
      return results;
    }

    /**
     * 定时快照（可选功能）
     */
    startAutoSnapshot(intervalMinutes = 10) {
      setInterval(() => {
        this.createLocalStorageSnapshot();
      }, intervalMinutes * 60 * 1000);
      
      console.log(`[SimplePersistence] 自动快照已启动，间隔${intervalMinutes}分钟`);
    }

    /**
     * 获取快照列表
     */
    getSnapshots() {
      const snapshots = [];
      
      for (let key in localStorage) {
        if (key.startsWith(this.snapshotPrefix)) {
          const timestamp = parseInt(key.replace(this.snapshotPrefix, ''));
          if (!isNaN(timestamp)) {
            snapshots.push({
              key,
              timestamp,
              date: new Date(timestamp).toLocaleString()
            });
          }
        }
      }
      
      return snapshots.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * 从快照恢复
     */
    restoreFromSnapshot(snapshotKey) {
      try {
        const data = localStorage.getItem(snapshotKey);
        if (data) {
          localStorage.setItem(this.localStorageKey, data);
          console.log('[SimplePersistence] 从快照恢复成功:', snapshotKey);
          return JSON.parse(data);
        }
      } catch (error) {
        console.error('[SimplePersistence] 快照恢复失败:', error);
      }
      
      return null;
    }
  }

  // 创建全局实例
  window.SimplePersistence = new SimplePersistence();
  
  // 启动自动快照（10分钟间隔）
  window.SimplePersistence.startAutoSnapshot(10);

  console.log('[SimplePersistence] 简化持久化服务已就绪');

})();
