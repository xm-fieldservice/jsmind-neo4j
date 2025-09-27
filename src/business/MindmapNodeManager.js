/**
 * 程序员 MindmapNodeManager.js - 节点管理业务模块
 * 
 * Phase 3: 业务逻辑层拆分 - 节点管理模块
 * 
 * 职责范围：
 * - 节点增删改查操作
 * - 节点选择与导航
 * - 节点复制粘贴功能
 * - 节点关系管理
 * - 节点详情更新
 * 
 * 技术特点：
 * - 单一职责：专注节点业务逻辑
 * - 依赖注入：通过构造函数注入依赖
 * - 事件驱动：与AutogenEventBus集成
 * - 错误隔离：节点操作失败不影响其他模块
 * - 性能优化：批量操作支持、操作防抖
 */

class MindmapNodeManager {
  constructor(options = {}) {
    // 依赖注入
    this.mind = options.mind;
    this.dataManager = options.dataManager;
    this.eventBus = options.eventBus || window.AutogenEventBus;
    this.logger = options.logger || console;
    
    // 配置参数
    this.config = {
      // 操作防抖时间
      operationDebounceMs: 50,
      // 批量操作阈值
      batchOperationThreshold: 10,
      // 最大撤销历史
      maxUndoHistory: 20,
      // 节点ID生成前缀
      nodeIdPrefix: 'node_',
      // 是否启用操作历史
      enableHistory: true,
      ...options.config
    };
    
    // 内部状态
    this.state = {
      selectedNodeId: null,
      clipboard: null,
      operationHistory: [],
      batchOperations: [],
      isDirty: false
    };
    
    // 防抖定时器
    this._debounceTimers = new Map();
    
    // 操作统计
    this.stats = {
      totalOperations: 0,
      nodeCreated: 0,
      nodeDeleted: 0,
      nodeUpdated: 0,
      nodesMoved: 0,
      operationErrors: 0
    };
    
    this.logger.log('[MindmapNodeManager] 节点管理器初始化完成');
  }
  
  /**
   * 设置依赖（用于延迟注入）
   */
  setDependencies(mind, dataManager) {
    this.mind = mind;
    this.dataManager = dataManager;
    this.logger.log('[MindmapNodeManager] 依赖设置完成');
  }
  
  /**
   * 添加子节点
   */
  addChildNode(parentNodeId, nodeData = {}) {
    return this._executeNodeOperation('addChild', () => {
      if (!this.mind || !parentNodeId) {
        throw new Error('Mind实例或父节点ID不能为空');
      }
      
      const parentNode = this.mind.get_node(parentNodeId);
      if (!parentNode) {
        throw new Error(`父节点不存在: ${parentNodeId}`);
      }
      
      // 生成新节点ID和数据
      const newNodeId = this._generateNodeId();
      const newNodeData = {
        id: newNodeId,
        topic: nodeData.topic || '新节点',
        data: {
          content: nodeData.content || '',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          ...nodeData.data
        }
      };
      
      // 添加节点到jsMind
      const addedNode = this.mind.add_node(parentNode, newNodeId, newNodeData.topic, newNodeData.data);
      if (!addedNode) {
        throw new Error('节点添加失败');
      }
      
      // 更新内部数据结构
      if (this.dataManager) {
        this.dataManager.addNode(parentNodeId, newNodeData);
      }
      
      // 选中新节点
      this.setSelectedNode(newNodeId);
      
      // 触发事件
      this._emitEvent('node:added', {
        nodeId: newNodeId,
        parentId: parentNodeId,
        nodeData: newNodeData
      });
      
      this.stats.nodeCreated++;
      this.logger.log(`[MindmapNodeManager] 子节点添加成功: ${newNodeId}`);
      
      return newNodeId;
    });
  }
  
