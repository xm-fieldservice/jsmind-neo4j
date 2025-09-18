/**
 * MD底座离线同步服务
 * 在file://协议下与IndexedDB/localStorage同步，实现完整的MD底座功能
 */
(function(){
  'use strict';

  class MDOfflineSync {
    constructor() {
      this.isFileProtocol = window.location.protocol === 'file:';
      this.storageKey = 'md_base_offline_storage';
      this.indexKey = 'md_base_project_index';
      this.lastSyncKey = 'md_base_last_sync';
    }

    /**
     * 初始化离线同步
     */
    async initialize() {
      if (!this.isFileProtocol) {
        console.log('[MD离线同步] HTTP协议下，使用标准MD底座');
        return true;
      }

      console.log('[MD离线同步] file://协议检测到，启用离线同步模式');
      
      try {
        // 1. 从localStorage恢复MD内容
        await this.restoreFromLocalStorage();
        
        // 2. 从IndexedDB同步项目数据
        await this.syncFromIndexedDB();
        
        // 3. 重写MD底座管理器的方法
        this.overrideMDBaseManager();
        
        console.log('[MD离线同步] 离线同步初始化完成');
        return true;
      } catch (error) {
        console.error('[MD离线同步] 初始化失败:', error);
        return false;
      }
    }

    /**
     * 从localStorage恢复MD内容
     */
    async restoreFromLocalStorage() {
      try {
        const storedContent = localStorage.getItem(this.storageKey);
        if (storedContent) {
          // 解析存储的MD内容
          const mdData = JSON.parse(storedContent);
          
          // 更新MD底座管理器的缓存
          if (window.MDBaseManager) {
            window.MDBaseManager.cache.content = mdData.content;
            window.MDBaseManager.cache.lastModified = mdData.timestamp;
            
            // 解析项目
            const projects = window.MindmapMDParser.mdToJSON(mdData.content);
            window.MDBaseManager.cache.projects.clear();
            projects.forEach(project => {
              window.MDBaseManager.cache.projects.set(project.id, project);
            });
            
            console.log(`[MD离线同步] 从localStorage恢复了 ${projects.length} 个项目`);
          }
        } else {
          // 创建默认MD内容
          await this.createDefaultMDContent();
        }
      } catch (error) {
        console.error('[MD离线同步] localStorage恢复失败:', error);
        await this.createDefaultMDContent();
      }
    }

    /**
     * 从IndexedDB同步项目数据
     */
    async syncFromIndexedDB() {
      try {
        if (!window.MindmapStorage) return;

        // 获取IndexedDB状态
        const status = await window.MindmapStorage.getStatus();
        if (status.nodes === 0) return;

        console.log(`[MD离线同步] 检测到IndexedDB中有 ${status.nodes} 个节点`);

        // 从localStorage获取主要脑图数据
        const mainData = this.getMainMindmapData();
        if (mainData) {
          await this.syncProjectToMD(mainData);
        }

      } catch (error) {
        console.error('[MD离线同步] IndexedDB同步失败:', error);
      }
    }

    /**
     * 获取主要脑图数据
     */
    getMainMindmapData() {
      const keys = ['mindmap_data_v1', 'mindmap_data_backup_v1', '__mind_full_cache_v1'];
      
      for (const key of keys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          
          const data = JSON.parse(raw);
          if (this.isValidMindmapData(data)) {
            return {
              id: this.generateProjectId(data),
              name: this.extractProjectName(data),
              payload: data,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              accessCount: 1,
              source: key
            };
          }
        } catch (error) {
          console.warn(`[MD离线同步] 解析 ${key} 失败:`, error);
        }
      }
      
      return null;
    }

    /**
     * 验证脑图数据有效性
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
      return `mind_offline_${hash}`;
    }

    /**
     * 提取项目名称
     */
    extractProjectName(data) {
      if (data.data && data.data.topic) {
        return data.data.topic;
      }
      return '离线项目';
    }

    /**
     * 简单哈希函数
     */
    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return (hash >>> 0).toString(16);
    }

    /**
     * 同步项目到MD
     */
    async syncProjectToMD(projectData) {
      try {
        if (!window.MindmapMDParser || !window.MDBaseManager) return;

        // 生成MD格式
        const projectMD = window.MindmapMDParser.jsonToMD(projectData);
        if (!projectMD) return;

        // 更新MD内容
        let currentContent = window.MDBaseManager.cache.content || this.getDefaultMDContent();
        
        // 检查是否已存在该项目
        const existingProject = window.MDBaseManager.cache.projects.get(projectData.id);
        if (existingProject) {
          // 更新现有项目
          currentContent = window.MindmapMDParser.updateMDSection(currentContent, projectData.id, projectData);
        } else {
          // 添加新项目
          currentContent += projectMD;
        }

        // 更新缓存
        window.MDBaseManager.cache.content = currentContent;
        window.MDBaseManager.cache.projects.set(projectData.id, projectData);

        // 保存到localStorage
        await this.saveMDToLocalStorage(currentContent);

        console.log(`[MD离线同步] 已同步项目: ${projectData.name}`);
      } catch (error) {
        console.error('[MD离线同步] 项目同步失败:', error);
      }
    }

    /**
     * 保存MD内容到localStorage
     */
    async saveMDToLocalStorage(content) {
      try {
        const mdData = {
          content: content,
          timestamp: Date.now()
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(mdData));
        localStorage.setItem(this.lastSyncKey, Date.now().toString());
        
        console.log('[MD离线同步] MD内容已保存到localStorage');
      } catch (error) {
        console.error('[MD离线同步] localStorage保存失败:', error);
      }
    }

    /**
     * 创建默认MD内容
     */
    async createDefaultMDContent() {
      const defaultContent = this.getDefaultMDContent();
      
      if (window.MDBaseManager) {
        window.MDBaseManager.cache.content = defaultContent;
        window.MDBaseManager.cache.lastModified = Date.now();
      }
      
      await this.saveMDToLocalStorage(defaultContent);
    }

    /**
     * 获取默认MD内容
     */
    getDefaultMDContent() {
      return `# 统一脑图存储文档

这是AutoGen混合存储架构的统一MD文档，用于存储所有脑图数据。

## 存储格式说明

每个脑图项目以以下格式存储：

\`\`\`
## 项目: [项目名称] (ID: [项目ID])
- 创建时间: [时间戳]
- 最后修改: [时间戳]
- 数据温度: [hot/warm/cold/archive]

### 脑图结构
[JSON格式的脑图数据]

### 内容详情
[节点内容和附件信息]

---
\`\`\`

## 项目列表

`;
    }

    /**
     * 重写MD底座管理器的方法
     */
    overrideMDBaseManager() {
      if (!window.MDBaseManager) return;

      const self = this;

      // 重写loadMDBase方法
      const originalLoadMDBase = window.MDBaseManager.loadMDBase;
      window.MDBaseManager.loadMDBase = async function() {
        if (self.isFileProtocol) {
          // file://协议下从localStorage读取
          const storedContent = localStorage.getItem(self.storageKey);
          if (storedContent) {
            const mdData = JSON.parse(storedContent);
            this.cache.content = mdData.content;
            this.cache.lastModified = mdData.timestamp;
            return mdData.content;
          } else {
            const defaultContent = self.getDefaultMDContent();
            this.cache.content = defaultContent;
            return defaultContent;
          }
        } else {
          // HTTP协议下使用原方法
          return await originalLoadMDBase.call(this);
        }
      };

      // 重写writeMindmapToMD方法
      const originalWriteMindmapToMD = window.MDBaseManager.writeMindmapToMD;
      window.MDBaseManager.writeMindmapToMD = async function(projectData) {
        if (self.isFileProtocol) {
          // file://协议下使用离线同步
          await self.syncProjectToMD(projectData);
          return true;
        } else {
          // HTTP协议下使用原方法
          return await originalWriteMindmapToMD.call(this, projectData);
        }
      };

      console.log('[MD离线同步] MD底座管理器方法已重写');
    }

    /**
     * 获取同步状态
     */
    getStatus() {
      const lastSync = localStorage.getItem(this.lastSyncKey);
      const hasContent = !!localStorage.getItem(this.storageKey);
      
      return {
        isFileProtocol: this.isFileProtocol,
        offlineMode: this.isFileProtocol,
        hasContent: hasContent,
        lastSync: lastSync ? new Date(parseInt(lastSync)) : null,
        storageSize: this.getStorageSize()
      };
    }

    /**
     * 获取存储大小
     */
    getStorageSize() {
      try {
        const content = localStorage.getItem(this.storageKey);
        return content ? content.length : 0;
      } catch (error) {
        return 0;
      }
    }

    /**
     * 手动触发同步
     */
    async manualSync() {
      console.log('[MD离线同步] 开始手动同步...');
      
      try {
        await this.syncFromIndexedDB();
        console.log('[MD离线同步] 手动同步完成');
        return true;
      } catch (error) {
        console.error('[MD离线同步] 手动同步失败:', error);
        return false;
      }
    }
  }

  // 创建全局实例
  window.MDOfflineSync = new MDOfflineSync();

  // 页面加载完成后自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.MDOfflineSync.initialize().catch(console.error);
      }, 500);
    });
  } else {
    setTimeout(() => {
      window.MDOfflineSync.initialize().catch(console.error);
    }, 500);
  }

})();
