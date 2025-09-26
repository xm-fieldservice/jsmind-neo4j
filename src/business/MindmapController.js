/**
 * MindmapController.js - 重构后的脑图控制器
 * 
 * 职责：协调各层模块，提供统一接口
 * 架构层级：🧠 业务层 (Business Layer)
 */

class MindmapController {
    constructor() {
        // 核心属性
        this.containerId = 'mindmap-container';
        this.selectedNode = null;
        this.data = null;
        
        // 初始化各层模块
        this._initializeModules();
        
        // 启动初始化流程
        this._initialize();
    }

    /**
     * 初始化各层模块
     */
    _initializeModules() {
        try {
            // 数据层
            this.storage = new MindmapStorage();
            this.importExportService = new ImportExportService(this.storage);
            
            // 业务层
            this.tagManager = new TagManager(this.storage);
            this.snapshotManager = new SnapshotManager(this.storage);
            
            // 表现层
            this.view = new MindmapView();
            this.events = new MindmapEvents(this.view, this);
            
            console.log('[MindmapController] 模块初始化完成');
            
        } catch (error) {
            console.error('[MindmapController] 模块初始化失败:', error);
        }
    }

    /**
     * 初始化控制器
     */
    async _initialize() {
        try {
            // 初始化视图
            this.view.init();
            
            // 加载标签分组
            await this.tagManager.loadTagGroups();
            
            // 加载初始数据
            await this._loadInitialData();
            
            // 启动快照调度器
            this.snapshotManager.startSnapshotScheduler();
            
            console.log('[MindmapController] 控制器初始化完成');
            
        } catch (error) {
            console.error('[MindmapController] 初始化失败:', error);
        }
    }

    /**
     * 加载初始数据
     */
    async _loadInitialData() {
        try {
            this.data = await this.storage.loadMindmapData();
            if (this.data) {
                this.renderMindmap();
                this.renderTagPanel();
            }
        } catch (error) {
            console.error('[MindmapController] 加载初始数据失败:', error);
        }
    }

    /**
     * 渲染脑图
     */
    renderMindmap() {
        try {
            if (!this.data) return;
            
            // 转换为jsMind格式
            const jmData = this.toJsMindTree(this.data);
            
            // 渲染到视图
            this.view.renderMindmap(jmData);
            
            // 更新根ID
            this.storage.setRootId(this.data.id);
            
        } catch (error) {
            console.error('[MindmapController] 渲染脑图失败:', error);
        }
    }

    /**
     * 渲染标签面板
     */
    renderTagPanel() {
        try {
            // 从脑图数据中提取标签分组
            const tagGroups = this.tagManager.extractTagGroupsFromMindmap(this.data);
            const activeGroup = this.tagManager.getActiveTagGroup();
            
            // 渲染到视图
            this.view.renderTagPanel(tagGroups, activeGroup);
            
            // 高亮活跃标签
            this.highlightActiveTagsForSelectedNode();
            
        } catch (error) {
            console.error('[MindmapController] 渲染标签面板失败:', error);
        }
    }

    /**
     * 设置选中节点
     */
    setSelectedNode(nodeId) {
        try {
            if (!nodeId) return;
            
            // 保存当前节点的详情
            if (this.selectedNode) {
                this.events.saveDetailsFor(this.selectedNode);
            }
            
            // 选择新节点
            this.view.selectNode(nodeId);
            this.selectedNode = nodeId;
            this.events.setSelectedNode(nodeId);
            
            // 更新节点详情
            this.updateNodeDetails(nodeId);
            
        } catch (error) {
            console.error('[MindmapController] 设置选中节点失败:', error);
        }
    }

    /**
     * 更新节点详情
     */
    updateNodeDetails(nodeId) {
        try {
            const node = this.findNode(nodeId);
            if (node) {
                this.view.updateNodeDetails(nodeId, node);
                this.highlightActiveTagsForSelectedNode();
            }
        } catch (error) {
            console.error('[MindmapController] 更新节点详情失败:', error);
        }
    }

    /**
     * 查找节点
     */
    findNode(nodeId) {
        if (!this.data || !nodeId) return null;
        
        const findInNode = (node) => {
            if (node.id === nodeId) return node;
            
            if (node.children) {
                for (const child of node.children) {
                    const found = findInNode(child);
                    if (found) return found;
                }
            }
            
            return null;
        };
        
        return findInNode(this.data);
    }

    /**
     * 更新节点标题
     */
    updateNodeTitle(nodeId, newTitle) {
        try {
            const node = this.findNode(nodeId);
            if (node) {
                node.label = newTitle;
                node.topic = newTitle;
                
                // 更新jsMind视图
                const mind = this.view.getMind();
                if (mind) {
                    mind.update_node(nodeId, newTitle);
                }
                
                // 保存数据
                this.saveMindmapToStorage();
            }
        } catch (error) {
            console.error('[MindmapController] 更新节点标题失败:', error);
        }
    }