  /**
   * 添加兄弟节点
   */
  addSiblingNode(siblingNodeId, nodeData = {}) {
    return this._executeNodeOperation('addSibling', () => {
      if (!this.mind || !siblingNodeId) {
        throw new Error('Mind实例或兄弟节点ID不能为空');
      }
      
      const siblingNode = this.mind.get_node(siblingNodeId);
      if (!siblingNode) {
        throw new Error(`兄弟节点不存在: ${siblingNodeId}`);
      }
      
      // 获取父节点
      const parentNode = siblingNode.parent;
      if (!parentNode) {
        throw new Error('根节点不能添加兄弟节点');
      }
      
      // 生成新节点数据
      const newNodeId = this._generateNodeId();
      const newNodeData = {
        id: newNodeId,
        topic: nodeData.topic || '新节点',
        data: {
          content: nodeData.content || '',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          ...nodeData.data
        }
      };
      
      // 添加节点到jsMind
      const addedNode = this.mind.add_node(parentNode, newNodeId, newNodeData.topic, newNodeData.data);
      if (!addedNode) {
        throw new Error('兄弟节点添加失败');
      }
      
      // 更新内部数据结构
      if (this.dataManager) {
        this.dataManager.addNode(parentNode.id, newNodeData);
      }
      
      // 选中新节点
      this.setSelectedNode(newNodeId);
      
      // 触发事件
      this._emitEvent('node:added', {
        nodeId: newNodeId,
        parentId: parentNode.id,
        nodeData: newNodeData,
        siblingId: siblingNodeId
      });
      
      this.stats.nodeCreated++;
      this.logger.log(`[MindmapNodeManager] 兄弟节点添加成功: ${newNodeId}`);
      
      return newNodeId;
    });
  }
  
  /**
   * 删除节点
   */
  removeNode(nodeId) {
    return this._executeNodeOperation('remove', () => {
      if (!this.mind || !nodeId) {
        throw new Error('Mind实例或节点ID不能为空');
      }
      
      const node = this.mind.get_node(nodeId);
      if (!node) {
        throw new Error(`节点不存在: ${nodeId}`);
      }
      
      // 不能删除根节点
      if (node.isroot) {
        throw new Error('根节点不能删除');
      }
      
      // 备份节点数据用于撤销
      const nodeBackup = this._backupNode(node);
      
      // 从jsMind删除节点
      const removed = this.mind.remove_node(nodeId);
      if (!removed) {
        throw new Error('节点删除失败');
      }
      
      // 更新内部数据结构
      if (this.dataManager) {
        this.dataManager.removeNode(nodeId);
      }
      
      // 如果删除的是选中节点，选中父节点或根节点
      if (this.state.selectedNodeId === nodeId) {
        const parentNode = nodeBackup.parent;
        const newSelectedId = parentNode ? parentNode.id : this.mind.get_root()?.id;
        this.setSelectedNode(newSelectedId);
      }
      
      // 触发事件
      this._emitEvent('node:removed', {
        nodeId: nodeId,
        nodeBackup: nodeBackup
      });
      
      this.stats.nodeDeleted++;
      this.logger.log(`[MindmapNodeManager] 节点删除成功: ${nodeId}`);
      
      return true;
    });
  }
  
  /**
   * 更新节点
   */
  updateNode(nodeId, updates = {}) {
    return this._executeNodeOperation('update', () => {
      if (!this.mind || !nodeId) {
        throw new Error('Mind实例或节点ID不能为空');
      }
      
      const node = this.mind.get_node(nodeId);
      if (!node) {
        throw new Error(`节点不存在: ${nodeId}`);
      }
      
      const oldData = { ...node.data };
      
      // 更新节点主题
      if (updates.topic !== undefined) {
        this.mind.update_node(nodeId, updates.topic);
      }
      
      // 更新节点数据
      if (updates.data) {
        const newData = {
          ...node.data,
          ...updates.data,
          modified: new Date().toISOString()
        };
        
        // 更新jsMind节点数据
        Object.assign(node.data, newData);
      }
      
      // 更新内部数据结构
      if (this.dataManager) {
        this.dataManager.updateNode(nodeId, updates);
      }
      
      // 触发事件
      this._emitEvent('node:updated', {
        nodeId: nodeId,
        updates: updates,
        oldData: oldData,
        newData: node.data
      });
      
      this.stats.nodeUpdated++;
      this.logger.log(`[MindmapNodeManager] 节点更新成功: ${nodeId}`);
      
      return true;
    });
  }
  
