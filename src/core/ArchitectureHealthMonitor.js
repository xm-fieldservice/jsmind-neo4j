/**
 * ArchitectureHealthMonitor.js - 架构健康监控器
 * 监控系统架构的健康状态，检测潜在问题并提供诊断信息
 */
class ArchitectureHealthMonitor {
    constructor() {
        this.checks = new Map();
        this.healthStatus = 'unknown';
        this.lastCheck = null;
        this.checkInterval = 30000; // 30秒检查一次
        this.monitoring = false;
        this.alertThresholds = {
            memory: 80, // 内存使用率阈值(%)
            errors: 10, // 错误数量阈值
            responseTime: 5000 // 响应时间阈值(ms)
        };
        this.initialized = false;
    }

    /**
     * 初始化监控器
     */
    async initialize() {
        try {
            console.log('[ArchitectureHealthMonitor] 开始初始化...');

            // 注册默认健康检查
            this.registerDefaultChecks();

            // 启动定期检查
            this.startMonitoring();

            this.initialized = true;
            console.log('[ArchitectureHealthMonitor] ✅ 初始化完成');
            return true;

        } catch (error) {
            console.error('[ArchitectureHealthMonitor] 初始化失败:', error);
            return false;
        }
    }

    /**
     * 注册默认健康检查
     */
    registerDefaultChecks() {
        // 内存使用检查
        this.registerCheck('memory', async () => {
            try {
                if (typeof performance !== 'undefined' && performance.memory) {
                    const memoryInfo = performance.memory;
                    const usagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100;

                    return {
                        status: usagePercent > this.alertThresholds.memory ? 'warning' : 'healthy',
                        value: Math.round(usagePercent),
                        message: `内存使用率: ${Math.round(usagePercent)}%`
                    };
                }
                return { status: 'unknown', value: 0, message: '无法获取内存信息' };
            } catch (error) {
                return { status: 'error', value: 0, message: error.message };
            }
        });

        // 错误率检查
        this.registerCheck('errorRate', async () => {
            try {
                const recentErrors = this.getRecentErrors();
                const errorCount = recentErrors.length;

                return {
                    status: errorCount > this.alertThresholds.errors ? 'critical' : 'healthy',
                    value: errorCount,
                    message: `最近错误数量: ${errorCount}`
                };
            } catch (error) {
                return { status: 'error', value: 0, message: error.message };
            }
        });

        // 核心组件检查
        this.registerCheck('coreComponents', async () => {
            const components = [
                'AutogenUnifiedStorage',
                'AutogenEventBus',
                'ErrorHandler',
                'DependencyManager'
            ];

            const results = {};
            let healthyCount = 0;

            for (const component of components) {
                const available = typeof window !== 'undefined' && window[component] !== undefined;
                results[component] = available;

                if (available) {
                    healthyCount++;
                }
            }

            const status = healthyCount === components.length ? 'healthy' :
                          healthyCount >= components.length * 0.8 ? 'warning' : 'critical';

            return {
                status,
                value: healthyCount / components.length,
                message: `核心组件健康度: ${Math.round((healthyCount / components.length) * 100)}%`,
                details: results
            };
        });

        // 存储系统检查
        this.registerCheck('storageSystem', async () => {
            try {
                if (typeof window !== 'undefined' && window.AutogenUnifiedStorage) {
                    const isHealthy = await window.AutogenUnifiedStorage.healthCheck();
                    return {
                        status: isHealthy ? 'healthy' : 'critical',
                        value: isHealthy ? 1 : 0,
                        message: `存储系统状态: ${isHealthy ? '正常' : '异常'}`
                    };
                }
                return { status: 'unknown', value: 0, message: '存储系统不可用' };
            } catch (error) {
                return { status: 'error', value: 0, message: error.message };
            }
        });

        // 网络连接检查
        this.registerCheck('network', async () => {
            try {
                const startTime = Date.now();
                const response = await fetch('/favicon.ico', {
                    method: 'HEAD',
                    cache: 'no-cache',
                    timeout: 5000
                });
                const responseTime = Date.now() - startTime;

                const status = response.ok ?
                    (responseTime > this.alertThresholds.responseTime ? 'warning' : 'healthy') :
                    'critical';

                return {
                    status,
                    value: responseTime,
                    message: `网络响应时间: ${responseTime}ms`
                };
            } catch (error) {
                return { status: 'critical', value: 0, message: '网络连接失败' };
            }
        });

        // 事件系统检查
        this.registerCheck('eventSystem', async () => {
            try {
                if (typeof window !== 'undefined' && window.AutogenEventBus) {
                    const eventBusHealth = window.AutogenEventBus.healthCheck ?
                        await window.AutogenEventBus.healthCheck() : true;

                    return {
                        status: eventBusHealth ? 'healthy' : 'warning',
                        value: eventBusHealth ? 1 : 0,
                        message: `事件系统状态: ${eventBusHealth ? '正常' : '异常'}`
                    };
                }
                return { status: 'unknown', value: 0, message: '事件系统不可用' };
            } catch (error) {
                return { status: 'error', value: 0, message: error.message };
            }
        });
    }

