/**
 * 存储监控和管理工具
 * 提供实时存储监控、自动清理和健康检查功能
 */
class StorageMonitor {
    constructor() {
        this.adapter = null;
        this.monitorInterval = null;
        this.alertThresholds = {
            caution: 70,    // 70% 提醒
            warning: 85,    // 85% 警告
            critical: 95    // 95% 严重
        };
        
        this.init();
    }
    
    init() {
        // 等待 LocalStorageAdapter 加载
        this.waitForAdapter().then(() => {
            this.startMonitoring();
            console.log('[StorageMonitor] 存储监控已启动');
        });
    }
    
    async waitForAdapter() {
        return new Promise((resolve) => {
            const checkAdapter = () => {
                if (window.LocalStorageAdapter) {
                    this.adapter = new window.LocalStorageAdapter();
                    resolve();
                } else {
                    setTimeout(checkAdapter, 100);
                }
            };
            checkAdapter();
        });
    }
    
    /**
     * 启动监控
     */
    startMonitoring() {
        // 立即检查一次
        this.checkStorageHealth();
        
        // 每分钟检查一次
        this.monitorInterval = setInterval(() => {
            this.checkStorageHealth();
        }, 60000);
        
        // 监听存储变化事件
        this.setupStorageEventListeners();
    }
    
