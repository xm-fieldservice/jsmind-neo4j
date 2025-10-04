// 脑图节点操作统一API
class MindmapOperations {
    constructor(jm) {
        this.jm = jm;
        this.clipboard = new NodeClipboard();  // 初始化剪贴板
        console.log('[脑图工作栏] 初始化统一节点操作API - 真正统一化架构');
    }

    // ==================== 统一核心引擎 ====================
    
    /**
     * 统一节点创建核心引擎
     * 所有节点创建操作的唯一真实路径
     * @param {Object} params - 节点创建参数
     * @returns {Object} 创建的节点对象
     */
    _createNodeCore(params) {
        const {
            parent = null,
            topic = '新节点',
            direction = 'right',
            position = 'child', // 'child' | 'brother'
            selectedNode = null,
            customData = {}
        } = params;

        try {
            // 1. 生成节点ID（统一）
            const nodeId = this._generateNodeId();

            // 2. 创建时间戳（统一）
            const timestamp = this.getTimestamp();

            // 3. 基础数据准备（统一）
            const nodeData = {
                direction: direction,
                ...customData
            };

            // 4. 根据位置类型选择jsMind API
            let node;
            if (position === 'child') {
                // 创建子节点
                node = this.jm.add_node(parent, nodeId, topic, nodeData);
            } else if (position === 'brother') {
                // 创建兄弟节点
                if (selectedNode) {
                    node = this.jm.insert_node_after(selectedNode, nodeId, topic);
                    if (node) {
                        node.direction = direction; // 设置方向
                    }
                } else {
                    throw new Error('创建兄弟节点需要指定selectedNode');
                }
            }

            // 5. 统一后置处理（关键！所有路径必经）
            if (node) {
                return this._postProcessNode(node, timestamp, position);
            }

            return null;
        } catch (error) {
            console.error('[脑图工作栏] 节点创建失败:', error);
            return null;
        }
    }

    /**
     * 统一节点后置处理
     * 所有节点创建后必须执行的标准化处理
     * @param {Object} node - 创建的节点
     * @param {string} timestamp - 时间戳
     * @param {string} position - 创建位置类型
     * @returns {Object} 处理后的节点
     */
    _postProcessNode(node, timestamp, position) {
        // 1. 设置内容（时间戳 + 两行空行）- 统一处理
        if (!node.data) node.data = {};
        node.data.content = timestamp + '\n\n\n';

        // 2. 选择节点 - 统一处理
        this.jm.select_node(node.id);

        // 3. 进入编辑模式 - 统一处理
        this.jm.begin_edit(node.id);
        
        // 4. 触发统一事件
        this._triggerNodeCreatedEvent(node, position);
        
        console.log('[脑图工作栏] 统一核心: 节点创建成功', node.id, '类型:', position, '时间戳:', timestamp);

        return node;
    }

    /**
     * 触发节点创建事件
     * 统一的事件通知机制
     * @param {Object} node - 创建的节点
     * @param {string} position - 创建位置类型
     */
    _triggerNodeCreatedEvent(node, position) {
        // 触发统一事件，供其他模块监听
        if (window.AutogenEventBus) {
            window.AutogenEventBus.emit('node:created', {
                nodeId: node.id,
                topic: node.topic,
                position: position,
                timestamp: this.getTimestamp()
            });
        }
    }

