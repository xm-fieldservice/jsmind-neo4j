/**
 * 强刷修复脚本
 * 解决强刷后脑图不显示和权限请求问题
 */
(function() {
  'use strict';
  
  console.log('[强刷修复] 修复脚本加载');
  
  // 检测是否为强刷
  function isHardRefresh() {
    // 检测性能导航类型
    if (performance.navigation) {
      return performance.navigation.type === performance.navigation.TYPE_RELOAD;
    }
    
    // 现代浏览器使用 PerformanceNavigationTiming
    if (performance.getEntriesByType) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        return navEntries[0].type === 'reload';
      }
    }
    
    return false;
  }
  
  // 修复权限问题
  function fixPermissionIssues() {
    // 禁用可能触发权限请求的API调用
    const originalClipboard = navigator.clipboard;
    
    // 在页面完全加载前暂时禁用剪贴板API
    if (originalClipboard && document.readyState === 'loading') {
      console.log('[强刷修复] 暂时禁用剪贴板API，避免权限请求');
      
      // 创建一个安全的代理
      const safeClipboard = {
        writeText: function(text) {
          return new Promise((resolve, reject) => {
            // 延迟到用户交互后再执行
            setTimeout(() => {
              if (originalClipboard && originalClipboard.writeText) {
                originalClipboard.writeText(text).then(resolve).catch(reject);
              } else {
                reject(new Error('剪贴板API不可用'));
              }
            }, 100);
          });
        }
      };
      
      // 临时替换
      Object.defineProperty(navigator, 'clipboard', {
        get: () => safeClipboard,
        configurable: true
      });
      
      // 页面加载完成后恢复
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          Object.defineProperty(navigator, 'clipboard', {
            get: () => originalClipboard,
            configurable: true
          });
          console.log('[强刷修复] 剪贴板API已恢复');
        }, 1000);
      });
    }
  }
  
  // 修复脑图显示问题
  function fixMindmapDisplay() {
    // 监听MindmapController初始化
    const checkMindmapDisplay = () => {
      if (window.mindmapController && window.mindmapController.mind) {
        const container = document.getElementById('mindmap-container');
        if (container && container.children.length === 0) {
          console.log('[强刷修复] 检测到脑图容器为空，触发重新渲染');
          
          // 延迟触发自动选择
          setTimeout(() => {
            if (window.mindmapController.autoSelectFirstProject) {
              window.mindmapController.autoSelectFirstProject();
            }
          }, 500);
        }
      }
    };
    
    // 多次检查确保修复
    setTimeout(checkMindmapDisplay, 1000);
    setTimeout(checkMindmapDisplay, 3000);
    setTimeout(checkMindmapDisplay, 5000);
  }
  
  // 强制清理可能导致问题的缓存
  function cleanupProblematicCache() {
    try {
      // 清理可能损坏的快照缓存
      const snapshot = localStorage.getItem('__mind_full_cache_v1');
      if (snapshot) {
        try {
          const parsed = JSON.parse(snapshot);
          if (!parsed || !parsed.root) {
            console.log('[强刷修复] 清理损坏的快照缓存');
            localStorage.removeItem('__mind_full_cache_v1');
          }
        } catch(e) {
          console.log('[强刷修复] 清理无效的快照缓存');
          localStorage.removeItem('__mind_full_cache_v1');
        }
      }
    } catch(e) {
      console.warn('[强刷修复] 缓存清理失败:', e);
    }
  }
  
  // 主修复流程
  function applyRefreshFixes() {
    const isRefresh = isHardRefresh();
    console.log('[强刷修复] 检测到强刷:', isRefresh);
    
    if (isRefresh) {
      console.log('[强刷修复] 🔧 应用强刷修复...');
      
      // 1. 修复权限问题
      fixPermissionIssues();
      
      // 2. 清理问题缓存
      cleanupProblematicCache();
      
      // 3. 修复脑图显示
      setTimeout(() => {
        fixMindmapDisplay();
      }, 2000);
      
      console.log('[强刷修复] ✅ 强刷修复已应用');
    }
  }
  
  // 监听页面可见性变化
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // 页面重新可见时检查脑图状态
      setTimeout(() => {
        if (window.mindmapController) {
          const container = document.getElementById('mindmap-container');
          if (container && container.children.length === 0) {
            console.log('[强刷修复] 页面可见时发现脑图为空，尝试恢复');
            fixMindmapDisplay();
          }
        }
      }, 500);
    }
  }
  
  // 启动修复
  applyRefreshFixes();
  
  // 监听页面可见性
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // 暴露到全局用于调试
  window.RefreshFix = {
    isHardRefresh: isHardRefresh,
    fixMindmapDisplay: fixMindmapDisplay,
    cleanupCache: cleanupProblematicCache
  };
  
  console.log('[强刷修复] ✅ 修复脚本已就绪');
  
})();
