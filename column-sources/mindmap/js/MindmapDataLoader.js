/**
 * 脑图数据加载器
 * 负责初始数据加载、测试数据加载
 * 
 * @author 程序员
 * @date 2025-10-07
 * @version 1.0
 * 
 * Phase 2.1 - Task 2.1.3: 核心模块拆分 - 数据加载器
 */

class MindmapDataLoader {
    constructor(jm, storageCoordinator, uiManager, errorHandler) {
        this.jm = jm;
        this.storage = storageCoordinator;
        this.uiManager = uiManager;
        this.errorHandler = errorHandler;
    }
    
    /**
     * 加载初始数据
     */
    async loadInitialData() {
        try {
            // 使用存储协调器加载数据
            if (this.storage) {
                const stored = await this.storage.loadMindmap('current');
                
                // 检查是否有实际数据
                const hasRealData = stored && stored.data && (
                    (stored.data.children && stored.data.children.length > 0) ||
                    (stored.meta && stored.meta.name && stored.meta.name !== 'default_mindmap')
                );
                
                if (hasRealData) {
                    this.jm.show(stored);
                    
                    if (this.uiManager) {
                        this.uiManager.updateNodeCount();
                    }
                    
                    console.log('[DataLoader] ✅ 已从存储加载数据');
                    return true;
                }
            }
            
            // 尝试加载初始数据文件
            try {
                const response = await fetch('mindmap_base.json');
                if (response.ok) {
                    const data = await response.json();
                    
                    // 初始化所有节点的data.content字段
                    this.initNodeData(data.data);
                    
                    this.jm.show(data);
                    
                    if (this.uiManager) {
                        this.uiManager.updateNodeCount();
                    }
                    
                    console.log('[DataLoader] ✅ 已加载初始数据文件');
                    
                    // 保存到存储
                    if (this.storage) {
                        await this.storage.saveMindmap(this.jm.get_data(), true);
                    }
                    
                    return true;
                }
            } catch (fileErr) {
                console.log('[DataLoader] 初始数据文件加载失败:', fileErr.message);
            }
            
            // 加载测试数据
            console.warn('[DataLoader] 未找到数据，加载测试数据');
            this.loadTestData();
            return false;
            
        } catch (error) {
            if (this.errorHandler) {
                this.errorHandler.handle(error, {
                    component: 'MindmapDataLoader',
                    action: 'loadInitialData'
                }, { silent: true });
            }
            console.error('[DataLoader] 加载失败，回退到测试数据:', error);
            this.loadTestData();
            return false;
        }
    }
    
    /**
     * 初始化节点数据
     */
    initNodeData(node) {
        if (!node) return;
        if (!node.data) node.data = {};
        if (!node.data.content) node.data.content = '';
        
        if (node.children) {
            node.children.forEach(child => this.initNodeData(child));
        }
    }
    
    /**
     * 加载测试数据
     */
    loadTestData() {
        const testData = {
            meta: {
                name: '测试脑图',
                author: 'test',
                version: '1.0'
            },
            format: 'node_tree',
            data: {
                id: 'root',
                topic: '中心主题',
                expanded: true,
                children: [
                    {
                        id: 'sub1',
                        topic: '子主题1',
                        direction: 'right',
                        expanded: true,
                        children: [
                            { id: 'sub11', topic: '子主题1-1', direction: 'right' },
                            { id: 'sub12', topic: '子主题1-2', direction: 'right' }
                        ]
                    },
                    {
                        id: 'sub2',
                        topic: '子主题2',
                        direction: 'right',
                        children: [
                            { id: 'sub21', topic: '子主题2-1', direction: 'right' }
                        ]
                    },
                    {
                        id: 'sub3',
                        topic: '子主题3',
                        direction: 'right'
                    }
                ]
            }
        };
        
        this.jm.show(testData);
        
        if (this.uiManager) {
            this.uiManager.updateNodeCount();
        }
        
        console.log('[DataLoader] ✅ 测试数据已加载');
    }
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.MindmapDataLoader = MindmapDataLoader;
}

// 支持模块化导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindmapDataLoader;
}
