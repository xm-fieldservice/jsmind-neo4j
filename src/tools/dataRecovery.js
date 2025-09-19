/**
 * 统一数据修复工具
 * 整合所有数据恢复、项目列表修复等功能
 * 替代15+个重复的修复脚本
 */

class DataRecoveryTool {
    constructor() {
        this.recoveryMethods = new Map();
        this.initRecoveryMethods();
    }

    initRecoveryMethods() {
        // 注册所有修复方法
        this.recoveryMethods.set('projectList', this.recoverProjectList.bind(this));
        this.recoveryMethods.set('mindmapData', this.recoverMindmapData.bind(this));
        this.recoveryMethods.set('localStorage', this.recoverLocalStorage.bind(this));
        this.recoveryMethods.set('registry', this.recoverRegistry.bind(this));
        this.recoveryMethods.set('contentSave', this.fixContentSave.bind(this));
        this.recoveryMethods.set('eventBinding', this.fixEventBinding.bind(this));
        this.recoveryMethods.set('dragState', this.fixDragState.bind(this));
        this.recoveryMethods.set('dataCorruption', this.fixDataCorruption.bind(this));
    }

    /**
     * 主修复入口 - 自动诊断并修复问题
     */
    async autoRepair() {
        console.log('[DataRecovery] 开始自动诊断...');
        const issues = await this.diagnose();
        
        if (issues.length === 0) {
            console.log('[DataRecovery] ✅ 未发现问题');
            return { success: true, issues: [], fixed: [] };
        }

        console.log(`[DataRecovery] 发现 ${issues.length} 个问题:`, issues);
        const fixed = [];

        for (const issue of issues) {
            try {
                const result = await this.repair(issue.type, issue.data);
                if (result.success) {
                    fixed.push(issue.type);
                    console.log(`[DataRecovery] ✅ 已修复: ${issue.type}`);
                } else {
                    console.warn(`[DataRecovery] ❌ 修复失败: ${issue.type}`, result.error);
                }
            } catch (error) {
                console.error(`[DataRecovery] 修复异常: ${issue.type}`, error);
            }
        }

        return { success: fixed.length > 0, issues, fixed };
    }

    /**
     * 诊断系统问题
     */
    async diagnose() {
        const issues = [];

        // 检查项目列表
        if (!this.isProjectListHealthy()) {
            issues.push({ type: 'projectList', severity: 'high' });
        }

        // 检查脑图数据
        if (!this.isMindmapDataHealthy()) {
            issues.push({ type: 'mindmapData', severity: 'high' });
        }

        // 检查本地存储
        if (!this.isLocalStorageHealthy()) {
            issues.push({ type: 'localStorage', severity: 'medium' });
        }

        // 检查注册表
        if (!this.isRegistryHealthy()) {
            issues.push({ type: 'registry', severity: 'medium' });
        }

        // 检查事件绑定
        if (!this.isEventBindingHealthy()) {
            issues.push({ type: 'eventBinding', severity: 'low' });
        }

        return issues;
    }

