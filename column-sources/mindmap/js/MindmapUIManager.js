/**
 * 脑图UI管理器
 * 负责UI更新、消息显示、节点计数等界面相关操作
 * 
 * @author 程序员
 * @date 2025-10-07
 * @version 1.0
 * 
 * Phase 2.1 - Task 2.1.2: 核心模块拆分 - UI管理器
 */

class MindmapUIManager {
    constructor(jm, eventCoordinator) {
        this.jm = jm;
        this.events = eventCoordinator;
        
        this.init();
    }
    
    /**
     * 初始化
     */
    init() {
        console.log('[UIManager] UI管理器初始化完成');
    }
    
    /**
     * 更新节点计数
     */
    updateNodeCount() {
        try {
            const data = this.jm.get_data();
            const count = this.countNodes(data.data);
            const element = document.getElementById('nodeCount');
            if (element) {
                element.textContent = count;
            }
            console.log('[UIManager] 节点计数已更新:', count);
        } catch (error) {
            console.error('[UIManager] 更新节点计数失败:', error);
        }
    }
    
    /**
     * 递归计算节点数量
     */
    countNodes(node) {
        if (!node) return 0;
        let count = 1;
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                count += this.countNodes(child);
            });
        }
        return count;
    }
    
    /**
     * 更新最后修改时间
     */
    updateLastModified() {
        try {
            const element = document.getElementById('lastModified');
            if (element) {
                const now = new Date();
                const timeStr = now.toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                });
                element.textContent = timeStr;
            }
        } catch (error) {
            console.error('[UIManager] 更新最后修改时间失败:', error);
        }
    }
    
    /**
     * 更新当前节点显示
     */
    updateCurrentNode(topic) {
        try {
            const element = document.getElementById('currentNode');
            if (element) {
                element.textContent = topic || '未选择';
            }
        } catch (error) {
            console.error('[UIManager] 更新当前节点显示失败:', error);
        }
    }
    
    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
        console.log(`[UIManager] ${type.toUpperCase()}: ${message}`);
        
        // 集成日志面板
        if (window.LogPanel) {
            if (type === 'error') {
                window.LogPanel.error(message);
            } else if (type === 'warn') {
                window.LogPanel.warn(message);
            } else {
                window.LogPanel.log(message);
            }
        }
        
        // 发射事件
        if (this.events) {
            this.events.emit('mindmap:ui:message', {
                message,
                type,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoading(show = true) {
        try {
            const element = document.getElementById('loading');
            if (element) {
                element.style.display = show ? 'flex' : 'none';
            }
        } catch (error) {
            console.error('[UIManager] 显示加载状态失败:', error);
        }
    }
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        this.showLoading(false);
    }
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.MindmapUIManager = MindmapUIManager;
}

// 支持模块化导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindmapUIManager;
}
