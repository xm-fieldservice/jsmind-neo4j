/**
 * MD格式转换器
 * 实现JSON数据与MD格式的双向转换
 */
class MDConverter {
    constructor() {
        console.log('[MDConverter] MD格式转换器初始化');
    }

    /**
     * JSON转MD格式
     * @param {Object} data - 脑图JSON数据
     * @returns {String} MD格式字符串
     */
    jsonToMD(data) {
        try {
            const lines = [];
            
            // 1. 文件头部元数据
            lines.push(`# ${data.meta?.name || 'Untitled'}`);
            lines.push('');
            if (data.meta?.author) lines.push(`**作者**: ${data.meta.author}`);
            if (data.meta?.version) lines.push(`**版本**: ${data.meta.version}`);
            if (data.meta?.description) lines.push(`**描述**: ${data.meta.description}`);
            if (data.meta?.createdAt) lines.push(`**创建时间**: ${this._formatDate(data.meta.createdAt)}`);
            if (data.meta?.updatedAt) lines.push(`**更新时间**: ${this._formatDate(data.meta.updatedAt)}`);
            lines.push('');
            lines.push('---');
            lines.push('');
            
            // 2. 递归处理节点树
            if (data.data) {
                this._nodeToMD(data.data, lines, 2);
            }
            
            const result = lines.join('\n');
            console.log('[MDConverter] JSON转MD完成，行数:', lines.length);
            return result;
        } catch (error) {
            console.error('[MDConverter] JSON转MD失败:', error);
            throw error;
        }
    }
    
