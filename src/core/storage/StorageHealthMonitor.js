/**
 * 存储系统健康监控器
 * 提供存储系统的健康检查、性能监控和诊断功能
 */

export class StorageHealthMonitor {
    constructor(storageSystem) {
        if (!storageSystem || !storageSystem.success) {
            throw new Error('存储系统未正确初始化');
        }
        
        this.system = storageSystem;
        this.mode = storageSystem.mode;
        this.legacyStorage = storageSystem.legacy?.storage;
        this.formalStorage = storageSystem.formal?.storage;
        this.registry = storageSystem.formal?.registry;
        this.migrator = storageSystem.formal?.migrator;
        
        // 监控状态
        this.isMonitoring = false;
        this.monitorInterval = null;
        this.healthHistory = [];
        this.maxHistorySize = 100;
        
        // 性能指标
        this.performanceMetrics = {
            readTimes: [],
            writeTimes: [],
            errorCounts: {},
            lastCheck: null
        };
        
        // 健康阈值
        this.thresholds = {
            storageUsage: {
                warning: 80,  // 80% 使用率警告
                critical: 95  // 95% 使用率严重
            },
            errorRate: {
                warning: 0.05,  // 5% 错误率警告
                critical: 0.15  // 15% 错误率严重
            },
            responseTime: {
                warning: 100,   // 100ms 响应时间警告
                critical: 500   // 500ms 响应时间严重
            }
        };
    }

    /**
     * 开始健康监控
     * @param {number} interval - 监控间隔（毫秒）
     */
    startMonitoring(interval = 30000) { // 默认30秒
        if (this.isMonitoring) {
            console.warn('[HealthMonitor] 监控已在运行');
            return;
        }

        this.isMonitoring = true;
        console.log(`[HealthMonitor] 开始健康监控，间隔: ${interval}ms`);

        this.monitorInterval = setInterval(async () => {
            try {
                const health = await this.performHealthCheck();
                this._recordHealthHistory(health);
                this._checkAlerts(health);
            } catch (error) {
                console.error('[HealthMonitor] 健康检查失败:', error);
            }
        }, interval);

        // 立即执行一次检查
        this.performHealthCheck().then(health => {
            this._recordHealthHistory(health);
            console.log('[HealthMonitor] 初始健康检查完成:', health.overall);
        });
    }

