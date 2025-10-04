/**
 * 数据压缩引擎
 * 核心功能：智能压缩/还原数据，只保存有意义的数据
 */
class DataCompressor {
    constructor() {
        // 定义默认值配置
        this.defaults = {
            node: {
                data: {
                    content: ""
                },
                meta: {
                    itemType: "task",
                    status: "pending",
                    priority: "medium",
                    assignee: "",
                    tags: [],
                    relatedIds: [],
                    dependencies: [],
                    relations: []
                }
            }
        };
        
        console.log('[DataCompressor] 数据压缩引擎初始化');
    }

    /**
     * 压缩脑图数据
     * 移除所有默认值和空值，只保存有意义的数据
     */
    compress(mindmapData) {
        try {
            const compressed = {
                meta: this._compressMeta(mindmapData.meta),
                format: mindmapData.format,
                data: this._compressNode(mindmapData.data)
            };
            
            const originalSize = JSON.stringify(mindmapData).length;
            const compressedSize = JSON.stringify(compressed).length;
            const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
            
            console.log(`[DataCompressor] 压缩完成: ${originalSize}字节 → ${compressedSize}字节 (压缩率: ${ratio}%)`);
            
            return compressed;
        } catch (error) {
            console.error('[DataCompressor] 压缩失败:', error);
            return mindmapData; // 失败时返回原数据
        }
    }

    /**
     * 还原脑图数据
     * 智能补充默认值，还原完整数据结构
     */
    decompress(compressedData) {
        try {
            const decompressed = {
                meta: this._decompressMeta(compressedData.meta),
                format: compressedData.format || 'node_tree',
                data: this._decompressNode(compressedData.data)
            };
            
            console.log('[DataCompressor] 数据还原完成');
            
            return decompressed;
        } catch (error) {
            console.error('[DataCompressor] 还原失败:', error);
            return compressedData; // 失败时返回原数据
        }
    }

    /**
     * 压缩元数据
     */
    _compressMeta(meta) {
        if (!meta) return {};
        
        const compressed = {};
        
        // 只保存有值的字段
        if (meta.name) compressed.name = meta.name;
        if (meta.author) compressed.author = meta.author;
        if (meta.version) compressed.version = meta.version;
        if (meta.description) compressed.description = meta.description;
        if (meta.createdAt) compressed.createdAt = meta.createdAt;
        if (meta.updatedAt) compressed.updatedAt = meta.updatedAt;
        
        return compressed;
    }

    /**
     * 还原元数据
     */
    _decompressMeta(meta) {
        return {
            name: meta?.name || 'Untitled',
            author: meta?.author || '',
            version: meta?.version || '1.0',
            format: 'md_database_v1.2',
            createdAt: meta?.createdAt || Date.now(),
            updatedAt: meta?.updatedAt || Date.now(),
            description: meta?.description || ''
        };
    }

    /**
     * 压缩节点（递归）
     */
    _compressNode(node) {
        if (!node) return null;
        
        const compressed = {
            id: node.id,
            topic: node.topic
        };
        
        // 🔧 保存所有内容（包括空内容）
        // 策略：如果node.data存在，说明用户编辑过，必须保存
        if (node.data !== undefined) {
            const content = node.data.content || "";
            // 保存所有内容，包括空字符串（用户可能清空了内容）
            compressed.data = { content: content };
        }
        
        // 只保存非默认meta
        const meta = this._compressNodeMeta(node.meta);
        if (Object.keys(meta).length > 0) {
            compressed.meta = meta;
        }
        
        // 递归压缩子节点
        if (node.children && node.children.length > 0) {
            compressed.children = node.children.map(child => this._compressNode(child));
        }
        
        // 保存方向（如果有）
        if (node.direction) {
            compressed.direction = node.direction;
        }
        
        // 保存展开状态（如果不是默认值）
        if (node.expanded === false) {
            compressed.expanded = false;
        }
        
        return compressed;
    }

    /**
     * 还原节点（递归）
     */
    _decompressNode(node) {
        if (!node) return null;
        
        const decompressed = {
            id: node.id,
            topic: node.topic,
            data: {
                content: node.data?.content || ""
            },
            meta: this._decompressNodeMeta(node.meta),
            children: node.children ? node.children.map(child => this._decompressNode(child)) : []
        };
        
        // 还原方向
        if (node.direction) {
            decompressed.direction = node.direction;
        }
        
        // 还原展开状态（默认展开）
        decompressed.expanded = node.expanded !== false;
        
        return decompressed;
    }

    /**
     * 压缩节点元数据
     */
    _compressNodeMeta(meta) {
        if (!meta) return {};
        
        const compressed = {};
        const defaults = this.defaults.node.meta;
        
        // 只保存非默认值
        if (meta.itemType && meta.itemType !== defaults.itemType) {
            compressed.itemType = meta.itemType;
        }
        if (meta.status && meta.status !== defaults.status) {
            compressed.status = meta.status;
        }
        if (meta.priority && meta.priority !== defaults.priority) {
            compressed.priority = meta.priority;
        }
        if (meta.assignee && meta.assignee !== defaults.assignee) {
            compressed.assignee = meta.assignee;
        }
        if (meta.tags && meta.tags.length > 0) {
            compressed.tags = meta.tags;
        }
        if (meta.relatedIds && meta.relatedIds.length > 0) {
            compressed.relatedIds = meta.relatedIds;
        }
        if (meta.dependencies && meta.dependencies.length > 0) {
            compressed.dependencies = meta.dependencies;
        }
        
        // relations 特殊处理：只保存非父子关系
        if (meta.relations && meta.relations.length > 0) {
            const nonParentRelations = meta.relations.filter(r => r.type !== 'parent_child');
            if (nonParentRelations.length > 0) {
                compressed.relations = nonParentRelations;
            }
        }
        
        // 保存时间戳（如果有）
        if (meta.createdAt) compressed.createdAt = meta.createdAt;
        if (meta.updatedAt) compressed.updatedAt = meta.updatedAt;
        
        return compressed;
    }

    /**
     * 还原节点元数据
     */
    _decompressNodeMeta(meta) {
        const defaults = this.defaults.node.meta;
        
        return {
            itemType: meta?.itemType || defaults.itemType,
            parentId: meta?.parentId || null,
            status: meta?.status || defaults.status,
            priority: meta?.priority || defaults.priority,
            assignee: meta?.assignee || defaults.assignee,
            tags: meta?.tags || [],
            relatedIds: meta?.relatedIds || [],
            dependencies: meta?.dependencies || [],
            relations: meta?.relations || [],
            createdAt: meta?.createdAt || Date.now(),
            updatedAt: meta?.updatedAt || Date.now()
        };
    }

    /**
     * 检测数据格式
     */
    detectFormat(data) {
        // 检测是否是压缩格式
        const isCompressed = !data.data?.data?.content || 
                            !data.data?.meta?.itemType ||
                            Object.keys(data.data?.meta || {}).length < 5;
        
        return isCompressed ? 'compressed' : 'full';
    }

    /**
     * 自动处理（智能识别格式）
     */
    autoProcess(data, targetFormat = 'compressed') {
        const currentFormat = this.detectFormat(data);
        
        if (currentFormat === targetFormat) {
            console.log(`[DataCompressor] 数据已是${targetFormat}格式，无需转换`);
            return data;
        }
        
        if (targetFormat === 'compressed') {
            return this.compress(data);
        } else {
            return this.decompress(data);
        }
    }
}

// 导出单例
if (typeof window !== 'undefined') {
    window.DataCompressor = DataCompressor;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataCompressor;
}
