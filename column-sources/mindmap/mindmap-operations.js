// 脑图节点操作统一API
class MindmapOperations {
    constructor(jm) {
        this.jm = jm;
        this.clipboard = new NodeClipboard();  // 初始化剪贴板
        console.log('[脑图工作栏] 初始化统一节点操作API');
    }

    // 添加子节点（对应Tab键）
    addChild() {
        console.log('[脑图工作栏] 统一API: 添加子节点');
        const selected = this.jm.get_selected_node();
        if (!selected) {
            console.warn('[脑图工作栏] 统一API: 添加子节点失败 - 未选中节点');
            return null;
        }
        
        const nodeId = 'node_' + Date.now();
        const timestamp = this.getTimestamp();
        
        // 先创建节点
        const node = this.jm.add_node(selected, nodeId, '新节点', {
            direction: 'right'  // 直接在创建时指定方向
        });
        
        if (node) {
            // 创建后立即设置内容（时间戳）
            if (!node.data) node.data = {};
            node.data.content = timestamp + '\n\n';  // 添加时间戳和空行
            
            this.jm.select_node(nodeId);
            this.jm.begin_edit(nodeId);
            console.log('[脑图工作栏] 统一API: 子节点添加成功', nodeId, '时间戳:', timestamp);
        }
        
        return node;
    }
    
    // 添加兄弟节点（对应Enter键）
    addBrother() {
        console.log('[脑图工作栏] 统一API: 添加兄弟节点');
        const selected = this.jm.get_selected_node();
        if (!selected || selected.isroot) {
            console.warn('[脑图工作栏] 统一API: 添加兄弟节点失败 - 未选中节点或选择了根节点');
            return null;
        }
        
        const nodeId = 'node_' + Date.now();
        const timestamp = this.getTimestamp();
        
        const node = this.jm.insert_node_after(selected, nodeId, '新节点');
        
        // 创建后立即设置方向和内容
        if (node) {
            node.direction = 'right';
            if (!node.data) node.data = {};
            node.data.content = timestamp + '\n\n';  // 添加时间戳和空行
            
            this.jm.select_node(nodeId);
            this.jm.begin_edit(nodeId);
            this.jm.view.reset();  // 刷新视图以应用方向设置
            console.log('[脑图工作栏] 统一API: 兄弟节点添加成功', nodeId, '时间戳:', timestamp);
        }
        
        return node;
    }
    
    // 添加自定义节点
    addCustomNode(parent, topic, data = {}) {
        console.log('[脑图工作栏] 统一API: 添加自定义节点', parent, topic);
        
        // 确保方向一致性
        if (!data.direction) {
            data.direction = 'right';
        }
        
        const parentNode = typeof parent === 'object' ? parent : this.jm.get_node(parent);
        if (!parentNode) {
            console.error('[脑图工作栏] 统一API: 添加自定义节点失败 - 父节点不存在');
            return null;
        }
        
        const nodeId = data.id || 'node_' + Date.now();
        const node = this.jm.add_node(parentNode, nodeId, topic, data);
        
        if (node) {
            console.log('[脑图工作栏] 统一API: 自定义节点添加成功', nodeId);
        }
        
        return node;
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
    addNodeTree(parent, nodeData) {
        // 生成新的唯一ID
        const newId = 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // 创建节点
        const node = this.jm.add_node(parent, newId, nodeData.topic, {
            direction: 'right'
        });
        
        if (node) {
            // 复制节点数据（内容、属性等）
            if (nodeData.data) {
                node.data = JSON.parse(JSON.stringify(nodeData.data));
            }
            
            // 递归添加子节点
            if (nodeData.children && nodeData.children.length > 0) {
                nodeData.children.forEach(child => {
                    this.addNodeTree(node, child);
                });
            }
            
            console.log('[节点操作] 节点树添加成功:', node.topic);
        }
        
        return node;
    }
}
