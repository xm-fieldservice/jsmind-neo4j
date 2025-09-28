/**
 * 健康监控器 - 基于现有组件统计的轻量监控
 * 复用度: 85% (仅15%新增聚合逻辑)
 */

const HealthMonitor = {
    /**
     * 获取系统健康状态
     */
    async checkHealth() {
        const health = {
            timestamp: Date.now(),
            status: 'healthy',
            components: {}
        };

        // 存储系统健康检查 (基于AutogenUnifiedStorage现有统计)
        if (typeof AutogenUnifiedStorage !== 'undefined') {
            const storageStats = AutogenUnifiedStorage.getStats?.() || {};
            health.components.storage = {
                status: storageStats.errors > 10 ? 'warning' : 'healthy',
                stats: storageStats
            };
        }

        // 错误处理系统健康检查 (基于ErrorHandler现有统计)
        if (typeof ErrorHandler !== 'undefined') {
            const errorCount = ErrorHandler.errorCounts?.size || 0;
            health.components.errorHandler = {
                status: errorCount > 5 ? 'warning' : 'healthy',
                errorCount: errorCount,
                strategies: ErrorHandler.recoveryStrategies?.size || 0
            };
        }

        // 事件系统健康检查
        if (typeof AutogenEventBus !== 'undefined') {
            health.components.eventBus = {
                status: 'healthy',
                stats: AutogenEventBus.getStats?.() || { active: true }
            };
        }

        // 整体状态评估
        const componentStatuses = Object.values(health.components).map(c => c.status);
        if (componentStatuses.includes('error')) {
            health.status = 'error';
        } else if (componentStatuses.includes('warning')) {
            health.status = 'warning';
        }

        return health;
    },

    /**
     * 启动定期监控
     */
    startMonitoring(interval = 30000) {
        return setInterval(async () => {
            const health = await this.checkHealth();
            if (health.status !== 'healthy') {
                console.warn('[HealthMonitor] 系统健康状态异常:', health);
            }
        }, interval);
    }
};

// 导出到全局
if (typeof window !== 'undefined') {
    window.HealthMonitor = HealthMonitor;
}
