/**
 * 日志采集器
 * 与主程序完全一样的日志采集机制
 * 用于调试和问题追踪
 */

class LogCollector {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000; // 最多保存1000条日志
        this.listeners = [];
        
        // 拦截console方法
        this.interceptConsole();
        
        console.log('[LogCollector] 日志采集器已初始化');
    }
    
    /**
     * 拦截console方法
     */
    interceptConsole() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        const originalInfo = console.info;
        
        const self = this;
        
        console.log = function(...args) {
            self.addLog('log', args);
            originalLog.apply(console, args);
        };
        
        console.warn = function(...args) {
            self.addLog('warn', args);
            originalWarn.apply(console, args);
        };
        
        console.error = function(...args) {
            self.addLog('error', args);
            originalError.apply(console, args);
        };
        
        console.info = function(...args) {
            self.addLog('info', args);
            originalInfo.apply(console, args);
        };
    }
    
    /**
     * 添加日志
     */
    addLog(level, args) {
        const log = {
            level,
            message: args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' '),
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('zh-CN'),
            date: new Date().toLocaleString('zh-CN')
        };
        
        this.logs.push(log);
        
        // 限制日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // 通知监听器
        this.notifyListeners(log);
    }
    
    /**
     * 添加监听器
     */
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    /**
     * 移除监听器
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }
    
    /**
     * 通知监听器
     */
    notifyListeners(log) {
        this.listeners.forEach(callback => {
            try {
                callback(log);
            } catch (error) {
                // 避免监听器错误影响日志系统
            }
        });
    }
    
    /**
     * 获取所有日志
     */
    getLogs(filter = null) {
        if (!filter) {
            return this.logs;
        }
        
        return this.logs.filter(log => {
            if (filter.level && log.level !== filter.level) {
                return false;
            }
            if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) {
                return false;
            }
            if (filter.since && log.timestamp < filter.since) {
                return false;
            }
            return true;
        });
    }
    
    /**
     * 清空日志
     */
    clearLogs() {
        this.logs = [];
        console.log('[LogCollector] 日志已清空');
    }
    
    /**
     * 导出日志
     */
    exportLogs() {
        const data = JSON.stringify(this.logs, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('[LogCollector] 日志已导出');
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const stats = {
            total: this.logs.length,
            log: 0,
            warn: 0,
            error: 0,
            info: 0
        };
        
        this.logs.forEach(log => {
            stats[log.level]++;
        });
        
        return stats;
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.LogCollector = LogCollector;
    // 自动创建全局实例
    window.logCollector = new LogCollector();
}

console.log('[LogCollector] 模块已加载');
