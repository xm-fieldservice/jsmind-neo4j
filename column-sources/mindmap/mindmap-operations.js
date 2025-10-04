// 脑图节点操作统一API
class MindmapOperations {
    constructor(jm) {
        this.jm = jm;
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
        const node = this.jm.add_node(selected, nodeId, '新节点', {
            direction: 'right'  // 直接在创建时指定方向
        });
        
        if (node) {
            this.jm.select_node(nodeId);
            this.jm.begin_edit(nodeId);
            console.log('[脑图工作栏] 统一API: 子节点添加成功', nodeId);
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
        const node = this.jm.insert_node_after(selected, nodeId, '新节点');
        
        // 创建后立即设置方向
        if (node) {
            node.direction = 'right';
            this.jm.select_node(nodeId);
            this.jm.begin_edit(nodeId);
            this.jm.view.reset();  // 刷新视图以应用方向设置
            console.log('[脑图工作栏] 统一API: 兄弟节点添加成功', nodeId);
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
}
