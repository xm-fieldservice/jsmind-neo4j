/**
 * MD底座解析器 - 脑图与Markdown双向转换
 * 实现脑图JSON ↔ MD格式的无损转换
 */
(function(){
  'use strict';

  class MindmapMDParser {
    constructor() {
      this.projectSectionRegex = /^## 项目: (.+?) \(ID: (.+?)\)$/gm;
      this.metaRegex = /^- (.+?): (.+)$/gm;
      this.jsonBlockRegex = /```json\n([\s\S]*?)\n```/g;
    }

    /**
     * 将脑图JSON数据转换为MD格式
     */
    jsonToMD(projectData) {
      try {
        const projectId = projectData.id || 'unknown';
        const projectName = projectData.name || projectData.payload?.data?.topic || '未命名项目';
        const createdAt = new Date(projectData.createdAt || Date.now()).toISOString();
        const updatedAt = new Date(projectData.updatedAt || Date.now()).toISOString();
        
        // 评估数据温度（简化版）
        const temperature = this._evaluateTemperature(projectData);
        
        let mdContent = `## 项目: ${projectName} (ID: ${projectId})\n`;
        mdContent += `- 创建时间: ${createdAt}\n`;
        mdContent += `- 最后修改: ${updatedAt}\n`;
        mdContent += `- 数据温度: ${temperature}\n`;
        mdContent += `- 访问次数: ${projectData.accessCount || 0}\n\n`;
        
        // 脑图结构
        mdContent += `### 脑图结构\n`;
        mdContent += `\`\`\`json\n`;
        mdContent += JSON.stringify(projectData.payload || projectData, null, 2);
        mdContent += `\n\`\`\`\n\n`;
        
        // 节点内容详情
        if (projectData.payload?.data) {
          mdContent += `### 节点内容\n`;
          mdContent += this._convertNodesToMD(projectData.payload.data, 0);
        }
        
        mdContent += `---\n\n`;
        
        return mdContent;
      } catch (error) {
        console.error('[MDParser] JSON转MD失败:', error);
        return null;
      }
    }

    /**
     * 将MD格式解析为脑图JSON
     */
    mdToJSON(mdContent) {
      try {
        const projects = [];
        const sections = this._splitProjectSections(mdContent);
        
        for (const section of sections) {
          const project = this._parseProjectSection(section);
          if (project) {
            projects.push(project);
          }
        }
        
        return projects;
      } catch (error) {
        console.error('[MDParser] MD转JSON失败:', error);
        return [];
      }
    }

    /**
     * 增量更新MD文档中的特定项目
     */
    updateMDSection(mdContent, projectId, newProjectData) {
      try {
        const newMDSection = this.jsonToMD(newProjectData);
        if (!newMDSection) return mdContent;
        
        // 查找现有项目段落
        const projectRegex = new RegExp(
          `## 项目: .+? \\(ID: ${this._escapeRegex(projectId)}\\)[\\s\\S]*?(?=## 项目:|$)`,
          'g'
        );
        
        if (projectRegex.test(mdContent)) {
          // 替换现有项目
          return mdContent.replace(projectRegex, newMDSection);
        } else {
          // 添加新项目到末尾
          return mdContent + newMDSection;
        }
      } catch (error) {
        console.error('[MDParser] 更新MD段落失败:', error);
        return mdContent;
      }
    }

    /**
     * 从MD文档中提取特定项目
     */
    extractProject(mdContent, projectId) {
      try {
        const projects = this.mdToJSON(mdContent);
        return projects.find(p => p.id === projectId) || null;
      } catch (error) {
        console.error('[MDParser] 提取项目失败:', error);
        return null;
      }
    }

    /**
     * 验证MD格式是否有效
     */
    validateMDFormat(mdContent) {
      try {
        const projects = this.mdToJSON(mdContent);
        return {
          valid: true,
          projectCount: projects.length,
          projects: projects.map(p => ({ id: p.id, name: p.name }))
        };
      } catch (error) {
        return {
          valid: false,
          error: error.message,
          projectCount: 0
        };
      }
    }

    // 私有方法
    _evaluateTemperature(projectData) {
      const accessCount = projectData.accessCount || 0;
      const lastAccess = new Date(projectData.updatedAt || 0);
      const daysSinceAccess = (Date.now() - lastAccess.getTime()) / (1000 * 60 * 60 * 24);
      
      if (accessCount >= 50) return 'hot';
      if (accessCount >= 10) return 'warm';
      if (daysSinceAccess <= 90) return 'warm';
      if (daysSinceAccess <= 365) return 'cold';
      return 'archive';
    }

    _convertNodesToMD(node, level) {
      if (!node) return '';
      
      const indent = '  '.repeat(level);
      const topic = node.topic || '未命名节点';
      const nodeId = node.id || 'unknown';
      const content = (node.data && node.data.content) || node.content || '';
      
      let mdContent = `${indent}- **${topic}** (ID: ${nodeId})\n`;
      
      if (content) {
        const contentLines = content.split('\n');
        for (const line of contentLines) {
          if (line.trim()) {
            mdContent += `${indent}  - 内容: ${line.trim()}\n`;
          }
        }
      }
      
      // 处理子节点
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          mdContent += this._convertNodesToMD(child, level + 1);
        }
      }
      
      return mdContent;
    }

    _splitProjectSections(mdContent) {
      const sections = [];
      const matches = [...mdContent.matchAll(this.projectSectionRegex)];
      
      for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const nextMatch = matches[i + 1];
        
        const startIndex = currentMatch.index;
        const endIndex = nextMatch ? nextMatch.index : mdContent.length;
        
        const section = mdContent.slice(startIndex, endIndex).trim();
        sections.push(section);
      }
      
      return sections;
    }

    _parseProjectSection(section) {
      try {
        // 解析项目头部
        const headerMatch = section.match(/^## 项目: (.+?) \(ID: (.+?)\)$/m);
        if (!headerMatch) return null;
        
        const projectName = headerMatch[1];
        const projectId = headerMatch[2];
        
        // 解析元数据
        const metadata = {};
        const metaMatches = [...section.matchAll(this.metaRegex)];
        for (const match of metaMatches) {
          const key = match[1].trim();
          const value = match[2].trim();
          
          if (key === '创建时间' || key === '最后修改') {
            metadata[key] = new Date(value).getTime();
          } else if (key === '访问次数') {
            metadata[key] = parseInt(value) || 0;
          } else {
            metadata[key] = value;
          }
        }
        
        // 解析JSON数据
        const jsonMatch = section.match(this.jsonBlockRegex);
        let payload = null;
        if (jsonMatch && jsonMatch[1]) {
          try {
            payload = JSON.parse(jsonMatch[1]);
          } catch (e) {
            console.warn('[MDParser] JSON解析失败:', e);
          }
        }
        
        return {
          id: projectId,
          name: projectName,
          payload: payload,
          createdAt: metadata['创建时间'] || Date.now(),
          updatedAt: metadata['最后修改'] || Date.now(),
          accessCount: metadata['访问次数'] || 0,
          temperature: metadata['数据温度'] || 'warm'
        };
      } catch (error) {
        console.error('[MDParser] 解析项目段落失败:', error);
        return null;
      }
    }

    _escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }

  // 导出全局实例
  window.MindmapMDParser = new MindmapMDParser();
  
  // 兼容性检查
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindmapMDParser;
  }

})();
