/**
 * MD底座安全写入器 - 防误写机制
 * 核心原理：只接受有明确用户操作标记的删除，拒绝异常数据丢失
 */
(function(){
  'use strict';

  // 删除操作来源标记
  const DELETE_SOURCES = {
    KEYBOARD: 'keyboard_delete',      // 键盘Delete键
    UI_BUTTON: 'ui_delete',          // 界面删除按钮
    CONTEXT_MENU: 'context_delete',   // 右键菜单删除
    API_CALL: 'api_delete',          // 程序API调用
    CASCADE: 'cascade_delete',        // 级联删除（父节点删除导致）
    UNKNOWN: 'unknown'               // 未知来源（危险）
  };

  class MDSafeWriter {
    constructor() {
      this.operationLog = [];           // 操作日志队列
      this.lastSafeSnapshot = null;     // 最后一个安全快照
      this.maxLogSize = 1000;           // 日志最大条数
      this.operationTimeout = 30000;    // 操作超时时间（30秒）
      
      this.init();
    }

    init() {
      console.log('[MD安全写入] 初始化防误写机制');
      this.interceptJsMindDeletion();
      this.startLogCleanup();
    }

    /**
     * 拦截jsMind的删除操作，添加来源标记
     */
    interceptJsMindDeletion() {
      // 等待jsMind加载完成
      const checkJsMind = () => {
        if (window.jm && window.jm.remove_node) {
          this.patchJsMindDeletion();
        } else {
          setTimeout(checkJsMind, 100);
        }
      };
      checkJsMind();

      // 监听键盘删除事件
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && window.jm) {
          const selectedNode = window.jm.get_selected_node();
          if (selectedNode && !selectedNode.isroot) {
            this.recordOperation('delete', selectedNode.id, DELETE_SOURCES.KEYBOARD);
          }
        }
      });
    }

    /**
     * 修补jsMind的删除方法，添加来源追踪
     */
    patchJsMindDeletion() {
      if (!window.jm || !window.jm.remove_node) return;

      const originalRemoveNode = window.jm.remove_node.bind(window.jm);
      
      window.jm.remove_node = (node) => {
        const nodeId = typeof node === 'string' ? node : node.id;
        
        // 检查是否已有操作记录
        const hasRecord = this.operationLog.some(op => 
          op.type === 'delete' && 
          op.nodeId === nodeId && 
          Date.now() - op.timestamp < this.operationTimeout
        );

        // 如果没有记录，标记为未知来源（可能是程序异常）
        if (!hasRecord) {
          console.warn('[MD安全写入] 检测到未授权删除操作:', nodeId);
          this.recordOperation('delete', nodeId, DELETE_SOURCES.UNKNOWN);
        }

        // 记录级联删除的子节点
        const nodeObj = window.jm.get_node(nodeId);
        if (nodeObj && nodeObj.children) {
          this.recordCascadeDeletions(nodeObj);
        }

        // 执行原始删除操作
        return originalRemoveNode(node);
      };

      console.log('[MD安全写入] 已拦截jsMind删除操作');
    }

    /**
     * 记录级联删除的子节点
     */
    recordCascadeDeletions(parentNode) {
      const recordChildren = (node) => {
        if (node.children) {
          node.children.forEach(child => {
            this.recordOperation('delete', child.id, DELETE_SOURCES.CASCADE);
            recordChildren(child);
          });
        }
      };
      recordChildren(parentNode);
    }

    /**
     * 记录操作到日志
     */
    recordOperation(type, nodeId, source, metadata = {}) {
      const operation = {
        type,
        nodeId,
        source,
        timestamp: Date.now(),
        metadata
      };

      this.operationLog.push(operation);
      
      // 清理过期日志
      this.cleanupLog();
      
      console.log(`[MD安全写入] 记录操作: ${type} ${nodeId} (${source})`);
    }

    /**
     * 清理过期的操作日志
     */
    cleanupLog() {
      const now = Date.now();
      this.operationLog = this.operationLog.filter(op => 
        now - op.timestamp < this.operationTimeout
      );

      // 限制日志大小
      if (this.operationLog.length > this.maxLogSize) {
        this.operationLog = this.operationLog.slice(-this.maxLogSize);
      }
    }

    /**
     * 定期清理日志
     */
    startLogCleanup() {
      setInterval(() => {
        this.cleanupLog();
      }, 10000); // 每10秒清理一次
    }

    /**
     * 验证数据变更的安全性
     */
    validateDataChange(newData, previousData) {
      try {
        // 如果没有之前的数据，认为是安全的
        if (!previousData) {
          return { safe: true, reason: 'no_previous_data' };
        }

        // 比较数据找出删除的节点
        const deletedNodes = this.findDeletedNodes(newData, previousData);
        
        if (deletedNodes.length === 0) {
          return { safe: true, reason: 'no_deletions' };
        }

        // 检查每个删除的节点是否有合法的操作记录
        const unauthorizedDeletions = [];
        
        for (const nodeId of deletedNodes) {
          const hasAuthorization = this.operationLog.some(op => 
            op.type === 'delete' && 
            op.nodeId === nodeId && 
            op.source !== DELETE_SOURCES.UNKNOWN &&
            Date.now() - op.timestamp < this.operationTimeout
          );

          if (!hasAuthorization) {
            unauthorizedDeletions.push(nodeId);
          }
        }

        if (unauthorizedDeletions.length > 0) {
          return {
            safe: false,
            reason: 'unauthorized_deletions',
            details: {
              deletedNodes,
              unauthorizedDeletions,
              operationLog: this.operationLog.slice(-10) // 最近10条日志
            }
          };
        }

        return { safe: true, reason: 'all_deletions_authorized' };

      } catch (error) {
        console.error('[MD安全写入] 验证失败:', error);
        return { safe: false, reason: 'validation_error', error: error.message };
      }
    }

    /**
     * 找出被删除的节点
     */
    findDeletedNodes(newData, previousData) {
      const newNodes = this.extractNodeIds(newData);
      const previousNodes = this.extractNodeIds(previousData);
      
      return previousNodes.filter(nodeId => !newNodes.includes(nodeId));
    }

    /**
     * 提取数据中的所有节点ID
     */
    extractNodeIds(data) {
      const nodeIds = [];
      
      if (!data || !data.data) return nodeIds;
      
      const traverse = (node) => {
        if (node && node.id) {
          nodeIds.push(node.id);
          if (node.children && Array.isArray(node.children)) {
            node.children.forEach(traverse);
          }
        }
      };
      
      traverse(data.data);
      return nodeIds;
    }

    /**
     * 安全写入MD底座
     */
    async safeWriteToMD(projectData, previousData = null) {
      try {
        // 验证数据变更的安全性
        const validation = this.validateDataChange(projectData.payload, previousData);
        
        if (!validation.safe) {
          console.warn('[MD安全写入] 检测到不安全的数据变更:', validation);
          
          // 保存到隔离区域
          await this.saveToQuarantine(projectData, validation);
          
          // 通知用户
          this.notifyUser(validation);
          
          return { success: false, reason: validation.reason, details: validation.details };
        }

        // 更新安全快照
        this.lastSafeSnapshot = JSON.parse(JSON.stringify(projectData.payload));

        // 执行安全写入
        if (window.MDBaseManager) {
          const result = await window.MDBaseManager.writeMindmapToMD(projectData);
          
          if (result) {
            console.log('[MD安全写入] 安全写入成功');
            return { success: true, reason: validation.reason };
          } else {
            console.warn('[MD安全写入] MD写入失败');
            return { success: false, reason: 'md_write_failed' };
          }
        }

        return { success: false, reason: 'md_manager_not_available' };

      } catch (error) {
        console.error('[MD安全写入] 写入异常:', error);
        return { success: false, reason: 'write_exception', error: error.message };
      }
    }

    /**
     * 保存不安全的数据到隔离区域
     */
    async saveToQuarantine(projectData, validation) {
      try {
        const quarantineData = {
          timestamp: Date.now(),
          projectData,
          validation,
          operationLog: this.operationLog.slice()
        };

        // 保存到localStorage的隔离区域
        const quarantineKey = `md_quarantine_${Date.now()}`;
        localStorage.setItem(quarantineKey, JSON.stringify(quarantineData));

        console.log('[MD安全写入] 已保存到隔离区域:', quarantineKey);
      } catch (error) {
        console.error('[MD安全写入] 隔离区域保存失败:', error);
      }
    }

    /**
     * 通知用户数据安全问题
     */
    notifyUser(validation) {
      const message = this.getValidationMessage(validation);
      
      // 显示警告通知
      if (window.LogPanel && window.LogPanel.warn) {
        window.LogPanel.warn(`[数据保护] ${message}`);
      } else {
        console.warn(`[MD安全写入] ${message}`);
      }

      // 可以扩展为更友好的UI通知
      if (validation.details && validation.details.unauthorizedDeletions.length > 0) {
        const nodeCount = validation.details.unauthorizedDeletions.length;
        console.warn(`[MD安全写入] 保护了 ${nodeCount} 个节点免于异常删除`);
      }
    }

    /**
     * 获取验证结果的用户友好消息
     */
    getValidationMessage(validation) {
      switch (validation.reason) {
        case 'unauthorized_deletions':
          return '检测到异常的节点删除，已阻止数据同步以保护您的数据';
        case 'validation_error':
          return '数据验证时发生错误，已暂停同步';
        default:
          return '检测到不安全的数据变更，已启用保护机制';
      }
    }

    /**
     * 手动标记删除操作（供UI调用）
     */
    markDeletion(nodeId, source = DELETE_SOURCES.UI_BUTTON) {
      this.recordOperation('delete', nodeId, source);
    }

    /**
     * 获取操作日志
     */
    getOperationLog() {
      return this.operationLog.slice();
    }

    /**
     * 获取隔离区域的数据
     */
    getQuarantineData() {
      const quarantineKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('md_quarantine_')
      );
      
      return quarantineKeys.map(key => {
        try {
          return {
            key,
            data: JSON.parse(localStorage.getItem(key))
          };
        } catch (error) {
          return { key, error: error.message };
        }
      });
    }

    /**
     * 清理隔离区域
     */
    clearQuarantine() {
      const quarantineKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('md_quarantine_')
      );
      
      quarantineKeys.forEach(key => localStorage.removeItem(key));
      console.log(`[MD安全写入] 已清理 ${quarantineKeys.length} 个隔离数据`);
    }

    /**
     * 强制写入（跳过安全检查）
     */
    async forceWrite(projectData) {
      console.warn('[MD安全写入] 执行强制写入，跳过安全检查');
      
      if (window.MDBaseManager) {
        return await window.MDBaseManager.writeMindmapToMD(projectData);
      }
      
      return false;
    }

    /**
     * 获取状态信息
     */
    getStatus() {
      return {
        operationLogSize: this.operationLog.length,
        lastSafeSnapshot: !!this.lastSafeSnapshot,
        quarantineCount: this.getQuarantineData().length,
        isActive: true
      };
    }
  }

  // 创建全局实例
  window.MDSafeWriter = new MDSafeWriter();

  // 导出删除来源常量供外部使用
  window.DELETE_SOURCES = DELETE_SOURCES;

})();