    /**
     * 停止监控
     */
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }
    
    /**
     * 检查存储健康状态
     */
    checkStorageHealth() {
        if (!this.adapter) return;
        
        try {
            const health = this.adapter.getHealthStatus();
            const usagePercent = parseFloat(health.usagePercent);
            
            // 根据使用率采取不同行动
            if (usagePercent >= this.alertThresholds.critical) {
                this.handleCriticalStorage(health);
            } else if (usagePercent >= this.alertThresholds.warning) {
                this.handleWarningStorage(health);
            } else if (usagePercent >= this.alertThresholds.caution) {
                this.handleCautionStorage(health);
            }
            
            // 更新工作区显示
            this.updateWorkspaceDisplay(health);
            
            // 记录到日志
            if (window.LogPanel) {
                window.LogPanel.log(`存储监控: ${health.usagePercent}% 使用率, ${health.itemCount}个项目`);
            }
            
        } catch (error) {
            console.error('[StorageMonitor] 健康检查失败:', error);
        }
    }
    
    /**
     * 处理严重存储不足
     */
    handleCriticalStorage(health) {
        console.error(`[StorageMonitor] 🚨 存储空间严重不足: ${health.usagePercent}%`);
        
        // 立即执行激进清理
        if (this.adapter._aggressiveCleanup) {
            this.adapter._aggressiveCleanup();
        }
        
        // 显示用户警告
        this.showStorageAlert('critical', health);
    }
    
    /**
     * 处理存储警告
     */
    handleWarningStorage(health) {
        console.warn(`[StorageMonitor] ⚠️ 存储空间紧张: ${health.usagePercent}%`);
        
        // 执行标准清理
        if (this.adapter._cleanup) {
            this.adapter._cleanup();
        }
        
        // 显示用户提醒
        this.showStorageAlert('warning', health);
    }
    
    /**
     * 处理存储提醒
     */
    handleCautionStorage(health) {
        console.info(`[StorageMonitor] 💡 存储空间使用较多: ${health.usagePercent}%`);
    }
    
    /**
     * 显示存储警告
     */
    showStorageAlert(level, health) {
        const messages = {
            critical: `🚨 存储空间严重不足 (${health.usagePercent}%)！\n系统已自动清理，请考虑导出重要数据。`,
            warning: `⚠️ 存储空间紧张 (${health.usagePercent}%)！\n建议清理不需要的数据或导出备份。`,
            caution: `💡 存储空间使用较多 (${health.usagePercent}%)。\n建议定期清理数据。`
        };
        
        // 显示 toast 提醒（如果存在）
        if (window.mindmapController && window.mindmapController.showToast) {
            window.mindmapController.showToast(messages[level], level === 'critical' ? 10000 : 5000);
        }
        
        // 记录到日志面板
        if (window.LogPanel) {
            const logMethod = level === 'critical' ? 'error' : level === 'warning' ? 'warn' : 'log';
            window.LogPanel[logMethod](`存储${level}: ${health.message}`);
        }
    }
    
    /**
     * 更新工作区显示
     */
    updateWorkspaceDisplay(health) {
        try {
            // 工作区UI元素已移除，仅保留日志记录
            console.log(`[StorageMonitor] 存储状态: ${health.usagePercent}% 使用率, ${health.itemCount}个项目, ${(health.totalSize / 1024 / 1024).toFixed(2)}MB`);
            
        } catch (error) {
            console.warn('[StorageMonitor] 更新工作区显示失败:', error);
        }
    }
    
    /**
     * 设置存储事件监听器
     */
    setupStorageEventListeners() {
        // 监听存储变化
        window.addEventListener('storage', (e) => {
            console.log('[StorageMonitor] 检测到存储变化:', e.key);
            // 延迟检查，避免频繁触发
            setTimeout(() => this.checkStorageHealth(), 1000);
        });
        
        // 监听脑图保存事件
        window.addEventListener('mindmap:saved', () => {
            setTimeout(() => this.checkStorageHealth(), 500);
        });
        
        // 监听项目注册事件
        window.addEventListener('registry:registered', () => {
            setTimeout(() => this.checkStorageHealth(), 500);
        });
    }
    
    /**
     * 手动清理存储
     */
    manualCleanup(aggressive = false) {
        if (!this.adapter) {
            console.warn('[StorageMonitor] 适配器未就绪');
            return false;
        }
        
        try {
            if (aggressive && this.adapter._aggressiveCleanup) {
                this.adapter._aggressiveCleanup();
            } else if (this.adapter._cleanup) {
                this.adapter._cleanup();
            }
            
            // 清理后重新检查
            setTimeout(() => this.checkStorageHealth(), 1000);
            return true;
            
        } catch (error) {
            console.error('[StorageMonitor] 手动清理失败:', error);
            return false;
        }
    }
    
    /**
     * 获取存储统计信息
     */
    getStorageStats() {
        if (!this.adapter) return null;
        
        try {
            const health = this.adapter.getHealthStatus();
            const stats = this.adapter.getStats();
            
            return {
                health,
                stats,
                breakdown: this.getStorageBreakdown()
            };
        } catch (error) {
            console.error('[StorageMonitor] 获取统计失败:', error);
            return null;
        }
    }
    
    /**
     * 获取存储空间分解
     */
    getStorageBreakdown() {
        const breakdown = {
            mindmaps: 0,
            snapshots: 0,
            cache: 0,
            config: 0,
            temp: 0,
            others: 0
        };
        
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                const size = value ? value.length : 0;
                
                if (key.includes('mindmap') || key.includes('mm:')) {
                    breakdown.mindmaps += size;
                } else if (key.includes('snapshot')) {
                    breakdown.snapshots += size;
                } else if (key.includes('cache') || key.includes('__mind_full_cache')) {
                    breakdown.cache += size;
                } else if (key.includes('config') || key.includes('setting')) {
                    breakdown.config += size;
                } else if (key.includes('temp_') || key.includes('debug_')) {
                    breakdown.temp += size;
                } else {
                    breakdown.others += size;
                }
            }
        } catch (error) {
            console.error('[StorageMonitor] 获取分解失败:', error);
        }
        
        return breakdown;
    }
}

// 创建全局实例
if (typeof window !== 'undefined') {
    window.StorageMonitor = StorageMonitor;
    
    // 自动启动监控
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.storageMonitor) {
            window.storageMonitor = new StorageMonitor();
        }
    });
}

console.log('[StorageMonitor] 存储监控模块已加载');