    /**
     * 执行特定类型的修复
     */
    async repair(type, data = null) {
        const method = this.recoveryMethods.get(type);
        if (!method) {
            return { success: false, error: `未知的修复类型: ${type}` };
        }

        try {
            return await method(data);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ==================== 健康检查方法 ====================

    isProjectListHealthy() {
        try {
            const catalog = this.loadCatalog();
            return Array.isArray(catalog) && catalog.length >= 0;
        } catch {
            return false;
        }
    }

    isMindmapDataHealthy() {
        try {
            if (typeof window !== 'undefined' && window.MindmapStorage) {
                const data = window.MindmapStorage.load();
                return data && data.format && data.data;
            }
            return true; // 如果没有MindmapStorage，认为健康
        } catch {
            return false;
        }
    }

    isLocalStorageHealthy() {
        try {
            // 检查关键存储项
            const keys = ['mindmap_data_v1', '__mind_full_cache_v1'];
            return keys.some(key => localStorage.getItem(key) !== null);
        } catch {
            return false;
        }
    }

    isRegistryHealthy() {
        try {
            return typeof window !== 'undefined' && 
                   window.Registry && 
                   window.Registry.fsm && 
                   window.Registry.fsm.state;
        } catch {
            return false;
        }
    }

    isEventBindingHealthy() {
        try {
            return typeof window !== 'undefined' && 
                   window.MindmapController && 
                   typeof window.MindmapController.bindDetailEvents === 'function';
        } catch {
            return false;
        }
    }

    // ==================== 修复方法 ====================

    async recoverProjectList(data) {
        try {
            console.log('[DataRecovery] 修复项目列表...');
            
            // 尝试从多个源恢复项目列表
            let catalog = this.loadCatalog();
            
            if (!Array.isArray(catalog) || catalog.length === 0) {
                // 从注册表恢复
                if (window.Registry && window.Registry.repo) {
                    const projects = await window.Registry.repo.listAll();
                    catalog = projects.map(p => ({
                        id: p.id,
                        name: p.name,
                        lastModified: p.lastModified || Date.now()
                    }));
                }
            }

            // 保存修复后的目录
            this.saveCatalog(catalog);
            
            // 刷新UI
            if (typeof window !== 'undefined' && window.loadProjectCatalog) {
                window.loadProjectCatalog();
            }

            return { success: true, recovered: catalog.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async recoverMindmapData(data) {
        try {
            console.log('[DataRecovery] 修复脑图数据...');
            
            // 尝试从备份恢复
            const backupKeys = [
                'mindmap_data_v1', 
                '__mind_full_cache_v1'
            ];

            for (const key of backupKeys) {
                try {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const data = JSON.parse(raw);
                        if (data && (data.format === 'node_tree' || data.data)) {
                            // 恢复到主存储
                            if (window.MindmapStorage) {
                                window.MindmapStorage.save(data);
                            }
                            return { success: true, source: key };
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            return { success: false, error: '未找到可恢复的数据' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async recoverLocalStorage(data) {
        try {
            console.log('[DataRecovery] 清理本地存储...');
            
            // 清理损坏的存储项
            const keysToCheck = Object.keys(localStorage);
            let cleaned = 0;

            for (const key of keysToCheck) {
                try {
                    const value = localStorage.getItem(key);
                    if (value) {
                        JSON.parse(value); // 验证JSON格式
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                    cleaned++;
                }
            }

            return { success: true, cleaned };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async recoverRegistry(data) {
        try {
            console.log('[DataRecovery] 修复注册表...');
            
            if (window.Registry && window.Registry.fsm) {
                // 重置状态机到Ready状态
                if (window.Registry.fsm.state !== 'Ready') {
                    window.Registry.fsm.setState('Ready');
                }
                
                // 重新加载注册表数据
                if (window.Registry.repo && typeof window.Registry.repo.loadFromStorage === 'function') {
                    await window.Registry.repo.loadFromStorage();
                }
                
                return { success: true };
            }

            return { success: false, error: '注册表系统不可用' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async fixContentSave(data) {
        try {
            console.log('[DataRecovery] 修复内容保存...');
            
            if (window.MindmapController) {
                // 重新绑定保存事件
                const controller = window.MindmapController;
                if (typeof controller.bindDetailEvents === 'function') {
                    controller.bindDetailEvents();
                }
                
                // 强制保存当前状态
                if (typeof controller.saveMindmapToStorage === 'function') {
                    controller.saveMindmapToStorage();
                }
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async fixEventBinding(data) {
        try {
            console.log('[DataRecovery] 修复事件绑定...');
            
            // 重新绑定关键事件
            if (window.MindmapController && typeof window.MindmapController.bindDetailEvents === 'function') {
                window.MindmapController.bindDetailEvents();
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async fixDragState(data) {
        try {
            console.log('[DataRecovery] 修复拖拽状态...');
            
            // 重置拖拽状态
            if (typeof window !== 'undefined') {
                window.__DRAG_STATE = null;
                window.__DRAG_ACTIVE = false;
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async fixDataCorruption(data) {
        try {
            console.log('[DataRecovery] 修复数据损坏...');
            
            // 综合修复：项目列表 + 脑图数据 + 本地存储
            const results = await Promise.allSettled([
                this.recoverProjectList(),
                this.recoverMindmapData(),
                this.recoverLocalStorage()
            ]);

            const successes = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            
            return { success: successes > 0, fixed: successes };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ==================== 工具方法 ====================

    loadCatalog() {
        try {
            const raw = localStorage.getItem('mm_project_catalog_v1');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    saveCatalog(catalog) {
        try {
            localStorage.setItem('mm_project_catalog_v1', JSON.stringify(catalog));
        } catch (error) {
            console.warn('[DataRecovery] 保存目录失败:', error);
        }
    }

    /**
     * 创建数据备份
     */
    createBackup() {
        try {
            const backup = {
                timestamp: Date.now(),
                catalog: this.loadCatalog(),
                mindmapData: null,
                localStorage: {}
            };

            // 备份脑图数据
            if (window.MindmapStorage) {
                backup.mindmapData = window.MindmapStorage.load();
            }

            // 备份关键localStorage项
            const keysTBackup = ['mindmap_data_v1', '__mind_full_cache_v1'];
            for (const key of keysTBackup) {
                const value = localStorage.getItem(key);
                if (value) {
                    backup.localStorage[key] = value;
                }
            }

            const backupKey = `data_backup_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify(backup));
            
            return { success: true, backupKey };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// 全局暴露
if (typeof window !== 'undefined') {
    window.DataRecoveryTool = DataRecoveryTool;
    
    // 创建全局实例
    window.dataRecovery = new DataRecoveryTool();
    
    // 便捷方法
    window.autoRepair = () => window.dataRecovery.autoRepair();
    window.diagnoseSystem = () => window.dataRecovery.diagnose();
    window.createBackup = () => window.dataRecovery.createBackup();
}

// 模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataRecoveryTool;
}
