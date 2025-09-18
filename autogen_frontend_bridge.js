/**
 * AutoGen前端桥接器
 * 连接前端JavaScript与AutoGen Python后端的桥接层
 */

class AutoGenFrontendBridge {
    constructor() {
        this.pythonProcess = null;
        this.isInitialized = false;
        this.eventCallbacks = new Map();
        
        // 初始化桥接器
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('初始化AutoGen前端桥接器...');
            
            // 检查Python环境和依赖
            const pythonCheck = await this.checkPythonEnvironment();
            if (!pythonCheck.success) {
                console.error('Python环境检查失败:', pythonCheck.error);
                return false;
            }
            
            // 启动Python后端服务
            await this.startPythonBackend();
            
            this.isInitialized = true;
            console.log('AutoGen前端桥接器初始化成功');
            
            // 触发初始化完成事件
            this.emit('initialized', { success: true });
            
            return true;
            
        } catch (error) {
            console.error('AutoGen桥接器初始化失败:', error);
            this.emit('initialized', { success: false, error: error.message });
            return false;
        }
    }
    
    async checkPythonEnvironment() {
        try {
            // 检查Python是否可用
            const pythonVersion = await this.runPythonCommand('python --version');
            console.log('Python版本:', pythonVersion);
            
            // 检查AutoGen依赖
            const autogenCheck = await this.runPythonCommand('python -c "import autogen_ext; print(\'AutoGen可用\')"');
            console.log('AutoGen检查:', autogenCheck);
            
            return { success: true };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async startPythonBackend() {
        try {
            console.log('启动AutoGen Python后端...');
            
            // 这里应该启动Python HTTP服务或WebSocket服务
            // 暂时使用模拟实现
            this.pythonProcess = {
                status: 'running',
                pid: Date.now()
            };
            
            console.log('Python后端启动成功');
            
        } catch (error) {
            console.error('启动Python后端失败:', error);
            throw error;
        }
    }
    
    async runPythonCommand(command) {
        // 模拟Python命令执行
        // 实际实现中应该使用child_process或fetch API
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (command.includes('--version')) {
                    resolve('Python 3.9.0');
                } else if (command.includes('import autogen_ext')) {
                    resolve('AutoGen可用');
                } else {
                    resolve('命令执行成功');
                }
            }, 100);
        });
    }
    
    // AutoGen脑图控制器接口
    async createNewMindmap(name = '新建项目') {
        if (!this.isInitialized) {
            throw new Error('AutoGen桥接器未初始化');
        }
        
        try {
            const result = await this.callPythonMethod('js_create_new_mindmap', { name });
            return JSON.parse(result);
        } catch (error) {
            console.error('创建新脑图失败:', error);
            throw error;
        }
    }
    
    async loadProject(projectId) {
        if (!this.isInitialized) {
            throw new Error('AutoGen桥接器未初始化');
        }
        
        try {
            const result = await this.callPythonMethod('js_load_project', { project_id: projectId });
            return JSON.parse(result);
        } catch (error) {
            console.error('加载项目失败:', error);
            throw error;
        }
    }
    
    async saveMindmap() {
        if (!this.isInitialized) {
            throw new Error('AutoGen桥接器未初始化');
        }
        
        try {
            const result = await this.callPythonMethod('js_save_mindmap', {});
            return JSON.parse(result);
        } catch (error) {
            console.error('保存脑图失败:', error);
            throw error;
        }
    }
    
    async searchProjects(query, limit = 10) {
        if (!this.isInitialized) {
            throw new Error('AutoGen桥接器未初始化');
        }
        
        try {
            const result = await this.callPythonMethod('js_search_projects', { query, limit });
            return JSON.parse(result);
        } catch (error) {
            console.error('搜索项目失败:', error);
            throw error;
        }
    }
    
    async getAllProjects() {
        if (!this.isInitialized) {
            throw new Error('AutoGen桥接器未初始化');
        }
        
        try {
            const result = await this.callPythonMethod('js_get_all_projects', {});
            return JSON.parse(result);
        } catch (error) {
            console.error('获取所有项目失败:', error);
            throw error;
        }
    }
    
    async callPythonMethod(methodName, params) {
        // 模拟Python方法调用
        // 实际实现中应该通过HTTP API或WebSocket与Python后端通信
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                switch (methodName) {
                    case 'js_create_new_mindmap':
                        resolve(JSON.stringify({
                            id: `project_${Date.now()}`,
                            name: params.name,
                            payload: {
                                data: {
                                    id: 'root',
                                    label: params.name,
                                    children: []
                                }
                            }
                        }));
                        break;
                    case 'js_load_project':
                        resolve(JSON.stringify({
                            id: params.project_id,
                            name: '加载的项目',
                            payload: { data: { id: 'root', label: '加载的项目' } }
                        }));
                        break;
                    case 'js_save_mindmap':
                        resolve(JSON.stringify({ success: true }));
                        break;
                    case 'js_search_projects':
                        resolve(JSON.stringify([
                            { name: '搜索结果1', relevance_score: 0.9 },
                            { name: '搜索结果2', relevance_score: 0.8 }
                        ]));
                        break;
                    case 'js_get_all_projects':
                        resolve(JSON.stringify([
                            { id: 'p1', name: '项目1' },
                            { id: 'p2', name: '项目2' }
                        ]));
                        break;
                    default:
                        reject(new Error(`未知方法: ${methodName}`));
                }
            }, 200);
        });
    }
    
    // 事件系统
    on(event, callback) {
        if (!this.eventCallbacks.has(event)) {
            this.eventCallbacks.set(event, []);
        }
        this.eventCallbacks.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.eventCallbacks.has(event)) {
            const callbacks = this.eventCallbacks.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.eventCallbacks.has(event)) {
            this.eventCallbacks.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件回调执行失败 [${event}]:`, error);
                }
            });
        }
    }
    
    // 数据迁移接口
    async migrateData() {
        if (!this.isInitialized) {
            throw new Error('AutoGen桥接器未初始化');
        }
        
        try {
            console.log('开始数据迁移...');
            const result = await this.callPythonMethod('migrate_data', {});
            console.log('数据迁移完成:', result);
            return JSON.parse(result);
        } catch (error) {
            console.error('数据迁移失败:', error);
            throw error;
        }
    }
    
    // 获取存储统计
    async getStorageStats() {
        if (!this.isInitialized) {
            throw new Error('AutoGen桥接器未初始化');
        }
        
        try {
            const result = await this.callPythonMethod('get_storage_stats', {});
            return JSON.parse(result);
        } catch (error) {
            console.error('获取存储统计失败:', error);
            throw error;
        }
    }
}

// 全局AutoGen桥接器实例
window.autoGenBridge = new AutoGenFrontendBridge();

// 兼容性适配器 - 保持与原有MindmapController接口的兼容性
class AutoGenMindmapControllerAdapter {
    constructor() {
        this.bridge = window.autoGenBridge;
        this.data = null;
        this.jsmind = null;
        
        // 等待桥接器初始化
        this.bridge.on('initialized', (result) => {
            if (result.success) {
                console.log('AutoGen脑图控制器适配器就绪');
            } else {
                console.error('AutoGen桥接器初始化失败，回退到本地模式');
                this.fallbackToLocalMode();
            }
        });
    }
    
    // 设置jsMind实例
    setJsMindInstance(jsmind) {
        this.jsmind = jsmind;
    }
    
    // 获取默认数据
    getDefaultData() {
        return {
            id: 'root',
            label: '项目脑图',
            content: '# 根节点\n\n在此编写内容...',
            expanded: true,
            children: [
                { id: 'n1', label: '需求', content: '需求说明...', children: [] },
                { id: 'n2', label: '设计', content: '设计说明...', children: [] },
                { id: 'n3', label: '开发', content: '开发计划...', children: [] },
            ],
        };
    }
    
    // 创建新脑图
    async createNewMindmap(name = '新建项目') {
        try {
            if (this.bridge.isInitialized) {
                const result = await this.bridge.createNewMindmap(name);
                this.data = result.payload.data;
                return result;
            } else {
                // 回退到本地模式
                return this.createLocalMindmap(name);
            }
        } catch (error) {
            console.error('创建新脑图失败，使用本地模式:', error);
            return this.createLocalMindmap(name);
        }
    }
    
    // 本地模式创建脑图
    createLocalMindmap(name) {
        this.data = this.getDefaultData();
        this.data.label = name;
        
        return {
            id: `local_${Date.now()}`,
            name: name,
            payload: {
                meta: { name: name },
                format: 'node_tree',
                data: this.data
            }
        };
    }
    
    // 保存脑图
    async saveMindmapToStorage() {
        try {
            if (this.bridge.isInitialized) {
                const result = await this.bridge.saveMindmap();
                return result.success;
            } else {
                // 回退到localStorage
                localStorage.setItem('current_mindmap', JSON.stringify(this.data));
                return true;
            }
        } catch (error) {
            console.error('保存失败，使用localStorage:', error);
            localStorage.setItem('current_mindmap', JSON.stringify(this.data));
            return true;
        }
    }
    
    // 渲染脑图
    renderMindmap() {
        if (this.jsmind && this.data) {
            const jsmindData = this.toJsMindTree(this.data);
            this.jsmind.show(jsmindData);
        }
    }
    
    // 转换为jsMind格式
    toJsMindTree(data) {
        function convertNode(node) {
            const jsmindNode = {
                id: node.id,
                topic: node.label || node.topic || '',
                expanded: node.expanded !== false
            };
            
            if (node.children && node.children.length > 0) {
                jsmindNode.children = node.children.map(convertNode);
            }
            
            return jsmindNode;
        }
        
        return {
            meta: { name: data.label || '脑图', version: '1.0' },
            format: 'node_tree',
            data: convertNode(data)
        };
    }
    
    // 设置选中节点
    setSelectedNode(nodeId) {
        if (this.jsmind) {
            this.jsmind.select_node(nodeId);
        }
    }
    
    // 回退到本地模式
    fallbackToLocalMode() {
        console.log('启用本地存储模式');
        // 可以在这里实现本地存储的逻辑
    }
    
    // 搜索项目
    async searchProjects(query) {
        try {
            if (this.bridge.isInitialized) {
                return await this.bridge.searchProjects(query);
            } else {
                // 本地搜索逻辑
                return [];
            }
        } catch (error) {
            console.error('搜索失败:', error);
            return [];
        }
    }
}

// 替换全局MindmapController
window.MindmapController = AutoGenMindmapControllerAdapter;

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AutoGenFrontendBridge,
        AutoGenMindmapControllerAdapter
    };
}