    /**
     * 更新节点内容
     */
    updateNodeContent(nodeId, newContent) {
        try {
            const node = this.findNode(nodeId);
            if (node) {
                node.content = newContent;
                
                // 更新jsMind节点数据
                const mind = this.view.getMind();
                if (mind) {
                    const jmNode = mind.get_node(nodeId);
                    if (jmNode) {
                        jmNode.data = jmNode.data || {};
                        jmNode.data.content = newContent;
                    }
                }
                
                // 保存数据
                this.saveMindmapToStorage();
            }
        } catch (error) {
            console.error('[MindmapController] 更新节点内容失败:', error);
        }
    }

    /**
     * 添加子节点
     */
    addChildNode(parentId, nodeData) {
        try {
            const parent = this.findNode(parentId);
            if (!parent) return null;
            
            const newNode = {
                id: nodeData.id || 'node-' + Date.now(),
                label: nodeData.label || nodeData.topic || '新节点',
                topic: nodeData.label || nodeData.topic || '新节点',
                content: nodeData.content || '',
                children: nodeData.children || []
            };
            
            // 添加到数据结构
            if (!parent.children) parent.children = [];
            parent.children.push(newNode);
            
            // 更新jsMind视图
            const mind = this.view.getMind();
            if (mind) {
                mind.add_node(parentId, newNode.id, newNode.topic);
            }
            
            // 保存数据
            this.saveMindmapToStorage();
            
            return newNode;
            
        } catch (error) {
            console.error('[MindmapController] 添加子节点失败:', error);
            return null;
        }
    }

    /**
     * 删除节点
     */
    removeNode(nodeId) {
        try {
            if (!nodeId || nodeId === this.data.id) {
                this.view.showToast('无法删除根节点', 'error');
                return false;
            }
            
            // 从数据结构中删除
            const removed = this._removeNodeFromData(nodeId);
            if (!removed) return false;
            
            // 从jsMind视图中删除
            const mind = this.view.getMind();
            if (mind) {
                mind.remove_node(nodeId);
            }
            
            // 如果删除的是选中节点，清除选择
            if (this.selectedNode === nodeId) {
                this.selectedNode = null;
                this.events.setSelectedNode(null);
            }
            
            // 保存数据
            this.saveMindmapToStorage();
            
            this.view.showToast('节点已删除');
            return true;
            
        } catch (error) {
            console.error('[MindmapController] 删除节点失败:', error);
            return false;
        }
    }

    /**
     * 从数据结构中删除节点
     */
    _removeNodeFromData(nodeId) {
        const removeFromNode = (node) => {
            if (node.children) {
                for (let i = 0; i < node.children.length; i++) {
                    if (node.children[i].id === nodeId) {
                        node.children.splice(i, 1);
                        return true;
                    }
                    if (removeFromNode(node.children[i])) {
                        return true;
                    }
                }
            }
            return false;
        };
        
        return removeFromNode(this.data);
    }

    /**
     * 切换节点标签
     */
    toggleTagForSelectedNode(tag) {
        try {
            if (!this.selectedNode) return;
            
            const node = this.findNode(this.selectedNode);
            if (!node) return;
            
            // 使用标签管理器切换标签
            const updatedNode = this.tagManager.toggleTagForNode(node, tag);
            
            // 更新视图
            this.view.updateNodeDetails(this.selectedNode, updatedNode);
            this.highlightActiveTagsForSelectedNode();
            
            // 保存数据
            this.saveMindmapToStorage();
            
            this.view.showToast('标签已更新');
            
        } catch (error) {
            console.error('[MindmapController] 切换标签失败:', error);
        }
    }

    /**
     * 设置活跃标签分组
     */
    setActiveTagGroup(groupName) {
        try {
            this.tagManager.setActiveTagGroup(groupName);
            this.renderTagPanel();
        } catch (error) {
            console.error('[MindmapController] 设置活跃标签分组失败:', error);
        }
    }

    /**
     * 高亮选中节点的活跃标签
     */
    highlightActiveTagsForSelectedNode() {
        try {
            if (!this.selectedNode) return;
            
            const node = this.findNode(this.selectedNode);
            if (!node) return;
            
            const activeTags = this.tagManager.getTagsFromNode(node);
            this.view.highlightActiveTags(activeTags);
            
        } catch (error) {
            console.error('[MindmapController] 高亮活跃标签失败:', error);
        }
    }

