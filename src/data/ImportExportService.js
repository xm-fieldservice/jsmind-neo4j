/**
 * ImportExportService.js - 导入导出服务
 * 
 * 职责：文件导入导出功能
 * 架构层级：💾 数据层 (Data Layer)
 */

class ImportExportService {
    constructor(storage) {
        this.storage = storage;
        this.supportedFormats = ['json', 'mindmap', 'md', 'txt'];
    }

    /**
     * 导入脑图文件
     */
    async importMindmapFile(file) {
        try {
            if (!file) {
                throw new Error('未选择文件');
            }

            const fileExtension = this._getFileExtension(file.name);
            const fileContent = await this._readFileContent(file);
            
            let mindmapData = null;
            
            switch (fileExtension) {
                case 'json':
                case 'mindmap':
                    mindmapData = await this._importJsonFile(fileContent, file.name);
                    break;
                case 'md':
                    mindmapData = await this._importMarkdownFile(fileContent, file.name);
                    break;
                case 'txt':
                    mindmapData = await this._importTextFile(fileContent, file.name);
                    break;
                default:
                    throw new Error(`不支持的文件格式: ${fileExtension}`);
            }
            
            if (mindmapData) {
                console.log('[ImportExportService] 文件导入成功:', file.name);
                return mindmapData;
            } else {
                throw new Error('导入数据为空');
            }
            
        } catch (error) {
            console.error('[ImportExportService] 导入文件失败:', error);
            throw error;
        }
    }

    /**
     * 导出脑图为文件
     */
    async exportMindmapFile(data, format = 'json', filename = null) {
        try {
            if (!data) {
                throw new Error('无数据可导出');
            }

            let exportContent = '';
            let mimeType = '';
            let defaultFilename = '';
            
            switch (format.toLowerCase()) {
                case 'json':
                    exportContent = this._exportToJson(data);
                    mimeType = 'application/json';
                    defaultFilename = 'mindmap.json';
                    break;
                case 'md':
                case 'markdown':
                    exportContent = this._exportToMarkdown(data);
                    mimeType = 'text/markdown';
                    defaultFilename = 'mindmap.md';
                    break;
                case 'txt':
                    exportContent = this._exportToText(data);
                    mimeType = 'text/plain';
                    defaultFilename = 'mindmap.txt';
                    break;
                case 'jsmind':
                    exportContent = this._exportToJsMind(data);
                    mimeType = 'application/json';
                    defaultFilename = 'mindmap.jsmind';
                    break;
                default:
                    throw new Error(`不支持的导出格式: ${format}`);
            }
            
            const finalFilename = filename || defaultFilename;
            await this._downloadFile(exportContent, finalFilename, mimeType);
            
            console.log('[ImportExportService] 文件导出成功:', finalFilename);
            return true;
            
        } catch (error) {
            console.error('[ImportExportService] 导出文件失败:', error);
            throw error;
        }
    }

