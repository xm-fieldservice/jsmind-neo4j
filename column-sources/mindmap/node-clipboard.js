// 节点剪贴板管理器
class NodeClipboard {
    constructor() {
        this.clipboardData = null;  // 存储复制/剪切的节点数据
        this.operation = null;      // 'copy' 或 'cut'
        console.log('[节点剪贴板] 初始化完成');
    }
    
    // 复制节点
    copy(node) {
        if (!node) {
            console.warn('[节点剪贴板] 复制失败 - 节点为空');
            return false;
        }
        
        this.clipboardData = this.cloneNode(node);
        this.operation = 'copy';
        console.log('[节点剪贴板] 已复制节点:', node.topic);
        return true;
    }
    
    // 剪切节点
    cut(node) {
        if (!node) {
            console.warn('[节点剪贴板] 剪切失败 - 节点为空');
            return false;
        }
        
        if (node.isroot) {
            console.warn('[节点剪贴板] 剪切失败 - 不能剪切根节点');
            return false;
        }
        
        this.clipboardData = this.cloneNode(node);
        this.operation = 'cut';
        console.log('[节点剪贴板] 已剪切节点:', node.topic);
        return true;
    }
    
    // 粘贴节点
    paste() {
        if (!this.clipboardData) {
            console.warn('[节点剪贴板] 粘贴失败 - 剪贴板为空');
            return null;
        }
        
        // 克隆数据
        const data = this.cloneNode(this.clipboardData);
        
        // 剪切操作：粘贴后清空剪贴板（只能粘贴一次）
        if (this.operation === 'cut') {
            console.log('[节点剪贴板] 剪切操作，粘贴后清空剪贴板');
            this.clear();
        }
        
        return data;
    }
    
    // 克隆节点（深拷贝）- 手动提取需要的数据
    cloneNode(node) {
        try {
            // 手动提取节点数据，避免循环引用
            const cloned = {
                id: node.id,
                topic: node.topic,
                data: node.data ? JSON.parse(JSON.stringify(node.data)) : {},
                children: []
            };
            
            // 递归克隆子节点
            if (node.children && node.children.length > 0) {
                cloned.children = node.children.map(child => this.cloneNode(child));
            }
            
            console.log('[节点剪贴板] 节点克隆成功:', cloned.topic);
            return cloned;
        } catch (err) {
            console.error('[节点剪贴板] 节点克隆失败:', err);
            return null;
        }
    }
    
    // 清空剪贴板
    clear() {
        this.clipboardData = null;
        this.operation = null;
        console.log('[节点剪贴板] 剪贴板已清空');
    }
    
    // 检查剪贴板是否有数据
    hasData() {
        return this.clipboardData !== null;
    }
    
    // 获取剪贴板操作类型
    getOperation() {
        return this.operation;
    }
    
    // 获取剪贴板数据（不清空）
    getData() {
        return this.clipboardData;
    }
}

// 导出到全局
window.NodeClipboard = NodeClipboard;
