/**
 * 修复导入后显示问题
 * 确保导入的脑图能正确显示在界面上
 */

(function() {
    'use strict';
    
    console.log('[ImportDisplayFix] 导入显示修复脚本加载');
    
    function fixImportDisplay() {
        console.log('[ImportDisplayFix] 开始修复导入显示问题');
        
        // 检查MindmapController是否存在
        if (!window.MindmapController && !window.mindmapController) {
            console.error('[ImportDisplayFix] MindmapController未找到');
            return false;
        }
        
        const controller = window.MindmapController || window.mindmapController;
        
        // 增强导入后的显示逻辑
        const originalImportFromFile = controller.importMindmapFromFile;
        if (originalImportFromFile) {
            controller.importMindmapFromFile = async function(file) {
                console.log('[ImportDisplayFix] 拦截导入文件方法');
                
                try {
                    // 调用原始导入方法
                    await originalImportFromFile.call(this, file);
                    
                    // 导入完成后，强制刷新显示
                    console.log('[ImportDisplayFix] 导入完成，开始刷新显示');
                    
                    // 方法1：尝试从Registry加载
                    if (window.Registry && window.Registry.repo && window.Registry.repo.store) {
                        const projects = window.Registry.repo.store.state.projects;
                        if (projects && projects.length > 0) {
                            const firstProject = projects[0];
                            console.log('[ImportDisplayFix] 从Registry加载第一个项目:', firstProject.name);
                            
                            if (firstProject.payload && firstProject.payload.data) {
                                let data = firstProject.payload.data;
                                
                                // 设置数据并渲染
                                this.data = data;
                                this.renderMindmap();
                                
                                console.log('[ImportDisplayFix] ✅ Registry方式刷新成功');
                                return;
                            }
                        }
                    }
                    
                    // 方法2：从localStorage直接加载最新数据
                    console.log('[ImportDisplayFix] Registry不可用，尝试从localStorage加载');
                    try {
                        const mindmapData = localStorage.getItem('mindmap_data_v1');
                        if (mindmapData) {
                            const data = JSON.parse(mindmapData);
                            this.data = data;
                            this.renderMindmap();
                            console.log('[ImportDisplayFix] ✅ localStorage方式刷新成功');
                            return;
                        }
                    } catch (error) {
                        console.warn('[ImportDisplayFix] localStorage加载失败:', error);
                    }
                    
                    // 方法3：强制重新加载页面（最后手段）
                    console.warn('[ImportDisplayFix] 其他方法都失败，建议手动刷新页面');
                    
                } catch (error) {
                    console.error('[ImportDisplayFix] 导入过程出错:', error);
                }
            };
            
            console.log('[ImportDisplayFix] ✅ 导入方法已增强');
            return true;
        } else {
            console.warn('[ImportDisplayFix] 未找到原始导入方法');
            return false;
        }
    }
    
    function forceRefreshMindmap() {
        console.log('[ImportDisplayFix] 强制刷新脑图显示');
        
        const controller = window.MindmapController || window.mindmapController;
        if (!controller) {
            console.error('[ImportDisplayFix] MindmapController未找到');
            return false;
        }
        
        try {
            // 尝试重新渲染当前数据
            if (controller.data) {
                controller.renderMindmap();
                console.log('[ImportDisplayFix] ✅ 使用现有数据刷新成功');
                return true;
            }
            
            // 尝试从localStorage加载
            const mindmapData = localStorage.getItem('mindmap_data_v1');
            if (mindmapData) {
                const data = JSON.parse(mindmapData);
                controller.data = data;
                controller.renderMindmap();
                console.log('[ImportDisplayFix] ✅ 从localStorage刷新成功');
                return true;
            }
            
            console.warn('[ImportDisplayFix] 没有找到可用的脑图数据');
            return false;
            
        } catch (error) {
            console.error('[ImportDisplayFix] 强制刷新失败:', error);
            return false;
        }
    }
    
    function checkImportStatus() {
        console.log('[ImportDisplayFix] 检查导入状态');
        
        const status = {
            mindmapController: !!(window.MindmapController || window.mindmapController),
            registry: !!(window.Registry && window.Registry.repo),
            localStorage: !!localStorage.getItem('mindmap_data_v1'),
            importButton: !!document.getElementById('mindmap-import-btn')
        };
        
        console.log('[ImportDisplayFix] 导入状态检查:', status);
        return status;
    }
    
    // 等待MindmapController加载完成后再执行修复
    function waitForController() {
        if (window.MindmapController || window.mindmapController) {
            console.log('[ImportDisplayFix] MindmapController已加载，开始修复');
            fixImportDisplay();
        } else {
            console.log('[ImportDisplayFix] 等待MindmapController加载...');
            setTimeout(waitForController, 1000);
        }
    }
    
    // 启动修复
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForController);
    } else {
        waitForController();
    }
    
    // 暴露到全局
    window.ImportDisplayFix = {
        fix: fixImportDisplay,
        refresh: forceRefreshMindmap,
        checkStatus: checkImportStatus,
        waitForController: waitForController
    };
    
    console.log('[ImportDisplayFix] 修复脚本已加载，可通过 ImportDisplayFix.refresh() 手动刷新');
    
})();
