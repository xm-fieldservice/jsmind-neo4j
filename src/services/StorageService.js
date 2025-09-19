/**
 * 统一存储服务 - 从MindmapController中提取存储逻辑
 * 解决存储键冗余和数据一致性问题
 */
class StorageService {
    constructor() {
        // 统一的存储键定义 - 整合现有的分散键名
        this.keys = {
            // 主要数据存储
            MINDMAP_DATA: 'mindmap_data_v1',           // 保持兼容现有键
            PROJECT_CATALOG: 'mm_project_catalog_v1',   // 项目目录
            NOTES_DATA: 'notes_data',                   // 笔记数据
            
            // 缓存和快照
            FULL_CACHE: '__mind_full_cache_v1',         // 全图快照
            
            // 配置和状态
            SAVE_WHITELIST: 'save_whitelist',           // 保存白名单
            EDITOR_SIZE: 'detail_content_editor_size',  // 编辑器尺寸
            PANE_STATE: 'mmFsPaneState',               // 面板状态
            
            // 系统标签
            SYSTEM_TAGS: 'mm:proj:SYS_TAGS:data',     // 系统标签数据
            
            // 诊断数据
            DRAG_DIAG: '_mm_drag_diag_v1'              // 拖拽诊断
        };
        
        // 废弃的键（需要清理）
        this.deprecatedKeys = [
            'md_document_backup',           // MD文档备份（已移除）
            'temp_agent_request',           // 临时智能体请求
            'mmFsPaneState',               // 全屏面板状态（可选清理）
        ];
        
        // 动态键模式（用于批量操作）
        this.dynamicKeyPatterns = [
            /^mm:.+:data$/,                // 项目数据键 mm:{id}:data
            /^backup_\d+$/,                // 时间戳备份键
            /^temp_/,                      // 临时数据键
        ];
        
        this.init();
    }
    
    init() {
        // 启动时自动清理废弃键
        this.cleanupDeprecatedKeys();
        
        // 设置存储监控
        this.setupStorageMonitoring();
        
        console.log('[StorageService] 存储服务已初始化');
    }
    