    /**
     * 停止健康监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        console.log('[HealthMonitor] 健康监控已停止');
    }

    /**
     * 执行完整的健康检查
     * @returns {Object} 健康检查结果
     */
    async performHealthCheck() {
        const startTime = Date.now();
        
        const health = {
            timestamp: new Date().toISOString(),
            overall: 'healthy',
            mode: this.mode,
            checks: {
                legacy: null,
                formal: null,
                migration: null,
                performance: null
            },
            metrics: {},
            alerts: [],
            recommendations: []
        };

        try {
            // 检查简化存储
            if (this.legacyStorage) {
                health.checks.legacy = await this._checkLegacyStorage();
            }

            // 检查注册式存储
            if (this.formalStorage) {
                health.checks.formal = await this._checkFormalStorage();
            }

            // 检查迁移状态
            if (this.migrator) {
                health.checks.migration = await this._checkMigrationStatus();
            }

            // 检查性能指标
            health.checks.performance = await this._checkPerformance();

            // 计算整体健康状态
            health.overall = this._calculateOverallHealth(health.checks);

            // 生成指标摘要
            health.metrics = this._generateMetricsSummary();

            // 生成建议
            health.recommendations = this._generateRecommendations(health.checks);

            // 生成警报
            health.alerts = this._generateAlerts(health.checks);

        } catch (error) {
            health.overall = 'error';
            health.alerts.push({
                level: 'critical',
                message: `健康检查失败: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }

        const duration = Date.now() - startTime;
        health.checkDuration = duration;
        this.performanceMetrics.lastCheck = health.timestamp;

        return health;
    }

    /**
     * 获取性能报告
     * @returns {Object} 性能报告
     */
    getPerformanceReport() {
        const metrics = this.performanceMetrics;
        
        return {
            timestamp: new Date().toISOString(),
            readPerformance: {
                count: metrics.readTimes.length,
                average: this._calculateAverage(metrics.readTimes),
                min: Math.min(...metrics.readTimes) || 0,
                max: Math.max(...metrics.readTimes) || 0
            },
            writePerformance: {
                count: metrics.writeTimes.length,
                average: this._calculateAverage(metrics.writeTimes),
                min: Math.min(...metrics.writeTimes) || 0,
                max: Math.max(...metrics.writeTimes) || 0
            },
            errorCounts: { ...metrics.errorCounts },
            lastCheck: metrics.lastCheck
        };
    }

    /**
     * 获取健康历史
     * @param {number} limit - 返回记录数限制
     * @returns {Array} 健康历史记录
     */
    getHealthHistory(limit = 10) {
        return this.healthHistory.slice(-limit);
    }

    /**
     * 诊断存储问题
     * @returns {Object} 诊断结果
     */
    async diagnoseIssues() {
        const diagnosis = {
            timestamp: new Date().toISOString(),
            issues: [],
            solutions: [],
            urgency: 'low'
        };

        try {
            const health = await this.performHealthCheck();
            
            // 分析存储使用率问题
            if (this.legacyStorage) {
                const stats = this.legacyStorage.getStats();
                const usagePercent = parseFloat(stats.usagePercent);
                
                if (usagePercent > this.thresholds.storageUsage.critical) {
                    diagnosis.issues.push('存储空间严重不足');
                    diagnosis.solutions.push('立即执行紧急清理');
                    diagnosis.urgency = 'critical';
                } else if (usagePercent > this.thresholds.storageUsage.warning) {
                    diagnosis.issues.push('存储空间使用率较高');
                    diagnosis.solutions.push('建议执行常规清理');
                    if (diagnosis.urgency === 'low') diagnosis.urgency = 'medium';
                }
            }

            // 分析错误率问题
            const errorRate = this._calculateErrorRate();
            if (errorRate > this.thresholds.errorRate.critical) {
                diagnosis.issues.push('存储操作错误率过高');
                diagnosis.solutions.push('检查数据完整性和存储配置');
                diagnosis.urgency = 'critical';
            } else if (errorRate > this.thresholds.errorRate.warning) {
                diagnosis.issues.push('存储操作错误率偏高');
                diagnosis.solutions.push('监控错误日志并优化操作');
                if (diagnosis.urgency === 'low') diagnosis.urgency = 'medium';
            }

            // 分析迁移状态
            if (health.checks.migration?.status === 'pending') {
                diagnosis.issues.push('存在未迁移的数据');
                diagnosis.solutions.push('考虑执行数据迁移到注册式存储');
                if (diagnosis.urgency === 'low') diagnosis.urgency = 'medium';
            }

            // 分析性能问题
            const avgReadTime = this._calculateAverage(this.performanceMetrics.readTimes);
            const avgWriteTime = this._calculateAverage(this.performanceMetrics.writeTimes);
            
            if (avgReadTime > this.thresholds.responseTime.critical || 
                avgWriteTime > this.thresholds.responseTime.critical) {
                diagnosis.issues.push('存储操作响应时间过长');
                diagnosis.solutions.push('优化存储操作和数据结构');
                if (diagnosis.urgency !== 'critical') diagnosis.urgency = 'high';
            }

        } catch (error) {
            diagnosis.issues.push(`诊断过程出错: ${error.message}`);
            diagnosis.urgency = 'critical';
        }

        if (diagnosis.issues.length === 0) {
            diagnosis.issues.push('未发现明显问题');
            diagnosis.solutions.push('继续监控系统状态');
        }

        return diagnosis;
    }

    /**
     * 记录操作性能
     * @param {string} operation - 操作类型 ('read' | 'write')
     * @param {number} duration - 操作耗时（毫秒）
     */
    recordOperation(operation, duration) {
        const maxRecords = 1000; // 最多保留1000条记录
        
        if (operation === 'read') {
            this.performanceMetrics.readTimes.push(duration);
            if (this.performanceMetrics.readTimes.length > maxRecords) {
                this.performanceMetrics.readTimes.shift();
            }
        } else if (operation === 'write') {
            this.performanceMetrics.writeTimes.push(duration);
            if (this.performanceMetrics.writeTimes.length > maxRecords) {
                this.performanceMetrics.writeTimes.shift();
            }
        }
    }

    /**
     * 记录错误
     * @param {string} errorType - 错误类型
     */
    recordError(errorType) {
        this.performanceMetrics.errorCounts[errorType] = 
            (this.performanceMetrics.errorCounts[errorType] || 0) + 1;
    }

    // ==================== 私有方法 ====================

    /**
     * 检查简化存储
     * @private
     */
    async _checkLegacyStorage() {
        const stats = this.legacyStorage.getStats();
        const usagePercent = parseFloat(stats.usagePercent);
        
        let status = 'healthy';
        const issues = [];
        
        if (usagePercent > this.thresholds.storageUsage.critical) {
            status = 'critical';
            issues.push('存储空间严重不足');
        } else if (usagePercent > this.thresholds.storageUsage.warning) {
            status = 'warning';
            issues.push('存储空间使用率较高');
        }
        
        if (stats.errors > stats.writes * this.thresholds.errorRate.warning) {
            status = status === 'healthy' ? 'warning' : status;
            issues.push('错误率偏高');
        }

        return {
            status,
            stats,
            issues,
            usagePercent
        };
    }

    /**
     * 检查注册式存储
     * @private
     */
    async _checkFormalStorage() {
        const stats = this.formalStorage.getStats();
        const types = this.registry.listTypes();
        
        return {
            status: 'healthy',
            stats,
            registeredTypes: types.length,
            issues: []
        };
    }

    /**
     * 检查迁移状态
     * @private
     */
    async _checkMigrationStatus() {
        if (!this.legacyStorage) {
            return {
                status: 'not_applicable',
                issues: []
            };
        }

        const legacyKeys = this.legacyStorage.listKeys();
        const legacyDataCount = legacyKeys.filter(key => 
            key.startsWith('mind:') || key.startsWith('project:')
        ).length;

        return {
            status: legacyDataCount > 0 ? 'pending' : 'completed',
            legacyDataCount,
            issues: legacyDataCount > 0 ? ['存在未迁移的数据'] : []
        };
    }

    /**
     * 检查性能指标
     * @private
     */
    async _checkPerformance() {
        const avgReadTime = this._calculateAverage(this.performanceMetrics.readTimes);
        const avgWriteTime = this._calculateAverage(this.performanceMetrics.writeTimes);
        const errorRate = this._calculateErrorRate();
        
        let status = 'healthy';
        const issues = [];
        
        if (avgReadTime > this.thresholds.responseTime.critical || 
            avgWriteTime > this.thresholds.responseTime.critical) {
            status = 'critical';
            issues.push('响应时间过长');
        } else if (avgReadTime > this.thresholds.responseTime.warning || 
                   avgWriteTime > this.thresholds.responseTime.warning) {
            status = 'warning';
            issues.push('响应时间偏长');
        }
        
        if (errorRate > this.thresholds.errorRate.critical) {
            status = 'critical';
            issues.push('错误率过高');
        } else if (errorRate > this.thresholds.errorRate.warning) {
            status = status === 'healthy' ? 'warning' : status;
            issues.push('错误率偏高');
        }

        return {
            status,
            avgReadTime,
            avgWriteTime,
            errorRate,
            issues
        };
    }

    /**
     * 计算整体健康状态
     * @private
     */
    _calculateOverallHealth(checks) {
        const statuses = Object.values(checks)
            .filter(check => check !== null)
            .map(check => check.status);

        if (statuses.includes('critical')) return 'critical';
        if (statuses.includes('error')) return 'error';
        if (statuses.includes('warning')) return 'warning';
        if (statuses.includes('pending')) return 'pending';
        return 'healthy';
    }

    /**
     * 生成指标摘要
     * @private
     */
    _generateMetricsSummary() {
        return {
            readOperations: this.performanceMetrics.readTimes.length,
            writeOperations: this.performanceMetrics.writeTimes.length,
            totalErrors: Object.values(this.performanceMetrics.errorCounts)
                .reduce((sum, count) => sum + count, 0),
            avgReadTime: this._calculateAverage(this.performanceMetrics.readTimes),
            avgWriteTime: this._calculateAverage(this.performanceMetrics.writeTimes)
        };
    }

    /**
     * 生成建议
     * @private
     */
    _generateRecommendations(checks) {
        const recommendations = [];

        if (checks.legacy?.status === 'warning' || checks.legacy?.status === 'critical') {
            recommendations.push('建议清理存储空间');
        }

        if (checks.migration?.status === 'pending') {
            recommendations.push('建议执行数据迁移');
        }

        if (checks.performance?.status === 'warning' || checks.performance?.status === 'critical') {
            recommendations.push('建议优化存储操作性能');
        }

        if (recommendations.length === 0) {
            recommendations.push('系统运行正常，继续监控');
        }

        return recommendations;
    }

    /**
     * 生成警报
     * @private
     */
    _generateAlerts(checks) {
        const alerts = [];

        Object.entries(checks).forEach(([checkType, result]) => {
            if (result && result.status === 'critical') {
                alerts.push({
                    level: 'critical',
                    type: checkType,
                    message: `${checkType} 存在严重问题: ${result.issues.join(', ')}`,
                    timestamp: new Date().toISOString()
                });
            } else if (result && result.status === 'warning') {
                alerts.push({
                    level: 'warning',
                    type: checkType,
                    message: `${checkType} 需要注意: ${result.issues.join(', ')}`,
                    timestamp: new Date().toISOString()
                });
            }
        });

        return alerts;
    }

    /**
     * 记录健康历史
     * @private
     */
    _recordHealthHistory(health) {
        this.healthHistory.push({
            timestamp: health.timestamp,
            overall: health.overall,
            checkDuration: health.checkDuration,
            alertCount: health.alerts.length
        });

        // 保持历史记录数量限制
        if (this.healthHistory.length > this.maxHistorySize) {
            this.healthHistory.shift();
        }
    }

    /**
     * 检查警报条件
     * @private
     */
    _checkAlerts(health) {
        if (health.alerts.length > 0) {
            health.alerts.forEach(alert => {
                if (alert.level === 'critical') {
                    console.error(`[HealthMonitor] 严重警报: ${alert.message}`);
                } else if (alert.level === 'warning') {
                    console.warn(`[HealthMonitor] 警告: ${alert.message}`);
                }
            });
        }
    }

    /**
     * 计算平均值
     * @private
     */
    _calculateAverage(numbers) {
        if (!numbers || numbers.length === 0) return 0;
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }

    /**
     * 计算错误率
     * @private
     */
    _calculateErrorRate() {
        const totalErrors = Object.values(this.performanceMetrics.errorCounts)
            .reduce((sum, count) => sum + count, 0);
        const totalOperations = this.performanceMetrics.readTimes.length + 
                               this.performanceMetrics.writeTimes.length;
        
        return totalOperations > 0 ? totalErrors / totalOperations : 0;
    }
}

/**
 * 创建健康监控器实例
 * @param {Object} storageSystem - 存储系统实例
 * @returns {StorageHealthMonitor} 健康监控器实例
 */
export function createHealthMonitor(storageSystem) {
    return new StorageHealthMonitor(storageSystem);
}

export default StorageHealthMonitor;
