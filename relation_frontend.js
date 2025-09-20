/**
 * 关系管理前端界面
 * 基于统一存储系统的关系数据管理和D3.js可视化
 * 实现按需激活机制：点击关系按键时加载，切换时清理
 */

class RelationFrontend {
    constructor() {
        this.relationData = {
            nodes: [],
            edges: [],
            metadata: {}
        };
        this.currentNodeId = null;
        this.relationTypes = ['semantic', 'structural', 'temporal', 'hierarchical'];
        this.isLoading = false;
        this.isActive = false;
        this.d3Graph = null;
        
        // 统一存储管理器引用（延迟初始化）
        this.storage = null;
        
        // 关系数据管理器
        this.dataManager = null;
        
        this.initializeUI();
    }
    
    initializeUI() {
        console.log('[关系管理] 初始化前端界面');
        
        // 延迟初始化，等待其他系统加载完成
        setTimeout(() => {
            this.initializeStorage();
            this.setupViewToggleListeners();
            this.setupNodeSelectionListener();
            this.setupToolbarListeners();
            
            console.log('[关系管理] 前端界面初始化完成');
        }, 500);
    }
    
    /**
     * 初始化存储系统
     */
    initializeStorage() {
        if (window.UnifiedStorage) {
            this.storage = window.UnifiedStorage;
            console.log('[关系管理] ✅ 统一存储系统已连接');
        } else {
            console.warn('[关系管理] ⚠️ 统一存储系统未找到，使用降级模式');
        }
        
        // 初始化关系数据管理器
        if (window.RelationDataManager) {
            this.dataManager = new RelationDataManager(this.storage);
            console.log('[关系管理] ✅ 关系数据管理器已初始化');
        } else {
            console.error('[关系管理] ❌ 关系数据管理器未找到');
        }
    }
    
