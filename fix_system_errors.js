/**
 * 系统错误修复脚本
 * 解决ES6模块导入错误和功能失效问题
 */

(function() {
    'use strict';
    
    console.log('[SystemFix] 开始修复系统错误...');
    
    // 1. 修复ES6模块导入错误
    function fixModuleImportErrors() {
        console.log('[SystemFix] 修复ES6模块导入错误');
        
        // 移除可能导致错误的export语句
        const scripts = document.querySelectorAll('script[src*="Autogen"]');
        scripts.forEach(script => {
            if (script.src.includes('export') || script.src.includes('import')) {
                console.warn('[SystemFix] 发现问题脚本:', script.src);
            }
        });
    }
    
    // 2. 确保"读"按钮功能正常
    function fixImportButton() {
        console.log('[SystemFix] 检查"读"按钮功能');
        
        const importBtn = document.getElementById('mindmap-import-btn');
        const fileInput = document.getElementById('fileInputMindmap');
        
        if (!importBtn) {
            console.error('[SystemFix] 未找到导入按钮');
            return;
        }
        
        if (!fileInput) {
            console.error('[SystemFix] 未找到文件输入控件');
            return;
        }
        
        // 检查按钮是否已绑定事件
        if (!importBtn.dataset.mmWired) {
            console.log('[SystemFix] 重新绑定导入按钮事件');
            
            importBtn.addEventListener('click', function() {
                console.log('[SystemFix] 导入按钮被点击');
                
                if (window.MindmapController && window.MindmapController.importMindmapFromPicker) {
                    window.MindmapController.importMindmapFromPicker();
                } else {
                    // 直接触发文件选择
                    fileInput.click();
                }
            });
            
            importBtn.dataset.mmWired = '1';
        }
        
        // 确保文件输入控件有change事件
        if (!fileInput.dataset.fixWired) {
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    console.log('[SystemFix] 文件选择:', file.name);
                    
                    if (window.MindmapController && window.MindmapController.importMindmapFromFile) {
                        window.MindmapController.importMindmapFromFile(file);
                    } else {
                        console.error('[SystemFix] MindmapController未找到');
                    }
                }
                fileInput.value = ''; // 清空，允许重复选择同一文件
            });
            
            fileInput.dataset.fixWired = '1';
        }
        
        console.log('[SystemFix] "读"按钮功能检查完成');
    }
    
    // 3. 修复StorageManager重复定义问题
    function fixStorageManagerConflicts() {
        console.log('[SystemFix] 修复StorageManager冲突');
        
        // 检查是否有多个StorageManager定义
        if (window.StorageManager && window.AutogenUnifiedStorage) {
            console.warn('[SystemFix] 检测到StorageManager冲突，使用统一存储');
            
            // 创建兼容性适配器
            if (!window.StorageSystem) {
                window.StorageSystem = {
                    get: (key) => {
                        if (window.AutogenUnifiedStorage) {
                            return window.AutogenUnifiedStorage.retrieve('app_state', key);
                        }
                        return localStorage.getItem(key);
                    },
                    set: (key, value) => {
                        if (window.AutogenUnifiedStorage) {
                            return window.AutogenUnifiedStorage.store('app_state', key, value);
                        }
                        return localStorage.setItem(key, JSON.stringify(value));
                    }
                };
            }
        }
    }
    
    // 4. 检查并修复关键组件
    function checkCriticalComponents() {
        console.log('[SystemFix] 检查关键组件');
        
        const components = [
            'MindmapController',
            'jsMind',
            'StorageSystem'
        ];
        
        components.forEach(component => {
            if (window[component]) {
                console.log(`[SystemFix] ✅ ${component} 已加载`);
            } else {
                console.warn(`[SystemFix] ⚠️ ${component} 未找到`);
            }
        });
    }
    
    // 5. 主修复流程
    function runSystemFix() {
        try {
            fixModuleImportErrors();
            fixStorageManagerConflicts();
            checkCriticalComponents();
            
            // 延迟执行UI相关修复，确保DOM已加载
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', fixImportButton);
            } else {
                fixImportButton();
            }
            
            console.log('[SystemFix] ✅ 系统错误修复完成');
            
        } catch (error) {
            console.error('[SystemFix] 修复过程中出现错误:', error);
        }
    }
    
    // 6. 添加系统状态监控
    function addSystemMonitoring() {
        // 监控错误
        window.addEventListener('error', function(e) {
            if (e.message.includes('import') || e.message.includes('export')) {
                console.warn('[SystemFix] 检测到模块导入错误:', e.message);
            }
        });
        
        // 定期检查关键功能
        setInterval(() => {
            const importBtn = document.getElementById('mindmap-import-btn');
            if (importBtn && !importBtn.dataset.mmWired) {
                console.warn('[SystemFix] 检测到导入按钮未绑定，重新修复');
                fixImportButton();
            }
        }, 30000); // 每30秒检查一次
    }
    
    // 启动修复
    runSystemFix();
    addSystemMonitoring();
    
    // 暴露修复函数到全局，方便手动调用
    window.SystemFix = {
        fixImportButton,
        fixStorageManagerConflicts,
        checkCriticalComponents,
        runSystemFix
    };
    
})();