  /**
   * 更新节点详情（用于右侧面板）
   */
  updateNodeDetails(nodeId) {
    try {
      if (!nodeId) return;
      
      const node = this.findNode(nodeId);
      if (!node) return;
      
      // 触发节点详情更新事件
      this._emitEvent('node:detailsUpdate', {
        nodeId: nodeId,
        node: node,
        title: node.topic || '',
        content: node.data?.content || ''
      });
      
      this.logger.log(`[MindmapNodeManager] 节点详情更新: ${nodeId}`);
    } catch (error) {
      this.logger.error('[MindmapNodeManager] 节点详情更新失败:', error);
    }
  }
  
  /**
   * 设置选中节点
   */
  setSelectedNode(nodeId) {
    try {
      if (!this.mind || !nodeId) return false;
      
      const node = this.mind.get_node(nodeId);
      if (!node) {
        // 如果节点不存在，选中根节点
        const root = this.mind.get_root();
        if (root) {
          this.mind.select_node(root);
          this.state.selectedNodeId = root.id;
          this.updateNodeDetails(root.id);
        }
        return false;
      }
      
      // 选中节点
      this.mind.select_node(node);
      this.state.selectedNodeId = nodeId;
      
      // 更新节点详情
      this.updateNodeDetails(nodeId);
      
      // 触发事件
      this._emitEvent('node:selected', {
        nodeId: nodeId,
        node: node
      });
      
      this.logger.log(`[MindmapNodeManager] 节点选中: ${nodeId}`);
      return true;
    } catch (error) {
      this.logger.error('[MindmapNodeManager] 节点选中失败:', error);
      return false;
    }
  }
  
  /**
   * 查找节点
   */
  findNode(nodeId) {
    if (!this.mind || !nodeId) return null;
    
    try {
      return this.mind.get_node(nodeId);
    } catch (error) {
      this.logger.warn(`[MindmapNodeManager] 节点查找失败: ${nodeId}`, error);
      return null;
    }
  }
  
  /**
   * 查找父节点
   */
  findParentNode(nodeId) {
    const node = this.findNode(nodeId);
    return node ? node.parent : null;
  }
  
  /**
   * 复制节点
   */
  copyNode(nodeId) {
    try {
      const node = this.findNode(nodeId);
      if (!node) {
        throw new Error(`节点不存在: ${nodeId}`);
      }
      
      // 深度复制节点数据
      const nodeData = this._deepCopyNode(node);
      this.state.clipboard = {
        type: 'node',
        data: nodeData,
        timestamp: Date.now()
      };
      
      // 触发事件
      this._emitEvent('node:copied', {
        nodeId: nodeId,
        nodeData: nodeData
      });
      
      this.logger.log(`[MindmapNodeManager] 节点复制成功: ${nodeId}`);
      return true;
    } catch (error) {
      this.logger.error('[MindmapNodeManager] 节点复制失败:', error);
      return false;
    }
  }
  