    /**
     * 节点转MD
     */
    _nodeToMD(node, lines, level) {
        if (!node) return;
        
        // 标题（使用#数量表示层级）
        const heading = '#'.repeat(level);
        lines.push(`${heading} ${node.topic || 'Untitled'}`);
        lines.push('');
        
        // 节点元数据（使用HTML注释格式，不影响阅读）
        const metaLines = [];
        metaLines.push(`<!-- id: ${node.id} -->`);
        
        if (node.meta?.createdAt) {
            metaLines.push(`<!-- created: ${this._formatDate(node.meta.createdAt)} -->`);
        }
        if (node.meta?.updatedAt) {
            metaLines.push(`<!-- updated: ${this._formatDate(node.meta.updatedAt)} -->`);
        }
        
        // 其他meta字段
        if (node.meta) {
            const otherMeta = { ...node.meta };
            delete otherMeta.createdAt;
            delete otherMeta.updatedAt;
            
            if (Object.keys(otherMeta).length > 0) {
                metaLines.push(`<!-- meta: ${JSON.stringify(otherMeta)} -->`);
            }
        }
        
        lines.push(...metaLines);
        lines.push('');
        
        // 节点内容
        if (node.data?.content) {
            lines.push(node.data.content.trim());
            lines.push('');
        }
        
        // 递归处理子节点
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                this._nodeToMD(child, lines, level + 1);
            }
        }
    }
    
    /**
     * MD转JSON格式
     * @param {String} mdString - MD格式字符串
     * @returns {Object} 脑图JSON数据
     */
    mdToJSON(mdString) {
        try {
            const lines = mdString.split('\n');
            
            // 1. 解析文件头部元数据
            const meta = this._parseFileMeta(lines);
            
            // 2. 解析节点树
            const data = this._parseNodes(lines);
            
            const result = {
                meta,
                format: 'node_tree',
                data
            };
            
            console.log('[MDConverter] MD转JSON完成');
            return result;
        } catch (error) {
            console.error('[MDConverter] MD转JSON失败:', error);
            throw error;
        }
    }
    
    /**
     * 解析文件头部元数据
     */
    _parseFileMeta(lines) {
        const meta = {
            name: 'Untitled',
            author: '',
            version: '1.0',
            description: '',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        for (let i = 0; i < Math.min(20, lines.length); i++) {
            const line = lines[i].trim();
            
            // 解析标题
            if (line.startsWith('# ') && !meta.nameSet) {
                meta.name = line.substring(2).trim();
                meta.nameSet = true;
            }
            
            // 解析元数据字段
            if (line.startsWith('**作者**:')) {
                meta.author = line.split(':')[1].trim();
            } else if (line.startsWith('**版本**:')) {
                meta.version = line.split(':')[1].trim();
            } else if (line.startsWith('**描述**:')) {
                meta.description = line.split(':')[1].trim();
            } else if (line.startsWith('**创建时间**:')) {
                meta.createdAt = this._parseDate(line.split(':').slice(1).join(':').trim());
            } else if (line.startsWith('**更新时间**:')) {
                meta.updatedAt = this._parseDate(line.split(':').slice(1).join(':').trim());
            }
            
            // 遇到分隔线，停止解析头部
            if (line === '---') break;
        }
        
        delete meta.nameSet;
        return meta;
    }
    
    /**
     * 解析节点树
     */
    _parseNodes(lines) {
        const stack = [];
        let rootNode = null;
        let currentContent = [];
        let currentMeta = {};
        let currentId = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 跳过文件头部（直到第一个##标题）
            if (!rootNode && !line.match(/^##\s/)) continue;
            
            // 检测标题行
            const headingMatch = line.match(/^(#{2,})\s+(.+)$/);
            if (headingMatch) {
                // 保存上一个节点的内容
                if (stack.length > 0) {
                    const lastNode = stack[stack.length - 1];
                    if (currentContent.length > 0) {
                        lastNode.data = {
                            content: currentContent.join('\n').trim()
                        };
                    }
                    if (Object.keys(currentMeta).length > 0) {
                        lastNode.meta = currentMeta;
                    }
                }
                
                // 创建新节点
                const level = headingMatch[1].length;
                const topic = headingMatch[2].trim();
                const node = {
                    id: currentId || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    topic,
                    data: { content: '' },
                    meta: {},
                    children: []
                };
                
                // 重置当前内容和元数据
                currentContent = [];
                currentMeta = {};
                currentId = null;
                
                // 根据层级确定父节点
                while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                    stack.pop();
                }
                
                if (stack.length === 0) {
                    // 根节点
                    rootNode = node;
                    node.level = level;
                    stack.push(node);
                } else {
                    // 子节点
                    const parent = stack[stack.length - 1];
                    parent.children.push(node);
                    node.level = level;
                    stack.push(node);
                }
                
                continue;
            }
            
            // 解析HTML注释中的元数据
            const commentMatch = line.match(/<!--\s*(\w+):\s*(.+?)\s*-->/);
            if (commentMatch) {
                const key = commentMatch[1];
                const value = commentMatch[2];
                
                if (key === 'id') {
                    currentId = value;
                    if (stack.length > 0) {
                        stack[stack.length - 1].id = value;
                    }
                } else if (key === 'created') {
                    currentMeta.createdAt = this._parseDate(value);
                } else if (key === 'updated') {
                    currentMeta.updatedAt = this._parseDate(value);
                } else if (key === 'meta') {
                    try {
                        const parsed = JSON.parse(value);
                        currentMeta = { ...currentMeta, ...parsed };
                    } catch (e) {
                        console.warn('[MDConverter] 解析meta失败:', value);
                    }
                }
                continue;
            }
            
            // 跳过空行和分隔线
            if (line.trim() === '' || line.trim() === '---') continue;
            
            // 收集内容行
            if (stack.length > 0) {
                currentContent.push(line);
            }
        }
        
        // 保存最后一个节点的内容
        if (stack.length > 0) {
            const lastNode = stack[stack.length - 1];
            if (currentContent.length > 0) {
                lastNode.data = {
                    content: currentContent.join('\n').trim()
                };
            }
            if (Object.keys(currentMeta).length > 0) {
                lastNode.meta = currentMeta;
            }
        }
        
        // 清理level属性
        this._cleanupNode(rootNode);
        
        return rootNode || {
            id: 'root',
            topic: 'Root',
            data: { content: '' },
            meta: {},
            children: []
        };
    }
    
    /**
     * 清理节点的临时属性
     */
    _cleanupNode(node) {
        if (!node) return;
        delete node.level;
        if (node.children) {
            node.children.forEach(child => this._cleanupNode(child));
        }
    }
    
    /**
     * 格式化日期
     */
    _formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toISOString().replace('T', ' ').substring(0, 19);
    }
    
    /**
     * 解析日期
     */
    _parseDate(dateString) {
        if (!dateString) return Date.now();
        const date = new Date(dateString);
        return date.getTime() || Date.now();
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.MDConverter = MDConverter;
}
