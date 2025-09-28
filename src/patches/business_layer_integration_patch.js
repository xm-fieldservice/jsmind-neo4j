/**
 * 程序员 - Phase 6.2 Day 3 业务层集成补丁
 * 
 * 此补丁用于完成业务层模块与控制器的集成
 * 解决依赖关系更新和委托模式实现
 */

(function() {
  'use strict';
  
  // 等待MindmapController加载
  function checkController() {
    if (typeof window.MindmapController === 'undefined') {
      console.warn('[BusinessLayerPatch] MindmapController未加载，延迟执行');
      setTimeout(checkController, 100);
      return;
    }
    
    // MindmapController已加载，继续执行补丁逻辑
    applyBusinessLayerPatch();
  }
  
  function applyBusinessLayerPatch() {
  
  const MindmapController = window.MindmapController;
  
  // 添加业务层模块依赖更新方法
  if (!MindmapController.prototype._updateBusinessModuleDependencies) {
    MindmapController.prototype._updateBusinessModuleDependencies = function() {
      try {
        console.log('[BusinessLayerPatch] 开始更新业务层模块依赖');
        
        // 更新节点管理器依赖
        if (this.nodeManager && typeof this.nodeManager.setDependencies === 'function') {
          this.nodeManager.setDependencies(this.mind, this.dataManager);
          console.log('[BusinessLayerPatch] ✅ 节点管理器依赖更新成功');
        }
        
        // 更新状态管理器依赖
        if (this.stateManager && typeof this.stateManager.setDependencies === 'function') {
          this.stateManager.setDependencies(this.mind, this.autogenStorage);
          console.log('[BusinessLayerPatch] ✅ 状态管理器依赖更新成功');
        }
        
        // 更新同步管理器依赖
        if (this.syncManager && typeof this.syncManager.setDependencies === 'function') {
          this.syncManager.setDependencies(this.mind, this.dataManager, this.autogenStorage);
          console.log('[BusinessLayerPatch] ✅ 同步管理器依赖更新成功');
        }
        
        // 更新表现层模块依赖
        if (this.renderer && typeof this.renderer.setMindInstance === 'function') {
          this.renderer.setMindInstance(this.mind);
          console.log('[BusinessLayerPatch] ✅ 渲染器Mind实例更新成功');
        }
        
      } catch (error) {
        console.error('[BusinessLayerPatch] 业务层模块依赖更新失败:', error);
      }
    };
  }
  
  // 添加节点操作委托方法
  const originalAddChildNode = MindmapController.prototype.addChildNode;
  MindmapController.prototype.addChildNode = function(parentId) {
    // 委托给NodeManager
    if (this.nodeManager && typeof this.nodeManager.addChildNode === 'function') {
      try {
        console.log('[BusinessLayerPatch] 委托节点添加给NodeManager');
        // NodeManager需要两个参数：parentNodeId和nodeData，提供默认的nodeData
        return this.nodeManager.addChildNode(parentId, { topic: '新节点' });
      } catch (error) {
        console.warn('[BusinessLayerPatch] NodeManager委托失败，使用原始实现:', error);
      }
    }
    
    // 回退到原始实现
    return originalAddChildNode.call(this, parentId);
  };
  
  const originalAddSiblingNode = MindmapController.prototype.addSiblingNode;
  MindmapController.prototype.addSiblingNode = function(nodeId) {
    // 委托给NodeManager
    if (this.nodeManager && typeof this.nodeManager.addSiblingNode === 'function') {
      try {
        console.log('[BusinessLayerPatch] 委托兄弟节点添加给NodeManager');
        // NodeManager需要两个参数：siblingNodeId和nodeData，提供默认的nodeData
        return this.nodeManager.addSiblingNode(nodeId, { topic: '新节点' });
      } catch (error) {
        console.warn('[BusinessLayerPatch] NodeManager委托失败，使用原始实现:', error);
      }
    }
    
    // 回退到原始实现
    return originalAddSiblingNode.call(this, nodeId);
  };
  
  const originalRemoveNode = MindmapController.prototype.removeNode;
  MindmapController.prototype.removeNode = function(nodeId) {
    // 委托给NodeManager
    if (this.nodeManager && typeof this.nodeManager.removeNode === 'function') {
      try {
        console.log('[BusinessLayerPatch] 委托节点删除给NodeManager');
        return this.nodeManager.removeNode(nodeId);
      } catch (error) {
        console.warn('[BusinessLayerPatch] NodeManager委托失败，使用原始实现:', error);
      }
    }
    
    // 回退到原始实现
    return originalRemoveNode.call(this, nodeId);
  };
  
  const originalSetSelectedNode = MindmapController.prototype.setSelectedNode;
  MindmapController.prototype.setSelectedNode = function(nodeId) {
    // 委托给StateManager
    if (this.stateManager && typeof this.stateManager.setSelectedNode === 'function') {
      try {
        console.log('[BusinessLayerPatch] 委托节点选择给StateManager');
        return this.stateManager.setSelectedNode(nodeId);
      } catch (error) {
        console.warn('[BusinessLayerPatch] StateManager委托失败，使用原始实现:', error);
      }
    }
    
    // 回退到原始实现
    return originalSetSelectedNode.call(this, nodeId);
  };
  
  const originalSaveMindmapToStorage = MindmapController.prototype.saveMindmapToStorage;
  MindmapController.prototype.saveMindmapToStorage = function() {
    // 委托给SyncManager
    if (this.syncManager && typeof this.syncManager.saveMindmapToStorage === 'function') {
      try {
        console.log('[BusinessLayerPatch] 委托存储保存给SyncManager');
        return this.syncManager.saveMindmapToStorage();
      } catch (error) {
        console.warn('[BusinessLayerPatch] SyncManager委托失败，使用原始实现:', error);
      }
    }
    
    // 回退到原始实现
    return originalSaveMindmapToStorage.call(this);
  };
  
  // 修补现有控制器实例的init方法
  const originalInit = MindmapController.prototype.init;
  MindmapController.prototype.init = async function() {
    // 调用原始init
    const result = await originalInit.call(this);
    
    // 在jsMind实例创建后更新业务层模块依赖
    if (this.mind && this._updateBusinessModuleDependencies) {
      this._updateBusinessModuleDependencies();
    }
    
    return result;
  };
  
  console.log('[BusinessLayerPatch] ✅ 业务层集成补丁加载完成');
  }
  
  // 启动检查
  checkController();
  
})();
