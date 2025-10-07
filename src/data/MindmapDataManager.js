/**
 * MindmapDataManager.js - 脑图数据管理器
 * 
 * 职责：数据存储、格式转换、持久化管理
 * 架构层级：💾 数据层 (Data Layer)
 * 
 * 功能范围：
 * - 数据存储和加载
 * - 格式转换 (内部格式 ↔ jsMind格式)
 * - JSON底座同步
 * - 快照管理
 * - 数据验证和修复
 */

class MindmapDataManager {
    constructor(dependencies = {}) {
        // 依赖注入：优先使用StorageAdapter
        this.storageAdapter = dependencies.storageAdapter || null;
        this.storage = dependencies.storage || window.AutogenUnifiedStorage;
        this.eventBus = dependencies.eventBus || window.AutogenEventBus;
        this.logger = dependencies.logger || console;
        
        // 如果没有提供StorageAdapter，尝试创建
        if (!this.storageAdapter && typeof window !== 'undefined' && window.StorageAdapter) {
            this.storageAdapter = new window.StorageAdapter();
            this.storageAdapter.initialize().catch(err => {
                console.warn('[MindmapDataManager] StorageAdapter初始化失败，回退到直接存储:', err);
                this.storageAdapter = null;
            });
        }
        
        if (!this.storage && !this.storageAdapter) {
            throw new Error('[MindmapDataManager] 存储系统未初始化，无法创建数据管理器');
        }
        
        // 数据同步相关
        this._jsonBaseSyncTimer = null;
        this._lastJsonBaseHash = null;
        this._saveDebounceTimer = null;
        
        // 当前脑图状态
        this.currentMindId = null;
        this.currentStorageKey = null;
        
        console.log('[MindmapDataManager] ✅ 数据层管理器初始化完成', 
            this.storageAdapter ? '(使用StorageAdapter)' : '(使用直接存储)');
    }