    /**
     * 注册健康检查
     */
    registerCheck(name, checkFunction) {
        this.checks.set(name, checkFunction);
        console.log(`[ArchitectureHealthMonitor] 注册健康检查: ${name}`);
    }

    /**
     * 启动监控
     */
    startMonitoring() {
        if (this.monitoring) return;

        this.monitoring = true;
        console.log('[ArchitectureHealthMonitor] 启动定期健康检查');

        this.scheduleNextCheck();
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        this.monitoring = false;
        console.log('[ArchitectureHealthMonitor] 停止健康检查');
    }

    /**
     * 调度下次检查
     */
    scheduleNextCheck() {
        if (!this.monitoring) return;

        setTimeout(async () => {
            await this.performHealthCheck();
            this.scheduleNextCheck();
        }, this.checkInterval);
    }

    /**
     * 执行健康检查
     */
    async performHealthCheck() {
        try {
            const results = {};
            let overallStatus = 'healthy';
            let criticalCount = 0;
            let warningCount = 0;

            // 执行所有检查
            for (const [name, check] of this.checks) {
                try {
                    results[name] = await check();
                } catch (error) {
                    results[name] = {
                        status: 'error',
                        value: 0,
                        message: error.message
                    };
                }
            }

            // 计算整体健康状态
            for (const result of Object.values(results)) {
                switch (result.status) {
                    case 'critical':
                        criticalCount++;
                        overallStatus = 'critical';
                        break;
                    case 'warning':
                        if (overallStatus !== 'critical') {
                            warningCount++;
                            overallStatus = 'warning';
                        }
                        break;
                    case 'error':
                        if (overallStatus === 'healthy') {
                            overallStatus = 'error';
                        }
                        break;
                }
            }

            this.healthStatus = overallStatus;
            this.lastCheck = {
                timestamp: new Date().toISOString(),
                status: overallStatus,
                results,
                summary: {
                    total: this.checks.size,
                    healthy: Object.values(results).filter(r => r.status === 'healthy').length,
                    warning: warningCount,
                    critical: criticalCount,
                    error: Object.values(results).filter(r => r.status === 'error').length
                }
            };

            // 记录检查结果
            console.log(`[ArchitectureHealthMonitor] 健康检查完成: ${overallStatus}`, this.lastCheck.summary);

            // 如果状态不健康，触发警告
            if (overallStatus !== 'healthy') {
                this.triggerHealthAlert(overallStatus, results);
            }

            return this.lastCheck;

        } catch (error) {
            console.error('[ArchitectureHealthMonitor] 健康检查失败:', error);
            this.healthStatus = 'error';
            return null;
        }
    }

    /**
     * 触发健康警告
     */
    triggerHealthAlert(status, results) {
        const criticalItems = Object.entries(results)
            .filter(([_, result]) => result.status === 'critical')
            .map(([name, result]) => `${name}: ${result.message}`);

        const warningItems = Object.entries(results)
            .filter(([_, result]) => result.status === 'warning')
            .map(([name, result]) => `${name}: ${result.message}`);

        let message = `系统健康状态: ${status.toUpperCase()}\n`;

        if (criticalItems.length > 0) {
            message += `\n严重问题:\n${criticalItems.join('\n')}`;
        }

        if (warningItems.length > 0) {
            message += `\n警告:\n${warningItems.join('\n')}`;
        }

        console.warn(`[ArchitectureHealthMonitor] 🚨 ${message}`);

        // 触发全局事件
        if (typeof window !== 'undefined' && window.AutogenEventBus) {
            window.AutogenEventBus.emit('system:healthAlert', {
                status,
                message,
                results,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 获取最近错误
     */
    getRecentErrors() {
        if (typeof window !== 'undefined' && window.ErrorProcessingPipeline) {
            return window.ErrorProcessingPipeline.getErrorHistory(50);
        }
        return [];
    }

    /**
     * 获取健康状态
     */
    getHealthStatus() {
        return {
            status: this.healthStatus,
            lastCheck: this.lastCheck,
            monitoring: this.monitoring,
            thresholds: this.alertThresholds
        };
    }

    /**
     * 获取详细的健康报告
     */
    getHealthReport() {
        if (!this.lastCheck) {
            return { message: '暂无健康检查数据' };
        }

        return {
            status: this.healthStatus,
            timestamp: this.lastCheck.timestamp,
            summary: this.lastCheck.summary,
            details: this.lastCheck.results
        };
    }

    /**
     * 兼容方法：供测试调用
     */
    getStatus() {
        return this.getHealthStatus();
    }

    /**
     * 设置警告阈值
     */
    setThreshold(type, value) {
        this.alertThresholds[type] = value;
        console.log(`[ArchitectureHealthMonitor] 更新阈值 ${type}: ${value}`);
    }

    /**
     * 手动触发健康检查
     */
    async triggerManualCheck() {
        console.log('[ArchitectureHealthMonitor] 手动触发健康检查');
        return await this.performHealthCheck();
    }
}

// 全局实例
if (typeof window !== 'undefined') {
    window.ArchitectureHealthMonitor = new ArchitectureHealthMonitor();
}

console.log('[ArchitectureHealthMonitor] 模块加载完成');