    /**
     * 保存脑图到存储
     */
    async saveMindmapToStorage(immediate = false) {
        try {
            if (!this.data) return false;
            
            // 从jsMind同步最新数据
            this._syncFromJsMind();
            
            // 保存到存储
            const success = await this.storage.saveMindmapData(this.data, immediate);
            
            if (success && Math.random() < 0.1) { // 10%概率显示日志
                console.log('[MindmapController] 数据保存成功');
            }
            
            return success;
            
        } catch (error) {
            console.error('[MindmapController] 保存数据失败:', error);
            return false;
        }
    }

    /**
     * 从jsMind同步数据
     */
    _syncFromJsMind() {
        try {
            const mind = this.view.getMind();
            if (!mind) return;
            
            const jmData = mind.get_data();
            if (jmData && jmData.data) {
                this.data = this.fromJsMindTree(jmData.data);
            }
        } catch (error) {
            console.warn('[MindmapController] 从jsMind同步数据失败:', error);
        }
    }

    /**
     * 转换为jsMind格式
     */
    toJsMindTree(node) {
        const jmNode = {
            id: node.id,
            topic: node.label || node.topic || '未命名',
            data: {
                content: node.content || ''
            }
        };
        
        if (node.children && node.children.length > 0) {
            jmNode.children = node.children.map(child => this.toJsMindTree(child));
        }
        
        return {
            meta: {
                name: node.label || node.topic || '脑图',
                author: 'MindmapController',
                version: '1.0'
            },
            format: 'node_tree',
            data: jmNode
        };
    }

    /**
     * 从jsMind格式转换
     */
    fromJsMindTree(jmNode) {
        const node = {
            id: jmNode.id,
            label: jmNode.topic,
            topic: jmNode.topic,
            content: (jmNode.data && jmNode.data.content) || '',
            children: []
        };
        
        if (jmNode.children) {
            node.children = jmNode.children.map(child => this.fromJsMindTree(child));
        }
        
        return node;
    }

    /**
     * 导入脑图文件
     */
    async importMindmapFile(file) {
        try {
            const importedData = await this.importExportService.importMindmapFile(file);
            
            // 替换当前数据
            this.data = importedData;
            
            // 重新渲染
            this.renderMindmap();
            this.renderTagPanel();
            
            // 保存数据
            await this.saveMindmapToStorage(true);
            
            this.view.showToast('文件导入成功');
            return true;
            
        } catch (error) {
            console.error('[MindmapController] 导入文件失败:', error);
            this.view.showToast('导入失败: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * 导出脑图文件
     */
    async exportMindmapFile(format = 'json', filename = null) {
        try {
            await this.importExportService.exportMindmapFile(this.data, format, filename);
            this.view.showToast('文件导出成功');
            return true;
        } catch (error) {
            console.error('[MindmapController] 导出文件失败:', error);
            this.view.showToast('导出失败: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * 创建快照
     */
    async createSnapshot(description = '') {
        try {
            const success = await this.snapshotManager.createSnapshot(this.data, 'manual', description);
            if (success) {
                this.view.showToast('快照创建成功');
            }
            return success;
        } catch (error) {
            console.error('[MindmapController] 创建快照失败:', error);
            this.view.showToast('创建快照失败', 'error');
            return false;
        }
    }

    /**
     * 加载快照
     */
    async loadSnapshot(snapshotId) {
        try {
            const success = await this.snapshotManager.restoreSnapshot(snapshotId);
            if (success) {
                // 重新加载数据
                await this._loadInitialData();
                this.view.showToast('快照恢复成功');
            }
            return success;
        } catch (error) {
            console.error('[MindmapController] 加载快照失败:', error);
            this.view.showToast('恢复快照失败', 'error');
            return false;
        }
    }

    /**
     * 获取快照列表
     */
    async getSnapshotList() {
        try {
            return await this.snapshotManager.getSnapshotList();
        } catch (error) {
            console.error('[MindmapController] 获取快照列表失败:', error);
            return [];
        }
    }

    /**
     * 销毁控制器
     */
    destroy() {
        try {
            // 停止快照调度器
            if (this.snapshotManager) {
                this.snapshotManager.destroy();
            }
            
            // 销毁各模块
            if (this.events) this.events.destroy();
            if (this.view) this.view.destroy();
            if (this.storage) this.storage.destroy();
            if (this.tagManager) this.tagManager.destroy();
            if (this.importExportService) this.importExportService.destroy();
            
            // 清理引用
            this.selectedNode = null;
            this.data = null;
            
            console.log('[MindmapController] 控制器已销毁');
            
        } catch (error) {
            console.error('[MindmapController] 销毁控制器失败:', error);
        }
    }
}

// 导出到全局，确保单例
if (typeof window !== 'undefined') {
    // 防止重复实例化
    if (!window.mindmapController) {
        window.MindmapController = MindmapController;
        window.mindmapController = new MindmapController();
        console.log('[MindmapController] 全局实例已创建');
    } else {
        console.log('[MindmapController] 全局实例已存在，跳过创建');
    }
}
