/**
 * localStorage存储策略诊断脚本
 * 自动检查SmartStorage的先进先出策略是否正常工作
 */
(function() {
  'use strict';
  
  console.log('[存储诊断] 诊断脚本加载');
  
  // 诊断配置
  const DIAGNOSTIC_CONFIG = {
    checkInterval: 10000, // 每10秒检查一次
    reportInterval: 30000, // 每30秒生成一次报告
  };
  
  // 存储状态历史
  let storageHistory = [];
  
  // 获取详细的存储状态
  function getStorageStatus() {
    const status = {
      timestamp: Date.now(),
      timeString: new Date().toLocaleTimeString(),
      smartStorageAvailable: !!window.SmartLocalStorage,
      smartStorageAPIAvailable: !!window.smartStorage,
      quotaInfo: null,
      stats: null,
      itemCount: 0,
      totalSize: 0,
      mdBackupSize: 0,
      mdBackupExists: false,
      issues: []
    };
    
    // 检查SmartStorage状态
    if (window.SmartLocalStorage) {
      try {
        status.quotaInfo = window.SmartLocalStorage.getQuotaInfo();
        status.stats = window.SmartLocalStorage.getStats();
      } catch(e) {
        status.issues.push('SmartStorage方法调用失败: ' + e.message);
      }
    } else {
      status.issues.push('SmartLocalStorage实例不存在');
    }
    
    // 检查localStorage状态
    try {
      status.itemCount = Object.keys(localStorage).length;
      let totalSize = 0;
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const size = localStorage[key].length * 2;
          totalSize += size;
          
          if (key === 'md_base_backup') {
            status.mdBackupExists = true;
            status.mdBackupSize = size;
          }
        }
      }
      
      status.totalSize = totalSize;
    } catch(e) {
      status.issues.push('localStorage检查失败: ' + e.message);
    }
    
    return status;
  }
  
  // 分析存储问题
  function analyzeStorageIssues(status) {
    const issues = [...status.issues];
    
    // 检查配额使用情况
    if (status.quotaInfo) {
      if (status.quotaInfo.usagePercentage > 90) {
        issues.push(`配额使用率过高: ${status.quotaInfo.usagePercentage.toFixed(1)}%`);
      }
      
      if (status.quotaInfo.isNearLimit) {
        issues.push('接近存储配额限制');
      }
    }
    
    // 检查MD备份大小
    if (status.mdBackupExists && status.mdBackupSize > 2 * 1024 * 1024) {
      issues.push(`MD备份过大: ${(status.mdBackupSize / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // 检查SmartStorage是否被使用
    if (status.smartStorageAvailable && !status.smartStorageAPIAvailable) {
      issues.push('SmartStorage实例存在但API不可用');
    }
    
    return issues;
  }
  
  // 生成诊断报告
  function generateDiagnosticReport() {
    const currentStatus = getStorageStatus();
    const issues = analyzeStorageIssues(currentStatus);
    
    console.log('\n=== 📊 localStorage存储策略诊断报告 ===');
    console.log(`时间: ${currentStatus.timeString}`);
    console.log(`SmartStorage状态: ${currentStatus.smartStorageAvailable ? '✅ 可用' : '❌ 不可用'}`);
    console.log(`SmartStorage API: ${currentStatus.smartStorageAPIAvailable ? '✅ 可用' : '❌ 不可用'}`);
    
    if (currentStatus.quotaInfo) {
      console.log(`配额使用: ${currentStatus.quotaInfo.usagePercentage.toFixed(1)}% (${(currentStatus.quotaInfo.currentUsage/1024/1024).toFixed(2)}MB / ${(currentStatus.quotaInfo.totalQuota/1024/1024).toFixed(2)}MB)`);
      console.log(`剩余空间: ${(currentStatus.quotaInfo.remainingSpace/1024/1024).toFixed(2)}MB`);
    }
    
    console.log(`存储项目数: ${currentStatus.itemCount}`);
    console.log(`总存储大小: ${(currentStatus.totalSize/1024/1024).toFixed(2)}MB`);
    console.log(`MD备份: ${currentStatus.mdBackupExists ? '✅ 存在' : '❌ 不存在'} ${currentStatus.mdBackupExists ? `(${(currentStatus.mdBackupSize/1024/1024).toFixed(2)}MB)` : ''}`);
    
    if (currentStatus.stats && currentStatus.stats.priorityStats) {
      console.log('\n📋 优先级统计:');
      Object.entries(currentStatus.stats.priorityStats).forEach(([priority, data]) => {
        const priorityName = {
          '1': 'CRITICAL',
          '2': 'HIGH', 
          '3': 'MEDIUM',
          '4': 'LOW',
          '5': 'DISPOSABLE'
        }[priority] || `P${priority}`;
        console.log(`  ${priorityName}: ${data.count}项, ${(data.size/1024/1024).toFixed(2)}MB`);
      });
    }
    
    if (issues.length > 0) {
      console.log('\n⚠️ 发现的问题:');
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ 存储状态正常');
    }
    
    // 分析趋势
    if (storageHistory.length > 1) {
      const previous = storageHistory[storageHistory.length - 2];
      const current = currentStatus;
      
      if (current.totalSize > previous.totalSize) {
        const growth = current.totalSize - previous.totalSize;
        console.log(`\n📈 存储增长: +${(growth/1024).toFixed(2)}KB`);
      }
    }
    
    console.log('=====================================\n');
    
    // 记录历史
    storageHistory.push(currentStatus);
    if (storageHistory.length > 10) {
      storageHistory.shift(); // 只保留最近10次记录
    }
  }
  
  // 检查SmartStorage是否被正确使用
  function checkSmartStorageUsage() {
    if (!window.smartStorage) {
      console.warn('[存储诊断] ⚠️ SmartStorage API不可用，MD备份可能直接使用localStorage');
      return false;
    }
    
    // 检查MD备份是否在SmartStorage的访问日志中
    if (window.SmartLocalStorage && window.SmartLocalStorage.accessLog) {
      const mdBackupInLog = window.SmartLocalStorage.accessLog['md_base_backup'];
      if (!mdBackupInLog && localStorage.getItem('md_base_backup')) {
        console.warn('[存储诊断] ⚠️ MD备份存在但不在SmartStorage访问日志中，可能绕过了智能存储');
        return false;
      }
    }
    
    return true;
  }
  
  // 测试SmartStorage清理功能
  function testSmartStorageCleanup() {
    if (!window.SmartLocalStorage) {
      console.warn('[存储诊断] 无法测试清理功能：SmartStorage不可用');
      return;
    }
    
    console.log('[存储诊断] 🧪 测试SmartStorage清理功能...');
    
    // 获取清理候选项
    try {
      const candidates = window.SmartLocalStorage.getCleanupCandidates();
      console.log(`[存储诊断] 清理候选项: ${candidates.length}个`);
      
      if (candidates.length > 0) {
        console.log('[存储诊断] 前5个清理候选项:');
        candidates.slice(0, 5).forEach((candidate, index) => {
          const priorityName = {
            1: 'CRITICAL',
            2: 'HIGH', 
            3: 'MEDIUM',
            4: 'LOW',
            5: 'DISPOSABLE'
          }[candidate.priority] || `P${candidate.priority}`;
          
          console.log(`  ${index + 1}. ${candidate.key} (${priorityName}, ${(candidate.size/1024).toFixed(2)}KB, ${Math.floor(candidate.timeSinceAccess/1000/60)}分钟前访问)`);
        });
      }
    } catch(e) {
      console.error('[存储诊断] 清理功能测试失败:', e);
    }
  }
  
  // 启动诊断
  function startDiagnostic() {
    console.log('[存储诊断] 🚀 启动存储策略诊断...');
    
    // 立即生成一次报告
    setTimeout(() => {
      generateDiagnosticReport();
      checkSmartStorageUsage();
      testSmartStorageCleanup();
    }, 3000);
    
    // 定期检查
    setInterval(() => {
      checkSmartStorageUsage();
    }, DIAGNOSTIC_CONFIG.checkInterval);
    
    // 定期生成报告
    setInterval(() => {
      generateDiagnosticReport();
    }, DIAGNOSTIC_CONFIG.reportInterval);
  }
  
  // 暴露到全局
  window.StorageDiagnostic = {
    generateReport: generateDiagnosticReport,
    getStatus: getStorageStatus,
    checkUsage: checkSmartStorageUsage,
    testCleanup: testSmartStorageCleanup
  };
  
  // 自动启动诊断
  setTimeout(startDiagnostic, 2000);
  
  console.log('[存储诊断] ✅ 诊断脚本已加载');
  
})();
