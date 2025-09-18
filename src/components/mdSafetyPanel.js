/**
 * MD安全管理面板
 * 提供安全写入状态监控和管理功能
 */
(function(){
  'use strict';

  class MDSafetyPanel {
    constructor() {
      this.panelElement = null;
      this.isVisible = false;
      this.refreshInterval = null;
      this.init();
    }

    init() {
      this.createPanel();
      this.bindEvents();
      console.log('[MD安全面板] 初始化完成');
    }

    createPanel() {
      // 创建面板容器
      this.panelElement = document.createElement('div');
      this.panelElement.id = 'md-safety-panel';
      this.panelElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        display: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
      `;

      // 创建面板内容
      this.panelElement.innerHTML = `
        <div style="padding: 16px; border-bottom: 1px solid #eee; background: #f8f9fa; border-radius: 8px 8px 0 0;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; color: #333;">🛡️ MD数据安全中心</h3>
            <button id="close-safety-panel" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
          </div>
        </div>
        
        <div style="padding: 16px;">
          <!-- 状态概览 -->
          <div id="safety-status" style="margin-bottom: 16px;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span id="status-indicator" style="width: 12px; height: 12px; border-radius: 50%; background: #28a745; margin-right: 8px;"></span>
              <span id="status-text">防误写机制正常运行</span>
            </div>
            <div style="font-size: 12px; color: #666;" id="status-details">
              操作日志: 0 条 | 隔离数据: 0 个
            </div>
          </div>

          <!-- 操作日志 -->
          <div style="margin-bottom: 16px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px;">最近操作</h4>
            <div id="operation-log" style="max-height: 120px; overflow-y: auto; background: #f8f9fa; padding: 8px; border-radius: 4px; font-size: 12px;">
              暂无操作记录
            </div>
          </div>

          <!-- 隔离区域 -->
          <div id="quarantine-section" style="margin-bottom: 16px; display: none;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #e74c3c;">⚠️ 隔离区域</h4>
            <div id="quarantine-list" style="max-height: 100px; overflow-y: auto; background: #fff5f5; padding: 8px; border-radius: 4px; border: 1px solid #fecaca;">
            </div>
            <div style="margin-top: 8px;">
              <button id="clear-quarantine" style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">清理隔离区域</button>
              <button id="force-sync" style="background: #f59e0b; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; margin-left: 4px;">强制同步</button>
            </div>
          </div>

          <!-- 控制按钮 -->
          <div style="display: flex; gap: 8px;">
            <button id="refresh-status" style="flex: 1; background: #007bff; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">刷新状态</button>
            <button id="test-safety" style="flex: 1; background: #28a745; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">测试保护</button>
          </div>
        </div>
      `;

      document.body.appendChild(this.panelElement);
    }

    bindEvents() {
      // 关闭按钮
      this.panelElement.querySelector('#close-safety-panel').addEventListener('click', () => {
        this.hide();
      });

      // 刷新状态
      this.panelElement.querySelector('#refresh-status').addEventListener('click', () => {
        this.refreshStatus();
      });

      // 测试保护机制
      this.panelElement.querySelector('#test-safety').addEventListener('click', () => {
        this.testSafetyMechanism();
      });

      // 清理隔离区域
      this.panelElement.querySelector('#clear-quarantine').addEventListener('click', () => {
        this.clearQuarantine();
      });

      // 强制同步
      this.panelElement.querySelector('#force-sync').addEventListener('click', () => {
        this.forceSync();
      });

      // 点击外部关闭
      document.addEventListener('click', (e) => {
        if (this.isVisible && !this.panelElement.contains(e.target)) {
          // 不自动关闭，让用户手动控制
        }
      });
    }

    show() {
      this.panelElement.style.display = 'block';
      this.isVisible = true;
      this.refreshStatus();
      
      // 开始定期刷新
      this.startAutoRefresh();
    }

    hide() {
      this.panelElement.style.display = 'none';
      this.isVisible = false;
      
      // 停止定期刷新
      this.stopAutoRefresh();
    }

    toggle() {
      if (this.isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }

    startAutoRefresh() {
      this.stopAutoRefresh();
      this.refreshInterval = setInterval(() => {
        if (this.isVisible) {
          this.refreshStatus();
        }
      }, 5000); // 每5秒刷新
    }

    stopAutoRefresh() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
    }

    refreshStatus() {
      if (!window.MDSafeWriter) {
        this.showError('MD安全写入器未加载');
        return;
      }

      try {
        // 获取状态信息
        const status = window.MDSafeWriter.getStatus();
        const operationLog = window.MDSafeWriter.getOperationLog();
        const quarantineData = window.MDSafeWriter.getQuarantineData();

        // 更新状态指示器
        const indicator = this.panelElement.querySelector('#status-indicator');
        const statusText = this.panelElement.querySelector('#status-text');
        const statusDetails = this.panelElement.querySelector('#status-details');

        if (status.isActive) {
          indicator.style.background = '#28a745';
          statusText.textContent = '防误写机制正常运行';
        } else {
          indicator.style.background = '#dc3545';
          statusText.textContent = '防误写机制异常';
        }

        statusDetails.textContent = `操作日志: ${operationLog.length} 条 | 隔离数据: ${quarantineData.length} 个`;

        // 更新操作日志
        this.updateOperationLog(operationLog);

        // 更新隔离区域
        this.updateQuarantineSection(quarantineData);

      } catch (error) {
        this.showError('状态刷新失败: ' + error.message);
      }
    }

    updateOperationLog(operationLog) {
      const logElement = this.panelElement.querySelector('#operation-log');
      
      if (operationLog.length === 0) {
        logElement.textContent = '暂无操作记录';
        return;
      }

      // 显示最近10条操作
      const recentLog = operationLog.slice(-10).reverse();
      
      logElement.innerHTML = recentLog.map(op => {
        const time = new Date(op.timestamp).toLocaleTimeString();
        const sourceColor = op.source === 'unknown' ? '#e74c3c' : '#28a745';
        
        return `
          <div style="margin-bottom: 4px; padding: 4px; background: white; border-radius: 2px;">
            <span style="color: #666;">${time}</span>
            <span style="color: ${sourceColor}; font-weight: bold;">${op.type}</span>
            <span>${op.nodeId}</span>
            <span style="font-size: 11px; color: #999;">(${op.source})</span>
          </div>
        `;
      }).join('');
    }

    updateQuarantineSection(quarantineData) {
      const section = this.panelElement.querySelector('#quarantine-section');
      const list = this.panelElement.querySelector('#quarantine-list');

      if (quarantineData.length === 0) {
        section.style.display = 'none';
        return;
      }

      section.style.display = 'block';
      
      list.innerHTML = quarantineData.map(item => {
        const time = new Date(item.data.timestamp).toLocaleString();
        const reason = item.data.validation.reason || '未知原因';
        
        return `
          <div style="margin-bottom: 4px; padding: 4px; background: white; border-radius: 2px; border-left: 3px solid #e74c3c;">
            <div style="font-weight: bold;">${time}</div>
            <div style="font-size: 11px; color: #666;">原因: ${reason}</div>
          </div>
        `;
      }).join('');
    }

    testSafetyMechanism() {
      if (!window.MDSafeWriter) {
        alert('MD安全写入器未加载');
        return;
      }

      // 模拟一个测试删除操作
      const testNodeId = 'test_node_' + Date.now();
      
      // 记录一个测试删除
      window.MDSafeWriter.recordOperation('delete', testNodeId, 'test');
      
      alert('已执行安全机制测试，请查看操作日志');
      this.refreshStatus();
    }

    clearQuarantine() {
      if (!window.MDSafeWriter) {
        alert('MD安全写入器未加载');
        return;
      }

      if (confirm('确定要清理所有隔离区域的数据吗？此操作不可恢复。')) {
        window.MDSafeWriter.clearQuarantine();
        alert('隔离区域已清理');
        this.refreshStatus();
      }
    }

    forceSync() {
      if (!window.MDSafeWriter) {
        alert('MD安全写入器未加载');
        return;
      }

      if (confirm('强制同步将跳过安全检查，可能会覆盖数据。确定继续吗？')) {
        // 这里需要获取当前的项目数据进行强制同步
        alert('强制同步功能需要配合具体的项目数据使用');
      }
    }

    showError(message) {
      const statusText = this.panelElement.querySelector('#status-text');
      const indicator = this.panelElement.querySelector('#status-indicator');
      
      statusText.textContent = message;
      indicator.style.background = '#dc3545';
    }
  }

  // 创建全局实例
  window.MDSafetyPanel = new MDSafetyPanel();

  // 添加快捷键 Ctrl+Shift+S 打开安全面板
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      window.MDSafetyPanel.toggle();
    }
  });

})();
