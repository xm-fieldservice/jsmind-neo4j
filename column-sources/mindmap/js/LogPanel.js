/**
 * 日志面板模块
 * 提供可视化的日志显示和管理功能
 * 
 * @author 程序员
 * @date 2025-10-07
 * @version 1.0
 * 
 * Phase 1 - Task 1.2: 从mindmap-standalone.html提取
 */

class LogPanel {
    constructor(containerId, logger) {
        this.containerId = containerId || 'global-log-panel-container';
        this.logger = logger || window.UnifiedLogger;
        this.initialized = false;
        this.consoleIntercepted = false;
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化日志面板
     */
    init() {
        // 确保DOM元素存在
        if (!this.ensureElements()) {
            console.warn('[LogPanel] 日志面板元素未找到，延迟初始化');
            setTimeout(() => this.init(), 100);
            return;
        }
        
        // 绑定事件
        this.bindEvents();
        
        // 拦截console输出
        this.interceptConsole();
        
        // 监听UnifiedLogger事件
        this.listenToLogger();
        
        // 监听全局错误
        this.listenToErrors();
        
        this.initialized = true;
        
        // 显示初始化消息
        setTimeout(() => {
            this.log('日志面板已初始化（整合UnifiedLogger）');
            if (this.logger) {
                this.log(`页面: ${this.logger.pageId}, 会话: ${this.logger.sessionId}`);
            }
        }, 0);
    }
    
    /**
     * 确保DOM元素存在
     */
    ensureElements() {
        this.panel = document.getElementById('list-log-panel');
        this.header = document.getElementById('list-log-header');
        this.caret = document.getElementById('list-log-caret');
        this.body = document.getElementById('list-log-body');
        this.btnClear = document.getElementById('list-log-clear');
        this.btnCopy = document.getElementById('list-log-copy');
        this.btnExport = document.getElementById('log-export-file');
        this.btnHistory = document.getElementById('log-show-history');
        
        return this.panel && this.header && this.body;
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 折叠/展开面板
        if (this.header && !this.header.__bound) {
            this.header.__bound = true;
            this.header.addEventListener('click', () => {
                const collapsed = this.panel.getAttribute('data-collapsed') !== 'false';
                if (collapsed) {
                    this.panel.setAttribute('data-collapsed', 'false');
                    this.body.style.display = 'block';
                    this.caret.textContent = '▾';
                } else {
                    this.panel.setAttribute('data-collapsed', 'true');
                    this.body.style.display = 'none';
                    this.caret.textContent = '▸';
                }
            });
        }
        
        // 清空按钮
        if (this.btnClear && !this.btnClear.__bound) {
            this.btnClear.__bound = true;
            this.btnClear.addEventListener('click', () => {
                this.clear();
            });
        }
        
        // 复制按钮
        if (this.btnCopy && !this.btnCopy.__bound) {
            this.btnCopy.__bound = true;
            this.btnCopy.addEventListener('click', () => {
                this.copyToClipboard();
            });
        }
        
        // 导出按钮
        if (this.btnExport && !this.btnExport.__bound) {
            this.btnExport.__bound = true;
            this.btnExport.addEventListener('click', async () => {
                await this.exportToFile();
            });
        }
        
        // 历史按钮
        if (this.btnHistory && !this.btnHistory.__bound) {
            this.btnHistory.__bound = true;
            this.btnHistory.addEventListener('click', () => {
                this.loadHistory();
            });
        }
    }
    
    /**
     * 拦截console输出
     */
    interceptConsole() {
        if (this.consoleIntercepted) return;
        
        ['log', 'info', 'warn', 'error'].forEach(fn => {
            const orig = console[fn].bind(console);
            console[fn] = (...args) => {
                try {
                    const msg = args.map(x => 
                        typeof x === 'object' ? JSON.stringify(x) : String(x)
                    ).join(' ');
                    
                    // 显示到日志面板
                    if (fn === 'info') {
                        this.log(msg);
                    } else {
                        this[fn](msg);
                    }
                } catch (_) {}
                
                // 调用原始console方法
                return orig.apply(console, args);
            };
        });
        
        this.consoleIntercepted = true;
    }
    
    /**
     * 监听UnifiedLogger事件
     */
    listenToLogger() {
        if (window.AutogenEventBus && this.logger) {
            window.AutogenEventBus.on('system:logging:entry', (data) => {
                const entry = data.entry;
                // 只显示本页面的日志
                if (entry.pageId === this.logger.pageId) {
                    this.append(entry.level, entry.message);
                }
            });
        }
    }
    
    /**
     * 监听全局错误
     */
    listenToErrors() {
        window.addEventListener('error', (e) => {
            this.error(`WindowError: ${e.message}`);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            const reason = e.reason && e.reason.message ? e.reason.message : String(e.reason);
            this.error(`UnhandledRejection: ${reason}`);
        });
    }
    
    /**
     * 添加日志条目
     */
    append(level, message) {
        if (!this.ensureElements()) return;
        
        const time = this.getTimestamp();
        const line = `[${time}][${level}] ${message}`;
        
        this.body.textContent += (this.body.textContent ? "\n" : "") + line;
        this.body.scrollTop = this.body.scrollHeight;
    }
    
    /**
     * 获取时间戳
     */
    getTimestamp() {
        const d = new Date();
        const pad = n => (n < 10 ? '0' : '') + n;
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    
    /**
     * 记录普通日志
     */
    log(message) {
        const msg = String(message);
        if (this.logger) {
            this.logger.info('UI', msg);
        }
        this.append('INFO', msg);
    }
    
    /**
     * 记录警告日志
     */
    warn(message) {
        const msg = String(message);
        if (this.logger) {
            this.logger.warn('UI', msg);
        }
        this.append('WARN', msg);
    }
    
    /**
     * 记录错误日志
     */
    error(message) {
        const msg = String(message);
        if (this.logger) {
            this.logger.error('UI', msg);
        }
        this.append('ERROR', msg);
    }
    
    /**
     * 记录JSON对象
     */
    json(title, obj) {
        try {
            const msg = JSON.stringify(obj, null, 2);
            if (this.logger) {
                this.logger.info('UI', msg);
            }
            this.append('INFO', msg);
        } catch (_) {
            this.append('INFO', String(obj));
        }
    }
    
    /**
     * 清空日志
     */
    clear() {
        if (this.body) {
            this.body.textContent = '';
        }
        if (this.logger) {
            this.logger.clear();
        }
    }
    
    /**
     * 复制日志到剪贴板
     */
    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.body.textContent || '');
            alert('日志已复制');
        } catch (e) {
            console.error('复制失败:', e);
        }
    }
    
    /**
     * 导出日志到文件
     */
    async exportToFile() {
        if (this.logger) {
            const result = await this.logger.exportToFile('json');
            if (result.success) {
                alert(`✅ 日志已导出: ${result.filename}`);
            }
        }
    }
    
    /**
     * 加载历史日志
     */
    loadHistory() {
        if (this.logger) {
            const history = this.logger.getHistory({ limit: 100 });
            this.body.textContent = '';
            history.forEach(entry => {
                const time = new Date(entry.timestamp).toLocaleTimeString();
                this.append(entry.level, `[${time}] ${entry.message}`);
            });
            alert(`📜 已加载${history.length}条历史日志`);
        }
    }
}

// 暴露到全局
if (typeof window !== 'undefined') {
    window.LogPanel = LogPanel;
}

// 支持模块化导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogPanel;
}