    /**
     * 设置视图切换监听器 - 实现按需激活机制
     */
    setupViewToggleListeners() {
        const viewToggles = document.querySelectorAll('.view-toggle');
        
        viewToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const viewType = e.target.getAttribute('data-view');
                
                if (viewType === 'relation') {
                    // 激活关系视图
                    this.onRelationViewActivated();
                } else if (this.isActive) {
                    // 切换到其他视图，清理关系视图
                    this.onRelationViewDeactivated();
                }
            });
        });
    }
    
    /**
     * 关系视图激活 - 按需加载数据和初始化D3.js
     */
    onRelationViewActivated() {
        console.log('[关系管理] 关系视图被激活');
        
        if (this.isActive) {
            return; // 已经激活，避免重复初始化
        }
        
        this.isActive = true;
        
        // 初始化D3.js图形组件
        this.initializeD3Graph();
        
        // 保存激活状态
        if (this.storage) {
            this.storage.saveAppState('relation_panel', {
                activated_at: Date.now(),
                last_node_id: this.currentNodeId
            });
        }
        
        // 检查当前选中的节点
        if (this.currentNodeId) {
            this.loadNodeRelations(this.currentNodeId);
        } else {
            this.showWelcomeMessage();
        }
        
        // 更新状态指示器
        this.updateRelationStatus('已激活');
    }
    
    /**
     * 关系视图清理 - 释放资源和保存状态
     */
    onRelationViewDeactivated() {
        console.log('[关系管理] 关系视图被清理');
        
        if (!this.isActive) {
            return; // 已经清理，避免重复操作
        }
        
        // 保存当前状态
        if (this.storage) {
            this.storage.saveAppState('relation_panel', {
                deactivated_at: Date.now(),
                last_node_id: this.currentNodeId,
                last_zoom: this.d3Graph?.getCurrentZoom ? this.d3Graph.getCurrentZoom() : 1.0,
                last_position: this.d3Graph?.getCurrentCenter ? this.d3Graph.getCurrentCenter() : {x: 0, y: 0}
            });
        }
        
        // 清理D3.js图形组件
        this.cleanupD3Graph();
        
        // 清理数据
        this.relationData = {
            nodes: [],
            edges: [],
            metadata: {}
        };
        
        this.isActive = false;
        
        // 更新状态指示器
        this.updateRelationStatus('未激活');
    }
    
    /**
     * 初始化D3.js图形组件
     */
    initializeD3Graph() {
        const container = document.getElementById('relation-d3-container');
        if (!container || this.d3Graph) {
            return;
        }
        
        try {
            // 隐藏占位符
            const placeholder = document.getElementById('relation-d3-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            // 创建D3.js关系图实例
            if (window.D3RelationGraph) {
                this.d3Graph = new D3RelationGraph('relation-d3-container', {
                    width: container.clientWidth,
                    height: container.clientHeight,
                    nodeRadius: 20,
                    linkDistance: 80,
                    charge: -300,
                    enableZoom: true,
                    enableDrag: true
                });
                
                // 恢复之前的状态
                if (this.storage) {
                    const savedState = this.storage.loadAppState('relation_panel');
                    if (savedState.last_zoom && this.d3Graph.setZoom) {
                        this.d3Graph.setZoom(savedState.last_zoom);
                    }
                    if (savedState.last_position && this.d3Graph.setCenter) {
                        this.d3Graph.setCenter(savedState.last_position);
                    }
                }
                
                console.log('[关系管理] D3.js图形组件初始化完成');
            } else {
                console.warn('[关系管理] D3RelationGraph类未找到');
            }
            
        } catch (error) {
            console.error('[关系管理] D3.js图形组件初始化失败:', error);
            this.showErrorMessage('图形组件初始化失败');
        }
    }
    
    /**
     * 清理D3.js图形组件
     */
    cleanupD3Graph() {
        if (this.d3Graph) {
            try {
                if (this.d3Graph.destroy) {
                    this.d3Graph.destroy();
                }
                this.d3Graph = null;
                
                // 显示占位符
                const placeholder = document.getElementById('relation-d3-placeholder');
                if (placeholder) {
                    placeholder.style.display = 'block';
                }
                
                console.log('[关系管理] D3.js图形组件已清理');
                
            } catch (error) {
                console.error('[关系管理] D3.js图形组件清理失败:', error);
            }
        }
    }
    
    setupNodeSelectionListener() {
        // 监听脑图节点选择事件
        document.addEventListener('jsmind_node_selected', (event) => {
            const nodeId = event.detail?.nodeId;
            if (nodeId) {
                this.currentNodeId = nodeId;
                console.log(`[关系管理] 节点选中: ${nodeId}`);
                
                // 如果当前在关系视图，立即加载关系
                if (this.isActive) {
                    this.loadNodeRelations(nodeId);
                }
            }
        });
    }
    
    async loadNodeRelations(nodeId) {
        console.log(`[关系管理] 加载节点关系: ${nodeId}`);
        
        if (this.isLoading || !this.isActive) {
            console.log('[关系管理] 正在加载中或视图未激活，跳过请求');
            return;
        }
        
        this.currentNodeId = nodeId;
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            let relationData = null;
            
            if (this.dataManager) {
                // 使用关系数据管理器获取数据
                relationData = await this.dataManager.getRelationData(nodeId, {
                    maxDepth: 3,
                    includeSemanticRelations: true,
                    dataSource: 'auto'
                });
            } else {
                // 降级到原有方法
                relationData = await this.generateRelationData(nodeId);
            }
            
            // 处理关系数据
            if (relationData && relationData.nodes.length > 0) {
                this.processRelationData(relationData);
                this.renderRelationView();
                
                const stats = relationData.metadata;
                this.updateRelationStatus(`✅ 已加载 ${stats.total_nodes} 节点, ${stats.total_links} 关系 (来源: ${stats.source})`);
            } else {
                this.showErrorMessage('无法获取关系数据');
            }
            
        } catch (error) {
            console.error('[关系管理] 加载关系失败:', error);
            this.showErrorMessage(error.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * 生成关系数据 - 支持多种数据源
     */
    async generateRelationData(nodeId) {
        console.log(`[关系管理] 生成关系数据: ${nodeId}`);
        
        try {
            // 1. 尝试从脑图数据提取层次关系
            const mindmapRelations = await this.extractMindmapRelations(nodeId);
            if (mindmapRelations) {
                return mindmapRelations;
            }
            
            // 2. 尝试从Neo4j获取关系数据
            const neo4jRelations = await this.fetchNeo4jRelations(nodeId);
            if (neo4jRelations) {
                return neo4jRelations;
            }
            
            // 3. 生成模拟关系数据用于演示
            return this.generateMockRelations(nodeId);
            
        } catch (error) {
            console.error('[关系管理] 生成关系数据失败:', error);
            return this.generateMockRelations(nodeId);
        }
    }
    
    /**
     * 从脑图数据提取层次关系
     */
    async extractMindmapRelations(nodeId) {
        try {
            // 获取当前脑图数据
            const mindmapData = await this.getCurrentMindmapData();
            if (!mindmapData) {
                return null;
            }
            
            const nodes = [];
            const links = [];
            
            // 递归提取节点和关系
            const extractNodeRelations = (node, parentId = null) => {
                // 添加当前节点
                nodes.push({
                    id: node.id,
                    label: node.topic || node.id,
                    type: this.getNodeType(node),
                    level: this.getNodeLevel(node, mindmapData),
                    properties: {
                        expanded: node.expanded,
                        direction: node.direction
                    }
                });
                
                // 添加父子关系
                if (parentId) {
                    links.push({
                        source: parentId,
                        target: node.id,
                        type: 'contains',
                        label: '包含',
                        value: 1.0
                    });
                }
                
                // 递归处理子节点
                if (node.children) {
                    node.children.forEach(child => {
                        extractNodeRelations(child, node.id);
                    });
                }
            };
            
            // 从根节点开始提取
            if (mindmapData.data) {
                extractNodeRelations(mindmapData.data);
            }
            
            // 过滤与当前节点相关的关系
            const relatedNodes = this.getRelatedNodes(nodeId, nodes, links);
            const relatedLinks = this.getRelatedLinks(nodeId, links);
            
            return {
                hierarchical_relations: relatedLinks,
                semantic_relations: [],
                computed_layout: {},
                nodes: relatedNodes,
                links: relatedLinks,
                metadata: {
                    source: 'mindmap_extraction',
                    extracted_at: new Date().toISOString(),
                    total_nodes: relatedNodes.length,
                    total_links: relatedLinks.length
                }
            };
            
        } catch (error) {
            console.error('[关系管理] 脑图关系提取失败:', error);
            return null;
        }
    }
    
    /**
     * 从Neo4j获取关系数据
     */
    async fetchNeo4jRelations(nodeId) {
        try {
            const response = await fetch('/api/neo4j/graph-data?node_id=' + encodeURIComponent(nodeId));
            if (response.ok) {
                const data = await response.json();
                console.log('[关系管理] 从Neo4j获取关系数据成功');
                return {
                    hierarchical_relations: [],
                    semantic_relations: data.links || [],
                    computed_layout: {},
                    nodes: data.nodes || [],
                    links: data.links || [],
                    metadata: {
                        source: 'neo4j',
                        fetched_at: new Date().toISOString()
                    }
                };
            }
        } catch (error) {
            console.warn('[关系管理] Neo4j关系数据获取失败:', error);
        }
        return null;
    }
    
    /**
     * 生成模拟关系数据用于演示
     */
    generateMockRelations(nodeId) {
        console.log(`[关系管理] 生成模拟关系数据: ${nodeId}`);
        
        const mockNodes = [
            { id: nodeId, label: '当前节点', type: 'current' },
            { id: 'related_1', label: '相关节点1', type: 'task' },
            { id: 'related_2', label: '相关节点2', type: 'resource' },
            { id: 'related_3', label: '相关节点3', type: 'milestone' }
        ];
        
        const mockLinks = [
            { source: nodeId, target: 'related_1', type: 'depends_on', label: '依赖', value: 0.8 },
            { source: nodeId, target: 'related_2', type: 'uses', label: '使用', value: 0.6 },
            { source: 'related_1', target: 'related_3', type: 'leads_to', label: '导向', value: 0.7 }
        ];
        
        return {
            hierarchical_relations: [],
            semantic_relations: mockLinks,
            computed_layout: {},
            nodes: mockNodes,
            links: mockLinks,
            metadata: {
                source: 'mock_data',
                generated_at: new Date().toISOString(),
                total_nodes: mockNodes.length,
                total_links: mockLinks.length
            }
        };
    }
    
    /**
     * 处理关系数据
     */
    processRelationData(relationData) {
        this.relationData = {
            nodes: relationData.nodes || [],
            edges: relationData.links || [],
            metadata: relationData.metadata || {}
        };
        
        console.log(`[关系管理] 处理关系数据完成: ${this.relationData.nodes.length} 节点, ${this.relationData.edges.length} 连线`);
    }
    
    /**
     * 渲染关系视图
     */
    renderRelationView() {
        // 1. 渲染关系列表
        this.renderRelationList();
        
        // 2. 渲染D3.js图形
        this.renderD3Graph();
    }
    
    /**
     * 渲染关系列表
     */
    renderRelationList() {
        const listContainer = document.getElementById('relation-list');
        if (!listContainer) return;
        
        if (this.relationData.edges.length === 0) {
            listContainer.innerHTML = '<div style="color:#888;">当前节点暂无关系数据</div>';
            return;
        }
        
        let html = '<div style="font-size:12px;margin-bottom:8px;">关系列表:</div>';
        
        this.relationData.edges.forEach(edge => {
            html += `
                <div style="padding:4px;border-bottom:1px solid #eee;font-size:12px;">
                    <strong>${edge.source}</strong> 
                    <span style="color:#666;">${edge.label || edge.type}</span> 
                    <strong>${edge.target}</strong>
                    ${edge.value ? `<span style="color:#999;">(${edge.value})</span>` : ''}
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
    }
    
    /**
     * 渲染D3.js图形
     */
    renderD3Graph() {
        if (!this.d3Graph) {
            console.warn('[关系管理] D3.js图形组件未初始化');
            return;
        }
        
        try {
            const graphData = {
                nodes: this.relationData.nodes,
                links: this.relationData.edges
            };
            
            if (this.d3Graph.loadData) {
                this.d3Graph.loadData(graphData);
                console.log('[关系管理] D3.js图形渲染完成');
            }
            
        } catch (error) {
            console.error('[关系管理] D3.js图形渲染失败:', error);
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoadingState() {
        this.updateRelationStatus('加载中...');
        
        const listContainer = document.getElementById('relation-list');
        if (listContainer) {
            listContainer.innerHTML = '<div style="color:#666;">🔄 正在加载关系数据...</div>';
        }
    }
    
    /**
     * 显示欢迎消息
     */
    showWelcomeMessage() {
        const listContainer = document.getElementById('relation-list');
        if (listContainer) {
            listContainer.innerHTML = `
                <div style="text-align:center;color:#888;padding:20px;">
                    <div style="font-size:16px;margin-bottom:10px;">🔗 关系图分析</div>
                    <div>请在左侧脑图中选择一个节点</div>
                    <div style="font-size:12px;margin-top:8px;">系统将自动分析并显示节点关系</div>
                </div>
            `;
        }
        
        this.updateRelationStatus('等待节点选择');
    }
    
    /**
     * 显示错误消息
     */
    showErrorMessage(message) {
        const listContainer = document.getElementById('relation-list');
        if (listContainer) {
            listContainer.innerHTML = `
                <div style="text-align:center;color:#f44336;padding:20px;">
                    <div style="font-size:16px;margin-bottom:10px;">❌ 加载失败</div>
                    <div>${message}</div>
                    <button onclick="window.relationFrontend.loadNodeRelations('${this.currentNodeId}')" 
                            style="margin-top:10px;padding:5px 10px;">重试</button>
                </div>
            `;
        }
        
        this.updateRelationStatus('加载失败');
    }
    
    /**
     * 更新关系状态指示器
     */
    updateRelationStatus(status) {
        const statusElement = document.getElementById('relation-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }
    
    /**
     * 设置工具栏监听器
     */
    setupToolbarListeners() {
        // 模拟数据测试按钮
        const testBtn = document.getElementById('relation-test-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.testRelationVisualization();
            });
        }
        
        // 真实数据测试按钮
        const realTestBtn = document.getElementById('relation-real-test-btn');
        if (realTestBtn) {
            realTestBtn.addEventListener('click', () => {
                this.testRealDataVisualization();
            });
        }
        
        // 刷新按钮
        const refreshBtn = document.getElementById('relation-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (this.currentNodeId && this.isActive) {
                    this.loadNodeRelations(this.currentNodeId);
                }
            });
        }
        
        // 同步按钮
        const syncBtn = document.getElementById('relation-sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.syncToNeo4j();
            });
        }
    }
    
    /**
     * 测试关系图可视化（模拟数据）
     */
    testRelationVisualization() {
        console.log('[关系管理] 🧪 开始测试关系图可视化（模拟数据）');
        
        // 强制激活关系视图
        this.onRelationViewActivated();
        
        // 生成测试数据
        const testNodeId = 'test_node_001';
        this.currentNodeId = testNodeId;
        
        // 直接加载模拟数据
        const mockData = this.generateMockRelations(testNodeId);
        this.processRelationData(mockData);
        this.renderRelationView();
        
        this.updateRelationStatus('✅ 模拟数据已加载');
        
        console.log('[关系管理] 🎉 模拟数据测试完成');
    }
    
    /**
     * 测试真实数据可视化
     */
    async testRealDataVisualization() {
        console.log('[关系管理] 📊 开始测试真实数据可视化');
        
        // 强制激活关系视图
        this.onRelationViewActivated();
        
        try {
            // 获取当前脑图的根节点
            const rootNodeId = await this.getRootNodeId();
            if (!rootNodeId) {
                throw new Error('无法获取脑图根节点ID');
            }
            
            this.currentNodeId = rootNodeId;
            this.updateRelationStatus('🔄 正在从脑图提取关系数据...');
            
            // 使用数据管理器获取真实数据
            if (this.dataManager) {
                const relationData = await this.dataManager.getRelationData(rootNodeId, {
                    maxDepth: 3,
                    includeSemanticRelations: true,
                    dataSource: 'mindmap_extraction'
                });
                
                if (relationData && relationData.nodes.length > 0) {
                    this.processRelationData(relationData);
                    this.renderRelationView();
                    
                    const stats = relationData.metadata;
                    this.updateRelationStatus(`✅ 真实数据已加载: ${stats.total_nodes} 节点, ${stats.total_links} 关系`);
                    
                    console.log('[关系管理] 🎉 真实数据测试完成', stats);
                } else {
                    throw new Error('未能提取到有效的关系数据');
                }
            } else {
                throw new Error('关系数据管理器未初始化');
            }
            
        } catch (error) {
            console.error('[关系管理] 真实数据测试失败:', error);
            this.updateRelationStatus('❌ 真实数据加载失败');
            this.showErrorMessage(`真实数据测试失败: ${error.message}`);
        }
    }
    
    /**
     * 获取脑图根节点ID
     */
    async getRootNodeId() {
        try {
            // 尝试从jsMind获取
            if (window.jm && window.jm.get_data) {
                const data = window.jm.get_data();
                if (data && data.data && data.data.id) {
                    return data.data.id;
                }
            }
            
            // 尝试从统一存储获取
            if (this.storage) {
                const appState = this.storage.loadAppState('mindmap_editor');
                if (appState.last_edited_mindmap) {
                    return appState.last_edited_mindmap;
                }
            }
            
            return null;
        } catch (error) {
            console.error('[关系管理] 获取根节点ID失败:', error);
            return null;
        }
    }
    
    /**
     * 同步到Neo4j
     */
    async syncToNeo4j() {
        console.log('[关系管理] 同步数据到Neo4j');
        // 这里可以实现同步逻辑
        alert('Neo4j同步功能开发中...');
    }
    
    // ==================== 辅助方法 ====================
    
    /**
     * 获取当前脑图数据
     */
    async getCurrentMindmapData() {
        try {
            // 尝试从jsMind获取当前数据
            if (window.jm && window.jm.get_data) {
                return window.jm.get_data();
            }
            
            // 尝试从统一存储获取
            if (this.storage && this.currentNodeId) {
                return await this.storage.loadMindmap(this.currentNodeId);
            }
            
            return null;
        } catch (error) {
            console.error('[关系管理] 获取脑图数据失败:', error);
            return null;
        }
    }
    
    /**
     * 获取节点类型
     */
    getNodeType(node) {
        // 根据节点属性判断类型
        if (node.id && node.id.includes('root')) return 'project';
        if (node.topic && node.topic.includes('任务')) return 'task';
        if (node.topic && node.topic.includes('资源')) return 'resource';
        if (node.topic && node.topic.includes('里程碑')) return 'milestone';
        return 'default';
    }
    
    /**
     * 获取节点层级
     */
    getNodeLevel(node, mindmapData) {
        // 简单的层级计算
        return 1; // 可以根据需要实现更复杂的层级计算
    }
    
    /**
     * 获取相关节点
     */
    getRelatedNodes(nodeId, allNodes, allLinks) {
        const relatedNodeIds = new Set([nodeId]);
        
        // 添加直接相关的节点
        allLinks.forEach(link => {
            if (link.source === nodeId) {
                relatedNodeIds.add(link.target);
            }
            if (link.target === nodeId) {
                relatedNodeIds.add(link.source);
            }
        });
        
        return allNodes.filter(node => relatedNodeIds.has(node.id));
    }
    
    /**
     * 获取相关连线
     */
    getRelatedLinks(nodeId, allLinks) {
        return allLinks.filter(link => 
            link.source === nodeId || link.target === nodeId
        );
    }
}

// 创建全局实例
window.relationFrontend = new RelationFrontend();

console.log('[关系管理] RelationFrontend 已初始化');
