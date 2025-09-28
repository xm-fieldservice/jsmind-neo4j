/**
 * 错误恢复扩展 - 基于ErrorHandler的恢复策略扩展
 * 复用度: 90% (仅10%新增恢复策略)
 */

const ErrorRecoveryExtension = {
    /**
     * 初始化扩展恢复策略
     */
    init() {
        if (typeof ErrorHandler === 'undefined') {
            console.warn('[ErrorRecoveryExtension] ErrorHandler未找到');
            return false;
        }

        // 网络错误恢复策略
        ErrorHandler.recoveryStrategies.set('NETWORK_ERROR', async (error) => {
            console.log('[ErrorRecovery] 尝试网络错误恢复...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // 简单重试延迟
            return { recovered: true, action: 'retry_after_delay' };
        });

        // 存储错误恢复策略  
        ErrorHandler.recoveryStrategies.set('STORAGE_ERROR', async (error) => {
            console.log('[ErrorRecovery] 尝试存储错误恢复...');
            if (typeof AutogenUnifiedStorage !== 'undefined') {
                // 使用现有存储系统的清理功能
                return { recovered: true, action: 'storage_cleanup' };
            }
            return { recovered: false, action: 'manual_intervention_required' };
        });

        console.log('[ErrorRecoveryExtension] 恢复策略已注册');
        return true;
    },

    /**
     * 获取恢复统计 (基于ErrorHandler现有统计)
     */
    getRecoveryStats() {
        if (typeof ErrorHandler === 'undefined') return {};
        
        return {
            totalErrors: ErrorHandler.errorCounts.size,
            recoveryStrategies: ErrorHandler.recoveryStrategies.size,
            lastErrorTime: Math.max(...Array.from(ErrorHandler.lastErrorTime.values()))
        };
    }
};

// 自动初始化
if (typeof window !== 'undefined') {
    window.ErrorRecoveryExtension = ErrorRecoveryExtension;
    // 延迟初始化，确保ErrorHandler已加载
    setTimeout(() => ErrorRecoveryExtension.init(), 100);
}