    /**
     * 保存脑图数据 - 统一入口
     */
    saveMindmapData(data, projectId = null) {
        try {
            const key = projectId ? `mm:${projectId}:data` : this.keys.MINDMAP_DATA;
            const payload = {
                ...data,
                meta: {
                    ...data.meta,
                    savedAt: Date.now(),
                    version: '2.0'
                }
            };
            
            localStorage.setItem(key, JSON.stringify(payload));
            
            // 同时更新全图快照
            this.updateFullSnapshot(payload);
            
            console.log('[StorageService] 脑图数据已保存:', key);
            return { success: true, key };
            
        } catch (error) {
            console.error('[StorageService] 保存失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 加载脑图数据 - 统一入口
     */
    loadMindmapData(projectId = null) {
        try {
            // 1. 优先尝试项目特定键
            if (projectId) {
                const projectKey = `mm:${projectId}:data`;
                const projectData = this.getItem(projectKey);
                if (projectData) {
                    console.log('[StorageService] 从项目键加载:', projectKey);
                    return projectData;
                }
            }
            
            // 2. 回退到主键
            const mainData = this.getItem(this.keys.MINDMAP_DATA);
            if (mainData) {
                console.log('[StorageService] 从主键加载:', this.keys.MINDMAP_DATA);
                return mainData;
            }
            
            // 3. 最后尝试全图快照
            const snapshotData = this.getItem(this.keys.FULL_CACHE);
            if (snapshotData && snapshotData.data) {
                console.log('[StorageService] 从快照恢复');
                return {
                    format: 'node_tree',
                    data: snapshotData.data,
                    meta: snapshotData.meta || {}
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('[StorageService] 加载失败:', error);
            return null;
        }
    }
    
    /**
     * 更新全图快照
     */
    updateFullSnapshot(data) {
        try {
            const snapshot = {
                format: data.format || 'node_tree',
                data: data.data,
                meta: {
                    ...data.meta,
                    snapshotAt: Date.now()
                }
            };
            
            localStorage.setItem(this.keys.FULL_CACHE, JSON.stringify(snapshot));
            console.log('[StorageService] 全图快照已更新');
            
        } catch (error) {
            console.warn('[StorageService] 快照更新失败:', error);
        }
    }
    
    /**
     * 保存项目目录
     */
    saveProjectCatalog(catalog) {
        try {
            localStorage.setItem(this.keys.PROJECT_CATALOG, JSON.stringify(catalog));
            return { success: true };
        } catch (error) {
            console.error('[StorageService] 项目目录保存失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 加载项目目录
     */
    loadProjectCatalog() {
        try {
            const data = this.getItem(this.keys.PROJECT_CATALOG);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('[StorageService] 项目目录加载失败:', error);
            return [];
        }
    }
    
    /**
     * 保存笔记数据
     */
    saveNotes(notes) {
        try {
            localStorage.setItem(this.keys.NOTES_DATA, JSON.stringify(notes));
            return { success: true };
        } catch (error) {
            console.error('[StorageService] 笔记保存失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 加载笔记数据
     */
    loadNotes() {
        try {
            const data = this.getItem(this.keys.NOTES_DATA);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('[StorageService] 笔记加载失败:', error);
            return [];
        }
    }
    
    /**
     * 安全的获取localStorage项目
     */
    getItem(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn(`[StorageService] 解析失败 ${key}:`, error);
            return null;
        }
    }
    
    /**
     * 安全的设置localStorage项目
     */
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`[StorageService] 存储失败 ${key}:`, error);
            return false;
        }
    }
    
    /**
     * 清理废弃的存储键
     */
    cleanupDeprecatedKeys() {
        let cleaned = 0;
        
        // 清理明确的废弃键
        this.deprecatedKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                cleaned++;
                console.log(`[StorageService] 已清理废弃键: ${key}`);
            }
        });
        
        // 清理匹配模式的键
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
            // 检查是否匹配废弃模式
            if (key.includes('backup') && key !== this.keys.FULL_CACHE) {
                localStorage.removeItem(key);
                cleaned++;
                console.log(`[StorageService] 已清理备份键: ${key}`);
            }
            
            if (key.startsWith('temp_') && !key.includes('agent')) {
                localStorage.removeItem(key);
                cleaned++;
                console.log(`[StorageService] 已清理临时键: ${key}`);
            }
        });
        
        if (cleaned > 0) {
            console.log(`[StorageService] 共清理 ${cleaned} 个废弃存储项`);
        }
    }
    
    /**
     * 获取存储使用情况统计
     */
    getStorageStats() {
        const stats = {
            totalKeys: 0,
            totalSize: 0,
            keysByType: {},
            sizeByType: {}
        };
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            const size = value ? value.length : 0;
            
            stats.totalKeys++;
            stats.totalSize += size;
            
            // 按类型分类
            let type = 'other';
            if (key.includes('mindmap') || key.includes('mm:')) type = 'mindmap';
            else if (key.includes('notes')) type = 'notes';
            else if (key.includes('cache') || key.includes('snapshot')) type = 'cache';
            else if (key.includes('config') || key.includes('setting')) type = 'config';
            
            stats.keysByType[type] = (stats.keysByType[type] || 0) + 1;
            stats.sizeByType[type] = (stats.sizeByType[type] || 0) + size;
        }
        
        return stats;
    }
    
    /**
     * 设置存储监控
     */
    setupStorageMonitoring() {
        // 监控存储使用量
        const checkStorageUsage = () => {
            const stats = this.getStorageStats();
            const sizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
            
            if (stats.totalSize > 5 * 1024 * 1024) { // 超过5MB
                console.warn(`[StorageService] 存储使用量较高: ${sizeMB}MB`);
            }
            
            // 输出统计信息到日志面板
            if (window.LogPanel) {
                window.LogPanel.log(`存储统计: ${stats.totalKeys}个键, ${sizeMB}MB`);
            }
        };
        
        // 每5分钟检查一次
        setInterval(checkStorageUsage, 5 * 60 * 1000);
        
        // 立即执行一次
        setTimeout(checkStorageUsage, 1000);
    }
    
    /**
     * 导出所有数据（用于备份）
     */
    exportAllData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: '2.0',
            data: {}
        };
        
        // 导出主要数据
        Object.entries(this.keys).forEach(([name, key]) => {
            const value = this.getItem(key);
            if (value) {
                exportData.data[name] = value;
            }
        });
        
        // 导出动态项目数据
        const projectData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.match(/^mm:.+:data$/)) {
                projectData[key] = this.getItem(key);
            }
        }
        
        if (Object.keys(projectData).length > 0) {
            exportData.data.PROJECTS = projectData;
        }
        
        return exportData;
    }
    
    /**
     * 导入数据（从备份恢复）
     */
    importAllData(importData) {
        try {
            if (!importData || !importData.data) {
                throw new Error('无效的导入数据格式');
            }
            
            let imported = 0;
            
            // 导入主要数据
            Object.entries(importData.data).forEach(([name, value]) => {
                if (name === 'PROJECTS') {
                    // 处理项目数据
                    Object.entries(value).forEach(([key, projectValue]) => {
                        if (this.setItem(key, projectValue)) {
                            imported++;
                        }
                    });
                } else if (this.keys[name]) {
                    // 处理标准数据
                    if (this.setItem(this.keys[name], value)) {
                        imported++;
                    }
                }
            });
            
            console.log(`[StorageService] 已导入 ${imported} 个数据项`);
            return { success: true, imported };
            
        } catch (error) {
            console.error('[StorageService] 导入失败:', error);
            return { success: false, error: error.message };
        }
    }
}

// 创建全局实例
window.StorageService = new StorageService();

console.log('[StorageService] 统一存储服务已加载');