    /**
     * 保存脑图数据到存储系统
     */
    async saveMindmapData(data, storageKey, immediate = false) {
        // 防抖逻辑：合并频繁保存操作，提升性能
        if (!immediate) {
            clearTimeout(this._saveDebounceTimer);
            this._saveDebounceTimer = setTimeout(() => {
                this.saveMindmapData(data, storageKey, true);
            }, 800);
            return;
        }

        try {
            // 数据验证
            if (!data || !data.id) {
                console.warn('[MindmapDataManager] 无效数据，跳过保存');
                return false;
            }

            // 转换为jsMind格式
            const jmData = {
                meta: { 
                    name: data.label || 'Project Mindmap', 
                    author: 'local', 
                    version: '1.0' 
                },
                format: 'node_tree',
                data: this.toJsMindTree(data)
            };

            // 优先使用StorageAdapter，回退到直接存储
            let success;
            if (this.storageAdapter) {
                success = await this.storageAdapter.saveMindmap(jmData);
            } else {
                success = await this.storage.store('mindmap', storageKey, jmData);
            }
            
            if (success) {
                // 触发保存完成事件
                if (this.eventBus) {
                    this.eventBus.emit('mindmap:dataSaved', {
                        storageKey,
                        dataSize: JSON.stringify(jmData).length,
                        timestamp: Date.now()
                    });
                }

                // 异步同步到JSON底座
                this._syncToJsonBase(jmData, storageKey);
                
                if (Math.random() < 0.1) { // 10%概率输出日志
                    console.log('[MindmapDataManager] ✅ 数据保存成功:', storageKey);
                }
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('[MindmapDataManager] 保存数据失败:', error);
            return false;
        }
    }

    /**
     * 从存储系统加载脑图数据
     */
    async loadMindmapData(storageKey) {
        try {
            if (!this.storage && !this.storageAdapter) {
                console.error('[MindmapDataManager] 存储系统不可用');
                return null;
            }

            // 优先使用StorageAdapter，回退到直接存储
            let data;
            if (this.storageAdapter) {
                data = await this.storageAdapter.loadMindmap(storageKey);
            } else {
                data = await this.storage.retrieve('mindmap', storageKey);
            }
            
            if (data) {
                console.log('[MindmapDataManager] ✅ 数据加载成功:', storageKey);
                
                // 格式转换
                if (data.format === 'node_tree' && data.data) {
                    return this.fromJsMindTree(data.data);
                } else if (data.data) {
                    return this.fromJsMindTree(data);
                } else {
                    return data;
                }
            }
            
            console.log('[MindmapDataManager] 未找到数据:', storageKey);
            return null;
            
        } catch (error) {
            console.error('[MindmapDataManager] 加载数据失败:', error);
            return null;
        }
    }

    /**
     * 获取默认脑图数据
     */
    getDefaultData() {
        const uid = `root-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        return {
            id: uid,
            label: '新建项目',
            content: '',
            children: [],
            attachments: [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
    }

    /**
     * 数据格式转换：内部格式 → jsMind格式
     */
    toJsMindTree(node, depth = 0) {
        if (!node || !node.id) {
            console.warn('[MindmapDataManager] toJsMindTree: 无效节点', node);
            return null;
        }

        // 防止无限递归
        if (depth > 50) {
            console.warn('[MindmapDataManager] toJsMindTree: 递归深度超限');
            return null;
        }

        const t = {
            id: node.id,
            topic: node.label || node.topic || '未命名节点',
            data: {}
        };

        // 保存扩展数据
        if (node.content) t.data.content = node.content;
        if (node.created) t.data.created = node.created;
        if (node.modified) t.data.modified = node.modified;
        if (node.attachments && node.attachments.length > 0) {
            t.data.attachments = node.attachments;
        }

        // 递归转换子节点
        if (node.children && node.children.length > 0) {
            t.children = node.children
                .map(child => this.toJsMindTree(child, depth + 1))
                .filter(Boolean);
        }

        return t;
    }

    /**
     * 数据格式转换：jsMind格式 → 内部格式
     */
    fromJsMindTree(jmNode) {
        if (!jmNode || !jmNode.id) {
            console.warn('[MindmapDataManager] fromJsMindTree: 无效jsMind节点');
            return null;
        }

        const n = {
            id: jmNode.id,
            label: jmNode.topic || '未命名节点',
            children: [],
            content: '',
            attachments: [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        // 恢复扩展数据
        if (jmNode.data) {
            if (jmNode.data.content) n.content = jmNode.data.content;
            if (jmNode.data.created) n.created = jmNode.data.created;
            if (jmNode.data.modified) n.modified = jmNode.data.modified;
            if (jmNode.data.attachments) n.attachments = jmNode.data.attachments;
        }

        // 递归转换子节点
        if (jmNode.children && jmNode.children.length > 0) {
            for (const child of jmNode.children) {
                const childNode = this.fromJsMindTree(child);
                if (childNode) {
                    n.children.push(childNode);
                }
            }
        }

        return n;
    }

    /**
     * 同步数据到JSON底座
     */
    async _syncToJsonBase(jmData, mindKey) {
        try {
            // 防抖机制：避免频繁同步
            if (!this._jsonBaseSyncTimer) {
                this._jsonBaseSyncTimer = setTimeout(async () => {
                    await this._performJsonBaseSync(jmData, mindKey);
                    this._jsonBaseSyncTimer = null;
                }, 2000); // 2秒防抖
            }
        } catch (error) {
            console.warn('[MindmapDataManager] JSON底座同步调度失败:', error);
        }
    }

    /**
     * 执行JSON底座同步
     */
    async _performJsonBaseSync(jmData, mindKey) {
        try {
            // 检查数据变更
            const currentHash = this._calculateDataHash(jmData);
            if (currentHash === this._lastJsonBaseHash) {
                return; // 数据未变更，跳过同步
            }

            // 构建同步数据
            const mindmapEntry = {
                id: mindKey,
                name: (jmData.data && (jmData.data.topic || jmData.data.label)) || '未命名项目',
                data: jmData,
                last_modified: new Date().toISOString(),
                content_hash: currentHash
            };

            // 使用统一API配置获取脑图同步URL
            const syncUrl = window.ApiConfig ? 
                window.ApiConfig.getMindmapSyncUrl() : 
                'http://127.0.0.1:5001/api/sync-mindmap'; // 回退方案
            
            const response = await fetch(syncUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mindmapEntry)
            });

            if (response.ok) {
                this._lastJsonBaseHash = currentHash;
                
                // 触发同步完成事件
                if (this.eventBus) {
                    this.eventBus.emit('mindmap:jsonBaseSynced', {
                        mindKey,
                        hash: currentHash,
                        timestamp: new Date().toISOString()
                    });
                }
                
                if (Math.random() < 0.2) { // 20%概率输出日志
                    console.log('[MindmapDataManager] ✅ JSON底座同步成功:', mindKey);
                }
            }

        } catch (error) {
            // 网络错误时静默处理，不影响本地保存
            if (Math.random() < 0.1) { // 10%概率输出警告
                console.warn('[MindmapDataManager] JSON底座同步异常（不影响本地保存）:', error.message);
            }
        }
    }

    /**
     * 计算数据哈希值（使用公共工具方法）
     */
    _calculateDataHash(data) {
        // 使用公共工具方法，避免代码重复
        if (typeof window !== 'undefined' && window.DataUtils) {
            return window.DataUtils.calculateDataHash(data);
        }
        
        // 回退逻辑
        try {
            const str = JSON.stringify(data);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString();
        } catch (error) {
            console.warn('[MindmapDataManager] 计算哈希值失败:', error);
            return Date.now().toString();
        }
    }

    /**
     * 数据验证和修复
     */
    validateAndRepairData(data) {
        if (!data) return this.getDefaultData();
        
        // 确保必要字段存在
        if (!data.id) data.id = `root-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        if (!data.label) data.label = '未命名项目';
        if (!data.children) data.children = [];
        if (!data.content) data.content = '';
        if (!data.attachments) data.attachments = [];
        if (!data.created) data.created = new Date().toISOString();
        if (!data.modified) data.modified = new Date().toISOString();

        // 递归修复子节点
        if (data.children && Array.isArray(data.children)) {
            data.children = data.children.map(child => this.validateAndRepairData(child));
        }

        return data;
    }

    /**
     * 获取数据统计信息
     */
    getDataStats(data) {
        if (!data) return { nodeCount: 0, depth: 0, size: 0 };

        let nodeCount = 1;
        let maxDepth = 1;

        const calculateStats = (node, currentDepth = 1) => {
            if (node.children && node.children.length > 0) {
                nodeCount += node.children.length;
                maxDepth = Math.max(maxDepth, currentDepth + 1);
                
                for (const child of node.children) {
                    calculateStats(child, currentDepth + 1);
                }
            }
        };

        calculateStats(data);

        return {
            nodeCount,
            depth: maxDepth,
            size: JSON.stringify(data).length
        };
    }

    /**
     * 获取当前脑图ID（从控制器迁移）
     */
    getCurrentMindId(mind, data) {
        try {
            const rootId = (mind && mind.get_root && mind.get_root().id) || 
                          (data && data.id);
            return rootId ? String(rootId) : 'root';
        } catch (error) {
            this.logger.warn('[MindmapDataManager] 获取脑图ID失败:', error);
            return 'root';
        }
    }

    /**
     * 获取存储系统状态（从控制器迁移）
     */
    getStorageSystemStatus() {
        return {
            autogenStorage: {
                available: !!this.storage,
                type: 'AutogenUnifiedStorage',
                status: this.storage ? 'active' : 'unavailable'
            },
            dataManager: {
                available: true,
                currentMindId: this.currentMindId,
                currentStorageKey: this.currentStorageKey
            },
            jsonBaseSync: {
                lastHash: this._lastJsonBaseHash,
                syncTimer: !!this._jsonBaseSyncTimer
            }
        };
    }

    /**
     * 设置当前脑图上下文
     */
    setCurrentMindContext(mindId, storageKey) {
        this.currentMindId = mindId;
        this.currentStorageKey = storageKey;
        
        if (this.eventBus) {
            this.eventBus.emit('mindmap:contextChanged', {
                mindId,
                storageKey,
                timestamp: Date.now()
            });
        }
    }

    /**
     * 异步加载初始数据（从控制器迁移）
     */
    async loadInitialData(storageKey) {
        try {
            const loadedData = await this.loadMindmapData(storageKey);
            const data = loadedData || this.getDefaultData();
            
            // 设置当前上下文
            this.setCurrentMindContext(data.id, storageKey);
            
            // 触发数据加载完成事件
            if (this.eventBus) {
                this.eventBus.emit('mindmap:dataLoaded', {
                    data,
                    storageKey,
                    timestamp: Date.now()
                });
            }
            
            return data;
        } catch (error) {
            this.logger.error('[MindmapDataManager] 初始数据加载失败:', error);
            const defaultData = this.getDefaultData();
            this.setCurrentMindContext(defaultData.id, storageKey);
            return defaultData;
        }
    }
}

// 全局注册
if (typeof window !== 'undefined') {
    window.MindmapDataManager = MindmapDataManager;
}
