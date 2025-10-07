/**
 * 数据同步辅助类
 * 用于统一处理jsMind节点数据同步
 * 
 * @author 程序员
 * @date 2025-10-07
 * @version 1.0
 */

class DataSyncHelper {
    /**
     * 同步单个节点的data字段
     * 将jsMind内存中的node.data复制到导出数据中
     * 
     * @param {Object} jm - jsMind实例
     * @param {Object} exportNode - 导出的节点数据
     */
    static syncNodeData(jm, exportNode) {
        if (!exportNode) {
            console.warn('[DataSyncHelper] exportNode为空，跳过同步');
            return;
        }
        
        // 从jsMind内存中获取节点
        const jmNode = jm.get_node(exportNode.id);
        
        // 如果jsMind节点存在且有data字段，复制到导出数据
        if (jmNode && jmNode.data) {
            exportNode.data = jmNode.data;
        }
        
        // 递归同步子节点
        if (exportNode.children && exportNode.children.length > 0) {
            exportNode.children.forEach(child => 
                DataSyncHelper.syncNodeData(jm, child)
            );
        }
    }
    
    /**
     * 同步所有节点数据
     * 这是最常用的方法，用于在保存前同步整个脑图的数据
     * 
     * @param {Object} jm - jsMind实例
     * @param {Object} data - 完整的脑图数据（包含meta和data字段）
     * @returns {Object} 同步后的数据
     */
    static syncAllNodes(jm, data) {
        if (!data) {
            console.error('[DataSyncHelper] 数据为空，无法同步');
            return data;
        }
        
        if (!data.data) {
            console.error('[DataSyncHelper] 数据格式错误，缺少data字段');
            return data;
        }
        
        if (!jm) {
            console.error('[DataSyncHelper] jsMind实例为空，无法同步');
            return data;
        }
        
        // 同步根节点及所有子节点
        DataSyncHelper.syncNodeData(jm, data.data);
        
        console.log('[DataSyncHelper] ✅ 已同步所有节点content');
        
        return data;
    }
    
    /**
     * 验证节点数据是否已同步
     * 用于调试和测试
     * 
     * @param {Object} jm - jsMind实例
     * @param {Object} exportNode - 导出的节点数据
     * @returns {boolean} 是否已同步
     */
    static verifyNodeSync(jm, exportNode) {
        if (!exportNode || !jm) return false;
        
        const jmNode = jm.get_node(exportNode.id);
        if (!jmNode) return false;
        
        // 检查data字段是否一致
        const jmContent = jmNode.data?.content || '';
        const exportContent = exportNode.data?.content || '';
        
        const isSynced = jmContent === exportContent;
        
        if (!isSynced) {
            console.warn(`[DataSyncHelper] 节点 ${exportNode.id} 数据未同步`);
            console.warn(`  jsMind: ${jmContent.substring(0, 50)}...`);
            console.warn(`  Export: ${exportContent.substring(0, 50)}...`);
        }
        
        return isSynced;
    }
    
    /**
     * 统计需要同步的节点数量
     * 用于性能监控
     * 
     * @param {Object} exportNode - 导出的节点数据
     * @returns {number} 节点数量
     */
    static countNodes(exportNode) {
        if (!exportNode) return 0;
        
        let count = 1;
        if (exportNode.children && exportNode.children.length > 0) {
            exportNode.children.forEach(child => {
                count += DataSyncHelper.countNodes(child);
            });
        }
        
        return count;
    }
}

// 暴露到全局，供mindmap-standalone.html使用
if (typeof window !== 'undefined') {
    window.DataSyncHelper = DataSyncHelper;
}

// 支持模块化导出（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataSyncHelper;
}
