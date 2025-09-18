/**
 * MD底座管理器 - 统一MD文档的读写管理
 * 负责与 data/unified_mindmap_storage.md 的交互
 */
(function(){
  'use strict';

  class MDBaseManager {
    constructor() {
      this.mdBasePath = 'data/unified_mindmap_storage.md';
      this.parser = window.MindmapMDParser;
      this.cache = {
        content: null,
        lastModified: null,
        projects: new Map()
      };
    }

    /**
     * 加载MD底座文档
     */
    async loadMDBase() {
      try {
        // 尝试多个可能的路径
        const possiblePaths = [
          this.mdBasePath,
          'data/unified_mindmap_storage.md',
          './data/unified_mindmap_storage.md'
        ];

        let content = null;
        for (const path of possiblePaths) {
          try {
            const response = await fetch(path, { cache: 'no-store' });
            if (response.ok) {
              content = await response.text();
              break;
            }
          } catch (e) {
            // 继续尝试下一个路径
          }
        }

        if (!content) {
          // 如果文件不存在，创建默认内容
          content = this._createDefaultMDBase();
          console.log('[MDBase] 使用默认MD底座内容');
        }

        // 更新缓存
        this.cache.content = content;
        this.cache.lastModified = Date.now();
        
        // 解析项目
        const projects = this.parser.mdToJSON(content);
        this.cache.projects.clear();
        projects.forEach(project => {
          this.cache.projects.set(project.id, project);
        });

        console.log(`[MDBase] 已加载 ${projects.length} 个项目`);
        return content;
      } catch (error) {
        console.error('[MDBase] 加载MD底座失败:', error);
        return this._createDefaultMDBase();
      }
    }

    /**
     * 将脑图数据写入MD底座
     */
    async writeMindmapToMD(projectData) {
      try {
        // 确保已加载MD底座
        if (!this.cache.content) {
          await this.loadMDBase();
        }

        // 更新MD内容
        const updatedContent = this.parser.updateMDSection(
          this.cache.content, 
          projectData.id, 
          projectData
        );

        // 更新缓存
        this.cache.content = updatedContent;
        this.cache.projects.set(projectData.id, projectData);

        // 写入文件（如果在支持的环境中）
        await this._saveMDToFile(updatedContent);

        console.log(`[MDBase] 已写入项目: ${projectData.id}`);
        return true;
      } catch (error) {
        console.error('[MDBase] 写入MD底座失败:', error);
        return false;
      }
    }

    /**
     * 从MD底座恢复脑图数据
     */
    async restoreMindmapFromMD(projectId) {
      try {
        // 确保已加载MD底座
        if (!this.cache.content) {
          await this.loadMDBase();
        }

        // 从缓存获取
        if (this.cache.projects.has(projectId)) {
          return this.cache.projects.get(projectId);
        }

        // 从MD内容解析
        const project = this.parser.extractProject(this.cache.content, projectId);
        if (project) {
          this.cache.projects.set(projectId, project);
        }

        return project;
      } catch (error) {
        console.error('[MDBase] 从MD底座恢复失败:', error);
        return null;
      }
    }

    /**
     * 获取所有项目列表
     */
    async getAllProjects() {
      try {
        if (!this.cache.content) {
          await this.loadMDBase();
        }

        return Array.from(this.cache.projects.values());
      } catch (error) {
        console.error('[MDBase] 获取项目列表失败:', error);
        return [];
      }
    }

    /**
     * 删除项目从MD底座
     */
    async removeProjectFromMD(projectId) {
      try {
        if (!this.cache.content) {
          await this.loadMDBase();
        }

        // 使用正则表达式移除项目段落
        const projectRegex = new RegExp(
          `## 项目: .+? \\(ID: ${this._escapeRegex(projectId)}\\)[\\s\\S]*?(?=## 项目:|$)`,
          'g'
        );

        const updatedContent = this.cache.content.replace(projectRegex, '');
        
        // 更新缓存
        this.cache.content = updatedContent;
        this.cache.projects.delete(projectId);

        // 保存文件
        await this._saveMDToFile(updatedContent);

        console.log(`[MDBase] 已删除项目: ${projectId}`);
        return true;
      } catch (error) {
        console.error('[MDBase] 删除项目失败:', error);
        return false;
      }
    }

    /**
     * 同步检查（本地 vs 服务器）
     */
    async syncCheck() {
      try {
        // 获取本地MD哈希
        const localHash = await this._calculateMDHash(this.cache.content || '');
        
        // 获取服务器MD哈希（如果服务器可用）
        let serverHash = null;
        try {
          const response = await fetch('/api/md-base/hash', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const result = await response.json();
            serverHash = result.hash;
          }
        } catch (e) {
          console.log('[MDBase] 服务器不可用，跳过同步检查');
        }

        return {
          localHash,
          serverHash,
          needSync: serverHash && localHash !== serverHash,
          serverAvailable: !!serverHash
        };
      } catch (error) {
        console.error('[MDBase] 同步检查失败:', error);
        return {
          localHash: null,
          serverHash: null,
          needSync: false,
          serverAvailable: false,
          error: error.message
        };
      }
    }

    /**
     * 与服务器同步
     */
    async syncWithServer(force = false) {
      try {
        const syncCheck = await this.syncCheck();
        
        if (!syncCheck.serverAvailable) {
          console.log('[MDBase] 服务器不可用，跳过同步');
          return { success: false, reason: 'server_unavailable' };
        }

        if (!force && !syncCheck.needSync) {
          console.log('[MDBase] 无需同步');
          return { success: true, reason: 'no_sync_needed' };
        }

        // 下载服务器版本
        const serverResponse = await fetch('/api/md-base/download');
        if (!serverResponse.ok) {
          throw new Error('下载服务器MD失败');
        }

        const serverContent = await serverResponse.text();
        
        // 合并冲突（简单策略：以最新修改时间为准）
        const mergedContent = await this._mergeContent(this.cache.content, serverContent);
        
        // 上传合并后的内容
        const uploadResponse = await fetch('/api/md-base/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: mergedContent
        });

        if (!uploadResponse.ok) {
          throw new Error('上传MD到服务器失败');
        }

        // 更新本地缓存
        this.cache.content = mergedContent;
        const projects = this.parser.mdToJSON(mergedContent);
        this.cache.projects.clear();
        projects.forEach(project => {
          this.cache.projects.set(project.id, project);
        });

        console.log('[MDBase] 同步完成');
        return { success: true, projectCount: projects.length };
      } catch (error) {
        console.error('[MDBase] 同步失败:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * 获取MD底座状态
     */
    getStatus() {
      return {
        loaded: !!this.cache.content,
        projectCount: this.cache.projects.size,
        lastModified: this.cache.lastModified,
        contentLength: this.cache.content ? this.cache.content.length : 0
      };
    }

    // 私有方法
    _createDefaultMDBase() {
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

*暂无项目，等待第一个脑图创建...*

`;
    }

    async _saveMDToFile(content) {
      try {
        // 在浏览器环境中，我们无法直接写文件
        // 这里可以触发下载或发送到服务器
        
        // 方案1: 触发下载
        if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
          console.log('[MDBase] file://协议下无法保存文件');
          return false;
        }

        // 方案2: 发送到服务器（如果可用）
        try {
          const response = await fetch('/api/md-base/save', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: content
          });
          
          if (response.ok) {
            console.log('[MDBase] 已保存到服务器');
            return true;
          }
        } catch (e) {
          // 服务器不可用，使用localStorage作为备份
        }

        // 方案3: 存储到localStorage作为备份
        try {
          localStorage.setItem('md_base_backup', content);
          localStorage.setItem('md_base_backup_timestamp', Date.now().toString());
          console.log('[MDBase] 已备份到localStorage');
          return true;
        } catch (e) {
          console.warn('[MDBase] localStorage备份失败:', e);
        }

        return false;
      } catch (error) {
        console.error('[MDBase] 保存文件失败:', error);
        return false;
      }
    }

    async _calculateMDHash(content) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(content || '');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (error) {
        // 降级到简单哈希
        let hash = 0;
        const str = content || '';
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // 转换为32位整数
        }
        return 'simple_' + (hash >>> 0).toString(16);
      }
    }

    async _mergeContent(localContent, serverContent) {
      try {
        // 简单合并策略：解析两边的项目，以最新修改时间为准
        const localProjects = this.parser.mdToJSON(localContent || '');
        const serverProjects = this.parser.mdToJSON(serverContent || '');
        
        const mergedProjects = new Map();
        
        // 添加本地项目
        localProjects.forEach(project => {
          mergedProjects.set(project.id, project);
        });
        
        // 合并服务器项目（以最新修改时间为准）
        serverProjects.forEach(serverProject => {
          const localProject = mergedProjects.get(serverProject.id);
          if (!localProject || serverProject.updatedAt > localProject.updatedAt) {
            mergedProjects.set(serverProject.id, serverProject);
          }
        });
        
        // 重新生成MD内容
        let mergedContent = this._createDefaultMDBase();
        for (const project of mergedProjects.values()) {
          const projectMD = this.parser.jsonToMD(project);
          if (projectMD) {
            mergedContent += projectMD;
          }
        }
        
        return mergedContent;
      } catch (error) {
        console.error('[MDBase] 合并内容失败:', error);
        return localContent || serverContent || this._createDefaultMDBase();
      }
    }

    _escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }

  // 导出全局实例
  window.MDBaseManager = new MDBaseManager();
  
  // 兼容性检查
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MDBaseManager;
  }

})();