    /**
     * 生成唯一节点ID
     * @returns {string} 节点ID
     */
    _generateNodeId() {
        return 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ==================== 统一对外API ====================
    
    /**
     * 添加子节点 - 统一API（对应Tab键）
     * @param {Object} parentNode - 父节点（可选，默认使用选中节点）
     * @returns {Object} 创建的节点
     */
    addChild(parentNode = null) {
        console.log('[脑图工作栏] 统一API: 添加子节点');
        const selected = parentNode || this.jm.get_selected_node();
        if (!selected) {
            console.warn('[脑图工作栏] 统一API: 添加子节点失败 - 未选中节点');
            return null;
        }

        return this._createNodeCore({
            parent: selected,
            topic: '新节点',
            direction: 'right',
            position: 'child'
        });
    }
    
    /**
     * 添加兄弟节点 - 统一API（对应Enter键）
     * @param {Object} selectedNode - 选中节点（可选，默认使用当前选中节点）
     * @returns {Object} 创建的节点
     */
    addBrother(selectedNode = null) {
        console.log('[脑图工作栏] 统一API: 添加兄弟节点');
        const selected = selectedNode || this.jm.get_selected_node();
        if (!selected || selected.isroot) {
            console.warn('[脑图工作栏] 统一API: 添加兄弟节点失败 - 未选中节点或选择了根节点');
            return null;
        }

        return this._createNodeCore({
            selectedNode: selected,
            topic: '新节点',
            direction: 'right',
            position: 'brother'
        });
    }
    
    /**
     * 添加自定义节点 - 统一API（对应按钮）
     * @param {Object} parent - 父节点
     * @param {string} topic - 节点主题
     * @param {Object} data - 自定义数据（注意：不再接收外部时间戳）
     * @returns {Object} 创建的节点
     */
    addCustomNode(parent, topic = '新节点', data = {}) {
        console.log('[脑图工作栏] 统一API: 添加自定义节点', parent, topic);
        
        const parentNode = typeof parent === 'object' ? parent : this.jm.get_node(parent);
        if (!parentNode) {
            console.error('[脑图工作栏] 统一API: 添加自定义节点失败 - 父节点不存在');
            return null;
        }

        // ⚠️ 关键修改：移除外部传入的content，统一由核心引擎生成时间戳
        const { content, ...cleanData } = data;
        
        return this._createNodeCore({
            parent: parentNode,
            topic: topic,
            direction: data.direction || 'right',
            position: 'child',
            customData: cleanData
        });
    }
    
    // 删除节点（对应Delete键）
    removeNode(node) {
        console.log('[脑图工作栏] 统一API: 删除节点');
        
        const target = node || this.jm.get_selected_node();
        if (!target) {
            console.warn('[脑图工作栏] 统一API: 删除节点失败 - 未指定节点');
            return false;
        }
        
        if (target.isroot) {
            console.warn('[脑图工作栏] 统一API: 删除节点失败 - 不能删除根节点');
            return false;
        }
        
        this.jm.remove_node(target.id);
        console.log('[脑图工作栏] 统一API: 节点删除成功', target.id);
        return true;
    }
    
    // 更新节点
    updateNode(node, topic, content) {
        console.log('[脑图工作栏] 统一API: 更新节点');
        
        const target = typeof node === 'object' ? node : this.jm.get_node(node);
        if (!target) {
            console.warn('[脑图工作栏] 统一API: 更新节点失败 - 节点不存在');
            return false;
        }
        
        let updated = false;
        
        // 更新标题
        if (topic && target.topic !== topic) {
            this.jm.update_node(target.id, topic);
            updated = true;
        }
        
        // 更新内容
        if (content !== undefined) {
            if (!target.data) target.data = {};
            target.data.content = content;
            updated = true;
        }
        
        if (updated) {
            console.log('[脑图工作栏] 统一API: 节点更新成功', target.id);
        }
        
        return updated;
    }
    
    // 获取选中节点
    getSelectedNode() {
        return this.jm.get_selected_node();
    }
    
    // 选择节点
    selectNode(nodeId) {
        console.log('[脑图工作栏] 统一API: 选择节点', nodeId);
        this.jm.select_node(nodeId);
        return this.jm.get_selected_node();
    }
    
    // 获取格式化时间戳
    getTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    // ========== 复制/剪切/粘贴操作 ==========
    
    // 复制节点
    copyNode(node) {
        const target = node || this.jm.get_selected_node();
        if (!target) {
            console.warn('[节点操作] 复制失败 - 未选中节点');
            return false;
        }
        
        const success = this.clipboard.copy(target);
        if (success) {
            console.log('[节点操作] 已复制节点:', target.topic);
        }
        return success;
    }
    
    // 剪切节点
    cutNode(node) {
        const target = node || this.jm.get_selected_node();
        if (!target) {
            console.warn('[节点操作] 剪切失败 - 未选中节点');
            return false;
        }
        
        if (target.isroot) {
            console.warn('[节点操作] 剪切失败 - 不能剪切根节点');
            return false;
        }
        
        const success = this.clipboard.cut(target);
        if (success) {
            console.log('[节点操作] 已剪切节点:', target.topic);
        }
        return success;
    }
    
    // 粘贴节点
    pasteNode(parentNode) {
        const parent = parentNode || this.jm.get_selected_node();
        if (!parent) {
            console.warn('[节点操作] 粘贴失败 - 未选中父节点');
            return false;
        }
        
        // ✅ 先检查操作类型，再调用paste()
        const isCutOperation = this.clipboard.getOperation() === 'cut';
        const originalNodeId = this.clipboard.getData()?.id;
        
        const nodeData = this.clipboard.paste();
        if (!nodeData) {
            console.warn('[节点操作] 粘贴失败 - 剪贴板为空');
            return false;
        }
        
        // 递归添加节点树
        const newNode = this.addNodeTree(parent, nodeData);
        
        // 如果是剪切操作，删除原节点
        if (isCutOperation && originalNodeId) {
            const originalNode = this.jm.get_node(originalNodeId);
            if (originalNode) {
                this.jm.remove_node(originalNodeId);
                console.log('[节点操作] 剪切操作，已删除原节点:', originalNodeId);
            }
        }
        
        if (newNode) {
            console.log('[节点操作] 已粘贴节点:', nodeData.topic);
            // 选中新粘贴的节点
            this.jm.select_node(newNode.id);
        }
        
        return newNode;
    }
    
    // 递归添加节点树
    addNodeTree(parent, nodeData, isRoot = true) {
        // 生成新的唯一ID
        const newId = this._generateNodeId();
        const timestamp = this.getTimestamp();
        
        // 创建节点（直接使用jsMind API，避免自动选中和编辑）
        const node = this.jm.add_node(parent, newId, nodeData.topic, {
            direction: 'right'
        });
        
        if (node) {
            // ✅ 统一设置时间戳和内容
            if (!node.data) node.data = {};
            node.data.content = timestamp + '\n\n';
            
            // 复制其他节点数据
            if (nodeData.data) {
                Object.assign(node.data, nodeData.data);
            }
            
            // 递归添加子节点
            if (nodeData.children && nodeData.children.length > 0) {
                nodeData.children.forEach(child => {
                    this.addNodeTree(node, child, false);
                });
            }
            
            // 只有根节点才选中和进入编辑模式
            if (isRoot) {
                this.jm.select_node(newId);
                this.jm.begin_edit(newId);
            }
            
            console.log('[节点操作] 节点树添加成功:', node.topic);
        }
        
        return node;
    }
}