    /**
     * 批量导入文件
     */
    async batchImportFiles(files) {
        try {
            const results = [];
            
            for (const file of files) {
                try {
                    const data = await this.importMindmapFile(file);
                    results.push({
                        filename: file.name,
                        success: true,
                        data: data
                    });
                } catch (error) {
                    results.push({
                        filename: file.name,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            console.log('[ImportExportService] 批量导入完成:', results);
            return results;
            
        } catch (error) {
            console.error('[ImportExportService] 批量导入失败:', error);
            return [];
        }
    }

    /**
     * 导入子节点到指定父节点
     */
    async importChildNodes(file, parentId) {
        try {
            const importedData = await this.importMindmapFile(file);
            
            // 如果导入的是完整脑图，提取其子节点
            let childNodes = [];
            if (importedData.children) {
                childNodes = importedData.children;
            } else if (Array.isArray(importedData)) {
                childNodes = importedData;
            } else {
                // 将单个节点作为子节点
                childNodes = [importedData];
            }
            
            // 为每个子节点生成新的ID，避免冲突
            const processedNodes = this._processImportedNodes(childNodes);
            
            console.log('[ImportExportService] 子节点导入成功:', processedNodes.length, '个节点');
            return processedNodes;
            
        } catch (error) {
            console.error('[ImportExportService] 导入子节点失败:', error);
            throw error;
        }
    }

    /**
     * 导入JSON文件
     */
    async _importJsonFile(content, filename) {
        try {
            let jsonData = JSON.parse(content);
            
            // 检测不同的JSON格式
            if (jsonData.format === 'node_tree' && jsonData.data) {
                // jsMind格式
                return this._convertFromJsMindFormat(jsonData.data);
            } else if (jsonData.meta && jsonData.data) {
                // jsMind完整格式
                return this._convertFromJsMindFormat(jsonData.data);
            } else if (jsonData.export_time && jsonData.mindmaps) {
                // 批量导出格式
                if (jsonData.mindmaps.length > 0) {
                    return jsonData.mindmaps[0]; // 返回第一个脑图
                }
            } else if (jsonData.id || jsonData.label || jsonData.topic) {
                // 标准内部格式
                return jsonData;
            } else if (Array.isArray(jsonData)) {
                // 数组格式，取第一个
                return jsonData[0];
            }
            
            // 尝试直接使用
            return jsonData;
            
        } catch (error) {
            throw new Error(`JSON解析失败: ${error.message}`);
        }
    }

    /**
     * 导入Markdown文件
     */
    async _importMarkdownFile(content, filename) {
        try {
            const lines = content.split('\n');
            const rootNode = {
                id: 'root-' + Date.now(),
                label: filename.replace(/\.[^/.]+$/, ''),
                topic: filename.replace(/\.[^/.]+$/, ''),
                content: '',
                children: []
            };
            
            const stack = [{ node: rootNode, level: 0 }];
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                // 检测标题级别
                const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
                if (headerMatch) {
                    const level = headerMatch[1].length;
                    const title = headerMatch[2];
                    
                    const newNode = {
                        id: 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                        label: title,
                        topic: title,
                        content: '',
                        children: []
                    };
                    
                    // 找到合适的父节点
                    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
                        stack.pop();
                    }
                    
                    const parent = stack[stack.length - 1].node;
                    parent.children.push(newNode);
                    stack.push({ node: newNode, level: level });
                } else {
                    // 普通文本，添加到当前节点的内容
                    if (stack.length > 0) {
                        const currentNode = stack[stack.length - 1].node;
                        if (currentNode.content) {
                            currentNode.content += '\n' + trimmed;
                        } else {
                            currentNode.content = trimmed;
                        }
                    }
                }
            }
            
            return rootNode;
            
        } catch (error) {
            throw new Error(`Markdown解析失败: ${error.message}`);
        }
    }

    /**
     * 导入文本文件
     */
    async _importTextFile(content, filename) {
        try {
            const lines = content.split('\n').filter(line => line.trim());
            
            const rootNode = {
                id: 'root-' + Date.now(),
                label: filename.replace(/\.[^/.]+$/, ''),
                topic: filename.replace(/\.[^/.]+$/, ''),
                content: '',
                children: []
            };
            
            // 简单按行创建子节点
            lines.forEach((line, index) => {
                const trimmed = line.trim();
                if (trimmed) {
                    rootNode.children.push({
                        id: 'node-' + Date.now() + '-' + index,
                        label: trimmed,
                        topic: trimmed,
                        content: '',
                        children: []
                    });
                }
            });
            
            return rootNode;
            
        } catch (error) {
            throw new Error(`文本解析失败: ${error.message}`);
        }
    }

    /**
     * 导出为JSON格式
     */
    _exportToJson(data) {
        return JSON.stringify(data, null, 2);
    }

    /**
     * 导出为Markdown格式
     */
    _exportToMarkdown(data) {
        let markdown = '';
        
        const convertNode = (node, level = 1) => {
            const prefix = '#'.repeat(Math.min(level, 6));
            markdown += `${prefix} ${node.label || node.topic || '未命名'}\n\n`;
            
            if (node.content) {
                markdown += `${node.content}\n\n`;
            }
            
            if (node.children) {
                node.children.forEach(child => {
                    convertNode(child, level + 1);
                });
            }
        };
        
        convertNode(data);
        return markdown;
    }

    /**
     * 导出为文本格式
     */
    _exportToText(data) {
        let text = '';
        
        const convertNode = (node, indent = '') => {
            text += `${indent}${node.label || node.topic || '未命名'}\n`;
            
            if (node.content) {
                const contentLines = node.content.split('\n');
                contentLines.forEach(line => {
                    if (line.trim()) {
                        text += `${indent}  ${line}\n`;
                    }
                });
            }
            
            if (node.children) {
                node.children.forEach(child => {
                    convertNode(child, indent + '  ');
                });
            }
        };
        
        convertNode(data);
        return text;
    }

    /**
     * 导出为jsMind格式
     */
    _exportToJsMind(data) {
        const convertToJsMind = (node) => {
            const jmNode = {
                id: node.id,
                topic: node.label || node.topic || '未命名',
                data: {
                    content: node.content || ''
                }
            };
            
            if (node.children && node.children.length > 0) {
                jmNode.children = node.children.map(child => convertToJsMind(child));
            }
            
            return jmNode;
        };
        
        const jmData = {
            meta: {
                name: data.label || data.topic || '脑图',
                author: 'MindmapController',
                version: '1.0'
            },
            format: 'node_tree',
            data: convertToJsMind(data)
        };
        
        return JSON.stringify(jmData, null, 2);
    }

    /**
     * 从jsMind格式转换
     */
    _convertFromJsMindFormat(jmData) {
        const convertFromJsMind = (jmNode) => {
            const node = {
                id: jmNode.id,
                label: jmNode.topic,
                topic: jmNode.topic,
                content: (jmNode.data && jmNode.data.content) || '',
                children: []
            };
            
            if (jmNode.children) {
                node.children = jmNode.children.map(child => convertFromJsMind(child));
            }
            
            return node;
        };
        
        return convertFromJsMind(jmData);
    }

    /**
     * 处理导入的节点，生成新ID
     */
    _processImportedNodes(nodes) {
        const processNode = (node) => {
            const processed = {
                ...node,
                id: 'imported-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
            };
            
            if (processed.children) {
                processed.children = processed.children.map(child => processNode(child));
            }
            
            return processed;
        };
        
        return nodes.map(node => processNode(node));
    }

    /**
     * 读取文件内容
     */
    async _readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * 获取文件扩展名
     */
    _getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    /**
     * 下载文件
     */
    async _downloadFile(content, filename, mimeType) {
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 清理URL对象
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
        } catch (error) {
            throw new Error(`文件下载失败: ${error.message}`);
        }
    }

    /**
     * 验证文件格式
     */
    validateFileFormat(file) {
        const extension = this._getFileExtension(file.name);
        return this.supportedFormats.includes(extension);
    }

    /**
     * 获取支持的格式列表
     */
    getSupportedFormats() {
        return [...this.supportedFormats];
    }

    /**
     * 销毁服务
     */
    destroy() {
        this.storage = null;
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.ImportExportService = ImportExportService;
}
