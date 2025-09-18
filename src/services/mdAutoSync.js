/**
 * MD底座自动同步服务
 * 负责在页面加载时自动同步现有数据到MD底座
 */
(function(){
  'use strict';

  class MDAutoSync {
    constructor() {
      this.syncKey = 'md_auto_sync_completed';
      this.lastSyncKey = 'md_last_sync_timestamp';
    }

    /**
     * 执行自动同步初始化
     */
    async performAutoSync() {
      try {
        console.log('[MD自动同步] 开始检查是否需要同步...');
        
        // 检查是否需要同步
        if (!this.shouldPerformSync()) {
          console.log('[MD自动同步] 跳过同步（已完成或不需要）');
          return { success: true, reason: 'skipped' };
        }

        // 等待必要组件加载
        await this.waitForComponents();

        // 获取现有数据
        const existingData = await this.collectExistingData();
        
        if (existingData.length === 0) {
          console.log('[MD自动同步] 未发现现有数据，标记同步完成');
          this.markSyncCompleted();
          return { success: true, reason: 'no_data' };
        }

        // 检查MD底座是否已有数据
        const mdStatus = window.MDBaseManager?.getStatus();
        if (mdStatus && mdStatus.projectCount > 0) {
          console.log('[MD自动同步] MD底座已有数据，跳过同步');
          this.markSyncCompleted();
          return { success: true, reason: 'md_has_data' };
        }

        // 执行同步
        console.log(`[MD自动同步] 开始同步 ${existingData.length} 个项目到MD底座...`);
        const syncResult = await this.syncDataToMD(existingData);

        // 标记完成
        this.markSyncCompleted();
        
        console.log(`[MD自动同步] ✅ 同步完成，成功: ${syncResult.success}，失败: ${syncResult.failed}`);
        return { 
          success: true, 
          synced: syncResult.success, 
          failed: syncResult.failed,
          total: existingData.length 
        };

      } catch (error) {
        console.error('[MD自动同步] 同步失败:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * 检查是否应该执行同步
     */
    shouldPerformSync() {
      // 检查是否已完成同步
      const syncCompleted = localStorage.getItem(this.syncKey);
      if (syncCompleted === 'true') {
        return false;
      }

      // 检查上次同步时间（避免频繁同步）
      const lastSync = localStorage.getItem(this.lastSyncKey);
      if (lastSync) {
        const timeSinceSync = Date.now() - parseInt(lastSync);
        const oneHour = 60 * 60 * 1000;
        if (timeSinceSync < oneHour) {
          return false;
        }
      }

      return true;
    }

    /**
     * 等待必要组件加载完成
     */
    async waitForComponents() {
      const maxWait = 10000; // 最多等待10秒
      const checkInterval = 100;
      let waited = 0;

      while (waited < maxWait) {
        if (window.MindmapStorage && window.MDBaseManager && window.MindmapMDParser) {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }

      throw new Error('等待组件加载超时');
    }

    /**
     * 收集现有数据
     */
    async collectExistingData() {
      const existingData = [];

      try {
        // 1. 从localStorage收集数据
        const localData = this.collectFromLocalStorage();
        existingData.push(...localData);

        // 2. 从IndexedDB收集数据（如果可用）
        if (window.MindmapStorage && typeof window.MindmapStorage.getStatus === 'function') {
          const status = await window.MindmapStorage.getStatus();
          if (status.nodes > 0) {
            console.log(`[MD自动同步] 发现IndexedDB中有 ${status.nodes} 个节点`);
          }
        }

        // 3. 去重处理
        const uniqueData = this.deduplicateData(existingData);
        
        console.log(`[MD自动同步] 收集到 ${uniqueData.length} 个唯一项目`);
        return uniqueData;

      } catch (error) {
        console.error('[MD自动同步] 收集数据失败:', error);
        return [];
      }
    }

    /**
     * 从localStorage收集数据
     */
    collectFromLocalStorage() {
      const data = [];
      const keys = ['mindmap_data_v1', 'mindmap_data_backup_v1', '__mind_full_cache_v1'];

      for (const key of keys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;

          const parsed = JSON.parse(raw);
          if (this.isValidMindmapData(parsed)) {
            // 生成项目ID
            const projectId = this.generateProjectId(parsed);
            
            const projectData = {
              project_id: projectId,
              name: this.extractProjectName(parsed),
              payload: parsed,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              accessCount: 1,
              source: key
            };

            data.push(projectData);
            console.log(`[MD自动同步] 从 ${key} 收集项目: ${projectData.name}`);
          }
        } catch (error) {
          console.warn(`[MD自动同步] 解析 ${key} 失败:`, error);
        }
      }

      return data;
    }

    /**
     * 验证是否为有效的脑图数据
     */
    isValidMindmapData(data) {
      return data && 
             typeof data === 'object' && 
             data.format === 'node_tree' && 
             data.data && 
             typeof data.data === 'object' &&
             data.data.id &&
             data.data.topic;
    }

    /**
     * 生成项目ID
     */
    generateProjectId(data) {
      if (data.meta && data.meta.mind_id) {
        return data.meta.mind_id;
      }
      
      if (data.data && data.data.id) {
        return `mind_${data.data.id}`;
      }

      // 基于内容生成哈希ID
      const content = JSON.stringify(data.data);
      const hash = this.simpleHash(content);
      return `mind_auto_${hash}`;
    }

    /**
     * 提取项目名称
     */
    extractProjectName(data) {
      if (data.data && data.data.topic) {
        return data.data.topic;
      }
      return '未命名项目';
    }

    /**
     * 简单哈希函数
     */
    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      return (hash >>> 0).toString(16);
    }

    /**
     * 去重处理
     */
    deduplicateData(data) {
      const seen = new Set();
      const unique = [];

      for (const item of data) {
        const key = item.project_id || item.name;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      return unique;
    }

    /**
     * 同步数据到MD底座
     */
    async syncDataToMD(dataList) {
      let success = 0;
      let failed = 0;

      for (const projectData of dataList) {
        try {
          const result = await window.MDBaseManager.writeMindmapToMD(projectData);
          if (result) {
            success++;
            console.log(`[MD自动同步] ✅ 同步成功: ${projectData.name}`);
          } else {
            failed++;
            console.warn(`[MD自动同步] ❌ 同步失败: ${projectData.name}`);
          }
        } catch (error) {
          failed++;
          console.error(`[MD自动同步] ❌ 同步异常: ${projectData.name}`, error);
        }

        // 避免阻塞UI
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      return { success, failed };
    }

    /**
     * 标记同步完成
     */
    markSyncCompleted() {
      localStorage.setItem(this.syncKey, 'true');
      localStorage.setItem(this.lastSyncKey, Date.now().toString());
    }

    /**
     * 重置同步状态（用于手动重新同步）
     */
    resetSyncStatus() {
      localStorage.removeItem(this.syncKey);
      localStorage.removeItem(this.lastSyncKey);
      console.log('[MD自动同步] 已重置同步状态');
    }

    /**
     * 获取同步状态
     */
    getSyncStatus() {
      const completed = localStorage.getItem(this.syncKey) === 'true';
      const lastSync = localStorage.getItem(this.lastSyncKey);
      
      return {
        completed,
        lastSync: lastSync ? new Date(parseInt(lastSync)) : null
      };
    }
  }

  // 创建全局实例
  window.MDAutoSync = new MDAutoSync();

  // 页面加载完成后自动执行同步
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.MDAutoSync.performAutoSync().catch(console.error);
      }, 1000); // 延迟1秒确保其他组件加载完成
    });
  } else {
    // 如果页面已加载完成，立即执行
    setTimeout(() => {
      window.MDAutoSync.performAutoSync().catch(console.error);
    }, 1000);
  }

})();