  /**
   * 剪切节点
   */
  cutNode(nodeId) {
    try {
      if (this.copyNode(nodeId)) {
        this.state.clipboard.type = 'cut';
        this.removeNode(nodeId);
        
        // 触发事件
        this._emitEvent('node:cut', {
          nodeId: nodeId
        });
        
        this.logger.log(`[MindmapNodeManager] 节点剪切成功: ${nodeId}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('[MindmapNodeManager] 节点剪切失败:', error);
      return false;
    }
  }
  
  /**
   * 粘贴节点
   */
  pasteNode(targetNodeId, asChild = true) {
    try {
      if (!this.state.clipboard || !this.state.clipboard.data) {
        throw new Error('剪贴板为空');
      }
      
      const clipboardData = this.state.clipboard.data;
      const newNodeData = {
        topic: clipboardData.topic,
        data: {
          ...clipboardData.data,
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        }
      };
      
      let newNodeId;
      if (asChild) {
        newNodeId = this.addChildNode(targetNodeId, newNodeData);
      } else {
        newNodeId = this.addSiblingNode(targetNodeId, newNodeData);
      }
      
      // 如果有子节点，递归粘贴
      if (clipboardData.children && clipboardData.children.length > 0) {
        this._pasteChildNodes(newNodeId, clipboardData.children);
      }
      
      // 清空剪贴板（如果是剪切操作）
      if (this.state.clipboard.type === 'cut') {
        this.state.clipboard = null;
      }
      
      // 触发事件
      this._emitEvent('node:pasted', {
        targetNodeId: targetNodeId,
        newNodeId: newNodeId,
        asChild: asChild
      });
      
      this.logger.log(`[MindmapNodeManager] 节点粘贴成功: ${newNodeId}`);
      return newNodeId;
    } catch (error) {
      this.logger.error('[MindmapNodeManager] 节点粘贴失败:', error);
      return null;
    }
  }
  
  /**
   * 移动节点
   */
  moveNode(nodeId, targetParentId, index = -1) {
    return this._executeNodeOperation('move', () => {
      if (!this.mind || !nodeId || !targetParentId) {
        throw new Error('参数不完整');
      }
      
      const node = this.mind.get_node(nodeId);
      const targetParent = this.mind.get_node(targetParentId);
      
      if (!node || !targetParent) {
        throw new Error('源节点或目标父节点不存在');
      }
      
      if (node.isroot) {
        throw new Error('根节点不能移动');
      }
      
      // 检查是否会造成循环引用
      if (this._wouldCreateCircularReference(nodeId, targetParentId)) {
        throw new Error('移动操作会造成循环引用');
      }
      
      const oldParentId = node.parent.id;
      
      // 使用jsMind的移动功能
      const moved = this.mind.move_node(nodeId, targetParentId, index);
      if (!moved) {
        throw new Error('节点移动失败');
      }
      
      // 更新内部数据结构
      if (this.dataManager) {
        this.dataManager.moveNode(nodeId, oldParentId, targetParentId, index);
      }
      
      // 触发事件
      this._emitEvent('node:moved', {
        nodeId: nodeId,
        oldParentId: oldParentId,
        newParentId: targetParentId,
        index: index
      });
      
      this.stats.nodesMoved++;
      this.logger.log(`[MindmapNodeManager] 节点移动成功: ${nodeId} -> ${targetParentId}`);
      
      return true;
    });
  }
  
  /**
   * 批量操作
   */
  batchOperation(operations) {
    return this._executeNodeOperation('batch', () => {
      const results = [];
      const errors = [];
      
      this.logger.log(`[MindmapNodeManager] 开始批量操作: ${operations.length}个操作`);
      
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        try {
          let result;
          switch (operation.type) {
            case 'add':
              result = this.addChildNode(operation.parentId, operation.data);
              break;
            case 'remove':
              result = this.removeNode(operation.nodeId);
              break;
            case 'update':
              result = this.updateNode(operation.nodeId, operation.updates);
              break;
            case 'move':
              result = this.moveNode(operation.nodeId, operation.targetParentId, operation.index);
              break;
            default:
              throw new Error(`未知操作类型: ${operation.type}`);
          }
          results.push({ index: i, success: true, result: result });
        } catch (error) {
          errors.push({ index: i, error: error.message });
          results.push({ index: i, success: false, error: error.message });
        }
      }
      
      // 触发事件
      this._emitEvent('nodes:batchOperation', {
        operations: operations,
        results: results,
        errors: errors
      });
      
      this.logger.log(`[MindmapNodeManager] 批量操作完成: ${results.length - errors.length}/${results.length}成功`);
      
      return {
        success: errors.length === 0,
        results: results,
        errors: errors
      };
    });
  }
  
  /**
   * 获取节点统计信息
   */
  getNodeStats() {
    const stats = { ...this.stats };
    
    if (this.mind) {
      const allNodes = this.mind.get_data('node_array');
      stats.totalNodes = allNodes ? allNodes.data.length : 0;
      stats.maxDepth = this._calculateMaxDepth();
    }
    
    return stats;
  }
  
  /**
   * 获取管理器状态
   */
  getManagerState() {
    return {
      selectedNodeId: this.state.selectedNodeId,
      hasClipboard: !!this.state.clipboard,
      clipboardType: this.state.clipboard?.type,
      isDirty: this.state.isDirty,
      operationHistoryCount: this.state.operationHistory.length,
      stats: this.getNodeStats()
    };
  }
  
  /**
   * 清理资源
   */
  destroy() {
    // 清理防抖定时器
    this._debounceTimers.forEach(timer => clearTimeout(timer));
    this._debounceTimers.clear();
    
    // 清理状态
    this.state.clipboard = null;
    this.state.operationHistory = [];
    this.state.batchOperations = [];
    
    this.logger.log('[MindmapNodeManager] 节点管理器已销毁');
  }
  
  // ==================== 私有方法 ====================
  
  /**
   * 执行节点操作（带错误处理和统计）
   */
  _executeNodeOperation(operationType, operation) {
    const startTime = performance.now();
    
    try {
      const result = operation();
      
      // 记录操作历史
      if (this.config.enableHistory) {
        this._addToHistory(operationType, result);
      }
      
      // 标记为脏数据
      this.state.isDirty = true;
      
      // 更新统计
      this.stats.totalOperations++;
      
      const duration = performance.now() - startTime;
      this.logger.log(`[MindmapNodeManager] 操作完成: ${operationType} (${duration.toFixed(2)}ms)`);
      
      return result;
    } catch (error) {
      this.stats.operationErrors++;
      this.logger.error(`[MindmapNodeManager] 操作失败: ${operationType}`, error);
      throw error;
    }
  }
  
  /**
   * 生成节点ID
   */
  _generateNodeId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${this.config.nodeIdPrefix}${timestamp}_${random}`;
  }
  
  /**
   * 备份节点数据
   */
  _backupNode(node) {
    return {
      id: node.id,
      topic: node.topic,
      data: { ...node.data },
      parent: node.parent ? { id: node.parent.id, topic: node.parent.topic } : null,
      children: node.children ? node.children.map(child => ({ id: child.id, topic: child.topic })) : []
    };
  }
  
  /**
   * 深度复制节点
   */
  _deepCopyNode(node) {
    const copy = {
      id: node.id,
      topic: node.topic,
      data: { ...node.data },
      children: []
    };
    
    if (node.children) {
      copy.children = node.children.map(child => this._deepCopyNode(child));
    }
    
    return copy;
  }
  
  /**
   * 递归粘贴子节点
   */
  _pasteChildNodes(parentId, children) {
    for (const child of children) {
      const childNodeData = {
        topic: child.topic,
        data: {
          ...child.data,
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        }
      };
      
      const newChildId = this.addChildNode(parentId, childNodeData);
      
      if (child.children && child.children.length > 0) {
        this._pasteChildNodes(newChildId, child.children);
      }
    }
  }
  
  /**
   * 检查是否会造成循环引用
   */
  _wouldCreateCircularReference(nodeId, targetParentId) {
    let current = this.mind.get_node(targetParentId);
    
    while (current) {
      if (current.id === nodeId) {
        return true;
      }
      current = current.parent;
    }
    
    return false;
  }
  
  /**
   * 计算最大深度
   */
  _calculateMaxDepth() {
    if (!this.mind) return 0;
    
    const root = this.mind.get_root();
    if (!root) return 0;
    
    const calculateDepth = (node, depth = 0) => {
      if (!node.children || node.children.length === 0) {
        return depth;
      }
      
      let maxChildDepth = depth;
      for (const child of node.children) {
        const childDepth = calculateDepth(child, depth + 1);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
      
      return maxChildDepth;
    };
    
    return calculateDepth(root);
  }
  
  /**
   * 添加到操作历史
   */
  _addToHistory(operationType, result) {
    this.state.operationHistory.push({
      type: operationType,
      result: result,
      timestamp: Date.now()
    });
    
    // 限制历史记录数量
    if (this.state.operationHistory.length > this.config.maxUndoHistory) {
      this.state.operationHistory.shift();
    }
  }
  
  /**
   * 触发事件
   */
  _emitEvent(eventName, data) {
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit(eventName, data);
    }
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MindmapNodeManager;
} else if (typeof window !== 'undefined') {
  window.MindmapNodeManager = MindmapNodeManager;
}
