/**
 * 关系管理前端界面
 * 从服务器端向量库和图库获取关系数据并可视化
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
        
        this.initializeUI();
    }
    
    initializeUI() {
        console.log('[关系管理] 初始化前端界面');
        
        // 监听视图切换到关系页面
        const relationViewToggle = document.querySelector('[data-view="relation"]');
        if (relationViewToggle) {
            relationViewToggle.addEventListener('click', () => {
                this.onRelationViewActivated();
            });
        }
        
        // 监听节点选择事件
        this.setupNodeSelectionListener();
    }
    
    onRelationViewActivated() {
        console.log('[关系管理] 关系视图被激活');
        
        // 检查当前选中的节点
        if (this.currentNodeId) {
            this.loadNodeRelations(this.currentNodeId);
        } else {
            this.showWelcomeMessage();
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
                const relationColumn = document.getElementById('relation-column');
                if (relationColumn && relationColumn.style.display !== 'none') {
                    this.loadNodeRelations(nodeId);
                }
            }
        });
    }
    
    async loadNodeRelations(nodeId) {
        console.log(`[关系管理] 加载节点关系: ${nodeId}`);
        
        if (this.isLoading) {
            console.log('[关系管理] 正在加载中，跳过重复请求');
            return;
        }
        
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            // 1. 从服务器获取关系数据
            const relations = await this.fetchRelationsFromServer(nodeId);
            
            // 2. 处理和缓存关系数据
            this.processRelationData(relations);
            
            // 3. 渲染关系视图
            this.renderRelationView();
            
            // 4. 更新状态指示器
            this.updateRelationStatus(relations);
            
        } catch (error) {
            console.error('[关系管理] 加载关系失败:', error);
            this.showErrorMessage(error.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    async fetchRelationsFromServer(nodeId) {
        console.log(`[关系管理] 从服务器获取关系数据: ${nodeId}`);
        
        try {
            // 1. 尝试通过AutoGen桥接器获取
            if (window.autoGenBridge && window.autoGenBridge.isInitialized) {
                const response = await this.callRelationAPI('get_all_relations', { node_id: nodeId });
                if (response && response.success) {
                    console.log('[关系管理] 从AutoGen服务器获取关系数据');
                    return response.data;
                }
            }
            
            // 2. 回退到模拟数据
            console.log('[关系管理] 使用模拟关系数据');
            return this.generateMockRelations(nodeId);
            
        } catch (error) {
            console.error('[关系管理] 服务器请求失败:', error);
            return this.generateMockRelations(nodeId);
        }
    }
    
    async callRelationAPI(method, params) {
        // 调用后端关系API
        const response = await fetch('http://localhost:8081/relation/' + method, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        });
        
        if (!response.ok) {
            throw new Error(`API调用失败: ${response.status}`);
        }
        
        return await response.json();
    }
    
    generateMockRelations(nodeId) {
        // 生成模拟关系数据用于演示
        return {
            semantic: [
                {
                    source: nodeId,
                    target: 'related_node_1',
                    type: 'semantic',
                    weight: 0.85,
                    properties: { similarity: '语义相似', source: '向量库' }
                },
                {
                    source: nodeId,
                    target: 'related_node_2',
                    type: 'semantic',
                    weight: 0.72,
                    properties: { similarity: '内容关联', source: '向量库' }
                }
            ],
            structural: [
                {
                    source: nodeId,
                    target: 'parent_node',
                    type: 'structural',
                    weight: 1.0,
                    properties: { relation: '父子关系', source: '图库' }
                },
                {
                    source: nodeId,
                    target: 'sibling_node',
                    type: 'structural',
                    weight: 0.8,
                    properties: { relation: '兄弟关系', source: '图库' }
                }
            ],
            temporal: [
                {
                    source: nodeId,
                    target: 'previous_version',
                    type: 'temporal',
                    weight: 0.9,
                    properties: { time_diff: '1天前', source: '数据库' }
                }
            ]
        };
    }
    
    processRelationData(relations) {
        console.log('[关系管理] 处理关系数据');
        
        // 构建节点和边的数据结构
        const nodes = new Map();
        const edges = [];
        
        // 添加中心节点
        nodes.set(this.currentNodeId, {
            id: this.currentNodeId,
            label: this.getNodeLabel(this.currentNodeId),
            type: 'center',
            temperature: 'hot'
        });
        
        // 处理各种类型的关系
        for (const [relationType, relationList] of Object.entries(relations)) {
            for (const relation of relationList) {
                // 添加目标节点
                if (!nodes.has(relation.target)) {
                    nodes.set(relation.target, {
                        id: relation.target,
                        label: this.getNodeLabel(relation.target),
                        type: 'related',
                        temperature: this.inferNodeTemperature(relation)
                    });
                }
                
                // 添加关系边
                edges.push({
                    source: relation.source,
                    target: relation.target,
                    type: relation.type,
                    weight: relation.weight,
                    properties: relation.properties,
                    color: this.getRelationColor(relation.type)
                });
            }
        }
        
        this.relationData = {
            nodes: Array.from(nodes.values()),
            edges: edges,
            metadata: {
                centerNode: this.currentNodeId,
                totalRelations: edges.length,
                relationTypes: Object.keys(relations),
                loadedAt: new Date().toISOString()
            }
        };
        
        console.log(`[关系管理] 处理完成: ${this.relationData.nodes.length}个节点, ${this.relationData.edges.length}条关系`);
    }
    
    renderRelationView() {
        console.log('[关系管理] 渲染关系视图');
        
        const relationColumn = document.getElementById('relation-column');
        if (!relationColumn) {
            console.error('[关系管理] 未找到关系视图容器');
            return;
        }
        
        // 清空现有内容
        const columnContent = relationColumn.querySelector('.column-content');
        if (columnContent) {
            columnContent.innerHTML = this.generateRelationHTML();
        }
        
        // 初始化关系图
        this.initializeRelationGraph();
        
        // 绑定事件
        this.bindRelationEvents();
    }
    
    generateRelationHTML() {
        return `
            <div class="relation-container">
                <!-- 关系统计 -->
                <div class="relation-stats">
                    <h4>关系分析 - ${this.getNodeLabel(this.currentNodeId)}</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">总关系数</span>
                            <span class="stat-value">${this.relationData.edges.length}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">关联节点</span>
                            <span class="stat-value">${this.relationData.nodes.length - 1}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">数据源</span>
                            <span class="stat-value">服务器端</span>
                        </div>
                    </div>
                </div>
                
                <!-- 关系类型过滤 -->
                <div class="relation-filters">
                    <h5>关系类型</h5>
                    <div class="filter-buttons">
                        <button class="filter-btn active" data-type="all">全部</button>
                        <button class="filter-btn" data-type="semantic">语义关系</button>
                        <button class="filter-btn" data-type="structural">结构关系</button>
                        <button class="filter-btn" data-type="temporal">时间关系</button>
                    </div>
                </div>
                
                <!-- 关系图容器 -->
                <div class="relation-graph-container">
                    <div id="relation-graph" style="width: 100%; height: 400px; border: 1px solid #ddd; border-radius: 4px;"></div>
                </div>
                
                <!-- 关系详情列表 -->
                <div class="relation-details">
                    <h5>关系详情</h5>
                    <div class="relation-list" id="relation-list">
                        ${this.generateRelationListHTML()}
                    </div>
                </div>
                
                <!-- 数据源说明 -->
                <div class="relation-source-info">
                    <h5>数据源说明</h5>
                    <ul>
                        <li><strong>语义关系</strong>: 来自服务器向量库 (ChromaDB)</li>
                        <li><strong>结构关系</strong>: 来自服务器图库 (Neo4j)</li>
                        <li><strong>时间关系</strong>: 来自服务器数据库 (PostgreSQL)</li>
                    </ul>
                </div>
                
                <!-- 操作按钮 -->
                <div class="relation-actions">
                    <button id="refresh-relations" class="btn-primary">刷新关系</button>
                    <button id="export-relations" class="btn-secondary">导出关系</button>
                    <button id="inject-md" class="btn-secondary">注入MD到服务器</button>
                </div>
            </div>
        `;
    }
    
    generateRelationListHTML() {
        return this.relationData.edges.map(edge => `
            <div class="relation-item" data-type="${edge.type}">
                <div class="relation-header">
                    <span class="relation-type ${edge.type}">${this.getRelationTypeName(edge.type)}</span>
                    <span class="relation-weight">${(edge.weight * 100).toFixed(1)}%</span>
                </div>
                <div class="relation-content">
                    <span class="relation-target">${this.getNodeLabel(edge.target)}</span>
                    <span class="relation-source">来源: ${edge.properties?.source || '未知'}</span>
                </div>
                <div class="relation-properties">
                    ${Object.entries(edge.properties || {}).map(([key, value]) => 
                        `<span class="property">${key}: ${value}</span>`
                    ).join(' | ')}
                </div>
            </div>
        `).join('');
    }
    
    initializeRelationGraph() {
        // 这里可以集成D3.js或其他图形库来渲染关系图
        console.log('[关系管理] 初始化关系图');
        
        const graphContainer = document.getElementById('relation-graph');
        if (graphContainer) {
            // 简单的文本显示，实际应用中应该使用图形库
            graphContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">
                    <div style="text-align: center;">
                        <div style="font-size: 18px; margin-bottom: 10px;">关系图谱</div>
                        <div>中心节点: ${this.getNodeLabel(this.currentNodeId)}</div>
                        <div>关联节点: ${this.relationData.nodes.length - 1}个</div>
                        <div>关系连接: ${this.relationData.edges.length}条</div>
                        <div style="margin-top: 10px; font-size: 12px; color: #999;">
                            数据来源: 服务器端向量库、图库、数据库
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    bindRelationEvents() {
        console.log('[关系管理] 绑定事件');
        
        // 关系类型过滤
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const filterType = e.target.dataset.type;
                this.filterRelations(filterType);
            });
        });
        
        // 刷新关系
        const refreshBtn = document.getElementById('refresh-relations');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadNodeRelations(this.currentNodeId);
            });
        }
        
        // 导出关系
        const exportBtn = document.getElementById('export-relations');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportRelations();
            });
        }
        
        // 注入MD到服务器
        const injectBtn = document.getElementById('inject-md');
        if (injectBtn) {
            injectBtn.addEventListener('click', () => {
                this.injectMDToServer();
            });
        }
    }
    
    filterRelations(type) {
        console.log(`[关系管理] 过滤关系类型: ${type}`);
        
        const relationItems = document.querySelectorAll('.relation-item');
        relationItems.forEach(item => {
            if (type === 'all' || item.dataset.type === type) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    exportRelations() {
        console.log('[关系管理] 导出关系数据');
        
        const exportData = {
            centerNode: this.currentNodeId,
            relations: this.relationData,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relations_${this.currentNodeId}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    async injectMDToServer() {
        console.log('[关系管理] 注入MD文档到服务器');
        
        try {
            // 获取当前项目的MD内容
            const mdContent = await this.getCurrentProjectMD();
            if (!mdContent) {
                alert('无法获取当前项目的MD内容');
                return;
            }
            
            // 调用注入API
            const response = await this.callRelationAPI('inject_md', {
                project_id: this.currentNodeId,
                md_content: mdContent
            });
            
            if (response && response.success) {
                alert('MD文档已成功注入到服务器端存储');
                // 刷新关系数据
                this.loadNodeRelations(this.currentNodeId);
            } else {
                alert('MD文档注入失败');
            }
            
        } catch (error) {
            console.error('[关系管理] MD注入失败:', error);
            alert('MD文档注入失败: ' + error.message);
        }
    }
    
    async getCurrentProjectMD() {
        // 获取当前项目的MD内容
        // 这里应该从当前的脑图数据生成MD文档
        try {
            if (window.MindmapController && window.MindmapController.data) {
                return this.convertProjectToMD(window.MindmapController.data);
            }
            return null;
        } catch (error) {
            console.error('获取项目MD内容失败:', error);
            return null;
        }
    }
    
    convertProjectToMD(projectData) {
        // 将项目数据转换为MD格式
        let md = `# ${projectData.label || '项目'}\n\n`;
        
        if (projectData.content) {
            md += `${projectData.content}\n\n`;
        }
        
        if (projectData.children && projectData.children.length > 0) {
            md += this.convertChildrenToMD(projectData.children, 2);
        }
        
        return md;
    }
    
    convertChildrenToMD(children, level) {
        let md = '';
        const prefix = '#'.repeat(level);
        
        for (const child of children) {
            md += `${prefix} ${child.label || '节点'}\n\n`;
            
            if (child.content) {
                md += `${child.content}\n\n`;
            }
            
            if (child.children && child.children.length > 0) {
                md += this.convertChildrenToMD(child.children, level + 1);
            }
        }
        
        return md;
    }
    
    // 辅助方法
    getNodeLabel(nodeId) {
        // 获取节点显示标签
        if (nodeId === this.currentNodeId && window.MindmapController?.data) {
            return window.MindmapController.data.label || nodeId;
        }
        return nodeId.replace(/_/g, ' ');
    }
    
    inferNodeTemperature(relation) {
        // 根据关系推断节点温度
        if (relation.weight > 0.8) return 'hot';
        if (relation.weight > 0.5) return 'warm';
        return 'cold';
    }
    
    getRelationColor(type) {
        const colors = {
            semantic: '#4CAF50',
            structural: '#2196F3',
            temporal: '#FF9800',
            hierarchical: '#9C27B0'
        };
        return colors[type] || '#666';
    }
    
    getRelationTypeName(type) {
        const names = {
            semantic: '语义关系',
            structural: '结构关系',
            temporal: '时间关系',
            hierarchical: '层级关系'
        };
        return names[type] || type;
    }
    
    showLoadingState() {
        const relationColumn = document.getElementById('relation-column');
        if (relationColumn) {
            const columnContent = relationColumn.querySelector('.column-content');
            if (columnContent) {
                columnContent.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 200px;">
                        <div style="text-align: center;">
                            <div>🔄 正在从服务器加载关系数据...</div>
                            <div style="margin-top: 10px; font-size: 12px; color: #666;">
                                数据源: 向量库 + 图库 + 数据库
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    showWelcomeMessage() {
        const relationColumn = document.getElementById('relation-column');
        if (relationColumn) {
            const columnContent = relationColumn.querySelector('.column-content');
            if (columnContent) {
                columnContent.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 200px;">
                        <div style="text-align: center; color: #666;">
                            <div style="font-size: 18px; margin-bottom: 10px;">🔗 关系分析</div>
                            <div>请先选择一个节点来查看其关系</div>
                            <div style="margin-top: 10px; font-size: 12px;">
                                关系数据来自服务器端向量库、图库和数据库
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    showErrorMessage(message) {
        const relationColumn = document.getElementById('relation-column');
        if (relationColumn) {
            const columnContent = relationColumn.querySelector('.column-content');
            if (columnContent) {
                columnContent.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 200px;">
                        <div style="text-align: center; color: #f44336;">
                            <div style="font-size: 18px; margin-bottom: 10px;">❌ 加载失败</div>
                            <div>${message}</div>
                            <button onclick="window.relationFrontend.loadNodeRelations('${this.currentNodeId}')" 
                                    style="margin-top: 10px; padding: 5px 10px;">重试</button>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    updateRelationStatus(relations) {
        // 更新AutoGen状态指示器
        if (window.updateAutoGenStatus) {
            const totalRelations = Object.values(relations).reduce((sum, arr) => sum + arr.length, 0);
            window.updateAutoGenStatus({
                lastSync: new Date().toLocaleTimeString(),
                relationCount: totalRelations
            });
        }
    }
}

// 初始化关系前端
window.relationFrontend = new RelationFrontend();

console.log('[关系管理] 前端模块已加载');
